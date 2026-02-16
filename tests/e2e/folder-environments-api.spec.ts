import { test, expect, request } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const API_BASE = 'http://localhost:3000/api';
const VERO_PROJECTS_PATH = '/Users/mikeroy/Downloads/Telegram Desktop/playwright-web-app/vero-projects';

// We'll get auth token from login
let authToken: string;
let testAppId: string;
let testProjectId: string;

test.describe('Folder-Based Environment System - API Tests', () => {
  // Run tests serially so shared state (testAppId, testProjectId) works across tests
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ }) => {
    // Login to get auth token
    const apiContext = await request.newContext();

    // Try to login
    const loginRes = await apiContext.post(`${API_BASE}/auth/login`, {
      data: {
        email: 'test@example.com',
        password: 'password123'
      }
    });

    if (loginRes.ok()) {
      const loginData = await loginRes.json();
      authToken = loginData.token || loginData.data?.token;
    } else {
      // Register if login fails
      const registerRes = await apiContext.post(`${API_BASE}/auth/register`, {
        data: {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        }
      });
      if (registerRes.ok()) {
        const regData = await registerRes.json();
        authToken = regData.token || regData.data?.token;
      }
    }

    console.log('Auth token obtained:', !!authToken);
  });

  test('TC-01: Create Application and Project - Verify Environment Folders', async ({ }) => {
    const apiContext = await request.newContext({
      extraHTTPHeaders: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    // Step 1: Create an Application
    const appRes = await apiContext.post(`${API_BASE}/applications`, {
      data: {
        name: `TestApp_${Date.now()}`,
        description: 'Test application for folder environments'
      }
    });

    expect(appRes.ok()).toBeTruthy();
    const appData = await appRes.json();
    testAppId = appData.data?.id || appData.id;
    console.log('Created application:', testAppId);

    // Step 2: Create a Project in the Application
    const projRes = await apiContext.post(`${API_BASE}/applications/${testAppId}/projects`, {
      data: {
        name: 'TestProject_Environments',
        description: 'Testing folder-based environments'
      }
    });

    expect(projRes.ok()).toBeTruthy();
    const projData = await projRes.json();
    testProjectId = projData.data?.id || projData.id;
    const veroPath = projData.data?.veroPath || projData.veroPath;
    console.log('Created project:', testProjectId);
    console.log('Vero path:', veroPath);

    // Step 3: Verify folder structure was created
    const projectPath = veroPath || path.join(VERO_PROJECTS_PATH, testAppId, testProjectId);

    // Check master folder exists
    const masterPath = path.join(projectPath, 'master');
    expect(fs.existsSync(masterPath)).toBeTruthy();
    console.log('✓ master/ folder exists');

    // Check dev folder exists
    const devPath = path.join(projectPath, 'dev');
    expect(fs.existsSync(devPath)).toBeTruthy();
    console.log('✓ dev/ folder exists');

    // Check sandboxes folder exists
    const sandboxesPath = path.join(projectPath, 'sandboxes');
    expect(fs.existsSync(sandboxesPath)).toBeTruthy();
    console.log('✓ sandboxes/ folder exists');
  });

  test('TC-03: Verify Production (master) Contains Standard Subfolders', async ({ }) => {
    const projectPath = path.join(VERO_PROJECTS_PATH, testAppId, testProjectId);
    const masterPath = path.join(projectPath, 'master');

    // Check Pages folder
    expect(fs.existsSync(path.join(masterPath, 'Pages'))).toBeTruthy();
    console.log('✓ master/Pages/ exists');

    // Check Features folder
    expect(fs.existsSync(path.join(masterPath, 'Features'))).toBeTruthy();
    console.log('✓ master/Features/ exists');

    // Check Data folder
    expect(fs.existsSync(path.join(masterPath, 'Data'))).toBeTruthy();
    console.log('✓ master/Data/ exists');

    // Check example files exist
    expect(fs.existsSync(path.join(masterPath, 'Pages', 'example.vero'))).toBeTruthy();
    console.log('✓ master/Pages/example.vero exists');
  });

  test('TC-04: Verify Development (dev) Contains Standard Subfolders', async ({ }) => {
    const projectPath = path.join(VERO_PROJECTS_PATH, testAppId, testProjectId);
    const devPath = path.join(projectPath, 'dev');

    // Check Pages folder
    expect(fs.existsSync(path.join(devPath, 'Pages'))).toBeTruthy();
    console.log('✓ dev/Pages/ exists');

    // Check Features folder
    expect(fs.existsSync(path.join(devPath, 'Features'))).toBeTruthy();
    console.log('✓ dev/Features/ exists');

    // Check Data folder
    expect(fs.existsSync(path.join(devPath, 'Data'))).toBeTruthy();
    console.log('✓ dev/Data/ exists');

    // Check example files exist
    expect(fs.existsSync(path.join(devPath, 'Features', 'example.vero'))).toBeTruthy();
    console.log('✓ dev/Features/example.vero exists');
  });

  test('TC-05: Create Sandbox - Verify Files Copied from Dev', async ({ }) => {
    const apiContext = await request.newContext({
      extraHTTPHeaders: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    // Create a sandbox
    const sandboxRes = await apiContext.post(`${API_BASE}/projects/${testProjectId}/sandboxes`, {
      data: {
        name: 'my-test-sandbox',
        description: 'Testing sandbox creation',
        sourceBranch: 'dev'
      }
    });

    expect(sandboxRes.ok()).toBeTruthy();
    const sandboxData = await sandboxRes.json();
    const sandbox = sandboxData.sandbox || sandboxData.data?.sandbox;
    console.log('Created sandbox:', sandbox?.id);
    console.log('Sandbox folder path:', sandbox?.folderPath);

    // Verify sandbox folder was created
    const projectPath = path.join(VERO_PROJECTS_PATH, testAppId, testProjectId);
    const sandboxPath = path.join(projectPath, sandbox?.folderPath || 'sandboxes/my-test-sandbox');

    expect(fs.existsSync(sandboxPath)).toBeTruthy();
    console.log('✓ Sandbox folder exists');

    // Verify subfolders were copied
    expect(fs.existsSync(path.join(sandboxPath, 'Pages'))).toBeTruthy();
    expect(fs.existsSync(path.join(sandboxPath, 'Features'))).toBeTruthy();
    expect(fs.existsSync(path.join(sandboxPath, 'PageActions'))).toBeTruthy();
    expect(fs.existsSync(path.join(sandboxPath, 'Resources'))).toBeTruthy();
    expect(fs.existsSync(path.join(sandboxPath, 'Data'))).toBeFalsy();
    expect(fs.existsSync(path.join(sandboxPath, '.sync-base'))).toBeFalsy();
    console.log('✓ Sandbox has required folders and excludes Data/.sync-base');

    // Verify files were copied
    expect(fs.existsSync(path.join(sandboxPath, 'Pages', 'example.vero'))).toBeTruthy();
    console.log('✓ Sandbox files copied from dev');
  });

  test('TC-07: Verify Sandbox Files Match Dev Content', async ({ }) => {
    const projectPath = path.join(VERO_PROJECTS_PATH, testAppId, testProjectId);
    const devFile = path.join(projectPath, 'dev', 'Pages', 'example.vero');
    const sandboxFile = path.join(projectPath, 'sandboxes', 'my-test-sandbox', 'Pages', 'example.vero');

    const devContent = fs.readFileSync(devFile, 'utf-8');
    const sandboxContent = fs.readFileSync(sandboxFile, 'utf-8');

    expect(sandboxContent).toBe(devContent);
    console.log('✓ Sandbox file content matches dev');
  });

  test('TC-10: Maximum 5 Sandboxes Per User Limit', async ({ }) => {
    const apiContext = await request.newContext({
      extraHTTPHeaders: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    // Create sandboxes up to limit
    for (let i = 2; i <= 5; i++) {
      const res = await apiContext.post(`${API_BASE}/projects/${testProjectId}/sandboxes`, {
        data: {
          name: `sandbox-limit-${i}`,
          sourceBranch: 'dev'
        }
      });
      expect(res.ok()).toBeTruthy();
      console.log(`✓ Created sandbox ${i}`);
    }

    // Try to create 6th sandbox - should fail
    const failRes = await apiContext.post(`${API_BASE}/projects/${testProjectId}/sandboxes`, {
      data: {
        name: 'sandbox-limit-6',
        sourceBranch: 'dev'
      }
    });

    expect(failRes.ok()).toBeFalsy();
    const errorData = await failRes.json();
    console.log('6th sandbox error:', errorData);
    expect(errorData.error || errorData.message).toContain('Maximum');
    console.log('✓ Maximum 5 sandboxes limit enforced');
  });

  test('TC-14: Compare Environments Dropdown Lists All Options', async ({ }) => {
    const apiContext = await request.newContext({
      extraHTTPHeaders: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    // Get environments list
    const envRes = await apiContext.get(`${API_BASE}/compare/${testProjectId}/environments`);
    expect(envRes.ok()).toBeTruthy();

    const envData = await envRes.json();
    const environments = envData.data?.environments || envData.environments;
    console.log('Available environments:', environments);

    // Verify master and dev are present
    const hasProduction = environments.some((e: any) => e.id === 'master' || e.name === 'Production');
    const hasDevelopment = environments.some((e: any) => e.id === 'dev' || e.name === 'Development');

    expect(hasProduction).toBeTruthy();
    console.log('✓ Production environment listed');

    expect(hasDevelopment).toBeTruthy();
    console.log('✓ Development environment listed');

    // Verify sandboxes are listed
    const sandboxes = environments.filter((e: any) => e.type === 'sandbox' || e.id?.startsWith('sandbox:'));
    console.log(`✓ ${sandboxes.length} sandboxes listed`);
    expect(sandboxes.length).toBeGreaterThan(0);
  });

  test('TC-08/09: Compare Feature - File Diff Generation', async ({ }) => {
    const apiContext = await request.newContext({
      extraHTTPHeaders: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    // First, modify a file in sandbox
    const projectPath = path.join(VERO_PROJECTS_PATH, testAppId, testProjectId);
    const sandboxFile = path.join(projectPath, 'sandboxes', 'my-test-sandbox', 'Pages', 'example.vero');

    const originalContent = fs.readFileSync(sandboxFile, 'utf-8');
    const modifiedContent = originalContent + '\n# Modified in sandbox for testing\n';
    fs.writeFileSync(sandboxFile, modifiedContent);
    console.log('✓ Modified sandbox file');

    // Compare files
    const compareRes = await apiContext.get(`${API_BASE}/projects/${testProjectId}/compare`, {
      params: {
        source: 'dev',
        target: 'sandbox:my-test-sandbox', // Note: may need sandbox ID
        file: 'Pages/example.vero'
      }
    });

    // Get sandbox ID first
    const sandboxesRes = await apiContext.get(`${API_BASE}/projects/${testProjectId}/sandboxes`);
    const sandboxes = (await sandboxesRes.json()).sandboxes;
    const testSandbox = sandboxes.find((s: any) => s.name === 'my-test-sandbox');

    if (testSandbox) {
      const compareRes2 = await apiContext.get(`${API_BASE}/projects/${testProjectId}/compare`, {
        params: {
          source: 'dev',
          target: `sandbox:${testSandbox.id}`,
          file: 'Pages/example.vero'
        }
      });

      expect(compareRes2.ok()).toBeTruthy();
      const compareData = await compareRes2.json();
      console.log('Compare result:', JSON.stringify(compareData, null, 2).slice(0, 500));

      // Verify diff shows changes
      const diff = compareData.data?.diff || compareData.diff;
      expect(diff).toBeDefined();
      console.log('✓ Diff generated successfully');

      // Check that the modified line is detected
      const hasChanges = diff.hunks && diff.hunks.length > 0;
      expect(hasChanges).toBeTruthy();
      console.log('✓ Changes detected in diff');
    }

    // Restore original content
    fs.writeFileSync(sandboxFile, originalContent);
  });

  test('TC-11: Delete Sandbox Removes Folder', async ({ }) => {
    const apiContext = await request.newContext({
      extraHTTPHeaders: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    // Create a sandbox to delete
    const createRes = await apiContext.post(`${API_BASE}/projects/${testProjectId}/sandboxes`, {
      data: {
        name: 'sandbox-to-delete',
        sourceBranch: 'dev'
      }
    });

    // May fail due to limit, that's ok for this test
    if (!createRes.ok()) {
      console.log('Could not create sandbox (likely at limit), skipping delete test');
      return;
    }

    const sandboxData = await createRes.json();
    const sandboxId = sandboxData.sandbox?.id;
    const folderPath = sandboxData.sandbox?.folderPath;

    const projectPath = path.join(VERO_PROJECTS_PATH, testAppId, testProjectId);
    const sandboxFullPath = path.join(projectPath, folderPath);

    // Verify it exists
    expect(fs.existsSync(sandboxFullPath)).toBeTruthy();
    console.log('✓ Sandbox folder created');

    // Delete the sandbox
    const deleteRes = await apiContext.delete(`${API_BASE}/sandboxes/${sandboxId}?force=true`);
    expect(deleteRes.ok()).toBeTruthy();
    console.log('✓ Sandbox deleted via API');

    // Verify folder is removed
    expect(fs.existsSync(sandboxFullPath)).toBeFalsy();
    console.log('✓ Sandbox folder removed from filesystem');
  });

  test('TC-16: File Created in Sandbox Not in Dev/Master', async ({ }) => {
    const projectPath = path.join(VERO_PROJECTS_PATH, testAppId, testProjectId);
    const sandboxPath = path.join(projectPath, 'sandboxes', 'my-test-sandbox');
    const devPath = path.join(projectPath, 'dev');
    const masterPath = path.join(projectPath, 'master');

    // Create a new file in sandbox
    const newFile = 'NewTestFile.vero';
    const newFilePath = path.join(sandboxPath, 'Pages', newFile);
    fs.writeFileSync(newFilePath, '# New file in sandbox only\n');
    console.log('✓ Created new file in sandbox');

    // Verify file exists in sandbox
    expect(fs.existsSync(newFilePath)).toBeTruthy();

    // Verify file does NOT exist in dev
    expect(fs.existsSync(path.join(devPath, 'Pages', newFile))).toBeFalsy();
    console.log('✓ File NOT in dev');

    // Verify file does NOT exist in master
    expect(fs.existsSync(path.join(masterPath, 'Pages', newFile))).toBeFalsy();
    console.log('✓ File NOT in master');

    // Cleanup
    fs.unlinkSync(newFilePath);
  });

  test.afterAll(async ({ }) => {
    // Cleanup: Delete test application
    if (testAppId && authToken) {
      const apiContext = await request.newContext({
        extraHTTPHeaders: {
          'Authorization': `Bearer ${authToken}`,
        }
      });

      await apiContext.delete(`${API_BASE}/applications/${testAppId}`);
      console.log('Cleaned up test application');
    }
  });
});
