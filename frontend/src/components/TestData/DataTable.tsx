/**
 * DataTable - Table component for test data display and editing
 */
import React, { useState } from 'react';
import { Trash2, Check, X, Loader2 } from 'lucide-react';
import type { DataSheet, DataRow, DataColumn } from './TestDataPage';

interface DataTableProps {
  sheet: DataSheet;
  rows: DataRow[];
  loading?: boolean;
  onUpdateRow?: (rowId: string, updates: Partial<DataRow>) => void;
  onDeleteRow?: (rowId: string) => void;
  onUpdateColumns?: (columns: DataColumn[]) => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  sheet,
  rows,
  loading = false,
  onUpdateRow,
  onDeleteRow,
}) => {
  const columns = sheet.columns;
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const startEdit = (rowIndex: number, colName: string, value: unknown) => {
    setEditingCell({ row: rowIndex, col: colName });
    setEditValue(String(value ?? ''));
  };

  const confirmEdit = () => {
    if (editingCell && onUpdateRow) {
      const row = rows[editingCell.row];
      if (row) {
        onUpdateRow(row.id, {
          data: { ...row.data, [editingCell.col]: editValue }
        });
      }
    }
    setEditingCell(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <table className="text-sm border-collapse" style={{ minWidth: 'max-content' }}>
        <thead className="sticky top-0 z-20">
          <tr>
            {/* Sticky row number column */}
            <th className="w-12 px-3 py-2 text-left text-slate-500 bg-slate-800 border-b border-slate-700 sticky left-0 z-30">
              #
            </th>
            {/* Sticky scenario column */}
            <th className="w-28 px-3 py-2 text-left text-slate-500 bg-slate-800 border-b border-slate-700 sticky left-12 z-30 border-r border-slate-700">
              Scenario
            </th>
            {/* Data columns */}
            {columns.map((col) => (
              <th
                key={col.name}
                className="px-3 py-2 text-left font-medium text-slate-300 bg-slate-800 border-b border-slate-700 whitespace-nowrap min-w-[150px]"
              >
                {col.name}
                <span className="ml-1 text-xs text-slate-500">({col.type})</span>
              </th>
            ))}
            {/* Sticky actions column on right */}
            <th className="w-20 px-3 py-2 text-right text-slate-500 bg-slate-800 border-b border-slate-700 sticky right-0 z-30 border-l border-slate-700">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {rows.map((row, rowIndex) => (
            <tr key={row.id} className="hover:bg-slate-800/30 transition-colors group">
              {/* Sticky row number */}
              <td className="px-3 py-2 text-slate-500 bg-slate-950 sticky left-0 z-10 group-hover:bg-slate-900">
                {rowIndex + 1}
              </td>
              {/* Sticky scenario ID */}
              <td className="px-3 py-2 text-emerald-400 font-mono text-xs bg-slate-950 sticky left-12 z-10 border-r border-slate-800 group-hover:bg-slate-900">
                {row.scenarioId}
              </td>
              {/* Data cells */}
              {columns.map((col) => (
                <td key={col.name} className="px-3 py-2 whitespace-nowrap">
                  {editingCell?.row === rowIndex && editingCell?.col === col.name ? (
                    <div className="flex items-center gap-1">
                      <input
                        type={col.type === 'number' ? 'number' : 'text'}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-200 text-sm focus:outline-none focus:border-blue-500 min-w-[120px]"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmEdit();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                      />
                      <button
                        onClick={confirmEdit}
                        className="p-1 text-green-400 hover:text-green-300"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1 text-red-400 hover:text-red-300"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => startEdit(rowIndex, col.name, row.data[col.name])}
                      className="text-slate-200 cursor-pointer hover:bg-slate-700 rounded px-1 py-0.5 -mx-1"
                    >
                      {col.type === 'boolean'
                        ? row.data[col.name]
                          ? 'true'
                          : 'false'
                        : String(row.data[col.name] ?? '-')}
                    </div>
                  )}
                </td>
              ))}
              {/* Sticky actions column */}
              <td className="px-3 py-2 text-right bg-slate-950 sticky right-0 z-10 border-l border-slate-800 group-hover:bg-slate-900">
                <button
                  onClick={() => onDeleteRow?.(row.id)}
                  className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                  title="Delete row"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <p>No data rows yet</p>
          <p className="text-xs mt-1">Add rows to start creating test scenarios</p>
        </div>
      )}
    </div>
  );
};

export default DataTable;
