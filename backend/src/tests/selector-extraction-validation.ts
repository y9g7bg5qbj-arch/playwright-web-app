/**
 * Selector Extraction Validation Test
 *
 * Creates 5 test cases via the API to validate:
 * 1. Selector extraction script injection
 * 2. Multiple selector strategies (testId, role, label, text, css)
 * 3. Uniqueness validation
 * 4. Vero code generation
 *
 * TODO: Update to use ClaudeAgentService when integrated
 */

// TODO: Replace with ClaudeAgentService
// import { ClaudeAgentService } from '../services/claude-agent/ClaudeAgentService';
import { generateVeroCodeSimple, RecordingSession } from '../services/selector/VeroGenerator';

// Test cases for validation
const TEST_CASES = [
  {
    name: 'Google Search Test',
    targetUrl: 'https://www.google.com',
    steps: [
      'Fill the search field with "playwright automation"',
      'Click the search button',
    ],
  },
  {
    name: 'DuckDuckGo Search Test',
    targetUrl: 'https://duckduckgo.com',
    steps: [
      'Fill the search box with "web testing"',
      'Press Enter to search',
    ],
  },
  {
    name: 'GitHub Navigation Test',
    targetUrl: 'https://github.com',
    steps: [
      'Click the Sign in link',
      'Verify the login form is visible',
    ],
  },
  {
    name: 'Wikipedia Test',
    targetUrl: 'https://www.wikipedia.org',
    steps: [
      'Click English link',
      'Fill the search input with "Playwright"',
      'Click the search button',
    ],
  },
  {
    name: 'Example.com Simple Test',
    targetUrl: 'https://example.com',
    steps: [
      'Verify the heading "Example Domain" is visible',
      'Click the "More information..." link',
    ],
  },
];

async function runValidation() {
  console.log('='.repeat(60));
  console.log('Selector Extraction Validation Test');
  console.log('='.repeat(60));
  console.log();

  // Check if we have API key for Stagehand
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.log('No API key found. Testing selector extraction with mock data...');
    await testSelectorExtractionOffline();
    return;
  }

  console.log(`Testing with ${TEST_CASES.length} test cases...`);
  console.log();

  let passedTests = 0;
  let failedTests = 0;

  for (let i = 0; i < TEST_CASES.length; i++) {
    const testCase = TEST_CASES[i];
    console.log(`[${i + 1}/${TEST_CASES.length}] ${testCase.name}`);
    console.log(`  URL: ${testCase.targetUrl}`);
    console.log(`  Steps: ${testCase.steps.length}`);

    try {
      const result = await runSingleTestCase(testCase, apiKey);

      if (result.success) {
        passedTests++;
        console.log('  Status: PASSED');
        console.log(`  Selectors Extracted: ${result.selectorsExtracted}`);
        console.log(`  Vero Code Generated: ${result.veroCodeGenerated ? 'Yes' : 'No'}`);

        if (result.veroCode) {
          console.log('  Generated Vero Code:');
          result.veroCode.split('\n').forEach((line) => {
            console.log(`    ${line}`);
          });
        }
      } else {
        failedTests++;
        console.log(`  Status: FAILED - ${result.error}`);
      }
    } catch (error: any) {
      failedTests++;
      console.log(`  Status: ERROR - ${error.message}`);
    }

    console.log();
  }

  console.log('='.repeat(60));
  console.log(`Results: ${passedTests} passed, ${failedTests} failed`);
  console.log('='.repeat(60));
}

/**
 * TODO: Update to use ClaudeAgentService when integrated
 * This function previously used StagehandService for browser automation
 */
async function runSingleTestCase(
  testCase: (typeof TEST_CASES)[0],
  _apiKey: string
): Promise<{
  success: boolean;
  selectorsExtracted: number;
  veroCodeGenerated: boolean;
  veroCode?: string;
  error?: string;
}> {
  // TODO: Implement with ClaudeAgentService
  console.log(`Test case "${testCase.name}" skipped - browser automation being upgraded`);
  return {
    success: false,
    selectorsExtracted: 0,
    veroCodeGenerated: false,
    error: 'Browser automation is being upgraded to use ClaudeAgentService',
  };
}

/**
 * Test selector extraction with mock data (no browser needed)
 */
async function testSelectorExtractionOffline() {
  console.log('Testing Vero code generation with mock recording session...');
  console.log();

  // Create a mock recording session
  const mockSession = {
    id: 'test_session_001',
    startUrl: 'https://example.com',
    startTime: Date.now(),
    actions: [
      {
        type: 'navigate' as const,
        instruction: 'Navigate to https://example.com',
        selectors: undefined,
        url: 'https://example.com',
        timestamp: Date.now(),
      },
      {
        type: 'click' as const,
        instruction: 'Click the login button',
        selectors: {
          testId: 'login-btn',
          role: 'button',
          roleWithName: 'button[name="Login"]',
          label: null,
          placeholder: null,
          text: 'Login',
          title: null,
          alt: null,
          css: '#login-btn',
          tagName: 'button',
          isUnique: { testId: true, css: true },
          recommended: 'login-btn',
          recommendedType: 'testId',
        },
        url: 'https://example.com',
        timestamp: Date.now(),
      },
      {
        type: 'fill' as const,
        instruction: 'Fill the username field with "admin"',
        selectors: {
          testId: null,
          role: 'textbox',
          roleWithName: null,
          label: 'Username',
          placeholder: 'Enter username',
          text: null,
          title: null,
          alt: null,
          css: 'input[name="username"]',
          tagName: 'input',
          isUnique: { label: true, placeholder: true },
          recommended: 'Username',
          recommendedType: 'label',
        },
        value: 'admin',
        url: 'https://example.com',
        timestamp: Date.now(),
      },
      {
        type: 'fill' as const,
        instruction: 'Fill the password field with "secret123"',
        selectors: {
          testId: null,
          role: 'textbox',
          roleWithName: null,
          label: 'Password',
          placeholder: 'Enter password',
          text: null,
          title: null,
          alt: null,
          css: 'input[type="password"]',
          tagName: 'input',
          isUnique: { label: true, placeholder: true },
          recommended: 'Password',
          recommendedType: 'label',
        },
        value: 'secret123',
        url: 'https://example.com',
        timestamp: Date.now(),
      },
      {
        type: 'click' as const,
        instruction: 'Click the submit button',
        selectors: {
          testId: 'submit-btn',
          role: 'button',
          roleWithName: 'button[name="Submit"]',
          label: null,
          placeholder: null,
          text: 'Submit',
          title: null,
          alt: null,
          css: 'button[type="submit"]',
          tagName: 'button',
          isUnique: { testId: true, css: true },
          recommended: 'submit-btn',
          recommendedType: 'testId',
        },
        url: 'https://example.com',
        timestamp: Date.now(),
      },
    ],
    endTime: Date.now(),
  };

  console.log('Mock session created with', mockSession.actions.length, 'actions');
  console.log();

  // Generate Vero code
  const veroCode = generateVeroCodeSimple(mockSession as RecordingSession);

  console.log('Generated PAGE object:');
  console.log('-'.repeat(40));
  console.log(veroCode.pageObject);
  console.log();

  console.log('Generated FEATURE:');
  console.log('-'.repeat(40));
  console.log(veroCode.feature);
  console.log();

  console.log('Combined Vero Code:');
  console.log('='.repeat(40));
  console.log(veroCode.combined);
  console.log('='.repeat(40));

  // Validate the generated code
  const validations = [
    {
      name: 'PAGE object generated',
      check: veroCode.pageObject.includes('PAGE'),
    },
    {
      name: 'FIELD definitions present',
      check: veroCode.pageObject.includes('FIELD'),
    },
    {
      name: 'FEATURE block generated',
      check: veroCode.feature.includes('FEATURE'),
    },
    {
      name: 'SCENARIO defined',
      check: veroCode.feature.includes('SCENARIO'),
    },
    {
      name: 'OPEN statement for navigation',
      check: veroCode.combined.includes('OPEN'),
    },
    {
      name: 'CLICK statements for buttons',
      check: veroCode.combined.includes('CLICK'),
    },
    {
      name: 'FILL statements for inputs',
      check: veroCode.combined.includes('FILL'),
    },
    {
      name: 'Uses testId selector (login-btn)',
      check: veroCode.combined.includes('login-btn'),
    },
    {
      name: 'Uses label selector (Username)',
      check: veroCode.combined.includes('Username'),
    },
  ];

  console.log();
  console.log('Validation Results:');
  console.log('-'.repeat(40));

  let passed = 0;
  for (const validation of validations) {
    const status = validation.check ? 'PASS' : 'FAIL';
    console.log(`  [${status}] ${validation.name}`);
    if (validation.check) passed++;
  }

  console.log();
  console.log(`Total: ${passed}/${validations.length} validations passed`);
}

// Run the validation
runValidation().catch(console.error);
