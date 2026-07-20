const { test, expect } = require('@playwright/test');
const { clearAndSeedSession } = require('./helpers/seed-session');

function seedTechnicianSession() {
  var account = {
    id: 'u002',
    name: 'Test Tech',
    email: 'test-tech@washtrackpro.test',
    passwordHash: 'not-a-real-hash-test-only',
    role: 'technician',
    initials: 'TT',
    createdAt: new Date().toISOString(),
  };
  localStorage.clear();
  localStorage.setItem('washtrackpro:accounts:v1', JSON.stringify([account]));
  localStorage.setItem('washtrackpro:session:v1', account.id);
}

test.describe('Reports', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(clearAndSeedSession);
    await page.goto('/');
  });

  test('sidebar link opens the Reports page with populated charts and tables', async ({ page }) => {
    await page.locator('[data-page="reports"]').click();
    await expect(page.locator('#page-reports')).toBeVisible();
    await expect(page).toHaveURL(/view=reports/);

    // Revenue trend total should be a real dollar figure, not the placeholder.
    await expect(page.locator('#reportsRevenueTotal')).not.toHaveText('$0.00');
    await expect(page.locator('#reportsRevenueChart svg')).toBeVisible();
    await expect(page.locator('#reportsJobVolumeChart')).toBeVisible();

    await expect(page.locator('#reportsServiceMixDonut svg')).toBeVisible();
    const breakdownRows = page.locator('#reportsServiceBreakdownList > div');
    await expect(breakdownRows).not.toHaveCount(0);

    const techRows = page.locator('#reportsTechTableBody tr');
    await expect(techRows).not.toHaveCount(0);

    const inventoryRows = page.locator('#reportsInventoryForecastBody tr');
    await expect(inventoryRows.first()).toBeVisible();

    // Demand forecast projects exactly 7 days ahead.
    const demandRows = page.locator('#reportsDemandForecastBody tr');
    await expect(demandRows).toHaveCount(7);
  });

  test('changing the date range re-renders the revenue trend', async ({ page }) => {
    await page.locator('[data-page="reports"]').click();
    await expect(page.locator('#page-reports')).toBeVisible();

    const rangeButton = page.locator('#reportsRangeMount button');
    await rangeButton.click();
    await page.getByRole('option', { name: 'Last 7 days' }).click();

    const rangeDays = await page.evaluate(() => reportsRangeDays);
    expect(rangeDays).toBe(7);
    await expect(page.locator('#reportsRevenueChart svg')).toBeVisible();
  });

  test('CSV export buttons trigger a real file download', async ({ page }) => {
    await page.locator('[data-page="reports"]').click();
    await expect(page.locator('#page-reports')).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#reportsRevenueExportBtn').click(),
    ]);
    expect(download.suggestedFilename()).toContain('revenue-trend');

    const [download2] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#reportsInventoryExportBtn').click(),
    ]);
    expect(download2.suggestedFilename()).toContain('inventory-forecast');
  });

  test('Print / Save as PDF triggers window.print', async ({ page }) => {
    await page.locator('[data-page="reports"]').click();
    await expect(page.locator('#page-reports')).toBeVisible();

    await page.evaluate(() => { window.__printCalled = false; window.print = () => { window.__printCalled = true; }; });
    await page.locator('[data-action="reportsPrint"]').click();
    await expect.poll(() => page.evaluate(() => window.__printCalled)).toBe(true);
  });

  test('technicians cannot see or reach the Reports page', async ({ page }) => {
    await page.addInitScript(seedTechnicianSession);
    await page.goto('/');
    await expect(page.locator('#page-myjobs')).toBeVisible();
    await expect(page.locator('[data-page="reports"]')).toBeHidden();

    await page.goto('/?view=reports');
    await expect(page.locator('#page-reports')).toBeHidden();
    await expect(page.locator('#page-myjobs')).toBeVisible();
  });
});
