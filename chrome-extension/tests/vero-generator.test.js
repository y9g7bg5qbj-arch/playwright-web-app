/**
 * Tests for Vero Code Generator
 * Tests conversion of recorded actions to Vero DSL code
 */

describe('VeroCodeGenerator', () => {
  describe('action conversion', () => {
    test('should convert navigation action', () => {
      const action = {
        type: 'navigation',
        url: 'https://example.com/login',
        timestamp: Date.now()
      };

      const statement = actionToVeroStatement(action);
      expect(statement).toBe('open "https://example.com/login"');
    });

    test('should convert click action', () => {
      const action = {
        type: 'click',
        selector: '[data-testid="login-button"]',
        tagName: 'BUTTON',
        timestamp: Date.now()
      };

      const statement = actionToVeroStatement(action);
      expect(statement).toBe('click "[data-testid="login-button"]"');
    });

    test('should convert double click action', () => {
      const action = {
        type: 'dblclick',
        selector: '.editable-cell',
        timestamp: Date.now()
      };

      const statement = actionToVeroStatement(action);
      expect(statement).toBe('doubleClick ".editable-cell"');
    });

    test('should convert input action with fill', () => {
      const action = {
        type: 'input',
        selector: '#username',
        value: 'testuser@example.com',
        timestamp: Date.now()
      };

      const statement = actionToVeroStatement(action);
      expect(statement).toBe('fill "#username" with "testuser@example.com"');
    });

    test('should escape quotes in input values', () => {
      const action = {
        type: 'input',
        selector: '#message',
        value: 'He said "hello"',
        timestamp: Date.now()
      };

      const statement = actionToVeroStatement(action);
      expect(statement).toContain('\\"hello\\"');
    });

    test('should convert select action', () => {
      const action = {
        type: 'select',
        selector: '#country',
        value: 'United States',
        timestamp: Date.now()
      };

      const statement = actionToVeroStatement(action);
      expect(statement).toBe('select "United States" from "#country"');
    });

    test('should convert check action', () => {
      const action = {
        type: 'check',
        selector: '#terms-checkbox',
        timestamp: Date.now()
      };

      const statement = actionToVeroStatement(action);
      expect(statement).toBe('check "#terms-checkbox"');
    });

    test('should convert uncheck action', () => {
      const action = {
        type: 'uncheck',
        selector: '#newsletter',
        timestamp: Date.now()
      };

      const statement = actionToVeroStatement(action);
      expect(statement).toBe('uncheck "#newsletter"');
    });

    test('should convert hover action', () => {
      const action = {
        type: 'hover',
        selector: '.dropdown-trigger',
        timestamp: Date.now()
      };

      const statement = actionToVeroStatement(action);
      expect(statement).toBe('hover ".dropdown-trigger"');
    });

    test('should convert scroll to element action', () => {
      const action = {
        type: 'scroll',
        selector: '#footer',
        timestamp: Date.now()
      };

      const statement = actionToVeroStatement(action);
      expect(statement).toBe('scroll to "#footer"');
    });

    test('should convert scroll by delta action', () => {
      const action = {
        type: 'scroll',
        deltaY: 500,
        timestamp: Date.now()
      };

      const statement = actionToVeroStatement(action);
      expect(statement).toBe('scroll by 500');
    });

    test('should convert key press actions', () => {
      const testCases = [
        { key: 'Enter', expected: 'press Enter' },
        { key: 'Tab', expected: 'press Tab' },
        { key: 'Escape', expected: 'press Escape' },
        { key: 'Backspace', expected: 'press Backspace' }
      ];

      testCases.forEach(({ key, expected }) => {
        const action = { type: 'keydown', key, timestamp: Date.now() };
        expect(actionToVeroStatement(action)).toBe(expected);
      });
    });

    test('should ignore non-special key presses', () => {
      const action = {
        type: 'keydown',
        key: 'a',
        timestamp: Date.now()
      };

      const statement = actionToVeroStatement(action);
      expect(statement).toBeNull();
    });

    test('should convert screenshot action', () => {
      const action = {
        type: 'screenshot',
        name: 'login-page',
        timestamp: Date.now()
      };

      const statement = actionToVeroStatement(action);
      expect(statement).toBe('screenshot "login-page"');
    });

    test('should convert wait action with selector', () => {
      const action = {
        type: 'wait',
        selector: '.loading-spinner',
        timeout: 5000,
        timestamp: Date.now()
      };

      const statement = actionToVeroStatement(action);
      expect(statement).toBe('wait for ".loading-spinner"');
    });

    test('should convert wait action with duration', () => {
      const action = {
        type: 'wait',
        duration: 2000,
        timestamp: Date.now()
      };

      const statement = actionToVeroStatement(action);
      expect(statement).toBe('wait 2000ms');
    });
  });

  describe('assertion conversion', () => {
    test('should convert visible assertion', () => {
      const action = {
        type: 'assertion',
        assertionType: 'visible',
        selector: '#welcome-message',
        timestamp: Date.now()
      };

      const statement = actionToVeroStatement(action);
      expect(statement).toBe('verify "#welcome-message" is visible');
    });

    test('should convert hidden assertion', () => {
      const action = {
        type: 'assertion',
        assertionType: 'hidden',
        selector: '.error-alert',
        timestamp: Date.now()
      };

      const statement = actionToVeroStatement(action);
      expect(statement).toBe('verify ".error-alert" is hidden');
    });

    test('should convert containsText assertion', () => {
      const action = {
        type: 'assertion',
        assertionType: 'containsText',
        selector: '.notification',
        value: 'Success!',
        timestamp: Date.now()
      };

      const statement = actionToVeroStatement(action);
      expect(statement).toBe('verify ".notification" contains "Success!"');
    });

    test('should convert hasValue assertion', () => {
      const action = {
        type: 'assertion',
        assertionType: 'hasValue',
        selector: '#email-input',
        value: 'test@example.com',
        timestamp: Date.now()
      };

      const statement = actionToVeroStatement(action);
      expect(statement).toBe('verify "#email-input" has value "test@example.com"');
    });

    test('should convert enabled assertion', () => {
      const action = {
        type: 'assertion',
        assertionType: 'enabled',
        selector: '#submit-button',
        timestamp: Date.now()
      };

      const statement = actionToVeroStatement(action);
      expect(statement).toBe('verify "#submit-button" is enabled');
    });

    test('should convert disabled assertion', () => {
      const action = {
        type: 'assertion',
        assertionType: 'disabled',
        selector: '#locked-field',
        timestamp: Date.now()
      };

      const statement = actionToVeroStatement(action);
      expect(statement).toBe('verify "#locked-field" is disabled');
    });

    test('should convert checked assertion', () => {
      const action = {
        type: 'assertion',
        assertionType: 'checked',
        selector: '#remember-me',
        timestamp: Date.now()
      };

      const statement = actionToVeroStatement(action);
      expect(statement).toBe('verify "#remember-me" is checked');
    });
  });

  describe('feature generation', () => {
    test('should generate complete feature with scenario', () => {
      const actions = [
        { type: 'navigation', url: 'https://example.com/login' },
        { type: 'input', selector: '#username', value: 'user' },
        { type: 'input', selector: '#password', value: 'pass' },
        { type: 'click', selector: '#submit' }
      ];

      const code = generateVeroFeature(actions, 'Login Test', 'User Login');

      expect(code).toContain('feature "Login Test"');
      expect(code).toContain('scenario "User Login"');
      expect(code).toContain('open "https://example.com/login"');
      expect(code).toContain('fill "#username" with "user"');
      expect(code).toContain('fill "#password" with "pass"');
      expect(code).toContain('click "#submit"');
      expect(code).toContain('end');
    });

    test('should use default names when not provided', () => {
      const actions = [
        { type: 'click', selector: '#button' }
      ];

      const code = generateVeroFeature(actions);

      expect(code).toContain('feature "Recorded Test"');
      expect(code).toContain('scenario "Recorded Scenario"');
    });

    test('should handle empty actions array', () => {
      const code = generateVeroFeature([]);

      expect(code).toContain('feature');
      expect(code).toContain('scenario');
      expect(code).toContain('end');
    });
  });

  describe('page object generation', () => {
    test('should generate page object with elements', () => {
      const elements = {
        usernameField: '#username',
        passwordField: '#password',
        submitButton: '[data-testid="submit"]'
      };

      const code = generatePageObject('LoginPage', '/login', elements);

      expect(code).toContain('page LoginPage');
      expect(code).toContain('url "/login"');
      expect(code).toContain('element usernameField: "#username"');
      expect(code).toContain('element passwordField: "#password"');
      expect(code).toContain('element submitButton: "[data-testid="submit"]"');
      expect(code).toContain('end');
    });

    test('should generate page object with actions', () => {
      const elements = {
        usernameField: '#username',
        passwordField: '#password'
      };

      const actions = [
        {
          name: 'login',
          params: ['username', 'password'],
          steps: [
            'fill usernameField with username',
            'fill passwordField with password',
            'click submitButton'
          ]
        }
      ];

      const code = generatePageObject('LoginPage', '/login', elements, actions);

      expect(code).toContain('action login(username, password)');
      expect(code).toContain('fill usernameField with username');
    });

    test('should strip domain from URL', () => {
      const code = generatePageObject(
        'HomePage',
        'https://example.com/dashboard',
        { title: 'h1' }
      );

      expect(code).toContain('url "/dashboard"');
      expect(code).not.toContain('https://');
    });
  });

  describe('field name generation', () => {
    test('should convert data-testid to camelCase', () => {
      const name = selectorToFieldName('[data-testid="submit-button"]');
      expect(name).toBe('submitButton');
    });

    test('should convert ID to camelCase', () => {
      const name = selectorToFieldName('#user-name-input');
      expect(name).toBe('userNameInput');
    });

    test('should convert aria-label to camelCase', () => {
      const name = selectorToFieldName('[aria-label="Close Dialog"]');
      expect(name).toBe('closeDialog');
    });

    test('should handle simple class selectors', () => {
      const name = selectorToFieldName('.main-button');
      expect(name).toBe('mainButton');
    });

    test('should generate unique names for similar selectors', () => {
      const usedNames = new Set();

      const name1 = selectorToFieldName('[data-testid="button"]', usedNames);
      usedNames.add(name1);

      const name2 = selectorToFieldName('[data-testid="button"]', usedNames);
      expect(name2).not.toBe(name1);
    });
  });
});

// Implementation functions for testing

function actionToVeroStatement(action) {
  switch (action.type) {
    case 'navigation':
      return `open "${action.url}"`;

    case 'click':
      return `click "${action.selector}"`;

    case 'dblclick':
      return `doubleClick "${action.selector}"`;

    case 'input':
      const escapedValue = (action.value || '').replace(/"/g, '\\"');
      return `fill "${action.selector}" with "${escapedValue}"`;

    case 'select':
      return `select "${action.value}" from "${action.selector}"`;

    case 'check':
      return `check "${action.selector}"`;

    case 'uncheck':
      return `uncheck "${action.selector}"`;

    case 'hover':
      return `hover "${action.selector}"`;

    case 'scroll':
      if (action.selector) {
        return `scroll to "${action.selector}"`;
      }
      return `scroll by ${action.deltaY || 0}`;

    case 'keydown':
      const specialKeys = ['Enter', 'Tab', 'Escape', 'Backspace', 'Delete'];
      if (specialKeys.includes(action.key)) {
        return `press ${action.key}`;
      }
      return null;

    case 'screenshot':
      return `screenshot "${action.name || 'screenshot'}"`;

    case 'wait':
      if (action.selector) {
        return `wait for "${action.selector}"`;
      }
      return `wait ${action.duration || 1000}ms`;

    case 'assertion':
      return assertionToVeroStatement(action);

    default:
      return null;
  }
}

function assertionToVeroStatement(action) {
  const selector = action.selector || '';
  const value = (action.value || '').replace(/"/g, '\\"');

  switch (action.assertionType) {
    case 'visible':
      return `verify "${selector}" is visible`;
    case 'hidden':
      return `verify "${selector}" is hidden`;
    case 'containsText':
      return `verify "${selector}" contains "${value}"`;
    case 'hasValue':
      return `verify "${selector}" has value "${value}"`;
    case 'enabled':
      return `verify "${selector}" is enabled`;
    case 'disabled':
      return `verify "${selector}" is disabled`;
    case 'checked':
      return `verify "${selector}" is checked`;
    case 'unchecked':
      return `verify "${selector}" is unchecked`;
    default:
      return `verify "${selector}" is visible`;
  }
}

function generateVeroFeature(actions, featureName = 'Recorded Test', scenarioName = 'Recorded Scenario') {
  const lines = [];

  lines.push(`feature "${featureName}"`);
  lines.push('');
  lines.push(`  scenario "${scenarioName}"`);

  for (const action of actions) {
    const statement = actionToVeroStatement(action);
    if (statement) {
      lines.push(`    ${statement}`);
    }
  }

  lines.push('  end');
  lines.push('');
  lines.push('end');

  return lines.join('\n');
}

function generatePageObject(name, url, elements, actions = []) {
  const lines = [];

  lines.push(`page ${name}`);

  if (url) {
    const urlPath = url.replace(/^https?:\/\/[^\/]+/, '') || '/';
    lines.push(`  url "${urlPath}"`);
  }

  lines.push('');

  for (const [fieldName, selector] of Object.entries(elements)) {
    lines.push(`  element ${fieldName}: "${selector}"`);
  }

  if (actions.length > 0) {
    lines.push('');
    for (const action of actions) {
      const params = action.params ? action.params.join(', ') : '';
      lines.push(`  action ${action.name}(${params})`);
      for (const step of action.steps || []) {
        lines.push(`    ${step}`);
      }
      lines.push('  end');
      lines.push('');
    }
  }

  lines.push('end');

  return lines.join('\n');
}

function selectorToFieldName(selector, usedNames = new Set()) {
  let name = '';

  // Extract from data-testid
  const testIdMatch = selector.match(/data-testid="([^"]+)"/);
  if (testIdMatch) {
    name = testIdMatch[1];
  }

  // Extract from ID
  if (!name) {
    const idMatch = selector.match(/#([a-zA-Z][a-zA-Z0-9_-]*)/);
    if (idMatch) {
      name = idMatch[1];
    }
  }

  // Extract from aria-label
  if (!name) {
    const ariaMatch = selector.match(/aria-label="([^"]+)"/);
    if (ariaMatch) {
      name = ariaMatch[1];
    }
  }

  // Extract from class
  if (!name) {
    const classMatch = selector.match(/\.([a-zA-Z][a-zA-Z0-9_-]*)/);
    if (classMatch) {
      name = classMatch[1];
    }
  }

  // Convert to camelCase
  name = name
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase())
    .replace(/^[A-Z]/, chr => chr.toLowerCase())
    .replace(/[^a-zA-Z0-9]/g, '');

  // Ensure uniqueness
  if (usedNames.has(name)) {
    let counter = 2;
    while (usedNames.has(`${name}${counter}`)) {
      counter++;
    }
    name = `${name}${counter}`;
  }

  return name || 'element';
}

// Export for test runner
if (typeof module !== 'undefined') {
  module.exports = {
    actionToVeroStatement,
    assertionToVeroStatement,
    generateVeroFeature,
    generatePageObject,
    selectorToFieldName
  };
}
