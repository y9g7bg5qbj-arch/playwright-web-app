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
import { testDataSheetRepository, testDataRowRepository } from '../db/repositories/mongo';
import { testDataRowValidationService, type TestDataValidationErrorItem } from './test-data-row-validation.service';

// ============================================
// TYPES
// ============================================

export interface ImportResult {
    sheets: { name: string; rows: number }[];
    errors: string[];
    warnings: string[];
    validationErrors: TestDataValidationErrorItem[];
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
     * @param applicationId - Application ID to associate the data with
     * @param options - Import options
     */
    async importExcel(
        filePath: string,
        applicationId: string,
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
            warnings: [],
            validationErrors: []
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

                    const parsedRows = data
                        .map((row) => {
                            const testId = String(row.TestID || '').trim();
                            const { TestID, enabled, Enabled, ...rowData } = row;
                            return {
                                scenarioId: testId,
                                data: rowData,
                                enabled: this.parseBoolean(enabled ?? Enabled ?? true),
                            };
                        })
                        .filter((row) => row.scenarioId);

                    const sheetValidationErrors: TestDataValidationErrorItem[] = [];
                    for (const parsedRow of parsedRows) {
                        const typedValidation = testDataRowValidationService.validateCreateData(
                            parsedRow.scenarioId,
                            parsedRow.data,
                            columns as any[]
                        );
                        if (!typedValidation.valid) {
                            sheetValidationErrors.push(
                                ...typedValidation.validationErrors.map((error) => ({
                                    ...error,
                                    rowId: `${sheetName}:${error.rowId}`
                                }))
                            );
                        }
                    }
                    if (sheetValidationErrors.length > 0) {
                        result.validationErrors.push(...sheetValidationErrors);
                        result.errors.push(
                            `Sheet "${sheetName}" failed strict type validation (${sheetValidationErrors.length} issue(s)).`
                        );
                        continue;
                    }

                    // Check for existing sheet
                    const existingSheet = await testDataSheetRepository.findByApplicationIdAndName(applicationId, sheetName);

                    let dataSheet;

                    if (existingSheet) {
                        if (!overwriteExisting) {
                            result.warnings.push(`Sheet "${sheetName}" already exists, skipping (overwrite disabled)`);
                            continue;
                        }

                        // Update existing sheet
                        dataSheet = await testDataSheetRepository.update(existingSheet.id, {
                            columns
                        });

                        // Delete existing rows if overwriting
                        await testDataRowRepository.deleteBySheetId(dataSheet!.id);
                    } else {
                        // Create new sheet
                        dataSheet = await testDataSheetRepository.create({
                            applicationId,
                            name: sheetName,
                            pageObject: sheetName, // Default to sheet name
                            columns
                        });
                    }

                    // Import rows
                    let importedRows = 0;
                    for (const parsedRow of parsedRows) {
                        const testId = parsedRow.scenarioId;

                        if (!testId) {
                            if (skipEmptyRows) continue;
                            result.warnings.push(`Sheet "${sheetName}": Row with empty TestID skipped`);
                            continue;
                        }

                        try {
                            await testDataRowRepository.upsert(
                                dataSheet!.id,
                                testId,
                                { data: parsedRow.data, enabled: parsedRow.enabled },
                                { data: parsedRow.data, enabled: parsedRow.enabled }
                            );
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
        applicationId: string,
        _options?: Parameters<ExcelParserService['importExcel']>[2]
    ): Promise<ImportResult> {
        const result: ImportResult = {
            sheets: [],
            errors: [],
            warnings: [],
            validationErrors: []
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

                    const parsedRows = data
                        .map((row) => {
                            const testId = String(row.TestID || '').trim();
                            const { TestID, enabled, Enabled, ...rowData } = row;
                            return {
                                scenarioId: testId,
                                data: rowData,
                                enabled: this.parseBoolean(enabled ?? Enabled ?? true),
                            };
                        })
                        .filter((row) => row.scenarioId);

                    const sheetValidationErrors: TestDataValidationErrorItem[] = [];
                    for (const parsedRow of parsedRows) {
                        const typedValidation = testDataRowValidationService.validateCreateData(
                            parsedRow.scenarioId,
                            parsedRow.data,
                            columns as any[]
                        );
                        if (!typedValidation.valid) {
                            sheetValidationErrors.push(
                                ...typedValidation.validationErrors.map((error) => ({
                                    ...error,
                                    rowId: `${sheetName}:${error.rowId}`
                                }))
                            );
                        }
                    }
                    if (sheetValidationErrors.length > 0) {
                        result.validationErrors.push(...sheetValidationErrors);
                        result.errors.push(
                            `Sheet "${sheetName}" failed strict type validation (${sheetValidationErrors.length} issue(s)).`
                        );
                        continue;
                    }

                    // Find or create sheet
                    let dataSheet = await testDataSheetRepository.findByApplicationIdAndName(applicationId, sheetName);
                    if (dataSheet) {
                        dataSheet = await testDataSheetRepository.update(dataSheet.id, { columns });
                    } else {
                        dataSheet = await testDataSheetRepository.create({
                            applicationId,
                            name: sheetName,
                            pageObject: sheetName,
                            columns
                        });
                    }

                    // Clear existing rows
                    await testDataRowRepository.deleteBySheetId(dataSheet!.id);

                    let importedRows = 0;
                    for (const row of parsedRows) {

                        await testDataRowRepository.create({
                            sheetId: dataSheet!.id,
                            scenarioId: row.scenarioId,
                            data: row.data,
                            enabled: row.enabled
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
     * @param applicationId - Application ID to export data from
     * @param sheetIds - Optional specific sheet IDs to export (exports all if not provided)
     */
    async exportExcel(
        applicationId: string,
        sheetIds?: string[]
    ): Promise<Buffer> {
        // Fetch sheets to export
        const whereClause: any = { applicationId };
        if (sheetIds && sheetIds.length > 0) {
            whereClause.id = { in: sheetIds };
        }

        let sheets;
        if (sheetIds && sheetIds.length > 0) {
            // Fetch specific sheets
            sheets = await Promise.all(
                sheetIds.map(id => testDataSheetRepository.findById(id))
            );
            sheets = sheets.filter((s): s is NonNullable<typeof s> => s !== null);
        } else {
            // Fetch all sheets for the application
            sheets = await testDataSheetRepository.findByApplicationId(applicationId);
        }

        // Fetch rows for each sheet
        const sheetsWithRows = await Promise.all(
            sheets.map(async (sheet) => {
                const rows = await testDataRowRepository.findBySheetId(sheet.id);
                return { ...sheet, rows };
            })
        );

        // Create workbook
        const workbook = XLSX.utils.book_new();

        for (const sheet of sheetsWithRows) {
            const columns: ExcelColumn[] = sheet.columns as ExcelColumn[] || [];

            // Build rows with TestID first
            const rows = sheet.rows.map(row => {
                const data = row.data as Record<string, any>;
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
