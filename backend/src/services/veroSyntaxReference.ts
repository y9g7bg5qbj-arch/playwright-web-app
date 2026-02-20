/**
 * Vero Syntax Reference
 *
 * Single source of truth for Vero DSL syntax used in LLM prompts
 * and code generation. This ensures all AI-generated Vero code
 * follows the correct grammar strictly.
 */
import { VERO_TAB_SYNTAX } from 'vero-lang';

const TAB_SWITCH_NEW_TAB_WITH_URL_EXAMPLE = VERO_TAB_SYNTAX.switchToNewTabWithUrl.replace('{url}', 'url');
const TAB_SWITCH_TO_TAB_EXAMPLE = VERO_TAB_SYNTAX.switchToTab.replace('{index}', '1');
const TAB_OPEN_IN_NEW_TAB_EXAMPLE = VERO_TAB_SYNTAX.openInNewTab.replace('{url}', 'url');

export const VERO_SYNTAX_REFERENCE = `
## Vero DSL Syntax Reference (STRICT)

You MUST follow this syntax exactly. Do NOT invent new keywords or syntax.

### PAGE Object Definition
\`\`\`vero
PAGE PageName {
    # Field definitions with selector types
    FIELD fieldName = "selector"                    # Auto-detect selector type
    FIELD buttonField = button "Button Text"        # Role-based selector
    FIELD inputField = textbox "Input Label"        # Role-based selector
    FIELD linkField = link "Link Text"              # Role-based selector
    FIELD testIdField = testid "test-id-value"      # Test ID selector
    FIELD labelField = label "Label Text"           # Label selector
    FIELD placeholderField = placeholder "Placeholder" # Placeholder selector
    FIELD cssField = css ".css-selector"            # CSS selector

    # Reusable action definition
    actionName WITH param1, param2 {
        FILL inputField WITH param1
        CLICK buttonField
    }
}
\`\`\`

### FEATURE and SCENARIO
\`\`\`vero
FEATURE FeatureName {
    USE PageName

    # SCENARIO names are PascalCase identifiers (NO quotes!)
    SCENARIO UserCanLogin @smoke {
        OPEN "https://example.com"
        FILL PageName.emailField WITH "user@example.com"
        CLICK PageName.submitButton
        VERIFY PageName.dashboard IS VISIBLE
    }

    SCENARIO AnotherScenario {
        PERFORM PageName.actionName WITH "arg1", "arg2"
    }
}
\`\`\`

### Action Keywords (ONLY use these)
| Action | Syntax | Description |
|--------|--------|-------------|
| OPEN | \`OPEN "url"\` | Navigate to URL |
| CLICK | \`CLICK PageName.field\` | Click element |
| FILL | \`FILL PageName.field WITH "value"\` | Fill input field |
| CHECK | \`CHECK PageName.field\` | Check checkbox |
| UNCHECK | \`UNCHECK PageName.field\` | Uncheck checkbox |
| SELECT | \`SELECT "option" FROM PageName.field\` | Select dropdown option |
| HOVER | \`HOVER PageName.field\` | Hover over element |
| PRESS | \`PRESS "Enter"\` | Press keyboard key |
| SCROLL | \`SCROLL TO PageName.field\` | Scroll to element |
| WAIT | \`WAIT 2 SECONDS\` | Wait for time |
| WAIT | \`WAIT FOR PageName.field\` | Wait for element |
| CLEAR | \`CLEAR PageName.field\` | Clear input field |
| TAKE SCREENSHOT | \`TAKE SCREENSHOT AS "checkpoint"\` | Capture run artifact screenshot |
| SWITCH TO NEW TAB | \`${TAB_SWITCH_NEW_TAB_WITH_URL_EXAMPLE}\` | Switch to/wait for a new popup tab |
| SWITCH TO TAB | \`${TAB_SWITCH_TO_TAB_EXAMPLE}\` | Switch to existing tab by index (1-based) |
| OPEN IN NEW TAB | \`${TAB_OPEN_IN_NEW_TAB_EXAMPLE}\` | Open URL in a new browser tab |
| CLOSE TAB | \`${VERO_TAB_SYNTAX.closeTab}\` | Close current tab |
| LOG | \`LOG "message"\` | Log message |
| PERFORM | \`PERFORM PageName.action WITH arg1, arg2\` | Call page action |

### Assertions (VERIFY)
| Assertion | Syntax |
|-----------|--------|
| Visible | \`VERIFY PageName.field IS VISIBLE\` |
| Hidden | \`VERIFY PageName.field IS HIDDEN\` |
| Enabled | \`VERIFY PageName.field IS ENABLED\` |
| Disabled | \`VERIFY PageName.field IS DISABLED\` |
| Contains | \`VERIFY PageName.field CONTAINS "text"\` |
| Has Value | \`VERIFY PageName.field HAS VALUE "exact"\` |
| URL | \`VERIFY URL CONTAINS "/path"\` |
| Visual (page) | \`VERIFY SCREENSHOT AS "home" WITH BALANCED\` |
| Visual (target) | \`VERIFY PageName.field MATCHES SCREENSHOT AS "header" WITH STRICT\` |

### CRITICAL RULES
1. SCENARIO names are PascalCase identifiers: \`SCENARIO UserCanLogin\` NOT \`SCENARIO "User can login"\`
2. Use PERFORM to call page actions: \`PERFORM PageName.login WITH args\`
3. Variables are plain identifiers: \`user\`, \`count\` (NO $ prefix)
4. All keywords are case-insensitive but prefer UPPERCASE
5. Comments start with #
6. Strings use double quotes "like this"
7. Use \`VERIFY ... SCREENSHOT\` for visual baseline assertions; use \`TAKE SCREENSHOT\` only for artifact capture
`;

/**
 * Compact syntax reference for inline completion prompts (smaller context)
 */
export const VERO_SYNTAX_COMPACT = `
Vero DSL Keywords:
- Actions: CLICK, FILL, OPEN, CHECK, UNCHECK, SELECT, HOVER, PRESS, SCROLL, WAIT, CLEAR, TAKE SCREENSHOT, SWITCH TO NEW TAB, SWITCH TO TAB, OPEN IN NEW TAB, CLOSE TAB, LOG, PERFORM
- Assertions: VERIFY ... IS VISIBLE/HIDDEN/ENABLED/DISABLED, VERIFY ... CONTAINS/HAS VALUE, VERIFY SCREENSHOT, VERIFY ... MATCHES SCREENSHOT
- Structure: PAGE, FEATURE, SCENARIO (identifier, not string), FIELD, USE, WITH
- Selectors: button, textbox, link, testid, label, placeholder, css, text

SCENARIO names are PascalCase identifiers (SCENARIO UserCanLogin), NOT quoted strings.
Use PERFORM PageName.action to call page actions.
Variables are plain identifiers (no $ prefix).
Use VERIFY ... SCREENSHOT for baseline comparisons and TAKE SCREENSHOT for one-off artifacts.
`;

/**
 * Build LLM prompt for generating Vero code from recorded actions
 */
export function buildVeroPromptForRecording(actionsJson: string): string {
  return `You are a Vero DSL code generator. Convert recorded browser actions into valid Vero code.

${VERO_SYNTAX_REFERENCE}

## Recorded Actions
\`\`\`json
${actionsJson}
\`\`\`

## Instructions
1. Create a PAGE object with FIELD definitions for each unique element
2. Use appropriate selector types (testid > role > label > placeholder > css)
3. Name fields descriptively in camelCase (emailInput, submitButton, errorMessage)
4. Create a FEATURE with one SCENARIO using a PascalCase identifier name
5. Use PageName.fieldName syntax for all actions
6. Add appropriate VERIFY assertions

## Output Format
Return ONLY valid Vero code, no explanations:

\`\`\`vero
PAGE PageName {
    FIELD fieldName = selectorType "value"
}

FEATURE FeatureName {
    USE PageName

    SCENARIO DescriptiveScenarioName {
        # actions here
    }
}
\`\`\``;
}

/**
 * Validate that generated Vero code follows the grammar
 * Returns validation errors if any
 */
export function validateVeroSyntax(code: string): string[] {
  const errors: string[] = [];

  // Check for quoted SCENARIO names (old syntax)
  if (/SCENARIO\s+"[^"]+"/i.test(code)) {
    errors.push('SCENARIO names must be PascalCase identifiers, not quoted strings');
  }

  // Check for DO keyword (should be PERFORM)
  if (/\bDO\s+[A-Z][a-zA-Z]+\./i.test(code)) {
    errors.push('Use PERFORM instead of DO for page actions');
  }

  // Check for $variable syntax (no longer needed)
  if (/\$[a-zA-Z][a-zA-Z0-9]*/g.test(code)) {
    errors.push('Variables should not have $ prefix');
  }

  // Check for basic structure
  if (!/\bPAGE\s+[A-Z]/i.test(code) && !/\bFEATURE\s+[A-Z]/i.test(code)) {
    errors.push('Missing PAGE or FEATURE definition');
  }

  return errors;
}

/**
 * Fix common syntax issues in generated Vero code
 */
export function fixVeroSyntax(code: string): string {
  let fixed = code;

  // Fix quoted SCENARIO names to identifiers
  fixed = fixed.replace(/SCENARIO\s+"([^"]+)"/gi, (_, name) => {
    const identifier = name
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
    return `SCENARIO ${identifier}`;
  });

  // Fix DO to PERFORM
  fixed = fixed.replace(/\bDO\s+([A-Z][a-zA-Z]+\.)/gi, 'PERFORM $1');

  // Remove $ from variables (but not inside strings)
  fixed = fixed.replace(/(?<!")(\$)([a-zA-Z][a-zA-Z0-9]*)(?!")/g, '$2');

  return fixed;
}

// ============================================
// VERO CODE GENERATION (Single Source of Truth)
// ============================================

export type VeroActionType =
  | 'open' | 'navigate' | 'goto'
  | 'click'
  | 'doubleclick'
  | 'rightclick'
  | 'fill'
  | 'check'
  | 'uncheck'
  | 'select'
  | 'hover'
  | 'upload'
  | 'refresh'
  | 'press' | 'keypress'
  | 'scroll'
  | 'wait'
  | 'clear'
  | 'drag'
  | 'acceptdialog'
  | 'dismissdialog'
  | 'switchframe'
  | 'switchmainframe'
  | 'switchTab' | 'switchtab' | 'switchNewTab' | 'switchnewtab'
  | 'switchToTab' | 'switchtotab'
  | 'openInNewTab' | 'openinnewtab'
  | 'closeTab' | 'closetab'
  | 'log'
  | 'verify' | 'assert' | 'expect';

export type VeroAssertionType =
  | 'visible'
  | 'hidden'
  | 'enabled'
  | 'disabled'
  | 'contains'
  | 'hasValue'
  | 'hasText'
  | 'containsText'
  | 'checked'
  | 'empty'
  | 'focused'
  | 'hasCount'
  | 'hasAttribute'
  | 'hasClass'
  | 'url'
  | 'title';

/**
 * Generate Vero action code - SINGLE SOURCE OF TRUTH
 * All recording services MUST use this function instead of hardcoding syntax
 */
export function generateVeroAction(
  action: VeroActionType | string,
  target?: string,
  value?: string,
  assertionType?: VeroAssertionType
): string {
  const normalizedAction = action.toLowerCase();

  // Escape quotes in value
  const escapedValue = value?.replace(/"/g, '\\"') || '';
  const escapedTarget = target?.replace(/"/g, '\\"') || '';

  switch (normalizedAction) {
    // Navigation
    case 'open':
    case 'navigate':
    case 'goto':
      return `OPEN "${value || target || ''}"`;

    // Click
    case 'click':
      return `CLICK ${target}`;
    case 'doubleclick':
      return `DOUBLE CLICK ${target}`;
    case 'rightclick':
      return `RIGHT CLICK ${target}`;

    // Fill/Input
    case 'fill':
      return `FILL ${target} WITH "${escapedValue}"`;

    // Checkbox
    case 'check':
      return `CHECK ${target}`;
    case 'uncheck':
      return `UNCHECK ${target}`;

    // Dropdown
    case 'select':
      return `SELECT "${escapedValue}" FROM ${target}`;

    // Hover
    case 'hover':
      return `HOVER ${target}`;

    // Upload
    case 'upload':
      return `UPLOAD "${escapedValue}" TO ${target}`;

    // Refresh
    case 'refresh':
      return 'REFRESH';

    // Keyboard
    case 'press':
    case 'keypress':
      return `PRESS "${value || 'Enter'}"`;

    // Scroll
    case 'scroll':
      return `SCROLL TO ${target}`;

    // Wait
    case 'wait':
      if (value && /^\d+$/.test(value)) {
        return `WAIT ${value} SECONDS`;
      }
      return `WAIT FOR ${target || 'page'}`;

    // Clear
    case 'clear':
      return `CLEAR ${target}`;

    // Switch to new tab (popup or new tab without specific URL)
    case 'switchtab':
    case 'switchnewtab':
      if (value) {
        return VERO_TAB_SYNTAX.switchToNewTabWithUrl.replace('{url}', escapedValue);
      }
      return VERO_TAB_SYNTAX.switchToNewTab;

    // Switch to existing tab by index (1-based)
    case 'switchtotab':
      return VERO_TAB_SYNTAX.switchToTab.replace('{index}', value || target || '1');

    // Open URL in new tab
    case 'openinnewtab':
      return VERO_TAB_SYNTAX.openInNewTab.replace('{url}', escapedValue || escapedTarget);

    // Close current tab
    case 'closetab':
      return VERO_TAB_SYNTAX.closeTab;

    // Log
    case 'log':
      return `LOG "${escapedValue}"`;

    // Drag
    case 'drag':
      return `DRAG ${target} TO ${value || ''}`;

    // Dialog handling
    case 'acceptdialog':
      return value ? `ACCEPT DIALOG WITH "${escapedValue}"` : 'ACCEPT DIALOG';
    case 'dismissdialog':
      return 'DISMISS DIALOG';

    // Frame handling
    case 'switchframe':
      return `SWITCH TO FRAME ${target || `"${escapedValue}"`}`;
    case 'switchmainframe':
      return 'SWITCH TO MAIN FRAME';

    // Assertions
    case 'verify':
    case 'assert':
    case 'expect':
      return generateVeroAssertion(target || '', assertionType || 'visible', value);

    default:
      return `# Unknown action: ${action} on ${target}`;
  }
}

/**
 * Generate Vero assertion code
 */
export function generateVeroAssertion(
  target: string,
  type: VeroAssertionType | string,
  value?: string,
  isNegative?: boolean
): string {
  const normalizedType = type.toLowerCase();
  const not = isNegative ? ' NOT' : '';

  switch (normalizedType) {
    case 'visible':
      return `VERIFY ${target} IS${not} VISIBLE`;
    case 'hidden':
      return `VERIFY ${target} IS${not} HIDDEN`;
    case 'enabled':
      return `VERIFY ${target} IS${not} ENABLED`;
    case 'disabled':
      return `VERIFY ${target} IS${not} DISABLED`;
    case 'checked':
      return `VERIFY ${target} IS${not} CHECKED`;
    case 'empty':
      return `VERIFY ${target} IS${not} EMPTY`;
    case 'focused':
      return `VERIFY ${target} IS${not} FOCUSED`;
    case 'contains':
      return `VERIFY ${target}${not} CONTAINS "${value || ''}"`;
    case 'hastext':
    case 'has text':
      return `VERIFY ${target}${not} HAS TEXT "${value || ''}"`;
    case 'containstext':
    case 'contains text':
      return `VERIFY ${target}${not} CONTAINS TEXT "${value || ''}"`;
    case 'hasvalue':
    case 'has value':
    case 'value':
      return `VERIFY ${target}${not} HAS VALUE "${value || ''}"`;
    case 'hascount':
    case 'has count':
      return `VERIFY ${target}${not} HAS COUNT ${value || '0'}`;
    case 'hasattribute':
    case 'has attribute': {
      const [attribute, ...rest] = (value || '').split('=');
      const attributeValue = rest.join('=');
      if (attribute && attributeValue) {
        return `VERIFY ${target}${not} HAS ATTRIBUTE "${attribute}" EQUAL "${attributeValue}"`;
      }
      return `VERIFY ${target}${not} HAS ATTRIBUTE "${value || ''}"`;
    }
    case 'hasclass':
    case 'has class':
      return `VERIFY ${target}${not} HAS CLASS "${value || ''}"`;
    case 'url':
      return `VERIFY URL${not} EQUAL "${value || ''}"`;
    case 'title':
      return `VERIFY TITLE${not} EQUAL "${value || ''}"`;
    case 'screenshot':
    case 'visual':
      return `VERIFY SCREENSHOT AS "${value || 'baseline'}" WITH BALANCED`;
    case 'matches screenshot':
    case 'matchesscreenshot':
      return `VERIFY ${target} MATCHES SCREENSHOT AS "${value || 'baseline'}" WITH BALANCED`;
    default:
      return `VERIFY ${target} IS${not} VISIBLE`;
  }
}

/**
 * Generate a complete SCENARIO block
 */
export function generateVeroScenario(
  name: string,
  steps: string[],
  tags?: string[]
): string {
  const scenarioName = toPascalCase(name);
  const tagStr = tags?.length ? ` ${tags.map(t => t.startsWith('@') ? t : `@${t}`).join(' ')}` : '';
  const stepsStr = steps.map(s => `    ${s}`).join('\n');

  return `SCENARIO ${scenarioName}${tagStr} {
${stepsStr}
}`;
}

/**
 * Generate a complete FEATURE block
 */
export function generateVeroFeature(
  name: string,
  scenarios: string[],
  pageNames?: string[]
): string {
  const featureName = toPascalCase(name);
  const useStatements = pageNames?.map(p => `    USE ${p}`).join('\n') || '';
  const scenariosStr = scenarios.join('\n\n');

  return `FEATURE ${featureName} {
${useStatements ? useStatements + '\n\n' : ''}${scenariosStr}
}`;
}

/**
 * Generate a PAGE object definition
 * Format: PAGE PageName ("/url-pattern") { FIELD ... }
 */
export function generateVeroPage(
  name: string,
  fields: Array<{ name: string; selectorType: string; selector: string }>,
  urlPattern?: string
): string {
  const pageName = toPascalCase(name);

  // Extract URL pattern from full URL if provided
  let pattern = urlPattern || '/';
  if (pattern.startsWith('http')) {
    try {
      const url = new URL(pattern);
      pattern = url.pathname || '/';
    } catch {
      pattern = '/';
    }
  }

  const urlPart = ` ("${pattern}")`;
  const fieldsStr = fields
    .map(f => {
      // Some callers pass the full selector in `selector` with empty selectorType.
      if (!f.selectorType || !f.selectorType.trim()) {
        return `    FIELD ${f.name} = ${f.selector}`;
      }
      return `    FIELD ${f.name} = ${f.selectorType} "${f.selector}"`;
    })
    .join('\n');

  return `PAGE ${pageName}${urlPart} {
${fieldsStr}
}`;
}

/**
 * Convert string to PascalCase identifier
 */
export function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}
