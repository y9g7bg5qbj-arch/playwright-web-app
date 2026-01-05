/**
 * Variable Context
 * Manages variables during flow execution with scoping support for loops and conditionals
 */

/**
 * Simple helper to get nested object values
 */
function getNestedValue(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
        if (current === null || current === undefined) return undefined;
        current = current[part];
    }
    return current;
}

export class VariableContext {
    private scopes: Map<string, any>[] = [];
    private environmentVariables: Record<string, string>;

    constructor(
        initialVariables: Record<string, any> = {},
        environmentVariables: Record<string, string> = {}
    ) {
        // Create root scope with initial variables
        this.scopes.push(new Map(Object.entries(initialVariables)));
        this.environmentVariables = environmentVariables;
    }

    /**
     * Set a variable value
     * If the variable exists in a parent scope, updates it there
     * Otherwise creates it in the current scope
     */
    set(name: string, value: any): void {
        // Check if variable exists in any scope (from current to root)
        for (let i = this.scopes.length - 1; i >= 0; i--) {
            if (this.scopes[i].has(name)) {
                this.scopes[i].set(name, value);
                return;
            }
        }

        // Create in current scope if not found
        this.currentScope.set(name, value);
    }

    /**
     * Get a variable value
     * Supports nested paths like "user.email" or "data[0].name"
     */
    get(name: string): any {
        // Handle environment variables
        if (name.startsWith('env.') || name.startsWith('ENV.')) {
            const envKey = name.slice(4);
            return this.environmentVariables[envKey] ?? process.env[envKey];
        }

        // Handle nested paths
        const parts = this.parsePath(name);
        const rootVar = parts[0];

        // Search from current scope up to root
        for (let i = this.scopes.length - 1; i >= 0; i--) {
            if (this.scopes[i].has(rootVar)) {
                const value = this.scopes[i].get(rootVar);
                if (parts.length === 1) {
                    return value;
                }
                // Get nested value
                return getNestedValue(value, parts.slice(1).join('.'));
            }
        }

        return undefined;
    }

    /**
     * Check if a variable exists
     */
    has(name: string): boolean {
        const parts = this.parsePath(name);
        const rootVar = parts[0];

        for (let i = this.scopes.length - 1; i >= 0; i--) {
            if (this.scopes[i].has(rootVar)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Delete a variable from the current scope
     */
    delete(name: string): boolean {
        return this.currentScope.delete(name);
    }

    /**
     * Resolve variable placeholders in a template string
     * Supports {{variable}} syntax with nested paths and expressions
     */
    resolve(template: string): string {
        if (typeof template !== 'string') {
            return String(template);
        }

        // Match {{...}} patterns
        const pattern = /\{\{([^}]+)\}\}/g;

        return template.replace(pattern, (match, expr) => {
            const trimmedExpr = expr.trim();

            // Check for simple variable reference
            if (/^[\w.[\]]+$/.test(trimmedExpr)) {
                const value = this.get(trimmedExpr);
                return value !== undefined ? String(value) : match;
            }

            // Handle expressions (e.g., {{user.firstName + ' ' + user.lastName}})
            try {
                const result = this.evaluateExpression(trimmedExpr);
                return result !== undefined ? String(result) : match;
            } catch {
                return match;
            }
        });
    }

    /**
     * Resolve all variables in an object (deep)
     */
    resolveObject<T extends Record<string, any>>(obj: T): T {
        const result: any = {};

        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                result[key] = this.resolve(value);
            } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                result[key] = this.resolveObject(value);
            } else if (Array.isArray(value)) {
                result[key] = value.map(item =>
                    typeof item === 'string' ? this.resolve(item) :
                        typeof item === 'object' && item !== null ? this.resolveObject(item) :
                            item
                );
            } else {
                result[key] = value;
            }
        }

        return result as T;
    }

    /**
     * Evaluate a JavaScript expression with variable context
     */
    evaluateExpression(expression: string): any {
        const variables = this.toObject();
        const env = this.environmentVariables;

        // Create a function with variables in scope
        const fn = new Function(
            ...Object.keys(variables),
            'env',
            `return (${expression});`
        );

        try {
            return fn(...Object.values(variables), env);
        } catch (error) {
            throw new Error(`Failed to evaluate expression "${expression}": ${error}`);
        }
    }

    /**
     * Push a new scope (for loops, conditionals)
     */
    pushScope(initialVars: Record<string, any> = {}): void {
        this.scopes.push(new Map(Object.entries(initialVars)));
    }

    /**
     * Pop the current scope
     */
    popScope(): void {
        if (this.scopes.length > 1) {
            this.scopes.pop();
        }
    }

    /**
     * Get all variables as a plain object
     */
    toObject(): Record<string, any> {
        const result: Record<string, any> = {};

        // Merge all scopes from root to current
        for (const scope of this.scopes) {
            for (const [key, value] of scope) {
                result[key] = value;
            }
        }

        return result;
    }

    /**
     * Clone the variable context
     */
    clone(): VariableContext {
        const cloned = new VariableContext({}, this.environmentVariables);
        cloned.scopes = this.scopes.map(scope => new Map(scope));
        return cloned;
    }

    /**
     * Get current scope depth
     */
    get depth(): number {
        return this.scopes.length;
    }

    private get currentScope(): Map<string, any> {
        return this.scopes[this.scopes.length - 1];
    }

    /**
     * Parse a variable path into parts
     * "user.email" -> ["user", "email"]
     * "data[0].name" -> ["data", "0", "name"]
     */
    private parsePath(path: string): string[] {
        const parts: string[] = [];
        let current = '';
        let inBracket = false;

        for (const char of path) {
            if (char === '.' && !inBracket) {
                if (current) {
                    parts.push(current);
                    current = '';
                }
            } else if (char === '[') {
                if (current) {
                    parts.push(current);
                    current = '';
                }
                inBracket = true;
            } else if (char === ']') {
                if (current) {
                    parts.push(current);
                    current = '';
                }
                inBracket = false;
            } else {
                current += char;
            }
        }

        if (current) {
            parts.push(current);
        }

        return parts;
    }
}

/**
 * Utility function to check if a string contains variable placeholders
 */
export function hasVariables(str: string): boolean {
    return /\{\{[^}]+\}\}/.test(str);
}

/**
 * Extract variable names from a template string
 */
export function extractVariables(template: string): string[] {
    const pattern = /\{\{([^}]+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = pattern.exec(template)) !== null) {
        const expr = match[1].trim();
        // Extract simple variable references
        const varMatch = expr.match(/^([\w.[\]]+)/);
        if (varMatch) {
            variables.push(varMatch[1]);
        }
    }

    return variables;
}
