import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createPNG(width, height, r, g, b) {
  // Simple uncompressed or deflate PNG generator
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(2, 9); // Truecolor (RGB)
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Scanlines: each row starts with filter byte 0
  const rowSize = 1 + width * 3;
  const rawData = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.42;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 3;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Draw stylized emblem with leaf / geo pin / parcel shape
      if (dist <= radius) {
        // Inner logo shape: leaf + pin + parcel
        const isLeaf = (dx * 0.7 - dy * 0.7) > -radius * 0.1 && (dx * dx + (dy + radius * 0.2) ** 2) < (radius * 0.8) ** 2;
        if (isLeaf) {
          rawData[pxOffset] = 232;     // #E8F2EA (light leaf)
          rawData[pxOffset + 1] = 242;
          rawData[pxOffset + 2] = 234;
        } else {
          rawData[pxOffset] = 39;      // #27865A (productive green)
          rawData[pxOffset + 1] = 134;
          rawData[pxOffset + 2] = 90;
        }
      } else {
        rawData[pxOffset] = r;         // Background (#174C35)
        rawData[pxOffset + 1] = g;
        rawData[pxOffset + 2] = b;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

// CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return crc ^ -1;
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Write PNGs with Misiones Verde Monte (#174C35 -> r=23, g=76, b=53)
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPNG(192, 192, 23, 76, 53));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPNG(512, 512, 23, 76, 53));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPNG(512, 512, 23, 76, 53));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPNG(180, 180, 23, 76, 53));

// Write SVG logo
const svgLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" rx="112" fill="#174C35"/>
  <!-- Cadastral parcel grid line motif -->
  <path d="M96 256L256 128L416 256L256 384Z" stroke="#27865A" stroke-width="8" stroke-dasharray="12 12" opacity="0.4"/>
  <!-- Leaf and Sprout combined with Geo Pin -->
  <path d="M256 80C190 80 144 136 144 204C144 290 256 420 256 420C256 420 368 290 368 204C368 136 322 80 256 80Z" fill="#27865A"/>
  <!-- Inner Leaf Vein / Tech Digital Node -->
  <path d="M256 130C230 160 216 200 216 230C216 260 234 285 256 295C278 285 296 260 296 230C296 200 282 160 256 130Z" fill="#E8F2EA"/>
  <path d="M256 150V275" stroke="#174C35" stroke-width="6" stroke-linecap="round"/>
  <path d="M256 190L236 175" stroke="#174C35" stroke-width="5" stroke-linecap="round"/>
  <path d="M256 220L276 205" stroke="#174C35" stroke-width="5" stroke-linecap="round"/>
  <circle cx="256" cy="275" r="7" fill="#174C35"/>
  <circle cx="256" cy="130" r="5" fill="#E9A23B"/>
</svg>`;
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgLogo);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPNG(32, 32, 23, 76, 53));

console.log('PWA icons and SVG generated successfully in public/');
