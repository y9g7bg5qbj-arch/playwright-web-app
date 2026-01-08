/**
 * GitHub Actions Setup Script
 *
 * This script connects your GitHub account and triggers a test workflow.
 *
 * Usage:
 *   GITHUB_TOKEN=ghp_xxx GITHUB_REPO=owner/repo npx tsx scripts/setup-github.ts
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();
const API_BASE = 'https://api.github.com';

// Get from environment
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO; // format: owner/repo

// Encryption (same as in github.service.ts)
const ENCRYPTION_KEY = process.env.GITHUB_TOKEN_ENCRYPTION_KEY || 'default-key-change-in-production!';

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

async function fetchGitHub(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Vero-IDE',
      ...options.headers,
    },
  });
  return response;
}

async function main() {
  console.log('\n🚀 GitHub Actions Setup for Vero IDE');
  console.log('=====================================\n');

  // Validate inputs
  if (!GITHUB_TOKEN) {
    console.error('❌ Error: GITHUB_TOKEN environment variable is required');
    console.log('\nUsage:');
    console.log('  GITHUB_TOKEN=ghp_xxx GITHUB_REPO=owner/repo npx tsx scripts/setup-github.ts');
    console.log('\nTo create a token:');
    console.log('  1. Go to https://github.com/settings/tokens/new');
    console.log('  2. Select scopes: repo, workflow');
    console.log('  3. Generate and copy the token\n');
    process.exit(1);
  }

  if (!GITHUB_REPO) {
    console.error('❌ Error: GITHUB_REPO environment variable is required (format: owner/repo)');
    process.exit(1);
  }

  const [owner, repo] = GITHUB_REPO.split('/');
  if (!owner || !repo) {
    console.error('❌ Error: GITHUB_REPO must be in format: owner/repo');
    process.exit(1);
  }

  // Step 1: Validate token
  console.log('1️⃣  Validating GitHub token...');
  const userResponse = await fetchGitHub('/user');
  if (!userResponse.ok) {
    console.error('❌ Invalid GitHub token');
    process.exit(1);
  }
  const user = await userResponse.json();
  console.log(`   ✓ Authenticated as: ${user.login}\n`);

  // Step 2: Check repository access
  console.log('2️⃣  Checking repository access...');
  const repoResponse = await fetchGitHub(`/repos/${owner}/${repo}`);
  if (!repoResponse.ok) {
    console.error(`❌ Cannot access repository: ${owner}/${repo}`);
    console.log('   Make sure the token has "repo" scope and you have access to this repo.');
    process.exit(1);
  }
  const repoData = await repoResponse.json();
  console.log(`   ✓ Repository: ${repoData.full_name}`);
  console.log(`   ✓ Default branch: ${repoData.default_branch}`);
  console.log(`   ✓ Private: ${repoData.private}\n`);

  // Step 3: Get or create user in database
  console.log('3️⃣  Setting up database...');
  let dbUser = await prisma.user.findFirst();
  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        email: `${user.login}@github.local`,
        name: user.name || user.login,
        passwordHash: 'github-oauth',
      },
    });
    console.log(`   ✓ Created user: ${dbUser.email}`);
  } else {
    console.log(`   ✓ Using existing user: ${dbUser.email}`);
  }

  // Step 4: Save GitHub integration
  console.log('\n4️⃣  Saving GitHub integration...');
  const encryptedToken = encrypt(GITHUB_TOKEN);

  const integration = await prisma.gitHubIntegration.upsert({
    where: { userId: dbUser.id },
    create: {
      userId: dbUser.id,
      accessToken: encryptedToken,
      tokenType: 'pat',
      login: user.login,
      avatarUrl: user.avatar_url,
      isValid: true,
      lastValidatedAt: new Date(),
    },
    update: {
      accessToken: encryptedToken,
      login: user.login,
      avatarUrl: user.avatar_url,
      isValid: true,
      lastValidatedAt: new Date(),
    },
  });
  console.log(`   ✓ GitHub integration saved for: ${user.login}\n`);

  // Step 5: Check for workflow file
  console.log('5️⃣  Checking for workflow file...');
  const workflowResponse = await fetchGitHub(
    `/repos/${owner}/${repo}/contents/.github/workflows/vero-tests.yml`
  );

  let workflowExists = workflowResponse.ok;
  if (workflowExists) {
    console.log('   ✓ Workflow file exists: .github/workflows/vero-tests.yml\n');
  } else {
    console.log('   ⚠ Workflow file not found: .github/workflows/vero-tests.yml');
    console.log('   Creating workflow file...\n');

    // Create workflow file
    const workflowContent = `# Vero IDE - GitHub Actions Workflow
# Auto-generated for testing

name: Vero Tests

on:
  workflow_dispatch:
    inputs:
      browser:
        description: 'Browser to use'
        required: false
        default: 'chromium'
        type: choice
        options:
          - chromium
          - firefox
          - webkit
      environment:
        description: 'Target environment'
        required: false
        default: 'staging'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Echo test info
        run: |
          echo "🎭 Vero IDE Test Run"
          echo "Browser: \${{ github.event.inputs.browser || 'chromium' }}"
          echo "Environment: \${{ github.event.inputs.environment || 'staging' }}"
          echo "Triggered by: \${{ github.actor }}"
          echo "Run ID: \${{ github.run_id }}"

      - name: Simulate test execution
        run: |
          echo "Installing dependencies..."
          sleep 2
          echo "Running Playwright tests..."
          sleep 3
          echo "✅ All tests passed!"

      - name: Create test summary
        run: |
          echo "## Test Results" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "| Metric | Value |" >> $GITHUB_STEP_SUMMARY
          echo "|--------|-------|" >> $GITHUB_STEP_SUMMARY
          echo "| Tests Run | 10 |" >> $GITHUB_STEP_SUMMARY
          echo "| Passed | 10 |" >> $GITHUB_STEP_SUMMARY
          echo "| Failed | 0 |" >> $GITHUB_STEP_SUMMARY
          echo "| Duration | 5s |" >> $GITHUB_STEP_SUMMARY
`;

    const createResponse = await fetchGitHub(
      `/repos/${owner}/${repo}/contents/.github/workflows/vero-tests.yml`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Add Vero IDE test workflow',
          content: Buffer.from(workflowContent).toString('base64'),
        }),
      }
    );

    if (createResponse.ok) {
      console.log('   ✓ Created workflow file in repository\n');
      workflowExists = true;
    } else {
      const error = await createResponse.json();
      console.error('   ❌ Failed to create workflow:', error.message);
      console.log('   Please manually add the workflow file to your repo.\n');
    }
  }

  // Step 6: Trigger workflow
  if (workflowExists) {
    console.log('6️⃣  Triggering workflow run...');

    const triggerResponse = await fetchGitHub(
      `/repos/${owner}/${repo}/actions/workflows/vero-tests.yml/dispatches`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ref: repoData.default_branch,
          inputs: {
            browser: 'chromium',
            environment: 'staging',
          },
        }),
      }
    );

    if (triggerResponse.ok || triggerResponse.status === 204) {
      console.log('   ✓ Workflow triggered successfully!\n');

      // Wait a moment for GitHub to register the run
      console.log('   Waiting for workflow to start...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Get the latest run
      const runsResponse = await fetchGitHub(
        `/repos/${owner}/${repo}/actions/runs?per_page=1`
      );

      if (runsResponse.ok) {
        const runsData = await runsResponse.json();
        if (runsData.workflow_runs && runsData.workflow_runs.length > 0) {
          const run = runsData.workflow_runs[0];
          console.log(`\n   📊 Workflow Run Details:`);
          console.log(`   ─────────────────────────`);
          console.log(`   Run #${run.run_number}`);
          console.log(`   Status: ${run.status}`);
          console.log(`   URL: ${run.html_url}\n`);
        }
      }
    } else {
      const error = await triggerResponse.json().catch(() => ({}));
      console.error('   ❌ Failed to trigger workflow:', error.message || 'Unknown error');
      console.log('   The workflow file might need a few seconds to be recognized by GitHub.');
      console.log(`   Try manually at: https://github.com/${owner}/${repo}/actions\n`);
    }
  }

  // Summary
  console.log('=====================================');
  console.log('✅ Setup Complete!');
  console.log('=====================================\n');
  console.log(`GitHub User: ${user.login}`);
  console.log(`Repository: ${owner}/${repo}`);
  console.log(`View runs: https://github.com/${owner}/${repo}/actions\n`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
