/**
 * @deprecated Query builder has moved to QueryGeneratorModal (popup-first flow).
 * This component is retained temporarily for backward compatibility and will be removed.
 */
import { useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  Sparkles,
  Filter,
  RotateCcw,
  Play,
  Code,
  AlertTriangle,
  SlidersHorizontal,
  X,
  Link2,
  Copy,
  Check,
} from 'lucide-react';
import type {
  GuidedColumn,
  GuidedFilterGroup,
  GuidedPreset,
  GuidedOutputMode,
  GuidedSelectionPolicy,
  GuidedSortRule,
  GuidedReferenceClause,
} from './types';
import { Button } from '@/components/ui';
import {
  createInitialClause,
  createInitialReferenceClause,
  GUIDED_OPERATOR_LABELS,
  getOperatorsForColumnType,
} from './guidedFilterUtils';

interface GuidedQueryBuilderStripProps {
  columns: GuidedColumn[];
  value: GuidedFilterGroup;
  tableName?: string;
  matchCount?: number | null;
  onChange: (nextValue: GuidedFilterGroup) => void;
  onApply: () => void;
  onReset: () => void;
  onApplyPreset: (presetId: GuidedPreset['id']) => void;
  onToggleAdvanced: () => void;
  showAdvanced: boolean;
  advancedQuery: string;
  gridFilterSummary?: string;
  onCopyRuntimeSnippet?: () => void;
  runtimeSnippetBlocked?: boolean;
  runtimeSnippetBlockReason?: string | null;
  validationError?: string | null;
  warnings?: string[];
}

const PRESETS: GuidedPreset[] = [
  { id: 'empty', label: 'Empty values', description: 'Find rows with empty fields' },
  { id: 'duplicates', label: 'Duplicates', description: 'Show likely duplicated rows' },
  { id: 'contains', label: 'Contains', description: 'Text contains value' },
  { id: 'equals', label: 'Equals', description: 'Exact value match' },
];

const DEFAULT_GRID_SUMMARY = [
  'Quick search: (none)',
  'Column filters: 0',
  'Cross-table scope: none',
].join('\n');

export function GuidedQueryBuilderStrip({
  columns,
  value,
  tableName,
  matchCount,
  onChange,
  onApply,
  onReset,
  onApplyPreset,
  onToggleAdvanced,
  showAdvanced,
  advancedQuery,
  gridFilterSummary,
  onCopyRuntimeSnippet,
  runtimeSnippetBlocked = false,
  runtimeSnippetBlockReason,
  validationError,
  warnings = [],
}: GuidedQueryBuilderStripProps) {
  const [showClauseEditor, setShowClauseEditor] = useState(true);
  const [snippetCopied, setSnippetCopied] = useState(false);

  const outputMode: GuidedOutputMode = value.outputMode || 'record';
  const selectionPolicy: GuidedSelectionPolicy = value.selectionPolicy || 'all';
  const sortRule = value.sort?.[0] || { column: columns[0]?.name || '', direction: 'asc' as const };
  const referenceClauses = value.referenceClauses || [];
  const hasKnownMatchCount = typeof matchCount === 'number' && Number.isFinite(matchCount);
  const inferredOutput = useMemo<'ROW' | 'ROWS'>(() => {
    if (selectionPolicy !== 'all') {
      return 'ROW';
    }
    if (hasKnownMatchCount && matchCount === 1) {
      return 'ROW';
    }
    return 'ROWS';
  }, [hasKnownMatchCount, matchCount, selectionPolicy]);

  const referenceColumns = useMemo(
    () => columns.filter((column) => column.type === 'reference' && column.reference),
    [columns]
  );

  const canAddReferenceClause = referenceColumns.length > 0;

  const getTargetColumnsForReference = (sourceColumnName: string) => {
    const sourceColumn = referenceColumns.find((column) => column.name === sourceColumnName);
    return sourceColumn?.reference?.targetColumns || [];
  };

  const getTargetColumnType = (clause: GuidedReferenceClause) => {
    const targetColumns = getTargetColumnsForReference(clause.sourceColumn);
    const target = targetColumns.find((column) => column.name === clause.targetColumn);
    return target?.type || 'text';
  };

  const addClause = () => {
    const nextClause = createInitialClause(columns);
    onChange({ ...value, clauses: [...value.clauses, nextClause] });
    setShowClauseEditor(true);
  };

  const removeClause = (id: string) => {
    onChange({ ...value, clauses: value.clauses.filter((clause) => clause.id !== id) });
  };

  const updateClause = (id: string, key: 'column' | 'operator' | 'value' | 'logical', nextValue: string) => {
    onChange({
      ...value,
      clauses: value.clauses.map((clause) => {
        if (clause.id !== id) {
          return clause;
        }

        if (key === 'column') {
          const columnType = columns.find((column) => column.name === nextValue)?.type || 'text';
          const operator = getOperatorsForColumnType(columnType)[0];
          return { ...clause, column: nextValue, operator, value: '' };
        }

        return {
          ...clause,
          [key]: nextValue,
        };
      }),
    });
  };

  const addReferenceClause = () => {
    const next = createInitialReferenceClause(columns);
    if (!next.sourceColumn) {
      return;
    }
    onChange({
      ...value,
      referenceClauses: [...referenceClauses, next],
    });
  };

  const updateReferenceClause = (
    id: string,
    key: 'sourceColumn' | 'targetColumn' | 'operator' | 'value' | 'logical',
    nextValue: string
  ) => {
    const nextClauses: GuidedReferenceClause[] = referenceClauses.map((clause) => {
      if (clause.id !== id) return clause;

      if (key === 'sourceColumn') {
        const targetColumns = getTargetColumnsForReference(nextValue);
        const defaultTargetColumn = targetColumns[0]?.name || '';
        return {
          ...clause,
          sourceColumn: nextValue,
          targetColumn: defaultTargetColumn,
          operator: 'contains' as GuidedReferenceClause['operator'],
          value: '',
        };
      }

      if (key === 'targetColumn') {
        return { ...clause, targetColumn: nextValue };
      }
      if (key === 'operator') {
        return { ...clause, operator: nextValue as GuidedReferenceClause['operator'] };
      }
      if (key === 'logical') {
        return { ...clause, logical: (nextValue === 'or' ? 'or' : 'and') as GuidedReferenceClause['logical'] };
      }
      return { ...clause, value: nextValue };
    });

    onChange({
      ...value,
      referenceClauses: nextClauses,
    });
  };

  const removeReferenceClause = (id: string) => {
    onChange({
      ...value,
      referenceClauses: referenceClauses.filter((clause) => clause.id !== id),
    });
  };

  const handleOutputModeChange = (nextOutputMode: GuidedOutputMode) => {
    onChange({
      ...value,
      outputMode: nextOutputMode,
      outputField: value.outputField || columns[0]?.name,
      selectionPolicy,
      limit: value.limit ?? 25,
      offset: value.offset ?? 0,
      sort: value.sort && value.sort.length > 0 ? value.sort : [{ column: columns[0]?.name || '', direction: 'asc' }],
      referenceClauses,
    });
  };

  const handleSelectionPolicyChange = (nextPolicy: GuidedSelectionPolicy) => {
    onChange({
      ...value,
      selectionPolicy: nextPolicy,
      outputMode,
      outputField: value.outputField || columns[0]?.name,
      limit: value.limit ?? 25,
      offset: value.offset ?? 0,
      sort: value.sort && value.sort.length > 0 ? value.sort : [{ column: columns[0]?.name || '', direction: 'asc' }],
      referenceClauses,
    });
  };

  const handleSortChange = (key: 'column' | 'direction', nextValue: string) => {
    const nextSort: GuidedSortRule[] =
      key === 'column'
        ? [{ column: nextValue, direction: sortRule.direction }]
        : [{ column: sortRule.column, direction: nextValue === 'desc' ? 'desc' : 'asc' }];

    onChange({
      ...value,
      sort: nextSort,
    });
  };

  const handleCopySnippet = async () => {
    if (!onCopyRuntimeSnippet || runtimeSnippetBlocked) {
      return;
    }
    onCopyRuntimeSnippet();
    setSnippetCopied(true);
    setTimeout(() => setSnippetCopied(false), 1800);
  };

  const formatClauseChip = (clause: GuidedFilterGroup['clauses'][number]) => {
    const operator = GUIDED_OPERATOR_LABELS[clause.operator];
    if (clause.operator === 'blank' || clause.operator === 'notBlank') {
      return `${clause.column} ${operator}`;
    }
    return `${clause.column} ${operator} "${clause.value}"`;
  };

  return (
    <div className="rounded-lg border border-border-emphasis bg-dark-bg/75 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="rounded-md border border-brand-primary/30 bg-brand-primary/10 p-1">
            <Filter className="h-3.5 w-3.5 text-brand-secondary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-text-primary">Guided Query</p>
            <p className="text-xxs text-text-muted">Use chips and presets. Runtime-safe snippets are generated automatically.</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowClauseEditor((prev) => !prev)}
            className="flex items-center gap-1 rounded-md border border-border-default bg-dark-elevated/80 px-2 py-1 text-xxs text-text-secondary transition-colors hover:border-border-emphasis hover:text-text-primary"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {showClauseEditor ? 'Hide Editor' : 'Edit Filters'}
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-1 rounded-md border border-border-default bg-dark-elevated/80 px-2 py-1 text-xxs text-text-secondary transition-colors hover:border-border-emphasis hover:text-text-primary"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
          <Button
            onClick={onApply}
            variant="action"
            size="sm"
            leftIcon={<Play className="h-3.5 w-3.5" />}
          >
            Apply
          </Button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-1 gap-1.5 md:grid-cols-2">
        <div className="rounded-md border border-border-default bg-dark-elevated/40 p-2">
          <p className="mb-1 text-xxs font-semibold uppercase tracking-wide text-text-muted">Source</p>
          <select
            value={tableName || 'Current table'}
            disabled
            className="w-full rounded-md border border-border-default bg-dark-elevated/80 px-2 py-1 text-xxs text-text-primary"
          >
            <option>{tableName || 'Current table'}</option>
          </select>
        </div>

        <div className="rounded-md border border-border-default bg-dark-elevated/40 p-2">
          <p className="mb-1 text-xxs font-semibold uppercase tracking-wide text-text-muted">Output</p>
          <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
            <select
              value={outputMode}
              onChange={(event) => handleOutputModeChange(event.target.value as GuidedOutputMode)}
              className="rounded-md border border-border-default bg-dark-elevated/80 px-2 py-1 text-xxs text-text-primary"
            >
              <option value="record">Record</option>
              <option value="field">Specific field</option>
            </select>
            {outputMode === 'field' ? (
              <select
                value={value.outputField || columns[0]?.name || ''}
                onChange={(event) => onChange({ ...value, outputField: event.target.value })}
                className="rounded-md border border-border-default bg-dark-elevated/80 px-2 py-1 text-xxs text-text-primary"
              >
                {columns.map((column) => (
                  <option key={column.name} value={column.name}>
                    {column.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="hidden md:block" />
            )}
          </div>
        </div>
      </div>

      <div className="mb-2 space-y-1.5 rounded-md border border-border-default bg-dark-elevated/40 p-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xxs font-semibold uppercase tracking-wide text-text-muted">When multiple matches</p>
          <div className="inline-flex rounded-md border border-border-default bg-dark-elevated/80 p-0.5">
            {(['all', 'first', 'last', 'random'] as GuidedSelectionPolicy[]).map((policy) => {
              const isActive = selectionPolicy === policy;
              const label = policy === 'all' ? 'All matches' : policy.toUpperCase();
              return (
                <button
                  key={policy}
                  type="button"
                  onClick={() => handleSelectionPolicyChange(policy)}
                  className={`rounded px-2 py-1 text-xxs transition-colors ${
                    isActive
                      ? 'bg-brand-primary/20 text-text-primary'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-1.5 md:grid-cols-[140px_120px_100px_100px]">
          <select
            value={sortRule.column}
            onChange={(event) => handleSortChange('column', event.target.value)}
            className="rounded-md border border-border-default bg-dark-elevated/80 px-2 py-1 text-xxs text-text-primary"
          >
            {columns.map((column) => (
              <option key={column.name} value={column.name}>
                Sort: {column.name}
              </option>
            ))}
          </select>

          <select
            value={sortRule.direction}
            onChange={(event) => handleSortChange('direction', event.target.value)}
            className="rounded-md border border-border-default bg-dark-elevated/80 px-2 py-1 text-xxs text-text-primary"
          >
            <option value="asc">ASC</option>
            <option value="desc">DESC</option>
          </select>

          {selectionPolicy === 'all' ? (
            <>
              <input
                type="number"
                min={1}
                value={value.limit ?? 25}
                onChange={(event) => onChange({ ...value, limit: Number(event.target.value) || 25 })}
                className="rounded-md border border-border-default bg-dark-elevated/80 px-2 py-1 text-xxs text-text-primary"
                placeholder="Limit"
                title="Limit"
              />
              <input
                type="number"
                min={0}
                value={value.offset ?? 0}
                onChange={(event) => onChange({ ...value, offset: Math.max(0, Number(event.target.value) || 0) })}
                className="rounded-md border border-border-default bg-dark-elevated/80 px-2 py-1 text-xxs text-text-primary"
                placeholder="Offset"
                title="Offset"
              />
            </>
          ) : (
            <div className="hidden md:col-span-2 md:block" />
          )}
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md border border-brand-primary/25 bg-brand-primary/10 px-2 py-1.5 text-xxs text-text-primary">
        <span>
          Matches: {hasKnownMatchCount ? matchCount : 'not applied'} {'->'} Output: {inferredOutput}
          {selectionPolicy !== 'all' ? ` (${selectionPolicy.toUpperCase()})` : ''}
        </span>
        {!hasKnownMatchCount && <span className="text-text-muted">Apply filters to infer single-result form.</span>}
        {outputMode === 'field' && selectionPolicy === 'all' && hasKnownMatchCount && (matchCount || 0) > 1 && (
          <span className="text-status-warning">
            Multiple matches, returning rows list; pick First/Last/Random to extract one value.
          </span>
        )}
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onApplyPreset(preset.id)}
            className="rounded-full border border-border-default bg-dark-elevated/85 px-2.5 py-1 text-xxs text-text-secondary transition-colors hover:border-border-emphasis hover:text-text-primary"
            title={preset.description}
          >
            <span className="inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-status-warning" />
              {preset.label}
            </span>
          </button>
        ))}
      </div>

      {value.clauses.length > 0 ? (
        <div className="mb-2 flex flex-wrap items-center gap-1.5 rounded-md border border-border-default bg-dark-elevated/35 px-2 py-2">
          {value.clauses.map((clause, index) => (
            <span
              key={clause.id}
              className="inline-flex items-center gap-1 rounded-full border border-brand-primary/30 bg-brand-primary/10 px-2 py-0.5 text-xxs text-text-primary"
            >
              {index > 0 && <span className="text-text-muted">{clause.logical.toUpperCase()}</span>}
              <span className="max-w-[18rem] truncate">{formatClauseChip(clause)}</span>
              <button
                onClick={() => removeClause(clause.id)}
                className="rounded-full p-0.5 text-text-muted transition-colors hover:bg-status-danger/15 hover:text-status-danger"
                title="Remove filter chip"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            onClick={addClause}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border-emphasis bg-dark-elevated/70 px-2 py-0.5 text-xxs text-text-secondary transition-colors hover:border-brand-primary/50 hover:text-text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            Add chip
          </button>
        </div>
      ) : columns.length === 0 ? (
        <div className="rounded-md border border-border-default bg-dark-elevated/45 px-2.5 py-2 text-xxs text-text-muted">
          Add columns to start using guided filters.
        </div>
      ) : (
        <button
          onClick={addClause}
          className="flex items-center gap-1 rounded-md border border-dashed border-border-emphasis bg-dark-elevated/45 px-2.5 py-1.5 text-xxs text-text-secondary transition-colors hover:border-brand-primary/50 hover:text-text-primary"
        >
          <Plus className="h-3.5 w-3.5" />
          Add first filter chip
        </button>
      )}

      {showClauseEditor && value.clauses.length > 0 && (
        <div className="space-y-1.5">
          {value.clauses.map((clause, index) => {
            const columnType = columns.find((column) => column.name === clause.column)?.type || 'text';
            const operators = getOperatorsForColumnType(columnType);

            return (
              <div key={clause.id} className="grid grid-cols-[auto_140px_150px_minmax(120px,1fr)_auto] items-center gap-1.5">
                {index > 0 ? (
                  <select
                    value={clause.logical}
                    onChange={(event) => updateClause(clause.id, 'logical', event.target.value)}
                    className="rounded-md border border-border-default bg-dark-elevated/80 px-2 py-1 text-xxs text-text-primary"
                  >
                    <option value="and">AND</option>
                    <option value="or">OR</option>
                  </select>
                ) : (
                  <div className="px-2 text-xxs text-text-muted">WHERE</div>
                )}

                <select
                  value={clause.column}
                  onChange={(event) => updateClause(clause.id, 'column', event.target.value)}
                  className="rounded-md border border-border-default bg-dark-elevated/80 px-2 py-1 text-xxs text-text-primary"
                >
                  {columns.map((column) => (
                    <option key={column.name} value={column.name}>
                      {column.name}
                    </option>
                  ))}
                </select>

                <select
                  value={clause.operator}
                  onChange={(event) => updateClause(clause.id, 'operator', event.target.value)}
                  className="rounded-md border border-border-default bg-dark-elevated/80 px-2 py-1 text-xxs text-text-primary"
                >
                  {operators.map((operator) => (
                    <option key={operator} value={operator}>
                      {GUIDED_OPERATOR_LABELS[operator]}
                    </option>
                  ))}
                </select>

                <input
                  value={clause.value}
                  onChange={(event) => updateClause(clause.id, 'value', event.target.value)}
                  disabled={clause.operator === 'blank' || clause.operator === 'notBlank'}
                  placeholder={clause.operator === 'blank' || clause.operator === 'notBlank' ? 'No value needed' : 'Value'}
                  className="rounded-md border border-border-default bg-dark-elevated/80 px-2 py-1 text-xxs text-text-primary placeholder:text-text-muted disabled:opacity-60"
                />

                <button
                  onClick={() => removeClause(clause.id)}
                  className="rounded-md border border-border-default bg-dark-elevated/80 p-1 text-text-muted transition-colors hover:border-status-danger/45 hover:text-status-danger"
                  title="Remove condition row"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}

          <button
            onClick={addClause}
            className="mt-1 flex items-center gap-1 rounded-md border border-border-default bg-dark-elevated/60 px-2 py-1 text-xxs text-text-secondary transition-colors hover:border-border-emphasis hover:text-text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            Add condition row
          </button>
        </div>
      )}

      <div className="mt-2 space-y-1.5 rounded-md border border-border-default bg-dark-elevated/30 p-2">
        <div className="flex items-center justify-between">
          <p className="text-xxs font-semibold text-text-primary">
            <Link2 className="mr-1 inline h-3.5 w-3.5 text-brand-secondary" />
            Cross-table filters
          </p>
          <button
            type="button"
            disabled={!canAddReferenceClause}
            onClick={addReferenceClause}
            className="inline-flex items-center gap-1 rounded-md border border-border-default bg-dark-elevated/70 px-2 py-1 text-xxs text-text-secondary transition-colors hover:border-border-emphasis hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-3 w-3" />
            Add relation
          </button>
        </div>

        {!canAddReferenceClause ? (
          <p className="text-xxs text-text-muted">No reference columns on this table.</p>
        ) : referenceClauses.length === 0 ? (
          <p className="text-xxs text-text-muted">Optional: filter this table by fields from linked tables.</p>
        ) : (
          <div className="space-y-1.5">
            {referenceClauses.map((clause, index) => {
              const sourceColumn = referenceColumns.find((column) => column.name === clause.sourceColumn);
              const targetColumns = getTargetColumnsForReference(clause.sourceColumn);
              const targetType = getTargetColumnType(clause);
              const operators = getOperatorsForColumnType(targetType);
              return (
                <div key={clause.id} className="grid grid-cols-[auto_130px_130px_130px_minmax(120px,1fr)_auto] items-center gap-1.5">
                  {index > 0 ? (
                    <select
                      value={clause.logical}
                      onChange={(event) => updateReferenceClause(clause.id, 'logical', event.target.value)}
                      className="rounded-md border border-border-default bg-dark-elevated/80 px-2 py-1 text-xxs text-text-primary"
                    >
                      <option value="and">AND</option>
                      <option value="or">OR</option>
                    </select>
                  ) : (
                    <div className="px-1 text-xxs text-text-muted">JOIN</div>
                  )}

                  <select
                    value={clause.sourceColumn}
                    onChange={(event) => updateReferenceClause(clause.id, 'sourceColumn', event.target.value)}
                    className="rounded-md border border-border-default bg-dark-elevated/80 px-2 py-1 text-xxs text-text-primary"
                  >
                    {referenceColumns.map((column) => (
                      <option key={column.name} value={column.name}>
                        {column.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={clause.targetColumn}
                    onChange={(event) => updateReferenceClause(clause.id, 'targetColumn', event.target.value)}
                    className="rounded-md border border-border-default bg-dark-elevated/80 px-2 py-1 text-xxs text-text-primary"
                  >
                    {targetColumns.map((column) => (
                      <option key={column.name} value={column.name}>
                        {sourceColumn?.reference?.targetSheetName || 'Target'}.{column.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={clause.operator}
                    onChange={(event) => updateReferenceClause(clause.id, 'operator', event.target.value)}
                    className="rounded-md border border-border-default bg-dark-elevated/80 px-2 py-1 text-xxs text-text-primary"
                  >
                    {operators.map((operator) => (
                      <option key={operator} value={operator}>
                        {GUIDED_OPERATOR_LABELS[operator]}
                      </option>
                    ))}
                  </select>

                  <input
                    value={clause.value}
                    onChange={(event) => updateReferenceClause(clause.id, 'value', event.target.value)}
                    placeholder="Target value"
                    disabled={clause.operator === 'blank' || clause.operator === 'notBlank'}
                    className="rounded-md border border-border-default bg-dark-elevated/80 px-2 py-1 text-xxs text-text-primary placeholder:text-text-muted disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() => removeReferenceClause(clause.id)}
                    className="rounded-md border border-border-default bg-dark-elevated/80 p-1 text-text-muted transition-colors hover:border-status-danger/45 hover:text-status-danger"
                    title="Remove relation filter"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {(validationError || warnings.length > 0 || runtimeSnippetBlocked) && (
        <div className="mt-2 space-y-1 rounded-md border border-status-warning/30 bg-status-warning/10 px-2.5 py-2">
          {validationError && (
            <p className="flex items-center gap-1 text-xxs text-status-warning">
              <AlertTriangle className="h-3.5 w-3.5" />
              {validationError}
            </p>
          )}
          {runtimeSnippetBlocked && runtimeSnippetBlockReason && (
            <p className="text-xxs text-status-warning">{runtimeSnippetBlockReason}</p>
          )}
          {warnings.map((warning) => (
            <p key={warning} className="text-xxs text-status-warning">
              {warning}
            </p>
          ))}
        </div>
      )}

      <div className="mt-2">
        <button
          onClick={onToggleAdvanced}
          className="inline-flex items-center gap-1 text-xxs text-text-muted transition-colors hover:text-text-primary"
        >
          <Code className="h-3.5 w-3.5" />
          {showAdvanced ? 'Hide Generated Runtime Query' : 'Show Generated Runtime Query'}
        </button>
        {showAdvanced && (
          <div className="mt-1 space-y-2">
            <div className="rounded-md border border-border-default bg-dark-canvas/90 p-2">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xxs font-semibold text-text-secondary">Generated Runtime Query</p>
                <button
                  type="button"
                  disabled={runtimeSnippetBlocked || !onCopyRuntimeSnippet}
                  onClick={handleCopySnippet}
                  className="inline-flex items-center gap-1 rounded border border-border-default bg-dark-elevated/80 px-1.5 py-0.5 text-xxs text-text-secondary transition-colors hover:border-border-emphasis hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {snippetCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {snippetCopied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="overflow-x-auto text-xxs font-mono text-accent-teal">{advancedQuery}</pre>
            </div>

            <div className="rounded-md border border-border-default bg-dark-canvas/80 p-2">
              <p className="mb-1 text-xxs font-semibold text-text-secondary">Grid Filter Applied</p>
              <pre className="overflow-x-auto text-xxs font-mono text-text-muted">{gridFilterSummary || DEFAULT_GRID_SUMMARY}</pre>
            </div>

            <p className="text-xxs text-text-muted">Query recipes: <code>vero-lang/docs/TEST_DATA_QUERY_RECIPES.md</code></p>
          </div>
        )}
      </div>
    </div>
  );
}

export default GuidedQueryBuilderStrip;
