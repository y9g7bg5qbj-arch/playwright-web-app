import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui';
import type {
  CellQueryPayload,
  QueryGeneratorDraft,
  QueryGeneratorTable,
  QueryResultControl,
} from './canvas-v2/queryGeneratorUtils';

interface QueryGeneratorModalProps {
  isOpen: boolean;
  mode: 'builder' | 'cell';
  onClose: () => void;
  tables: QueryGeneratorTable[];
  selectedTableId: string;
  draft: QueryGeneratorDraft;
  distinctValueMap: Record<string, string[]>;
  loadingValues: boolean;
  generatedQuery: string;
  generatedShape: 'ROW' | 'ROWS';
  matchCount: number | null;
  warnings?: string[];
  validationError?: string | null;
  cellPayload?: CellQueryPayload | null;
  onTableChange: (tableId: string) => void;
  onAnswerChange: (columnName: string, value: string) => void;
  onResultControlChange: (control: QueryResultControl) => void;
  onSortColumnChange: (columnName: string) => void;
  onSortDirectionChange: (direction: 'asc' | 'desc') => void;
  onLimitChange: (limit: number) => void;
  onApplyFilters: () => void;
  onCopyQuery: () => void;
  onUseCellAsBuilder?: () => void;
  /** Callback to insert the generated query into the Vero editor */
  onInsertIntoEditor?: () => void;
  applyLabel?: string;
  copyLabel?: string;
}

const RESULT_CONTROLS: Array<{ id: QueryResultControl; label: string }> = [
  { id: 'auto', label: 'Auto' },
  { id: 'first', label: 'First' },
  { id: 'last', label: 'Last' },
  { id: 'random', label: 'Random' },
  { id: 'topN', label: 'Top N' },
  { id: 'lastN', label: 'Last N' },
];

const ANY_SENTINEL = '__ANY__';
const EMPTY_SENTINEL = '__EMPTY__';

export function QueryGeneratorModal({
  isOpen,
  mode,
  onClose,
  tables,
  selectedTableId,
  draft,
  distinctValueMap,
  loadingValues,
  generatedQuery,
  generatedShape,
  matchCount,
  warnings = [],
  validationError,
  cellPayload,
  onTableChange,
  onAnswerChange,
  onResultControlChange,
  onSortColumnChange,
  onSortDirectionChange,
  onLimitChange,
  onApplyFilters,
  onCopyQuery,
  onUseCellAsBuilder,
  onInsertIntoEditor,
  applyLabel = 'Apply Filters',
  copyLabel = 'Copy Query',
}: QueryGeneratorModalProps) {
  const selectedTable = tables.find((table) => table.id === selectedTableId) || null;
  const needsOrdering = draft.resultControl === 'topN' || draft.resultControl === 'lastN';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={mode === 'cell' ? 'Query Generator • Cell Query' : 'Query Generator'}
      description={
        mode === 'cell'
          ? 'Generated from selected cell. Copy directly or switch to builder mode.'
          : 'Answer the questions to generate and apply a runtime-safe query.'
      }
      bodyClassName="max-h-[72vh] overflow-y-auto"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <div className="text-xs text-text-muted">
            {mode === 'cell'
              ? cellPayload?.summary || 'Cell query'
              : `Matches: ${matchCount === null ? 'not computed' : matchCount} • Output: ${generatedShape}`}
          </div>
          <div className="flex items-center gap-2">
            {mode === 'cell' && onUseCellAsBuilder && (
              <Button variant="secondary" onClick={onUseCellAsBuilder}>
                Use As Builder
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            {mode === 'builder' && (
              <Button variant="action" onClick={onApplyFilters}>
                {applyLabel}
              </Button>
            )}
            <Button variant="action" onClick={onCopyQuery} disabled={!generatedQuery.trim()}>
              {copyLabel}
            </Button>
            {onInsertIntoEditor && (
              <Button variant="action" onClick={onInsertIntoEditor} disabled={!generatedQuery.trim()}>
                Insert into Editor
              </Button>
            )}
          </div>
        </div>
      }
    >
      {mode === 'cell' ? (
        <div className="space-y-3">
          <div className="rounded-md border border-border-default bg-dark-elevated/45 p-3">
            <p className="text-xs text-text-secondary">
              {cellPayload
                ? `${cellPayload.tableName}.${cellPayload.column} (row ${cellPayload.rowIndex + 1})`
                : 'No selected cell context'}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-primary">{cellPayload?.summary || 'Select a cell to generate query.'}</p>
          </div>
          <div className="rounded-md border border-border-default bg-dark-canvas/85 p-3">
            <p className="mb-1 text-xxs font-semibold uppercase tracking-wide text-text-muted">Generated Runtime Query</p>
            <pre className="overflow-x-auto text-xxs font-mono text-accent-teal">{generatedQuery || '# No query generated yet'}</pre>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <section className="rounded-md border border-border-default bg-dark-elevated/45 p-3">
            <p className="mb-2 text-xxs font-semibold uppercase tracking-wide text-text-muted">Select Table</p>
            <select
              value={selectedTableId}
              onChange={(event) => onTableChange(event.target.value)}
              className="w-full rounded-md border border-border-default bg-dark-elevated/85 px-2 py-1.5 text-xs text-text-primary"
            >
              {tables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.name}
                </option>
              ))}
            </select>
          </section>

          <section className="rounded-md border border-border-default bg-dark-elevated/45 p-3">
            <p className="mb-2 text-xxs font-semibold uppercase tracking-wide text-text-muted">Field Answers</p>
            {!selectedTable ? (
              <p className="text-xs text-text-muted">No table selected.</p>
            ) : loadingValues ? (
              <p className="text-xs text-text-muted">Loading field values...</p>
            ) : (
              <div className="space-y-2">
                {selectedTable.columns.map((column) => {
                  const options = distinctValueMap[column.name] || [];
                  return (
                    <label key={column.name} className="grid grid-cols-[160px_minmax(0,1fr)] items-center gap-2">
                      <span className="truncate text-xs text-text-secondary">{column.name}</span>
                      <select
                        value={draft.answers[column.name] ?? ANY_SENTINEL}
                        onChange={(event) => onAnswerChange(column.name, event.target.value)}
                        className="w-full rounded-md border border-border-default bg-dark-elevated/85 px-2 py-1 text-xs text-text-primary"
                      >
                        <option value={ANY_SENTINEL}>Any value</option>
                        <option value={EMPTY_SENTINEL}>Empty value</option>
                        {options.map((value) => (
                          <option key={`${column.name}-${value}`} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-md border border-border-default bg-dark-elevated/45 p-3">
            <p className="mb-2 text-xxs font-semibold uppercase tracking-wide text-text-muted">Result Controls</p>
            <div className="mb-2 flex flex-wrap gap-1">
              {RESULT_CONTROLS.map((control) => {
                const isActive = draft.resultControl === control.id;
                return (
                  <button
                    key={control.id}
                    type="button"
                    onClick={() => onResultControlChange(control.id)}
                    className={`rounded border px-2 py-1 text-xxs transition-colors ${
                      isActive
                        ? 'border-brand-primary/50 bg-brand-primary/20 text-text-primary'
                        : 'border-border-default bg-dark-elevated/80 text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {control.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
              <select
                value={draft.sortColumn}
                onChange={(event) => onSortColumnChange(event.target.value)}
                className="rounded-md border border-border-default bg-dark-elevated/85 px-2 py-1 text-xs text-text-primary"
              >
                <option value="">Sort column (optional)</option>
                {(selectedTable?.columns || []).map((column) => (
                  <option key={`sort-${column.name}`} value={column.name}>
                    {column.name}
                  </option>
                ))}
              </select>
              <select
                value={draft.sortDirection}
                onChange={(event) => onSortDirectionChange(event.target.value === 'desc' ? 'desc' : 'asc')}
                className="rounded-md border border-border-default bg-dark-elevated/85 px-2 py-1 text-xs text-text-primary"
              >
                <option value="asc">ASC</option>
                <option value="desc">DESC</option>
              </select>
              <input
                type="number"
                min={1}
                value={draft.limit}
                onChange={(event) => onLimitChange(Math.max(1, Number(event.target.value) || 1))}
                disabled={!needsOrdering}
                className="rounded-md border border-border-default bg-dark-elevated/85 px-2 py-1 text-xs text-text-primary disabled:opacity-50"
                placeholder="Limit"
              />
              <div className="flex items-center text-xxs text-text-muted">
                {needsOrdering ? 'Top/Last N requires sort column.' : 'Sort + limit optional in Auto mode.'}
              </div>
            </div>
          </section>

          {(validationError || warnings.length > 0) && (
            <section className="rounded-md border border-status-warning/35 bg-status-warning/10 p-2">
              {validationError && <p className="text-xxs text-status-warning">{validationError}</p>}
              {warnings.map((warning) => (
                <p key={warning} className="text-xxs text-status-warning">
                  {warning}
                </p>
              ))}
            </section>
          )}

          <section className="rounded-md border border-border-default bg-dark-canvas/85 p-3">
            <p className="mb-1 text-xxs font-semibold uppercase tracking-wide text-text-muted">Generated Runtime Query</p>
            <pre className="overflow-x-auto text-xxs font-mono text-accent-teal">{generatedQuery || '# No query generated yet'}</pre>
          </section>
        </div>
      )}
    </Modal>
  );
}

export default QueryGeneratorModal;
