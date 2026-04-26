// App Icon Generator — wake-up-scheduler
// Run: node docs/generate-icon-wake-up-scheduler.js
// Output: app-icons/wake-up-scheduler.png (256x256)
//
// Motif: stylized alarm clock (face + two top bells + hour/minute hands)
// Palette: Violet → Cyan (productivity / calendar印象), dark cyan BG

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

const APP_ID = 'wake-up-scheduler';

// Violet → Cyan gradient (productivity palette)
const COLOR_A = [167, 139, 250];   // Violet  #a78bfa
const COLOR_B = [34, 211, 238];    // Cyan    #22d3ee

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
  ihdr[8] = 8; ihdr[9] = 2;
  const raw = [];
  for (let y = 0; y < size; y++) {
    raw.push(0);
    for (let x = 0; x < size; x++) raw.push(...draw(x, y, size));
  }
  const idat = zlib.deflateSync(Buffer.from(raw), { level: 9 });
  const png  = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
  fs.writeFileSync(path.join(__dirname, '..', 'app-icons', filename), png);
  console.log(`OK app-icons/${filename} (${size}x${size})`);
}

// ── Math ──────────────────────────────────────────────────────────────────────

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const roundedRectSDF = (px, py, cx, cy, w, h, r) => {
  const qx = Math.abs(px - cx) - w / 2 + r;
  const qy = Math.abs(py - cy) - h / 2 + r;
  return Math.sqrt(Math.max(qx, 0) ** 2 + Math.max(qy, 0) ** 2) + Math.min(Math.max(qx, qy), 0) - r;
};
const lerpColor = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
function pointToSegmentDist(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const apx = px - ax, apy = py - ay;
  const len2 = abx * abx + aby * aby;
  const t = len2 > 0 ? clamp((apx * abx + apy * aby) / len2, 0, 1) : 0;
  const rx = apx - abx * t, ry = apy - aby * t;
  return Math.sqrt(rx * rx + ry * ry);
}

// dark cyan background (productivity / calendar印象)
const BG = [5, 25, 40];

// ── Motif ─────────────────────────────────────────────────────────────────────

function drawMotif(x, y, size, cx, cy, fr, fg, fb) {
  const aa = 1.5;
  const s = size / 256;

  // Clock body center (slightly below center to leave room for bells)
  const clockCx = cx;
  const clockCy = cy + 8 * s;
  const clockR  = 76 * s;
  const dist    = Math.sqrt((x - clockCx) ** 2 + (y - clockCy) ** 2);

  // Outer glow
  const glowA = Math.max(0, 1 - dist / (clockR * 1.8)) ** 2 * 0.45;
  fr += COLOR_B[0] * glowA * 0.6;
  fg += COLOR_B[1] * glowA * 0.6;
  fb += COLOR_B[2] * glowA * 0.6;

  // Clock outer ring (gradient stroke)
  const ringT = clamp((y - (clockCy - clockR)) / (clockR * 2), 0, 1);
  const ringColor = lerpColor(COLOR_A, COLOR_B, ringT);
  const ringEdge = Math.abs(dist - clockR) - 5 * s;
  const ringA = 1 - smoothstep(-aa, aa, ringEdge);
  if (ringA > 0) {
    fr = lerp(fr, ringColor[0], ringA * 0.95);
    fg = lerp(fg, ringColor[1], ringA * 0.95);
    fb = lerp(fb, ringColor[2], ringA * 0.95);
  }

  // Inner face (dark surface)
  if (dist < clockR - 5 * s) {
    const faceA = 1 - smoothstep(0, aa, dist - (clockR - 5 * s));
    const inner = [16, 38, 56];
    fr = lerp(fr, inner[0], 0.7);
    fg = lerp(fg, inner[1], 0.7);
    fb = lerp(fb, inner[2], 0.7);
  }

  // Hour ticks (12, 3, 6, 9 only — minimal)
  const tickPositions = [
    { ax: clockCx,                         ay: clockCy - clockR + 12 * s, bx: clockCx,                         by: clockCy - clockR + 24 * s },
    { ax: clockCx + clockR - 12 * s, ay: clockCy,                         bx: clockCx + clockR - 24 * s, by: clockCy                         },
    { ax: clockCx,                         ay: clockCy + clockR - 12 * s, bx: clockCx,                         by: clockCy + clockR - 24 * s },
    { ax: clockCx - clockR + 12 * s, ay: clockCy,                         bx: clockCx - clockR + 24 * s, by: clockCy                         },
  ];
  for (const t of tickPositions) {
    const td = pointToSegmentDist(x, y, t.ax, t.ay, t.bx, t.by);
    if (td < 2.2 * s) {
      const ta = 1 - smoothstep(0, aa, td - 2.2 * s);
      fr = lerp(fr, COLOR_B[0], ta * 0.8);
      fg = lerp(fg, COLOR_B[1], ta * 0.8);
      fb = lerp(fb, COLOR_B[2], ta * 0.8);
    }
  }

  // Hour hand (12 → upward), thicker
  const hHandTop = clockCy - clockR * 0.55;
  const hd = pointToSegmentDist(x, y, clockCx, clockCy, clockCx, hHandTop);
  if (hd < 4.5 * s) {
    const ha = 1 - smoothstep(0, aa, hd - 4.5 * s);
    fr = lerp(fr, COLOR_A[0], ha);
    fg = lerp(fg, COLOR_A[1], ha);
    fb = lerp(fb, COLOR_A[2], ha);
  }

  // Minute hand (toward 2 o'clock)
  const angle = -Math.PI / 3; // 30° above horizontal-right
  const mTipX = clockCx + Math.cos(angle) * clockR * 0.7;
  const mTipY = clockCy + Math.sin(angle) * clockR * 0.7;
  const md = pointToSegmentDist(x, y, clockCx, clockCy, mTipX, mTipY);
  if (md < 3.5 * s) {
    const ma = 1 - smoothstep(0, aa, md - 3.5 * s);
    fr = lerp(fr, COLOR_B[0], ma);
    fg = lerp(fg, COLOR_B[1], ma);
    fb = lerp(fb, COLOR_B[2], ma);
  }

  // Center pin
  const pinD = Math.sqrt((x - clockCx) ** 2 + (y - clockCy) ** 2);
  const pinA = 1 - smoothstep(-aa, aa, pinD - 6 * s);
  if (pinA > 0) {
    fr = lerp(fr, COLOR_B[0], pinA);
    fg = lerp(fg, COLOR_B[1], pinA);
    fb = lerp(fb, COLOR_B[2], pinA);
  }

  // Two bells on top
  const bellR = 18 * s;
  const bellY = clockCy - clockR - 6 * s;
  const bellOffsetX = 48 * s;
  for (const sign of [-1, 1]) {
    const bx = clockCx + sign * bellOffsetX;
    const bd = Math.sqrt((x - bx) ** 2 + (y - bellY) ** 2);
    // bell glow
    const bg = Math.max(0, 1 - bd / (bellR * 2)) ** 2 * 0.5;
    fr += COLOR_A[0] * bg * 0.5;
    fg += COLOR_A[1] * bg * 0.5;
    fb += COLOR_A[2] * bg * 0.5;
    // bell ring
    const bedge = Math.abs(bd - bellR) - 3 * s;
    const ba = 1 - smoothstep(-aa, aa, bedge);
    if (ba > 0) {
      fr = lerp(fr, COLOR_A[0], ba * 0.9);
      fg = lerp(fg, COLOR_A[1], ba * 0.9);
      fb = lerp(fb, COLOR_A[2], ba * 0.9);
    }
    // bell inner dot
    if (bd < 6 * s) {
      const bca = 1 - smoothstep(0, aa, bd - 6 * s);
      fr = lerp(fr, COLOR_B[0], bca * 0.9);
      fg = lerp(fg, COLOR_B[1], bca * 0.9);
      fb = lerp(fb, COLOR_B[2], bca * 0.9);
    }
  }

  return [fr, fg, fb];
}

// ── Main ──────────────────────────────────────────────────────────────────────

function drawIcon(x, y, size) {
  const aa     = 1.5;
  const outerR = 0.22 * size;
  const cx = size / 2, cy = size / 2;

  const outerSDF = roundedRectSDF(x, y, cx, cy, size, size, outerR);
  if (outerSDF > aa) return BG;

  const nx = (x / size) * 2 - 1, ny = (y / size) * 2 - 1;
  const bgGlow = Math.max(0, 1 - Math.sqrt(nx * nx + ny * ny) * 0.75) * 0.10;
  let fr = BG[0] + bgGlow * 50;
  let fg = BG[1] + bgGlow * 70;
  let fb = BG[2] + bgGlow * 120;

  [fr, fg, fb] = drawMotif(x, y, size, cx, cy, fr, fg, fb);

  const edgeFade = 1 - smoothstep(-aa, aa, outerSDF);
  fr = lerp(BG[0], fr, edgeFade);
  fg = lerp(BG[1], fg, edgeFade);
  fb = lerp(BG[2], fb, edgeFade);

  return [clamp(Math.round(fr), 0, 255), clamp(Math.round(fg), 0, 255), clamp(Math.round(fb), 0, 255)];
}

writePNG(`${APP_ID}.png`, 256, drawIcon);
console.log('Done.');
