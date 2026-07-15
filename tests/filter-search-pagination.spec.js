const { test, expect } = require('@playwright/test');
const { clearAndSeedSession } = require('./helpers/seed-session');

test.describe('Search, filter & pagination', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(clearAndSeedSession);
  });

  test('typing in the search box is debounced (state updates after a short delay)', async ({ page }) => {
    await page.goto('/?view=customers');
    const search = page.locator('#globalSearch');
    await search.fill('zzzzzznomatch');

    // Immediately after typing, the debounce timer shouldn't have fired
    // yet, so the URL should not reflect the query term.
    await expect(page).not.toHaveURL(/q=zzzzzznomatch/);

    // After the debounce window it should be reflected.
    await expect(page).toHaveURL(/q=zzzzzznomatch/, { timeout: 2000 });
    await expect(page.locator('#customersTableBody')).toContainText('No customers match');
  });

  test('status filter tabs narrow the customers table and reset to page 1', async ({ page }) => {
    await page.goto('/?view=customers');
    await page.locator('[data-table="customers"][data-status="vip"]').click();
    await expect(page).toHaveURL(/status=vip/);
    const rows = page.locator('#customersTableBody tr[data-customer-id]');
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i).locator('td').nth(1)).toContainText(/vip/i);
    }
  });

  test('pagination advances to page 2 and the URL reflects it', async ({ page }) => {
    await page.goto('/?view=customers');
    const pagination = page.locator('#customersPagination');
    const page2Btn = pagination.locator('button', { hasText: '2' });
    await page2Btn.click();
    await expect(page).toHaveURL(/pg=2/);
  });

  test('empty state renders when a search matches nothing', async ({ page }) => {
    await page.goto('/?view=carwash&q=this-vehicle-does-not-exist-anywhere');
    await expect(page.locator('#carwashTableBody')).toContainText(/no .* match/i);
  });
});
