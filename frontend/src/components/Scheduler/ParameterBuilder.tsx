/**
 * ParameterBuilder - UI for defining schedule parameters
 * Allows users to add/edit/remove parameter definitions when creating/editing schedules
 */
import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  GripVertical,
  Edit2,
  Check,
  ChevronDown,
  ChevronUp,
  Type,
  List,
  ToggleLeft,
  Hash,
} from 'lucide-react';
import type {
  ScheduleParameterDefinition,
  ScheduleParameterType,
} from '@playwright-web-app/shared';

interface ParameterBuilderProps {
  parameters: ScheduleParameterDefinition[];
  onChange: (parameters: ScheduleParameterDefinition[]) => void;
  disabled?: boolean;
}

const PARAMETER_TYPES: { value: ScheduleParameterType; label: string; icon: React.ReactNode }[] = [
  { value: 'string', label: 'Text', icon: <Type className="w-4 h-4" /> },
  { value: 'choice', label: 'Choice', icon: <List className="w-4 h-4" /> },
  { value: 'boolean', label: 'Boolean', icon: <ToggleLeft className="w-4 h-4" /> },
  { value: 'number', label: 'Number', icon: <Hash className="w-4 h-4" /> },
];

const getDefaultValueForType = (type: ScheduleParameterType): string | number | boolean => {
  switch (type) {
    case 'boolean': return false;
    case 'number': return 0;
    case 'choice': return '';
    default: return '';
  }
};

interface ParameterEditorProps {
  parameter: ScheduleParameterDefinition;
  onSave: (param: ScheduleParameterDefinition) => void;
  onCancel: () => void;
  isNew?: boolean;
}

const ParameterEditor: React.FC<ParameterEditorProps> = ({
  parameter,
  onSave,
  onCancel,
  isNew = false,
}) => {
  const [param, setParam] = useState<ScheduleParameterDefinition>({ ...parameter });
  const [choicesText, setChoicesText] = useState(param.choices?.join('\n') || '');

  const updateParam = <K extends keyof ScheduleParameterDefinition>(
    key: K,
    value: ScheduleParameterDefinition[K]
  ) => {
    setParam(prev => ({ ...prev, [key]: value }));
  };

  const handleTypeChange = (type: ScheduleParameterType) => {
    setParam(prev => ({
      ...prev,
      type,
      defaultValue: getDefaultValueForType(type),
      choices: type === 'choice' ? ['Option 1', 'Option 2'] : undefined,
      min: type === 'number' ? 0 : undefined,
      max: type === 'number' ? 100 : undefined,
    }));
    if (type === 'choice') {
      setChoicesText('Option 1\nOption 2');
    }
  };

  const handleSave = () => {
    const finalParam = { ...param };
    if (param.type === 'choice') {
      finalParam.choices = choicesText.split('\n').map(s => s.trim()).filter(Boolean);
      if (finalParam.choices.length > 0 && !finalParam.choices.includes(String(finalParam.defaultValue))) {
        finalParam.defaultValue = finalParam.choices[0];
      }
    }
    onSave(finalParam);
  };

  return (
    <div className="p-4 bg-slate-800/50 border border-slate-600 rounded-lg space-y-4">
      {/* Name and Label */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-xs text-slate-400">Label (display name)</label>
          <input
            type="text"
            value={param.label}
            onChange={(e) => updateParam('label', e.target.value)}
            placeholder="e.g., Browser"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-slate-400">Key (variable name)</label>
          <input
            type="text"
            value={param.name}
            onChange={(e) => updateParam('name', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
            placeholder="e.g., browser"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Type Selection */}
      <div className="space-y-1">
        <label className="block text-xs text-slate-400">Type</label>
        <div className="flex gap-2">
          {PARAMETER_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => handleTypeChange(t.value)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded text-sm border transition-colors
                ${param.type === t.value
                  ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                }
              `}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Type-specific options */}
      {param.type === 'choice' && (
        <div className="space-y-1">
          <label className="block text-xs text-slate-400">Choices (one per line)</label>
          <textarea
            value={choicesText}
            onChange={(e) => setChoicesText(e.target.value)}
            rows={3}
            placeholder="Option 1&#10;Option 2&#10;Option 3"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {param.type === 'number' && (
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">Min</label>
            <input
              type="number"
              value={param.min ?? ''}
              onChange={(e) => updateParam('min', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">Max</label>
            <input
              type="number"
              value={param.max ?? ''}
              onChange={(e) => updateParam('max', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">Step</label>
            <input
              type="number"
              value={param.step ?? ''}
              onChange={(e) => updateParam('step', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {param.type === 'string' && (
        <div className="space-y-1">
          <label className="block text-xs text-slate-400">Placeholder</label>
          <input
            type="text"
            value={param.placeholder ?? ''}
            onChange={(e) => updateParam('placeholder', e.target.value || undefined)}
            placeholder="e.g., Enter URL..."
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Default Value */}
      <div className="space-y-1">
        <label className="block text-xs text-slate-400">Default Value</label>
        {param.type === 'boolean' ? (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(param.defaultValue)}
              onChange={(e) => updateParam('defaultValue', e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600"
            />
            <span className="text-sm text-slate-300">Checked by default</span>
          </label>
        ) : param.type === 'choice' ? (
          <select
            value={String(param.defaultValue)}
            onChange={(e) => updateParam('defaultValue', e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {choicesText.split('\n').map(s => s.trim()).filter(Boolean).map(choice => (
              <option key={choice} value={choice}>{choice}</option>
            ))}
          </select>
        ) : param.type === 'number' ? (
          <input
            type="number"
            value={Number(param.defaultValue)}
            onChange={(e) => updateParam('defaultValue', Number(e.target.value))}
            min={param.min}
            max={param.max}
            step={param.step}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <input
            type="text"
            value={String(param.defaultValue)}
            onChange={(e) => updateParam('defaultValue', e.target.value)}
            placeholder={param.placeholder}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label className="block text-xs text-slate-400">Description (optional)</label>
        <input
          type="text"
          value={param.description ?? ''}
          onChange={(e) => updateParam('description', e.target.value || undefined)}
          placeholder="Help text for this parameter"
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Required checkbox */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={param.required ?? false}
          onChange={(e) => updateParam('required', e.target.checked || undefined)}
          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600"
        />
        <span className="text-sm text-slate-300">Required</span>
      </label>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!param.name || !param.label}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
          {isNew ? 'Add Parameter' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export const ParameterBuilder: React.FC<ParameterBuilderProps> = ({
  parameters,
  onChange,
  disabled = false,
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const addParameter = (param: ScheduleParameterDefinition) => {
    onChange([...parameters, param]);
    setIsAddingNew(false);
  };

  const updateParameter = (index: number, param: ScheduleParameterDefinition) => {
    const updated = [...parameters];
    updated[index] = param;
    onChange(updated);
    setEditingIndex(null);
  };

  const removeParameter = (index: number) => {
    onChange(parameters.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
    if (expandedIndex === index) setExpandedIndex(null);
  };

  const getTypeIcon = (type: ScheduleParameterType) => {
    const found = PARAMETER_TYPES.find(t => t.value === type);
    return found?.icon || <Type className="w-4 h-4" />;
  };

  if (isAddingNew) {
    return (
      <div className="space-y-3">
        <div className="text-sm font-medium text-slate-300">Add New Parameter</div>
        <ParameterEditor
          parameter={{
            name: '',
            type: 'string',
            label: '',
            defaultValue: '',
          }}
          onSave={addParameter}
          onCancel={() => setIsAddingNew(false)}
          isNew
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {parameters.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-slate-700 rounded-lg">
          <p className="text-sm text-slate-400 mb-2">No parameters defined</p>
          <p className="text-xs text-slate-500 mb-4">
            Add parameters to allow customization when running this schedule
          </p>
          <button
            type="button"
            onClick={() => setIsAddingNew(true)}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-300 hover:border-slate-600 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add Parameter
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {parameters.map((param, index) => (
              <div key={index}>
                {editingIndex === index ? (
                  <ParameterEditor
                    parameter={param}
                    onSave={(p) => updateParameter(index, p)}
                    onCancel={() => setEditingIndex(null)}
                  />
                ) : (
                  <div
                    className={`
                      flex items-center gap-2 p-3 bg-slate-800/50 border border-slate-700 rounded-lg
                      ${expandedIndex === index ? 'rounded-b-none' : ''}
                    `}
                  >
                    <GripVertical className="w-4 h-4 text-slate-600 cursor-grab" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-200">{param.label}</span>
                        <code className="text-xs text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">
                          ${param.name}
                        </code>
                      </div>
                      {param.description && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{param.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-slate-500">
                      {getTypeIcon(param.type)}
                      <span className="text-xs">{param.type}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                      disabled={disabled}
                      className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
                    >
                      {expandedIndex === index ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingIndex(index)}
                      disabled={disabled}
                      className="p-1 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => removeParameter(index)}
                      disabled={disabled}
                      className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Expanded details */}
                {expandedIndex === index && editingIndex !== index && (
                  <div className="p-3 bg-slate-800/30 border border-t-0 border-slate-700 rounded-b-lg text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-500">Default:</span>
                        <span className="ml-2 text-slate-300">
                          {param.type === 'boolean'
                            ? (param.defaultValue ? 'true' : 'false')
                            : String(param.defaultValue) || '(empty)'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Required:</span>
                        <span className="ml-2 text-slate-300">{param.required ? 'Yes' : 'No'}</span>
                      </div>
                      {param.type === 'choice' && param.choices && (
                        <div className="col-span-2">
                          <span className="text-slate-500">Choices:</span>
                          <span className="ml-2 text-slate-300">{param.choices.join(', ')}</span>
                        </div>
                      )}
                      {param.type === 'number' && (
                        <div className="col-span-2">
                          <span className="text-slate-500">Range:</span>
                          <span className="ml-2 text-slate-300">
                            {param.min ?? '∞'} to {param.max ?? '∞'}
                            {param.step && ` (step: ${param.step})`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsAddingNew(true)}
            disabled={disabled}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add Parameter
          </button>
        </>
      )}
    </div>
  );
};

export default ParameterBuilder;
