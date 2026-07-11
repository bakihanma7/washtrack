const { test, expect } = require('@playwright/test');

test.describe('Responsive layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
  });

  test('no horizontal overflow on narrow viewports', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/?view=dashboard');
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(hasOverflow).toBe(false);
  });

  test('wide data tables scroll within their own container, not the page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/?view=carwash');
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(hasOverflow).toBe(false);
    const tableWrapper = page.locator('#page-carwash .overflow-x-auto').first();
    await expect(tableWrapper).toBeVisible();
  });
});

test.describe('Visual smoke checks', () => {
  // These capture a full-page screenshot as a test attachment (visible in
  // the HTML report) and fail the run if the page throws a console error
  // or fails to render its primary content — a lightweight alternative to
  // pixel-diff snapshots, which would need committed baseline images to
  // be meaningful across environments/fonts.
  for (const [name, url] of [
    ['dashboard', '/?view=dashboard'],
    ['carwash', '/?view=carwash'],
    ['maintenance', '/?view=maintenance'],
    ['customers', '/?view=customers'],
  ]) {
    test(`${name} view renders cleanly and captures a screenshot`, async ({ page }, testInfo) => {
      const consoleErrors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => consoleErrors.push(err.message));

      await page.addInitScript(() => localStorage.clear());
      await page.goto(url);
      await expect(page.locator(`#page-${name}`)).toBeVisible();

      const screenshot = await page.screenshot({ fullPage: true });
      await testInfo.attach(`${name}.png`, { body: screenshot, contentType: 'image/png' });

      expect(consoleErrors, `console/page errors on ${name}: ${consoleErrors.join(', ')}`).toEqual([]);
    });
  }
});
