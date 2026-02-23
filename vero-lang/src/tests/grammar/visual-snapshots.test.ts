import { describe, it } from 'node:test';
import assert from 'node:assert';
import { tokenize } from '../../lexer/index.js';
import { parse } from '../../parser/index.js';
import { transpile } from '../../transpiler/index.js';
import type { StatementNode } from '../../parser/ast.js';

function parseScenarioStatements(source: string): StatementNode[] {
    const { tokens, errors: lexErrors } = tokenize(source);
    assert.strictEqual(lexErrors.length, 0, `Lexer errors: ${lexErrors.map(e => e.message).join(', ')}`);

    const { ast, errors: parseErrors } = parse(tokens);
    assert.strictEqual(parseErrors.length, 0, `Parse errors: ${parseErrors.map(e => e.message).join(', ')}`);
    assert.ok(ast.features.length > 0, 'Expected one feature');
    assert.ok(ast.features[0].scenarios.length > 0, 'Expected one scenario');
    return ast.features[0].scenarios[0].statements;
}

function transpileFirstFeature(source: string): string {
    const { tokens, errors: lexErrors } = tokenize(source);
    assert.strictEqual(lexErrors.length, 0, `Lexer errors: ${lexErrors.map(e => e.message).join(', ')}`);

    const { ast, errors: parseErrors } = parse(tokens);
    assert.strictEqual(parseErrors.length, 0, `Parse errors: ${parseErrors.map(e => e.message).join(', ')}`);

    const result = transpile(ast);
    const testCode = result.tests.values().next().value as string | undefined;
    assert.ok(testCode, 'Expected transpiled feature output');
    return testCode;
}

describe('Visual Screenshot Assertions', () => {
    it('parses VERIFY SCREENSHOT with name and preset', () => {
        const statements = parseScenarioStatements(`
FEATURE VisualChecks {
  SCENARIO HomePage {
    VERIFY SCREENSHOT AS "home" WITH STRICT
  }
}
`);

        assert.strictEqual(statements.length, 1);
        assert.strictEqual(statements[0].type, 'VerifyScreenshot');
        const stmt = statements[0] as Extract<StatementNode, { type: 'VerifyScreenshot' }>;
        assert.strictEqual(stmt.name, 'home');
        assert.strictEqual(stmt.options?.preset, 'STRICT');
    });

    it('parses VERIFY target MATCHES SCREENSHOT with numeric overrides', () => {
        const statements = parseScenarioStatements(`
PAGE LoginPage {
  FIELD header = text "Welcome"
}

FEATURE VisualChecks {
  SCENARIO HeaderScreenshot {
    VERIFY LoginPage.header MATCHES SCREENSHOT AS "header" WITH BALANCED THRESHOLD 0.25 MAX_DIFF_PIXELS 12 MAX_DIFF_RATIO 0.01
  }
}
`);

        assert.strictEqual(statements.length, 1);
        assert.strictEqual(statements[0].type, 'VerifyScreenshot');
        const stmt = statements[0] as Extract<StatementNode, { type: 'VerifyScreenshot' }>;
        assert.strictEqual(stmt.target?.page, 'LoginPage');
        assert.strictEqual(stmt.target?.field, 'header');
        assert.strictEqual(stmt.options?.preset, 'BALANCED');
        assert.strictEqual(stmt.options?.threshold, 0.25);
        assert.strictEqual(stmt.options?.maxDiffPixels, 12);
        assert.strictEqual(stmt.options?.maxDiffPixelRatio, 0.01);
    });

    it('transpiles unnamed VERIFY SCREENSHOT to helper assertion wrapper', () => {
        const code = transpileFirstFeature(`
FEATURE VisualChecks {
  SCENARIO HomePage {
    VERIFY SCREENSHOT
  }
}
`);

        assert.ok(code.includes('await __veroExpectScreenshot(page, testInfo);'), `Expected helper screenshot assertion, got:\n${code}`);
    });

    it('normalizes screenshot names to .png and applies locator target', () => {
        const code = transpileFirstFeature(`
PAGE LoginPage {
  FIELD header = text "Welcome"
}

FEATURE VisualChecks {
  SCENARIO HeaderScreenshot {
    VERIFY LoginPage.header MATCHES SCREENSHOT AS "header" WITH STRICT
  }
}
`);

        assert.ok(code.includes("await __veroExpectScreenshot(loginPage.header, testInfo, 'header.png', {"), `Expected named helper screenshot assertion, got:\n${code}`);
    });

    it('keeps explicit numeric overrides above preset defaults', () => {
        const code = transpileFirstFeature(`
FEATURE VisualChecks {
  SCENARIO HomePage {
    VERIFY SCREENSHOT AS "home" WITH STRICT THRESHOLD 0.2 MAX_DIFF_PIXELS 5
  }
}
`);

        assert.ok(code.includes("__veroExpectScreenshot(page, testInfo, 'home.png', { threshold: 0.2, maxDiffPixels: 5"), `Expected explicit overrides, got:\n${code}`);
    });
});
