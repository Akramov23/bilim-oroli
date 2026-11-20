// Darslar: Matematika, Ingliz tili, Nemis tili, Mantiq, Dunyo bilimi
import { t, tr } from './i18n.js';
import { state, save, level } from './state.js';
import { WORDS, FACTS, ODD_GROUPS } from './data.js';
import { h, showSlides, runQuiz, shuffle, rand, pick } from './ui.js';
import { speak } from './audio.js';
import { openLesson2 } from './lessons2.js';
import { track } from './progress.js';

export const ACCENT = { math: '#4f8cff', english: '#ff5a5f', german: '#f4a300', logic: '#9b5de5', science: '#2ec4b6', shapes: '#00a6d6', clock: '#6aa51b', russian: '#c2185b' };

const fin = s => { state.stats.lessons++; state.stats.correct += s; track('lesson'); track('correct', s); };

export function openLesson(id) {
  const m = { math, english: () => vocab('en', 'english'), german: () => vocab('de', 'german'), russian: () => vocab('ru', 'russian'), logic, science, shapes, clock };
  if (m[id]) m[id](); else openLesson2(id);
}

export function makeOptions(ans, spread) {
  const set = new Set([ans]);
  let guard = 0;
  while (set.size < 4 && guard++ < 200) { const v = ans + rand(-spread, spread); if (v >= 0) set.add(v); }
  let k = 1; while (set.size < 4) set.add(ans + k++);
  const arr = shuffle([...set]);
  return { options: arr.map(String), answer: arr.indexOf(ans) };
}

export function mathOps(L) { return L <= 1 ? ['+'] : L <= 3 ? ['+', '-'] : L <= 5 ? ['+', '-', '×'] : ['+', '-', '×', '÷']; }
const FRUITS = ['🍎', '🍊', '🍓', '🍌', '🍇', '🍐', '🍒'];

function emojiMath(a, b, op) {
  const f = pick(FRUITS);
  if (op === '+') return `<span class="em">${f.repeat(a)}</span> <b>+</b> <span class="em">${f.repeat(b)}</span>`;
  return `<span class="em">${f.repeat(a - b)}<s class="gone">${f.repeat(b)}</s></span>`;
}

export function mathQuestion(L, op) {
  op = op || pick(mathOps(L));
  const max = L <= 2 ? 10 : L <= 4 ? 20 : L <= 6 ? 50 : 100;
  let a, b, ans;
  if (op === '+') { a = rand(1, max - 1); b = rand(1, max - a); ans = a + b; }
  else if (op === '-') { a = rand(2, max); b = rand(1, a); ans = a - b; }
  else if (op === '×') { a = rand(2, L <= 5 ? 5 : 10); b = rand(1, 10); ans = a * b; }
  else { b = rand(2, 9); ans = rand(1, 9); a = b * ans; }
  const { options, answer } = makeOptions(ans, Math.max(3, Math.round(ans * 0.3)));
  const visual = (op === '+' || op === '-') && a <= 10 && b <= 10 ? emojiMath(a, b, op) : null;
  return { prompt: `${a} ${op} ${b} = ?`, visual, options, answer, big: true };
}

function math() {
  const L = level();
  const ops = mathOps(L);
  const op = ops[state.stats.lessons % ops.length];
  const key = { '+': 'm_add', '-': 'm_sub', '×': 'm_mul', '÷': 'm_div' }[op];
  const ex = {
    '+': ['<span class="em">🍎🍎🍎</span> <b>+</b> <span class="em">🍎🍎</span> <b>=</b> <span class="em">🍎🍎🍎🍎🍎</span>', '3 + 2 = 5'],
    '-': ['<span class="em">🍓🍓🍓<s class="gone">🍓🍓</s></span> <b>=</b> <span class="em">🍓🍓🍓</span>', '5 − 2 = 3'],
    '×': ['<span class="em grp">🍌🍌</span><span class="em grp">🍌🍌</span><span class="em grp">🍌🍌</span>', '3 × 2 = 2 + 2 + 2 = 6'],
    '÷': ['<span class="em grp">🍇🍇🍇</span><span class="em grp">🍇🍇🍇</span>', '6 ÷ 2 = 3'],
  }[op];
  const slides = [() => h('div', { class: 'learn' },
    h('div', { class: 'big-emoji bounce' }, '🦉'),
    h('h3', {}, t(key)),
    h('div', { class: 'visual', html: ex[0] }),
    h('div', { class: 'equation' }, ex[1]),
    h('p', { class: 'tip' }, '💡 ' + t(key + '_tip')))];
  const questions = shuffle([...Array.from({ length: 4 }, (_, i) => mathQuestion(L, i < 3 ? op : undefined)), wordProblem(L), compareQ(L)]);
  const title = '🔢 ' + t('z_math');
  showSlides({ title, accent: ACCENT.math, slides, onDone: () => runQuiz({ title, accent: ACCENT.math, questions, onFinish: fin, onAgain: math }) });
}

function vocab(target, id) {
  const N = 5;
  const start = state.stats.wordIdx % WORDS.length;
  const words = Array.from({ length: N }, (_, k) => WORDS[(start + k) % WORDS.length]);
  state.stats.wordIdx = (start + N) % WORDS.length; save();
  const native = w => w[state.lang];
  const same = state.lang === target;
  const title = ({ en: '🔤 ', de: '🥨 ', ru: '🪆 ' })[target] + t('z_' + id);
  const slides = [() => h('div', { class: 'learn' },
    h('h3', {}, t('wordsLearn')),
    h('p', { class: 'tip' }, t('tapToHear')),
    h('div', { class: 'word-grid' }, words.map((w, i) => h('button', { class: 'word-card pop', style: { animationDelay: i * 0.08 + 's' }, onclick: () => speak(w[target], target) },
      h('div', { class: 'em' }, w.e),
      h('div', { class: 'w' }, w[target]),
      same ? null : h('div', { class: 'n' }, native(w)),
      h('div', { class: 'spk' }, '🔊')))))];
  const questions = shuffle(words).map((w, k) => {
    const others = shuffle(WORDS.filter(x => x !== w)).slice(0, 3);
    const all = shuffle([w, ...others]);
    if (k % 2 === 0) {
      return { prompt: t({ en: 'whichWordEn', de: 'whichWordDe', ru: 'whichWordRu' }[target]), visual: `<span class="em xl">${w.e}</span>${same ? '' : `<div class="n">${native(w)}</div>`}`, options: all.map(x => x[target]), answer: all.indexOf(w), say: [w[target], target] };
    }
    return { prompt: t('whatMeans', { w: w[target] }), options: all.map(x => x.e), answer: all.indexOf(w), big: true, say: [w[target], target] };
  });
  showSlides({ title, accent: ACCENT[id], slides, onDone: () => runQuiz({ title, accent: ACCENT[id], questions, onFinish: fin, onAgain: () => vocab(target, id) }) });
}

// ---------- Mantiq ----------
function seqQ() {
  const L = level();
  const d = rand(1, L < 3 ? 3 : L < 5 ? 5 : 10);
  const a = rand(0, 10);
  const arr = [0, 1, 2, 3].map(k => a + k * d);
  const ans = a + 4 * d;
  const { options, answer } = makeOptions(ans, Math.max(2, d));
  return { prompt: t('whatNext'), visual: `<div class="seq">${arr.join(', ')}, <b>?</b></div>`, options, answer, big: true };
}
function patQ() {
  const sets = [['🔴', '🔵'], ['⭐', '🌙'], ['🍎', '🍌', '🍇'], ['🐶', '🐱'], ['🔺', '🟦', '🟢']];
  const pool = ['🔴', '🔵', '⭐', '🌙', '🍎', '🍌', '🍇', '🐶', '🐱', '🔺', '🟦', '🟢'];
  const s = pick(sets);
  const pat = s.length === 2 ? pick([[0, 1], [0, 0, 1], [0, 1, 1]]) : [0, 1, 2];
  const seq = Array.from({ length: 7 }, (_, k) => s[pat[k % pat.length]]);
  const ans = s[pat[7 % pat.length]];
  const others = new Set(s.filter(x => x !== ans));
  while (others.size < 3) { const p = pick(pool); if (p !== ans) others.add(p); }
  const arr = shuffle([ans, ...[...others].slice(0, 3)]);
  return { prompt: t('whatNext'), visual: `<div class="seq em">${seq.join(' ')} <b>?</b></div>`, options: arr, answer: arr.indexOf(ans), big: true };
}
function oddQ() {
  const [g1, g2] = shuffle(ODD_GROUPS).slice(0, 2);
  const three = shuffle(g1).slice(0, 3);
  const odd = pick(g2);
  const arr = shuffle([...three, odd]);
  return { prompt: t('oddOne'), options: arr, answer: arr.indexOf(odd), big: true };
}

function logic() {
  const title = '🧩 ' + t('z_logic');
  const slides = [
    () => h('div', { class: 'learn' },
      h('div', { class: 'big-emoji bounce' }, '🧠'),
      h('h3', {}, t('logicLearn')),
      h('div', { class: 'ex-box' }, h('div', { class: 'seq' }, '2, 4, 6, 8, ', h('b', {}, '10')), h('p', { class: 'tip' }, t('logic_tip1'))),
      h('div', { class: 'ex-box' }, h('div', { class: 'seq em' }, '🔴 🔵 🔴 🔵 ', h('b', {}, '🔴')), h('p', { class: 'tip' }, t('logic_tip2'))),
      h('div', { class: 'ex-box' }, h('div', { class: 'seq em' }, '🍎 🍌 🍇 ', h('b', { class: 'odd' }, '🚗')), h('p', { class: 'tip' }, t('logic_tip3')))),
  ];
  const questions = shuffle([seqQ(), seqQ(), patQ(), patQ(), oddQ(), oddQ()]);
  showSlides({ title, accent: ACCENT.logic, slides, onDone: () => runQuiz({ title, accent: ACCENT.logic, questions, onFinish: fin, onAgain: logic }) });
}

// ---------- Dunyo bilimi ----------
function science() {
  const N = 5;
  const start = state.stats.factIdx % FACTS.length;
  const facts = Array.from({ length: N }, (_, k) => FACTS[(start + k) % FACTS.length]);
  state.stats.factIdx = (start + N) % FACTS.length; save();
  const ans = a => (typeof a === 'string' ? a : tr(a));
  const title = '🌍 ' + t('z_science');
  const slides = [() => h('div', { class: 'learn' },
    h('h3', {}, t('scienceLearn')),
    h('div', { class: 'facts' }, facts.map((f, i) => h('div', { class: 'fact pop', style: { animationDelay: i * 0.08 + 's' } },
      h('span', { class: 'em' }, f.e),
      h('div', {}, h('div', { class: 'q' }, tr(f.q)), h('div', { class: 'a' }, '✅ ' + ans(f.a[0]))))))
  )];
  const questions = shuffle(facts).map(f => {
    const opts = shuffle(f.a.map(ans));
    return { prompt: tr(f.q), visual: `<span class="em xl">${f.e}</span>`, options: opts, answer: opts.indexOf(ans(f.a[0])) };
  });
  showSlides({ title, accent: ACCENT.science, slides, onDone: () => runQuiz({ title, accent: ACCENT.science, questions, onFinish: fin, onAgain: science }) });
}

// ---------- Matematik masalalar va taqqoslash ----------
const OBJ = ['🍎', '🍬', '🎈', '🍪', '⚽', '🌸'];
function wordProblem(L) {
  const o = pick(OBJ);
  const max = L <= 2 ? 10 : L <= 4 ? 20 : 50;
  let key, a, b, ans;
  const kinds = L >= 4 ? ['wp_add', 'wp_sub', 'wp_mul'] : L >= 2 ? ['wp_add', 'wp_sub'] : ['wp_add'];
  key = pick(kinds);
  if (key === 'wp_add') { a = rand(1, max - 1); b = rand(1, max - a); ans = a + b; }
  else if (key === 'wp_sub') { a = rand(2, max); b = rand(1, a - 1); ans = a - b; }
  else { a = rand(2, 5); b = rand(2, 6); ans = a * b; }
  const { options, answer } = makeOptions(ans, Math.max(3, Math.round(ans * 0.3)));
  return { prompt: '📖 ' + t('wordProblem'), visual: `<div class="story">${t(key, { a, b, o })}</div>`, options, answer, big: true };
}
function compareQ(L) {
  const max = L <= 2 ? 10 : L <= 4 ? 50 : 100;
  const a = rand(0, max), b = Math.random() < 0.2 ? a : rand(0, max);
  const sign = a > b ? '>' : a < b ? '<' : '=';
  const options = ['>', '<', '='];
  return { prompt: t('compareQ'), visual: `<div class="seq">${a} <b>?</b> ${b}</div>`, options, answer: options.indexOf(sign), big: true };
}

// ---------- Shakllar ----------
const SHAPES = [
  { id: 'circle', sides: 0, color: '#ff5a5f', n: { uz: 'Doira', ru: 'Круг', en: 'Circle', de: 'Kreis' } },
  { id: 'triangle', sides: 3, color: '#ffb703', n: { uz: 'Uchburchak', ru: 'Треугольник', en: 'Triangle', de: 'Dreieck' } },
  { id: 'square', sides: 4, color: '#4f8cff', n: { uz: 'Kvadrat', ru: 'Квадрат', en: 'Square', de: 'Quadrat' } },
  { id: 'rectangle', sides: 4, color: '#34c759', n: { uz: "To'g'ri to'rtburchak", ru: 'Прямоугольник', en: 'Rectangle', de: 'Rechteck' } },
  { id: 'pentagon', sides: 5, color: '#9b5de5', n: { uz: 'Beshburchak', ru: 'Пятиугольник', en: 'Pentagon', de: 'Fünfeck' } },
  { id: 'hexagon', sides: 6, color: '#ff8c42', n: { uz: 'Oltiburchak', ru: 'Шестиугольник', en: 'Hexagon', de: 'Sechseck' } },
  { id: 'star', sides: 10, color: '#f4c20d', n: { uz: 'Yulduz', ru: 'Звезда', en: 'Star', de: 'Stern' } },
  { id: 'oval', sides: 0, color: '#ff6fb5', n: { uz: 'Oval', ru: 'Овал', en: 'Oval', de: 'Oval' } },
];
function poly(n, r, rot = -Math.PI / 2, inner = 0) {
  const pts = [];
  const cnt = inner ? n * 2 : n;
  for (let i = 0; i < cnt; i++) {
    const rr = inner && i % 2 ? inner : r;
    const a = rot + i / cnt * Math.PI * 2;
    pts.push((50 + Math.cos(a) * rr).toFixed(1) + ',' + (50 + Math.sin(a) * rr).toFixed(1));
  }
  return pts.join(' ');
}
export function shapeSvg(id, size = 90) {
  const s = SHAPES.find(x => x.id === id);
  const st = `fill="${s.color}" stroke="rgba(0,0,0,.25)" stroke-width="3" stroke-linejoin="round"`;
  let body;
  if (id === 'circle') body = `<circle cx="50" cy="50" r="40" ${st}/>`;
  else if (id === 'oval') body = `<ellipse cx="50" cy="50" rx="44" ry="28" ${st}/>`;
  else if (id === 'square') body = `<rect x="14" y="14" width="72" height="72" rx="3" ${st}/>`;
  else if (id === 'rectangle') body = `<rect x="6" y="26" width="88" height="48" rx="3" ${st}/>`;
  else if (id === 'star') body = `<polygon points="${poly(5, 44, -Math.PI / 2, 19)}" ${st}/>`;
  else body = `<polygon points="${poly(s.sides, 42)}" ${st}/>`;
  return `<svg class="shape" viewBox="0 0 100 100" width="${size}" height="${size}">${body}</svg>`;
}
const POLYS = SHAPES.filter(s => s.sides >= 3 && s.sides <= 6);

function shapes() {
  const title = '🔷 ' + t('z_shapes');
  const slides = [() => h('div', { class: 'learn' },
    h('h3', {}, t('shapesLearn')),
    h('div', { class: 'shape-grid' }, SHAPES.map((s, i) => h('div', { class: 'shape-card pop', style: { animationDelay: i * 0.06 + 's' } },
      h('div', { html: shapeSvg(s.id, 70) }),
      h('b', {}, tr(s.n)),
      s.sides && s.sides <= 6 ? h('small', {}, t('cornersN', { n: s.sides })) : null))),
    h('p', { class: 'tip' }, '💡 ' + t('shapes_tip')))];
  const qs = [];
  for (const s of shuffle(SHAPES).slice(0, 2)) {
    const all = shuffle([s, ...shuffle(SHAPES.filter(x => x !== s)).slice(0, 3)]);
    qs.push({ prompt: t('whatShape'), visual: shapeSvg(s.id, 120), options: all.map(x => tr(x.n)), answer: all.indexOf(s) });
  }
  for (const s of shuffle(POLYS).slice(0, 2)) {
    const opts = ['3', '4', '5', '6'];
    qs.push({ prompt: t('howManyCorners'), visual: shapeSvg(s.id, 120), options: opts, answer: opts.indexOf(String(s.sides)), big: true });
  }
  for (const s of shuffle(SHAPES).slice(0, 2)) {
    const all = shuffle([s, ...shuffle(SHAPES.filter(x => x !== s)).slice(0, 3)]);
    qs.push({ prompt: t('findShape', { s: tr(s.n) }), options: all.map(x => shapeSvg(x.id, 64)), htmlOptions: true, answerText: tr(s.n), answer: all.indexOf(s) });
  }
  showSlides({ title, accent: ACCENT.shapes, slides, onDone: () => runQuiz({ title, accent: ACCENT.shapes, questions: shuffle(qs), onFinish: fin, onAgain: shapes }) });
}

// ---------- Soat ----------
export function clockSvg(hh, mm, size = 140) {
  const ha = ((hh % 12) + mm / 60) * 30, ma = mm * 6;
  let ticks = '';
  for (let i = 1; i <= 12; i++) {
    const a = i * 30 * Math.PI / 180;
    ticks += `<text x="${(50 + Math.sin(a) * 36).toFixed(1)}" y="${(50 - Math.cos(a) * 36 + 4).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="900" fill="#1d2340">${i}</text>`;
  }
  return `<svg class="clock" viewBox="0 0 100 100" width="${size}" height="${size}">
    <circle cx="50" cy="50" r="46" fill="#fffdf5" stroke="#6aa51b" stroke-width="5"/>${ticks}
    <line x1="50" y1="50" x2="${(50 + Math.sin(ha * Math.PI / 180) * 20).toFixed(1)}" y2="${(50 - Math.cos(ha * Math.PI / 180) * 20).toFixed(1)}" stroke="#ff5a5f" stroke-width="6" stroke-linecap="round"/>
    <line x1="50" y1="50" x2="${(50 + Math.sin(ma * Math.PI / 180) * 31).toFixed(1)}" y2="${(50 - Math.cos(ma * Math.PI / 180) * 31).toFixed(1)}" stroke="#4f8cff" stroke-width="4" stroke-linecap="round"/>
    <circle cx="50" cy="50" r="4" fill="#1d2340"/></svg>`;
}
const fmt = (hh, mm) => hh + ':' + String(mm).padStart(2, '0');
function clock() {
  const L = level();
  const mins = L <= 2 ? [0] : L <= 4 ? [0, 30] : [0, 15, 30, 45];
  const rnd = () => [rand(1, 12), pick(mins)];
  const title = '🕐 ' + t('z_clock');
  const slides = [() => h('div', { class: 'learn' },
    h('h3', {}, t('clockLearn')),
    h('div', { class: 'row center' },
      h('div', { class: 'ex-box' }, h('div', { html: clockSvg(3, 0, 130) }), h('div', { class: 'equation' }, '3:00')),
      h('div', { class: 'ex-box' }, h('div', { html: clockSvg(3, 30, 130) }), h('div', { class: 'equation' }, '3:30'))),
    h('p', { class: 'tip' }, '🔴 ' + t('clock_tip1')),
    h('p', { class: 'tip' }, '🔵 ' + t('clock_tip2')))];
  const qs = [];
  const seen = new Set();
  const uniq = () => { let x; do { x = rnd(); } while (seen.has(fmt(...x))); seen.add(fmt(...x)); return x; };
  for (let i = 0; i < 4; i++) {
    const [hh, mm] = uniq();
    const opts = new Set([fmt(hh, mm)]);
    while (opts.size < 4) { const [a, b] = rnd(); opts.add(fmt(a, b)); }
    const arr = shuffle([...opts]);
    qs.push({ prompt: t('whatTime'), visual: clockSvg(hh, mm, 150), options: arr, answer: arr.indexOf(fmt(hh, mm)), big: true });
  }
  for (let i = 0; i < 2; i++) {
    const [hh, mm] = uniq();
    const opts = new Map([[fmt(hh, mm), [hh, mm]]]);
    while (opts.size < 4) { const x = rnd(); opts.set(fmt(...x), x); }
    const arr = shuffle([...opts.values()]);
    qs.push({ prompt: t('findClock', { t: fmt(hh, mm) }), options: arr.map(([a, b]) => clockSvg(a, b, 84)), htmlOptions: true, answerText: fmt(hh, mm), answer: arr.findIndex(([a, b]) => a === hh && b === mm) });
  }
  showSlides({ title, accent: ACCENT.clock, slides, onDone: () => runQuiz({ title, accent: ACCENT.clock, questions: shuffle(qs), onFinish: fin, onAgain: clock }) });
}
