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

describe('Cookie & Storage Management', () => {
    describe('Parsing', () => {
        it('parses SET COOKIE "name" TO "value"', () => {
            const { errors } = parseStatement('SET COOKIE "session" TO "abc123"');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses CLEAR COOKIES', () => {
            const { errors } = parseStatement('CLEAR COOKIES');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses SET STORAGE "key" TO "value"', () => {
            const { errors } = parseStatement('SET STORAGE "theme" TO "dark"');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses GET STORAGE "key" INTO variable', () => {
            const { errors } = parseStatement('GET STORAGE "theme" INTO savedTheme');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses CLEAR STORAGE', () => {
            const { errors } = parseStatement('CLEAR STORAGE');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });
    });

    describe('Transpilation', () => {
        it('transpiles SET COOKIE to context.addCookies', () => {
            const code = transpileFirstTest(`
                FEATURE CookieTest {
                    SCENARIO SetCookie {
                        SET COOKIE "session" TO "abc123"
                    }
                }
            `);
            assert.ok(code.includes('addCookies'), `Expected addCookies in: ${code}`);
        });

        it('transpiles CLEAR COOKIES to context.clearCookies', () => {
            const code = transpileFirstTest(`
                FEATURE CookieTest {
                    SCENARIO ClearAll {
                        CLEAR COOKIES
                    }
                }
            `);
            assert.ok(code.includes('clearCookies'), `Expected clearCookies in: ${code}`);
        });

        it('transpiles SET STORAGE to localStorage.setItem', () => {
            const code = transpileFirstTest(`
                FEATURE StorageTest {
                    SCENARIO SetItem {
                        SET STORAGE "theme" TO "dark"
                    }
                }
            `);
            assert.ok(code.includes('localStorage.setItem'), `Expected localStorage.setItem in: ${code}`);
        });

        it('transpiles GET STORAGE to localStorage.getItem', () => {
            const code = transpileFirstTest(`
                FEATURE StorageTest {
                    SCENARIO GetItem {
                        GET STORAGE "theme" INTO savedTheme
                    }
                }
            `);
            assert.ok(code.includes('localStorage.getItem'), `Expected localStorage.getItem in: ${code}`);
            assert.ok(code.includes('savedTheme'), `Expected variable name in: ${code}`);
        });

        it('transpiles CLEAR STORAGE to localStorage.clear', () => {
            const code = transpileFirstTest(`
                FEATURE StorageTest {
                    SCENARIO ClearAll {
                        CLEAR STORAGE
                    }
                }
            `);
            assert.ok(code.includes('localStorage.clear'), `Expected localStorage.clear in: ${code}`);
        });
    });
});
