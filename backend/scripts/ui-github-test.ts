/**
 * Test GitHub Actions tab in Execution Dashboard
 */

import { chromium } from 'playwright';

async function main() {
  console.log('🎭 Testing GitHub Actions UI Integration');
  console.log('=========================================\n');

  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  try {
    // Go to Vero IDE
    console.log('1️⃣  Opening Vero IDE...');
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Click Execution button
    console.log('2️⃣  Clicking Execution button...');
    await page.click('button:has-text("Execution")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/gh-01-execution.png' });

    // Look for GitHub Actions tab
    console.log('3️⃣  Looking for GitHub Actions tab...');
    const githubTab = page.locator('button:has-text("GitHub Actions")');

    if (await githubTab.isVisible()) {
      console.log('   ✓ Found GitHub Actions tab!');
      await githubTab.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: '/tmp/gh-02-github-tab.png' });
      console.log('   📸 Screenshot: /tmp/gh-02-github-tab.png');
    } else {
      console.log('   ✗ GitHub Actions tab not found');
      // Print available buttons
      const buttons = await page.locator('button').allTextContents();
      console.log('   Available buttons:', buttons.filter(b => b.trim()).slice(0, 20));
    }

    // Check for GitHub runs panel content
    console.log('4️⃣  Checking for GitHub runs content...');
    const runsPanel = page.locator('text=GitHub Actions Runs');
    if (await runsPanel.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   ✓ GitHub Runs Panel is visible!');
    }

    await page.screenshot({ path: '/tmp/gh-03-final.png' });
    console.log('   📸 Final screenshot: /tmp/gh-03-final.png');

    console.log('\n=========================================');
    console.log('✅ UI Test Complete');
    console.log('=========================================');

    // Keep browser open
    console.log('\nBrowser open for 30s...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: '/tmp/gh-error.png' });
  } finally {
    await browser.close();
  }
}

main();
