/**
 * VeroGenerator - Converts recorded actions to Vero code using LLM
 *
 * Takes a recording session with extracted selectors and generates:
 * 1. PAGE object with field definitions
 * 2. FEATURE with SCENARIO containing the test steps
 */

import { ExtractedSelectors } from './selectorExtractor';
import { buildVeroPromptForRecording, fixVeroSyntax, validateVeroSyntax } from '../veroSyntaxReference';

// Types for recording sessions
export interface RecordedAction {
  type: 'navigate' | 'click' | 'fill' | 'select' | 'assert' | 'check' | 'hover' | 'press' | 'unknown';
  instruction: string;
  url?: string;
  target?: string;
  value?: string;
  selectors?: ExtractedSelectors;
  screenshot?: string;
  timestamp?: number;
}

export interface RecordingSession {
  id: string;
  startUrl: string;
  actions: RecordedAction[];
  startTime: number;
  endTime?: number;
}

export interface GeneratedVeroCode {
  pageObject: string;
  feature: string;
  combined: string;
}

/**
 * Build the LLM prompt for generating Vero code
 */
export function buildVeroGenerationPrompt(session: RecordingSession): string {
  const actionsJson = JSON.stringify(session.actions, null, 2);
  return buildVeroPromptForRecording(actionsJson);
}

/**
 * Post-process LLM-generated Vero code to ensure it follows the grammar
 */
export function postProcessVeroCode(code: string): { code: string; warnings: string[] } {
  const warnings = validateVeroSyntax(code);
  const fixedCode = fixVeroSyntax(code);
  return { code: fixedCode, warnings };
}

/**
 * Generate Vero code without LLM (simple template-based approach)
 * Use this as fallback or for simple recordings
 */
export function generateVeroCodeSimple(session: RecordingSession): GeneratedVeroCode {
  const pageName = inferPageName(session.startUrl);
  const urlPattern = inferUrlPattern(session.startUrl);
  const featureName = inferFeatureName(session.actions);

  // Collect unique elements with selector type and full selector info
  const fields = new Map<string, {
    name: string;
    selector: string;
    selectorType: string;
    selectors: ExtractedSelectors;
  }>();
  let fieldCounter = 1;

  for (const action of session.actions) {
    if (action.selectors?.recommended && action.type !== 'navigate') {
      const fieldName = inferFieldName(action, fieldCounter);
      if (!fields.has(action.selectors.recommended)) {
        fields.set(action.selectors.recommended, {
          name: fieldName,
          selector: action.selectors.recommended,
          selectorType: mapSelectorType(action.selectors),
          selectors: action.selectors,
        });
        fieldCounter++;
      }
    }
  }

  // Generate PAGE object with URL pattern and selector type prefixes
  const pageLines = [`PAGE ${pageName} ("${urlPattern}") {`];
  for (const [, field] of fields) {
    const selectorExpr = formatSelectorExpression(field.selectorType, field.selector, field.selectors);
    pageLines.push(`    FIELD ${field.name} = ${selectorExpr}`);
  }
  pageLines.push('}');
  const pageObject = pageLines.join('\n');

  // Generate FEATURE
  const featureLines = [
    `FEATURE ${featureName} {`,
    `    USE ${pageName}`,
    '',
    `    SCENARIO ${inferScenarioName(session.actions)} {`,
  ];

  for (const action of session.actions) {
    const line = generateActionLine(action, pageName, fields);
    if (line) {
      featureLines.push(`        ${line}`);
    }
  }

  featureLines.push('    }');
  featureLines.push('}');
  const feature = featureLines.join('\n');

  return {
    pageObject,
    feature,
    combined: `${pageObject}\n\n${feature}`,
  };
}

/**
 * Infer page name from URL
 */
function inferPageName(url: string): string {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname.replace(/^\/|\/$/g, '');

    if (!path || path === '') {
      return 'HomePage';
    }

    // Convert path to PascalCase
    const name = path
      .split(/[\/\-_]/)
      .filter(Boolean)
      .map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
      .join('');

    return name + 'Page';
  } catch {
    return 'TestPage';
  }
}

/**
 * Infer URL pattern from URL
 * Extracts the pathname to use as the URL pattern
 */
function inferUrlPattern(url: string): string {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;

    // Return "/" for homepage, otherwise return the path
    return path || '/';
  } catch {
    // If URL parsing fails, try to extract path manually
    const match = url.match(/^https?:\/\/[^\/]+(\/[^?#]*)?/);
    return match?.[1] || '/';
  }
}

/**
 * Infer feature name from actions
 */
function inferFeatureName(actions: RecordedAction[]): string {
  // Look for common patterns
  const instructions = actions.map(a => a.instruction.toLowerCase()).join(' ');

  if (instructions.includes('login') || instructions.includes('sign in')) {
    return 'UserLogin';
  }
  if (instructions.includes('register') || instructions.includes('sign up')) {
    return 'UserRegistration';
  }
  if (instructions.includes('search')) {
    return 'SearchFeature';
  }
  if (instructions.includes('checkout') || instructions.includes('purchase')) {
    return 'Checkout';
  }
  if (instructions.includes('cart') || instructions.includes('add to')) {
    return 'ShoppingCart';
  }

  return 'RecordedTest';
}

/**
 * Infer scenario name from actions
 */
function inferScenarioName(actions: RecordedAction[]): string {
  const actionTypes = actions.map(a => a.type);
  const hasLogin = actions.some(a =>
    a.instruction.toLowerCase().includes('login') ||
    a.instruction.toLowerCase().includes('sign in')
  );

  if (hasLogin) {
    return 'UserCanLoginSuccessfully';
  }

  if (actionTypes.includes('fill') && actionTypes.includes('click')) {
    return 'UserCompletesFormSubmission';
  }

  return 'RecordedUserFlow';
}

/**
 * Infer field name from action
 */
function inferFieldName(action: RecordedAction, counter: number): string {
  const selectors = action.selectors;
  if (!selectors) return `element${counter}`;

  // Try to create meaningful name
  const tagName = selectors.tagName;
  const text = selectors.text?.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
  const label = selectors.label?.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
  const placeholder = selectors.placeholder?.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);

  let baseName = '';

  if (label) {
    baseName = toCamelCase(label);
  } else if (text && tagName === 'button') {
    baseName = toCamelCase(text) + 'Button';
  } else if (text && tagName === 'a') {
    baseName = toCamelCase(text) + 'Link';
  } else if (placeholder) {
    baseName = toCamelCase(placeholder) + 'Input';
  } else if (tagName === 'input') {
    baseName = `input${counter}`;
  } else if (tagName === 'button') {
    baseName = `button${counter}`;
  } else {
    baseName = `element${counter}`;
  }

  return baseName || `element${counter}`;
}

/**
 * Convert string to camelCase
 */
function toCamelCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .map((word, i) =>
      i === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join('');
}

/**
 * Generate a single action line
 */
function generateActionLine(
  action: RecordedAction,
  pageName: string,
  fields: Map<string, { name: string; selector: string }>
): string | null {
  const selector = action.selectors?.recommended;
  const field = selector ? fields.get(selector) : null;
  const fieldRef = field ? `${pageName}.${field.name}` : null;

  switch (action.type) {
    case 'navigate':
      return `OPEN "${action.url}"`;

    case 'click':
      return fieldRef ? `CLICK ${fieldRef}` : null;

    case 'fill':
      if (!fieldRef || !action.value) return null;
      return `FILL ${fieldRef} WITH "${escapeString(action.value)}"`;

    case 'check':
      return fieldRef ? `CHECK ${fieldRef}` : null;

    case 'select':
      if (!fieldRef || !action.value) return null;
      return `FILL ${fieldRef} WITH "${escapeString(action.value)}"`;

    case 'hover':
      return fieldRef ? `HOVER ${fieldRef}` : null;

    case 'press':
      return `PRESS "${action.value || 'Enter'}"`;

    default:
      return null;
  }
}

/**
 * Escape string for Vero syntax
 */
function escapeString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Map ExtractedSelectors to Vero selector type
 */
function mapSelectorType(selectors: ExtractedSelectors): string {
  const type = selectors.recommendedType;

  // Map recommendedType to Vero selector keywords
  switch (type) {
    case 'testId':
      return 'testid';
    case 'role':
      return 'role';
    case 'label':
      return 'label';
    case 'placeholder':
      return 'placeholder';
    case 'text':
      return 'text';
    case 'alt':
      return 'alt';
    case 'title':
      return 'title';
    case 'css':
      return 'css';
    default:
      // Determine type from available selectors
      if (selectors.testId) return 'testid';
      if (selectors.role) return 'role';
      if (selectors.label) return 'label';
      if (selectors.placeholder) return 'placeholder';
      if (selectors.text) return 'text';
      if (selectors.alt) return 'alt';
      if (selectors.title) return 'title';
      if (selectors.css) return 'css';
      return 'text';
  }
}

/**
 * Format selector expression with type prefix
 * Examples:
 *   testid "login-btn"
 *   role "button" name "Sign In"
 *   label "Username"
 *   text "More information..."
 */
function formatSelectorExpression(
  selectorType: string,
  selectorValue: string,
  selectors: ExtractedSelectors
): string {
  const escapedValue = escapeString(selectorValue);

  switch (selectorType) {
    case 'testid':
      return `testid "${escapedValue}"`;
    case 'role':
      // For role, use the actual role type (button, link, textbox, etc.)
      const roleType = selectors.role || 'element';
      return `role "${roleType}" name "${escapedValue}"`;
    case 'label':
      return `label "${escapedValue}"`;
    case 'placeholder':
      return `placeholder "${escapedValue}"`;
    case 'text':
      return `text "${escapedValue}"`;
    case 'alt':
      return `alt "${escapedValue}"`;
    case 'title':
      return `title "${escapedValue}"`;
    case 'css':
      return `css "${escapedValue}"`;
    case 'xpath':
      return `xpath "${escapedValue}"`;
    default:
      return `text "${escapedValue}"`;
  }
}

export default {
  buildVeroGenerationPrompt,
  generateVeroCodeSimple,
};
