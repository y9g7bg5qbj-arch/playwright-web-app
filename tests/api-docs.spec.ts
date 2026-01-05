/**
 * API Reference Tests - Test File 3
 * These tests run on the Playwright.dev API documentation
 */
import { test, expect } from '@playwright/test';

test.describe('API Reference', () => {
    test('should load Page class documentation', async ({ page }) => {
        await page.goto('/docs/api/class-page');
        await expect(page).toHaveTitle(/Page/);
    });

    test('should display Page methods', async ({ page }) => {
        await page.goto('/docs/api/class-page');
        const gotoMethod = page.getByRole('link', { name: 'page.goto' });
        await expect(gotoMethod).toBeVisible();
    });

    test('should load Locator class documentation', async ({ page }) => {
        await page.goto('/docs/api/class-locator');
        await expect(page).toHaveTitle(/Locator/);
    });

    test('should load Browser class documentation', async ({ page }) => {
        await page.goto('/docs/api/class-browser');
        await expect(page).toHaveTitle(/Browser/);
    });
});
