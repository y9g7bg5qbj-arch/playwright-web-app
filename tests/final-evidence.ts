import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = path.join(__dirname, 'evidence');

async function captureEvidence() {
  console.log('📸 Capturing Final Evidence Screenshots\n');

  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  try {
    // Open app
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Navigate to Execution tab
    console.log('📍 Navigating to Execution tab...');
    await page.click('button:has-text("Execution")');
    await page.waitForTimeout(1000);

    // Click GitHub Actions tab
    const githubTab = page.locator('button:has-text("GitHub Actions")').first();
    if (await githubTab.isVisible({ timeout: 2000 })) {
      await githubTab.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'FINAL-01-github-actions-tab.png'), fullPage: true });
    console.log('   ✅ Screenshot: GitHub Actions tab');

    // Check for execution cards
    const pageText = await page.textContent('body') || '';

    if (pageText.includes('completed') || pageText.includes('success') || pageText.includes('Vero Tests')) {
      console.log('   ✅ Found execution(s) in UI!');

      // Try to expand the first execution card to see details
      const expandButton = page.locator('button[class*="expand"], svg[class*="chevron"]').first();
      if (await expandButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expandButton.click();
        await page.waitForTimeout(500);
      }

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'FINAL-02-execution-details.png'), fullPage: true });
      console.log('   ✅ Screenshot: Execution details');
    } else {
      console.log('   ⚠️ No executions visible - localStorage may be empty');
    }

    // Check localStorage
    const storageData = await page.evaluate(() => localStorage.getItem('github-executions'));
    if (storageData) {
      const parsed = JSON.parse(storageData);
      console.log(`\n📊 Stored Executions: ${parsed.state?.executions?.length || 0}`);
      parsed.state?.executions?.forEach((e: any) => {
        console.log(`   - Run #${e.runNumber}: ${e.status} ${e.conclusion || ''}`);
        if (e.totalTests > 0) {
          console.log(`     Tests: ${e.passedTests} passed, ${e.failedTests} failed`);
        }
        if (e.scenarios?.length) {
          console.log(`     Scenarios: ${e.scenarios.length}`);
        }
      });
    }

    console.log('\n✅ Evidence captured successfully!');
    console.log(`   Screenshots saved to: ${SCREENSHOTS_DIR}`);

  } finally {
    await browser.close();
  }
}

captureEvidence().catch(console.error);
