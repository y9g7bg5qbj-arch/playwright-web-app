import { test, expect } from '@playwright/test';
import { SearchHomePage } from '../pages/SearchHomePage';

test.describe('Search', () => {
  let searchHomePage: SearchHomePage;

  test.beforeEach(async ({ page }) => {
    searchHomePage = new SearchHomePage(page);
    await page.goto('https://www.google.com');
  });

  test('User can search for pen @smoke', async ({ page }) => {
    await searchHomePage.searchInput.fill('pen');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    await expect(searchHomePage.searchResults).toBeVisible();
  });

  test('Search using action @smoke', async ({ page }) => {
    await searchHomePage.searchFor('pen');
    await page.waitForTimeout(2000);
    await expect(searchHomePage.searchResults).toBeVisible();
  });

});