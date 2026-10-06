import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SITE, launch, openAt, options } from './lib/browser.mjs';

const args = options({ out: { type: 'string' } }, [1280, 375]);

if (args.help) {
  console.log(`Run typography-check's extract-web-type.js against the page and print its JSON,
keyed by width and color scheme. Dark is added when the page has dark-mode rules.

  node scripts/type.mjs [--url URL] [--widths 1280,375] [--out FILE]`);
  process.exit(0);
}

const source = await readFile(join(SITE, '../typography-check/scripts/extract-web-type.js'), 'utf8');
const session = await launch(args.url);
const results = {};
try {
  for (const width of args.widths) {
    for (const colorScheme of ['light', 'dark']) {
      const view = await openAt(session, width, { colorScheme });
      const data = await view.page.evaluate(`(${source})()`);
      await view.close();
      if (colorScheme === 'dark' && !results[`${width}-light`].darkModeRules) break;
      results[`${width}-${colorScheme}`] = data;
    }
  }
} finally {
  await session.close();
}

const json = JSON.stringify(results, null, 2);
if (args.out) {
  await writeFile(args.out, json);
  console.log(`Wrote ${Object.keys(results).join(', ')} to ${args.out}`);
} else {
  console.log(json);
}
