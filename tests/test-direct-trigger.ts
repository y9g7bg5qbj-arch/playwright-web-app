import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = path.join(__dirname, 'evidence');

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testDirectTrigger() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  console.log('🚀 Testing GitHub Actions Integration - Direct Trigger\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 200
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  // Capture console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[GitHub') || text.includes('runOnGitHub') || text.includes('execution')) {
      console.log(`   [Console] ${text}`);
    }
  });

  try {
    // Step 1: Navigate to app
    console.log('📍 Step 1: Opening app...');
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'direct-01-app.png'), fullPage: true });

    // Step 2: Navigate to Explorer and select a feature file
    console.log('📍 Step 2: Selecting feature file...');
    await page.click('text=Explorer');
    await sleep(500);

    // Click on a .vero file in features folder
    const fileNames = ['Login.vero', 'Example.vero', 'Search.vero'];
    for (const fileName of fileNames) {
      const file = page.locator(`text="${fileName}"`);
      if (await file.isVisible({ timeout: 1000 }).catch(() => false)) {
        await file.click();
        await sleep(800);
        console.log(`   Selected ${fileName}`);
        break;
      }
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'direct-02-file-selected.png'), fullPage: true });

    // Step 3: Check Run button state
    console.log('📍 Step 3: Checking Run button...');
    const runButton = page.locator('button:has-text("Run")').first();
    const isDisabled = await runButton.getAttribute('disabled');
    console.log(`   Run button disabled: ${isDisabled !== null}`);

    // Step 4: Open the GitHub modal and click Run on GitHub properly
    console.log('📍 Step 4: Opening GitHub modal...');

    // Click the dropdown toggle (the small arrow next to Run)
    const allButtons = await page.locator('button').all();
    for (const btn of allButtons) {
      const innerHTML = await btn.innerHTML().catch(() => '');
      if (innerHTML.includes('chevron') || innerHTML.includes('ChevronDown')) {
        const isEnabled = await btn.getAttribute('disabled') === null;
        if (isEnabled) {
          await btn.click();
          console.log('   Clicked dropdown toggle');
          break;
        }
      }
    }
    await sleep(500);

    // Click "Run on GitHub Actions" option
    const githubOption = page.locator('text=Run on GitHub Actions').first();
    if (await githubOption.isVisible({ timeout: 3000 })) {
      await githubOption.click();
      console.log('   Clicked "Run on GitHub Actions" option');
    }
    await sleep(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'direct-03-modal-open.png'), fullPage: true });

    // Step 5: Find and click the EXACT "Run on GitHub" button in the modal
    console.log('📍 Step 5: Clicking Run on GitHub button...');

    // Wait for modal to be fully visible
    await page.waitForSelector('text=Run on GitHub Actions', { state: 'visible', timeout: 5000 });

    // Find the button by its specific characteristics - it's the purple button with "Run on GitHub" text
    // and a Play icon
    const modalButtons = await page.locator('button').all();
    let runOnGitHubClicked = false;

    for (const btn of modalButtons) {
      const text = await btn.textContent().catch(() => '');
      const className = await btn.getAttribute('class').catch(() => '');

      // The "Run on GitHub" button in modal has purple background
      if (text?.includes('Run on GitHub') && !text.includes('Actions') && className?.includes('purple')) {
        console.log(`   Found "Run on GitHub" button: ${text}`);
        const isDisabled = await btn.getAttribute('disabled');
        if (isDisabled !== null) {
          console.log('   ❌ Button is DISABLED - GitHub not connected!');
        } else {
          await btn.click();
          runOnGitHubClicked = true;
          console.log('   ✅ Clicked "Run on GitHub" button');
        }
        break;
      }
    }

    if (!runOnGitHubClicked) {
      // Try a more direct approach
      const runBtn = page.locator('button:has-text("Run on GitHub"):not(:has-text("Actions"))').last();
      if (await runBtn.isVisible({ timeout: 2000 })) {
        const isDisabled = await runBtn.getAttribute('disabled');
        console.log(`   Direct locator found button, disabled: ${isDisabled !== null}`);
        if (isDisabled === null) {
          await runBtn.click();
          runOnGitHubClicked = true;
          console.log('   ✅ Clicked via direct locator');
        }
      }
    }

    await sleep(3000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'direct-04-after-click.png'), fullPage: true });

    // Step 6: Wait for view to switch to Execution tab (happens automatically after trigger)
    console.log('\n📍 Step 6: Waiting for Execution tab (auto-navigated after trigger)...');
    await page.keyboard.press('Escape'); // Close any modal
    await sleep(2000);

    // The trigger already navigates to Execution tab via setActiveSettingsView('executions')
    // Check if we're seeing the execution dashboard
    const executionHeader = page.locator('text=Execution History, text=Back to Editor');
    if (await executionHeader.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   ✅ Already on Execution Dashboard');
    } else {
      console.log('   Clicking Execution button to navigate...');
      const executionTab = page.locator('button:has-text("Execution")').first();
      await executionTab.click({ force: true });
      await sleep(1000);
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'direct-05-execution-tab.png'), fullPage: true });

    // Step 7: Click GitHub Actions tab if visible
    const githubTab = page.locator('button:has-text("GitHub Actions")').first();
    if (await githubTab.isVisible({ timeout: 2000 })) {
      await githubTab.click();
      await sleep(500);
      console.log('   Switched to GitHub Actions tab');
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'direct-06-github-tab.png'), fullPage: true });

    // Step 8: Monitor for execution and completion
    console.log('\n📍 Step 7: Monitoring execution...');
    let foundExecution = false;
    let completed = false;

    for (let i = 0; i < 90; i++) { // 7.5 minutes max
      const pageText = await page.textContent('body') || '';

      // Check for execution status indicators
      if (pageText.includes('queued') || pageText.includes('in_progress') || pageText.includes('completed')) {
        if (!foundExecution) {
          foundExecution = true;
          console.log(`   ✅ Execution found in UI!`);
          await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'direct-07-execution-found.png'), fullPage: true });
        }
      }

      if (pageText.includes('completed') || pageText.includes('success') || pageText.includes('passed')) {
        if (pageText.includes('passed') || pageText.includes('scenarios')) {
          completed = true;
          console.log(`   ✅ Execution completed with report!`);
          await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'direct-08-completed.png'), fullPage: true });
          break;
        }
      }

      if (pageText.includes('No GitHub Actions runs yet')) {
        console.log(`   ⏳ Attempt ${i + 1}: No executions yet...`);
      } else if (foundExecution) {
        console.log(`   ⏳ Attempt ${i + 1}: Waiting for completion...`);
      }

      // Refresh periodically
      if (i > 0 && i % 12 === 0) {
        console.log('   🔄 Refreshing...');
        await page.reload();
        await page.waitForLoadState('networkidle');
        const refreshedTab = page.locator('button:has-text("GitHub Actions")').first();
        if (await refreshedTab.isVisible({ timeout: 2000 })) {
          await refreshedTab.click();
          await sleep(500);
        }
      }

      await sleep(5000);
    }

    // Final screenshot
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'direct-09-final.png'), fullPage: true });

    // Check localStorage for execution data
    console.log('\n📍 Step 8: Checking store state...');
    const localStorage = await page.evaluate(() => {
      return localStorage.getItem('github-executions');
    });
    console.log(`   localStorage: ${localStorage ? localStorage.substring(0, 200) + '...' : '(empty)'}`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 RESULTS');
    console.log('='.repeat(60));
    console.log(`Run on GitHub clicked: ${runOnGitHubClicked ? '✅' : '❌'}`);
    console.log(`Execution found in UI: ${foundExecution ? '✅' : '❌'}`);
    console.log(`Report displayed: ${completed ? '✅' : '❌'}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error:', error);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'direct-error.png'), fullPage: true });
  } finally {
    console.log('\n🏁 Closing browser...');
    await browser.close();
  }
}

testDirectTrigger().catch(console.error);
