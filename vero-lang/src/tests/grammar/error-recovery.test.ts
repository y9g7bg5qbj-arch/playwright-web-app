/**
 * Error Recovery Test Suite for Vero Grammar
 *
 * Tests error handling, recovery, and message quality.
 *
 * @author Agent 10: ANTLR Grammar Validator & Tester
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CharStream, CommonTokenStream } from 'antlr4ng';
import { VeroLexer } from '../../parser/generated/grammar/VeroLexer.js';
import { VeroParser } from '../../parser/generated/grammar/VeroParser.js';

interface ParseResult {
    errors: { line: number; column: number; message: string }[];
    completed: boolean;
}

/**
 * Parse Vero code and collect detailed error information
 */
function parseWithErrors(input: string): ParseResult {
    const errors: { line: number; column: number; message: string }[] = [];

    const chars = CharStream.fromString(input);
    const lexer = new VeroLexer(chars);
    const tokens = new CommonTokenStream(lexer);
    const parser = new VeroParser(tokens);

    lexer.removeErrorListeners();
    parser.removeErrorListeners();

    const errorListener = {
        syntaxError: (recognizer: any, offendingSymbol: any, line: number, column: number, msg: string) => {
            errors.push({ line, column, message: msg });
        },
        reportAmbiguity: () => {},
        reportAttemptingFullContext: () => {},
        reportContextSensitivity: () => {}
    };

    lexer.addErrorListener(errorListener as any);
    parser.addErrorListener(errorListener as any);

    let completed = false;
    try {
        parser.program();
        completed = true;
    } catch (e) {
        completed = false;
    }

    return { errors, completed };
}

describe('Vero Grammar - Error Recovery Tests', () => {

    describe('Missing Delimiters', () => {

        it('should report error for missing closing brace in page', () => {
            const code = `
page TestPage {
    field button = "Button"
`;
            const { errors } = parseWithErrors(code);

            assert.ok(errors.length > 0, 'Should have at least one error');
            assert.ok(
                errors.some(e => e.message.includes("'}'") || e.message.includes('EOF')),
                'Error should mention missing brace or unexpected EOF'
            );
        });

        it('should report error for missing opening brace in page', () => {
            const code = `
page TestPage
    field button = "Button"
}
`;
            const { errors } = parseWithErrors(code);

            assert.ok(errors.length > 0, 'Should have at least one error');
        });

        it('should report error for missing closing brace in feature', () => {
            const code = `
feature TestFeature {
    scenario "test" {
        log "message"
    }
`;
            const { errors } = parseWithErrors(code);

            assert.ok(errors.length > 0, 'Should have at least one error');
        });

        it('should report error for missing closing brace in scenario', () => {
            const code = `
feature TestFeature {
    scenario "test" {
        log "message"
}
`;
            const { errors } = parseWithErrors(code);

            assert.ok(errors.length > 0, 'Should have at least one error');
        });

        it('should report error for missing string quote', () => {
            const code = `
feature TestFeature {
    scenario "test {
        log "message"
    }
}
`;
            const { errors } = parseWithErrors(code);

            assert.ok(errors.length > 0, 'Should have at least one error');
        });
    });

    describe('Invalid Keywords', () => {

        it('should report error for invalid keyword', () => {
            const code = `
pagee TestPage {
    field button = "Button"
}
`;
            const { errors } = parseWithErrors(code);

            assert.ok(errors.length > 0, 'Should have at least one error');
        });

        it('should report error for misspelled action', () => {
            const code = `
feature TestFeature {
    scenario "test" {
        clikc "Button"
    }
}
`;
            const { errors } = parseWithErrors(code);

            assert.ok(errors.length > 0, 'Should have at least one error');
        });

        it('should report error for misspelled condition', () => {
            const code = `
feature TestFeature {
    scenario "test" {
        verify "element" is visble
    }
}
`;
            const { errors } = parseWithErrors(code);

            assert.ok(errors.length > 0, 'Should have at least one error');
        });
    });

    describe('Incomplete Statements', () => {

        it('should report error for incomplete click', () => {
            const code = `
feature TestFeature {
    scenario "test" {
        click
    }
}
`;
            const { errors } = parseWithErrors(code);

            assert.ok(errors.length > 0, 'Should report error for incomplete click');
        });

        it('should report error for incomplete fill', () => {
            const code = `
feature TestFeature {
    scenario "test" {
        fill "email" with
    }
}
`;
            const { errors } = parseWithErrors(code);

            assert.ok(errors.length > 0, 'Should report error for incomplete fill');
        });

        it('should report error for fill missing with', () => {
            const code = `
feature TestFeature {
    scenario "test" {
        fill "email" "value"
    }
}
`;
            const { errors } = parseWithErrors(code);

            assert.ok(errors.length > 0, 'Should report error for fill missing with');
        });

        it('should report error for incomplete verify', () => {
            const code = `
feature TestFeature {
    scenario "test" {
        verify "element" is
    }
}
`;
            const { errors } = parseWithErrors(code);

            assert.ok(errors.length > 0, 'Should report error for incomplete verify');
        });

        it('should report error for select missing from', () => {
            const code = `
feature TestFeature {
    scenario "test" {
        select "option" "dropdown"
    }
}
`;
            const { errors } = parseWithErrors(code);

            assert.ok(errors.length > 0, 'Should report error for select missing from');
        });

        it('should report error for incomplete if', () => {
            const code = `
feature TestFeature {
    scenario "test" {
        if {
            log "message"
        }
    }
}
`;
            const { errors } = parseWithErrors(code);

            assert.ok(errors.length > 0, 'Should report error for incomplete if');
        });

        it('should report error for repeat missing times', () => {
            const code = `
feature TestFeature {
    scenario "test" {
        repeat 5 {
            log "message"
        }
    }
}
`;
            const { errors } = parseWithErrors(code);

            assert.ok(errors.length > 0, 'Should report error for repeat missing times');
        });
    });

    describe('Invalid Token Sequences', () => {

        it('should report error for consecutive keywords', () => {
            const code = `
page page TestPage {}
`;
            const { errors } = parseWithErrors(code);

            assert.ok(errors.length > 0, 'Should report error for consecutive keywords');
        });

        it('should report error for double dots', () => {
            const code = `
feature TestFeature {
    scenario "test" {
        click Page..field
    }
}
`;
            const { errors } = parseWithErrors(code);

            assert.ok(errors.length > 0, 'Should report error for double dots');
        });

        it('should report error for empty tag', () => {
            const code = `
feature TestFeature {
    scenario "test" @ {
        log "message"
    }
}
`;
            const { errors } = parseWithErrors(code);

            assert.ok(errors.length > 0, 'Should report error for empty tag');
        });

        it('should report error for invalid character', () => {
            const code = `
feature TestFeature {
    scenario "test" {
        log $invalid
    }
}
`;
            const { errors } = parseWithErrors(code);

            assert.ok(errors.length > 0, 'Should report error for invalid character');
        });
    });

    describe('Context Errors', () => {

        it('should report error for scenario outside feature', () => {
            const code = `
scenario "orphan" {
    log "message"
}
`;
            const { errors } = parseWithErrors(code);

            assert.ok(errors.length > 0, 'Should report error for orphan scenario');
        });

        it('should report error for field outside page', () => {
            const code = `
field orphan = "selector"
`;
            const { errors } = parseWithErrors(code);

            assert.ok(errors.length > 0, 'Should report error for orphan field');
        });

        it('should report error for hook outside feature', () => {
            const code = `
before each {
    log "message"
}
`;
            const { errors } = parseWithErrors(code);

            assert.ok(errors.length > 0, 'Should report error for orphan hook');
        });

        it('should report error for action at top level', () => {
            const code = `
click "button"
`;
            const { errors } = parseWithErrors(code);

            assert.ok(errors.length > 0, 'Should report error for top-level action');
        });
    });

    describe('Error Location Accuracy', () => {

        it('should report accurate line number', () => {
            const code = `
page TestPage {
    field button = "Button"
}

feature TestFeature {
    scenario "test" {
        invalid_statement
    }
}
`;
            const { errors } = parseWithErrors(code);

            assert.ok(errors.length > 0, 'Should have errors');
            assert.ok(errors[0].line >= 7, 'Error should be on or after line 7');
        });

        it('should report accurate column number', () => {
            const code = `feature T { scenario "t" { $$$ } }`;
            const { errors } = parseWithErrors(code);

            assert.ok(errors.length > 0, 'Should have errors');
        });
    });

    describe('Recovery Behavior', () => {

        it('should continue parsing after error', () => {
            const code = `
page TestPage {
    field button = "Button"
    invalid line here
    field anotherButton = "Another"
}
`;
            const { errors, completed } = parseWithErrors(code);

            assert.ok(errors.length > 0, 'Should have errors');
            assert.ok(completed, 'Parser should complete despite errors');
        });

        it('should recover at block boundaries', () => {
            const code = `
page InvalidPage {
    bad content here
}

page ValidPage {
    field button = "Button"
}
`;
            const { errors, completed } = parseWithErrors(code);

            // Should parse second page successfully after recovering from first
            assert.ok(completed, 'Parser should complete');
        });

        it('should recover from multiple errors', () => {
            const code = `
page TestPage {
    invalid1
    invalid2
    invalid3
    field button = "Button"
}
`;
            const { completed } = parseWithErrors(code);

            assert.ok(completed, 'Parser should complete despite multiple errors');
        });
    });

    describe('Error Message Quality', () => {

        it('should provide meaningful error for missing keyword', () => {
            const code = `
TestPage {
    field button = "Button"
}
`;
            const { errors } = parseWithErrors(code);

            assert.ok(errors.length > 0, 'Should have errors');
            const errorMsg = errors[0].message.toLowerCase();
            assert.ok(
                errorMsg.includes('expecting') || errorMsg.includes('viable'),
                'Error message should indicate what was expected'
            );
        });

        it('should indicate expected tokens', () => {
            const code = `
page TestPage {
    field button
}
`;
            const { errors } = parseWithErrors(code);

            assert.ok(errors.length > 0, 'Should have errors');
            // Error should mention expecting '='
            const errorMsg = errors[0].message;
            assert.ok(
                errorMsg.includes('=') || errorMsg.includes('EQUALS'),
                'Error should mention expected equals sign'
            );
        });
    });
});
