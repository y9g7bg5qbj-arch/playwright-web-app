import { ProgramNode, PageNode, PageActionsNode, FeatureNode, StatementNode, ExpressionNode } from '../parser/ast.js';

export interface ValidationError {
    message: string;
    severity: 'error' | 'warning';
    line?: number;
    column?: number;
    endColumn?: number;
    suggestion?: string;
    code?: string;  // Error code like VERO-201
}

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
}

export interface ValidationContext {
    pages?: PageNode[];
    pageActions?: PageActionsNode[];
}

export interface ValidationOptions {
    context?: ValidationContext;
}

export class Validator {
    private errors: ValidationError[] = [];
    private warnings: ValidationError[] = [];
    private definedPages: Set<string> = new Set();
    private definedPageActions: Set<string> = new Set();
    private definedFields: Map<string, Set<string>> = new Map();
    private definedActions: Map<string, Set<string>> = new Map();
    private definedVariables: Map<string, Set<string>> = new Map();  // Page -> variable names
    private scenarioVariables: Set<string> = new Set();  // Variables defined in current scenario

    validate(ast: ProgramNode, options?: ValidationOptions): ValidationResult {
        this.resetState();

        // Pre-populate from context (pages/pageActions from other files in the project)
        if (options?.context?.pages) {
            for (const page of options.context.pages) {
                this.collectPageDefinitions(page);
            }
        }
        if (options?.context?.pageActions) {
            for (const pa of options.context.pageActions) {
                this.collectPageActionsDefinitions(pa);
            }
        }

        // First pass: collect definitions from current AST
        for (const page of ast.pages) {
            this.collectPageDefinitions(page);
        }

        // Collect PageActions definitions from current AST
        for (const pa of ast.pageActions) {
            this.collectPageActionsDefinitions(pa);
        }

        // Second pass: validate
        for (const page of ast.pages) {
            this.validatePage(page);
        }

        for (const feature of ast.features) {
            this.validateFeature(feature);
        }

        return {
            valid: this.errors.length === 0,
            errors: this.errors,
            warnings: this.warnings
        };
    }

    private collectPageDefinitions(page: PageNode): void {
        if (this.definedPages.has(page.name)) {
            this.addError(`Duplicate page definition: ${page.name}`, page.line, undefined, 'VERO-100');
        }

        this.definedPages.add(page.name);
        this.definedFields.set(page.name, new Set(page.fields.map(f => f.name)));
        this.definedVariables.set(page.name, new Set(page.variables.map(v => v.name)));
        this.definedActions.set(page.name, new Set(page.actions.map(a => a.name)));
    }

    private collectPageActionsDefinitions(pa: PageActionsNode): void {
        if (this.definedPageActions.has(pa.name)) {
            this.addError(`Duplicate PageActions definition: ${pa.name}`, pa.line, undefined, 'VERO-101');
        }

        this.definedPageActions.add(pa.name);
        // PageActions also define actions that can be called via PERFORM
        this.definedActions.set(pa.name, new Set(pa.actions.map(a => a.name)));
    }

    private validatePage(page: PageNode): void {
        // Check naming conventions
        if (!this.isPascalCase(page.name)) {
            this.addWarning(
                `Page name '${page.name}' should be PascalCase`,
                page.line,
                `Consider renaming to '${this.toPascalCase(page.name)}'`
            );
        }

        // Check for duplicate fields
        const fieldNames = new Set<string>();
        for (const field of page.fields) {
            if (fieldNames.has(field.name)) {
                this.addError(`Duplicate field '${field.name}' in page ${page.name}`, field.line);
            }
            fieldNames.add(field.name);

            if (!this.isCamelCase(field.name)) {
                this.addWarning(
                    `Field name '${field.name}' should be camelCase`,
                    field.line
                );
            }
        }
    }

    private validateFeature(feature: FeatureNode): void {
        // Validate USE statements - can use either Pages or PageActions
        for (const use of feature.uses) {
            if (!this.definedPages.has(use.name) && !this.definedPageActions.has(use.name)) {
                this.addError(
                    `'${use.name}' is used but not defined`,
                    use.line,
                    `Make sure ${use.name}.vero exists in pages/ or PageActions/`,
                    'VERO-200'
                );
            }
        }

        // Validate scenarios
        for (const scenario of feature.scenarios) {
            // Reset scenario-level variables for each scenario
            this.scenarioVariables = new Set();

            for (const stmt of scenario.statements) {
                this.validateStatement(stmt, feature);
            }
        }
    }

    private validateStatement(stmt: StatementNode, feature: FeatureNode): void {
        // Helper to validate a target's page reference
        const validateTargetPage = (target: { page?: string, field?: string }, line: number) => {
            if (target.page && !feature.uses.some(u => u.name === target.page)) {
                this.addError(
                    `Page '${target.page}' is referenced but not in USE list`,
                    line,
                    `Add 'USE ${target.page}' at the top of the feature`,
                    'VERO-201'
                );
            }
            // Also check if the field exists on the page
            if (target.page && target.field) {
                const pageFields = this.definedFields.get(target.page);
                if (pageFields && !pageFields.has(target.field)) {
                    this.addWarning(
                        `Field '${target.field}' may not be defined in page '${target.page}'`,
                        line,
                        `Define the field in ${target.page}.vero`,
                        'VERO-205'
                    );
                }
            }
        };

        // Validate targets and expressions by statement type
        switch (stmt.type) {
            case 'Click':
            case 'RightClick':
            case 'DoubleClick':
            case 'ForceClick':
            case 'Hover':
            case 'Check':
            case 'WaitFor':
                validateTargetPage(stmt.target, stmt.line);
                break;

            case 'Fill':
                validateTargetPage(stmt.target, stmt.line);
                this.validateExpression(stmt.value, stmt.line, feature);
                break;

            case 'Drag':
                validateTargetPage(stmt.source, stmt.line);
                if (stmt.destination.type === 'Target') {
                    validateTargetPage(stmt.destination, stmt.line);
                }
                break;

            case 'Upload':
                validateTargetPage(stmt.target, stmt.line);
                for (const file of stmt.files) {
                    this.validateExpression(file, stmt.line, feature);
                }
                break;

            case 'TakeScreenshot':
                if (stmt.target) {
                    validateTargetPage(stmt.target, stmt.line);
                }
                break;
        }

        // Check PERFORM statements for undefined pages/actions
        if (stmt.type === 'Perform') {
            const action = stmt.action;
            if (action.page) {
                if (!feature.uses.some(u => u.name === action.page)) {
                    this.addError(
                        `Page '${action.page}' is referenced but not in USE list`,
                        stmt.line,
                        `Add 'USE ${action.page}' at the top of the feature`,
                        'VERO-201'
                    );
                }
                // Check if action exists on the page
                const pageActions = this.definedActions.get(action.page);
                if (pageActions && !pageActions.has(action.action)) {
                    this.addError(
                        `Action '${action.action}' is not defined in page '${action.page}'`,
                        stmt.line,
                        `Define the action in ${action.page} or check spelling`,
                        'VERO-202'
                    );
                }
            }
            // Validate arguments are defined
            for (const arg of action.arguments) {
                this.validateExpression(arg, stmt.line, feature);
            }
        }

        // Check LOAD statements - they define new variables
        if (stmt.type === 'Load') {
            this.scenarioVariables.add(stmt.variable);
        }

        // Check FOR EACH statements
        if (stmt.type === 'ForEach') {
            // The collection variable should be defined
            if (!this.scenarioVariables.has(stmt.collectionVariable)) {
                this.addError(
                    `Variable '${stmt.collectionVariable}' is not defined`,
                    stmt.line,
                    `Load the data first with 'LOAD ${stmt.collectionVariable} FROM "table"'`,
                    'VERO-203'
                );
            }
            // The item variable is defined within the loop
            this.scenarioVariables.add(stmt.itemVariable);
            for (const innerStmt of stmt.statements) {
                this.validateStatement(innerStmt, feature);
            }
        }

        // Check VERIFY/ASSERT statements
        if (stmt.type === 'Verify' || stmt.type === 'VerifyHas') {
            if ('target' in stmt && stmt.target && stmt.target.type === 'Target') {
                const target = stmt.target;
                if (target.page && !feature.uses.some(u => u.name === target.page)) {
                    this.addError(
                        `Page '${target.page}' is referenced but not in USE list`,
                        stmt.line,
                        `Add 'USE ${target.page}' at the top of the feature`,
                        'VERO-201'
                    );
                }
            }
        }
    }

    private validateExpression(expr: ExpressionNode, line: number, feature: FeatureNode): void {
        if (expr.type === 'VariableReference') {
            const varName = expr.name;
            const pageName = expr.page;

            if (pageName) {
                // Check if page is in USE list
                if (!feature.uses.some(u => u.name === pageName)) {
                    this.addError(
                        `Page '${pageName}' is referenced but not in USE list`,
                        line,
                        `Add 'USE ${pageName}' at the top of the feature`,
                        'VERO-201'
                    );
                }
                // Check if variable exists on page
                const pageVars = this.definedVariables.get(pageName);
                const pageFields = this.definedFields.get(pageName);
                if (pageVars && pageFields && !pageVars.has(varName) && !pageFields.has(varName)) {
                    this.addWarning(
                        `Variable or field '${varName}' may not be defined in page '${pageName}'`,
                        line,
                        undefined,
                        'VERO-204'
                    );
                }
            } else {
                // Check if it's a scenario-level variable
                if (!this.scenarioVariables.has(varName)) {
                    this.addWarning(
                        `Variable '${varName}' may not be defined`,
                        line,
                        `Define it with 'LOAD ${varName} FROM "table"' or ensure it's available`,
                        'VERO-204'
                    );
                }
            }
        }
    }

    private resetState(): void {
        this.errors = [];
        this.warnings = [];
        this.definedPages = new Set();
        this.definedPageActions = new Set();
        this.definedFields = new Map();
        this.definedActions = new Map();
        this.definedVariables = new Map();
        this.scenarioVariables = new Set();
    }

    private addError(message: string, line?: number, suggestion?: string, code?: string): void {
        this.errors.push({ message, severity: 'error', line, suggestion, code });
    }

    private addWarning(message: string, line?: number, suggestion?: string, code?: string): void {
        this.warnings.push({ message, severity: 'warning', line, suggestion, code });
    }

    private isPascalCase(str: string): boolean {
        return /^[A-Z][a-zA-Z0-9]*$/.test(str);
    }

    private isCamelCase(str: string): boolean {
        return /^[a-z][a-zA-Z0-9]*$/.test(str);
    }

    private toPascalCase(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

export function validate(ast: ProgramNode, options?: ValidationOptions): ValidationResult {
    const validator = new Validator();
    return validator.validate(ast, options);
}
