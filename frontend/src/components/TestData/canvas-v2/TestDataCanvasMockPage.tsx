import { useMemo, useRef, useState } from 'react';
import { AGGridDataTable, type AGGridDataTableHandle, type DataColumn, type DataRow } from '../AGGridDataTable';
import { CommandStrip } from './CommandStrip';
import { AdvancedToolsDrawer, type AdvancedToolId } from './AdvancedToolsDrawer';
import { TestDataCanvasLayout } from './TestDataCanvasLayout';
import type { CanvasTableItem, GuidedColumn, GuidedFilterGroup } from './types';
import { buildFilterModelFromGuided, buildVDQLFromGuided, createInitialGuidedFilterGroup } from './guidedFilterUtils';

interface MockTable extends CanvasTableItem {
  columns: DataColumn[];
  rows: DataRow[];
}

const INITIAL_TABLES: MockTable[] = [
  {
    id: 'accounts',
    name: 'Accounts',
    rowCount: 5,
    columns: [
      { name: 'UserId', type: 'text' },
      { name: 'Email', type: 'text' },
      { name: 'Role', type: 'text' },
      { name: 'Active', type: 'boolean' },
      { name: 'CreatedAt', type: 'date' },
    ],
    rows: [
      { id: 'u1', order: 1, data: { UserId: 'U-1001', Email: 'alex@demo.io', Role: 'Admin', Active: true, CreatedAt: '2026-01-02' } },
      { id: 'u2', order: 2, data: { UserId: 'U-1002', Email: 'sam@demo.io', Role: 'Manager', Active: true, CreatedAt: '2026-01-03' } },
      { id: 'u3', order: 3, data: { UserId: 'U-1003', Email: 'lee@demo.io', Role: 'Analyst', Active: false, CreatedAt: '2026-01-05' } },
      { id: 'u4', order: 4, data: { UserId: 'U-1004', Email: '', Role: 'Analyst', Active: true, CreatedAt: '2026-01-06' } },
      { id: 'u5', order: 5, data: { UserId: 'U-1005', Email: 'jordan@demo.io', Role: 'Manager', Active: true, CreatedAt: '2026-01-07' } },
    ],
  },
  {
    id: 'orders',
    name: 'Orders',
    rowCount: 6,
    columns: [
      { name: 'OrderId', type: 'text' },
      { name: 'UserId', type: 'text' },
      { name: 'Amount', type: 'number' },
      { name: 'Status', type: 'text' },
      { name: 'Region', type: 'text' },
    ],
    rows: [
      { id: 'o1', order: 1, data: { OrderId: 'ORD-001', UserId: 'U-1001', Amount: 29.95, Status: 'Paid', Region: 'US-East' } },
      { id: 'o2', order: 2, data: { OrderId: 'ORD-002', UserId: 'U-1002', Amount: 120.25, Status: 'Paid', Region: 'US-West' } },
      { id: 'o3', order: 3, data: { OrderId: 'ORD-003', UserId: 'U-1003', Amount: 70, Status: 'Refunded', Region: 'US-East' } },
      { id: 'o4', order: 4, data: { OrderId: 'ORD-004', UserId: 'U-1002', Amount: 70, Status: 'Pending', Region: 'US-East' } },
      { id: 'o5', order: 5, data: { OrderId: 'ORD-005', UserId: 'U-1004', Amount: 70, Status: 'Pending', Region: '' } },
      { id: 'o6', order: 6, data: { OrderId: 'ORD-006', UserId: 'U-1005', Amount: 200.1, Status: 'Paid', Region: 'EU-Central' } },
    ],
  },
  {
    id: 'devices',
    name: 'Devices',
    rowCount: 4,
    columns: [
      { name: 'DeviceId', type: 'text' },
      { name: 'Model', type: 'text' },
      { name: 'Version', type: 'text' },
      { name: 'Enabled', type: 'boolean' },
    ],
    rows: [
      { id: 'd1', order: 1, data: { DeviceId: 'D-100', Model: 'Pixel', Version: '1.0.0', Enabled: true } },
      { id: 'd2', order: 2, data: { DeviceId: 'D-101', Model: 'Pixel', Version: '1.0.1', Enabled: true } },
      { id: 'd3', order: 3, data: { DeviceId: 'D-102', Model: 'iPhone', Version: '2.0.0', Enabled: false } },
      { id: 'd4', order: 4, data: { DeviceId: 'D-103', Model: 'iPad', Version: '2.0.0', Enabled: true } },
    ],
  },
];

function toGuidedColumns(columns: DataColumn[]): GuidedColumn[] {
  return columns.map((column) => ({ name: column.name, type: column.type }));
}

export function TestDataCanvasMockPage() {
  const gridRef = useRef<AGGridDataTableHandle | null>(null);
  const [tables, setTables] = useState<MockTable[]>(INITIAL_TABLES);
  const [selectedTableId, setSelectedTableId] = useState<string>(INITIAL_TABLES[0].id);
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  const [guidedFilterGroup, setGuidedFilterGroup] = useState<GuidedFilterGroup>(createInitialGuidedFilterGroup([]));
  const [guidedWarnings, setGuidedWarnings] = useState<string[]>([]);
  const [guidedError, setGuidedError] = useState<string | null>(null);
  const [showAdvancedQuery, setShowAdvancedQuery] = useState(false);
  const [externalFilterState, setExternalFilterState] = useState<Record<string, unknown>>({});

  const selectedTable = tables.find((table) => table.id === selectedTableId) || null;

  const guidedColumns = useMemo(() => (selectedTable ? toGuidedColumns(selectedTable.columns) : []), [selectedTable]);

  const advancedQuery = useMemo(() => {
    if (!selectedTable) {
      return 'ROWS many = Mock';
    }
    return buildVDQLFromGuided(guidedFilterGroup, selectedTable.name, guidedColumns);
  }, [guidedColumns, guidedFilterGroup, selectedTable]);

  const upsertSelectedTable = (nextTable: MockTable) => {
    setTables((prev) => prev.map((table) => (table.id === nextTable.id ? nextTable : table)));
  };

  const handleOpenTable = (tableId: string) => {
    setSelectedTableId(tableId);
  };

  const handleApplyGuidedFilters = () => {
    if (!selectedTable) {
      return;
    }

    const result = buildFilterModelFromGuided(guidedFilterGroup, guidedColumns);
    if (result.error) {
      setGuidedError(result.error);
      return;
    }

    setGuidedError(null);
    setGuidedWarnings(result.warnings);
    setExternalFilterState(result.model);

    gridRef.current?.applyFilterModel(result.model);
    gridRef.current?.setQuickSearch(guidedFilterGroup.quickSearch);
  };

  const handleResetGuidedFilters = () => {
    setGuidedFilterGroup(createInitialGuidedFilterGroup(guidedColumns));
    setGuidedWarnings([]);
    setGuidedError(null);
    setExternalFilterState({});
    gridRef.current?.clearFilterModel();
    gridRef.current?.setQuickSearch('');
  };

  const handleApplyPreset = (presetId: 'empty' | 'duplicates' | 'contains' | 'equals') => {
    if (!selectedTable || selectedTable.columns.length === 0) {
      return;
    }

    const firstColumn = selectedTable.columns[0];

    if (presetId === 'empty') {
      setGuidedFilterGroup({
        ...guidedFilterGroup,
        clauses: [{ id: `preset-${Date.now()}`, column: firstColumn.name, operator: 'blank', value: '', logical: 'and' }],
      });
      return;
    }

    if (presetId === 'duplicates') {
      const textColumn = selectedTable.columns.find((column) => column.type === 'text') || firstColumn;
      const values = selectedTable.rows.map((row) => String(row.data[textColumn.name] ?? '')).filter(Boolean);
      const duplicate = values.find((value, index) => values.indexOf(value) !== index) || '';
      setGuidedFilterGroup({
        ...guidedFilterGroup,
        clauses: [
          {
            id: `preset-${Date.now()}`,
            column: textColumn.name,
            operator: duplicate ? 'equals' : (textColumn.type === 'number' ? 'equals' : 'contains'),
            value: duplicate,
            logical: 'and',
          },
        ],
      });
      return;
    }

    if (presetId === 'contains') {
      const textColumn = selectedTable.columns.find((column) => column.type === 'text') || firstColumn;
      setGuidedFilterGroup({
        ...guidedFilterGroup,
        clauses: [{ id: `preset-${Date.now()}`, column: textColumn.name, operator: textColumn.type === 'number' ? 'equals' : 'contains', value: '', logical: 'and' }],
      });
      return;
    }

    setGuidedFilterGroup({
      ...guidedFilterGroup,
      clauses: [{ id: `preset-${Date.now()}`, column: firstColumn.name, operator: 'equals', value: '', logical: 'and' }],
    });
  };

  const handleToolSelect = (toolId: AdvancedToolId) => {
    switch (toolId) {
      case 'bulkUpdate':
        gridRef.current?.openBulkUpdate();
        break;
      case 'findReplace':
        gridRef.current?.openFindReplace();
        break;
      case 'duplicateRows':
        gridRef.current?.duplicateSelectedRows();
        break;
      case 'fillSeries':
        gridRef.current?.openFillColumn(selectedTable?.columns[0]?.name);
        break;
      case 'dataGenerator':
        gridRef.current?.openDataGenerator(selectedTable?.columns[0]?.name);
        break;
      case 'multiSort':
        gridRef.current?.openMultiSort();
        break;
      case 'conditionalFormatting':
        gridRef.current?.openConditionalFormatting();
        break;
      case 'importCsv':
        window.alert('Mock mode: import CSV action');
        break;
      case 'exportCsv':
        window.alert('Mock mode: export CSV action');
        break;
      default:
        break;
    }

    setShowAdvancedTools(false);
  };

  return (
    <div className="h-screen w-full">
      <TestDataCanvasLayout
        tables={tables}
        loadingTables={false}
        selectedTableId={selectedTableId}
        openTableIds={selectedTableId ? [selectedTableId] : []}
        onSelectTable={handleOpenTable}
        onCreateTable={() => window.alert('Mock mode: create table dialog')}
        onRefreshTables={() => window.alert('Mock mode: refreshed')}
        onImportExcel={() => window.alert('Mock mode: import Excel')}
        onOpenEnvironments={() => window.alert('Mock mode: environments')}
        onOpenDataStorage={() => window.alert('Mock mode: storage settings')}
        activeTableName={selectedTable?.name}
        commandStripNode={
          <CommandStrip
            columns={guidedColumns}
            guidedFilterGroup={guidedFilterGroup}
            onGuidedFilterChange={setGuidedFilterGroup}
            onApplyGuidedFilters={handleApplyGuidedFilters}
            onResetGuidedFilters={handleResetGuidedFilters}
            onApplyPreset={handleApplyPreset}
            onToggleAdvanced={() => setShowAdvancedQuery((prev) => !prev)}
            showAdvanced={showAdvancedQuery}
            advancedQuery={advancedQuery}
            validationError={guidedError}
            warnings={guidedWarnings}
            onQuickSearchChange={(value) => gridRef.current?.setQuickSearch(value)}
            onAddRow={() => {
              if (!selectedTable) {
                return;
              }
              const nextRow: DataRow = {
                id: `${selectedTable.id}-${Date.now()}`,
                order: selectedTable.rows.length + 1,
                data: Object.fromEntries(selectedTable.columns.map((column) => [column.name, column.type === 'boolean' ? false : ''])),
              };
              upsertSelectedTable({ ...selectedTable, rowCount: selectedTable.rows.length + 1, rows: [...selectedTable.rows, nextRow] });
            }}
            onAddColumn={() => window.alert('Mock mode: add column dialog')}
            onRefreshRows={() => window.alert('Mock mode: refresh rows')}
            onOpenAdvancedTools={() => setShowAdvancedTools(true)}
            loadingRows={false}
          />
        }
        gridNode={
          selectedTable ? (
            <AGGridDataTable
              ref={gridRef}
              chromeMode="embedded"
              tableName={selectedTable.name}
              columns={selectedTable.columns}
              rows={selectedTable.rows}
              onCellChange={(rowId, columnName, nextValue) => {
                if (!selectedTable) {
                  return;
                }
                const nextRows = selectedTable.rows.map((row) =>
                  row.id === rowId ? { ...row, data: { ...row.data, [columnName]: nextValue } } : row
                );
                upsertSelectedTable({ ...selectedTable, rows: nextRows });
              }}
              onRowAdd={async () => {
                if (!selectedTable) {
                  return;
                }
                const nextRow: DataRow = {
                  id: `${selectedTable.id}-${Date.now()}`,
                  order: selectedTable.rows.length + 1,
                  data: Object.fromEntries(selectedTable.columns.map((column) => [column.name, column.type === 'boolean' ? false : ''])),
                };
                upsertSelectedTable({ ...selectedTable, rowCount: selectedTable.rows.length + 1, rows: [...selectedTable.rows, nextRow] });
              }}
              onRowDelete={async (rowId) => {
                if (!selectedTable) {
                  return;
                }
                const nextRows = selectedTable.rows.filter((row) => row.id !== rowId).map((row, index) => ({ ...row, order: index + 1 }));
                upsertSelectedTable({ ...selectedTable, rowCount: nextRows.length, rows: nextRows });
              }}
              onRowsDelete={async (rowIds) => {
                if (!selectedTable) {
                  return;
                }
                const nextRows = selectedTable.rows
                  .filter((row) => !rowIds.includes(row.id))
                  .map((row, index) => ({ ...row, order: index + 1 }));
                upsertSelectedTable({ ...selectedTable, rowCount: nextRows.length, rows: nextRows });
              }}
              onColumnAdd={() => window.alert('Mock mode: add column')}
              onColumnEdit={() => window.alert('Mock mode: edit column')}
              onColumnRemove={() => window.alert('Mock mode: remove column')}
              onColumnRename={() => window.alert('Mock mode: rename column')}
              onColumnTypeChange={() => window.alert('Mock mode: change column type')}
              onBulkPaste={async () => {
                window.alert('Mock mode: paste rows');
              }}
              onExportCSV={() => window.alert('Mock mode: export CSV')}
              onImportCSV={() => window.alert('Mock mode: import CSV')}
              onGenerateColumnData={async () => {
                window.alert('Mock mode: generate data');
              }}
              onBulkUpdate={async () => {
                window.alert('Mock mode: bulk update');
              }}
              onRowsDuplicate={async () => {
                window.alert('Mock mode: duplicate rows');
              }}
              onFillSeries={async () => {
                window.alert('Mock mode: fill series');
              }}
              onFilterStateChanged={() => {
                // Mock page does not render filter metrics in compact mode.
              }}
              externalFilterState={externalFilterState}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-text-muted">Select a table</div>
          )
        }
        drawerNode={
          <AdvancedToolsDrawer
            isOpen={showAdvancedTools}
            onClose={() => setShowAdvancedTools(false)}
            onToolSelect={handleToolSelect}
          />
        }
      />
    </div>
  );
}

export default TestDataCanvasMockPage;
