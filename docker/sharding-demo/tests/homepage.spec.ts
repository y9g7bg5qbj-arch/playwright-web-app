/**
 * Sample Test File 1 - Homepage Tests
 * 
 * These tests will be distributed across shards.
 * With --shard=1/2, some of these tests run.
 * With --shard=2/2, the remaining tests run.
 */
import { test, expect } from '@playwright/test';

test.describe('Homepage Tests', () => {
    test('should have correct title', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/Playwright/);
    });

    test('should have Get Started link', async ({ page }) => {
        await page.goto('/');
        const getStarted = page.getByRole('link', { name: 'Get started' });
        await expect(getStarted).toBeVisible();
    });

    test('should navigate to docs', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('link', { name: 'Docs' }).click();
        await expect(page.url()).toContain('/docs');
    });

    test('should have search functionality', async ({ page }) => {
        await page.goto('/');
        const searchButton = page.getByRole('button', { name: /search/i });
        await expect(searchButton).toBeVisible();
    });
});
