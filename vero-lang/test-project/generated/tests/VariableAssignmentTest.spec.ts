import { test, expect } from '@playwright/test';
import { ExamplePage } from '../pages/ExamplePage';

test.describe('VariableAssignmentTest', () => {
  let examplePage: ExamplePage;

  test.beforeEach(async ({ page }) => {
    examplePage = new ExamplePage(page);
  });

  test('Test Variable Verification', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com', async () => { await page.goto('https://example.com'); });
    await test.step('Wait 1 seconds', async () => { await page.waitForTimeout(1000); });
    await expect(page.getByText('Example Domain')).toBeVisible();

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

});