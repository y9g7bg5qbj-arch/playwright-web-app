import type {
  GuidedColumn,
  GuidedColumnType,
  GuidedFilterClause,
  GuidedFilterGroup,
  GuidedReferenceClause,
  GuidedSortRule,
} from './types';

export interface RuntimeResolvedReferenceClause {
  clause: GuidedReferenceClause;
  expression: string;
  warnings?: string[];
}

export interface RuntimeQueryBuildResult {
  snippet: string;
  warnings: string[];
}

interface RuntimeQueryBuildOptions {
  resolvedReferenceClauses?: RuntimeResolvedReferenceClause[];
  blockedReason?: string | null;
  matchCount?: number;
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
  return safe || 'col_value';
}

function isIdentifier(value: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value);
}

function escapeString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function toLiteral(value: string, type: GuidedColumnType): string {
  if (type === 'number') {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? String(numeric) : value;
  }

  if (type === 'boolean') {
    const lower = value.trim().toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') return 'true';
    if (lower === 'false' || lower === '0' || lower === 'no') return 'false';
    return 'false';
  }

  return `"${escapeString(value)}"`;
}

function buildOperatorExpression(
  clause: Pick<GuidedFilterClause, 'column' | 'operator' | 'value'>,
  columnType: GuidedColumnType
): string {
  const column = clause.column;
  const literal = toLiteral(clause.value, columnType);

  switch (clause.operator) {
    case 'equals':
      return `${column} = ${literal}`;
    case 'notEqual':
      return `${column} != ${literal}`;
    case 'contains':
      return `${column} CONTAINS ${literal}`;
    case 'notContains':
      return `NOT (${column} CONTAINS ${literal})`;
    case 'startsWith':
      return `${column} STARTS WITH ${literal}`;
    case 'endsWith':
      return `${column} ENDS WITH ${literal}`;
    case 'greaterThan':
      return `${column} > ${literal}`;
    case 'lessThan':
      return `${column} < ${literal}`;
    case 'greaterThanOrEqual':
      return `${column} >= ${literal}`;
    case 'lessThanOrEqual':
      return `${column} <= ${literal}`;
    case 'blank':
      return `${column} IS EMPTY`;
    case 'notBlank':
      return `${column} IS NOT EMPTY`;
    default:
      return `${column} = ${literal}`;
  }
}

function buildOrderBy(sortRules: GuidedSortRule[], warnings: string[]): string {
  if (!sortRules.length) return '';
  const parts = sortRules
    .filter((rule) => {
      if (!isIdentifier(rule.column)) {
        warnings.push(`Sort column "${rule.column}" is not a runtime-safe identifier and was ignored.`);
        return false;
      }
      return true;
    })
    .map((rule) => `${rule.column} ${rule.direction.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`);

  if (!parts.length) return '';
  return ` ORDER BY ${parts.join(', ')}`;
}

function normalizeLimit(value?: number): number | undefined {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return undefined;
  const parsed = Math.trunc(Number(value));
  return parsed > 0 ? parsed : undefined;
}

function normalizeOffset(value?: number): number | undefined {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return undefined;
  const parsed = Math.trunc(Number(value));
  return parsed >= 0 ? parsed : undefined;
}

export function buildRuntimeQuerySnippet(
  guided: GuidedFilterGroup,
  tableName: string,
  columns: GuidedColumn[],
  options: RuntimeQueryBuildOptions = {}
): RuntimeQueryBuildResult {
  const warnings: string[] = [];
  if (guided.quickSearch && guided.quickSearch.trim()) {
    warnings.push('Quick search is applied in-grid only and is not embedded in the runtime snippet.');
  }
  const tableIdentifier = toPascalCase(tableName) || 'Table';
  const localExpressions: string[] = [];
  const validLocalClauses = guided.clauses.filter((clause) => clause.column && clause.operator);

  validLocalClauses.forEach((clause, index) => {
    if (!isIdentifier(clause.column)) {
      warnings.push(`Column "${clause.column}" is not a runtime-safe identifier and was ignored in snippet.`);
      return;
    }

    const type = columns.find((column) => column.name === clause.column)?.type || 'text';
    const expression = buildOperatorExpression(clause, type);
    if (!expression) return;

    if (localExpressions.length === 0) {
      localExpressions.push(expression);
      return;
    }

    const logical = index > 0 && clause.logical === 'or' ? 'OR' : 'AND';
    localExpressions.push(`${logical} ${expression}`);
  });

  const referenceExpressions: string[] = [];
  (options.resolvedReferenceClauses || []).forEach((resolved, index) => {
    if (!resolved.expression) return;
    if (referenceExpressions.length === 0 && localExpressions.length === 0) {
      referenceExpressions.push(resolved.expression);
      return;
    }
    const logical = index > 0 && resolved.clause.logical === 'or' ? 'OR' : 'AND';
    referenceExpressions.push(`${logical} ${resolved.expression}`);
    if (resolved.warnings?.length) warnings.push(...resolved.warnings);
  });

  const whereParts = [...localExpressions, ...referenceExpressions];
  const whereClause = whereParts.length > 0 ? ` WHERE ${whereParts.join(' ')}` : '';
  const orderByClause = buildOrderBy(guided.sort || [], warnings);
  const limit = normalizeLimit(guided.limit);
  const offset = normalizeOffset(guided.offset);
  const limitClause = limit ? ` LIMIT ${limit}` : '';
  const offsetClause = offset !== undefined && offset > 0 ? ` OFFSET ${offset}` : '';

  if (options.blockedReason) {
    return {
      snippet: `# Runtime snippet blocked: ${options.blockedReason}`,
      warnings,
    };
  }

  const selectionPolicy = guided.selectionPolicy || 'all';
  const outputMode = guided.outputMode || 'record';
  const shouldUseSingleRow =
    selectionPolicy !== 'all' || (selectionPolicy === 'all' && options.matchCount === 1);

  if (selectionPolicy === 'all' && options.matchCount === undefined) {
    warnings.push('Apply filters to infer single-result form. Defaulting preview to ROWS.');
  }

  if (shouldUseSingleRow) {
    const modifier =
      selectionPolicy === 'first'
        ? 'FIRST '
        : selectionPolicy === 'last'
          ? 'LAST '
          : selectionPolicy === 'random'
            ? 'RANDOM '
            : '';

    const rowSnippet = `ROW one FROM ${modifier}${tableIdentifier}${whereClause}${orderByClause}`;

    if (outputMode !== 'field') {
      return {
        snippet: rowSnippet,
        warnings,
      };
    }

    const valueColumn = guided.outputField || columns[0]?.name || '';
    if (!valueColumn || !isIdentifier(valueColumn)) {
      warnings.push(`Output field "${valueColumn}" is not runtime-safe. Select a simple identifier column.`);
      return {
        snippet: rowSnippet,
        warnings,
      };
    }

    const valueVar = toVariableName(valueColumn);
    return {
      snippet: `${rowSnippet}\nTEXT ${valueVar} = one.${valueColumn}`,
      warnings,
    };
  }

  if (outputMode === 'field') {
    warnings.push('Multiple matches return ROWS. Choose First/Last/Random to extract one field value.');
  }

  return {
    snippet: `ROWS many FROM ${tableIdentifier}${whereClause}${orderByClause}${limitClause}${offsetClause}`,
    warnings,
  };
}
