const { test, expect } = require('@playwright/test');

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/');
  });

  test('sidebar links switch the active page and update the URL', async ({ page }) => {
    await expect(page.locator('#page-dashboard')).toBeVisible();

    await page.locator('[data-page="carwash"]').click();
    await expect(page.locator('#page-carwash')).toBeVisible();
    await expect(page.locator('#page-dashboard')).toBeHidden();
    await expect(page).toHaveURL(/view=carwash/);
    await expect(page.locator('[data-page="carwash"]')).toHaveAttribute('aria-current', 'page');

    await page.locator('[data-page="customers"]').click();
    await expect(page.locator('#page-customers')).toBeVisible();
    await expect(page).toHaveURL(/view=customers/);
  });

  test('reloading a deep-linked view URL restores that view', async ({ page }) => {
    await page.goto('/?view=maintenance');
    await expect(page.locator('#page-maintenance')).toBeVisible();
    await expect(page.locator('[data-page="maintenance"]')).toHaveAttribute('aria-current', 'page');
  });

  test('scroll position resets to top when navigating to a new page', async ({ page }) => {
    await page.locator('[data-page="customers"]').click();
    await page.evaluate(() => window.scrollTo(0, 1200));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    await page.locator('[data-page="carwash"]').click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });

  test('browser Back/Forward navigate between real history entries', async ({ page }) => {
    await expect(page.locator('#page-dashboard')).toBeVisible();

    await page.locator('[data-page="carwash"]').click();
    await expect(page).toHaveURL(/view=carwash/);

    await page.locator('[data-page="customers"]').click();
    await expect(page).toHaveURL(/view=customers/);

    await page.goBack();
    await expect(page).toHaveURL(/view=carwash/);
    await expect(page.locator('#page-carwash')).toBeVisible();
    await expect(page.locator('[data-page="carwash"]')).toHaveAttribute('aria-current', 'page');

    await page.goBack();
    await expect(page).toHaveURL(/view=dashboard/);
    await expect(page.locator('#page-dashboard')).toBeVisible();

    await page.goForward();
    await expect(page).toHaveURL(/view=carwash/);
    await expect(page.locator('#page-carwash')).toBeVisible();
  });

  test('in-page filter/search/pagination changes do not spam history entries', async ({ page }) => {
    await page.locator('[data-page="customers"]').click();
    await expect(page).toHaveURL(/view=customers/);

    await page.locator('#globalSearch').fill('a');
    await expect(page).toHaveURL(/q=a/, { timeout: 2000 });

    // The search-driven URL change used history.replaceState (no new
    // entry), so Back should return straight to dashboard — the actual
    // previous *navigation* — not to a "customers without q=a"
    // intermediate state that would exist if every keystroke pushed.
    await page.goBack();
    await expect(page.locator('#page-dashboard')).toBeVisible();
  });
});
