// App Icon Generator — survival-shooter
// Run: node docs/generate-icon-survival-shooter.js
// Output: app-icons/survival-shooter.png (256x256)

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

const APP_ID  = 'survival-shooter';
const COLOR_A = [167, 139, 250]; // #a78bfa Violet
const COLOR_B = [45,  212, 191]; // #2dd4bf Teal

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
  console.log(`✓ app-icons/${filename} (${size}x${size})`);
}

// ── Math helpers ──────────────────────────────────────────────────────────────

function lerp(a, b, t)    { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}
function lerpColor(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}
function roundedRectSDF(px, py, cx, cy, w, h, r) {
  const qx = Math.abs(px - cx) - w / 2 + r;
  const qy = Math.abs(py - cy) - h / 2 + r;
  return Math.sqrt(Math.max(qx, 0) ** 2 + Math.max(qy, 0) ** 2) + Math.min(Math.max(qx, qy), 0) - r;
}

const BG = [10, 14, 26];

// ── Motif: UFO ────────────────────────────────────────────────────────────────

function drawMotif(x, y, size, cx, cy, fr, fg, fb) {
  const aa = 1.5;

  // Saucer body (wide flat ellipse)
  const saucerCY = cy + size * 0.04;
  const saucerRX = size * 0.34;
  const saucerRY = size * 0.1;
  const sdx = (x - cx) / saucerRX;
  const sdy = (y - saucerCY) / saucerRY;
  const saucerD = (Math.sqrt(sdx * sdx + sdy * sdy) - 1) * Math.min(saucerRX, saucerRY);

  // Saucer glow
  const saucerGlow = Math.max(0, 1 - Math.max(0, saucerD + 6) / 22) ** 1.8 * 0.55;
  const glowCol = lerpColor(COLOR_A, COLOR_B, 0.4);
  fr += glowCol[0] * saucerGlow; fg += glowCol[1] * saucerGlow; fb += glowCol[2] * saucerGlow;

  // Saucer fill (gradient left→right)
  const saucerA = 1 - smoothstep(-aa, aa, saucerD);
  if (saucerA > 0) {
    const t = clamp((x - (cx - saucerRX)) / (saucerRX * 2), 0, 1);
    const col = lerpColor(COLOR_A, COLOR_B, t);
    fr = lerp(fr, col[0], saucerA);
    fg = lerp(fg, col[1], saucerA);
    fb = lerp(fb, col[2], saucerA);
  }

  // Dome (above saucer)
  const domeCY = cy - size * 0.07;
  const domeRX = size * 0.155;
  const domeRY = size * 0.135;
  const ddx = (x - cx) / domeRX;
  const ddy = (y - domeCY) / domeRY;
  const domeD = (Math.sqrt(ddx * ddx + ddy * ddy) - 1) * Math.min(domeRX, domeRY);

  if (y < saucerCY + saucerRY) {
    const domeGlow = Math.max(0, 1 - Math.max(0, domeD + 4) / 18) ** 2 * 0.5;
    fr += 160 * domeGlow; fg += 220 * domeGlow; fb += 255 * domeGlow;

    const domeA = 1 - smoothstep(-aa, aa, domeD);
    fr = lerp(fr, 170, domeA);
    fg = lerp(fg, 225, domeA);
    fb = lerp(fb, 255, domeA);
  }

  // Abduction beam (cone below)
  const beamTopY = saucerCY + saucerRY * 1.5;
  const beamBotY = cy + size * 0.43;
  if (y > beamTopY && y < beamBotY) {
    const beamT    = (y - beamTopY) / (beamBotY - beamTopY);
    const beamHalf = size * 0.035 + beamT * size * 0.13;
    const beamDist = Math.abs(x - cx) - beamHalf;
    const beamA    = Math.max(0, 1 - Math.max(0, beamDist) / 3) * (1 - beamT * 0.7) * 0.55;
    const bCol = lerpColor(COLOR_B, [180, 255, 210], beamT);
    fr += bCol[0] * beamA; fg += bCol[1] * beamA; fb += bCol[2] * beamA;
  }

  // Rim lights (small bright dots around saucer)
  const lightCount = 9;
  for (let i = 0; i < lightCount; i++) {
    const a   = (i / lightCount) * Math.PI * 2;
    const lx  = cx + Math.cos(a) * saucerRX * 0.8;
    const ly  = saucerCY + Math.sin(a) * saucerRY * 0.65;
    const ld  = Math.sqrt((x - lx) ** 2 + (y - ly) ** 2);
    const lr  = size * 0.021;
    const t   = i / (lightCount - 1);
    const col = lerpColor(COLOR_A, COLOR_B, t);

    const lg = Math.max(0, 1 - ld / (lr * 4.5)) ** 2 * 0.75;
    fr += col[0] * lg; fg += col[1] * lg; fb += col[2] * lg;

    const la = 1 - smoothstep(-aa, aa, ld - lr);
    fr = lerp(fr, 255, la); fg = lerp(fg, 255, la); fb = lerp(fb, 255, la);
  }

  // Stars (scattered background dots)
  const STARS = [
    { rx: 0.14, ry: 0.16, r: 0.011 },
    { rx: 0.84, ry: 0.20, r: 0.009 },
    { rx: 0.78, ry: 0.76, r: 0.010 },
    { rx: 0.20, ry: 0.78, r: 0.008 },
    { rx: 0.90, ry: 0.52, r: 0.009 },
    { rx: 0.10, ry: 0.50, r: 0.008 },
    { rx: 0.55, ry: 0.88, r: 0.007 },
  ];
  for (const s of STARS) {
    const sx = s.rx * size, sy = s.ry * size, sr = s.r * size;
    const sd = Math.sqrt((x - sx) ** 2 + (y - sy) ** 2);
    const sg = Math.max(0, 1 - sd / (sr * 3.5)) ** 2 * 0.45;
    fr += 220 * sg; fg += 230 * sg; fb += 255 * sg;
    const sa = 1 - smoothstep(-aa, aa, sd - sr);
    fr = lerp(fr, 240, sa); fg = lerp(fg, 245, sa); fb = lerp(fb, 255, sa);
  }

  return [fr, fg, fb];
}

// ── Main draw loop ────────────────────────────────────────────────────────────

function drawIcon(x, y, size) {
  const aa     = 1.5;
  const outerR = 0.22 * size;
  const cx = size / 2, cy = size / 2;

  const outerSDF = roundedRectSDF(x, y, cx, cy, size, size, outerR);
  if (outerSDF > aa) return BG;

  const nx = (x / size) * 2 - 1, ny = (y / size) * 2 - 1;
  const bgGlow = Math.max(0, 1 - Math.sqrt(nx * nx + ny * ny) * 0.75) * 0.10;
  let fr = BG[0] + bgGlow * 60;
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
