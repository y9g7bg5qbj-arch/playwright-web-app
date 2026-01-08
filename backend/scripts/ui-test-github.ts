/**
 * UI Automation: Test GitHub Actions Integration via Vero IDE UI
 * Uses Playwright to interact with the frontend
 */

import { chromium, Browser, Page } from 'playwright';

const FRONTEND_URL = 'http://localhost:5173';
const GITHUB_TOKEN = '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';

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🎭 Starting Playwright UI Automation');
  console.log('====================================\n');

  let browser: Browser | null = null;

  try {
    // Launch browser in headed mode so user can watch
    console.log('1️⃣  Launching Chrome browser (headed mode)...');
    browser = await chromium.launch({
      headless: false,
      slowMo: 500, // Slow down actions for visibility
    });

    const context = await browser.newContext({
      viewport: { width: 1400, height: 900 },
    });

    const page = await context.newPage();

    // Navigate to Vero IDE
    console.log('2️⃣  Navigating to Vero IDE...');
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    await delay(1000);

    // Take screenshot
    await page.screenshot({ path: '/tmp/vero-01-homepage.png' });
    console.log('   📸 Screenshot: /tmp/vero-01-homepage.png');

    // Check if we need to login
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In"), a:has-text("Login")');
    const isLoginVisible = await loginButton.isVisible().catch(() => false);

    if (isLoginVisible) {
      console.log('3️⃣  Logging in...');
      await loginButton.click();
      await delay(1000);

      // Try to find login form
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email"]');
      const passwordInput = page.locator('input[type="password"]');

      if (await emailInput.isVisible().catch(() => false)) {
        await emailInput.fill('demo@vero.dev');
        await passwordInput.fill('demo123');
        await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').click();
        await delay(2000);
      }
    }

    await page.screenshot({ path: '/tmp/vero-02-after-login.png' });
    console.log('   📸 Screenshot: /tmp/vero-02-after-login.png');

    // Look for Settings or GitHub integration link
    console.log('4️⃣  Looking for Settings/GitHub integration...');

    // Try different navigation paths
    const settingsLink = page.locator('a:has-text("Settings"), button:has-text("Settings"), [data-testid="settings"]');
    const githubLink = page.locator('a:has-text("GitHub"), button:has-text("GitHub"), [data-testid="github"]');
    const integrationsLink = page.locator('a:has-text("Integration"), button:has-text("Integration")');
    const cicdLink = page.locator('a:has-text("CI/CD"), button:has-text("CI/CD")');

    // Try to find and click settings
    if (await settingsLink.first().isVisible().catch(() => false)) {
      await settingsLink.first().click();
      await delay(1000);
    } else if (await integrationsLink.first().isVisible().catch(() => false)) {
      await integrationsLink.first().click();
      await delay(1000);
    } else if (await cicdLink.first().isVisible().catch(() => false)) {
      await cicdLink.first().click();
      await delay(1000);
    }

    await page.screenshot({ path: '/tmp/vero-03-navigation.png' });
    console.log('   📸 Screenshot: /tmp/vero-03-navigation.png');

    // Look for GitHub connect button or token input
    console.log('5️⃣  Looking for GitHub connection UI...');

    const connectGitHubBtn = page.locator('button:has-text("Connect GitHub"), button:has-text("Add GitHub"), button:has-text("GitHub")');
    const tokenInput = page.locator('input[placeholder*="token"], input[name*="token"], input[type="password"]');

    if (await connectGitHubBtn.first().isVisible().catch(() => false)) {
      console.log('   Found "Connect GitHub" button, clicking...');
      await connectGitHubBtn.first().click();
      await delay(1000);
    }

    await page.screenshot({ path: '/tmp/vero-04-github-section.png' });
    console.log('   📸 Screenshot: /tmp/vero-04-github-section.png');

    // Try to enter token if input is visible
    if (await tokenInput.first().isVisible().catch(() => false)) {
      console.log('   Found token input, entering GitHub token...');
      await tokenInput.first().fill(GITHUB_TOKEN);
      await delay(500);

      // Look for submit/connect button
      const submitBtn = page.locator('button:has-text("Connect"), button:has-text("Save"), button:has-text("Submit"), button[type="submit"]');
      if (await submitBtn.first().isVisible().catch(() => false)) {
        await submitBtn.first().click();
        await delay(2000);
      }
    }

    await page.screenshot({ path: '/tmp/vero-05-after-connect.png' });
    console.log('   📸 Screenshot: /tmp/vero-05-after-connect.png');

    // Look for run/trigger button
    console.log('6️⃣  Looking for Run/Trigger button...');

    const runButton = page.locator('button:has-text("Run"), button:has-text("Trigger"), button:has-text("Execute"), button:has-text("Start")');

    if (await runButton.first().isVisible().catch(() => false)) {
      console.log('   Found Run button, clicking...');
      await runButton.first().click();
      await delay(2000);
    }

    await page.screenshot({ path: '/tmp/vero-06-final.png' });
    console.log('   📸 Screenshot: /tmp/vero-06-final.png');

    // Print page content summary
    console.log('\n7️⃣  Current page state:');
    const pageTitle = await page.title();
    const pageUrl = page.url();
    console.log(`   Title: ${pageTitle}`);
    console.log(`   URL: ${pageUrl}`);

    // List visible buttons and links
    const buttons = await page.locator('button').allTextContents();
    const links = await page.locator('a').allTextContents();
    console.log(`   Visible buttons: ${buttons.slice(0, 10).join(', ')}`);
    console.log(`   Visible links: ${links.slice(0, 10).join(', ')}`);

    console.log('\n====================================');
    console.log('✅ UI Automation Complete');
    console.log('Screenshots saved to /tmp/vero-*.png');
    console.log('====================================\n');

    // Keep browser open for 30 seconds so user can see
    console.log('Browser will stay open for 30 seconds for inspection...');
    await delay(30000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main();
