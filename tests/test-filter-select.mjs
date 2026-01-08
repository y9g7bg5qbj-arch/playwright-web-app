import { chromium } from 'playwright';

async function testFilterPlusSelect() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('=== Testing Filter + Select Workflow ===\n');

  console.log('1. Navigating to app...');
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);

  // Click Test Data
  const testDataLink = page.locator('text=Test Data').first();
  if (await testDataLink.isVisible()) {
    await testDataLink.click();
    await page.waitForTimeout(1500);
  }

  // Select "Users" table which has more rows
  console.log('2. Selecting "Users" table...');
  const usersTable = page.locator('text=Users').first();
  if (await usersTable.isVisible()) {
    await usersTable.click();
    await page.waitForTimeout(1000);
  }

  await page.screenshot({ path: '/tmp/filter-select-1-table.png' });
  console.log('Screenshot: /tmp/filter-select-1-table.png');

  // Check for AG Grid
  const agGrid = page.locator('.ag-root-wrapper');
  if (await agGrid.isVisible().catch(() => false)) {
    console.log('3. AG Grid found');

    // Count initial rows
    const initialRows = await page.locator('.ag-row').count();
    console.log('   Initial row count: ' + initialRows);

    // Apply a filter first
    console.log('4. Applying filter...');
    const filterIcon = page.locator('.ag-header-cell-filter-button, .ag-icon-filter').first();
    if (await filterIcon.isVisible().catch(() => false)) {
      await filterIcon.click();
      await page.waitForTimeout(500);

      const filterInput = page.locator('.ag-text-field-input').first();
      if (await filterInput.isVisible().catch(() => false)) {
        // Use a partial match to get multiple rows
        await filterInput.fill('k');
        await filterInput.press('Enter');
        await page.waitForTimeout(500);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    }

    // Count filtered rows
    const filteredRows = await page.locator('.ag-row').count();
    console.log('   Filtered row count: ' + filteredRows);

    await page.screenshot({ path: '/tmp/filter-select-2-filtered.png' });
    console.log('Screenshot: /tmp/filter-select-2-filtered.png');

    // Now select specific rows from filtered results
    console.log('5. Selecting specific rows from filtered results...');
    const checkboxes = page.locator('.ag-selection-checkbox');
    const checkboxCount = await checkboxes.count();
    console.log('   Checkboxes available: ' + checkboxCount);

    if (checkboxCount >= 2) {
      // Select first row (skip header checkbox at index 0)
      await checkboxes.nth(1).click();
      await page.waitForTimeout(200);
      console.log('   Selected row 1');

      await page.screenshot({ path: '/tmp/filter-select-3-selected.png' });
      console.log('Screenshot: /tmp/filter-select-3-selected.png');

      // Check for Update button (should appear for selected rows)
      const updateBtn = page.locator('button:has-text("Update")').first();
      const updateVisible = await updateBtn.isVisible().catch(() => false);
      console.log('6. "Update" button visible: ' + updateVisible);

      // Also check if Update Filtered is still visible
      const updateFilteredBtn = page.locator('button:has-text("Update Filtered")');
      const updateFilteredVisible = await updateFilteredBtn.isVisible().catch(() => false);
      console.log('   "Update Filtered" button visible: ' + updateFilteredVisible);

      if (updateVisible) {
        // Click Update (not Update Filtered)
        console.log('7. Clicking "Update" button...');
        await updateBtn.click();
        await page.waitForTimeout(500);

        await page.screenshot({ path: '/tmp/filter-select-4-modal.png' });
        console.log('Screenshot: /tmp/filter-select-4-modal.png');

        // Check modal mode
        const selectedMode = page.locator('button:has-text("Selected")');
        const selectedModeActive = await selectedMode.evaluate(el =>
          el.classList.contains('bg-blue-600') ||
          window.getComputedStyle(el).backgroundColor.includes('59, 130, 246')
        ).catch(() => false);
        console.log('   "Selected" mode is active: ' + selectedModeActive);

        // Check preview row count
        const previewText = await page.locator('text=/Preview.*rows will be updated/').textContent().catch(() => '');
        console.log('   Preview text: ' + previewText);
      }
    }
  }

  await browser.close();
  console.log('\n=== Test Complete ===');
}

testFilterPlusSelect().catch(console.error);
