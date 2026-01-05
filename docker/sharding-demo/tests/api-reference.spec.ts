/**
 * Sample Test File 3 - API Reference Tests
 * 
 * Additional tests to show clear shard distribution.
 */
import { test, expect } from '@playwright/test';

test.describe('API Reference Tests', () => {
    test('should load Page class reference', async ({ page }) => {
        await page.goto('/docs/api/class-page');
        await expect(page.getByRole('heading', { name: 'Page' })).toBeVisible();
    });

    test('should load Locator class reference', async ({ page }) => {
        await page.goto('/docs/api/class-locator');
        await expect(page.getByRole('heading', { name: 'Locator' })).toBeVisible();
    });

    test('should have method listings', async ({ page }) => {
        await page.goto('/docs/api/class-page');
        // Page should have method links
        const methodLinks = page.locator('a[href*="#page-"]');
        const count = await methodLinks.count();
        expect(count).toBeGreaterThan(5);
    });

    test('should load Browser class reference', async ({ page }) => {
        await page.goto('/docs/api/class-browser');
        await expect(page.getByRole('heading', { name: 'Browser' })).toBeVisible();
    });
});
