import type { ReactNode } from 'react';
import { ExcelIcon } from './excelIconMap';
import { Tooltip } from '@/components/ui';

interface ExcelRibbonProps {
  activeFilterCount: number;
  queryStatusLabel?: string;
  warningCount?: number;
  onOpenQueryGenerator: () => void;
  onAddRow: () => void;
  onAddColumn: () => void;
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onOpenFindReplace: () => void;
  onOpenBulkUpdate: () => void;
  onOpenDataGenerator: () => void;
  onImportCSV: () => void;
  onExportCSV: () => void;
  onRefreshRows: () => void;
  onOpenColumnVisibility: () => void;
  onOpenMultiSort: () => void;
  onOpenConditionalFormatting: () => void;
  onFreezeSelectedRows: () => void;
  onUnfreezeRows: () => void;
  onUnfreezeColumns: () => void;
  onRunQualityScan: () => void;
  onOpenAdvancedTools: () => void;
  loadingRows: boolean;
  selectedRowCount: number;
}

interface CompactIconButtonProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  isBusy?: boolean;
}

function CompactIconButton({ icon, label, onClick, disabled = false, isBusy = false }: CompactIconButtonProps) {
  return (
    <Tooltip content={label} showDelayMs={0} hideDelayMs={0} disabled={disabled}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className="inline-flex h-7 w-7 items-center justify-center rounded border border-border-default bg-dark-elevated/55 text-text-secondary transition-colors hover:border-border-emphasis hover:bg-dark-elevated/75 hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/45 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className={isBusy ? 'animate-spin' : ''}>{icon}</span>
      </button>
    </Tooltip>
  );
}

function GroupDivider() {
  return <div className="mx-0.5 h-4 w-px shrink-0 bg-border-default" />;
}

export function ExcelRibbon({
  activeFilterCount,
  queryStatusLabel,
  warningCount = 0,
  onOpenQueryGenerator,
  onAddRow,
  onAddColumn,
  onDeleteSelected,
  onDuplicateSelected,
  onUndo,
  onRedo,
  onOpenFindReplace,
  onOpenBulkUpdate,
  onOpenDataGenerator,
  onImportCSV,
  onExportCSV,
  onRefreshRows,
  onOpenColumnVisibility,
  onOpenMultiSort,
  onOpenConditionalFormatting,
  onFreezeSelectedRows,
  onUnfreezeRows,
  onUnfreezeColumns,
  onRunQualityScan,
  onOpenAdvancedTools,
  loadingRows,
  selectedRowCount,
}: ExcelRibbonProps) {
  return (
    <div className="border-b border-border-default bg-dark-bg/95 px-2 py-1">
      <div className="flex items-center gap-1 overflow-x-auto">
        <div className="flex shrink-0 items-center gap-1">
          <CompactIconButton icon={<ExcelIcon name="add" className="h-3.5 w-3.5" />} label="Add Row" onClick={onAddRow} />
          <CompactIconButton icon={<ExcelIcon name="addColumn" className="h-3.5 w-3.5" />} label="Add Column" onClick={onAddColumn} />
          <CompactIconButton
            icon={<ExcelIcon name="delete" className="h-3.5 w-3.5" />}
            label="Delete Selected Rows"
            onClick={onDeleteSelected}
            disabled={selectedRowCount === 0}
          />
          <CompactIconButton
            icon={<ExcelIcon name="duplicate" className="h-3.5 w-3.5" />}
            label="Duplicate Selected Rows"
            onClick={onDuplicateSelected}
            disabled={selectedRowCount === 0}
          />
          <CompactIconButton icon={<ExcelIcon name="undo" className="h-3.5 w-3.5" />} label="Undo" onClick={onUndo} />
          <CompactIconButton icon={<ExcelIcon name="redo" className="h-3.5 w-3.5" />} label="Redo" onClick={onRedo} />

          <GroupDivider />

          <CompactIconButton icon={<ExcelIcon name="findReplace" className="h-3.5 w-3.5" />} label="Find & Replace" onClick={onOpenFindReplace} />
          <CompactIconButton icon={<ExcelIcon name="bulkUpdate" className="h-3.5 w-3.5" />} label="Bulk Update" onClick={onOpenBulkUpdate} />
          <CompactIconButton icon={<ExcelIcon name="generator" className="h-3.5 w-3.5" />} label="Generate Data" onClick={onOpenDataGenerator} />

          <GroupDivider />

          <CompactIconButton icon={<ExcelIcon name="query" className="h-3.5 w-3.5" />} label="Generate Query" onClick={onOpenQueryGenerator} />
          <CompactIconButton icon={<ExcelIcon name="quality" className="h-3.5 w-3.5" />} label="Run Quality Scan" onClick={onRunQualityScan} />

          <GroupDivider />

          <CompactIconButton icon={<ExcelIcon name="importCsv" className="h-3.5 w-3.5" />} label="Import CSV" onClick={onImportCSV} />
          <CompactIconButton icon={<ExcelIcon name="exportCsv" className="h-3.5 w-3.5" />} label="Export CSV" onClick={onExportCSV} />
          <CompactIconButton
            icon={<ExcelIcon name="refresh" className="h-3.5 w-3.5" />}
            label="Refresh Rows"
            onClick={onRefreshRows}
            isBusy={loadingRows}
          />

          <GroupDivider />

          <CompactIconButton icon={<ExcelIcon name="freeze" className="h-3.5 w-3.5" />} label="Freeze Selected Rows" onClick={onFreezeSelectedRows} />
          <CompactIconButton icon={<ExcelIcon name="unfreeze" className="h-3.5 w-3.5" />} label="Unfreeze Rows" onClick={onUnfreezeRows} />
          <CompactIconButton icon={<ExcelIcon name="unfreeze" className="h-3.5 w-3.5" />} label="Unfreeze Columns" onClick={onUnfreezeColumns} />
          <CompactIconButton icon={<ExcelIcon name="columnVisibility" className="h-3.5 w-3.5" />} label="Column Visibility" onClick={onOpenColumnVisibility} />
          <CompactIconButton icon={<ExcelIcon name="multiSort" className="h-3.5 w-3.5" />} label="Multi Sort" onClick={onOpenMultiSort} />
          <CompactIconButton
            icon={<ExcelIcon name="conditionalFormatting" className="h-3.5 w-3.5" />}
            label="Conditional Formatting"
            onClick={onOpenConditionalFormatting}
          />

          <GroupDivider />

          <CompactIconButton icon={<ExcelIcon name="advanced" className="h-3.5 w-3.5" />} label="More Tools" onClick={onOpenAdvancedTools} />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          {queryStatusLabel && (
            <span
              className="max-w-[220px] truncate rounded border border-border-default bg-dark-elevated/55 px-1.5 py-0.5 text-3xs text-text-secondary"
              title={queryStatusLabel}
            >
              {queryStatusLabel}
            </span>
          )}
          <span className="rounded border border-border-default bg-dark-elevated/55 px-1.5 py-0.5 text-3xs text-text-secondary">
            sel {selectedRowCount}
          </span>
          <span className="rounded border border-border-default bg-dark-elevated/55 px-1.5 py-0.5 text-3xs text-text-secondary">
            filt {activeFilterCount}
          </span>
          {warningCount > 0 && (
            <span className="rounded border border-status-warning/35 bg-status-warning/10 px-1.5 py-0.5 text-3xs text-status-warning">
              warn {warningCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExcelRibbon;
