import { useEffect, useState } from 'react';
import { Plus, Trash2, Copy, Zap } from 'lucide-react';
import type { RunConfiguration } from '@/store/runConfigStore';
import { useRunParameterStore } from '@/store/runParameterStore';
import { useProjectStore } from '@/store/projectStore';
import { Tooltip } from '@/components/ui';
import { runConfigTheme, cx } from './theme';
import type {
  RunParameterDefinition,
  RunParameterType,
} from '@playwright-web-app/shared';

interface ParametersTabProps {
  config: RunConfiguration;
  onChange: <K extends keyof RunConfiguration>(field: K, value: RunConfiguration[K]) => void;
}

const TYPE_OPTIONS: { value: RunParameterType; label: string }[] = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'enum', label: 'Enum' },
];

export function ParametersTab({ config, onChange }: ParametersTabProps) {
  const {
    definitions,
    sets,
    isLoading,
    fetchAll,
    createDefinition,
    updateDefinition,
    deleteDefinition,
    createSet,
    updateSet,
    deleteSet,
    cloneSet,
  } = useRunParameterStore();

  const applicationId = useProjectStore((state) => state.currentProject?.id || null);

  // Inline editing for new definitions
  const [newParamName, setNewParamName] = useState('');
  const [newParamLabel, setNewParamLabel] = useState('');
  const [newParamType, setNewParamType] = useState<RunParameterType>('string');
  const [showNewParam, setShowNewParam] = useState(false);

  // New set creation
  const [newSetName, setNewSetName] = useState('');
  const [showNewSet, setShowNewSet] = useState(false);

  useEffect(() => {
    if (applicationId) {
      fetchAll(applicationId);
    }
  }, [applicationId, fetchAll]);

  const selectedSetId = config.parameterSetId;
  const selectedSet = sets.find((s) => s.id === selectedSetId);
  const overrides = config.parameterOverrides || {};

  const handleAddDefinition = async () => {
    if (!newParamName.trim() || !newParamLabel.trim()) return;
    await createDefinition({
      name: newParamName.trim(),
      label: newParamLabel.trim(),
      type: newParamType,
    });
    setNewParamName('');
    setNewParamLabel('');
    setNewParamType('string');
    setShowNewParam(false);
  };

  const handleDeleteDefinition = async (id: string) => {
    await deleteDefinition(id);
  };

  const handleSetValueChange = async (paramName: string, value: string) => {
    if (!selectedSet) return;
    await updateSet(selectedSet.id, {
      values: { ...selectedSet.values, [paramName]: value },
    });
  };

  const handleOverrideChange = (paramName: string, value: string) => {
    const next = { ...overrides };
    if (value === '') {
      delete next[paramName];
    } else {
      next[paramName] = value;
    }
    onChange('parameterOverrides', Object.keys(next).length > 0 ? next : undefined);
  };

  const handleSelectSet = (setId: string) => {
    onChange('parameterSetId', setId || undefined);
  };

  const handleCreateSet = async () => {
    if (!newSetName.trim()) return;
    const created = await createSet({ name: newSetName.trim() });
    onChange('parameterSetId', created.id);
    setNewSetName('');
    setShowNewSet(false);
  };

  const handleCloneSet = async () => {
    if (!selectedSetId) return;
    const cloned = await cloneSet(selectedSetId);
    onChange('parameterSetId', cloned.id);
  };

  const handleDeleteSet = async () => {
    if (!selectedSetId) return;
    await deleteSet(selectedSetId);
    onChange('parameterSetId', undefined);
  };

  const handleDefaultChange = async (def: RunParameterDefinition, value: string) => {
    await updateDefinition(def.id, {
      defaultValue: def.type === 'number' ? Number(value) : def.type === 'boolean' ? value === 'true' : value,
    });
  };

  const handleRequiredToggle = async (def: RunParameterDefinition) => {
    await updateDefinition(def.id, { required: !def.required });
  };

  const handleParameterizeToggle = async (def: RunParameterDefinition) => {
    await updateDefinition(def.id, { parameterize: !def.parameterize });
  };

  const matrixPreview = (() => {
    const parameterizedDefs = definitions.filter((d) => d.parameterize);
    if (parameterizedDefs.length === 0) return null;

    const resolvedValues = (def: RunParameterDefinition): string[] => {
      const raw = (overrides[def.name] !== undefined ? String(overrides[def.name]) : undefined)
        ?? (selectedSet?.values[def.name] !== undefined ? String(selectedSet.values[def.name]) : undefined)
        ?? (def.defaultValue !== undefined ? String(def.defaultValue) : '');
      return raw.split(',').map((v) => v.trim()).filter(Boolean);
    };

    const parts: { name: string; count: number }[] = [];
    let product = 1;
    for (const def of parameterizedDefs) {
      const values = resolvedValues(def);
      if (values.length > 0) {
        parts.push({ name: def.name, count: values.length });
        product *= values.length;
      }
    }

    return product > 1 ? { parts, product } : null;
  })();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-text-secondary">
        Loading parameters...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Parameter Set Selector */}
      <section>
        <label className={runConfigTheme.label}>Parameter Set</label>
        <p className={runConfigTheme.helper}>
          Select a parameter preset to apply values for this run.
        </p>

        <div className="mt-2 flex items-center gap-2">
          <select
            className={cx(runConfigTheme.select, 'flex-1')}
            value={selectedSetId || ''}
            onChange={(e) => handleSelectSet(e.target.value)}
          >
            <option value="">None</option>
            {sets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}{s.isDefault ? ' (Default)' : ''}
              </option>
            ))}
          </select>

          {showNewSet ? (
            <div className="flex items-center gap-1">
              <input
                className={cx(runConfigTheme.input, 'w-36')}
                placeholder="Set name..."
                value={newSetName}
                onChange={(e) => setNewSetName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateSet()}
                autoFocus
              />
              <button
                onClick={handleCreateSet}
                disabled={!newSetName.trim()}
                className="inline-flex h-7 items-center justify-center rounded border border-border-default px-2 text-xs text-text-secondary transition-colors hover:border-border-emphasis hover:text-text-primary disabled:opacity-40"
              >
                Add
              </button>
              <button
                onClick={() => setShowNewSet(false)}
                className="inline-flex h-7 items-center justify-center rounded border border-border-default px-2 text-xs text-text-secondary transition-colors hover:border-border-emphasis hover:text-text-primary"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <Tooltip content="New set" showDelayMs={0} hideDelayMs={0}>
                <button
                  onClick={() => setShowNewSet(true)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-border-default text-text-secondary transition-colors hover:border-border-emphasis hover:text-text-primary"
                  aria-label="New set"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
              {selectedSetId && (
                <>
                  <Tooltip content="Clone set" showDelayMs={0} hideDelayMs={0}>
                    <button
                      onClick={handleCloneSet}
                      className="inline-flex h-7 w-7 items-center justify-center rounded border border-border-default text-text-secondary transition-colors hover:border-border-emphasis hover:text-text-primary"
                      aria-label="Clone set"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Delete set" showDelayMs={0} hideDelayMs={0}>
                    <button
                      onClick={handleDeleteSet}
                      className="inline-flex h-7 w-7 items-center justify-center rounded border border-border-default text-text-secondary transition-colors hover:border-border-emphasis hover:text-status-danger"
                      aria-label="Delete set"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </Tooltip>
                </>
              )}
            </>
          )}
        </div>
      </section>

      {/* Section 2: Parameters Table */}
      <section>
        <label className={runConfigTheme.label}>Parameters</label>
        <p className={runConfigTheme.helper}>
          Define parameters to customize test runs. Use <code className="rounded bg-dark-elevated px-1 text-3xs">{'{{paramName}}'}</code> in Vero scripts.
        </p>

        {definitions.length === 0 && !showNewParam ? (
          <div className="mt-3 rounded-lg border border-dashed border-border-default bg-dark-bg/50 px-4 py-6 text-center">
            <p className="text-xs text-text-secondary">
              Define parameters to customize test runs with different configurations.
            </p>
            <button
              onClick={() => setShowNewParam(true)}
              className="mt-2 inline-flex items-center gap-1 text-xs text-brand-primary hover:text-brand-primaryHover"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Parameter
            </button>
          </div>
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg border border-border-default">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-default bg-dark-bg/70">
                  <th className="px-3 py-2 text-left font-medium text-text-secondary">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-text-secondary">Type</th>
                  <th className="px-3 py-2 text-left font-medium text-text-secondary">Default</th>
                  {selectedSet && (
                    <th className="px-3 py-2 text-left font-medium text-text-secondary">
                      Set Value
                    </th>
                  )}
                  <th className="px-3 py-2 text-left font-medium text-text-secondary">Override</th>
                  <th className="w-8 px-3 py-2 text-center font-medium text-text-secondary">Req</th>
                  <th className="w-8 px-3 py-2 text-center font-medium text-text-secondary" title="Parameterize: split comma-separated values into separate test cases">
                    <Zap className="h-3 w-3 mx-auto" />
                  </th>
                  <th className="w-8 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {definitions.map((def) => {
                  return (
                    <tr
                      key={def.id}
                      className="border-b border-border-default/50 last:border-b-0 hover:bg-dark-elevated/30"
                    >
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-text-primary">{def.name}</span>
                        </div>
                        {def.label !== def.name && (
                          <span className="text-3xs text-text-muted">{def.label}</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-text-secondary">{def.type}</td>
                      <td className="px-3 py-1.5">
                        <input
                          className={cx(runConfigTheme.input, 'w-24 text-xs')}
                          value={def.defaultValue !== undefined ? String(def.defaultValue) : ''}
                          placeholder="-"
                          onChange={(e) => handleDefaultChange(def, e.target.value)}
                        />
                      </td>
                      {selectedSet && (
                        <td className="px-3 py-1.5">
                          <input
                            className={cx(runConfigTheme.input, 'w-24 text-xs')}
                            value={
                              selectedSet.values[def.name] !== undefined
                                ? String(selectedSet.values[def.name])
                                : ''
                            }
                            placeholder="-"
                            onChange={(e) => handleSetValueChange(def.name, e.target.value)}
                          />
                        </td>
                      )}
                      <td className="px-3 py-1.5">
                        <input
                          className={cx(runConfigTheme.input, 'w-24 text-xs')}
                          value={
                            overrides[def.name] !== undefined ? String(overrides[def.name]) : ''
                          }
                          placeholder="-"
                          onChange={(e) => handleOverrideChange(def.name, e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <input
                          type="checkbox"
                          className={runConfigTheme.toggle}
                          checked={def.required}
                          onChange={() => handleRequiredToggle(def)}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <input
                          type="checkbox"
                          className={runConfigTheme.toggle}
                          checked={def.parameterize ?? false}
                          onChange={() => handleParameterizeToggle(def)}
                          title="Split comma-separated values into parameterized test cases"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <button
                          onClick={() => handleDeleteDefinition(def.id)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded text-text-muted transition-colors hover:text-status-danger"
                          title="Delete parameter"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {/* New parameter row */}
                {showNewParam && (
                  <tr className="border-b border-border-default/50 bg-dark-elevated/20">
                    <td className="px-3 py-1.5">
                      <input
                        className={cx(runConfigTheme.input, 'w-24 font-mono text-xs')}
                        placeholder="name"
                        value={newParamName}
                        onChange={(e) => setNewParamName(e.target.value)}
                        autoFocus
                      />
                      <input
                        className={cx(runConfigTheme.input, 'mt-1 w-24 text-xs')}
                        placeholder="Label"
                        value={newParamLabel}
                        onChange={(e) => setNewParamLabel(e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <select
                        className={cx(runConfigTheme.select, 'w-20 text-xs')}
                        value={newParamType}
                        onChange={(e) => setNewParamType(e.target.value as RunParameterType)}
                      >
                        {TYPE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td colSpan={selectedSet ? 5 : 4} className="px-3 py-1.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handleAddDefinition}
                          disabled={!newParamName.trim() || !newParamLabel.trim()}
                          className="inline-flex h-6 items-center rounded border border-brand-primary/50 bg-brand-primary/10 px-2 text-3xs font-medium text-brand-primary transition-colors hover:bg-brand-primary/20 disabled:opacity-40"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => {
                            setShowNewParam(false);
                            setNewParamName('');
                            setNewParamLabel('');
                          }}
                          className="inline-flex h-6 items-center rounded border border-border-default px-2 text-3xs text-text-secondary transition-colors hover:text-text-primary"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>

            {!showNewParam && (
              <button
                onClick={() => setShowNewParam(true)}
                className="flex w-full items-center justify-center gap-1 border-t border-border-default/50 bg-dark-bg/30 px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-dark-elevated/30 hover:text-text-primary"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Parameter
              </button>
            )}
          </div>
        )}

        {matrixPreview && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-brand-primary/30 bg-brand-primary/5 px-3 py-2 text-xs">
            <Zap className="h-3.5 w-3.5 shrink-0 text-brand-primary" />
            <span className="text-text-secondary">
              This will create{' '}
              <span className="font-semibold text-text-primary">{matrixPreview.product} parameterized test cases</span>
              {' ('}
              {matrixPreview.parts.map((p, i) => (
                <span key={p.name}>
                  {i > 0 && ' \u00d7 '}
                  <span className="font-mono">{p.name}</span>: {p.count} values
                </span>
              ))}
              {')'}
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
