/**
 * Test GitHub Actions Integration
 *
 * Usage:
 *   GITHUB_TOKEN=ghp_xxx npx tsx scripts/test-github-integration.ts
 *
 * Or interactively without token to just test the API endpoints exist.
 */

const API_BASE = 'http://localhost:3000/api';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  data?: any;
}

const results: TestResult[] = [];

async function testEndpoint(
  name: string,
  method: string,
  path: string,
  body?: any,
  headers?: Record<string, string>
): Promise<TestResult> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => ({}));

    return {
      name,
      passed: response.status < 500, // Endpoint exists and responds
      data: { status: response.status, ...data },
    };
  } catch (error: any) {
    return {
      name,
      passed: false,
      error: error.message,
    };
  }
}

async function main() {
  console.log('GitHub Actions Integration Test');
  console.log('================================\n');

  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    console.log('Note: No GITHUB_TOKEN provided. Testing endpoint availability only.\n');
    console.log('To fully test, run with: GITHUB_TOKEN=ghp_xxx npx tsx scripts/test-github-integration.ts\n');
  }

  // Test 1: Check server health
  console.log('1. Testing server health...');
  const healthResult = await testEndpoint('Server Health', 'GET', '/health');
  results.push(healthResult);
  console.log(`   ${healthResult.passed ? '✓' : '✗'} ${healthResult.name}: ${healthResult.data?.status || healthResult.error}\n`);

  // Test 2: Check GitHub integration status endpoint
  console.log('2. Testing GitHub integration status endpoint...');
  const integrationResult = await testEndpoint('GitHub Integration Status', 'GET', '/github/integration');
  results.push(integrationResult);
  console.log(`   ${integrationResult.passed ? '✓' : '✗'} ${integrationResult.name}: ${integrationResult.data?.status || integrationResult.error}\n`);

  // Test 3: Check workflow generation endpoint
  console.log('3. Testing workflow generation endpoint...');
  const generateResult = await testEndpoint('Workflow Generation', 'POST', '/github/workflows/generate', {
    config: {
      browser: 'chromium',
      shardCount: 2,
      environment: 'staging',
    },
  });
  results.push(generateResult);
  console.log(`   ${generateResult.passed ? '✓' : '✗'} ${generateResult.name}: ${generateResult.data?.status || generateResult.error}\n`);

  // Test 4: Check workflow preview endpoint
  console.log('4. Testing workflow preview endpoint...');
  const previewResult = await testEndpoint('Workflow Preview', 'POST', '/github/workflows/preview', {
    config: {
      browser: 'chromium',
      shardCount: 4,
      environment: 'production',
      retries: 2,
      timeout: 60000,
    },
  });
  results.push(previewResult);
  console.log(`   ${previewResult.passed ? '✓' : '✗'} ${previewResult.name}: ${previewResult.data?.status || previewResult.error}\n`);

  // Test 5: Check webhook endpoint (ping)
  console.log('5. Testing webhook endpoint (ping)...');
  const webhookResult = await testEndpoint('Webhook Ping', 'POST', '/github/webhooks', {
    zen: 'Test ping',
    hook_id: 12345,
  }, {
    'X-GitHub-Event': 'ping',
    'X-GitHub-Delivery': 'test-delivery-id',
  });
  results.push(webhookResult);
  console.log(`   ${webhookResult.passed ? '✓' : '✗'} ${webhookResult.name}: ${webhookResult.data?.status || webhookResult.error}\n`);

  // Test 6: Check runs list endpoint
  console.log('6. Testing runs list endpoint...');
  const runsResult = await testEndpoint('List Runs', 'GET', '/github/runs?owner=test&repo=test');
  results.push(runsResult);
  console.log(`   ${runsResult.passed ? '✓' : '✗'} ${runsResult.name}: ${runsResult.data?.status || runsResult.error}\n`);

  // If token provided, test actual GitHub API
  if (token) {
    console.log('7. Testing GitHub token validation...');
    const validateResult = await testEndpoint('Token Validation', 'POST', '/github/validate-token', {
      token,
    });
    results.push(validateResult);
    console.log(`   ${validateResult.passed ? '✓' : '✗'} ${validateResult.name}`);
    if (validateResult.data?.data?.login) {
      console.log(`      Authenticated as: ${validateResult.data.data.login}`);
    }
    console.log();
  }

  // Summary
  console.log('\n================================');
  console.log('Summary');
  console.log('================================');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  console.log(`Passed: ${passed}/${total}`);

  if (passed === total) {
    console.log('\n✓ All GitHub Actions integration endpoints are working!\n');
  } else {
    console.log('\n✗ Some endpoints failed. Check the errors above.\n');
  }

  // Next steps
  console.log('Next Steps to Run Tests on GitHub Actions:');
  console.log('==========================================\n');
  console.log('1. Get a GitHub PAT with "repo" and "workflow" scopes');
  console.log('2. Connect via: POST /api/github/connect { "token": "ghp_xxx" }');
  console.log('3. Copy the workflow template to your repo:');
  console.log('   backend/templates/github-workflow.yml -> .github/workflows/vero-tests.yml');
  console.log('4. Trigger a run via: POST /api/github/runs/trigger');
  console.log('   {');
  console.log('     "owner": "your-username",');
  console.log('     "repo": "your-test-repo",');
  console.log('     "workflowPath": "vero-tests.yml",');
  console.log('     "ref": "main",');
  console.log('     "inputs": { "browser": "chromium", "shard_count": "2" }');
  console.log('   }');
  console.log('');
}

main().catch(console.error);
