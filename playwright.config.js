const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  /* Maximum time one test can run for (2 minutes, to allow time for manual CAPTCHA entry) */
  timeout: 120000,
  expect: {
    timeout: 5000
  },
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on local since we use headed Chrome */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'https://www.irctc.co.in',

    /* Run browser in headed mode since headless is blocked by IRCTC */
    headless: false,

    /* Use Google Chrome to bypass TLS fingerprint blocks */
    channel: 'chrome',

    /* Keep viewport maximized/null */
    viewport: null,

    /* Launch options to disable automation markers */
    launchOptions: {
      args: [
        '--disable-blink-features=AutomationControlled',
        '--start-maximized',
        '--disable-infobars',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ],
      ignoreDefaultArgs: ['--enable-automation'],
    },
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
});
