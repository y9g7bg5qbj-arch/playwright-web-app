/**
 * EnvironmentManager - Postman-style environment variable manager
 */
import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Eye,
  EyeOff,
  Copy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Modal, Button } from '@/components/ui';

interface Variable {
  key: string;
  value: string;
  isSecret: boolean;
}

interface Environment {
  id: string;
  name: string;
  variables: Variable[];
  isActive: boolean;
}

interface EnvironmentManagerProps {
  userId?: string;
  onClose: () => void;
}

export const EnvironmentManager: React.FC<EnvironmentManagerProps> = ({
  onClose,
}) => {
  // Local state for environments
  const [environments, setEnvironments] = useState<Environment[]>([
    { id: 'dev', name: 'Development', variables: [{ key: 'BASE_URL', value: 'http://localhost:3000', isSecret: false }], isActive: true },
    { id: 'staging', name: 'Staging', variables: [{ key: 'BASE_URL', value: 'https://staging.example.com', isSecret: false }], isActive: false },
  ]);
  const [activeEnvironmentId, setActiveEnvironmentId] = useState<string>('dev');
  const [showNewEnvInput, setShowNewEnvInput] = useState(false);
  const [newEnvName, setNewEnvName] = useState('');
  const [expandedEnvs, setExpandedEnvs] = useState<Set<string>>(new Set(['dev']));
  const [editingVar, setEditingVar] = useState<{ envId: string; key: string } | null>(null);
  const [editValues, setEditValues] = useState<Variable | null>(null);
  const [showSecrets, setShowSecrets] = useState<Set<string>>(new Set());

  const onAddEnvironment = (name: string) => {
    const newEnv: Environment = { id: Date.now().toString(), name, variables: [], isActive: false };
    setEnvironments([...environments, newEnv]);
  };

  const onDeleteEnvironment = (id: string) => {
    setEnvironments(environments.filter(e => e.id !== id));
  };

  const onSelectEnvironment = (id: string) => {
    setActiveEnvironmentId(id);
  };

  const onUpdateVariable = (envId: string, key: string, value: string, isSecret: boolean) => {
    setEnvironments(environments.map(env => {
      if (env.id !== envId) return env;
      const varIdx = env.variables.findIndex(v => v.key === key);
      if (varIdx === -1) {
        return { ...env, variables: [...env.variables, { key, value, isSecret }] };
      }
      const newVars = [...env.variables];
      newVars[varIdx] = { key, value, isSecret };
      return { ...env, variables: newVars };
    }));
  };

  const onAddVariable = (envId: string) => {
    setEnvironments(environments.map(env => {
      if (env.id !== envId) return env;
      return { ...env, variables: [...env.variables, { key: '', value: '', isSecret: false }] };
    }));
  };

  const onDeleteVariable = (envId: string, key: string) => {
    setEnvironments(environments.map(env => {
      if (env.id !== envId) return env;
      return { ...env, variables: env.variables.filter(v => v.key !== key) };
    }));
  };

  const toggleExpand = (envId: string) => {
    const next = new Set(expandedEnvs);
    if (next.has(envId)) {
      next.delete(envId);
    } else {
      next.add(envId);
    }
    setExpandedEnvs(next);
  };

  const toggleShowSecret = (key: string) => {
    const next = new Set(showSecrets);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setShowSecrets(next);
  };

  const handleCreateEnv = () => {
    if (newEnvName.trim()) {
      onAddEnvironment(newEnvName.trim());
      setNewEnvName('');
      setShowNewEnvInput(false);
    }
  };

  const startEditVar = (envId: string, variable: Variable) => {
    setEditingVar({ envId, key: variable.key });
    setEditValues({ ...variable });
  };

  const cancelEditVar = () => {
    setEditingVar(null);
    setEditValues(null);
  };

  const saveEditVar = () => {
    if (editingVar && editValues) {
      onUpdateVariable(editingVar.envId, editValues.key, editValues.value, editValues.isSecret);
      setEditingVar(null);
      setEditValues(null);
    }
  };

  const copyValue = (value: string) => {
    navigator.clipboard.writeText(value);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Environment Variables"
      description="Manage test execution environments"
      size="2xl"
      bodyClassName="max-h-[70vh]"
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
    >
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setShowNewEnvInput(true)}
          className="flex items-center gap-1 text-sm text-status-info hover:text-status-info"
        >
          <Plus className="w-4 h-4" />
          New
        </button>
      </div>

      {/* New Environment Input */}
      {showNewEnvInput && (
        <div className="px-4 py-2 border-b border-border-default bg-dark-elevated/50">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newEnvName}
              onChange={(e) => setNewEnvName(e.target.value)}
              placeholder="Environment name..."
              className="flex-1 bg-dark-elevated border border-border-default rounded px-2 py-1 text-sm text-text-primary focus:outline-none focus:border-status-info"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateEnv();
                if (e.key === 'Escape') setShowNewEnvInput(false);
              }}
            />
            <button onClick={handleCreateEnv} className="p-1 text-status-success hover:text-status-success">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => setShowNewEnvInput(false)} className="p-1 text-status-danger hover:text-status-danger">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Environments List */}
      <div className="flex-1 overflow-y-auto">
        {environments.map((env) => (
          <div key={env.id} className="border-b border-border-default">
            {/* Environment Header */}
            <div
              className={`flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-dark-elevated/50 ${
                activeEnvironmentId === env.id ? 'bg-status-info/10 border-l-2 border-status-info' : ''
              }`}
              onClick={() => toggleExpand(env.id)}
            >
              <div className="flex items-center gap-2">
                {expandedEnvs.has(env.id) ? (
                  <ChevronUp className="w-4 h-4 text-text-secondary" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-text-secondary" />
                )}
                <span className="font-medium text-text-primary">{env.name}</span>
                <span className="text-xs text-text-secondary">({env.variables.length} vars)</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectEnvironment(env.id);
                  }}
                  className={`px-2 py-0.5 text-xs rounded ${
                    activeEnvironmentId === env.id
                      ? 'bg-brand-primary text-white'
                      : 'bg-dark-elevated text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {activeEnvironmentId === env.id ? 'Active' : 'Use'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteEnvironment(env.id);
                  }}
                  className="p-1 text-text-secondary hover:text-status-danger"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Variables */}
            {expandedEnvs.has(env.id) && (
              <div className="px-4 py-2 bg-dark-bg/50">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-text-secondary">
                      <th className="text-left py-1">Key</th>
                      <th className="text-left py-1">Value</th>
                      <th className="w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {env.variables.map((variable) => (
                      <tr key={variable.key} className="border-t border-border-default/50">
                        {editingVar?.envId === env.id && editingVar?.key === variable.key ? (
                          <>
                            <td className="py-1.5">
                              <input
                                value={editValues?.key || ''}
                                onChange={(e) =>
                                  setEditValues((prev) => prev && { ...prev, key: e.target.value })
                                }
                                className="w-full bg-dark-elevated border border-border-default rounded px-2 py-1 text-sm text-text-primary"
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <div className="flex items-center gap-1">
                                <input
                                  type={editValues?.isSecret ? 'password' : 'text'}
                                  value={editValues?.value || ''}
                                  onChange={(e) =>
                                    setEditValues((prev) => prev && { ...prev, value: e.target.value })
                                  }
                                  className="flex-1 bg-dark-elevated border border-border-default rounded px-2 py-1 text-sm text-text-primary"
                                />
                                <label className="flex items-center gap-1 text-xs text-text-secondary">
                                  <input
                                    type="checkbox"
                                    checked={editValues?.isSecret || false}
                                    onChange={(e) =>
                                      setEditValues((prev) => prev && { ...prev, isSecret: e.target.checked })
                                    }
                                    className="rounded"
                                  />
                                  Secret
                                </label>
                              </div>
                            </td>
                            <td className="py-1.5 text-right">
                              <button onClick={saveEditVar} className="p-1 text-status-success">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={cancelEditVar} className="p-1 text-status-danger">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-1.5 text-text-primary">{variable.key}</td>
                            <td className="py-1.5 px-2 text-text-secondary">
                              <div className="flex items-center gap-1">
                                <span className="truncate max-w-[150px]">
                                  {variable.isSecret && !showSecrets.has(variable.key)
                                    ? '••••••••'
                                    : variable.value}
                                </span>
                                {variable.isSecret && (
                                  <button
                                    onClick={() => toggleShowSecret(variable.key)}
                                    className="p-0.5 text-text-secondary hover:text-text-primary"
                                  >
                                    {showSecrets.has(variable.key) ? (
                                      <EyeOff className="w-3.5 h-3.5" />
                                    ) : (
                                      <Eye className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-1.5 text-right">
                              <button
                                onClick={() => copyValue(variable.value)}
                                className="p-1 text-text-secondary hover:text-text-primary"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => startEditVar(env.id, variable)}
                                className="p-1 text-text-secondary hover:text-status-info"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteVariable(env.id, variable.key)}
                                className="p-1 text-text-secondary hover:text-status-danger"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  onClick={() => onAddVariable(env.id)}
                  className="mt-2 flex items-center gap-1 text-xs text-status-info hover:text-status-info"
                >
                  <Plus className="w-3 h-3" />
                  Add Variable
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
};

export default EnvironmentManager;
