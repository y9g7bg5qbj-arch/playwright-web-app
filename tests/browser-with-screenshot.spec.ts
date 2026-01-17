/**
 * Browser Tests with Screenshot Capture
 * These tests use actual browser automation and will capture screenshots
 */
import { test, expect } from '@playwright/test';

test.describe('Browser Tests with Evidence Screenshots', () => {

    test('visit example.com and verify title', async ({ page }, testInfo) => {
        // Navigate to a public website
        await page.goto('https://example.com');

        // Verify the page loaded
        await expect(page).toHaveTitle(/Example Domain/);

        // Verify content is visible
        const heading = page.locator('h1');
        await expect(heading).toHaveText('Example Domain');

        // Capture evidence screenshot at the end
        const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
        await page.screenshot({ path: screenshotPath, fullPage: false });
        await testInfo.attach('evidence-screenshot', {
            path: screenshotPath,
            contentType: 'image/png'
        });
    });

    test('visit example.com and check link', async ({ page }, testInfo) => {
        await page.goto('https://example.com');

        // Find the "More information..." link
        const link = page.locator('a');
        await expect(link).toBeVisible();
        await expect(link).toHaveText('More information...');

        // Capture evidence screenshot
        const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
        await page.screenshot({ path: screenshotPath, fullPage: false });
        await testInfo.attach('evidence-screenshot', {
            path: screenshotPath,
            contentType: 'image/png'
        });
    });

    test('visit httpbin and check response', async ({ page }, testInfo) => {
        // Navigate to a test API page
        await page.goto('https://httpbin.org/html');

        // Verify the page loaded
        const body = page.locator('body');
        await expect(body).toBeVisible();

        // Capture evidence screenshot
        const screenshotPath = testInfo.outputPath('evidence-screenshot.png');
        await page.screenshot({ path: screenshotPath, fullPage: false });
        await testInfo.attach('evidence-screenshot', {
            path: screenshotPath,
            contentType: 'image/png'
        });
    });

    test('intentional failure to show failure screenshot', async ({ page }, testInfo) => {
        await page.goto('https://example.com');

        // This will fail - looking for element that doesn't exist
        // The failure screenshot with highlighting should be captured
        const nonExistent = page.locator('#does-not-exist-button');

        try {
            await expect(nonExistent).toBeVisible({ timeout: 3000 });
        } catch (error) {
            // Capture failure screenshot before re-throwing
            const screenshotPath = testInfo.outputPath('failure-screenshot.png');
            await page.screenshot({ path: screenshotPath, fullPage: true });
            await testInfo.attach('failure-screenshot', {
                path: screenshotPath,
                contentType: 'image/png'
            });
            throw error;
        }
    });

});
