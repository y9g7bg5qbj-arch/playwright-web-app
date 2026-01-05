/**
 * Vero Code Generator
 * Converts recorded actions to Vero DSL code
 */

class VeroCodeGenerator {
  constructor(options = {}) {
    this.options = {
      indent: '    ',
      usePageObjects: true,
      generateComments: true,
      groupActions: true,
      ...options
    };
  }

  /**
   * Generate a complete Vero feature from actions
   * @param {Array} actions - Recorded actions
   * @param {string} featureName - Name for the feature
   * @returns {string} - Vero DSL code
   */
  generateFeature(actions, featureName = 'Recorded Test') {
    if (!actions || actions.length === 0) {
      return this.generateEmptyFeature(featureName);
    }

    const pageObjects = this.extractPageObjects(actions);
    const scenarios = this.groupIntoScenarios(actions);

    let code = '';

    // Add feature header
    code += `feature "${this.sanitizeName(featureName)}" {\n`;

    // Add page object references
    if (this.options.usePageObjects && pageObjects.size > 0) {
      for (const pageName of pageObjects.keys()) {
        code += `${this.options.indent}use ${pageName}\n`;
      }
      code += '\n';
    }

    // Generate scenarios
    for (const scenario of scenarios) {
      code += this.generateScenario(scenario, pageObjects);
    }

    code += '}\n';

    return code;
  }

  /**
   * Generate an empty feature template
   */
  generateEmptyFeature(featureName) {
    return `feature "${this.sanitizeName(featureName)}" {
    // Add your page object references here
    // use LoginPage

    scenario "Test scenario" {
        // Add your test steps here
        // open "https://example.com"
        // fill LoginPage.emailInput with "user@test.com"
        // click LoginPage.submitBtn
    }
}
`;
  }

  /**
   * Extract page objects from actions
   * @param {Array} actions - Recorded actions
   * @returns {Map} - Page objects map
   */
  extractPageObjects(actions) {
    const pageObjects = new Map();

    for (const action of actions) {
      if (action.fieldName && action.selector) {
        const pageName = this.getPageName(action.url);

        if (!pageObjects.has(pageName)) {
          pageObjects.set(pageName, new Map());
        }

        pageObjects.get(pageName).set(action.fieldName, {
          selector: action.selector,
          alternatives: action.alternatives || [],
          confidence: action.confidence || 0,
          type: action.tagName,
          inputType: action.elementType
        });
      }
    }

    return pageObjects;
  }

  /**
   * Group actions into logical scenarios
   * @param {Array} actions - Recorded actions
   * @returns {Array} - Array of scenario objects
   */
  groupIntoScenarios(actions) {
    if (!this.options.groupActions) {
      return [{
        name: 'Recorded Test',
        actions: actions
      }];
    }

    const scenarios = [];
    let currentScenario = {
      name: 'Test Flow',
      actions: []
    };

    for (const action of actions) {
      // Start new scenario on navigation to different page
      if (action.type === 'navigation' && currentScenario.actions.length > 0) {
        scenarios.push(currentScenario);
        currentScenario = {
          name: this.generateScenarioName(action),
          actions: []
        };
      }

      currentScenario.actions.push(action);
    }

    // Push remaining actions
    if (currentScenario.actions.length > 0) {
      scenarios.push(currentScenario);
    }

    return scenarios.length > 0 ? scenarios : [{
      name: 'Recorded Test',
      actions: []
    }];
  }

  /**
   * Generate scenario code
   * @param {Object} scenario - Scenario object
   * @param {Map} pageObjects - Page objects map
   * @returns {string} - Scenario code
   */
  generateScenario(scenario, pageObjects) {
    const indent = this.options.indent;
    let code = `${indent}scenario "${this.sanitizeName(scenario.name)}" {\n`;

    for (const action of scenario.actions) {
      const statement = this.actionToStatement(action, pageObjects);
      if (statement) {
        code += statement;
      }
    }

    code += `${indent}}\n\n`;
    return code;
  }

  /**
   * Convert an action to a Vero statement
   * @param {Object} action - Action object
   * @param {Map} pageObjects - Page objects map
   * @returns {string} - Vero statement
   */
  actionToStatement(action, pageObjects) {
    const indent = this.options.indent.repeat(2);
    const fieldRef = this.getFieldReference(action, pageObjects);

    // Add comment if enabled
    let comment = '';
    if (this.options.generateComments && action.confidence && action.confidence < 70) {
      comment = ` // Low confidence: ${action.confidence}%`;
    }

    switch (action.type) {
      case 'navigation':
        return `${indent}open "${action.value}"${comment}\n`;

      case 'click':
        if (action.isSubmit) {
          return `${indent}click ${fieldRef} // Submit${comment}\n`;
        }
        return `${indent}click ${fieldRef}${comment}\n`;

      case 'fill':
        const value = this.escapeString(action.value || '');
        return `${indent}fill ${fieldRef} with "${value}"${comment}\n`;

      case 'select':
        const option = this.escapeString(action.optionText || action.value || '');
        return `${indent}select ${fieldRef} option "${option}"${comment}\n`;

      case 'check':
        return `${indent}check ${fieldRef}${comment}\n`;

      case 'uncheck':
        return `${indent}uncheck ${fieldRef}${comment}\n`;

      case 'hover':
        return `${indent}hover ${fieldRef}${comment}\n`;

      case 'scroll':
        if (action.selector) {
          return `${indent}scroll to ${fieldRef}${comment}\n`;
        }
        // Skip scroll to page position for now
        return null;

      case 'press':
        return `${indent}press "${action.key}"${comment}\n`;

      case 'wait':
        const timeout = action.timeout ? ` timeout ${action.timeout}ms` : '';
        return `${indent}wait for ${fieldRef}${timeout}${comment}\n`;

      case 'screenshot':
        const name = this.escapeString(action.value || 'screenshot');
        return `${indent}screenshot "${name}"${comment}\n`;

      case 'assertion':
        return this.assertionToStatement(action, fieldRef, indent, comment);

      default:
        if (this.options.generateComments) {
          return `${indent}// Unsupported action: ${action.type}\n`;
        }
        return null;
    }
  }

  /**
   * Convert assertion to Vero statement
   */
  assertionToStatement(action, fieldRef, indent, comment) {
    switch (action.assertionType) {
      case 'visible':
        return `${indent}verify ${fieldRef} is visible${comment}\n`;

      case 'hidden':
        return `${indent}verify ${fieldRef} is hidden${comment}\n`;

      case 'text':
        const text = this.escapeString(action.value || '');
        return `${indent}verify "${text}" is visible${comment}\n`;

      case 'contains':
        const content = this.escapeString(action.value || '');
        return `${indent}verify ${fieldRef} contains "${content}"${comment}\n`;

      case 'value':
        const val = this.escapeString(action.value || '');
        return `${indent}verify ${fieldRef} has value "${val}"${comment}\n`;

      case 'enabled':
        return `${indent}verify ${fieldRef} is enabled${comment}\n`;

      case 'disabled':
        return `${indent}verify ${fieldRef} is disabled${comment}\n`;

      case 'checked':
        return `${indent}verify ${fieldRef} is checked${comment}\n`;

      case 'unchecked':
        return `${indent}verify ${fieldRef} is not checked${comment}\n`;

      default:
        return `${indent}// Unknown assertion: ${action.assertionType}${comment}\n`;
    }
  }

  /**
   * Get field reference for an action
   */
  getFieldReference(action, pageObjects) {
    if (this.options.usePageObjects && action.fieldName) {
      const pageName = this.getPageName(action.url);
      return `${pageName}.${action.fieldName}`;
    }

    // Fall back to raw selector
    if (action.selector) {
      return `"${this.escapeString(action.selector)}"`;
    }

    return '"unknown"';
  }

  /**
   * Generate page object code
   * @param {Array} actions - Recorded actions
   * @returns {string} - Page object code
   */
  generatePageObject(actions) {
    const pageObjects = this.extractPageObjects(actions);
    let code = '';

    for (const [pageName, fields] of pageObjects) {
      const url = this.getUrlPattern(actions, pageName);
      code += `page ${pageName} for "${url}" {\n`;

      for (const [fieldName, info] of fields) {
        code += `${this.options.indent}field ${fieldName} = "${this.escapeString(info.selector)}"`;

        // Add comment with type info
        if (this.options.generateComments && info.type) {
          code += ` // ${info.type.toLowerCase()}`;
          if (info.inputType) {
            code += `[${info.inputType}]`;
          }
        }
        code += '\n';
      }

      code += '}\n\n';
    }

    return code;
  }

  /**
   * Generate combined code (page objects + feature)
   */
  generateFullCode(actions, featureName) {
    const pageObjectCode = this.generatePageObject(actions);
    const featureCode = this.generateFeature(actions, featureName);

    return `// Page Objects\n${pageObjectCode}\n// Feature\n${featureCode}`;
  }

  /**
   * Helper: Get page name from URL
   */
  getPageName(url) {
    if (!url) return 'UnknownPage';

    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname
        .replace(/^\//, '')
        .replace(/\/$/, '')
        .replace(/\//g, '_')
        .replace(/-/g, '_');

      if (!path) return 'HomePage';

      // Convert to PascalCase and add Page suffix
      const name = path
        .split('_')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join('');

      return name + 'Page';
    } catch (e) {
      return 'UnknownPage';
    }
  }

  /**
   * Helper: Get URL pattern for page object
   */
  getUrlPattern(actions, pageName) {
    const action = actions.find(a =>
      a.type === 'navigation' && this.getPageName(a.value) === pageName
    );

    if (action) {
      try {
        const url = new URL(action.value);
        return `${url.origin}${url.pathname}`;
      } catch (e) {
        return action.value;
      }
    }

    // Try to find from other actions
    const anyAction = actions.find(a => this.getPageName(a.url) === pageName);
    if (anyAction) {
      try {
        const url = new URL(anyAction.url);
        return `${url.origin}${url.pathname}`;
      } catch (e) {
        return anyAction.url || '*';
      }
    }

    return '*';
  }

  /**
   * Helper: Generate scenario name from action
   */
  generateScenarioName(action) {
    if (action.type === 'navigation') {
      try {
        const url = new URL(action.value);
        const path = url.pathname.split('/').filter(Boolean).pop() || 'Home';
        return `Navigate to ${path}`;
      } catch (e) {
        return 'Navigation';
      }
    }
    return 'Test Flow';
  }

  /**
   * Helper: Sanitize name for Vero
   */
  sanitizeName(name) {
    if (!name) return 'Untitled';
    return name
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);
  }

  /**
   * Helper: Escape string for Vero
   */
  escapeString(str) {
    if (!str) return '';
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  /**
   * Parse Vero code to actions (reverse operation)
   * @param {string} code - Vero DSL code
   * @returns {Array} - Array of action objects
   */
  parseVeroCode(code) {
    const actions = [];
    const lines = code.split('\n');

    const actionPatterns = [
      { regex: /^\s*open\s+"([^"]+)"/, type: 'navigation', getValue: (m) => m[1] },
      { regex: /^\s*click\s+(\S+)/, type: 'click', getSelector: (m) => m[1] },
      { regex: /^\s*fill\s+(\S+)\s+with\s+"([^"]*)"/, type: 'fill', getSelector: (m) => m[1], getValue: (m) => m[2] },
      { regex: /^\s*select\s+(\S+)\s+option\s+"([^"]*)"/, type: 'select', getSelector: (m) => m[1], getValue: (m) => m[2] },
      { regex: /^\s*check\s+(\S+)/, type: 'check', getSelector: (m) => m[1] },
      { regex: /^\s*uncheck\s+(\S+)/, type: 'uncheck', getSelector: (m) => m[1] },
      { regex: /^\s*hover\s+(\S+)/, type: 'hover', getSelector: (m) => m[1] },
      { regex: /^\s*scroll\s+to\s+(\S+)/, type: 'scroll', getSelector: (m) => m[1] },
      { regex: /^\s*wait\s+for\s+(\S+)/, type: 'wait', getSelector: (m) => m[1] },
      { regex: /^\s*press\s+"([^"]+)"/, type: 'press', getValue: (m) => m[1] },
      { regex: /^\s*screenshot\s+"([^"]+)"/, type: 'screenshot', getValue: (m) => m[1] },
      { regex: /^\s*verify\s+"([^"]+)"\s+is\s+visible/, type: 'assertion', assertionType: 'text', getValue: (m) => m[1] },
      { regex: /^\s*verify\s+(\S+)\s+is\s+visible/, type: 'assertion', assertionType: 'visible', getSelector: (m) => m[1] },
      { regex: /^\s*verify\s+(\S+)\s+contains\s+"([^"]*)"/, type: 'assertion', assertionType: 'contains', getSelector: (m) => m[1], getValue: (m) => m[2] }
    ];

    for (const line of lines) {
      for (const pattern of actionPatterns) {
        const match = line.match(pattern.regex);
        if (match) {
          const action = {
            type: pattern.type,
            timestamp: Date.now()
          };

          if (pattern.getValue) {
            action.value = pattern.getValue(match);
          }

          if (pattern.getSelector) {
            const ref = pattern.getSelector(match);
            if (ref.startsWith('"')) {
              action.selector = ref.slice(1, -1);
            } else if (ref.includes('.')) {
              const [pageName, fieldName] = ref.split('.');
              action.pageName = pageName;
              action.fieldName = fieldName;
            }
          }

          if (pattern.assertionType) {
            action.assertionType = pattern.assertionType;
          }

          actions.push(action);
          break;
        }
      }
    }

    return actions;
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.VeroCodeGenerator = VeroCodeGenerator;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = VeroCodeGenerator;
}
