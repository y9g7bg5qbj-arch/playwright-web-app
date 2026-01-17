// Test script for Extended Actions (Phase 1)
import { tokenize } from './dist/lexer/lexer.js';
import { Parser } from './dist/parser/parser.js';
import { Transpiler } from './dist/transpiler/transpiler.js';

const testCases = [
    {
        name: 'RIGHT CLICK',
        vero: 'feature ExtendedActions { scenario "Right Click" { right click "Menu" } }',
        expected: "click({ button: 'right' })"
    },
    {
        name: 'DOUBLE CLICK',
        vero: 'feature ExtendedActions { scenario "Double Click" { double click "Cell" } }',
        expected: '.dblclick()'
    },
    {
        name: 'FORCE CLICK',
        vero: 'feature ExtendedActions { scenario "Force Click" { force click "Button" } }',
        expected: "click({ force: true })"
    },
    {
        name: 'DRAG to element',
        vero: 'feature ExtendedActions { scenario "Drag Element" { drag "Source" to "Target" } }',
        expected: '.dragTo('
    },
    {
        name: 'DRAG to coordinates',
        vero: 'feature ExtendedActions { scenario "Drag Coords" { drag "Item" to x=100 y=200 } }',
        expected: 'targetPosition: { x: 100, y: 200 }'
    }
];

console.log('Testing Extended Actions (Phase 1)\n');
console.log('='.repeat(50));

let passed = 0;
let failed = 0;

for (const test of testCases) {
    console.log(`\nTest: ${test.name}`);
    console.log(`Input: ${test.vero}`);

    try {
        const { tokens, errors: lexErrors } = tokenize(test.vero);
        if (lexErrors.length > 0) {
            throw new Error(`Lexer errors: ${JSON.stringify(lexErrors)}`);
        }

        const parser = new Parser(tokens);
        const { ast, errors: parseErrors } = parser.parse();
        if (parseErrors.length > 0) {
            throw new Error(`Parser errors: ${JSON.stringify(parseErrors)}`);
        }

        const transpiler = new Transpiler();
        const result = transpiler.transpile(ast);

        // Get the test code
        const testCode = result.tests.values().next().value;

        if (testCode && testCode.includes(test.expected)) {
            console.log(`✓ PASSED: Found expected output`);
            console.log(`  Expected: ${test.expected}`);
            passed++;
        } else {
            console.log(`✗ FAILED: Expected output not found`);
            console.log(`  Expected: ${test.expected}`);
            console.log(`  Got: ${testCode?.substring(0, 500)}...`);
            failed++;
        }
    } catch (e) {
        console.log(`✗ FAILED: ${e.message}`);
        failed++;
    }
}

console.log('\n' + '='.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);

process.exit(failed > 0 ? 1 : 0);
