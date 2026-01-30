import { test, expect, Page, APIRequestContext } from '@playwright/test';

// Base URL for frontend
const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000/api';

// Test user credentials - unique per test run to avoid conflicts
const testEmail = `test_${Date.now()}@example.com`;
const testPassword = 'TestPassword123!';
const testName = 'Test User';

// Helper function to register and get token
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

// Helper function to set auth token on a page
async function setAuthToken(page: Page, token: string): Promise<void> {
  // Navigate to the page first, then set localStorage
  await page.goto(BASE_URL);
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate((authToken) => {
    localStorage.setItem('auth_token', authToken);
  }, token);
  // Reload to apply the token
  await page.reload();
  await page.waitForLoadState('networkidle');
}

// Helper function to create a project via API
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

// Helper function to create a nested project with folders
async function createNestedProject(request: APIRequestContext, token: string, appId: string, projectName: string): Promise<any> {
  const response = await request.post(`${API_URL}/applications/${appId}/projects`, {
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

// Helper to get files in a project
async function getProjectFiles(request: APIRequestContext, token: string, projectId: string, veroPath: string): Promise<any[]> {
  const response = await request.get(`${API_URL}/vero/files?projectId=${projectId}&veroPath=${encodeURIComponent(veroPath)}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  return data.files || [];
}

// Helper to get file content - uses veroPath to read directly
async function getFileContent(request: APIRequestContext, token: string, veroPath: string, relativePath: string): Promise<string> {
  // Use the veroPath + relativePath to construct the full file path
  const fullPath = `${veroPath}/${relativePath}`;

  // Read file directly using the path
  const response = await request.get(`${API_URL}/vero/files/${encodeURIComponent(relativePath)}?veroPath=${encodeURIComponent(veroPath)}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  return data.content || '';
}

test.describe('Project Folder Structure', () => {
  let token: string;
  let applicationId: string;
  let nestedProject: any;
  const projectName = `Test_App_${Date.now()}`;
  const nestedProjectName = `Test_Project_${Date.now()}`;

  test.beforeAll(async ({ request }) => {
    // Register and get token
    token = await registerUser(request);

    // Create an application (top-level project)
    const app = await createProjectViaAPI(request, token, projectName);
    applicationId = app.id;

    // Create a nested project (this creates the 3 folders)
    nestedProject = await createNestedProject(request, token, applicationId, nestedProjectName);
  });

  test('Test 1: New project has exactly 3 folders (Pages, Features, PageActions)', async ({ page, request }) => {
    // Get the files in the project
    const files = await getProjectFiles(request, token, applicationId, nestedProject.veroPath);

    // Should have exactly 3 folders
    const folderNames = files.filter(f => f.type === 'directory').map(f => f.name).sort();

    expect(folderNames).toHaveLength(3);
    expect(folderNames).toContain('Pages');
    expect(folderNames).toContain('Features');
    expect(folderNames).toContain('PageActions');

    // Set auth and navigate to editor to take a screenshot
    await setAuthToken(page, token);
    await page.goto(`${BASE_URL}/editor`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({
      path: `test-results/test1-three-folders-${Date.now()}.png`,
      fullPage: true
    });
  });

  test('Test 2: Pages folder contains example.vero with valid PAGE syntax', async ({ page, request }) => {
    // Get files to find the Pages folder
    const files = await getProjectFiles(request, token, applicationId, nestedProject.veroPath);

    // Find Pages folder
    const pagesFolder = files.find(f => f.name === 'Pages' && f.type === 'directory');
    expect(pagesFolder).toBeDefined();

    // Check Pages folder has example.vero
    const pagesChildren = pagesFolder?.children || [];
    const exampleFile = pagesChildren.find((f: any) => f.name === 'example.vero');
    expect(exampleFile).toBeDefined();

    // Get the content of example.vero using the nested project's veroPath
    const content = await getFileContent(request, token, nestedProject.veroPath, exampleFile.path);

    // Verify it contains PAGE syntax (uppercase as created by application.routes.ts)
    expect(content).toContain('PAGE');
    expect(content).toContain('FIELD');
    expect(content).toContain('END');

    // Set auth and navigate to show in UI
    await setAuthToken(page, token);
    await page.goto(`${BASE_URL}/editor`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: `test-results/test2-pages-example-${Date.now()}.png`,
      fullPage: true
    });
  });

  test('Test 3: Features folder contains example.vero with valid FEATURE syntax', async ({ page, request }) => {
    // Get files to find the Features folder
    const files = await getProjectFiles(request, token, applicationId, nestedProject.veroPath);

    // Find Features folder
    const featuresFolder = files.find(f => f.name === 'Features' && f.type === 'directory');
    expect(featuresFolder).toBeDefined();

    // Check Features folder has example.vero
    const featuresChildren = featuresFolder?.children || [];
    const exampleFile = featuresChildren.find((f: any) => f.name === 'example.vero');
    expect(exampleFile).toBeDefined();

    // Get the content of example.vero using the nested project's veroPath
    const content = await getFileContent(request, token, nestedProject.veroPath, exampleFile.path);

    // Verify it contains FEATURE/SCENARIO syntax (uppercase as created by application.routes.ts)
    expect(content).toContain('FEATURE');
    expect(content).toContain('SCENARIO');
    expect(content).toContain('END');

    // Set auth and navigate to show in UI
    await setAuthToken(page, token);
    await page.goto(`${BASE_URL}/editor`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: `test-results/test3-features-example-${Date.now()}.png`,
      fullPage: true
    });
  });

  test('Test 4: Duplicate project creates copy with new name', async ({ page, request }) => {
    const duplicatedName = `Duplicated_${Date.now()}`;

    // Duplicate the application via API
    const response = await request.post(`${API_URL}/applications/${applicationId}/duplicate`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: duplicatedName
      }
    });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.name).toBe(duplicatedName);
    expect(data.data.id).not.toBe(applicationId);

    // Set auth and navigate to show in UI
    await setAuthToken(page, token);
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: `test-results/test4-duplicate-project-${Date.now()}.png`,
      fullPage: true
    });
  });

  test('Test 5: Duplicated project contains all original files', async ({ page, request }) => {
    const duplicatedName = `Duplicated_Check_${Date.now()}`;

    // Duplicate the application via API
    const response = await request.post(`${API_URL}/applications/${applicationId}/duplicate`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: duplicatedName
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    const duplicatedApp = data.data;

    // Get the duplicated nested project
    expect(duplicatedApp.projects).toBeDefined();
    expect(duplicatedApp.projects.length).toBeGreaterThan(0);

    const duplicatedNestedProject = duplicatedApp.projects[0];

    // Get files in the duplicated project
    const files = await getProjectFiles(request, token, duplicatedApp.id, duplicatedNestedProject.veroPath);

    // Should have the same 3 folders
    const folderNames = files.filter(f => f.type === 'directory').map(f => f.name).sort();
    expect(folderNames).toHaveLength(3);
    expect(folderNames).toContain('Pages');
    expect(folderNames).toContain('Features');
    expect(folderNames).toContain('PageActions');

    // Check Pages folder has example.vero
    const pagesFolder = files.find(f => f.name === 'Pages' && f.type === 'directory');
    const pagesChildren = pagesFolder?.children || [];
    expect(pagesChildren.some((f: any) => f.name === 'example.vero')).toBe(true);

    // Check Features folder has example.vero
    const featuresFolder = files.find(f => f.name === 'Features' && f.type === 'directory');
    const featuresChildren = featuresFolder?.children || [];
    expect(featuresChildren.some((f: any) => f.name === 'example.vero')).toBe(true);

    // Set auth and navigate to show in UI
    await setAuthToken(page, token);
    await page.goto(`${BASE_URL}/editor`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: `test-results/test5-duplicated-files-${Date.now()}.png`,
      fullPage: true
    });
  });
});
