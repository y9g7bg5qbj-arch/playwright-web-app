/**
 * IDE-aware Data Query Modal
 *
 * Thin wrapper around QueryGeneratorModal that:
 * 1. Fetches sheets for the current project via testDataApi
 * 2. Manages query generator state via useQueryGenerator hook
 * 3. Adds "Insert into Editor" as the primary action (instead of just "Copy")
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { testDataApi } from '@/api/testData';
import { QueryGeneratorModal } from '@/components/TestData/QueryGeneratorModal';
import { useQueryGenerator } from '@/components/TestData/useQueryGenerator';
import type { DataSheet, DataRow } from '@/components/TestData/testDataTypes';
import type { AGGridDataTableHandle } from '@/components/TestData/AGGridDataTable';

interface DataQueryModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  nestedProjectId?: string | null;
  onInsertSnippet: (snippet: string) => void;
}

export function DataQueryModal({ isOpen, onClose, projectId, nestedProjectId, onInsertSnippet }: DataQueryModalProps) {
  const [sheets, setSheets] = useState<DataSheet[]>([]);
  const [rows, setRows] = useState<DataRow[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
  const [loadingRows, setLoadingRows] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const gridHandleRef = useRef<AGGridDataTableHandle | null>(null);

  // Fetch sheets when modal opens
  useEffect(() => {
    if (!isOpen || !projectId) return;
    let cancelled = false;

    setLoading(true);
    testDataApi.listSheets(projectId, {
      nestedProjectId,
      fallbackToApplicationScope: true,
    }).then((result) => {
      if (cancelled) return;
      // Map API TestDataSheet to the DataSheet shape expected by useQueryGenerator
      const mapped: DataSheet[] = result.map((s) => ({
        id: s.id,
        name: s.name,
        pageObject: s.pageObject,
        description: s.description,
        projectId: s.projectId ?? null,
        columns: s.columns.map((c) => ({
          name: c.name,
          type: c.type as DataSheet['columns'][number]['type'],
          required: c.required ?? false,
          validation: c.validation,
        })),
        rowCount: s.rowCount,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }));
      setSheets(mapped);
      setSelectedSheetId((prev) => {
        if (mapped.length === 0) return null;
        if (!prev || !mapped.some((sheet) => sheet.id === prev)) {
          return mapped[0].id;
        }
        return prev;
      });
    }).catch(() => {
      if (!cancelled) setSheets([]);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [isOpen, nestedProjectId, projectId]);

  // Load rows when selected sheet changes
  useEffect(() => {
    if (!selectedSheetId) return;
    let cancelled = false;

    setLoadingRows(true);
    testDataApi.listRows(selectedSheetId).then((result) => {
      if (cancelled) return;
      setRows(result.map((r) => ({
        id: r.id,
        sheetId: r.sheetId,
        scenarioId: r.scenarioId,
        data: r.data,
        enabled: r.enabled,
        createdAt: r.createdAt ?? '',
        updatedAt: r.updatedAt ?? '',
      })));
    }).catch(() => {
      if (!cancelled) setRows([]);
    }).finally(() => {
      if (!cancelled) setLoadingRows(false);
    });

    return () => { cancelled = true; };
  }, [selectedSheetId]);

  const showError = useCallback((text: string) => {
    setMessage({ type: 'error', text });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  const showSuccess = useCallback((text: string) => {
    setMessage({ type: 'success', text });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  const query = useQueryGenerator({
    sheets,
    rows,
    selectedSheetId,
    setSelectedSheetId,
    loadingRows,
    gridHandleRef,
    showError,
    showSuccess,
  });

  useEffect(() => {
    query.setShowQueryGeneratorModal(isOpen);
  }, [isOpen, query.setShowQueryGeneratorModal]);

  // "Insert into Editor" action
  const handleInsert = useCallback(() => {
    const snippet = query.queryPreview.snippet;
    if (!snippet.trim()) {
      showError('No query available to insert');
      return;
    }
    onInsertSnippet(snippet);
    showSuccess('Query inserted into editor');
    onClose();
  }, [query.queryPreview.snippet, onInsertSnippet, onClose, showError, showSuccess]);

  // Override "Copy Query" to also offer insert
  const handleCopy = useCallback(async () => {
    const snippet = query.queryPreview.snippet;
    if (!snippet.trim()) {
      showError('No query available to copy');
      return;
    }
    try {
      await navigator.clipboard.writeText(snippet);
      showSuccess('Query copied to clipboard');
    } catch {
      showError('Failed to copy query');
    }
  }, [query.queryPreview.snippet, showError, showSuccess]);

  if (!isOpen) return null;

  return (
    <QueryGeneratorModal
      isOpen={isOpen}
      mode="builder"
      onClose={onClose}
      tables={query.queryTables}
      selectedTableId={query.queryDraft.tableId || (sheets[0]?.id ?? '')}
      draft={query.queryDraft}
      distinctValueMap={query.queryDistinctValueMap}
      loadingValues={query.queryValuesLoading || loading}
      generatedQuery={query.queryPreview.snippet}
      generatedShape={query.queryPreview.shape}
      matchCount={query.queryPreview.matchCount}
      warnings={query.queryPreview.warnings}
      validationError={query.queryPreview.validationError}
      onTableChange={query.handleQueryTableChange}
      onAnswerChange={query.handleQueryAnswerChange}
      onResultControlChange={query.handleQueryResultControlChange}
      onSortColumnChange={query.handleQuerySortColumnChange}
      onSortDirectionChange={query.handleQuerySortDirectionChange}
      onLimitChange={query.handleQueryLimitChange}
      onApplyFilters={handleInsert}
      onCopyQuery={handleCopy}
      applyLabel="Insert into Editor"
      copyLabel="Copy Query"
    />
  );
}
