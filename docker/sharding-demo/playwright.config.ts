import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for sharding demo
 * 
 * Key settings for sharding:
 * - fullyParallel: true - Distributes individual tests across shards (best balance)
 * - reporter: 'blob' - Creates mergeable blob reports in CI
 */
export default defineConfig({
    testDir: './tests',

    // Run tests in parallel for best shard distribution
    fullyParallel: true,

    // Fail the build on CI if test.only is accidentally left in
    forbidOnly: !!process.env.CI,

    // Retry failed tests (helpful for flaky tests)
    retries: process.env.CI ? 2 : 0,

    // Number of parallel workers per shard
    workers: process.env.CI ? 1 : undefined,

    // Reporter configuration
    // - 'blob' for CI (mergeable across shards)
    // - 'html' for local development
    reporter: process.env.CI ? 'blob' : 'html',

    use: {
        // Base URL for navigation
        baseURL: 'https://playwright.dev',

        // Always collect trace for testing trace viewer
        trace: 'on',

        // Take screenshot on failure
        screenshot: 'only-on-failure',

        // Record video for debugging
        video: 'on-first-retry',
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
