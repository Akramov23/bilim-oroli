// Qo'shimcha darslar: Harflar, Hayvonlar, Pul hisobi, Geografiya
import { t, tr } from './i18n.js';
import { state, save, level } from './state.js';
import { WORDS } from './data.js';
import { h, showSlides, runQuiz, shuffle, rand, pick } from './ui.js';
import { speak } from './audio.js';

export const ACCENT2 = { letters: '#ef476f', animals: '#8d6e3f', money: '#e0a100', geo: '#118ab2' };
const L = (uz, ru, en, de) => ({ uz, ru, en, de });
const fin = s => { state.stats.lessons++; state.stats.correct += s; };

export function openLesson2(id) {
  ({ letters, animals, money, geo })[id]();
}

// ---------- Harflar ----------
const ALPHABET = {
  uz: ['A', 'B', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'X', 'Y', 'Z', "O'", "G'", 'Sh', 'Ch', 'Ng'],
  ru: 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'.split(''),
  en: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  de: [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), 'Ä', 'Ö', 'Ü', 'ß'],
};
const bare = w => w.replace(/^(der|die|das) /, '');
function first(w) {
  const s = bare(w);
  if (state.lang === 'uz') { const two = s.slice(0, 2).toLowerCase(); if (["o'", "g'", 'sh', 'ch'].includes(two)) return two[0].toUpperCase() + two[1]; }
  return s[0].toUpperCase();
}
function nativeWords() { return WORDS.map(w => ({ e: w.e, w: w[state.lang] })); }

function letters() {
  const title = '🔠 ' + t('z_letters');
  const alpha = ALPHABET[state.lang] || ALPHABET.en;
  const ws = nativeWords();
  const slides = [() => h('div', { class: 'learn' },
    h('h3', {}, t('lettersLearn')),
    h('p', { class: 'tip' }, t('tapToHear')),
    h('div', { class: 'letter-grid' }, alpha.map((ch, i) => {
      const ex = ws.find(x => first(x.w) === ch);
      return h('button', { class: 'letter-tile pop', style: { animationDelay: i * 0.02 + 's' }, onclick: () => speak(ex ? bare(ex.w) : ch, state.lang) },
        h('b', {}, ch === 'ß' ? ch : ch + (ch.length === 1 && state.lang !== 'de' ? ch.toLowerCase() : '')),
        ex ? h('span', {}, ex.e) : null);
    })),
    h('p', { class: 'tip' }, '💡 ' + t('letters_tip')))];
  const qs = [];
  for (let i = 0; i < 3; i++) {
    let four = [], guard = 0;
    while (four.length < 4 && guard++ < 200) { const w = pick(ws); if (!four.some(x => first(x.w) === first(w.w))) four.push(w); }
    const ans = four[0]; const arr = shuffle(four);
    qs.push({ prompt: t('startsWith', { l: first(ans.w) }), options: arr.map(x => x.e + ' ' + bare(x.w)), answer: arr.indexOf(ans), say: [bare(ans.w), state.lang] });
  }
  for (let i = 0; i < 3; i++) {
    const w = pick(ws), f = first(w.w);
    const opts = new Set([f]);
    while (opts.size < 4) opts.add(pick(alpha));
    const arr = shuffle([...opts]);
    qs.push({ prompt: t('firstLetter', { w: bare(w.w) }), visual: `<span class="em xl">${w.e}</span>`, options: arr, answer: arr.indexOf(f), big: true, say: [bare(w.w), state.lang] });
  }
  showSlides({ title, accent: ACCENT2.letters, slides, onDone: () => runQuiz({ title, accent: ACCENT2.letters, questions: shuffle(qs), onFinish: fin, onAgain: letters }) });
}

// ---------- Hayvonlar ----------
// o[0] — to'g'ri javob (emoji)
const ANIMAL_Q = [
  { q: L('Qaysi hayvon suvda yashaydi?', 'Кто живёт в воде?', 'Which animal lives in water?', 'Welches Tier lebt im Wasser?'), o: ['🐟', '🐄', '🐔', '🐒'] },
  { q: L('Qaysi biri ucha oladi?', 'Кто умеет летать?', 'Which one can fly?', 'Wer kann fliegen?'), o: ['🦅', '🐘', '🐢', '🐷'] },
  { q: L('Qaysi hayvon bizga sut beradi?', 'Кто даёт нам молоко?', 'Which animal gives us milk?', 'Welches Tier gibt uns Milch?'), o: ['🐄', '🐔', '🐟', '🐸'] },
  { q: L('Qaysi biri tuxum qo\'yadi?', 'Кто несёт яйца?', 'Which one lays eggs?', 'Wer legt Eier?'), o: ['🐔', '🐶', '🐱', '🐴'] },
  { q: L('Eng tez yuguradigan hayvon qaysi?', 'Кто бегает быстрее всех?', 'Which animal runs the fastest?', 'Welches Tier läuft am schnellsten?'), o: ['🐆', '🐢', '🐌', '🐄'] },
  { q: L('Qaysi hayvon bambuk yeydi?', 'Кто ест бамбук?', 'Which animal eats bamboo?', 'Welches Tier frisst Bambus?'), o: ['🐼', '🦁', '🐧', '🐊'] },
  { q: L('Qaysi hayvon qishda uxlaydi?', 'Кто спит всю зиму?', 'Which animal sleeps all winter?', 'Wer hält Winterschlaf?'), o: ['🐻', '🐔', '🐟', '🐒'] },
  { q: L('Qaysi hayvonning xartumi bor?', 'У кого есть хобот?', 'Which animal has a trunk?', 'Wer hat einen Rüssel?'), o: ['🐘', '🦒', '🐇', '🐍'] },
  { q: L('Qaysi hayvon cho\'lda yashaydi?', 'Кто живёт в пустыне?', 'Which animal lives in the desert?', 'Welches Tier lebt in der Wüste?'), o: ['🐪', '🐧', '🐬', '🐸'] },
  { q: L('Qaysi biri rangini o\'zgartira oladi?', 'Кто умеет менять цвет?', 'Which one can change its colour?', 'Wer kann seine Farbe ändern?'), o: ['🦎', '🐶', '🐮', '🐑'] },
  { q: L('Qaysi biri uyini orqasida olib yuradi?', 'Кто носит домик на спине?', 'Who carries its home on its back?', 'Wer trägt sein Haus auf dem Rücken?'), o: ['🐌', '🐇', '🐦', '🐴'] },
  { q: L('Qaysi biri o\'rgimchak to\'ri to\'qiydi?', 'Кто плетёт паутину?', 'Who spins a web?', 'Wer spinnt ein Netz?'), o: ['🕷️', '🐝', '🐜', '🦋'] },
  { q: L('Qaysi hayvon sakrab yuradi va xaltasi bor?', 'Кто прыгает и носит сумку?', 'Which animal hops and has a pouch?', 'Welches Tier hüpft und hat einen Beutel?'), o: ['🦘', '🐘', '🐄', '🐺'] },
  { q: L('Qaysi qush sovuq muzda yashaydi?', 'Какая птица живёт во льдах?', 'Which bird lives on the ice?', 'Welcher Vogel lebt auf dem Eis?'), o: ['🐧', '🦜', '🦚', '🐓'] },
  { q: L('Asalni kim yasaydi?', 'Кто делает мёд?', 'Who makes honey?', 'Wer macht Honig?'), o: ['🐝', '🐞', '🦗', '🐛'] },
  { q: L('Eng uzun bo\'yinli hayvon qaysi?', 'У кого самая длинная шея?', 'Who has the longest neck?', 'Wer hat den längsten Hals?'), o: ['🦒', '🐻', '🐷', '🐭'] },
];
function animals() {
  const title = '🐾 ' + t('z_animals');
  const start = (state.stats.animalIdx || 0) % ANIMAL_Q.length;
  const set = Array.from({ length: 6 }, (_, k) => ANIMAL_Q[(start + k) % ANIMAL_Q.length]);
  state.stats.animalIdx = (start + 6) % ANIMAL_Q.length; save();
  const slides = [() => h('div', { class: 'learn' },
    h('h3', {}, t('animalsLearn')),
    h('div', { class: 'facts' }, set.map((a, i) => h('div', { class: 'fact pop', style: { animationDelay: i * 0.07 + 's' } },
      h('span', { class: 'em' }, a.o[0]), h('div', {}, h('div', { class: 'q' }, tr(a.q)), h('div', { class: 'a' }, '✅ ' + a.o[0]))))))];
  const questions = shuffle(set).map(a => { const arr = shuffle(a.o); return { prompt: tr(a.q), options: arr, answer: arr.indexOf(a.o[0]), big: true }; });
  showSlides({ title, accent: ACCENT2.animals, slides, onDone: () => runQuiz({ title, accent: ACCENT2.animals, questions, onFinish: fin, onAgain: animals }) });
}

// ---------- Pul hisobi ----------
const GOODS = ['🍎', '🍌', '🧃', '🍪', '🎈', '✏️', '🧸', '⚽', '🍦', '📒'];
function makeNum(ans) {
  const set = new Set([ans]);
  while (set.size < 4) { const v = ans + rand(-4, 4); if (v >= 0) set.add(v); }
  const arr = shuffle([...set]);
  return { options: arr.map(String), answer: arr.indexOf(ans) };
}
function money() {
  const Lv = level();
  const max = Lv <= 2 ? 10 : Lv <= 4 ? 20 : 50;
  const title = '💰 ' + t('z_money');
  const slides = [() => h('div', { class: 'learn' },
    h('div', { class: 'big-emoji bounce' }, '🛒'),
    h('h3', {}, t('moneyLearn')),
    h('div', { class: 'price-row' }, h('span', { class: 'tag' }, '🍎 3🪙'), h('b', {}, '+'), h('span', { class: 'tag' }, '🍌 2🪙'), h('b', {}, '='), h('span', { class: 'tag gold' }, '5🪙')),
    h('div', { class: 'price-row' }, h('span', { class: 'tag' }, '👛 10🪙'), h('b', {}, '−'), h('span', { class: 'tag' }, '🧸 6🪙'), h('b', {}, '='), h('span', { class: 'tag gold' }, '4🪙')),
    h('p', { class: 'tip' }, '💡 ' + t('money_tip')))];
  const qs = [];
  for (let i = 0; i < 2; i++) {
    const a = rand(1, Math.min(9, max - 1)), b = rand(1, Math.min(9, max - a));
    qs.push({ prompt: t('moneySum'), visual: `<div class="coins-row">${'🪙'.repeat(a)}</div><b>+</b><div class="coins-row">${'🪙'.repeat(b)}</div>`, ...makeNum(a + b), big: true });
  }
  for (let i = 0; i < 2; i++) {
    const [g1, g2] = shuffle(GOODS).slice(0, 2);
    const p1 = rand(1, Math.floor(max / 2)), p2 = rand(1, Math.floor(max / 2));
    qs.push({ prompt: t('moneyBoth'), visual: `<div class="price-row"><span class="tag">${g1} ${p1}🪙</span><b>+</b><span class="tag">${g2} ${p2}🪙</span></div>`, ...makeNum(p1 + p2), big: true });
  }
  for (let i = 0; i < 2; i++) {
    const g = pick(GOODS), have = rand(5, max), price = rand(1, have - 1);
    qs.push({ prompt: t('moneyChange'), visual: `<div class="story">${t('moneyChangeText', { have, item: g, price })}</div>`, ...makeNum(have - price), big: true });
  }
  showSlides({ title, accent: ACCENT2.money, slides, onDone: () => runQuiz({ title, accent: ACCENT2.money, questions: shuffle(qs), onFinish: fin, onAgain: money }) });
}

// ---------- Geografiya ----------
const COUNTRIES = [
  { f: '🇺🇿', c: L("O'zbekiston", 'Узбекистан', 'Uzbekistan', 'Usbekistan'), cap: L('Toshkent', 'Ташкент', 'Tashkent', 'Taschkent') },
  { f: '🇷🇺', c: L('Rossiya', 'Россия', 'Russia', 'Russland'), cap: L('Moskva', 'Москва', 'Moscow', 'Moskau') },
  { f: '🇩🇪', c: L('Germaniya', 'Германия', 'Germany', 'Deutschland'), cap: L('Berlin', 'Берлин', 'Berlin', 'Berlin') },
  { f: '🇬🇧', c: L('Buyuk Britaniya', 'Великобритания', 'United Kingdom', 'Großbritannien'), cap: L('London', 'Лондон', 'London', 'London') },
  { f: '🇫🇷', c: L('Fransiya', 'Франция', 'France', 'Frankreich'), cap: L('Parij', 'Париж', 'Paris', 'Paris') },
  { f: '🇯🇵', c: L('Yaponiya', 'Япония', 'Japan', 'Japan'), cap: L('Tokio', 'Токио', 'Tokyo', 'Tokio') },
  { f: '🇺🇸', c: L('AQSH', 'США', 'USA', 'USA'), cap: L('Vashington', 'Вашингтон', 'Washington', 'Washington') },
  { f: '🇹🇷', c: L('Turkiya', 'Турция', 'Turkey', 'Türkei'), cap: L('Anqara', 'Анкара', 'Ankara', 'Ankara') },
  { f: '🇰🇿', c: L("Qozog'iston", 'Казахстан', 'Kazakhstan', 'Kasachstan'), cap: L('Astana', 'Астана', 'Astana', 'Astana') },
  { f: '🇨🇳', c: L('Xitoy', 'Китай', 'China', 'China'), cap: L('Pekin', 'Пекин', 'Beijing', 'Peking') },
  { f: '🇮🇹', c: L('Italiya', 'Италия', 'Italy', 'Italien'), cap: L('Rim', 'Рим', 'Rome', 'Rom') },
  { f: '🇪🇬', c: L('Misr', 'Египет', 'Egypt', 'Ägypten'), cap: L('Qohira', 'Каир', 'Cairo', 'Kairo') },
];
function geo() {
  const title = '🗺️ ' + t('z_geo');
  const set = shuffle(COUNTRIES).slice(0, 6);
  const slides = [() => h('div', { class: 'learn' },
    h('h3', {}, t('geoLearn')),
    h('div', { class: 'geo-grid' }, set.map((c, i) => h('div', { class: 'geo-card pop', style: { animationDelay: i * 0.07 + 's' } },
      h('span', { class: 'flag' }, c.f), h('b', {}, tr(c.c)), h('small', {}, '🏛️ ' + tr(c.cap))))))];
  const qs = [];
  set.slice(0, 3).forEach(c => {
    const arr = shuffle([c, ...shuffle(COUNTRIES.filter(x => x !== c)).slice(0, 3)]);
    qs.push({ prompt: t('whichCountry'), visual: `<span class="em xl">${c.f}</span>`, options: arr.map(x => tr(x.c)), answer: arr.indexOf(c) });
  });
  set.slice(3).forEach(c => {
    const arr = shuffle([c, ...shuffle(COUNTRIES.filter(x => x !== c)).slice(0, 3)]);
    qs.push({ prompt: t('capitalOf', { c: tr(c.c) }), visual: `<span class="em xl">${c.f}</span>`, options: arr.map(x => tr(x.cap)), answer: arr.indexOf(c) });
  });
  showSlides({ title, accent: ACCENT2.geo, slides, onDone: () => runQuiz({ title, accent: ACCENT2.geo, questions: shuffle(qs), onFinish: fin, onAgain: geo }) });
}
