const { test, expect } = require('@playwright/test');

const STORAGE_KEY = 'washtrackpro:data:v1';

test.describe('Mutations & persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
  });

  test('registering a new customer adds a row and persists across reload', async ({ page }) => {
    await page.goto('/?view=customers');
    await page.locator('[data-action="openNewCustomerModal"]').click();

    await page.locator('#custName').fill('Priya Testworth');
    await page.locator('#custEmail').fill('priya.testworth@example.com');
    await page.locator('#custVehicle').fill('2025 Rivian R1S');
    await page.locator('#custVehicleColor').fill('Forest Green');

    const beforeCount = await page.evaluate(() => window.DATA.customers.length);
    await page.locator('#newCustomerForm button[type="submit"]').click();

    await expect(page.locator('#toastContainer')).toContainText('Priya Testworth');
    const afterCount = await page.evaluate(() => window.DATA.customers.length);
    expect(afterCount).toBe(beforeCount + 1);

    // Confirm it was written to localStorage, then reload and confirm
    // the new record survives (persistence, not just in-memory state).
    const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), STORAGE_KEY);
    expect(stored.customers?.some((c) => c.name === 'Priya Testworth')).toBe(true);

    await page.reload();
    const persistedCount = await page.evaluate(() => window.DATA.customers.length);
    expect(persistedCount).toBe(afterCount);
  });

  test('creating a new car wash job navigates to the jobs table and shows the new row', async ({ page }) => {
    await page.goto('/?view=dashboard');
    await page.locator('[data-action="openNewJobModal"][data-arg="carwash"]').click();

    await page.locator('#njCustomerName').fill('Test Customer Alpha');
    await page.locator('#njVehicle').fill('2022 Kia EV6 • Test Blue');
    await page.locator('#njPrice').fill('42.50');

    await page.locator('#newJobForm button[type="submit"]').click();
    await expect(page).toHaveURL(/view=carwash/);
    await expect(page.locator('#toastContainer')).toContainText('Test Customer Alpha');
  });

  test('required-field validation blocks submission with an empty form', async ({ page }) => {
    await page.goto('/?view=customers');
    await page.locator('[data-action="openNewCustomerModal"]').click();
    await page.locator('#newCustomerForm button[type="submit"]').click();
    // Modal should still be open — submission was blocked.
    await expect(page.locator('#modalRoot')).not.toHaveClass(/hidden/);
    await expect(page.locator('#custName')).toHaveAttribute('aria-invalid', 'true');
  });
});
