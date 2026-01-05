import { test, expect } from '@playwright/test';

test('Recording 7:34:31 PM', async ({ page, context, browser }) => {
  // Test Steps
  // Unknown block type: launch-browser
  await page.goto('', { waitUntil: 'load' });
  await page.screenshot({ path: '/Users/mikeroy/Downloads/Telegram Desktop/playwright-web-app/agent/storage/f05f0017-c91c-4648-a2e4-718f4b2c67ef/screenshots/step-1.png', fullPage: false });
  await page.goto('https://example.com/');
  await page.screenshot({ path: '/Users/mikeroy/Downloads/Telegram Desktop/playwright-web-app/agent/storage/f05f0017-c91c-4648-a2e4-718f4b2c67ef/screenshots/step-2.png', fullPage: false });
  const _loc3 = await page.locator('role=link[name="Learn more"]');
  await _loc3.evaluate(el => el.style.outline = '4px solid #ef4444');
  await _loc3.evaluate(el => el.style.outlineOffset = '2px');
  await page.screenshot({ path: '/Users/mikeroy/Downloads/Telegram Desktop/playwright-web-app/agent/storage/f05f0017-c91c-4648-a2e4-718f4b2c67ef/screenshots/step-3.png', fullPage: false });
  await _loc3.evaluate(el => { el.style.outline = ''; el.style.outlineOffset = ''; });
  await _loc3.click();
  const _loc4 = await page.locator('role=heading[name="Further Reading"]');
  await _loc4.evaluate(el => el.style.outline = '4px solid #ef4444');
  await _loc4.evaluate(el => el.style.outlineOffset = '2px');
  await page.screenshot({ path: '/Users/mikeroy/Downloads/Telegram Desktop/playwright-web-app/agent/storage/f05f0017-c91c-4648-a2e4-718f4b2c67ef/screenshots/step-4.png', fullPage: false });
  await _loc4.evaluate(el => { el.style.outline = ''; el.style.outlineOffset = ''; });
  await _loc4.click();
  const _loc5 = await page.locator('role=link[name="IANA-managed Reserved Domains"]');
  await _loc5.evaluate(el => el.style.outline = '4px solid #ef4444');
  await _loc5.evaluate(el => el.style.outlineOffset = '2px');
  await page.screenshot({ path: '/Users/mikeroy/Downloads/Telegram Desktop/playwright-web-app/agent/storage/f05f0017-c91c-4648-a2e4-718f4b2c67ef/screenshots/step-5.png', fullPage: false });
  await _loc5.evaluate(el => { el.style.outline = ''; el.style.outlineOffset = ''; });
  await _loc5.click();
});
