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

describe('Frame/Iframe Handling', () => {
    describe('Parsing', () => {
        it('parses SWITCH TO FRAME with css selector', () => {
            const { errors } = parseStatement('SWITCH TO FRAME css "#myIframe"');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses SWITCH TO MAIN FRAME', () => {
            const { errors } = parseStatement('SWITCH TO MAIN FRAME');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });
    });

    describe('Transpilation', () => {
        it('transpiles SWITCH TO FRAME css to frameLocator', () => {
            const code = transpileFirstTest(`
                FEATURE FrameTest {
                    SCENARIO IframeInteraction {
                        SWITCH TO FRAME css "#paymentFrame"
                        OPEN "https://example.com"
                        SWITCH TO MAIN FRAME
                    }
                }
            `);
            assert.ok(code.includes('frameLocator'), `Expected frameLocator in: ${code}`);
            assert.ok(code.includes('#paymentFrame'), `Expected selector in: ${code}`);
        });

        it('transpiles SWITCH TO MAIN FRAME to reset frame context', () => {
            const code = transpileFirstTest(`
                FEATURE FrameTest {
                    SCENARIO BackToMain {
                        SWITCH TO FRAME css "#iframe1"
                        SWITCH TO MAIN FRAME
                    }
                }
            `);
            assert.ok(code.includes('__currentFrame = null'), `Expected frame reset in: ${code}`);
        });
    });
});
