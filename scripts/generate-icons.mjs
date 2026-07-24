// Membuat ikon PWA placeholder (PNG) tanpa dependensi: monogram krem di atas merah merek.
// Ganti dengan aset final dari desainer bila sudah tersedia. Jalankan: node scripts/generate-icons.mjs
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const BG = [0xc9, 0x2d, 0x31]; // action.primary
const FG = [0xf8, 0xf6, 0xf2]; // action.onAction

// Bitmap 7x7 huruf "T" dan "R" — di-upscale ke ukuran ikon.
const GLYPHS = [
  ["1111111", "0011000", "0011000", "0011000", "0011000", "0011000", "0011000"],
  ["1111100", "1000010", "1000010", "1111100", "1001000", "1000100", "1000010"],
];

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, { padding }) {
  // Area monogram: 2 glyph 7x7 berdampingan dengan 1 kolom pemisah = 15x7 sel.
  const inner = size * (1 - 2 * padding);
  const cell = Math.floor(inner / 15);
  const glyphW = cell * 15;
  const glyphH = cell * 7;
  const x0 = Math.floor((size - glyphW) / 2);
  const y0 = Math.floor((size - glyphH) / 2);

  const raw = Buffer.alloc(size * (size * 3 + 1));
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      let color = BG;
      const gx = Math.floor((x - x0) / cell);
      const gy = Math.floor((y - y0) / cell);
      if (gx >= 0 && gx < 15 && gy >= 0 && gy < 7) {
        const glyph = gx < 7 ? GLYPHS[0] : gx > 7 ? GLYPHS[1] : null;
        const col = gx < 7 ? gx : gx - 8;
        if (glyph && glyph[gy][col] === "1") color = FG;
      }
      raw[p++] = color[0];
      raw[p++] = color[1];
      raw[p++] = color[2];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolor

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", png(192, { padding: 0.18 }));
writeFileSync("public/icons/icon-512.png", png(512, { padding: 0.18 }));
// Maskable: padding lebih besar agar aman di safe zone 80%.
writeFileSync("public/icons/icon-maskable-512.png", png(512, { padding: 0.28 }));
console.log("Ikon PWA dibuat di public/icons/");
