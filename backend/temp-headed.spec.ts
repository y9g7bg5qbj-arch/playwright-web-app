import { test } from '@playwright/test';

test('show browser', async ({ page }) => {
  await page.goto('https://example.com');
  await page.waitForTimeout(5000);
});
