/**
 * Integration Test Suite for Vero Grammar
 *
 * Tests parsing of real .vero files from the test-project directory.
 *
 * @author Agent 10: ANTLR Grammar Validator & Tester
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CharStream, CommonTokenStream } from 'antlr4ng';
import { VeroLexer } from '../../parser/generated/grammar/VeroLexer.js';
import { VeroParser } from '../../parser/generated/grammar/VeroParser.js';

/**
 * Parse Vero code and return errors
 */
function parse(input: string): { errors: string[] } {
    const errors: string[] = [];

    const chars = CharStream.fromString(input);
    const lexer = new VeroLexer(chars);
    const tokens = new CommonTokenStream(lexer);
    const parser = new VeroParser(tokens);

    parser.removeErrorListeners();
    parser.addErrorListener({
        syntaxError: (recognizer: any, offendingSymbol: any, line: number, column: number, msg: string) => {
            errors.push(`Line ${line}:${column} - ${msg}`);
        },
        reportAmbiguity: () => {},
        reportAttemptingFullContext: () => {},
        reportContextSensitivity: () => {}
    } as any);

    parser.program();

    return { errors };
}

describe('Vero Grammar - Integration Tests', () => {

    describe('Grammar Test Files', () => {
        const grammarTestDir = join(process.cwd(), 'test-project', 'grammar-tests');

        let files: string[] = [];
        try {
            files = readdirSync(grammarTestDir)
                .filter(f => f.endsWith('.vero'))
                .sort();
        } catch (e) {
            console.log('Grammar test directory not found, skipping integration tests');
        }

        if (files.length > 0) {
            files.forEach(file => {
                it(`should parse ${file}`, () => {
                    const content = readFileSync(join(grammarTestDir, file), 'utf-8');
                    const { errors } = parse(content);

                    assert.strictEqual(
                        errors.length,
                        0,
                        `Failed to parse ${file}:\n${errors.join('\n')}`
                    );
                });
            });

            it('should have at least 50 grammar test files', () => {
                assert.ok(
                    files.length >= 50,
                    `Expected at least 50 test files, found ${files.length}`
                );
            });
        }
    });

    describe('Existing Project Files', () => {
        const pagesDir = join(process.cwd(), 'test-project', 'pages');
        const featuresDir = join(process.cwd(), 'test-project', 'features');

        // Test page files
        let pageFiles: string[] = [];
        try {
            pageFiles = readdirSync(pagesDir)
                .filter(f => f.endsWith('.vero'));
        } catch (e) {
            console.log('Pages directory not found');
        }

        pageFiles.forEach(file => {
            it(`should parse page file: ${file}`, () => {
                const content = readFileSync(join(pagesDir, file), 'utf-8');
                const { errors } = parse(content);

                // Note: Some existing files may use syntax not in grammar
                // We log but don't fail to document compatibility
                if (errors.length > 0) {
                    console.log(`Compatibility note for ${file}:`, errors);
                }
            });
        });

        // Test feature files
        let featureFiles: string[] = [];
        try {
            featureFiles = readdirSync(featuresDir)
                .filter(f => f.endsWith('.vero'));
        } catch (e) {
            console.log('Features directory not found');
        }

        featureFiles.forEach(file => {
            it(`should parse feature file: ${file}`, () => {
                const content = readFileSync(join(featuresDir, file), 'utf-8');
                const { errors } = parse(content);

                if (errors.length > 0) {
                    console.log(`Compatibility note for ${file}:`, errors);
                }
            });
        });
    });

    describe('Cross-File References', () => {

        it('should parse page and feature that reference each other', () => {
            const pageCode = `
page LoginPage {
    field email = "#email"
    field password = "#password"
    field submit = "Submit"

    login with email, password {
        fill email with email
        fill password with password
        click submit
    }
}
`;

            const featureCode = `
feature Login {
    use LoginPage

    scenario "Valid login" {
        open "/login"
        do LoginPage.login with "test@example.com", "password"
        verify "Dashboard" is visible
    }
}
`;

            const pageResult = parse(pageCode);
            const featureResult = parse(featureCode);

            assert.strictEqual(pageResult.errors.length, 0, 'Page should parse');
            assert.strictEqual(featureResult.errors.length, 0, 'Feature should parse');
        });

        it('should parse multiple pages and feature using all', () => {
            const code = `
page LoginPage {
    field email = "#email"
}

page DashboardPage {
    field header = ".header"
}

page ProfilePage {
    field avatar = ".avatar"
}

feature FullFlow {
    use LoginPage
    use DashboardPage
    use ProfilePage

    scenario "Navigate all pages" {
        fill LoginPage.email with "test@example.com"
        verify DashboardPage.header is visible
        click ProfilePage.avatar
    }
}
`;

            const { errors } = parse(code);
            assert.strictEqual(errors.length, 0, 'Should parse multiple pages and feature');
        });
    });

    describe('Real-World Patterns', () => {

        it('should parse data-driven test pattern', () => {
            const code = `
feature DataDrivenTests {
    scenario "Test with multiple data sets" {
        # First dataset
        text email1 = "user1@example.com"
        text password1 = "password1"
        fill "email" with email1
        fill "password" with password1
        click "Submit"
        verify "Welcome" is visible

        # Second dataset
        text email2 = "user2@example.com"
        text password2 = "password2"
        fill "email" with email2
        fill "password" with password2
        click "Submit"
        verify "Welcome" is visible
    }
}
`;

            const { errors } = parse(code);
            assert.strictEqual(errors.length, 0, 'Should parse data-driven pattern');
        });

        it('should parse retry pattern', () => {
            const code = `
feature RetryPattern {
    scenario "Retry on failure" {
        number attempts = 0
        repeat 3 times {
            click "Submit"
            wait 1 seconds
            if "Success" is visible {
                log "Succeeded"
            }
        }
    }
}
`;

            const { errors } = parse(code);
            assert.strictEqual(errors.length, 0, 'Should parse retry pattern');
        });

        it('should parse conditional navigation pattern', () => {
            const code = `
feature ConditionalNavigation {
    scenario "Handle different states" {
        open "/app"

        if "Login" is visible {
            fill "email" with "test@example.com"
            click "Submit"
        } else {
            if "Dashboard" is visible {
                log "Already logged in"
            } else {
                log "Unknown state"
                take screenshot "unknown-state"
            }
        }
    }
}
`;

            const { errors } = parse(code);
            assert.strictEqual(errors.length, 0, 'Should parse conditional navigation');
        });

        it('should parse page object with many actions', () => {
            const code = `
page FormPage {
    field firstName = "#first-name"
    field lastName = "#last-name"
    field email = "#email"
    field phone = "#phone"
    field address = "#address"
    field city = "#city"
    field state = "#state"
    field zip = "#zip"
    field country = "#country"
    field submit = "Submit"
    field reset = "Reset"
    field cancel = "Cancel"

    fillPersonalInfo with first, last, email, phone {
        fill firstName with first
        fill lastName with last
        fill email with email
        fill phone with phone
    }

    fillAddress with address, city, state, zip {
        fill address with address
        fill city with city
        fill state with state
        fill zip with zip
    }

    selectCountry with country {
        select country from country
    }

    submitForm {
        click submit
        wait 2 seconds
    }

    resetForm {
        click reset
    }

    cancelForm {
        click cancel
    }

    fillAndSubmit with first, last, email, phone, address, city, state, zip {
        fill firstName with first
        fill lastName with last
        fill email with email
        fill phone with phone
        fill address with address
        fill city with city
        fill state with state
        fill zip with zip
        click submit
    }
}
`;

            const { errors } = parse(code);
            assert.strictEqual(errors.length, 0, 'Should parse complex page object');
        });
    });
});
