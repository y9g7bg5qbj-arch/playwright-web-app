/**
 * ImportExcelModal - Modal for importing Excel files as test data
 */
import React, { useState, useRef } from 'react';
import { Upload, AlertCircle, Check } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import {
  testDataApi,
  isTestDataValidationError,
  type ImportResult,
  type TestDataApiError,
} from '@/api/testData';

interface ImportExcelModalProps {
  projectId?: string;
  onImport: (result: ImportResult) => void;
  onClose: () => void;
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  projectId,
  onImport,
  onClose,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];

    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.xlsx?$/i)) {
      setError('Please select an Excel file (.xlsx or .xls)');
      return;
    }

    setError(null);
    setFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }
    if (!projectId) {
      setError('Project ID is required for import');
      return;
    }

    setError(null);
    setIsImporting(true);
    try {
      const result = await testDataApi.importExcel(projectId, file);
      onImport(result);
      onClose();
    } catch (importError) {
      if (isTestDataValidationError(importError) && importError.validationErrors?.length) {
        const first = importError.validationErrors[0];
        setError(
          `${first.rowId} • ${first.column}: ${first.reason} (expected ${first.expectedType})`
        );
      } else if (
        importError &&
        typeof importError === 'object' &&
        Array.isArray((importError as TestDataApiError).validationErrors)
      ) {
        const typedError = importError as TestDataApiError;
        setError(typedError.message || 'Import failed');
      } else if (importError instanceof Error) {
        setError(importError.message);
      } else {
        setError('Import failed');
      }
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Import Excel File"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="action"
            onClick={handleSubmit}
            disabled={!file || isImporting}
            isLoading={isImporting}
            leftIcon={<Upload className="w-4 h-4" />}
          >
            {isImporting ? 'Importing...' : 'Import'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${isDragOver
              ? 'border-status-info bg-status-info/10'
              : file
                ? 'border-status-success bg-status-success/10'
                : 'border-border-default hover:border-border-default'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />

          {file ? (
            <div className="flex flex-col items-center">
              <Check className="w-10 h-10 text-status-success mb-2" />
              <p className="font-medium text-text-primary">{file.name}</p>
              <p className="text-sm text-text-secondary mt-1">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="w-10 h-10 text-text-secondary mb-2" />
              <p className="font-medium text-text-primary">
                Drop Excel file here or click to browse
              </p>
              <p className="text-sm text-text-secondary mt-1">
                Supports .xlsx and .xls files
              </p>
            </div>
          )}
        </div>

        <div className="rounded border border-border-default bg-dark-card px-3 py-2 text-xs text-text-secondary">
          Each worksheet imports as its own table using the worksheet name.
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-status-danger bg-status-danger/10 px-3 py-2 rounded">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ImportExcelModal;
