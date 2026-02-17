
export interface ParsedAction {
    type:
        | 'click'
        | 'doubleclick'
        | 'rightclick'
        | 'fill'
        | 'check'
        | 'uncheck'
        | 'select'
        | 'goto'
        | 'refresh'
        | 'upload'
        | 'press'
        | 'hover'
        | 'clear'
        | 'switchTab'
        | 'switchToTab'
        | 'openInNewTab'
        | 'closeTab'
        | 'expect'
        | 'unknown';
    selector?: string;
    value?: string;
    assertionType?:
        | 'visible'
        | 'hidden'
        | 'hasText'
        | 'containsText'
        | 'hasValue'
        | 'checked'
        | 'enabled'
        | 'disabled'
        | 'empty'
        | 'focused'
        | 'hasCount'
        | 'hasAttribute'
        | 'hasClass'
        | 'url'
        | 'title';
    originalLine: string;
    isCommented?: boolean;
}

/**
 * Split a chained locator expression at top-level dots.
 * Example: getByRole('row').filter({has: page.getByText('X')}).click()
 */
export function splitMethodChain(chain: string): string[] {
    const segments: string[] = [];
    let current = '';
    let depthParen = 0;
    let depthBrace = 0;
    let depthBracket = 0;
    let quote: "'" | '"' | '`' | null = null;
    let escaped = false;

    for (const ch of chain) {
        if (quote) {
            current += ch;
            if (escaped) {
                escaped = false;
                continue;
            }
            if (ch === '\\') {
                escaped = true;
                continue;
            }
            if (ch === quote) {
                quote = null;
            }
            continue;
        }

        if (ch === '\'' || ch === '"' || ch === '`') {
            quote = ch;
            current += ch;
            continue;
        }
        if (ch === '(') depthParen++;
        else if (ch === ')') depthParen = Math.max(0, depthParen - 1);
        else if (ch === '{') depthBrace++;
        else if (ch === '}') depthBrace = Math.max(0, depthBrace - 1);
        else if (ch === '[') depthBracket++;
        else if (ch === ']') depthBracket = Math.max(0, depthBracket - 1);

        if (ch === '.' && depthParen === 0 && depthBrace === 0 && depthBracket === 0) {
            const trimmed = current.trim();
            if (trimmed) segments.push(trimmed);
            current = '';
            continue;
        }

        current += ch;
    }

    const last = current.trim();
    if (last) segments.push(last);
    return segments;
}

export function extractQuotedValue(input: string): string | undefined {
    const match = input.match(/['"]((?:\\.|[^'"])*)['"]/);
    if (!match) return undefined;
    return match[1].replace(/\\(['"\\])/g, '$1');
}

export function chainToModifier(segment: string): { modifier?: string; base?: string } | null {
    const s = segment.trim();

    if (/^first\(\)$/.test(s)) return { modifier: 'FIRST' };
    if (/^last\(\)$/.test(s)) return { modifier: 'LAST' };

    const nthMatch = s.match(/^nth\(\s*(\d+)\s*\)$/);
    if (nthMatch) return { modifier: `NTH ${nthMatch[1]}` };

    const locatorMethodMatch = s.match(/^(getBy\w+|locator)\(([\s\S]*)\)$/);
    if (locatorMethodMatch) {
        const method = locatorMethodMatch[1];
        const args = locatorMethodMatch[2];

        // getByText in chain acts as refinement by text, not base replacement.
        if (method === 'getByText') {
            const text = extractQuotedValue(args);
            return text ? { modifier: `WITH TEXT "${text}"` } : null;
        }

        return { base: extractSelector(method, args) };
    }

    const hasTextMatch = s.match(/^filter\(\{\s*hasText\s*:\s*(['"])((?:\\.|(?!\1).)+)\1\s*\}\)$/);
    if (hasTextMatch) {
        return { modifier: `WITH TEXT "${hasTextMatch[2].replace(/\\(['"\\])/g, '$1')}"` };
    }

    const hasNotTextMatch = s.match(/^filter\(\{\s*hasNotText\s*:\s*(['"])((?:\\.|(?!\1).)+)\1\s*\}\)$/);
    if (hasNotTextMatch) {
        return { modifier: `WITHOUT TEXT "${hasNotTextMatch[2].replace(/\\(['"\\])/g, '$1')}"` };
    }

    const hasLocatorMatch = s.match(/^filter\(\{\s*has\s*:\s*(?:page\.)?([\s\S]+)\s*\}\)$/);
    if (hasLocatorMatch) {
        const nested = parseChainedSelector(hasLocatorMatch[1].trim());
        if (!nested) return null;
        const textOnlyMatch = nested.match(/^WITH TEXT "(.+)"$/);
        const normalizedNested = textOnlyMatch ? `text "${textOnlyMatch[1]}"` : nested;
        return { modifier: `HAS ${normalizedNested}` };
    }

    const hasNotLocatorMatch = s.match(/^filter\(\{\s*hasNot\s*:\s*(?:page\.)?([\s\S]+)\s*\}\)$/);
    if (hasNotLocatorMatch) {
        const nested = parseChainedSelector(hasNotLocatorMatch[1].trim());
        if (!nested) return null;
        const textOnlyMatch = nested.match(/^WITH TEXT "(.+)"$/);
        const normalizedNested = textOnlyMatch ? `text "${textOnlyMatch[1]}"` : nested;
        return { modifier: `HAS NOT ${normalizedNested}` };
    }

    return null;
}

export function parseChainedSelector(chain: string, pageVar: string = 'page'): string {
    let normalized = chain.trim();
    if (normalized.startsWith(`${pageVar}.`)) {
        normalized = normalized.slice(pageVar.length + 1);
    }

    const segments = splitMethodChain(normalized);
    let base = '';
    const modifiers: string[] = [];

    for (const segment of segments) {
        const parsed = chainToModifier(segment);
        if (!parsed) continue;
        if (parsed.base) base = parsed.base;
        if (parsed.modifier) modifiers.push(parsed.modifier);
    }

    // If there's no base selector but we have a WITH TEXT modifier,
    // the first WITH TEXT was likely the sole getByText() locator --
    // promote it to a proper text "..." base selector.
    if (!base && modifiers.length > 0) {
        const firstTextIdx = modifiers.findIndex(m => m.startsWith('WITH TEXT "'));
        if (firstTextIdx !== -1) {
            const textMatch = modifiers[firstTextIdx].match(/^WITH TEXT "(.+)"$/);
            if (textMatch) {
                base = `text "${textMatch[1]}"`;
                modifiers.splice(firstTextIdx, 1);
            }
        }
    }

    return [base, ...modifiers].filter(Boolean).join(' ').trim();
}

export function parseLocatorAndAction(line: string, pageVar: string = 'page'): ParsedAction | null {
    const trimmed = line.trim().replace(/^\/\/\s*/, '');
    if (!trimmed.startsWith('await')) return null;

    const gotoMatch = trimmed.match(new RegExp(`^await\\s+${pageVar}\\.goto\\((.+)\\);?$`));
    if (gotoMatch) {
        return {
            type: 'goto',
            value: extractQuotedValue(gotoMatch[1]),
            originalLine: trimmed
        };
    }

    const reloadMatch = trimmed.match(new RegExp(`^await\\s+${pageVar}\\.reload\\(\\);?$`));
    if (reloadMatch) {
        return {
            type: 'refresh',
            originalLine: trimmed
        };
    }

    const keyboardMatch = trimmed.match(new RegExp(`^await\\s+${pageVar}\\.keyboard\\.press\\((.+)\\);?$`));
    if (keyboardMatch) {
        return {
            type: 'press',
            value: extractQuotedValue(keyboardMatch[1]),
            originalLine: trimmed
        };
    }

    const actionMatch = trimmed.match(new RegExp(`^await\\s+${pageVar}\\.(.+)\\.(\\w+)\\((.*)\\);?$`));
    if (!actionMatch) return null;

    const chain = actionMatch[1];
    const method = actionMatch[2];
    const args = actionMatch[3] || '';
    const selector = parseChainedSelector(chain, pageVar);

    switch (method) {
        case 'click':
            if (/button\s*:\s*['"]right['"]/.test(args)) {
                return { type: 'rightclick', selector, originalLine: trimmed };
            }
            return { type: 'click', selector, originalLine: trimmed };
        case 'dblclick':
            return { type: 'doubleclick', selector, originalLine: trimmed };
        case 'fill':
            return { type: 'fill', selector, value: extractQuotedValue(args), originalLine: trimmed };
        case 'check':
            return { type: 'check', selector, originalLine: trimmed };
        case 'uncheck':
            return { type: 'uncheck', selector, originalLine: trimmed };
        case 'hover':
            return { type: 'hover', selector, originalLine: trimmed };
        case 'clear':
            return { type: 'clear', selector, originalLine: trimmed };
        case 'setInputFiles':
            return { type: 'upload', selector, value: extractQuotedValue(args), originalLine: trimmed };
        case 'selectOption':
            return { type: 'select', selector, value: extractQuotedValue(args), originalLine: trimmed };
        case 'press':
            return { type: 'press', selector, value: extractQuotedValue(args), originalLine: trimmed };
        default:
            return null;
    }
}

export function parseExpect(line: string, pageVar: string = 'page'): ParsedAction | null {
    const trimmed = line.trim().replace(/^\/\/\s*/, '');
    if (!trimmed.startsWith('await expect(')) return null;
    if (trimmed.includes('.toMatchAriaSnapshot(')) return null;

    const pageAssertionMatch = trimmed.match(
        new RegExp(`^await\\s+expect\\(\\s*${pageVar}\\s*\\)\\.(toHaveURL|toHaveTitle)\\((.*)\\);?$`)
    );
    if (pageAssertionMatch) {
        return {
            type: 'expect',
            assertionType: pageAssertionMatch[1] === 'toHaveURL' ? 'url' : 'title',
            value: extractQuotedValue(pageAssertionMatch[2]),
            originalLine: trimmed
        };
    }

    const locatorExpectMatch = trimmed.match(
        new RegExp(`^await\\s+expect\\(\\s*${pageVar}\\.(.+)\\s*\\)\\.(\\w+)\\((.*)\\);?$`)
    );
    if (!locatorExpectMatch) return null;

    const selector = parseChainedSelector(locatorExpectMatch[1], pageVar);
    const matcher = locatorExpectMatch[2];
    const args = locatorExpectMatch[3] || '';
    const value = extractQuotedValue(args);

    const base: ParsedAction = {
        type: 'expect',
        selector,
        originalLine: trimmed
    };

    switch (matcher) {
        case 'toBeVisible':
            return { ...base, assertionType: 'visible' };
        case 'toBeHidden':
            return { ...base, assertionType: 'hidden' };
        case 'toHaveText':
            return { ...base, assertionType: 'hasText', value };
        case 'toContainText':
            return { ...base, assertionType: 'containsText', value };
        case 'toHaveValue':
            return { ...base, assertionType: 'hasValue', value };
        case 'toBeChecked':
            return { ...base, assertionType: 'checked' };
        case 'toBeEnabled':
            return { ...base, assertionType: 'enabled' };
        case 'toBeDisabled':
            return { ...base, assertionType: 'disabled' };
        case 'toBeEmpty':
            return { ...base, assertionType: 'empty' };
        case 'toBeFocused':
            return { ...base, assertionType: 'focused' };
        case 'toHaveCount': {
            const count = args.match(/\d+/)?.[0];
            return { ...base, assertionType: 'hasCount', value: count };
        }
        case 'toHaveAttribute': {
            const attrMatch = args.match(/['"](.+?)['"]\s*,\s*['"](.+?)['"]/);
            const attr = attrMatch ? `${attrMatch[1]}=${attrMatch[2]}` : value;
            return { ...base, assertionType: 'hasAttribute', value: attr };
        }
        case 'toHaveClass':
            return { ...base, assertionType: 'hasClass', value };
        default:
            return null;
    }
}

/**
 * Parse Playwright code to extract actions
 */
export function parsePlaywrightCode(code: string): ParsedAction[] {
    const actions: ParsedAction[] = [];
    const lines = code.split('\n');
    const pageVars = new Set<string>(['page']);
    const popupPromises = new Set<string>();
    let skippingAriaSnapshot = false;

    for (const rawLine of lines) {
        const trimmed = rawLine.trim();
        if (!trimmed) continue;

        if (skippingAriaSnapshot) {
            if (trimmed.includes(');') || trimmed.includes('`);')) {
                skippingAriaSnapshot = false;
            }
            continue;
        }

        if (trimmed.includes('.toMatchAriaSnapshot(')) {
            skippingAriaSnapshot = true;
            continue;
        }

        const popupPromiseMatch = trimmed.match(/^const\s+(\w+)\s*=\s*\w+\.waitForEvent\(['"]popup['"]\);?$/);
        if (popupPromiseMatch) {
            popupPromises.add(popupPromiseMatch[1]);
            continue;
        }

        const popupResolveMatch = trimmed.match(/^const\s+(\w+)\s*=\s*await\s+(\w+)\s*;?$/);
        if (popupResolveMatch && popupPromises.has(popupResolveMatch[2])) {
            const tabVar = popupResolveMatch[1];
            pageVars.add(tabVar);
            actions.push({
                type: 'switchTab',
                value: tabVar,
                originalLine: trimmed
            });
            continue;
        }

        // Detect page.close() -> CLOSE TAB
        const closeMatch = trimmed.match(/^await\s+(\w+)\.close\(\)\s*;?$/);
        if (closeMatch && pageVars.has(closeMatch[1])) {
            actions.push({
                type: 'closeTab',
                originalLine: trimmed
            });
            continue;
        }

        // Detect context.newPage() -> OPEN IN NEW TAB (or SWITCH TO NEW TAB if no goto follows)
        // Skip the initial "const page = await context.newPage()" -- that's just the script setup, not a tab action
        const newPageMatch = trimmed.match(/^const\s+(\w+)\s*=\s*await\s+context\.newPage\(\)\s*;?$/);
        if (newPageMatch) {
            const tabVar = newPageMatch[1];
            if (tabVar !== 'page') {
                // Only treat as a new tab action if it's NOT the initial page variable
                pageVars.add(tabVar);
                actions.push({
                    type: 'openInNewTab',
                    value: tabVar,
                    originalLine: trimmed
                });
            }
            continue;
        }

        // Detect page = context.pages()[N] -> SWITCH TO TAB (N+1 since Vero is 1-based)
        const switchPagesMatch = trimmed.match(/^(\w+)\s*=\s*context\.pages\(\)\[(\d+)\]\s*;?$/);
        if (switchPagesMatch) {
            const tabVar = switchPagesMatch[1];
            const zeroBasedIndex = parseInt(switchPagesMatch[2], 10);
            pageVars.add(tabVar);
            actions.push({
                type: 'switchToTab',
                value: String(zeroBasedIndex + 1), // Convert to 1-based
                originalLine: trimmed
            });
            continue;
        }

        const isCommentedLine = trimmed.startsWith('//');
        const candidates = isCommentedLine
            ? [trimmed.replace(/^\/\/\s*/, '')]
            : [trimmed];

        for (const candidate of candidates) {
            let parsed: ParsedAction | null = null;

            for (const pageVar of pageVars) {
                parsed = parseExpect(candidate, pageVar) || parseLocatorAndAction(candidate, pageVar);
                if (parsed) break;
            }

            if (parsed) {
                if (isCommentedLine) {
                    parsed.isCommented = true;
                }
                actions.push(parsed);
            }
        }
    }

    return actions;
}

/**
 * Extract selector from Playwright locator
 */
export function extractSelector(method: string, args: string): string {
    const normalizedMethod = method.trim();
    const normalizedArgs = args.trim();

    if (normalizedMethod === 'getByRole') {
        const role = normalizedArgs.match(/['"](.+?)['"]/)?.[1];
        const name = normalizedArgs.match(/name\s*:\s*['"](.+?)['"]/)?.[1];
        if (role && name) return `role "${role}" name "${name}"`;
        if (role) return `role "${role}"`;
    }

    if (normalizedMethod === 'getByTestId') {
        const match = extractQuotedValue(normalizedArgs);
        return match ? `testid "${match}"` : normalizedArgs;
    }

    if (normalizedMethod === 'getByLabel') {
        const match = extractQuotedValue(normalizedArgs);
        return match ? `label "${match}"` : normalizedArgs;
    }

    if (normalizedMethod === 'getByPlaceholder') {
        const match = extractQuotedValue(normalizedArgs);
        return match ? `placeholder "${match}"` : normalizedArgs;
    }

    if (normalizedMethod === 'getByText') {
        const match = extractQuotedValue(normalizedArgs);
        return match ? `text "${match}"` : normalizedArgs;
    }

    if (normalizedMethod === 'getByAltText') {
        const match = extractQuotedValue(normalizedArgs);
        return match ? `alt "${match}"` : normalizedArgs;
    }

    if (normalizedMethod === 'getByTitle') {
        const match = extractQuotedValue(normalizedArgs);
        return match ? `title "${match}"` : normalizedArgs;
    }

    if (normalizedMethod === 'locator') {
        const match = extractQuotedValue(normalizedArgs);
        return match ? `css "${match}"` : normalizedArgs;
    }

    return normalizedArgs;
}


/**
 * Generate a field name from action
 */
export function generateFieldName(action: ParsedAction): string {
    const selector = action.selector || '';

    // Extract meaningful name from selector
    let baseName = '';

    // testid "login-btn" -> loginBtn
    const testIdMatch = selector.match(/testid "(.+?)"/i);
    if (testIdMatch) {
        baseName = testIdMatch[1];
    }

    // role "button" name "Submit" -> submitButton
    const explicitRoleMatch = selector.match(/role "(.+?)"(?: name "(.+?)")?/);
    if (explicitRoleMatch && !baseName) {
        const role = explicitRoleMatch[1];
        const label = explicitRoleMatch[2] || role;
        baseName = `${label}${role.charAt(0).toUpperCase() + role.slice(1)}`;
    }

    // button "Submit" -> submitButton (legacy)
    const roleMatch = selector.match(/(\w+) "(.+?)"/);
    if (roleMatch && !baseName) {
        baseName = `${roleMatch[2]}${roleMatch[1].charAt(0).toUpperCase() + roleMatch[1].slice(1)}`;
    }

    // label "Email" -> emailField
    const labelMatch = selector.match(/label "(.+?)"/);
    if (labelMatch && !baseName) {
        baseName = `${labelMatch[1]}Field`;
    }

    // placeholder "Enter email" -> enterEmailInput
    const placeholderMatch = selector.match(/placeholder "(.+?)"/);
    if (placeholderMatch && !baseName) {
        baseName = `${placeholderMatch[1]}Input`;
    }

    // text "Click me" -> clickMeText
    const textMatch = selector.match(/text "(.+?)"/);
    if (textMatch && !baseName) {
        baseName = `${textMatch[1]}Text`;
    }

    // CSS selector #id or .class
    const idMatch = selector.match(/#([\w-]+)/);
    if (idMatch && !baseName) {
        baseName = idMatch[1];
    }

    if (!baseName) {
        baseName = `${action.type}Element`;
    }

    // Convert to camelCase
    return baseName
        .replace(/[^a-zA-Z0-9]/g, ' ')
        .trim()
        .split(/\s+/)
        .map((word, i) => i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
}


