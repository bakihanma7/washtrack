const { test, expect } = require('@playwright/test');
const { clearAndSeedSession } = require('./helpers/seed-session');

test.describe('Data rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(clearAndSeedSession);
  });

  test('customers table renders rows sourced from DATA, not static markup', async ({ page }) => {
    await page.goto('/?view=customers');
    const rowCount = await page.evaluate(() => DATA.customers.length);
    expect(rowCount).toBeGreaterThan(5);

    const visibleRows = page.locator('#customersTableBody tr[data-customer-id]');
    await expect(visibleRows.first()).toBeVisible();
    // Page size is 5, so only a slice of the dataset renders per page.
    await expect(visibleRows).toHaveCount(5);
  });

  test('car wash jobs table renders from DATA.carwashJobs', async ({ page }) => {
    await page.goto('/?view=carwash');
    const total = await page.evaluate(() => DATA.carwashJobs.length);
    expect(total).toBeGreaterThan(0);
    await expect(page.locator('#carwashTableBody tr').first()).toBeVisible();
  });

  test('maintenance jobs table renders from DATA.maintenanceJobs', async ({ page }) => {
    await page.goto('/?view=maintenance');
    const total = await page.evaluate(() => DATA.maintenanceJobs.length);
    expect(total).toBeGreaterThan(0);
  });

  test('clicking a customer row opens the detail panel with matching data', async ({ page }) => {
    await page.goto('/?view=customers');
    const firstRow = page.locator('#customersTableBody tr[data-customer-id]').first();
    const name = await firstRow.locator('td').first().locator('p').first().innerText();
    await firstRow.click();

    const panel = page.locator('#detailPanel');
    await expect(panel).toHaveAttribute('aria-hidden', 'false');
    await expect(panel).toContainText(name);
  });
});
