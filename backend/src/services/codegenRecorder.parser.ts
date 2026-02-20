import * as acorn from 'acorn';
import type {
    CallExpression,
    MemberExpression,
    Identifier,
    Literal,
    ObjectExpression,
    Property,
    AwaitExpression,
    VariableDeclaration,
    ExpressionStatement,
    AssignmentExpression,
    Expression,
    SpreadElement,
} from 'estree';

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
        | 'drag'
        | 'acceptdialog'
        | 'dismissdialog'
        | 'switchframe'
        | 'switchmainframe'
        | 'switchTab'
        | 'switchToTab'
        | 'openInNewTab'
        | 'closeTab'
        | 'expect'
        | 'unknown';
    selector?: string;
    destinationSelector?: string;
    value?: string;
    isNegative?: boolean;
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

// ──────────────────────────────────────────────
// AST Core Helpers
// ──────────────────────────────────────────────

interface ChainSegment {
    method: string;
    args: (Expression | SpreadElement)[];
    object?: Expression; // the root object at the start of the chain
}

/**
 * Unwrap a CallExpression chain into an ordered list of segments.
 * Example: page.getByRole('button').first().click()
 * → [ {method:'getByRole', args:[...]}, {method:'first', args:[]}, {method:'click', args:[]} ]
 *
 * The first segment also carries .object = the root Identifier (e.g. 'page').
 */
function unwrapCallChain(node: CallExpression): ChainSegment[] {
    const segments: ChainSegment[] = [];
    let current: Expression = node as unknown as Expression;

    while (current.type === 'CallExpression') {
        const call = current as unknown as CallExpression;
        const callee = call.callee;

        if (callee.type === 'MemberExpression') {
            const mem = callee as MemberExpression;
            const prop = mem.property;
            let methodName = '';

            if (prop.type === 'Identifier') {
                methodName = (prop as Identifier).name;
            } else if (prop.type === 'Literal') {
                methodName = String((prop as Literal).value);
            }

            segments.unshift({ method: methodName, args: call.arguments as (Expression | SpreadElement)[] });
            current = mem.object as Expression;
        } else {
            // Bare function call like expect(...)
            if (callee.type === 'Identifier') {
                segments.unshift({
                    method: (callee as Identifier).name,
                    args: call.arguments as (Expression | SpreadElement)[],
                });
            }
            break;
        }
    }

    // Attach root object to first segment
    if (segments.length > 0 && current.type === 'Identifier') {
        segments[0].object = current;
    }
    // Handle chained member without call at root: page.keyboard.press(...)
    // current might be a MemberExpression like page.keyboard
    if (segments.length > 0 && current.type === 'MemberExpression') {
        const mem = current as unknown as MemberExpression;
        if (mem.object.type === 'Identifier' && mem.property.type === 'Identifier') {
            // Prepend the property as a segment with no args to represent the namespace
            segments.unshift({
                method: (mem.property as Identifier).name,
                args: [],
                object: mem.object as Expression,
            });
        }
        // Handle property access on a CallExpression: expect(...).not.toBeVisible()
        // Here current is MemberExpression(CallExpression(expect,...), not)
        if (mem.object.type === 'CallExpression' && mem.property.type === 'Identifier') {
            // Prepend the property (e.g. 'not') as a no-args segment
            segments.unshift({ method: (mem.property as Identifier).name, args: [] });
            // Continue unwrapping the inner CallExpression
            const innerSegments = unwrapCallChain(mem.object as unknown as CallExpression);
            segments.unshift(...innerSegments);
        }
    }

    return segments;
}

/** Extract a string value from a Literal or RegExp literal node */
function extractStringFromNode(node: Expression | SpreadElement | undefined): string | undefined {
    if (!node) return undefined;
    if (node.type === 'Literal') {
        const lit = node as Literal;
        if (typeof lit.value === 'string') return lit.value;
        if (typeof lit.value === 'number') return String(lit.value);
        // RegExp literal: /pattern/flags -> extract pattern string
        const litAny = lit as any;
        if (litAny.regex) return litAny.regex.pattern;
    }
    if (node.type === 'TemplateLiteral') {
        // Simple case: no expressions, just quasis
        const tl = node as any;
        if (tl.expressions.length === 0 && tl.quasis.length === 1) {
            return tl.quasis[0].value.cooked ?? tl.quasis[0].value.raw;
        }
    }
    return undefined;
}

/** Extract a property value from an ObjectExpression by key name */
function getObjectProperty(obj: ObjectExpression, key: string): Expression | undefined {
    for (const prop of obj.properties) {
        if (prop.type === 'Property') {
            const p = prop as Property;
            if (
                (p.key.type === 'Identifier' && (p.key as Identifier).name === key) ||
                (p.key.type === 'Literal' && (p.key as Literal).value === key)
            ) {
                return p.value as Expression;
            }
        }
    }
    return undefined;
}

/** Get identifier name */
function identName(node: Expression | undefined): string | undefined {
    if (node && node.type === 'Identifier') return (node as Identifier).name;
    return undefined;
}

// ──────────────────────────────────────────────
// Locator Conversion
// ──────────────────────────────────────────────

interface LocatorResult {
    base?: string;
    modifier?: string;
}

/**
 * Convert a single chain segment into a Vero locator component.
 * isFirstLocator is true when this is the first getBy / locator in the chain.
 */
function segmentToLocator(seg: ChainSegment, isFirstLocator: boolean, pageVars: Set<string>): LocatorResult | null {
    const { method, args } = seg;

    // Positional modifiers
    if (method === 'first') return { modifier: 'FIRST' };
    if (method === 'last') return { modifier: 'LAST' };
    if (method === 'nth') {
        const n = extractStringFromNode(args[0] as Expression);
        return n != null ? { modifier: `NTH ${n}` } : null;
    }

    // getByRole
    if (method === 'getByRole') {
        const role = extractStringFromNode(args[0] as Expression);
        if (!role) return null;
        let name: string | undefined;
        if (args[1] && (args[1] as Expression).type === 'ObjectExpression') {
            const nameNode = getObjectProperty(args[1] as ObjectExpression, 'name');
            if (nameNode) name = extractStringFromNode(nameNode);
        }
        const selector = name ? `role "${role}" name "${name}"` : `role "${role}"`;
        return { base: selector };
    }

    // getByText — as first locator it becomes base, otherwise a modifier
    if (method === 'getByText') {
        const text = extractStringFromNode(args[0] as Expression);
        if (!text) return null;
        if (isFirstLocator) return { base: `text "${text}"` };
        return { modifier: `WITH TEXT "${text}"` };
    }

    // Simple getBy* methods
    const simpleMap: Record<string, string> = {
        getByLabel: 'label',
        getByTestId: 'testid',
        getByPlaceholder: 'placeholder',
        getByAltText: 'alt',
        getByTitle: 'title',
    };
    if (simpleMap[method]) {
        const val = extractStringFromNode(args[0] as Expression);
        if (!val) return null;
        return { base: `${simpleMap[method]} "${val}"` };
    }

    // locator(css)
    if (method === 'locator') {
        const val = extractStringFromNode(args[0] as Expression);
        if (!val) return null;
        return { base: `css "${val}"` };
    }

    // filter({hasText, hasNotText, has, hasNot})
    if (method === 'filter' && args[0] && (args[0] as Expression).type === 'ObjectExpression') {
        const obj = args[0] as ObjectExpression;

        const hasTextNode = getObjectProperty(obj, 'hasText');
        if (hasTextNode) {
            const text = extractStringFromNode(hasTextNode);
            if (text) return { modifier: `WITH TEXT "${text}"` };
        }

        const hasNotTextNode = getObjectProperty(obj, 'hasNotText');
        if (hasNotTextNode) {
            const text = extractStringFromNode(hasNotTextNode);
            if (text) return { modifier: `WITHOUT TEXT "${text}"` };
        }

        const hasNode = getObjectProperty(obj, 'has');
        if (hasNode && hasNode.type === 'CallExpression') {
            const nested = locatorChainToVero(unwrapCallChain(hasNode as unknown as CallExpression), pageVars);
            if (nested) {
                // If the nested result is just a WITH TEXT modifier (from getByText as first),
                // normalize to text "..." form
                const textOnlyMatch = nested.match(/^WITH TEXT "(.+)"$/);
                const normalizedNested = textOnlyMatch ? `text "${textOnlyMatch[1]}"` : nested;
                return { modifier: `HAS ${normalizedNested}` };
            }
        }

        const hasNotNode = getObjectProperty(obj, 'hasNot');
        if (hasNotNode && hasNotNode.type === 'CallExpression') {
            const nested = locatorChainToVero(unwrapCallChain(hasNotNode as unknown as CallExpression), pageVars);
            if (nested) {
                const textOnlyMatch = nested.match(/^WITH TEXT "(.+)"$/);
                const normalizedNested = textOnlyMatch ? `text "${textOnlyMatch[1]}"` : nested;
                return { modifier: `HAS NOT ${normalizedNested}` };
            }
        }
    }

    return null;
}

const LOCATOR_METHODS = new Set([
    'getByRole', 'getByText', 'getByLabel', 'getByTestId',
    'getByPlaceholder', 'getByAltText', 'getByTitle', 'locator',
]);

/**
 * Convert a chain of segments (excluding the final action) into a Vero selector string.
 * Skips the root page variable segment.
 */
function locatorChainToVero(segments: ChainSegment[], pageVars: Set<string>): string {
    let base = '';
    const modifiers: string[] = [];
    let foundFirstLocator = false;

    for (const seg of segments) {
        const isLocator = LOCATOR_METHODS.has(seg.method);
        const isFirst = isLocator && !foundFirstLocator;

        const result = segmentToLocator(seg, isFirst, pageVars);
        if (!result) continue;

        if (isLocator) foundFirstLocator = true;

        if (result.base) base = result.base;
        if (result.modifier) modifiers.push(result.modifier);
    }

    // If there's no base but we have a WITH TEXT modifier, promote the first one to text "..."
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

// ──────────────────────────────────────────────
// Action/Expect AST Parsing
// ──────────────────────────────────────────────

const ACTION_MAP: Record<string, ParsedAction['type']> = {
    click: 'click',
    dblclick: 'doubleclick',
    fill: 'fill',
    check: 'check',
    uncheck: 'uncheck',
    hover: 'hover',
    clear: 'clear',
    setInputFiles: 'upload',
    selectOption: 'select',
    press: 'press',
    dragTo: 'drag',
};

const MATCHER_MAP: Record<string, ParsedAction['assertionType']> = {
    toBeVisible: 'visible',
    toBeHidden: 'hidden',
    toHaveText: 'hasText',
    toContainText: 'containsText',
    toHaveValue: 'hasValue',
    toBeChecked: 'checked',
    toBeEnabled: 'enabled',
    toBeDisabled: 'disabled',
    toBeEmpty: 'empty',
    toBeFocused: 'focused',
    toHaveCount: 'hasCount',
    toHaveAttribute: 'hasAttribute',
    toHaveClass: 'hasClass',
    toHaveURL: 'url',
    toHaveTitle: 'title',
};

function parseActionFromAST(node: CallExpression, pageVars: Set<string>, originalLine: string): ParsedAction | null {
    const segments = unwrapCallChain(node);
    if (segments.length < 1) return null;

    const first = segments[0];
    const rootName = identName(first.object);
    if (!rootName || !pageVars.has(rootName)) return null;

    const last = segments[segments.length - 1];
    const actionMethod = last.method;

    // page.goto(url) — 1 segment
    if (actionMethod === 'goto') {
        return {
            type: 'goto',
            value: extractStringFromNode(last.args[0] as Expression),
            originalLine,
        };
    }

    // page.reload() — 1 segment
    if (actionMethod === 'reload') {
        return { type: 'refresh', originalLine };
    }

    // page.close() — 1 segment
    if (actionMethod === 'close' && segments.length <= 2) {
        return { type: 'closeTab', originalLine };
    }

    // page.keyboard.press(key) — 2 segments
    if (segments.length >= 2 && first.method === 'keyboard' && actionMethod === 'press') {
        return {
            type: 'press',
            value: extractStringFromNode(last.args[0] as Expression),
            originalLine,
        };
    }

    // Standard action: locator chain + action method (need at least 2 segments)
    if (segments.length < 2) return null;

    if (ACTION_MAP[actionMethod]) {
        const locatorSegments = segments.slice(0, -1);
        const selector = locatorChainToVero(locatorSegments, pageVars);

        let type = ACTION_MAP[actionMethod];

        // Check for right-click
        if (actionMethod === 'click' && last.args[0] && (last.args[0] as Expression).type === 'ObjectExpression') {
            const btnNode = getObjectProperty(last.args[0] as ObjectExpression, 'button');
            if (btnNode && extractStringFromNode(btnNode) === 'right') {
                type = 'rightclick';
            }
        }

        const value = extractStringFromNode(last.args[0] as Expression);

        const result: ParsedAction = { type, selector, originalLine };
        if (type === 'fill' || type === 'upload' || type === 'select' || type === 'press') {
            result.value = value;
        }

        // dragTo: first arg is the destination locator (a CallExpression chain)
        if (type === 'drag' && last.args[0] && (last.args[0] as Expression).type === 'CallExpression') {
            const destChain = unwrapCallChain(last.args[0] as unknown as CallExpression);
            result.destinationSelector = locatorChainToVero(destChain, pageVars);
        }

        return result;
    }

    return null;
}

function parseExpectFromAST(node: CallExpression, pageVars: Set<string>, originalLine: string): ParsedAction | null {
    // Structure: expect(locator).toXxx(args) or expect(locator).not.toXxx(args)
    // The outer call is: .toXxx(args) where callee is MemberExpression(expect(...), toXxx)
    const segments = unwrapCallChain(node);

    // Find the expect() segment
    const expectIdx = segments.findIndex(s => s.method === 'expect');
    if (expectIdx < 0) return null;
    const expectSeg = segments[expectIdx];

    // Detect .not between expect() and the matcher
    let isNegative = false;
    let matcherOffset = 1;
    if (expectIdx + 1 < segments.length && segments[expectIdx + 1].method === 'not') {
        isNegative = true;
        matcherOffset = 2;
    }

    // The matcher is the segment after expect (and possibly .not)
    if (expectIdx + matcherOffset >= segments.length) return null;
    const matcherSeg = segments[expectIdx + matcherOffset];
    const matcher = matcherSeg.method;

    if (matcher === 'toMatchAriaSnapshot') return null;

    const assertionType = MATCHER_MAP[matcher];
    if (!assertionType) return null;

    // Check what's inside expect()
    const innerArg = expectSeg.args[0] as Expression | undefined;
    if (!innerArg) return null;

    // Page-level assertion: expect(page).toHaveURL/toHaveTitle
    if (innerArg.type === 'Identifier' && pageVars.has((innerArg as Identifier).name)) {
        if (assertionType === 'url' || assertionType === 'title') {
            const result: ParsedAction = {
                type: 'expect',
                assertionType,
                value: extractStringFromNode(matcherSeg.args[0] as Expression),
                originalLine,
            };
            if (isNegative) result.isNegative = true;
            return result;
        }
        return null;
    }

    // Locator assertion: expect(page.getByRole(...)).toBeVisible()
    let selector = '';
    if (innerArg.type === 'CallExpression') {
        const innerChain = unwrapCallChain(innerArg as unknown as CallExpression);
        selector = locatorChainToVero(innerChain, pageVars);
    }

    const base: ParsedAction = { type: 'expect', selector, originalLine, assertionType };
    if (isNegative) base.isNegative = true;

    // Extract value for matchers that take arguments
    const matcherArg = matcherSeg.args[0] as Expression | undefined;
    if (assertionType === 'hasCount') {
        const val = extractStringFromNode(matcherArg);
        if (val) base.value = val;
    } else if (assertionType === 'hasAttribute' && matcherSeg.args.length >= 2) {
        const attr = extractStringFromNode(matcherSeg.args[0] as Expression);
        const attrVal = extractStringFromNode(matcherSeg.args[1] as Expression);
        if (attr && attrVal) base.value = `${attr}=${attrVal}`;
        else if (attr) base.value = attr;
    } else if (matcherArg) {
        base.value = extractStringFromNode(matcherArg);
    }

    return base;
}

// ──────────────────────────────────────────────
// Safe acorn parse helpers
// ──────────────────────────────────────────────

function tryParseProgram(code: string): acorn.Node | null {
    try {
        return acorn.parse(code, {
            ecmaVersion: 'latest',
            sourceType: 'module',
            allowAwaitOutsideFunction: true,
            allowReturnOutsideFunction: true,
        });
    } catch {
        return null;
    }
}

function tryParseExpression(code: string): acorn.Node | null {
    try {
        return acorn.parseExpressionAt(code, 0, {
            ecmaVersion: 'latest',
            sourceType: 'module',
            allowAwaitOutsideFunction: true,
        });
    } catch {
        return null;
    }
}

// ──────────────────────────────────────────────
// Main: parsePlaywrightCode
// ──────────────────────────────────────────────

export function parsePlaywrightCode(code: string): ParsedAction[] {
    const actions: ParsedAction[] = [];
    const pageVars = new Set<string>(['page']);
    const popupPromises = new Set<string>();

    // Line-based processing to handle comments and aria snapshots
    const lines = code.split('\n');
    let skippingAriaSnapshot = false;

    for (const rawLine of lines) {
        const trimmed = rawLine.trim();
        if (!trimmed) continue;

        // Skip multi-line aria snapshot blocks
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

        const isCommentedLine = trimmed.startsWith('//');
        const codeLine = isCommentedLine ? trimmed.replace(/^\/\/\s*/, '') : trimmed;

        // Try to parse this line as a statement
        const ast = tryParseProgram(codeLine);
        if (!ast) continue;

        const program = ast as any;
        if (!program.body || program.body.length === 0) continue;

        const stmt = program.body[0];

        // VariableDeclaration handling: popup promises, tab switches, newPage
        if (stmt.type === 'VariableDeclaration') {
            const decl = (stmt as VariableDeclaration).declarations[0];
            if (!decl || !decl.id || decl.id.type !== 'Identifier') continue;
            const varName = (decl.id as Identifier).name;
            const init = decl.init as Expression | null | undefined;

            if (!init) continue;

            // Unwrap await if present: `await expr` -> `expr`
            const innerInit = init.type === 'AwaitExpression'
                ? (init as AwaitExpression).argument as Expression
                : init;

            // const tab = await popupPromise
            if (init.type === 'AwaitExpression' && innerInit.type === 'Identifier' &&
                popupPromises.has((innerInit as Identifier).name)) {
                pageVars.add(varName);
                actions.push({ type: 'switchTab', value: varName, originalLine: trimmed });
                continue;
            }

            // Handle CallExpression init (with or without await)
            if (innerInit.type === 'CallExpression') {
                const chain = unwrapCallChain(innerInit as unknown as CallExpression);
                if (chain.length >= 1) {
                    const lastSeg = chain[chain.length - 1];

                    // const x = page.waitForEvent('popup')
                    if (lastSeg.method === 'waitForEvent') {
                        const arg = extractStringFromNode(lastSeg.args[0] as Expression);
                        if (arg === 'popup') {
                            popupPromises.add(varName);
                            continue;
                        }
                    }

                    // const page2 = [await] context.newPage()
                    if (lastSeg.method === 'newPage' && varName !== 'page') {
                        pageVars.add(varName);
                        actions.push({ type: 'openInNewTab', value: varName, originalLine: trimmed });
                        continue;
                    }
                }
            }

            continue;
        }

        // ExpressionStatement — the main line types
        if (stmt.type === 'ExpressionStatement') {
            const expr = (stmt as ExpressionStatement).expression;
            let callExpr: CallExpression | null = null;

            // Unwrap await
            if (expr.type === 'AwaitExpression') {
                const arg = (expr as AwaitExpression).argument as Expression;
                if (arg.type === 'CallExpression') {
                    callExpr = arg as unknown as CallExpression;
                }
            } else if (expr.type === 'CallExpression') {
                callExpr = expr as unknown as CallExpression;
            }

            // AssignmentExpression: page = context.pages()[N]
            if (expr.type === 'AssignmentExpression') {
                const assign = expr as AssignmentExpression;
                if (assign.left.type === 'Identifier' && assign.right.type === 'MemberExpression') {
                    const mem = assign.right as MemberExpression;
                    if (mem.object.type === 'CallExpression') {
                        const chain = unwrapCallChain(mem.object as unknown as CallExpression);
                        const lastSeg = chain[chain.length - 1];
                        if (lastSeg && lastSeg.method === 'pages' && mem.property.type === 'Literal') {
                            const tabVar = (assign.left as Identifier).name;
                            const idx = (mem.property as Literal).value as number;
                            pageVars.add(tabVar);
                            actions.push({
                                type: 'switchToTab',
                                value: String(idx + 1),
                                originalLine: trimmed,
                            });
                            continue;
                        }
                    }
                }
            }

            if (!callExpr) continue;

            const parsed = isExpectCall(callExpr)
                ? parseExpectFromAST(callExpr, pageVars, codeLine)
                : parseActionFromAST(callExpr, pageVars, codeLine);

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

function isExpectCall(node: CallExpression): boolean {
    // Walk up the callee chain: expect(...).toXxx() means
    // CallExpression(MemberExpression(CallExpression(expect, ...), toXxx), ...)
    // Also handles: expect(...).not.toXxx() where .not is a MemberExpression
    let current: any = node;
    while (current) {
        if (current.type === 'CallExpression') {
            const callee = current.callee;
            if (callee.type === 'Identifier' && callee.name === 'expect') return true;
            if (callee.type === 'MemberExpression') {
                current = callee.object;
                continue;
            }
            break;
        }
        if (current.type === 'MemberExpression') {
            // Handle .not property access: expect(...).not
            current = current.object;
            continue;
        }
        break;
    }
    return false;
}

/** Parse a code string and extract the CallExpression inside `await expr()` */
function unwrapAwaitedCall(code: string): CallExpression | null {
    const ast = tryParseProgram(code);
    if (!ast) return null;

    const program = ast as any;
    if (!program.body || program.body.length === 0) return null;

    const stmt = program.body[0];
    if (stmt.type !== 'ExpressionStatement') return null;

    const expr = stmt.expression;
    if (expr.type !== 'AwaitExpression') return null;

    const arg = expr.argument;
    if (arg.type !== 'CallExpression') return null;

    return arg as unknown as CallExpression;
}

// ──────────────────────────────────────────────
// Backward-Compatible Shims
// ──────────────────────────────────────────────

/**
 * Split a chained locator expression at top-level dots.
 * Backward-compatible: accepts a raw string, parses with acorn,
 * reconstructs segments from source positions.
 */
export function splitMethodChain(chain: string): string[] {
    const wrapped = `_obj_.${chain}`;
    const ast = tryParseExpression(wrapped);
    if (!ast) {
        // Fallback to simple split
        return fallbackSplitMethodChain(chain);
    }

    const segments: string[] = [];
    collectChainSegments(ast as any, wrapped, segments);

    // The first segment will be '_obj_' — remove it
    if (segments.length > 0 && segments[0] === '_obj_') {
        segments.shift();
    }

    return segments.length > 0 ? segments : fallbackSplitMethodChain(chain);
}

function collectChainSegments(node: any, source: string, segments: string[]): void {
    if (node.type === 'CallExpression') {
        const callee = node.callee;
        if (callee.type === 'MemberExpression') {
            // Recurse into the object (left side)
            collectChainSegments(callee.object, source, segments);
            // This segment is from callee.property.start to node.end
            const propStart = callee.property.start;
            const segStr = source.slice(propStart, node.end);
            segments.push(segStr);
        } else if (callee.type === 'Identifier') {
            // Bare function call
            segments.push(source.slice(callee.start, node.end));
        }
    } else if (node.type === 'MemberExpression') {
        collectChainSegments(node.object, source, segments);
        if (node.property.type === 'Identifier') {
            segments.push(node.property.name);
        }
    } else if (node.type === 'Identifier') {
        segments.push(node.name);
    }
}

function fallbackSplitMethodChain(chain: string): string[] {
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
            if (escaped) { escaped = false; continue; }
            if (ch === '\\') { escaped = true; continue; }
            if (ch === quote) { quote = null; }
            continue;
        }
        if (ch === '\'' || ch === '"' || ch === '`') { quote = ch; current += ch; continue; }
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
    // Try AST-based extraction
    const ast = tryParseExpression(input);
    if (ast) {
        const val = extractStringFromNode(ast as any);
        if (val !== undefined) return val;
    }
    // Fallback to regex for edge cases
    const match = input.match(/['"]((?:\\.|[^'"])*)['"]/);
    if (!match) return undefined;
    return match[1].replace(/\\(['"\\])/g, '$1');
}

export function chainToModifier(segment: string): { modifier?: string; base?: string } | null {
    const wrapped = `_obj_.${segment}`;
    const ast = tryParseExpression(wrapped);
    if (!ast || (ast as any).type !== 'CallExpression') return null;

    const chain = unwrapCallChain(ast as unknown as CallExpression);
    if (chain.length < 1) return null;

    return segmentToLocator(chain[chain.length - 1], false, new Set(['page', '_obj_']));
}

export function parseChainedSelector(chain: string, pageVar: string = 'page'): string {
    let normalized = chain.trim();
    if (normalized.startsWith(`${pageVar}.`)) {
        normalized = normalized.slice(pageVar.length + 1);
    }

    const wrapped = `${pageVar}.${normalized}`;
    const ast = tryParseExpression(wrapped);
    if (!ast) return '';

    if ((ast as any).type === 'CallExpression') {
        const segments = unwrapCallChain(ast as unknown as CallExpression);
        return locatorChainToVero(segments, new Set([pageVar]));
    }

    return '';
}

export function parseLocatorAndAction(line: string, pageVar: string = 'page'): ParsedAction | null {
    const trimmed = line.trim().replace(/^\/\/\s*/, '');
    if (!trimmed.startsWith('await')) return null;

    const callExpr = unwrapAwaitedCall(trimmed);
    if (!callExpr) return null;

    return parseActionFromAST(callExpr, new Set([pageVar]), trimmed);
}

export function parseExpect(line: string, pageVar: string = 'page'): ParsedAction | null {
    const trimmed = line.trim().replace(/^\/\/\s*/, '');
    if (!trimmed.startsWith('await expect(')) return null;
    if (trimmed.includes('.toMatchAriaSnapshot(')) return null;

    const callExpr = unwrapAwaitedCall(trimmed);
    if (!callExpr) return null;

    return parseExpectFromAST(callExpr, new Set([pageVar]), trimmed);
}

export function extractSelector(method: string, args: string): string {
    const expr = `${method}(${args})`;
    const ast = tryParseExpression(expr);
    if (!ast || (ast as any).type !== 'CallExpression') {
        return fallbackExtractSelector(method, args);
    }

    const call = ast as unknown as CallExpression;
    const seg: ChainSegment = {
        method,
        args: call.arguments as (Expression | SpreadElement)[],
    };

    const result = segmentToLocator(seg, true, new Set(['page']));
    if (result?.base) return result.base;
    if (result?.modifier) return result.modifier;
    return fallbackExtractSelector(method, args);
}

function fallbackExtractSelector(method: string, args: string): string {
    const normalizedMethod = method.trim();
    const normalizedArgs = args.trim();

    if (normalizedMethod === 'getByRole') {
        const role = normalizedArgs.match(/['"](.+?)['"]/)?.[1];
        const name = normalizedArgs.match(/name\s*:\s*['"](.+?)['"]/)?.[1];
        if (role && name) return `role "${role}" name "${name}"`;
        if (role) return `role "${role}"`;
    }

    const simpleMethodMap: Record<string, string> = {
        getByTestId: 'testid',
        getByLabel: 'label',
        getByPlaceholder: 'placeholder',
        getByText: 'text',
        getByAltText: 'alt',
        getByTitle: 'title',
        locator: 'css',
    };

    if (simpleMethodMap[normalizedMethod]) {
        const match = extractQuotedValue(normalizedArgs);
        return match ? `${simpleMethodMap[normalizedMethod]} "${match}"` : normalizedArgs;
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
