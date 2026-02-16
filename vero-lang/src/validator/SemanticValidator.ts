/**
 * Vero Semantic Validator
 *
 * Validates AST for semantic correctness:
 * - Undefined page references in USE statements
 * - Undefined field references in Page.field expressions
 * - Undefined action references in PERFORM statements
 * - PAGEACTIONS FOR undefined pages
 */

import {
    ProgramNode,
    PageNode,
    PageActionsNode,
    FeatureNode,
    PerformStatement,
    ForEachStatement,
    ScenarioNode,
    StatementNode,
    TargetNode,
} from '../parser/ast.js';

import {
    VeroError,
    VeroErrorCode,
    VeroErrorSeverity,
    ValidationResult,
    createValidationResult,
    findSimilar,
} from '../errors/VeroErrors.js';

interface SymbolTable {
    pages: Map<string, PageNode>;
    pageActions: Map<string, PageActionsNode>;
    pageFields: Map<string, Set<string>>;
    pageActionsActions: Map<string, Set<string>>;
}

export class SemanticValidator {
    private symbols: SymbolTable;
    private errors: VeroError[] = [];

    constructor() {
        this.symbols = {
            pages: new Map(),
            pageActions: new Map(),
            pageFields: new Map(),
            pageActionsActions: new Map(),
        };
    }

    /**
     * Validate the AST and return all semantic errors
     */
    validate(ast: ProgramNode): ValidationResult {
        this.errors = [];
        this.buildSymbolTable(ast);
        this.validateReferences(ast);
        return createValidationResult(this.errors);
    }

    private buildSymbolTable(ast: ProgramNode): void {
        for (const page of ast.pages) {
            this.symbols.pages.set(page.name, page);

            const fields = new Set<string>(page.fields.map(f => f.name));
            for (const action of page.actions || []) {
                fields.add(action.name);
            }
            this.symbols.pageFields.set(page.name, fields);
        }

        for (const pa of ast.pageActions) {
            this.symbols.pageActions.set(pa.name, pa);
            this.symbols.pageActionsActions.set(pa.name, new Set(pa.actions.map(a => a.name)));
        }
    }

    private validateReferences(ast: ProgramNode): void {
        for (const pa of ast.pageActions) {
            this.validatePageActionsFor(pa);
        }

        for (const feature of ast.features) {
            this.validateFeature(feature);
        }
    }

    /**
     * Push a semantic error with optional "Did you mean?" suggestions
     */
    private addError(
        code: VeroErrorCode,
        message: string,
        line: number,
        endColumn: number,
        severity: VeroErrorSeverity = 'error',
        candidates?: string[],
        offendingText?: string,
    ): void {
        const suggestions = candidates && candidates.length > 0 ? candidates : undefined;
        this.errors.push({
            code,
            message,
            line,
            column: 0,
            endColumn,
            severity,
            suggestions,
            offendingText,
        });
    }

    /**
     * Validate PAGEACTIONS FOR clause references a defined page
     */
    private validatePageActionsFor(pa: PageActionsNode): void {
        if (!this.symbols.pages.has(pa.forPage)) {
            this.addError(
                VeroErrorCode.INVALID_PAGEACTIONS_FOR,
                `PAGEACTIONS '${pa.name}' references undefined Page '${pa.forPage}'.`,
                pa.line,
                pa.forPage.length,
                'error',
                findSimilar(pa.forPage, [...this.symbols.pages.keys()]),
            );
        }

        for (const action of pa.actions) {
            for (const stmt of action.statements) {
                this.validatePageActionsStatement(stmt);
            }
        }
    }

    /**
     * Validate all references in a feature
     */
    private validateFeature(feature: FeatureNode): void {
        const usedPages = new Set<string>();
        const usedPageActions = new Set<string>();

        for (const use of feature.uses) {
            const usedName = use.name;
            const isPage = this.symbols.pages.has(usedName);
            const isPageActions = this.symbols.pageActions.has(usedName);

            if (!isPage && !isPageActions) {
                const allNames = [...this.symbols.pages.keys(), ...this.symbols.pageActions.keys()];
                this.addError(
                    VeroErrorCode.UNDEFINED_PAGE,
                    `'${usedName}' is not defined. Use a PAGE or PAGEACTIONS name.`,
                    use.line,
                    usedName.length,
                    'error',
                    findSimilar(usedName, allNames),
                    usedName,
                );
            } else {
                if (isPage) usedPages.add(usedName);
                if (isPageActions) usedPageActions.add(usedName);
            }
        }

        for (const scenario of feature.scenarios) {
            this.validateScenario(scenario, usedPages, usedPageActions);
        }

        for (const hook of feature.hooks) {
            for (const stmt of hook.statements) {
                this.validateStatement(stmt, usedPages, usedPageActions, hook.hookType);
            }
        }
    }

    /**
     * Validate all statements in a scenario
     */
    private validateScenario(
        scenario: ScenarioNode,
        usedPages: Set<string>,
        usedPageActions: Set<string>
    ): void {
        for (const stmt of scenario.statements) {
            this.validateStatement(stmt, usedPages, usedPageActions, 'SCENARIO');
        }
    }

    /**
     * Validate a single statement for reference errors
     */
    private validateStatement(
        stmt: StatementNode,
        usedPages: Set<string>,
        usedPageActions: Set<string>,
        scope: 'SCENARIO' | 'BEFORE_ALL' | 'BEFORE_EACH' | 'AFTER_ALL' | 'AFTER_EACH'
    ): void {
        if (this.isTabStatement(stmt)) {
            if (scope === 'BEFORE_ALL' || scope === 'AFTER_ALL') {
                this.addError(
                    VeroErrorCode.INVALID_TAB_CONTEXT,
                    `Tab operation '${this.getTabStatementName(stmt)}' is not allowed in ${scope.replace('_', ' ')} hooks.`,
                    stmt.line,
                    this.getTabStatementName(stmt).length,
                    'error',
                );
            }
        }

        const target = this.extractTarget(stmt);
        if (target) {
            this.validateTarget(target, usedPages, stmt);
        }

        if (stmt.type === 'Perform') {
            const { action } = stmt as PerformStatement;
            if (action.page) {
                this.validatePerformAction(action.page, action.action, stmt.line, usedPageActions);
            }
        }

        if (stmt.type === 'ForEach') {
            for (const bodyStmt of (stmt as ForEachStatement).statements) {
                this.validateStatement(bodyStmt, usedPages, usedPageActions, scope);
            }
        }
    }

    private validatePageActionsStatement(stmt: StatementNode): void {
        if (this.isTabStatement(stmt)) {
            this.addError(
                VeroErrorCode.INVALID_TAB_CONTEXT,
                `Tab operation '${this.getTabStatementName(stmt)}' is not allowed in PAGEACTIONS.`,
                stmt.line,
                this.getTabStatementName(stmt).length,
                'error',
            );
        }

        if (stmt.type === 'ForEach') {
            for (const nested of stmt.statements) {
                this.validatePageActionsStatement(nested);
            }
        }
    }

    private isTabStatement(stmt: StatementNode): boolean {
        return stmt.type === 'SwitchToNewTab'
            || stmt.type === 'SwitchToTab'
            || stmt.type === 'OpenInNewTab'
            || stmt.type === 'CloseTab';
    }

    private getTabStatementName(stmt: StatementNode): string {
        switch (stmt.type) {
            case 'SwitchToNewTab':
                return 'SWITCH TO NEW TAB';
            case 'SwitchToTab':
                return 'SWITCH TO TAB';
            case 'OpenInNewTab':
                return 'OPEN IN NEW TAB';
            case 'CloseTab':
                return 'CLOSE TAB';
            default:
                return stmt.type;
        }
    }

    /**
     * Extract target from statement types that have a target property
     */
    private extractTarget(stmt: StatementNode): TargetNode | null {
        if ('target' in stmt && stmt.target) {
            return stmt.target as TargetNode;
        }
        return null;
    }

    /**
     * Validate a target reference (Page.field)
     */
    private validateTarget(
        target: TargetNode,
        usedPages: Set<string>,
        stmt: StatementNode
    ): void {
        if (target.type !== 'Target' || !target.page || !target.field) {
            return;
        }

        const { page: pageName, field: fieldName } = target;

        if (!usedPages.has(pageName)) {
            this.addError(
                VeroErrorCode.UNDEFINED_PAGE,
                `Page '${pageName}' is not in USE list. Add: use ${pageName}`,
                stmt.line,
                pageName.length,
                'error',
                findSimilar(pageName, [...usedPages]),
            );
            return;
        }

        const fields = this.symbols.pageFields.get(pageName);
        if (fields && !fields.has(fieldName)) {
            this.addError(
                VeroErrorCode.UNDEFINED_FIELD,
                `Field '${fieldName}' is not defined in Page '${pageName}'.`,
                stmt.line,
                fieldName.length,
                'error',
                findSimilar(fieldName, [...fields]),
            );
        }
    }

    /**
     * Validate PERFORM statement (PageActions.action or Page.action)
     */
    private validatePerformAction(
        pageName: string,
        actionName: string,
        line: number,
        usedPageActions: Set<string>
    ): void {
        if (this.symbols.pageActions.has(pageName)) {
            if (!usedPageActions.has(pageName)) {
                this.addError(
                    VeroErrorCode.UNDEFINED_PAGEACTIONS,
                    `PageActions '${pageName}' is not in USE list. Add: use ${pageName}`,
                    line,
                    pageName.length,
                    'warning',
                );
            }

            const actions = this.symbols.pageActionsActions.get(pageName);
            if (actions && !actions.has(actionName)) {
                this.addError(
                    VeroErrorCode.UNDEFINED_ACTION,
                    `Action '${actionName}' is not defined in PageActions '${pageName}'.`,
                    line,
                    actionName.length,
                    'error',
                    findSimilar(actionName, [...actions]),
                );
            }
        } else if (this.symbols.pages.has(pageName)) {
            const fields = this.symbols.pageFields.get(pageName);
            if (fields && !fields.has(actionName)) {
                this.addError(
                    VeroErrorCode.UNDEFINED_ACTION,
                    `Action '${actionName}' is not defined in Page '${pageName}'.`,
                    line,
                    actionName.length,
                    'error',
                    findSimilar(actionName, [...fields]),
                );
            }
        } else {
            const allNames = [...this.symbols.pages.keys(), ...this.symbols.pageActions.keys()];
            this.addError(
                VeroErrorCode.UNDEFINED_PAGEACTIONS,
                `'${pageName}' is not defined. Define it as PAGE or PAGEACTIONS.`,
                line,
                pageName.length,
                'error',
                findSimilar(pageName, allNames),
            );
        }
    }

    /**
     * Get all defined page names
     */
    getPageNames(): string[] {
        return [...this.symbols.pages.keys()];
    }

    /**
     * Get all defined PageActions names
     */
    getPageActionsNames(): string[] {
        return [...this.symbols.pageActions.keys()];
    }

    /**
     * Get fields for a page
     */
    getFieldsForPage(pageName: string): string[] {
        return [...(this.symbols.pageFields.get(pageName) || [])];
    }
}
