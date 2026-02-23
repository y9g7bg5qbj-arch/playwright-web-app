/**
 * Semantic Validation Test Suite for Vero DSL
 *
 * Tests the semantic validator for:
 * - Undefined page references (auto-resolved from statement targets)
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
 * Create a simple feature node.
 * The `uses` array is always empty (USE has been removed).
 */
function createFeature(name: string, _uses: string[] = [], scenarios: any[] = []) {
    return {
        type: 'Feature' as const,
        name,
        annotations: [],
        uses: [] as Array<{ name: string; line: number }>,
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

    describe('Auto-resolved page reference validation', () => {

        it('should pass when a feature references a defined page', () => {
            const ast = createTestAST({
                pages: [createPage('HomePage', ['searchBox', 'submitBtn'])],
                features: [createFeature('HomeTest', [], [{
                    type: 'Scenario' as const,
                    name: 'TestClick',
                    annotations: [],
                    tags: [],
                    statements: [{
                        type: 'Click' as const,
                        target: { type: 'Target' as const, page: 'HomePage', field: 'searchBox' },
                        line: 3,
                    }],
                    line: 2,
                }])],
            });

            const validator = new SemanticValidator();
            const result = validator.validate(ast);

            assert.strictEqual(result.valid, true);
            assert.strictEqual(result.errorCount, 0);
        });

        it('should error when a feature references an undefined page in a target', () => {
            const ast = createTestAST({
                pages: [createPage('HomePage')],
                features: [{
                    type: 'Feature' as const,
                    name: 'HomeTest',
                    annotations: [],
                    uses: [],
                    fixtures: [],
                    hooks: [],
                    scenarios: [{
                        type: 'Scenario' as const,
                        name: 'TestClick',
                        annotations: [],
                        tags: [],
                        statements: [{
                            type: 'Click' as const,
                            target: { type: 'Target' as const, page: 'UnknownPage', field: 'btn' },
                            line: 3,
                        }],
                        line: 2,
                    }],
                    line: 1,
                }],
            });

            const validator = new SemanticValidator();
            const result = validator.validate(ast);

            assert.strictEqual(result.valid, false);
            assert.strictEqual(result.errors[0].code, VeroErrorCode.UNDEFINED_PAGE);
            assert.ok(result.errors[0].message.includes('UnknownPage'));
        });

        it('should pass when a feature references a PageActions via PERFORM', () => {
            const ast = createTestAST({
                pages: [createPage('LoginPage')],
                pageActions: [createPageActions('LoginActions', 'LoginPage', ['doLogin'])],
                features: [createFeature('LoginTest', [], [{
                    type: 'Scenario' as const,
                    name: 'TestLogin',
                    annotations: [],
                    tags: [],
                    statements: [{
                        type: 'Perform' as const,
                        action: { type: 'ActionCall' as const, page: 'LoginActions', action: 'doLogin', arguments: [] },
                        line: 3,
                    }],
                    line: 2,
                }])],
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

        it('should error when tab operations are used inside PAGEACTIONS', () => {
            const ast = createTestAST({
                pages: [createPage('LoginPage')],
                pageActions: [{
                    type: 'PageActions' as const,
                    name: 'LoginActions',
                    forPage: 'LoginPage',
                    actions: [{
                        type: 'ActionDefinition' as const,
                        name: 'openPopup',
                        parameters: [],
                        statements: [{ type: 'SwitchToNewTab' as const, line: 4 }],
                        line: 3,
                    }],
                    line: 2,
                }],
            });

            const validator = new SemanticValidator();
            const result = validator.validate(ast);

            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.code === VeroErrorCode.INVALID_TAB_CONTEXT));
        });
    });

    describe('Tab operation context validation', () => {
        it('should error when tab operations are used in BEFORE_ALL hook', () => {
            const ast = createTestAST({
                pages: [createPage('HomePage')],
                features: [{
                    type: 'Feature' as const,
                    name: 'TabHooks',
                    annotations: [],
                    uses: [],
                    fixtures: [],
                    hooks: [{
                        type: 'Hook' as const,
                        hookType: 'BEFORE_ALL',
                        statements: [{ type: 'SwitchToNewTab' as const, line: 5 }],
                        line: 4,
                    }],
                    scenarios: [{
                        type: 'Scenario' as const,
                        name: 'Smoke',
                        annotations: [],
                        tags: [],
                        statements: [],
                        line: 7,
                    }],
                    line: 1,
                }],
            });

            const validator = new SemanticValidator();
            const result = validator.validate(ast);

            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.code === VeroErrorCode.INVALID_TAB_CONTEXT));
        });

        it('should error when tab operations are used in AFTER_ALL hook', () => {
            const ast = createTestAST({
                pages: [createPage('HomePage')],
                features: [{
                    type: 'Feature' as const,
                    name: 'TabHooks',
                    annotations: [],
                    uses: [],
                    fixtures: [],
                    hooks: [{
                        type: 'Hook' as const,
                        hookType: 'AFTER_ALL',
                        statements: [{ type: 'CloseTab' as const, line: 5 }],
                        line: 4,
                    }],
                    scenarios: [{
                        type: 'Scenario' as const,
                        name: 'Smoke',
                        annotations: [],
                        tags: [],
                        statements: [],
                        line: 7,
                    }],
                    line: 1,
                }],
            });

            const validator = new SemanticValidator();
            const result = validator.validate(ast);

            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.code === VeroErrorCode.INVALID_TAB_CONTEXT));
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
                    uses: [],
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

        it('should pass when page in target is defined (auto-resolved)', () => {
            const ast = createTestAST({
                pages: [createPage('HomePage'), createPage('OtherPage', ['btn'])],
                features: [{
                    type: 'Feature' as const,
                    name: 'HomeTest',
                    annotations: [],
                    uses: [],
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
                                page: 'OtherPage',
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

            // OtherPage is defined, so it should be auto-resolved without USE
            assert.strictEqual(result.valid, true);
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
