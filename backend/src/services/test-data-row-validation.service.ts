/**
 * Test Data Row Validation Service
 *
 * Strictly validates typed values for write operations while allowing
 * existing legacy-invalid values to remain until explicitly edited.
 */

export type TestDataColumnType = 'string' | 'text' | 'number' | 'boolean' | 'date' | 'formula' | 'reference';

export interface TestDataColumnValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: string[];
}

export interface TestDataColumnSchema {
  name: string;
  type: TestDataColumnType | string;
  required?: boolean;
  validation?: TestDataColumnValidation;
  // Backward compatibility fields
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: string[];
}

export interface TestDataValidationErrorItem {
  rowId: string;
  column: string;
  expectedType: string;
  value: unknown;
  reason: string;
}

export interface TestDataValidationResult {
  valid: boolean;
  validationErrors: TestDataValidationErrorItem[];
}

export interface ValidationErrorPayload {
  success: false;
  code: 'TEST_DATA_VALIDATION_FAILED';
  message: string;
  validationErrors: TestDataValidationErrorItem[];
}

function isEmptyValue(value: unknown): boolean {
  return value === '' || value === null || value === undefined;
}

function normalizeType(type: string): 'text' | 'number' | 'boolean' | 'date' {
  if (type === 'number') return 'number';
  if (type === 'boolean') return 'boolean';
  if (type === 'date') return 'date';
  return 'text';
}

function expectedTypeLabel(type: string): string {
  if (type === 'number') return 'number';
  if (type === 'boolean') return 'boolean';
  if (type === 'date') return 'date';
  return 'text';
}

function normalizeRules(column: TestDataColumnSchema): TestDataColumnValidation {
  return {
    min: column.validation?.min ?? column.min,
    max: column.validation?.max ?? column.max,
    minLength: column.validation?.minLength ?? column.minLength,
    maxLength: column.validation?.maxLength ?? column.maxLength,
    pattern: column.validation?.pattern ?? column.pattern,
    enum: column.validation?.enum ?? column.enum,
  };
}

function valuesDiffer(a: unknown, b: unknown): boolean {
  if (typeof a === 'number' && typeof b === 'number') {
    return Number.isNaN(a) ? !Number.isNaN(b) : Number.isNaN(b) || a !== b;
  }
  return a !== b;
}

function validateValue(column: TestDataColumnSchema, value: unknown, rowId: string): TestDataValidationErrorItem | null {
  const normalizedType = normalizeType(String(column.type));
  const rules = normalizeRules(column);
  const expectedType = expectedTypeLabel(String(column.type));

  if (isEmptyValue(value)) {
    if (column.required) {
      return {
        rowId,
        column: column.name,
        expectedType,
        value,
        reason: 'Value is required.',
      };
    }
    return null;
  }

  if (normalizedType === 'number') {
    const numeric = typeof value === 'number' ? value : Number(String(value));
    if (!Number.isFinite(numeric)) {
      return {
        rowId,
        column: column.name,
        expectedType,
        value,
        reason: 'Value must be numeric.',
      };
    }
    if (rules.min !== undefined && numeric < rules.min) {
      return {
        rowId,
        column: column.name,
        expectedType,
        value,
        reason: `Value must be >= ${rules.min}.`,
      };
    }
    if (rules.max !== undefined && numeric > rules.max) {
      return {
        rowId,
        column: column.name,
        expectedType,
        value,
        reason: `Value must be <= ${rules.max}.`,
      };
    }
    return null;
  }

  if (normalizedType === 'boolean') {
    if (typeof value === 'boolean') return null;
    if (value === 0 || value === 1) return null;
    const lower = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (['true', 'false', '1', '0', 'yes', 'no'].includes(lower)) {
      return null;
    }
    return {
      rowId,
      column: column.name,
      expectedType,
      value,
      reason: 'Value must be boolean-compatible (true/false).',
    };
  }

  if (normalizedType === 'date') {
    const parsed = value instanceof Date ? value.getTime() : Date.parse(String(value));
    if (Number.isNaN(parsed)) {
      return {
        rowId,
        column: column.name,
        expectedType,
        value,
        reason: 'Value must be a valid date.',
      };
    }
    return null;
  }

  const stringValue = String(value);
  if (rules.minLength !== undefined && stringValue.length < rules.minLength) {
    return {
      rowId,
      column: column.name,
      expectedType,
      value,
      reason: `Value must be at least ${rules.minLength} characters.`,
    };
  }
  if (rules.maxLength !== undefined && stringValue.length > rules.maxLength) {
    return {
      rowId,
      column: column.name,
      expectedType,
      value,
      reason: `Value must be at most ${rules.maxLength} characters.`,
    };
  }
  if (rules.pattern) {
    try {
      const regex = new RegExp(rules.pattern);
      if (!regex.test(stringValue)) {
        return {
          rowId,
          column: column.name,
          expectedType,
          value,
          reason: 'Value does not match required pattern.',
        };
      }
    } catch {
      return {
        rowId,
        column: column.name,
        expectedType,
        value,
        reason: 'Column validation pattern is invalid.',
      };
    }
  }
  if (rules.enum && rules.enum.length > 0 && !rules.enum.includes(stringValue)) {
    return {
      rowId,
      column: column.name,
      expectedType,
      value,
      reason: `Value must be one of: ${rules.enum.join(', ')}.`,
    };
  }

  return null;
}

export class TestDataRowValidationService {
  static validateCreateData(
    rowId: string,
    rowData: Record<string, unknown>,
    columns: TestDataColumnSchema[]
  ): TestDataValidationResult {
    const validationErrors: TestDataValidationErrorItem[] = [];

    for (const column of columns) {
      const error = validateValue(column, rowData[column.name], rowId);
      if (error) {
        validationErrors.push(error);
      }
    }

    return {
      valid: validationErrors.length === 0,
      validationErrors,
    };
  }

  static validateChangedFields(
    rowId: string,
    existingData: Record<string, unknown>,
    nextData: Record<string, unknown>,
    columns: TestDataColumnSchema[]
  ): TestDataValidationResult {
    const validationErrors: TestDataValidationErrorItem[] = [];
    const changedKeys = new Set<string>();

    for (const [key, nextValue] of Object.entries(nextData)) {
      const previousValue = existingData[key];
      if (valuesDiffer(previousValue, nextValue)) {
        changedKeys.add(key);
      }
    }

    for (const column of columns) {
      if (!changedKeys.has(column.name)) {
        continue;
      }
      const error = validateValue(column, nextData[column.name], rowId);
      if (error) {
        validationErrors.push(error);
      }
    }

    return {
      valid: validationErrors.length === 0,
      validationErrors,
    };
  }

  static toValidationErrorPayload(
    validationErrors: TestDataValidationErrorItem[],
    message = 'One or more values violate the sheet column data types.'
  ): ValidationErrorPayload {
    return {
      success: false,
      code: 'TEST_DATA_VALIDATION_FAILED',
      message,
      validationErrors,
    };
  }
}

export const testDataRowValidationService = TestDataRowValidationService;
