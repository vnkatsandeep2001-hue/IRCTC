const path = require('path');
const dotenv = require('dotenv');
const { chromium } = require('playwright');

// Load environment variables
dotenv.config();

const USER_DATA_DIR = path.join(__dirname, 'user_data');

let page;

async function run() {
  console.log('====================================================');
  console.log('       IRCTC PLAYWRIGHT AUTOMATION INITIALIZING       ');
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
  page = pages.length > 0 ? pages[0] : await context.newPage();

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

  const targetUrl = 'https://www.irctc.co.in/nget/train-search';
  console.log(`Navigating to: ${targetUrl}...`);
  
  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  } catch (error) {
    console.error('Failed to load the IRCTC page:', error.message);
    console.log('Retrying navigation...');
    await page.goto(targetUrl, { waitUntil: 'load', timeout: 60000 });
  }

  // Step 1: Handle Language Selection & Disclaimer Pop-up
  console.log('Checking for language selection popup ("English")...');
  try {
    const englishBtn = page.locator('button:has-text("English"), button:has-text("ENGLISH"), a:has-text("English"), a:has-text("ENGLISH"), label:has-text("English"), span:has-text("English")').first();
    await englishBtn.waitFor({ state: 'visible', timeout: 4000 });
    await englishBtn.click();
    console.log('✓ English language button clicked.');
    await page.waitForTimeout(500); // short wait after selection
  } catch (e) {
    console.log('No language selection popup appeared or it was already dismissed.');
  }

  console.log('Checking for the informational disclaimer pop-up...');
  try {
    // Look for various OK/Dismiss button variants on the landing dialog
    const okButton = page.locator('button.btn-primary:has-text("OK"), button:has-text("OK"), button[type="submit"]:has-text("OK")').first();
    await okButton.waitFor({ state: 'visible', timeout: 2000 }); // Fast 2-second timeout
    await okButton.click();
    console.log('✓ Disclaimer pop-up dismissed.');
  } catch (e) {
    console.log('No disclaimer pop-up appeared, or it was already closed.');
  }

  // Step 2: Login Flow (optional, if credentials configured)
  const username = process.env.IRCTC_USERNAME;
  const password = process.env.IRCTC_PASSWORD;

  if (username && username.trim() !== '' && username !== 'your_username' && password && password.trim() !== '' && password !== 'your_password') {
    console.log(`Attempting login for user: ${username}...`);
    try {
      // Comprehensive locator for the login/register button
      const loginButton = page.locator([
        'a:has-text("LOGIN")',
        'a:has-text("Login")',
        'a:has-text("Login/Register")',
        'a:has-text("LOGIN/REGISTER")',
        'button:has-text("LOGIN")',
        'button:has-text("Login")'
      ].join(', ')).first();
      
      await loginButton.click({ timeout: 5000 });
      console.log('✓ Clicked Login/Register button.');
      
      // Wait for login form inputs
      const usernameInput = page.locator('input[formcontrolname="username"], input[placeholder*="User Name"], input[placeholder*="UserName"]');
      const passwordInput = page.locator('input[formcontrolname="password"], input[placeholder*="Password"]');
      
      await usernameInput.waitFor({ state: 'visible', timeout: 5000 });
      await usernameInput.fill(username);
      await page.waitForTimeout(300);
      await passwordInput.fill(password);
      console.log('✓ Username and password pre-filled.');

      console.log('\n========================================================');
      console.log('ACTION REQUIRED: Please enter the CAPTCHA in the browser window');
      console.log('and click the "SIGN IN" button to log in.');
      console.log('The script will resume automatically once login is complete.');
      console.log('========================================================\n');

      // Wait for navigation / successful login (indicated by header changing to "LOGOUT")
      let isLoggedIn = false;
      const timeoutMs = 120000; // 2 minutes to complete CAPTCHA and sign in
      const startTime = Date.now();

      while (Date.now() - startTime < timeoutMs) {
        const logoutExists = await page.locator('a:has-text("LOGOUT"), button:has-text("LOGOUT")').isVisible();
        if (logoutExists) {
          console.log('✓ Login successful! Session active.');
          isLoggedIn = true;
          // Wait a second for the login modal to close completely
          await page.waitForTimeout(1000);
          break;
        }
        await page.waitForTimeout(1500);
      }

      if (!isLoggedIn) {
        console.log('Login timeout exceeded. Proceeding search in guest mode...');
      }
    } catch (e) {
      console.log('Error during login automation flow:', e.message);
      console.log('Please log in manually if needed, then let the script proceed.');
    }
  } else {
    console.log('No IRCTC credentials found in .env. Running in Guest/Search-only mode...');
  }

  // Step 3: Input Journey details
  const fromStation = process.env.FROM_STATION || 'NDLS';
  const toStation = process.env.TO_STATION || 'CSMT';
  const journeyDate = process.env.JOURNEY_DATE || '25/08/2026';

  console.log(`Entering journey details: From ${fromStation} -> To ${toStation} on ${journeyDate}...`);

  // Helper function to dismiss login dialog if it's blocking the view in Guest Mode
  async function closeLoginModalIfOpen() {
    try {
      console.log('Checking for active login modal overlay to dismiss...');
      const closeButton = page.locator('app-login span.fa-remove, app-login a.fa-remove, app-login button.close, app-login .ui-dialog-titlebar-close, .ui-dialog-titlebar-close').first();
      const isCloseVisible = await closeButton.isVisible();
      if (isCloseVisible) {
        await closeButton.click();
        console.log('✓ Login modal dismissed via close button.');
        await page.waitForTimeout(1000);
      } else {
        // Send Escape key as fallback to dismiss the dialog
        await page.keyboard.press('Escape');
        console.log('✓ Sent Escape key to dismiss login modal.');
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      console.log('Could not dismiss login modal:', e.message);
    }
  }

  // Helper function to enter and select station from autocomplete
  async function selectStation(inputSelector, stationCode) {
    const input = page.locator(inputSelector);
    await input.waitFor({ state: 'visible', timeout: 5000 });
    
    // Close login modal if it pops up right before clicking the input
    await closeLoginModalIfOpen();

    try {
      await input.click({ timeout: 3000 });
    } catch (e) {
      console.log('Input click blocked. Dismissing login modal and retrying...');
      await closeLoginModalIfOpen();
      await input.click({ timeout: 5000 });
    }
    
    // Clear and enter code slowly to trigger autocomplete
    await input.press('Control+a');
    await input.press('Backspace');
    await input.pressSequentially(stationCode, { delay: 150 });
    await page.waitForTimeout(1000); // Allow autocomplete list to render
    
    try {
      // Find list option that contains the station code
      const listOption = page.locator(`ul.ui-autocomplete-list li:has-text("${stationCode}"), p-autocomplete li:has-text("${stationCode}")`).first();
      if (await listOption.isVisible()) {
        await listOption.click({ timeout: 2000 }); // Fast 2-second timeout to fallback quickly if intercepted
        console.log(`✓ Selected station: ${stationCode}`);
        return;
      }
    } catch (err) {
      console.log(`Autocomplete list option click failed (${err.message}). Trying keyboard fallback...`);
    }

    // Fallback: Press enter to select first option
    await input.press('Enter');
    console.log(`✓ Pressed Enter to select first suggestion for: ${stationCode}`);
  }

  // Select FROM Station
  await selectStation('p-autocomplete#origin input, input[aria-controls="pr_id_1_list"], input[placeholder*="From"]', fromStation);
  await page.waitForTimeout(500);

  // Select TO Station
  await selectStation('p-autocomplete#destination input, input[aria-controls="pr_id_2_list"], input[placeholder*="To"]', toStation);
  await page.waitForTimeout(500);

  // Enter Date (Using the readonly-removal bypass trick)
  console.log(`Entering journey date: ${journeyDate}...`);
  try {
    const dateInput = page.locator('p-calendar[formcontrolname="journeyDate"] input, input[placeholder*="Journey Date"]');
    await dateInput.waitFor({ state: 'visible', timeout: 5000 });
    
    // Remove the readonly attribute so Playwright can fill it directly
    await dateInput.evaluate(el => el.removeAttribute('readonly'));
    await dateInput.click();
    await dateInput.press('Control+a');
    await dateInput.press('Backspace');
    await dateInput.fill(journeyDate);
    await dateInput.press('Enter');
    console.log('✓ Journey date updated.');
  } catch (err) {
    console.error('Failed to set date automatically:', err.message);
    console.log('Please set the date manually in the browser.');
  }

  // Step 4: Class and Quota (Optional)
  const ticketClass = process.env.TICKET_CLASS;
  if (ticketClass && ticketClass !== 'ALL' && ticketClass !== '') {
    try {
      const classDropdown = page.locator('p-dropdown[id="journeyClass"], p-dropdown[formcontrolname="journeyClass"]');
      await classDropdown.click();
      await page.waitForTimeout(500);
      const option = page.locator(`p-dropdown li:has-text("${ticketClass}")`);
      await option.click();
      console.log(`✓ Selected Class: ${ticketClass}`);
    } catch (e) {
      console.log(`Could not select class: ${ticketClass}. Continuing with defaults.`);
    }
  }

  const ticketQuota = process.env.TICKET_QUOTA;
  if (ticketQuota && ticketQuota !== 'GENERAL' && ticketQuota !== '') {
    try {
      const quotaDropdown = page.locator('p-dropdown[id="journeyQuota"], p-dropdown[formcontrolname="journeyQuota"]');
      await quotaDropdown.click();
      await page.waitForTimeout(500);
      const option = page.locator(`p-dropdown li:has-text("${ticketQuota}")`);
      await option.click();
      console.log(`✓ Selected Quota: ${ticketQuota}`);
    } catch (e) {
      console.log(`Could not select quota: ${ticketQuota}. Continuing with defaults.`);
    }
  }

  // Step 5: Search
  console.log('Clicking the Search button...');
  try {
    const searchButton = page.locator('button[type="submit"].search_btn, button:has-text("Search")').first();
    await searchButton.click();
    console.log('✓ Search request submitted.');
    
    // Wait for the results to load
    await page.waitForTimeout(5000);
    console.log('Automation complete. Browser is kept open for booking.');
  } catch (err) {
    console.error('Failed to click search button:', err.message);
  }
}

run().catch(async err => {
  console.error('An error occurred during execution:', err);
  if (page) {
    try {
      const screenshotPath = path.join('C:\\Users\\vnkat\\.gemini\\antigravity-ide\\brain\\f7f17597-c075-47a5-ac3f-861cdebe8d56', 'error_screenshot.png');
      await page.screenshot({ path: screenshotPath });
      console.log(`✓ Screenshot of error saved to: ${screenshotPath}`);
    } catch (screer) {
      console.log('Failed to capture error screenshot:', screer.message);
    }
  }
});
