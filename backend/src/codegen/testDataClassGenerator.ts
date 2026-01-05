/**
 * Test Data Class Generator
 * 
 * Generates typed TypeScript classes/interfaces from DataTable structures,
 * allowing strongly-typed access like: TestData.Driver.firstName
 */

import { prisma } from '../db/prisma';

// ============================================
// TYPES
// ============================================

export interface DataTableColumn {
    name: string;
    type: 'text' | 'number' | 'date' | 'boolean';
    required?: boolean;
}

export interface DataTableRow {
    id: string;
    data: Record<string, any>;
    order: number;
}

export interface DataTableInfo {
    id: string;
    name: string;
    columns: DataTableColumn[];
    rows: DataTableRow[];
}

export interface GeneratedTestDataClass {
    interfaceCode: string;      // Interface definition
    classCode: string;          // Class with static data
    singleRowInterface: string; // Interface for single row
    testDataNamespace: string;  // Complete TestData namespace
}

// ============================================
// CLASS GENERATOR
// ============================================

export class TestDataClassGenerator {

    /**
     * Convert column type to TypeScript type
     */
    private columnTypeToTsType(colType: string): string {
        switch (colType) {
            case 'number': return 'number';
            case 'boolean': return 'boolean';
            case 'date': return 'Date | string';
            default: return 'string';
        }
    }

    /**
     * Sanitize a name to be a valid TypeScript identifier
     */
    private sanitizeIdentifier(name: string): string {
        // Replace spaces and special chars with underscores, ensure starts with letter
        let sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_');
        if (/^[0-9]/.test(sanitized)) {
            sanitized = '_' + sanitized;
        }
        return sanitized;
    }

    /**
     * Convert table name to PascalCase class name
     */
    private toClassName(tableName: string): string {
        return this.sanitizeIdentifier(tableName)
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
    }

    /**
     * Generate interface for a single row of data
     */
    generateRowInterface(table: DataTableInfo): string {
        const className = this.toClassName(table.name);
        const lines: string[] = [];

        lines.push(`export interface ${className}Row {`);

        for (const col of table.columns) {
            const propName = this.sanitizeIdentifier(col.name);
            const tsType = this.columnTypeToTsType(col.type);
            const optional = col.required ? '' : '?';
            lines.push(`    ${propName}${optional}: ${tsType};`);
        }

        lines.push(`}`);

        return lines.join('\n');
    }

    /**
     * Generate the full class with data array and accessor methods
     */
    generateDataClass(table: DataTableInfo): string {
        const className = this.toClassName(table.name);
        const lines: string[] = [];

        // Generate the data array
        const rowsData = table.rows.map(row => {
            const obj: Record<string, any> = {};
            for (const col of table.columns) {
                const propName = this.sanitizeIdentifier(col.name);
                let value = row.data[col.name];

                // Type coercion
                if (col.type === 'number' && typeof value === 'string') {
                    value = parseFloat(value) || 0;
                } else if (col.type === 'boolean') {
                    value = Boolean(value);
                }

                obj[propName] = value;
            }
            return obj;
        });

        lines.push(`export class ${className}Data {`);
        lines.push(`    private static _data: ${className}Row[] = ${JSON.stringify(rowsData, null, 8).replace(/\n/g, '\n    ')};`);
        lines.push(``);
        lines.push(`    /** Get all rows */`);
        lines.push(`    static get all(): ${className}Row[] {`);
        lines.push(`        return this._data;`);
        lines.push(`    }`);
        lines.push(``);
        lines.push(`    /** Get first row (convenient for single-row tables) */`);
        lines.push(`    static get first(): ${className}Row {`);
        lines.push(`        return this._data[0]!;`);
        lines.push(`    }`);
        lines.push(``);
        lines.push(`    /** Get row by index */`);
        lines.push(`    static row(index: number): ${className}Row {`);
        lines.push(`        return this._data[index]!;`);
        lines.push(`    }`);
        lines.push(``);
        lines.push(`    /** Get row count */`);
        lines.push(`    static get count(): number {`);
        lines.push(`        return this._data.length;`);
        lines.push(`    }`);

        // Add direct property accessors for first row (sugar syntax)
        lines.push(``);
        lines.push(`    // Direct property accessors (returns first row values)`);
        for (const col of table.columns) {
            const propName = this.sanitizeIdentifier(col.name);
            const tsType = this.columnTypeToTsType(col.type);
            lines.push(`    static get ${propName}(): ${tsType} { return this.first.${propName}; }`);
        }

        lines.push(`}`);

        return lines.join('\n');
    }

    /**
     * Generate complete TestData namespace for a workflow
     */
    async generateTestDataNamespace(workflowId: string): Promise<string> {
        // Fetch all tables for this workflow
        const tables = await prisma.dataTable.findMany({
            where: { workflowId },
            include: {
                rows: {
                    orderBy: { order: 'asc' }
                }
            }
        });

        if (tables.length === 0) {
            return '// No data tables defined\nexport namespace TestData {}';
        }

        const lines: string[] = [];
        lines.push(`/**`);
        lines.push(` * Auto-generated Test Data Classes`);
        lines.push(` * Generated from data tables in workflow: ${workflowId}`);
        lines.push(` * `);
        lines.push(` * Usage:`);

        // Add usage examples
        for (const table of tables) {
            const columns: DataTableColumn[] = JSON.parse(table.columns as string);
            const className = this.toClassName(table.name);
            if (columns.length > 0) {
                lines.push(` *   const value = TestData.${className}.${this.sanitizeIdentifier(columns[0].name)};`);
            }
        }

        lines.push(` */`);
        lines.push(``);

        // Generate interfaces and classes for each table
        for (const table of tables) {
            const columns: DataTableColumn[] = JSON.parse(table.columns as string);
            const tableInfo: DataTableInfo = {
                id: table.id,
                name: table.name,
                columns,
                rows: table.rows.map(r => ({
                    id: r.id,
                    data: JSON.parse(r.data as string),
                    order: r.order
                }))
            };

            lines.push(this.generateRowInterface(tableInfo));
            lines.push(``);
            lines.push(this.generateDataClass(tableInfo));
            lines.push(``);
        }

        // Generate the TestData namespace
        lines.push(`export namespace TestData {`);
        for (const table of tables) {
            const className = this.toClassName(table.name);
            lines.push(`    export const ${className} = ${className}Data;`);
        }
        lines.push(`}`);

        return lines.join('\n');
    }

    /**
     * Generate inline test data for use in Playwright test code
     */
    async generateInlineTestData(workflowId: string): Promise<string> {
        return this.generateTestDataNamespace(workflowId);
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate test data code for a workflow (convenience function)
 */
export async function generateTestDataCode(workflowId: string): Promise<string> {
    const generator = new TestDataClassGenerator();
    return generator.generateTestDataNamespace(workflowId);
}

/**
 * Get data from a specific table as typed objects
 */
export async function getTypedTableData(tableId: string): Promise<{
    tableName: string;
    className: string;
    rows: Record<string, any>[];
}> {
    const table = await prisma.dataTable.findUnique({
        where: { id: tableId },
        include: {
            rows: { orderBy: { order: 'asc' } }
        }
    });

    if (!table) {
        throw new Error(`Table ${tableId} not found`);
    }

    const generator = new TestDataClassGenerator();
    const columns: DataTableColumn[] = JSON.parse(table.columns as string);

    const rows = table.rows.map(row => {
        const data = JSON.parse(row.data as string);
        const typed: Record<string, any> = {};

        for (const col of columns) {
            const propName = col.name.replace(/[^a-zA-Z0-9_]/g, '_');
            let value = data[col.name];

            if (col.type === 'number' && typeof value === 'string') {
                value = parseFloat(value) || 0;
            } else if (col.type === 'boolean') {
                value = Boolean(value);
            }

            typed[propName] = value;
        }

        return typed;
    });

    return {
        tableName: table.name,
        className: table.name.replace(/[^a-zA-Z0-9_]/g, ''),
        rows
    };
}
