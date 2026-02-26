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

describe('VDQL - ROW Statements', () => {
    describe('Parsing', () => {
        it('parses basic ROW statement', () => {
            const { errors } = parseStatement('ROW user = Users');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses ROW with FROM keyword', () => {
            const { errors } = parseStatement('ROW user FROM Users');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses ROW with FIRST modifier', () => {
            const { errors } = parseStatement('ROW user = FIRST Users');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses ROW with LAST modifier', () => {
            const { errors } = parseStatement('ROW user = LAST Users');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses ROW with RANDOM modifier', () => {
            const { errors } = parseStatement('ROW user = RANDOM Users');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses ROW with WHERE clause', () => {
            const { errors } = parseStatement('ROW user = Users WHERE state = "CA"');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses ROW with WHERE and ORDER BY', () => {
            const { errors } = parseStatement('ROW user = FIRST Users WHERE active = "true" ORDER BY name');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses ROW with cross-project table reference', () => {
            const { errors } = parseStatement('ROW user = ProjectB.Users');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });
    });

    describe('Transpilation', () => {
        it('transpiles basic ROW to find first matching', () => {
            const code = transpileFirstTest(`
                FEATURE RowTest {
                    SCENARIO BasicRow {
                        ROW user = Users
                    }
                }
            `);
            assert.ok(code.includes('Data.Users'), `Expected Data.Users in: ${code}`);
            assert.ok(code.includes('const user'), `Expected const user in: ${code}`);
        });

        it('transpiles ROW with WHERE to filter + find', () => {
            const code = transpileFirstTest(`
                FEATURE RowTest {
                    SCENARIO FilteredRow {
                        ROW user = Users WHERE state = "CA"
                    }
                }
            `);
            assert.ok(code.includes('Data.Users'), `Expected Data.Users in: ${code}`);
            assert.ok(code.includes('find'), `Expected find in: ${code}`);
            assert.ok(code.includes('state'), `Expected state filter in: ${code}`);
        });

        it('transpiles ROW FIRST with ORDER BY', () => {
            const code = transpileFirstTest(`
                FEATURE RowTest {
                    SCENARIO SortedRow {
                        ROW user = FIRST Users ORDER BY name
                    }
                }
            `);
            assert.ok(code.includes('sort'), `Expected sort in: ${code}`);
        });

        it('loads __env__ when ROW WHERE uses environment variables', () => {
            const code = transpileFirstTest(`
                FEATURE RowTest {
                    SCENARIO EnvRow {
                        ROW user = FIRST Users WHERE environment = {{environment}} and state = {{state}}
                    }
                }
            `);
            assert.ok(code.includes("const __env__: Record<string, string> = JSON.parse(process.env.VERO_ENV_VARS || '{}');"), `Expected __env__ declaration in: ${code}`);
            assert.ok(code.includes("__env__['environment']"), `Expected environment lookup in: ${code}`);
            assert.ok(code.includes("__env__['state']"), `Expected state lookup in: ${code}`);
        });
    });
});

describe('VDQL - ROWS Statements', () => {
    describe('Parsing', () => {
        it('parses basic ROWS statement', () => {
            const { errors } = parseStatement('ROWS users = Users');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses ROWS with WHERE', () => {
            const { errors } = parseStatement('ROWS activeUsers = Users WHERE active = "true"');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses ROWS with ORDER BY', () => {
            const { errors } = parseStatement('ROWS users = Users ORDER BY name ASC');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses ROWS with LIMIT', () => {
            const { errors } = parseStatement('ROWS users = Users LIMIT 10');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses ROWS with LIMIT and OFFSET', () => {
            const { errors } = parseStatement('ROWS users = Users LIMIT 10 OFFSET 5');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses ROWS with all clauses', () => {
            const { errors } = parseStatement('ROWS users = Users WHERE state = "CA" ORDER BY name DESC LIMIT 10 OFFSET 5');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });
    });

    describe('Transpilation', () => {
        it('transpiles ROWS with LIMIT to slice', () => {
            const code = transpileFirstTest(`
                FEATURE RowsTest {
                    SCENARIO LimitedRows {
                        ROWS users = Users LIMIT 10
                    }
                }
            `);
            assert.ok(code.includes('Data.Users'), `Expected Data.Users in: ${code}`);
            assert.ok(code.includes('slice'), `Expected slice for LIMIT in: ${code}`);
        });

        it('transpiles ROWS with WHERE to filter', () => {
            const code = transpileFirstTest(`
                FEATURE RowsTest {
                    SCENARIO FilteredRows {
                        ROWS users = Users WHERE state = "CA"
                    }
                }
            `);
            assert.ok(code.includes('filter'), `Expected filter in: ${code}`);
        });

        it('transpiles ROWS with ORDER BY to sort', () => {
            const code = transpileFirstTest(`
                FEATURE RowsTest {
                    SCENARIO SortedRows {
                        ROWS users = Users ORDER BY name DESC
                    }
                }
            `);
            assert.ok(code.includes('sort'), `Expected sort in: ${code}`);
        });
    });
});

describe('VDQL - COUNT Statements', () => {
    describe('Parsing', () => {
        it('parses basic COUNT statement', () => {
            const { errors } = parseStatement('NUMBER total = COUNT Users');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses COUNT with WHERE', () => {
            const { errors } = parseStatement('NUMBER activeCount = COUNT Users WHERE active = "true"');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });
    });

    describe('Transpilation', () => {
        it('transpiles COUNT to .length', () => {
            const code = transpileFirstTest(`
                FEATURE CountTest {
                    SCENARIO BasicCount {
                        NUMBER total = COUNT Users
                    }
                }
            `);
            assert.ok(code.includes('.length'), `Expected .length in: ${code}`);
            assert.ok(code.includes('const total'), `Expected const total in: ${code}`);
        });

        it('transpiles COUNT with WHERE to filter().length', () => {
            const code = transpileFirstTest(`
                FEATURE CountTest {
                    SCENARIO FilteredCount {
                        NUMBER activeCount = COUNT Users WHERE active = "true"
                    }
                }
            `);
            assert.ok(code.includes('filter'), `Expected filter in: ${code}`);
            assert.ok(code.includes('.length'), `Expected .length in: ${code}`);
        });
    });
});

describe('VDQL - WHERE Conditions', () => {
    describe('Comparison Operators', () => {
        it('parses equals comparison', () => {
            const { errors } = parseStatement('ROW user = Users WHERE state = "CA"');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses string comparison in WHERE', () => {
            const { errors } = parseStatement('ROW user = Users WHERE name = "Alice"');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });
    });

    describe('Text Operators', () => {
        it('parses CONTAINS operator', () => {
            const { errors } = parseStatement('ROW user = Users WHERE name CONTAINS "Ali"');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses STARTS WITH operator', () => {
            const { errors } = parseStatement('ROW user = Users WHERE name STARTS WITH "A"');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses ENDS WITH operator', () => {
            const { errors } = parseStatement('ROW user = Users WHERE email ENDS WITH "@test.com"');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses MATCHES operator', () => {
            const { errors } = parseStatement('ROW user = Users WHERE email MATCHES ".*@test\\.com"');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });
    });

    describe('IS operators', () => {
        it('parses IS EMPTY', () => {
            const { errors } = parseStatement('ROW user = Users WHERE notes IS EMPTY');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses IS NOT EMPTY', () => {
            const { errors } = parseStatement('ROW user = Users WHERE notes IS NOT EMPTY');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses IS NULL', () => {
            const { errors } = parseStatement('ROW user = Users WHERE deletedAt IS NULL');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });
    });

    describe('IN operator', () => {
        it('parses IN with list', () => {
            const { errors } = parseStatement('ROW user = Users WHERE state IN ["CA", "NY", "TX"]');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });
    });

    describe('Compound Conditions', () => {
        it('parses AND condition', () => {
            const { errors } = parseStatement('ROW user = Users WHERE state = "CA" AND active = "true"');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses OR condition', () => {
            const { errors } = parseStatement('ROW user = Users WHERE state = "CA" OR state = "NY"');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses NOT condition', () => {
            const { errors } = parseStatement('ROW user = Users WHERE NOT state = "CA"');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });

        it('parses parenthesized conditions', () => {
            const { errors } = parseStatement('ROW user = Users WHERE (state = "CA" OR state = "NY") AND active = "true"');
            assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
        });
    });

    describe('Transpilation of conditions', () => {
        it('transpiles CONTAINS to includes()', () => {
            const code = transpileFirstTest(`
                FEATURE CondTest {
                    SCENARIO ContainsTest {
                        ROW user = Users WHERE name CONTAINS "Ali"
                    }
                }
            `);
            assert.ok(code.includes('.includes('), `Expected .includes() in: ${code}`);
        });

        it('transpiles AND condition', () => {
            const code = transpileFirstTest(`
                FEATURE CondTest {
                    SCENARIO AndTest {
                        ROW user = Users WHERE state = "CA" AND active = "true"
                    }
                }
            `);
            assert.ok(code.includes('&&'), `Expected && in: ${code}`);
        });

        it('transpiles OR condition', () => {
            const code = transpileFirstTest(`
                FEATURE CondTest {
                    SCENARIO OrTest {
                        ROW user = Users WHERE state = "CA" OR state = "NY"
                    }
                }
            `);
            assert.ok(code.includes('||'), `Expected || in: ${code}`);
        });

        it('transpiles IS EMPTY', () => {
            const code = transpileFirstTest(`
                FEATURE CondTest {
                    SCENARIO EmptyTest {
                        ROW user = Users WHERE notes IS EMPTY
                    }
                }
            `);
            assert.ok(code.includes("=== ''") || code.includes('=== null'), `Expected empty check in: ${code}`);
        });

        it('transpiles IN to includes()', () => {
            const code = transpileFirstTest(`
                FEATURE CondTest {
                    SCENARIO InTest {
                        ROW user = Users WHERE state IN ["CA", "NY"]
                    }
                }
            `);
            assert.ok(code.includes('.includes('), `Expected includes() for IN operator in: ${code}`);
        });
    });
});

describe('VDQL - ORDER BY', () => {
    it('parses single column ASC', () => {
        const { errors } = parseStatement('ROWS users = Users ORDER BY name ASC');
        assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
    });

    it('parses single column DESC', () => {
        const { errors } = parseStatement('ROWS users = Users ORDER BY createdAt DESC');
        assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
    });

    it('parses default direction (ASC)', () => {
        const { errors } = parseStatement('ROWS users = Users ORDER BY name');
        assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
    });

    it('parses multiple columns', () => {
        const { errors } = parseStatement('ROWS users = Users ORDER BY state ASC, name DESC');
        assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
    });

    it('transpiles ORDER BY DESC correctly', () => {
        const code = transpileFirstTest(`
            FEATURE SortTest {
                SCENARIO DescSort {
                    ROWS users = Users ORDER BY name DESC
                }
            }
        `);
        assert.ok(code.includes('sort'), `Expected sort in: ${code}`);
    });
});

describe('VDQL - Cross-Project References', () => {
    it('parses cross-project ROW', () => {
        const { errors } = parseStatement('ROW user = ProjectB.Users');
        assert.strictEqual(errors.length, 0, `Errors: ${errors.map(e => e.message).join(', ')}`);
    });

    it('transpiles cross-project reference to ProjectData accessor', () => {
        const code = transpileFirstTest(`
            FEATURE CrossProjectTest {
                SCENARIO CrossRef {
                    ROW user = ProjectB.Users
                }
            }
        `);
        assert.ok(code.includes('ProjectBData.Users'), `Expected ProjectBData.Users in: ${code}`);
    });
});
