/**
 * EnvironmentManager - Postman-style environment management modal
 *
 * Allows users to create, edit, and delete environments and their variables.
 * Variables can be marked as secrets (values masked in UI).
 */

import { useState, useEffect } from 'react';
import { useEnvironmentStore } from '@/store/environmentStore';
import type { EnvVariable } from '@/api/environments';

export function EnvironmentManager() {
  const {
    environments,
    isManagerOpen,
    error,
    setManagerOpen,
    createEnvironment,
    updateEnvironment,
    deleteEnvironment,
    activateEnvironment,
    addVariable,
    updateVariable,
    deleteVariable,
  } = useEnvironmentStore();

  // Local state for UI
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [isCreatingEnv, setIsCreatingEnv] = useState(false);
  const [newEnvName, setNewEnvName] = useState('');
  const [editingEnvName, setEditingEnvName] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');

  // Variable editing state
  const [newVarKey, setNewVarKey] = useState('');
  const [newVarValue, setNewVarValue] = useState('');
  const [newVarIsSecret, setNewVarIsSecret] = useState(false);
  const [editingVarId, setEditingVarId] = useState<string | null>(null);
  const [editedVarKey, setEditedVarKey] = useState('');
  const [editedVarValue, setEditedVarValue] = useState('');
  const [editedVarIsSecret, setEditedVarIsSecret] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Set<string>>(new Set());

  // Select first environment on open
  useEffect(() => {
    if (isManagerOpen && environments.length > 0 && !selectedEnvId) {
      setSelectedEnvId(environments[0].id);
    }
  }, [isManagerOpen, environments, selectedEnvId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isManagerOpen) {
      setIsCreatingEnv(false);
      setNewEnvName('');
      setEditingEnvName(null);
      setNewVarKey('');
      setNewVarValue('');
      setNewVarIsSecret(false);
      setEditingVarId(null);
    }
  }, [isManagerOpen]);

  const selectedEnv = environments.find((e) => e.id === selectedEnvId);

  const handleCreateEnvironment = async () => {
    if (!newEnvName.trim()) return;
    try {
      const newEnv = await createEnvironment(newEnvName.trim());
      setSelectedEnvId(newEnv.id);
      setIsCreatingEnv(false);
      setNewEnvName('');
    } catch (err) {
      console.error('Failed to create environment:', err);
    }
  };

  const handleRenameEnvironment = async (envId: string) => {
    if (!editedName.trim()) {
      setEditingEnvName(null);
      return;
    }
    try {
      await updateEnvironment(envId, editedName.trim());
      setEditingEnvName(null);
    } catch (err) {
      console.error('Failed to rename environment:', err);
    }
  };

  const handleDeleteEnvironment = async (envId: string) => {
    if (!confirm('Are you sure you want to delete this environment? This cannot be undone.')) {
      return;
    }
    try {
      await deleteEnvironment(envId);
      if (selectedEnvId === envId) {
        setSelectedEnvId(environments.find((e) => e.id !== envId)?.id || null);
      }
    } catch (err) {
      console.error('Failed to delete environment:', err);
    }
  };

  const handleAddVariable = async () => {
    if (!selectedEnvId || !newVarKey.trim()) return;
    try {
      await addVariable(selectedEnvId, newVarKey.trim(), newVarValue, newVarIsSecret);
      setNewVarKey('');
      setNewVarValue('');
      setNewVarIsSecret(false);
    } catch (err) {
      console.error('Failed to add variable:', err);
    }
  };

  const handleUpdateVariable = async (varId: string) => {
    if (!selectedEnvId || !editedVarKey.trim()) {
      setEditingVarId(null);
      return;
    }
    try {
      await updateVariable(selectedEnvId, varId, {
        key: editedVarKey.trim(),
        value: editedVarValue,
        isSecret: editedVarIsSecret,
      });
      setEditingVarId(null);
    } catch (err) {
      console.error('Failed to update variable:', err);
    }
  };

  const handleDeleteVariable = async (varId: string) => {
    if (!selectedEnvId) return;
    try {
      await deleteVariable(selectedEnvId, varId);
    } catch (err) {
      console.error('Failed to delete variable:', err);
    }
  };

  const startEditingVariable = (variable: EnvVariable) => {
    setEditingVarId(variable.id);
    setEditedVarKey(variable.key);
    setEditedVarValue(variable.value);
    setEditedVarIsSecret(variable.isSecret);
  };

  const toggleShowSecret = (varId: string) => {
    setShowSecrets((prev) => {
      const next = new Set(prev);
      if (next.has(varId)) {
        next.delete(varId);
      } else {
        next.add(varId);
      }
      return next;
    });
  };

  if (!isManagerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setManagerOpen(false)}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363d]">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[24px] text-[#58a6ff]">
              settings_applications
            </span>
            <h2 className="text-lg font-semibold text-white">Manage Environments</h2>
          </div>
          <button
            onClick={() => setManagerOpen(false)}
            className="p-2 rounded-md hover:bg-[#21262d] text-[#8b949e] hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-6 mt-4 px-4 py-3 bg-[#da3633]/10 border border-[#da3633]/30 rounded-md">
            <div className="flex items-center gap-2 text-[#f85149]">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex flex-1 min-h-0">
          {/* Left Panel - Environment List */}
          <div className="w-64 border-r border-[#30363d] flex flex-col">
            {/* Environment List Header */}
            <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between">
              <span className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">
                Environments
              </span>
              <button
                onClick={() => setIsCreatingEnv(true)}
                className="p-1 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-white transition-colors"
                title="New Environment"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
            </div>

            {/* Environment List */}
            <div className="flex-1 overflow-y-auto py-2">
              {/* New Environment Input */}
              {isCreatingEnv && (
                <div className="px-3 py-2">
                  <input
                    type="text"
                    value={newEnvName}
                    onChange={(e) => setNewEnvName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateEnvironment();
                      if (e.key === 'Escape') {
                        setIsCreatingEnv(false);
                        setNewEnvName('');
                      }
                    }}
                    placeholder="Environment name..."
                    className="w-full px-3 py-2 text-sm bg-[#0d1117] border border-[#30363d] rounded-md text-white placeholder-[#6e7681] focus:outline-none focus:border-[#58a6ff]"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleCreateEnvironment}
                      disabled={!newEnvName.trim()}
                      className="flex-1 px-3 py-1.5 text-xs bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setIsCreatingEnv(false);
                        setNewEnvName('');
                      }}
                      className="flex-1 px-3 py-1.5 text-xs bg-[#21262d] hover:bg-[#30363d] text-white rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Environment Items */}
              {environments.map((env) => (
                <div
                  key={env.id}
                  className={`group relative px-3 py-2 cursor-pointer transition-colors ${
                    selectedEnvId === env.id
                      ? 'bg-[#21262d]'
                      : 'hover:bg-[#21262d]/50'
                  }`}
                  onClick={() => setSelectedEnvId(env.id)}
                >
                  {editingEnvName === env.id ? (
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameEnvironment(env.id);
                        if (e.key === 'Escape') setEditingEnvName(null);
                      }}
                      onBlur={() => handleRenameEnvironment(env.id)}
                      className="w-full px-2 py-1 text-sm bg-[#0d1117] border border-[#58a6ff] rounded text-white focus:outline-none"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      {/* Active indicator */}
                      <span className="w-2 h-2 rounded-full shrink-0">
                        {env.isActive && (
                          <span className="block w-2 h-2 rounded-full bg-[#238636]" />
                        )}
                      </span>

                      {/* Environment name */}
                      <span className="flex-1 text-sm text-white truncate">
                        {env.name}
                      </span>

                      {/* Variable count */}
                      <span className="text-xs text-[#6e7681]">
                        {env.variables.length}
                      </span>

                      {/* Actions (visible on hover) */}
                      <div className="hidden group-hover:flex items-center gap-1">
                        {!env.isActive && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              activateEnvironment(env.id);
                            }}
                            className="p-1 rounded hover:bg-[#30363d] text-[#8b949e] hover:text-[#238636] transition-colors"
                            title="Set as Active"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              check_circle
                            </span>
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingEnvName(env.id);
                            setEditedName(env.name);
                          }}
                          className="p-1 rounded hover:bg-[#30363d] text-[#8b949e] hover:text-white transition-colors"
                          title="Rename"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            edit
                          </span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEnvironment(env.id);
                          }}
                          className="p-1 rounded hover:bg-[#30363d] text-[#8b949e] hover:text-[#f85149] transition-colors"
                          title="Delete"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            delete
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Empty State */}
              {environments.length === 0 && !isCreatingEnv && (
                <div className="px-4 py-8 text-center">
                  <span className="material-symbols-outlined text-4xl text-[#30363d] mb-2 block">
                    folder_off
                  </span>
                  <p className="text-sm text-[#8b949e] mb-3">No environments yet</p>
                  <button
                    onClick={() => setIsCreatingEnv(true)}
                    className="px-4 py-2 text-sm bg-[#238636] hover:bg-[#2ea043] text-white rounded-md transition-colors"
                  >
                    Create Environment
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Variables Editor */}
          <div className="flex-1 flex flex-col min-w-0">
            {selectedEnv ? (
              <>
                {/* Variables Header */}
                <div className="px-6 py-4 border-b border-[#30363d]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium flex items-center gap-2">
                        {selectedEnv.name}
                        {selectedEnv.isActive && (
                          <span className="px-2 py-0.5 text-xs bg-[#238636]/20 text-[#3fb950] rounded-full">
                            Active
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-[#8b949e] mt-1">
                        {selectedEnv.variables.length} variable
                        {selectedEnv.variables.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {!selectedEnv.isActive && (
                      <button
                        onClick={() => activateEnvironment(selectedEnv.id)}
                        className="px-3 py-1.5 text-sm bg-[#21262d] hover:bg-[#30363d] text-white rounded-md transition-colors flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          check_circle
                        </span>
                        Set as Active
                      </button>
                    )}
                  </div>
                </div>

                {/* Variables Table */}
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-[#161b22]">
                      <tr className="border-b border-[#30363d]">
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#8b949e] uppercase tracking-wider w-1/3">
                          Variable
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#8b949e] uppercase tracking-wider">
                          Value
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-[#8b949e] uppercase tracking-wider w-20">
                          Secret
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-[#8b949e] uppercase tracking-wider w-24">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Existing Variables */}
                      {selectedEnv.variables.map((variable) => (
                        <tr
                          key={variable.id}
                          className="border-b border-[#21262d] hover:bg-[#21262d]/30"
                        >
                          {editingVarId === variable.id ? (
                            <>
                              <td className="px-6 py-3">
                                <input
                                  type="text"
                                  value={editedVarKey}
                                  onChange={(e) => setEditedVarKey(e.target.value)}
                                  className="w-full px-2 py-1 text-sm bg-[#0d1117] border border-[#30363d] rounded text-white focus:outline-none focus:border-[#58a6ff]"
                                />
                              </td>
                              <td className="px-6 py-3">
                                <input
                                  type={editedVarIsSecret ? 'password' : 'text'}
                                  value={editedVarValue}
                                  onChange={(e) => setEditedVarValue(e.target.value)}
                                  className="w-full px-2 py-1 text-sm bg-[#0d1117] border border-[#30363d] rounded text-white focus:outline-none focus:border-[#58a6ff]"
                                />
                              </td>
                              <td className="px-6 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={editedVarIsSecret}
                                  onChange={(e) => setEditedVarIsSecret(e.target.checked)}
                                  className="w-4 h-4 rounded border-[#30363d] bg-[#0d1117] text-[#58a6ff] focus:ring-[#58a6ff]"
                                />
                              </td>
                              <td className="px-6 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => handleUpdateVariable(variable.id)}
                                    className="p-1 rounded hover:bg-[#238636]/20 text-[#3fb950] transition-colors"
                                    title="Save"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">
                                      check
                                    </span>
                                  </button>
                                  <button
                                    onClick={() => setEditingVarId(null)}
                                    className="p-1 rounded hover:bg-[#21262d] text-[#8b949e] transition-colors"
                                    title="Cancel"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">
                                      close
                                    </span>
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-6 py-3">
                                <span className="text-sm font-mono text-[#58a6ff]">
                                  {variable.key}
                                </span>
                              </td>
                              <td className="px-6 py-3">
                                <div className="flex items-center gap-2">
                                  {variable.isSecret && !showSecrets.has(variable.id) ? (
                                    <span className="text-sm font-mono text-[#6e7681]">
                                      ••••••••
                                    </span>
                                  ) : (
                                    <span className="text-sm font-mono text-[#c9d1d9]">
                                      {variable.value || (
                                        <span className="italic text-[#6e7681]">empty</span>
                                      )}
                                    </span>
                                  )}
                                  {variable.isSecret && (
                                    <button
                                      onClick={() => toggleShowSecret(variable.id)}
                                      className="p-1 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-white transition-colors"
                                      title={showSecrets.has(variable.id) ? 'Hide' : 'Show'}
                                    >
                                      <span className="material-symbols-outlined text-[14px]">
                                        {showSecrets.has(variable.id)
                                          ? 'visibility_off'
                                          : 'visibility'}
                                      </span>
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-3 text-center">
                                {variable.isSecret && (
                                  <span className="material-symbols-outlined text-[16px] text-[#f0883e]">
                                    lock
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => startEditingVariable(variable)}
                                    className="p-1 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-white transition-colors"
                                    title="Edit"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">
                                      edit
                                    </span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteVariable(variable.id)}
                                    className="p-1 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-[#f85149] transition-colors"
                                    title="Delete"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">
                                      delete
                                    </span>
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}

                      {/* New Variable Row */}
                      <tr className="border-b border-[#21262d] bg-[#0d1117]/50">
                        <td className="px-6 py-3">
                          <input
                            type="text"
                            value={newVarKey}
                            onChange={(e) => setNewVarKey(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddVariable();
                            }}
                            placeholder="VARIABLE_NAME"
                            className="w-full px-2 py-1 text-sm bg-transparent border border-[#30363d] rounded text-white placeholder-[#6e7681] focus:outline-none focus:border-[#58a6ff] font-mono"
                          />
                        </td>
                        <td className="px-6 py-3">
                          <input
                            type={newVarIsSecret ? 'password' : 'text'}
                            value={newVarValue}
                            onChange={(e) => setNewVarValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddVariable();
                            }}
                            placeholder="value"
                            className="w-full px-2 py-1 text-sm bg-transparent border border-[#30363d] rounded text-white placeholder-[#6e7681] focus:outline-none focus:border-[#58a6ff] font-mono"
                          />
                        </td>
                        <td className="px-6 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={newVarIsSecret}
                            onChange={(e) => setNewVarIsSecret(e.target.checked)}
                            className="w-4 h-4 rounded border-[#30363d] bg-[#0d1117] text-[#58a6ff] focus:ring-[#58a6ff]"
                          />
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button
                            onClick={handleAddVariable}
                            disabled={!newVarKey.trim()}
                            className="px-3 py-1 text-sm bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
                          >
                            Add
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Usage Hint */}
                <div className="px-6 py-3 border-t border-[#30363d] bg-[#0d1117]/50">
                  <p className="text-xs text-[#6e7681]">
                    <span className="text-[#8b949e]">Tip:</span> Use{' '}
                    <code className="px-1.5 py-0.5 bg-[#21262d] rounded text-[#58a6ff]">
                      {'{{VARIABLE_NAME}}'}
                    </code>{' '}
                    in your Vero scripts to reference these variables.
                  </p>
                </div>
              </>
            ) : (
              /* No Environment Selected */
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <span className="material-symbols-outlined text-6xl text-[#30363d] mb-4 block">
                    tune
                  </span>
                  <p className="text-[#8b949e]">Select an environment to view its variables</p>
                  <p className="text-sm text-[#6e7681] mt-1">
                    or create a new one to get started
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#30363d] bg-[#0d1117]/50">
          <button
            onClick={() => setManagerOpen(false)}
            className="px-4 py-2 text-sm bg-[#21262d] hover:bg-[#30363d] text-white rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
