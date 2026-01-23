/**
 * Vero Syntax Reference
 *
 * Single source of truth for Vero DSL syntax used in LLM prompts
 * and code generation. This ensures all AI-generated Vero code
 * follows the correct grammar strictly.
 */

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

### CRITICAL RULES
1. SCENARIO names are PascalCase identifiers: \`SCENARIO UserCanLogin\` NOT \`SCENARIO "User can login"\`
2. Use PERFORM to call page actions: \`PERFORM PageName.login WITH args\`
3. Variables are plain identifiers: \`user\`, \`count\` (NO $ prefix)
4. All keywords are case-insensitive but prefer UPPERCASE
5. Comments start with #
6. Strings use double quotes "like this"
`;

/**
 * Compact syntax reference for inline completion prompts (smaller context)
 */
export const VERO_SYNTAX_COMPACT = `
Vero DSL Keywords:
- Actions: CLICK, FILL, OPEN, CHECK, UNCHECK, SELECT, HOVER, PRESS, SCROLL, WAIT, CLEAR, LOG, PERFORM
- Assertions: VERIFY ... IS VISIBLE/HIDDEN/ENABLED/DISABLED, VERIFY ... CONTAINS/HAS VALUE
- Structure: PAGE, FEATURE, SCENARIO (identifier, not string), FIELD, USE, WITH
- Selectors: button, textbox, link, testid, label, placeholder, css, text

SCENARIO names are PascalCase identifiers (SCENARIO UserCanLogin), NOT quoted strings.
Use PERFORM PageName.action to call page actions.
Variables are plain identifiers (no $ prefix).
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
