import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://example.com/');
  await page.getByRole('link', { name: 'Learn more' }).click();
  await page.getByRole('heading', { name: 'Further Reading' }).click();
  await page.getByRole('link', { name: 'IANA-managed Reserved Domains' }).click();
});