/**
 * EnvironmentManager - Postman-style environment management modal
 *
 * Allows users to create, edit, and delete environments and their variables.
 * Variables can be marked as secrets (values masked in UI).
 */

import { useState, useEffect } from 'react';
import { useEnvironmentStore } from '@/store/environmentStore';
import type { EnvVariable } from '@/api/environments';
import { IconButton, PanelHeader, EmptyState, Modal, Button } from '@/components/ui';

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

  return (
    <Modal
      isOpen={isManagerOpen}
      onClose={() => setManagerOpen(false)}
      title="Manage Environments"
      size="full"
      bodyClassName="max-h-[75vh]"
      footer={
        <Button variant="secondary" onClick={() => setManagerOpen(false)}>Close</Button>
      }
    >
        {/* Error Banner */}
        {error && (
          <div className="mx-6 mt-4 px-4 py-3 bg-status-danger/10 border border-status-danger/30 rounded-md">
            <div className="flex items-center gap-2 text-status-danger">
              <span className="material-symbols-outlined text-xl">error</span>
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex flex-1 min-h-0">
          {/* Left Panel - Environment List */}
          <div className="w-64 border-r border-border-default flex flex-col">
            {/* Environment List Header */}
            <PanelHeader
              title="Environments"
              actions={
                <IconButton
                  icon={<span className="material-symbols-outlined text-xl">add</span>}
                  size="sm"
                  tooltip="New Environment"
                  onClick={() => setIsCreatingEnv(true)}
                />
              }
              className="h-auto px-4 py-3"
            />

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
                    className="w-full px-3 py-2 text-sm bg-dark-canvas border border-border-default rounded-md text-white placeholder-text-muted focus:outline-none focus:border-brand-secondary"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleCreateEnvironment}
                      disabled={!newEnvName.trim()}
                      className="flex-1 px-3 py-1.5 text-xs bg-status-success hover:bg-status-success/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setIsCreatingEnv(false);
                        setNewEnvName('');
                      }}
                      className="flex-1 px-3 py-1.5 text-xs bg-dark-elevated hover:bg-border-default text-white rounded-md transition-colors"
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
                      ? 'bg-dark-elevated'
                      : 'hover:bg-dark-elevated/50'
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
                      className="w-full px-2 py-1 text-sm bg-dark-canvas border border-brand-secondary rounded text-white focus:outline-none"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      {/* Active indicator */}
                      <span className="w-2 h-2 rounded-full shrink-0">
                        {env.isActive && (
                          <span className="block w-2 h-2 rounded-full bg-status-success" />
                        )}
                      </span>

                      {/* Environment name */}
                      <span className="flex-1 text-sm text-white truncate">
                        {env.name}
                      </span>

                      {/* Variable count */}
                      <span className="text-xs text-text-muted">
                        {env.variables.length}
                      </span>

                      {/* Actions (visible on hover) */}
                      <div className="hidden group-hover:flex items-center gap-1">
                        {!env.isActive && (
                          <IconButton
                            icon={<span className="material-symbols-outlined text-base">check_circle</span>}
                            size="sm"
                            tone="success"
                            tooltip="Set as Active"
                            onClick={(e) => {
                              e.stopPropagation();
                              activateEnvironment(env.id);
                            }}
                            className="hover:bg-border-default"
                          />
                        )}
                        <IconButton
                          icon={<span className="material-symbols-outlined text-base">edit</span>}
                          size="sm"
                          tooltip="Rename"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingEnvName(env.id);
                            setEditedName(env.name);
                          }}
                          className="hover:bg-border-default"
                        />
                        <IconButton
                          icon={<span className="material-symbols-outlined text-base">delete</span>}
                          size="sm"
                          tone="danger"
                          tooltip="Delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEnvironment(env.id);
                          }}
                          className="hover:bg-border-default"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Empty State */}
              {environments.length === 0 && !isCreatingEnv && (
                <EmptyState
                  icon={<span className="material-symbols-outlined text-4xl text-border-default">folder_off</span>}
                  title="No environments yet"
                  action={
                    <button
                      onClick={() => setIsCreatingEnv(true)}
                      className="px-4 py-2 text-sm bg-status-success hover:bg-status-success/90 text-white rounded-md transition-colors"
                    >
                      Create Environment
                    </button>
                  }
                  compact
                  className="px-4"
                />
              )}
            </div>
          </div>

          {/* Right Panel - Variables Editor */}
          <div className="flex-1 flex flex-col min-w-0">
            {selectedEnv ? (
              <>
                {/* Variables Header */}
                <div className="px-6 py-4 border-b border-border-default">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium flex items-center gap-2">
                        {selectedEnv.name}
                        {selectedEnv.isActive && (
                          <span className="px-2 py-0.5 text-xs bg-status-success/20 text-status-success rounded-full">
                            Active
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-text-secondary mt-1">
                        {selectedEnv.variables.length} variable
                        {selectedEnv.variables.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {!selectedEnv.isActive && (
                      <button
                        onClick={() => activateEnvironment(selectedEnv.id)}
                        className="px-3 py-1.5 text-sm bg-dark-elevated hover:bg-border-default text-white rounded-md transition-colors flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-lg">
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
                    <thead className="sticky top-0 bg-dark-card">
                      <tr className="border-b border-border-default">
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider w-1/3">
                          Variable
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Value
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider w-20">
                          Secret
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider w-24">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Existing Variables */}
                      {selectedEnv.variables.map((variable) => (
                        <tr
                          key={variable.id}
                          className="border-b border-border-muted hover:bg-dark-elevated/30"
                        >
                          {editingVarId === variable.id ? (
                            <>
                              <td className="px-6 py-3">
                                <input
                                  type="text"
                                  value={editedVarKey}
                                  onChange={(e) => setEditedVarKey(e.target.value)}
                                  className="w-full px-2 py-1 text-sm bg-dark-canvas border border-border-default rounded text-white focus:outline-none focus:border-brand-secondary"
                                />
                              </td>
                              <td className="px-6 py-3">
                                <input
                                  type={editedVarIsSecret ? 'password' : 'text'}
                                  value={editedVarValue}
                                  onChange={(e) => setEditedVarValue(e.target.value)}
                                  className="w-full px-2 py-1 text-sm bg-dark-canvas border border-border-default rounded text-white focus:outline-none focus:border-brand-secondary"
                                />
                              </td>
                              <td className="px-6 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={editedVarIsSecret}
                                  onChange={(e) => setEditedVarIsSecret(e.target.checked)}
                                  className="w-4 h-4 rounded border-border-default bg-dark-canvas text-brand-secondary focus:ring-brand-secondary"
                                />
                              </td>
                              <td className="px-6 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <IconButton
                                    icon={<span className="material-symbols-outlined text-lg">check</span>}
                                    size="sm"
                                    tone="success"
                                    tooltip="Save"
                                    onClick={() => handleUpdateVariable(variable.id)}
                                    className="hover:bg-status-success/20"
                                  />
                                  <IconButton
                                    icon={<span className="material-symbols-outlined text-lg">close</span>}
                                    size="sm"
                                    tooltip="Cancel"
                                    onClick={() => setEditingVarId(null)}
                                    className="hover:bg-dark-elevated"
                                  />
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-6 py-3">
                                <span className="text-sm font-mono text-brand-secondary">
                                  {variable.key}
                                </span>
                              </td>
                              <td className="px-6 py-3">
                                <div className="flex items-center gap-2">
                                  {variable.isSecret && !showSecrets.has(variable.id) ? (
                                    <span className="text-sm font-mono text-text-muted">
                                      ••••••••
                                    </span>
                                  ) : (
                                    <span className="text-sm font-mono text-text-primary">
                                      {variable.value || (
                                        <span className="italic text-text-muted">empty</span>
                                      )}
                                    </span>
                                  )}
                                  {variable.isSecret && (
                                    <IconButton
                                      icon={
                                        <span className="material-symbols-outlined text-base">
                                          {showSecrets.has(variable.id)
                                            ? 'visibility_off'
                                            : 'visibility'}
                                        </span>
                                      }
                                      size="sm"
                                      tooltip={showSecrets.has(variable.id) ? 'Hide' : 'Show'}
                                      onClick={() => toggleShowSecret(variable.id)}
                                      className="hover:bg-dark-elevated"
                                    />
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-3 text-center">
                                {variable.isSecret && (
                                  <span className="material-symbols-outlined text-lg text-status-warning">
                                    lock
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <IconButton
                                    icon={<span className="material-symbols-outlined text-lg">edit</span>}
                                    size="sm"
                                    tooltip="Edit"
                                    onClick={() => startEditingVariable(variable)}
                                    className="hover:bg-dark-elevated"
                                  />
                                  <IconButton
                                    icon={<span className="material-symbols-outlined text-lg">delete</span>}
                                    size="sm"
                                    tone="danger"
                                    tooltip="Delete"
                                    onClick={() => handleDeleteVariable(variable.id)}
                                    className="hover:bg-dark-elevated"
                                  />
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}

                      {/* New Variable Row */}
                      <tr className="border-b border-border-muted bg-dark-canvas/50">
                        <td className="px-6 py-3">
                          <input
                            type="text"
                            value={newVarKey}
                            onChange={(e) => setNewVarKey(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddVariable();
                            }}
                            placeholder="VARIABLE_NAME"
                            className="w-full px-2 py-1 text-sm bg-transparent border border-border-default rounded text-white placeholder-text-muted focus:outline-none focus:border-brand-secondary font-mono"
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
                            className="w-full px-2 py-1 text-sm bg-transparent border border-border-default rounded text-white placeholder-text-muted focus:outline-none focus:border-brand-secondary font-mono"
                          />
                        </td>
                        <td className="px-6 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={newVarIsSecret}
                            onChange={(e) => setNewVarIsSecret(e.target.checked)}
                            className="w-4 h-4 rounded border-border-default bg-dark-canvas text-brand-secondary focus:ring-brand-secondary"
                          />
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button
                            onClick={handleAddVariable}
                            disabled={!newVarKey.trim()}
                            className="px-3 py-1 text-sm bg-status-success hover:bg-status-success/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
                          >
                            Add
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Usage Hint */}
                <div className="px-6 py-3 border-t border-border-default bg-dark-canvas/50">
                  <p className="text-xs text-text-muted">
                    <span className="text-text-secondary">Tip:</span> Use{' '}
                    <code className="px-1.5 py-0.5 bg-dark-elevated rounded text-brand-secondary">
                      {'{{VARIABLE_NAME}}'}
                    </code>{' '}
                    in your Vero scripts to reference these variables.
                  </p>
                </div>
              </>
            ) : (
              /* No Environment Selected */
              <EmptyState
                icon={<span className="material-symbols-outlined text-6xl text-border-default">tune</span>}
                title="Select an environment to view its variables"
                message="or create a new one to get started"
                className="flex-1"
              />
            )}
          </div>
        </div>
    </Modal>
  );
}
