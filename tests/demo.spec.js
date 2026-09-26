const { test, expect } = require('@playwright/test');

test.describe('IRCTC Portal Demo Test Suite', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to IRCTC homepage before each test
    await page.goto('https://www.irctc.co.in/nget/train-search', { 
      waitUntil: 'domcontentloaded', 
      timeout: 60000 
    });
  });

  // Test 1: Validate Page Title and URL
  test('01 - Verify Homepage Title and URL', async ({ page }) => {
    await expect(page).toHaveURL(/irctc\.co\.in/);
    const title = await page.title();
    console.log('Page Title:', title);
    expect(title.length).toBeGreaterThan(0);
  });

  // Test 2: Validate Search Button Presence
  test('02 - Verify Search Button Visibility', async ({ page }) => {
    const searchBtn = page.locator('button[type="submit"].search_btn, button:has-text("Search")').first();
    await expect(searchBtn).toBeVisible({ timeout: 10000 });
  });

  // Test 3: Validate From Station Autocomplete Field
  test('03 - Verify Origin Station Input Field', async ({ page }) => {
    const originInput = page.locator('p-autocomplete#origin input, input[placeholder*="From"]').first();
    await expect(originInput).toBeVisible({ timeout: 10000 });
    await expect(originInput).toBeEnabled();
  });

  // Test 4: Validate To Station Autocomplete Field
  test('04 - Verify Destination Station Input Field', async ({ page }) => {
    const destInput = page.locator('p-autocomplete#destination input, input[placeholder*="To"]').first();
    await expect(destInput).toBeVisible({ timeout: 10000 });
    await expect(destInput).toBeEnabled();
  });

  // Test 5: Validate Journey Date Picker Field
  test('05 - Verify Journey Date Input Field', async ({ page }) => {
    const dateInput = page.locator('p-calendar[formcontrolname="journeyDate"] input, input[placeholder*="Journey Date"]').first();
    await expect(dateInput).toBeVisible({ timeout: 10000 });
  });

  // Test 6: Validate Class Dropdown Selector
  test('06 - Verify Class Dropdown Selection Element', async ({ page }) => {
    const classDropdown = page.locator('p-dropdown[id="journeyClass"], p-dropdown[formcontrolname="journeyClass"]').first();
    await expect(classDropdown).toBeVisible({ timeout: 10000 });
  });

  // Test 7: Validate Quota Dropdown Selector
  test('07 - Verify Quota Dropdown Selection Element', async ({ page }) => {
    const quotaDropdown = page.locator('p-dropdown[id="journeyQuota"], p-dropdown[formcontrolname="journeyQuota"]').first();
    await expect(quotaDropdown).toBeVisible({ timeout: 10000 });
  });

  // Test 8: Validate Login Link Element
  test('08 - Verify Login Button Link Presence', async ({ page }) => {
    const loginLink = page.locator('a:has-text("LOGIN"), button:has-text("LOGIN")').first();
    await expect(loginLink).toBeVisible({ timeout: 10000 });
  });

  // Test 9: Verify Navigation Header Element
  test('09 - Verify Main Navigation Header', async ({ page }) => {
    const header = page.locator('app-header, nav, header').first();
    await expect(header).toBeVisible({ timeout: 10000 });
  });

  // Test 10: Verify Network Response Status
  test('10 - Verify Page HTTP 200 OK Response', async ({ request }) => {
    const response = await request.get('https://www.irctc.co.in/nget/train-search');
    expect(response.status()).toBe(200);
  });

});
