import { launch, openAt, options } from './lib/browser.mjs';

const OPTICAL = {
  '.command__copy': 'Copy buttons are centred optically against their step, not set on the grid.',
  '.button': 'The button sits on the grid; its label is centred optically in the box.',
  '.page-sheet': 'The print page specimen is set on its own 13pt leading.',
};

const args = options({ tolerance: { type: 'string', default: '1' }, verbose: { type: 'boolean', short: 'v' } });

if (args.help) {
  console.log(`Check that every line of text sits on the 27px baseline grid.

Each text block gets a zero-height inline-block probe, inside a temporary span
around its first and last runs of text, before the first and after the last
character; the probe's bottom edge is the line's baseline, measured from
the top of <body> modulo --line.

  node scripts/baseline.mjs [--url URL] [--widths 1280,1024,768,375] [--tolerance 1] [-v]

Without --url it serves site/dist. The default tolerance is 1px: table cells round
their nudge to whole pixels. Selectors in OPTICAL are deliberate departures from
the grid; they are skipped, and -v lists them with their reason.`);
  process.exit(0);
}

function probe({ exceptions, tolerance }) {
  const px = (value) => {
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;height:${value}`;
    document.body.append(el);
    const h = el.getBoundingClientRect().height;
    el.remove();
    return h;
  };
  const line = px('var(--line)');
  const origin = document.body.getBoundingClientRect().top + scrollY;

  const shown = (el) => {
    if (!el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) return false;
    if (el.getBoundingClientRect().bottom + scrollY <= 0) return false;
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const r = n.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1) return false;
    }
    return true;
  };

  const blocks = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    if (!t.data.trim()) continue;
    let el = t.parentElement;
    while (el && ['inline', 'contents'].includes(getComputedStyle(el).display)) el = el.parentElement;
    if (!el || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue;
    if (!blocks.has(el)) blocks.set(el, []);
    blocks.get(el).push(t);
  }

  const marker = document.createElement('span');
  marker.style.cssText = 'display:inline-block;width:0;height:0;margin:0;padding:0;border:0;vertical-align:baseline';
  const baselineAt = (text, where) => {
    const wrap = document.createElement('span');
    text.before(wrap);
    wrap.append(text);
    const m = marker.cloneNode();
    where === 'first' ? wrap.prepend(m) : wrap.append(m);
    const y = m.getBoundingClientRect().bottom + scrollY - origin;
    wrap.before(text);
    wrap.remove();
    return y;
  };
  const describe = (el) => {
    const cls = [...el.classList].map((c) => `.${c}`).join('');
    const text = el.textContent.trim().replace(/\s+/g, ' ');
    return `${el.tagName.toLowerCase()}${cls} "${text.length > 40 ? `${text.slice(0, 40)}…` : text}"`;
  };

  const checked = [];
  const skipped = [];
  for (const [el, texts] of blocks) {
    if (!shown(el)) continue;
    const rule = exceptions.find((s) => el.closest(s));
    if (rule) {
      skipped.push({ el: describe(el), rule });
      continue;
    }
    const lines = ['first', 'last'].map((where) => {
      const y = baselineAt(where === 'first' ? texts[0] : texts.at(-1), where);
      const off = ((y % line) + line) % line;
      return { where, y: Math.round(y * 100) / 100, off: Math.round(Math.min(off, line - off) * 100) / 100 };
    });
    checked.push({ el: describe(el), lines, ok: lines.every((l) => l.off <= tolerance) });
  }
  return { line, checked, skipped };
}

const session = await launch(args.url);
let failed = 0;
try {
  for (const width of args.widths) {
    const view = await openAt(session, width);
    const { line, checked, skipped } = await view.page.evaluate(probe, {
      exceptions: Object.keys(OPTICAL),
      tolerance: Number(args.tolerance),
    });
    await view.close();
    const bad = checked.filter((c) => !c.ok);
    const worst = Math.max(...checked.flatMap((c) => c.lines.map((l) => l.off)));
    failed += bad.length;
    console.log(
      `${width}px: ${checked.length - bad.length}/${checked.length} text blocks on the ${line}px grid (worst ${worst}px), ${skipped.length} optical exceptions`,
    );
    for (const c of bad) {
      const where = c.lines.filter((l) => l.off > Number(args.tolerance)).map((l) => `${l.where} line ${l.off}px off at y=${l.y}`);
      console.log(`  ✗ ${c.el}: ${where.join(', ')}`);
    }
    if (args.verbose) for (const s of skipped) console.log(`  ~ ${s.el}: ${OPTICAL[s.rule]}`);
  }
} finally {
  await session.close();
}
process.exit(failed ? 1 : 0);
