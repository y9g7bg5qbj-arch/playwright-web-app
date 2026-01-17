import { test, expect } from '@playwright/test';
import { TestPage } from '../pages/TestPage';
import { HomePage } from '../pages/HomePage';

test.describe('ComprehensiveTest', () => {
  let testPage: TestPage;
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    testPage = new TestPage(page);
    homePage = new HomePage(page);
    await test.step('Navigate to ' + 'https://example.com', async () => { await page.goto('https://example.com'); });
  });

  test('Test basic actions and assertions @smoke @comprehensive', async ({ page }, testInfo) => {
    await test.step('Log: ' + 'Starting comprehensive test', async () => { console.log('Starting comprehensive test'); });
    await expect(testPage.heading).toBeVisible();
    await test.step('Wait 2 seconds', async () => { await page.waitForTimeout(2000); });
    await testPage.fillAndSubmit('test value');
    await test.step('Hover TestPage.heading', async () => { await testPage.heading.hover(); });
    await test.step('Press Escape', async () => { await page.keyboard.press('Escape'); });
    await test.step('Log: ' + 'All tests completed successfully', async () => { console.log('All tests completed successfully'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Example page navigation @smoke', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com/', async () => { await page.goto('https://example.com/'); });
    await test.step('Click HomePage.learnMore', async () => { await homePage.learnMore.click(); });
    await test.step('Wait 1 seconds', async () => { await page.waitForTimeout(1000); });
    await test.step('Click HomePage.aclick', async () => { await homePage.aclick.click(); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

});