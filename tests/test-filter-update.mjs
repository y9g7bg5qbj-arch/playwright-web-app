import { chromium } from 'playwright';

async function testFilterUpdate() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('1. Navigating to app...');
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);

  // Click Test Data
  const testDataLink = page.locator('text=Test Data').first();
  if (await testDataLink.isVisible()) {
    await testDataLink.click();
    await page.waitForTimeout(1500);
  }

  // Check for AG Grid
  const agGrid = page.locator('.ag-root-wrapper');
  if (await agGrid.isVisible().catch(() => false)) {
    console.log('2. AG Grid found');

    // Click on filter icon in Username column
    const filterIcon = page.locator('[col-id="Username"] .ag-header-cell-filter-button, [col-id="Username"] .ag-icon-filter').first();
    if (await filterIcon.isVisible().catch(() => false)) {
      console.log('3. Found filter icon, clicking...');
      await filterIcon.click();
      await page.waitForTimeout(500);

      // Find and fill the filter input
      const filterInput = page.locator('.ag-text-field-input').first();
      if (await filterInput.isVisible().catch(() => false)) {
        console.log('4. Filling filter with "kjk"...');
        await filterInput.fill('kjk');
        await page.waitForTimeout(300);

        // Press Enter to apply
        await filterInput.press('Enter');
        await page.waitForTimeout(500);

        await page.screenshot({ path: '/tmp/filter-2-applied.png' });
        console.log('Screenshot: /tmp/filter-2-applied.png');

        // Press Escape to close filter popup
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }

      await page.screenshot({ path: '/tmp/filter-3-results.png' });
      console.log('Screenshot: /tmp/filter-3-results.png');

      // Check for Update Filtered button
      const updateFilteredBtn = page.locator('button:has-text("Update Filtered")');
      const visible = await updateFilteredBtn.isVisible().catch(() => false);
      console.log('5. Update Filtered button visible: ' + visible);

      if (visible) {
        const btnText = await updateFilteredBtn.textContent();
        console.log('   Button text: ' + btnText);

        await updateFilteredBtn.click();
        await page.waitForTimeout(500);

        await page.screenshot({ path: '/tmp/filter-4-modal.png' });
        console.log('Screenshot: /tmp/filter-4-modal.png');
      } else {
        console.log('   Checking for any buttons containing "Update"...');
        const allButtons = await page.locator('button').allTextContents();
        const updateButtons = allButtons.filter(b => b.toLowerCase().includes('update'));
        console.log('   Update buttons found: ' + (updateButtons.length > 0 ? updateButtons.join(', ') : 'none'));
      }
    }
  }

  await browser.close();
  console.log('\nDone!');
}

testFilterUpdate().catch(console.error);
