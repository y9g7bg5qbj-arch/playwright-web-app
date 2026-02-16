/**
 * Critical-Path Smoke Test
 *
 * Validates the M-01 → M-06 feature set end-to-end:
 *   S-01  App loads without crashing
 *   S-02  User registers via API
 *   S-03  Application created via API
 *   S-04  Nested project has standard folder structure
 *   S-05  Vero content validates via API
 *   S-06  Test-data sheet + row can be created
 *   S-07  Authenticated user sees workspace in browser
 *
 * Requires: backend (port 3000) + frontend (port 5173) + MongoDB running.
 */

import { test, expect } from '@playwright/test';
import {
    registerUser,
    setAuthToken,
    createApplication,
    createNestedProject,
    getProjectFiles,
    validateVero,
    createTestDataSheet,
    createTestDataRow,
} from '../helpers';

const BASE_URL = 'http://localhost:5173';

test.describe('Smoke Test — Critical Path', () => {
    test.describe.configure({ mode: 'serial' });

    let token: string;
    let applicationId: string;
    let nestedProject: { id: string; veroPath: string };

    test('S-01: App loads and renders', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForLoadState('domcontentloaded');
        // The app should render a non-empty page without crashing
        await expect(page.locator('body')).not.toBeEmpty();
    });

    test('S-02: User can register via API', async ({ request }) => {
        token = await registerUser(request);
        expect(token).toBeTruthy();
        expect(typeof token).toBe('string');
    });

    test('S-03: Application can be created via API', async ({ request }) => {
        const app = await createApplication(
            request,
            token,
            `Smoke_${Date.now()}`
        );
        applicationId = app.id;
        expect(applicationId).toBeTruthy();
    });

    test('S-04: Nested project has Pages/Features/PageActions folders', async ({ request }) => {
        nestedProject = await createNestedProject(
            request,
            token,
            applicationId,
            `Project_${Date.now()}`
        );
        expect(nestedProject.id).toBeTruthy();
        expect(nestedProject.veroPath).toBeTruthy();

        const files = await getProjectFiles(
            request,
            token,
            applicationId,
            nestedProject.veroPath
        );
        const folderNames = files
            .filter((f: any) => f.type === 'directory')
            .map((f: any) => f.name)
            .sort();

        expect(folderNames).toContain('Pages');
        expect(folderNames).toContain('Features');
        expect(folderNames).toContain('PageActions');
    });

    test('S-05: Vero content validates successfully', async ({ request }) => {
        const veroContent = [
            'feature ExampleSmoke {',
            '    scenario "Page loads" {',
            '        GOTO "https://example.com"',
            '        SEE text "Example Domain"',
            '    }',
            '}',
        ].join('\n');

        const result = await validateVero(request, token, veroContent);
        expect(result.valid).toBe(true);
    });

    test('S-06: Test-data sheet and row can be created', async ({ request }) => {
        const sheet = await createTestDataSheet(
            request,
            token,
            applicationId,
            'LoginData',
            ['email', 'password']
        );
        expect(sheet.id).toBeTruthy();

        const row = await createTestDataRow(request, token, sheet.id, {
            email: 'smoke@test.com',
            password: 'pass123',
        });
        expect(row.success).toBe(true);
    });

    test('S-07: Authenticated user sees workspace', async ({ page }) => {
        await setAuthToken(page, token);
        await page.goto(`${BASE_URL}/editor`);
        await page.waitForLoadState('networkidle');

        // Workspace should render content
        const body = await page.textContent('body');
        expect(body).toBeTruthy();
    });
});
