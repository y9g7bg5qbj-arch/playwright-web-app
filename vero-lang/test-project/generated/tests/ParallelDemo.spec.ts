import { test, expect } from '@playwright/test';

test.describe('ParallelDemo', () => {
  test('Playwright Homepage Check @parallel', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://playwright.dev', async () => { await page.goto('https://playwright.dev'); });
    await test.step('Wait 1 seconds', async () => { await page.waitForTimeout(1000); });
    await expect(page.getByText('Playwright')).toBeVisible();
    await test.step('Log: ' + 'Scenario 1 completed', async () => { console.log('Scenario 1 completed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('GitHub Homepage Check @parallel', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://github.com', async () => { await page.goto('https://github.com'); });
    await test.step('Wait 1 seconds', async () => { await page.waitForTimeout(1000); });
    await expect(page.getByText('GitHub')).toBeVisible();
    await test.step('Log: ' + 'Scenario 2 completed', async () => { console.log('Scenario 2 completed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Google Homepage Check @parallel', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://google.com', async () => { await page.goto('https://google.com'); });
    await test.step('Wait 1 seconds', async () => { await page.waitForTimeout(1000); });
    await expect(page.getByText('Google')).toBeVisible();
    await test.step('Log: ' + 'Scenario 3 completed', async () => { console.log('Scenario 3 completed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Example Homepage Check @parallel', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com', async () => { await page.goto('https://example.com'); });
    await test.step('Wait 1 seconds', async () => { await page.waitForTimeout(1000); });
    await expect(page.getByText('Example Domain')).toBeVisible();
    await test.step('Log: ' + 'Scenario 4 completed', async () => { console.log('Scenario 4 completed'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

});