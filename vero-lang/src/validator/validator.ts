import { ProgramNode, PageNode, FeatureNode } from '../parser/ast.js';

export interface ValidationError {
    message: string;
    severity: 'error' | 'warning';
    line?: number;
    suggestion?: string;
}

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
}

export class Validator {
    private errors: ValidationError[] = [];
    private warnings: ValidationError[] = [];
    private definedPages: Set<string> = new Set();
    private definedFields: Map<string, Set<string>> = new Map();
    private definedActions: Map<string, Set<string>> = new Map();

    validate(ast: ProgramNode): ValidationResult {
        this.errors = [];
        this.warnings = [];
        this.definedPages = new Set();
        this.definedFields = new Map();
        this.definedActions = new Map();

        // First pass: collect definitions
        for (const page of ast.pages) {
            this.collectPageDefinitions(page);
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
            this.addError(`Duplicate page definition: ${page.name}`, page.line);
        }

        this.definedPages.add(page.name);

        const fields = new Set<string>();
        for (const field of page.fields) fields.add(field.name);
        for (const variable of page.variables) fields.add(variable.name);
        this.definedFields.set(page.name, fields);

        const actions = new Set<string>();
        for (const action of page.actions) actions.add(action.name);
        this.definedActions.set(page.name, actions);
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
        // Validate USE statements
        for (const usedPage of feature.uses) {
            if (!this.definedPages.has(usedPage)) {
                this.addError(
                    `Page '${usedPage}' is used but not defined`,
                    feature.line,
                    `Make sure ${usedPage}.vero exists`
                );
            }
        }

        // Validate scenarios
        for (const scenario of feature.scenarios) {
            for (const stmt of scenario.statements) {
                if (stmt.type === 'Do') {
                    const action = stmt.action;
                    if (action.page && !feature.uses.includes(action.page)) {
                        this.addError(
                            `Page '${action.page}' is referenced but not in USE list`,
                            stmt.line,
                            `Add 'USE ${action.page}' at the top of the feature`
                        );
                    }
                }
            }
        }
    }

    private addError(message: string, line?: number, suggestion?: string): void {
        this.errors.push({ message, severity: 'error', line, suggestion });
    }

    private addWarning(message: string, line?: number, suggestion?: string): void {
        this.warnings.push({ message, severity: 'warning', line, suggestion });
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

export function validate(ast: ProgramNode): ValidationResult {
    const validator = new Validator();
    return validator.validate(ast);
}
