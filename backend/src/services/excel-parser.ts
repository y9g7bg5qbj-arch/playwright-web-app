/**
 * Excel Parser Service
 *
 * Handles importing Excel files into TestDataSheet structures
 * and exporting test data back to Excel format.
 *
 * Expected Excel format:
 * - Each sheet = one test data set (maps to a page object)
 * - First row = column headers
 * - Column "TestID" is required (scenario identifier)
 * - All other columns = test data fields
 */

import * as XLSX from 'xlsx';
import { prisma } from '../db/prisma';

// ============================================
// TYPES
// ============================================

export interface ImportResult {
    sheets: { name: string; rows: number }[];
    errors: string[];
    warnings: string[];
}

export interface ExcelColumn {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date';
    required: boolean;
}

export interface ExcelSheet {
    name: string;
    columns: ExcelColumn[];
    rows: Array<{
        scenarioId: string;
        data: Record<string, any>;
        enabled: boolean;
    }>;
}

// ============================================
// EXCEL PARSER SERVICE
// ============================================

export class ExcelParserService {
    /**
     * Import Excel file into database as TestDataSheets
     *
     * @param filePath - Path to the Excel file
     * @param projectId - Project/user ID to associate the data with
     * @param options - Import options
     */
    async importExcel(
        filePath: string,
        projectId: string,
        options: {
            overwriteExisting?: boolean;
            skipEmptyRows?: boolean;
        } = {}
    ): Promise<ImportResult> {
        const {
            overwriteExisting = true,
            skipEmptyRows = true
        } = options;

        const result: ImportResult = {
            sheets: [],
            errors: [],
            warnings: []
        };

        try {
            // Read the Excel file
            const workbook = XLSX.readFile(filePath);

            for (const sheetName of workbook.SheetNames) {
                try {
                    const sheet = workbook.Sheets[sheetName];
                    const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

                    if (data.length === 0) {
                        result.warnings.push(`Sheet "${sheetName}" is empty, skipping`);
                        continue;
                    }

                    // Validate TestID column exists
                    const firstRow = data[0];
                    if (!firstRow || !('TestID' in firstRow)) {
                        result.errors.push(`Sheet "${sheetName}" is missing required "TestID" column`);
                        continue;
                    }

                    // Infer columns from first row
                    const columns = this.inferColumns(firstRow);

                    // Check for existing sheet
                    const existingSheet = await prisma.testDataSheet.findUnique({
                        where: {
                            projectId_name: {
                                projectId,
                                name: sheetName
                            }
                        }
                    });

                    let dataSheet;

                    if (existingSheet) {
                        if (!overwriteExisting) {
                            result.warnings.push(`Sheet "${sheetName}" already exists, skipping (overwrite disabled)`);
                            continue;
                        }

                        // Update existing sheet
                        dataSheet = await prisma.testDataSheet.update({
                            where: { id: existingSheet.id },
                            data: {
                                columns: JSON.stringify(columns),
                                updatedAt: new Date()
                            }
                        });

                        // Delete existing rows if overwriting
                        await prisma.testDataRow.deleteMany({
                            where: { sheetId: dataSheet.id }
                        });
                    } else {
                        // Create new sheet
                        dataSheet = await prisma.testDataSheet.create({
                            data: {
                                projectId,
                                name: sheetName,
                                pageObject: sheetName, // Default to sheet name
                                columns: JSON.stringify(columns)
                            }
                        });
                    }

                    // Import rows
                    let importedRows = 0;
                    for (const row of data) {
                        const testId = String(row.TestID || '').trim();

                        if (!testId) {
                            if (skipEmptyRows) continue;
                            result.warnings.push(`Sheet "${sheetName}": Row with empty TestID skipped`);
                            continue;
                        }

                        // Extract data without TestID and enabled columns
                        const { TestID, enabled, Enabled, ...rowData } = row;

                        // Determine if row is enabled
                        const isEnabled = this.parseBoolean(enabled ?? Enabled ?? true);

                        try {
                            await prisma.testDataRow.upsert({
                                where: {
                                    sheetId_scenarioId: {
                                        sheetId: dataSheet.id,
                                        scenarioId: testId
                                    }
                                },
                                create: {
                                    sheetId: dataSheet.id,
                                    scenarioId: testId,
                                    data: JSON.stringify(rowData),
                                    enabled: isEnabled
                                },
                                update: {
                                    data: JSON.stringify(rowData),
                                    enabled: isEnabled
                                }
                            });
                            importedRows++;
                        } catch (rowError) {
                            result.warnings.push(
                                `Sheet "${sheetName}": Error importing row ${testId}: ${rowError instanceof Error ? rowError.message : 'Unknown error'}`
                            );
                        }
                    }

                    result.sheets.push({
                        name: sheetName,
                        rows: importedRows
                    });

                } catch (sheetError) {
                    result.errors.push(
                        `Sheet "${sheetName}": ${sheetError instanceof Error ? sheetError.message : 'Unknown error'}`
                    );
                }
            }

        } catch (error) {
            result.errors.push(
                `Failed to read Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }

        return result;
    }

    /**
     * Import Excel from a buffer (for file upload handling)
     */
    async importExcelBuffer(
        buffer: Buffer,
        projectId: string,
        options?: Parameters<ExcelParserService['importExcel']>[2]
    ): Promise<ImportResult> {
        const result: ImportResult = {
            sheets: [],
            errors: [],
            warnings: []
        };

        try {
            const workbook = XLSX.read(buffer, { type: 'buffer' });

            for (const sheetName of workbook.SheetNames) {
                try {
                    const sheet = workbook.Sheets[sheetName];
                    const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

                    if (data.length === 0) {
                        result.warnings.push(`Sheet "${sheetName}" is empty, skipping`);
                        continue;
                    }

                    const firstRow = data[0];
                    if (!firstRow || !('TestID' in firstRow)) {
                        result.errors.push(`Sheet "${sheetName}" is missing required "TestID" column`);
                        continue;
                    }

                    const columns = this.inferColumns(firstRow);

                    const dataSheet = await prisma.testDataSheet.upsert({
                        where: {
                            projectId_name: {
                                projectId,
                                name: sheetName
                            }
                        },
                        create: {
                            projectId,
                            name: sheetName,
                            pageObject: sheetName,
                            columns: JSON.stringify(columns)
                        },
                        update: {
                            columns: JSON.stringify(columns)
                        }
                    });

                    // Clear existing rows
                    await prisma.testDataRow.deleteMany({
                        where: { sheetId: dataSheet.id }
                    });

                    let importedRows = 0;
                    for (const row of data) {
                        const testId = String(row.TestID || '').trim();
                        if (!testId) continue;

                        const { TestID, enabled, Enabled, ...rowData } = row;
                        const isEnabled = this.parseBoolean(enabled ?? Enabled ?? true);

                        await prisma.testDataRow.create({
                            data: {
                                sheetId: dataSheet.id,
                                scenarioId: testId,
                                data: JSON.stringify(rowData),
                                enabled: isEnabled
                            }
                        });
                        importedRows++;
                    }

                    result.sheets.push({ name: sheetName, rows: importedRows });
                } catch (sheetError) {
                    result.errors.push(
                        `Sheet "${sheetName}": ${sheetError instanceof Error ? sheetError.message : 'Unknown error'}`
                    );
                }
            }
        } catch (error) {
            result.errors.push(
                `Failed to parse Excel: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }

        return result;
    }

    /**
     * Export test data to Excel format
     *
     * @param projectId - Project ID to export data from
     * @param sheetIds - Optional specific sheet IDs to export (exports all if not provided)
     */
    async exportExcel(
        projectId: string,
        sheetIds?: string[]
    ): Promise<Buffer> {
        // Fetch sheets to export
        const whereClause: any = { projectId };
        if (sheetIds && sheetIds.length > 0) {
            whereClause.id = { in: sheetIds };
        }

        const sheets = await prisma.testDataSheet.findMany({
            where: whereClause,
            include: {
                rows: {
                    orderBy: { scenarioId: 'asc' }
                }
            },
            orderBy: { name: 'asc' }
        });

        // Create workbook
        const workbook = XLSX.utils.book_new();

        for (const sheet of sheets) {
            const columns: ExcelColumn[] = JSON.parse(sheet.columns);

            // Build rows with TestID first
            const rows = sheet.rows.map(row => {
                const data = JSON.parse(row.data);
                return {
                    TestID: row.scenarioId,
                    ...data,
                    enabled: row.enabled
                };
            });

            // Create worksheet
            const worksheet = XLSX.utils.json_to_sheet(rows);

            // Set column widths
            const colWidths = [
                { wch: 15 }, // TestID
                ...columns.map(c => ({ wch: Math.max(c.name.length, 12) })),
                { wch: 8 }   // enabled
            ];
            worksheet['!cols'] = colWidths;

            // Append to workbook
            XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.substring(0, 31));
        }

        // Write to buffer
        const buffer = XLSX.write(workbook, {
            type: 'buffer',
            bookType: 'xlsx'
        });

        return buffer as Buffer;
    }

    /**
     * Parse Excel sheets without importing (for preview)
     */
    parseExcelBuffer(buffer: Buffer): ExcelSheet[] {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheets: ExcelSheet[] = [];

        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

            if (data.length === 0) continue;

            const firstRow = data[0];
            if (!firstRow || !('TestID' in firstRow)) continue;

            const columns = this.inferColumns(firstRow);

            const rows = data.map(row => {
                const testId = String(row.TestID || '').trim();
                const { TestID, enabled, Enabled, ...rowData } = row;

                return {
                    scenarioId: testId,
                    data: rowData,
                    enabled: this.parseBoolean(enabled ?? Enabled ?? true)
                };
            }).filter(r => r.scenarioId);

            sheets.push({
                name: sheetName,
                columns,
                rows
            });
        }

        return sheets;
    }

    /**
     * Infer column types from values in the first row
     */
    private inferColumns(row: Record<string, any>): ExcelColumn[] {
        const columns: ExcelColumn[] = [];

        for (const [key, value] of Object.entries(row)) {
            // Skip TestID and enabled columns (they're built-in)
            if (key === 'TestID' || key.toLowerCase() === 'enabled') {
                continue;
            }

            columns.push({
                name: key,
                type: this.inferType(value),
                required: false
            });
        }

        return columns;
    }

    /**
     * Infer TypeScript type from a value
     */
    private inferType(value: any): 'string' | 'number' | 'boolean' | 'date' {
        if (value === null || value === undefined) {
            return 'string';
        }

        if (typeof value === 'boolean') {
            return 'boolean';
        }

        if (typeof value === 'number') {
            return 'number';
        }

        if (value instanceof Date) {
            return 'date';
        }

        // Check for date string patterns
        if (typeof value === 'string') {
            // ISO date format
            if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
                return 'date';
            }
            // Common date formats
            if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(value)) {
                return 'date';
            }
            // Number string
            if (!isNaN(Number(value)) && value.trim() !== '') {
                return 'number';
            }
            // Boolean strings
            if (['true', 'false', 'yes', 'no', '1', '0'].includes(value.toLowerCase())) {
                return 'boolean';
            }
        }

        return 'string';
    }

    /**
     * Parse a value as boolean
     */
    private parseBoolean(value: any): boolean {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value !== 0;
        if (typeof value === 'string') {
            const lower = value.toLowerCase().trim();
            return lower === 'true' || lower === 'yes' || lower === '1';
        }
        return true; // Default to enabled
    }

    /**
     * Create a template Excel file for download
     */
    createTemplate(pageName: string, columns: string[]): Buffer {
        const workbook = XLSX.utils.book_new();

        // Create sample data
        const sampleRows = [
            { TestID: 'TC001', ...Object.fromEntries(columns.map(c => [c, `sample_${c}`])), enabled: true },
            { TestID: 'TC002', ...Object.fromEntries(columns.map(c => [c, `sample_${c}`])), enabled: true },
        ];

        const worksheet = XLSX.utils.json_to_sheet(sampleRows);

        // Set column widths
        worksheet['!cols'] = [
            { wch: 15 },
            ...columns.map(c => ({ wch: Math.max(c.length, 15) })),
            { wch: 8 }
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, pageName);

        return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    }
}

// Export singleton instance
export const excelParserService = new ExcelParserService();
