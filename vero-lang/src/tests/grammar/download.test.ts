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

describe('Download Handling', () => {
    describe('Parsing', () => {
        it('parses DOWNLOAD FROM PageName.field', () => {
            const source = `
                PAGE ExportPage {
                    FIELD exportButton = role "button" name "Export"
                }
                FEATURE DownloadTest {
                    SCENARIO DownloadFile {
                        DOWNLOAD FROM ExportPage.exportButton
                    }
                }
            `;
            const { tokens, errors: lexerErrors } = tokenize(source);
            assert.strictEqual(lexerErrors.length, 0);
            const { errors: parseErrors } = parse(tokens);
            assert.strictEqual(parseErrors.length, 0);
        });

        it('parses DOWNLOAD FROM with AS filename', () => {
            const source = `
                PAGE ExportPage {
                    FIELD exportButton = role "button" name "Export"
                }
                FEATURE DownloadTest {
                    SCENARIO DownloadWithName {
                        DOWNLOAD FROM ExportPage.exportButton AS "report.csv"
                    }
                }
            `;
            const { tokens, errors: lexerErrors } = tokenize(source);
            assert.strictEqual(lexerErrors.length, 0);
            const { errors: parseErrors } = parse(tokens);
            assert.strictEqual(parseErrors.length, 0);
        });
    });

    describe('Transpilation', () => {
        it('transpiles DOWNLOAD FROM to waitForEvent + click', () => {
            const code = transpileFirstTest(`
                PAGE ExportPage {
                    FIELD exportButton = role "button" name "Export"
                }
                FEATURE DownloadTest {
                    SCENARIO DownloadFile {
                        DOWNLOAD FROM ExportPage.exportButton
                    }
                }
            `);
            assert.ok(code.includes("waitForEvent('download')"), `Expected download event wait in: ${code}`);
            assert.ok(code.includes('.click()'), `Expected click in: ${code}`);
        });

        it('transpiles DOWNLOAD FROM with AS to saveAs', () => {
            const code = transpileFirstTest(`
                PAGE ExportPage {
                    FIELD exportButton = role "button" name "Export"
                }
                FEATURE DownloadTest {
                    SCENARIO DownloadWithName {
                        DOWNLOAD FROM ExportPage.exportButton AS "report.csv"
                    }
                }
            `);
            assert.ok(code.includes('saveAs'), `Expected saveAs in: ${code}`);
            assert.ok(code.includes('report.csv'), `Expected filename in: ${code}`);
        });
    });
});
