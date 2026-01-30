import { test, expect } from '@playwright/test';

test.describe('ManualTest', () => {
  test('Visit Example Dot Com', async ({ page }, testInfo) => {
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

  test('Visit Google', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://www.google.com', async () => { await page.goto('https://www.google.com'); });
    await test.step('Wait 1 seconds', async () => { await page.waitForTimeout(1000); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

});