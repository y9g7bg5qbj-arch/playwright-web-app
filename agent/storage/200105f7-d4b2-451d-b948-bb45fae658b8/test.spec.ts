import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://example.com/');
  await page.screenshot({ path: '/Users/mikeroy/Downloads/Telegram Desktop/playwright-web-app/agent/storage/200105f7-d4b2-451d-b948-bb45fae658b8/screenshots/step-1.png', fullPage: false });
  await page.getByRole('link', { name: 'Learn more' }).click();
  await page.screenshot({ path: '/Users/mikeroy/Downloads/Telegram Desktop/playwright-web-app/agent/storage/200105f7-d4b2-451d-b948-bb45fae658b8/screenshots/step-2.png', fullPage: false });
  await page.getByRole('link', { name: 'IANA-managed Reserved Domains' }).click();
  await page.screenshot({ path: '/Users/mikeroy/Downloads/Telegram Desktop/playwright-web-app/agent/storage/200105f7-d4b2-451d-b948-bb45fae658b8/screenshots/step-3.png', fullPage: false });
});