// Opens every failure case in a real browser and prints what the page shows.
// Usage: start `npm start -- --port 4248`, then `node scripts/explore.mjs`.
// Playwright launches Edge with its own temporary profile and deletes it on close().
import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:4248';
const modes = (process.argv[3] ?? 'template,init,ctor,click,async,resource').split(',');
const layouts = (process.argv[2] ?? 'plain,tiles,page').split(',');

const browser = await chromium.launch({ channel: 'msedge' });
try {
  for (const layout of layouts) {
    for (const fail of modes) {
      const page = await browser.newPage();
      page.setDefaultTimeout(2000);
      const consoleLines = [];
      page.on('console', (m) => consoleLines.push(`${m.type()}: ${m.text().split('\n')[0].slice(0, 160)}`));
      page.on('pageerror', (e) => consoleLines.push(`pageerror: ${e.message.slice(0, 160)}`));
      await page.goto(`${BASE}/?fail=${fail}&layout=${layout}`);
      await page.waitForTimeout(800);
      if (fail === 'click') await page.click('[data-test=refresh]').catch((e) => consoleLines.push('click failed: ' + e.message));
      const before = await page.locator('[data-test=visitors]').textContent().catch(() => null);
      const ordersBefore = await page.locator('[data-test=orders]').textContent().catch(() => null);
      if (process.argv[4] !== 'noclick') await page.click('[data-test=add-order]', { timeout: 1000 }).catch(() => {});
      await page.waitForTimeout(Number(process.env.WAIT ?? 1000));
      const after = await page.locator('[data-test=visitors]').textContent().catch(() => null);
      const ordersAfter = await page.locator('[data-test=orders]').textContent().catch(() => null);
      const tiles = await page.locator('section.tile').allInnerTexts();
      const body = await page.locator('app-root').innerText();
      const log = await page.evaluate(() => window.errorLog);
      console.log(`\n=== layout=${layout} fail=${fail}`);
      console.log('tiles:', JSON.stringify(tiles.map((t) => t.replace(/\n+/g, ' | '))));
      if (!tiles.length) console.log('app-root text:', JSON.stringify(body.replace(/\n+/g, ' | ')));
      console.log(`visitors ${before} -> ${after}; orders ${ordersBefore} -> ${ordersAfter} (after Add order)`);
      console.log('errorLog:', JSON.stringify(log));
      console.log('console:\n  ' + consoleLines.join('\n  '));
      await page.close();
    }
  }
} finally {
  await browser.close();
}
