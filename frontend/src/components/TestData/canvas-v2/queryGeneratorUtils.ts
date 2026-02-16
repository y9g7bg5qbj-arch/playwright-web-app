import type { GuidedColumn } from './types';

export const ANY_VALUE = '__ANY__';
export const EMPTY_VALUE = '__EMPTY__';
const MAX_DISTINCT_DEFAULT = 200;

export type QueryResultControl = 'auto' | 'first' | 'last' | 'random' | 'topN' | 'lastN';
export type QuerySortDirection = 'asc' | 'desc';

export interface QueryGeneratorDraft {
  tableId: string;
  answers: Record<string, string>;
  resultControl: QueryResultControl;
  sortColumn: string;
  sortDirection: QuerySortDirection;
  limit: number;
}

export interface QueryGeneratorTable {
  id: string;
  name: string;
  columns: GuidedColumn[];
}

export interface QueryRowLike {
  id: string;
  data: Record<string, unknown>;
}

export interface RuntimeQueryResult {
  snippet: string;
  shape: 'ROW' | 'ROWS';
  warnings: string[];
}

export interface CellQueryPayload {
  tableId?: string;
  tableName: string;
  rowId: string;
  rowIndex: number;
  column: string;
  columnType: GuidedColumn['type'];
  value: unknown;
  query: string;
  summary: string;
  prefillAnswerValue: string;
}

function toPascalCase(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function toVariableName(value: string): string {
  const cleaned = value
    .replace(/[^a-zA-Z0-9_]/g, ' ')
    .trim()
    .split(/\s+/)
    .map((part) => part.toLowerCase())
    .join('_');
  const safe = cleaned.replace(/^[^a-zA-Z_]+/, '');
  return safe || 'value';
}

function escapeString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function isIdentifier(value: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value);
}

function normalizeBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1 ? true : value === 0 ? false : null;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'no'].includes(normalized)) return false;
  return null;
}

function isEmptyValue(value: unknown): boolean {
  return value === '' || value === null || value === undefined;
}

function toLiteral(value: unknown, type: GuidedColumn['type']): string {
  if (type === 'number') {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? String(numeric) : '0';
  }

  if (type === 'boolean') {
    return normalizeBoolean(value) ? 'true' : 'false';
  }

  return `"${escapeString(String(value ?? ''))}"`;
}

export function createInitialQueryDraft(tableId: string, columns: GuidedColumn[]): QueryGeneratorDraft {
  const answers: Record<string, string> = {};
  columns.forEach((column) => {
    answers[column.name] = ANY_VALUE;
  });

  return {
    tableId,
    answers,
    resultControl: 'auto',
    sortColumn: '',
    sortDirection: 'asc',
    limit: 5,
  };
}

export function buildDistinctValueMap(
  rows: QueryRowLike[],
  columns: GuidedColumn[],
  maxDistinct = MAX_DISTINCT_DEFAULT
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  columns.forEach((column) => {
    const seen = new Set<string>();
    const values: string[] = [];

    for (const row of rows) {
      const rawValue = row.data[column.name];
      if (isEmptyValue(rawValue)) {
        continue;
      }
      const serialized = String(rawValue);
      if (seen.has(serialized)) {
        continue;
      }
      seen.add(serialized);
      values.push(serialized);
      if (values.length >= maxDistinct) {
        break;
      }
    }

    values.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    result[column.name] = values;
  });

  return result;
}

export function buildFilterModelFromAnswers(
  answers: Record<string, string>,
  columns: GuidedColumn[]
): { model: Record<string, unknown>; activeCount: number; warnings: string[] } {
  const model: Record<string, unknown> = {};
  const warnings: string[] = [];
  let activeCount = 0;

  columns.forEach((column) => {
    const answer = answers[column.name];
    if (!answer || answer === ANY_VALUE) {
      return;
    }

    activeCount += 1;

    if (answer === EMPTY_VALUE) {
      model[column.name] = {
        filterType: column.type === 'number' ? 'number' : 'text',
        type: 'blank',
      };
      return;
    }

    if (column.type === 'number') {
      const numeric = Number(answer);
      if (!Number.isFinite(numeric)) {
        warnings.push(`"${column.name}" expected numeric values. Using text comparison for "${answer}".`);
        model[column.name] = {
          filterType: 'text',
          type: 'equals',
          filter: answer,
        };
        return;
      }

      model[column.name] = {
        filterType: 'number',
        type: 'equals',
        filter: numeric,
      };
      return;
    }

    if (column.type === 'boolean') {
      const normalized = normalizeBoolean(answer);
      model[column.name] = {
        filterType: 'text',
        type: 'equals',
        filter: normalized ? 'true' : 'false',
      };
      return;
    }

    model[column.name] = {
      filterType: 'text',
      type: 'equals',
      filter: answer,
    };
  });

  return { model, activeCount, warnings };
}

function rowMatchesAnswer(value: unknown, answer: string, type: GuidedColumn['type']): boolean {
  if (answer === ANY_VALUE || !answer) {
    return true;
  }

  if (answer === EMPTY_VALUE) {
    return isEmptyValue(value);
  }

  if (isEmptyValue(value)) {
    return false;
  }

  if (type === 'number') {
    const rowNumeric = Number(value);
    const answerNumeric = Number(answer);
    if (!Number.isFinite(rowNumeric) || !Number.isFinite(answerNumeric)) {
      return String(value) === answer;
    }
    return rowNumeric === answerNumeric;
  }

  if (type === 'boolean') {
    const rowBool = normalizeBoolean(value);
    const answerBool = normalizeBoolean(answer);
    if (rowBool === null || answerBool === null) {
      return String(value).toLowerCase() === answer.toLowerCase();
    }
    return rowBool === answerBool;
  }

  return String(value) === answer;
}

export function filterRowsByAnswers(
  rows: QueryRowLike[],
  columns: GuidedColumn[],
  answers: Record<string, string>
): QueryRowLike[] {
  if (rows.length === 0) {
    return [];
  }

  const activeColumns = columns.filter((column) => {
    const answer = answers[column.name];
    return answer && answer !== ANY_VALUE;
  });

  if (activeColumns.length === 0) {
    return rows;
  }

  return rows.filter((row) =>
    activeColumns.every((column) => rowMatchesAnswer(row.data[column.name], answers[column.name], column.type))
  );
}

export function inferQueryShape(matchCount: number | null | undefined, resultControl: QueryResultControl): 'ROW' | 'ROWS' {
  if (resultControl === 'first' || resultControl === 'last' || resultControl === 'random') {
    return 'ROW';
  }
  if (resultControl === 'topN' || resultControl === 'lastN') {
    return 'ROWS';
  }
  if (matchCount === 1) {
    return 'ROW';
  }
  return 'ROWS';
}

export function validateTopLastRequirements(
  draft: QueryGeneratorDraft,
  columns: GuidedColumn[]
): string | null {
  if (draft.resultControl !== 'topN' && draft.resultControl !== 'lastN') {
    return null;
  }

  if (!draft.sortColumn) {
    return 'Select a sort column before using Top N or Last N.';
  }

  const sortExists = columns.some((column) => column.name === draft.sortColumn);
  if (!sortExists) {
    return `Sort column "${draft.sortColumn}" is no longer available.`;
  }

  const parsedLimit = Number(draft.limit);
  if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
    return 'Limit must be a positive number.';
  }

  return null;
}

interface RuntimeFromAnswersInput {
  tableName: string;
  columns: GuidedColumn[];
  answers: Record<string, string>;
  resultControl: QueryResultControl;
  sortColumn: string;
  sortDirection: QuerySortDirection;
  limit: number;
  matchCount?: number | null;
}

function buildWhereClause(
  answers: Record<string, string>,
  columns: GuidedColumn[],
  warnings: string[]
): string {
  const expressions: string[] = [];

  columns.forEach((column) => {
    const answer = answers[column.name];
    if (!answer || answer === ANY_VALUE) {
      return;
    }

    if (!isIdentifier(column.name)) {
      warnings.push(`Column "${column.name}" is not runtime-safe and was skipped.`);
      return;
    }

    if (answer === EMPTY_VALUE) {
      expressions.push(`${column.name} IS EMPTY`);
      return;
    }

    expressions.push(`${column.name} = ${toLiteral(answer, column.type)}`);
  });

  if (expressions.length === 0) {
    return '';
  }

  return ` WHERE ${expressions.join(' AND ')}`;
}

function buildOrderByClause(
  sortColumn: string,
  sortDirection: QuerySortDirection,
  warnings: string[]
): string {
  if (!sortColumn) {
    return '';
  }
  if (!isIdentifier(sortColumn)) {
    warnings.push(`Sort column "${sortColumn}" is not runtime-safe and was ignored.`);
    return '';
  }
  return ` ORDER BY ${sortColumn} ${sortDirection.toUpperCase()}`;
}

export function buildRuntimeQueryFromAnswers({
  tableName,
  columns,
  answers,
  resultControl,
  sortColumn,
  sortDirection,
  limit,
  matchCount,
}: RuntimeFromAnswersInput): RuntimeQueryResult {
  const warnings: string[] = [];
  const tableIdentifier = toPascalCase(tableName) || 'Table';
  const whereClause = buildWhereClause(answers, columns, warnings);
  const shape = inferQueryShape(matchCount, resultControl);

  if (resultControl === 'auto' && (matchCount === null || matchCount === undefined)) {
    warnings.push('Apply filters to infer single-result form. Preview defaults to ROWS.');
  }

  if (shape === 'ROW') {
    const modifier =
      resultControl === 'first'
        ? 'FIRST '
        : resultControl === 'last'
          ? 'LAST '
          : resultControl === 'random'
            ? 'RANDOM '
            : '';
    const orderByClause = buildOrderByClause(sortColumn, sortDirection, warnings);
    return {
      shape,
      warnings,
      snippet: `ROW one FROM ${modifier}${tableIdentifier}${whereClause}${orderByClause}`,
    };
  }

  let effectiveDirection: QuerySortDirection = sortDirection;
  let includeLimit = false;
  if (resultControl === 'topN' || resultControl === 'lastN') {
    includeLimit = true;
    if (resultControl === 'lastN') {
      effectiveDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    }
  }

  const orderByClause = buildOrderByClause(sortColumn, effectiveDirection, warnings);
  const safeLimit = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Math.trunc(Number(limit)) : 1;
  const limitClause = includeLimit ? ` LIMIT ${safeLimit}` : '';

  return {
    shape,
    warnings,
    snippet: `ROWS many FROM ${tableIdentifier}${whereClause}${orderByClause}${limitClause}`,
  };
}

function pickKeyColumn(columns: GuidedColumn[], rowData: Record<string, unknown>): GuidedColumn | null {
  const scored = columns
    .filter((column) => !isEmptyValue(rowData[column.name]))
    .map((column) => {
      const lower = column.name.toLowerCase();
      let score = 0;
      if (lower === 'id' || lower === '_id') score += 100;
      if (lower === 'scenarioid' || lower === 'testid') score += 90;
      if (lower.endsWith('id')) score += 70;
      if (lower.includes('key')) score += 40;
      if (column.type === 'number' || column.type === 'text') score += 10;
      return { column, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.column || null;
}

interface BuildCellExtractionInput {
  tableId?: string;
  tableName: string;
  rowId: string;
  rowIndex: number;
  rowData: Record<string, unknown>;
  column: GuidedColumn;
  allColumns: GuidedColumn[];
}

export function buildCellExtractionQuery(input: BuildCellExtractionInput): CellQueryPayload {
  const { tableId, tableName, rowId, rowIndex, rowData, column, allColumns } = input;
  const tableIdentifier = toPascalCase(tableName) || 'Table';
  const selectedValue = rowData[column.name];
  const prefillAnswerValue = isEmptyValue(selectedValue) ? EMPTY_VALUE : String(selectedValue);
  const selectedLiteral = toLiteral(selectedValue, column.type);
  const keyColumn = pickKeyColumn(allColumns, rowData);

  let rowLine = `ROW one FROM FIRST ${tableIdentifier} WHERE ${column.name} = ${selectedLiteral}`;
  if (keyColumn && isIdentifier(keyColumn.name)) {
    const keyLiteral = toLiteral(rowData[keyColumn.name], keyColumn.type);
    rowLine = `ROW one FROM ${tableIdentifier} WHERE ${keyColumn.name} = ${keyLiteral}`;
  }

  const variableName = toVariableName(column.name);
  const extractLine = isIdentifier(column.name) ? `TEXT ${variableName} = one.${column.name}` : '';
  const query = extractLine ? `${rowLine}\n${extractLine}` : rowLine;
  const summary = `Cell query from ${tableName}.${column.name} (row ${rowIndex + 1})`;

  return {
    tableId,
    tableName,
    rowId,
    rowIndex,
    column: column.name,
    columnType: column.type,
    value: selectedValue,
    query,
    summary,
    prefillAnswerValue,
  };
}
