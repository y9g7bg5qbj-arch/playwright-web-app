import type {
  GuidedColumn,
  GuidedFilterClause,
  GuidedFilterGroup,
  GuidedOperator,
  GuidedColumnType,
  GuidedReferenceClause,
} from './types';
import { buildRuntimeQuerySnippet, type RuntimeResolvedReferenceClause } from './runtimeQueryTemplates';

const VALUE_OPERATORS: GuidedOperator[] = [
  'equals',
  'notEqual',
  'contains',
  'notContains',
  'startsWith',
  'endsWith',
  'greaterThan',
  'lessThan',
  'greaterThanOrEqual',
  'lessThanOrEqual',
];

const NO_VALUE_OPERATORS: GuidedOperator[] = ['blank', 'notBlank'];

export const GUIDED_OPERATOR_LABELS: Record<GuidedOperator, string> = {
  equals: 'Equals',
  notEqual: 'Not Equal',
  contains: 'Contains',
  notContains: 'Does Not Contain',
  startsWith: 'Starts With',
  endsWith: 'Ends With',
  greaterThan: 'Greater Than',
  lessThan: 'Less Than',
  greaterThanOrEqual: 'Greater or Equal',
  lessThanOrEqual: 'Less or Equal',
  blank: 'Is Empty',
  notBlank: 'Is Not Empty',
};

function operatorNeedsValue(operator: GuidedOperator): boolean {
  return VALUE_OPERATORS.includes(operator);
}

function toAgFilterType(columnType: GuidedColumnType): 'text' | 'number' {
  return columnType === 'number' ? 'number' : 'text';
}

function toAgType(operator: GuidedOperator): string {
  switch (operator) {
    case 'equals':
      return 'equals';
    case 'notEqual':
      return 'notEqual';
    case 'contains':
      return 'contains';
    case 'notContains':
      return 'notContains';
    case 'startsWith':
      return 'startsWith';
    case 'endsWith':
      return 'endsWith';
    case 'greaterThan':
      return 'greaterThan';
    case 'lessThan':
      return 'lessThan';
    case 'greaterThanOrEqual':
      return 'greaterThanOrEqual';
    case 'lessThanOrEqual':
      return 'lessThanOrEqual';
    case 'blank':
      return 'blank';
    case 'notBlank':
      return 'notBlank';
    default:
      return 'equals';
  }
}

function fromAgType(agType: string): GuidedOperator {
  switch (agType) {
    case 'equals':
      return 'equals';
    case 'notEqual':
      return 'notEqual';
    case 'contains':
      return 'contains';
    case 'notContains':
      return 'notContains';
    case 'startsWith':
      return 'startsWith';
    case 'endsWith':
      return 'endsWith';
    case 'greaterThan':
      return 'greaterThan';
    case 'lessThan':
      return 'lessThan';
    case 'greaterThanOrEqual':
      return 'greaterThanOrEqual';
    case 'lessThanOrEqual':
      return 'lessThanOrEqual';
    case 'blank':
      return 'blank';
    case 'notBlank':
      return 'notBlank';
    default:
      return 'equals';
  }
}

function toAgCondition(clause: GuidedFilterClause, columnType: GuidedColumnType): Record<string, unknown> {
  const condition: Record<string, unknown> = {
    filterType: toAgFilterType(columnType),
    type: toAgType(clause.operator),
  };

  if (operatorNeedsValue(clause.operator)) {
    if (columnType === 'number') {
      const numericValue = Number(clause.value);
      condition.filter = Number.isNaN(numericValue) ? clause.value : numericValue;
    } else if (columnType === 'boolean') {
      condition.filter = clause.value.toLowerCase() === 'true' ? 'true' : 'false';
    } else {
      condition.filter = clause.value;
    }
  }

  return condition;
}

export function getOperatorsForColumnType(columnType: GuidedColumnType): GuidedOperator[] {
  if (columnType === 'number') {
    return [
      'equals',
      'notEqual',
      'greaterThan',
      'lessThan',
      'greaterThanOrEqual',
      'lessThanOrEqual',
      'blank',
      'notBlank',
    ];
  }

  if (columnType === 'boolean') {
    return ['equals', 'notEqual'];
  }

  return [
    'equals',
    'notEqual',
    'contains',
    'notContains',
    'startsWith',
    'endsWith',
    'blank',
    'notBlank',
  ];
}

export function createInitialClause(columns: GuidedColumn[]): GuidedFilterClause {
  const firstColumn = columns[0];
  const firstOperator = firstColumn ? getOperatorsForColumnType(firstColumn.type)[0] : 'contains';
  return {
    id: `clause-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    column: firstColumn?.name || '',
    operator: firstOperator,
    value: '',
    logical: 'and',
  };
}

export function createInitialReferenceClause(columns: GuidedColumn[]): GuidedReferenceClause {
  const firstReferenceColumn = columns.find((column) => column.type === 'reference' && column.reference);
  const targetColumn = firstReferenceColumn?.reference?.displayColumn || firstReferenceColumn?.reference?.targetColumn || '';
  return {
    id: `ref-clause-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sourceColumn: firstReferenceColumn?.name || '',
    targetColumn,
    operator: 'contains',
    value: '',
    logical: 'and',
  };
}

export function createInitialGuidedFilterGroup(columns: GuidedColumn[]): GuidedFilterGroup {
  return {
    clauses: [],
    quickSearch: '',
    outputMode: 'record',
    outputField: columns[0]?.name,
    selectionPolicy: 'all',
    sort: [],
    limit: 25,
    offset: 0,
    referenceClauses: [],
  };
}

export function buildGuidedFromFilterModel(
  filterModel: Record<string, any> | null | undefined,
  columns: GuidedColumn[],
  quickSearch = ''
): GuidedFilterGroup {
  const clauses: GuidedFilterClause[] = [];
  const modelEntries = Object.entries(filterModel || {});

  modelEntries.forEach(([columnName, filter], index) => {
    const columnType = columns.find((c) => c.name === columnName)?.type || 'text';

    if (filter && filter.operator && filter.condition1 && filter.condition2) {
      const first: GuidedFilterClause = {
        id: `clause-${columnName}-${index}-1`,
        column: columnName,
        operator: fromAgType(filter.condition1.type),
        value: String(filter.condition1.filter ?? ''),
        logical: 'and',
      };

      const second: GuidedFilterClause = {
        id: `clause-${columnName}-${index}-2`,
        column: columnName,
        operator: fromAgType(filter.condition2.type),
        value: String(filter.condition2.filter ?? ''),
        logical: String(filter.operator || 'AND').toLowerCase() === 'or' ? 'or' : 'and',
      };

      clauses.push(first, second);
      return;
    }

    const clause: GuidedFilterClause = {
      id: `clause-${columnName}-${index}`,
      column: columnName,
      operator: fromAgType(filter?.type || 'equals'),
      value: String(filter?.filter ?? ''),
      logical: 'and',
    };

    // Normalize value-less operators
    if (NO_VALUE_OPERATORS.includes(clause.operator)) {
      clause.value = '';
    }

    // Number filters default to equals if unsupported mapping
    if (columnType === 'number' && ['contains', 'startsWith', 'endsWith', 'notContains'].includes(clause.operator)) {
      clause.operator = 'equals';
    }

    clauses.push(clause);
  });

  return {
    ...createInitialGuidedFilterGroup(columns),
    clauses,
    quickSearch,
  };
}

export function buildFilterModelFromGuided(
  guided: GuidedFilterGroup,
  columns: GuidedColumn[]
): { model: Record<string, unknown>; warnings: string[]; error?: string } {
  const warnings: string[] = [];
  const model: Record<string, unknown> = {};

  if (guided.clauses.length === 0) {
    return { model, warnings };
  }

  const validClauses = guided.clauses.filter((clause) => clause.column && clause.operator);
  const groupedByColumn = new Map<string, GuidedFilterClause[]>();

  for (const clause of validClauses) {
    const column = columns.find((c) => c.name === clause.column);
    if (!column) {
      warnings.push(`Ignored filter for removed column "${clause.column}".`);
      continue;
    }

    if (operatorNeedsValue(clause.operator) && clause.value.trim() === '') {
      return {
        model,
        warnings,
        error: `Filter "${clause.column}" requires a value.`,
      };
    }

    if (!groupedByColumn.has(clause.column)) {
      groupedByColumn.set(clause.column, []);
    }

    groupedByColumn.get(clause.column)?.push(clause);
  }

  // AG Grid can only do cross-column AND with the regular model.
  for (let i = 1; i < validClauses.length; i += 1) {
    if (validClauses[i].logical === 'or' && validClauses[i].column !== validClauses[i - 1].column) {
      warnings.push('OR across different columns is approximated as AND for grid filtering.');
      break;
    }
  }

  groupedByColumn.forEach((clauses, columnName) => {
    const column = columns.find((c) => c.name === columnName);
    if (!column || clauses.length === 0) {
      return;
    }

    if (clauses.length === 1) {
      model[columnName] = toAgCondition(clauses[0], column.type);
      return;
    }

    if (clauses.length > 2) {
      warnings.push(`Only first 2 filters for "${columnName}" are applied in grid mode.`);
    }

    const first = clauses[0];
    const second = clauses[1];

    model[columnName] = {
      filterType: toAgFilterType(column.type),
      operator: second.logical.toUpperCase() === 'OR' ? 'OR' : 'AND',
      condition1: toAgCondition(first, column.type),
      condition2: toAgCondition(second, column.type),
    };
  });

  return { model, warnings };
}

export function buildVDQLFromGuided(
  guided: GuidedFilterGroup,
  tableName: string,
  columns: GuidedColumn[],
  options?: {
    resolvedReferenceClauses?: RuntimeResolvedReferenceClause[];
    blockedReason?: string | null;
    matchCount?: number;
  }
): string {
  return buildRuntimeQuerySnippet(guided, tableName, columns, options).snippet;
}

export function buildRuntimeSnippetFromGuided(
  guided: GuidedFilterGroup,
  tableName: string,
  columns: GuidedColumn[],
  options?: {
    resolvedReferenceClauses?: RuntimeResolvedReferenceClause[];
    blockedReason?: string | null;
    matchCount?: number;
  }
): { snippet: string; warnings: string[] } {
  const runtime = buildRuntimeQuerySnippet(guided, tableName, columns, options);
  return {
    snippet: runtime.snippet,
    warnings: runtime.warnings,
  };
}
