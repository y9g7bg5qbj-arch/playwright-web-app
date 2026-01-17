import { test, expect } from '@playwright/test';
import { DataTestPage } from '../pages/DataTestPage';

test.describe('DataDrivenTest', () => {
  let dataTestPage: DataTestPage;

  test.beforeEach(async ({ page }) => {
    dataTestPage = new DataTestPage(page);
  });

  test('Basic form interaction @datadriven', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com/users', async () => { await page.goto('https://example.com/users'); });
    await test.step('Log: ' + 'Data test placeholder', async () => { console.log('Data test placeholder'); });
    await expect(dataTestPage.usernameInput).toBeVisible();

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Form submission test @datadriven', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com/form', async () => { await page.goto('https://example.com/form'); });
    await test.step('Fill DataTestPage.emailInput', async () => { await dataTestPage.emailInput.fill('test@example.com'); });
    await test.step('Click DataTestPage.submitBtn', async () => { await dataTestPage.submitBtn.click(); });
    await test.step('Wait 1 seconds', async () => { await page.waitForTimeout(1000); });
    await test.step('Log: ' + 'Form submitted', async () => { console.log('Form submitted'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

});