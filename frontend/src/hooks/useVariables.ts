import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Variable types matching backend
 */
export type VariableScope = 'runtime' | 'data' | 'flow' | 'workflow' | 'environment' | 'global';

export interface Variable {
    key: string;
    value: any;
    scope: VariableScope;
    type: 'string' | 'number' | 'boolean' | 'json' | 'array';
    sensitive?: boolean;
    description?: string;
}

interface UseVariablesOptions {
    workflowId?: string;
    flowId?: string;
    environment?: string;
    /** Nodes to parse for flow-defined variables */
    nodes?: any[];
}

interface UseVariablesReturn {
    variables: Variable[];
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    /** Get variables filtered by scope */
    getByScope: (scope: VariableScope) => Variable[];
    /** Search variables by key */
    search: (query: string) => Variable[];
}

const API_BASE = 'http://localhost:3000/api';

/**
 * useVariables Hook
 * 
 * Fetches available variables from the backend for autocomplete.
 * Parses current flow nodes to extract set-variable and extract blocks.
 */
export function useVariables(options: UseVariablesOptions = {}): UseVariablesReturn {
    const { workflowId, flowId, environment = 'development', nodes } = options;

    const [variables, setVariables] = useState<Variable[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch variables from backend
    const fetchVariables = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            if (workflowId) params.set('workflowId', workflowId);
            if (flowId) params.set('flowId', flowId);
            if (environment) params.set('environment', environment);

            const response = await fetch(`${API_BASE}/variables?${params.toString()}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch variables: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success && Array.isArray(data.variables)) {
                setVariables(data.variables);
            } else {
                throw new Error(data.error || 'Invalid response format');
            }
        } catch (err) {
            console.error('Error fetching variables:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');

            // Set default variables on error so autocomplete still works
            setVariables([
                { key: 'baseUrl', value: 'https://example.com', scope: 'global', type: 'string' },
                { key: 'timeout', value: 30000, scope: 'global', type: 'number' },
            ]);
        } finally {
            setIsLoading(false);
        }
    }, [workflowId, flowId, environment]);

    // Parse nodes for locally-defined variables
    const localVariables = useMemo<Variable[]>(() => {
        if (!nodes || !Array.isArray(nodes)) return [];

        const vars: Variable[] = [];

        for (const node of nodes) {
            const actionType = node.data?.actionType;

            // Set Variable blocks
            if (actionType === 'set-variable') {
                const varName = node.data?.variableName || node.data?.name;
                if (varName) {
                    vars.push({
                        key: varName,
                        value: node.data?.value,
                        scope: 'flow',
                        type: inferType(node.data?.value),
                    });
                }
            }

            // Extract blocks
            if (actionType === 'extract') {
                const saveAs = node.data?.saveAs || node.data?.variableName;
                if (saveAs) {
                    vars.push({
                        key: saveAs,
                        value: null,
                        scope: 'runtime',
                        type: 'string',
                        description: `Extracted ${node.data?.extractType || 'text'}`,
                    });
                }
            }

            // Data Source blocks
            if (actionType === 'data') {
                const iterateAs = node.data?.iterateAs || 'row';
                vars.push({
                    key: iterateAs,
                    value: {},
                    scope: 'data',
                    type: 'json',
                    description: `Data from ${node.data?.sourceType || 'file'}`,
                });
            }
        }

        return vars;
    }, [nodes]);

    // Combine backend and local variables
    const allVariables = useMemo(() => {
        // Merge, with local variables taking precedence
        const merged = new Map<string, Variable>();

        // Add backend variables first
        for (const v of variables) {
            merged.set(`${v.scope}:${v.key}`, v);
        }

        // Override/add local variables
        for (const v of localVariables) {
            merged.set(`${v.scope}:${v.key}`, v);
        }

        return Array.from(merged.values());
    }, [variables, localVariables]);

    // Initial fetch
    useEffect(() => {
        fetchVariables();
    }, [fetchVariables]);

    // Filter by scope
    const getByScope = useCallback((scope: VariableScope): Variable[] => {
        return allVariables.filter(v => v.scope === scope);
    }, [allVariables]);

    // Search variables
    const search = useCallback((query: string): Variable[] => {
        if (!query) return allVariables;
        const q = query.toLowerCase();
        return allVariables.filter(v => v.key.toLowerCase().includes(q));
    }, [allVariables]);

    return {
        variables: allVariables,
        isLoading,
        error,
        refetch: fetchVariables,
        getByScope,
        search,
    };
}

/**
 * Infer type from value
 */
function inferType(value: any): 'string' | 'number' | 'boolean' | 'json' | 'array' {
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'object' && value !== null) return 'json';
    return 'string';
}
