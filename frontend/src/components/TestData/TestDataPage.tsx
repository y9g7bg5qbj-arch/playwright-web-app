/**
 * Test Data Management Page
 *
 * Main page for managing test data sheets, rows, and Excel import/export.
 * Provides Excel-like grid editing with AG Grid and CSV support.
 *
 * State management is split across custom hooks:
 * - useSheetOperations: sheet/row/column CRUD, import/export, messages
 * - useQueryGenerator: query builder state, filter application
 * - useInspectorData: data quality computations
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Check, AlertTriangle } from 'lucide-react';
import { AGGridDataTable } from './AGGridDataTable';
import { SheetForm } from './SheetForm';
import { ImportExcelModal } from './ImportExcelModal';
import { ImportCSVModal } from './ImportCSVModal';
import { ColumnEditorModal } from './ColumnEditorModal';
import { EnvironmentManager } from './EnvironmentManager';
import { QuoteGenerationModal } from './QuoteGenerationModal';
import { QueryGeneratorModal } from './QueryGeneratorModal';
import { DataStorageSettingsModal } from '@/components/settings/DataStorageSettingsModal';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui';
import {
    TestDataCanvasLayout,
    ExcelRibbon,
    CanvasUtilityRail,
    AdvancedToolsDrawer,
    type AdvancedToolId,
} from './canvas-v2';
import { mapColumnType } from './testDataUtils';
import { useSheetOperations } from './useSheetOperations';
import { useQueryGenerator } from './useQueryGenerator';
import { useInspectorData } from './useInspectorData';

// Re-export types so existing consumers are not broken
export type { ReferenceConfig, DataColumn, DataSheet, DataRow } from './testDataTypes';
import type { TestDataPageProps } from './testDataTypes';

// ============================================
// COMPONENT
// ============================================

export function TestDataPage({ projectId, nestedProjectId, onInsertQuery }: TestDataPageProps) {
    const ops = useSheetOperations({ projectId, nestedProjectId });

    const query = useQueryGenerator({
        sheets: ops.sheets,
        rows: ops.rows,
        selectedSheetId: ops.selectedSheetId,
        setSelectedSheetId: ops.setSelectedSheetId,
        loadingRows: ops.loadingRows,
        gridHandleRef: ops.gridHandleRef,
        showError: ops.showError,
        showSuccess: ops.showSuccess,
    });

    const { inspectorData, qualityReportData } = useInspectorData({
        selectedSheet: ops.selectedSheet,
        rows: ops.rows,
        filteredRowCount: query.filteredRowCount,
        currentFilterState: query.currentFilterState,
    });

    // Canvas v2 local UI state
    const [showAdvancedTools, setShowAdvancedTools] = useState(false);
    const [showQuoteGeneration, setShowQuoteGeneration] = useState(false);
    const [quoteSelectedRowIds, _setQuoteSelectedRowIds] = useState<string[]>([]);
    const [quoteFilteredRowIds, _setQuoteFilteredRowIds] = useState<string[]>([]);

    // Load sheets on mount
    useEffect(() => {
        ops.fetchSheets();
    }, [ops.fetchSheets]);

    // Reset transient filters when switching table tabs
    useEffect(() => {
        query.setCurrentFilterState({});
        query.setFilteredRowCount(0);
        query.setSelectedRowCount(0);
        ops.gridHandleRef.current?.clearFilterModel();
        ops.gridHandleRef.current?.setQuickSearch('');
        ops.gridHandleRef.current?.clearExternalRowScope();

        if (ops.selectedSheetId) {
            ops.fetchRows(ops.selectedSheetId);
        }
    }, [ops.selectedSheetId, ops.fetchRows]);

    const handleRefreshCanvas = useCallback(() => {
        void ops.fetchSheets();
        if (ops.selectedSheetId) {
            void ops.fetchRows(ops.selectedSheetId);
        }
    }, [ops.fetchRows, ops.fetchSheets, ops.selectedSheetId]);

    // Current generated query for "Insert into Editor" action
    const currentGeneratedQuery = useMemo(() => {
        if (query.queryModalMode === 'cell') {
            return query.cellQueryPayload?.query || '';
        }
        return query.queryPreview.snippet;
    }, [query.queryModalMode, query.cellQueryPayload, query.queryPreview.snippet]);

    const handleInsertIntoEditor = useCallback(() => {
        if (!onInsertQuery || !currentGeneratedQuery.trim()) return;
        onInsertQuery(currentGeneratedQuery);
        query.setShowQueryGeneratorModal(false);
    }, [onInsertQuery, currentGeneratedQuery, query]);

    const handleAdvancedToolSelect = (toolId: AdvancedToolId) => {
        switch (toolId) {
            case 'bulkUpdate':
                ops.gridHandleRef.current?.openBulkUpdate();
                break;
            case 'findReplace':
                ops.gridHandleRef.current?.openFindReplace();
                break;
            case 'duplicateRows':
                ops.gridHandleRef.current?.duplicateSelectedRows();
                break;
            case 'fillSeries':
                ops.gridHandleRef.current?.openFillColumn(ops.selectedSheet?.columns[0]?.name);
                break;
            case 'dataGenerator':
                ops.gridHandleRef.current?.openDataGenerator(ops.selectedSheet?.columns[0]?.name);
                break;
            case 'multiSort':
                ops.gridHandleRef.current?.openMultiSort();
                break;
            case 'conditionalFormatting':
                ops.gridHandleRef.current?.openConditionalFormatting();
                break;
            case 'importCsv':
                ops.setShowCSVImportModal(true);
                break;
            case 'exportCsv':
                ops.handleExportCSV();
                break;
            default:
                break;
        }

        setShowAdvancedTools(false);
    };

    return (
        <div className="relative flex h-full overflow-hidden bg-dark-canvas">
            <TestDataCanvasLayout
                tables={ops.sheets.map((sheet) => ({
                    id: sheet.id,
                    name: sheet.name,
                    rowCount: sheet.rowCount,
                    pageObject: sheet.pageObject,
                }))}
                loadingTables={ops.loading}
                selectedTableId={ops.selectedSheetId}
                openTableIds={ops.selectedSheetId ? [ops.selectedSheetId] : []}
                onSelectTable={ops.setSelectedSheetId}
                onCreateTable={() => ops.setShowSheetForm(true)}
                onRefreshTables={handleRefreshCanvas}
                onImportExcel={() => ops.setShowImportModal(true)}
                onOpenEnvironments={() => ops.setShowEnvironments(true)}
                onOpenDataStorage={() => ops.setShowDataStorageSettings(true)}
                onEditTable={(sheetId) => {
                    const sheet = ops.sheets.find((entry) => entry.id === sheetId);
                    if (!sheet) {
                        return;
                    }
                    ops.setEditingSheet(sheet);
                    ops.setShowSheetForm(true);
                }}
                onDeleteTable={ops.handleDeleteSheet}
                activeTableName={ops.selectedSheet?.name}
                utilityRailNode={(
                    <CanvasUtilityRail
                        onCreateTable={() => ops.setShowSheetForm(true)}
                        onImportExcel={() => ops.setShowImportModal(true)}
                        onRefresh={handleRefreshCanvas}
                        onOpenEnvironments={() => ops.setShowEnvironments(true)}
                        onOpenDataStorage={() => ops.setShowDataStorageSettings(true)}
                        loading={ops.loading || ops.loadingRows}
                    />
                )}
                commandStripNode={(
                    <ExcelRibbon
                        activeFilterCount={Object.keys(query.currentFilterState || {}).length}
                        queryStatusLabel={query.queryStatusLabel}
                        warningCount={query.queryWarnings.length}
                        onOpenQueryGenerator={query.handleOpenQueryGenerator}
                        onAddRow={() => { void ops.handleAddRow(); }}
                        onAddColumn={ops.handleAddColumn}
                        onDeleteSelected={() => ops.gridHandleRef.current?.deleteSelectedRows()}
                        onDuplicateSelected={() => ops.gridHandleRef.current?.duplicateSelectedRows()}
                        onUndo={() => ops.gridHandleRef.current?.undo()}
                        onRedo={() => ops.gridHandleRef.current?.redo()}
                        onOpenFindReplace={() => ops.gridHandleRef.current?.openFindReplace()}
                        onOpenBulkUpdate={() => ops.gridHandleRef.current?.openBulkUpdate()}
                        onOpenDataGenerator={() => ops.gridHandleRef.current?.openDataGenerator(ops.selectedSheet?.columns[0]?.name)}
                        onImportCSV={() => ops.setShowCSVImportModal(true)}
                        onExportCSV={ops.handleExportCSV}
                        onRefreshRows={() => {
                            if (ops.selectedSheetId) {
                                ops.fetchRows(ops.selectedSheetId);
                            }
                        }}
                        onOpenColumnVisibility={() => ops.gridHandleRef.current?.openColumnVisibility()}
                        onOpenMultiSort={() => ops.gridHandleRef.current?.openMultiSort()}
                        onOpenConditionalFormatting={() => ops.gridHandleRef.current?.openConditionalFormatting()}
                        onFreezeSelectedRows={() => ops.gridHandleRef.current?.freezeSelectedRows()}
                        onUnfreezeRows={() => ops.gridHandleRef.current?.unfreezeAllRows()}
                        onUnfreezeColumns={() => ops.gridHandleRef.current?.unfreezeAllColumns()}
                        onRunQualityScan={() => {
                            ops.setShowQualityReport(true);
                        }}
                        onOpenAdvancedTools={() => setShowAdvancedTools(true)}
                        loadingRows={ops.loadingRows}
                        selectedRowCount={query.selectedRowCount}
                    />
                )}
                gridNode={ops.selectedSheet ? (
                    <AGGridDataTable
                        ref={ops.gridHandleRef}
                        chromeMode="embedded"
                        tableId={ops.selectedSheet.id}
                        tableName={ops.selectedSheet.name}
                        columns={ops.selectedSheet.columns.map(c => ({
                            name: c.name,
                            type: mapColumnType(c.type),
                            required: c.required,
                            validation: c.validation,
                            min: c.min,
                            max: c.max,
                            minLength: c.minLength,
                            maxLength: c.maxLength,
                            pattern: c.pattern,
                            enum: c.enum,
                            formula: c.formula,
                            referenceConfig: c.referenceConfig,
                        }))}
                        rows={ops.rows.map((r, idx) => ({
                            id: r.id,
                            data: r.data || {},
                            order: idx
                        }))}
                        loading={ops.loadingRows}
                        onCellChange={ops.handleCellChange}
                        onRowAdd={ops.handleAddRow}
                        onRowDelete={ops.handleDeleteRow}
                        onRowsDelete={ops.handleBulkDeleteRows}
                        onColumnAdd={ops.handleAddColumn}
                        onColumnEdit={ops.handleEditColumn}
                        onColumnRemove={ops.handleRemoveColumn}
                        onColumnRename={ops.handleRenameColumn}
                        onColumnTypeChange={ops.handleColumnTypeChange}
                        onBulkPaste={ops.handleBulkPaste}
                        onExportCSV={ops.handleExportCSV}
                        onImportCSV={() => ops.setShowCSVImportModal(true)}
                        onGenerateColumnData={ops.handleGenerateColumnData}
                        onBulkUpdate={ops.handleBulkUpdate}
                        onRowsDuplicate={ops.handleDuplicateRows}
                        onFillSeries={ops.handleFillSeries}
                        onFilterStateChanged={query.handleGridFilterStateChanged}
                        externalFilterState={query.externalFilterState}
                        onSelectionCountChange={query.setSelectedRowCount}
                        onCellQueryGenerated={query.handleCellQueryGenerated}
                    />
                ) : (
                    <div className="flex h-full items-center justify-center px-6">
                        <div className="w-full max-w-md rounded-xl border border-border-default bg-dark-card/75 p-8 text-center shadow-2xl">
                            <p className="mb-1 text-base font-semibold text-text-primary">No data table selected</p>
                            <p className="text-sm text-text-secondary">Choose a table from the left sidebar or create a new one.</p>
                        </div>
                    </div>
                )}
                drawerNode={(
                    <AdvancedToolsDrawer
                        isOpen={showAdvancedTools}
                        onClose={() => setShowAdvancedTools(false)}
                        onToolSelect={handleAdvancedToolSelect}
                    />
                )}
            />

            {/* Messages */}
            {ops.successMessage && (
                <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-status-success/45 bg-status-success/90 px-4 py-2.5 text-white shadow-xl animate-slide-up">
                    <Check className="h-4 w-4" />
                    <span className="text-xs font-semibold">{ops.successMessage}</span>
                </div>
            )}
            {ops.errorMessage && (
                <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-status-danger/45 bg-status-danger/90 px-4 py-2.5 text-white shadow-xl animate-slide-up">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs font-semibold">{ops.errorMessage}</span>
                </div>
            )}

            {/* Modals */}
            <Modal
                isOpen={ops.showSheetForm}
                onClose={() => {
                    ops.setShowSheetForm(false);
                    ops.setEditingSheet(null);
                }}
                title={ops.editingSheet ? `Edit "${ops.editingSheet.name}"` : 'Create Data Table'}
                description={ops.editingSheet ? 'Update table details and schema.' : 'Create a new table and define its columns.'}
                size="xl"
            >
                <SheetForm
                    sheet={ops.editingSheet}
                    onSubmit={ops.editingSheet
                        ? (name, pageObject, desc, cols) => ops.handleUpdateSheet(ops.editingSheet!.id, { name, pageObject, description: desc, columns: cols })
                        : ops.handleCreateSheet
                    }
                    onClose={() => {
                        ops.setShowSheetForm(false);
                        ops.setEditingSheet(null);
                    }}
                />
            </Modal>

            <Modal
                isOpen={ops.showQualityReport}
                onClose={() => ops.setShowQualityReport(false)}
                title="Quality Report"
                description={ops.selectedSheet ? `Scan results for "${ops.selectedSheet.name}"` : 'No table selected'}
                size="xl"
                footer={
                    <div className="flex w-full justify-end">
                        <Button variant="action" onClick={() => ops.setShowQualityReport(false)}>
                            Close
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                        <div className="rounded-md border border-border-default bg-dark-elevated/55 p-3">
                            <p className="text-xxs text-text-muted">Type Conformance Issues</p>
                            <p className={`text-lg font-semibold ${qualityReportData.typeIssueCount > 0 ? 'text-status-warning' : 'text-status-success'}`}>
                                {qualityReportData.typeIssueCount}
                            </p>
                        </div>
                        <div className="rounded-md border border-border-default bg-dark-elevated/55 p-3">
                            <p className="text-xxs text-text-muted">Duplicate Key Rows</p>
                            <p className={`text-lg font-semibold ${qualityReportData.duplicateIssueCount > 0 ? 'text-status-warning' : 'text-status-success'}`}>
                                {qualityReportData.duplicateIssueCount}
                            </p>
                        </div>
                        <div className="rounded-md border border-border-default bg-dark-elevated/55 p-3">
                            <p className="text-xxs text-text-muted">Required Field Gaps</p>
                            <p className={`text-lg font-semibold ${qualityReportData.requiredGapCount > 0 ? 'text-status-warning' : 'text-status-success'}`}>
                                {qualityReportData.requiredGapCount}
                            </p>
                        </div>
                    </div>

                    <div className="rounded-md border border-border-default bg-dark-elevated/45 p-3">
                        <p className="mb-2 text-xs font-semibold text-text-primary">Type Conformance</p>
                        {inspectorData.validationChecks.length === 0 ? (
                            <p className="text-xs text-status-success">No type conformance issues detected.</p>
                        ) : (
                            <div className="space-y-1">
                                {inspectorData.validationChecks.map((item) => (
                                    <div key={item.column} className="flex items-center justify-between text-xs text-text-secondary">
                                        <span className="truncate">{item.column}</span>
                                        <span className="rounded bg-status-warning/20 px-1.5 py-0.5 text-status-warning">{item.count}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="rounded-md border border-border-default bg-dark-elevated/45 p-3">
                        <p className="mb-2 text-xs font-semibold text-text-primary">Duplicate Key Checks</p>
                        {qualityReportData.duplicateChecks.length === 0 ? (
                            <p className="text-xs text-text-secondary">No key-like columns found for duplicate checks.</p>
                        ) : (
                            <div className="space-y-1">
                                {qualityReportData.duplicateChecks.map((check) => (
                                    <div key={check.column} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 text-xs text-text-secondary">
                                        <span className="truncate">{check.column}</span>
                                        <span className={`rounded px-1.5 py-0.5 ${check.duplicateRows > 0 ? 'bg-status-warning/20 text-status-warning' : 'bg-status-success/20 text-status-success'}`}>
                                            dupes: {check.duplicateRows}
                                        </span>
                                        <span className="text-text-muted">
                                            distinct {check.distinctValues}/{check.totalValues}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="rounded-md border border-border-default bg-dark-elevated/45 p-3">
                        <p className="mb-2 text-xs font-semibold text-text-primary">Required Field Completion</p>
                        {qualityReportData.requiredFields.length === 0 ? (
                            <p className="text-xs text-text-secondary">No required columns configured yet.</p>
                        ) : (
                            <div className="space-y-1">
                                {qualityReportData.requiredFields.map((field) => (
                                    <div key={field.column} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 text-xs text-text-secondary">
                                        <span className="truncate">{field.column}</span>
                                        <span className={`rounded px-1.5 py-0.5 ${field.missing > 0 ? 'bg-status-warning/20 text-status-warning' : 'bg-status-success/20 text-status-success'}`}>
                                            missing: {field.missing}
                                        </span>
                                        <span className="text-text-muted">{field.completionRate}% complete</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {ops.showImportModal && (
                <ImportExcelModal
                    projectId={projectId}
                    onImport={ops.handleImportComplete}
                    onClose={() => ops.setShowImportModal(false)}
                />
            )}

            {ops.showEnvironments && (
                <EnvironmentManager
                    userId={projectId}
                    onClose={() => ops.setShowEnvironments(false)}
                />
            )}

            {ops.showCSVImportModal && ops.selectedSheet && (
                <ImportCSVModal
                    isOpen={ops.showCSVImportModal}
                    onClose={() => ops.setShowCSVImportModal(false)}
                    existingColumns={ops.selectedSheet.columns.map(c => ({
                        name: c.name,
                        type: c.type === 'string' ? 'text' : c.type
                    }))}
                    onImport={ops.handleCSVImport}
                />
            )}

            {ops.showColumnEditor && ops.selectedSheet && (
                <ColumnEditorModal
                    isOpen={ops.showColumnEditor}
                    onClose={() => {
                        ops.setShowColumnEditor(false);
                        ops.setEditingColumn(null);
                    }}
                    onSave={ops.handleSaveColumn}
                    existingColumn={ops.editingColumn || undefined}
                    existingColumnNames={ops.selectedSheet.columns.map(c => c.name)}
                    mode={ops.editingColumn ? 'edit' : 'add'}
                    availableSheets={ops.sheets.map(s => ({
                        id: s.id,
                        name: s.name,
                        columns: s.columns.map(c => ({ name: c.name, type: c.type })),
                    }))}
                    currentSheetId={ops.selectedSheet.id}
                />
            )}

            <DataStorageSettingsModal
                isOpen={ops.showDataStorageSettings}
                onClose={() => ops.setShowDataStorageSettings(false)}
                applicationId={projectId}
            />

            <QueryGeneratorModal
                isOpen={query.showQueryGeneratorModal}
                mode={query.queryModalMode}
                onClose={() => query.setShowQueryGeneratorModal(false)}
                tables={query.queryTables}
                selectedTableId={query.selectedQueryTable?.id || query.queryDraft.tableId}
                draft={query.queryDraft}
                distinctValueMap={query.queryDistinctValueMap}
                loadingValues={query.queryValuesLoading}
                generatedQuery={query.queryModalMode === 'cell' ? (query.cellQueryPayload?.query || '') : query.queryPreview.snippet}
                generatedShape={query.queryModalMode === 'cell' ? 'ROW' : query.queryPreview.shape}
                matchCount={query.queryModalMode === 'cell' ? 1 : query.queryPreview.matchCount}
                warnings={query.queryModalMode === 'cell' ? [] : (query.queryWarnings.length > 0 ? query.queryWarnings : query.queryPreview.warnings)}
                validationError={query.queryModalMode === 'cell' ? null : (query.queryValidationError || query.queryPreview.validationError)}
                cellPayload={query.cellQueryPayload}
                onTableChange={query.handleQueryTableChange}
                onAnswerChange={query.handleQueryAnswerChange}
                onResultControlChange={query.handleQueryResultControlChange}
                onSortColumnChange={query.handleQuerySortColumnChange}
                onSortDirectionChange={query.handleQuerySortDirectionChange}
                onLimitChange={query.handleQueryLimitChange}
                onApplyFilters={() => { void query.handleApplyQueryFilters(); }}
                onCopyQuery={() => { void query.handleCopyGeneratedQuery(); }}
                onUseCellAsBuilder={query.handleUseCellAsBuilder}
                onInsertIntoEditor={onInsertQuery ? handleInsertIntoEditor : undefined}
            />

            <QuoteGenerationModal
                isOpen={showQuoteGeneration}
                onClose={() => setShowQuoteGeneration(false)}
                rows={ops.rows.map((row) => ({
                    id: row.id,
                    scenarioId: row.scenarioId,
                    data: row.data || {},
                }))}
                columns={(ops.selectedSheet?.columns || []).map((column) => ({ name: column.name }))}
                selectedRowIds={quoteSelectedRowIds}
                filteredRowIds={quoteFilteredRowIds}
                onCopySuccess={ops.showSuccess}
                onCopyError={ops.showError}
            />
        </div>
    );
}

export default TestDataPage;
