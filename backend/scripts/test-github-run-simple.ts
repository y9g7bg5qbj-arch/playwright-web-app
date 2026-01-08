/**
 * Simple test for GitHub Actions Run button
 */

import { chromium } from 'playwright';

async function main() {
  console.log('Testing GitHub Actions Run Button');
  console.log('='.repeat(50));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  });

  const page = await context.newPage();

  try {
    // Navigate with hard refresh
    console.log('1. Loading page...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Take initial screenshot
    await page.screenshot({ path: '/tmp/gh-test-01.png' });

    // Click on a .vero file
    console.log('2. Selecting a file...');
    const fileItem = page.locator('span').filter({ hasText: /\.vero$/ }).first();
    if (await fileItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await fileItem.click();
      await page.waitForTimeout(500);
      console.log('   ✓ File selected');
    } else {
      console.log('   ⚠ No .vero file found');
    }

    // The Run button group looks like: [Run button][ChevronDown button]
    // Both are inside a relative div with green background
    console.log('3. Finding and clicking Run dropdown...');

    // Click directly on the element that shows the dropdown
    // The chevron button is the last button in the green button group
    await page.evaluate(() => {
      // Find all buttons with the chevron-down class inside them
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const svg = btn.querySelector('svg');
        if (svg && svg.classList.contains('lucide-chevron-down')) {
          // Check if it's the one in the Run button group (has green background siblings)
          const parent = btn.parentElement;
          if (parent && parent.querySelector('.bg-green-600')) {
            console.log('Found Run dropdown chevron, clicking...');
            btn.click();
            break;
          }
        }
      }
    });

    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/gh-test-02-dropdown.png' });

    // Now check if the dropdown is visible
    console.log('4. Checking dropdown contents...');
    const dropdown = page.locator('.absolute.bg-gray-800');
    if (await dropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('   ✓ Dropdown is visible!');

      // Get all buttons inside the dropdown
      const dropdownBtns = await dropdown.locator('button').allTextContents();
      console.log('   Dropdown options:', dropdownBtns.map(t => t.trim()).filter(t => t));

      // Look for GitHub Actions specifically
      const hasGitHubOption = dropdownBtns.some(t => t.includes('GitHub Actions'));
      if (hasGitHubOption) {
        console.log('   ✓✓ "Run on GitHub Actions" option found!');
        await page.screenshot({ path: '/tmp/gh-test-03-github-found.png' });
      } else {
        console.log('   ✗ "Run on GitHub Actions" not found in dropdown');
      }
    } else {
      console.log('   ✗ Dropdown not visible');
      console.log('   Checking showRunDropdown state...');

      // Try using the actual button click
      const chevronBtn = page.locator('button').filter({ has: page.locator('.lucide-chevron-down') }).filter({ has: page.locator('svg') }).first();
      if (await chevronBtn.isVisible()) {
        console.log('   Found chevron button, clicking again...');
        await chevronBtn.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: '/tmp/gh-test-04-retry.png' });
      }
    }

    // Also verify GitHub tab in Execution
    console.log('5. Checking Execution tab...');
    const executionBtn = page.locator('button:has-text("Execution")');
    if (await executionBtn.isVisible()) {
      await executionBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: '/tmp/gh-test-05-execution.png' });

      const githubTab = page.locator('button').filter({ hasText: 'GitHub' });
      if (await githubTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('   ✓ GitHub Actions tab found!');
        await githubTab.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: '/tmp/gh-test-06-github-tab.png' });
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('Screenshots saved to /tmp/gh-test-*.png');
    console.log('Browser open for 15s for inspection...');
    await page.waitForTimeout(15000);

  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: '/tmp/gh-test-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
