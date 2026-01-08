/**
 * SheetForm - Form for creating/editing test data tables (entities)
 *
 * Data tables are project-level entities (Users, Products, Orders, etc.)
 * that can be referenced in Vero scripts via:
 *   - Simple: load $users from "Users"
 *   - Qualified: load $users from "ProjectName.Users"
 */
import React, { useState } from 'react';
import { Plus, Trash2, Save, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { DataSheet, DataColumn } from './TestDataPage';

interface SheetFormProps {
  sheet?: DataSheet | null;
  onSubmit: (name: string, pageObject: string, description: string, columns: DataColumn[]) => void;
  onClose: () => void;
}

export const SheetForm: React.FC<SheetFormProps> = ({
  sheet,
  onSubmit,
  onClose,
}) => {
  const [name, setName] = useState(sheet?.name || '');
  const [pageObject, setPageObject] = useState(sheet?.pageObject || '');
  const [description, setDescription] = useState(sheet?.description || '');
  const [showAdvanced, setShowAdvanced] = useState(!!sheet?.pageObject);
  const [columns, setColumns] = useState<DataColumn[]>(
    sheet?.columns && sheet.columns.length > 0
      ? sheet.columns
      : [{ name: '', type: 'string', required: false }]
  );

  const addColumn = () => {
    setColumns([...columns, { name: '', type: 'string', required: false }]);
  };

  const removeColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const updateColumn = (index: number, field: keyof DataColumn, value: string | boolean) => {
    const updated = [...columns];
    updated[index] = { ...updated[index], [field]: value };
    setColumns(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validColumns = columns.filter((col) => col.name.trim() !== '');
    onSubmit(name, pageObject, description, validColumns);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Data Table Name */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Data Table Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Users, Products, Orders"
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
          required
        />
        <p className="text-xs text-slate-500 mt-1">
          Reference in Vero: <code className="text-emerald-400">load $data from "{name || 'TableName'}"</code>
        </p>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Description <span className="text-slate-500 font-normal">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Test user accounts for login scenarios"
          rows={2}
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 resize-none"
        />
      </div>

      {/* Advanced Options (collapsible) */}
      <div className="border border-slate-700 rounded">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
        >
          <span>Advanced Options</span>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showAdvanced && (
          <div className="px-3 pb-3 border-t border-slate-700">
            <label className="block text-sm font-medium text-slate-300 mb-1 mt-2">
              Page Object Association <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={pageObject}
              onChange={(e) => setPageObject(e.target.value)}
              placeholder="e.g., LoginPage, CheckoutPage"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              Optional: Link to a page object for page-specific data binding
            </p>
          </div>
        )}
      </div>

      {/* Columns */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Columns
        </label>
        <div className="space-y-2">
          {columns.map((col, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={col.name}
                onChange={(e) => updateColumn(index, 'name', e.target.value)}
                placeholder="Column name"
                className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              />
              <select
                value={col.type}
                onChange={(e) => updateColumn(index, 'type', e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="date">Date</option>
              </select>
              <button
                type="button"
                onClick={() => removeColumn(index)}
                disabled={columns.length === 1}
                className="p-2 text-slate-500 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addColumn}
          className="mt-2 flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Column
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-700">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
        <button
          type="submit"
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
        >
          <Save className="w-4 h-4" />
          {sheet ? 'Update' : 'Create'} Data Table
        </button>
      </div>
    </form>
  );
};

export default SheetForm;
