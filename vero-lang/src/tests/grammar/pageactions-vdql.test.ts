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

describe('PAGEACTIONS VDQL transpilation', () => {
    it('injects local data context for ROW statements with env vars', () => {
        const code = transpilePageActions(`
            PAGE OktaPage {
                FIELD username = TEXTBOX "Username"
            }

            PAGEACTIONS OktaPageActions FOR OktaPage {
                loginAndLaunchApex {
                    ROW agent = FIRST Agents WHERE environment = {{environment}} and state = {{state}}
                    OPEN agent.oktaUrl
                }
            }

            FEATURE Smoke {
                SCENARIO UsesAction {
                    PERFORM OktaPageActions.loginAndLaunchApex
                }
            }
        `, 'OktaPageActions');

        assert.ok(code.includes("import { createDataManager } from '../runtime/DataManager';"), code);
        assert.ok(code.includes("import { testDataApi } from '../api/testDataApi';"), code);
        assert.ok(code.includes("const __env__: Record<string, string> = JSON.parse(process.env.VERO_ENV_VARS || '{}');"), code);
        assert.ok(code.includes("await dataManager.preloadTables(['Agents']);"), code);
        assert.ok(code.includes("Data['Agents'] = dataManager.query('Agents').execute();"), code);
        assert.ok(code.includes('await OktaPageActions.__ensureDataLoaded();'), code);
        assert.ok(code.includes("Data.resolveReferences('Agents', _raw_agent)"), code);
        assert.ok(code.includes("__env__['environment']"), code);
        assert.ok(code.includes("__env__['state']"), code);
    });
});
