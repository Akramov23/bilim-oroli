// Mini o'yinlar: Tez hisob, Xotira kartalari, Olmos ovi
import { t } from './i18n.js';
import { state, save, level } from './state.js';
import { h, $, openModal, closeModal, showReward, shuffle, toast } from './ui.js';
import { sfx } from './audio.js';
import { mathQuestion } from './lessons.js';
import { track } from './progress.js';
import { WORDS } from './data.js';
import { speak } from './audio.js';

const ACC = '#ff8c42';
let world = null;
export function initGames(w) { world = w; }

function setBest(id, v) { if (v > (state.best[id] || 0)) { state.best[id] = v; save(); return true; } return false; }

export function openGames() {
  const games = [['race', '🏁', race], ['balloon', '🎈', balloons], ['scramble', '🔤', scramble], ['speed', '⚡', speedMath], ['memory', '🧠', memory], ['hunt', '💎', hunt]];
  const grid = h('div', { class: 'game-grid' }, games.map(([id, e, fn], i) => h('div', { class: 'game-tile pop', style: { animationDelay: i * 0.08 + 's' } },
    h('div', { class: 'em bounce' }, e),
    h('h3', {}, t('g_' + id)),
    h('p', {}, t('g_' + id + '_d')),
    h('div', { class: 'best' }, '🏆 ' + t('best', { n: id === 'race' ? (state.best.race ? state.best.race + t('seconds') : '—') : (state.best[id] || 0) })),
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
    const rec = setBest('speed', score); track('game');
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
    const rec = setBest('memory', score); track('game');
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
      const rec = setBest('hunt', n); track('game');
      showReward({ title: '💎 ' + t('g_hunt'), accent: ACC, headline: t('huntDone', { n }) + (rec ? ' 🏆' : ''), stars: n >= 13 ? 3 : n >= 7 ? 2 : 1, perfect: n === 15, coins: n * 2, xp: n * 4, onAgain: hunt });
    });
}

// ---------- Poyga: shaharcha atrofidagi 12 ta halqa ----------
function race() {
  if (!world) return;
  closeModal();
  const bar = $('#huntBar');
  bar.classList.remove('hidden');
  let n = 3;
  bar.textContent = '🏁 3';
  const cd = setInterval(() => {
    n--; sfx.click();
    if (n > 0) { bar.textContent = '🏁 ' + n; return; }
    clearInterval(cd);
    bar.textContent = '🏁 ' + t('raceGo');
    sfx.level();
    world.startRace(
      (tm, i, N) => { bar.textContent = `🏁 ${t('ringN', { i, n: N })}   ⏱ ${tm.toFixed(1)}${t('seconds')}`; },
      tm => {
        bar.classList.add('hidden');
        const sec = Math.round(tm * 10) / 10;
        const rec = !state.best.race || sec < state.best.race;
        if (rec) { state.best.race = sec; save(); }
        track('race'); track('game');
        showReward({ title: '🏁 ' + t('g_race'), accent: ACC, headline: t('raceDone', { t: sec }) + (rec ? ' 🏆' : ''), stars: sec < 55 ? 3 : sec < 80 ? 2 : 1, perfect: rec, coins: Math.max(10, 90 - Math.floor(sec)), xp: 40, onAgain: race });
      });
  }, 800);
  toast('🏁 ' + t('g_race_d'), 3500);
}

// ---------- Shar yorish ----------
function balloons() {
  const L = Math.min(level(), 5);
  let score = 0, left = 45, over = false, q = mathQuestion(L);
  const ans = () => Number(q.options[q.answer]);
  const head = h('div', { class: 'row between' });
  const qEl = h('div', { class: 'prompt huge' });
  const field = h('div', { class: 'balloon-field' });
  const cols = ['#ff5a5f', '#ffd166', '#4f8cff', '#34c759', '#9b5de5', '#ff6fb5', '#ff8c42'];
  const upd = () => { head.replaceChildren(h('span', { class: 'pill' }, `⏱ ${left}${t('seconds')}`), h('span', { class: 'pill gold' }, `🎈 ${score}`)); qEl.textContent = q.prompt; };
  function spawn() {
    if (over) return;
    const v = Math.random() < 0.38 ? ans() : Number(q.options[Math.floor(Math.random() * 4)]);
    const b = h('button', { class: 'balloon', style: { left: (5 + Math.random() * 78) + '%', background: cols[Math.floor(Math.random() * cols.length)], animationDuration: (5 + Math.random() * 2.5) + 's' } }, String(v));
    b.addEventListener('pointerdown', () => {
      if (over || b.classList.contains('pop')) return;
      if (v === ans()) { score++; sfx.correct(); b.classList.add('pop'); q = mathQuestion(L); upd(); }
      else { sfx.wrong(); b.classList.add('shake'); left = Math.max(0, left - 2); upd(); }
    });
    b.addEventListener('animationend', e => { if (e.animationName === 'floatUp' || e.animationName === 'popB') b.remove(); });
    field.append(b);
  }
  const sp = setInterval(spawn, 750);
  const tm = setInterval(() => { left--; upd(); if (left <= 0) end(); }, 1000);
  function end() {
    if (over) return; over = true; clearInterval(sp); clearInterval(tm);
    const rec = setBest('balloon', score); track('game');
    showReward({ title: '🎈 ' + t('g_balloon'), accent: ACC, headline: t('score') + ': ' + score + (rec ? ' 🏆' : ''), stars: score >= 15 ? 3 : score >= 8 ? 2 : 1, perfect: rec && score > 0, coins: score * 2, xp: score * 6, onAgain: balloons });
  }
  upd(); spawn();
  openModal('🎈 ' + t('g_balloon'), h('div', { class: 'balloon-game' }, head, qEl, field), { accent: ACC, onClose: () => { over = true; clearInterval(sp); clearInterval(tm); } });
}

// ---------- So'z yig'ish (inglizcha) ----------
function scramble() {
  const pool = shuffle(WORDS.filter(w => /^[a-z]+$/.test(w.en) && w.en.length >= 3 && w.en.length <= 7)).slice(0, 5);
  let i = 0, solved = 0, mistakes = 0;
  const wrap = h('div', { class: 'scramble' });
  function render() {
    const w = pool[i], word = w.en.toUpperCase();
    let letters = word.split('');
    do { letters = shuffle(letters); } while (letters.join('') === word && word.length > 1);
    let built = '';
    const slots = h('div', { class: 'slots' });
    const tiles = h('div', { class: 'tiles' });
    const drawSlots = () => slots.replaceChildren(...word.split('').map((_, k) => h('span', { class: 'slot' + (built[k] ? ' filled' : '') }, built[k] || '')));
    letters.forEach(ch => {
      const tb = h('button', { class: 'tile', onclick: () => {
        if (tb.disabled) return;
        tb.disabled = true; built += ch; drawSlots(); sfx.click();
        if (built.length === word.length) {
          if (built === word) {
            solved++; sfx.correct(); speak(w.en, 'en'); slots.classList.add('ok');
            setTimeout(() => { i++; i < pool.length ? render() : end(); }, 1100);
          } else {
            mistakes++; sfx.wrong(); slots.classList.add('shake');
            setTimeout(() => { built = ''; slots.classList.remove('shake'); drawSlots(); tiles.querySelectorAll('.tile').forEach(x => { x.disabled = false; }); }, 600);
          }
        }
      } }, ch);
      tiles.append(tb);
    });
    drawSlots();
    wrap.replaceChildren(
      h('div', { class: 'dots' }, pool.map((_, k) => h('span', { class: k < i ? 'done' : k === i ? 'cur' : '' }))),
      h('div', { class: 'prompt' }, t('buildWord')),
      h('div', { class: 'visual' }, h('span', { class: 'em xl' }, w.e), state.lang !== 'en' ? h('div', { class: 'n' }, w[state.lang]) : null),
      slots, tiles,
      h('button', { class: 'btn ghost sm', onclick: () => { built = ''; drawSlots(); tiles.querySelectorAll('.tile').forEach(x => { x.disabled = false; }); } }, '↺ ' + t('reset2')));
  }
  function end() {
    const score = Math.max(5, 50 - mistakes * 5);
    const rec = setBest('scramble', score); track('game');
    showReward({ title: '🔤 ' + t('g_scramble'), accent: ACC, headline: `${solved}/${pool.length} • ${t('score')}: ${score}` + (rec ? ' 🏆' : ''), stars: mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1, perfect: mistakes === 0, coins: 6 + solved * 4, xp: 40, onAgain: scramble });
  }
  render();
  openModal('🔤 ' + t('g_scramble'), wrap, { accent: ACC });
}
