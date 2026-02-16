import { defineConfig } from '@playwright/test';
import { createRequire } from 'module';
import { join, resolve } from 'path';

// VERO_PROJECT_PATH is where test artifacts will be stored
const projectPath = process.env.VERO_PROJECT_PATH || join(__dirname, 'vero-projects');

// Per-run isolation: env vars override shared defaults when set by the run handler
const resultsJsonPath = process.env.VERO_RESULTS_JSON_PATH
    || join(projectPath, 'test-results', 'results.json');
const outputDir = process.env.VERO_OUTPUT_DIR
    || join(projectPath, 'test-results');
const allureResultsDir = process.env.VERO_ALLURE_RESULTS_DIR
    || join(projectPath, 'allure-results');
const traceModeRaw = (process.env.VERO_TRACE_MODE || '').trim();
const traceMode: 'on' | 'off' | 'on-first-retry' | 'on-all-retries' | 'retain-on-failure' =
    traceModeRaw === 'on' ||
    traceModeRaw === 'off' ||
    traceModeRaw === 'on-first-retry' ||
    traceModeRaw === 'on-all-retries' ||
    traceModeRaw === 'retain-on-failure'
        ? traceModeRaw
        : 'retain-on-failure';

function parseOptionalNumber(
    value: string | undefined,
    minimum: number,
    maximum: number
): number | undefined {
    if (!value) return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return undefined;
    return Math.max(minimum, Math.min(maximum, parsed));
}

function parseOptionalNonNegativeInt(value: string | undefined): number | undefined {
    if (!value) return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return undefined;
    return Math.floor(parsed);
}

function normalizePathTemplate(pathValue: string): string {
    return pathValue.replace(/\\/g, '/').replace(/\/+$/g, '');
}

const snapshotBaseDir = (process.env.VERO_SNAPSHOT_BASE_DIR || '').trim();
const configuredSnapshotPathTemplate = (process.env.VERO_SNAPSHOT_PATH_TEMPLATE || '').trim();
const snapshotPathTemplate = configuredSnapshotPathTemplate
    || (snapshotBaseDir
        ? `${normalizePathTemplate(snapshotBaseDir)}/{platform}{/projectName}/{arg}{ext}`
        : undefined);
const visualThreshold = parseOptionalNumber(process.env.VERO_VISUAL_THRESHOLD, 0, 1) ?? 0.2;
const visualMaxDiffPixels = parseOptionalNonNegativeInt(process.env.VERO_VISUAL_MAX_DIFF_PIXELS);
const visualMaxDiffPixelRatio = parseOptionalNumber(process.env.VERO_VISUAL_MAX_DIFF_PIXEL_RATIO, 0, 1);

const backendRequire = createRequire(resolve(__dirname, 'package.json'));

function resolveAllureReporter(): string | null {
    const candidates = [
        process.env.VERO_ALLURE_REPORTER_PATH,
        'allure-playwright',
    ];

    for (const candidate of candidates) {
        if (!candidate) continue;
        try {
            return backendRequire.resolve(candidate);
        } catch {
            // Try next candidate.
        }
    }

    return null;
}

const reporters: any[] = [
    ['list'],  // Console output
    ['json', { outputFile: resultsJsonPath }],
];

const allureReporter = resolveAllureReporter();
if (allureReporter) {
    reporters.push([allureReporter, { resultsDir: allureResultsDir }]);
} else {
    console.warn(
        '[playwright.config] Allure reporter unresolved; skipping Allure output. ' +
        'Checked VERO_ALLURE_REPORTER_PATH and backend node_modules only.'
    );
}

export default defineConfig({
    testDir: '.',
    testMatch: [/\.vero-.*\.spec\.(ts|mts)$/],
    timeout: 60000,
    retries: 0,
    workers: 1,

    // Reporter configuration for structured test results
    reporter: reporters,

    // Output directory for traces, screenshots, videos
    outputDir: outputDir,

    expect: {
        toHaveScreenshot: {
            threshold: visualThreshold,
            ...(visualMaxDiffPixels !== undefined ? { maxDiffPixels: visualMaxDiffPixels } : {}),
            ...(visualMaxDiffPixelRatio !== undefined ? { maxDiffPixelRatio: visualMaxDiffPixelRatio } : {}),
            ...(snapshotPathTemplate ? { pathTemplate: snapshotPathTemplate } : {}),
        },
    },

    use: {
        headless: true,
        video: 'retain-on-failure',
        screenshot: 'only-on-failure',
        trace: traceMode,
        actionTimeout: 15000,
    },
});
