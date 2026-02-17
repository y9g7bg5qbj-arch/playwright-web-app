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

describe('Dialog Handling', () => {
    describe('Parsing', () => {
        it('parses ACCEPT DIALOG', () => {
            const { errors } = parseStatement('ACCEPT DIALOG');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses ACCEPT DIALOG WITH "text"', () => {
            const { errors } = parseStatement('ACCEPT DIALOG WITH "yes"');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses DISMISS DIALOG', () => {
            const { errors } = parseStatement('DISMISS DIALOG');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });
    });

    describe('Transpilation', () => {
        it('transpiles ACCEPT DIALOG to dialog.accept()', () => {
            const code = transpileFirstTest(`
                FEATURE DialogTest {
                    SCENARIO AcceptAlert {
                        ACCEPT DIALOG
                        OPEN "https://example.com"
                    }
                }
            `);
            assert.ok(code.includes('dialog.accept()'), `Expected dialog.accept() in: ${code}`);
            assert.ok(code.includes("page.once('dialog'"), `Expected page.once('dialog') in: ${code}`);
        });

        it('transpiles ACCEPT DIALOG WITH "text" to dialog.accept(text)', () => {
            const code = transpileFirstTest(`
                FEATURE DialogTest {
                    SCENARIO PromptDialog {
                        ACCEPT DIALOG WITH "my response"
                        OPEN "https://example.com"
                    }
                }
            `);
            assert.ok(code.includes("dialog.accept('my response')"), `Expected dialog.accept with text in: ${code}`);
        });

        it('transpiles DISMISS DIALOG to dialog.dismiss()', () => {
            const code = transpileFirstTest(`
                FEATURE DialogTest {
                    SCENARIO DismissAlert {
                        DISMISS DIALOG
                        OPEN "https://example.com"
                    }
                }
            `);
            assert.ok(code.includes('dialog.dismiss()'), `Expected dialog.dismiss() in: ${code}`);
        });
    });
});
