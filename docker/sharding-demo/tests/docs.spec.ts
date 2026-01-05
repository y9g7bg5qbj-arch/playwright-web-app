/**
 * Sample Test File 2 - Documentation Tests
 * 
 * More tests to demonstrate sharding across multiple files.
 */
import { test, expect } from '@playwright/test';

test.describe('Documentation Tests', () => {
    test('should load installation page', async ({ page }) => {
        await page.goto('/docs/intro');
        await expect(page.getByRole('heading', { name: /installation/i })).toBeVisible();
    });

    test('should have sidebar navigation', async ({ page }) => {
        await page.goto('/docs/intro');
        const sidebar = page.locator('.theme-doc-sidebar-container');
        await expect(sidebar).toBeVisible();
    });

    test('should load test configuration page', async ({ page }) => {
        await page.goto('/docs/test-configuration');
        await expect(page).toHaveURL(/test-configuration/);
    });

    test('should load assertions page', async ({ page }) => {
        await page.goto('/docs/test-assertions');
        await expect(page.getByText('Assertions')).toBeVisible();
    });
});
