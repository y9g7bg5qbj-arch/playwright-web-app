import { describe, it } from 'node:test';
import assert from 'node:assert';
import { tokenize } from '../../lexer/index.js';
import { parse } from '../../parser/index.js';
import { transpile } from '../../transpiler/index.js';

function parseStatement(statement: string) {
    const source = `FEATURE T { SCENARIO S { ${statement} } }`;
    const { tokens, errors: lexerErrors } = tokenize(source);
    assert.strictEqual(lexerErrors.length, 0, `Lexer errors: ${lexerErrors.map(e => e.message).join(', ')}`);
    const { ast, errors } = parse(tokens);
    return { ast, errors };
}

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

describe('Wait for Network/Navigation', () => {
    describe('Parsing', () => {
        it('parses WAIT FOR NAVIGATION', () => {
            const { errors } = parseStatement('WAIT FOR NAVIGATION');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses WAIT FOR NETWORK IDLE', () => {
            const { errors } = parseStatement('WAIT FOR NETWORK IDLE');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses WAIT FOR URL CONTAINS "pattern"', () => {
            const { errors } = parseStatement('WAIT FOR URL CONTAINS "/dashboard"');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses WAIT FOR URL EQUALS "url"', () => {
            const { errors } = parseStatement('WAIT FOR URL EQUALS "https://example.com/home"');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });
    });

    describe('Transpilation', () => {
        it('transpiles WAIT FOR NAVIGATION to waitForLoadState', () => {
            const code = transpileFirstTest(`
                FEATURE WaitTest {
                    SCENARIO WaitForNav {
                        WAIT FOR NAVIGATION
                    }
                }
            `);
            assert.ok(code.includes("waitForLoadState('load')"), `Expected waitForLoadState('load') in: ${code}`);
        });

        it('transpiles WAIT FOR NETWORK IDLE to waitForLoadState networkidle', () => {
            const code = transpileFirstTest(`
                FEATURE WaitTest {
                    SCENARIO WaitForIdle {
                        WAIT FOR NETWORK IDLE
                    }
                }
            `);
            assert.ok(code.includes("waitForLoadState('networkidle')"), `Expected waitForLoadState('networkidle') in: ${code}`);
        });

        it('transpiles WAIT FOR URL CONTAINS to waitForURL with predicate', () => {
            const code = transpileFirstTest(`
                FEATURE WaitTest {
                    SCENARIO WaitForUrlContains {
                        WAIT FOR URL CONTAINS "/dashboard"
                    }
                }
            `);
            assert.ok(code.includes('waitForURL'), `Expected waitForURL in: ${code}`);
            assert.ok(code.includes('/dashboard'), `Expected URL pattern in: ${code}`);
        });

        it('transpiles WAIT FOR URL EQUALS to waitForURL with exact match', () => {
            const code = transpileFirstTest(`
                FEATURE WaitTest {
                    SCENARIO WaitForUrlEquals {
                        WAIT FOR URL EQUALS "https://example.com/home"
                    }
                }
            `);
            assert.ok(code.includes('waitForURL'), `Expected waitForURL in: ${code}`);
            assert.ok(code.includes('https://example.com/home'), `Expected exact URL in: ${code}`);
        });
    });
});
