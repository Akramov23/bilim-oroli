// Katta 3D orol: markaziy maydon, dars binolari, shaharcha (uylar, do'konlar, yo'llar, mashinalar),
// bog'lar, yuradigan odamlar, uy hayvoni, kichik xarita.
import * as THREE from 'three';
import { makeCharacter, makeNPC, makePet } from './character.js';

export const STATIONS = [
  { id: 'math', emoji: '🔢', color: 0x4f8cff, kind: 'tower' },
  { id: 'english', emoji: '🔤', color: 0xff5a5f, kind: 'house' },
  { id: 'shapes', emoji: '🔷', color: 0x00a6d6, kind: 'school' },
  { id: 'games', emoji: '🎮', color: 0xff8c42, kind: 'dome' },
  { id: 'german', emoji: '🥨', color: 0xf4a300, kind: 'house' },
  { id: 'clock', emoji: '🕐', color: 0x6aa51b, kind: 'tower' },
  { id: 'logic', emoji: '🧩', color: 0x9b5de5, kind: 'school' },
  { id: 'shop', emoji: '🛍️', color: 0xff6fb5, kind: 'stall' },
  { id: 'russian', emoji: '🪆', color: 0xc2185b, kind: 'house' },
  { id: 'science', emoji: '🌍', color: 0x2ec4b6, kind: 'dome' },
];

export const ISLAND_R = 125;
const RING_R = 26, BUILD_R = 36;
const ROAD_R = 64, ROAD_HW = 3.6, WALK_W = 2.2;
const RADIAL = [1, 3, 5, 7].map(k => k * Math.PI / 4);
const RADIAL_FROM = 46, RADIAL_TO = 119;

function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
const rand = rng(11);
const rpick = a => a[Math.floor(rand() * a.length)];
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
function sh(m, cast = true, recv = true) { m.castShadow = cast; m.receiveShadow = recv; return m; }
function canvas(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(cv, rep = 1) {
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 4; return t;
}
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

// ---------- Teksturalar ----------
function noiseTex(base, cols, n, size = 256, rep = 1, blades = false) {
  const cv = canvas(size), g = cv.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  for (let i = 0; i < n; i++) {
    g.fillStyle = cols[i % cols.length];
    const x = Math.random() * size, y = Math.random() * size;
    if (blades) { g.fillRect(x, y, 1.5, 3 + Math.random() * 5); }
    else { g.globalAlpha = 0.25 + Math.random() * 0.4; g.fillRect(x, y, 1 + Math.random() * 3, 1 + Math.random() * 3); g.globalAlpha = 1; }
  }
  return tex(cv, rep);
}
function pavingTex(c1, c2, rep) {
  const cv = canvas(128), g = cv.getContext('2d');
  g.fillStyle = c2; g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const off = y % 2 ? 16 : 0;
    g.fillStyle = c1; g.globalAlpha = 0.85 + Math.random() * 0.15;
    g.fillRect(((x * 32 + off) % 128) + 1.5, y * 32 + 1.5, 29, 29);
  }
  g.globalAlpha = 1;
  return tex(cv, rep);
}
const facadeCache = new Map();
function facade(wall, style) {
  const key = wall + style;
  if (facadeCache.has(key)) return facadeCache.get(key);
  const S = 128, N = 4;
  const cv = canvas(S * N), em = canvas(S * N);
  const g = cv.getContext('2d'), e = em.getContext('2d');
  g.fillStyle = wall; g.fillRect(0, 0, S * N, S * N);
  for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`; g.fillRect(Math.random() * S * N, Math.random() * S * N, 2 + Math.random() * 4, 2 + Math.random() * 4); }
  e.fillStyle = '#000'; e.fillRect(0, 0, S * N, S * N);
  const frame = style === 'house' ? '#f7f1e3' : '#f4f6f8';
  for (let cy = 0; cy < N; cy++) for (let cx = 0; cx < N; cx++) {
    const x0 = cx * S, y0 = cy * S;
    g.fillStyle = 'rgba(0,0,0,0.07)'; g.fillRect(x0, y0 + S - 6, S, 6);
    let [wx, wy, ww, wh] = style === 'shop' ? [8, 12, 112, 104] : style === 'house' ? [34, 26, 60, 62] : [24, 20, 80, 74];
    g.fillStyle = frame; g.fillRect(x0 + wx - 5, y0 + wy - 5, ww + 10, wh + 10);
    const gr = g.createLinearGradient(0, y0 + wy, 0, y0 + wy + wh);
    gr.addColorStop(0, '#d6ecf8'); gr.addColorStop(0.5, '#86b8d8'); gr.addColorStop(1, '#4f7fa8');
    g.fillStyle = gr; g.fillRect(x0 + wx, y0 + wy, ww, wh);
    g.fillStyle = 'rgba(255,255,255,0.28)';
    g.beginPath(); g.moveTo(x0 + wx, y0 + wy + wh * 0.6); g.lineTo(x0 + wx + ww * 0.45, y0 + wy); g.lineTo(x0 + wx + ww * 0.65, y0 + wy); g.lineTo(x0 + wx, y0 + wy + wh * 0.95); g.fill();
    g.fillStyle = frame;
    g.fillRect(x0 + wx + ww / 2 - 2, y0 + wy, 4, wh);
    if (style !== 'shop') g.fillRect(x0 + wx, y0 + wy + wh * 0.32, ww, 4);
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x0 + wx - 8, y0 + wy + wh + 5, ww + 16, 6);
    if (style === 'house') { g.fillStyle = '#5b7f4a'; g.fillRect(x0 + wx - 4, y0 + wy + wh + 8, ww + 8, 7); }
    if (Math.random() < 0.45) {
      e.fillStyle = ['#ffd98a', '#ffe9b8', '#ffc870'][Math.floor(Math.random() * 3)];
      e.fillRect(x0 + wx, y0 + wy, ww, wh);
      e.fillStyle = '#000'; e.fillRect(x0 + wx + ww / 2 - 2, y0 + wy, 4, wh);
    }
  }
  const r = { map: tex(cv), emis: tex(em) };
  facadeCache.set(key, r);
  return r;
}
const nightMats = [];
function facadeMat(wall, style, cellsX, floors) {
  const f = facade(wall, style);
  const map = f.map.clone(); map.needsUpdate = true; map.repeat.set(cellsX / 4, floors / 4);
  const emis = f.emis.clone(); emis.needsUpdate = true; emis.repeat.set(cellsX / 4, floors / 4);
  const m = new THREE.MeshStandardMaterial({ map, emissiveMap: emis, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.88 });
  nightMats.push(m);
  return m;
}

// ---------- Yorliqlar ----------
function makeLabel(text, color = '#1d2340', bg = 'rgba(255,255,255,0.92)', w = 512, h = 128) {
  const cv = canvas(w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false, transparent: true }));
  spr.userData.draw = txt => {
    const g = cv.getContext('2d');
    g.clearRect(0, 0, w, h);
    g.font = `900 ${Math.round(h * 0.46)}px Nunito, system-ui, sans-serif`;
    const tw = Math.min(w - 8, g.measureText(txt).width + h * 0.6), x = (w - tw) / 2;
    g.fillStyle = bg; g.beginPath(); g.roundRect(x, 6, tw, h - 12, (h - 12) / 2); g.fill();
    g.lineWidth = 6; g.strokeStyle = color; g.stroke();
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(txt, w / 2, h / 2 + 3, w - 30);
    t.needsUpdate = true;
  };
  spr.userData.draw(text);
  spr.scale.set(w / h * 1.5, 1.5, 1);
  return spr;
}
function makeEmojiSprite(e, size = 1.6) {
  const cv = canvas(128), g = cv.getContext('2d');
  g.font = '96px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, 64, 72);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.scale.set(size, size, 1);
  return s;
}

// ---------- To'qnashuvlar ----------
// doira: {x,z,r}  to'rtburchak: {x,z,hw,hd,c,s,box:true}
function boxCollider(x, z, w, d, rot) { return { x, z, hw: w / 2, hd: d / 2, c: Math.cos(rot), s: Math.sin(rot), box: true, r: Math.hypot(w, d) / 2 }; }
function resolve(p, rad, list) {
  let hit = false;
  for (const c of list) {
    const dx = p.x - c.x, dz = p.z - c.z;
    if (Math.abs(dx) > c.r + rad + 0.5 || Math.abs(dz) > c.r + rad + 0.5) continue;
    if (c.box) {
      const lx = dx * c.c - dz * c.s, lz = dx * c.s + dz * c.c;
      const ex = c.hw + rad, ez = c.hd + rad;
      if (Math.abs(lx) < ex && Math.abs(lz) < ez) {
        let nx = lx, nz = lz;
        if (ex - Math.abs(lx) < ez - Math.abs(lz)) nx = Math.sign(lx || 1) * ex; else nz = Math.sign(lz || 1) * ez;
        p.x = c.x + nx * c.c + nz * c.s; p.z = c.z - nx * c.s + nz * c.c; hit = true;
      }
    } else {
      const d = Math.hypot(dx, dz), min = c.r + rad;
      if (d < min && d > 1e-4) { p.x = c.x + dx / d * min; p.z = c.z + dz / d * min; hit = true; }
    }
  }
  return hit;
}
function inside(x, z, pad, list) {
  for (const c of list) {
    const dx = x - c.x, dz = z - c.z;
    if (Math.abs(dx) > c.r + pad + 0.5 || Math.abs(dz) > c.r + pad + 0.5) continue;
    if (c.box) {
      const lx = dx * c.c - dz * c.s, lz = dx * c.s + dz * c.c;
      if (Math.abs(lx) < c.hw + pad && Math.abs(lz) < c.hd + pad) return true;
    } else if (Math.hypot(dx, dz) < c.r + pad) return true;
  }
  return false;
}
function onRoad(x, z, pad = 0) {
  const r = Math.hypot(x, z);
  if (Math.abs(r - ROAD_R) < ROAD_HW + pad) return true;
  if (r > RADIAL_FROM - pad && r < RADIAL_TO + pad) {
    const a = Math.atan2(x, z);
    for (const ra of RADIAL) { const d = angDiff(a, ra); if (Math.abs(d) < Math.PI / 2 && r * Math.sin(Math.abs(d)) < ROAD_HW + pad) return true; }
  }
  return false;
}

// ---------- Binolar ----------
const WALLS = ['#efe3cf', '#dbe5ec', '#f3e2c4', '#d3dbe0', '#ecc9b3', '#dfe8cf', '#f0d9d9', '#e4dccb'];
const ROOFS = ['#b5523b', '#8d3b2f', '#5a6270', '#7a4e2d', '#3d5a80', '#9c4a3a'];

function prismRoof(w, d, h, color) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 - 0.5, 0); s.lineTo(w / 2 + 0.5, 0); s.lineTo(0, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d + 0.8, bevelEnabled: false });
  g.translate(0, 0, -(d + 0.8) / 2);
  return sh(new THREE.Mesh(g, mat(color, { roughness: 0.7 })));
}
function door(g, z, w = 1.5, hgt = 2.4, color = 0x6b4226) {
  const d = sh(new THREE.Mesh(new THREE.BoxGeometry(w, hgt, 0.15), mat(color)), false); d.position.set(0, hgt / 2, z); g.add(d);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), mat(0xffd166, { metalness: 0.8, roughness: 0.3 })); knob.position.set(w * 0.33, hgt * 0.48, z + 0.1); g.add(knob);
  const step = sh(new THREE.Mesh(new THREE.BoxGeometry(w + 1, 0.18, 0.9), mat(0xbfbfbf)), false); step.position.set(0, 0.09, z + 0.45); g.add(step);
}

function apartment(w, d, floors, wall) {
  const g = new THREE.Group(), H = floors * 3.1;
  const side = facadeMat(wall, 'apt', Math.max(2, Math.round(d / 3)), floors);
  const front = facadeMat(wall, 'apt', Math.max(2, Math.round(w / 3)), floors);
  const roof = mat(0x6e7178);
  const b = sh(new THREE.Mesh(new THREE.BoxGeometry(w, H, d), [side, side, roof, roof, front, front])); b.position.y = H / 2; g.add(b);
  const par = sh(new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.6, d + 0.3), mat(0x9aa0a6))); par.position.y = H + 0.1; g.add(par);
  const top = new THREE.Mesh(new THREE.BoxGeometry(w - 0.4, 0.2, d - 0.4), mat(0x55585e)); top.position.y = H + 0.35; g.add(top);
  if (rand() < 0.7) { const ac = sh(new THREE.Mesh(new THREE.BoxGeometry(1.4, 1, 1.4), mat(0xcfd3d6))); ac.position.set(w * 0.25, H + 0.9, -d * 0.2); g.add(ac); }
  if (rand() < 0.5) { const tank = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.6, 14), mat(0x8fa3b0))); tank.position.set(-w * 0.25, H + 1.2, d * 0.1); g.add(tank); }
  door(g, d / 2 + 0.05, 1.8, 2.6, 0x3d405b);
  const can = sh(new THREE.Mesh(new THREE.BoxGeometry(3, 0.15, 1.4), mat(0x3d405b))); can.position.set(0, 3, d / 2 + 0.7); g.add(can);
  // balkonlar
  if (floors > 2) for (let f = 1; f < floors; f++) for (const bx of [-w * 0.3, w * 0.3]) {
    const bal = sh(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 1), mat(wall === '#dbe5ec' ? 0xffffff : 0xf5f5f5)), true, false);
    bal.position.set(bx, f * 3.1 + 0.45, d / 2 + 0.5); g.add(bal);
  }
  return { g, h: H };
}
function house(w, d, floors, wall, roofCol) {
  const g = new THREE.Group(), H = floors * 3;
  const side = facadeMat(wall, 'house', Math.max(1, Math.round(d / 3.2)), floors);
  const front = facadeMat(wall, 'house', Math.max(2, Math.round(w / 3.2)), floors);
  const b = sh(new THREE.Mesh(new THREE.BoxGeometry(w, H, d), [side, side, mat(0x888888), mat(0x888888), front, front])); b.position.y = H / 2; g.add(b);
  const roof = prismRoof(w, d, 2.6, roofCol); roof.position.y = H; g.add(roof);
  const ch = sh(new THREE.Mesh(new THREE.BoxGeometry(0.7, 2, 0.7), mat(0x8a5a44))); ch.position.set(w * 0.25, H + 1.6, -d * 0.15); g.add(ch);
  door(g, d / 2 + 0.05, 1.3, 2.2, rpick([0x6b4226, 0x2a9d8f, 0xe63946, 0x264653]));
  // panjara va gullar
  const fenceM = mat(0xffffff);
  for (let i = -3; i <= 3; i++) { if (Math.abs(i) < 1) continue; const p = sh(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.12), fenceM), true, false); p.position.set(i * (w / 7), 0.45, d / 2 + 2.6); g.add(p); }
  for (const s of [-1, 1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(w * 0.36, 0.1, 0.08), fenceM); rail.position.set(s * w * 0.3, 0.7, d / 2 + 2.6); g.add(rail); }
  return { g, h: H + 2.6 };
}
function shopBuilding(w, d, wall, awning, signEmoji) {
  const g = new THREE.Group(), H = 4.2;
  const front = facadeMat(wall, 'shop', Math.max(2, Math.round(w / 3.4)), 1);
  const side = mat(wall);
  const b = sh(new THREE.Mesh(new THREE.BoxGeometry(w, H, d), [side, side, mat(0x6e7178), side, front, side])); b.position.y = H / 2; g.add(b);
  door(g, d / 2 + 0.05, 1.6, 2.6, 0x2b2d42);
  const n = Math.max(4, Math.round(w / 1.2));
  for (let i = 0; i < n; i++) {
    const st = sh(new THREE.Mesh(new THREE.BoxGeometry(w / n, 0.12, 1.8), mat(i % 2 ? 0xffffff : awning)), true, false);
    st.position.set(-w / 2 + (i + 0.5) * w / n, 3.3, d / 2 + 0.8); st.rotation.x = 0.25; g.add(st);
  }
  const sign = makeEmojiSprite(signEmoji, 1.8); sign.position.set(0, H + 1.1, d / 2 - 0.3); g.add(sign);
  const board = sh(new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 1.1, 0.2), mat(awning))); board.position.set(0, H + 0.2, d / 2 - 0.2); g.add(board);
  return { g, h: H + 1.5 };
}
function stationBuilding(s) {
  const g = new THREE.Group();
  const col = new THREE.Color(s.color);
  const wall = '#' + col.clone().lerp(new THREE.Color(0xffffff), 0.72).getHexString();
  let top = 8, coll;
  if (s.kind === 'tower') {
    const fm = facadeMat(wall, 'apt', 8, 3);
    const b = sh(new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.6, 9, 20), [fm, mat(0x777777), mat(0x777777)])); b.position.y = 4.5; g.add(b);
    const roof = sh(new THREE.Mesh(new THREE.ConeGeometry(4.3, 4.2, 20), mat(col, { roughness: 0.6 }))); roof.position.y = 11.1; g.add(roof);
    const pole = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2), mat(0x999999))); pole.position.y = 14; g.add(pole);
    const flag = sh(new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.8, 0.05), mat(col))); flag.position.set(0.7, 14.5, 0); g.add(flag);
    door(g, 3.55, 1.6, 2.6); top = 14; coll = { r: 4.4 };
  } else if (s.kind === 'house' || s.kind === 'school') {
    const w = s.kind === 'school' ? 11 : 8, d = 7, fl = 2, H = fl * 3.2;
    const side = facadeMat(wall, 'apt', 2, fl), front = facadeMat(wall, 'apt', Math.round(w / 2.7), fl);
    const b = sh(new THREE.Mesh(new THREE.BoxGeometry(w, H, d), [side, side, mat(0x777777), mat(0x777777), front, front])); b.position.y = H / 2; g.add(b);
    if (s.kind === 'house') { const r = prismRoof(w, d, 3.2, '#' + col.getHexString()); r.position.y = H; g.add(r); top = H + 3.6; }
    else {
      const par = sh(new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.8, d + 0.4), mat(col))); par.position.y = H + 0.3; g.add(par);
      const clockT = sh(new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), mat(wall))); clockT.position.set(0, H + 1.6, 0); g.add(clockT);
      const roofC = sh(new THREE.Mesh(new THREE.ConeGeometry(2, 1.6, 4), mat(col))); roofC.position.set(0, H + 3.6, 0); roofC.rotation.y = Math.PI / 4; g.add(roofC);
      top = H + 4.5;
    }
    door(g, d / 2 + 0.05, 1.8, 2.6);
    coll = { box: [w, d] };
  } else if (s.kind === 'dome') {
    const fm = facadeMat(wall, 'apt', 8, 1);
    const b = sh(new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.6, 3.4, 28), [fm, mat(0x777777), mat(0x777777)])); b.position.y = 1.7; g.add(b);
    const dm = sh(new THREE.Mesh(new THREE.SphereGeometry(4.4, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat(col, { roughness: 0.35, metalness: 0.2 }))); dm.position.y = 3.4; g.add(dm);
    const tip = sh(new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 12), mat(0xffd166, { emissive: 0xffb703, emissiveIntensity: 0.3 }))); tip.position.y = 8; g.add(tip);
    door(g, 4.5, 1.6, 2.6); top = 9; coll = { r: 5 };
  } else {
    const counter = sh(new THREE.Mesh(new THREE.BoxGeometry(6, 1.3, 2.4), mat(0xffffff))); counter.position.set(0, 0.65, 0.8); g.add(counter);
    for (const [x, z] of [[-2.8, -0.6], [2.8, -0.6], [-2.8, 1.9], [2.8, 1.9]]) { const p = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.8), mat(0xffffff))); p.position.set(x, 1.9, z); g.add(p); }
    for (let i = 0; i < 7; i++) { const st = sh(new THREE.Mesh(new THREE.BoxGeometry(6.6 / 7, 0.3, 3.8), mat(i % 2 ? 0xffffff : col))); st.position.set(-3.3 + (i + 0.5) * 6.6 / 7, 3.9, 0.65); st.rotation.x = -0.18; g.add(st); }
    const back = sh(new THREE.Mesh(new THREE.BoxGeometry(6, 3.6, 0.3), mat(col))); back.position.set(0, 1.8, -0.7); g.add(back);
    for (let i = 0; i < 5; i++) { const gift = sh(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), mat([0xffd166, 0x4f8cff, 0x34c759, 0x9b5de5, 0xff5a5f][i]))); gift.position.set(-2.4 + i * 1.2, 1.6, 0.8); g.add(gift); }
    top = 6.2; coll = { box: [6.4, 3.2] };
  }
  return { g, top, coll };
}

function car(color) {
  const g = new THREE.Group();
  const body = sh(new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.75, 4.2), mat(color, { roughness: 0.35, metalness: 0.4 }))); body.position.y = 0.65; g.add(body);
  const cab = sh(new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.7, 2.2), mat(color, { roughness: 0.35, metalness: 0.4 }))); cab.position.set(0, 1.35, -0.2); g.add(cab);
  const glassM = mat(0x223344, { roughness: 0.1, metalness: 0.6 });
  const wf = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 0.05), glassM); wf.position.set(0, 1.37, 0.92); g.add(wf);
  const wb = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 0.05), glassM); wb.position.set(0, 1.37, -1.32); g.add(wb);
  for (const s of [-1, 1]) { const ws = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 1.9), glassM); ws.position.set(s * 0.86, 1.37, -0.2); g.add(ws); }
  const wheelG = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 16), wheelM = mat(0x1b1b1b), hubM = mat(0xcccccc, { metalness: 0.8 });
  for (const [x, z] of [[-0.9, 1.35], [0.9, 1.35], [-0.9, -1.35], [0.9, -1.35]]) {
    const w = sh(new THREE.Mesh(wheelG, wheelM)); w.rotation.z = Math.PI / 2; w.position.set(x, 0.36, z); g.add(w);
    const hb = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.32, 10), hubM); hb.rotation.z = Math.PI / 2; hb.position.set(x, 0.36, z); g.add(hb);
  }
  const hl = mat(0xfff6d5, { emissive: 0xfff2b0, emissiveIntensity: 0.4 });
  for (const s of [-1, 1]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.05), hl); l.position.set(s * 0.65, 0.75, 2.11); g.add(l);
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.05), mat(0xff3b3b, { emissive: 0xff0000, emissiveIntensity: 0.4 })); r.position.set(s * 0.65, 0.75, -2.11); g.add(r);
  }
  nightMats.push(hl);
  return g;
}

// =====================================================================
export function createWorld(canvasEl, opts) {
  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 700);

  const hemi = new THREE.HemisphereLight(0xd6ecff, 0x6f9a4a, 1.1); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 200 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  scene.add(sun); scene.add(sun.target);

  const statics = []; // to'qnashuvlar
  const footprints = []; // xarita uchun

  // ----- Yer -----
  const waterTex = noiseTex('#3fa9dc', ['#5cc3ee', '#2f8fc2', '#7fd3f5'], 900, 256, 60);
  const waterM = mat(0xffffff, { map: waterTex, roughness: 0.15, metalness: 0.15 });
  const water = new THREE.Mesh(new THREE.CircleGeometry(600, 64), waterM); water.rotation.x = -Math.PI / 2; water.position.y = -0.8; water.receiveShadow = true; scene.add(water);
  const sandM = mat(0xffffff, { map: noiseTex('#ecd49a', ['#d9bd7c', '#f6e3b3', '#c9a964'], 3000, 256, 50) });
  const sand = sh(new THREE.Mesh(new THREE.CylinderGeometry(ISLAND_R + 7, ISLAND_R + 11, 1.2, 96), sandM), false); sand.position.y = -0.62; scene.add(sand);
  const grassM = mat(0xffffff, { map: noiseTex('#68b545', ['#5aa83a', '#79c455', '#4e9a32', '#86cf5f', '#62ad40'], 9000, 256, 70, true) });
  const grass = sh(new THREE.Mesh(new THREE.CylinderGeometry(ISLAND_R, ISLAND_R + 1.5, 1, 96), grassM), false); grass.position.y = -0.5; scene.add(grass);

  const pavM = mat(0xffffff, { map: pavingTex('#d8d2c4', '#b9b2a2', 30) });
  const flat = (geo, m, y) => { const me = new THREE.Mesh(geo, m); me.rotation.x = -Math.PI / 2; me.position.y = y; me.receiveShadow = true; scene.add(me); return me; };
  flat(new THREE.CircleGeometry(11, 48), pavM, 0.02);
  flat(new THREE.RingGeometry(RING_R - 2.8, RING_R + 0.6, 120), pavM, 0.02);
  // Markazdan bekatlarga yo'lakchalar
  STATIONS.forEach((s, i) => {
    const a = (i + 0.5) / STATIONS.length * Math.PI * 2;
    const gp = new THREE.Group(); gp.rotation.y = a; gp.position.set(Math.sin(a) * 17, 0, Math.cos(a) * 17); scene.add(gp);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 12), pavM); m.rotation.x = -Math.PI / 2; m.position.y = 0.021; m.receiveShadow = true; gp.add(m);
  });

  // ----- Yo'llar -----
  const asphaltM = mat(0xffffff, { map: noiseTex('#4b4e54', ['#3e4146', '#5a5d63', '#44474c'], 4000, 256, 25), roughness: 0.95 });
  const sideM = mat(0xffffff, { map: pavingTex('#c9c9c9', '#a9a9a9', 40) });
  flat(new THREE.RingGeometry(ROAD_R - ROAD_HW, ROAD_R + ROAD_HW, 160), asphaltM, 0.03);
  flat(new THREE.RingGeometry(ROAD_R + ROAD_HW, ROAD_R + ROAD_HW + WALK_W, 160), sideM, 0.08);
  flat(new THREE.RingGeometry(ROAD_R - ROAD_HW - WALK_W, ROAD_R - ROAD_HW, 160), sideM, 0.08);
  const dashM = mat(0xffffff, { roughness: 0.6 });
  const dashes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.02, 2), dashM, 400);
  let di = 0;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3(1, 1, 1), yAx = new THREE.Vector3(0, 1, 0);
  for (let k = 0; k < 160; k++) {
    const a = k / 160 * Math.PI * 2;
    if (RADIAL.some(ra => Math.abs(angDiff(a, ra)) * ROAD_R < ROAD_HW + 1)) continue;
    q.setFromAxisAngle(yAx, a + Math.PI / 2); v1.set(Math.sin(a) * ROAD_R, 0.05, Math.cos(a) * ROAD_R);
    m4.compose(v1, q, v2); dashes.setMatrixAt(di++, m4);
  }
  RADIAL.forEach(a => {
    const len = RADIAL_TO - RADIAL_FROM, mid = (RADIAL_TO + RADIAL_FROM) / 2;
    const gp = new THREE.Group(); gp.rotation.y = a; gp.position.set(Math.sin(a) * mid, 0, Math.cos(a) * mid); scene.add(gp);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HW * 2, len), asphaltM); road.rotation.x = -Math.PI / 2; road.position.y = 0.035; road.receiveShadow = true; gp.add(road);
    for (const s of [-1, 1]) { const sw = new THREE.Mesh(new THREE.PlaneGeometry(WALK_W, len), sideM); sw.rotation.x = -Math.PI / 2; sw.position.set(s * (ROAD_HW + WALK_W / 2), 0.075, 0); sw.receiveShadow = true; gp.add(sw); }
    for (let r = RADIAL_FROM + 2; r < RADIAL_TO; r += 4) {
      if (Math.abs(r - ROAD_R) < ROAD_HW + 1.5) continue;
      q.setFromAxisAngle(yAx, a); v1.set(Math.sin(a) * r, 0.05, Math.cos(a) * r); m4.compose(v1, q, v2); dashes.setMatrixAt(di++, m4);
    }
    // piyodalar o'tish joyi
    for (let k = -3; k <= 3; k++) {
      const r = ROAD_R + ROAD_HW + WALK_W + 1.6;
      const z = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 2.6), dashM); z.rotation.x = -Math.PI / 2; z.rotation.z = Math.PI / 2;
      const gp2 = new THREE.Group(); gp2.rotation.y = a; gp2.position.set(Math.sin(a) * r, 0.05, Math.cos(a) * r); z.position.x = k * 0.95; gp2.add(z); scene.add(gp2);
    }
  });
  dashes.count = di; scene.add(dashes);

  // ----- Favvora va maydon -----
  const stoneM = mat(0xe3ded3, { roughness: 0.6 });
  const waterF = mat(0x5cc8f0, { roughness: 0.05, metalness: 0.2, emissive: 0x2aa9e0, emissiveIntensity: 0.12 });
  const addM = (geo, m, x, y, z, cast = true) => { const me = sh(new THREE.Mesh(geo, m), cast); me.position.set(x, y, z); scene.add(me); return me; };
  addM(new THREE.CylinderGeometry(4.2, 4.5, 0.8, 40), stoneM, 0, 0.4, 0);
  addM(new THREE.CylinderGeometry(3.85, 3.85, 0.1, 40), waterF, 0, 0.76, 0, false);
  addM(new THREE.CylinderGeometry(0.35, 0.5, 2.2, 14), stoneM, 0, 1.6, 0);
  addM(new THREE.CylinderGeometry(1.6, 0.6, 0.4, 24), stoneM, 0, 2.6, 0);
  addM(new THREE.CylinderGeometry(1.45, 1.45, 0.06, 24), waterF, 0, 2.8, 0, false);
  addM(new THREE.CylinderGeometry(0.2, 0.3, 1, 10), stoneM, 0, 3.2, 0);
  addM(new THREE.SphereGeometry(0.35, 14, 14), stoneM, 0, 3.8, 0);
  const drops = [];
  const dropM = mat(0xaeeaff, { emissive: 0x58c7ff, emissiveIntensity: 0.4, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 24; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), dropM); d.userData = { a: i / 24 * Math.PI * 2, p: Math.random() }; scene.add(d); drops.push(d); }
  statics.push({ x: 0, z: 0, r: 4.4 });
  footprints.push({ x: 0, z: 0, r: 4.4, col: '#7fd3f5' });

  // Skameykalar
  const woodM = mat(0x9c6b3e), ironM = mat(0x2b2d42, { metalness: 0.6, roughness: 0.4 });
  function bench(x, z, rot) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
    for (let i = 0; i < 3; i++) { const p = sh(new THREE.Mesh(new THREE.BoxGeometry(2, 0.06, 0.16), woodM)); p.position.set(0, 0.5, -0.2 + i * 0.2); g.add(p); }
    for (let i = 0; i < 2; i++) { const p = sh(new THREE.Mesh(new THREE.BoxGeometry(2, 0.16, 0.06), woodM)); p.position.set(0, 0.75 + i * 0.22, -0.32); p.rotation.x = -0.15; g.add(p); }
    for (const s of [-1, 1]) { const l = sh(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.6), ironM)); l.position.set(s * 0.85, 0.25, -0.05); g.add(l); }
    statics.push(boxCollider(x, z, 2, 0.7, rot));
  }
  for (let i = 0; i < 6; i++) { const a = (i + 0.25) / 6 * Math.PI * 2; bench(Math.sin(a) * 8.8, Math.cos(a) * 8.8, a + Math.PI); }

  // ----- Dars binolari -----
  const stationObjs = STATIONS.map((s, i) => {
    const a = i / STATIONS.length * Math.PI * 2;
    const bx = Math.sin(a) * BUILD_R, bz = Math.cos(a) * BUILD_R;
    const { g, top, coll } = stationBuilding(s);
    g.position.set(bx, 0, bz); g.rotation.y = a + Math.PI; scene.add(g);
    if (coll.box) statics.push(boxCollider(bx, bz, coll.box[0], coll.box[1], a + Math.PI));
    else statics.push({ x: bx, z: bz, r: coll.r });
    footprints.push({ x: bx, z: bz, r: 4.6, col: '#' + new THREE.Color(s.color).getHexString() });
    const label = makeLabel(s.emoji + ' ' + s.id, '#' + new THREE.Color(s.color).getHexString());
    label.position.set(bx, top + 1.8, bz); label.scale.multiplyScalar(1.25); scene.add(label);
    const rx = Math.sin(a) * RING_R, rz = Math.cos(a) * RING_R;
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.1, 2.6, 48), new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(rx, 0.05, rz); scene.add(ring);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(2.1, 48), new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.2 }));
    disc.rotation.x = -Math.PI / 2; disc.position.set(rx, 0.045, rz); scene.add(disc);
    const icon = makeEmojiSprite(s.emoji, 1.2); icon.position.set(rx, 3.2, rz); scene.add(icon);
    return { ...s, a, label, ring, icon, pos: new THREE.Vector2(rx, rz) };
  });

  // ----- Shaharcha -----
  const SHOP_SIGNS = ['🍞', '🍦', '📚', '🧸', '🍎', '💐', '🥤', '🎨', '🍕', '⚽'];
  function placeRow(r, facingIn, types) {
    let a = rand() * 0.05;
    while (a < Math.PI * 2 - 0.04) {
      const t = rpick(types);
      const w = t === 'apt' ? 12 + rand() * 5 : t === 'house' ? 8 + rand() * 2 : t === 'shop' ? 10 + rand() * 3 : 16 + rand() * 6;
      const d = t === 'apt' ? 9 + rand() * 2 : t === 'house' ? 7 + rand() : 8;
      const da = (w + 5) / r, ac = a + da / 2;
      if (RADIAL.some(ra => Math.abs(angDiff(ac, ra)) * r < w / 2 + ROAD_HW + WALK_W + 3)) { a += 0.025; continue; }
      a += da;
      if (t === 'park') continue;
      const x = Math.sin(ac) * r, z = Math.cos(ac) * r, rot = facingIn ? ac + Math.PI : ac;
      let b;
      if (t === 'apt') b = apartment(w, d, 3 + Math.floor(rand() * 6), rpick(WALLS));
      else if (t === 'house') b = house(w, d, 1 + Math.floor(rand() * 2), rpick(WALLS), rpick(ROOFS));
      else b = shopBuilding(w, d, rpick(WALLS), rpick([0xe63946, 0x2a9d8f, 0x3a86ff, 0xf4a261, 0x9b5de5]), rpick(SHOP_SIGNS));
      b.g.position.set(x, 0, z); b.g.rotation.y = rot; scene.add(b.g);
      statics.push(boxCollider(x, z, w, d, rot));
      footprints.push({ x, z, w, d, rot, col: t === 'apt' ? '#b9b2a8' : t === 'house' ? '#c98b6b' : '#e3a5b8' });
    }
  }
  placeRow(51.5, false, ['house', 'shop', 'park', 'house', 'shop']);
  placeRow(78, true, ['apt', 'apt', 'shop', 'park', 'apt']);
  placeRow(100, true, ['house', 'house', 'park', 'apt', 'house']);

  // O'yin maydonchasi (bog'da)
  (function playground() {
    const a = Math.PI / 2, r = 90;
    const cx = Math.sin(a) * r, cz = Math.cos(a) * r;
    const g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = a + Math.PI; scene.add(g);
    const soft = new THREE.Mesh(new THREE.CircleGeometry(9, 40), mat(0xe76f51, { roughness: 1 })); soft.rotation.x = -Math.PI / 2; soft.position.y = 0.03; soft.receiveShadow = true; g.add(soft);
    const tower = sh(new THREE.Mesh(new THREE.BoxGeometry(2, 2.4, 2), mat(0x3a86ff))); tower.position.set(-3, 1.2, 0); g.add(tower);
    const roofP = sh(new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.4, 4), mat(0xffbe0b))); roofP.position.set(-3, 3.1, 0); roofP.rotation.y = Math.PI / 4; g.add(roofP);
    const slide = sh(new THREE.Mesh(new THREE.BoxGeometry(1, 0.12, 4.2), mat(0xff006e, { roughness: 0.3 }))); slide.position.set(-3, 1.25, 2.9); slide.rotation.x = 0.55; g.add(slide);
    const frameM = mat(0xffbe0b, { metalness: 0.4 });
    for (const s of [-1, 1]) { const leg = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2), frameM)); leg.position.set(3 + s * 1.8, 1.6, 0); g.add(leg); }
    const bar = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.8), frameM)); bar.rotation.z = Math.PI / 2; bar.position.set(3, 3.2, 0); g.add(bar);
    const swings = [];
    for (const s of [-0.8, 0.8]) {
      const piv = new THREE.Group(); piv.position.set(3 + s, 3.2, 0); g.add(piv);
      for (const k of [-0.25, 0.25]) { const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.4), ironM); ch.position.set(k, -1.2, 0); piv.add(ch); }
      const seat = sh(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.4), mat(0x8338ec))); seat.position.y = -2.4; piv.add(seat);
      swings.push(piv);
    }
    const sandbox = sh(new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 3), mat(0xf4d58d))); sandbox.position.set(0, 0.15, -4); g.add(sandbox);
    statics.push({ x: cx + Math.sin(a + Math.PI) * 0 - Math.cos(a) * 3 * 0, z: cz, r: 0.1 });
    const wpt = (lx, lz) => { const c = Math.cos(a + Math.PI), s = Math.sin(a + Math.PI); return [cx + lx * c + lz * s, cz - lx * s + lz * c]; };
    const [tx, tz] = wpt(-3, 0); statics.push({ x: tx, z: tz, r: 1.5 });
    const [sx, sz] = wpt(3, 0); statics.push(boxCollider(sx, sz, 4, 0.4, a + Math.PI));
    footprints.push({ x: cx, z: cz, r: 9, col: '#e76f51' });
    playgroundSwings = swings;
  })();
  var playgroundSwings;

  // Hovuz
  const pond = { x: Math.sin(-Math.PI / 2) * 92, z: 0 };
  flat(new THREE.CircleGeometry(7, 40), mat(0x4fb3e0, { roughness: 0.1, metalness: 0.2 }), 0.06).position.set(pond.x, 0.06, pond.z);
  flat(new THREE.RingGeometry(7, 7.8, 40), stoneM, 0.07).position.set(pond.x, 0.07, pond.z);
  statics.push({ x: pond.x, z: pond.z, r: 7.4 });
  footprints.push({ x: pond.x, z: pond.z, r: 7, col: '#4fb3e0' });

  // ----- Chiroqlar -----
  const lampHeadM = mat(0xfff3c4, { emissive: 0xffd98a, emissiveIntensity: 0.05 });
  const lampPos = [];
  for (let k = 0; k < 40; k++) {
    const a = (k + 0.5) / 40 * Math.PI * 2;
    if (RADIAL.some(ra => Math.abs(angDiff(a, ra)) * ROAD_R < ROAD_HW + 4)) continue;
    const r = k % 2 ? ROAD_R + ROAD_HW + 0.6 : ROAD_R - ROAD_HW - 0.6;
    lampPos.push([Math.sin(a) * r, Math.cos(a) * r, a, k % 2 ? 1 : -1]);
  }
  STATIONS.forEach((s, i) => { const a = (i + 0.5) / STATIONS.length * Math.PI * 2; lampPos.push([Math.sin(a) * (RING_R + 1.4), Math.cos(a) * (RING_R + 1.4), a, -1]); });
  const poleI = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.12, 4.6, 8), ironM, lampPos.length);
  const headI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.32, 12, 10), lampHeadM, lampPos.length);
  poleI.castShadow = true;
  lampPos.forEach(([x, z], i) => {
    m4.makeTranslation(x, 2.3, z); poleI.setMatrixAt(i, m4);
    m4.makeTranslation(x, 4.7, z); headI.setMatrixAt(i, m4);
    statics.push({ x, z, r: 0.3 });
  });
  scene.add(poleI, headI);

  // ----- Daraxtlar (instanced) -----
  const trunkG = new THREE.CylinderGeometry(0.16, 0.26, 2.2, 7); trunkG.translate(0, 1.1, 0);
  const roundG = new THREE.IcosahedronGeometry(1.6, 1);
  const pineG = new THREE.ConeGeometry(1.5, 4.4, 9);
  const bushG = new THREE.IcosahedronGeometry(0.9, 1);
  const leafM = mat(0xffffff, { roughness: 0.9, flatShading: true });
  const MAXT = 420;
  const trunkI = new THREE.InstancedMesh(trunkG, mat(0x7a5232), MAXT);
  const roundI = new THREE.InstancedMesh(roundG, leafM, MAXT);
  const pineI = new THREE.InstancedMesh(pineG, leafM, MAXT);
  const bushI = new THREE.InstancedMesh(bushG, leafM, 300);
  [trunkI, roundI, pineI, bushI].forEach(m => { m.castShadow = true; m.receiveShadow = true; });
  const trees = [];
  const leafCols = ['#3f9e3f', '#4caf50', '#2e7d32', '#66bb6a', '#7cb342', '#558b2f', '#8bc34a'].map(c => new THREE.Color(c));
  const autumn = ['#e9a03b', '#d9622b', '#f2c14e'].map(c => new THREE.Color(c));
  let nT = 0, nR = 0, nP = 0, nB = 0;
  function freeSpot(x, z, pad) {
    const r = Math.hypot(x, z);
    if (r < 13 || r > ISLAND_R - 3) return false;
    if (r > RING_R - 4 && r < RING_R + 2) return false;
    if (onRoad(x, z, WALK_W + 1)) return false;
    if (inside(x, z, pad, statics)) return false;
    for (const s of stationObjs) if (Math.hypot(x - s.pos.x, z - s.pos.y) < 4.5) return false;
    return true;
  }
  let guard = 0;
  while (nT < MAXT - 5 && guard++ < 9000) {
    const a = rand() * Math.PI * 2, r = 13 + Math.sqrt(rand()) * (ISLAND_R - 14);
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (!freeSpot(x, z, 2.2)) continue;
    if (trees.some(t => Math.abs(t.x - x) < 3 && Math.abs(t.z - z) < 3)) continue;
    const s = 0.8 + rand() * 0.7, pine = rand() < 0.35;
    const t = { x, z, s, pine, ti: nT++, fi: pine ? nP++ : nR++, hidden: false };
    t.mT = new THREE.Matrix4().compose(v1.set(x, 0, z), q.setFromAxisAngle(yAx, rand() * 6), v2.set(s, s, s)).clone();
    t.mF = new THREE.Matrix4().compose(v1.set(x, (pine ? 3.4 : 3.0) * s, z), q.setFromAxisAngle(yAx, rand() * 6), new THREE.Vector3(s, s * (pine ? 1 : 0.9), s));
    trunkI.setMatrixAt(t.ti, t.mT);
    (pine ? pineI : roundI).setMatrixAt(t.fi, t.mF);
    (pine ? pineI : roundI).setColorAt(t.fi, rand() < 0.08 && !pine ? rpick(autumn) : rpick(leafCols));
    trees.push(t); statics.push({ x, z, r: 0.45 * s });
  }
  guard = 0;
  while (nB < 290 && guard++ < 6000) {
    const a = rand() * Math.PI * 2, r = 12 + rand() * (ISLAND_R - 13);
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (!freeSpot(x, z, 1)) continue;
    const s = 0.5 + rand() * 0.6;
    m4.compose(v1.set(x, 0.45 * s, z), q.setFromAxisAngle(yAx, rand() * 6), v2.set(s, s * 0.8, s)); bushI.setMatrixAt(nB, m4);
    bushI.setColorAt(nB++, rpick(leafCols));
  }
  v2.set(1, 1, 1);
  trunkI.count = nT; roundI.count = nR; pineI.count = nP; bushI.count = nB;
  scene.add(trunkI, roundI, pineI, bushI);
  const zeroM = new THREE.Matrix4().makeScale(0, 0, 0);

  // Gullar
  const flowerGeo = new THREE.SphereGeometry(0.12, 6, 6);
  [0xff6fb5, 0xffd166, 0xffffff, 0x9b5de5, 0xff5a5f].forEach(fc => {
    const inst = new THREE.InstancedMesh(flowerGeo, mat(fc), 120);
    let n = 0, gg = 0;
    while (n < 120 && gg++ < 2000) {
      const a = rand() * 6.28, r = 12 + rand() * (ISLAND_R - 13), x = Math.sin(a) * r, z = Math.cos(a) * r;
      if (!freeSpot(x, z, 0.3)) continue;
      m4.makeTranslation(x, 0.12, z); inst.setMatrixAt(n++, m4);
    }
    inst.count = n; scene.add(inst);
  });
  // Plyaj toshlari va qoyalar
  for (let i = 0; i < 18; i++) {
    const a = rand() * 6.28, r = ISLAND_R - 4 + rand() * 6, x = Math.sin(a) * r, z = Math.cos(a) * r;
    const sc = 1 + rand() * 2.5;
    const rk = sh(new THREE.Mesh(new THREE.DodecahedronGeometry(sc, 0), mat(0x9a9488, { flatShading: true })));
    rk.position.set(x, sc * 0.3, z); rk.rotation.set(rand(), rand(), rand()); scene.add(rk);
    statics.push({ x, z, r: sc * 0.9 });
  }

  // ----- Bulutlar, yulduzlar, oy -----
  const clouds = [];
  const cloudM = mat(0xffffff, { roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.2, flatShading: true });
  for (let i = 0; i < 26; i++) {
    const c = new THREE.Group();
    for (let k = 0; k < 5; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(3 + rand() * 2.5, 1), cloudM); b.position.set(k * 3.4 - 7, rand() * 1.8, rand() * 2.5); c.add(b); }
    const a = rand() * 6.28, r = 30 + rand() * 200;
    c.position.set(Math.sin(a) * r, 55 + rand() * 25, Math.cos(a) * r);
    c.userData.speed = 0.8 + rand() * 1.2; scene.add(c); clouds.push(c);
  }
  const starGeo = new THREE.BufferGeometry(); const sp = [];
  for (let i = 0; i < 1500; i++) { const th = rand() * 6.28, ph = Math.acos(rand() * 0.95), R = 450; sp.push(R * Math.sin(ph) * Math.cos(th), R * Math.cos(ph), R * Math.sin(ph) * Math.sin(th)); }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false }));
  stars.visible = false; scene.add(stars);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(14, 24, 24), new THREE.MeshBasicMaterial({ color: 0xfff6d5, fog: false }));
  moon.position.set(-200, 180, -260); moon.visible = false; scene.add(moon);

  // ----- Mashinalar -----
  const CAR_COLS = [0xe63946, 0x1d3557, 0xf1faee, 0x2a9d8f, 0xffb703, 0x222222, 0x8338ec, 0xadb5bd];
  const cars = [];
  for (let i = 0; i < 9; i++) {
    const g = car(CAR_COLS[i % CAR_COLS.length]); scene.add(g);
    const dir = i % 2 ? 1 : -1;
    cars.push({ g, th: i / 9 * Math.PI * 2, dir, lane: ROAD_R + dir * 1.8, v: 0, max: 7 + rand() * 4 });
  }

  // ----- Tangalar -----
  const coinGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.08, 24);
  const coinM = mat(0xffc93c, { metalness: 0.75, roughness: 0.25, emissive: 0xffa500, emissiveIntensity: 0.25 });
  function walkable(x, z, pad = 0.8) {
    const r = Math.hypot(x, z);
    if (r > ISLAND_R - 2 || r < 4.8) return false;
    return !inside(x, z, pad, statics);
  }
  function randomSpot(cx = 0, cz = 0, R = ISLAND_R - 4, avoidRoad = true) {
    for (let k = 0; k < 300; k++) {
      const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * R;
      const x = cx + Math.sin(a) * r, z = cz + Math.cos(a) * r;
      if (!walkable(x, z, 1.2)) continue;
      if (avoidRoad && onRoad(x, z, 0.5)) continue;
      return [x, z];
    }
    return [cx + 6, cz + 6];
  }
  const coins = [];
  for (let i = 0; i < 50; i++) {
    const c = sh(new THREE.Mesh(coinGeo, coinM), true, false); c.rotation.x = Math.PI / 2;
    const [x, z] = randomSpot(); c.position.set(x, 0.9, z); c.userData = { respawn: 0 }; scene.add(c); coins.push(c);
  }

  // ----- Yuradigan odamlar -----
  const npcs = [];
  function spawnNPCs(n) {
    npcs.forEach(p => scene.remove(p.npc.group)); npcs.length = 0;
    for (let i = 0; i < n; i++) {
      const npc = makeNPC(); const [x, z] = randomSpot(0, 0, ISLAND_R - 6);
      npc.group.position.set(x, 0, z); scene.add(npc.group);
      npcs.push({ npc, x, z, ry: Math.random() * 6, tx: x, tz: z, sp: 1.1 + Math.random() * 0.6, idle: Math.random() * 3, stuck: 0, waveCd: 0 });
    }
  }

  // ----- O'yinchi va uy hayvoni -----
  let player = makeCharacter(opts.outfit);
  scene.add(player.group);
  const pos = new THREE.Vector3(0, 0, 13);
  let vy = 0, onGround = true, facing = 0, speedNow = 0;
  let pet = null, petKind = null;
  const petPos = new THREE.Vector3(1, 0, 12);
  let petRy = 0, petSpeed = 0;
  function setPet(kind) {
    if (kind === petKind) return;
    if (pet) scene.remove(pet.group);
    pet = null; petKind = kind;
    if (kind) { pet = makePet(kind); petPos.set(pos.x + 1, 0, pos.z - 1); pet.group.position.copy(petPos); scene.add(pet.group); }
  }

  // ----- Kamera -----
  let camYaw = 0, camPitch = 0.3, camDist = 7.5;
  const camPos = new THREE.Vector3(0, 6, 22);

  // ----- Boshqaruv -----
  const keys = new Set();
  const joy = { x: 0, y: 0, id: null };
  let jumpReq = false;
  const api = { enabled: true };
  const typing = e => /INPUT|TEXTAREA|SELECT/.test(e.target && e.target.tagName);
  addEventListener('keydown', e => { if (typing(e)) return; keys.add(e.code); if (e.code === 'Space') { jumpReq = true; e.preventDefault(); } });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  let drag = null;
  canvasEl.addEventListener('pointerdown', e => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; canvasEl.setPointerCapture(e.pointerId); });
  canvasEl.addEventListener('pointermove', e => {
    if (!drag || drag.id !== e.pointerId) return;
    camYaw -= (e.clientX - drag.x) * 0.006;
    camPitch = Math.min(1.15, Math.max(0.05, camPitch + (e.clientY - drag.y) * 0.004));
    drag.x = e.clientX; drag.y = e.clientY;
  });
  const endDrag = e => { if (drag && drag.id === e.pointerId) drag = null; };
  canvasEl.addEventListener('pointerup', endDrag); canvasEl.addEventListener('pointercancel', endDrag);
  canvasEl.addEventListener('wheel', e => { camDist = Math.min(18, Math.max(3.5, camDist + e.deltaY * 0.01)); e.preventDefault(); }, { passive: false });
  const jEl = opts.joystick, knob = jEl && jEl.querySelector('.knob');
  if (jEl) {
    const setJoy = e => {
      const r = jEl.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const max = r.width / 2 - 10, l = Math.hypot(dx, dy);
      if (l > max) { dx *= max / l; dy *= max / l; }
      joy.x = dx / max; joy.y = dy / max; knob.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    jEl.addEventListener('pointerdown', e => { joy.id = e.pointerId; jEl.setPointerCapture(e.pointerId); setJoy(e); e.preventDefault(); });
    jEl.addEventListener('pointermove', e => { if (joy.id === e.pointerId) setJoy(e); });
    const jEnd = e => { if (joy.id === e.pointerId) { joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; } };
    jEl.addEventListener('pointerup', jEnd); jEl.addEventListener('pointercancel', jEnd);
  }
  if (opts.jumpBtn) opts.jumpBtn.addEventListener('pointerdown', e => { jumpReq = true; e.preventDefault(); });

  // ----- Boshqa o'yinchilar -----
  const remotes = new Map();
  function makeNameTag(name) { const l = makeLabel(name, '#4f8cff', 'rgba(255,255,255,0.9)', 384, 96); l.scale.set(2, 0.5, 1); l.position.y = 2.15; return l; }
  function setRemote(id, d) {
    let r = remotes.get(id);
    const ok = JSON.stringify(d.outfit);
    if (!r) {
      const ch = makeCharacter(d.outfit);
      const tag = makeNameTag(d.name || '?'); ch.group.add(tag);
      ch.group.position.set(d.x, d.y || 0, d.z); scene.add(ch.group);
      r = { ch, tag, name: d.name, ok, t: { x: d.x, y: d.y || 0, z: d.z, ry: d.ry || 0 }, moving: 0, air: false };
      remotes.set(id, r);
    }
    if (ok !== r.ok) { r.ch.setOutfit(d.outfit); r.ok = ok; }
    if (d.name !== r.name) { r.tag.userData.draw(d.name); r.name = d.name; }
    r.t = { x: d.x, y: d.y || 0, z: d.z, ry: d.ry || 0 };
    r.moving = d.m || 0; r.air = !!d.air; r.seen = performance.now();
  }
  function removeRemote(id) { const r = remotes.get(id); if (r) { scene.remove(r.ch.group); remotes.delete(id); } }

  const bubbles = [];
  function bubbleOn(target, e, y = 2.5) {
    const s = makeEmojiSprite(e, 0.9); s.position.y = y; target.add(s); bubbles.push({ s, target, t: 0, y });
  }
  function showEmote(id, e) {
    const target = id === 'me' ? player.group : remotes.get(id)?.ch.group;
    if (!target) return;
    bubbleOn(target, e);
    if (id === 'me' && e === '👋') player.wave();
  }

  // ----- Olmos ovi -----
  let hunt = null;
  const gemGeo = new THREE.OctahedronGeometry(0.45);
  function startHunt(count, seconds, onTick, onEnd) {
    stopHunt(true);
    const gems = [];
    for (let i = 0; i < count; i++) {
      const g = sh(new THREE.Mesh(gemGeo, mat([0x9b5de5, 0x2ec4b6, 0xff6fb5][i % 3], { emissive: [0x6a2bd0, 0x14a090, 0xe0408f][i % 3], emissiveIntensity: 0.7, roughness: 0.2, metalness: 0.3 })));
      const [x, z] = randomSpot(pos.x, pos.z, 38); g.position.set(x, 1.1, z); scene.add(g); gems.push(g);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 12, 6), new THREE.MeshBasicMaterial({ color: 0xd9b8ff, transparent: true, opacity: 0.35 }));
      beam.position.y = 6; g.add(beam);
    }
    hunt = { gems, left: seconds, got: 0, count, onTick, onEnd, acc: 0 };
    onTick(seconds, 0);
  }
  function stopHunt(silent) {
    if (!hunt) return;
    hunt.gems.forEach(g => scene.remove(g));
    const h = hunt; hunt = null;
    if (!silent) h.onEnd(h.got);
  }

  // ----- Kun / tun, sifat -----
  function setLabels(fn) { stationObjs.forEach(s => s.label.userData.draw(s.emoji + ' ' + fn(s.id))); }
  let night = false;
  function setNight(n) {
    night = n;
    const sky = n ? 0x121838 : 0xa8dcff;
    scene.background = new THREE.Color(sky);
    scene.fog = new THREE.Fog(sky, n ? 60 : 90, n ? 260 : 340);
    hemi.intensity = n ? 0.45 : 1.1; hemi.color.set(n ? 0x8fa3ff : 0xd6ecff);
    sun.intensity = n ? 0.5 : 2.2; sun.color.set(n ? 0xaab8ff : 0xfff4e0);
    stars.visible = moon.visible = n;
    grassM.color.set(n ? 0x7d8ca6 : 0xffffff);
    sandM.color.set(n ? 0x8a8fa8 : 0xffffff);
    waterM.color.set(n ? 0x4a6fa8 : 0xffffff);
    lampHeadM.emissiveIntensity = n ? 2.6 : 0.05;
    nightMats.forEach(m => { m.emissiveIntensity = n ? 1 : 0; });
    cloudM.color.set(n ? 0x5b6385 : 0xffffff); cloudM.emissiveIntensity = n ? 0.02 : 0.2;
    renderer.toneMappingExposure = n ? 1.2 : 1.05;
  }
  let quality = 'high';
  function setQuality(qv) {
    quality = qv;
    renderer.shadowMap.enabled = qv === 'high';
    renderer.setPixelRatio(qv === 'high' ? Math.min(devicePixelRatio, 2) : 1);
    scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { m.needsUpdate = true; }); });
    spawnNPCs(qv === 'high' ? 34 : 14);
    resize();
  }
  function resize() {
    const w = canvasEl.clientWidth || innerWidth, h = canvasEl.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w < h ? 68 : 55; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  // ----- Kichik xarita -----
  let mini = null;
  const MAP_PX = 512;
  const mapBg = canvas(MAP_PX);
  (function drawMapBg() {
    const g = mapBg.getContext('2d'), S = MAP_PX / 2 / (ISLAND_R + 12), C = MAP_PX / 2;
    const P = (x, z) => [C + x * S, C + z * S];
    g.fillStyle = '#4fb3e0'; g.beginPath(); g.arc(C, C, C, 0, 7); g.fill();
    g.fillStyle = '#ecd49a'; g.beginPath(); g.arc(C, C, (ISLAND_R + 8) * S, 0, 7); g.fill();
    g.fillStyle = '#7cc15a'; g.beginPath(); g.arc(C, C, ISLAND_R * S, 0, 7); g.fill();
    g.strokeStyle = '#d8d2c4'; g.lineWidth = 3.4 * S; g.beginPath(); g.arc(C, C, (RING_R - 1.1) * S, 0, 7); g.stroke();
    g.fillStyle = '#d8d2c4'; g.beginPath(); g.arc(C, C, 11 * S, 0, 7); g.fill();
    g.strokeStyle = '#55585e'; g.lineWidth = ROAD_HW * 2 * S; g.beginPath(); g.arc(C, C, ROAD_R * S, 0, 7); g.stroke();
    RADIAL.forEach(a => { g.beginPath(); g.moveTo(...P(Math.sin(a) * RADIAL_FROM, Math.cos(a) * RADIAL_FROM)); g.lineTo(...P(Math.sin(a) * RADIAL_TO, Math.cos(a) * RADIAL_TO)); g.stroke(); });
    for (const f of footprints) {
      g.fillStyle = f.col;
      if (f.w) { g.save(); g.translate(...P(f.x, f.z)); g.rotate(-f.rot); g.fillRect(-f.w / 2 * S, -f.d / 2 * S, f.w * S, f.d * S); g.restore(); }
      else { g.beginPath(); g.arc(...P(f.x, f.z), f.r * S, 0, 7); g.fill(); }
    }
    g.fillStyle = 'rgba(46,125,50,0.55)';
    for (const t of trees) { g.beginPath(); g.arc(...P(t.x, t.z), 1.4 * S * t.s, 0, 7); g.fill(); }
  })();
  function attachMinimap(cv, onPick) {
    mini = { cv, g: cv.getContext('2d'), frame: 0 };
    cv.addEventListener('click', e => {
      const r = cv.getBoundingClientRect();
      const S = r.width / 2 / (ISLAND_R + 12);
      const x = (e.clientX - r.left - r.width / 2) / S, z = (e.clientY - r.top - r.height / 2) / S;
      let best = null, bd = 16;
      for (const s of stationObjs) { const d = Math.hypot(x - s.pos.x, z - s.pos.y); if (d < bd) { bd = d; best = s; } }
      if (best) { teleport(best.pos.x * 0.86, best.pos.y * 0.86, Math.atan2(best.pos.x, best.pos.y)); onPick && onPick(best.id); }
      else if (Math.hypot(x, z) < 14) teleport(0, 13, 0);
      else if (walkable(x, z, 1)) teleport(x, z, facing);
    });
  }
  function drawMinimap() {
    const { cv, g } = mini;
    const W = cv.width, S = W / 2 / (ISLAND_R + 12), C = W / 2;
    g.clearRect(0, 0, W, W);
    g.save(); g.beginPath(); g.arc(C, C, C, 0, 7); g.clip();
    g.drawImage(mapBg, 0, 0, W, W);
    g.font = `${Math.round(W * 0.075)}px system-ui, "Apple Color Emoji"`; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const s of stationObjs) { g.fillText(s.emoji, C + s.pos.x * S * 1.25, C + s.pos.y * S * 1.25); }
    g.fillStyle = '#4f8cff';
    for (const r of remotes.values()) { g.beginPath(); g.arc(C + r.ch.group.position.x * S, C + r.ch.group.position.z * S, W * 0.022, 0, 7); g.fill(); }
    if (hunt) { g.fillStyle = '#d06bff'; for (const gm of hunt.gems) if (gm.visible) { g.beginPath(); g.arc(C + gm.position.x * S, C + gm.position.z * S, W * 0.015, 0, 7); g.fill(); } }
    g.restore();
    g.save(); g.translate(C + pos.x * S, C + pos.z * S); g.rotate(-facing + Math.PI);
    g.fillStyle = '#ff3b3b'; g.strokeStyle = '#fff'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -W * 0.045); g.lineTo(W * 0.03, W * 0.03); g.lineTo(-W * 0.03, W * 0.03); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
  function teleport(x, z, ry) {
    pos.set(x, 0, z); facing = ry; camYaw = ry + Math.PI; vy = 0;
    camPos.set(x + Math.sin(camYaw) * camDist, 4, z + Math.cos(camYaw) * camDist);
    petPos.set(x + 1, 0, z - 1);
  }

  // ----- Asosiy sikl -----
  let nearId = null;
  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();
  const pp = { x: 0, z: 0 };
  const dynCars = cars.map(c => ({ x: 0, z: 0, r: 2.2, car: c }));

  function step() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;
    const now = performance.now();

    // O'yinchi harakati
    let ix = 0, iz = 0;
    if (api.enabled) {
      if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) iz -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) iz += 1;
      ix += joy.x; iz += joy.y;
    } else jumpReq = false;
    let il = Math.hypot(ix, iz);
    if (il > 1) { ix /= il; iz /= il; il = 1; }
    const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
    const mx = rx * ix + fx * -iz, mz = rz * ix + fz * -iz;
    const run = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 1.6 : 1;
    if (il > 0.05) {
      pos.x += mx * 6.2 * run * dt; pos.z += mz * 6.2 * run * dt;
      let d = Math.atan2(mx, mz) - facing; d = Math.atan2(Math.sin(d), Math.cos(d));
      facing += d * Math.min(1, dt * 12);
    }
    speedNow += (Math.min(1.6, il * run) - speedNow) * Math.min(1, dt * 10);
    pp.x = pos.x; pp.z = pos.z;
    if (pos.y < 2.5) { resolve(pp, 0.35, statics); resolve(pp, 0.35, dynCars); }
    pos.x = pp.x; pos.z = pp.z;
    const pr = Math.hypot(pos.x, pos.z);
    if (pr > ISLAND_R + 6) { pos.x *= (ISLAND_R + 6) / pr; pos.z *= (ISLAND_R + 6) / pr; }
    if (jumpReq && onGround) { vy = 7; onGround = false; opts.onJump && opts.onJump(); }
    jumpReq = false;
    vy -= 20 * dt; pos.y += vy * dt;
    if (pos.y <= 0) { pos.y = 0; vy = 0; onGround = true; }
    player.group.position.copy(pos);
    player.group.rotation.y = facing;
    player.animate(dt, speedNow, !onGround, time);

    // Uy hayvoni
    if (pet) {
      const tx = pos.x - Math.sin(facing) * 1.2 + Math.cos(facing) * 0.7, tz = pos.z - Math.cos(facing) * 1.2 - Math.sin(facing) * 0.7;
      const dx = tx - petPos.x, dz = tz - petPos.z, dd = Math.hypot(dx, dz);
      if (dd > 12) { petPos.set(tx, 0, tz); }
      const want = dd > 0.4 ? Math.min(9.5, dd * 3) : 0;
      petSpeed += (want - petSpeed) * Math.min(1, dt * 6);
      if (dd > 0.05) { petPos.x += dx / dd * petSpeed * dt; petPos.z += dz / dd * petSpeed * dt; let a = Math.atan2(dx, dz) - petRy; a = Math.atan2(Math.sin(a), Math.cos(a)); if (petSpeed > 0.3) petRy += a * Math.min(1, dt * 8); }
      pp.x = petPos.x; pp.z = petPos.z; resolve(pp, 0.25, statics); petPos.x = pp.x; petPos.z = pp.z;
      pet.group.position.set(petPos.x, 0, petPos.z); pet.group.rotation.y = petRy;
      pet.animate(dt, petSpeed / 6, time);
    }

    // Kamera
    if (il > 0.1 && !drag && iz < 0.3) { let dy = (facing + Math.PI) - camYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); camYaw += dy * Math.min(1, dt * 1.3); }
    const blocked = (d, p) => {
      const cx = pos.x + Math.sin(camYaw) * d * Math.cos(p), cz = pos.z + Math.cos(camYaw) * d * Math.cos(p), cy = pos.y + 1.3 + d * Math.sin(p);
      return statics.some(c => (c.box || c.r > 3.5) && cy < 30 && (c.box ? inside(cx, cz, 0.8, [c]) : Math.hypot(cx - c.x, cz - c.z) < c.r + 1.2));
    };
    let cd = camDist, cpch = camPitch;
    while (cpch < 1.2 && blocked(cd, cpch)) cpch += 0.08;
    while (cd > 2.5 && blocked(cd, cpch)) cd -= 0.5;
    tmp.set(pos.x + Math.sin(camYaw) * cd * Math.cos(cpch), pos.y + 1.3 + cd * Math.sin(cpch), pos.z + Math.cos(camYaw) * cd * Math.cos(cpch));
    camPos.lerp(tmp, Math.min(1, dt * 8));
    camera.position.copy(camPos);
    camera.lookAt(pos.x, pos.y + 1.25, pos.z);

    // Quyosh soyasi o'yinchi atrofida
    sun.position.set(pos.x + 30, 60, pos.z + 22); sun.target.position.set(pos.x, 0, pos.z);

    // Kamerani to'sayotgan daraxtlar
    const ax = camera.position.x, az = camera.position.z, bx = pos.x - ax, bz = pos.z - az, bl = bx * bx + bz * bz || 1;
    let tChanged = false;
    for (const tr of trees) {
      const px = tr.x - ax, pz = tr.z - az;
      if (px * px + pz * pz > bl + 30) { if (tr.hidden) { tr.hidden = false; trunkI.setMatrixAt(tr.ti, tr.mT); (tr.pine ? pineI : roundI).setMatrixAt(tr.fi, tr.mF); tChanged = true; } continue; }
      const k = Math.max(0, Math.min(1, (px * bx + pz * bz) / bl));
      const dx = px - bx * k, dz = pz - bz * k;
      const hide = dx * dx + dz * dz < 5 * tr.s && k < 0.93;
      if (hide !== tr.hidden) {
        tr.hidden = hide; tChanged = true;
        trunkI.setMatrixAt(tr.ti, hide ? zeroM : tr.mT);
        (tr.pine ? pineI : roundI).setMatrixAt(tr.fi, hide ? zeroM : tr.mF);
      }
    }
    if (tChanged) { trunkI.instanceMatrix.needsUpdate = true; roundI.instanceMatrix.needsUpdate = true; pineI.instanceMatrix.needsUpdate = true; }

    // Bekatlar
    let near = null;
    for (const s of stationObjs) {
      const k = 1 + Math.sin(time * 3 + s.a) * 0.06;
      s.ring.scale.set(k, k, 1);
      s.icon.position.y = 3.2 + Math.sin(time * 2 + s.a) * 0.2;
      if (Math.hypot(pos.x - s.pos.x, pos.z - s.pos.y) < 2.6) near = s.id;
    }
    if (near !== nearId) { nearId = near; opts.onNear && opts.onNear(near); }

    // Tangalar
    for (const c of coins) {
      if (!c.visible) { if (now > c.userData.respawn) { const [x, z] = randomSpot(); c.position.set(x, 0.9, z); c.visible = true; } continue; }
      if (Math.abs(c.position.x - pos.x) > 70 || Math.abs(c.position.z - pos.z) > 70) continue;
      c.rotation.z += dt * 3;
      c.position.y = 0.9 + Math.sin(time * 3 + c.position.x) * 0.12;
      if (Math.hypot(pos.x - c.position.x, pos.z - c.position.z) < 1 && Math.abs(pos.y + 0.9 - c.position.y) < 1.6) {
        c.visible = false; c.userData.respawn = now + 25000; opts.onCoin && opts.onCoin();
      }
    }

    // Ov
    if (hunt) {
      for (const g of hunt.gems) {
        if (!g.visible) continue;
        g.rotation.y += dt * 2; g.position.y = 1.1 + Math.sin(time * 4 + g.position.z) * 0.2;
        if (Math.hypot(pos.x - g.position.x, pos.z - g.position.z) < 1.2) { g.visible = false; hunt.got++; opts.onGem && opts.onGem(); hunt.onTick(Math.ceil(hunt.left), hunt.got); }
      }
      hunt.acc += dt; hunt.left -= dt;
      if (hunt.acc >= 1) { hunt.acc = 0; hunt.onTick(Math.max(0, Math.ceil(hunt.left)), hunt.got); }
      if (hunt.left <= 0 || hunt.got >= hunt.count) stopHunt(false);
    }

    // Mashinalar
    for (const c of cars) {
      const ahx = Math.sin(c.th + c.dir * 7 / c.lane) * c.lane, ahz = Math.cos(c.th + c.dir * 7 / c.lane) * c.lane;
      let blockedCar = Math.hypot(ahx - pos.x, ahz - pos.z) < 4;
      if (!blockedCar) for (const n of npcs) if (Math.abs(n.x - ahx) < 4 && Math.hypot(n.x - ahx, n.z - ahz) < 3.5) { blockedCar = true; break; }
      if (!blockedCar) for (const o of cars) if (o !== c && o.dir === c.dir) { const d = angDiff(o.th, c.th) * c.dir; if (d > 0 && d * c.lane < 9) { blockedCar = true; break; } }
      c.v += ((blockedCar ? 0 : c.max) - c.v) * Math.min(1, dt * (blockedCar ? 4 : 1));
      c.th += c.dir * c.v / c.lane * dt;
      const x = Math.sin(c.th) * c.lane, z = Math.cos(c.th) * c.lane;
      c.g.position.set(x, 0, z);
      c.g.rotation.y = Math.atan2(Math.cos(c.th) * c.dir, -Math.sin(c.th) * c.dir);
    }
    dynCars.forEach(d => { d.x = d.car.g.position.x; d.z = d.car.g.position.z; });

    // Yuradigan odamlar
    for (const n of npcs) {
      const g = n.npc.group;
      if (n.idle > 0) {
        n.idle -= dt;
        if (n.idle <= 0) { const [x, z] = randomSpot(n.x, n.z, 35); n.tx = x; n.tz = z; n.stuck = 0; n.lastD = 1e9; }
        n.cur = (n.cur || 0) * Math.max(0, 1 - dt * 6);
      } else {
        const dx = n.tx - n.x, dz = n.tz - n.z, d = Math.hypot(dx, dz);
        if (d < 0.6) { n.idle = 1 + Math.random() * 5; }
        else {
          n.cur = Math.min(n.sp, (n.cur || 0) + dt * 3);
          n.x += dx / d * n.cur * dt; n.z += dz / d * n.cur * dt;
          let a = Math.atan2(dx, dz) - n.ry; a = Math.atan2(Math.sin(a), Math.cos(a)); n.ry += a * Math.min(1, dt * 5);
          n.stuck += dt;
          if (n.stuck > 2) { if (d > (n.lastD || 1e9) - 0.8) n.idle = 0.3; n.lastD = d; n.stuck = 0; }
        }
      }
      pp.x = n.x; pp.z = n.z;
      resolve(pp, 0.3, statics); resolve(pp, 0.3, dynCars);
      const pdx = pp.x - pos.x, pdz = pp.z - pos.z, pd = Math.hypot(pdx, pdz);
      if (pd < 0.7 && pd > 1e-4) { pp.x = pos.x + pdx / pd * 0.7; pp.z = pos.z + pdz / pd * 0.7; }
      n.x = pp.x; n.z = pp.z;
      n.waveCd -= dt;
      if (pd < 3.2 && n.waveCd <= 0 && n.idle <= 0.5) {
        n.waveCd = 30 + Math.random() * 20; n.npc.wave(); n.idle = 2; n.ry = Math.atan2(-pdx, -pdz);
        if (Math.random() < 0.6) bubbleOn(g, '👋', 2.2);
      }
      g.position.set(n.x, 0, n.z); g.rotation.y = n.ry;
      const far = Math.abs(n.x - pos.x) > 70 || Math.abs(n.z - pos.z) > 70;
      g.visible = !far;
      if (!far) n.npc.animate(dt, (n.cur || 0) / 3.2, time);
    }

    // Favvora, bulutlar, suv, arg'imchoq
    for (const d of drops) {
      const p = (d.userData.p + time * 0.6) % 1, r = 0.4 + p * 2.6;
      d.position.set(Math.sin(d.userData.a) * r, 4 + Math.sin(p * Math.PI) * 1.4 - p * 3.2, Math.cos(d.userData.a) * r);
    }
    for (const c of clouds) { c.position.x += c.userData.speed * dt; if (c.position.x > 260) c.position.x = -260; }
    waterTex.offset.x = time * 0.004; waterTex.offset.y = time * 0.003;
    if (playgroundSwings) playgroundSwings.forEach((s, i) => { s.rotation.x = Math.sin(time * 1.8 + i * 1.3) * 0.45; });

    // Boshqa o'yinchilar
    for (const [id, r] of remotes) {
      const g = r.ch.group, k = Math.min(1, dt * 10);
      g.position.x += (r.t.x - g.position.x) * k; g.position.y += (r.t.y - g.position.y) * k; g.position.z += (r.t.z - g.position.z) * k;
      let d = r.t.ry - g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); g.rotation.y += d * k;
      r.ch.animate(dt, r.moving, r.air, time);
      if (now - r.seen > 6000) removeRemote(id);
    }
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i]; b.t += dt;
      b.s.position.y = b.y + b.t * 0.4;
      b.s.material.opacity = Math.max(0, 1 - Math.max(0, b.t - 1.8));
      if (b.t > 2.8) { b.target.remove(b.s); bubbles.splice(i, 1); }
    }

    if (mini && (mini.frame++ % 4 === 0)) drawMinimap();
    renderer.render(scene, camera);
    requestAnimationFrame(step);
  }
  spawnNPCs(34);
  requestAnimationFrame(step);

  return Object.assign(api, {
    setOutfit: o => { player.setOutfit(o); setPet(o.pet || null); },
    setLabels, setNight, setQuality, startHunt, stopHunt,
    setRemote, removeRemote, showEmote, attachMinimap, teleport,
    clearRemotes: () => [...remotes.keys()].forEach(removeRemote),
    getPlayerState: () => ({ x: +pos.x.toFixed(2), y: +pos.y.toFixed(2), z: +pos.z.toFixed(2), ry: +facing.toFixed(2), m: +speedNow.toFixed(2), air: !onGround }),
    init: o => setPet(o.pet || null),
  });
}

// Do'kon / kiyim oynasidagi kichik 3D ko'rinish
export function createPreview(cv, outfit) {
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  cam.position.set(0.3, 1.0, 4.3); cam.lookAt(0.3, 0.78, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8899cc, 1.6));
  const dl = new THREE.DirectionalLight(0xffffff, 1.8); dl.position.set(3, 5, 4); scene.add(dl);
  const ch = makeCharacter(outfit); scene.add(ch.group);
  let pet = null, petKind = null;
  const setPet = k => { if (k === petKind) return; if (pet) scene.remove(pet.group); pet = null; petKind = k; if (k) { pet = makePet(k); pet.group.position.set(0.85, 0, 0.35); pet.group.rotation.y = -0.6; scene.add(pet.group); } };
  setPet(outfit.pet || null);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.12, 32), new THREE.MeshStandardMaterial({ color: 0x7ed957 }));
  base.position.y = -0.06; scene.add(base);
  let alive = true, t0 = performance.now(), last = t0;
  function loop(now) {
    if (!alive) return;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (w && h && cv.width !== Math.round(w * renderer.getPixelRatio())) { renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    const dt = (now - last) / 1000; last = now;
    const t = (now - t0) / 1000;
    ch.group.rotation.y = Math.sin(t * 0.6) * 0.8;
    ch.animate(dt, 0, false, t);
    if (pet) pet.animate(dt, 0, t);
    renderer.render(scene, cam);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  return {
    setOutfit: o => { ch.setOutfit(o); setPet(o.pet || null); },
    dispose: () => { alive = false; renderer.dispose(); renderer.forceContextLoss(); },
  };
}
