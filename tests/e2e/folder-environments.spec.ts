import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

// Test credentials - adjust as needed
const TEST_USER = {
  email: 'test@example.com',
  password: 'password123'
};

test.describe('Folder-Based Environment System', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto(BASE_URL);

    // Login if needed (check if login page is shown)
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")');
    if (await loginButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.fill('input[type="email"], input[name="email"]', TEST_USER.email);
      await page.fill('input[type="password"], input[name="password"]', TEST_USER.password);
      await loginButton.click();
      await page.waitForURL('**/workspace**', { timeout: 10000 }).catch(() => {});
    }
  });

  test('TC-01: New Project Creates Environment Folders', async ({ page }) => {
    // Step 1-4: Navigate to workspace, find create project button
    await expect(page.locator('text=EXPLORER')).toBeVisible();

    // Step 5: Click "Create First Project" or "+" button
    const createButton = page.locator('button:has-text("Create First Project"), button[title="New Project"]');
    await createButton.click();

    // Step 6: Enter project name
    const nameInput = page.locator('input[placeholder*="name"], input[name="name"]');
    await nameInput.fill('Test Environment Structure');

    // Step 7: Click Create/Save
    await page.locator('button:has-text("Create"), button:has-text("Save")').click();

    // Step 8-10: Verify environment folders
    await expect(page.locator('text=Production')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Development')).toBeVisible();
    await expect(page.locator('text=Sandboxes')).toBeVisible();

    // Verify PROD badge on Production
    await expect(page.locator('text=PROD')).toBeVisible();
  });

  test('TC-02: Environment Folder Icons Display Correctly', async ({ page }) => {
    // Expand a project to see environments
    await page.locator('.explorer-project, [data-testid="project"]').first().click();

    // Verify Production has green icon (verified icon)
    const productionRow = page.locator('text=Production').locator('..');
    await expect(productionRow.locator('.text-green-500, [class*="green"]')).toBeVisible();

    // Verify Development has blue icon
    const devRow = page.locator('text=Development').locator('..');
    await expect(devRow.locator('.text-blue-500, [class*="blue"]')).toBeVisible();

    // Verify Sandboxes has purple icon
    const sandboxRow = page.locator('text=Sandboxes').locator('..');
    await expect(sandboxRow.locator('.text-purple-500, [class*="purple"]')).toBeVisible();
  });

  test('TC-03: Production Environment Contains Standard Subfolders', async ({ page }) => {
    // Expand project and Production
    await page.locator('text=Production').click();

    // Verify Pages, Features, Data folders exist
    await expect(page.locator('text=Pages')).toBeVisible();
    await expect(page.locator('text=Features')).toBeVisible();
    await expect(page.locator('text=Data')).toBeVisible();
  });

  test('TC-04: Development Environment Contains Standard Subfolders', async ({ page }) => {
    // Expand project and Development
    await page.locator('text=Development').click();

    // Verify Pages, Features, Data folders exist
    await expect(page.locator('text=Pages')).toBeVisible();
    await expect(page.locator('text=Features')).toBeVisible();
    await expect(page.locator('text=Data')).toBeVisible();
  });

  test('TC-05: Create First Sandbox Successfully', async ({ page }) => {
    // Right-click on Sandboxes or find create sandbox button
    await page.locator('text=Sandboxes').click({ button: 'right' });
    await page.locator('text=Create Sandbox, text=New Sandbox').click();

    // Fill sandbox name
    await page.locator('input[placeholder*="name"], input[name="name"]').fill('my-first-sandbox');

    // Select source (dev)
    const sourceSelect = page.locator('select, [role="combobox"]').filter({ hasText: /dev|source/i });
    if (await sourceSelect.isVisible()) {
      await sourceSelect.selectOption('dev');
    }

    // Click Create
    await page.locator('button:has-text("Create")').click();

    // Verify sandbox appears
    await expect(page.locator('text=my-first-sandbox')).toBeVisible({ timeout: 5000 });
  });

  test('TC-06: Sandbox Displays Purple Icon', async ({ page }) => {
    // Expand Sandboxes folder
    await page.locator('text=Sandboxes').click();

    // Find a sandbox and verify purple icon
    const sandboxItem = page.locator('[class*="sandbox"], .sandbox-item').first();
    await expect(sandboxItem.locator('[class*="purple"]')).toBeVisible();
  });

  test('TC-08: Compare With Feature - Identical Files Show No Diff', async ({ page }) => {
    // Navigate to a file in sandbox
    await page.locator('text=Sandboxes').click();
    await page.locator('text=Pages').first().click();

    // Right-click on a file
    await page.locator('text=example.vero').first().click({ button: 'right' });

    // Select Compare With
    await page.locator('text=Compare With').click();

    // Select environments in modal
    await page.locator('select, [role="combobox"]').first().selectOption('dev');

    // Click Compare
    await page.locator('button:has-text("Compare")').click();

    // Verify no differences shown (files are identical)
    const diffViewer = page.locator('.diff-viewer, [class*="diff"]');
    await expect(diffViewer).toBeVisible();

    // Check for "no differences" or empty hunks
    const noDiffMessage = page.locator('text=No differences, text=identical, text=Files are the same');
    const hasDiff = await noDiffMessage.isVisible().catch(() => false);

    if (!hasDiff) {
      // If no explicit message, check that there are no add/delete lines
      const additions = await page.locator('.diff-add, [class*="add"]').count();
      const deletions = await page.locator('.diff-delete, [class*="delete"]').count();
      expect(additions + deletions).toBe(0);
    }
  });

  test('TC-09: Compare With Feature - Modified Files Show Diff', async ({ page }) => {
    // Open a file in sandbox and edit it
    await page.locator('text=Sandboxes').click();
    await page.locator('text=my-first-sandbox').click();
    await page.locator('text=Pages').click();
    await page.locator('text=example.vero').click();

    // Wait for editor
    const editor = page.locator('.cm-editor, .CodeMirror, [class*="editor"]');
    await expect(editor).toBeVisible();

    // Add a line to the file
    await editor.click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('# Modified in sandbox for testing');

    // Save (Ctrl+S)
    await page.keyboard.press('Control+s');
    await page.waitForTimeout(500);

    // Right-click file > Compare With
    await page.locator('text=example.vero').first().click({ button: 'right' });
    await page.locator('text=Compare With').click();

    // Compare with Development
    await page.locator('button:has-text("Compare")').click();

    // Verify diff shows the added line
    await expect(page.locator('text=Modified in sandbox for testing')).toBeVisible();
    await expect(page.locator('.diff-add, [class*="add"]').first()).toBeVisible();
  });

  test('TC-10: Maximum 5 Sandboxes Per User Limit Enforced', async ({ page }) => {
    // Create 5 sandboxes
    for (let i = 1; i <= 5; i++) {
      await page.locator('text=Sandboxes').click({ button: 'right' });
      await page.locator('text=Create Sandbox').click();
      await page.locator('input[name="name"]').fill(`sandbox-limit-test-${i}`);
      await page.locator('button:has-text("Create")').click();
      await page.waitForTimeout(500);
    }

    // Try to create 6th sandbox
    await page.locator('text=Sandboxes').click({ button: 'right' });
    await page.locator('text=Create Sandbox').click();
    await page.locator('input[name="name"]').fill('sandbox-limit-test-6');
    await page.locator('button:has-text("Create")').click();

    // Verify error message about limit
    await expect(page.locator('text=Maximum 5, text=limit')).toBeVisible({ timeout: 3000 });
  });

  test('TC-11: Delete Sandbox Removes It', async ({ page }) => {
    // Create a sandbox to delete
    await page.locator('text=Sandboxes').click({ button: 'right' });
    await page.locator('text=Create Sandbox').click();
    await page.locator('input[name="name"]').fill('sandbox-to-delete');
    await page.locator('button:has-text("Create")').click();
    await expect(page.locator('text=sandbox-to-delete')).toBeVisible();

    // Delete it
    await page.locator('text=sandbox-to-delete').click({ button: 'right' });
    await page.locator('text=Delete').click();

    // Confirm deletion if dialog appears
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
    if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmButton.click();
    }

    // Verify sandbox is gone
    await expect(page.locator('text=sandbox-to-delete')).not.toBeVisible({ timeout: 3000 });
  });

  test('TC-14: Compare Dropdown Shows All Environments', async ({ page }) => {
    // Open Compare With modal
    await page.locator('text=example.vero').first().click({ button: 'right' });
    await page.locator('text=Compare With').click();

    // Open source dropdown
    const dropdown = page.locator('select, [role="combobox"]').first();
    await dropdown.click();

    // Verify all environments are listed
    await expect(page.locator('text=Production, option:has-text("Production")')).toBeVisible();
    await expect(page.locator('text=Development, option:has-text("Development")')).toBeVisible();

    // Check for sandboxes (if any exist)
    const sandboxOptions = page.locator('option[value*="sandbox"], [role="option"]:has-text("sandbox")');
    const sandboxCount = await sandboxOptions.count();
    console.log(`Found ${sandboxCount} sandboxes in dropdown`);
  });

  test('TC-16: Create New File in Sandbox Only', async ({ page }) => {
    // Expand sandbox > Pages
    await page.locator('text=Sandboxes').click();
    await page.locator('text=my-first-sandbox').click();
    await page.locator('text=Pages').click();

    // Hover and click add file button
    await page.locator('text=Pages').hover();
    await page.locator('button[title="New File"], button:has-text("+")').click();

    // Enter filename
    await page.locator('input[placeholder*="name"]').fill('NewLoginPage.vero');
    await page.keyboard.press('Enter');

    // Verify file exists in sandbox
    await expect(page.locator('text=NewLoginPage.vero')).toBeVisible();

    // Verify file NOT in dev
    await page.locator('text=Development').click();
    await page.locator('text=Pages').nth(1).click(); // Second Pages is under Development
    await expect(page.locator('text=NewLoginPage.vero')).not.toBeVisible({ timeout: 2000 });
  });

  test('TC-19: Production Environment Folders Dont Show Add Button', async ({ page }) => {
    // Expand Production
    await page.locator('text=Production').click();

    // Hover over Pages folder
    const pagesFolder = page.locator('text=Pages').first();
    await pagesFolder.hover();

    // Verify NO add button appears
    const addButton = page.locator('button[title="New File"], button:has-text("+")').first();
    await expect(addButton).not.toBeVisible({ timeout: 1000 });
  });

  test('TC-20: Full Workflow - Create, Edit, Compare', async ({ page }) => {
    // Step 1-2: Create new sandbox
    await page.locator('text=Sandboxes').click({ button: 'right' });
    await page.locator('text=Create Sandbox').click();
    await page.locator('input[name="name"]').fill('feature-complete-test');
    await page.locator('button:has-text("Create")').click();
    await expect(page.locator('text=feature-complete-test')).toBeVisible();

    // Step 3-4: Navigate to file
    await page.locator('text=feature-complete-test').click();
    await page.locator('text=Features').click();
    await page.locator('text=example.vero').click();

    // Step 5-6: Edit file
    const editor = page.locator('.cm-editor, .CodeMirror');
    await editor.click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('SCENARIO "Complete workflow test"');
    await page.keyboard.press('Enter');
    await page.keyboard.type('  navigate to "https://example.com"');
    await page.keyboard.press('Enter');
    await page.keyboard.type('  click "Test Button"');
    await page.keyboard.press('Enter');
    await page.keyboard.type('END');

    // Step 7: Save
    await page.keyboard.press('Control+s');
    await page.waitForTimeout(500);

    // Step 8-9: Compare with dev
    await page.locator('text=example.vero').click({ button: 'right' });
    await page.locator('text=Compare With').click();
    await page.locator('button:has-text("Compare")').click();

    // Step 10: Verify diff shows additions
    await expect(page.locator('text=Complete workflow test')).toBeVisible();
    await expect(page.locator('.diff-add, [class*="add"]').first()).toBeVisible();

    console.log('TC-20: Full workflow completed successfully!');
  });
});
