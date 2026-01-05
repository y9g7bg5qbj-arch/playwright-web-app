import { test, expect } from '@playwright/test';

test('Untitled Test', async ({ page, context, browser }) => {
  // Test Steps
  // Unknown block type: launch-browser
  await page.goto('https://example.com', { waitUntil: 'load' });
  await page.screenshot({ path: '/Users/mikeroy/Downloads/Telegram Desktop/playwright-web-app/agent/storage/109788e8-8715-4bf4-9c96-d354c30b58f1/screenshots/step-1.png', fullPage: false });
});
