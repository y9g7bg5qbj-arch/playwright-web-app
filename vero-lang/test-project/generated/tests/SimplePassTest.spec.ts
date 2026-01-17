import { test, expect } from '@playwright/test';

test.describe('SimplePassTest', () => {
  test('Google Search Test @smoke', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://www.google.com', async () => { await page.goto('https://www.google.com'); });
    await expect(page.getByText('Google')).toBeVisible();
    await test.step('Take screenshot as google_homepage.png', async () => { await page.screenshot({ path: 'google_homepage.png' }); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Example Domain Test @smoke', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com', async () => { await page.goto('https://example.com'); });
    await expect(page.getByText('Example Domain')).toBeVisible();
    await test.step('Click "More information..."', async () => { await page.getByText('More information...').click(); });
    await test.step('Take screenshot as example_clicked.png', async () => { await page.screenshot({ path: 'example_clicked.png' }); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

});