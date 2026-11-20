// Kunlik vazifalar, yutuqlar (nishonlar), kunlik seriya va omad g'ildiragi
import { state, save, grant, level } from './state.js';
import { t } from './i18n.js';
import { h, openModal, closeModal, toast, confetti, cardNode, pick } from './ui.js';
import { sfx } from './audio.js';
import { CARDS } from './data.js';

const QUESTS = [
  { id: 'lessons', ev: 'lesson', goals: [2, 3], reward: 25, e: '📚' },
  { id: 'correct', ev: 'correct', goals: [10, 15], reward: 25, e: '✅' },
  { id: 'coins', ev: 'coin', goals: [15, 25], reward: 20, e: '🪙' },
  { id: 'game', ev: 'game', goals: [2, 3], reward: 20, e: '🎮' },
  { id: 'chest', ev: 'chest', goals: [1, 2], reward: 30, e: '🧰' },
  { id: 'race', ev: 'race', goals: [1], reward: 30, e: '🏁' },
  { id: 'buy', ev: 'buy', goals: [1], reward: 15, e: '🛍️' },
  { id: 'jump', ev: 'jump', goals: [3, 5], reward: 15, e: '🤸' },
];
export const ACHS = [
  { id: 'first', e: '🎓', v: 'lessons', goal: 1, reward: 20 },
  { id: 'lessons10', e: '📚', v: 'lessons', goal: 10, reward: 50 },
  { id: 'lessons50', e: '🏫', v: 'lessons', goal: 50, reward: 150 },
  { id: 'correct100', e: '✅', v: 'correct', goal: 100, reward: 60 },
  { id: 'correct500', e: '🧠', v: 'correct', goal: 500, reward: 200 },
  { id: 'coins100', e: '🪙', v: 'coinsPicked', goal: 100, reward: 50 },
  { id: 'cards10', e: '🃏', v: 'cards', goal: 10, reward: 50 },
  { id: 'cards20', e: '🎴', v: 'cards', goal: 20, reward: 120 },
  { id: 'level5', e: '⭐', v: 'level', goal: 5, reward: 80 },
  { id: 'level10', e: '🌟', v: 'level', goal: 10, reward: 200 },
  { id: 'chest5', e: '🧰', v: 'chests', goal: 5, reward: 60 },
  { id: 'race1', e: '🏁', v: 'races', goal: 1, reward: 40 },
  { id: 'games10', e: '🎮', v: 'games', goal: 10, reward: 60 },
  { id: 'shopper', e: '🛍️', v: 'buys', goal: 10, reward: 80 },
  { id: 'streak3', e: '🔥', v: 'streak', goal: 3, reward: 50 },
  { id: 'streak7', e: '🏆', v: 'streak', goal: 7, reward: 150 },
  { id: 'jumper', e: '🤸', v: 'jumps', goal: 20, reward: 40 },
];
const STAT_OF = { coin: 'coinsPicked', chest: 'chests', race: 'races', game: 'games', buy: 'buys', jump: 'jumps' };

function today() { return new Date().toDateString(); }
function hash(s) { let x = 7; for (const c of s) x = (x * 31 + c.charCodeAt(0)) % 1000003; return x; }

export function ensureQuests() {
  const d = today();
  if (state.quests && state.quests.day === d) return state.quests;
  let seed = hash(d);
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const pool = [...QUESTS];
  const list = [];
  while (list.length < 3) {
    const q = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
    const goal = q.goals[Math.min(q.goals.length - 1, level() >= 4 ? 1 : 0)];
    list.push({ id: q.id, ev: q.ev, e: q.e, goal, prog: 0, reward: q.reward, done: false });
  }
  state.quests = { day: d, list, bonus: false };
  return state.quests;
}

function value(v) {
  if (v === 'cards') return state.cards.length;
  if (v === 'level') return level();
  if (v === 'streak') return (state.streak && state.streak.count) || 0;
  return state.stats[v] || 0;
}

function checkAch() {
  state.ach = state.ach || {};
  for (const a of ACHS) {
    if (state.ach[a.id] || value(a.v) < a.goal) continue;
    state.ach[a.id] = true;
    grant(a.reward, 0);
    sfx.level(); confetti(70);
    toast(`🏅 ${t('achGot')}: ${a.e} ${t('a_' + a.id)}  +${a.reward} 🪙`, 3800);
  }
}

// O'yindagi har qanday voqea shu yerga keladi
export function track(ev, n = 1) {
  if (STAT_OF[ev]) state.stats[STAT_OF[ev]] = (state.stats[STAT_OF[ev]] || 0) + n;
  const qs = ensureQuests();
  for (const q of qs.list) {
    if (q.ev !== ev || q.done) continue;
    q.prog = Math.min(q.goal, q.prog + n);
    if (q.prog >= q.goal) {
      q.done = true;
      grant(q.reward, 10);
      sfx.correct();
      toast(`📋 ${t('questDone')}: ${q.e} ${t('q_' + q.id, { n: q.goal })}  +${q.reward} 🪙`, 3500);
    }
  }
  if (!qs.bonus && qs.list.every(q => q.done)) {
    qs.bonus = true; grant(50, 30); confetti(120); sfx.level();
    setTimeout(() => toast('🎉 ' + t('allDone'), 4000), 900);
  }
  checkAch();
  save();
}
addEventListener('bo-track', e => track(e.detail.ev, e.detail.n));

export function questBadge() {
  const qs = ensureQuests();
  return qs.list.filter(q => q.done).length + '/' + qs.list.length;
}

// ---------- Vazifalar va yutuqlar oynasi ----------
export function openQuests(tab = 'daily') {
  const qs = ensureQuests();
  const tabs = h('div', { class: 'tabs' },
    h('button', { class: 'tab' + (tab === 'daily' ? ' active' : ''), onclick: () => openQuests('daily') }, '📋 ' + t('dailyQuests')),
    h('button', { class: 'tab' + (tab === 'ach' ? ' active' : ''), onclick: () => openQuests('ach') }, '🏅 ' + t('achievements')));
  let body;
  if (tab === 'daily') {
    const streak = (state.streak && state.streak.count) || 0;
    body = h('div', { class: 'quests' },
      h('div', { class: 'streak-pill' }, '🔥 ' + t('streakDays', { n: streak })),
      qs.list.map(q => h('div', { class: 'quest' + (q.done ? ' done' : '') },
        h('div', { class: 'qe' }, q.done ? '✅' : q.e),
        h('div', { class: 'qbody' },
          h('div', { class: 'qtitle' }, t('q_' + q.id, { n: q.goal })),
          h('div', { class: 'progress' }, h('div', { style: { width: (q.prog / q.goal * 100) + '%' } }))),
        h('div', { class: 'qrew' }, q.done ? '✔' : `${q.prog}/${q.goal}`, h('small', {}, '+' + q.reward + ' 🪙')))),
      h('div', { class: 'quest bonus' + (qs.bonus ? ' done' : '') }, h('div', { class: 'qe' }, '🎁'), h('div', { class: 'qbody' }, h('div', { class: 'qtitle' }, t('allBonus'))), h('div', { class: 'qrew' }, qs.bonus ? '✔' : '+50 🪙')),
      h('p', { class: 'tip' }, '⏰ ' + t('newQuestsTomorrow')));
  } else {
    const got = ACHS.filter(a => state.ach && state.ach[a.id]).length;
    body = h('div', {},
      h('div', { class: 'album-head' }, h('div', {}, `${got} / ${ACHS.length}`), h('div', { class: 'progress' }, h('div', { style: { width: got / ACHS.length * 100 + '%' } }))),
      h('div', { class: 'ach-grid' }, ACHS.map(a => {
        const ok = state.ach && state.ach[a.id];
        const v = Math.min(a.goal, value(a.v));
        return h('div', { class: 'ach' + (ok ? ' ok' : '') },
          h('div', { class: 'ae' }, a.e), h('b', {}, t('a_' + a.id)),
          ok ? h('small', {}, '✔ +' + a.reward + ' 🪙') : h('small', {}, `${v} / ${a.goal}`));
      })));
  }
  openModal('📋 ' + t('quests'), h('div', {}, tabs, body), { accent: '#06d6a0', wide: tab === 'ach' });
}

// ---------- Kunlik sovg'a + seriya ----------
export function showDaily() {
  const d = today();
  if (state.lastDaily === d) return;
  const y = new Date(Date.now() - 864e5).toDateString();
  const count = state.lastDaily === y ? ((state.streak && state.streak.count) || 0) + 1 : 1;
  const day = ((count - 1) % 7) + 1;
  const amount = 15 + day * 10 + (day === 7 ? 80 : 0);
  const node = h('div', { class: 'reward' },
    h('div', { class: 'week' }, [1, 2, 3, 4, 5, 6, 7].map(k => h('div', { class: 'wday' + (k < day ? ' past' : k === day ? ' now' : '') },
      h('span', {}, k === 7 ? '🎁' : k < day ? '✔' : '🪙'), h('small', {}, t('dayN', { n: k }))))),
    h('div', { class: 'big-emoji bounce' }, day === 7 ? '🎁' : '🔥'),
    h('h3', {}, t('dailyText', { c: amount })),
    h('p', { class: 'tip' }, t('dailyStreak', { n: count })),
    h('button', { class: 'btn gold big', onclick: () => {
      state.lastDaily = d; state.streak = { count };
      grant(amount, 0); sfx.coin(); confetti(day === 7 ? 150 : 60);
      track('check', 0);
      closeModal();
    } }, t('collect')));
  openModal(t('daily'), node, { accent: '#ffb703' });
}

// ---------- Omad g'ildiragi ----------
const PRIZES = [
  { k: 'coins', v: 10, e: '🪙', c: '#ffd166', w: 22 },
  { k: 'xp', v: 50, e: '⭐', c: '#4f8cff', w: 16 },
  { k: 'coins', v: 25, e: '🪙', c: '#ff8c42', w: 18 },
  { k: 'card', e: '🃏', c: '#9b5de5', w: 10 },
  { k: 'coins', v: 15, e: '🪙', c: '#34c759', w: 18 },
  { k: 'xp', v: 100, e: '🌟', c: '#2ec4b6', w: 7 },
  { k: 'coins', v: 50, e: '💰', c: '#ff5a5f', w: 6 },
  { k: 'coins', v: 100, e: '💎', c: '#ff6fb5', w: 3 },
];
const SPIN_COST = 30;
export function canSpinFree() { return state.lastSpin !== today(); }
export function openWheel() {
  const seg = 360 / PRIZES.length;
  const grad = PRIZES.map((p, i) => `${p.c} ${i * seg}deg ${(i + 1) * seg}deg`).join(',');
  const wheel = h('div', { class: 'wheel', style: { background: `conic-gradient(${grad})` } },
    PRIZES.map((p, i) => h('div', { class: 'wlabel', style: { transform: `rotate(${i * seg + seg / 2}deg)` } },
      h('span', {}, p.e, h('br'), p.k === 'card' ? t('prizeCard') : p.k === 'xp' ? p.v + ' XP' : p.v))));
  let rot = 0, busy = false;
  const info = h('div', { class: 'tip' });
  const btn = h('button', { class: 'btn gold big', onclick: spin });
  const upd = () => {
    btn.textContent = canSpinFree() ? '🎡 ' + t('spinFree') : '🎡 ' + t('spinCost', { c: SPIN_COST });
    btn.disabled = busy || (!canSpinFree() && state.coins < SPIN_COST);
  };
  function spin() {
    if (busy) return;
    if (!canSpinFree()) { if (state.coins < SPIN_COST) return; state.coins -= SPIN_COST; } else state.lastSpin = today();
    save();
    busy = true; upd(); info.textContent = '';
    const total = PRIZES.reduce((a, p) => a + p.w, 0);
    let r = Math.random() * total, idx = 0;
    for (; idx < PRIZES.length; idx++) { if ((r -= PRIZES[idx].w) < 0) break; }
    idx = Math.min(idx, PRIZES.length - 1);
    const target = 360 - (idx * seg + seg / 2) + (Math.random() - 0.5) * seg * 0.6;
    rot = rot - (rot % 360) + 360 * 6 + target;
    wheel.style.transform = `rotate(${rot}deg)`;
    sfx.pack();
    setTimeout(() => {
      const p = PRIZES[idx];
      let txt;
      if (p.k === 'coins') { grant(p.v, 0); txt = '+' + p.v + ' 🪙'; }
      else if (p.k === 'xp') { grant(0, p.v); txt = '+' + p.v + ' XP'; }
      else {
        const c = pick(CARDS.filter(c => c.lvl === 0 && (c.r === 'common' || c.r === 'rare')));
        if (state.cards.includes(c.id)) { grant(15, 0); txt = c.e + ' ' + t('duplicate', { c: 15 }); }
        else { state.cards.push(c.id); save(); txt = '✨ ' + t('newCardGot') + ' ' + c.e; }
        track('check', 0);
      }
      info.textContent = '🎉 ' + t('won', { p: txt });
      sfx.level(); confetti(80);
      busy = false; upd();
    }, 4300);
  }
  upd();
  openModal('🎡 ' + t('wheel'), h('div', { class: 'wheel-wrap' }, h('div', { class: 'wheel-box' }, h('div', { class: 'wpointer' }, '▼'), wheel), info, btn), { accent: '#ff6fb5' });
}
