// Generates icon-192.png and icon-512.png for Apps Portal PWA
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
    raw.push(0); // filter: none
    for (let x = 0; x < size; x++) {
      raw.push(...draw(x, y, size));
    }
  }
  const idat = zlib.deflateSync(Buffer.from(raw), { level: 9 });

  const png = Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(path.join(__dirname, filename), png);
  console.log(`✓ ${filename} (${size}x${size})`);
}

// --- Design helpers ---

function lerp(a, b, t) { return a + (b - a) * t; }

// Hex to RGB
function hex(h) {
  return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
}

const BG     = hex('#0f1117');
const ACCENT = hex('#5c7cfa');
const ACCENT2= hex('#38bdf8');

// Smooth step
function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Rounded rect SDF (signed distance function)
function roundedRectSDF(px, py, cx, cy, w, h, r) {
  const qx = Math.abs(px - cx) - w / 2 + r;
  const qy = Math.abs(py - cy) - h / 2 + r;
  return Math.sqrt(Math.max(qx, 0) ** 2 + Math.max(qy, 0) ** 2) + Math.min(Math.max(qx, qy), 0) - r;
}

function drawIcon(x, y, size) {
  const aa = 1.5; // anti-alias width in pixels

  // Normalized coords [-1, 1]
  const nx = (x / size) * 2 - 1;
  const ny = (y / size) * 2 - 1;

  // --- Background ---
  // Outer rounded rect (canvas shape)
  const outerR = 0.22 * size;
  const outerSDF = roundedRectSDF(x, y, size/2, size/2, size, size, outerR);
  if (outerSDF > aa) return BG; // outside — transparent region rendered as bg

  let r = BG[0], g = BG[1], b = BG[2];

  // Subtle radial gradient on background
  const dist = Math.sqrt(nx * nx + ny * ny);
  const bgLight = 0.06 * (1 - Math.min(dist, 1));
  r = Math.min(255, Math.round(BG[0] + bgLight * 255));
  g = Math.min(255, Math.round(BG[1] + bgLight * 255));
  b = Math.min(255, Math.round(BG[2] + bgLight * 255));

  // --- 2x2 Grid of rounded squares ---
  const gap   = 0.12 * size;
  const sqSize = (size - gap * 3) / 2; // cell size
  const sqR   = sqSize * 0.22;         // cell radius

  const cells = [
    { cx: gap + sqSize/2,           cy: gap + sqSize/2           },
    { cx: gap*2 + sqSize*1.5,       cy: gap + sqSize/2           },
    { cx: gap + sqSize/2,           cy: gap*2 + sqSize*1.5       },
    { cx: gap*2 + sqSize*1.5,       cy: gap*2 + sqSize*1.5       },
  ];

  let closestD = Infinity;
  let closestIdx = -1;
  for (let i = 0; i < cells.length; i++) {
    const d = roundedRectSDF(x, y, cells[i].cx, cells[i].cy, sqSize, sqSize, sqR);
    if (d < closestD) { closestD = d; closestIdx = i; }
  }

  // Per-cell gradient blend position (diagonal)
  const blendPositions = [0.0, 0.33, 0.66, 1.0];
  const t = blendPositions[closestIdx];

  const cr = Math.round(lerp(ACCENT[0], ACCENT2[0], t));
  const cg = Math.round(lerp(ACCENT[1], ACCENT2[1], t));
  const cb = Math.round(lerp(ACCENT[2], ACCENT2[2], t));

  // Alpha via smoothstep for anti-aliasing
  const alpha = 1 - smoothstep(-aa, aa, closestD);
  if (alpha > 0) {
    r = Math.round(lerp(r, cr, alpha));
    g = Math.round(lerp(g, cg, alpha));
    b = Math.round(lerp(b, cb, alpha));
  }

  return [
    Math.max(0, Math.min(255, r)),
    Math.max(0, Math.min(255, g)),
    Math.max(0, Math.min(255, b)),
  ];
}

writePNG('icon-192.png', 192, drawIcon);
writePNG('icon-512.png', 512, drawIcon);
console.log('Icons generated.');
