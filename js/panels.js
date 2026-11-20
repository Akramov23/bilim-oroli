// Do'kon, kiyim xonasi, kartalar albomi, karta to'plami, sozlamalar
import { t, tr, LANGS } from './i18n.js';
import { state, save, level, resetAll } from './state.js';
import { CARDS, ITEM_LIST, ITEMS, CATS, SKINS, RARITY, HAIR_COLORS } from './data.js';
import { h, openModal, closeModal, toast, confetti, cardNode, pick } from './ui.js';
import { sfx } from './audio.js';
import { createPreview } from './world.js';

const ACC = '#ff6fb5';
const ACCESSORY = ['hat', 'glasses', 'back', 'pet', 'costume'];

export function openShop(mode = 'shop', startCat) {
  let cat = startCat || (mode === 'shop' ? 'costume' : 'skin');
  const cats = mode === 'shop' ? CATS : ['skin', ...CATS.filter(c => c !== 'pack')];
  const canvas = h('canvas', { class: 'preview' });
  const coinPill = h('div', { class: 'pill gold' });
  const tabs = h('div', { class: 'tabs' });
  const grid = h('div', { class: 'item-grid' });
  let preview = null;

  function refresh() {
    coinPill.textContent = '🪙 ' + state.coins;
    tabs.replaceChildren(...cats.map(c => h('button', { class: 'tab' + (c === cat ? ' active' : ''), onclick: () => { cat = c; refresh(); } }, t('cat_' + c))));
    if (cat === 'skin') {
      const sw = (list, key) => h('div', { class: 'swatch-row' }, list.map(c => h('button', { class: 'swatch' + (state.outfit[key] === c ? ' active' : ''), style: { background: c }, onclick: () => { state.outfit[key] = c; save(); refresh(); } })));
      const gbtn = (g, e) => h('button', { class: 'gender-btn' + ((state.outfit.gender || 'boy') === g ? ' active' : ''), onclick: () => setGender(g) }, h('span', {}, e), t(g));
      grid.replaceChildren(
        h('div', { class: 'look-box' }, h('h4', {}, '🧒 ' + t('chooseHero')), h('div', { class: 'swatch-row' }, gbtn('boy', '👦'), gbtn('girl', '👧'))),
        h('div', { class: 'look-box' }, h('h4', {}, '🙂 ' + t('skinColor')), sw(SKINS, 'skin')),
        h('div', { class: 'look-box' }, h('h4', {}, '💇 ' + t('hairColor')), sw(HAIR_COLORS, 'hairColor')));
    } else {
      let items = ITEM_LIST.filter(i => i.cat === cat);
      if (cat === 'costume') items.sort((a, b) => (b.g === (state.outfit.gender || 'boy')) - (a.g === (state.outfit.gender || 'boy')));
      if (mode === 'wardrobe') items = items.filter(i => state.owned.includes(i.id));
      grid.replaceChildren(...items.map(tile));
      if (!items.length) grid.append(h('p', { class: 'empty' }, t('emptyWardrobe')));
    }
    preview && preview.setOutfit(state.outfit);
  }

  function tile(it) {
    const owned = state.owned.includes(it.id);
    const lockedLvl = it.lvl > level();
    const equipped = state.outfit[it.cat] === it.id;
    const pat = { stripes: `repeating-linear-gradient(0deg, ${it.color} 0 8px, #fff 8px 13px)`, dots: `radial-gradient(#fff 3px, ${it.color} 4px) 0 0/14px 14px`, rainbow: 'linear-gradient(#ff5a5f,#ffd166,#34c759,#4f8cff,#9b5de5)', star: it.color };
    const icon = it.color
      ? h('div', { class: 'icon color', style: { background: it.pattern ? pat[it.pattern] : it.color } }, it.cat === 'shirt' ? (it.sleeves === 'long' ? '🧥' : it.pattern === 'star' ? '⭐' : '👕') : it.cat === 'shoes' ? '👟' : it.skirt ? '👗' : '👖')
      : h('div', { class: 'icon' }, it.icon);
    let action;
    if (lockedLvl) action = h('div', { class: 'lock' }, '🔒 ' + t('needLevel', { l: it.lvl }));
    else if (it.cat === 'pack') action = h('button', { class: 'btn gold sm', onclick: () => openPack(it) }, '🪙 ' + it.price);
    else if (!owned) action = h('button', { class: 'btn gold sm', onclick: () => buy(it) }, '🪙 ' + it.price);
    else if (equipped) action = ACCESSORY.includes(it.cat)
      ? h('button', { class: 'btn ghost sm', onclick: () => { state.outfit[it.cat] = null; save(); refresh(); } }, t('remove'))
      : h('div', { class: 'tag ok' }, '✔ ' + t('equipped'));
    else action = h('button', { class: 'btn primary sm', onclick: () => { state.outfit[it.cat] = it.id; save(); sfx.click(); refresh(); } }, t('equip'));
    return h('div', { class: 'item' + (equipped ? ' active' : '') + (lockedLvl ? ' locked' : '') }, it.g ? h('span', { class: 'gbadge' }, it.g === 'girl' ? '👧' : '👦') : null, icon, h('div', { class: 'iname' }, tr(it.n)), action);
  }

  function setGender(g) {
    state.outfit.gender = g;
    if (!state.outfit.costume || ITEMS[state.outfit.costume]?.g !== g) state.outfit.costume = null;
    state.outfit.hair = g === 'girl' ? 'hair_long' : 'hair_short';
    save(); refresh();
  }
  function buy(it) {
    if (state.coins < it.price) { sfx.wrong(); toast('😕 ' + t('notEnough')); return; }
    state.coins -= it.price;
    state.owned.push(it.id);
    state.outfit[it.cat] = it.id;
    save(); sfx.coin(); confetti(40);
    toast('🎉 ' + t('bought'));
    refresh();
  }

  const layout = h('div', { class: 'shop-layout' },
    h('div', { class: 'preview-box' }, canvas, coinPill,
      mode === 'shop'
        ? h('button', { class: 'btn ghost sm', onclick: () => openShop('wardrobe') }, '👕 ' + t('wardrobe'))
        : h('button', { class: 'btn ghost sm', onclick: () => openShop('shop') }, '🛍️ ' + t('shop'))),
    h('div', { class: 'shop-main' }, tabs, grid));
  openModal(mode === 'shop' ? '🛍️ ' + t('shop') : '👕 ' + t('wardrobe'), layout, { accent: mode === 'shop' ? ACC : '#4f8cff', wide: true, onClose: () => preview && preview.dispose() });
  try { preview = createPreview(canvas, state.outfit); } catch { /* WebGL yo'q */ }
  refresh();
}

function rollRarity(odds) {
  const total = Object.values(odds).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [k, v] of Object.entries(odds)) { if ((r -= v) < 0) return k; }
  return 'common';
}

export function openPack(it) {
  if (state.coins < it.price) { sfx.wrong(); toast('😕 ' + t('notEnough')); return; }
  state.coins -= it.price;
  const rar = rollRarity(it.odds);
  const pool = CARDS.filter(c => c.lvl === 0 && c.r === rar);
  const card = pick(pool.length ? pool : CARDS.filter(c => c.lvl === 0));
  const dup = state.cards.includes(card.id);
  if (dup) state.coins += it.dup; else state.cards.push(card.id);
  save();
  sfx.pack();
  const stage = h('div', { class: 'pack-stage' }, h('div', { class: 'pack-back shake-long', style: { '--rc': RARITY[card.r].color } }, it.icon));
  const after = h('div', { class: 'pack-after hidden' },
    h('h3', {}, dup ? t('duplicate', { c: it.dup }) : '✨ ' + t('newCardGot')),
    h('div', { class: 'row center' },
      h('button', { class: 'btn ghost', onclick: () => openAlbum() }, '🃏 ' + t('album')),
      state.coins >= it.price ? h('button', { class: 'btn gold', onclick: () => openPack(it) }, '🔁 🪙 ' + it.price) : null,
      h('button', { class: 'btn primary', onclick: () => openShop('shop', 'pack') }, t('back'))));
  openModal(tr(it.n), h('div', { class: 'pack' }, stage, after), { accent: RARITY[card.r].color });
  setTimeout(() => {
    stage.replaceChildren(cardNode(card, 'reveal big'));
    after.classList.remove('hidden');
    sfx.level();
    if (!dup && (card.r === 'epic' || card.r === 'legendary')) confetti(120);
  }, 1300);
}

export function openAlbum() {
  const owned = new Set(state.cards);
  const pct = Math.round(owned.size / CARDS.length * 100);
  const grid = h('div', { class: 'card-grid' }, CARDS.map(c => owned.has(c.id)
    ? cardNode(c)
    : h('div', { class: 'card locked' }, h('div', { class: 'em' }, '❓'), h('div', { class: 'cname' }, c.lvl ? t('unlockAt', { l: c.lvl }) : t('packOnly')))));
  openModal('🃏 ' + t('album'), h('div', { class: 'album' },
    h('div', { class: 'album-head' },
      h('div', {}, t('collected', { n: owned.size, total: CARDS.length })),
      h('div', { class: 'progress' }, h('div', { style: { width: pct + '%' } })),
      h('button', { class: 'btn gold sm', onclick: () => openShop('shop', 'pack') }, '🎴 ' + t('cat_pack'))),
    grid), { accent: '#9b5de5', wide: true });
}

export function openSettings() {
  const row = (label, ctrl) => h('div', { class: 'set-row' }, h('div', { class: 'set-label' }, label), ctrl);
  const seg = (opts, cur, on) => h('div', { class: 'seg' }, opts.map(([v, l]) => h('button', { class: v === cur ? 'active' : '', onclick: () => { on(v); save(); openSettings(); } }, l)));
  const onoff = (key) => seg([[true, t('on')], [false, t('off')]], state[key], v => { state[key] = v; });
  const nameIn = h('input', { class: 'input', value: state.name, maxlength: '16' });
  let resetArmed = false;
  const resetBtn = h('button', { class: 'btn danger', onclick: () => {
    if (!resetArmed) { resetArmed = true; resetBtn.textContent = '⚠️ ' + t('resetConfirm'); return; }
    resetAll();
  } }, '🗑️ ' + t('reset'));
  const body = h('div', { class: 'settings' },
    row('🌐 ' + t('language'), seg(LANGS.map(l => [l.code, l.flag + ' ' + l.name]), state.lang, v => { state.lang = v; })),
    row('🎨 ' + t('theme'), seg([['light', t('themeLight')], ['dark', t('themeDark')], ['auto', t('themeAuto')]], state.theme, v => { state.theme = v; })),
    row('🔊 ' + t('sound'), onoff('sound')),
    row('🎵 ' + t('music'), onoff('music')),
    row('✨ ' + t('graphics'), seg([['high', t('high')], ['low', t('low')]], state.quality, v => { state.quality = v; })),
    row('🙂 ' + t('playerName'), h('div', { class: 'row' }, nameIn, h('button', { class: 'btn primary sm', onclick: () => { const v = nameIn.value.trim(); if (v) { state.name = v; save(); toast('✔ ' + t('saved')); } } }, t('save')))),
    row('🎮 ' + t('controls'), h('p', { class: 'tip' }, t('controlsText'))),
    h('div', { class: 'set-foot' }, resetBtn));
  openModal('⚙️ ' + t('settings'), body, { accent: '#6b7394' });
}
