/* ─────────────────────────────────────────
   CoachQG — Cadrage V1
   Form logic
───────────────────────────────────────── */

const TOTAL_STEPS = 10;
const FORMSPREE_URL = 'https://formspree.io/f/mwvzwolj';

// Question labels used in summary + JSON export
const QUESTION_LABELS = {
  1:  'Gestion des disponibilités',
  2:  'Cours collectifs',
  3:  'Format des stages',
  4:  'Déduction — carnet de séances',
  5:  'Types de carnets',
  6:  'Validité des carnets',
  7:  'Annulations & notifications',
  8:  'Accompagnement parcours',
  9:  'Inscription minimale élève',
  10: 'Dashboard coach — KPIs',
};

// State
let currentStep = 0;
const answers   = {};   // step -> { value, label, extra?, notes? }
const subAnswers = {};  // key  -> { value, label }
const multiSelect = {}; // step -> [{ value, label }]

/* ─── Navigation ─── */

function goTo(step) {
  document.getElementById('step-' + currentStep).classList.remove('active');
  currentStep = step;
  document.getElementById('step-' + currentStep).classList.add('active');
  updateProgress();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateProgress() {
  const bar = document.getElementById('progress');
  if (currentStep === 0 || currentStep === TOTAL_STEPS + 1) {
    bar.classList.remove('visible');
    return;
  }
  bar.classList.add('visible');
  const pct = Math.round((currentStep / TOTAL_STEPS) * 100);
  document.getElementById('progress-fill').style.width  = pct + '%';
  document.getElementById('progress-label').textContent = 'Question ' + currentStep + ' / ' + TOTAL_STEPS;
  document.getElementById('progress-pct').textContent   = pct + '%';
}

/* ─── Selection Helpers ─── */

function selectOption(step, value, label, el) {
  answers[step] = { value, label, extra: answers[step]?.extra, notes: answers[step]?.notes };

  el.closest('.options-group').querySelectorAll('.option')
    .forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');

  // Steps that need sub-answer before enabling Next
  const gatedSteps = { 1: '1b', 6: '6b' };
  if (gatedSteps[step]) {
    checkGated(step, gatedSteps[step]);
  } else {
    enableNext(step);
  }
}

function selectSub(key, value, label, el, gatedStep) {
  subAnswers[key] = { value, label };
  el.closest('.options-group').querySelectorAll('.option')
    .forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');

  if (gatedStep) checkGated(gatedStep, key);
}

function toggleMulti(step, value, label, el) {
  if (!multiSelect[step]) multiSelect[step] = [];

  const idx = multiSelect[step].findIndex(x => x.value === value);
  if (idx >= 0) {
    multiSelect[step].splice(idx, 1);
    el.classList.remove('selected');
  } else {
    multiSelect[step].push({ value, label });
    el.classList.add('selected');
  }
  // multi-select steps: enable next if ≥1 selected
  const btn = document.getElementById('btn-next-' + step);
  if (btn) btn.disabled = !multiSelect[step].length;
}

function enableNext(step) {
  const btn = document.getElementById('btn-next-' + step);
  if (btn) btn.disabled = false;
}

function checkGated(step, subKey) {
  const btn = document.getElementById('btn-next-' + step);
  if (btn) btn.disabled = !(answers[step] && subAnswers[subKey]);
}

/* ─── Extra/Conditional Fields ─── */

function showExtra(id) { document.getElementById(id).classList.add('visible'); }
function hideExtra(id) { document.getElementById(id).classList.remove('visible'); }

function setExtraValue(step, val) {
  if (answers[step]) answers[step].extra = val;
}

function setNotes(step, val) {
  if (!answers[step]) answers[step] = { value: '', label: '' };
  answers[step].notes = val;
}

/* ─── Build Summary ─── */

function buildSummary() {
  const container = document.getElementById('summary-cards');
  container.innerHTML = '';

  for (let i = 1; i <= TOTAL_STEPS; i++) {
    let displayLabel = '';
    let extras = [];

    if (i === 5 || i === 10) {
      // Multi-select steps
      const sel = multiSelect[i];
      if (!sel || !sel.length) continue;
      displayLabel = sel.map(x => x.label).join(', ');
      if (answers[i]?.notes) extras.push(answers[i].notes);
    } else {
      if (!answers[i]?.label) continue;
      displayLabel = answers[i].label;
      if (answers[i].extra) extras.push(answers[i].extra);
      if (answers[i].notes) extras.push(answers[i].notes);
    }

    // Append sub-answers inline
    if (i === 1 && subAnswers['1b'])  extras.unshift('Créneaux : ' + subAnswers['1b'].label);
    if (i === 6 && subAnswers['6b'])  extras.push(subAnswers['6b'].label);
    if (i === 7 && subAnswers['7b'])  extras.push('Notif : ' + subAnswers['7b'].label);
    if (i === 8 && subAnswers['8v'])  extras.push(subAnswers['8v'].label);

    const row = document.createElement('div');
    row.className = 'answer-row';
    row.innerHTML = `
      <div style="flex:1">
        <div class="answer-row__question">${QUESTION_LABELS[i]}</div>
        <div class="answer-row__answer">${displayLabel}</div>
        ${extras.length ? `<div class="answer-row__extra">${extras.join(' · ')}</div>` : ''}
      </div>
      <div class="answer-row__tag">Q${i}</div>
    `;
    container.appendChild(row);
  }
}

/* ─── Build Export Payload ─── */

function buildPayload() {
  const payload = {
    meta: { generated: new Date().toISOString(), projet: 'CoachQG V1' },
    reponses: {},
  };

  for (let i = 1; i <= TOTAL_STEPS; i++) {
    const key = 'Q' + i + '_' + QUESTION_LABELS[i].replace(/\s/g, '_').replace(/['\u2019\/\-]/g, '');

    if (i === 5 || i === 10) {
      const sel = multiSelect[i];
      if (sel && sel.length) {
        payload.reponses[key] = {
          valeurs: sel.map(x => x.value),
          ...(answers[i]?.notes && { notes: answers[i].notes }),
        };
      }
    } else {
      if (!answers[i]?.value) continue;
      payload.reponses[key] = {
        valeur:  answers[i].value,
        libelle: answers[i].label,
        ...(answers[i].extra && { extra: answers[i].extra }),
        ...(answers[i].notes && { notes: answers[i].notes }),
      };
    }
  }

  // Sub-answers
  if (subAnswers['1b'])  payload.reponses.Q1b_Type_creneaux             = subAnswers['1b'];
  if (subAnswers['6b'])  payload.reponses.Q6b_Carnets_simultanes         = subAnswers['6b'];
  if (subAnswers['7b'])  payload.reponses.Q7b_Notification_annulation    = subAnswers['7b'];
  if (subAnswers['8v'])  payload.reponses.Q8v_Accompagnement_version     = subAnswers['8v'];

  return payload;
}

/* ─── Send to Formspree ─── */

async function sendAnswers() {
  const btn    = document.getElementById('btn-send');
  const status = document.getElementById('send-status');

  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader"></i> Envoi en cours…';
  status.classList.add('visible');
  status.textContent = '';

  const payload = buildPayload();

  // Flatten for Formspree readability
  const flat = {
    _subject:     'CoachQG — Cadrage V1',
    generated:    payload.meta.generated,
    json_complet: JSON.stringify(payload, null, 2),
  };
  for (const [k, v] of Object.entries(payload.reponses)) {
    flat[k] = typeof v === 'object' ? JSON.stringify(v) : v;
  }

  try {
    const res = await fetch(FORMSPREE_URL, {
      method:  'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body:    JSON.stringify(flat),
    });

    if (res.ok) {
      btn.innerHTML       = '<i class="ti ti-check"></i> Réponses envoyées';
      btn.style.background = 'var(--acc-h)';
      status.textContent  = '✓ Bien reçu. Merci !';
    } else {
      throw new Error('HTTP ' + res.status);
    }
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<i class="ti ti-send"></i> Réessayer';
    status.textContent = 'Échec de l\'envoi (' + err.message + '). Contacte le coach directement.';
  }
}

/* ─── Init ─── */
updateProgress();
