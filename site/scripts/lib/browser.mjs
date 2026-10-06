import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright-core';

export const SITE = resolve(fileURLToPath(import.meta.url), '../../..');
export const DIST = join(SITE, 'dist');
export const DEFAULT_WIDTHS = [1280, 1024, 768, 375];

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.json': 'application/json',
};

export function options(extra = {}, widths = DEFAULT_WIDTHS) {
  const { values } = parseArgs({
    options: {
      url: { type: 'string' },
      widths: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
      ...extra,
    },
  });
  values.widths = values.widths ? values.widths.split(',').map(Number) : widths;
  return values;
}

async function serveDist() {
  if (!existsSync(join(DIST, 'index.html'))) {
    throw new Error('No build found in site/dist. Run `npm run build` first, or pass --url.');
  }
  const server = createServer(async (req, res) => {
    let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
    let file = join(DIST, path);
    if (!file.startsWith(DIST)) return res.writeHead(403).end();
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  return { url: `http://127.0.0.1:${server.address().port}/`, close: () => server.close() };
}

export async function launch(url) {
  const server = url ? null : await serveDist();
  const browser = await chromium.launch(
    process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' },
  );
  return {
    url: url ?? server.url,
    browser,
    async close() {
      await browser.close();
      server?.close();
    },
  };
}

export async function openAt(session, width, { colorScheme = 'light', height = 900 } = {}) {
  const context = await session.browser.newContext({
    viewport: { width, height },
    colorScheme,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(session.url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  return { page, close: () => context.close() };
}
