/**
 * Environment Service
 *
 * Manages environment variables and global variables with Postman-style
 * precedence (Runtime > Environment > Global).
 *
 * Supports {{variable}} syntax for runtime resolution.
 */

import { prisma } from '../db/prisma';

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
        const globalVars = await prisma.globalVariable.findMany({
            where: { userId }
        });

        for (const v of globalVars) {
            const value = this.parseValue(v.value, v.type);
            result.variables[v.key] = value;
            result.sources[v.key] = 'global';
        }

        // 2. Load active environment variables (override global)
        const activeEnv = await prisma.environment.findFirst({
            where: { userId, isActive: true },
            include: {
                variables: true
            }
        });

        if (activeEnv) {
            for (const v of activeEnv.variables) {
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
        await prisma.environment.updateMany({
            where: { userId },
            data: { isActive: false }
        });

        // Activate the specified environment
        await prisma.environment.update({
            where: { id: envId },
            data: { isActive: true }
        });
    }

    /**
     * Get the active environment for a user
     */
    async getActiveEnvironment(userId: string): Promise<EnvironmentInfo | null> {
        const env = await prisma.environment.findFirst({
            where: { userId, isActive: true },
            include: {
                _count: {
                    select: { variables: true }
                }
            }
        });

        if (!env) return null;

        return {
            id: env.id,
            name: env.name,
            description: env.description || undefined,
            isActive: true,
            variableCount: env._count.variables
        };
    }

    /**
     * List all environments for a user
     */
    async listEnvironments(userId: string): Promise<EnvironmentInfo[]> {
        const envs = await prisma.environment.findMany({
            where: { userId },
            include: {
                _count: {
                    select: { variables: true }
                }
            },
            orderBy: { name: 'asc' }
        });

        return envs.map(env => ({
            id: env.id,
            name: env.name,
            description: env.description || undefined,
            isActive: env.isActive,
            variableCount: env._count.variables
        }));
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
            await prisma.environment.updateMany({
                where: { userId },
                data: { isActive: false }
            });
        }

        const env = await prisma.environment.create({
            data: {
                userId,
                name,
                description,
                isActive: setActive,
                variables: {
                    create: variables.map(v => ({
                        key: v.key,
                        value: v.value,
                        type: v.type || 'string',
                        sensitive: v.sensitive || false
                    }))
                }
            },
            include: {
                _count: {
                    select: { variables: true }
                }
            }
        });

        return {
            id: env.id,
            name: env.name,
            description: env.description || undefined,
            isActive: env.isActive,
            variableCount: env._count.variables
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
        const env = await prisma.environment.update({
            where: { id: envId },
            data: updates,
            include: {
                _count: {
                    select: { variables: true }
                }
            }
        });

        return {
            id: env.id,
            name: env.name,
            description: env.description || undefined,
            isActive: env.isActive,
            variableCount: env._count.variables
        };
    }

    /**
     * Delete an environment
     */
    async deleteEnvironment(envId: string): Promise<void> {
        await prisma.environment.delete({
            where: { id: envId }
        });
    }

    /**
     * Get environment variables
     */
    async getEnvironmentVariables(envId: string): Promise<Variable[]> {
        const vars = await prisma.environmentVariable.findMany({
            where: { environmentId: envId },
            orderBy: { key: 'asc' }
        });

        return vars.map(v => ({
            key: v.key,
            value: v.sensitive ? '********' : this.parseValue(v.value, v.type),
            type: v.type as Variable['type'],
            sensitive: v.sensitive,
            description: v.description || undefined,
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

        await prisma.environmentVariable.upsert({
            where: {
                environmentId_key: {
                    environmentId: envId,
                    key
                }
            },
            create: {
                environmentId: envId,
                key,
                value,
                type,
                sensitive,
                description
            },
            update: {
                value,
                type,
                sensitive,
                description
            }
        });
    }

    /**
     * Delete an environment variable
     */
    async deleteEnvironmentVariable(envId: string, key: string): Promise<void> {
        await prisma.environmentVariable.delete({
            where: {
                environmentId_key: {
                    environmentId: envId,
                    key
                }
            }
        });
    }

    /**
     * Get global variables for a user
     */
    async getGlobalVariables(userId: string): Promise<Variable[]> {
        const vars = await prisma.globalVariable.findMany({
            where: { userId },
            orderBy: { key: 'asc' }
        });

        return vars.map(v => ({
            key: v.key,
            value: v.sensitive ? '********' : this.parseValue(v.value, v.type),
            type: v.type as Variable['type'],
            sensitive: v.sensitive,
            description: v.description || undefined,
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

        await prisma.globalVariable.upsert({
            where: {
                userId_key: {
                    userId,
                    key
                }
            },
            create: {
                userId,
                key,
                value,
                type,
                sensitive,
                description
            },
            update: {
                value,
                type,
                sensitive,
                description
            }
        });
    }

    /**
     * Delete a global variable
     */
    async deleteGlobalVariable(userId: string, key: string): Promise<void> {
        await prisma.globalVariable.delete({
            where: {
                userId_key: {
                    userId,
                    key
                }
            }
        });
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
            const v = await prisma.globalVariable.findUnique({
                where: {
                    userId_key: { userId, key }
                }
            });
            return v?.value ?? null;
        } else {
            const activeEnv = await prisma.environment.findFirst({
                where: { userId, isActive: true }
            });

            if (!activeEnv) return null;

            const v = await prisma.environmentVariable.findUnique({
                where: {
                    environmentId_key: { environmentId: activeEnv.id, key }
                }
            });
            return v?.value ?? null;
        }
    }

    /**
     * Clone an environment
     */
    async cloneEnvironment(envId: string, newName: string): Promise<EnvironmentInfo> {
        const original = await prisma.environment.findUnique({
            where: { id: envId },
            include: { variables: true }
        });

        if (!original) {
            throw new Error('Environment not found');
        }

        const cloned = await prisma.environment.create({
            data: {
                userId: original.userId,
                name: newName,
                description: `Clone of ${original.name}`,
                isActive: false,
                variables: {
                    create: original.variables.map(v => ({
                        key: v.key,
                        value: v.value,
                        type: v.type,
                        sensitive: v.sensitive,
                        description: v.description
                    }))
                }
            },
            include: {
                _count: {
                    select: { variables: true }
                }
            }
        });

        return {
            id: cloned.id,
            name: cloned.name,
            description: cloned.description || undefined,
            isActive: cloned.isActive,
            variableCount: cloned._count.variables
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
