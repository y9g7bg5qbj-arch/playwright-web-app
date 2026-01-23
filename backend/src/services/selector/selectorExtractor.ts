/**
 * Selector Extractor - Injected script to extract robust selectors from elements
 *
 * This script is injected into the browser page and extracts multiple selector
 * strategies from any element during test recording.
 */

export interface ExtractedSelectors {
  testId: string | null;
  role: string | null;
  roleWithName: string | null;
  label: string | null;
  placeholder: string | null;
  text: string | null;
  title: string | null;
  alt: string | null;
  css: string | null;
  // Metadata
  tagName: string;
  isUnique: Record<string, boolean>;
  recommended: string;
  recommendedType: string;
}

/**
 * The script to inject into the page
 * Extracts selectors from any element
 */
export const SELECTOR_EXTRACTOR_SCRIPT = `
(function() {
  // Skip hash-like classes (CSS-in-JS generated)
  const HASH_PATTERN = /^[a-z]+[_-][a-z0-9]{4,}$/i;
  const HASH_PATTERN_2 = /^(css|sc|emotion|styled)-[a-z0-9]+$/i;

  function isHashClass(className) {
    return HASH_PATTERN.test(className) || HASH_PATTERN_2.test(className);
  }

  function getImplicitRole(element) {
    const tag = element.tagName.toLowerCase();
    const type = element.getAttribute('type');

    const roleMap = {
      'button': 'button',
      'a': 'link',
      'input:button': 'button',
      'input:submit': 'button',
      'input:reset': 'button',
      'input:checkbox': 'checkbox',
      'input:radio': 'radio',
      'input:text': 'textbox',
      'input:email': 'textbox',
      'input:password': 'textbox',
      'input:search': 'searchbox',
      'input:tel': 'textbox',
      'input:url': 'textbox',
      'input:number': 'spinbutton',
      'textarea': 'textbox',
      'select': 'combobox',
      'img': 'img',
      'h1': 'heading',
      'h2': 'heading',
      'h3': 'heading',
      'h4': 'heading',
      'h5': 'heading',
      'h6': 'heading',
    };

    const key = type ? tag + ':' + type : tag;
    return roleMap[key] || roleMap[tag] || null;
  }

  function getLabel(element) {
    // Check aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    // Check aria-labelledby
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelEl = document.getElementById(labelledBy);
      if (labelEl) return labelEl.textContent?.trim() || null;
    }

    // Check for associated label (by id)
    const id = element.id;
    if (id) {
      const label = document.querySelector('label[for="' + id + '"]');
      if (label) return label.textContent?.trim() || null;
    }

    // Check parent label
    const parentLabel = element.closest('label');
    if (parentLabel) {
      // Get label text excluding the input's own text
      const clone = parentLabel.cloneNode(true);
      const inputs = clone.querySelectorAll('input, select, textarea');
      inputs.forEach(i => i.remove());
      const text = clone.textContent?.trim();
      if (text) return text;
    }

    return null;
  }

  function getText(element) {
    const text = element.textContent?.trim();
    if (!text || text.length > 50 || text.length < 1) return null;

    // Only use text for certain elements
    const tag = element.tagName.toLowerCase();
    const textElements = ['button', 'a', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label', 'li', 'td', 'th'];
    if (!textElements.includes(tag)) return null;

    return text;
  }

  function generateUniqueCSS(element) {
    // Try ID first
    if (element.id && !isHashClass(element.id)) {
      return '#' + CSS.escape(element.id);
    }

    // Try data attributes
    const dataAttrs = ['data-testid', 'data-test-id', 'data-test', 'data-cy', 'data-qa'];
    for (const attr of dataAttrs) {
      const value = element.getAttribute(attr);
      if (value) return '[' + attr + '="' + value + '"]';
    }

    // Try name attribute for form elements
    const name = element.getAttribute('name');
    if (name) {
      const selector = element.tagName.toLowerCase() + '[name="' + name + '"]';
      if (document.querySelectorAll(selector).length === 1) {
        return selector;
      }
    }

    // Build path from nearest ID
    const path = [];
    let current = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.id && !isHashClass(current.id)) {
        path.unshift('#' + CSS.escape(current.id));
        break;
      }

      // Add nth-of-type if needed
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += ':nth-of-type(' + index + ')';
        }
      }

      path.unshift(selector);
      current = parent;
    }

    return path.join(' > ');
  }

  function checkUniqueness(selector) {
    if (!selector) return false;
    try {
      return document.querySelectorAll(selector).length === 1;
    } catch {
      return false;
    }
  }

  function extractSelectors(element) {
    const tagName = element.tagName.toLowerCase();

    // Extract all possible selectors
    const testId = element.getAttribute('data-testid') ||
                   element.getAttribute('data-test-id') ||
                   element.getAttribute('data-test') ||
                   element.getAttribute('data-cy');

    const role = element.getAttribute('role') || getImplicitRole(element);
    const name = element.getAttribute('aria-label') || getText(element);
    const roleWithName = role && name ? role + '[name="' + name.replace(/"/g, '\\\\"') + '"]' : null;

    const label = getLabel(element);
    const placeholder = element.getAttribute('placeholder');
    const text = getText(element);
    const title = element.getAttribute('title');
    const alt = element.getAttribute('alt');
    const css = generateUniqueCSS(element);

    // Build selector strings for uniqueness check
    const selectors = {
      testId: testId ? '[data-testid="' + testId + '"]' : null,
      role: role,
      roleWithName: roleWithName,
      label: label,
      placeholder: placeholder ? '[placeholder="' + placeholder + '"]' : null,
      text: text,
      title: title ? '[title="' + title + '"]' : null,
      alt: alt ? '[alt="' + alt + '"]' : null,
      css: css,
    };

    // Check uniqueness
    const isUnique = {
      testId: checkUniqueness(selectors.testId),
      placeholder: checkUniqueness(selectors.placeholder),
      title: checkUniqueness(selectors.title),
      alt: checkUniqueness(selectors.alt),
      css: checkUniqueness(selectors.css),
    };

    // Determine recommended selector (prioritized)
    let recommended = '';
    let recommendedType = '';

    if (testId && isUnique.testId) {
      recommended = testId;
      recommendedType = 'testId';
    } else if (roleWithName) {
      recommended = name;
      recommendedType = 'role';
    } else if (label) {
      recommended = label;
      recommendedType = 'label';
    } else if (placeholder && isUnique.placeholder) {
      recommended = placeholder;
      recommendedType = 'placeholder';
    } else if (text) {
      recommended = text;
      recommendedType = 'text';
    } else if (css && isUnique.css) {
      recommended = css;
      recommendedType = 'css';
    }

    return {
      testId,
      role,
      roleWithName,
      label,
      placeholder,
      text,
      title,
      alt,
      css,
      tagName,
      isUnique,
      recommended,
      recommendedType,
    };
  }

  // Expose to window
  window.__extractSelectors = extractSelectors;
  window.__extractSelectorsFromPoint = function(x, y) {
    const element = document.elementFromPoint(x, y);
    return element ? extractSelectors(element) : null;
  };
})();
`;

/**
 * Helper to inject the script into a page
 */
export async function injectSelectorExtractor(page: any): Promise<void> {
  await page.evaluate(SELECTOR_EXTRACTOR_SCRIPT);
}

/**
 * Extract selectors from an element handle
 */
export async function extractSelectorsFromElement(
  page: any,
  elementHandle: any
): Promise<ExtractedSelectors | null> {
  try {
    return await elementHandle.evaluate((el: Element) => {
      return (window as any).__extractSelectors?.(el) || null;
    });
  } catch {
    return null;
  }
}

/**
 * Extract selectors from coordinates
 */
export async function extractSelectorsFromPoint(
  page: any,
  x: number,
  y: number
): Promise<ExtractedSelectors | null> {
  try {
    return await page.evaluate(
      ([px, py]: [number, number]) => (window as any).__extractSelectorsFromPoint?.(px, py),
      [x, y]
    );
  } catch {
    return null;
  }
}
