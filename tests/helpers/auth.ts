/**
 * Shared auth helpers for Playwright e2e tests.
 *
 * Extracted from project-folders.spec.ts to avoid duplication
 * across test files.
 */

import { Page, APIRequestContext } from '@playwright/test';

const API_URL = 'http://localhost:3000/api';
const BASE_URL = 'http://localhost:5173';

/**
 * Register a new test user and return the auth token.
 * Uses a unique email per call to avoid conflicts between parallel tests.
 */
export async function registerUser(
    request: APIRequestContext,
    options?: { email?: string; password?: string; name?: string }
): Promise<string> {
    const email = options?.email
        || `test_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
    const password = options?.password || 'TestPassword123!';
    const name = options?.name || 'Test User';

    const response = await request.post(`${API_URL}/auth/register`, {
        data: { email, password, name },
    });

    const data = await response.json();
    if (!data.token) {
        throw new Error(`Registration failed: ${JSON.stringify(data)}`);
    }
    return data.token;
}

/**
 * Set the auth token in localStorage and reload the page.
 * The app reads `auth_token` from localStorage on mount.
 */
export async function setAuthToken(page: Page, token: string): Promise<void> {
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate((authToken) => {
        localStorage.setItem('auth_token', authToken);
    }, token);
    await page.reload();
    await page.waitForLoadState('networkidle');
}

/**
 * Build standard auth + JSON headers for API calls.
 */
export function authHeaders(token: string): Record<string, string> {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}
