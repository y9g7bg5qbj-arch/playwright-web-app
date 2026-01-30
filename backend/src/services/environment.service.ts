/**
 * Environment Service
 *
 * Manages environment variables and global variables with Postman-style
 * precedence (Runtime > Environment > Global).
 *
 * Supports {{variable}} syntax for runtime resolution.
 */

import {
  userEnvironmentRepository,
  environmentVariableRepository,
  globalVariableRepository
} from '../db/repositories/mongo';

// ============================================
// TYPES
// ============================================

export interface EnvironmentInfo {
    id: string;
    name: string;
    description?: string;
    isActive: boolean;
    variableCount: number;
}

export interface Variable {
    key: string;
    value: any;
    type: 'string' | 'number' | 'boolean' | 'json';
    sensitive: boolean;
    description?: string;
    source: 'global' | 'environment' | 'runtime';
}

export interface ResolvedVariables {
    variables: Record<string, any>;
    sources: Record<string, 'global' | 'environment' | 'runtime'>;
}

// ============================================
// ENVIRONMENT SERVICE
// ============================================

export class EnvironmentService {
    /**
     * Get all resolved variables for a user with precedence handling
     *
     * Precedence (highest to lowest):
     * 1. Runtime variables (passed in directly)
     * 2. Active environment variables
     * 3. Global variables
     */
    async getVariables(
        userId: string,
        runtimeVars?: Record<string, string>
    ): Promise<ResolvedVariables> {
        const result: ResolvedVariables = {
            variables: {},
            sources: {}
        };

        // 1. Load global variables (lowest precedence)
        const globalVars = await globalVariableRepository.findByUserId(userId);

        for (const v of globalVars) {
            const value = this.parseValue(v.value, v.type);
            result.variables[v.key] = value;
            result.sources[v.key] = 'global';
        }

        // 2. Load active environment variables (override global)
        const activeEnv = await userEnvironmentRepository.findActiveByUserId(userId);

        if (activeEnv) {
            const envVars = await environmentVariableRepository.findByEnvironmentId(activeEnv.id);
            for (const v of envVars) {
                const value = this.parseValue(v.value, v.type);
                result.variables[v.key] = value;
                result.sources[v.key] = 'environment';
            }
        }

        // 3. Apply runtime variables (highest precedence)
        if (runtimeVars) {
            for (const [key, value] of Object.entries(runtimeVars)) {
                result.variables[key] = value;
                result.sources[key] = 'runtime';
            }
        }

        return result;
    }

    /**
     * Resolve variables in a template string
     *
     * Supports {{variableName}} syntax
     */
    resolveVariables(template: string, variables: Record<string, any>): string {
        return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
            if (varName in variables) {
                const value = variables[varName];
                return typeof value === 'object' ? JSON.stringify(value) : String(value);
            }
            return match; // Keep unresolved variables as-is
        });
    }

    /**
     * Resolve all {{variable}} references in an object recursively
     */
    resolveVariablesInObject<T extends Record<string, any>>(
        obj: T,
        variables: Record<string, any>
    ): T {
        const result: any = {};

        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                result[key] = this.resolveVariables(value, variables);
            } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                result[key] = this.resolveVariablesInObject(value, variables);
            } else if (Array.isArray(value)) {
                result[key] = value.map(item =>
                    typeof item === 'string'
                        ? this.resolveVariables(item, variables)
                        : typeof item === 'object' && item !== null
                            ? this.resolveVariablesInObject(item, variables)
                            : item
                );
            } else {
                result[key] = value;
            }
        }

        return result;
    }

    /**
     * Set the active environment for a user
     */
    async setActiveEnvironment(userId: string, envId: string): Promise<void> {
        // Deactivate all environments for the user
        await userEnvironmentRepository.deactivateAll(userId);

        // Activate the specified environment
        await userEnvironmentRepository.update(envId, { isActive: true });
    }

    /**
     * Get the active environment for a user
     */
    async getActiveEnvironment(userId: string): Promise<EnvironmentInfo | null> {
        const env = await userEnvironmentRepository.findActiveByUserId(userId);

        if (!env) return null;

        const variableCount = await environmentVariableRepository.countByEnvironmentId(env.id);

        return {
            id: env.id,
            name: env.name,
            description: env.description,
            isActive: true,
            variableCount
        };
    }

    /**
     * List all environments for a user
     */
    async listEnvironments(userId: string): Promise<EnvironmentInfo[]> {
        const envs = await userEnvironmentRepository.findByUserId(userId);

        const results: EnvironmentInfo[] = [];
        for (const env of envs) {
            const variableCount = await environmentVariableRepository.countByEnvironmentId(env.id);
            results.push({
                id: env.id,
                name: env.name,
                description: env.description,
                isActive: env.isActive,
                variableCount
            });
        }

        return results;
    }

    /**
     * Create a new environment
     */
    async createEnvironment(
        userId: string,
        name: string,
        options?: {
            description?: string;
            variables?: Array<{ key: string; value: string; type?: string; sensitive?: boolean }>;
            setActive?: boolean;
        }
    ): Promise<EnvironmentInfo> {
        const { description, variables = [], setActive = false } = options || {};

        // If setting as active, deactivate others first
        if (setActive) {
            await userEnvironmentRepository.deactivateAll(userId);
        }

        const env = await userEnvironmentRepository.create({
            userId,
            name,
            description,
            isActive: setActive
        });

        // Create variables
        for (const v of variables) {
            await environmentVariableRepository.upsert(env.id, v.key, {
                value: v.value,
                type: v.type || 'string',
                sensitive: v.sensitive || false
            });
        }

        return {
            id: env.id,
            name: env.name,
            description: env.description,
            isActive: env.isActive,
            variableCount: variables.length
        };
    }

    /**
     * Update an environment
     */
    async updateEnvironment(
        envId: string,
        updates: {
            name?: string;
            description?: string;
        }
    ): Promise<EnvironmentInfo> {
        const env = await userEnvironmentRepository.update(envId, updates);

        if (!env) {
            throw new Error('Environment not found');
        }

        const variableCount = await environmentVariableRepository.countByEnvironmentId(env.id);

        return {
            id: env.id,
            name: env.name,
            description: env.description,
            isActive: env.isActive,
            variableCount
        };
    }

    /**
     * Delete an environment
     */
    async deleteEnvironment(envId: string): Promise<void> {
        // Delete variables first
        await environmentVariableRepository.deleteByEnvironmentId(envId);
        // Delete environment
        await userEnvironmentRepository.delete(envId);
    }

    /**
     * Get environment variables
     */
    async getEnvironmentVariables(envId: string): Promise<Variable[]> {
        const vars = await environmentVariableRepository.findByEnvironmentId(envId);

        return vars.map(v => ({
            key: v.key,
            value: v.sensitive ? '********' : this.parseValue(v.value, v.type),
            type: v.type as Variable['type'],
            sensitive: v.sensitive,
            description: v.description,
            source: 'environment' as const
        }));
    }

    /**
     * Set an environment variable
     */
    async setEnvironmentVariable(
        envId: string,
        key: string,
        value: string,
        options?: {
            type?: string;
            sensitive?: boolean;
            description?: string;
        }
    ): Promise<void> {
        const { type = 'string', sensitive = false, description } = options || {};

        await environmentVariableRepository.upsert(envId, key, {
            value,
            type,
            sensitive,
            description
        });
    }

    /**
     * Delete an environment variable
     */
    async deleteEnvironmentVariable(envId: string, key: string): Promise<void> {
        await environmentVariableRepository.delete(envId, key);
    }

    /**
     * Get global variables for a user
     */
    async getGlobalVariables(userId: string): Promise<Variable[]> {
        const vars = await globalVariableRepository.findByUserId(userId);

        return vars.map(v => ({
            key: v.key,
            value: v.sensitive ? '********' : this.parseValue(v.value, v.type),
            type: v.type as Variable['type'],
            sensitive: v.sensitive,
            description: v.description,
            source: 'global' as const
        }));
    }

    /**
     * Set a global variable
     */
    async setGlobalVariable(
        userId: string,
        key: string,
        value: string,
        options?: {
            type?: string;
            sensitive?: boolean;
            description?: string;
        }
    ): Promise<void> {
        const { type = 'string', sensitive = false, description } = options || {};

        await globalVariableRepository.upsert(userId, key, {
            value,
            type,
            sensitive,
            description
        });
    }

    /**
     * Delete a global variable
     */
    async deleteGlobalVariable(userId: string, key: string): Promise<void> {
        await globalVariableRepository.delete(userId, key);
    }

    /**
     * Get actual (unmasked) value for a variable
     */
    async getActualValue(
        userId: string,
        key: string,
        source: 'global' | 'environment'
    ): Promise<string | null> {
        if (source === 'global') {
            const v = await globalVariableRepository.findByKey(userId, key);
            return v?.value ?? null;
        } else {
            const activeEnv = await userEnvironmentRepository.findActiveByUserId(userId);

            if (!activeEnv) return null;

            const v = await environmentVariableRepository.findByKey(activeEnv.id, key);
            return v?.value ?? null;
        }
    }

    /**
     * Clone an environment
     */
    async cloneEnvironment(envId: string, newName: string): Promise<EnvironmentInfo> {
        const original = await userEnvironmentRepository.findById(envId);

        if (!original) {
            throw new Error('Environment not found');
        }

        const originalVars = await environmentVariableRepository.findByEnvironmentId(envId);

        const cloned = await userEnvironmentRepository.create({
            userId: original.userId,
            name: newName,
            description: `Clone of ${original.name}`,
            isActive: false
        });

        // Clone variables
        for (const v of originalVars) {
            await environmentVariableRepository.upsert(cloned.id, v.key, {
                value: v.value,
                type: v.type,
                sensitive: v.sensitive,
                description: v.description
            });
        }

        return {
            id: cloned.id,
            name: cloned.name,
            description: cloned.description,
            isActive: cloned.isActive,
            variableCount: originalVars.length
        };
    }

    /**
     * Parse string value to typed value
     */
    private parseValue(value: string, type: string): any {
        switch (type) {
            case 'number':
                return Number(value);
            case 'boolean':
                return value.toLowerCase() === 'true';
            case 'json':
                try {
                    return JSON.parse(value);
                } catch {
                    return value;
                }
            default:
                return value;
        }
    }
}

// Export singleton instance
export const environmentService = new EnvironmentService();
