import { expect, test, type Page } from '@playwright/test';

/** Opens one case and collects every console error the page prints. */
async function open(page: Page, query: string) {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().split('\n')[0]);
  });
  await page.goto(`/?${query}`);
  await expect(page.locator('[data-test=mode]')).toBeVisible();
  return errors;
}

const errorLog = (page: Page) => page.evaluate(() => window.errorLog);
const products = (page: Page) => page.locator('[data-test=products-tile]');
const visitors = (page: Page) => page.locator('[data-test=visitors]');

/** The healthy tiles still update: the visitor counter ticks and "Add order" works. */
async function expectRestOfPageAlive(page: Page) {
  const first = Number(await visitors(page).textContent());
  await expect.poll(async () => Number(await visitors(page).textContent())).toBeGreaterThan(first);
  await page.click('[data-test=add-order]');
  await expect(page.locator('[data-test=orders]')).toHaveText('129');
}

test.describe('no boundary', () => {
  test('a constructor error removes every tile, not just the broken one', async ({ page }) => {
    const errors = await open(page, 'fail=ctor&layout=plain');
    await page.waitForTimeout(1000);
    await expect(page.locator('section.tile')).toHaveCount(0);
    expect(errors).toContain('ERROR Error: Top products: constructor failed');
  });

  test('an ngOnInit error leaves three of the four tiles blank until something else triggers change detection', async ({ page }) => {
    const errors = await open(page, 'fail=init&layout=plain');
    await page.waitForTimeout(1500);
    // The tiles exist, but none of their bindings were written, before or after the broken one.
    await expect(page.locator('section.tile')).toHaveCount(4);
    await expect(page.locator('[data-test=orders]')).toHaveText('');
    await expect(page.locator('[data-test=top-product]')).toHaveText('');
    await expect(visitors(page)).toHaveText('');
    expect(errors).toEqual(['ERROR Error: Top products: ngOnInit failed']);

    // One click anywhere that runs change detection, and the whole page fills in,
    // the broken tile included.
    await page.click('[data-test=add-order]');
    await expect(page.locator('[data-test=orders]')).toHaveText('129');
    await expect(page.locator('[data-test=top-product]')).toHaveText('Desk lamp');
    await expect.poll(async () => Number(await visitors(page).textContent())).toBeGreaterThan(0);
  });

  test('after an ngOnInit error, the broken tile\'s own Refresh button also fills the page in', async ({ page }) => {
    await open(page, 'fail=init&layout=plain');
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-test=orders]')).toHaveText('');
    await page.click('[data-test=refresh]');
    await expect(page.locator('[data-test=orders]')).toHaveText('128');
    await expect(page.locator('[data-test=top-product]')).toHaveText('Desk lamp');
  });

  test('a template error leaves the broken tile half drawn; the rest keeps working', async ({ page }) => {
    const errors = await open(page, 'fail=template&layout=plain');
    await expect(products(page)).toContainText('Top products');
    await expect(products(page)).toContainText('Refresh');
    await expect(page.locator('[data-test=top-product]')).toHaveText('');
    await expect(products(page).locator('li')).toHaveCount(0);
    await expectRestOfPageAlive(page);
    expect(errors[0]).toBe("ERROR TypeError: Cannot read properties of undefined (reading 'name')");
  });

  test('a resource error leaves the old list on screen with no sign of the failure', async ({ page }) => {
    const errors = await open(page, 'fail=resource&layout=plain');
    await page.waitForTimeout(1000);
    await expect(products(page).locator('li')).toHaveCount(3);
    await expect(page.locator('[data-test=fallback]')).toHaveCount(0);
    await expectRestOfPageAlive(page);
    // Dev mode prints "ERROR ResourceValueError: Resource is currently in an error state
    // (see Error.cause for details): Top products: the API returned 500"; a production
    // build keeps only the loader's message, under a minified class name.
    expect(errors.some((e) => e.startsWith('ERROR ') && e.endsWith('Top products: the API returned 500'))).toBe(true);
  });

  for (const fail of ['click', 'async'] as const) {
    test(`a ${fail} error only reaches the ErrorHandler; the page looks fine`, async ({ page }) => {
      const errors = await open(page, `fail=${fail}&layout=plain`);
      if (fail === 'click') await page.click('[data-test=refresh]');
      await expect.poll(() => errorLog(page)).toHaveLength(1);
      await expect(page.locator('[data-test=top-product]')).toHaveText('Desk lamp');
      await expectRestOfPageAlive(page);
      expect(errors).toContain(`ERROR Error: Top products: ${fail === 'click' ? 'click handler' : 'async callback'} failed`);
    });
  }
});

test.describe('one @boundary per tile', () => {
  for (const fail of ['template', 'init', 'ctor', 'resource'] as const) {
    test(`catches a ${fail} error: only that tile shows the fallback`, async ({ page }) => {
      await open(page, `fail=${fail}&layout=tiles`);
      await expect(products(page).locator('[data-test=fallback]')).toHaveText(/This panel couldn't load\./);
      await expect(page.locator('[data-test=fallback]')).toHaveCount(1);
      await expect(page.locator('[data-test=revenue]')).toHaveText('$48,210');
      await expectRestOfPageAlive(page);
      // The default-style ErrorHandler (no onViewError) still gets the error, once.
      const log = await errorLog(page);
      expect(log).toHaveLength(1);
      expect(log[0].via).toBe('handleError');
    });

    test(`Retry renders the tile again after a ${fail} error`, async ({ page }) => {
      await open(page, `fail=${fail}&layout=tiles&times=1`);
      await page.click('[data-test=retry]');
      await expect(page.locator('[data-test=fallback]')).toHaveCount(0);
      await expect(page.locator('[data-test=top-product]')).toHaveText('Desk lamp');
    });
  }

  for (const fail of ['click', 'async'] as const) {
    test(`does not catch a ${fail} error`, async ({ page }) => {
      await open(page, `fail=${fail}&layout=tiles`);
      if (fail === 'click') await page.click('[data-test=refresh]');
      await expect.poll(() => errorLog(page)).toHaveLength(1);
      await expect(page.locator('[data-test=fallback]')).toHaveCount(0);
      await expect(page.locator('[data-test=top-product]')).toHaveText('Desk lamp');
    });
  }

  test('Retry on a tile that still fails shows the fallback again and reports again', async ({ page }) => {
    await open(page, 'fail=init&layout=tiles');
    await expect(page.locator('[data-test=fallback]')).toHaveCount(1);
    await page.click('[data-test=retry]');
    await expect.poll(() => errorLog(page)).toHaveLength(2);
    await expect(page.locator('[data-test=fallback]')).toHaveCount(1);
  });

  test('an ErrorHandler with onViewError gets the caught error there instead of handleError', async ({ page }, testInfo) => {
    const errors = await open(page, 'fail=template&layout=tiles&handler=view');
    await expect(page.locator('[data-test=fallback]')).toHaveCount(1);
    const log = await errorLog(page);
    expect(log).toEqual([
      {
        via: 'onViewError',
        message: "Cannot read properties of undefined (reading 'name')",
        // details.boundary.type is the component that holds the @boundary. Its name is
        // _TileBoundaryDashboard on the dev server and minified ("e") in a production build.
        boundary: expect.any(String),
      },
    ]);
    expect(errors.some((e) => e.startsWith('ERROR'))).toBe(false);
    if (testInfo.project.name === 'dev') expect(log[0].boundary).toBe('_TileBoundaryDashboard');
  });
});

test.describe('one @boundary around the whole grid', () => {
  test('one broken tile swaps the whole dashboard for the fallback', async ({ page }) => {
    await open(page, 'fail=template&layout=page');
    await expect(page.locator('[data-test=fallback]')).toHaveText(/The dashboard couldn't load\./);
    await expect(page.locator('section.tile')).toHaveCount(0);
  });
});

test('with nothing failing, all four tiles render', async ({ page }) => {
  await open(page, 'layout=tiles');
  await expect(page.locator('section.tile')).toHaveCount(4);
  await expect(page.locator('[data-test=fallback]')).toHaveCount(0);
  await expectRestOfPageAlive(page);
});
