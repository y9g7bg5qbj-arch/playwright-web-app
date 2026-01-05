/**
 * Vero Test Recorder - Selector Generator
 * Generates robust, self-healing selectors for DOM elements
 */

class SelectorGenerator {
  constructor() {
    this.selectorStrategies = [
      'byTestId',
      'byId',
      'byRole',
      'byLabel',
      'byPlaceholder',
      'byText',
      'byCss',
      'byXPath'
    ];
  }

  /**
   * Generate the best selector for an element
   * @param {Element} element - DOM element to generate selector for
   * @returns {SelectorResult} - Object containing primary selector and alternatives
   */
  generate(element) {
    if (!element || !(element instanceof Element)) {
      return null;
    }

    const results = [];

    // Try each strategy and collect results
    for (const strategy of this.selectorStrategies) {
      try {
        const result = this[strategy](element);
        if (result) {
          results.push(result);
        }
      } catch (e) {
        console.warn(`Selector strategy ${strategy} failed:`, e);
      }
    }

    if (results.length === 0) {
      // Fallback to basic CSS path
      const cssPath = this.getCssPath(element);
      results.push({
        selector: cssPath,
        type: 'css',
        confidence: 30,
        description: 'CSS path fallback'
      });
    }

    // Sort by confidence
    results.sort((a, b) => b.confidence - a.confidence);

    return {
      primary: results[0].selector,
      alternatives: results.slice(1).map(r => r.selector),
      confidence: results[0].confidence,
      type: results[0].type,
      allResults: results
    };
  }

  /**
   * Generate selector by data-testid attribute (highest priority)
   */
  byTestId(element) {
    const testId = element.getAttribute('data-testid') ||
                   element.getAttribute('data-test-id') ||
                   element.getAttribute('data-test') ||
                   element.getAttribute('data-cy') ||
                   element.getAttribute('data-qa');

    if (testId) {
      const attrName = element.hasAttribute('data-testid') ? 'data-testid' :
                       element.hasAttribute('data-test-id') ? 'data-test-id' :
                       element.hasAttribute('data-test') ? 'data-test' :
                       element.hasAttribute('data-cy') ? 'data-cy' : 'data-qa';

      return {
        selector: `[${attrName}="${testId}"]`,
        type: 'testid',
        confidence: 100,
        description: `Test ID: ${testId}`
      };
    }
    return null;
  }

  /**
   * Generate selector by ID attribute
   */
  byId(element) {
    if (element.id && !this.isGeneratedId(element.id)) {
      // Verify uniqueness
      if (document.querySelectorAll(`#${CSS.escape(element.id)}`).length === 1) {
        return {
          selector: `#${element.id}`,
          type: 'id',
          confidence: 95,
          description: `ID: ${element.id}`
        };
      }
    }
    return null;
  }

  /**
   * Generate selector by ARIA role
   */
  byRole(element) {
    const role = element.getAttribute('role') || this.getImplicitRole(element);
    if (!role) return null;

    const name = element.getAttribute('aria-label') ||
                 element.getAttribute('title') ||
                 (element.tagName === 'BUTTON' ? element.textContent?.trim() : null);

    let selector = `[role="${role}"]`;
    let confidence = 60;

    if (name) {
      // Add name for more specificity
      const escapedName = name.replace(/"/g, '\\"');
      if (element.getAttribute('aria-label')) {
        selector = `[role="${role}"][aria-label="${escapedName}"]`;
        confidence = 85;
      }
    }

    // Verify uniqueness
    const matches = document.querySelectorAll(selector);
    if (matches.length === 1) {
      return {
        selector,
        type: 'role',
        confidence,
        description: `Role: ${role}${name ? ` (${name})` : ''}`
      };
    }

    return null;
  }

  /**
   * Generate selector by associated label
   */
  byLabel(element) {
    // Check for associated label via 'for' attribute
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) {
        const labelText = label.textContent?.trim();
        if (labelText) {
          return {
            selector: `label:has-text("${labelText}") + input, label:has-text("${labelText}") input`,
            type: 'label',
            confidence: 80,
            description: `Label: ${labelText}`
          };
        }
      }
    }

    // Check for wrapping label
    const parentLabel = element.closest('label');
    if (parentLabel) {
      const labelText = this.getDirectText(parentLabel);
      if (labelText) {
        return {
          selector: `label:has-text("${labelText}") ${element.tagName.toLowerCase()}`,
          type: 'label',
          confidence: 75,
          description: `Label: ${labelText}`
        };
      }
    }

    return null;
  }

  /**
   * Generate selector by placeholder attribute
   */
  byPlaceholder(element) {
    const placeholder = element.getAttribute('placeholder');
    if (placeholder) {
      const selector = `[placeholder="${placeholder.replace(/"/g, '\\"')}"]`;
      const matches = document.querySelectorAll(selector);
      if (matches.length === 1) {
        return {
          selector,
          type: 'placeholder',
          confidence: 70,
          description: `Placeholder: ${placeholder}`
        };
      }
    }
    return null;
  }

  /**
   * Generate selector by text content
   */
  byText(element) {
    const text = this.getDirectText(element);
    if (text && text.length > 0 && text.length < 100) {
      // For buttons and links, text content is very reliable
      if (['BUTTON', 'A'].includes(element.tagName)) {
        const selector = `${element.tagName.toLowerCase()}:has-text("${text.replace(/"/g, '\\"')}")`;
        return {
          selector,
          type: 'text',
          confidence: 75,
          description: `Text: ${text}`
        };
      }
    }
    return null;
  }

  /**
   * Generate CSS selector
   */
  byCss(element) {
    // Try unique class combinations
    if (element.classList.length > 0) {
      const uniqueClasses = Array.from(element.classList)
        .filter(cls => !this.isGeneratedClass(cls));

      if (uniqueClasses.length > 0) {
        // Try single class first
        for (const cls of uniqueClasses) {
          const selector = `.${CSS.escape(cls)}`;
          if (document.querySelectorAll(selector).length === 1) {
            return {
              selector,
              type: 'css',
              confidence: 65,
              description: `Class: ${cls}`
            };
          }
        }

        // Try class combination with tag
        const tagSelector = `${element.tagName.toLowerCase()}.${uniqueClasses.map(c => CSS.escape(c)).join('.')}`;
        if (document.querySelectorAll(tagSelector).length === 1) {
          return {
            selector: tagSelector,
            type: 'css',
            confidence: 55,
            description: `Tag + Classes`
          };
        }
      }
    }

    // Try nth-child with parent context
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const sameTagSiblings = siblings.filter(s => s.tagName === element.tagName);
      if (sameTagSiblings.length > 1) {
        const index = sameTagSiblings.indexOf(element) + 1;
        const parentSelector = this.getSimpleSelector(parent);
        if (parentSelector) {
          const selector = `${parentSelector} > ${element.tagName.toLowerCase()}:nth-of-type(${index})`;
          if (document.querySelectorAll(selector).length === 1) {
            return {
              selector,
              type: 'css',
              confidence: 45,
              description: `nth-of-type selector`
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Generate XPath selector (last resort)
   */
  byXPath(element) {
    const xpath = this.getXPath(element);
    return {
      selector: xpath,
      type: 'xpath',
      confidence: 35,
      description: 'XPath selector'
    };
  }

  /**
   * Get CSS path for an element
   */
  getCssPath(element) {
    const path = [];
    let current = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.tagName.toLowerCase();

      if (current.id && !this.isGeneratedId(current.id)) {
        selector = `#${CSS.escape(current.id)}`;
        path.unshift(selector);
        break;
      }

      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(s => s.tagName === current.tagName);
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

  /**
   * Get XPath for an element
   */
  getXPath(element) {
    const parts = [];
    let current = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let part = current.tagName.toLowerCase();

      if (current.id && !this.isGeneratedId(current.id)) {
        part = `//*[@id="${current.id}"]`;
        parts.unshift(part);
        break;
      }

      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(s => s.tagName === current.tagName);
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          part += `[${index}]`;
        }
      }

      parts.unshift(part);
      current = parent;
    }

    return '//' + parts.join('/');
  }

  /**
   * Get simple selector for parent context
   */
  getSimpleSelector(element) {
    if (element.id && !this.isGeneratedId(element.id)) {
      return `#${CSS.escape(element.id)}`;
    }

    const testId = element.getAttribute('data-testid');
    if (testId) {
      return `[data-testid="${testId}"]`;
    }

    if (element.classList.length > 0) {
      const cls = Array.from(element.classList).find(c => !this.isGeneratedClass(c));
      if (cls) {
        return `.${CSS.escape(cls)}`;
      }
    }

    return element.tagName.toLowerCase();
  }

  /**
   * Get direct text content (excluding child elements)
   */
  getDirectText(element) {
    let text = '';
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      }
    }
    return text.trim();
  }

  /**
   * Get implicit ARIA role for common elements
   */
  getImplicitRole(element) {
    const roleMap = {
      'A': element.hasAttribute('href') ? 'link' : null,
      'BUTTON': 'button',
      'INPUT': this.getInputRole(element),
      'SELECT': 'combobox',
      'TEXTAREA': 'textbox',
      'IMG': 'img',
      'NAV': 'navigation',
      'MAIN': 'main',
      'HEADER': 'banner',
      'FOOTER': 'contentinfo',
      'ASIDE': 'complementary',
      'ARTICLE': 'article',
      'SECTION': 'region',
      'FORM': 'form',
      'TABLE': 'table',
      'UL': 'list',
      'OL': 'list',
      'LI': 'listitem'
    };
    return roleMap[element.tagName] || null;
  }

  /**
   * Get role for input elements
   */
  getInputRole(element) {
    if (element.tagName !== 'INPUT') return null;

    const type = element.type?.toLowerCase() || 'text';
    const roleMap = {
      'button': 'button',
      'checkbox': 'checkbox',
      'radio': 'radio',
      'range': 'slider',
      'search': 'searchbox',
      'email': 'textbox',
      'tel': 'textbox',
      'url': 'textbox',
      'text': 'textbox',
      'password': 'textbox',
      'number': 'spinbutton'
    };
    return roleMap[type] || 'textbox';
  }

  /**
   * Check if an ID appears to be auto-generated
   */
  isGeneratedId(id) {
    if (!id) return true;
    // Common patterns for generated IDs
    const patterns = [
      /^:r\d+:?$/,           // React-generated
      /^ember\d+$/,          // Ember-generated
      /^ng-\d+$/,            // Angular-generated
      /^[a-f0-9]{8,}$/i,     // Hash-like
      /^\d+$/,               // Pure numbers
      /^_\w+_\d+$/,          // _prefix_number pattern
      /^ui-id-\d+$/          // jQuery UI
    ];
    return patterns.some(p => p.test(id));
  }

  /**
   * Check if a class appears to be auto-generated
   */
  isGeneratedClass(cls) {
    if (!cls) return true;
    // Common patterns for generated classes
    const patterns = [
      /^css-[a-z0-9]+$/i,    // CSS-in-JS
      /^sc-[a-zA-Z0-9]+$/,   // Styled-components
      /^_[a-zA-Z0-9]+_\d+$/, // CSS modules
      /^[a-f0-9]{6,}$/i,     // Hash classes
      /^jsx-\d+$/,           // Emotion/JSX
      /^svelte-[a-z0-9]+$/i  // Svelte
    ];
    return patterns.some(p => p.test(cls));
  }

  /**
   * Validate that a selector finds the expected element
   */
  validate(selector, element) {
    try {
      if (selector.startsWith('//')) {
        // XPath
        const result = document.evaluate(
          selector,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        return result.singleNodeValue === element;
      } else {
        // CSS selector
        const found = document.querySelector(selector);
        return found === element;
      }
    } catch (e) {
      return false;
    }
  }

  /**
   * Find alternative selectors for an element
   */
  findAlternatives(element, count = 3) {
    const result = this.generate(element);
    if (!result) return [];
    return result.alternatives.slice(0, count);
  }

  /**
   * Generate a human-readable field name suggestion
   */
  suggestFieldName(element) {
    // Priority order for naming
    const sources = [
      () => element.getAttribute('aria-label'),
      () => element.getAttribute('name'),
      () => element.getAttribute('placeholder'),
      () => {
        if (element.id) {
          const label = document.querySelector(`label[for="${element.id}"]`);
          return label?.textContent?.trim();
        }
        return null;
      },
      () => element.closest('label')?.textContent?.trim(),
      () => element.getAttribute('title'),
      () => {
        if (['BUTTON', 'A'].includes(element.tagName)) {
          return element.textContent?.trim();
        }
        return null;
      },
      () => element.id,
      () => element.getAttribute('data-testid')
    ];

    for (const source of sources) {
      const name = source();
      if (name && name.length > 0 && name.length < 50) {
        return this.toCamelCase(name);
      }
    }

    // Fallback: generate from tag and type
    const tag = element.tagName.toLowerCase();
    const type = element.type || '';
    return this.toCamelCase(`${tag}${type ? '_' + type : ''}`);
  }

  /**
   * Convert string to camelCase
   */
  toCamelCase(str) {
    return str
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase())
      .replace(/^[A-Z]/, chr => chr.toLowerCase())
      .replace(/[^a-zA-Z0-9]/g, '');
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.VeroSelectorGenerator = SelectorGenerator;
}
