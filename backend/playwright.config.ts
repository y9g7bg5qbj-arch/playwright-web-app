import { defineConfig } from '@playwright/test';
import { join } from 'path';

// VERO_PROJECT_PATH is where test artifacts will be stored
const projectPath = process.env.VERO_PROJECT_PATH || join(__dirname, 'vero-projects');

export default defineConfig({
    testDir: '.',
    testMatch: '.vero-temp-test.spec.ts',
    timeout: 60000,
    retries: 0,
    workers: 1,

    // Reporter configuration for structured test results
    reporter: [
        ['list'],  // Console output
        ['json', { outputFile: join(projectPath, 'test-results', 'results.json') }]
    ],

    // Output directory for traces, screenshots, videos
    outputDir: join(projectPath, 'test-results'),

    use: {
        headless: true,
        video: 'retain-on-failure',
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
        actionTimeout: 15000,
    },
});
