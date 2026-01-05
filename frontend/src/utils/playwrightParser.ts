export interface PlaywrightStep {
  id: string;
  type: 'navigate' | 'click' | 'fill' | 'select' | 'check' | 'hover' | 'wait' | 'expect' | 'other';
  action: string;
  selector?: string;
  selectorName?: string;  // Friendly name for the selector
  value?: string;
  url?: string;
  description: string;
  lineNumber?: number;
  stepNumber?: number;  // Step number for screenshot association
  screenshot?: string;  // Screenshot URL
}

/**
 * Generate a friendly name from a selector
 * Examples:
 * - "#submit-btn" -> "Submit Button"
 * - "button[type='submit']" -> "Submit Button"
 * - "input[name='email']" -> "Email Input"
 * - ".login-button" -> "Login Button"
 */
export function generateSelectorName(selector: string, action: string): string {
  if (!selector) return '';

  // Remove quotes and trim
  const cleaned = selector.replace(/['"]/g, '').trim();

  // Extract meaningful parts
  let name = '';

  // Try to extract from id (#)
  if (cleaned.includes('#')) {
    name = cleaned.split('#')[1].split(/[\[\.\s]/)[0];
  }
  // Try to extract from class (.)
  else if (cleaned.includes('.')) {
    name = cleaned.split('.')[1].split(/[\[\s]/)[0];
  }
  // Try to extract from name attribute
  else if (cleaned.includes("name=")) {
    const match = cleaned.match(/name=['"]?([^'"\]]+)/);
    if (match) name = match[1];
  }
  // Try to extract from placeholder
  else if (cleaned.includes("placeholder=")) {
    const match = cleaned.match(/placeholder=['"]?([^'"\]]+)/);
    if (match) name = match[1];
  }
  // Try to extract text content
  else if (cleaned.includes("text=")) {
    const match = cleaned.match(/text=['"]?([^'"\]]+)/);
    if (match) name = match[1];
  }
  // Try to extract from aria-label
  else if (cleaned.includes("aria-label=")) {
    const match = cleaned.match(/aria-label=['"]?([^'"\]]+)/);
    if (match) name = match[1];
  }
  // Try to extract element type
  else if (cleaned.match(/^(button|input|textarea|select|a|div|span)/)) {
    const match = cleaned.match(/^(\w+)/);
    if (match) name = match[1];
  }
  // Fallback to shortened selector
  else {
    name = cleaned.substring(0, 20);
  }

  // Convert kebab-case or snake_case to Title Case
  name = name
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  // Add element type suffix if appropriate
  if (action === 'click' && !name.toLowerCase().includes('button') && !name.toLowerCase().includes('link')) {
    name += ' Button';
  } else if ((action === 'fill' || action === 'type') && !name.toLowerCase().includes('input') && !name.toLowerCase().includes('field')) {
    name += ' Field';
  }

  return name || 'Element';
}

export function parsePlaywrightCode(code: string): PlaywrightStep[] {
  if (!code || !code.trim()) return [];

  const steps: PlaywrightStep[] = [];
  const lines = code.split('\n');

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // Skip empty lines, imports, and test declarations
    if (!trimmedLine ||
        trimmedLine.startsWith('import ') ||
        trimmedLine.startsWith('test(') ||
        trimmedLine.startsWith('test.') ||
        trimmedLine.startsWith('//') ||
        trimmedLine.startsWith('/*') ||
        trimmedLine.startsWith('*') ||
        trimmedLine.startsWith('*/') ||
        trimmedLine.match(/^(async )?(function|const|let|var)/)) {
      return;
    }

    let step: PlaywrightStep | null = null;

    // Navigate
    if (trimmedLine.includes('.goto(')) {
      const urlMatch = trimmedLine.match(/goto\(['"](.*?)['"]\)/);
      const url = urlMatch ? urlMatch[1] : '';
      step = {
        id: `step-${index}`,
        type: 'navigate',
        action: 'goto',
        url,
        description: `Navigate to ${url}`,
        lineNumber: index + 1
      };
    }
    // Click (handles both old-style and modern locators)
    else if (trimmedLine.includes('.click(')) {
      let selector = '';
      let selectorName = '';

      // Modern locator: getByRole, getByText, getByLabel, etc.
      if (trimmedLine.includes('getByRole')) {
        const roleMatch = trimmedLine.match(/getByRole\(['"](\w+)['"](?:,\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\})?/);
        if (roleMatch) {
          const role = roleMatch[1];
          const name = roleMatch[2];
          selector = name ? `${role}[name="${name}"]` : role;
          selectorName = name || role.charAt(0).toUpperCase() + role.slice(1);
        }
      } else if (trimmedLine.includes('getByText')) {
        const textMatch = trimmedLine.match(/getByText\(['"]([^'"]+)['"]\)/);
        if (textMatch) {
          selectorName = textMatch[1];
          selector = `text=${textMatch[1]}`;
        }
      } else if (trimmedLine.includes('getByLabel')) {
        const labelMatch = trimmedLine.match(/getByLabel\(['"]([^'"]+)['"]\)/);
        if (labelMatch) {
          selectorName = labelMatch[1];
          selector = `label=${labelMatch[1]}`;
        }
      } else if (trimmedLine.includes('getByPlaceholder')) {
        const placeholderMatch = trimmedLine.match(/getByPlaceholder\(['"]([^'"]+)['"]\)/);
        if (placeholderMatch) {
          selectorName = placeholderMatch[1];
          selector = `placeholder=${placeholderMatch[1]}`;
        }
      } else if (trimmedLine.includes('getByTestId')) {
        const testIdMatch = trimmedLine.match(/getByTestId\(['"]([^'"]+)['"]\)/);
        if (testIdMatch) {
          selectorName = testIdMatch[1];
          selector = `data-testid=${testIdMatch[1]}`;
        }
      } else {
        // Old-style selector
        const selectorMatch = trimmedLine.match(/click\(['"](.*?)['"]\)/);
        selector = selectorMatch ? selectorMatch[1] : trimmedLine.match(/locator\(['"](.*?)['"]\)/)?.[1] || '';
        selectorName = generateSelectorName(selector, 'click');
      }

      step = {
        id: `step-${index}`,
        type: 'click',
        action: 'click',
        selector,
        selectorName,
        description: `Click ${selectorName || selector || 'element'}`,
        lineNumber: index + 1
      };
    }
    // Fill / Type (handles both old-style and modern locators)
    else if (trimmedLine.includes('.fill(') || trimmedLine.includes('.type(')) {
      let selector = '';
      let selectorName = '';
      const valueMatch = trimmedLine.match(/(?:fill|type)\(['"](.*?)['"]\)/);
      const value = valueMatch ? valueMatch[1] : '';
      const action = trimmedLine.includes('.fill(') ? 'fill' : 'type';

      // Modern locator: getByRole, getByText, getByLabel, etc.
      if (trimmedLine.includes('getByRole')) {
        const roleMatch = trimmedLine.match(/getByRole\(['"](\w+)['"](?:,\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\})?/);
        if (roleMatch) {
          const role = roleMatch[1];
          const name = roleMatch[2];
          selector = name ? `${role}[name="${name}"]` : role;
          selectorName = name || role.charAt(0).toUpperCase() + role.slice(1);
        }
      } else if (trimmedLine.includes('getByLabel')) {
        const labelMatch = trimmedLine.match(/getByLabel\(['"]([^'"]+)['"]\)/);
        if (labelMatch) {
          selectorName = labelMatch[1];
          selector = `label=${labelMatch[1]}`;
        }
      } else if (trimmedLine.includes('getByPlaceholder')) {
        const placeholderMatch = trimmedLine.match(/getByPlaceholder\(['"]([^'"]+)['"]\)/);
        if (placeholderMatch) {
          selectorName = placeholderMatch[1];
          selector = `placeholder=${placeholderMatch[1]}`;
        }
      } else {
        // Old-style selector
        const selectorMatch = trimmedLine.match(/(?:fill|type)\(['"](.*?)['"]/);
        selector = selectorMatch ? selectorMatch[1] : trimmedLine.match(/locator\(['"](.*?)['"]\)/)?.[1] || '';
        selectorName = generateSelectorName(selector, action);
      }

      step = {
        id: `step-${index}`,
        type: 'fill',
        action,
        selector,
        selectorName,
        value,
        description: `Type "${value}" into ${selectorName || selector || 'field'}`,
        lineNumber: index + 1
      };
    }
    // Select
    else if (trimmedLine.includes('.selectOption(')) {
      const selectorMatch = trimmedLine.match(/selectOption\(['"](.*?)['"]/);
      const valueMatch = trimmedLine.match(/,\s*['"](.*?)['"]\)/);
      const selector = selectorMatch ? selectorMatch[1] : '';
      const value = valueMatch ? valueMatch[1] : '';
      const selectorName = generateSelectorName(selector, 'select');
      step = {
        id: `step-${index}`,
        type: 'select',
        action: 'selectOption',
        selector,
        selectorName,
        value,
        description: `Select "${value}" from ${selectorName || selector}`,
        lineNumber: index + 1
      };
    }
    // Check / Uncheck
    else if (trimmedLine.includes('.check(') || trimmedLine.includes('.uncheck(')) {
      const selectorMatch = trimmedLine.match(/(?:check|uncheck)\(['"](.*?)['"]\)/);
      const selector = selectorMatch ? selectorMatch[1] : '';
      const action = trimmedLine.includes('.check(') ? 'check' : 'uncheck';
      const selectorName = generateSelectorName(selector, action);
      step = {
        id: `step-${index}`,
        type: 'check',
        action,
        selector,
        selectorName,
        description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${selectorName || selector}`,
        lineNumber: index + 1
      };
    }
    // Hover
    else if (trimmedLine.includes('.hover(')) {
      const selectorMatch = trimmedLine.match(/hover\(['"](.*?)['"]\)/);
      const selector = selectorMatch ? selectorMatch[1] : '';
      const selectorName = generateSelectorName(selector, 'hover');
      step = {
        id: `step-${index}`,
        type: 'hover',
        action: 'hover',
        selector,
        selectorName,
        description: `Hover over ${selectorName || selector}`,
        lineNumber: index + 1
      };
    }
    // Wait
    else if (trimmedLine.includes('.waitFor')) {
      const selectorMatch = trimmedLine.match(/waitFor.*\(['"](.*?)['"]\)/);
      const selector = selectorMatch ? selectorMatch[1] : '';
      const selectorName = selector ? generateSelectorName(selector, 'wait') : '';
      step = {
        id: `step-${index}`,
        type: 'wait',
        action: 'waitFor',
        selector,
        selectorName,
        description: `Wait for ${selectorName || selector || 'condition'}`,
        lineNumber: index + 1
      };
    }
    // Expect / Assert
    else if (trimmedLine.includes('expect(')) {
      const expectMatch = trimmedLine.match(/expect\((.*?)\)/);
      const assertion = expectMatch ? expectMatch[1] : '';
      step = {
        id: `step-${index}`,
        type: 'expect',
        action: 'expect',
        description: `Assert ${assertion}`,
        lineNumber: index + 1
      };
    }
    // Generic await page action
    else if (trimmedLine.includes('await page.') && trimmedLine.includes('(')) {
      const actionMatch = trimmedLine.match(/page\.(\w+)\(/);
      const action = actionMatch ? actionMatch[1] : 'action';
      step = {
        id: `step-${index}`,
        type: 'other',
        action,
        description: `${action.charAt(0).toUpperCase() + action.slice(1)}`,
        lineNumber: index + 1
      };
    }

    if (step) {
      // Add step number for screenshot association
      step.stepNumber = steps.length + 1;
      steps.push(step);
    }
  });

  return steps;
}

export function getStepIcon(type: PlaywrightStep['type']): string {
  const icons: Record<PlaywrightStep['type'], string> = {
    navigate: '🌐',
    click: '🖱️',
    fill: '⌨️',
    select: '📋',
    check: '☑️',
    hover: '👆',
    wait: '⏳',
    expect: '✓',
    other: '⚙️'
  };
  return icons[type] || '•';
}

export function getStepColor(type: PlaywrightStep['type']): string {
  const colors: Record<PlaywrightStep['type'], string> = {
    navigate: 'bg-blue-50 text-blue-700 border-blue-200',
    click: 'bg-purple-50 text-purple-700 border-purple-200',
    fill: 'bg-green-50 text-green-700 border-green-200',
    select: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    check: 'bg-pink-50 text-pink-700 border-pink-200',
    hover: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    wait: 'bg-orange-50 text-orange-700 border-orange-200',
    expect: 'bg-teal-50 text-teal-700 border-teal-200',
    other: 'bg-gray-50 text-gray-700 border-gray-200'
  };
  return colors[type] || 'bg-gray-50 text-gray-700 border-gray-200';
}
