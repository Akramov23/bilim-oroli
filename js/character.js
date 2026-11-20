// Odamga o'xshash personaj (real proporsiyalar), aksessuarlar va uy hayvonlari
import * as THREE from 'three';
import { ITEMS } from './data.js';

// ---------- Kesh (bir xil geometriya/materialni qayta ishlatamiz) ----------
const geoCache = new Map();
const G = (key, make) => { if (!geoCache.has(key)) geoCache.set(key, make()); return geoCache.get(key); };
const matCache = new Map();
function cachedMat(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o }));
  return matCache.get(key);
}
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });
const cap = (r, l) => G(`cap${r}_${l}`, () => new THREE.CapsuleGeometry(r, l, 4, 12));
const sph = r => G(`s${r}`, () => new THREE.SphereGeometry(r, 18, 14));
const boxG = (w, h, d) => G(`b${w}_${h}_${d}`, () => new THREE.BoxGeometry(w, h, d));
function mesh(geo, mat, x = 0, y = 0, z = 0, cast = true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; return m;
}

// Futbolka naqshlari
const patCache = new Map();
function patternTex(kind, color) {
  const key = kind + color;
  if (patCache.has(key)) return patCache.get(key);
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#ffffff';
  if (kind === 'stripes') { for (let y = 0; y < 128; y += 32) g.fillRect(0, y, 128, 14); }
  else if (kind === 'dots') { for (let y = 8; y < 128; y += 32) for (let x = 8; x < 128; x += 32) { g.beginPath(); g.arc(x + (y % 64 ? 16 : 0), y, 7, 0, 7); g.fill(); } }
  else if (kind === 'star') { g.font = '64px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('★', 64, 70); }
  else if (kind === 'rainbow') { ['#ff5a5f', '#ff8c42', '#ffd166', '#34c759', '#4f8cff', '#9b5de5'].forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * 22, 128, 22); }); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2, 2);
  patCache.set(key, tex);
  return tex;
}

// ---------- Odam ----------
// look: { skin, shirt, pattern, sleeves, pants, skirt, shoes, hair, hairColor, eyes, scale }
export function makeHuman(look, shared = true) {
  const mat = (c, o) => (shared ? cachedMat(c, o) : M(c, o));
  const skin = mat(look.skin, { roughness: 0.55 });
  const shirt = look.pattern ? new THREE.MeshStandardMaterial({ color: '#ffffff', map: patternTex(look.pattern, look.shirt), roughness: 0.8 }) : mat(look.shirt);
  const pants = mat(look.pants);
  const shoes = mat(look.shoes || '#f2f2f2', { roughness: 0.5 });
  const hairM = mat(look.hairColor || '#4a2f1b', { roughness: 0.95 });
  const dark = cachedMat('#1d1d28', { roughness: 0.3 });
  const white = cachedMat('#ffffff', { roughness: 0.3 });

  const root = new THREE.Group();
  root.scale.setScalar(look.scale || 1);

  const hips = new THREE.Group(); hips.position.y = 0.9; root.add(hips);
  const pelvis = mesh(sph(0.14), pants); pelvis.scale.set(1.15, 0.75, 0.82); hips.add(pelvis);
  if (look.skirt) {
    const sk = mesh(G('skirt', () => new THREE.CylinderGeometry(0.15, 0.28, 0.34, 18, 1, true)), pants, 0, -0.13, 0);
    sk.material = sk.material.clone(); sk.material.side = THREE.DoubleSide; hips.add(sk);
  }
  const mkLeg = x => {
    const thigh = new THREE.Group(); thigh.position.set(x, 0, 0); hips.add(thigh);
    thigh.add(mesh(cap(0.068, 0.28), look.skirt ? skin : pants, 0, -0.2, 0));
    const knee = new THREE.Group(); knee.position.y = -0.42; thigh.add(knee);
    knee.add(mesh(cap(0.056, 0.3), look.skirt ? skin : pants, 0, -0.2, 0));
    knee.add(mesh(boxG(0.1, 0.075, 0.23), shoes, 0, -0.43, 0.035));
    return { thigh, knee };
  };
  const L = mkLeg(-0.085), R = mkLeg(0.085);

  const spine = new THREE.Group(); spine.position.y = 0.02; hips.add(spine);
  const girl = look.gender === 'girl';
  const torso = mesh(cap(0.15, 0.26), shirt, 0, 0.3, 0); torso.scale.set(girl ? 1.0 : 1.14, 1, 0.72); spine.add(torso);
  spine.add(mesh(G('neck', () => new THREE.CylinderGeometry(0.045, 0.05, 0.1, 10)), skin, 0, 0.6, 0));

  const head = new THREE.Group(); head.position.y = 0.66; spine.add(head);
  const skull = mesh(sph(0.125), skin, 0, 0.12, 0); skull.scale.set(0.92, 1.06, 0.98); head.add(skull);
  for (const s of [-1, 1]) {
    const ear = mesh(sph(0.03), skin, s * 0.113, 0.11, 0); ear.scale.set(0.5, 1, 0.8); head.add(ear);
    head.add(mesh(sph(0.021), white, s * 0.043, 0.135, 0.103, false));
    head.add(mesh(sph(0.012), cachedMat(look.eyes || '#3b2a1e', { roughness: 0.2 }), s * 0.043, 0.135, 0.121, false));
    head.add(mesh(sph(0.004), white, s * 0.043 + 0.004, 0.139, 0.132, false));
    const brow = mesh(boxG(0.045, 0.011, 0.012), hairM, s * 0.045, 0.172, 0.113, false); brow.rotation.z = -s * 0.12; head.add(brow);
    if (girl) for (let k = 0; k < 3; k++) { const lash = mesh(boxG(0.006, 0.016, 0.004), dark, s * (0.03 + k * 0.014), 0.157, 0.122, false); lash.rotation.z = s * (0.5 - k * 0.3) ; head.add(lash); }
    const cheek = mesh(sph(0.022), cachedMat('#ff9aa2', { transparent: true, opacity: 0.35 }), s * 0.07, 0.085, 0.098, false); cheek.scale.z = 0.4; head.add(cheek);
  }
  const nose = mesh(sph(0.018), skin, 0, 0.105, 0.124, false); nose.scale.set(0.8, 1, 1.1); head.add(nose);
  const mouth = mesh(G('mouth', () => new THREE.TorusGeometry(0.022, 0.005, 6, 12, Math.PI)), cachedMat(girl ? '#e05a7a' : '#b5524a'), 0, 0.072, 0.114, false);
  mouth.rotation.z = Math.PI; head.add(mouth);

  // Soch
  const hs = look.hair || 'short';
  if (hs !== 'bald') {
    const top = mesh(G('hairTop', () => new THREE.SphereGeometry(0.133, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.56)), hairM, 0, 0.125, -0.008);
    top.scale.set(0.96, 1.07, 1.03); top.rotation.x = -0.28; head.add(top);
    if (hs === 'long') { const b = mesh(cap(0.1, 0.17), hairM, 0, 0.02, -0.075); b.scale.set(1.18, 1, 0.5); head.add(b); }
    if (hs === 'ponytail') { const p = mesh(cap(0.035, 0.17), hairM, 0, 0.06, -0.16); p.rotation.x = 0.55; head.add(p); head.add(mesh(sph(0.03), cachedMat('#ff6fb5'), 0, 0.14, -0.135)); }
    if (hs === 'bun') head.add(mesh(sph(0.058), hairM, 0, 0.245, -0.06));
    if (hs === 'curly') for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; head.add(mesh(sph(0.045), hairM, Math.sin(a) * 0.1, 0.2 + Math.cos(a * 2) * 0.03, Math.cos(a) * 0.09 - 0.02)); }
    if (hs === 'spiky') for (let i = 0; i < 7; i++) { const c = mesh(G('spike', () => new THREE.ConeGeometry(0.035, 0.1, 6)), hairM, (i - 3) * 0.032, 0.25, -0.02 + Math.abs(i - 3) * -0.01); c.rotation.z = (i - 3) * 0.15; head.add(c); }
  }

  const mkArm = s => {
    const sh = new THREE.Group(); sh.position.set(s * (girl ? 0.18 : 0.2), 0.5, 0); spine.add(sh);
    sh.add(mesh(cap(0.048, 0.2), shirt, 0, -0.13, 0));
    const el = new THREE.Group(); el.position.y = -0.27; sh.add(el);
    el.add(mesh(cap(0.042, 0.18), look.sleeves === 'long' ? shirt : skin, 0, -0.12, 0));
    const hand = mesh(sph(0.045), skin, 0, -0.27, 0); hand.scale.set(0.8, 1.1, 0.6); el.add(hand);
    return { sh, el };
  };
  const AL = mkArm(-1), AR = mkArm(1);

  const hatSlot = new THREE.Group(); hatSlot.position.y = 0.245; hatSlot.scale.setScalar(0.3); head.add(hatSlot);
  const glassesSlot = new THREE.Group(); glassesSlot.position.set(0, 0.135, 0.13); glassesSlot.scale.setScalar(0.27); head.add(glassesSlot);
  const backSlot = new THREE.Group(); backSlot.position.set(0, 0.32, -0.11); backSlot.scale.setScalar(0.42); spine.add(backSlot);

  return { root, hips, spine, head, L, R, AL, AR, hatSlot, glassesSlot, backSlot, height: 1.78 * (look.scale || 1) };
}

let phaseSeed = 0;
export function animateHuman(b, st, dt, speed, air, time) {
  const s = Math.min(speed, 1.6);
  st.phase += dt * (s > 0.03 ? 4.5 + s * 5.5 : 0);
  const p = st.phase, sw = Math.sin(p);
  if (air) {
    b.L.thigh.rotation.x = -0.7; b.L.knee.rotation.x = 1.0; b.R.thigh.rotation.x = 0.15; b.R.knee.rotation.x = 0.5;
    b.AL.sh.rotation.x = -2.2; b.AR.sh.rotation.x = -2.2; b.AL.el.rotation.x = -0.3; b.AR.el.rotation.x = -0.3;
    b.hips.position.y = 0.9;
  } else {
    b.L.thigh.rotation.x = -sw * 0.6 * s; b.R.thigh.rotation.x = sw * 0.6 * s;
    b.L.knee.rotation.x = (0.08 + Math.max(0, Math.sin(p - 0.7))) * 0.95 * s;
    b.R.knee.rotation.x = (0.08 + Math.max(0, -Math.sin(p - 0.7))) * 0.95 * s;
    b.AL.sh.rotation.x = sw * 0.55 * s; b.AR.sh.rotation.x = -sw * 0.55 * s;
    b.AL.el.rotation.x = -(0.15 + 0.45 * s); b.AR.el.rotation.x = -(0.15 + 0.45 * s);
    b.hips.position.y = 0.9 + Math.abs(Math.cos(p)) * 0.035 * s - 0.025 * s;
  }
  b.AL.sh.rotation.z = -0.07; b.AR.sh.rotation.z = 0.07;
  b.spine.rotation.y = sw * 0.09 * s;
  b.spine.rotation.x = 0.07 * s + (1 - Math.min(1, s)) * Math.sin(time * 1.6 + st.seed) * 0.015;
  b.head.rotation.y = (1 - Math.min(1, s)) * Math.sin(time * 0.4 + st.seed) * 0.35;
  if (st.wave > 0) { st.wave -= dt; b.AR.sh.rotation.x = -2.6; b.AR.sh.rotation.z = 0.3 + Math.sin(time * 14) * 0.25; b.AR.el.rotation.x = -0.2; }
}

// ---------- Aksessuarlar (eski kubik o'lchamda yasalgan, slotda kichraytiriladi) ----------
function buildHat(kind) {
  const g = new THREE.Group();
  const add = (geo, m, x = 0, y = 0, z = 0) => { const me = mesh(geo, m, x, y, z); g.add(me); return me; };
  if (kind === 'cap') {
    const m = M('#ff5a5f');
    add(new THREE.SphereGeometry(0.46, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), m).scale.y = 0.6;
    add(new THREE.BoxGeometry(0.52, 0.05, 0.4), m, 0, 0, 0.45);
  } else if (kind === 'beanie') {
    add(new THREE.SphereGeometry(0.47, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), M('#2ec4b6')).scale.y = 0.85;
    add(new THREE.CylinderGeometry(0.48, 0.48, 0.14, 20), M('#ffd166'), 0, 0.04);
    add(new THREE.SphereGeometry(0.12, 12, 12), M('#ffffff'), 0, 0.44);
  } else if (kind === 'bunny') {
    for (const s of [-1, 1]) {
      const e = add(new THREE.SphereGeometry(0.13, 12, 12), M('#ffffff'), s * 0.18, 0.4); e.scale.set(1, 3.2, 0.55); e.rotation.z = -s * 0.15;
      const i = add(new THREE.SphereGeometry(0.08, 10, 10), M('#ffb3c7'), s * 0.18, 0.4, 0.05); i.scale.set(1, 3.4, 0.4); i.rotation.z = -s * 0.15;
    }
  } else if (kind === 'wizard') {
    const m = M('#5b3cc4');
    add(new THREE.CylinderGeometry(0.66, 0.66, 0.05, 24), m);
    add(new THREE.ConeGeometry(0.44, 1.0, 20), m, 0, 0.5).rotation.z = 0.12;
    add(new THREE.OctahedronGeometry(0.1), M('#ffd166', { emissive: '#ffb703', emissiveIntensity: 0.6 }), 0.05, 0.55, 0.36);
  } else if (kind === 'crown') {
    const m = M('#ffc93c', { metalness: 0.6, roughness: 0.3 });
    const r = add(new THREE.CylinderGeometry(0.42, 0.42, 0.28, 10, 1, true), m, 0, 0.12); r.material.side = THREE.DoubleSide;
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      add(new THREE.ConeGeometry(0.08, 0.2, 6), m, Math.sin(a) * 0.4, 0.35, Math.cos(a) * 0.4);
      add(new THREE.SphereGeometry(0.045, 8, 8), M(['#ff5a5f', '#4f8cff', '#34c759', '#9b5de5', '#ff6fb5'][i]), Math.sin(a) * 0.43, 0.14, Math.cos(a) * 0.43);
    }
  } else if (kind === 'cowboy') {
    const m = M('#a0522d');
    add(new THREE.CylinderGeometry(0.85, 0.85, 0.05, 28), m).scale.z = 0.85;
    add(new THREE.CylinderGeometry(0.36, 0.44, 0.45, 20), m, 0, 0.22);
    add(new THREE.CylinderGeometry(0.445, 0.445, 0.08, 20), M('#3a2416'), 0, 0.05);
  } else if (kind === 'chef') {
    const m = M('#ffffff');
    add(new THREE.CylinderGeometry(0.44, 0.44, 0.3, 20), m, 0, 0.1);
    for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; add(new THREE.SphereGeometry(0.26, 12, 12), m, Math.sin(a) * 0.2, 0.42, Math.cos(a) * 0.2); }
  } else if (kind === 'astro') {
    const glass = add(new THREE.SphereGeometry(0.72, 24, 18), M('#bfe6ff', { transparent: true, opacity: 0.3, roughness: 0.05, metalness: 0.2 }), 0, -0.45, 0.02);
    glass.castShadow = false;
    add(new THREE.TorusGeometry(0.6, 0.07, 10, 28), M('#ffffff'), 0, -0.98, 0).rotation.x = Math.PI / 2;
  } else if (kind === 'headphones') {
    const m = M('#222831');
    add(new THREE.TorusGeometry(0.46, 0.05, 8, 24, Math.PI), m, 0, -0.4);
    for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.17, 0.17, 0.12, 16), M('#ff5a5f'), s * 0.47, -0.4).rotation.z = Math.PI / 2;
  } else if (kind === 'party') {
    add(new THREE.ConeGeometry(0.3, 0.75, 18), M('#ff6fb5'), 0, 0.37);
    add(new THREE.SphereGeometry(0.08, 10, 10), M('#ffd166'), 0, 0.76);
  } else if (kind === 'flowers') {
    const cols = ['#ff6fb5', '#ffd166', '#ffffff', '#9b5de5', '#ff5a5f'];
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; add(new THREE.SphereGeometry(0.1, 10, 10), M(cols[i % 5]), Math.sin(a) * 0.43, 0.02, Math.cos(a) * 0.43); }
  }
  return g;
}

function buildGlasses(kind) {
  const g = new THREE.Group();
  const add = (geo, m, x = 0, y = 0, z = 0) => { const me = mesh(geo, m, x, y, z, false); g.add(me); return me; };
  if (kind === 'round') {
    const m = M('#333333');
    for (const s of [-1, 1]) add(new THREE.TorusGeometry(0.11, 0.022, 8, 20), m, s * 0.17);
    add(new THREE.BoxGeometry(0.12, 0.025, 0.02), m);
  } else if (kind === 'sun') {
    const m = M('#111111', { roughness: 0.2, metalness: 0.3 });
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.26, 0.14, 0.03), m, s * 0.17);
    add(new THREE.BoxGeometry(0.12, 0.03, 0.02), m);
  } else if (kind === 'star') {
    const m = M('#ffd166', { emissive: '#ff9f1c', emissiveIntensity: 0.4 });
    for (const s of [-1, 1]) { const st = add(new THREE.OctahedronGeometry(0.15), m, s * 0.18); st.scale.z = 0.25; st.rotation.z = Math.PI / 4; }
  } else if (kind === 'heart') {
    const m = M('#ff4d6d', { emissive: '#ff4d6d', emissiveIntensity: 0.25 });
    for (const s of [-1, 1]) for (const k of [-1, 1]) { const b = add(new THREE.SphereGeometry(0.07, 10, 10), m, s * 0.17 + k * 0.045, 0.02); b.scale.z = 0.3; }
    for (const s of [-1, 1]) { const c = add(new THREE.ConeGeometry(0.11, 0.12, 4), m, s * 0.17, -0.06); c.rotation.z = Math.PI; c.scale.z = 0.3; }
  } else if (kind === 'goggles') {
    const m = M('#ff8c42');
    for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 16), M('#6ad1ff', { roughness: 0.1, metalness: 0.4 }), s * 0.16).rotation.x = Math.PI / 2;
    add(new THREE.TorusGeometry(0.5, 0.03, 6, 24), m, 0, 0, -0.42).rotation.x = Math.PI / 2;
  } else if (kind === '3d') {
    add(new THREE.BoxGeometry(0.24, 0.13, 0.02), M('#ff3b3b', { transparent: true, opacity: 0.8 }), -0.16);
    add(new THREE.BoxGeometry(0.24, 0.13, 0.02), M('#3bb3ff', { transparent: true, opacity: 0.8 }), 0.16);
    add(new THREE.BoxGeometry(0.62, 0.03, 0.03), M('#ffffff'), 0, 0.08);
  }
  return g;
}

function buildBack(kind) {
  const g = new THREE.Group();
  const add = (geo, m, x = 0, y = 0, z = 0) => { const me = mesh(geo, m, x, y, z); g.add(me); return me; };
  if (kind === 'backpack') {
    add(new THREE.BoxGeometry(0.58, 0.62, 0.24), M('#ff8c42'), 0, 0, -0.12);
    add(new THREE.BoxGeometry(0.4, 0.25, 0.08), M('#ffb37a'), 0, -0.15, -0.27);
  } else if (kind === 'cape') {
    const piv = new THREE.Group(); piv.position.y = 0.32; piv.name = 'cape';
    piv.add(mesh(new THREE.BoxGeometry(0.76, 1.15, 0.04), M('#e63946'), 0, -0.56, 0)); g.add(piv);
  } else if (kind === 'wings' || kind === 'butterfly') {
    const m = kind === 'wings' ? M('#ffffff', { emissive: '#bde0fe', emissiveIntensity: 0.25 }) : M('#ff9f1c', { emissive: '#ff6fb5', emissiveIntensity: 0.2, transparent: true, opacity: 0.9 });
    for (const s of [-1, 1]) {
      const piv = new THREE.Group(); piv.position.x = s * 0.1; piv.name = 'wing' + s;
      const w = mesh(new THREE.SphereGeometry(0.3, 14, 12), m, s * 0.42, 0.1, 0); w.scale.set(1.5, kind === 'butterfly' ? 1.4 : 1, 0.15); piv.add(w); g.add(piv);
    }
  } else if (kind === 'jetpack') {
    const m = M('#c0c7d6', { metalness: 0.7, roughness: 0.3 });
    for (const s of [-1, 1]) {
      add(new THREE.CylinderGeometry(0.14, 0.14, 0.6, 14), m, s * 0.16, 0, -0.16);
      add(new THREE.ConeGeometry(0.14, 0.18, 14), M('#ff5a5f'), s * 0.16, 0.39, -0.16);
      const f = add(new THREE.ConeGeometry(0.1, 0.3, 10), M('#ffb703', { emissive: '#ff6b00', emissiveIntensity: 1.2 }), s * 0.16, -0.45, -0.16); f.rotation.x = Math.PI; f.name = 'flame';
    }
  } else if (kind === 'guitar') {
    const piv = new THREE.Group(); piv.rotation.z = 0.6; piv.position.z = -0.18; g.add(piv);
    const b = mesh(new THREE.SphereGeometry(0.28, 16, 12), M('#c0392b'), 0, -0.2, 0); b.scale.z = 0.35; piv.add(b);
    piv.add(mesh(new THREE.BoxGeometry(0.08, 0.7, 0.05), M('#5d3a1a'), 0, 0.35, 0));
  } else if (kind === 'balloon') {
    const bl = mesh(new THREE.SphereGeometry(0.45, 18, 14), M('#ff4d6d', { roughness: 0.3 }), 0.4, 2.6, -0.3); bl.scale.y = 1.15; bl.name = 'balloon'; g.add(bl);
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 2.2, 4), M('#ffffff')); line.position.set(0.25, 1.3, -0.2); line.rotation.z = -0.12; g.add(line);
  }
  return g;
}

// ---------- O'yinchi personaji ----------
function lookFromOutfit(o) {
  const cos = o.costume && ITEMS[o.costume] ? ITEMS[o.costume] : null;
  const sh = ITEMS[o.shirt] || {}, pa = ITEMS[o.pants] || {}, so = ITEMS[o.shoes] || {}, hr = ITEMS[o.hair] || {};
  const base = {
    gender: o.gender || 'boy',
    skin: o.skin, shirt: sh.color || '#4f8cff', pattern: sh.pattern, sleeves: sh.sleeves || 'short',
    pants: pa.color || '#2b3a67', skirt: !!pa.skirt, shoes: so.color || '#f2f2f2',
    hair: hr.kind || 'short', hairColor: o.hairColor || '#4a2f1b', eyes: '#3b2a1e', scale: 0.9,
  };
  if (cos) Object.assign(base, { pattern: null, sleeves: 'short', skirt: false }, cos.look);
  return base;
}
function accOf(o, slot) {
  const cos = o.costume && ITEMS[o.costume];
  return cos && slot in cos ? cos[slot] : o[slot];
}

export function makeCharacter(outfit) {
  const group = new THREE.Group();
  let body = null, cape = null, wings = [], flames = [], balloon = null;
  const st = { phase: 0, seed: (phaseSeed += 1.7), wave: 0 };
  function setOutfit(o) {
    if (body) group.remove(body.root);
    body = makeHuman(lookFromOutfit(o), false);
    group.add(body.root);
    const hat = accOf(o, 'hat'), gl = accOf(o, 'glasses'), bk = accOf(o, 'back');
    if (hat && ITEMS[hat]) body.hatSlot.add(buildHat(ITEMS[hat].kind));
    if (gl && ITEMS[gl]) body.glassesSlot.add(buildGlasses(ITEMS[gl].kind));
    if (bk && ITEMS[bk]) body.backSlot.add(buildBack(ITEMS[bk].kind));
    cape = body.backSlot.getObjectByName('cape') || null;
    wings = [body.backSlot.getObjectByName('wing-1'), body.backSlot.getObjectByName('wing1')].filter(Boolean);
    flames = []; body.backSlot.traverse(x => { if (x.name === 'flame') flames.push(x); });
    balloon = body.backSlot.getObjectByName('balloon') || null;
  }
  setOutfit(outfit);
  function animate(dt, speed, air, time) {
    animateHuman(body, st, dt, speed, air, time);
    if (cape) cape.rotation.x = 0.12 + speed * 0.55 + Math.sin(time * 6) * 0.05 * speed + (air ? 0.5 : 0);
    if (wings.length) { const f = Math.sin(time * (air ? 14 : 3)) * (air ? 0.6 : 0.15); wings[0].rotation.y = f; wings[1].rotation.y = -f; }
    flames.forEach(f => { f.scale.y = air ? 1.6 + Math.sin(time * 40) * 0.3 : 0.4; });
    if (balloon) balloon.position.y = 2.6 + Math.sin(time * 1.5) * 0.08;
  }
  return { group, setOutfit, animate, wave: () => { st.wave = 1.6; }, get height() { return body.height; } };
}

// ---------- Orolda yuradigan odamlar (NPC) ----------
const NPC_SHIRTS = ['#e63946', '#457b9d', '#2a9d8f', '#e9c46a', '#f4a261', '#8d99ae', '#6d597a', '#ffffff', '#264653', '#ff6fb5', '#3a86ff', '#80b918'];
const NPC_PANTS = ['#1d3557', '#3f6fb5', '#2b2d42', '#6c584c', '#a5a58d', '#495057', '#3d405b'];
const HAIR_COLORS = ['#1b1b1b', '#3b2416', '#5a3a22', '#8a5a2b', '#c69c6d', '#e0c48c', '#7a7a7a'];
const SKIN_TONES = ['#ffe0c4', '#f1c27d', '#e0ac69', '#c68642', '#a86b3c', '#6b4226'];
const pick = a => a[Math.floor(Math.random() * a.length)];
export function randomLook() {
  const fem = Math.random() < 0.5;
  const kid = Math.random() < 0.35;
  return {
    gender: fem ? 'girl' : 'boy',
    skin: pick(SKIN_TONES), shirt: pick(NPC_SHIRTS), pattern: Math.random() < 0.15 ? pick(['stripes', 'dots']) : null,
    sleeves: Math.random() < 0.4 ? 'long' : 'short', pants: pick(NPC_PANTS), skirt: fem && Math.random() < 0.45,
    shoes: pick(['#f2f2f2', '#222222', '#8b5a2b', '#e63946', '#3a86ff']),
    hair: fem ? pick(['long', 'ponytail', 'bun', 'curly', 'long']) : pick(['short', 'short', 'spiky', 'curly', 'bald']),
    hairColor: pick(HAIR_COLORS), eyes: pick(['#3b2a1e', '#2f5d8a', '#4f7942', '#1b1b1b']),
    scale: kid ? 0.68 + Math.random() * 0.12 : 0.95 + Math.random() * 0.1,
  };
}
export function makeNPC() {
  const body = makeHuman(randomLook(), true);
  const group = new THREE.Group(); group.add(body.root);
  const st = { phase: Math.random() * 6, seed: Math.random() * 10, wave: 0 };
  return { group, body, animate: (dt, sp, t) => animateHuman(body, st, dt, sp, false, t), wave: () => { st.wave = 1.8; } };
}

// ---------- Uy hayvonlari ----------
export function makePet(kind) {
  const g = new THREE.Group();
  const inner = new THREE.Group(); g.add(inner);
  const legs = [];
  let wingL = null, wingR = null, tail = null;
  const add = (geo, m, x, y, z, p = inner) => { const me = mesh(geo, m, x, y, z); p.add(me); return me; };
  const eyes = (y, z, x = 0.05) => { for (const s of [-1, 1]) add(sph(0.022), cachedMat('#111111', { roughness: 0.2 }), s * x, y, z); };
  const quad = (col, legCol, bodyR, bodyL, legH, headR, headY, headZ) => {
    const b = add(cap(bodyR, bodyL), cachedMat(col), 0, legH + bodyR * 0.8, 0); b.rotation.x = Math.PI / 2;
    for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const piv = new THREE.Group(); piv.position.set(x * bodyR * 0.6, legH + 0.02, z * bodyL * 0.42); inner.add(piv);
      piv.add(mesh(cap(bodyR * 0.28, legH * 0.7), cachedMat(legCol), 0, -legH * 0.5, 0)); legs.push(piv);
    }
    add(sph(headR), cachedMat(col), 0, headY, headZ);
  };
  if (kind === 'dog') {
    quad('#c68642', '#a0522d', 0.12, 0.22, 0.16, 0.11, 0.38, 0.2);
    add(boxG(0.08, 0.07, 0.1), cachedMat('#e0b07a'), 0, 0.35, 0.3); add(sph(0.025), cachedMat('#111'), 0, 0.37, 0.355);
    for (const s of [-1, 1]) { const e = add(boxG(0.05, 0.12, 0.03), cachedMat('#6b3e1f'), s * 0.09, 0.4, 0.2); e.rotation.z = s * 0.3; }
    eyes(0.41, 0.3); tail = add(cap(0.025, 0.12), cachedMat('#a0522d'), 0, 0.36, -0.24); tail.rotation.x = -0.8;
  } else if (kind === 'cat') {
    quad('#9e9e9e', '#8a8a8a', 0.1, 0.2, 0.14, 0.1, 0.33, 0.18);
    for (const s of [-1, 1]) add(G('catEar', () => new THREE.ConeGeometry(0.04, 0.08, 4)), cachedMat('#7a7a7a'), s * 0.06, 0.43, 0.18);
    eyes(0.35, 0.27); add(sph(0.015), cachedMat('#ff8fa3'), 0, 0.32, 0.28);
    tail = add(cap(0.02, 0.25), cachedMat('#8a8a8a'), 0, 0.38, -0.2); tail.rotation.x = 0.4;
  } else if (kind === 'bunny') {
    quad('#ffffff', '#f2f2f2', 0.11, 0.12, 0.09, 0.1, 0.3, 0.13);
    for (const s of [-1, 1]) { const e = add(cap(0.03, 0.16), cachedMat('#ffffff'), s * 0.04, 0.47, 0.11); e.rotation.z = s * 0.15; }
    eyes(0.32, 0.21, 0.045); add(sph(0.016), cachedMat('#ff8fa3'), 0, 0.29, 0.225);
    add(sph(0.045), cachedMat('#ffffff'), 0, 0.22, -0.16);
  } else if (kind === 'panda') {
    quad('#ffffff', '#1b1b1b', 0.15, 0.16, 0.14, 0.13, 0.42, 0.17);
    for (const s of [-1, 1]) { add(sph(0.045), cachedMat('#1b1b1b'), s * 0.09, 0.53, 0.15); const p = add(sph(0.035), cachedMat('#1b1b1b'), s * 0.05, 0.44, 0.27); p.scale.set(1, 1.2, 0.5); }
    eyes(0.45, 0.29, 0.05); add(sph(0.02), cachedMat('#111'), 0, 0.4, 0.3);
  } else if (kind === 'dragon') {
    inner.position.y = 0.7;
    quad('#3fae49', '#2e8b57', 0.13, 0.22, 0.12, 0.12, 0.38, 0.24);
    const belly = add(cap(0.1, 0.18), cachedMat('#ffd166'), 0, 0.2, 0.02); belly.rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) add(G('horn', () => new THREE.ConeGeometry(0.025, 0.1, 6)), cachedMat('#fff3c4'), s * 0.05, 0.5, 0.2);
    eyes(0.41, 0.34, 0.05);
    const wm = cachedMat('#8bd450', { side: THREE.DoubleSide });
    wingL = new THREE.Group(); wingL.position.set(-0.1, 0.32, 0); inner.add(wingL);
    wingR = new THREE.Group(); wingR.position.set(0.1, 0.32, 0); inner.add(wingR);
    const wl = mesh(sph(0.15), wm, -0.18, 0.05, 0); wl.scale.set(1.6, 0.2, 1); wingL.add(wl);
    const wr = mesh(sph(0.15), wm, 0.18, 0.05, 0); wr.scale.set(1.6, 0.2, 1); wingR.add(wr);
    tail = add(cap(0.04, 0.25), cachedMat('#3fae49'), 0, 0.22, -0.3); tail.rotation.x = -1.1;
  } else if (kind === 'unicorn') {
    quad('#ffffff', '#f0f0f0', 0.15, 0.3, 0.32, 0.1, 0.75, 0.3);
    const neck = add(cap(0.07, 0.2), cachedMat('#ffffff'), 0, 0.62, 0.24); neck.rotation.x = 0.5;
    add(G('uhorn', () => new THREE.ConeGeometry(0.025, 0.16, 8)), cachedMat('#ffd166', { emissive: '#ffb703', emissiveIntensity: 0.4 }), 0, 0.88, 0.34);
    const cols = ['#ff6fb5', '#9b5de5', '#4f8cff', '#34c759'];
    for (let i = 0; i < 4; i++) add(sph(0.045), cachedMat(cols[i]), 0, 0.8 - i * 0.07, 0.2 - i * 0.04);
    eyes(0.77, 0.38, 0.055);
    tail = add(cap(0.04, 0.22), cachedMat('#ff6fb5'), 0, 0.5, -0.38); tail.rotation.x = -0.6;
  }
  let ph = 0;
  function animate(dt, speed, time) {
    ph += dt * (3 + speed * 10);
    const sw = Math.sin(ph) * 0.7 * Math.min(1, speed);
    legs.forEach((l, i) => { l.rotation.x = (i === 0 || i === 3 ? sw : -sw); });
    if (kind === 'bunny') inner.position.y = Math.abs(Math.sin(ph)) * 0.12 * Math.min(1, speed + 0.1);
    if (kind === 'dragon') { inner.position.y = 0.7 + Math.sin(time * 2) * 0.08; const f = Math.sin(time * 9) * 0.6; wingL.rotation.z = f; wingR.rotation.z = -f; }
    if (tail) tail.rotation.z = Math.sin(time * 6) * 0.4;
  }
  return { group: g, animate };
}
