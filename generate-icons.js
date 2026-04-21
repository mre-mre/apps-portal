// Generates icon-192.png and icon-512.png for Apps Portal PWA
// Design: node network — glowing hub with 6 satellite nodes connected by lines
// Run: node generate-icons.js

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// CRC32 table
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
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const tb = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([tb, data])));
  return Buffer.concat([len, tb, data, crcBuf]);
}

function writePNG(filename, size, draw) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  const raw = [];
  for (let y = 0; y < size; y++) {
    raw.push(0);
    for (let x = 0; x < size; x++) {
      raw.push(...draw(x, y, size));
    }
  }
  const idat = zlib.deflateSync(Buffer.from(raw), { level: 9 });
  const png = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
  fs.writeFileSync(path.join(__dirname, filename), png);
  console.log(`✓ ${filename} (${size}x${size})`);
}

// --- Math helpers ---

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function roundedRectSDF(px, py, cx, cy, w, h, r) {
  const qx = Math.abs(px - cx) - w / 2 + r;
  const qy = Math.abs(py - cy) - h / 2 + r;
  return Math.sqrt(Math.max(qx, 0) ** 2 + Math.max(qy, 0) ** 2) + Math.min(Math.max(qx, qy), 0) - r;
}

function capsuleSDF(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const apx = px - ax, apy = py - ay;
  const len2 = abx * abx + aby * aby;
  const t = len2 > 0 ? clamp((apx * abx + apy * aby) / len2, 0, 1) : 0;
  const rx = apx - abx * t, ry = apy - aby * t;
  return Math.sqrt(rx * rx + ry * ry);
}

function lerpColor(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

// --- Color palette ---

const BG     = [10, 14, 26];       // deep navy #0a0e1a
const INDIGO = [99, 102, 241];     // #6366f1
const CYAN   = [34, 211, 238];     // #22d3ee

// --- Draw function ---

function drawIcon(x, y, size) {
  const aa = 1.5;

  // iOS-style rounded rect canvas
  const outerR = 0.22 * size;
  const outerSDF = roundedRectSDF(x, y, size / 2, size / 2, size, size, outerR);
  if (outerSDF > aa) return BG;

  // Background with subtle center glow
  const nx = (x / size) * 2 - 1;
  const ny = (y / size) * 2 - 1;
  const bgDist = Math.sqrt(nx * nx + ny * ny);
  const bgGlow = Math.max(0, 1 - bgDist * 0.75) * 0.12;
  let fr = BG[0] + bgGlow * 50;
  let fg = BG[1] + bgGlow * 65;
  let fb = BG[2] + bgGlow * 110;

  // Satellite node positions (hexagonal, top node at 12 o'clock)
  const cx = size / 2, cy = size / 2;
  const orbitR = size * 0.31;
  const NUM = 6;
  const sats = [];
  for (let i = 0; i < NUM; i++) {
    const angle = (i / NUM) * Math.PI * 2 - Math.PI / 2;
    const t = i / (NUM - 1);
    sats.push({
      x: cx + Math.cos(angle) * orbitR,
      y: cy + Math.sin(angle) * orbitR,
      color: lerpColor(INDIGO, CYAN, t),
      r: size * 0.048,
    });
  }
  const centerR = size * 0.072;

  // 1. Line glows — broad, soft, additive
  for (const s of sats) {
    const d = capsuleSDF(x, y, cx, cy, s.x, s.y);
    const glowW = size * 0.07;
    const a = Math.max(0, 1 - d / glowW) ** 2 * 0.28;
    fr += s.color[0] * a;
    fg += s.color[1] * a;
    fb += s.color[2] * a;
  }

  // 2. Line cores — thin, alpha composite
  for (const s of sats) {
    const d = capsuleSDF(x, y, cx, cy, s.x, s.y);
    const lw = size * 0.009;
    const a = (1 - smoothstep(-aa, aa, d - lw)) * 0.72;
    fr = lerp(fr, s.color[0], a);
    fg = lerp(fg, s.color[1], a);
    fb = lerp(fb, s.color[2], a);
  }

  // 3. Satellite node glows — additive
  for (const s of sats) {
    const dx = x - s.x, dy = y - s.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const glowW = s.r * 4.0;
    const a = Math.max(0, 1 - d / glowW) ** 2 * 0.65;
    fr += s.color[0] * a;
    fg += s.color[1] * a;
    fb += s.color[2] * a;
  }

  // 4. Center node glow — additive, wider and brighter
  {
    const dx = x - cx, dy = y - cy;
    const d = Math.sqrt(dx * dx + dy * dy);
    const glowW = centerR * 5.5;
    const a = Math.max(0, 1 - d / glowW) ** 1.5 * 0.75;
    fr += 140 * a;
    fg += 180 * a;
    fb += 255 * a;
  }

  // 5. Satellite node cores — solid circles with inner highlight
  for (const s of sats) {
    const dx = x - s.x, dy = y - s.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const a = 1 - smoothstep(-aa, aa, dist - s.r);
    fr = lerp(fr, s.color[0], a);
    fg = lerp(fg, s.color[1], a);
    fb = lerp(fb, s.color[2], a);
    // Inner bright spot
    const ia = (1 - smoothstep(-aa, aa, dist - s.r * 0.38)) * 0.65;
    fr = lerp(fr, 255, ia);
    fg = lerp(fg, 255, ia);
    fb = lerp(fb, 255, ia);
  }

  // 6. Center node core — larger, near-white
  {
    const dx = x - cx, dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const a = 1 - smoothstep(-aa, aa, dist - centerR);
    fr = lerp(fr, 225, a);
    fg = lerp(fg, 240, a);
    fb = lerp(fb, 255, a);
    // Bright core center
    const ia = (1 - smoothstep(-aa, aa, dist - centerR * 0.38)) * 0.88;
    fr = lerp(fr, 255, ia);
    fg = lerp(fg, 255, ia);
    fb = lerp(fb, 255, ia);
  }

  // Edge fade for rounded rect anti-aliasing
  const edgeFade = 1 - smoothstep(-aa, aa, outerSDF);
  fr = lerp(BG[0], fr, edgeFade);
  fg = lerp(BG[1], fg, edgeFade);
  fb = lerp(BG[2], fb, edgeFade);

  return [
    clamp(Math.round(fr), 0, 255),
    clamp(Math.round(fg), 0, 255),
    clamp(Math.round(fb), 0, 255),
  ];
}

writePNG('icon-192.png', 192, drawIcon);
writePNG('icon-512.png', 512, drawIcon);
console.log('Icons generated.');
