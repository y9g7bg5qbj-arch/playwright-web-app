import { test, expect } from '@playwright/test';
import { SearchHomePage } from '../pages/SearchHomePage';

test.describe('Search', () => {
  let searchHomePage: SearchHomePage;

  test.beforeEach(async ({ page }) => {
    searchHomePage = new SearchHomePage(page);
    await test.step('Navigate to ' + 'https://www.google.com', async () => { await page.goto('https://www.google.com'); });
  });

  test('User can search for pen @smoke', async ({ page }, testInfo) => {
    await test.step('Fill SearchHomePage.searchInput', async () => { await searchHomePage.searchInput.fill('pen'); });
    await test.step('Press Enter', async () => { await page.keyboard.press('Enter'); });
    await test.step('Wait 2 seconds', async () => { await page.waitForTimeout(2000); });
    await expect(searchHomePage.searchResults).toBeVisible();

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Search using action @smoke', async ({ page }, testInfo) => {
    await searchHomePage.searchFor('pen');
    await test.step('Wait 2 seconds', async () => { await page.waitForTimeout(2000); });
    await expect(searchHomePage.searchResults).toBeVisible();

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

  test('Multiple search test @smoke', async ({ page }, testInfo) => {
    await test.step('Fill SearchHomePage.searchInput', async () => { await searchHomePage.searchInput.fill('pencil'); });
    await test.step('Press Enter', async () => { await page.keyboard.press('Enter'); });
    await test.step('Wait 2 seconds', async () => { await page.waitForTimeout(2000); });
    await expect(searchHomePage.searchResults).toBeVisible();

    // Auto-capture evidence screenshot at scenario end
    await test.step('Capture Evidence Screenshot', async () => {
      const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await testInfo.attach('evidence-screenshot', { path: screenshotPath, contentType: 'image/png' });
    });
  });

});