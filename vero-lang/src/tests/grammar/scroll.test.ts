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

describe('Scroll Action', () => {
    describe('Parsing', () => {
        it('parses SCROLL DOWN', () => {
            const { errors } = parseStatement('SCROLL DOWN');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses SCROLL UP', () => {
            const { errors } = parseStatement('SCROLL UP');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses SCROLL TO PageName.field', () => {
            const { errors } = parseStatement('SCROLL TO TestPage.footer');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });
    });

    describe('Transpilation', () => {
        it('transpiles SCROLL DOWN to mouse.wheel', () => {
            const code = transpileFirstTest(`
                FEATURE ScrollTest {
                    SCENARIO ScrollDown {
                        SCROLL DOWN
                    }
                }
            `);
            assert.ok(code.includes('mouse.wheel(0, 500)'), `Expected scroll down in: ${code}`);
        });

        it('transpiles SCROLL UP to negative mouse.wheel', () => {
            const code = transpileFirstTest(`
                FEATURE ScrollTest {
                    SCENARIO ScrollUp {
                        SCROLL UP
                    }
                }
            `);
            assert.ok(code.includes('mouse.wheel(0, -500)'), `Expected scroll up in: ${code}`);
        });

        it('transpiles SCROLL TO element to scrollIntoViewIfNeeded', () => {
            const code = transpileFirstTest(`
                PAGE TestPage {
                    FIELD footer = role "contentinfo"
                }
                FEATURE ScrollTest {
                    SCENARIO ScrollToElement {
                        SCROLL TO TestPage.footer
                    }
                }
            `);
            assert.ok(code.includes('scrollIntoViewIfNeeded'), `Expected scrollIntoViewIfNeeded in: ${code}`);
        });
    });
});
