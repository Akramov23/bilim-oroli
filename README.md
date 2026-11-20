# 🏝️ Bilim Oroli — bolalar uchun 3D o'quv o'yini

Bola 3D orolda o'z personaji bilan yuradi, rangli doiralar orqali binolarga kiradi, dars o'qiydi, o'yin o'ynaydi, tanga yig'adi, kiyim sotib oladi va kartalar to'playdi.

## Ishga tushirish

Brauzer ES modullarni `file://` orqali ochmaydi, shuning uchun kichik server kerak:

```bash
cd ~/Desktop/bilim-oroli && python3 -m http.server 8000
```

Keyin brauzerda oching: http://localhost:8000

## Nimalar bor

| Bo'lim | Tavsif |
|---|---|
| 🔢 Matematika | Qo'shish → ayirish → ko'paytirish → bo'lish, matnli masalalar, > < = taqqoslash |
| 🔤 Ingliz / 🥨 Nemis / 🪆 Rus tili | 42 ta so'z, ovozli talaffuz (🔊), so'z ↔ rasm testlari |
| 🔷 Shakllar | 8 ta shakl, burchaklarni sanash |
| 🕐 Soat | Soatni o'qish (to'liq soat → yarim → chorak) |
| 🧩 Mantiq | Sonli ketma-ketlik, rangli naqsh, "ortiqchasini top" |
| 🌍 Dunyo bilimi | 22 ta qiziqarli fakt va test |
| 🎮 O'yinlar | Tez hisob (30 s), Xotira kartalari, Olmos ovi (3D olamda) |
| 🛍️ Do'kon / 👕 Kiyimlar | 86 ta narsa: 12 ta skin (o'g'il/qiz bola obrazlari), futbolka, shim/yubka, oyoq kiyim, soch turmagi, bosh kiyim, ko'zoynak, orqa, uy hayvonlari, karta to'plamlari |
| 🏙️ Orol | 250 m katta orol: shaharcha, ko'p qavatli uylar, do'konlar, yo'llar, yuruvchi mashinalar, bog', o'yin maydonchasi, ~34 ta yuruvchi odam, kichik xarita (bosib tez borish) |
| 🃏 Kartalar | 27 ta karta (oddiy/noyob/epik/afsonaviy). Har yangi darajada yangi kartalar ochiladi |
| 👫 Do'stlar | Xona kodi orqali do'st bilan bitta orolda yurish, emoji yuborish, ⚔️ matematik bellashuv |
| ⚙️ Sozlamalar | Til (UZ/RU/EN/DE), kunduz/tun/avto, ovoz, musiqa, grafika, ism, progressni o'chirish |

Kunlik sovg'a, tanga yig'ish, daraja/XP va konfetti bolani zeriktirmaslik uchun.

## Boshqaruv

- **WASD / strelkalar** — yurish, **Shift** — yugurish, **Probel** — sakrash, **E** — binoga kirish
- Sichqoncha bilan tortish — kamerani aylantirish, g'ildirak — yaqinlashtirish
- Telefonda: chapda joystik, o'ngda sakrash tugmasi

## Fayllar

```
index.html          — sahifa
css/style.css       — dizayn (light/dark)
js/main.js          — bosh fayl, HUD, kirish ekrani
js/world.js         — 3D orol (three.js)
js/character.js     — personaj va aksessuarlar
js/lessons.js       — darslar
js/games.js         — mini o'yinlar
js/panels.js        — do'kon, albom, sozlamalar
js/friends.js       — do'stlar bilan o'ynash (PeerJS / WebRTC)
js/i18n.js          — 4 til
js/data.js          — kartalar, kiyimlar, so'zlar, faktlar
js/state.js         — saqlash (localStorage)
js/audio.js         — ovozlar va musiqa
```

Progress brauzerning `localStorage`ida saqlanadi (server/baza yo'q).

## Internetda

🌐 https://akramov23.github.io/bilim-oroli/ (GitHub Pages, repo: Akramov23/bilim-oroli)

O'zgarishlarni saytga chiqarish:

```bash
cd ~/Desktop/bilim-oroli && git add -A && git commit -m "Yangilanish" && git push
```

1–2 daqiqadan keyin sayt yangilanadi.
