import { test, expect } from '@playwright/test';

test('generated flow', async ({ page }) => {
  await page.goto('https://www.example.com/');
  await page.screenshot({ path: '/Users/mikeroy/Downloads/Telegram Desktop/playwright-web-app/backend/storage/exec-1765948799166/screenshots/step-1.png', fullPage: false });
  const _loc2 = await page.getByRole('link', { name: 'Learn more' });
  await _loc2.evaluate(el => el.style.outline = '4px solid #ef4444');
  await _loc2.evaluate(el => el.style.outlineOffset = '2px');
  await page.screenshot({ path: '/Users/mikeroy/Downloads/Telegram Desktop/playwright-web-app/backend/storage/exec-1765948799166/screenshots/step-2.png', fullPage: false });
  await _loc2.evaluate(el => { el.style.outline = ''; el.style.outlineOffset = ''; });
  await _loc2.click();
  const _loc3 = await page.getByRole('link', { name: 'IANA-managed Reserved Domains' });
  await _loc3.evaluate(el => el.style.outline = '4px solid #ef4444');
  await _loc3.evaluate(el => el.style.outlineOffset = '2px');
  await page.screenshot({ path: '/Users/mikeroy/Downloads/Telegram Desktop/playwright-web-app/backend/storage/exec-1765948799166/screenshots/step-3.png', fullPage: false });
  await _loc3.evaluate(el => { el.style.outline = ''; el.style.outlineOffset = ''; });
  await _loc3.click();
});