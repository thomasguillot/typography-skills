#!/usr/bin/env node
// Usage: node scale.mjs [--medium web|print] [--base N] [--base-max N] [--ratio R] [--ratio-max R]
//   [--ratio-down R] [--compare r1,r2,r3] [--viewports 375,1280] [--down 2] [--up 6] [--grid N] [--k N] [--prefix text] [--format table|css|json|tailwind|spec]
// Web sizes are px, print sizes are pt. Ratios accept a number or a name (major-third, perfect-fourth...).

const RATIOS = {
  'minor-second': 1.067,
  'major-second': 1.125,
  'minor-third': 1.2,
  'major-third': 1.25,
  'perfect-fourth': 1.333,
  'augmented-fourth': 1.414,
  'perfect-fifth': 1.5,
  golden: 1.618,
};
const NAMES_DOWN = ['sm', 'xs', '2xs', '3xs'];
const NAMES_UP = ['lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl'];

const argv = process.argv.slice(2);
const KNOWN = ['medium', 'base', 'base-max', 'ratio', 'ratio-max', 'ratio-down', 'compare', 'viewports', 'down', 'up', 'grid', 'k', 'prefix', 'format'];
const USAGE = `Usage: node scale.mjs [options]
  --medium web|print       web uses px and rem, print uses pt (default web)
  --base N                 body size: px for web, pt for print (default 18 / 10.5)
  --base-max N             body size at the widest viewport, for fluid web scales
  --ratio R                ratio as a number or name: ${Object.keys(RATIOS).join(', ')}
  --ratio-max R            ratio at the widest viewport (fluid web only)
  --ratio-down R           ratio for steps below body (default 1.125 web, 1.1 print)
  --compare r1,r2,r3       show several ratios side by side and exit
  --viewports 375,1280     narrowest and widest viewport for fluid sizes
  --down N --up N          steps below and above body (default 2 and 6 web, 2 and 4 print;
                           at most ${NAMES_DOWN.length} down and ${NAMES_UP.length} up)
  --grid N|auto            baseline grid unit; leading snaps to the nearest line, at least 1.05x
                           the size, half a line for loose headings (print default: body leading)
  --k N                    body face (ascent - descent) / 2 per em; adds baseline snapping CSS
  --prefix NAME            custom property prefix (default text)
  --format F               table, css, json, tailwind or spec (default table); json is plain
                           JSON with CSS values per step, not W3C design tokens (DTCG)
Checks print to stderr: a warning breaks a typography-check rule, a note is informational.`;
if (argv.includes('--help') || argv.includes('-h')) {
  console.log(USAGE);
  process.exit(0);
}
for (const a of argv) {
  if (a.startsWith('--') && !KNOWN.includes(a.slice(2))) {
    console.error(`Unknown option ${a}\n\n${USAGE}`);
    process.exit(1);
  }
}
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const ratioOf = (v) => (v in RATIOS ? RATIOS[v] : Number(v));

const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};
const medium = opt('medium', 'web');
if (medium !== 'web' && medium !== 'print') fail(`--medium must be web or print, not ${medium}.`);
const print = medium === 'print';
if (print && (argv.includes('--base-max') || argv.includes('--ratio-max'))) fail('--base-max and --ratio-max are for fluid web scales; print sizes are fixed. Drop them or use --medium web.');
const base = Number(opt('base', print ? 10.5 : 18));
const baseMax = Number(opt('base-max', base));
const ratio = ratioOf(opt('ratio', print ? 'minor-third' : 'major-third'));
const ratioMax = ratioOf(opt('ratio-max', opt('ratio', print ? 'minor-third' : 'major-third')));
const ratioDown = ratioOf(opt('ratio-down', print ? 1.1 : 1.125));
const [vwMin, vwMax] = opt('viewports', '375,1280').split(',').map(Number);
const down = Number(opt('down', 2));
const up = Number(opt('up', print ? 4 : 6));
const gridArg = opt('grid', print ? 'auto' : null);
const k = opt('k', null);
const prefix = opt('prefix', 'text');
const format = opt('format', 'table');
const unit = print ? 'pt' : 'px';

const ratioNames = 'Named ratios: ' + Object.keys(RATIOS).join(', ');
if (!(base > 0) || !(baseMax > 0) || !(ratio > 1) || !(ratioMax > 1)) fail(`Need --base and --base-max > 0 and ratios > 1. ${ratioNames}`);
if (!(ratioDown > 1)) fail(`Need --ratio-down > 1: steps below body divide by it. ${ratioNames}`);
if (!Number.isInteger(down) || down < 0 || down > NAMES_DOWN.length) fail(`--down must be a whole number from 0 to ${NAMES_DOWN.length} (${NAMES_DOWN.join(', ')}).`);
if (!Number.isInteger(up) || up < 1 || up > NAMES_UP.length) fail(`--up must be a whole number from 1 to ${NAMES_UP.length} (${NAMES_UP.join(', ')}).`);
if (gridArg !== null && gridArg !== 'auto' && !(Number(gridArg) > 0)) fail('--grid must be a number above 0 or auto.');
if (k !== null && !Number.isFinite(Number(k))) fail('--k must be a number.');
if (!print && (baseMax !== base || ratioMax !== ratio) && !(vwMin > 0 && vwMax > vwMin)) fail('--viewports needs two widths, narrowest first, e.g. 375,1280.');

const r2 = (n) => Math.round(n * 100) / 100;
const r4 = (n) => Math.round(n * 10000) / 10000;
const half = (n) => Math.round(n * 2) / 2;

const targetLeading = (step, size) => {
  if (step <= 0) return print ? 1.333 : 1.5;
  const t = Math.min(1, Math.max(0, Math.log(size / base) / Math.log(4)));
  return print ? 1.333 - 0.283 * t : 1.5 - 0.45 * t;
};
const tracking = (size) => {
  const t = size / base;
  if (t >= 4) return -0.03;
  if (t >= 2.5) return -0.02;
  if (t >= 1.6) return -0.01;
  if (t < 0.8) return 0.01;
  return 0;
};

const bodyLeading = print ? half(base * targetLeading(0, base)) : base * targetLeading(0, base);
const grid = gridArg === 'auto' ? bodyLeading : gridArg ? Number(gridArg) : null;
const snapTo = (size, lh, unitSize) => {
  let leading = Math.round((size * lh) / unitSize) * unitSize;
  if (leading < size * 1.05) leading = Math.ceil((size * 1.05) / unitSize) * unitSize;
  return leading;
};
const looseBy = 0.2;
const snap = (step, size, lh) => {
  if (!grid) return null;
  const full = snapTo(size, lh, grid);
  if (step > 0 && full / size > lh + looseBy) {
    const halfLine = snapTo(size, lh, grid / 2);
    if (halfLine < full) return { leading: halfLine, half: true };
  }
  return { leading: full, half: false };
};

const steps = [];
for (let i = -down; i <= up; i++) {
  const name = i === 0 ? 'base' : i < 0 ? NAMES_DOWN[-i - 1] : NAMES_UP[i - 1];
  const rawMin = i < 0 ? base * ratioDown ** i : base * ratio ** i;
  const min = print ? half(rawMin) : rawMin;
  const max = print ? min : i < 0 ? baseMax * ratioDown ** i : baseMax * ratioMax ** i;
  const lh = r4(targetLeading(i, max));
  const sMin = snap(i, min, lh);
  const sMax = snap(i, max, lh);
  steps.push({ step: i, name, min: r2(min), max: r2(max), lh, leading: r2(lh), tracking: tracking(max), snappedMin: sMin?.leading, snappedMax: sMax?.leading, half: Boolean(sMax?.half || sMin?.half) });
}

const ups = steps.filter((s) => s.step > 0).reverse();
const roles = {};
['h1', 'h2', 'h3', 'h4', 'h5'].forEach((h, i) => {
  const s = ups[i + (ups.length >= 6 ? 1 : 0)];
  if (s) roles[h] = s.name;
});
['h1', 'h2', 'h3', 'h4', 'h5'].forEach((h) => {
  if (!roles[h]) roles[h] = 'base';
});
roles.h6 = 'base';
if (ups.length >= 6) roles.display = ups[0].name;
roles.lede = steps.find((s) => s.step === 1)?.name;
roles.body = 'base';
roles.small = steps.find((s) => s.step === -1)?.name;
roles.label = steps.find((s) => s.step === -2)?.name ?? roles.small;
const roleOf = (name) => Object.entries(roles).filter(([, v]) => v === name).map(([r]) => r).join(', ');

const warnings = [];
const notes = [];
if (!print && base < 16) warnings.push(`web/body-size: body ${base}px is below 16px.`);
if (print && (base < 9.5 || base > 11.5)) warnings.push(`print/body-size: body ${base}pt is outside 9.5 to 11.5pt for book work (8 to 9pt is fine for editorial with a large x-height).`);
if (ratio < 1.15) warnings.push(`shared/hierarchy-levels: ratio ${ratio} gives adjacent steps under 1.15x apart; lean on weight or color to separate levels. For dense UI that resolves it; the ratio can stay.`);
const smallest = steps[0];
if (!print && smallest.min < 12) warnings.push(`web/body-size: ${smallest.name} is ${r2(smallest.min)}px at the narrowest viewport, below the ~12px floor.`);
if (print && smallest.min < 6) warnings.push(`print/small-sizes: ${smallest.name} is ${r2(smallest.min)}pt, below 6pt.`);
for (const s of steps) {
  if (grid && s.step > 0) {
    const loose = s.snappedMax / s.max;
    if (loose > s.leading + 0.2) {
      const tighter = s.snappedMax - grid;
      const hint = tighter > 0 ? ` A size of ${r2(tighter / 1.05)}${unit} or less fits ${r2(tighter)}${unit}.` : ' It is a single grid line already; only a smaller grid tightens it.';
      warnings.push(`${print ? 'print' : 'web'}/leading: ${s.name} at ${s.max}${unit} snaps to ${r2(s.snappedMax)}${unit} leading (${r2(loose)}), which is loose.${hint}`);
    }
  }
  if (grid && s.step < 0 && s.snappedMax / s.max > 1.7) notes.push(`${print ? 'print' : 'web'}/leading: ${s.name} sits on ${r2(s.snappedMax)}${unit} leading (${r2(s.snappedMax / s.max)}): fine for one-line labels, loose for paragraphs.`);
  if (!print && s.max / s.min > 2.5) warnings.push(`web/fluid-type: ${s.name} grows ${r2(s.max / s.min)}x between viewports; keep it under 2.5x.`);
}

const rem = (px) => `${r4(px / 16)}rem`;
const sizeCss = (s) => {
  if (print || s.min === s.max) return print ? `${s.min}pt` : rem(s.min);
  const slope = (s.max - s.min) / (vwMax - vwMin);
  const intercept = s.min - slope * vwMin;
  const lo = Math.min(s.min, s.max);
  const hi = Math.max(s.min, s.max);
  return `clamp(${rem(lo)}, ${rem(intercept)} + ${r4(slope * 100)}vw, ${rem(hi)})`;
};
const gridVar = `var(--${prefix}-grid)`;
const gridLiteral = grid && (print ? `${r2(grid)}pt` : rem(grid));
const snapCss = (lh, g) => `max(round(nearest, ${lh}em, ${g}), round(up, 1.05em, ${g}))`;
const leadingCss = (s, g = gridVar) => {
  if (!grid) return String(s.leading);
  if (print) return `${s.snappedMax}pt`;
  if (s.min === s.max) {
    const lines = r4(s.snappedMax / grid);
    return lines === 1 ? g : `calc(${g} * ${lines})`;
  }
  const full = snapCss(s.lh, g);
  if (s.step <= 0) return full;
  const halfLine = `min(${full}, ${snapCss(s.lh, `calc(${g} / 2)`)})`;
  return `max(${halfLine}, ${full} - max(0px, (${full} - ${r4(s.lh + looseBy)}em) * 1000000))`;
};

if (opt('compare', null)) {
  const list = opt('compare', '').split(',').map((r) => r.trim()).filter(Boolean);
  const unknown = list.filter((r) => !(ratioOf(r) > 1));
  if (unknown.length) fail(`--compare got ${unknown.join(', ')}; use numbers above 1 or names. ${ratioNames}`);
  const names = steps.slice().reverse().map((s) => s.name);
  const cols = list.map((r) => {
    const q = ratioOf(r);
    return names.map((n) => {
      const i = steps.find((s) => s.name === n).step;
      const at = (b) => (i < 0 ? b * ratioDown ** i : b * q ** i);
      const lo = at(base);
      const hi = at(baseMax);
      if (print) return `${half(lo)}${unit}`;
      return r2(lo) === r2(hi) ? `${r2(hi)}${unit}` : `${r2(lo)} to ${r2(hi)}${unit}`;
    });
  });
  const head = ['step', ...list.map((r) => `${r} (${ratioOf(r)})`)];
  const rows = names.map((n, j) => [n, ...cols.map((c) => c[j])]);
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (cells) => '| ' + cells.map((c, i) => c.padEnd(widths[i])).join(' | ') + ' |';
  console.log(`Comparison at body ${base}${baseMax !== base ? ` to ${baseMax}` : ''}${unit}${baseMax !== base ? ` (${vwMin} to ${vwMax}px viewports)` : ''}; steps below body use ${ratioDown}`);
  console.log(line(head));
  console.log('| ' + widths.map((w) => '-'.repeat(w)).join(' | ') + ' |');
  rows.forEach((r) => console.log(line(r)));
  process.exit(0);
} else if (format === 'table') {
  const rows = steps.slice().reverse().map((s) => {
    const size = print || s.min === s.max ? `${s.min}${unit}` : `${s.min} to ${s.max}${unit}`;
    const lead = grid ? (s.snappedMin === s.snappedMax ? `${r2(s.snappedMin)}${unit}` : `${r2(s.snappedMin)} to ${r2(s.snappedMax)}${unit}`) + (s.half ? ' (half line)' : '') : `${s.leading}`;
    return [s.name, size, lead, s.tracking ? `${s.tracking}em` : '0', roleOf(s.name)];
  });
  const head = ['step', 'size', grid ? 'leading (snapped)' : 'line-height', 'tracking', 'roles'];
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (cells) => '| ' + cells.map((c, i) => c.padEnd(widths[i])).join(' | ') + ' |';
  console.log(`${medium} scale: base ${base}${baseMax !== base ? ` to ${baseMax}` : ''}${unit}, ratio ${ratio}${ratioMax !== ratio ? ` to ${ratioMax}` : ''}${print ? '' : `, viewports ${vwMin} to ${vwMax}px`}${grid ? `, baseline grid ${r2(grid)}${unit}` : ''}`);
  console.log(line(head));
  console.log('| ' + widths.map((w) => '-'.repeat(w)).join(' | ') + ' |');
  rows.forEach((r) => console.log(line(r)));
} else if (format === 'css') {
  const out = [':root {'];
  if (grid) out.push(`  --${prefix}-grid: ${gridLiteral};`);
  if (k && grid) out.push(`  --${prefix}-k: ${k};`);
  for (const s of steps) {
    out.push(`  --${prefix}-${s.name}: ${sizeCss(s)};`);
    out.push(`  --leading-${s.name}: ${leadingCss(s)};`);
    if (s.tracking) out.push(`  --tracking-${s.name}: ${s.tracking}em;`);
  }
  out.push('}', '');
  for (const h of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
    const s = steps.find((x) => x.name === roles[h]);
    out.push(`${h} {`, `  font-size: var(--${prefix}-${s.name});`, `  line-height: var(--leading-${s.name});`);
    if (s.tracking) out.push(`  letter-spacing: var(--tracking-${s.name});`);
    out.push('}', '');
  }
  if (k && grid && !print) {
    out.push(
      ':where(h1, h2, h3, h4, h5, h6, p, li, dt, dd, th, td, figcaption, blockquote):not(:has(h1, h2, h3, h4, h5, h6, p, li, dt, dd, div, table, ul, ol, dl)) {',
      `  --baseline: calc(0.5lh + var(--${prefix}-k) * 1em);`,
      `  position: relative;`,
      `  top: calc(round(nearest, var(--baseline), var(--${prefix}-grid)) - var(--baseline));`,
      '}',
      '',
      ':not(pre) > code, kbd, sup, sub {',
      '  line-height: 1;',
      '}',
    );
  }
  console.log(out.join('\n').trimEnd());
} else if (format === 'json') {
  const tokens = { grid: grid ? gridLiteral : null, steps: {}, roles };
  for (const s of steps) {
    tokens.steps[s.name] = { fontSize: sizeCss(s), lineHeight: leadingCss(s, gridLiteral), letterSpacing: `${s.tracking}em`, min: `${s.min}${unit}`, max: `${s.max}${unit}` };
  }
  console.log(JSON.stringify(tokens, null, 2));
} else if (format === 'tailwind') {
  const fontSize = {};
  for (const s of steps) fontSize[s.name] = [sizeCss(s), { lineHeight: leadingCss(s, gridLiteral), letterSpacing: `${s.tracking}em` }];
  const entries = Object.entries(fontSize).map(([k2, [size, meta]]) => `        ${/^\d/.test(k2) ? `'${k2}'` : k2}: ['${size}', { lineHeight: '${meta.lineHeight}', letterSpacing: '${meta.letterSpacing}' }],`);
  const heads = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((h) => `  ${h} { @apply text-${roles[h]}; }`);
  const others = [['Lede', roles.lede], ['Small', roles.small], ['Label', roles.label]].filter(([, v]) => v).map(([l, v]) => ` ${l}: text-${v}.`).join('');
  const gridNote = grid && !print ? `// Line heights snap to the ${r2(grid)}${unit} grid (${gridLiteral}) on their own; no custom property is needed.\n` : '';
  console.log(`// tailwind.config.js\n${gridNote}export default {\n  theme: {\n    extend: {\n      fontSize: {\n${entries.join('\n')}\n      },\n    },\n  },\n};\n\n/* Base layer: heading roles.${others} */\n@layer base {\n${heads.join('\n')}\n}`);
} else if (format === 'spec') {
  const labels = { display: 'Display', h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3', h4: 'Heading 4', h5: 'Heading 5', h6: 'Heading 6', lede: 'Lede', body: 'Body', small: 'Caption', label: 'Label' };
  for (const [role, name] of Object.entries(roles)) {
    const s = steps.find((x) => x.name === name);
    if (!s) continue;
    const lead = r2(grid ? s.snappedMax : s.max * s.leading);
    const track = s.tracking ? `, tracking ${Math.round(s.tracking * 1000)}` : '';
    console.log(`${(labels[role] || role).padEnd(10)} ${s.max}/${lead}${unit === 'pt' ? 'pt' : 'px'}${track}`);
  }
} else {
  console.error(`Unknown --format ${format}`);
  process.exit(1);
}

if (warnings.length || notes.length) {
  console.error('\nChecks against typography-check rules:');
  warnings.forEach((w) => console.error(`- warning: ${w}`));
  notes.forEach((n) => console.error(`- note: ${n}`));
}
