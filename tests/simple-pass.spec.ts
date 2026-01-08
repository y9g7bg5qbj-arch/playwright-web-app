import { test, expect } from '@playwright/test';

test.describe('Simple Pass Test Suite', () => {
    test('should load example.com successfully', async ({ page }) => {
        // Navigate to a reliable test page
        await page.goto('https://example.com');

        // Verify the page title
        await expect(page).toHaveTitle(/Example Domain/);

        // Verify main content
        await expect(page.locator('h1')).toContainText('Example Domain');
    });

    test('should verify Google homepage', async ({ page }) => {
        // Navigate to Google
        await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded' });

        // Verify the page loaded (flexible check for different locales)
        await expect(page.locator('body')).toBeVisible();

        // Check for search box presence
        const searchInput = page.locator('textarea[name="q"], input[name="q"]');
        await expect(searchInput.first()).toBeVisible();
    });

    test('should verify httpstat.us returns 200', async ({ page }) => {
        // Navigate to a status testing site
        await page.goto('https://httpstat.us/200');

        // Verify the response status text
        await expect(page.locator('body')).toContainText('200 OK');
    });
});
