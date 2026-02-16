/**
 * Locator Refinement Modifier Tests
 *
 * Tests parsing and transpiling of FIRST, LAST, NTH, WITH TEXT,
 * WITHOUT TEXT, HAS, HAS NOT modifiers on selectors.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { tokenize } from '../../lexer/index.js';
import { parse } from '../../parser/index.js';
import { transpile } from '../../transpiler/index.js';
import { validate } from '../../validator/index.js';
import type { SelectorNode, SelectorModifier, FieldNode } from '../../parser/ast.js';

/** Parse Vero source and return the first page's fields */
function parseFields(source: string): FieldNode[] {
    const { tokens, errors: lexErrors } = tokenize(source);
    assert.strictEqual(lexErrors.length, 0, `Lexer errors: ${lexErrors.map(e => e.message).join(', ')}`);
    const { ast, errors: parseErrors } = parse(tokens);
    assert.strictEqual(parseErrors.length, 0, `Parse errors: ${parseErrors.map(e => e.message).join(', ')}`);
    assert.ok(ast.pages.length > 0, 'Expected at least one page');
    return ast.pages[0].fields;
}

/** Parse Vero source and return the selector of the first field */
function parseSelector(source: string): SelectorNode {
    const fields = parseFields(source);
    assert.ok(fields.length > 0, 'Expected at least one field');
    return fields[0].selector;
}

/** Compile source and return the transpiled page code for the first page */
function transpilePage(source: string): string {
    const { tokens } = tokenize(source);
    const { ast } = parse(tokens);
    const result = transpile(ast);
    assert.ok(result.pages.size > 0, 'Expected at least one transpiled page');
    return result.pages.values().next().value!;
}

const wrap = (fields: string) => `PAGE TestPage { ${fields} }`;

// =============================================================================
// PARSING TESTS
// =============================================================================

describe('Modifier Parsing', () => {
    describe('FIRST modifier', () => {
        it('should parse FIRST after css selector', () => {
            const sel = parseSelector(wrap('FIELD btn = css ".btn" FIRST'));
            assert.strictEqual(sel.selectorType, 'css');
            assert.strictEqual(sel.value, '.btn');
            assert.ok(sel.modifiers);
            assert.strictEqual(sel.modifiers!.length, 1);
            assert.strictEqual(sel.modifiers![0].type, 'first');
        });

        it('should parse FIRST after role selector with name', () => {
            const sel = parseSelector(wrap('FIELD btn = role "button" name "Submit" FIRST'));
            assert.strictEqual(sel.selectorType, 'role');
            assert.strictEqual(sel.value, 'button');
            assert.strictEqual(sel.nameParam, 'Submit');
            assert.ok(sel.modifiers);
            assert.strictEqual(sel.modifiers![0].type, 'first');
        });
    });

    describe('LAST modifier', () => {
        it('should parse LAST after css selector', () => {
            const sel = parseSelector(wrap('FIELD btn = css ".btn" LAST'));
            assert.ok(sel.modifiers);
            assert.strictEqual(sel.modifiers![0].type, 'last');
        });
    });

    describe('NTH modifier', () => {
        it('should parse NTH with index', () => {
            const sel = parseSelector(wrap('FIELD radio = css ".radio" NTH 2'));
            assert.ok(sel.modifiers);
            assert.strictEqual(sel.modifiers![0].type, 'nth');
            assert.strictEqual((sel.modifiers![0] as { type: 'nth'; index: number }).index, 2);
        });

        it('should parse NTH 0', () => {
            const sel = parseSelector(wrap('FIELD item = css ".item" NTH 0'));
            assert.ok(sel.modifiers);
            assert.strictEqual((sel.modifiers![0] as { type: 'nth'; index: number }).index, 0);
        });
    });

    describe('WITH TEXT modifier', () => {
        it('should parse WITH TEXT after css selector', () => {
            const sel = parseSelector(wrap('FIELD radio = css ".radio" WITH TEXT "Person Account"'));
            assert.ok(sel.modifiers);
            assert.strictEqual(sel.modifiers![0].type, 'withText');
            assert.strictEqual((sel.modifiers![0] as { type: 'withText'; text: string }).text, 'Person Account');
        });
    });

    describe('WITHOUT TEXT modifier', () => {
        it('should parse WITHOUT TEXT after css selector', () => {
            const sel = parseSelector(wrap('FIELD item = role "listitem" WITHOUT TEXT "Out of stock"'));
            assert.ok(sel.modifiers);
            assert.strictEqual(sel.modifiers![0].type, 'withoutText');
            assert.strictEqual((sel.modifiers![0] as { type: 'withoutText'; text: string }).text, 'Out of stock');
        });
    });

    describe('HAS modifier', () => {
        it('should parse HAS with role selector', () => {
            const sel = parseSelector(wrap('FIELD card = css ".card" HAS role "heading" name "Product 2"'));
            assert.ok(sel.modifiers);
            assert.strictEqual(sel.modifiers![0].type, 'has');
            const hasMod = sel.modifiers![0] as { type: 'has'; selector: SelectorNode };
            assert.strictEqual(hasMod.selector.selectorType, 'role');
            assert.strictEqual(hasMod.selector.value, 'heading');
            assert.strictEqual(hasMod.selector.nameParam, 'Product 2');
        });

        it('should parse HAS with css selector', () => {
            const sel = parseSelector(wrap('FIELD section = css ".section" HAS css ".highlight"'));
            assert.ok(sel.modifiers);
            const hasMod = sel.modifiers![0] as { type: 'has'; selector: SelectorNode };
            assert.strictEqual(hasMod.selector.selectorType, 'css');
            assert.strictEqual(hasMod.selector.value, '.highlight');
        });
    });

    describe('HAS NOT modifier', () => {
        it('should parse HAS NOT with role selector', () => {
            const sel = parseSelector(wrap('FIELD card = css ".card" HAS NOT role "heading" name "Product 2"'));
            assert.ok(sel.modifiers);
            assert.strictEqual(sel.modifiers![0].type, 'hasNot');
            const mod = sel.modifiers![0] as { type: 'hasNot'; selector: SelectorNode };
            assert.strictEqual(mod.selector.selectorType, 'role');
            assert.strictEqual(mod.selector.value, 'heading');
            assert.strictEqual(mod.selector.nameParam, 'Product 2');
        });
    });

    describe('Chained modifiers', () => {
        it('should parse WITH TEXT followed by FIRST', () => {
            const sel = parseSelector(wrap('FIELD radio = css ".radio" WITH TEXT "Person" FIRST'));
            assert.ok(sel.modifiers);
            assert.strictEqual(sel.modifiers!.length, 2);
            assert.strictEqual(sel.modifiers![0].type, 'withText');
            assert.strictEqual(sel.modifiers![1].type, 'first');
        });

        it('should parse multiple text filters', () => {
            const sel = parseSelector(wrap('FIELD item = css ".item" WITH TEXT "Active" WITHOUT TEXT "Expired"'));
            assert.ok(sel.modifiers);
            assert.strictEqual(sel.modifiers!.length, 2);
            assert.strictEqual(sel.modifiers![0].type, 'withText');
            assert.strictEqual(sel.modifiers![1].type, 'withoutText');
        });
    });

    describe('No modifiers', () => {
        it('should produce no modifiers for plain selector', () => {
            const sel = parseSelector(wrap('FIELD btn = css ".btn"'));
            assert.strictEqual(sel.modifiers, undefined);
        });
    });
});

// =============================================================================
// TRANSPILATION TESTS
// =============================================================================

describe('Modifier Transpilation', () => {
    it('should transpile FIRST to .first()', () => {
        const code = transpilePage(wrap('FIELD btn = css ".btn" FIRST'));
        assert.ok(code.includes(".locator('.btn').first()"), `Expected .first() in: ${code}`);
    });

    it('should transpile LAST to .last()', () => {
        const code = transpilePage(wrap('FIELD btn = css ".btn" LAST'));
        assert.ok(code.includes(".locator('.btn').last()"), `Expected .last() in: ${code}`);
    });

    it('should transpile NTH to .nth(n)', () => {
        const code = transpilePage(wrap('FIELD btn = css ".btn" NTH 2'));
        assert.ok(code.includes(".locator('.btn').nth(2)"), `Expected .nth(2) in: ${code}`);
    });

    it('should transpile WITH TEXT to .filter({ hasText })', () => {
        const code = transpilePage(wrap('FIELD radio = css ".radio" WITH TEXT "Person"'));
        assert.ok(code.includes(".locator('.radio').filter({ hasText: 'Person' })"), `Expected .filter({ hasText }) in: ${code}`);
    });

    it('should transpile WITHOUT TEXT to .filter({ hasNotText })', () => {
        const code = transpilePage(wrap('FIELD item = css ".item" WITHOUT TEXT "Out of stock"'));
        assert.ok(code.includes(".filter({ hasNotText: 'Out of stock' })"), `Expected .filter({ hasNotText }) in: ${code}`);
    });

    it('should transpile HAS to .filter({ has })', () => {
        const code = transpilePage(wrap('FIELD card = css ".card" HAS role "heading" name "Title"'));
        assert.ok(code.includes(".locator('.card').filter({ has: page.getByRole('heading', { name: 'Title', exact: true }) })"), `Expected .filter({ has }) in: ${code}`);
    });

    it('should transpile HAS NOT to .filter({ hasNot })', () => {
        const code = transpilePage(wrap('FIELD card = css ".card" HAS NOT role "heading" name "Title"'));
        assert.ok(code.includes(".filter({ hasNot: page.getByRole('heading', { name: 'Title', exact: true }) })"), `Expected .filter({ hasNot }) in: ${code}`);
    });

    it('should transpile chained modifiers', () => {
        const code = transpilePage(wrap('FIELD radio = css ".radio" WITH TEXT "Person" FIRST'));
        assert.ok(code.includes(".filter({ hasText: 'Person' }).first()"), `Expected chained filter+first in: ${code}`);
    });

    it('should transpile role selector with FIRST', () => {
        const code = transpilePage(wrap('FIELD btn = role "button" name "Submit" FIRST'));
        assert.ok(code.includes("page.getByRole('button', { name: 'Submit', exact: true }).first()"), `Expected role+first in: ${code}`);
    });

    it('should transpile text selector with NTH', () => {
        const code = transpilePage(wrap('FIELD link = text "Click here" NTH 1'));
        assert.ok(code.includes("page.getByText('Click here').nth(1)"), `Expected text+nth in: ${code}`);
    });
});

// =============================================================================
// VALIDATION TESTS
// =============================================================================

describe('Modifier Validation', () => {
    function validateSource(source: string) {
        const { tokens } = tokenize(source);
        const { ast } = parse(tokens);
        return validate(ast);
    }

    it('should pass validation for valid NTH index', () => {
        const result = validateSource(wrap('FIELD btn = css ".btn" NTH 2'));
        const nthErrors = result.errors.filter(e => e.message.includes('NTH'));
        assert.strictEqual(nthErrors.length, 0);
    });

    it('should pass validation for NTH 0', () => {
        const result = validateSource(wrap('FIELD btn = css ".btn" NTH 0'));
        const nthErrors = result.errors.filter(e => e.message.includes('NTH'));
        assert.strictEqual(nthErrors.length, 0);
    });

    it('should pass validation for WITH TEXT with non-empty string', () => {
        const result = validateSource(wrap('FIELD btn = css ".btn" WITH TEXT "hello"'));
        const textErrors = result.errors.filter(e => e.message.includes('WITH TEXT'));
        assert.strictEqual(textErrors.length, 0);
    });

    it('should pass validation for HAS with valid sub-selector', () => {
        const result = validateSource(wrap('FIELD card = css ".card" HAS css ".title"'));
        const hasErrors = result.errors.filter(e => e.message.includes('HAS'));
        assert.strictEqual(hasErrors.length, 0);
    });
});
