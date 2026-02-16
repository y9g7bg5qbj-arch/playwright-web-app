/**
 * Shared API helpers for Playwright e2e tests.
 *
 * Wraps common backend API calls (project creation, file listing,
 * Vero validation, test-data operations) so test files stay focused
 * on assertions rather than HTTP plumbing.
 */

import { APIRequestContext } from '@playwright/test';
import { authHeaders } from './auth';

const API_URL = 'http://localhost:3000/api';

/**
 * Create a top-level application (project container).
 */
export async function createApplication(
    request: APIRequestContext,
    token: string,
    name: string
): Promise<{ id: string; [key: string]: any }> {
    const response = await request.post(`${API_URL}/applications`, {
        headers: authHeaders(token),
        data: { name },
    });
    const data = await response.json();
    return data.data;
}

/**
 * Create a nested project within an application.
 * Returns the project record including its `veroPath`.
 */
export async function createNestedProject(
    request: APIRequestContext,
    token: string,
    appId: string,
    name: string
): Promise<{ id: string; veroPath: string; [key: string]: any }> {
    const response = await request.post(`${API_URL}/applications/${appId}/projects`, {
        headers: authHeaders(token),
        data: { name },
    });
    const data = await response.json();
    return data.data;
}

/**
 * List files in a project directory.
 */
export async function getProjectFiles(
    request: APIRequestContext,
    token: string,
    projectId: string,
    veroPath: string
): Promise<any[]> {
    const response = await request.get(
        `${API_URL}/vero/files?projectId=${projectId}&veroPath=${encodeURIComponent(veroPath)}`,
        { headers: authHeaders(token) }
    );
    const data = await response.json();
    return data.files || [];
}

/**
 * Validate Vero file content via the backend parser.
 */
export async function validateVero(
    request: APIRequestContext,
    token: string,
    content: string
): Promise<{ valid: boolean; errors?: any[] }> {
    const response = await request.post(`${API_URL}/vero/validate`, {
        headers: authHeaders(token),
        data: { content },
    });
    return response.json();
}

/**
 * Create a test-data sheet with the given columns.
 */
export async function createTestDataSheet(
    request: APIRequestContext,
    token: string,
    applicationId: string,
    sheetName: string,
    columns: string[]
): Promise<{ id: string; [key: string]: any }> {
    const response = await request.post(`${API_URL}/test-data/sheets`, {
        headers: authHeaders(token),
        data: {
            projectId: applicationId,
            name: sheetName,
            columns: columns.map((col) => ({ name: col, type: 'text' })),
        },
    });
    const data = await response.json();
    return data.sheet || data;
}

/**
 * Create a row in a test-data sheet.
 */
export async function createTestDataRow(
    request: APIRequestContext,
    token: string,
    sheetId: string,
    rowData: Record<string, string>
): Promise<any> {
    const response = await request.post(`${API_URL}/test-data/sheets/${sheetId}/rows`, {
        headers: authHeaders(token),
        data: { data: rowData },
    });
    return response.json();
}
