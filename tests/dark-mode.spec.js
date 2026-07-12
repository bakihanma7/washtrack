const { test, expect } = require('@playwright/test');

test.describe('Dark mode', () => {
  // No addInitScript(() => localStorage.clear()) here: it re-runs on
  // every navigation for the page's lifetime, including page.reload()
  // (used below), which would wipe out the persisted theme preference
  // right before the reload's own scripts read it. Each test already
  // gets a fresh, isolated browser context (and empty localStorage) by
  // default.

  test('defaults to light mode with no stored preference', async ({ page }) => {
    await page.goto('/');
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isDark).toBe(false);
    await expect(page.locator('#themeToggle')).toHaveAttribute('aria-pressed', 'false');
  });

  test('toggling switches to dark mode, updates the toggle button, and persists', async ({ page }) => {
    await page.goto('/');
    await page.locator('#themeToggle').click();

    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isDark).toBe(true);
    await expect(page.locator('#themeToggle')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#themeToggle')).toHaveAttribute('aria-label', 'Switch to light mode');

    const stored = await page.evaluate(() => localStorage.getItem('washtrackpro:theme'));
    expect(stored).toBe('dark');
  });

  test('dark mode preference survives a reload with no flash of the wrong theme', async ({ page }) => {
    await page.goto('/');
    await page.locator('#themeToggle').click();
    await page.reload();

    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isDark).toBe(true);
    await expect(page.locator('#themeToggle')).toHaveAttribute('aria-pressed', 'true');
  });

  test('toggling back to light mode updates storage and the toggle button', async ({ page }) => {
    await page.goto('/');
    await page.locator('#themeToggle').click(); // -> dark
    await page.locator('#themeToggle').click(); // -> light

    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isDark).toBe(false);
    const stored = await page.evaluate(() => localStorage.getItem('washtrackpro:theme'));
    expect(stored).toBe('light');
    await expect(page.locator('#themeToggle')).toHaveAttribute('aria-label', 'Switch to dark mode');
  });
});
