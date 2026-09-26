# IRCTC Playwright Stealth Automation

This project configures Playwright to run automation scripts on the IRCTC train search website (`https://www.irctc.co.in/nget/train-search`) without triggering anti-bot security blocks.

## Features
- **Akamai Bypass (Chrome Channel):** Automatically launches your system's actual installed Google Chrome browser rather than standard Chromium to match TLS fingerprints and avoid blocking.
- **Stealth Footprints:** Disables standard automation variables (such as `navigator.webdriver = false`) to hide Playwright identifiers.
- **Persistent Sessions (User Profile Caching):** Saves cookies, login state, and cache to a local folder `./user_data`. Once you log in successfully once, subsequent runs will skip login entirely as long as your session is valid.
- **Interactive CAPTCHA:** Pauses execution at the login screen to allow safe manual solving of CAPTCHAs, preventing login failures.
- **Smart Form Inputs:** Dynamically inputs origin and destination stations, bypasses the calendar's `readonly` attributes, and submits searches automatically.

---

## Getting Started

### 1. Installation
Ensure you have [Node.js](https://nodejs.org/) installed, open a terminal in this directory (`IRCTC`), and install the dependencies:
```bash
npm install
```

### 2. Configure the Environment
Open the `.env` file and customize your travel parameters:
```env
# Optional: Credentials for auto-filling login inputs
IRCTC_USERNAME=your_username
IRCTC_PASSWORD=your_password

# Travel details
FROM_STATION=NDLS
TO_STATION=CSMT
JOURNEY_DATE=25/08/2026

# Ticket Class (e.g., 3A, 2A, 1A, SL, CC) or leave blank for All Classes
TICKET_CLASS=3A

# Quota (GENERAL, TATKAL, LADIES, etc.)
TICKET_QUOTA=GENERAL
```

### 3. Run the Automation
Start the standalone automation script:
```bash
npm start
```

### 4. Run the Playwright Test Suite
Alternatively, you can run the automation using Playwright's test runner, which validates the flow as a test case:
```bash
npm test
```
Or to run a specific test and see step-by-step reports:
```bash
npx playwright test
```

---

## How It Works in Practice
1. **Disclaimer Dismissal:** The script automatically dismisses the informational modal popup on load.
2. **Credential Pre-fill:** If you specified `IRCTC_USERNAME` and `IRCTC_PASSWORD`, the script clicks the "LOGIN" button and types your credentials.
3. **CAPTCHA Wait:** The terminal will display a prompt asking you to solve the CAPTCHA in the Chrome window. Once you click "Sign In" and are redirected to the dashboard, the script automatically resumes.
4. **Form Submission:** It selects your stations and date, sets preferences, and clicks "Search".
5. **Session Recovery:** If you run the script again, the persistent user profile retains your cookie state so you don't need to log in again.

---

*Disclaimer: This project is for educational and testing purposes only. Auto-booking scripts during Tatkal hours or abusing platform resources may violate IRCTC Terms of Service and lead to account bans.*
