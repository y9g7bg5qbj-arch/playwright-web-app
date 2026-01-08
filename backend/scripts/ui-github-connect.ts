/**
 * UI Automation: Connect GitHub and Trigger Run via Vero IDE
 */

import { chromium } from 'playwright';

const FRONTEND_URL = 'http://localhost:5173';
const GITHUB_TOKEN = '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';

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🎭 Vero IDE - GitHub Integration via UI');
  console.log('========================================\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  });

  const page = await context.newPage();

  try {
    // Navigate to Vero IDE
    console.log('1️⃣  Opening Vero IDE...');
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    await delay(1000);

    // Click Settings gear icon (top right)
    console.log('2️⃣  Opening Settings...');
    const settingsButton = page.locator('button').filter({ has: page.locator('svg') }).last();
    await settingsButton.click().catch(async () => {
      // Try finding by aria-label or title
      await page.locator('[aria-label*="setting"], [title*="Setting"], button:has(svg.lucide-settings)').first().click();
    });
    await delay(1000);
    await page.screenshot({ path: '/tmp/ui-01-settings.png' });
    console.log('   📸 Screenshot saved');

    // Look for GitHub or Integrations tab/section
    console.log('3️⃣  Looking for GitHub/Integrations section...');

    // Try clicking on different tabs/buttons
    const tabs = ['GitHub', 'Integrations', 'CI/CD', 'Connect'];
    for (const tab of tabs) {
      const tabElement = page.locator(`button:has-text("${tab}"), a:has-text("${tab}"), [role="tab"]:has-text("${tab}")`);
      if (await tabElement.isVisible().catch(() => false)) {
        console.log(`   Found "${tab}" tab, clicking...`);
        await tabElement.click();
        await delay(500);
        break;
      }
    }

    await page.screenshot({ path: '/tmp/ui-02-github-section.png' });

    // Look for token input field
    console.log('4️⃣  Looking for GitHub token input...');
    const tokenInput = page.locator('input[type="password"], input[placeholder*="token"], input[name*="token"], input[placeholder*="ghp_"]');

    if (await tokenInput.isVisible().catch(() => false)) {
      console.log('   Found token input, entering token...');
      await tokenInput.fill(GITHUB_TOKEN);
      await delay(500);

      // Find and click Connect/Save button
      const connectBtn = page.locator('button:has-text("Connect"), button:has-text("Save"), button:has-text("Validate")');
      if (await connectBtn.isVisible().catch(() => false)) {
        await connectBtn.click();
        console.log('   Clicked Connect button');
        await delay(2000);
      }
    } else {
      console.log('   Token input not found, checking current page...');
    }

    await page.screenshot({ path: '/tmp/ui-03-after-connect.png' });

    // Go back to main view and try to trigger execution
    console.log('5️⃣  Going to Execution view...');
    const executionBtn = page.locator('button:has-text("Execution"), a:has-text("Execution")');
    if (await executionBtn.isVisible().catch(() => false)) {
      await executionBtn.click();
      await delay(1000);
    }

    await page.screenshot({ path: '/tmp/ui-04-execution.png' });

    // Look for GitHub Actions run option
    console.log('6️⃣  Looking for GitHub Actions trigger...');
    const githubRunBtn = page.locator('button:has-text("GitHub"), button:has-text("Actions"), button:has-text("Cloud"), [data-testid*="github"]');
    if (await githubRunBtn.first().isVisible().catch(() => false)) {
      await githubRunBtn.first().click();
      await delay(1000);
    }

    await page.screenshot({ path: '/tmp/ui-05-github-run.png' });

    // Print current state
    console.log('\n📊 Current UI State:');
    console.log(`   URL: ${page.url()}`);
    console.log(`   Title: ${await page.title()}`);

    // List all visible text buttons for debugging
    const allButtons = await page.locator('button').allTextContents();
    console.log(`   Buttons: ${allButtons.filter(b => b.trim()).slice(0, 15).join(', ')}`);

    console.log('\n========================================');
    console.log('✅ UI Navigation Complete');
    console.log('Screenshots: /tmp/ui-*.png');
    console.log('========================================');

    // Keep open for viewing
    console.log('\nBrowser open for 60s - interact manually if needed...');
    await delay(60000);

  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: '/tmp/ui-error.png' });
  } finally {
    await browser.close();
  }
}

main();
