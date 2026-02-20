/**
 * TRY/CATCH and API Testing Primitive Tests
 *
 * Tests parsing and transpiling of:
 * - TRY { ... } CATCH { ... } blocks
 * - API GET/POST/PUT/DELETE/PATCH requests
 * - VERIFY RESPONSE STATUS/BODY/HEADERS assertions
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { tokenize } from '../../lexer/index.js';
import { parse } from '../../parser/index.js';
import { transpile } from '../../transpiler/index.js';
import type {
    TryCatchStatement, ApiRequestStatement, VerifyResponseStatement,
    StatementNode, ProgramNode
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

// ==================== TRY/CATCH Parsing ====================

describe('TRY/CATCH Parsing', () => {
    it('should parse a basic TRY/CATCH block', () => {
        const source = `
FEATURE TestFeature {
    SCENARIO TestScenario {
        TRY {
            log "trying"
        } CATCH {
            log "caught"
        }
    }
}`;
        const statements = parseStatements(source);
        assert.strictEqual(statements.length, 1);

        const stmt = statements[0] as TryCatchStatement;
        assert.strictEqual(stmt.type, 'TryCatch');
        assert.strictEqual(stmt.tryStatements.length, 1);
        assert.strictEqual(stmt.catchStatements.length, 1);
        assert.strictEqual(stmt.tryStatements[0].type, 'Log');
        assert.strictEqual(stmt.catchStatements[0].type, 'Log');
    });

    it('should parse TRY/CATCH with multiple statements', () => {
        const source = `
FEATURE TestFeature {
    SCENARIO TestScenario {
        TRY {
            log "step 1"
            log "step 2"
            refresh
        } CATCH {
            log "error occurred"
            take screenshot "error"
        }
    }
}`;
        const statements = parseStatements(source);
        const stmt = statements[0] as TryCatchStatement;
        assert.strictEqual(stmt.tryStatements.length, 3);
        assert.strictEqual(stmt.catchStatements.length, 2);
    });

    it('should parse nested TRY/CATCH blocks', () => {
        const source = `
FEATURE TestFeature {
    SCENARIO TestScenario {
        TRY {
            TRY {
                log "inner try"
            } CATCH {
                log "inner catch"
            }
        } CATCH {
            log "outer catch"
        }
    }
}`;
        const statements = parseStatements(source);
        const outer = statements[0] as TryCatchStatement;
        assert.strictEqual(outer.type, 'TryCatch');
        const inner = outer.tryStatements[0] as TryCatchStatement;
        assert.strictEqual(inner.type, 'TryCatch');
    });
});

// ==================== TRY/CATCH Transpilation ====================

describe('TRY/CATCH Transpilation', () => {
    it('should transpile to JavaScript try/catch', () => {
        const source = `
FEATURE TestFeature {
    SCENARIO TestScenario {
        TRY {
            log "trying"
        } CATCH {
            log "caught"
        }
    }
}`;
        const output = transpileVero(source);
        assert.ok(output.includes('try {'), 'Expected try block');
        assert.ok(output.includes('} catch (__error) {'), 'Expected catch block with __error parameter');
        assert.ok(output.includes("'trying'"), 'Expected try body content');
        assert.ok(output.includes("'caught'"), 'Expected catch body content');
    });
});

// ==================== API Request Parsing ====================

describe('API Request Parsing', () => {
    it('should parse API GET', () => {
        const source = `
FEATURE TestFeature {
    SCENARIO TestScenario {
        API GET "https://api.example.com/users"
    }
}`;
        const statements = parseStatements(source);
        const stmt = statements[0] as ApiRequestStatement;
        assert.strictEqual(stmt.type, 'ApiRequest');
        assert.strictEqual(stmt.method, 'GET');
        assert.strictEqual(stmt.url.type, 'StringLiteral');
        assert.strictEqual((stmt.url as any).value, 'https://api.example.com/users');
        assert.strictEqual(stmt.body, undefined);
        assert.strictEqual(stmt.headers, undefined);
    });

    it('should parse API POST with body', () => {
        const source = `
FEATURE TestFeature {
    SCENARIO TestScenario {
        API POST "https://api.example.com/users" WITH BODY "{\\"name\\": \\"John\\"}"
    }
}`;
        const statements = parseStatements(source);
        const stmt = statements[0] as ApiRequestStatement;
        assert.strictEqual(stmt.type, 'ApiRequest');
        assert.strictEqual(stmt.method, 'POST');
        assert.ok(stmt.body, 'Expected body');
    });

    it('should parse API PUT with body and headers', () => {
        const source = `
FEATURE TestFeature {
    SCENARIO TestScenario {
        API PUT "https://api.example.com/users/1" WITH BODY userData WITH HEADERS authHeaders
    }
}`;
        const statements = parseStatements(source);
        const stmt = statements[0] as ApiRequestStatement;
        assert.strictEqual(stmt.method, 'PUT');
        assert.ok(stmt.body, 'Expected body');
        assert.ok(stmt.headers, 'Expected headers');
    });

    it('should parse API DELETE', () => {
        const source = `
FEATURE TestFeature {
    SCENARIO TestScenario {
        API DELETE "https://api.example.com/users/1"
    }
}`;
        const statements = parseStatements(source);
        const stmt = statements[0] as ApiRequestStatement;
        assert.strictEqual(stmt.method, 'DELETE');
    });

    it('should parse API PATCH', () => {
        const source = `
FEATURE TestFeature {
    SCENARIO TestScenario {
        API PATCH "https://api.example.com/users/1" WITH BODY patchData
    }
}`;
        const statements = parseStatements(source);
        const stmt = statements[0] as ApiRequestStatement;
        assert.strictEqual(stmt.method, 'PATCH');
        assert.ok(stmt.body, 'Expected body');
    });
});

// ==================== API Request Transpilation ====================

describe('API Request Transpilation', () => {
    it('should transpile API GET to request.get()', () => {
        const source = `
FEATURE TestFeature {
    SCENARIO TestScenario {
        API GET "https://api.example.com/users"
    }
}`;
        const output = transpileVero(source);
        assert.ok(output.includes('request.get('), 'Expected request.get() call');
        assert.ok(output.includes('__vero_apiResponse'), 'Expected __vero_apiResponse assignment');
        assert.ok(output.includes('{ request }') || output.includes(', request'), 'Expected request in fixture params');
    });

    it('should transpile API POST with body to request.post() with data', () => {
        const source = `
FEATURE TestFeature {
    SCENARIO TestScenario {
        API POST "https://api.example.com/users" WITH BODY requestBody
    }
}`;
        const output = transpileVero(source);
        assert.ok(output.includes('request.post('), 'Expected request.post() call');
        assert.ok(output.includes('data: requestBody'), 'Expected data option');
    });

    it('should include request in scenario destructuring', () => {
        const source = `
FEATURE TestFeature {
    SCENARIO TestScenario {
        API GET "https://api.example.com"
    }
}`;
        const output = transpileVero(source);
        assert.ok(output.includes('request'), 'Expected request fixture in test signature');
    });

    it('should declare __vero_apiResponse variable when API is used', () => {
        const source = `
FEATURE TestFeature {
    SCENARIO TestScenario {
        API GET "https://api.example.com"
    }
}`;
        const output = transpileVero(source);
        assert.ok(output.includes('let __vero_apiResponse: any'), 'Expected __vero_apiResponse declaration');
    });
});

// ==================== VERIFY RESPONSE Parsing ====================

describe('VERIFY RESPONSE Parsing', () => {
    it('should parse VERIFY RESPONSE STATUS EQUALS', () => {
        const source = `
FEATURE TestFeature {
    SCENARIO TestScenario {
        VERIFY RESPONSE STATUS EQUALS 200
    }
}`;
        const statements = parseStatements(source);
        const stmt = statements[0] as VerifyResponseStatement;
        assert.strictEqual(stmt.type, 'VerifyResponse');
        assert.strictEqual(stmt.condition.type, 'Status');
        assert.strictEqual(stmt.condition.operator, 'equals');
    });

    it('should parse VERIFY RESPONSE BODY CONTAINS', () => {
        const source = `
FEATURE TestFeature {
    SCENARIO TestScenario {
        VERIFY RESPONSE BODY CONTAINS "success"
    }
}`;
        const statements = parseStatements(source);
        const stmt = statements[0] as VerifyResponseStatement;
        assert.strictEqual(stmt.condition.type, 'Body');
        assert.strictEqual(stmt.condition.operator, 'contains');
    });

    it('should parse VERIFY RESPONSE HEADERS CONTAINS', () => {
        const source = `
FEATURE TestFeature {
    SCENARIO TestScenario {
        VERIFY RESPONSE HEADERS CONTAINS "application/json"
    }
}`;
        const statements = parseStatements(source);
        const stmt = statements[0] as VerifyResponseStatement;
        assert.strictEqual(stmt.condition.type, 'Headers');
        assert.strictEqual(stmt.condition.operator, 'contains');
    });
});

// ==================== VERIFY RESPONSE Transpilation ====================

describe('VERIFY RESPONSE Transpilation', () => {
    it('should transpile VERIFY RESPONSE STATUS EQUALS to expect', () => {
        const source = `
FEATURE TestFeature {
    SCENARIO TestScenario {
        API GET "https://api.example.com"
        VERIFY RESPONSE STATUS EQUALS 200
    }
}`;
        const output = transpileVero(source);
        assert.ok(output.includes('__vero_apiResponse.status()'), 'Expected status() check');
        assert.ok(output.includes('.toBe(200)'), 'Expected toBe(200)');
    });

    it('should transpile VERIFY RESPONSE BODY CONTAINS to expect toContain', () => {
        const source = `
FEATURE TestFeature {
    SCENARIO TestScenario {
        API GET "https://api.example.com"
        VERIFY RESPONSE BODY CONTAINS "success"
    }
}`;
        const output = transpileVero(source);
        assert.ok(output.includes('__vero_apiResponse.text()'), 'Expected text() call');
        assert.ok(output.includes('.toContain('), 'Expected toContain');
    });
});

// ==================== Combined TRY/CATCH + API ====================

describe('Combined TRY/CATCH + API', () => {
    it('should parse API calls inside TRY/CATCH blocks', () => {
        const source = `
FEATURE TestFeature {
    SCENARIO TestScenario {
        TRY {
            API GET "https://api.example.com/users"
            VERIFY RESPONSE STATUS EQUALS 200
        } CATCH {
            log "API call failed"
        }
    }
}`;
        const statements = parseStatements(source);
        const stmt = statements[0] as TryCatchStatement;
        assert.strictEqual(stmt.tryStatements.length, 2);
        assert.strictEqual(stmt.tryStatements[0].type, 'ApiRequest');
        assert.strictEqual(stmt.tryStatements[1].type, 'VerifyResponse');
        assert.strictEqual(stmt.catchStatements[0].type, 'Log');
    });

    it('should detect API usage inside TRY/CATCH for request fixture', () => {
        const source = `
FEATURE TestFeature {
    SCENARIO TestScenario {
        TRY {
            API GET "https://api.example.com"
        } CATCH {
            log "failed"
        }
    }
}`;
        const output = transpileVero(source);
        assert.ok(output.includes('request'), 'Expected request fixture even when API is inside TRY/CATCH');
    });
});
