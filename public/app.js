// ═══════════════════════════════════════════════════════════════════
// CHORD ENGINE — generate all chords from 5 open shapes × 12 roots
// (preserved from the original generator)
// ═══════════════════════════════════════════════════════════════════
const CHROMATIC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

const OPEN_SHAPES = {
  E: { root_string: 0, open_root_note: 'E', types: {
    maj:  { frets:[0,2,2,1,0,0],    barre_strings:[0,5], fingers:[0,2,3,1,0,0] },
    min:  { frets:[0,2,2,0,0,0],    barre_strings:[0,5], fingers:[0,2,3,0,0,0] },
    '7':  { frets:[0,2,0,1,0,0],    barre_strings:[0,5], fingers:[0,2,0,1,0,0] },
    min7: { frets:[0,2,0,0,0,0],    barre_strings:[0,5], fingers:[0,2,0,0,0,0] },
    maj7: { frets:[0,2,1,1,0,0],    barre_strings:[0,5], fingers:[0,3,1,2,0,0] },
    pow5: { frets:[0,2,2,-1,-1,-1], barre_strings:null,  fingers:[0,1,2,0,0,0] },
  }},
  A: { root_string: 1, open_root_note: 'A', types: {
    maj:  { frets:[-1,0,2,2,2,0],   barre_strings:null,  fingers:[0,0,1,2,3,0] },
    min:  { frets:[-1,0,2,2,1,0],   barre_strings:null,  fingers:[0,0,2,3,1,0] },
    '7':  { frets:[-1,0,2,0,2,0],   barre_strings:null,  fingers:[0,0,2,0,3,0] },
    min7: { frets:[-1,0,2,0,1,0],   barre_strings:null,  fingers:[0,0,2,0,1,0] },
    maj7: { frets:[-1,0,2,1,2,0],   barre_strings:null,  fingers:[0,0,3,1,4,0] },
    pow5: { frets:[-1,0,2,2,-1,-1], barre_strings:null,  fingers:[0,0,1,2,0,0] },
  }},
  G: { root_string: 0, open_root_note: 'G', types: {
    maj:  { frets:[3,2,0,0,0,3],    barre_strings:null,  fingers:[2,1,0,0,0,3] },
    min:  { frets:[3,5,5,3,3,3],    barre_strings:[0,5], fingers:[1,3,4,1,1,1] },
    '7':  { frets:[3,2,0,0,0,1],    barre_strings:null,  fingers:[3,2,0,0,0,1] },
    min7: { frets:[3,5,3,3,3,3],    barre_strings:[0,5], fingers:[1,3,1,1,1,1] },
    maj7: { frets:[3,2,0,0,0,2],    barre_strings:null,  fingers:[3,2,0,0,0,4] },
    pow5: { frets:[3,5,5,-1,-1,-1], barre_strings:null,  fingers:[1,3,4,0,0,0] },
  }},
  C: { root_string: 1, open_root_note: 'C', types: {
    maj:  { frets:[-1,3,2,0,1,0],   barre_strings:null,  fingers:[0,3,2,0,1,0] },
    min:  { frets:[-1,3,5,5,4,3],   barre_strings:[1,5], fingers:[0,1,3,4,2,1] },
    '7':  { frets:[-1,3,2,3,1,0],   barre_strings:null,  fingers:[0,3,2,4,1,0] },
    min7: { frets:[-1,3,5,3,4,3],   barre_strings:[1,5], fingers:[0,1,3,1,2,1] },
    maj7: { frets:[-1,3,2,0,0,0],   barre_strings:null,  fingers:[0,3,2,0,0,0] },
    pow5: { frets:[-1,3,5,5,-1,-1], barre_strings:null,  fingers:[0,1,3,4,0,0] },
  }},
  D: { root_string: 2, open_root_note: 'D', types: {
    maj:  { frets:[-1,-1,0,2,3,2],  barre_strings:null,  fingers:[0,0,0,1,3,2] },
    min:  { frets:[-1,-1,0,2,3,1],  barre_strings:null,  fingers:[0,0,0,2,3,1] },
    '7':  { frets:[-1,-1,0,2,1,2],  barre_strings:null,  fingers:[0,0,0,2,1,3] },
    min7: { frets:[-1,-1,0,2,1,1],  barre_strings:[3,5], fingers:[0,0,0,2,1,1] },
    maj7: { frets:[-1,-1,0,2,2,2],  barre_strings:null,  fingers:[0,0,0,1,2,3] },
    pow5: { frets:[-1,-1,0,2,3,-1], barre_strings:null,  fingers:[0,0,0,1,3,0] },
  }},
};

const ROOT_PITCH = { E:4, A:9, G:7, C:0, D:2 };

function buildChord(form, type, rootNote) {
  const tmpl = OPEN_SHAPES[form].types[type];
  const shift = (CHROMATIC.indexOf(rootNote) - ROOT_PITCH[form] + 12) % 12;

  const newFrets = tmpl.frets.map(f => {
    if (f === -1) return -1;
    if (shift === 0) return f;
    if (f === 0) return shift;
    return f + shift;
  });

  let barre = null;
  if (shift > 0 && tmpl.barre_strings) {
    const [from, to] = tmpl.barre_strings;
    barre = { fret: shift, from, to };
  }
  return { frets: newFrets, barre, form, shift };
}

const ALL_ROOTS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const ALL_FORMS = ['E','A','D','G','C'];
const ALL_TYPES = ['maj','min','7','min7','maj7','pow5'];
const ALL_POS   = ['open','barre'];

const TYPE_SUFFIX = { maj:'', min:'m', '7':'7', min7:'m7', maj7:'maj7', pow5:'5' };

const CHORD_DB = {};
ALL_ROOTS.forEach(root => {
  CHORD_DB[root] = {};
  ALL_FORMS.forEach(form => {
    CHORD_DB[root][form] = {};
    ALL_TYPES.forEach(type => { CHORD_DB[root][form][type] = buildChord(form, type, root); });
  });
});

// ── shape-signature model ────────────────────────────────────────────
// A chord is "open" iff its root is the form's open root — which, by how the
// CAGED forms are named, is exactly the form letter (the only root with shift 0).
// Practice is tracked by signature = form:type:pos, ignoring the root.
const posOf = (root, form) => (root === form ? 'open' : 'barre');
const sigStr = s => `${s.form}:${s.type}:${s.pos}`;
const pairSigStr = (a, b) => `${sigStr(a)}>${sigStr(b)}`;

// ═══════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════
const api = {
  async record(body)        { return (await fetch('/api/sessions', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })).json(); },
  async counts()            { return (await fetch('/api/practice-counts')).json(); },
  async stats()             { return (await fetch('/api/stats')).json(); },
  async history()           { return (await fetch('/api/sessions')).json(); },
  async remove(id)          { return (await fetch(`/api/sessions/${id}`, { method:'DELETE' })).json(); },
};

// ═══════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════
const PREFS_KEY = 'guitar-practice-prefs';
let activeForms = new Set(ALL_FORMS);
let activeTypes = new Set(ALL_TYPES);
let activePos   = new Set(ALL_POS);
let activeRoots = new Set(ALL_ROOTS);
let sessionLengthMin = 5;
let prepSec = 5;                 // get-ready lead-in before the clock starts
const PREP_OPTS = [0, 5, 10];
let bpm = 80;                    // metronome tempo, carried into and saved with the drill
let metronomeOn = false;         // whether the click sounds (in-idle preview + during the drill)
const BPM_MIN = 40, BPM_MAX = 240, BPM_STEP = 5;

let pairCounts = {};   // pair_sig -> times practiced
let sigCounts  = {};   // signature -> times practiced (as either chord)

let nextPair = null;   // previewed least-practiced pair (idle)
let active = null;     // { pair, startedAt, total }
let pending = null;    // { pair, duration } awaiting a rating
let timerHandle = null;
let prepHandle = null;  // get-ready countdown before a drill
let todays = [];       // [{ when:Date, pair, rating }]

function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY));
    if (!p) return;
    const restore = (arr, all) => new Set((arr || []).filter(x => all.includes(x)));
    if (Array.isArray(p.forms)) activeForms = restore(p.forms, ALL_FORMS);
    if (Array.isArray(p.types)) activeTypes = restore(p.types, ALL_TYPES);
    if (Array.isArray(p.pos))   activePos   = restore(p.pos, ALL_POS);
    if (Array.isArray(p.roots)) activeRoots = restore(p.roots, ALL_ROOTS);
    if (p.length) sessionLengthMin = p.length;
    if (PREP_OPTS.includes(p.prep)) prepSec = p.prep;   // 0 is a valid choice
    if (Number.isFinite(p.bpm)) bpm = Math.max(BPM_MIN, Math.min(BPM_MAX, p.bpm));
    if (typeof p.metronome === 'boolean') metronomeOn = p.metronome;
  } catch { /* ignore corrupt prefs */ }
}
function savePrefs() {
  localStorage.setItem(PREFS_KEY, JSON.stringify({
    forms:[...activeForms], types:[...activeTypes], pos:[...activePos],
    roots:[...activeRoots], length: sessionLengthMin, prep: prepSec,
    bpm, metronome: metronomeOn,
  }));
}

// ═══════════════════════════════════════════════════════════════════
// CHIPS / FILTERS
// ═══════════════════════════════════════════════════════════════════
function initChips() {
  const mk = (rowId, items, labels, set) => {
    const row = document.getElementById(rowId);
    const chips = items.map(v => chip(v, labels[v] ?? v, set));
    chips.forEach(c => row.appendChild(c));
    wireBulk(rowId, items, set, chips);
  };
  mk('form-chips', ALL_FORMS, Object.fromEntries(ALL_FORMS.map(f => [f, f + '-form'])), activeForms);
  mk('type-chips', ALL_TYPES, {}, activeTypes);
  mk('pos-chips',  ALL_POS,   {}, activePos);
  mk('root-chips', ALL_ROOTS, {}, activeRoots);

  // single-select segmented controls: session length and the get-ready lead-in
  buildSegs('length-chips', [[3, '3 min'], [5, '5 min'], [10, '10 min']],
            () => sessionLengthMin, v => { sessionLengthMin = v; });
  buildSegs('prep-chips', [[0, 'Off'], [5, '5s'], [10, '10s']],
            () => prepSec, v => { prepSec = v; });
}

function buildSegs(rowId, options, get, set) {
  const row = document.getElementById(rowId);
  options.forEach(([value, label]) => {
    const c = document.createElement('button');
    c.className = 'seg' + (value === get() ? ' active' : '');
    c.textContent = label;
    c.onclick = () => {
      set(value);
      row.querySelectorAll('.seg').forEach(x => x.classList.remove('active'));
      c.classList.add('active');
      savePrefs();
      updateDrillSummary();
    };
    row.appendChild(c);
  });
}

// Select-all / clear-all for a chip category. Clearing a category empties the
// pool for it, which the stage handles by showing the empty state.
function wireBulk(rowId, items, set, chips) {
  const host = document.querySelector(`.filter-actions[data-target="${rowId}"]`);
  if (!host) return;
  const apply = fill => {
    set.clear();
    if (fill) items.forEach(v => set.add(v));
    chips.forEach((c, i) => c.classList.toggle('active', set.has(items[i])));
    savePrefs();
    if (active || pending) return;   // don't disrupt a running drill
    renderIdle();
  };
  const btn = (label, fill) => {
    const b = document.createElement('button');
    b.className = 'bulk-btn';
    b.textContent = label;
    b.onclick = () => apply(fill);
    host.appendChild(b);
  };
  btn('all', true);
  btn('none', false);
}

function chip(val, label, set) {
  const c = document.createElement('button');
  c.className = 'chip' + (set.has(val) ? ' active' : '');
  c.textContent = label;
  c.onclick = () => {
    if (set.has(val)) {
      if (set.size === 1) return;
      set.delete(val); c.classList.remove('active');
    } else {
      set.add(val); c.classList.add('active');
    }
    savePrefs();
    if (active || pending) return;   // don't disrupt a running drill
    renderIdle();
  };
  return c;
}

// ═══════════════════════════════════════════════════════════════════
// SELECTION — least-practiced shape-pair within the active filters
// ═══════════════════════════════════════════════════════════════════
function eligibleSignatures() {
  const sigs = [];
  for (const form of activeForms) {
    for (const type of activeTypes) {
      if (activePos.has('open') && activeRoots.has(form)) sigs.push({ form, type, pos:'open' });
      if (activePos.has('barre') && [...activeRoots].some(r => r !== form)) sigs.push({ form, type, pos:'barre' });
    }
  }
  return sigs;
}

function materialize(s) {
  let root;
  if (s.pos === 'open') {
    root = s.form;                                   // the one root with shift 0
  } else {
    const opts = [...activeRoots].filter(r => r !== s.form);
    root = opts[Math.floor(Math.random() * opts.length)];
  }
  return { root, form: s.form, type: s.type, pos: s.pos };
}

// Pick the directional shape-pair with the fewest practices.
// Tie-break: fewest combined single-shape practices, then random.
function selectPair() {
  const sigs = eligibleSignatures();
  if (sigs.length < 2) return null;

  let best = [], bestPc = Infinity, bestSc = Infinity;
  for (let i = 0; i < sigs.length; i++) {
    for (let j = 0; j < sigs.length; j++) {
      if (i === j) continue;
      const a = sigs[i], b = sigs[j];
      const sa = sigStr(a), sb = sigStr(b);
      const pc = pairCounts[`${sa}>${sb}`] || 0;
      const sc = (sigCounts[sa] || 0) + (sigCounts[sb] || 0);
      if (pc < bestPc || (pc === bestPc && sc < bestSc)) {
        bestPc = pc; bestSc = sc; best = [[a, b]];
      } else if (pc === bestPc && sc === bestSc) {
        best.push([a, b]);
      }
    }
  }
  const [a, b] = best[Math.floor(Math.random() * best.length)];
  return { a: materialize(a), b: materialize(b) };
}

// ═══════════════════════════════════════════════════════════════════
// DIAGRAM RENDERER (preserved)
// ═══════════════════════════════════════════════════════════════════
function drawDiagram(chord) {
  const frets = chord.frets;
  const barre = chord.barre;

  const playedFrets = frets.filter(f => f > 0);
  const minFret = playedFrets.length ? Math.min(...playedFrets) : 1;
  const maxFret = playedFrets.length ? Math.max(...playedFrets) : 4;

  let startFret = 1;
  if (maxFret > 4) startFret = minFret;
  if (barre && barre.fret < startFret) startFret = barre.fret;
  const endFret = startFret + 3;

  const W=120, H=150, LEFT=18, RIGHT=W-8, TOP=22, BOT=H-14;
  const strX = i => LEFT + i*((RIGHT-LEFT)/5);
  const fretY = f => TOP + (f - startFret + 0.5)*((BOT-TOP)/4);
  const NS=6, NF=4;

  let svg = `<svg class="fret-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;

  if (startFret > 1) {
    svg += `<text x="${LEFT-4}" y="${fretY(startFret)+4}" text-anchor="end" font-size="9" fill="#6b6b80" font-family="Space Mono,monospace">${startFret}fr</text>`;
  }
  for (let f=0; f<=NF; f++) {
    const y = TOP + f*((BOT-TOP)/NF);
    const isNut = f===0 && startFret===1;
    svg += `<line x1="${LEFT}" y1="${y}" x2="${RIGHT}" y2="${y}" stroke="${isNut?'#c8b890':'#2e2518'}" stroke-width="${isNut?3:1}"/>`;
  }
  for (let s=0; s<NS; s++) {
    svg += `<line x1="${strX(s)}" y1="${TOP}" x2="${strX(s)}" y2="${BOT}" stroke="#3a3830" stroke-width="1"/>`;
  }
  if (barre && barre.fret >= startFret && barre.fret <= endFret) {
    const y = fretY(barre.fret);
    svg += `<rect x="${strX(barre.from)}" y="${y-7}" width="${strX(barre.to)-strX(barre.from)}" height="14" rx="7" fill="#e8a045"/>`;
  }
  for (let s=0; s<NS; s++) {
    const f = frets[s], x = strX(s);
    if (f === -1) {
      svg += `<text x="${x}" y="${TOP-6}" text-anchor="middle" font-size="10" fill="#6b6b80" font-family="sans-serif">✕</text>`;
    } else if (f === 0) {
      svg += `<circle cx="${x}" cy="${TOP-8}" r="4.5" fill="none" stroke="#8a8070" stroke-width="1.5"/>`;
    }
  }
  for (let s=0; s<NS; s++) {
    const f = frets[s];
    if (f > 0 && f >= startFret && f <= endFret) {
      const inBarre = barre && barre.fret === f && s >= barre.from && s <= barre.to;
      if (!inBarre) svg += `<circle cx="${strX(s)}" cy="${fretY(f)}" r="7.5" fill="#e8a045"/>`;
    }
  }
  svg += `</svg>`;
  return svg;
}

// One card = diagram, name, one caption line. Everything else was noise.
function renderCard(container, entry) {
  const chord = CHORD_DB[entry.root][entry.form][entry.type];
  container.innerHTML = `
    <div class="fret-diagram">${drawDiagram(chord)}</div>
    <div class="chord-name">${entry.root}<span class="quality">${TYPE_SUFFIX[entry.type]}</span></div>
    <div class="chord-caption">${entry.form}-form · ${entry.pos}</div>`;
}

function renderPair(pair) {
  renderCard(document.getElementById('card-a'), pair.a);
  renderCard(document.getElementById('card-b'), pair.b);
}

// ═══════════════════════════════════════════════════════════════════
// VIEW STATE MACHINE — one stage, one pair display. Only the label, the
// countdown, and the control row underneath change between states.
// ═══════════════════════════════════════════════════════════════════
let currentView = 'idle';

function showView(name) {
  currentView = name;
  document.getElementById('idle-controls').hidden    = name !== 'idle';
  document.getElementById('active-controls').hidden  = name !== 'active';
  document.getElementById('prep-controls').hidden    = name !== 'prep';
  // no swapping pairs mid-drill — the swap link only lives in idle
  document.getElementById('shuffle-btn').disabled = name !== 'idle';
  // the pool stays put at the top through every state, so nothing jumps
  document.getElementById('today-section').style.display =
    (name === 'idle' && todays.length) ? 'flex' : 'none';
}

// pick=true forces a fresh pair ("try another pair", after a drill). The pool is
// only a filter for the *next* pick — changing it leaves the shown preview alone.
function renderIdle(pick = false) {
  showView('idle');
  if (pick || !nextPair) nextPair = selectPair();

  const has = !!nextPair;
  document.getElementById('pair-display').style.display = has ? 'flex' : 'none';
  document.getElementById('empty-state').style.display = has ? 'none' : 'block';
  document.getElementById('start-btn').disabled = !has;
  document.getElementById('shuffle-btn').disabled = !has;
  if (!has) { document.getElementById('stage-label').textContent = ''; return; }

  const pc = pairCounts[pairSigStr(nextPair.a, nextPair.b)] || 0;
  document.getElementById('stage-label').textContent = `Up next · practiced ${pc}×`;
  renderPair(nextPair);
}

// ═══════════════════════════════════════════════════════════════════
// DRILL CUES — you're looking at the fretboard, not the screen, so the
// timer speaks up: a short beep at 10s left, a chime + vibration at 0.
// AudioContext is created inside the Start tap (required on iOS).
// ═══════════════════════════════════════════════════════════════════
let audioCtx = null;
function ensureAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch { /* no audio — cues just won't play */ }
}
function beep(freq, delay, dur = 0.18, vol = 0.2) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
  osc.type = 'sine'; osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t); osc.stop(t + dur + 0.05);
}
function cueWarning() { beep(660, 0, 0.12, 0.12); }
function cueDone() {
  beep(880, 0); beep(1108.7, 0.18); beep(1318.5, 0.36, 0.3);
  navigator.vibrate?.([180, 80, 180]);
}

// ═══════════════════════════════════════════════════════════════════
// METRONOME — a steady click at `bpm`, scheduled ahead on the audio clock
// (a bare setInterval would drift audibly). The scheduler reads `bpm` each
// pass, so tempo changes take effect live. First beat of every bar is accented.
// ═══════════════════════════════════════════════════════════════════
let metroTimer = null, metroNextTick = 0, metroBeat = 0;

function metroClick(time, accent) {
  const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.value = accent ? 2000 : 1200;
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(accent ? 0.3 : 0.16, time + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.035);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(time); osc.stop(time + 0.05);
}

function startMetronome() {
  ensureAudio();
  if (!audioCtx) return;
  stopMetronome();
  metroBeat = 0;
  metroNextTick = audioCtx.currentTime + 0.12;   // small lead-in so the first click lands cleanly
  metroTimer = setInterval(() => {
    while (metroNextTick < audioCtx.currentTime + 0.25) {   // schedule ~250ms ahead
      metroClick(metroNextTick, metroBeat % 4 === 0);
      metroNextTick += 60 / bpm;
      metroBeat++;
    }
  }, 45);
}

function stopMetronome() {
  clearInterval(metroTimer);
  metroTimer = null;
}

// ── metronome controls (idle) ──
function updateMetroUI() {
  document.getElementById('bpm-value').textContent = bpm;
  document.getElementById('metro-toggle').classList.toggle('active', metronomeOn);
}

function setBpm(v) {
  bpm = Math.max(BPM_MIN, Math.min(BPM_MAX, v));
  updateMetroUI();
  updateDrillSummary();
  savePrefs();
  // a running click (preview or mid-drill) picks up the new tempo on its next pass
}

// The ♪ toggle: on = click sounds. Tapping it is a user gesture, so it also
// starts/stops a live preview (idle) or mutes/unmutes an in-progress drill.
function toggleMetronome() {
  metronomeOn = !metronomeOn;
  updateMetroUI();
  updateDrillSummary();
  savePrefs();
  if (metronomeOn && (currentView === 'idle' || currentView === 'active')) startMetronome();
  else stopMetronome();
}

// The practice screen shows only the chosen values; the pickers live in the modal.
function updateDrillSummary() {
  const prepTxt = prepSec === 0 ? 'no lead-in' : `${prepSec}s ready`;
  document.getElementById('drill-summary').innerHTML =
    `<b>${sessionLengthMin} min</b><span class="ds-sep">·</span>` +
    `<b>${prepTxt}</b><span class="ds-sep">·</span>` +
    `<b>${bpm} bpm</b>` +
    `<span class="ds-metro${metronomeOn ? '' : ' off'}" title="Metronome ${metronomeOn ? 'on' : 'off'}">♪</span>`;
}

function openSettings() {
  document.getElementById('settings-modal').hidden = false;
  document.body.classList.add('modal-open');
}
function closeSettings() {
  document.getElementById('settings-modal').hidden = true;
  document.body.classList.remove('modal-open');
  if (!active) stopMetronome();   // stop any tempo preview auditioned in the modal
}

// Keep the phone screen on during a drill (drops silently if unsupported).
let wakeLock = null;
async function acquireWakeLock() {
  try { wakeLock = await navigator.wakeLock?.request('screen'); } catch { wakeLock = null; }
}
function releaseWakeLock() {
  try { wakeLock?.release(); } catch { /* already released */ }
  wakeLock = null;
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !active) return;
  acquireWakeLock();          // the lock is auto-released when the tab hides
  tickCountdown();            // resync the display immediately on return
});

// ═══════════════════════════════════════════════════════════════════
// DRILL
// ═══════════════════════════════════════════════════════════════════
function startDrill() {
  if (!nextPair) return;
  ensureAudio();
  acquireWakeLock();
  const pair = nextPair;
  if (prepSec > 0) runPrep(pair);
  else beginDrill(pair);
}

// Optional lead-in: a few seconds to set your fingers before the clock runs.
function runPrep(pair) {
  stopMetronome();               // clean count-in — the click starts with the drill clock
  showView('prep');
  renderPair(pair);
  document.getElementById('stage-label').textContent = 'Get ready';
  let remaining = prepSec;
  const cd = document.getElementById('prep-countdown');
  cd.textContent = remaining;
  beep(600, 0, 0.06, 0.09);
  clearInterval(prepHandle);
  prepHandle = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(prepHandle); prepHandle = null;
      beep(880, 0, 0.14, 0.16);
      beginDrill(pair);
      return;
    }
    cd.textContent = remaining;
    beep(600, 0, 0.06, 0.09);
  }, 1000);
}

function cancelPrep() {
  clearInterval(prepHandle); prepHandle = null;
  stopMetronome();
  releaseWakeLock();
  renderIdle();
}

function beginDrill(pair) {
  active = { pair, startedAt: Date.now(), total: sessionLengthMin * 60, bpm: metronomeOn ? bpm : null };
  showView('active');
  document.getElementById('stage-label').textContent = 'Practicing';
  renderPair(active.pair);
  if (metronomeOn) startMetronome();   // downbeat aligns with the drill clock
  runCountdown();
}

function runCountdown() {
  clearInterval(timerHandle);
  tickCountdown();
  timerHandle = setInterval(tickCountdown, 1000);
}

function tickCountdown() {
  const elapsed = Math.floor((Date.now() - active.startedAt) / 1000);
  const remaining = Math.max(0, active.total - elapsed);
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const cd = document.getElementById('countdown');
  cd.textContent = `${mm}:${ss}`;
  cd.classList.toggle('ending', remaining <= 10 && remaining > 0);
  document.getElementById('countdown-fill').style.width = `${(remaining / active.total) * 100}%`;
  if (remaining <= 10 && remaining > 0 && !active.warned) { active.warned = true; cueWarning(); }
  if (remaining <= 0) { clearInterval(timerHandle); finishDrill('complete'); }
}

// "End drill" (or the timer hitting zero): stop, then rate in a modal.
function finishDrill(reason) {
  clearInterval(timerHandle);
  stopMetronome();
  releaseWakeLock();
  if (reason === 'complete') cueDone();
  const elapsed = Math.floor((Date.now() - active.startedAt) / 1000);
  const duration = reason === 'complete' ? active.total : Math.min(elapsed, active.total);
  pending = { pair: active.pair, duration, bpm: active.bpm };
  active = null;
  showView('rating');
  document.getElementById('stage-label').textContent = 'Drill done';
  openRatingModal(reason);
}

// "Cancel & discard" from the rating modal: drop the ended drill, save nothing.
function cancelDrill() {
  closeRatingModal();
  pending = null;
  renderIdle();
}

function openRatingModal(reason) {
  document.getElementById('rating-modal-title').textContent =
    reason === 'complete' ? 'Time! How did that pair feel?' : 'Ended early — how did it feel?';
  document.getElementById('rating-modal').hidden = false;
  document.body.classList.add('modal-open');
}
function closeRatingModal() {
  document.getElementById('rating-modal').hidden = true;
  document.body.classList.remove('modal-open');
}

// In-app confirm dialog — styled like everything else, resolves true/false.
// Enter confirms, Escape or a backdrop tap cancels.
function confirmModal({ title = 'Are you sure?', body = '', confirmLabel = 'Confirm', cancelLabel = 'Cancel' } = {}) {
  return new Promise(resolve => {
    const overlay = document.getElementById('confirm-modal');
    const okBtn = document.getElementById('confirm-ok-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    document.getElementById('confirm-modal-title').textContent = title;
    document.getElementById('confirm-modal-text').textContent = body;
    okBtn.textContent = confirmLabel;
    cancelBtn.textContent = cancelLabel;

    overlay.hidden = false;
    document.body.classList.add('modal-open');
    okBtn.focus();

    const close = result => {
      overlay.hidden = true;
      document.body.classList.remove('modal-open');
      okBtn.onclick = cancelBtn.onclick = overlay.onclick = null;
      document.removeEventListener('keydown', onKey, true);
      resolve(result);
    };
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); close(false); }
      else if (e.key === 'Enter') { e.preventDefault(); close(true); }
    };
    okBtn.onclick = () => close(true);
    cancelBtn.onclick = () => close(false);
    overlay.onclick = e => { if (e.target === overlay) close(false); };
    document.addEventListener('keydown', onKey, true);
  });
}

async function submitSession(rating) {
  if (!pending) return;
  closeRatingModal();
  const { pair, duration, bpm: usedBpm } = pending;
  pending = null;

  // optimistic local count update so the next pick reflects this drill instantly
  const sa = sigStr(pair.a), sb = sigStr(pair.b);
  pairCounts[`${sa}>${sb}`] = (pairCounts[`${sa}>${sb}`] || 0) + 1;
  sigCounts[sa] = (sigCounts[sa] || 0) + 1;
  sigCounts[sb] = (sigCounts[sb] || 0) + 1;

  todays.unshift({ when: new Date(), pair, rating, duration });
  renderToday();

  try {
    await api.record({ pair, duration_seconds: duration, rating, bpm: usedBpm });
    refreshCounts();   // reconcile with the authoritative server counts
  } catch (e) {
    console.warn('Could not save session.', e);
  }
  renderIdle(true);
}

// One quiet line: a colored dot per drill + the day's total. The full log
// lives on the Progress tab.
function renderToday() {
  const dot = r => r == null ? 'var(--muted)' : r === 2 ? 'var(--green)' : r === 1 ? 'var(--amber)' : 'var(--red)';
  document.getElementById('today-dots').innerHTML =
    todays.map(t => `<i style="background:${dot(t.rating)}" title="${t.when.toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit' })}"></i>`).join('');
  const mins = Math.round(todays.reduce((sum, t) => sum + (t.duration || 0), 0) / 60);
  document.getElementById('today-total').textContent = `· ${mins} min`;
  if (currentView !== 'idle') return;
  document.getElementById('today-section').style.display = todays.length ? 'flex' : 'none';
}

async function refreshCounts() {
  try { const c = await api.counts(); pairCounts = c.pairCounts || {}; sigCounts = c.sigCounts || {}; }
  catch { /* keep local optimistic counts */ }
}

// ═══════════════════════════════════════════════════════════════════
// PROGRESS DASHBOARD
// ═══════════════════════════════════════════════════════════════════
const localISO = d => { const off = d.getTimezoneOffset() * 60000; return new Date(d.getTime() - off).toISOString().slice(0, 10); };
const parseUTC = s => new Date(s.replace(' ', 'T') + 'Z');
function fmtDuration(secs) { const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60); return h ? `${h}h ${m}m` : `${m}m`; }
function masteryColor(m) { if (m == null) return 'var(--muted)'; if (m < 0.8) return 'var(--red)'; if (m < 1.5) return 'var(--amber)'; return 'var(--green)'; }
const shapeText = (o, p) => `${o[p+'_form']} ${o[p+'_type']}·${o[p+'_pos']}`;

async function renderDashboard() {
  const el = document.getElementById('progress-content');
  el.innerHTML = `<div class="dash-empty">Loading…</div>`;
  let s;
  try { s = await api.stats(); }
  catch { el.innerHTML = `<div class="dash-empty">Could not load stats.</div>`; return; }

  if (!s.totals.total_sessions) {
    el.innerHTML = `<div class="dash-empty">No drills logged yet.<br>Run a 5-minute session on the Practice tab.</div>`;
    return;
  }

  const cov = s.totals.covered_sigs, covTotal = s.totals.total_sigs;
  const covPct = Math.round((cov / covTotal) * 100);

  el.innerHTML = `
    <div class="stat-cards">
      <div class="stat-card"><div class="num">${s.streak.current}</div><div class="lbl">Day streak</div></div>
      <div class="stat-card"><div class="num">${fmtDuration(s.totals.total_seconds)}</div><div class="lbl">Total time</div></div>
      <div class="stat-card"><div class="num">${s.totals.total_sessions}</div><div class="lbl">Drills</div></div>
      <div class="stat-card"><div class="num">${cov}/${covTotal}</div><div class="lbl">Shapes seen</div></div>
    </div>

    <div class="panel">
      <div class="panel-title">Shape coverage · ${covPct}% of ${covTotal} shapes practiced</div>
      <div class="coverage-bar"><div class="coverage-fill" style="width:${Math.max(covPct, 6)}%">${covPct}%</div></div>
    </div>

    ${s.mastery.struggling + s.mastery.learning + s.mastery.mastered > 0 ? `
    <div class="panel">
      <div class="panel-title">Rated mastery</div>
      ${masteryBarHTML(s.mastery)}
      <div class="mastery-legend">
        <span><i style="background:var(--red)"></i>Struggling ${s.mastery.struggling}</span>
        <span><i style="background:var(--amber)"></i>Learning ${s.mastery.learning}</span>
        <span><i style="background:var(--green)"></i>Mastered ${s.mastery.mastered}</span>
      </div>
    </div>` : ''}

    <div class="panel">
      <div class="panel-title">Activity · last 17 weeks</div>
      <div class="heatmap-wrap">${heatmapSVG(s.daily)}</div>
      <div class="heatmap-legend">less
        <i style="background:#1c1c22"></i><i style="background:#3a2a10"></i>
        <i style="background:#7a4f18"></i><i style="background:#b97c28"></i>
        <i style="background:#e8a045"></i>more</div>
    </div>

    <div class="panel">
      <div class="panel-title">Practice minutes · last 14 days</div>
      ${barChartHTML(s.daily, 14)}
    </div>

    <details class="panel collapsible">
      <summary class="panel-title">Least practiced · the app targets these next</summary>
      <div class="panel-body">${pairListHTML(s.leastPracticed)}</div>
    </details>

    <details class="panel collapsible">
      <summary class="panel-title">Most practiced</summary>
      <div class="panel-body">${pairListHTML(s.mostPracticed)}</div>
    </details>
  `;

  // On narrow screens the heatmap overflows — show the most recent weeks.
  const hw = el.querySelector('.heatmap-wrap');
  if (hw) hw.scrollLeft = hw.scrollWidth;
}

// The whole drill log lives on its own tab: full list, each row deletable.
async function renderHistory() {
  const el = document.getElementById('history-content');
  el.innerHTML = `<div class="dash-empty">Loading…</div>`;
  let history;
  try { history = await api.history(); }
  catch { el.innerHTML = `<div class="dash-empty">Could not load history.</div>`; return; }

  if (!history.length) {
    el.innerHTML = `<div class="dash-empty">No drills logged yet.<br>Run a 5-minute session on the Practice tab.</div>`;
    return;
  }

  el.innerHTML = `
    <div class="panel">
      <div class="panel-title">Drill history · ${history.length}</div>
      ${historyHTML(history)}
    </div>`;

  el.querySelectorAll('.sr-del').forEach(b => b.onclick = () => deleteHistoryEntry(b.dataset.id));
}

// Delete a logged drill, reconcile the practice counts (they drive selection),
// then re-render the history from the server's recomputed numbers.
async function deleteHistoryEntry(id) {
  const ok = await confirmModal({
    title: 'Delete drill?',
    body: 'This drill will be removed and the shape-pair stats recalculated.',
    confirmLabel: 'Delete',
    cancelLabel: 'Keep',
  });
  if (!ok) return;
  try {
    await api.remove(id);
    await refreshCounts();
    renderHistory();
  } catch (e) {
    console.warn('Could not delete drill.', e);
  }
}

function heatmapSVG(daily) {
  const map = new Map(daily.map(d => [d.day, d]));
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 119);
  start.setDate(start.getDate() - start.getDay());          // back to a Sunday
  const todayISO = localISO(today);

  let maxSecs = 1;
  daily.forEach(d => { if (d.secs > maxSecs) maxSecs = d.secs; });
  const color = secs => {
    if (!secs) return '#1c1c22';
    const r = secs / maxSecs;
    if (r < 0.25) return '#3a2a10';
    if (r < 0.5)  return '#7a4f18';
    if (r < 0.75) return '#b97c28';
    return '#e8a045';
  };

  const CELL = 12, GAP = 3, cur = new Date(start), cells = [];
  let weeks = 0;
  while (localISO(cur) <= todayISO) {
    for (let dow = 0; dow < 7; dow++) {
      const iso = localISO(cur);
      if (iso <= todayISO) {
        const rec = map.get(iso);
        cells.push(`<rect x="${weeks*(CELL+GAP)}" y="${dow*(CELL+GAP)}" width="${CELL}" height="${CELL}" fill="${color(rec?.secs || 0)}"><title>${iso}: ${rec ? fmtDuration(rec.secs) : '0m'}, ${rec?.sessions || 0} drills</title></rect>`);
      }
      cur.setDate(cur.getDate() + 1);
    }
    weeks++;
  }
  const w = weeks * (CELL + GAP), h = 7 * (CELL + GAP);
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${cells.join('')}</svg>`;
}

function barChartHTML(daily, n) {
  const map = new Map(daily.map(d => [d.day, d]));
  const today = new Date();
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = localISO(d);
    days.push({ iso, mins: Math.round((map.get(iso)?.secs || 0) / 60), dom: d.getDate() });
  }
  const max = Math.max(1, ...days.map(d => d.mins));
  return `<div class="bar-chart">` + days.map(d => `
    <div class="bar-col" title="${d.iso}: ${d.mins}m">
      <div class="bar ${d.mins ? 'has' : ''}" style="height:${(d.mins / max) * 100}%"></div>
      <div class="bar-lbl">${d.dom}</div>
    </div>`).join('') + `</div>`;
}

function masteryBarHTML(m) {
  const seg = (n, c) => n ? `<div class="mastery-seg" style="flex:${n};background:${c}">${n}</div>` : '';
  return `<div class="mastery-bar">${seg(m.struggling,'var(--red)')}${seg(m.learning,'var(--amber)')}${seg(m.mastered,'var(--green)')}</div>`;
}

function pairListHTML(pairs) {
  if (!pairs?.length) return `<div class="dash-empty">Nothing yet.</div>`;
  return `<div class="pair-list">` + pairs.map(p => `
    <div class="pair-list-item">
      <span class="pl-dot" style="background:${masteryColor(p.mastery)}"></span>
      <span class="pl-name">${shapeText(p,'a')} → ${shapeText(p,'b')}</span>
      <span class="pl-meta">${p.times_practiced}×</span>
    </div>`).join('') + `</div>`;
}

// Full drill log, scrollable so it stays bounded, each row with a delete ✕.
function historyHTML(sessions) {
  if (!sessions?.length) return `<div class="dash-empty">No drills yet.</div>`;
  const dot = r => r == null ? 'var(--muted)' : r === 2 ? 'var(--green)' : r === 1 ? 'var(--amber)' : 'var(--red)';
  return `<div class="history-list">` + sessions.map(s => {
    const d = parseUTC(s.started_at);
    const date = d.toLocaleDateString(undefined, { month:'short', day:'numeric' }) + ' ' +
                 d.toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit' });
    const tempo = s.bpm ? ` · ${s.bpm}bpm` : '';
    return `<div class="session-row">
      <span class="hi-rate" style="background:${dot(s.rating)};width:9px;height:9px"></span>
      <span class="sr-date">${date}</span>
      <span class="sr-meta">${fmtDuration(s.duration_seconds)}${tempo} · ${shapeText(s,'a')} → ${shapeText(s,'b')}</span>
      <button class="sr-del" data-id="${s.id}" title="Delete this drill" aria-label="Delete drill">✕</button>
    </div>`;
  }).join('') + `</div>`;
}

// ═══════════════════════════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════════════════════════
function switchTab(name) {
  if (name !== 'practice' && !active) stopMetronome();   // don't leave an idle preview clicking
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${name}`));
  if (name === 'progress') renderDashboard();
  else if (name === 'history') renderHistory();
}

// Seed today's list from the server so a page reload keeps today's drills.
async function seedToday() {
  try {
    const s = await api.stats();
    const todayISO = localISO(new Date());
    todays = s.recentSessions
      .filter(r => localISO(parseUTC(r.started_at)) === todayISO)
      .map(r => ({
        when: parseUTC(r.started_at),
        rating: r.rating,
        duration: r.duration_seconds,
        pair: {
          a: { root:r.a_root, form:r.a_form, type:r.a_type, pos:r.a_pos },
          b: { root:r.b_root, form:r.b_form, type:r.b_type, pos:r.b_pos },
        },
      }));
    renderToday();
  } catch { /* fine, start with an empty list */ }
}

// ═══════════════════════════════════════════════════════════════════
// WIRING
// ═══════════════════════════════════════════════════════════════════
async function init() {
  loadPrefs();
  initChips();
  updateMetroUI();
  updateDrillSummary();
  await refreshCounts();
  renderIdle();
  seedToday();

  document.getElementById('start-btn').onclick = startDrill;
  document.getElementById('shuffle-btn').onclick = () => renderIdle(true);
  document.getElementById('bpm-down').onclick = () => setBpm(bpm - BPM_STEP);
  document.getElementById('bpm-up').onclick = () => setBpm(bpm + BPM_STEP);
  document.getElementById('metro-toggle').onclick = toggleMetronome;
  document.getElementById('settings-btn').onclick = openSettings;
  document.getElementById('settings-done-btn').onclick = closeSettings;
  const settingsOverlay = document.getElementById('settings-modal');
  settingsOverlay.onclick = e => { if (e.target === settingsOverlay) closeSettings(); };
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !settingsOverlay.hidden) { e.preventDefault(); closeSettings(); }
  });
  document.getElementById('endearly-btn').onclick = () => finishDrill('early');
  document.getElementById('cancel-btn').onclick = cancelDrill;
  document.getElementById('prep-cancel-btn').onclick = cancelPrep;
  document.getElementById('skip-rating-btn').onclick = () => submitSession(null);
  document.querySelectorAll('.rate-btn').forEach(b => b.onclick = () => submitSession(Number(b.dataset.rating)));
  document.querySelectorAll('.tab').forEach(t => t.onclick = () => switchTab(t.dataset.tab));

  document.addEventListener('keydown', e => {
    if (e.target !== document.body) return;
    if (currentView === 'idle' && e.code === 'Space') { e.preventDefault(); startDrill(); }
    else if (currentView === 'rating' && ['Digit1','Digit2','Digit3'].includes(e.code)) {
      submitSession(Number(e.code.slice(-1)) - 1);
    }
  });
}

init();
