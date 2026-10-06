import { launch, openAt, options } from './lib/browser.mjs';

const args = options();

if (args.help) {
  console.log(`Find horizontal overflow: whether the page scrolls sideways, and which elements
stick out of the viewport or have text spilling out of its box.

  node scripts/overflow.mjs [--url URL] [--widths 1280,1024,768,375]

Without --url it serves site/dist. Only the outermost offender in each subtree is listed.`);
  process.exit(0);
}

function find() {
  const vw = document.documentElement.clientWidth;
  const describe = (el) => {
    const cls = [...el.classList].map((c) => `.${c}`).join('');
    const text = el.textContent.trim().replace(/\s+/g, ' ');
    return `${el.tagName.toLowerCase()}${cls}${text ? ` "${text.length > 40 ? `${text.slice(0, 40)}…` : text}"` : ''}`;
  };
  const clipped = (el) => {
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.overflowX !== 'visible' || cs.clipPath !== 'none') return true;
    }
    return false;
  };

  const offenders = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (!el.checkVisibility() || clipped(el)) continue;
    if (offenders.some((o) => o.node.contains(el))) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const out = Math.max(r.right - vw, -r.left);
    if (out > 0.5) offenders.push({ node: el, el: describe(el), issue: `extends ${Math.round(out * 10) / 10}px past the viewport` });
  }

  const range = document.createRange();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    if (!t.data.trim()) continue;
    let box = t.parentElement;
    while (box && ['inline', 'contents'].includes(getComputedStyle(box).display)) box = box.parentElement;
    if (!box || !box.checkVisibility() || clipped(box) || getComputedStyle(box).overflowX !== 'visible') continue;
    if (offenders.some((o) => o.node.contains(box))) continue;
    range.selectNodeContents(t);
    const b = box.getBoundingClientRect();
    const spill = Math.max(...[...range.getClientRects()].map((r) => Math.max(r.right - b.right, b.left - r.left)), 0);
    if (spill > 1) offenders.push({ node: box, el: describe(box), issue: `text spills ${Math.round(spill * 10) / 10}px out of its box` });
  }
  return {
    scrolls: document.documentElement.scrollWidth > vw,
    scrollWidth: document.documentElement.scrollWidth,
    vw,
    offenders: offenders.map(({ el, issue }) => ({ el, issue })),
  };
}

const session = await launch(args.url);
let failed = 0;
try {
  for (const width of args.widths) {
    const view = await openAt(session, width);
    const { scrolls, scrollWidth, vw, offenders } = await view.page.evaluate(find);
    await view.close();
    failed += (scrolls ? 1 : 0) + offenders.length;
    console.log(
      `${width}px: ${scrolls ? `page scrolls sideways (${scrollWidth}px in ${vw}px)` : 'no horizontal scroll'}, ${offenders.length} offending elements`,
    );
    for (const o of offenders) console.log(`  ✗ ${o.el}: ${o.issue}`);
  }
} finally {
  await session.close();
}
process.exit(failed ? 1 : 0);
