import { describe, it } from 'node:test';
import assert from 'node:assert';
import { tokenize } from '../../lexer/index.js';
import { parse } from '../../parser/index.js';
import { transpile } from '../../transpiler/index.js';

function transpileFirstTest(source: string): string {
    const { tokens, errors: lexerErrors } = tokenize(source);
    assert.strictEqual(lexerErrors.length, 0, `Lexer errors: ${lexerErrors.map(e => e.message).join(', ')}`);

    const { ast, errors: parseErrors } = parse(tokens);
    assert.strictEqual(parseErrors.length, 0, `Parse errors: ${parseErrors.map(e => e.message).join(', ')}`);

    const result = transpile(ast);
    const testCode = result.tests.values().next().value;
    assert.ok(testCode, 'Expected transpiled feature output');
    return testCode;
}

function countOccurrences(source: string, needle: string): number {
    return source.split(needle).length - 1;
}

describe('Tab Switching Transpilation', () => {
    it('emits popup-first detection and event wait for SWITCH TO NEW TAB without URL', () => {
        const code = transpileFirstTest(`
            PAGE HomePage {
                FIELD launch = text "Launch"
                FIELD next = text "Next"
            }

            FEATURE TabFlow {
                SCENARIO PopupFlow {
                    CLICK HomePage.launch
                    SWITCH TO NEW TAB
                    CLICK HomePage.next
                }
            }
        `);

        assert.ok(code.includes("const tabTimeoutMs = 5000;"));
        assert.ok(code.includes("const popupCandidates = context.pages().filter((candidate) => candidate !== page);"));
        assert.ok(code.includes("if ((await candidate.opener()) === page) {"));
        assert.ok(code.includes("const eventPage = await context.waitForEvent('page', {"));
        assert.ok(code.includes("predicate: (candidate) => candidate !== page"));
        assert.ok(code.includes("await page.bringToFront();"));
        assert.ok(code.includes("await page.waitForLoadState('domcontentloaded');"));
    });

    it('emits explicit timeout failure for SWITCH TO NEW TAB when no popup is found', () => {
        const code = transpileFirstTest(`
            PAGE HomePage {
                FIELD next = text "Next"
            }

            FEATURE TabFlow {
                SCENARIO MissingPopup {
                    SWITCH TO NEW TAB
                    CLICK HomePage.next
                }
            }
        `);

        assert.ok(code.includes("SWITCH TO NEW TAB failed: no new tab found within "));
    });

    it('emits wait-then-fail flow for SWITCH TO TAB with index validation', () => {
        const code = transpileFirstTest(`
            PAGE HomePage {
                FIELD next = text "Next"
            }

            FEATURE TabFlow {
                SCENARIO ExistingTab {
                    SWITCH TO TAB 2
                    CLICK HomePage.next
                }
            }
        `);

        assert.ok(code.includes("const requestedIndex = Number(2);"));
        assert.ok(code.includes("const tabPollMs = 150;"));
        assert.ok(code.includes("while (pages.length < requestedIndex && Date.now() < deadline) {"));
        assert.ok(code.includes("SWITCH TO TAB expects a positive integer index"));
        assert.ok(code.includes("SWITCH TO TAB ' + requestedIndex + ' failed: only ' + pages.length + ' tab(s) available."));
    });

    it('emits deterministic close fallback and no-tabs error for CLOSE TAB', () => {
        const code = transpileFirstTest(`
            PAGE HomePage {
                FIELD next = text "Next"
            }

            FEATURE TabFlow {
                SCENARIO CloseTabFlow {
                    CLOSE TAB
                    CLICK HomePage.next
                }
            }
        `);

        assert.ok(code.includes("const pagesBeforeClose = context.pages();"));
        assert.ok(code.includes("const closingIndex = pagesBeforeClose.indexOf(page);"));
        assert.ok(code.includes("const fallbackIndex = closingIndex >= pagesAfterClose.length"));
        assert.ok(code.includes("CLOSE TAB failed: no tabs remain open"));
    });

    it('re-initializes all used page objects after every successful tab operation', () => {
        const code = transpileFirstTest(`
            PAGE HomePage {
                FIELD launch = text "Launch"
                FIELD next = text "Next"
            }

            FEATURE TabFlow {
                SCENARIO MultiTabFlow {
                    CLICK HomePage.launch
                    SWITCH TO NEW TAB
                    SWITCH TO TAB 1
                    OPEN "https://example.com" IN NEW TAB
                    CLOSE TAB
                    CLICK HomePage.next
                }
            }
        `);

        assert.strictEqual(countOccurrences(code, "homePage = new HomePage(page);"), 5);
        assert.ok(code.includes("await test.step('Open in new tab', async () => {"));
        assert.ok(code.includes("await newPage.goto('https://example.com');"));
    });

    it('supports explicit URL switch and uses standard post-switch flow', () => {
        const code = transpileFirstTest(`
            PAGE HomePage {
                FIELD next = text "Next"
            }

            FEATURE TabFlow {
                SCENARIO UrlSwitch {
                    SWITCH TO NEW TAB "https://playwright.dev"
                    CLICK HomePage.next
                }
            }
        `);

        assert.ok(code.includes("await test.step('Switch to new tab', async () => {"));
        assert.ok(code.includes("const newPage = await context.newPage();"));
        assert.ok(code.includes("await newPage.goto('https://playwright.dev');"));
        assert.ok(code.includes("await page.waitForLoadState('domcontentloaded');"));
        assert.ok(code.includes("homePage = new HomePage(page);"));
    });
});
