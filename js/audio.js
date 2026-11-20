// Oddiy ovoz effektlari va fon musiqasi (WebAudio, fayl kerak emas)
import { state } from './state.js';

let ctx = null;
function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type = 'sine', vol = 0.15, when = 0, force = false) {
  if (!state.sound && !force) return;
  try {
    const c = ac();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    const t0 = c.currentTime + when;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  } catch { /* ovoz yo'q */ }
}

export const sfx = {
  click() { tone(660, 0.07, 'triangle', 0.08); },
  coin() { tone(988, 0.07, 'square', 0.05); tone(1319, 0.14, 'square', 0.05, 0.06); },
  correct() { tone(523, 0.12, 'triangle', 0.15); tone(784, 0.22, 'triangle', 0.15, 0.1); },
  wrong() { tone(200, 0.28, 'sawtooth', 0.07); },
  jump() { tone(420, 0.12, 'sine', 0.08); tone(640, 0.1, 'sine', 0.06, 0.05); },
  level() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, 'triangle', 0.14, i * 0.11)); },
  chirp() {
    const base = 2200 + Math.random() * 1400;
    for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) { tone(base + Math.random() * 500, 0.07, 'sine', 0.025, i * 0.11); tone(base * 1.25, 0.05, 'sine', 0.018, i * 0.11 + 0.05); }
  },
  pack() { [392, 523, 659, 784].forEach((f, i) => tone(f, 0.2, 'square', 0.05, i * 0.08)); },
};

// Yumshoq fon musiqasi — pentatonik arpeggio
let musicTimer = null;
const NOTES = [262, 294, 330, 392, 440, 523, 587, 659];
const MELODY = [0, 2, 4, 5, 4, 2, 3, 1, 0, 2, 4, 7, 6, 4, 3, 2];
export function setMusic(on) {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  if (!on) return;
  let i = 0;
  musicTimer = setInterval(() => {
    const n = NOTES[MELODY[i % MELODY.length]];
    tone(n, 0.45, 'sine', 0.045, 0, true);
    if (i % 4 === 0) tone(n / 2, 0.9, 'triangle', 0.03, 0, true);
    i++;
  }, 340);
}

// So'zni ovoz chiqarib o'qish (inglizcha / nemischa)
export function speak(text, lang) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = { en: 'en-US', de: 'de-DE', ru: 'ru-RU', uz: 'uz-UZ' }[lang] || 'en-US';
    u.rate = 0.85;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch { /* qo'llab-quvvatlanmaydi */ }
}
