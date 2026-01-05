/**
 * Test Data Validator
 *
 * Validates test data rows against column schemas.
 * Ensures data integrity before test execution.
 */

// ============================================
// TYPES
// ============================================

export interface DataColumn {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date';
    required: boolean;
    pattern?: string;      // Regex pattern for validation
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    allowedValues?: string[];
}

export interface DataSheet {
    id: string;
    name: string;
    columns: DataColumn[];
}

export interface DataRow {
    id: string;
    scenarioId: string;
    data: Record<string, any>;
    enabled: boolean;
}

export interface ValidationError {
    field: string;
    message: string;
    value?: any;
}

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
}

export interface SheetValidationResult {
    sheetId: string;
    sheetName: string;
    valid: boolean;
    rows: Array<{
        scenarioId: string;
        valid: boolean;
        errors: ValidationError[];
        warnings: ValidationError[];
    }>;
    summary: {
        totalRows: number;
        validRows: number;
        invalidRows: number;
        totalErrors: number;
        totalWarnings: number;
    };
}

// ============================================
// TEST DATA VALIDATOR
// ============================================

export class TestDataValidator {
    /**
     * Validate a single row against sheet schema
     */
    static validate(sheet: DataSheet, row: DataRow): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationError[] = [];

        // Check TestID (scenario ID)
        if (!row.scenarioId || row.scenarioId.trim() === '') {
            errors.push({
                field: 'TestID',
                message: 'TestID (scenario ID) is required'
            });
        }

        // Validate each column
        for (const column of sheet.columns) {
            const value = row.data[column.name];

            // Required check
            if (column.required) {
                if (value === undefined || value === null || value === '') {
                    errors.push({
                        field: column.name,
                        message: `${column.name} is required`,
                        value
                    });
                    continue; // Skip further validation for this field
                }
            }

            // Skip validation for empty optional fields
            if (value === undefined || value === null || value === '') {
                continue;
            }

            // Type validation
            const typeError = this.validateType(value, column.type);
            if (typeError) {
                errors.push({
                    field: column.name,
                    message: typeError,
                    value
                });
                continue;
            }

            // String-specific validations
            if (column.type === 'string' && typeof value === 'string') {
                // Min length
                if (column.minLength !== undefined && value.length < column.minLength) {
                    errors.push({
                        field: column.name,
                        message: `${column.name} must be at least ${column.minLength} characters`,
                        value
                    });
                }

                // Max length
                if (column.maxLength !== undefined && value.length > column.maxLength) {
                    errors.push({
                        field: column.name,
                        message: `${column.name} must not exceed ${column.maxLength} characters`,
                        value
                    });
                }

                // Pattern validation
                if (column.pattern) {
                    try {
                        const regex = new RegExp(column.pattern);
                        if (!regex.test(value)) {
                            errors.push({
                                field: column.name,
                                message: `${column.name} does not match required pattern`,
                                value
                            });
                        }
                    } catch {
                        warnings.push({
                            field: column.name,
                            message: `Invalid validation pattern: ${column.pattern}`
                        });
                    }
                }

                // Allowed values (enum)
                if (column.allowedValues && column.allowedValues.length > 0) {
                    if (!column.allowedValues.includes(value)) {
                        errors.push({
                            field: column.name,
                            message: `${column.name} must be one of: ${column.allowedValues.join(', ')}`,
                            value
                        });
                    }
                }
            }

            // Number-specific validations
            if (column.type === 'number') {
                const numValue = Number(value);

                if (column.min !== undefined && numValue < column.min) {
                    errors.push({
                        field: column.name,
                        message: `${column.name} must be at least ${column.min}`,
                        value
                    });
                }

                if (column.max !== undefined && numValue > column.max) {
                    errors.push({
                        field: column.name,
                        message: `${column.name} must not exceed ${column.max}`,
                        value
                    });
                }
            }
        }

        // Check for extra fields (warning only)
        const columnNames = new Set(sheet.columns.map(c => c.name));
        for (const key of Object.keys(row.data)) {
            if (!columnNames.has(key)) {
                warnings.push({
                    field: key,
                    message: `Unknown field "${key}" not defined in schema`,
                    value: row.data[key]
                });
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate all rows in a sheet
     */
    static validateSheet(sheet: DataSheet, rows: DataRow[]): SheetValidationResult {
        const rowResults = rows.map(row => {
            const result = this.validate(sheet, row);
            return {
                scenarioId: row.scenarioId,
                valid: result.valid,
                errors: result.errors,
                warnings: result.warnings
            };
        });

        const validRows = rowResults.filter(r => r.valid).length;
        const invalidRows = rowResults.filter(r => !r.valid).length;
        const totalErrors = rowResults.reduce((sum, r) => sum + r.errors.length, 0);
        const totalWarnings = rowResults.reduce((sum, r) => sum + r.warnings.length, 0);

        return {
            sheetId: sheet.id,
            sheetName: sheet.name,
            valid: invalidRows === 0,
            rows: rowResults,
            summary: {
                totalRows: rows.length,
                validRows,
                invalidRows,
                totalErrors,
                totalWarnings
            }
        };
    }

    /**
     * Validate type of a value
     */
    private static validateType(value: any, type: string): string | null {
        switch (type) {
            case 'string':
                // Most values can be treated as strings
                return null;

            case 'number':
                if (typeof value === 'number') return null;
                if (typeof value === 'string' && !isNaN(Number(value))) return null;
                return `Expected number, got ${typeof value}`;

            case 'boolean':
                if (typeof value === 'boolean') return null;
                if (typeof value === 'string') {
                    const lower = value.toLowerCase();
                    if (['true', 'false', 'yes', 'no', '1', '0'].includes(lower)) {
                        return null;
                    }
                }
                if (typeof value === 'number' && (value === 0 || value === 1)) {
                    return null;
                }
                return `Expected boolean, got ${typeof value}`;

            case 'date':
                if (value instanceof Date && !isNaN(value.getTime())) return null;
                if (typeof value === 'string') {
                    const parsed = Date.parse(value);
                    if (!isNaN(parsed)) return null;
                }
                return 'Invalid date format';

            default:
                return null; // Unknown types pass
        }
    }

    /**
     * Check for duplicate scenario IDs in a sheet
     */
    static checkDuplicateScenarioIds(rows: DataRow[]): string[] {
        const seen = new Map<string, number>();
        const duplicates: string[] = [];

        for (const row of rows) {
            const id = row.scenarioId;
            const count = seen.get(id) || 0;
            seen.set(id, count + 1);

            if (count === 1) {
                duplicates.push(id);
            }
        }

        return duplicates;
    }

    /**
     * Validate common patterns for specific field types
     */
    static getPatternForType(fieldHint: string): string | undefined {
        const lower = fieldHint.toLowerCase();

        if (lower.includes('email')) {
            return '^[\\w.-]+@[\\w.-]+\\.\\w{2,}$';
        }

        if (lower.includes('phone')) {
            return '^[+]?[0-9\\s\\-().]{10,}$';
        }

        if (lower.includes('zip') || lower.includes('postal')) {
            return '^[0-9A-Za-z\\s-]{3,10}$';
        }

        if (lower.includes('url') || lower.includes('link')) {
            return '^https?://[\\w.-]+';
        }

        if (lower.includes('card') && lower.includes('number')) {
            return '^[0-9]{13,19}$';
        }

        if (lower.includes('cvv') || lower.includes('cvc')) {
            return '^[0-9]{3,4}$';
        }

        return undefined;
    }

    /**
     * Auto-suggest validations based on column name
     */
    static suggestValidations(column: DataColumn): Partial<DataColumn> {
        const suggestions: Partial<DataColumn> = {};
        const lower = column.name.toLowerCase();

        // Email fields
        if (lower.includes('email')) {
            suggestions.pattern = this.getPatternForType('email');
            suggestions.type = 'string';
        }

        // Phone fields
        if (lower.includes('phone') || lower.includes('mobile')) {
            suggestions.pattern = this.getPatternForType('phone');
            suggestions.type = 'string';
        }

        // Password fields
        if (lower.includes('password')) {
            suggestions.required = true;
            suggestions.minLength = 8;
        }

        // Name fields
        if (lower.includes('name') && !lower.includes('username')) {
            suggestions.minLength = 1;
            suggestions.maxLength = 100;
        }

        // Age fields
        if (lower === 'age') {
            suggestions.type = 'number';
            suggestions.min = 0;
            suggestions.max = 150;
        }

        // Amount/price fields
        if (lower.includes('amount') || lower.includes('price') || lower.includes('cost')) {
            suggestions.type = 'number';
            suggestions.min = 0;
        }

        // CVV
        if (lower.includes('cvv') || lower.includes('cvc')) {
            suggestions.pattern = this.getPatternForType('cvv');
            suggestions.minLength = 3;
            suggestions.maxLength = 4;
        }

        // Zip/Postal code
        if (lower.includes('zip') || lower.includes('postal')) {
            suggestions.pattern = this.getPatternForType('zip');
        }

        return suggestions;
    }

    /**
     * Coerce value to expected type
     */
    static coerceValue(value: any, type: string): any {
        if (value === null || value === undefined) {
            return value;
        }

        switch (type) {
            case 'number':
                const num = Number(value);
                return isNaN(num) ? value : num;

            case 'boolean':
                if (typeof value === 'boolean') return value;
                if (typeof value === 'string') {
                    const lower = value.toLowerCase();
                    if (['true', 'yes', '1'].includes(lower)) return true;
                    if (['false', 'no', '0'].includes(lower)) return false;
                }
                if (typeof value === 'number') return value !== 0;
                return Boolean(value);

            case 'date':
                if (value instanceof Date) return value.toISOString();
                if (typeof value === 'string' || typeof value === 'number') {
                    const date = new Date(value);
                    return isNaN(date.getTime()) ? value : date.toISOString();
                }
                return value;

            default:
                return String(value);
        }
    }
}

// Export validator functions
export const validateRow = TestDataValidator.validate.bind(TestDataValidator);
export const validateSheet = TestDataValidator.validateSheet.bind(TestDataValidator);
export const checkDuplicates = TestDataValidator.checkDuplicateScenarioIds.bind(TestDataValidator);
