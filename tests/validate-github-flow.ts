import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = path.join(__dirname, 'evidence');

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function validateGitHubActionsFlow() {
  // Create screenshots directory
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  console.log('🚀 Starting GitHub Actions Flow Validation...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    // Step 1: Navigate to app
    console.log('📍 Step 1: Navigating to app...');
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-app-loaded.png'), fullPage: true });
    console.log('   ✅ App loaded - screenshot saved\n');

    // Step 2: Login if needed
    console.log('📍 Step 2: Checking login state...');
    const loginVisible = await page.locator('input[type="email"], input[name="email"]').isVisible({ timeout: 2000 }).catch(() => false);
    if (loginVisible) {
      console.log('   Logging in...');
      await page.fill('input[type="email"], input[name="email"]', 'admin@example.com');
      await page.fill('input[type="password"], input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-logged-in.png'), fullPage: true });
    console.log('   ✅ Ready - screenshot saved\n');

    // Step 3: Navigate to Explorer
    console.log('📍 Step 3: Opening Explorer...');
    await page.click('text=Explorer');
    await sleep(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-explorer.png'), fullPage: true });
    console.log('   ✅ Explorer opened - screenshot saved\n');

    // Step 4: Verify features folder is visible and expanded
    console.log('📍 Step 4: Checking features folder state...');

    // The features folder should already be expanded from step 3
    // DO NOT click on it as that would toggle (collapse) it
    // Just verify we can see feature files

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-tree-state.png'), fullPage: true });
    console.log('   ✅ Tree state captured\n');

    // Step 5: Select a .vero file from the features folder
    console.log('📍 Step 5: Selecting a feature file...');

    // Look for feature files - these are under the features folder
    // IMPORTANT: Do NOT select files ending with "Page.vero" as those are in the pages folder
    // Select files like Login.vero, Example.vero, Search.vero (NOT LoginPage.vero)

    let fileSelected = false;

    // Try specific feature file names (NOT page files)
    const featureFileNames = [
      'Login.vero',      // Feature file (not LoginPage.vero)
      'Example.vero',    // Feature file (not ExamplePage.vero)
      'Search.vero',
      'Shopping.vero',
      'TestFeature.vero',
      'newTest.vero'
    ];

    for (const fileName of featureFileNames) {
      // Use exact text match to avoid partial matches with Page files
      const fileLocator = page.locator(`text="${fileName}"`);
      const count = await fileLocator.count();
      if (count > 0 && await fileLocator.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        await fileLocator.first().click();
        await sleep(800);
        console.log(`   ✅ Selected ${fileName}`);
        fileSelected = true;
        break;
      }
    }

    // If no exact match, try partial match for feature-specific files
    if (!fileSelected) {
      // Look for files that contain these strings but NOT "Page"
      const partialMatches = ['AmazonSearch', 'ComprehensiveTe', 'DataDrivenTest', 'TestFeature'];
      for (const partial of partialMatches) {
        const locator = page.locator(`text=${partial}`).first();
        if (await locator.isVisible({ timeout: 1000 }).catch(() => false)) {
          await locator.click();
          await sleep(800);
          console.log(`   ✅ Selected file containing: ${partial}`);
          fileSelected = true;
          break;
        }
      }
    }

    if (!fileSelected) {
      console.log('   ⚠️ Could not find a feature file, trying any .vero file...');
      // Last resort: click any visible .vero file
      const anyVero = page.locator('text=.vero').first();
      if (await anyVero.isVisible({ timeout: 1000 }).catch(() => false)) {
        await anyVero.click();
        await sleep(800);
      }
    }

    await sleep(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-file-selected.png'), fullPage: true });
    console.log('   ✅ File selection - screenshot saved\n');

    // Step 6: Check if Run button is enabled
    console.log('📍 Step 6: Checking Run button state...');

    // Wait a moment for the UI to update after file selection
    await sleep(500);

    const runButton = page.locator('button:has-text("Run")').first();
    await runButton.waitFor({ state: 'visible', timeout: 5000 });

    let isDisabled = await runButton.getAttribute('disabled');

    if (isDisabled !== null) {
      console.log('   ⚠️ Run button still disabled, trying to find another feature file...');

      // Try clicking on files inside the features folder specifically
      const featureFiles = ['Login.vero', 'Example.vero', 'Search.vero', 'Shopping.vero', 'TestFeature.vero'];
      for (const fileName of featureFiles) {
        const file = page.locator(`text=${fileName}`);
        if (await file.isVisible({ timeout: 1000 }).catch(() => false)) {
          await file.click();
          await sleep(500);
          isDisabled = await runButton.getAttribute('disabled');
          if (isDisabled === null) {
            console.log(`   ✅ Run enabled after selecting ${fileName}`);
            break;
          }
        }
      }
    }

    if (isDisabled !== null) {
      console.log('   ⚠️ Run button is still disabled');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-run-disabled-debug.png'), fullPage: true });
      // Continue anyway to capture screenshots
    } else {
      console.log('   ✅ Run button is enabled!');
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-run-button-state.png'), fullPage: true });

    // Step 7: Click Run dropdown (the small arrow button next to Run)
    console.log('\n📍 Step 7: Opening Run dropdown...');

    // The dropdown toggle is the second button in the Run button group
    // Looking at the DOM: there's a main "Run" button and a dropdown toggle button next to it
    const allButtons = await page.locator('button').all();
    let dropdownClicked = false;

    // Find the dropdown toggle button (has ChevronDown icon, next to Run)
    for (const btn of allButtons) {
      const innerHTML = await btn.innerHTML().catch(() => '');
      if (innerHTML.includes('chevron') || innerHTML.includes('ChevronDown')) {
        const isEnabled = await btn.getAttribute('disabled') === null;
        if (isEnabled) {
          await btn.click();
          dropdownClicked = true;
          console.log('   ✅ Clicked dropdown toggle');
          break;
        }
      }
    }

    if (!dropdownClicked) {
      // Fallback: try clicking the Run button itself
      console.log('   Trying Run button click...');
      await runButton.click({ force: true });
    }

    await sleep(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-run-dropdown.png'), fullPage: true });
    console.log('   ✅ Run dropdown - screenshot saved\n');

    // Step 8: Select "Run on GitHub Actions"
    console.log('📍 Step 8: Selecting GitHub Actions option...');
    const githubOption = page.locator('text=GitHub Actions, text=Run on GitHub').first();
    if (await githubOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await githubOption.click();
      await sleep(500);
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-github-option.png'), fullPage: true });
    console.log('   ✅ GitHub option - screenshot saved\n');

    // Step 9: Click "Run on GitHub" button in the modal
    console.log('📍 Step 9: Triggering GitHub Actions run...');

    // The modal has a blue "Run on GitHub" button - click it
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09a-modal-open.png'), fullPage: true });

    const runOnGitHubButton = page.locator('button:has-text("Run on GitHub")').last(); // The action button, not the menu item
    if (await runOnGitHubButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      const triggerTime = Date.now();
      await runOnGitHubButton.click();
      console.log(`   ⏱️ Triggered at: ${new Date(triggerTime).toISOString()}`);
    }

    await sleep(3000); // Wait for the trigger request to complete
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09b-after-trigger.png'), fullPage: true });

    // Now close the modal - click the X button or Cancel
    console.log('   Closing modal...');

    // Try to find and click the close X button
    const closeButton = page.locator('button:has(svg), button[aria-label*="close"], button[aria-label*="Close"]').first();
    const cancelButton = page.locator('button:has-text("Cancel")');

    // Try clicking the X button (usually at top right of modal)
    const modalCloseX = page.locator('div.fixed button').first(); // First button in the modal overlay is often the X
    if (await modalCloseX.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Check if it looks like a close button (small, in corner)
      const box = await modalCloseX.boundingBox();
      if (box && box.width < 50) {
        await modalCloseX.click();
        console.log('   Clicked close X button');
      }
    }

    // If modal still open, try Cancel button
    if (await cancelButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await cancelButton.click();
      console.log('   Clicked Cancel button');
    }

    // If still open, press Escape multiple times
    await page.keyboard.press('Escape');
    await sleep(300);
    await page.keyboard.press('Escape');
    await sleep(500);

    // Click outside the modal to close it
    await page.mouse.click(10, 10);
    await sleep(500);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09c-modal-closed.png'), fullPage: true });
    console.log('   ✅ Run triggered - screenshot saved\n');

    // Step 10: Navigate to Execution tab
    console.log('📍 Step 10: Navigating to Execution tab...');

    // Check if modal is gone, if not click outside again
    const modalOverlay = page.locator('div.fixed.inset-0.z-50');
    if (await modalOverlay.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('   Modal still visible, clicking outside...');
      await page.mouse.click(50, 50);
      await sleep(500);
    }

    const executionTab = page.locator('button:has-text("Execution"), a:has-text("Execution")').first();
    await executionTab.waitFor({ state: 'visible', timeout: 5000 });
    await executionTab.click({ force: true }); // Force click even if something is overlapping
    await sleep(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10-execution-tab.png'), fullPage: true });
    console.log('   ✅ Execution tab - screenshot saved\n');

    // Step 11: Switch to GitHub Actions executions
    console.log('📍 Step 11: Switching to GitHub Actions tab...');
    const githubActionsTab = page.locator('button:has-text("GitHub Actions")').first();
    if (await githubActionsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await githubActionsTab.click();
      await sleep(500);
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11-github-tab.png'), fullPage: true });
    console.log('   ✅ GitHub Actions tab - screenshot saved\n');

    // Step 12: Monitor for execution completion
    console.log('📍 Step 12: Monitoring execution status...');
    let executionFound = false;
    let completedSuccessfully = false;
    let attempts = 0;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
      attempts++;

      // Look for any execution card or status indicator
      const pageText = await page.textContent('body') || '';

      if (pageText.includes('completed') || pageText.includes('success')) {
        completedSuccessfully = true;
        console.log('   ✅ Execution completed!');
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12-execution-completed.png'), fullPage: true });
        break;
      }

      if (pageText.includes('in_progress') || pageText.includes('queued') || pageText.includes('running')) {
        if (!executionFound) {
          executionFound = true;
          console.log('   ✅ Execution in progress');
          await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12a-execution-running.png'), fullPage: true });
        }
      }

      if (pageText.includes('failed')) {
        console.log('   ❌ Execution failed');
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12-execution-failed.png'), fullPage: true });
        break;
      }

      console.log(`   ⏳ Attempt ${attempts}: Waiting...`);

      // Periodically refresh
      if (attempts % 6 === 0) {
        console.log('   🔄 Refreshing...');
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Re-navigate to GitHub Actions tab
        const refreshedTab = page.locator('button:has-text("GitHub Actions")').first();
        if (await refreshedTab.isVisible({ timeout: 2000 }).catch(() => false)) {
          await refreshedTab.click();
          await sleep(500);
        }
      }

      await sleep(5000);
    }

    // Final screenshot
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '13-final-state.png'), fullPage: true });

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Execution Found: ${executionFound ? '✅ Yes' : '❌ No'}`);
    console.log(`Completed: ${completedSuccessfully ? '✅ Yes' : '❌ No'}`);
    console.log(`Screenshots: ${SCREENSHOTS_DIR}`);
    console.log('='.repeat(60));

    const screenshots = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'));
    console.log(`\n📸 Evidence (${screenshots.length}):`);
    screenshots.forEach(s => console.log(`   - ${s}`));

  } catch (error) {
    console.error('\n❌ Error:', error);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'error.png'), fullPage: true });
    throw error;
  } finally {
    console.log('\n🏁 Closing browser...');
    await browser.close();
  }
}

validateGitHubActionsFlow().catch(console.error);
