export type GuidedColumnType = 'text' | 'number' | 'boolean' | 'date' | 'formula' | 'reference';

export type GuidedOutputMode = 'record' | 'field';
export type GuidedSelectionPolicy = 'all' | 'first' | 'last' | 'random';

export interface GuidedSortRule {
  column: string;
  direction: 'asc' | 'desc';
}

export interface GuidedReferenceColumnConfig {
  targetSheetId: string;
  targetSheetName: string;
  targetColumn: string;
  displayColumn: string;
  allowMultiple: boolean;
  separator?: string;
  targetColumns: GuidedColumn[];
}

export interface GuidedColumn {
  name: string;
  type: GuidedColumnType;
  reference?: GuidedReferenceColumnConfig;
}

export type GuidedOperator =
  | 'equals'
  | 'notEqual'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  | 'blank'
  | 'notBlank';

export interface GuidedFilterClause {
  id: string;
  column: string;
  operator: GuidedOperator;
  value: string;
  logical: 'and' | 'or';
}

export interface GuidedReferenceClause {
  id: string;
  sourceColumn: string;
  targetColumn: string;
  operator: GuidedOperator;
  value: string;
  logical: 'and' | 'or';
}

export interface GuidedFilterGroup {
  clauses: GuidedFilterClause[];
  quickSearch: string;
  outputMode: GuidedOutputMode;
  outputField?: string;
  selectionPolicy: GuidedSelectionPolicy;
  sort?: GuidedSortRule[];
  limit?: number;
  offset?: number;
  referenceClauses?: GuidedReferenceClause[];
}

export interface GuidedPreset {
  id: 'empty' | 'duplicates' | 'contains' | 'equals';
  label: string;
  description: string;
}

export interface CanvasTableItem {
  id: string;
  name: string;
  rowCount: number;
  pageObject?: string;
}
