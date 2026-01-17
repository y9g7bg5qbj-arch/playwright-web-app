import { test, expect } from '@playwright/test';
import { AmazonSearchPage } from '../pages/AmazonSearchPage';

test.describe('SimpleSearch', () => {
  let amazonSearchPage: AmazonSearchPage;

  test.beforeEach(async ({ page }) => {
    amazonSearchPage = new AmazonSearchPage(page);
    await test.step('Navigate to ' + 'https://www.amazon.com', async () => { await page.goto('https://www.amazon.com'); });
  });

  test('Search for pen on Amazon @smoke', async ({ page }, testInfo) => {
    await test.step('Wait 2 seconds', async () => { await page.waitForTimeout(2000); });
    await test.step('Fill AmazonSearchPage.searchInput', async () => { await amazonSearchPage.searchInput.fill('pen'); });
    await test.step('Click AmazonSearchPage.searchButton', async () => { await amazonSearchPage.searchButton.click(); });
    await test.step('Wait 2 seconds', async () => { await page.waitForTimeout(2000); });
    await expect(page.getByText('pen')).toBeVisible();

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

});