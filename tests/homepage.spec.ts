/**
 * Homepage Tests - Test File 1
 * These tests run on the Playwright.dev homepage
 */
import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
    test('should display correct page title', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/Playwright/);
    });

    test('should have Get Started button', async ({ page }) => {
        await page.goto('/');
        const getStarted = page.getByRole('link', { name: 'Get started' });
        await expect(getStarted).toBeVisible();
    });

    test('should have navigation menu', async ({ page }) => {
        await page.goto('/');
        const docsLink = page.getByRole('link', { name: 'Docs' });
        await expect(docsLink).toBeVisible();
    });

    test('should have footer', async ({ page }) => {
        await page.goto('/');
        const footer = page.locator('footer');
        await expect(footer).toBeVisible();
    });
});
