#!/usr/bin/env node
// Usage: node contrast.mjs TEXT BACKGROUND [--size PX] [--weight N] [--body]
// Colors: #rgb, #rgba, #rrggbb, #rrggbbaa, rgb()/rgba() with numbers or percentages, basic named colors.
// Prints WCAG 2.x ratio and APCA Lc with thresholds.

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const USAGE = 'Usage: node contrast.mjs TEXT BACKGROUND [--size PX] [--weight N] [--body]\nColors: #rgb, #rgba, #rrggbb, #rrggbbaa, rgb(0 0 0 / 50%), rgba(0, 0, 0, 0.5), or a basic name such as black.';
const fail = (msg) => {
  console.error(`${msg}\n${USAGE}`);
  process.exit(1);
};
const [fgArg, bgArg] = args.filter((a, i) => !a.startsWith('--') && !['--size', '--weight'].includes(args[i - 1]));
if (!fgArg || !bgArg) fail('Need a text and a background color.');
const size = Number(flag('--size', 16));
const weight = Number(flag('--weight', 400));
const isBody = args.includes('--body');

const NAMED = {
  black: '000', white: 'fff', gray: '808080', grey: '808080', silver: 'c0c0c0', red: 'f00', maroon: '800000', orange: 'ffa500', yellow: 'ff0',
  olive: '808000', lime: '0f0', green: '008000', aqua: '0ff', cyan: '0ff', teal: '008080', blue: '00f', navy: '000080', fuchsia: 'f0f', magenta: 'f0f', purple: '800080',
};
const parse = (s) => {
  s = s.trim().toLowerCase();
  if (NAMED[s]) s = `#${NAMED[s]}`;
  let m = s.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/);
  if (m) {
    let h = m[1];
    if (h.length <= 4) h = [...h].map((c) => c + c).join('');
    const n = (i) => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  m = s.match(/^rgba?\(([^)]+)\)$/);
  const p = m?.[1].split(/[\s,/]+/).filter(Boolean);
  if (p && (p.length === 3 || p.length === 4)) {
    const num = (v, scale) => (v.endsWith('%') ? (parseFloat(v) / 100) * scale : Number(v));
    const [r, g, b] = p.slice(0, 3).map((v) => Math.min(255, Math.max(0, num(v, 255))));
    const a = p[3] === undefined ? 1 : Math.min(1, Math.max(0, num(p[3], 1)));
    if ([r, g, b, a].every(Number.isFinite)) return { r, g, b, a };
  }
  fail(`Unrecognized color: ${s}`);
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
const rawRatio = Math.max(l1, l2) / Math.min(l1, l2);
const ratio = round(rawRatio);
const large = size >= 24 || (size >= 18.66 && weight >= 700);
const lc = apcaLc(fg, bg);
const required = apcaRequired();

console.log(JSON.stringify({
  text: fgArg,
  background: bgArg,
  sizePx: size,
  weight,
  body: isBody,
  wcag2: { ratio, AA: rawRatio >= (large ? 3 : 4.5), AAA: rawRatio >= (large ? 4.5 : 7), largeText: large },
  apca: { lc, required, pass: Math.abs(lc) >= required },
}, null, 2));
