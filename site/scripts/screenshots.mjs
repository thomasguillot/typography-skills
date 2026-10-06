import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { SITE, launch, openAt, options } from './lib/browser.mjs';

const args = options({
  out: { type: 'string', default: join(SITE, 'screenshots') },
  grid: { type: 'boolean' },
  full: { type: 'boolean' },
}, [1280, 375]);

if (args.help) {
  console.log(`Screenshot the masthead, each section and the footer, one PNG per block per width.

  node scripts/screenshots.mjs [--url URL] [--widths 1280,375] [--out DIR] [--grid] [--full]

--grid turns on the column and baseline overlays. --full adds a full-page capture.
Output defaults to site/screenshots/, which is ignored by git.`);
  process.exit(0);
}

const out = resolve(args.out);
await mkdir(out, { recursive: true });
const session = await launch(args.url);
const written = [];
try {
  for (const width of args.widths) {
    const view = await openAt(session, width);
    const { page } = view;
    if (args.grid) await page.evaluate(() => (document.documentElement.dataset.grid = 'on'));
    await page.addStyleTag({
      content: '*, *::before, *::after { transition: none !important; } .columns-overlay { position: absolute; }',
    });
    const blocks = await page.$$('body > header, main > section, body > footer');
    for (const [i, block] of blocks.entries()) {
      const name = await block.evaluate(
        (el, i) => el.getAttribute('aria-labelledby') || el.className.split(/\s+/)[0] || `block-${i}`,
        i,
      );
      const file = join(out, `${width}-${String(i).padStart(2, '0')}-${name}.png`);
      await block.screenshot({ path: file });
      written.push(file);
    }
    if (args.full) {
      const file = join(out, `${width}-full.png`);
      await page.screenshot({ path: file, fullPage: true });
      written.push(file);
    }
    await view.close();
  }
} finally {
  await session.close();
}
console.log(written.join('\n'));
