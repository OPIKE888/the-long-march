// 离线抠图：品红底 -> 透明 PNG，按连通列拆分走路两帧，最近邻缩放到目标像素格。
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function decodePNG(file) {
  const b = fs.readFileSync(file);
  let pos = 8, w = 0, h = 0, depth = 0, ct = 0, inter = 0;
  const idat = [];
  while (pos < b.length) {
    const len = b.readUInt32BE(pos);
    const type = b.toString('ascii', pos + 4, pos + 8);
    const data = b.slice(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ct = data[9]; inter = data[12]; }
    else if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
  }
  if (depth !== 8 || inter !== 1 && inter !== 0) throw new Error('unsupported png ' + depth + '/' + inter);
  if (inter !== 0) throw new Error('interlaced unsupported');
  const bpp = ct === 6 ? 4 : ct === 2 ? 3 : (() => { throw new Error('ct ' + ct); })();
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const out = Buffer.alloc(h * stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[p++];
    for (let x = 0; x < stride; x++) {
      const v = raw[p + x];
      const a = x >= bpp ? out[y * stride + x - bpp] : 0;
      const bb = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = (x >= bpp && y > 0) ? out[(y - 1) * stride + x - bpp] : 0;
      let r;
      if (f === 0) r = v;
      else if (f === 1) r = v + a;
      else if (f === 2) r = v + bb;
      else if (f === 3) r = v + ((a + bb) >> 1);
      else {
        const pa = Math.abs(bb - c), pb = Math.abs(a - c), pc = Math.abs(a + bb - 2 * c);
        r = v + (pa <= pb && pa <= pc ? a : pb <= pc ? bb : c);
      }
      out[y * stride + x] = r & 0xff;
    }
    p += stride;
  }
  return { w, h, bpp, px: out };
}
function encodePNG(w, h, rgba) {
  const stride = w * 4;
  const raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))
  ]);
}
function isBg(r, g, b, ref) {
  if (Math.abs(r - ref[0]) < 48 && Math.abs(g - ref[1]) < 48 && Math.abs(b - ref[2]) < 48) return true;
  if (r > 180 && g < 160 && b > 140 && r - g > 60 && b - g > 40) return true; // 品红光晕
  if (r < 210 && g < 110 && b > 70 && b - g > 40 && r - g > 40) return true;  // 品红上的紫阴影/暗光晕
  if (r > 200 && b > 190 && g < 230 && r - g > 40 && b - g > 30) return true; // 浅品红光晕
  return false;
}
function mask(img) {
  const { w, h, bpp, px } = img;
  const ref = [px[0], px[1], px[2]];
  const m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (x > w * 0.84 && y > h * 0.93) continue; // 水印区
    const i = (y * w + x) * bpp;
    m[y * w + x] = isBg(px[i], px[i + 1], px[i + 2], ref) ? 0 : 1;
  }
  return m;
}
function components(m, w, h, cuts) {
  const cols = new Uint8Array(w);
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) if (m[y * w + x]) { cols[x] = 1; break; }
  (cuts || []).forEach(cx => { for (let x = cx - 6; x <= cx + 6; x++) if (x >= 0 && x < w) cols[x] = 0; });
  const spans = [];
  let s = -1, gap = 0;
  for (let x = 0; x < w; x++) {
    if (cols[x]) { if (s < 0) s = x; gap = 0; }
    else if (s >= 0) { gap++; if (gap > 12) { spans.push([s, x - gap]); s = -1; } }
  }
  if (s >= 0) spans.push([s, w - 1]);
  return spans.filter(sp => sp[1] - sp[0] > 8).map(([x0, x1]) => {
    let y0 = h, y1 = 0;
    for (let y = 0; y < h; y++) for (let x = x0; x <= x1; x++) if (m[y * w + x]) { if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return { x0, x1, y0, y1 };
  });
}
function extract(img, m, box, targetH) {
  const { w, bpp, px } = img;
  const bw = box.x1 - box.x0 + 1, bh = box.y1 - box.y0 + 1;
  const tw = Math.max(4, Math.round(bw / bh * targetH)), th = targetH;
  const out = Buffer.alloc(tw * th * 4);
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const sx = box.x0 + Math.min(bw - 1, Math.floor(x * bw / tw));
    const sy = box.y0 + Math.min(bh - 1, Math.floor(y * bh / th));
    const si = (sy * w + sx) * bpp, di = (y * tw + x) * 4;
    if (m[sy * w + sx]) { out[di] = px[si]; out[di + 1] = px[si + 1]; out[di + 2] = px[si + 2]; out[di + 3] = 255; }
  }
  return { w: tw, h: th, rgba: out };
}

const root = path.join(__dirname, '..');
const jobs = [
  ['spr-walk-v4', 32, 2],
  ['spr-flag', 48, 1],
  ['spr-restseq-v2', [32, 26, 20, 22, 22], 5, [1410]],
  ['spr-enemy-v3', [32, 32], 2]
];
const names = {
  'spr-walk-v4': ['spr-walk-a', 'spr-walk-b'],
  'spr-flag': ['spr-flag'],
  'spr-restseq-v2': ['spr-stand', 'spr-rest-1', 'spr-rest-2', 'spr-rest', 'spr-rest-b'],
  'spr-enemy-v3': ['spr-enemy', 'spr-enemy-b']
};
for (const [base, ths, expect, cuts] of jobs) {
  const src = fs.readdirSync(path.join(root, 'vibe_images')).filter(f => f.startsWith(base + '_')).sort().pop();
  const img = decodePNG(path.join(root, 'vibe_images', src));
  const m = mask(img);
  const comps = components(m, img.w, img.h, cuts);
  if (comps.length !== expect) throw new Error(base + ' components=' + comps.length + ' want ' + expect);
  comps.forEach((c, i) => {
    const r = extract(img, m, c, Array.isArray(ths) ? ths[i] : ths);
    const out = path.join(root, 'assets', 'web', names[base][i] + '.png');
    fs.writeFileSync(out, encodePNG(r.w, r.h, r.rgba));
    console.log(names[base][i], r.w + 'x' + r.h);
  });
}