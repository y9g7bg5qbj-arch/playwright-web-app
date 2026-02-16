/**
 * Variable Resolver
 * 
 * Core engine for parsing and resolving {{variable}} syntax with Postman-style scope hierarchy.
 * Resolution order (narrowest/highest-priority first):
 * RUNTIME > DATA > FLOW > WORKFLOW > ENVIRONMENT > GLOBAL
 */

import { VariableScope, SCOPE_PRECEDENCE, VariableType, VariableContextState, ResolvedVariable, VariableReference, VARIABLE_PATTERN, VARIABLE_PATTERN_SINGLE, ENV_PREFIX, GLOBAL_PREFIX, EXTRACT_PREFIX } from '@playwright-web-app/shared';

// ============================================
// VARIABLE CONTEXT CLASS
// ============================================

export class VariableContext {
    private scopes: Map<VariableScope, Map<string, any>>;
    private metadata: Map<string, { type: VariableType; sensitive?: boolean }>;

    constructor(initialState?: Partial<VariableContextState>) {
        this.scopes = new Map();
        this.metadata = new Map();

        // Initialize all scopes
        for (const scope of Object.values(VariableScope)) {
            this.scopes.set(scope as VariableScope, new Map());
        }

        // Load initial state if provided
        if (initialState) {
            this.loadState(initialState);
        }
    }

    /**
     * Load variables from a state object
     */
    loadState(state: Partial<VariableContextState>): void {
        if (state.global) this.loadScope(VariableScope.GLOBAL, state.global);
        if (state.environment) this.loadScope(VariableScope.ENVIRONMENT, state.environment);
        if (state.workflow) this.loadScope(VariableScope.WORKFLOW, state.workflow);
        if (state.flow) this.loadScope(VariableScope.FLOW, state.flow);
        if (state.data) this.loadScope(VariableScope.DATA, state.data);
        if (state.runtime) this.loadScope(VariableScope.RUNTIME, state.runtime);
    }

    /**
     * Load variables into a specific scope
     */
    private loadScope(scope: VariableScope, variables: Record<string, any>): void {
        const scopeMap = this.scopes.get(scope)!;
        for (const [key, value] of Object.entries(variables)) {
            scopeMap.set(key, value);
        }
    }

    /**
     * Set a variable at a specific scope
     */
    set(key: string, value: any, scope: VariableScope = VariableScope.FLOW): void {
        const scopeMap = this.scopes.get(scope);
        if (scopeMap) {
            scopeMap.set(key, value);
        }
    }

    /**
     * Set a variable with type metadata
     */
    setWithType(
        key: string,
        value: any,
        scope: VariableScope,
        type: VariableType,
        sensitive?: boolean
    ): void {
        this.set(key, value, scope);
        this.metadata.set(`${scope}:${key}`, { type, sensitive });
    }

    /**
     * Get a variable value by path, searching from narrowest to broadest scope
     * Supports nested paths like "user.address.city" and array access like "items[0].name"
     */
    get(path: string): any {
        // Check for explicit scope prefix
        if (path.startsWith(ENV_PREFIX)) {
            return this.getFromScope(path.slice(ENV_PREFIX.length), VariableScope.ENVIRONMENT)
                ?? process.env[path.slice(ENV_PREFIX.length)];
        }
        if (path.startsWith(GLOBAL_PREFIX)) {
            return this.getFromScope(path.slice(GLOBAL_PREFIX.length), VariableScope.GLOBAL);
        }
        if (path.startsWith(EXTRACT_PREFIX)) {
            return this.getFromScope(path.slice(EXTRACT_PREFIX.length), VariableScope.RUNTIME);
        }

        // Search through scopes in precedence order (narrowest first)
        for (const scope of SCOPE_PRECEDENCE) {
            const value = this.getFromScope(path, scope);
            if (value !== undefined) {
                return value;
            }
        }

        // Check process.env as fallback for undefined variables
        const envValue = process.env[path];
        if (envValue !== undefined) {
            return envValue;
        }

        return undefined;
    }

    /**
     * Get a variable from a specific scope
     */
    getFromScope(path: string, scope: VariableScope): any {
        const scopeMap = this.scopes.get(scope);
        if (!scopeMap) return undefined;

        // Handle simple key
        const parts = this.parsePath(path);
        const rootKey = parts[0];
        let value = scopeMap.get(rootKey);

        if (value === undefined) return undefined;

        // Navigate nested path
        for (let i = 1; i < parts.length; i++) {
            if (value === null || value === undefined) return undefined;
            const part = parts[i];

            // Handle array index
            const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
            if (arrayMatch) {
                value = value[arrayMatch[1]];
                if (Array.isArray(value)) {
                    value = value[parseInt(arrayMatch[2], 10)];
                } else {
                    return undefined;
                }
            } else if (typeof value === 'object') {
                value = value[part];
            } else {
                return undefined;
            }
        }

        return value;
    }

    /**
     * Parse a path like "user.address.city" or "items[0].name"
     */
    private parsePath(path: string): string[] {
        // Split by dots, but handle array access
        const parts: string[] = [];
        let current = '';

        for (const char of path) {
            if (char === '.') {
                if (current) parts.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        if (current) parts.push(current);

        return parts;
    }

    /**
     * Resolve a template string by replacing all {{variable}} references
     */
    resolve(template: string): string {
        if (!template || typeof template !== 'string') return template;

        return template.replace(VARIABLE_PATTERN, (match, path) => {
            const trimmedPath = path.trim();

            // Check if it's an expression (contains operators)
            if (this.isExpression(trimmedPath)) {
                return this.evaluateExpression(trimmedPath);
            }

            const value = this.get(trimmedPath);
            if (value === undefined) {
                // Keep original if not found (for debugging)
                return match;
            }

            // Convert to string for template
            if (typeof value === 'object') {
                return JSON.stringify(value);
            }
            return String(value);
        });
    }

    /**
     * Check if a path contains expression operators
     */
    private isExpression(path: string): boolean {
        return /[+\-*/%<>=!&|?:]/.test(path);
    }

    /**
     * Evaluate a simple expression within variable context
     * Supports: concatenation, basic math, ternary
     */
    private evaluateExpression(expression: string): string {
        try {
            // Replace variable references with their values
            const resolvedExpression = expression.replace(/(\w+(?:\.\w+)*)/g, (match) => {
                const value = this.get(match);
                if (value === undefined) return 'undefined';
                if (typeof value === 'string') return `"${value}"`;
                return String(value);
            });

            // Safely evaluate (limited to simple expressions)
            // Note: In production, use a proper expression parser
            const result = new Function('return ' + resolvedExpression)();
            return String(result);
        } catch (e) {
            return `{{${expression}}}`;  // Return original on error
        }
    }

    /**
     * Resolve all string fields in an object recursively
     */
    resolveObject<T extends Record<string, any>>(obj: T): T {
        if (!obj || typeof obj !== 'object') return obj;

        const result: any = Array.isArray(obj) ? [] : {};

        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                result[key] = this.resolve(value);
            } else if (Array.isArray(value)) {
                result[key] = value.map(item =>
                    typeof item === 'string' ? this.resolve(item) :
                        typeof item === 'object' ? this.resolveObject(item) : item
                );
            } else if (typeof value === 'object' && value !== null) {
                result[key] = this.resolveObject(value);
            } else {
                result[key] = value;
            }
        }

        return result;
    }

    /**
     * Get all available variables (for autocomplete)
     */
    getAllVariables(): ResolvedVariable[] {
        const variables: ResolvedVariable[] = [];

        for (const scope of SCOPE_PRECEDENCE) {
            const scopeMap = this.scopes.get(scope);
            if (scopeMap) {
                scopeMap.forEach((value, key) => {
                    const meta = this.metadata.get(`${scope}:${key}`);
                    variables.push({
                        key,
                        value: meta?.sensitive ? '********' : value,
                        scope,
                        type: meta?.type || this.inferType(value),
                        sensitive: meta?.sensitive
                    });
                });
            }
        }

        return variables;
    }

    /**
     * Get all variable keys for autocomplete (grouped by scope)
     */
    getVariableKeys(): { scope: VariableScope; keys: string[] }[] {
        const result: { scope: VariableScope; keys: string[] }[] = [];

        for (const scope of SCOPE_PRECEDENCE) {
            const scopeMap = this.scopes.get(scope);
            if (scopeMap && scopeMap.size > 0) {
                result.push({
                    scope,
                    keys: Array.from(scopeMap.keys())
                });
            }
        }

        return result;
    }

    /**
     * Infer the type of a value
     */
    private inferType(value: any): VariableType {
        if (typeof value === 'number') return 'number';
        if (typeof value === 'boolean') return 'boolean';
        if (typeof value === 'object') return 'json';
        return 'string';
    }

    /**
     * Parse a variable reference from {{...}} syntax
     */
    static parseReference(template: string): VariableReference | null {
        const match = template.match(VARIABLE_PATTERN_SINGLE);
        if (!match) return null;

        const raw = match[0];
        const path = match[1].trim();

        let scope: VariableScope | undefined;
        let cleanPath = path;

        if (path.startsWith(ENV_PREFIX)) {
            scope = VariableScope.ENVIRONMENT;
            cleanPath = path.slice(ENV_PREFIX.length);
        } else if (path.startsWith(GLOBAL_PREFIX)) {
            scope = VariableScope.GLOBAL;
            cleanPath = path.slice(GLOBAL_PREFIX.length);
        } else if (path.startsWith(EXTRACT_PREFIX)) {
            scope = VariableScope.RUNTIME;
            cleanPath = path.slice(EXTRACT_PREFIX.length);
        }

        return {
            raw,
            path: cleanPath,
            scope,
            isExpression: /[+\-*/%<>=!&|?:]/.test(path)
        };
    }

    /**
     * Find all variable references in a string
     */
    static findReferences(template: string): VariableReference[] {
        const references: VariableReference[] = [];
        let match: RegExpExecArray | null;

        const pattern = new RegExp(VARIABLE_PATTERN.source, 'g');
        while ((match = pattern.exec(template)) !== null) {
            const ref = VariableContext.parseReference(match[0]);
            if (ref) references.push(ref);
        }

        return references;
    }

    /**
     * Check if a string contains any variable references
     */
    static hasVariables(template: string): boolean {
        return VARIABLE_PATTERN_SINGLE.test(template);
    }

    /**
     * Export current state
     */
    toState(): VariableContextState {
        return {
            global: Object.fromEntries(this.scopes.get(VariableScope.GLOBAL) || []),
            environment: Object.fromEntries(this.scopes.get(VariableScope.ENVIRONMENT) || []),
            workflow: Object.fromEntries(this.scopes.get(VariableScope.WORKFLOW) || []),
            flow: Object.fromEntries(this.scopes.get(VariableScope.FLOW) || []),
            data: Object.fromEntries(this.scopes.get(VariableScope.DATA) || []),
            runtime: Object.fromEntries(this.scopes.get(VariableScope.RUNTIME) || [])
        };
    }

    /**
     * Clear a specific scope
     */
    clearScope(scope: VariableScope): void {
        this.scopes.get(scope)?.clear();
    }

    /**
     * Clear all scopes
     */
    clearAll(): void {
        for (const scope of Object.values(VariableScope)) {
            this.clearScope(scope as VariableScope);
        }
    }

    /**
     * Set current data row (for iteration)
     */
    setDataRow(row: Record<string, any>, variableName: string = 'row'): void {
        this.clearScope(VariableScope.DATA);
        this.set(variableName, row, VariableScope.DATA);
        // Also set individual fields for direct access
        for (const [key, value] of Object.entries(row)) {
            this.set(`${variableName}.${key}`, value, VariableScope.DATA);
        }
    }

    /**
     * Set a runtime extracted value
     */
    setExtracted(key: string, value: any): void {
        this.set(key, value, VariableScope.RUNTIME);
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Quick resolve helper for one-off template resolution
 */
export function resolveTemplate(
    template: string,
    variables: Record<string, any>
): string {
    const context = new VariableContext({ flow: variables });
    return context.resolve(template);
}

/**
 * Check if a value contains unresolved variables
 */
export function hasUnresolvedVariables(value: string): boolean {
    return VARIABLE_PATTERN_SINGLE.test(value);
}

/**
 * Extract all variable names from a template
 */
export function extractVariableNames(template: string): string[] {
    const refs = VariableContext.findReferences(template);
    return refs.map(ref => ref.path);
}
