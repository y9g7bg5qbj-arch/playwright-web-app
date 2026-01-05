/**
 * ImportExcelModal - Modal for importing Excel files as test data
 */
import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X, AlertCircle, Check } from 'lucide-react';

interface ImportExcelModalProps {
  projectId?: string;
  onImport: (result: { sheets: unknown[] }) => void;
  onClose: () => void;
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  onImport,
  onClose,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [sheetName, setSheetName] = useState('');
  const [error, setError] = useState<string | null>(null);
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

    // Auto-suggest sheet name from filename
    const suggestedName = selectedFile.name.replace(/\.xlsx?$/i, '');
    setSheetName(suggestedName);
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

  const handleSubmit = () => {
    if (!file) {
      setError('Please select a file');
      return;
    }
    if (!sheetName.trim()) {
      setError('Please enter a sheet name');
      return;
    }
    // Mock successful import - in real implementation this would call an API
    onImport({ sheets: [{ name: sheetName, file: file.name }] });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-400" />
            <h2 className="font-semibold text-slate-200">Import Excel File</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
              ${isDragOver
                ? 'border-blue-500 bg-blue-500/10'
                : file
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-slate-700 hover:border-slate-600'
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
                <Check className="w-10 h-10 text-green-400 mb-2" />
                <p className="font-medium text-slate-200">{file.name}</p>
                <p className="text-sm text-slate-500 mt-1">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload className="w-10 h-10 text-slate-500 mb-2" />
                <p className="font-medium text-slate-300">
                  Drop Excel file here or click to browse
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Supports .xlsx and .xls files
                </p>
              </div>
            )}
          </div>

          {/* Sheet Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Sheet Name
            </label>
            <input
              type="text"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              placeholder="Name for the imported data sheet"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportExcelModal;
