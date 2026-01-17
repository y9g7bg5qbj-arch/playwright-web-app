import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';

test.describe('Example', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
  });

  test('Parallel Test 1 @parallel', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com/', async () => { await page.goto('https://example.com/'); });
    await test.step('Wait 3 seconds', async () => { await page.waitForTimeout(3000); });
    await test.step('Log: ' + 'scenario 1 step', async () => { console.log('scenario 1 step'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Parallel Test 2 @parallel', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com/', async () => { await page.goto('https://example.com/'); });
    await test.step('Wait 3 seconds', async () => { await page.waitForTimeout(3000); });
    await test.step('Log: ' + 'scenario 2 step', async () => { console.log('scenario 2 step'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Parallel Test 3 @parallel', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com/', async () => { await page.goto('https://example.com/'); });
    await test.step('Wait 3 seconds', async () => { await page.waitForTimeout(3000); });
    await test.step('Log: ' + 'scenario 3 step', async () => { console.log('scenario 3 step'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Parallel Test 4 @parallel', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com/', async () => { await page.goto('https://example.com/'); });
    await test.step('Wait 3 seconds', async () => { await page.waitForTimeout(3000); });
    await test.step('Log: ' + 'scenario 4 step', async () => { console.log('scenario 4 step'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Example Navigation Test @smoke', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com/', async () => { await page.goto('https://example.com/'); });
    await test.step('Click HomePage.learnMore', async () => { await homePage.learnMore.click(); });
    await test.step('Click HomePage.aclick', async () => { await homePage.aclick.click(); });
    await test.step('Click HomePage.header', async () => { await homePage.header.click(); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

});