import type {
  GuidedColumn,
  GuidedColumnType,
  GuidedOperator,
  GuidedReferenceClause,
} from './types';
import type { RuntimeResolvedReferenceClause } from './runtimeQueryTemplates';

interface RowLike {
  id: string;
  data: Record<string, unknown>;
}

interface ResolveReferenceScopeInput {
  sourceRows: RowLike[];
  sourceColumns: GuidedColumn[];
  referenceClauses: GuidedReferenceClause[];
  fetchTargetRows: (targetSheetId: string) => Promise<RowLike[]>;
  maxKeysPerClause?: number;
}

export interface ResolveReferenceScopeResult {
  scopedRowIds: string[] | null;
  runtimeReferenceClauses: RuntimeResolvedReferenceClause[];
  warnings: string[];
  blockedReason: string | null;
}

function isIdentifier(value: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value);
}

function escapeString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function normalizeBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'no'].includes(normalized)) return false;
  return null;
}

function toLiteral(value: unknown, type: GuidedColumnType): string {
  if (type === 'number') {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? String(numeric) : '0';
  }
  if (type === 'boolean') {
    return normalizeBoolean(value) ? 'true' : 'false';
  }
  return `"${escapeString(String(value ?? ''))}"`;
}

function compareValues(operator: GuidedOperator, actual: unknown, expectedRaw: string, type: GuidedColumnType): boolean {
  const actualValue = actual ?? '';

  if (operator === 'blank') {
    return actualValue === '' || actualValue === null || actualValue === undefined;
  }
  if (operator === 'notBlank') {
    return !(actualValue === '' || actualValue === null || actualValue === undefined);
  }

  if (type === 'number') {
    const actualNum = Number(actualValue);
    const expectedNum = Number(expectedRaw);
    if (!Number.isFinite(actualNum) || !Number.isFinite(expectedNum)) return false;
    switch (operator) {
      case 'equals':
        return actualNum === expectedNum;
      case 'notEqual':
        return actualNum !== expectedNum;
      case 'greaterThan':
        return actualNum > expectedNum;
      case 'lessThan':
        return actualNum < expectedNum;
      case 'greaterThanOrEqual':
        return actualNum >= expectedNum;
      case 'lessThanOrEqual':
        return actualNum <= expectedNum;
      default:
        return false;
    }
  }

  if (type === 'boolean') {
    const actualBool = normalizeBoolean(actualValue);
    const expectedBool = normalizeBoolean(expectedRaw);
    if (actualBool === null || expectedBool === null) return false;
    switch (operator) {
      case 'equals':
        return actualBool === expectedBool;
      case 'notEqual':
        return actualBool !== expectedBool;
      default:
        return false;
    }
  }

  const actualText = String(actualValue);
  const expectedText = String(expectedRaw);
  const actualLower = actualText.toLowerCase();
  const expectedLower = expectedText.toLowerCase();

  switch (operator) {
    case 'equals':
      return actualLower === expectedLower;
    case 'notEqual':
      return actualLower !== expectedLower;
    case 'contains':
      return actualLower.includes(expectedLower);
    case 'notContains':
      return !actualLower.includes(expectedLower);
    case 'startsWith':
      return actualLower.startsWith(expectedLower);
    case 'endsWith':
      return actualLower.endsWith(expectedLower);
    case 'greaterThan':
      return actualText > expectedText;
    case 'lessThan':
      return actualText < expectedText;
    case 'greaterThanOrEqual':
      return actualText >= expectedText;
    case 'lessThanOrEqual':
      return actualText <= expectedText;
    default:
      return false;
  }
}

function parseReferenceCell(
  value: unknown,
  allowMultiple: boolean,
  separator = ','
): string[] {
  if (value === null || value === undefined || value === '') return [];
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }

  const raw = String(value);
  if (!allowMultiple) {
    return [raw.trim()].filter(Boolean);
  }
  return raw
    .split(separator)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function combineIds(
  left: Set<string> | null,
  right: Set<string>,
  logical: 'and' | 'or'
): Set<string> {
  if (!left) return new Set(right);
  if (logical === 'or') {
    return new Set([...left, ...right]);
  }
  return new Set([...left].filter((id) => right.has(id)));
}

function inferTargetColumnType(referenceColumn: GuidedColumn, targetColumnName: string): GuidedColumnType {
  const target = referenceColumn.reference?.targetColumns.find((column) => column.name === targetColumnName);
  return target?.type || 'text';
}

export async function resolveReferenceRowScope({
  sourceRows,
  sourceColumns,
  referenceClauses,
  fetchTargetRows,
  maxKeysPerClause = 200,
}: ResolveReferenceScopeInput): Promise<ResolveReferenceScopeResult> {
  const warnings: string[] = [];
  const runtimeReferenceClauses: RuntimeResolvedReferenceClause[] = [];
  const targetRowsCache = new Map<string, RowLike[]>();
  let combinedIds: Set<string> | null = null;
  let blockedReason: string | null = null;

  for (const clause of referenceClauses) {
    if (!clause.sourceColumn) continue;

    const sourceColumn = sourceColumns.find((column) => column.name === clause.sourceColumn);
    if (!sourceColumn?.reference) {
      warnings.push(`Reference filter "${clause.sourceColumn}" was skipped because it is not a reference column.`);
      continue;
    }

    const targetSheetId = sourceColumn.reference.targetSheetId;
    if (!targetSheetId) {
      warnings.push(`Reference filter "${clause.sourceColumn}" has no target sheet and was skipped.`);
      continue;
    }

    if (!targetRowsCache.has(targetSheetId)) {
      const rows = await fetchTargetRows(targetSheetId);
      targetRowsCache.set(targetSheetId, rows || []);
    }

    const targetRows = targetRowsCache.get(targetSheetId) || [];
    const targetColumn = clause.targetColumn || sourceColumn.reference.displayColumn || sourceColumn.reference.targetColumn;
    const targetType = inferTargetColumnType(sourceColumn, targetColumn);

    const matchingTargetRows = targetRows.filter((row) =>
      compareValues(clause.operator, row.data[targetColumn], clause.value, targetType)
    );
    const targetKeyValues = matchingTargetRows
      .map((row) => row.data[sourceColumn.reference!.targetColumn])
      .filter((value) => value !== null && value !== undefined && value !== '')
      .map((value) => String(value));
    const uniqueKeys = [...new Set(targetKeyValues)];
    const keySet = new Set(uniqueKeys);

    if (uniqueKeys.length > maxKeysPerClause) {
      blockedReason = `Reference filter "${clause.sourceColumn}" matched ${uniqueKeys.length} keys. Refine it below ${maxKeysPerClause}.`;
      warnings.push(blockedReason);
    }

    const matchingSourceIds = sourceRows
      .filter((row) => {
        const values = parseReferenceCell(
          row.data[clause.sourceColumn],
          sourceColumn.reference!.allowMultiple,
          sourceColumn.reference!.separator
        );
        return values.some((value) => keySet.has(value));
      })
      .map((row) => row.id);

    combinedIds = combineIds(combinedIds, new Set(matchingSourceIds), clause.logical);

    if (!isIdentifier(clause.sourceColumn)) {
      warnings.push(`Reference source column "${clause.sourceColumn}" is not runtime-safe and was skipped from snippet.`);
      continue;
    }

    const literalKeys = uniqueKeys.map((value) => toLiteral(value, sourceColumn.type));
    runtimeReferenceClauses.push({
      clause,
      expression: `${clause.sourceColumn} IN [${literalKeys.join(', ')}]`,
      warnings: [],
    });
  }

  return {
    scopedRowIds: combinedIds ? [...combinedIds] : null,
    runtimeReferenceClauses,
    warnings,
    blockedReason,
  };
}

