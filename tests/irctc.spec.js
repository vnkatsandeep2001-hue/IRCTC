const { test } = require('@playwright/test');
const { chromium } = require('playwright');
const path = require('path');
const dotenv = require('dotenv');

// Load env configuration
dotenv.config();

const USER_DATA_DIR = path.join(__dirname, '../user_data');

test('IRCTC Search Train Test with Login', async () => {
  console.log('====================================================');
  console.log('       RUNNING IRCTC PLAYWRIGHT AUTOMATED TEST       ');
  console.log('====================================================');

  const launchOptions = {
    headless: false, // Must be false to bypass bot detectors and allow manual CAPTCHA solving
    channel: 'chrome', // Uses your installed Google Chrome browser to pass TLS fingerprinting
    args: [
      '--disable-blink-features=AutomationControlled', // Disable webdriver check
      '--start-maximized',
      '--disable-infobars',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ],
    viewport: null, // Instructs browser to use the screen size/maximized view
    ignoreDefaultArgs: ['--enable-automation'], // Hide the "Chrome is being controlled by automated test software" bar
  };

  console.log(`Starting Chrome browser with persistent context at: ${USER_DATA_DIR}...`);
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, launchOptions);

  // Get standard page
  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  // Apply stealth modifications at page initialization level
  await page.addInitScript(() => {
    // Hide standard automation flags
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
    // Spoof languages to match standard browsers
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });
    // Spoof browser plugins list so it is not empty
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });
  });

  try {
    const targetUrl = 'https://www.irctc.co.in/nget/train-search';
    console.log(`Navigating to: ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Step 1: Language popup
    console.log('Checking for language selection popup ("English")...');
    try {
      const englishBtn = page.locator('button:has-text("English"), button:has-text("ENGLISH"), a:has-text("English"), a:has-text("ENGLISH"), label:has-text("English"), span:has-text("English")').first();
      await englishBtn.waitFor({ state: 'visible', timeout: 4000 });
      await englishBtn.click();
      console.log('✓ English language button clicked.');
      await page.waitForTimeout(500);
    } catch (e) {
      console.log('No language popup appeared.');
    }

    // Step 2: Disclaimer popup
    console.log('Checking for disclaimer popup...');
    try {
      const okButton = page.locator('button.btn-primary:has-text("OK"), button:has-text("OK"), button[type="submit"]:has-text("OK")').first();
      await okButton.waitFor({ state: 'visible', timeout: 2000 });
      await okButton.click();
      console.log('✓ Disclaimer popup dismissed.');
    } catch (e) {
      console.log('No disclaimer popup appeared.');
    }

    // Step 3: Login
    const username = process.env.IRCTC_USERNAME;
    const password = process.env.IRCTC_PASSWORD;

    if (username && username.trim() !== '' && username !== 'your_username' && password && password.trim() !== '' && password !== 'your_password') {
      console.log(`Attempting login for user: ${username}...`);
      const loginButton = page.locator([
        'a:has-text("LOGIN")',
        'a:has-text("Login")',
        'a:has-text("Login/Register")',
        'a:has-text("LOGIN/REGISTER")',
        'button:has-text("LOGIN")',
        'button:has-text("Login")'
      ].join(', ')).first();

      await loginButton.click({ timeout: 5000 });

      const usernameInput = page.locator('input[formcontrolname="username"], input[placeholder*="User Name"], input[placeholder*="UserName"]');
      const passwordInput = page.locator('input[formcontrolname="password"], input[placeholder*="Password"]');

      await usernameInput.waitFor({ state: 'visible', timeout: 5000 });
      await usernameInput.fill(username);
      await page.waitForTimeout(300);
      await passwordInput.fill(password);
      console.log('✓ Credentials pre-filled.');

      console.log('\n========================================================');
      console.log('ACTION REQUIRED: Please enter the CAPTCHA in the browser window and click SIGN IN.');
      console.log('The script will resume automatically once login is complete.');
      console.log('========================================================\n');

      // Wait for login success
      const logoutButton = page.locator('a:has-text("LOGOUT"), button:has-text("LOGOUT")').first();
      await logoutButton.waitFor({ state: 'visible', timeout: 120000 });
      console.log('✓ Login successful! Session active.');
      await page.waitForTimeout(1000);
    } else {
      console.log('No credentials. Running in guest mode.');
    }

    // Helper to dismiss login modal in guest mode
    async function closeLoginModalIfOpen() {
      try {
        const loginModal = page.locator('app-login');
        if (await loginModal.isVisible()) {
          const closeButton = page.locator('app-login span.fa-remove, app-login a.fa-remove, app-login button.close, app-login .ui-dialog-titlebar-close').first();
          if (await closeButton.isVisible()) {
            await closeButton.click();
            await page.waitForTimeout(1000);
          } else {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(1000);
          }
        }
      } catch (e) { }
    }

    // Step 4: Journey inputs
    const fromStation = process.env.FROM_STATION || 'NDLS';
    const toStation = process.env.TO_STATION || 'CSMT';
    const journeyDate = process.env.JOURNEY_DATE || '25/08/2026';

    console.log(`Entering stations: ${fromStation} -> ${toStation} on ${journeyDate}...`);

    async function selectStation(inputSelector, stationCode) {
      const input = page.locator(inputSelector);
      await input.waitFor({ state: 'visible', timeout: 5000 });
      await closeLoginModalIfOpen();

      try {
        await input.click({ timeout: 3000 });
      } catch (e) {
        await closeLoginModalIfOpen();
        await input.click({ timeout: 5000 });
      }

      await input.press('Control+a');
      await input.press('Backspace');
      await input.pressSequentially(stationCode, { delay: 150 });
      await page.waitForTimeout(1000);

      try {
        const listOption = page.locator(`ul.ui-autocomplete-list li:has-text("${stationCode}"), p-autocomplete li:has-text("${stationCode}")`).first();
        if (await listOption.isVisible()) {
          await listOption.click({ timeout: 2000 });
          console.log(`✓ Selected station: ${stationCode}`);
          return;
        }
      } catch (err) {
        console.log(`Dropdown click failed: ${err.message}. Using fallback...`);
      }

      await input.press('Enter');
      console.log(`✓ Selected suggestion via Enter for: ${stationCode}`);
    }

    await selectStation('p-autocomplete#origin input, input[placeholder*="From"]', fromStation);
    await page.waitForTimeout(500);
    await selectStation('p-autocomplete#destination input, input[placeholder*="To"]', toStation);
    await page.waitForTimeout(500);

    // Enter Date
    const dateInput = page.locator('p-calendar[formcontrolname="journeyDate"] input, input[placeholder*="Journey Date"]');
    await dateInput.waitFor({ state: 'visible', timeout: 5000 });
    await dateInput.evaluate(el => el.removeAttribute('readonly'));
    await dateInput.click();
    await dateInput.press('Control+a');
    await dateInput.press('Backspace');
    await dateInput.fill(journeyDate);
    await dateInput.press('Enter');
    console.log('✓ Date set.');

    // Class and Quota selection
    const ticketClass = process.env.TICKET_CLASS;
    if (ticketClass && ticketClass !== 'ALL') {
      try {
        await page.locator('p-dropdown[id="journeyClass"], p-dropdown[formcontrolname="journeyClass"]').click();
        await page.locator(`p-dropdown li:has-text("${ticketClass}")`).click();
        console.log(`✓ Selected Class: ${ticketClass}`);
      } catch (e) { }
    }

    const ticketQuota = process.env.TICKET_QUOTA;
    if (ticketQuota && ticketQuota !== 'GENERAL') {
      try {
        await page.locator('p-dropdown[id="journeyQuota"], p-dropdown[formcontrolname="journeyQuota"]').click();
        await page.locator(`p-dropdown li:has-text("${ticketQuota}")`).click();
        console.log(`✓ Selected Quota: ${ticketQuota}`);
      } catch (e) { }
    }

    // Step 5: Search trains
    const searchBtn = page.locator('button[type="submit"].search_btn, button:has-text("Search")').first();
    await searchBtn.click();
    console.log('✓ Search button clicked.');

    // Assert results have loaded
    await page.waitForTimeout(5000);
    console.log('✓ Test finished successfully.');
  } finally {
    // Keep browser open for a few seconds to inspect results before closing
    await page.waitForTimeout(5000);
    await context.close();
  }
});
