import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://example.com/');
  await page.screenshot({ path: '/Users/mikeroy/Downloads/Telegram Desktop/playwright-web-app/agent/storage/c188d790-1b12-4528-9512-09736f2e3607/screenshots/step-1.png', fullPage: false });
  await page.getByRole('link', { name: 'Learn more' }).click();
  await page.screenshot({ path: '/Users/mikeroy/Downloads/Telegram Desktop/playwright-web-app/agent/storage/c188d790-1b12-4528-9512-09736f2e3607/screenshots/step-2.png', fullPage: false });
  await page.getByRole('link', { name: 'IANA-managed Reserved Domains' }).click();
  await page.screenshot({ path: '/Users/mikeroy/Downloads/Telegram Desktop/playwright-web-app/agent/storage/c188d790-1b12-4528-9512-09736f2e3607/screenshots/step-3.png', fullPage: false });
});