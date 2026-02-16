import { Plus, RefreshCw, Search, SlidersHorizontal, Database, Columns3 } from 'lucide-react';
import type { GuidedColumn, GuidedFilterGroup, GuidedPreset } from './types';
import { GuidedQueryBuilderStrip } from './GuidedQueryBuilderStrip';

interface CommandStripProps {
  columns: GuidedColumn[];
  guidedFilterGroup: GuidedFilterGroup;
  onGuidedFilterChange: (nextValue: GuidedFilterGroup) => void;
  onApplyGuidedFilters: () => void;
  onResetGuidedFilters: () => void;
  onApplyPreset: (presetId: GuidedPreset['id']) => void;
  onToggleAdvanced: () => void;
  showAdvanced: boolean;
  advancedQuery: string;
  validationError?: string | null;
  warnings?: string[];
  onQuickSearchChange: (nextValue: string) => void;
  onAddRow: () => void;
  onAddColumn: () => void;
  onRefreshRows: () => void;
  onOpenAdvancedTools: () => void;
  loadingRows: boolean;
}

export function CommandStrip({
  columns,
  guidedFilterGroup,
  onGuidedFilterChange,
  onApplyGuidedFilters,
  onResetGuidedFilters,
  onApplyPreset,
  onToggleAdvanced,
  showAdvanced,
  advancedQuery,
  validationError,
  warnings,
  onQuickSearchChange,
  onAddRow,
  onAddColumn,
  onRefreshRows,
  onOpenAdvancedTools,
  loadingRows,
}: CommandStripProps) {
  return (
    <div className="border-b border-border-default bg-dark-bg/75 px-3 py-2">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={onAddRow}
            className="flex items-center gap-1.5 rounded-md bg-gradient-to-b from-brand-primary to-brand-primary-depth px-2.5 py-1.5 text-xs font-medium text-white transition-all hover:brightness-110"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Row
          </button>
          <button
            onClick={onAddColumn}
            className="flex items-center gap-1.5 rounded-md border border-border-default bg-dark-elevated/75 px-2.5 py-1.5 text-xs text-text-primary transition-colors hover:border-border-emphasis"
          >
            <Columns3 className="h-3.5 w-3.5" />
            Add Column
          </button>
          <button
            onClick={onRefreshRows}
            className="flex items-center gap-1.5 rounded-md border border-border-default bg-dark-elevated/75 px-2.5 py-1.5 text-xs text-text-primary transition-colors hover:border-border-emphasis"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingRows ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input
              value={guidedFilterGroup.quickSearch}
              onChange={(event) => {
                const quickSearch = event.target.value;
                onGuidedFilterChange({ ...guidedFilterGroup, quickSearch });
                onQuickSearchChange(quickSearch);
              }}
              placeholder="Quick search"
              className="w-44 rounded-md border border-border-default bg-dark-elevated/80 py-1.5 pl-7 pr-2 text-xs text-text-primary placeholder:text-text-muted focus:border-border-active focus:outline-none"
            />
          </div>
          <button
            onClick={onOpenAdvancedTools}
            className="flex items-center gap-1.5 rounded-md border border-border-default bg-dark-elevated/75 px-2.5 py-1.5 text-xs text-text-primary transition-colors hover:border-border-emphasis"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Advanced Tools
          </button>
          <span className="inline-flex items-center gap-1 rounded-md border border-border-default bg-dark-elevated/75 px-2 py-1 text-xxs text-text-muted">
            <Database className="h-3.5 w-3.5" />
            Guided Mode
          </span>
        </div>
      </div>

      <GuidedQueryBuilderStrip
        columns={columns}
        value={guidedFilterGroup}
        onChange={onGuidedFilterChange}
        onApply={onApplyGuidedFilters}
        onReset={onResetGuidedFilters}
        onApplyPreset={onApplyPreset}
        onToggleAdvanced={onToggleAdvanced}
        showAdvanced={showAdvanced}
        advancedQuery={advancedQuery}
        validationError={validationError}
        warnings={warnings}
      />
    </div>
  );
}

export default CommandStrip;
