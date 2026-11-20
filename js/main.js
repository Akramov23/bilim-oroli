// Bosh fayl: kirish ekrani, HUD, 3D olam va barcha bo'limlarni bog'laydi
import { state, save, onChange, level, xpForLevel, grant, ensureLevelCards } from './state.js';
import { t, LANGS } from './i18n.js';
import { h, $, openModal, closeModal, modalOpen, toast, confetti } from './ui.js';
import { sfx, setMusic } from './audio.js';
import { createWorld, createPreview, STATIONS } from './world.js';
import { openLesson } from './lessons.js';
import { openGames, initGames } from './games.js';
import { openShop, openAlbum, openSettings } from './panels.js';
import { openFriends, initFriends, sendEmote } from './friends.js';
import { SKINS } from './data.js';

let world = null;
let near = null;

// ---------- Mavzu ----------
const mq = matchMedia('(prefers-color-scheme: dark)');
const isDark = () => state.theme === 'dark' || (state.theme === 'auto' && mq.matches);
function applyTheme() {
  const d = isDark();
  document.documentElement.dataset.theme = d ? 'dark' : 'light';
  world && world.setNight(d);
}
mq.addEventListener('change', applyTheme);

// ---------- Til ----------
function applyLang() {
  document.documentElement.lang = state.lang || 'uz';
  document.title = t('appName');
  document.querySelectorAll('[data-i18n]').forEach(e => { e.textContent = t(e.dataset.i18n); });
  world && world.setLabels(id => t('z_' + id));
  updateEnter();
}

// ---------- HUD ----------
let shownCoins = state.coins;
function updateHud() {
  const L = level();
  const a = xpForLevel(L), b = xpForLevel(L + 1);
  $('#lvlBadge').textContent = L;
  $('#xpFill').style.width = Math.min(100, (state.xp - a) / (b - a) * 100) + '%';
  $('#xpText').textContent = `${state.xp - a} / ${b - a} XP`;
  $('#pName').textContent = state.name || '...';
  if (state.coins !== shownCoins) {
    const pill = $('#coinPill'); pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump');
    shownCoins = state.coins;
  }
  $('#coinCount').textContent = state.coins;
}

function updateEnter() {
  const btn = $('#enterBtn');
  if (!near || modalOpen()) { btn.classList.add('hidden'); return; }
  const s = STATIONS.find(x => x.id === near);
  btn.textContent = `${s.emoji} ${t('z_' + near)} — ${t('enter')} ▶`;
  btn.style.setProperty('--accent', '#' + s.color.toString(16).padStart(6, '0'));
  btn.classList.remove('hidden');
}

function enterStation(id) {
  sfx.click();
  if (id === 'games') openGames();
  else if (id === 'shop') openShop('shop');
  else openLesson(id);
}

// ---------- Holat o'zgarishlari ----------
let last = {};
onChange(() => {
  updateHud();
  if (state.lang !== last.lang) { last.lang = state.lang; applyLang(); }
  if (state.theme !== last.theme) { last.theme = state.theme; applyTheme(); }
  if (state.quality !== last.quality) { last.quality = state.quality; world && world.setQuality(state.quality); }
  if (state.music !== last.music) { last.music = state.music; setMusic(state.music); }
  const o = JSON.stringify(state.outfit);
  if (o !== last.outfit) { last.outfit = o; world && world.setOutfit(state.outfit); }
});

// ---------- Kirish ekrani ----------
function onboarding(step) {
  const ob = $('#onboard');
  ob.classList.remove('hidden');
  if (world) world.enabled = false;
  if (step === 0) {
    ob.replaceChildren(h('div', { class: 'ob-card pop' },
      h('div', { class: 'logo bounce' }, '🏝️'),
      h('h1', {}, 'Bilim Oroli'),
      h('p', { class: 'sub' }, "Tilni tanlang • Выберите язык • Choose language • Sprache wählen"),
      h('div', { class: 'lang-grid' }, LANGS.map(l => h('button', {
        class: 'lang-btn', onclick: () => { state.lang = l.code; save(); onboarding(1); }
      }, h('span', { class: 'flag' }, l.flag), l.name)))));
    return;
  }
  const nameIn = h('input', { class: 'input big', placeholder: t('namePh'), value: state.name, maxlength: '16' });
  const canvas = h('canvas', { class: 'preview' });
  const skins = h('div', { class: 'skins' });
  let preview = null;
  const drawSkins = () => skins.replaceChildren(...SKINS.map(s => h('button', {
    class: 'swatch' + (state.outfit.skin === s ? ' active' : ''), style: { background: s },
    onclick: () => { state.outfit.skin = s; save(); drawSkins(); preview && preview.setOutfit(state.outfit); }
  })));
  drawSkins();
  const hairs = h('div', { class: 'gender-row' });
  const drawHairs = () => hairs.replaceChildren(...[['boy', '👦'], ['girl', '👧']].map(([g, e]) => h('button', {
    class: 'gender-btn' + ((state.outfit.gender || 'boy') === g ? ' active' : ''),
    onclick: () => { state.outfit.gender = g; state.outfit.hair = g === 'girl' ? 'hair_long' : 'hair_short'; save(); drawHairs(); preview && preview.setOutfit(state.outfit); }
  }, h('span', {}, e), t(g))));
  drawHairs();
  const go = () => {
    const v = nameIn.value.trim();
    if (!v) { nameIn.classList.remove('shake'); void nameIn.offsetWidth; nameIn.classList.add('shake'); nameIn.focus(); return; }
    state.name = v; state.onboarded = true;
    ensureLevelCards(); save();
    preview && preview.dispose();
    ob.classList.add('hidden');
    startGame(true);
  };
  nameIn.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  ob.replaceChildren(h('div', { class: 'ob-card pop' },
    h('h1', {}, '👋 ' + t('hello')),
    h('div', { class: 'ob-row' },
      h('div', { class: 'ob-prev' }, canvas),
      h('div', { class: 'ob-form' },
        nameIn,
        h('p', { class: 'sub' }, t('chooseHero')),
        hairs,
        h('p', { class: 'sub' }, t('chooseSkin')),
        skins,
        h('button', { class: 'btn primary big', onclick: go }, t('startGame')),
        h('button', { class: 'btn ghost sm', onclick: () => { preview && preview.dispose(); onboarding(0); } }, '🌐 ' + t('language'))))));
  try { preview = createPreview(canvas, state.outfit); } catch { /* */ }
  setTimeout(() => nameIn.focus(), 300);
}

function startGame(first) {
  $('#hud').classList.remove('hidden');
  world.enabled = true;
  applyLang(); updateHud();
  if (first) {
    toast('🎉 ' + t('welcome', { n: state.name }), 3500);
    setTimeout(() => toast('🎁 ' + t('firstCards'), 3500), 1200);
  }
  const hint = $('#hint');
  hint.textContent = t('controlsShort');
  hint.classList.add('show');
  setTimeout(() => hint.classList.remove('show'), 9000);
  setTimeout(checkDaily, first ? 2500 : 600);
}

function checkDaily() {
  const today = new Date().toDateString();
  if (state.lastDaily === today) return;
  const amount = 20 + Math.min(level(), 10) * 2;
  const node = h('div', { class: 'reward' },
    h('div', { class: 'big-emoji bounce' }, '🎁'),
    h('h3', {}, t('dailyText', { c: amount })),
    h('button', { class: 'btn gold big', onclick: () => { state.lastDaily = today; const r = grant(amount, 0); sfx.coin(); confetti(60); closeModal(); } }, t('collect')));
  openModal(t('daily'), node, { accent: '#ffb703' });
}

// ---------- Ishga tushirish ----------
function boot() {
  try {
    world = createWorld($('#scene'), {
      outfit: state.outfit,
      joystick: $('#joystick'),
      jumpBtn: $('#jumpBtn'),
      onNear: id => { near = id; updateEnter(); },
      onCoin: () => { state.coins++; save(); sfx.coin(); },
      onGem: () => sfx.coin(),
      onJump: () => sfx.jump(),
    });
  } catch (e) {
    console.error(e);
    document.body.append(h('div', { class: 'fatal' }, '😕 WebGL / 3D is not supported in this browser.'));
    return;
  }
  initGames(world); initFriends(world);
  world.setOutfit(state.outfit);
  world.attachMinimap($('#minimap'), id => { sfx.jump(); toast('✨ ' + t('z_' + id)); });
  last = { lang: state.lang, theme: state.theme, quality: state.quality, music: false, outfit: JSON.stringify(state.outfit) };
  applyTheme();
  world.setQuality(state.quality);
  world.setLabels(id => t('z_' + id));
  $('#loading')?.remove();

  // HUD tugmalari
  document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => {
    ({ cards: openAlbum, shop: () => openShop('shop'), wardrobe: () => openShop('wardrobe'), friends: openFriends, settings: openSettings })[b.dataset.open]();
  }));
  $('#enterBtn').addEventListener('click', () => near && enterStation(near));
  $('#modalClose').addEventListener('click', closeModal);
  $('#modal').addEventListener('pointerdown', e => { if (e.target.id === 'modal') closeModal(); });
  addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
    if ((e.code === 'KeyE' || e.key === 'Enter') && near && !modalOpen() && $('#onboard').classList.contains('hidden') && !/INPUT/.test(e.target.tagName)) enterStation(near);
  });
  addEventListener('modal', e => { world.enabled = !e.detail && $('#onboard').classList.contains('hidden'); updateEnter(); });
  // Har bir tugmaga yengil ovoz
  document.addEventListener('pointerdown', e => { if (e.target.closest('button')) sfx.click(); });

  // Emojilar
  const emotes = ['👋', '😂', '❤️', '👍', '🎉', '😮'];
  $('#emoteBar').replaceChildren(...emotes.map(e => h('button', { onclick: () => { world.showEmote('me', e); sendEmote(e); } }, e)));

  if (state.music) setMusic(true);
  if (!state.onboarded || !state.lang) onboarding(state.lang ? 1 : 0);
  else { $('#onboard').classList.add('hidden'); startGame(false); }
}

boot();
