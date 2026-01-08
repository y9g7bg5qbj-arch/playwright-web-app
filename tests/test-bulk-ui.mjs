import { chromium } from 'playwright';

async function testBulkUpdate() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('1. Navigating to app...');
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);

  await page.screenshot({ path: '/tmp/bulk-update-1-initial.png' });
  console.log('Screenshot 1 saved: /tmp/bulk-update-1-initial.png');

  // Look for Test Data link
  console.log('2. Looking for Test Data...');
  const testDataLink = page.locator('text=Test Data').first();
  if (await testDataLink.isVisible()) {
    await testDataLink.click();
    await page.waitForTimeout(1500);
    console.log('Clicked Test Data');
  }

  await page.screenshot({ path: '/tmp/bulk-update-2-page.png' });
  console.log('Screenshot 2 saved: /tmp/bulk-update-2-page.png');

  // Check for AG Grid
  const agGrid = page.locator('.ag-root-wrapper');
  if (await agGrid.isVisible().catch(() => false)) {
    console.log('3. AG Grid found!');

    // Check checkboxes
    const checkboxes = await page.locator('.ag-selection-checkbox').count();
    console.log('   Checkboxes found: ' + checkboxes);

    // Check headers
    const headers = await page.locator('.ag-header-cell').allTextContents();
    console.log('   Headers: ' + headers.slice(0, 5).join(', '));

    // Select a row if checkboxes exist
    if (checkboxes > 1) {
      await page.locator('.ag-selection-checkbox').nth(1).click();
      await page.waitForTimeout(500);
      console.log('4. Clicked checkbox to select row');

      await page.screenshot({ path: '/tmp/bulk-update-3-selected.png' });
      console.log('Screenshot 3 saved: /tmp/bulk-update-3-selected.png');

      // Check for Update button
      const updateBtn = page.locator('button:has-text("Update")').first();
      const visible = await updateBtn.isVisible().catch(() => false);
      console.log('   Update button visible: ' + visible);

      if (visible) {
        await updateBtn.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: '/tmp/bulk-update-4-modal.png' });
        console.log('Screenshot 4 saved: /tmp/bulk-update-4-modal.png (modal)');
      }
    }
  } else {
    console.log('AG Grid NOT visible - may need to select a table first');
  }

  await browser.close();
  console.log('\nDone! Check /tmp/bulk-update-*.png');
}

testBulkUpdate().catch(console.error);
