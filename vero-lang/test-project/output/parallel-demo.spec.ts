// Parallel Execution Test - 4 Scenarios Running Simultaneously
// This tests that Playwright's workers run tests in parallel
import { test, expect } from '@playwright/test';

test.describe('ParallelDemo', () => {
    test('Playwright Homepage Check', async ({ page }) => {
        console.log(`[Worker ${process.env.TEST_PARALLEL_INDEX}] Starting Scenario 1`);
        await page.goto('https://playwright.dev');
        await page.waitForTimeout(1500);
        await expect(page.locator('.navbar__title').first()).toBeVisible();
        console.log(`[Worker ${process.env.TEST_PARALLEL_INDEX}] ✅ Scenario 1 completed`);
    });

    test('GitHub Homepage Check', async ({ page }) => {
        console.log(`[Worker ${process.env.TEST_PARALLEL_INDEX}] Starting Scenario 2`);
        await page.goto('https://github.com');
        await page.waitForTimeout(1500);
        await expect(page.locator('body')).toContainText('GitHub');
        console.log(`[Worker ${process.env.TEST_PARALLEL_INDEX}] ✅ Scenario 2 completed`);
    });

    test('Google Homepage Check', async ({ page }) => {
        console.log(`[Worker ${process.env.TEST_PARALLEL_INDEX}] Starting Scenario 3`);
        await page.goto('https://google.com');
        await page.waitForTimeout(1500);
        await expect(page.locator('body')).toContainText(/Google/i);
        console.log(`[Worker ${process.env.TEST_PARALLEL_INDEX}] ✅ Scenario 3 completed`);
    });

    test('Example.com Homepage Check', async ({ page }) => {
        console.log(`[Worker ${process.env.TEST_PARALLEL_INDEX}] Starting Scenario 4`);
        await page.goto('https://example.com');
        await page.waitForTimeout(1500);
        await expect(page.getByText('Example Domain')).toBeVisible();
        console.log(`[Worker ${process.env.TEST_PARALLEL_INDEX}] ✅ Scenario 4 completed`);
    });
});

