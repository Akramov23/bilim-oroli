// Mini o'yinlar: Tez hisob, Xotira kartalari, Olmos ovi
import { t } from './i18n.js';
import { state, save, level } from './state.js';
import { h, $, openModal, closeModal, showReward, shuffle, toast } from './ui.js';
import { sfx } from './audio.js';
import { mathQuestion } from './lessons.js';

const ACC = '#ff8c42';
let world = null;
export function initGames(w) { world = w; }

function setBest(id, v) { if (v > (state.best[id] || 0)) { state.best[id] = v; save(); return true; } return false; }

export function openGames() {
  const games = [['speed', '⚡', speedMath], ['memory', '🧠', memory], ['hunt', '💎', hunt]];
  const grid = h('div', { class: 'game-grid' }, games.map(([id, e, fn], i) => h('div', { class: 'game-tile pop', style: { animationDelay: i * 0.08 + 's' } },
    h('div', { class: 'em bounce' }, e),
    h('h3', {}, t('g_' + id)),
    h('p', {}, t('g_' + id + '_d')),
    h('div', { class: 'best' }, '🏆 ' + t('best', { n: state.best[id] || 0 })),
    h('button', { class: 'btn primary', onclick: fn }, t('play')))));
  openModal('🎮 ' + t('z_games'), grid, { accent: ACC, wide: true });
}

function speedMath() {
  const L = Math.min(level(), 5);
  let score = 0, left = 30, q, over = false;
  const timer = h('div', { class: 'pill' }), sc = h('div', { class: 'pill gold' });
  const fill = h('div'); const bar = h('div', { class: 'tbar' }, fill);
  const box = h('div', { class: 'speed-box' });
  const upd = () => { timer.textContent = `⏱ ${left}${t('seconds')}`; sc.textContent = `⭐ ${score}`; fill.style.width = (left / 30 * 100) + '%'; };
  function next() {
    q = mathQuestion(L);
    box.replaceChildren(
      h('div', { class: 'prompt huge pop' }, q.prompt),
      h('div', { class: 'options big' }, q.options.map((o, k) => h('button', {
        class: 'opt', onclick: e => {
          if (over) return;
          if (k === q.answer) { score++; sfx.correct(); upd(); next(); }
          else { sfx.wrong(); const b = e.currentTarget; b.classList.add('bad', 'shake'); setTimeout(() => b.classList.remove('shake'), 400); }
        }
      }, o))));
  }
  const iv = setInterval(() => { left--; upd(); if (left <= 0) end(); }, 1000);
  function end() {
    if (over) return; over = true; clearInterval(iv);
    const rec = setBest('speed', score);
    showReward({ title: '⚡ ' + t('g_speed'), accent: ACC, headline: t('score') + ': ' + score + (rec ? ' 🏆' : ''), stars: score >= 15 ? 3 : score >= 8 ? 2 : 1, perfect: rec && score > 0, coins: score, xp: score * 5, onAgain: speedMath });
  }
  const wrap = h('div', { class: 'speed' }, h('div', { class: 'row between' }, timer, sc), bar, box);
  next(); upd();
  openModal('⚡ ' + t('g_speed'), wrap, { accent: ACC, onClose: () => { over = true; clearInterval(iv); } });
}

function memory() {
  const pool = shuffle(['🦊', '🐢', '🦉', '🐝', '🐬', '🐼', '🦁', '🦋', '🦄', '🐙', '🐸', '🐧']).slice(0, 6);
  const deck = shuffle([...pool, ...pool]);
  let open = [], matched = 0, moves = 0, lock = false;
  const info = h('div', { class: 'row between' });
  const upd = () => info.replaceChildren(h('span', { class: 'pill' }, `👆 ${t('moves')}: ${moves}`), h('span', { class: 'pill gold' }, `✨ ${t('pairs')}: ${matched}/6`));
  const grid = h('div', { class: 'mem-grid' });
  deck.forEach(e => {
    const c = h('button', { class: 'mem-card', onclick: () => flip(c, e) },
      h('div', { class: 'mem-inner' }, h('div', { class: 'front' }, '❓'), h('div', { class: 'back' }, e)));
    grid.append(c);
  });
  function flip(c, e) {
    if (lock || c.classList.contains('flipped')) return;
    c.classList.add('flipped'); open.push([c, e]);
    if (open.length === 2) {
      moves++;
      const [[c1, e1], [c2, e2]] = open;
      if (e1 === e2) {
        matched++; sfx.correct(); c1.classList.add('matched'); c2.classList.add('matched'); open = [];
        if (matched === 6) setTimeout(end, 700);
      } else {
        lock = true;
        setTimeout(() => { c1.classList.remove('flipped'); c2.classList.remove('flipped'); open = []; lock = false; }, 850);
      }
    }
    upd();
  }
  function end() {
    const score = Math.max(10, 50 - (moves - 6) * 3);
    const rec = setBest('memory', score);
    showReward({ title: '🧠 ' + t('g_memory'), accent: ACC, headline: `${t('moves')}: ${moves} • ${t('score')}: ${score}` + (rec ? ' 🏆' : ''), stars: moves <= 9 ? 3 : moves <= 14 ? 2 : 1, perfect: moves <= 8, coins: Math.round(score / 4), xp: 30, onAgain: memory });
  }
  upd();
  openModal('🧠 ' + t('g_memory'), h('div', { class: 'memory' }, info, grid), { accent: ACC });
}

function hunt() {
  if (!world) return;
  closeModal();
  const bar = $('#huntBar');
  bar.classList.remove('hidden');
  toast('💎 ' + t('g_hunt_d'));
  world.startHunt(15, 45,
    (left, n) => { bar.textContent = `💎 ${n}/15   ⏱ ${left}${t('seconds')}`; },
    n => {
      bar.classList.add('hidden');
      const rec = setBest('hunt', n);
      showReward({ title: '💎 ' + t('g_hunt'), accent: ACC, headline: t('huntDone', { n }) + (rec ? ' 🏆' : ''), stars: n >= 13 ? 3 : n >= 7 ? 2 : 1, perfect: n === 15, coins: n * 2, xp: n * 4, onAgain: hunt });
    });
}
