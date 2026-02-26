import { describe, it } from 'node:test';
import assert from 'node:assert';
import { tokenize } from '../../lexer/index.js';
import { parse } from '../../parser/index.js';
import { transpile } from '../../transpiler/index.js';

function transpilePageActions(source: string, pageActionsName: string): string {
    const { tokens, errors: lexerErrors } = tokenize(source);
    assert.strictEqual(lexerErrors.length, 0, `Lexer errors: ${lexerErrors.map(e => e.message).join(', ')}`);

    const { ast, errors: parseErrors } = parse(tokens);
    assert.strictEqual(parseErrors.length, 0, `Parse errors: ${parseErrors.map(e => e.message).join(', ')}`);

    const result = transpile(ast);
    const pageActionsCode = result.pageActions.get(pageActionsName);
    assert.ok(pageActionsCode, `Expected transpiled page actions for ${pageActionsName}`);
    return pageActionsCode!;
}

describe('PAGEACTIONS overload transpilation', () => {
    it('emits one dispatcher method for same-name overloads', () => {
        const code = transpilePageActions(`
            PAGE OktaPage {
                FIELD myidOrUsernametextbox = TEXTBOX "Username"
            }

            PAGEACTIONS OktaPageActions FOR OktaPage {
                loginAndLaunchApex {
                    PERFORM loginAndLaunchApex WITH "https://example.com", "user", "pass"
                }

                loginAndLaunchApex WITH oktaUrl, username, password {
                    OPEN oktaUrl
                    FILL myidOrUsernametextbox WITH username
                }
            }

            FEATURE Smoke {
                SCENARIO UsesAction {
                    PERFORM OktaPageActions.loginAndLaunchApex
                }
            }
        `, 'OktaPageActions');

        const methodMatches = code.match(/async loginAndLaunchApex\(/g) || [];
        assert.strictEqual(methodMatches.length, 1, code);
        assert.ok(code.includes('async loginAndLaunchApex(...__args: string[]): Promise<void>'), code);
        assert.ok(code.includes('if (__args.length === 0) {'), code);
        assert.ok(code.includes("await this.loginAndLaunchApex('https://example.com', 'user', 'pass');"), code);
        assert.ok(code.includes('if (__args.length === 3) {'), code);
        assert.ok(code.includes('const [oktaUrl, username, password] = __args;'), code);
    });
});
