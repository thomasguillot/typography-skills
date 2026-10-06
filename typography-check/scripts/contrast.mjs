#!/usr/bin/env node
// Usage: node contrast.mjs TEXT BACKGROUND [--size PX] [--weight N] [--body]
// Colours: #rgb, #rrggbb, #rrggbbaa, rgb()/rgba(). Prints WCAG 2.x ratio and APCA Lc with thresholds.

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const [fgArg, bgArg] = args.filter((a, i) => !a.startsWith('--') && !['--size', '--weight'].includes(args[i - 1]));
if (!fgArg || !bgArg) {
  console.error('Usage: node contrast.mjs TEXT BACKGROUND [--size PX] [--weight N] [--body]');
  process.exit(1);
}
const size = Number(flag('--size', 16));
const weight = Number(flag('--weight', 400));
const isBody = args.includes('--body');

const parse = (s) => {
  s = s.trim();
  let m = s.match(/^#([0-9a-f]{3,8})$/i);
  if (m) {
    let h = m[1];
    if (h.length <= 4) h = [...h].map((c) => c + c).join('');
    const n = (i) => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  m = s.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  throw new Error(`Unrecognised colour: ${s}`);
};
const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const blend = (t, u) => ({ r: t.r * t.a + u.r * (1 - t.a), g: t.g * t.a + u.g * (1 - t.a), b: t.b * t.a + u.b * (1 - t.a), a: 1 });

const luminance = ({ r, g, b }) => {
  const c = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const apcaY = ({ r, g, b }) => {
  const y = 0.2126729 * (r / 255) ** 2.4 + 0.7151522 * (g / 255) ** 2.4 + 0.072175 * (b / 255) ** 2.4;
  return y > 0.022 ? y : y + (0.022 - y) ** 1.414;
};
const apcaLc = (fg, bg) => {
  const yt = apcaY(fg);
  const yb = apcaY(bg);
  if (Math.abs(yb - yt) < 0.0005) return 0;
  if (yb > yt) {
    const s = (yb ** 0.56 - yt ** 0.57) * 1.14;
    return s < 0.1 ? 0 : round((s - 0.027) * 100, 1);
  }
  const s = (yb ** 0.65 - yt ** 0.62) * 1.14;
  return s > -0.1 ? 0 : round((s + 0.027) * 100, 1);
};
const apcaRequired = () => Math.min(90, baseRequired() + (weight <= 300 ? 15 : 0));
const baseRequired = () => {
  const bold = weight >= 600;
  if (isBody) return size >= 18 || (size >= 16 && weight >= 500) ? 75 : 90;
  if (size >= 36 || (size >= 24 && bold)) return 45;
  if (size >= 24 || (size >= 16 && bold)) return 60;
  if (size >= 14) return 75;
  return 90;
};

const bg = blend(parse(bgArg), { r: 255, g: 255, b: 255, a: 1 });
const fg = blend(parse(fgArg), bg);
const l1 = luminance(fg) + 0.05;
const l2 = luminance(bg) + 0.05;
const ratio = round(Math.max(l1, l2) / Math.min(l1, l2));
const large = size >= 24 || (size >= 18.66 && weight >= 700);
const lc = apcaLc(fg, bg);
const required = apcaRequired();

console.log(JSON.stringify({
  text: fgArg,
  background: bgArg,
  sizePx: size,
  weight,
  body: isBody,
  wcag2: { ratio, AA: ratio >= (large ? 3 : 4.5), AAA: ratio >= (large ? 4.5 : 7), largeText: large },
  apca: { lc, required, pass: Math.abs(lc) >= required },
}, null, 2));
