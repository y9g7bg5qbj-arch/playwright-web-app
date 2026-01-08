import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = path.join(__dirname, 'evidence');
const API_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:5173';

// GitHub config
const GITHUB_OWNER = 'y9g7bg5qbj-arch';
const GITHUB_REPO = 'playwright-web-app';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testApiTrigger() {
  // Create screenshots directory
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  console.log('🚀 Testing GitHub Actions Integration\n');

  // First, get a token by logging in
  console.log('📍 Step 1: Getting auth token...');
  const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.com', password: 'password123' })
  });
  const loginData = await loginResponse.json();
  const token = loginData.token;
  console.log(`   ✅ Got auth token\n`);

  // Step 2: Trigger GitHub Actions via API
  console.log('📍 Step 2: Triggering GitHub Actions via API...');
  const triggerTime = Date.now();

  const triggerResponse = await fetch(`${API_URL}/api/github/runs/trigger`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      workflowPath: 'vero-tests.yml',
      ref: 'main',
      inputs: {
        browsers: 'chromium',
        workers: '2',
        shards: '1'
      }
    })
  });

  const triggerData = await triggerResponse.json();
  console.log(`   Status: ${triggerResponse.status}`);
  console.log(`   Response: ${JSON.stringify(triggerData, null, 2)}`);

  if (!triggerResponse.ok) {
    console.error('   ❌ Failed to trigger workflow');
    return;
  }
  console.log(`   ✅ Triggered at: ${new Date(triggerTime).toISOString()}\n`);

  // Step 3: Wait for run to appear on GitHub
  console.log('📍 Step 3: Waiting for run to appear on GitHub...');
  await sleep(5000);

  const runsResponse = await fetch(`${API_URL}/api/github/runs?owner=${GITHUB_OWNER}&repo=${GITHUB_REPO}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const runsData = await runsResponse.json();

  // Find the most recent run
  const recentRun = runsData.workflow_runs?.find((run: any) =>
    new Date(run.created_at).getTime() > triggerTime - 60000
  );

  if (recentRun) {
    console.log(`   ✅ Found run #${recentRun.run_number} (${recentRun.status})`);
    console.log(`   Run ID: ${recentRun.id}`);
  } else {
    console.log(`   ⚠️ No recent run found. Available runs:`);
    runsData.workflow_runs?.slice(0, 3).forEach((run: any) => {
      console.log(`      - #${run.run_number}: ${run.status} (${run.created_at})`);
    });
  }
  console.log('');

  // Step 4: Open browser and check Execution tab
  console.log('📍 Step 4: Opening browser to check Execution tab...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`   [Console ERROR] ${msg.text()}`);
    }
  });

  try {
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'api-01-app-loaded.png'), fullPage: true });
    console.log('   ✅ App loaded\n');

    // Go to Execution tab
    console.log('📍 Step 5: Navigating to Execution tab...');
    const executionTab = page.locator('button:has-text("Execution")').first();
    await executionTab.click();
    await sleep(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'api-02-execution-tab.png'), fullPage: true });
    console.log('   ✅ Execution tab opened\n');

    // Click GitHub Actions tab
    console.log('📍 Step 6: Switching to GitHub Actions tab...');
    const githubTab = page.locator('button:has-text("GitHub Actions")').first();
    if (await githubTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await githubTab.click();
      await sleep(500);
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'api-03-github-tab.png'), fullPage: true });
    console.log('   ✅ GitHub Actions tab opened\n');

    // Check for execution cards
    console.log('📍 Step 7: Checking for executions...');
    const pageText = await page.textContent('body') || '';

    if (pageText.includes('No GitHub Actions runs yet')) {
      console.log('   ⚠️ No executions displayed in UI');
      console.log('   The Zustand store might not have any executions saved.');
      console.log('   Executions are only saved when triggered FROM the UI, not via direct API calls.\n');
    } else if (pageText.includes('queued') || pageText.includes('in_progress') || pageText.includes('completed')) {
      console.log('   ✅ Found execution status in UI!');
    }

    // Take final screenshot
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'api-04-final-state.png'), fullPage: true });

    // Print localStorage state
    console.log('\n📍 Step 8: Checking Zustand store state...');
    const localStorageData = await page.evaluate(() => {
      return localStorage.getItem('github-executions');
    });
    console.log(`   localStorage['github-executions']: ${localStorageData || '(empty)'}\n`);

  } finally {
    console.log('🏁 Closing browser...');
    await browser.close();
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY');
  console.log('='.repeat(60));
  console.log('The GitHub Actions run was triggered via API.');
  console.log('However, the Execution tab only shows runs that were');
  console.log('triggered FROM the UI (via the VeroIDE component).');
  console.log('');
  console.log('To see executions in the UI, you need to:');
  console.log('1. Trigger from UI (Run dropdown -> Run on GitHub Actions)');
  console.log('2. OR manually add the execution to the Zustand store');
  console.log('='.repeat(60));
}

testApiTrigger().catch(console.error);
