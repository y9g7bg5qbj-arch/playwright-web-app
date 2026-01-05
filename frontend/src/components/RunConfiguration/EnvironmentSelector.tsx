/**
 * EnvironmentSelector - Dropdown for selecting execution environment
 */
import React, { useState } from 'react';
import { Globe, Plus, Check, ChevronDown } from 'lucide-react';
import type { ExecutionEnvironment, ExecutionEnvironmentCreate } from '@playwright-web-app/shared';

interface EnvironmentSelectorProps {
  value: string | undefined;
  onChange: (environmentId: string | undefined) => void;
  environments: ExecutionEnvironment[];
  onCreateNew?: (data: ExecutionEnvironmentCreate) => Promise<void>;
  disabled?: boolean;
  showBaseUrl?: boolean;
}

export const EnvironmentSelector: React.FC<EnvironmentSelectorProps> = ({
  value,
  onChange,
  environments,
  onCreateNew,
  disabled = false,
  showBaseUrl = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEnv, setNewEnv] = useState<ExecutionEnvironmentCreate>({
    name: '',
    slug: '',
    baseUrl: '',
  });

  const selectedEnv = environments.find((e) => e.id === value);

  const handleCreate = async () => {
    if (!onCreateNew || !newEnv.name || !newEnv.slug || !newEnv.baseUrl) return;

    await onCreateNew(newEnv);
    setShowCreateForm(false);
    setNewEnv({ name: '', slug: '', baseUrl: '' });
  };

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-300">Environment</label>

      <div className="relative">
        {/* Selector button */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            w-full flex items-center justify-between px-3 py-2 bg-slate-800 border rounded-lg text-left
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-600 cursor-pointer'}
            ${isOpen ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-slate-700'}
          `}
        >
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-500" />
            {selectedEnv ? (
              <div className="flex flex-col">
                <span className="text-sm text-slate-200">{selectedEnv.name}</span>
                {showBaseUrl && (
                  <span className="text-xs text-slate-500 truncate max-w-[200px]">
                    {selectedEnv.baseUrl}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-sm text-slate-500">Select environment...</span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {isOpen && !disabled && (
          <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden">
            {/* Environment list */}
            <div className="max-h-48 overflow-y-auto">
              {/* No environment option */}
              <button
                type="button"
                onClick={() => {
                  onChange(undefined);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors
                  ${!value ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-700/50'}
                `}
              >
                <span>No environment</span>
                {!value && <Check className="w-4 h-4" />}
              </button>

              {environments.map((env) => (
                <button
                  key={env.id}
                  type="button"
                  onClick={() => {
                    onChange(env.id);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 text-left transition-colors
                    ${env.id === value ? 'bg-blue-600/20 text-blue-400' : 'text-slate-300 hover:bg-slate-700/50'}
                  `}
                >
                  <div className="flex flex-col">
                    <span className="text-sm">{env.name}</span>
                    <span className="text-xs text-slate-500 truncate max-w-[250px]">
                      {env.baseUrl}
                    </span>
                  </div>
                  {env.id === value && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>

            {/* Create new */}
            {onCreateNew && (
              <div className="border-t border-slate-700">
                {showCreateForm ? (
                  <div className="p-3 space-y-2">
                    <input
                      type="text"
                      placeholder="Environment name"
                      value={newEnv.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        setNewEnv({ ...newEnv, name, slug: slugify(name) });
                      }}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Slug (e.g., staging)"
                      value={newEnv.slug}
                      onChange={(e) => setNewEnv({ ...newEnv, slug: slugify(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="url"
                      placeholder="Base URL (https://...)"
                      value={newEnv.baseUrl}
                      onChange={(e) => setNewEnv({ ...newEnv, baseUrl: e.target.value })}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCreate}
                        disabled={!newEnv.name || !newEnv.slug || !newEnv.baseUrl}
                        className="flex-1 px-2 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Create
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateForm(false);
                          setNewEnv({ name: '', slug: '', baseUrl: '' });
                        }}
                        className="px-2 py-1.5 text-sm text-slate-400 hover:text-slate-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-400 hover:bg-slate-700/50"
                  >
                    <Plus className="w-4 h-4" />
                    Create new environment
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnvironmentSelector;
