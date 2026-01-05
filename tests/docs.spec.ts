/**
 * Documentation Tests - Test File 2
 * These tests run on the Playwright.dev docs pages
 */
import { test, expect } from '@playwright/test';

test.describe('Documentation', () => {
    test('should load docs intro page', async ({ page }) => {
        await page.goto('/docs/intro');
        await expect(page).toHaveTitle(/Installation|Playwright/i);
    });

    test('should have main content area', async ({ page }) => {
        await page.goto('/docs/intro');
        const mainContent = page.locator('main').first();
        await expect(mainContent).toBeVisible();
    });

    test('should have installation heading', async ({ page }) => {
        await page.goto('/docs/intro');
        const installHeading = page.getByRole('heading', { name: 'Installation', exact: true });
        await expect(installHeading).toBeVisible();
    });

    test('should navigate to writing tests page', async ({ page }) => {
        await page.goto('/docs/intro');
        const writingTestsLink = page.getByRole('link', { name: 'Writing tests', exact: true });
        await writingTestsLink.click();
        await expect(page.url()).toContain('/writing-tests');
    });
});
