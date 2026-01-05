import { test, expect } from '@playwright/test';

test('Untitled Test', async ({ page, context, browser }) => {
  // Test Steps
  // Unknown block type: launch-browser
  await page.goto('https://example.com', { waitUntil: 'load' });
  await page.screenshot({ path: '/Users/mikeroy/Downloads/Telegram Desktop/playwright-web-app/agent/storage/5ba3a05f-3f5f-49ad-8a9e-34c40cfb6e86/screenshots/step-1.png', fullPage: false });
});
