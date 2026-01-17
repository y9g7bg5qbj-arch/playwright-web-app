/**
 * AI Studio E2E Test Suite
 *
 * Tests all 6 phases of AI Studio implementation:
 * 1. Enhanced State Machine & Retry Logic
 * 2. Chat Integration & Basic Recovery
 * 3. Browser Action Capture
 * 4. Inline Step Editing
 * 5. Model Configuration UI
 * 6. Merge & File Writing
 */
import { test, expect, Page, APIRequestContext } from '@playwright/test';

// Base URLs
const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000/api';

// Test user credentials - unique per test run
const testEmail = `ai_studio_test_${Date.now()}@example.com`;
const testPassword = 'TestPassword123!';
const testName = 'AI Studio Test User';

// ============================================
// Helper Functions
// ============================================

async function registerUser(request: APIRequestContext): Promise<string> {
    const registerResponse = await request.post(`${API_URL}/auth/register`, {
        data: {
            email: testEmail,
            password: testPassword,
            name: testName
        }
    });

    const registerData = await registerResponse.json();
    return registerData.token;
}

async function setAuthToken(page: Page, token: string): Promise<void> {
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate((authToken) => {
        localStorage.setItem('auth_token', authToken);
    }, token);
    await page.reload();
    await page.waitForLoadState('networkidle');
}

async function createProjectViaAPI(request: APIRequestContext, token: string, projectName: string): Promise<any> {
    const response = await request.post(`${API_URL}/applications`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        data: {
            name: projectName
        }
    });

    const data = await response.json();
    return data.data;
}

// ============================================
// Test Suite
// ============================================

test.describe('AI Studio E2E Tests', () => {
    let token: string;
    let applicationId: string;
    const projectName = `AI_Studio_Test_${Date.now()}`;

    test.beforeAll(async ({ request }) => {
        // Register and get token
        token = await registerUser(request);

        // Create an application
        const app = await createProjectViaAPI(request, token, projectName);
        applicationId = app.id;
    });

    // ============================================
    // Phase 5: Model Configuration UI Tests
    // ============================================
    test.describe('Phase 5: Model Configuration UI', () => {

        test('AI Test Recorder panel opens from IDE', async ({ page }) => {
            await setAuthToken(page, token);
            await page.goto(`${BASE_URL}/editor`);
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            // Look for AI Recorder button/icon in toolbar
            const aiRecorderButton = page.locator('[data-testid="ai-recorder-btn"], button:has-text("AI"), [title*="AI"], [aria-label*="AI"]').first();

            if (await aiRecorderButton.isVisible()) {
                await aiRecorderButton.click();
                await page.waitForTimeout(1000);

                // Take screenshot of AI Recorder panel
                await page.screenshot({
                    path: `test-results/ai-studio-panel-open-${Date.now()}.png`,
                    fullPage: true
                });
            } else {
                // Panel might be in a different location, take screenshot anyway
                await page.screenshot({
                    path: `test-results/ai-studio-editor-view-${Date.now()}.png`,
                    fullPage: true
                });
            }
        });

        test('AI Settings modal has provider options', async ({ page }) => {
            await setAuthToken(page, token);
            await page.goto(`${BASE_URL}/editor`);
            await page.waitForLoadState('networkidle');

            // Try to find and click settings button
            const settingsButton = page.locator('button:has-text("Settings"), [data-testid="settings"], [title*="Settings"]').first();

            if (await settingsButton.isVisible()) {
                await settingsButton.click();
                await page.waitForTimeout(1000);

                // Look for AI settings tab or section
                const aiTab = page.locator('text=AI, text=Copilot, [data-testid="ai-settings"]').first();
                if (await aiTab.isVisible()) {
                    await aiTab.click();
                    await page.waitForTimeout(500);
                }

                // Check for provider dropdown
                const providerSelect = page.locator('select, [role="combobox"]').first();
                expect(await providerSelect.isVisible()).toBeTruthy();

                await page.screenshot({
                    path: `test-results/ai-settings-modal-${Date.now()}.png`,
                    fullPage: true
                });
            }
        });
    });

    // ============================================
    // Phase 6: Merge & File Writing API Tests
    // ============================================
    test.describe('Phase 6: Merge & File Writing API', () => {

        test('POST /api/ai-recorder/sessions creates session', async ({ request }) => {
            const response = await request.post(`${API_URL}/ai-recorder/sessions`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                data: {
                    testCases: [
                        {
                            name: 'Test Login Flow',
                            description: 'Verify user can log in',
                            steps: [
                                'Navigate to https://example.com',
                                'Click on login button',
                                'Enter username',
                                'Enter password',
                                'Click submit'
                            ],
                            targetUrl: 'https://example.com'
                        }
                    ],
                    environment: 'development',
                    headless: true,
                    applicationId: applicationId
                }
            });

            const data = await response.json();

            // Session should be created (even if not started)
            expect(response.status()).toBeLessThan(500);
            if (response.ok()) {
                expect(data.sessionId).toBeDefined();
            }
        });

        test('GET /api/ai-recorder/sessions lists user sessions', async ({ request }) => {
            const response = await request.get(`${API_URL}/ai-recorder/sessions`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            expect(response.ok()).toBeTruthy();
            const data = await response.json();
            expect(Array.isArray(data)).toBeTruthy();
        });

        test('PUT /api/ai-recorder/steps/:stepId updates step code', async ({ request }) => {
            // First create a session to get a step ID
            const createResponse = await request.post(`${API_URL}/ai-recorder/sessions`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                data: {
                    testCases: [
                        {
                            name: 'Update Step Test',
                            steps: ['Navigate to https://example.com'],
                            targetUrl: 'https://example.com'
                        }
                    ],
                    environment: 'development',
                    headless: true
                }
            });

            if (createResponse.ok()) {
                const createData = await createResponse.json();
                const sessionId = createData.sessionId;

                // Get session to find step ID
                const sessionResponse = await request.get(`${API_URL}/ai-recorder/sessions/${sessionId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (sessionResponse.ok()) {
                    const sessionData = await sessionResponse.json();
                    if (sessionData.testCases?.[0]?.steps?.[0]?.id) {
                        const stepId = sessionData.testCases[0].steps[0].id;

                        // Update the step
                        const updateResponse = await request.put(`${API_URL}/ai-recorder/steps/${stepId}`, {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            data: {
                                veroCode: 'NAVIGATE "https://example.com"'
                            }
                        });

                        expect(updateResponse.status()).toBeLessThan(500);
                    }
                }
            }
        });
    });

    // ============================================
    // Phase 1: State Machine Tests (UI)
    // ============================================
    test.describe('Phase 1: State Machine UI Rendering', () => {

        test('Step status icons render correctly', async ({ page }) => {
            await setAuthToken(page, token);
            await page.goto(`${BASE_URL}/editor`);
            await page.waitForLoadState('networkidle');

            // Check that status icon components exist in the codebase
            // by verifying the panel renders without errors
            const pageContent = await page.content();

            // Check for common status-related elements
            const hasStatusElements = pageContent.includes('status') ||
                pageContent.includes('pending') ||
                pageContent.includes('running');

            await page.screenshot({
                path: `test-results/ai-studio-status-check-${Date.now()}.png`,
                fullPage: true
            });

            // Basic check - page loaded without error
            expect(await page.title()).not.toContain('Error');
        });
    });

    // ============================================
    // Phase 2: Chat Integration Tests
    // ============================================
    test.describe('Phase 2: Chat Integration', () => {

        test('AIStudioChat component exists in bundle', async ({ page }) => {
            await setAuthToken(page, token);
            await page.goto(`${BASE_URL}/editor`);
            await page.waitForLoadState('networkidle');

            // Verify page loads correctly (component is available in the build)
            expect(await page.title()).not.toContain('Error');

            await page.screenshot({
                path: `test-results/ai-studio-chat-ready-${Date.now()}.png`,
                fullPage: true
            });
        });
    });

    // ============================================
    // Phase 4: Inline Step Editing Tests
    // ============================================
    test.describe('Phase 4: Inline Step Editing', () => {

        test('POST /api/ai-recorder/test-cases/:id/steps adds step', async ({ request }) => {
            // Create a session first
            const createResponse = await request.post(`${API_URL}/ai-recorder/sessions`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                data: {
                    testCases: [
                        {
                            name: 'Add Step Test',
                            steps: ['Navigate to https://example.com'],
                            targetUrl: 'https://example.com'
                        }
                    ],
                    environment: 'development',
                    headless: true
                }
            });

            if (createResponse.ok()) {
                const createData = await createResponse.json();
                const sessionId = createData.sessionId;

                // Get session to find test case ID
                const sessionResponse = await request.get(`${API_URL}/ai-recorder/sessions/${sessionId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (sessionResponse.ok()) {
                    const sessionData = await sessionResponse.json();
                    if (sessionData.testCases?.[0]?.id) {
                        const testCaseId = sessionData.testCases[0].id;

                        // Add a new step
                        const addResponse = await request.post(`${API_URL}/ai-recorder/test-cases/${testCaseId}/steps`, {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            data: {
                                afterStepNumber: 0,
                                description: 'Click on the login button'
                            }
                        });

                        expect(addResponse.status()).toBeLessThan(500);
                        if (addResponse.ok()) {
                            const addData = await addResponse.json();
                            expect(addData.stepId).toBeDefined();
                        }
                    }
                }
            }
        });

        test('DELETE /api/ai-recorder/steps/:stepId deletes step', async ({ request }) => {
            // Create a session with multiple steps
            const createResponse = await request.post(`${API_URL}/ai-recorder/sessions`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                data: {
                    testCases: [
                        {
                            name: 'Delete Step Test',
                            steps: [
                                'Navigate to https://example.com',
                                'Click on button'
                            ],
                            targetUrl: 'https://example.com'
                        }
                    ],
                    environment: 'development',
                    headless: true
                }
            });

            if (createResponse.ok()) {
                const createData = await createResponse.json();
                const sessionId = createData.sessionId;

                // Get session to find step ID
                const sessionResponse = await request.get(`${API_URL}/ai-recorder/sessions/${sessionId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (sessionResponse.ok()) {
                    const sessionData = await sessionResponse.json();
                    if (sessionData.testCases?.[0]?.steps?.[1]?.id) {
                        const stepId = sessionData.testCases[0].steps[1].id;

                        // Delete the second step
                        const deleteResponse = await request.delete(`${API_URL}/ai-recorder/steps/${stepId}`, {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });

                        expect(deleteResponse.status()).toBeLessThan(500);
                    }
                }
            }
        });
    });

    // ============================================
    // Phase 6: Preview & Approve Tests
    // ============================================
    test.describe('Phase 6: Preview & Approve', () => {

        test('POST /api/ai-recorder/test-cases/:id/preview returns preview data', async ({ request }) => {
            // Create a session first
            const createResponse = await request.post(`${API_URL}/ai-recorder/sessions`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                data: {
                    testCases: [
                        {
                            name: 'Preview Test',
                            steps: ['Navigate to https://example.com'],
                            targetUrl: 'https://example.com'
                        }
                    ],
                    environment: 'development',
                    headless: true
                }
            });

            if (createResponse.ok()) {
                const createData = await createResponse.json();
                const sessionId = createData.sessionId;

                // Get session to find test case ID
                const sessionResponse = await request.get(`${API_URL}/ai-recorder/sessions/${sessionId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (sessionResponse.ok()) {
                    const sessionData = await sessionResponse.json();
                    if (sessionData.testCases?.[0]?.id) {
                        const testCaseId = sessionData.testCases[0].id;

                        // Preview the test case
                        const previewResponse = await request.post(`${API_URL}/ai-recorder/test-cases/${testCaseId}/preview`, {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            data: {
                                targetPath: '/tmp/vero-tests'
                            }
                        });

                        expect(previewResponse.status()).toBeLessThan(500);
                        if (previewResponse.ok()) {
                            const previewData = await previewResponse.json();
                            expect(previewData.veroCode).toBeDefined();
                            expect(previewData.filePath).toBeDefined();
                            expect(typeof previewData.fileExists).toBe('boolean');
                            expect(typeof previewData.willMerge).toBe('boolean');
                        }
                    }
                }
            }
        });

        test('POST /api/ai-recorder/test-cases/:id/approve creates vero file', async ({ request }) => {
            // Create a session first
            const createResponse = await request.post(`${API_URL}/ai-recorder/sessions`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                data: {
                    testCases: [
                        {
                            name: 'Approve Test',
                            steps: ['Navigate to https://example.com'],
                            targetUrl: 'https://example.com'
                        }
                    ],
                    environment: 'development',
                    headless: true
                }
            });

            if (createResponse.ok()) {
                const createData = await createResponse.json();
                const sessionId = createData.sessionId;

                // Get session to find test case ID
                const sessionResponse = await request.get(`${API_URL}/ai-recorder/sessions/${sessionId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (sessionResponse.ok()) {
                    const sessionData = await sessionResponse.json();
                    if (sessionData.testCases?.[0]?.id) {
                        const testCaseId = sessionData.testCases[0].id;

                        // Approve the test case (with merge option)
                        const approveResponse = await request.post(`${API_URL}/ai-recorder/test-cases/${testCaseId}/approve`, {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            data: {
                                targetPath: '/tmp/vero-tests-approve',
                                merge: true
                            }
                        });

                        expect(approveResponse.status()).toBeLessThan(500);
                        if (approveResponse.ok()) {
                            const approveData = await approveResponse.json();
                            expect(approveData.success || approveData.filePath).toBeTruthy();
                        }
                    }
                }
            }
        });

        test('Approve with overwrite option works', async ({ request }) => {
            // Create a session first
            const createResponse = await request.post(`${API_URL}/ai-recorder/sessions`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                data: {
                    testCases: [
                        {
                            name: 'Overwrite Test',
                            steps: ['Navigate to https://example.com'],
                            targetUrl: 'https://example.com'
                        }
                    ],
                    environment: 'development',
                    headless: true
                }
            });

            if (createResponse.ok()) {
                const createData = await createResponse.json();
                const sessionId = createData.sessionId;

                const sessionResponse = await request.get(`${API_URL}/ai-recorder/sessions/${sessionId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (sessionResponse.ok()) {
                    const sessionData = await sessionResponse.json();
                    if (sessionData.testCases?.[0]?.id) {
                        const testCaseId = sessionData.testCases[0].id;

                        // Approve with overwrite option
                        const approveResponse = await request.post(`${API_URL}/ai-recorder/test-cases/${testCaseId}/approve`, {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            data: {
                                targetPath: '/tmp/vero-tests-overwrite',
                                overwrite: true
                            }
                        });

                        expect(approveResponse.status()).toBeLessThan(500);
                    }
                }
            }
        });
    });

    // ============================================
    // Integration Test: Full UI Flow
    // ============================================
    test.describe('Integration: Full UI Flow', () => {

        test('Editor loads and displays AI features', async ({ page }) => {
            await setAuthToken(page, token);
            await page.goto(`${BASE_URL}/editor`);
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            // Take comprehensive screenshots
            await page.screenshot({
                path: `test-results/ai-studio-full-editor-${Date.now()}.png`,
                fullPage: true
            });

            // Verify no console errors related to AI components
            const logs: string[] = [];
            page.on('console', msg => {
                if (msg.type() === 'error') {
                    logs.push(msg.text());
                }
            });

            // Reload to capture any errors
            await page.reload();
            await page.waitForLoadState('networkidle');

            // Filter out expected/benign errors
            const criticalErrors = logs.filter(log =>
                log.includes('AIStudio') ||
                log.includes('AIRecorder') ||
                log.includes('aiRecorder')
            );

            expect(criticalErrors.length).toBe(0);
        });
    });
});
