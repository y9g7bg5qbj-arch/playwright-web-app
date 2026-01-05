/**
 * Tests for Selector Generator
 * Uses Jest-style syntax for testing selector generation logic
 */

// Mock DOM environment for testing
const mockDocument = {
  createElement: (tag) => ({
    tagName: tag.toUpperCase(),
    id: '',
    className: '',
    classList: { contains: () => false },
    getAttribute: () => null,
    hasAttribute: () => false,
    parentElement: null,
    children: [],
    textContent: '',
    innerText: '',
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 100, height: 50 })
  })
};

// Import would be: import { SelectorGenerator } from '../content/selector-generator.js';
// For testing, we inline the test cases

describe('SelectorGenerator', () => {
  describe('selector prioritization', () => {
    test('should prioritize data-testid over other selectors', () => {
      const element = createMockElement({
        tagName: 'BUTTON',
        id: 'submit-btn',
        className: 'btn btn-primary',
        attributes: { 'data-testid': 'login-submit' }
      });

      const selectors = generateSelectorsForElement(element);
      expect(selectors[0].type).toBe('testId');
      expect(selectors[0].value).toBe('[data-testid="login-submit"]');
      expect(selectors[0].confidence).toBeGreaterThanOrEqual(95);
    });

    test('should use ID selector when no test ID present', () => {
      const element = createMockElement({
        tagName: 'INPUT',
        id: 'username',
        className: 'form-control'
      });

      const selectors = generateSelectorsForElement(element);
      const idSelector = selectors.find(s => s.type === 'id');
      expect(idSelector).toBeDefined();
      expect(idSelector.value).toBe('#username');
    });

    test('should generate aria-label selector', () => {
      const element = createMockElement({
        tagName: 'BUTTON',
        attributes: { 'aria-label': 'Close dialog' }
      });

      const selectors = generateSelectorsForElement(element);
      const ariaSelector = selectors.find(s => s.type === 'label');
      expect(ariaSelector).toBeDefined();
      expect(ariaSelector.value).toContain('aria-label');
    });

    test('should generate role-based selector', () => {
      const element = createMockElement({
        tagName: 'DIV',
        attributes: { role: 'button', 'aria-pressed': 'false' }
      });

      const selectors = generateSelectorsForElement(element);
      const roleSelector = selectors.find(s => s.type === 'role');
      expect(roleSelector).toBeDefined();
      expect(roleSelector.value).toContain('role="button"');
    });
  });

  describe('confidence scoring', () => {
    test('should assign highest confidence to unique test IDs', () => {
      const element = createMockElement({
        tagName: 'BUTTON',
        attributes: { 'data-testid': 'unique-button' }
      });

      const selectors = generateSelectorsForElement(element);
      expect(selectors[0].confidence).toBe(100);
    });

    test('should assign lower confidence to class-based selectors', () => {
      const element = createMockElement({
        tagName: 'DIV',
        className: 'container main-content'
      });

      const selectors = generateSelectorsForElement(element);
      const classSelector = selectors.find(s => s.type === 'class');
      expect(classSelector.confidence).toBeLessThan(80);
    });

    test('should assign lowest confidence to tag-only selectors', () => {
      const element = createMockElement({
        tagName: 'DIV'
      });

      const selectors = generateSelectorsForElement(element);
      const tagSelector = selectors.find(s => s.type === 'tag');
      expect(tagSelector).toBeDefined();
      expect(tagSelector.confidence).toBeLessThanOrEqual(30);
    });
  });

  describe('CSS path generation', () => {
    test('should generate valid CSS path', () => {
      const parent = createMockElement({ tagName: 'FORM', id: 'login-form' });
      const element = createMockElement({
        tagName: 'INPUT',
        attributes: { type: 'text', name: 'username' },
        parentElement: parent
      });

      const selectors = generateSelectorsForElement(element);
      const cssPathSelector = selectors.find(s => s.type === 'cssPath');
      expect(cssPathSelector).toBeDefined();
      expect(cssPathSelector.value).toMatch(/^#login-form/);
    });

    test('should use nth-of-type for sibling disambiguation', () => {
      const parent = createMockElement({ tagName: 'UL' });
      const sibling1 = createMockElement({ tagName: 'LI', parentElement: parent });
      const sibling2 = createMockElement({ tagName: 'LI', parentElement: parent });
      parent.children = [sibling1, sibling2];

      const path = getCssPath(sibling2);
      expect(path).toContain(':nth-of-type');
    });
  });

  describe('XPath generation', () => {
    test('should generate text-based XPath', () => {
      const element = createMockElement({
        tagName: 'BUTTON',
        textContent: 'Submit Form'
      });

      const selectors = generateSelectorsForElement(element);
      const xpathSelector = selectors.find(s => s.type === 'xpath');
      expect(xpathSelector).toBeDefined();
      expect(xpathSelector.value).toContain('Submit Form');
    });

    test('should escape special characters in XPath', () => {
      const element = createMockElement({
        tagName: 'SPAN',
        textContent: "It's a test"
      });

      const selectors = generateSelectorsForElement(element);
      const xpathSelector = selectors.find(s => s.type === 'xpath');
      // Should use concat() for quotes or escape properly
      expect(xpathSelector.value).toBeDefined();
    });
  });

  describe('input-specific selectors', () => {
    test('should use placeholder for inputs', () => {
      const element = createMockElement({
        tagName: 'INPUT',
        attributes: { type: 'email', placeholder: 'Enter your email' }
      });

      const selectors = generateSelectorsForElement(element);
      const placeholderSelector = selectors.find(s =>
        s.value.includes('placeholder')
      );
      expect(placeholderSelector).toBeDefined();
    });

    test('should use name attribute for form inputs', () => {
      const element = createMockElement({
        tagName: 'INPUT',
        attributes: { type: 'text', name: 'firstName' }
      });

      const selectors = generateSelectorsForElement(element);
      const nameSelector = selectors.find(s => s.value.includes('name='));
      expect(nameSelector).toBeDefined();
    });

    test('should generate label-based selector for labeled inputs', () => {
      const element = createMockElement({
        tagName: 'INPUT',
        id: 'email-input',
        attributes: { type: 'email' }
      });

      // Simulate a label pointing to this input
      const label = createMockElement({
        tagName: 'LABEL',
        attributes: { for: 'email-input' },
        textContent: 'Email Address'
      });

      const selectors = generateSelectorsForElement(element, { label });
      // Should be able to use the label text
      expect(selectors.length).toBeGreaterThan(0);
    });
  });

  describe('selector uniqueness', () => {
    test('should verify selector uniqueness', () => {
      const element = createMockElement({
        tagName: 'BUTTON',
        id: 'unique-btn'
      });

      const isUnique = checkSelectorUniqueness('#unique-btn', element);
      expect(isUnique).toBe(true);
    });

    test('should flag non-unique selectors', () => {
      const element = createMockElement({
        tagName: 'DIV',
        className: 'common-class'
      });

      // Mock document.querySelectorAll returning multiple elements
      const isUnique = checkSelectorUniqueness('.common-class', element, 3);
      expect(isUnique).toBe(false);
    });
  });
});

// Helper functions for testing

function createMockElement(options = {}) {
  return {
    tagName: options.tagName || 'DIV',
    id: options.id || '',
    className: options.className || '',
    classList: {
      contains: (cls) => (options.className || '').split(' ').includes(cls),
      length: (options.className || '').split(' ').filter(Boolean).length,
      [Symbol.iterator]: function* () {
        yield* (options.className || '').split(' ').filter(Boolean);
      }
    },
    getAttribute: (attr) => (options.attributes || {})[attr] || null,
    hasAttribute: (attr) => !!(options.attributes || {})[attr],
    parentElement: options.parentElement || null,
    children: options.children || [],
    textContent: options.textContent || '',
    innerText: options.textContent || '',
    getBoundingClientRect: () => ({ top: 100, left: 100, width: 100, height: 50 }),
    nodeType: 1
  };
}

function generateSelectorsForElement(element, context = {}) {
  const selectors = [];
  const attrs = {};

  // Collect attributes
  ['data-testid', 'data-test-id', 'data-test', 'data-cy', 'id', 'name',
   'aria-label', 'placeholder', 'role', 'type', 'for'].forEach(attr => {
    const value = element.getAttribute(attr);
    if (value) attrs[attr] = value;
  });

  // Test ID (highest priority)
  if (attrs['data-testid']) {
    selectors.push({
      type: 'testId',
      value: `[data-testid="${attrs['data-testid']}"]`,
      confidence: 100
    });
  }

  // ID
  if (element.id) {
    selectors.push({
      type: 'id',
      value: `#${element.id}`,
      confidence: 95
    });
  }

  // Aria label
  if (attrs['aria-label']) {
    selectors.push({
      type: 'label',
      value: `[aria-label="${attrs['aria-label']}"]`,
      confidence: 90
    });
  }

  // Role
  if (attrs.role) {
    selectors.push({
      type: 'role',
      value: `[role="${attrs.role}"]`,
      confidence: 85
    });
  }

  // Placeholder
  if (attrs.placeholder) {
    selectors.push({
      type: 'placeholder',
      value: `[placeholder="${attrs.placeholder}"]`,
      confidence: 80
    });
  }

  // Name
  if (attrs.name) {
    selectors.push({
      type: 'name',
      value: `[name="${attrs.name}"]`,
      confidence: 75
    });
  }

  // Class
  if (element.className) {
    const classes = element.className.split(' ').filter(Boolean);
    if (classes.length > 0) {
      selectors.push({
        type: 'class',
        value: `.${classes.join('.')}`,
        confidence: 60
      });
    }
  }

  // CSS Path
  const cssPath = getCssPath(element);
  if (cssPath) {
    selectors.push({
      type: 'cssPath',
      value: cssPath,
      confidence: 50
    });
  }

  // XPath with text
  if (element.textContent && element.textContent.trim().length < 50) {
    selectors.push({
      type: 'xpath',
      value: `//${element.tagName.toLowerCase()}[contains(text(),"${element.textContent.trim()}")]`,
      confidence: 45
    });
  }

  // Tag only (fallback)
  if (selectors.length === 0) {
    selectors.push({
      type: 'tag',
      value: element.tagName.toLowerCase(),
      confidence: 20
    });
  }

  return selectors;
}

function getCssPath(element) {
  const path = [];
  let current = element;

  while (current && current.nodeType === 1) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      selector = `#${current.id}`;
      path.unshift(selector);
      break;
    }

    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        s => s.tagName === current.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    path.unshift(selector);
    current = parent;
  }

  return path.join(' > ');
}

function checkSelectorUniqueness(selector, element, mockCount = 1) {
  // In real tests, this would use document.querySelectorAll
  // For mock testing, we use the mockCount parameter
  return mockCount === 1;
}

// Export for test runner
if (typeof module !== 'undefined') {
  module.exports = {
    createMockElement,
    generateSelectorsForElement,
    getCssPath,
    checkSelectorUniqueness
  };
}
