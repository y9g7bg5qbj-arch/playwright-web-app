/**
 * MOCK API Statement Tests
 *
 * Tests parsing and transpiling of:
 * - MOCK API "url" WITH STATUS n
 * - MOCK API "url" WITH STATUS n AND BODY "..."
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { tokenize } from '../../lexer/index.js';
import { parse } from '../../parser/index.js';
import { transpile } from '../../transpiler/index.js';
import type {
    MockApiStatement, StatementNode, ProgramNode
} from '../../parser/ast.js';

/** Parse Vero source and return the AST */
function parseVero(source: string): ProgramNode {
    const { tokens, errors: lexErrors } = tokenize(source);
    assert.strictEqual(lexErrors.length, 0, `Lexer errors: ${lexErrors.map(e => e.message).join(', ')}`);
    const { ast, errors: parseErrors } = parse(tokens);
    assert.strictEqual(parseErrors.length, 0, `Parse errors: ${parseErrors.map(e => e.message).join(', ')}`);
    return ast;
}

/** Parse and return statements from the first scenario */
function parseStatements(source: string): StatementNode[] {
    const ast = parseVero(source);
    assert.ok(ast.features.length > 0, 'Expected at least one feature');
    assert.ok(ast.features[0].scenarios.length > 0, 'Expected at least one scenario');
    return ast.features[0].scenarios[0].statements;
}

/** Parse and transpile, returning generated test code */
function transpileVero(source: string): string {
    const ast = parseVero(source);
    const result = transpile(ast);
    const tests = [...result.tests.values()];
    assert.ok(tests.length > 0, 'Expected at least one test output');
    return tests[0];
}

// ==================== MOCK API Parsing ====================

describe('MOCK API Parsing', () => {
    it('should parse MOCK API with status only', () => {
        const source = `
FEATURE TestFeature {
    SCENARIO TestScenario {
        MOCK API "https://api.example.com/users" WITH STATUS 200
    }
}`;
        const statements = parseStatements(source);
        assert.strictEqual(statements.length, 1);

        const stmt = statements[0] as MockApiStatement;
        assert.strictEqual(stmt.type, 'MockApi');
        assert.strictEqual(stmt.url.type, 'StringLiteral');
        assert.strictEqual((stmt.url as any).value, 'https://api.example.com/users');
        assert.strictEqual(stmt.status.type, 'NumberLiteral');
        assert.strictEqual((stmt.status as any).value, 200);
        assert.strictEqual(stmt.body, undefined);
    });

    it('should parse MOCK API with status and body', () => {
        const source = `
FEATURE TestFeature {
    SCENARIO TestScenario {
        MOCK API "https://api.example.com/users" WITH STATUS 200 AND BODY "{\\"data\\": []}"
    }
}`;
        const statements = parseStatements(source);
        assert.strictEqual(statements.length, 1);

        const stmt = statements[0] as MockApiStatement;
        assert.strictEqual(stmt.type, 'MockApi');
        assert.ok(stmt.body, 'Expected body');
        assert.strictEqual(stmt.body!.type, 'StringLiteral');
    });

    it('should parse MOCK API with variable references', () => {
        const source = `
FEATURE TestFeature {
    SCENARIO TestScenario {
        MOCK API apiUrl WITH STATUS 404 AND BODY errorBody
    }
}`;
        const statements = parseStatements(source);
        const stmt = statements[0] as MockApiStatement;
        assert.strictEqual(stmt.type, 'MockApi');
        assert.strictEqual(stmt.url.type, 'VariableReference');
        assert.strictEqual(stmt.status.type, 'NumberLiteral');
        assert.strictEqual(stmt.body!.type, 'VariableReference');
    });

    it('should parse MOCK API alongside other statements', () => {
        const source = `
FEATURE TestFeature {
    SCENARIO TestScenario {
        MOCK API "https://api.example.com/data" WITH STATUS 200 AND BODY "[]"
        OPEN "https://app.example.com"
        CLICK LoginPage.submitButton
    }
}`;
        const statements = parseStatements(source);
        assert.strictEqual(statements.length, 3);
        assert.strictEqual(statements[0].type, 'MockApi');
        assert.strictEqual(statements[1].type, 'Open');
        assert.strictEqual(statements[2].type, 'Click');
    });
});

// ==================== MOCK API Transpilation ====================

describe('MOCK API Transpilation', () => {
    it('should transpile MOCK API to page.route() with route.fulfill()', () => {
        const source = `
FEATURE TestFeature {
    SCENARIO TestScenario {
        MOCK API "https://api.example.com/users" WITH STATUS 200
    }
}`;
        const output = transpileVero(source);
        assert.ok(output.includes('page.route('), 'Expected page.route() call');
        assert.ok(output.includes('route.fulfill('), 'Expected route.fulfill() call');
        assert.ok(output.includes('status: 200'), 'Expected status: 200');
        assert.ok(output.includes("'https://api.example.com/users'"), 'Expected URL string');
    });

    it('should transpile MOCK API with body to route.fulfill() with body', () => {
        const source = `
FEATURE TestFeature {
    SCENARIO TestScenario {
        MOCK API "https://api.example.com/users" WITH STATUS 200 AND BODY "{\\"items\\": []}"
    }
}`;
        const output = transpileVero(source);
        assert.ok(output.includes('page.route('), 'Expected page.route() call');
        assert.ok(output.includes('route.fulfill('), 'Expected route.fulfill() call');
        assert.ok(output.includes('status: 200'), 'Expected status: 200');
        assert.ok(output.includes('body:'), 'Expected body in fulfill options');
        assert.ok(output.includes("contentType: 'application/json'"), 'Expected JSON content type');
    });

    it('should generate test.step wrapper for MOCK API', () => {
        const source = `
FEATURE TestFeature {
    SCENARIO TestScenario {
        MOCK API "https://api.example.com" WITH STATUS 404
    }
}`;
        const output = transpileVero(source);
        assert.ok(output.includes("test.step('Mock API"), 'Expected test.step with Mock API label');
    });

    it('should transpile MOCK API with status 404 for error mocking', () => {
        const source = `
FEATURE TestFeature {
    SCENARIO TestScenario {
        MOCK API "https://api.example.com/fail" WITH STATUS 500 AND BODY "{\\"error\\": \\"Internal Server Error\\"}"
    }
}`;
        const output = transpileVero(source);
        assert.ok(output.includes('status: 500'), 'Expected status: 500');
        assert.ok(output.includes('route.fulfill('), 'Expected route.fulfill()');
    });
});
