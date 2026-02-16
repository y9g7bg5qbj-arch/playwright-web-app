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
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Data Table Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Users, Products, Orders"
          className="w-full rounded-md border border-border-default bg-dark-canvas px-3 py-2 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-border-active focus:ring-2 focus:ring-brand-primary/20"
          required
        />
        <p className="mt-1 text-xs text-text-muted">
          Reference in Vero: <code className="rounded bg-dark-elevated px-1.5 py-0.5 text-status-success">load $data from "{name || 'TableName'}"</code>
        </p>
      </div>

      {/* Description */}
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Description <span className="font-normal normal-case text-text-muted">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Test user accounts for login scenarios"
          rows={2}
          className="w-full resize-none rounded-md border border-border-default bg-dark-canvas px-3 py-2 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-border-active focus:ring-2 focus:ring-brand-primary/20"
        />
      </div>

      {/* Advanced Options (collapsible) */}
      <div className="rounded-lg border border-border-default bg-dark-elevated/40">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <span>Advanced Options</span>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showAdvanced && (
          <div className="border-t border-border-default px-3 pb-3">
            <label className="mb-1 mt-2 block text-xs font-medium text-text-secondary">
              Page Object Association <span className="font-normal text-text-muted">(optional)</span>
            </label>
            <input
              type="text"
              value={pageObject}
              onChange={(e) => setPageObject(e.target.value)}
              placeholder="e.g., LoginPage, CheckoutPage"
              className="w-full rounded-md border border-border-default bg-dark-canvas px-3 py-2 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-border-active focus:ring-2 focus:ring-brand-primary/20"
            />
            <p className="mt-1 text-xs text-text-muted">
              Optional: Link to a page object for page-specific data binding
            </p>
          </div>
        )}
      </div>

      {/* Columns */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Columns
        </label>
        <div className="space-y-2">
          {columns.map((col, index) => (
            <div key={index} className="flex items-center gap-2 rounded-md border border-border-default bg-dark-elevated/35 p-2">
              <input
                type="text"
                value={col.name}
                onChange={(e) => updateColumn(index, 'name', e.target.value)}
                placeholder="Column name"
                className="flex-1 rounded-md border border-border-default bg-dark-canvas px-3 py-2 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-border-active focus:ring-2 focus:ring-brand-primary/20"
              />
              <select
                value={col.type}
                onChange={(e) => updateColumn(index, 'type', e.target.value)}
                className="rounded-md border border-border-default bg-dark-canvas px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-border-active focus:ring-2 focus:ring-brand-primary/20"
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
                className="rounded p-2 text-text-muted transition-colors hover:bg-status-danger/10 hover:text-status-danger disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addColumn}
          className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border-default bg-dark-elevated/60 px-2.5 py-1.5 text-xs text-text-secondary transition-colors hover:border-border-emphasis hover:text-text-primary"
        >
          <Plus className="w-4 h-4" />
          Add Column
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 border-t border-border-default pt-4">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-md border border-border-default bg-dark-elevated/60 px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-border-emphasis hover:text-text-primary"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-b from-brand-primary to-brand-primary px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:brightness-110"
        >
          <Save className="w-4 h-4" />
          {sheet ? 'Update' : 'Create'} Data Table
        </button>
      </div>
    </form>
  );
};

export default SheetForm;
