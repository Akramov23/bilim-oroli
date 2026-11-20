// Umumiy UI: modal oyna, xabarlar, konfetti, test dvigateli, mukofotlar
import { t, tr } from './i18n.js';
import { sfx, speak } from './audio.js';
import { grant } from './state.js';
import { RARITY } from './data.js';

export const $ = (s, r = document) => r.querySelector(s);
export const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export function shuffle(a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

export function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') { for (const [sk, sv] of Object.entries(v)) sk.startsWith('--') ? e.style.setProperty(sk, sv) : (e.style[sk] = sv); }
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') e.innerHTML = v;
    else if (k in e && typeof v !== 'string') e[k] = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    e.append(k.nodeType ? k : document.createTextNode(String(k)));
  }
  return e;
}

// ---------- Modal ----------
let closeCb = null;
export function openModal(title, body, { accent, onClose, wide } = {}) {
  const prev = closeCb; closeCb = null; prev && prev();
  const m = $('#modal');
  $('#modalTitle').textContent = title;
  $('#modalBody').replaceChildren(body);
  m.style.setProperty('--accent', accent || 'var(--primary)');
  m.classList.toggle('wide', !!wide);
  const card = $('.modal-card', m); card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop');
  m.classList.remove('hidden');
  closeCb = onClose || null;
  dispatchEvent(new CustomEvent('modal', { detail: true }));
}
export function closeModal() {
  const m = $('#modal');
  if (m.classList.contains('hidden')) return;
  m.classList.add('hidden');
  const cb = closeCb; closeCb = null; cb && cb();
  dispatchEvent(new CustomEvent('modal', { detail: false }));
}
export const modalOpen = () => !$('#modal').classList.contains('hidden');

export function toast(msg, ms = 2400) {
  const el = h('div', { class: 'toast' }, msg);
  $('#toasts').append(el);
  setTimeout(() => el.classList.add('out'), ms);
  setTimeout(() => el.remove(), ms + 400);
}

export function confetti(n = 90) {
  const box = $('#confetti');
  const cols = ['#ff5a5f', '#ffd166', '#4f8cff', '#34c759', '#9b5de5', '#ff6fb5', '#ff8c42'];
  for (let i = 0; i < n; i++) {
    const p = h('i', { style: { left: Math.random() * 100 + 'vw', background: pick(cols), animationDelay: Math.random() * 0.5 + 's', animationDuration: 1.8 + Math.random() * 1.6 + 's', transform: `rotate(${Math.random() * 360}deg)` } });
    box.append(p);
    setTimeout(() => p.remove(), 4200);
  }
}

// ---------- Kartalar ----------
export function cardNode(c, extra = '') {
  const R = RARITY[c.r];
  return h('div', { class: 'card r-' + c.r + ' ' + extra, style: { '--rc': R.color } },
    h('div', { class: 'stars' }, '★'.repeat(R.stars)),
    h('div', { class: 'em' }, c.e),
    h('div', { class: 'cname' }, tr(c.n)),
    h('div', { class: 'rar' }, t('r_' + c.r)));
}

// ---------- Slaydlar (o'rganish qismi) ----------
export function showSlides({ title, accent, slides, finalLabel, onDone }) {
  let i = 0;
  const wrap = h('div', { class: 'slides' });
  function render() {
    wrap.replaceChildren(
      h('div', { class: 'slide pop' }, slides[i]()),
      h('div', { class: 'row nav' },
        i > 0 ? h('button', { class: 'btn ghost', onclick: () => { i--; render(); } }, t('back')) : h('span'),
        h('button', { class: 'btn primary big', onclick: () => { if (i < slides.length - 1) { i++; render(); } else onDone(); } },
          i < slides.length - 1 ? t('next') : (finalLabel || t('startQuiz')))));
  }
  render();
  openModal(title, wrap, { accent });
}

// ---------- Test ----------
// question: { prompt, visual?(html), options:[str], answer:idx, big?, say?:[text, lang] }
export function runQuiz({ title, accent, questions, onAgain, onFinish }) {
  let i = 0, score = 0;
  const wrap = h('div', { class: 'quiz' });
  function render() {
    const q = questions[i];
    let locked = false;
    const feedback = h('div', { class: 'feedback' });
    const opts = h('div', { class: 'options' + (q.big ? ' big' : '') });
    q.options.forEach((o, k) => {
      const b = h('button', {
        class: 'opt pop', style: { animationDelay: k * 0.05 + 's' }, onclick: () => {
          if (locked) return; locked = true;
          const ok = k === q.answer;
          if (ok) { score++; sfx.correct(); b.classList.add('right'); feedback.textContent = t('correct'); feedback.className = 'feedback ok'; }
          else { sfx.wrong(); b.classList.add('bad'); opts.children[q.answer].classList.add('right'); feedback.textContent = t('wrong', { a: q.answerText ?? q.options[q.answer] }); feedback.className = 'feedback no'; }
          if (q.say) speak(q.say[0], q.say[1]);
          setTimeout(() => { i++; i < questions.length ? render() : finish(); }, ok ? 950 : 1900);
        }
      }, q.htmlOptions ? null : o);
      if (q.htmlOptions) b.innerHTML = o;
      opts.append(b);
    });
    wrap.replaceChildren(
      h('div', { class: 'dots' }, questions.map((_, k) => h('span', { class: k < i ? 'done' : k === i ? 'cur' : '' }))),
      h('div', { class: 'prompt' }, q.prompt,
        q.say ? h('button', { class: 'spk-btn', onclick: () => speak(q.say[0], q.say[1]) }, '🔊') : null),
      q.visual ? h('div', { class: 'visual', html: q.visual }) : null,
      opts, feedback);
  }
  function finish() {
    const n = questions.length;
    const perfect = score === n;
    const coins = score * 2 + (perfect ? 5 : 0);
    const xp = score * 10 + 10;
    onFinish && onFinish(score);
    showReward({ title, accent, headline: t('resultText', { n: score, total: n }), stars: Math.round(score / n * 3), perfect, coins, xp, onAgain });
  }
  render();
  openModal(title, wrap, { accent });
}

// ---------- Mukofot oynasi ----------
export function showReward({ title, accent, headline, stars = 3, perfect, coins, xp, onAgain }) {
  const res = grant(coins, xp);
  const proceed = next => {
    if (res.levelUp) { const r = { ...res }; res.levelUp = 0; showLevelUp(r, next); }
    else next();
  };
  const st = Math.max(1, Math.min(3, stars));
  const node = h('div', { class: 'reward' },
    h('div', { class: 'reward-stars' }, [0, 1, 2].map(k => h('span', { class: k < st ? 'on' : '', style: { animationDelay: 0.15 + k * 0.18 + 's' } }, '★'))),
    h('h3', {}, headline),
    h('p', { class: 'cheer' }, perfect ? t('perfect') : st >= 2 ? t('good') : t('tryMore')),
    h('div', { class: 'earned' },
      h('span', { class: 'pill gold' }, '+' + coins + ' 🪙'),
      h('span', { class: 'pill xp' }, '+' + xp + ' XP')),
    h('div', { class: 'row center' },
      onAgain ? h('button', { class: 'btn ghost', onclick: () => proceed(onAgain) }, '🔁 ' + t('again')) : null,
      h('button', { class: 'btn primary big', onclick: () => proceed(closeModal) }, t('done') + ' ✔')));
  openModal(title, node, { accent });
  sfx.level();
  if (perfect) confetti();
}

export function showLevelUp(res, next = closeModal) {
  sfx.level(); confetti(140);
  const node = h('div', { class: 'levelup' },
    h('div', { class: 'lv-burst' }, h('span', {}, res.levelUp)),
    h('h3', {}, t('levelUpText', { l: res.levelUp })),
    res.newCards.length ? h('p', {}, t('newCards')) : null,
    res.newCards.length ? h('div', { class: 'card-row' }, res.newCards.map((c, i) => { const n = cardNode(c, 'pop'); n.style.animationDelay = 0.3 + i * 0.2 + 's'; return n; })) : null,
    h('p', { class: 'tip' }, t('levelShopTip')),
    h('button', { class: 'btn primary big', onclick: () => next() }, t('awesome')));
  openModal(t('levelUp'), node, { accent: '#ffb703' });
}
