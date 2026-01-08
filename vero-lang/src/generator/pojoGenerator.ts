/**
 * POJO Generator
 *
 * Generates TypeScript interfaces from test data table schemas.
 * This provides type safety when using test data in Vero scripts.
 *
 * Generated interfaces are stored alongside the generated tests
 * and imported where needed.
 */

export interface ColumnSchema {
    name: string;
    type: 'text' | 'number' | 'boolean' | 'date';
    required?: boolean;
}

export interface TableSchema {
    name: string;
    columns: ColumnSchema[];
}

/**
 * Convert Vero column type to TypeScript type
 */
function columnTypeToTsType(type: ColumnSchema['type']): string {
    switch (type) {
        case 'text':
            return 'string';
        case 'number':
            return 'number';
        case 'boolean':
            return 'boolean';
        case 'date':
            return 'string'; // ISO date string
        default:
            return 'unknown';
    }
}

/**
 * Convert table name to a valid TypeScript interface name
 */
function toInterfaceName(tableName: string): string {
    // Convert to PascalCase and ensure valid identifier
    return tableName
        .replace(/[^a-zA-Z0-9_]/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
}

/**
 * Generate TypeScript interface for a single table
 */
export function generateTableInterface(schema: TableSchema): string {
    const interfaceName = toInterfaceName(schema.name);
    const lines: string[] = [];

    lines.push(`/**`);
    lines.push(` * Auto-generated interface for "${schema.name}" test data table`);
    lines.push(` * DO NOT EDIT - regenerate using POJO generator`);
    lines.push(` */`);
    lines.push(`export interface ${interfaceName} {`);

    for (const column of schema.columns) {
        const tsType = columnTypeToTsType(column.type);
        const optional = column.required ? '' : '?';
        lines.push(`    ${column.name}${optional}: ${tsType};`);
    }

    lines.push(`}`);

    return lines.join('\n');
}

/**
 * Generate TypeScript interfaces for multiple tables
 */
export function generateAllInterfaces(schemas: TableSchema[]): string {
    const lines: string[] = [];

    lines.push(`/**`);
    lines.push(` * Auto-generated POJO interfaces for test data tables`);
    lines.push(` * Generated at: ${new Date().toISOString()}`);
    lines.push(` *`);
    lines.push(` * These interfaces provide type safety when using test data in Vero scripts.`);
    lines.push(` * Regenerate after modifying table schemas.`);
    lines.push(` */`);
    lines.push('');

    for (const schema of schemas) {
        lines.push(generateTableInterface(schema));
        lines.push('');
    }

    // Generate a combined TestData type
    lines.push(`/**`);
    lines.push(` * Combined TestData namespace type`);
    lines.push(` */`);
    lines.push(`export interface TestDataTypes {`);
    for (const schema of schemas) {
        const interfaceName = toInterfaceName(schema.name);
        lines.push(`    ${schema.name}: ${interfaceName}[];`);
    }
    lines.push(`}`);

    return lines.join('\n');
}

/**
 * Generate a typed DataManager factory for a project
 */
export function generateTypedDataManager(schemas: TableSchema[]): string {
    const lines: string[] = [];
    const tableNames = schemas.map(s => s.name);

    lines.push(`/**`);
    lines.push(` * Typed DataManager for project test data`);
    lines.push(` */`);
    lines.push('');
    lines.push(`import { DataManager, createDataManager, QueryBuilder } from '../runtime/DataManager';`);
    lines.push(`import { testDataApi } from '../api/testDataApi';`);

    // Import generated interfaces
    for (const schema of schemas) {
        const interfaceName = toInterfaceName(schema.name);
        lines.push(`import type { ${interfaceName} } from './testDataTypes';`);
    }
    lines.push('');

    lines.push(`export interface TypedDataManager {`);
    lines.push(`    preloadTables(): Promise<void>;`);
    for (const schema of schemas) {
        const interfaceName = toInterfaceName(schema.name);
        lines.push(`    ${schema.name}: () => QueryBuilder<${interfaceName}>;`);
    }
    lines.push(`}`);
    lines.push('');

    lines.push(`export function createTypedDataManager(): TypedDataManager {`);
    lines.push(`    const dm = createDataManager({`);
    lines.push(`        fetchTable: (tableName) => testDataApi.getTableData(tableName)`);
    lines.push(`    });`);
    lines.push('');
    lines.push(`    return {`);
    lines.push(`        preloadTables: () => dm.preloadTables([${tableNames.map(t => `'${t}'`).join(', ')}]),`);
    for (const schema of schemas) {
        const interfaceName = toInterfaceName(schema.name);
        lines.push(`        ${schema.name}: () => dm.query<${interfaceName}>('${schema.name}'),`);
    }
    lines.push(`    };`);
    lines.push(`}`);

    return lines.join('\n');
}

/**
 * Example usage in generated tests:
 *
 * ```typescript
 * import { createTypedDataManager } from './generated/typedDataManager';
 * import type { User, Product } from './generated/testDataTypes';
 *
 * test.describe('Example', () => {
 *     const dataManager = createTypedDataManager();
 *
 *     test.beforeAll(async () => {
 *         // Load all tables ONCE - this is the ONLY database call
 *         await dataManager.preloadTables();
 *     });
 *
 *     test('example', async ({ page }) => {
 *         // Type-safe queries on cached POJOs - NO database calls
 *         const admin: User = dataManager.Users()
 *             .where(eq('role', 'admin'))
 *             .first();
 *
 *         const products: Product[] = dataManager.Products()
 *             .where(gt('price', 100))
 *             .orderBy([{ column: 'price', direction: 'DESC' }])
 *             .limit(10)
 *             .execute();
 *     });
 * });
 * ```
 */
