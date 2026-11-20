// Saqlash va progress (localStorage)
import { CARDS } from './data.js';

const KEY = 'bilim-oroli-save-v1';

const DEFAULTS = () => ({
  lang: null,
  name: '',
  theme: 'auto',
  sound: true,
  music: false,
  quality: 'high',
  coins: 30,
  xp: 0,
  cards: [],
  owned: ['shirt_blue', 'pants_navy', 'shoes_white', 'hair_short', 'hair_long'],
  outfit: { gender: 'boy', costume: null, skin: '#f1c27d', hairColor: '#4a2f1b', shirt: 'shirt_blue', pants: 'pants_navy', shoes: 'shoes_white', hair: 'hair_short', hat: null, glasses: null, back: null, pet: null },
  stats: { lessons: 0, correct: 0, wordIdx: 0, factIdx: 0 },
  best: { speed: 0, memory: 0, hunt: 0 },
  lastDaily: null,
  onboarded: false,
});

function load() {
  const d = DEFAULTS();
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && typeof s === 'object') {
      for (const k of Object.keys(d)) {
        if (s[k] === undefined) continue;
        if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) d[k] = { ...d[k], ...s[k] };
        else d[k] = s[k];
      }
    }
  } catch { /* bo'sh saqlash */ }
  return d;
}

export const state = load();
for (const id of ['shoes_white', 'hair_short', 'hair_long']) if (!state.owned.includes(id)) state.owned.push(id);

const subs = new Set();
export function onChange(fn) { subs.add(fn); }

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private rejim */ }
  subs.forEach(fn => fn(state));
}

export const xpForLevel = l => 40 * l * (l - 1);
export function levelOf(xp) { let l = 1; while (xp >= xpForLevel(l + 1)) l++; return l; }
export function level() { return levelOf(state.xp); }

// Darajaga mos kartalar albatta bo'lsin
export function ensureLevelCards() {
  const L = level();
  const got = [];
  for (const c of CARDS) {
    if (c.lvl > 0 && c.lvl <= L && !state.cards.includes(c.id)) { state.cards.push(c.id); got.push(c); }
  }
  return got;
}

export function grant(coins, xp) {
  const before = level();
  state.coins += coins;
  state.xp += xp;
  const after = level();
  const newCards = after > before ? ensureLevelCards() : [];
  save();
  return { levelUp: after > before ? after : 0, newCards };
}

export function resetAll() {
  try { localStorage.removeItem(KEY); } catch { /* */ }
  location.reload();
}
