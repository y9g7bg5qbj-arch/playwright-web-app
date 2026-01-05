import { test, expect } from '@playwright/test';
import { ExamplePage } from '../pages/ExamplePage';

test.describe('Example', () => {
  let examplePage: ExamplePage;

  test.beforeEach(async ({ page }) => {
    examplePage = new ExamplePage(page);
    await page.goto('https://example.com');
  });

  test('Click learn more link @smoke', async ({ page }) => {
    await expect(examplePage.heading).toBeVisible();
    await examplePage.learnMoreLink.click();
    await page.waitForTimeout(2000);
  });

});