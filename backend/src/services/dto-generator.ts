/**
 * DTO Generator Service
 *
 * Generates TypeScript DTO classes from TestDataSheet structures.
 * These classes provide type-safe data access in transpiled Playwright tests.
 *
 * Usage:
 *   const loginData = LoginPageData.fromScenarioId('TC001');
 *   await page.fill('#email', loginData.email);
 */

import { prisma } from '../db/prisma';

// ============================================
// TYPES
// ============================================

export interface DataSheetColumn {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date';
    required: boolean;
}

export interface DataSheet {
    id: string;
    name: string;
    pageObject?: string;
    columns: DataSheetColumn[];
}

export interface GenerationOptions {
    includeResolver?: boolean;
    includeValidation?: boolean;
    exportFormat?: 'namespace' | 'classes' | 'both';
}

// ============================================
// DTO GENERATOR SERVICE
// ============================================

export class DtoGenerator {
    /**
     * Generate TypeScript DTO classes from all sheets in an application
     */
    async generateDtoClasses(
        applicationId: string,
        options: GenerationOptions = {}
    ): Promise<string> {
        const {
            includeResolver = true,
            includeValidation = false,
            exportFormat = 'both'
        } = options;

        // Fetch all sheets for the application
        const sheets = await prisma.testDataSheet.findMany({
            where: { applicationId },
            include: {
                rows: {
                    orderBy: { scenarioId: 'asc' }
                }
            },
            orderBy: { name: 'asc' }
        });

        if (sheets.length === 0) {
            return this.generateEmptyModule();
        }

        // Parse sheets into typed structures
        const parsedSheets: DataSheet[] = sheets.map(sheet => ({
            id: sheet.id,
            name: sheet.name,
            pageObject: sheet.pageObject || undefined,
            columns: JSON.parse(sheet.columns)
        }));

        // Generate code
        const parts: string[] = [];

        // Header
        parts.push(this.generateHeader(applicationId));

        // Data resolver (runtime service)
        if (includeResolver) {
            parts.push(this.generateDataResolver());
        }

        // Generate class for each sheet
        for (const sheet of parsedSheets) {
            parts.push(this.generateInterface(sheet));
            parts.push(this.generateClass(sheet, includeValidation));
        }

        // Generate namespace export
        if (exportFormat === 'namespace' || exportFormat === 'both') {
            parts.push(this.generateNamespace(parsedSheets));
        }

        return parts.join('\n\n');
    }

    /**
     * Generate DTO classes from sheet definitions (without DB access)
     */
    generateFromSheets(sheets: DataSheet[], options: GenerationOptions = {}): string {
        const { includeResolver = true, includeValidation = false } = options;

        if (sheets.length === 0) {
            return this.generateEmptyModule();
        }

        const parts: string[] = [];

        parts.push(this.generateHeader('generated'));

        if (includeResolver) {
            parts.push(this.generateDataResolver());
        }

        for (const sheet of sheets) {
            parts.push(this.generateInterface(sheet));
            parts.push(this.generateClass(sheet, includeValidation));
        }

        parts.push(this.generateNamespace(sheets));

        return parts.join('\n\n');
    }

    /**
     * Generate header comment
     */
    private generateHeader(applicationId: string): string {
        const timestamp = new Date().toISOString();

        return `/**
 * Auto-generated Test Data DTOs
 * Generated: ${timestamp}
 * Application: ${applicationId}
 *
 * DO NOT EDIT MANUALLY - This file is auto-generated from test data sheets.
 *
 * Usage:
 *   // Get data for a specific test scenario
 *   const data = LoginPageData.fromScenarioId('TC001');
 *   await page.fill('#email', data.email);
 *
 *   // Get all test data for a sheet
 *   const allData = LoginPageData.getAll();
 *
 *   // Using namespace
 *   const email = TestData.LoginPage.fromScenarioId('TC001').email;
 */`;
    }

    /**
     * Generate data resolver service
     */
    private generateDataResolver(): string {
        return `// ============================================
// Test Data Resolver
// ============================================

/**
 * Runtime data resolver for loading and accessing test data
 */
export class TestDataResolver {
    private static data: Map<string, Array<{ scenarioId: string; data: any; enabled: boolean }>> = new Map();

    /**
     * Load test data for a sheet
     */
    static loadData(sheetName: string, rows: Array<{ scenarioId: string; data: any; enabled: boolean }>) {
        this.data.set(sheetName, rows);
    }

    /**
     * Get a specific row by scenario ID
     */
    static getRow(sheetName: string, scenarioId: string): any {
        const rows = this.data.get(sheetName) ?? [];
        const row = rows.find(r => r.scenarioId === scenarioId);
        return row?.data ?? {};
    }

    /**
     * Get all rows for a sheet
     */
    static getAllRows(sheetName: string): any[] {
        const rows = this.data.get(sheetName) ?? [];
        return rows.filter(r => r.enabled).map(r => ({ TestID: r.scenarioId, ...r.data }));
    }

    /**
     * Get enabled row count
     */
    static getRowCount(sheetName: string): number {
        const rows = this.data.get(sheetName) ?? [];
        return rows.filter(r => r.enabled).length;
    }

    /**
     * Check if data is loaded for a sheet
     */
    static hasData(sheetName: string): boolean {
        return this.data.has(sheetName) && (this.data.get(sheetName)?.length ?? 0) > 0;
    }

    /**
     * Clear all loaded data
     */
    static clear() {
        this.data.clear();
    }
}`;
    }

    /**
     * Generate TypeScript interface for a sheet
     */
    private generateInterface(sheet: DataSheet): string {
        const className = this.toPascalCase(sheet.name);
        const lines: string[] = [];

        lines.push(`// ============================================`);
        lines.push(`// ${sheet.name} Data`);
        lines.push(`// ============================================`);
        lines.push(``);
        lines.push(`export interface ${className}Data {`);
        lines.push(`    TestID: string;`);

        for (const col of sheet.columns) {
            const tsType = this.toTsType(col.type);
            const optional = col.required ? '' : '?';
            const safeName = this.toSafePropertyName(col.name);
            lines.push(`    ${safeName}${optional}: ${tsType};`);
        }

        lines.push(`}`);

        return lines.join('\n');
    }

    /**
     * Generate TypeScript class for a sheet
     */
    private generateClass(sheet: DataSheet, includeValidation: boolean): string {
        const className = this.toPascalCase(sheet.name);
        const lines: string[] = [];

        lines.push(`export class ${className}DataClass implements ${className}Data {`);

        // Properties
        lines.push(`    readonly TestID: string;`);
        for (const col of sheet.columns) {
            const tsType = this.toTsType(col.type);
            const safeName = this.toSafePropertyName(col.name);
            lines.push(`    readonly ${safeName}: ${tsType};`);
        }
        lines.push(``);

        // Constructor
        lines.push(`    constructor(data: any) {`);
        lines.push(`        this.TestID = data.TestID ?? '';`);
        for (const col of sheet.columns) {
            const safeName = this.toSafePropertyName(col.name);
            const defaultValue = this.getDefaultValue(col.type);
            const cast = this.getCastExpression(col.name, col.type);
            lines.push(`        this.${safeName} = ${cast} ?? ${defaultValue};`);
        }
        lines.push(`    }`);
        lines.push(``);

        // Static factory method: fromScenarioId
        lines.push(`    /**`);
        lines.push(`     * Get test data for a specific scenario ID (e.g., 'TC001')`);
        lines.push(`     */`);
        lines.push(`    static fromScenarioId(scenarioId: string): ${className}DataClass {`);
        lines.push(`        const row = TestDataResolver.getRow('${sheet.name}', scenarioId);`);
        lines.push(`        return new ${className}DataClass({ TestID: scenarioId, ...row });`);
        lines.push(`    }`);
        lines.push(``);

        // Static method: getAll
        lines.push(`    /**`);
        lines.push(`     * Get all test data rows`);
        lines.push(`     */`);
        lines.push(`    static getAll(): ${className}DataClass[] {`);
        lines.push(`        const rows = TestDataResolver.getAllRows('${sheet.name}');`);
        lines.push(`        return rows.map(row => new ${className}DataClass(row));`);
        lines.push(`    }`);
        lines.push(``);

        // Static method: getEnabled
        lines.push(`    /**`);
        lines.push(`     * Get count of enabled test data rows`);
        lines.push(`     */`);
        lines.push(`    static get count(): number {`);
        lines.push(`        return TestDataResolver.getRowCount('${sheet.name}');`);
        lines.push(`    }`);
        lines.push(``);

        // Iteration support
        lines.push(`    /**`);
        lines.push(`     * Get test IDs for data-driven testing`);
        lines.push(`     */`);
        lines.push(`    static getTestIds(): string[] {`);
        lines.push(`        return this.getAll().map(d => d.TestID);`);
        lines.push(`    }`);

        // Validation method (optional)
        if (includeValidation) {
            lines.push(``);
            lines.push(`    /**`);
            lines.push(`     * Validate data against column requirements`);
            lines.push(`     */`);
            lines.push(`    validate(): { valid: boolean; errors: string[] } {`);
            lines.push(`        const errors: string[] = [];`);
            for (const col of sheet.columns) {
                if (col.required) {
                    const safeName = this.toSafePropertyName(col.name);
                    lines.push(`        if (this.${safeName} === undefined || this.${safeName} === null || this.${safeName} === '') {`);
                    lines.push(`            errors.push('Missing required field: ${col.name}');`);
                    lines.push(`        }`);
                }
            }
            lines.push(`        return { valid: errors.length === 0, errors };`);
            lines.push(`    }`);
        }

        lines.push(`}`);

        return lines.join('\n');
    }

    /**
     * Generate namespace that aggregates all data classes
     */
    private generateNamespace(sheets: DataSheet[]): string {
        const lines: string[] = [];

        lines.push(`// ============================================`);
        lines.push(`// TestData Namespace`);
        lines.push(`// ============================================`);
        lines.push(``);
        lines.push(`/**`);
        lines.push(` * Unified namespace for accessing all test data`);
        lines.push(` *`);
        lines.push(` * Usage:`);

        for (const sheet of sheets.slice(0, 3)) {
            const className = this.toPascalCase(sheet.name);
            lines.push(` *   TestData.${className}.fromScenarioId('TC001').fieldName`);
        }

        lines.push(` */`);
        lines.push(`export const TestData = {`);

        for (let i = 0; i < sheets.length; i++) {
            const sheet = sheets[i];
            const className = this.toPascalCase(sheet.name);
            const comma = i < sheets.length - 1 ? ',' : '';
            lines.push(`    ${className}: ${className}DataClass${comma}`);
        }

        lines.push(`};`);

        return lines.join('\n');
    }

    /**
     * Generate empty module when no sheets exist
     */
    private generateEmptyModule(): string {
        return `/**
 * Test Data DTOs
 *
 * No test data sheets defined yet.
 * Import Excel files or create sheets manually to generate data classes.
 */

export class TestDataResolver {
    private static data: Map<string, any[]> = new Map();
    static loadData(sheetName: string, rows: any[]) { this.data.set(sheetName, rows); }
    static getRow(sheetName: string, scenarioId: string): any { return {}; }
    static getAllRows(sheetName: string): any[] { return []; }
    static getRowCount(sheetName: string): number { return 0; }
    static hasData(sheetName: string): boolean { return false; }
    static clear() { this.data.clear(); }
}

export const TestData = {};
`;
    }

    /**
     * Convert column type to TypeScript type
     */
    private toTsType(colType: string): string {
        switch (colType) {
            case 'number': return 'number';
            case 'boolean': return 'boolean';
            case 'date': return 'string'; // Keep dates as ISO strings
            default: return 'string';
        }
    }

    /**
     * Get default value for a type
     */
    private getDefaultValue(colType: string): string {
        switch (colType) {
            case 'number': return '0';
            case 'boolean': return 'false';
            default: return "''";
        }
    }

    /**
     * Get cast expression for a column
     */
    private getCastExpression(colName: string, colType: string): string {
        const safeProp = `data['${colName}']`;

        switch (colType) {
            case 'number':
                return `Number(${safeProp})`;
            case 'boolean':
                return `Boolean(${safeProp})`;
            default:
                return `String(${safeProp} ?? '')`;
        }
    }

    /**
     * Convert string to PascalCase class name
     */
    private toPascalCase(str: string): string {
        return str
            .replace(/[^a-zA-Z0-9]/g, ' ')
            .split(' ')
            .filter(Boolean)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
    }

    /**
     * Convert column name to safe property name
     */
    private toSafePropertyName(name: string): string {
        // Replace invalid characters with underscores
        let safe = name.replace(/[^a-zA-Z0-9_$]/g, '_');

        // Ensure it doesn't start with a number
        if (/^[0-9]/.test(safe)) {
            safe = '_' + safe;
        }

        // Handle reserved keywords
        const reserved = ['class', 'function', 'return', 'default', 'switch', 'case', 'break'];
        if (reserved.includes(safe)) {
            safe = '_' + safe;
        }

        return safe;
    }
}

// Export singleton instance
export const dtoGenerator = new DtoGenerator();

/**
 * Convenience function to generate DTO code for a project
 */
export async function generateDtoCode(applicationId: string): Promise<string> {
    return dtoGenerator.generateDtoClasses(applicationId);
}
