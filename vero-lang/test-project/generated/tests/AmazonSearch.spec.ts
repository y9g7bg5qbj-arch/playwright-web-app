import { test, expect } from '@playwright/test';
import { AmazonPage } from '../pages/AmazonPage';

test.describe('AmazonSearch', () => {
  let amazonPage: AmazonPage;

  test.beforeEach(async ({ page }) => {
    amazonPage = new AmazonPage(page);
  });

  test('Search for soccer ball and get top 3 results @smoke', async ({ page }, testInfo) => {
    await amazonPage.search('soccer ball');
    await expect(amazonPage.searchResults).toBeVisible();
    await test.step('Log: ' + 'Search completed - getting top 3 results', async () => { console.log('Search completed - getting top 3 results'); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('fty', async ({ page }, testInfo) => {
    await test.step('Navigate to ' + 'https://example.com/', async () => { await page.goto('https://example.com/'); });
    await test.step('Click HomePage.learnMore', async () => { await homePage.learnMore.click(); });
    await test.step('Click HomePage.aclick', async () => { await homePage.aclick.click(); });

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

});