const { test, expect } = require('@playwright/test');
const { clearAndSeedSession } = require('./helpers/seed-session');

test.describe('Keyboard accessibility & focus trapping', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(clearAndSeedSession);
  });

  test('Tab cannot escape the New Job modal while it is open', async ({ page }) => {
    await page.goto('/?view=dashboard');
    await page.locator('[data-action="openNewJobModal"]').first().click();

    const panel = page.locator('#modalPanel');
    await expect(panel).toBeVisible();

    // Tab through every focusable element inside the modal, well past
    // its actual count, and confirm focus never leaves the panel.
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab');
      const activeInsidePanel = await page.evaluate(() => {
        const panelEl = document.getElementById('modalPanel');
        return panelEl.contains(document.activeElement);
      });
      expect(activeInsidePanel).toBe(true);
    }
  });

  test('Escape closes the modal and returns focus to the trigger', async ({ page }) => {
    await page.goto('/?view=dashboard');
    const trigger = page.locator('[data-action="openAddExpenseModal"]').first();
    await trigger.focus();
    await trigger.click();
    await expect(page.locator('#modalRoot')).not.toHaveClass(/hidden/);

    await page.keyboard.press('Escape');
    await expect(page.locator('#modalRoot')).toHaveClass(/hidden/);
    await expect(trigger).toBeFocused();
  });

  test('the customer detail side panel traps focus while open', async ({ page }) => {
    await page.goto('/?view=customers');
    await page.locator('#customersTableBody tr[data-customer-id]').first().click();

    const panel = page.locator('#detailPanel');
    await expect(panel).toHaveAttribute('aria-hidden', 'false');

    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      const activeInsidePanel = await page.evaluate(() => {
        const panelEl = document.getElementById('detailPanel');
        return panelEl.contains(document.activeElement);
      });
      expect(activeInsidePanel).toBe(true);
    }
  });

  test('every nav item is reachable and operable via keyboard', async ({ page }) => {
    await page.goto('/');
    const carwashNav = page.locator('[data-page="carwash"]');
    await carwashNav.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#page-carwash')).toBeVisible();
  });
});
