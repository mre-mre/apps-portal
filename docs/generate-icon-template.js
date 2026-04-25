// App Icon Generator Template
// Copy this file to: docs/generate-icon-<app-id>.js
// Run: node docs/generate-icon-<app-id>.js
// Output: app-icons/<app-id>.png (256x256)
//
// Design language:
//   - Background: #0a0e1a (deep navy)
//   - iOS-style rounded rect (radius = 22% of size)
//   - Dark + glow effect — no text, geometric motif only
//   - Use 2 colors from the portal palette as gradient

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────

const APP_ID = 'my-app';                 // ← kebab-case app identifier

// Pick 2 colors from the palette (avoid reusing existing app colors):
//   Indigo  #5c7cfa / #6366f1
//   Cyan    #38bdf8 / #22d3ee
//   Violet  #a78bfa
//   Teal    #2dd4bf
const COLOR_A = [99, 102, 241];          // ← start color (e.g. Indigo #6366f1)
const COLOR_B = [34, 211, 238];          // ← end color   (e.g. Cyan  #22d3ee)

// ── PNG helpers ───────────────────────────────────────────────────────────────

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const tb  = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([tb, data])));
  return Buffer.concat([len, tb, data, crc]);
}

function writePNG(filename, size, draw) {
  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  const raw = [];
  for (let y = 0; y < size; y++) {
    raw.push(0);
    for (let x = 0; x < size; x++) raw.push(...draw(x, y, size));
  }
  const idat = zlib.deflateSync(Buffer.from(raw), { level: 9 });
  const png  = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
  fs.writeFileSync(path.join(__dirname, '..', 'app-icons', filename), png);
  console.log(`✓ app-icons/${filename} (${size}x${size})`);
}

// ── Math helpers ──────────────────────────────────────────────────────────────

function lerp(a, b, t)    { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

function roundedRectSDF(px, py, cx, cy, w, h, r) {
  const qx = Math.abs(px - cx) - w / 2 + r;
  const qy = Math.abs(py - cy) - h / 2 + r;
  return Math.sqrt(Math.max(qx, 0) ** 2 + Math.max(qy, 0) ** 2) + Math.min(Math.max(qx, qy), 0) - r;
}

function lerpColor(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

// ── Design constants ──────────────────────────────────────────────────────────

const BG = [10, 14, 26]; // #0a0e1a — fixed for all app icons

// ── Motif: customize this function ───────────────────────────────────────────
//
// Draw the app's symbolic motif on top of the dark background.
// Parameters:
//   x, y  — current pixel position
//   size  — canvas size in pixels
//   cx,cy — canvas center
// Returns: [r, g, b] contribution from the motif (will be composited)
//
// Tips:
//   - Use COLOR_A / COLOR_B for consistent palette
//   - lerpColor(COLOR_A, COLOR_B, t) for gradient along a path
//   - smoothstep for anti-aliased edges
//   - Additive blending for glow: fr += color * alpha
//   - Alpha composite for solid shapes: fr = lerp(fr, color, alpha)
//
// Example motifs in this repo:
//   - generate-icons.js      → node network (hub + 6 satellites)
//   - (add yours below)

function drawMotif(x, y, size, cx, cy, fr, fg, fb) {
  const aa = 1.5;

  // ── Replace this example with your app's motif ──────────────────────────

  // Example: glowing ring with 4 dots (replace with your design)
  const ringR  = size * 0.30;
  const dotR   = size * 0.055;
  const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

  for (let i = 0; i < angles.length; i++) {
    const t  = i / (angles.length - 1);
    const col = lerpColor(COLOR_A, COLOR_B, t);
    const dx  = cx + Math.cos(angles[i]) * ringR;
    const dy  = cy + Math.sin(angles[i]) * ringR;
    const d   = Math.sqrt((x - dx) ** 2 + (y - dy) ** 2);

    // Glow
    const gA = Math.max(0, 1 - d / (dotR * 4)) ** 2 * 0.7;
    fr += col[0] * gA; fg += col[1] * gA; fb += col[2] * gA;

    // Core
    const cA = 1 - smoothstep(-aa, aa, d - dotR);
    fr = lerp(fr, col[0], cA); fg = lerp(fg, col[1], cA); fb = lerp(fb, col[2], cA);
  }

  // ── End of example ──────────────────────────────────────────────────────

  return [fr, fg, fb];
}

// ── Main draw loop ────────────────────────────────────────────────────────────

function drawIcon(x, y, size) {
  const aa     = 1.5;
  const outerR = 0.22 * size;
  const cx = size / 2, cy = size / 2;

  // Clip to rounded rect
  const outerSDF = roundedRectSDF(x, y, cx, cy, size, size, outerR);
  if (outerSDF > aa) return BG;

  // Background with subtle center glow
  const nx = (x / size) * 2 - 1, ny = (y / size) * 2 - 1;
  const bgGlow = Math.max(0, 1 - Math.sqrt(nx * nx + ny * ny) * 0.75) * 0.10;
  let fr = BG[0] + bgGlow * 60;
  let fg = BG[1] + bgGlow * 70;
  let fb = BG[2] + bgGlow * 120;

  // Draw motif
  [fr, fg, fb] = drawMotif(x, y, size, cx, cy, fr, fg, fb);

  // Rounded rect anti-alias edge fade
  const edgeFade = 1 - smoothstep(-aa, aa, outerSDF);
  fr = lerp(BG[0], fr, edgeFade);
  fg = lerp(BG[1], fg, edgeFade);
  fb = lerp(BG[2], fb, edgeFade);

  return [clamp(Math.round(fr), 0, 255), clamp(Math.round(fg), 0, 255), clamp(Math.round(fb), 0, 255)];
}

writePNG(`${APP_ID}.png`, 256, drawIcon);
console.log('Done.');
