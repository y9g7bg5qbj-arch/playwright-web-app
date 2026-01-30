/**
 * Semantic Validation Test Suite for Vero DSL
 *
 * Tests the semantic validator for:
 * - Undefined page references in USE statements
 * - Undefined field references in Page.field expressions
 * - Undefined action references in PERFORM statements
 * - PAGEACTIONS FOR undefined pages
 * - "Did you mean?" suggestions for typos
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SemanticValidator } from '../../validator/SemanticValidator.js';
import { VeroErrorCode } from '../../errors/VeroErrors.js';
import { ProgramNode } from '../../parser/ast.js';

// ==================== TEST HELPERS ====================

/**
 * Create a minimal valid AST for testing
 */
function createTestAST(overrides: Partial<ProgramNode> = {}): ProgramNode {
    return {
        type: 'Program',
        pages: [],
        pageActions: [],
        features: [],
        fixtures: [],
        ...overrides,
    };
}

/**
 * Create a simple page node
 */
function createPage(name: string, fields: string[] = []) {
    return {
        type: 'Page' as const,
        name,
        fields: fields.map(f => ({
            type: 'Field' as const,
            name: f,
            selector: { type: 'Selector' as const, selectorType: 'auto' as const, value: `#${f}` },
            line: 1,
        })),
        variables: [],
        actions: [],
        line: 1,
    };
}

/**
 * Create a simple feature node with USE statements
 */
function createFeature(name: string, uses: string[] = [], scenarios: any[] = []) {
    return {
        type: 'Feature' as const,
        name,
        annotations: [],
        uses: uses.map(u => ({ name: u, line: 2 })),
        fixtures: [],
        hooks: [],
        scenarios: scenarios.length > 0 ? scenarios : [{
            type: 'Scenario' as const,
            name: 'Test',
            annotations: [],
            tags: [],
            statements: [],
            line: 1,
        }],
        line: 1,
    };
}

/**
 * Create a simple PageActions node
 */
function createPageActions(name: string, forPage: string, actions: string[] = []) {
    return {
        type: 'PageActions' as const,
        name,
        forPage,
        actions: actions.map(a => ({
            type: 'ActionDefinition' as const,
            name: a,
            parameters: [],
            statements: [],
            line: 1,
        })),
        line: 1,
    };
}

// ==================== TESTS ====================

describe('SemanticValidator', () => {

    describe('USE statement validation', () => {

        it('should pass when USE references a defined page', () => {
            const ast = createTestAST({
                pages: [createPage('HomePage', ['searchBox', 'submitBtn'])],
                features: [createFeature('HomeTest', ['HomePage'])],
            });

            const validator = new SemanticValidator();
            const result = validator.validate(ast);

            assert.strictEqual(result.valid, true);
            assert.strictEqual(result.errorCount, 0);
        });

        it('should error when USE references an undefined page', () => {
            const ast = createTestAST({
                pages: [createPage('HomePage')],
                features: [createFeature('HomeTest', ['UnknownPage'])],
            });

            const validator = new SemanticValidator();
            const result = validator.validate(ast);

            assert.strictEqual(result.valid, false);
            assert.strictEqual(result.errorCount, 1);
            assert.strictEqual(result.errors[0].code, VeroErrorCode.UNDEFINED_PAGE);
            assert.ok(result.errors[0].message.includes('UnknownPage'));
        });

        it('should suggest similar page names for typos', () => {
            const ast = createTestAST({
                pages: [createPage('HomePage')],
                features: [createFeature('HomeTest', ['HomPage'])], // typo
            });

            const validator = new SemanticValidator();
            const result = validator.validate(ast);

            assert.strictEqual(result.valid, false);
            assert.ok(result.errors[0].suggestions?.includes('HomePage'));
        });

        it('should pass when USE references a PageActions', () => {
            const ast = createTestAST({
                pages: [createPage('LoginPage')],
                pageActions: [createPageActions('LoginActions', 'LoginPage', ['doLogin'])],
                features: [createFeature('LoginTest', ['LoginActions'])],
            });

            const validator = new SemanticValidator();
            const result = validator.validate(ast);

            assert.strictEqual(result.valid, true);
        });
    });

    describe('PAGEACTIONS FOR validation', () => {

        it('should error when PAGEACTIONS FOR references undefined page', () => {
            const ast = createTestAST({
                pages: [],
                pageActions: [createPageActions('LoginActions', 'LoginPage')],
            });

            const validator = new SemanticValidator();
            const result = validator.validate(ast);

            assert.strictEqual(result.valid, false);
            assert.strictEqual(result.errors[0].code, VeroErrorCode.INVALID_PAGEACTIONS_FOR);
        });

        it('should pass when PAGEACTIONS FOR references defined page', () => {
            const ast = createTestAST({
                pages: [createPage('LoginPage')],
                pageActions: [createPageActions('LoginActions', 'LoginPage')],
            });

            const validator = new SemanticValidator();
            const result = validator.validate(ast);

            assert.strictEqual(result.valid, true);
        });
    });

    describe('Page.field reference validation', () => {

        it('should error when referencing undefined field in page', () => {
            const ast = createTestAST({
                pages: [createPage('HomePage', ['submitBtn'])],
                features: [{
                    type: 'Feature' as const,
                    name: 'HomeTest',
                    annotations: [],
                    uses: [{ name: 'HomePage', line: 2 }],
                    fixtures: [],
                    hooks: [],
                    scenarios: [{
                        type: 'Scenario' as const,
                        name: 'Test Click',
                        annotations: [],
                        tags: [],
                        statements: [{
                            type: 'Click' as const,
                            target: {
                                type: 'Target' as const,
                                page: 'HomePage',
                                field: 'unknownField', // doesn't exist
                            },
                            line: 5,
                        }],
                        line: 3,
                    }],
                    line: 1,
                }],
            });

            const validator = new SemanticValidator();
            const result = validator.validate(ast);

            assert.strictEqual(result.valid, false);
            assert.strictEqual(result.errors[0].code, VeroErrorCode.UNDEFINED_FIELD);
            assert.ok(result.errors[0].message.includes('unknownField'));
        });

        it('should error when page in target is not in USE list', () => {
            const ast = createTestAST({
                pages: [createPage('HomePage'), createPage('OtherPage')],
                features: [{
                    type: 'Feature' as const,
                    name: 'HomeTest',
                    annotations: [],
                    uses: [{ name: 'HomePage', line: 2 }], // Only HomePage in USE
                    fixtures: [],
                    hooks: [],
                    scenarios: [{
                        type: 'Scenario' as const,
                        name: 'Test Click',
                        annotations: [],
                        tags: [],
                        statements: [{
                            type: 'Click' as const,
                            target: {
                                type: 'Target' as const,
                                page: 'OtherPage', // Not in USE list
                                field: 'btn',
                            },
                            line: 5,
                        }],
                        line: 3,
                    }],
                    line: 1,
                }],
            });

            const validator = new SemanticValidator();
            const result = validator.validate(ast);

            assert.strictEqual(result.valid, false);
            assert.strictEqual(result.errors[0].code, VeroErrorCode.UNDEFINED_PAGE);
            assert.ok(result.errors[0].message.includes('not in USE list'));
        });
    });

    describe('Utility methods', () => {

        it('should return all page names', () => {
            const ast = createTestAST({
                pages: [createPage('HomePage'), createPage('LoginPage')],
            });

            const validator = new SemanticValidator();
            validator.validate(ast);

            const pages = validator.getPageNames();
            assert.strictEqual(pages.length, 2);
            assert.ok(pages.includes('HomePage'));
            assert.ok(pages.includes('LoginPage'));
        });

        it('should return fields for a page', () => {
            const ast = createTestAST({
                pages: [createPage('HomePage', ['searchBox', 'submitBtn'])],
            });

            const validator = new SemanticValidator();
            validator.validate(ast);

            const fields = validator.getFieldsForPage('HomePage');
            assert.strictEqual(fields.length, 2);
            assert.ok(fields.includes('searchBox'));
            assert.ok(fields.includes('submitBtn'));
        });
    });
});
