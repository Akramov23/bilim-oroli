// Do'stlar bilan o'ynash: PeerJS (WebRTC) orqali xona kodi bilan ulanish.
// Server kerak emas — ulanish uchun PeerJS bepul signal serveri ishlatiladi.
import { t } from './i18n.js';
import { state, grant, level } from './state.js';
import { h, openModal, modalOpen, closeModal, toast, confetti, shuffle } from './ui.js';
import { sfx } from './audio.js';
import { mathQuestion } from './lessons.js';

const PEER_URL = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
const PREFIX = 'bilimoroli-';
const ACC = '#34c759';

let world = null;
let peer = null, myId = null, isHost = false, roomCode = null, sendTimer = null;
const conns = new Map();
const players = new Map(); // id -> { name, seen }
let duel = null;
let viewOpen = false;

export function initFriends(w) { world = w; }
export const isConnected = () => conns.size > 0;

function loadLib() {
  if (window.Peer) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = PEER_URL; s.onload = res; s.onerror = () => rej(new Error('lib'));
    document.head.append(s);
  });
}

function genCode() { const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; return Array.from({ length: 5 }, () => a[Math.floor(Math.random() * a.length)]).join(''); }

function openPeer(id) {
  return new Promise((res, rej) => {
    const opts = { config: { iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
    ] } };
    const p = id ? new window.Peer(id, opts) : new window.Peer(opts);
    const timer = setTimeout(() => rej(new Error('timeout')), 12000);
    p.on('open', pid => { clearTimeout(timer); res(p); myId = pid; });
    p.on('error', e => { clearTimeout(timer); rej(e); });
  });
}

function attach(c) {
  c.on('open', () => {
    conns.set(c.peer, c);
    sendState();
    refreshView();
  });
  c.on('data', d => handle(d, c));
  c.on('close', () => {
    conns.delete(c.peer);
    if (isHost) { dropPlayer(c.peer); broadcast({ t: 'leave', id: c.peer }); }
    else { [...players.keys()].forEach(dropPlayer); toast('🔌 ' + t('disconnected')); stopAll(); }
    refreshView();
  });
}

function broadcast(msg, except) { for (const [id, c] of conns) if (c !== except && c.open) c.send(msg); }

function dropPlayer(id) {
  const p = players.get(id);
  if (p) toast('👋 ' + t('leftMsg', { n: p.name }));
  players.delete(id);
  world && world.removeRemote(id);
}

function handle(msg, from) {
  if (!msg || typeof msg !== 'object') return;
  if (isHost) broadcast(msg, from); // xost boshqalarga uzatadi
  if (msg.id === myId) return;
  switch (msg.t) {
    case 'state': {
      const name = String(msg.name || '?').slice(0, 16);
      if (!players.has(msg.id)) { toast('🎉 ' + t('joinedMsg', { n: name })); sfx.coin(); players.set(msg.id, { name }); refreshView(); }
      players.get(msg.id).name = name;
      world && world.setRemote(msg.id, { ...msg, name });
      break;
    }
    case 'leave': dropPlayer(msg.id); refreshView(); break;
    case 'emote': world && world.showEmote(msg.id, String(msg.e).slice(0, 4)); break;
    case 'duel': startDuel(msg.qs, msg.did, msg.name); break;
    case 'duelScore': if (duel && duel.did === msg.did) { duel.scores.set(msg.id, { name: String(msg.name).slice(0, 16), score: msg.score, time: msg.time }); renderDuelResults(); } break;
  }
}

function sendState() {
  if (!conns.size || !world) return;
  broadcast({ t: 'state', id: myId, name: state.name, outfit: state.outfit, ...world.getPlayerState() });
}

export function sendEmote(e) { if (conns.size) broadcast({ t: 'emote', id: myId, e }); }

async function createRoom(status) {
  status.textContent = '⏳ ' + t('connecting');
  try {
    await loadLib();
    for (let k = 0; k < 4; k++) {
      const code = genCode();
      try { peer = await openPeer(PREFIX + code); roomCode = code; break; }
      catch (e) { if (e.type !== 'unavailable-id') throw e; }
    }
    if (!peer) throw new Error('no-id');
    isHost = true;
    peer.on('connection', c => attach(c));
    peer.on('error', () => {});
    sendTimer = setInterval(sendState, 100);
    refreshView();
  } catch { status.textContent = '❌ ' + t('connError'); stopAll(); }
}

async function joinRoom(code, status) {
  code = code.trim().toUpperCase();
  if (code.length < 4) { status.textContent = '❌ ' + t('connError'); return; }
  status.textContent = '⏳ ' + t('connecting');
  try {
    await loadLib();
    peer = await openPeer();
    isHost = false; roomCode = code;
    const c = peer.connect(PREFIX + code, { reliable: true });
    attach(c);
    await new Promise((res, rej) => {
      const tm = setTimeout(() => rej(new Error('timeout')), 20000);
      c.on('open', () => { clearTimeout(tm); res(); });
      peer.on('error', e => { clearTimeout(tm); rej(e); });
    });
    peer.on('error', () => {});
    sendTimer = setInterval(sendState, 100);
    toast('✅ ' + t('connected')); sfx.correct();
    refreshView();
  } catch { status.textContent = '❌ ' + t('connError'); stopAll(); }
}

function stopAll() {
  clearInterval(sendTimer); sendTimer = null;
  for (const c of conns.values()) { try { c.close(); } catch { /* */ } }
  conns.clear();
  try { peer && peer.destroy(); } catch { /* */ }
  peer = null; roomCode = null; isHost = false;
  players.clear();
  world && world.clearRemotes();
}

function refreshView() { if (viewOpen && !duel) openFriends(); }

export function openFriends() {
  viewOpen = true;
  const status = h('div', { class: 'status' });
  let body;
  if (!peer) {
    const codeIn = h('input', { class: 'input code', placeholder: t('enterCode'), maxlength: '6' });
    body = h('div', { class: 'friends' },
      h('div', { class: 'big-emoji bounce' }, '👫'),
      h('p', { class: 'tip' }, t('friendsNote')),
      h('div', { class: 'friend-cols' },
        h('div', { class: 'fbox' }, h('h3', {}, '🏠 ' + t('createRoom')), h('button', { class: 'btn primary big', onclick: () => createRoom(status) }, t('createRoom'))),
        h('div', { class: 'fbox' }, h('h3', {}, '🔑 ' + t('joinRoom')), codeIn, h('button', { class: 'btn gold big', onclick: () => joinRoom(codeIn.value, status) }, t('join')))),
      status);
  } else {
    const list = [[t('you') + ' (' + state.name + ')', true], ...[...players.values()].map(p => [p.name, false])];
    body = h('div', { class: 'friends' },
      h('div', { class: 'room-code' }, h('small', {}, t('codeLabel')), h('b', {}, roomCode || '…')),
      isHost ? h('p', { class: 'tip' }, t('shareCode')) : null,
      h('h3', {}, '👥 ' + t('players') + ' (' + list.length + ')'),
      h('div', { class: 'plist' }, list.map(([n, me]) => h('div', { class: 'pitem' + (me ? ' me' : '') }, '🙂 ' + n))),
      players.size ? null : h('p', { class: 'tip' }, '⏳ ' + t('waitingFriends')),
      h('div', { class: 'row center' },
        h('button', { class: 'btn primary big', disabled: !players.size, onclick: hostDuel }, t('duel')),
        h('button', { class: 'btn danger', onclick: () => { stopAll(); openFriends(); } }, t('leave'))),
      h('p', { class: 'tip' }, t('duelText')));
  }
  openModal('👫 ' + t('friendsTitle'), body, { accent: ACC, onClose: () => { viewOpen = false; } });
}

// ---------- Bellashuv ----------
function hostDuel() {
  const L = Math.min(level(), 5);
  const qs = Array.from({ length: 5 }, () => { const q = mathQuestion(L); return { prompt: q.prompt, options: q.options, answer: q.answer }; });
  const did = Math.random().toString(36).slice(2, 8);
  broadcast({ t: 'duel', id: myId, qs, did, name: state.name });
  startDuel(qs, did, state.name);
}

function startDuel(qs, did, by) {
  if (!Array.isArray(qs) || !qs.length) return;
  duel = { did, qs: qs.slice(0, 10), scores: new Map(), done: false };
  let i = 0, score = 0;
  const t0 = performance.now();
  const wrap = h('div', { class: 'quiz duel' });
  sfx.level();
  function render() {
    const q = duel.qs[i];
    let locked = false;
    wrap.replaceChildren(
      h('div', { class: 'dots' }, duel.qs.map((_, k) => h('span', { class: k < i ? 'done' : k === i ? 'cur' : '' }))),
      h('div', { class: 'prompt huge' }, String(q.prompt)),
      h('div', { class: 'options big' }, q.options.map((o, k) => h('button', {
        class: 'opt', onclick: e => {
          if (locked) return; locked = true;
          const ok = k === q.answer;
          e.currentTarget.classList.add(ok ? 'right' : 'bad');
          ok ? (score++, sfx.correct()) : sfx.wrong();
          setTimeout(() => { i++; i < duel.qs.length ? render() : finish(); }, 450);
        }
      }, String(o)))));
  }
  function finish() {
    const time = Math.round((performance.now() - t0) / 100) / 10;
    duel.done = true;
    duel.scores.set(myId, { name: state.name + ' (' + t('you') + ')', score, time, me: true });
    broadcast({ t: 'duelScore', id: myId, did, name: state.name, score, time });
    grant(score * 2, score * 8);
    renderDuelResults();
  }
  render();
  openModal('⚔️ ' + t('duel') + ' — ' + String(by).slice(0, 16), wrap, { accent: '#ff5a5f', onClose: () => { duel = null; } });
  duel.wrap = wrap;
}

function renderDuelResults() {
  if (!duel || !duel.done || !modalOpen()) return;
  const rows = [...duel.scores.values()].sort((a, b) => b.score - a.score || a.time - b.time);
  const medal = ['🥇', '🥈', '🥉'];
  const winner = rows[0] && rows[0].me && rows.length > 1;
  if (winner && !duel.cheered) { duel.cheered = true; confetti(); }
  duel.wrap.replaceChildren(
    h('h3', {}, '🏁 ' + t('result')),
    h('div', { class: 'plist' }, rows.map((r, k) => h('div', { class: 'pitem' + (r.me ? ' me' : '') }, `${medal[k] || '⭐'} ${r.name} — ${r.score}/${duel.qs.length} • ${r.time}${t('seconds')}`))),
    rows.length <= players.size ? h('p', { class: 'tip' }, '⏳ ' + t('waitingResults')) : null,
    h('div', { class: 'row center' }, h('button', { class: 'btn primary', onclick: () => { duel = null; openFriends(); } }, t('done') + ' ✔')));
}

// Sahifa yopilganda boshqalarga xabar berish
addEventListener('beforeunload', () => { try { if (conns.size) broadcast({ t: 'leave', id: myId }); } catch { /* */ } });
