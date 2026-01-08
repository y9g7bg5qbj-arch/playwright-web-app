/**
 * Test GitHub Actions Run from UI
 * Verifies the "Run on GitHub Actions" button is visible and functional
 */

import { chromium } from 'playwright';

const FRONTEND_URL = 'http://localhost:5173';

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('Testing GitHub Actions Run via UI');
  console.log('='.repeat(50));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 200,
  });

  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  try {
    // Navigate to Vero IDE
    console.log('\n1. Opening Vero IDE...');
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    await delay(1000);

    // First, click on Explorer to show file tree
    console.log('2. Opening file explorer...');
    const explorerBtn = page.locator('button:has-text("Explorer")');
    if (await explorerBtn.isVisible()) {
      await explorerBtn.click();
      await delay(500);
    }

    // Click on a .vero file if available
    console.log('3. Looking for a .vero file to select...');
    const veroFile = page.locator('span:text-matches("\\.vero$")').first();
    if (await veroFile.isVisible({ timeout: 3000 }).catch(() => false)) {
      await veroFile.click();
      await delay(500);
      console.log('   ✓ Selected a .vero file');
    } else {
      console.log('   No .vero file found, continuing anyway...');
    }

    // Look for Run button dropdown
    console.log('4. Looking for Run button dropdown...');
    await page.screenshot({ path: '/tmp/gh-run-01-initial.png' });

    // Find the dropdown chevron next to the Run button (it's in a button group)
    const runButtonGroup = page.locator('.flex.items-center').filter({ has: page.locator('button:has-text("Run")') }).first();
    const dropdownChevron = runButtonGroup.locator('button').last();

    if (await dropdownChevron.isVisible()) {
      console.log('   Found dropdown chevron');
      // Check if it's enabled
      const isDisabled = await dropdownChevron.isDisabled();
      if (isDisabled) {
        console.log('   Dropdown is disabled (no file selected)');
        console.log('   This is expected - Run button requires a file to be selected');
      } else {
        console.log('   Clicking dropdown...');
        await dropdownChevron.click();
        await delay(500);
        await page.screenshot({ path: '/tmp/gh-run-02-dropdown.png' });

        // Look for "Run on GitHub Actions" option
        const githubOption = page.locator('button:has-text("Run on GitHub Actions")');
        if (await githubOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          console.log('   ✓ Found "Run on GitHub Actions" option!');
          await page.screenshot({ path: '/tmp/gh-run-03-github-option.png' });
        } else {
          console.log('   ✗ "Run on GitHub Actions" option not found in dropdown');
        }
      }
    }

    // Now check the Execution Dashboard for GitHub Actions tab
    console.log('\n5. Checking Execution Dashboard...');
    const executionButton = page.locator('button:has-text("Execution")');
    if (await executionButton.isVisible()) {
      await executionButton.click();
      await delay(1000);
      await page.screenshot({ path: '/tmp/gh-run-04-execution.png' });

      // Look for GitHub Actions tab - more flexible selector
      const githubTab = page.locator('button').filter({ hasText: /GitHub/ });
      if (await githubTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('   ✓ Found GitHub tab in Execution view!');
        await githubTab.click();
        await delay(1000);
        await page.screenshot({ path: '/tmp/gh-run-05-github-tab.png' });
        console.log('   Screenshot: /tmp/gh-run-05-github-tab.png');

        // Check what's in the GitHub panel
        const panelContent = await page.locator('.p-4, .p-6').first().textContent();
        console.log('   Panel content preview:', panelContent?.slice(0, 100));
      } else {
        console.log('   Looking for tabs...');
        const allTabs = await page.locator('button').allTextContents();
        const tabLike = allTabs.filter(t => t.includes('Local') || t.includes('GitHub') || t.includes('Actions'));
        console.log('   Tab-like buttons found:', tabLike);
      }
    }

    // Also check the Quick Run modal (Run Configuration)
    console.log('\n6. Checking Quick Run Modal...');
    // Click back to explorer
    const explorerBtn2 = page.locator('button:has-text("Explorer")');
    if (await explorerBtn2.isVisible()) {
      await explorerBtn2.click();
      await delay(500);
    }

    // Look for the Run Configuration menu item
    const settingsButton = page.locator('button').filter({ has: page.locator('.lucide-settings') }).first();
    if (await settingsButton.isVisible()) {
      // Try clicking on Run Configuration option if available
      const runConfigOption = page.locator('button:has-text("Run Configuration")');
      if (await runConfigOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await runConfigOption.click();
        await delay(500);
        await page.screenshot({ path: '/tmp/gh-run-06-run-config.png' });
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('Test Complete!');
    console.log('Screenshots saved to /tmp/gh-run-*.png');
    console.log('='.repeat(50));

    // List all screenshots
    console.log('\nTo view screenshots:');
    console.log('  open /tmp/gh-run-*.png');

    // Keep browser open briefly
    console.log('\nBrowser open for 20s for inspection...');
    await delay(20000);

  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: '/tmp/gh-run-error.png' });
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
