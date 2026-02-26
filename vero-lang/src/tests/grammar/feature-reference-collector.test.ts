import { describe, it } from 'node:test';
import assert from 'node:assert';
import { tokenize } from '../../lexer/index.js';
import { parse } from '../../parser/index.js';
import { collectFeatureReferences } from '../../transpiler/index.js';

function collectRefs(source: string): string[] {
    const { tokens, errors: lexErrors } = tokenize(source);
    assert.strictEqual(lexErrors.length, 0, `Lexer errors: ${lexErrors.map(e => e.message).join(', ')}`);
    const { ast, errors: parseErrors } = parse(tokens);
    assert.strictEqual(parseErrors.length, 0, `Parse errors: ${parseErrors.map(e => e.message).join(', ')}`);
    assert.ok(ast.features.length > 0, 'Expected at least one feature');
    return collectFeatureReferences(ast.features[0]);
}

describe('Feature Reference Collector', () => {
    it('does not treat ROW variables as page references', () => {
        const refs = collectRefs(`
FEATURE SalesforceDemo {
  SCENARIO SalesforceAuthoringDemo {
    ROW sfCred = FIRST SalesforceCredentials WHERE profile = "mike"
    OPEN sfCred.oktaUrl
    FILL LoginPage.username WITH sfCred.username
  }
}
`);

        assert.ok(refs.includes('LoginPage'));
        assert.ok(!refs.includes('sfCred'));
    });

    it('keeps real page references used in expressions', () => {
        const refs = collectRefs(`
FEATURE Example {
  SCENARIO OpenFromPageVar {
    OPEN AuthPage.baseUrl
    CLICK AuthPage.signInButton
  }
}
`);

        assert.ok(refs.includes('AuthPage'));
    });
});

