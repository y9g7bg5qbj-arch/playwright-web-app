/**
 * Variables API Routes
 * 
 * Provides endpoints for fetching available variables for autocomplete
 * and managing variable definitions.
 */

import { Router, Request, Response } from 'express';
import { VariableScope } from '@playwright-web-app/shared';
import { logger } from '../utils/logger';

const router = Router();

// In-memory storage for demo (replace with database in production)
const globalVariables: Record<string, any> = {
    baseUrl: 'https://example.com',
    apiVersion: 'v1',
    defaultTimeout: 30000,
};

const environmentVariables: Record<string, Record<string, any>> = {
    development: {
        apiUrl: 'https://dev-api.example.com',
        debug: true,
    },
    staging: {
        apiUrl: 'https://staging-api.example.com',
        debug: true,
    },
    production: {
        apiUrl: 'https://api.example.com',
        debug: false,
    },
};

interface Variable {
    key: string;
    value: any;
    scope: VariableScope;
    type: 'string' | 'number' | 'boolean' | 'json' | 'array';
    sensitive?: boolean;
    description?: string;
}

/**
 * GET /api/variables
 * 
 * Fetches all available variables for autocomplete grouped by scope.
 * Query params:
 *   - workflowId: Workflow ID to get workflow-level variables
 *   - flowId: Flow ID to get flow-level variables
 *   - environment: Environment name (development, staging, production)
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const { workflowId, flowId, environment = 'development' } = req.query;

        const variables: Variable[] = [];

        // 1. Global variables (always available)
        for (const [key, value] of Object.entries(globalVariables)) {
            variables.push({
                key,
                value,
                scope: VariableScope.GLOBAL,
                type: inferType(value),
            });
        }

        // 2. Environment variables
        const envVars = environmentVariables[environment as string] || {};
        for (const [key, value] of Object.entries(envVars)) {
            variables.push({
                key,
                value,
                scope: VariableScope.ENVIRONMENT,
                type: inferType(value),
            });
        }

        // 3. Workflow variables (if workflowId provided)
        if (workflowId) {
            // TODO: Fetch from database
            // For now, return sample workflow variables
            variables.push({
                key: 'workflowName',
                value: 'Sample Workflow',
                scope: VariableScope.WORKFLOW,
                type: 'string',
            });
        }

        // 4. Flow variables (if flowId provided)
        if (flowId) {
            // TODO: Fetch from database by parsing flow JSON for set-variable blocks
            // For now, return sample flow variables
            variables.push({
                key: 'username',
                value: 'testuser',
                scope: VariableScope.FLOW,
                type: 'string',
            });
            variables.push({
                key: 'password',
                value: '********',
                scope: VariableScope.FLOW,
                type: 'string',
                sensitive: true,
            });
        }

        // 5. Common data variables (show structure from data sources)
        // These would be populated based on configured data sources
        variables.push({
            key: 'row',
            value: { email: 'example@test.com', name: 'Sample' },
            scope: VariableScope.DATA,
            type: 'json',
            description: 'Current data row during iteration',
        });

        // 6. Runtime extracted variables (from previous steps)
        // These are dynamic and would be populated during execution
        variables.push({
            key: '$extract.lastResponse',
            value: null,
            scope: VariableScope.RUNTIME,
            type: 'json',
            description: 'Last API response',
        });

        res.json({
            success: true,
            variables,
            metadata: {
                scopeOrder: [
                    VariableScope.RUNTIME,
                    VariableScope.DATA,
                    VariableScope.FLOW,
                    VariableScope.WORKFLOW,
                    VariableScope.ENVIRONMENT,
                    VariableScope.GLOBAL,
                ],
                scopeDescriptions: {
                    [VariableScope.RUNTIME]: 'Values extracted during test execution',
                    [VariableScope.DATA]: 'Current data row in iteration',
                    [VariableScope.FLOW]: 'Variables set within this flow',
                    [VariableScope.WORKFLOW]: 'Shared across all flows in workflow',
                    [VariableScope.ENVIRONMENT]: 'Environment-specific values',
                    [VariableScope.GLOBAL]: 'Shared across all workflows',
                },
            },
        });
    } catch (error) {
        logger.error('Error fetching variables:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

/**
 * GET /api/variables/global
 * Get all global variables
 */
router.get('/global', async (_req: Request, res: Response) => {
    res.json({
        success: true,
        variables: Object.entries(globalVariables).map(([key, value]) => ({
            key,
            value,
            type: inferType(value),
        })),
    });
});

/**
 * PUT /api/variables/global/:key
 * Set a global variable
 */
router.put('/global/:key', async (req: Request, res: Response) => {
    const { key } = req.params;
    const { value, sensitive } = req.body;

    globalVariables[key] = value;

    res.json({
        success: true,
        variable: {
            key,
            value: sensitive ? '********' : value,
            scope: VariableScope.GLOBAL,
            type: inferType(value),
            sensitive,
        },
    });
});

/**
 * DELETE /api/variables/global/:key
 * Delete a global variable
 */
router.delete('/global/:key', async (req: Request, res: Response) => {
    const { key } = req.params;

    if (key in globalVariables) {
        delete globalVariables[key];
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, error: 'Variable not found' });
    }
});

/**
 * GET /api/variables/environment/:env
 * Get all variables for a specific environment
 */
router.get('/environment/:env', async (req: Request, res: Response) => {
    const { env } = req.params;
    const vars = environmentVariables[env] || {};

    res.json({
        success: true,
        environment: env,
        variables: Object.entries(vars).map(([key, value]) => ({
            key,
            value,
            type: inferType(value),
        })),
    });
});

/**
 * PUT /api/variables/environment/:env/:key
 * Set an environment variable
 */
router.put('/environment/:env/:key', async (req: Request, res: Response) => {
    const { env, key } = req.params;
    const { value } = req.body;

    if (!environmentVariables[env]) {
        environmentVariables[env] = {};
    }

    environmentVariables[env][key] = value;

    res.json({
        success: true,
        variable: {
            key,
            value,
            scope: VariableScope.ENVIRONMENT,
            type: inferType(value),
        },
    });
});

/**
 * POST /api/variables/parse-flow
 * Parse a flow JSON to extract all set-variable blocks
 * Returns the variables that would be defined by the flow
 */
router.post('/parse-flow', async (req: Request, res: Response) => {
    try {
        const { nodes } = req.body;

        if (!Array.isArray(nodes)) {
            return res.status(400).json({ success: false, error: 'nodes must be an array' });
        }

        const flowVariables: Variable[] = [];

        for (const node of nodes) {
            if (node.data?.actionType === 'set-variable') {
                flowVariables.push({
                    key: node.data.variableName || node.data.name,
                    value: node.data.value || node.data.defaultValue,
                    scope: VariableScope.FLOW,
                    type: inferType(node.data.value),
                });
            }

            if (node.data?.actionType === 'extract') {
                flowVariables.push({
                    key: node.data.saveAs || node.data.variableName,
                    value: null, // Runtime extracted
                    scope: VariableScope.RUNTIME,
                    type: 'string',
                    description: `Extracted from ${node.data.extractType || 'text'}`,
                });
            }

            if (node.data?.actionType === 'data') {
                flowVariables.push({
                    key: node.data.iterateAs || 'row',
                    value: {}, // Data row placeholder
                    scope: VariableScope.DATA,
                    type: 'json',
                    description: `Data from ${node.data.sourceType || 'file'}`,
                });
            }
        }

        res.json({
            success: true,
            variables: flowVariables,
        });
    } catch (error) {
        logger.error('Error parsing flow:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

/**
 * Helper to infer variable type from value
 */
function inferType(value: any): 'string' | 'number' | 'boolean' | 'json' | 'array' {
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'object' && value !== null) return 'json';
    return 'string';
}

export default router;
