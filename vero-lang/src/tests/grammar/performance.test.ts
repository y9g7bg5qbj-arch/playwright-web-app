/**
 * Performance Test Suite for Vero Grammar
 *
 * Tests parser performance with large files, deep nesting,
 * and stress conditions.
 *
 * @author Agent 10: ANTLR Grammar Validator & Tester
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CharStream, CommonTokenStream } from 'antlr4ng';
import { VeroLexer } from '../../parser/generated/grammar/VeroLexer.js';
import { VeroParser } from '../../parser/generated/grammar/VeroParser.js';

/**
 * Parse Vero code and measure performance
 */
function parseWithTiming(input: string): { duration: number; errors: string[] } {
    const errors: string[] = [];

    const start = performance.now();

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

    const duration = performance.now() - start;

    return { duration, errors };
}

/**
 * Generate a feature with N scenarios
 */
function generateLargeFeature(scenarioCount: number): string {
    const scenarios = Array.from({ length: scenarioCount }, (_, i) => `
    scenario "Test scenario ${i}" @tag${i % 10} {
        open "/page${i}"
        wait 1 seconds
        fill "input${i}" with "value${i}"
        click "button${i}"
        verify "result${i}" is visible
        log "Completed scenario ${i}"
    }`).join('\n');

    return `
page TestPage {
    field input = "#input"
    field button = "Button"
    field result = ".result"
}

feature LargeFeature {
    use TestPage

    before each {
        open "/test"
        log "Starting test"
    }

    after each {
        take screenshot
    }

${scenarios}
}`;
}

/**
 * Generate deeply nested control flow
 */
function generateDeeplyNested(depth: number): string {
    let open = '';
    let close = '';

    for (let i = 0; i < depth; i++) {
        open += `if element${i} is visible {\n`;
        close = `}\n` + close;
    }

    return `
feature NestedFeature {
    scenario "Deep nesting" {
${open}
        log "Reached depth ${depth}"
${close}
    }
}`;
}

/**
 * Generate page with many fields
 */
function generateLargePage(fieldCount: number): string {
    const fields = Array.from({ length: fieldCount }, (_, i) =>
        `    field field${i} = "#element-${i}"`
    ).join('\n');

    return `
page LargePage {
${fields}

    doSomething {
        click field0
    }
}`;
}

/**
 * Generate feature with many hooks and uses
 */
function generateComplexFeature(): string {
    const pages = Array.from({ length: 10 }, (_, i) =>
        `page Page${i} { field f = "#f${i}" }`
    ).join('\n');

    const uses = Array.from({ length: 10 }, (_, i) =>
        `    use Page${i}`
    ).join('\n');

    return `
${pages}

feature ComplexFeature {
${uses}

    before all {
        log "Suite start"
        open "/setup"
        wait 2 seconds
    }

    before each {
        log "Test start"
        refresh
    }

    after each {
        take screenshot "result"
        log "Test end"
    }

    after all {
        log "Suite end"
    }

    scenario "Test 1" @smoke @critical @p0 @regression @feature1 {
        repeat 5 times {
            if Page0.f is visible {
                click Page0.f
                wait 100 milliseconds
            }
        }
    }

    scenario "Test 2" @regression @p1 {
        text var1 = "value1"
        number var2 = 123
        flag var3 = "true"
        fill "input" with var1
        if var2 > 100 {
            log "Large number"
        }
    }
}`;
}

describe('Vero Grammar - Performance Tests', () => {

    describe('Large File Parsing', () => {

        it('should parse 10 scenarios in < 100ms', () => {
            const code = generateLargeFeature(10);
            const { duration, errors } = parseWithTiming(code);

            assert.strictEqual(errors.length, 0, 'Should parse without errors');
            assert.ok(duration < 100, `Should complete in < 100ms, took ${duration.toFixed(2)}ms`);
        });

        it('should parse 50 scenarios in < 200ms', () => {
            const code = generateLargeFeature(50);
            const { duration, errors } = parseWithTiming(code);

            assert.strictEqual(errors.length, 0, 'Should parse without errors');
            assert.ok(duration < 200, `Should complete in < 200ms, took ${duration.toFixed(2)}ms`);
        });

        it('should parse 100 scenarios in < 500ms', () => {
            const code = generateLargeFeature(100);
            const { duration, errors } = parseWithTiming(code);

            assert.strictEqual(errors.length, 0, 'Should parse without errors');
            assert.ok(duration < 500, `Should complete in < 500ms, took ${duration.toFixed(2)}ms`);
        });

        it('should parse 500 scenarios in < 2 seconds', () => {
            const code = generateLargeFeature(500);
            const { duration, errors } = parseWithTiming(code);

            assert.strictEqual(errors.length, 0, 'Should parse without errors');
            assert.ok(duration < 2000, `Should complete in < 2s, took ${duration.toFixed(2)}ms`);
        });

        it('should parse 1000 scenarios in < 5 seconds', () => {
            const code = generateLargeFeature(1000);
            const { duration, errors } = parseWithTiming(code);

            assert.strictEqual(errors.length, 0, 'Should parse without errors');
            assert.ok(duration < 5000, `Should complete in < 5s, took ${duration.toFixed(2)}ms`);
        });
    });

    describe('Deep Nesting Performance', () => {

        it('should parse 5 levels of nesting', () => {
            const code = generateDeeplyNested(5);
            const { duration, errors } = parseWithTiming(code);

            assert.strictEqual(errors.length, 0, 'Should parse without errors');
            assert.ok(duration < 50, `Should complete in < 50ms, took ${duration.toFixed(2)}ms`);
        });

        it('should parse 10 levels of nesting', () => {
            const code = generateDeeplyNested(10);
            const { duration, errors } = parseWithTiming(code);

            assert.strictEqual(errors.length, 0, 'Should parse without errors');
            assert.ok(duration < 100, `Should complete in < 100ms, took ${duration.toFixed(2)}ms`);
        });

        it('should parse 20 levels of nesting', () => {
            const code = generateDeeplyNested(20);
            const { duration, errors } = parseWithTiming(code);

            assert.strictEqual(errors.length, 0, 'Should parse without errors');
            assert.ok(duration < 200, `Should complete in < 200ms, took ${duration.toFixed(2)}ms`);
        });

        it('should parse 50 levels of nesting', () => {
            const code = generateDeeplyNested(50);
            const { duration, errors } = parseWithTiming(code);

            assert.strictEqual(errors.length, 0, 'Should parse without errors');
            assert.ok(duration < 500, `Should complete in < 500ms, took ${duration.toFixed(2)}ms`);
        });
    });

    describe('Large Page Performance', () => {

        it('should parse page with 50 fields', () => {
            const code = generateLargePage(50);
            const { duration, errors } = parseWithTiming(code);

            assert.strictEqual(errors.length, 0, 'Should parse without errors');
            assert.ok(duration < 100, `Should complete in < 100ms, took ${duration.toFixed(2)}ms`);
        });

        it('should parse page with 100 fields', () => {
            const code = generateLargePage(100);
            const { duration, errors } = parseWithTiming(code);

            assert.strictEqual(errors.length, 0, 'Should parse without errors');
            assert.ok(duration < 200, `Should complete in < 200ms, took ${duration.toFixed(2)}ms`);
        });

        it('should parse page with 500 fields', () => {
            const code = generateLargePage(500);
            const { duration, errors } = parseWithTiming(code);

            assert.strictEqual(errors.length, 0, 'Should parse without errors');
            assert.ok(duration < 500, `Should complete in < 500ms, took ${duration.toFixed(2)}ms`);
        });
    });

    describe('Complex Feature Performance', () => {

        it('should parse complex feature with multiple pages and hooks', () => {
            const code = generateComplexFeature();
            const { duration, errors } = parseWithTiming(code);

            assert.strictEqual(errors.length, 0, 'Should parse without errors');
            assert.ok(duration < 100, `Should complete in < 100ms, took ${duration.toFixed(2)}ms`);
        });
    });

    describe('Repeated Parsing Performance', () => {

        it('should maintain consistent performance over 100 parses', () => {
            const code = generateLargeFeature(10);
            const durations: number[] = [];

            for (let i = 0; i < 100; i++) {
                const { duration } = parseWithTiming(code);
                durations.push(duration);
            }

            const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
            const max = Math.max(...durations);
            const min = Math.min(...durations);

            assert.ok(avg < 50, `Average should be < 50ms, was ${avg.toFixed(2)}ms`);
            assert.ok(max < 200, `Max should be < 200ms, was ${max.toFixed(2)}ms`);
            console.log(`Parse times: avg=${avg.toFixed(2)}ms, min=${min.toFixed(2)}ms, max=${max.toFixed(2)}ms`);
        });
    });
});
