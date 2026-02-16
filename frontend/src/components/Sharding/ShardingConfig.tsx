/**
 * ShardingConfig - Configure test sharding strategy
 */
import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  GripVertical,
  Tag,
  FileCode,
  Hash,
  Filter,
  Info,
} from 'lucide-react';
import type { ShardingConfig as ShardingConfigType, ShardingStrategy, ShardingRule } from '@/types/execution';

interface ShardingConfigProps {
  value: ShardingConfigType;
  onChange: (config: ShardingConfigType) => void;
  disabled?: boolean;
}

const strategies: { value: ShardingStrategy; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'round-robin',
    label: 'Round Robin',
    description: 'Distribute tests evenly across all shards in sequence',
    icon: <Hash className="w-4 h-4" />,
  },
  {
    value: 'by-file',
    label: 'By File',
    description: 'Group tests from the same file into the same shard',
    icon: <FileCode className="w-4 h-4" />,
  },
  {
    value: 'by-test',
    label: 'By Test',
    description: 'Each test can be assigned to any shard independently',
    icon: <Layers className="w-4 h-4" />,
  },
  {
    value: 'by-tag',
    label: 'By Tag',
    description: 'Group tests with the same tags into the same shard',
    icon: <Tag className="w-4 h-4" />,
  },
  {
    value: 'custom',
    label: 'Custom Rules',
    description: 'Define custom sharding rules based on patterns',
    icon: <Filter className="w-4 h-4" />,
  },
];

export const ShardingConfig: React.FC<ShardingConfigProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [newTag, setNewTag] = useState('');
  const [newExclude, setNewExclude] = useState('');

  const updateConfig = <K extends keyof ShardingConfigType>(
    key: K,
    val: ShardingConfigType[K]
  ) => {
    onChange({ ...value, [key]: val });
  };

  const addTag = () => {
    if (newTag.trim() && !value.tagFilters?.includes(newTag.trim())) {
      updateConfig('tagFilters', [...(value.tagFilters || []), newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    updateConfig('tagFilters', value.tagFilters?.filter((t) => t !== tag) || []);
  };

  const addExcludePattern = () => {
    if (newExclude.trim() && !value.excludePatterns?.includes(newExclude.trim())) {
      updateConfig('excludePatterns', [...(value.excludePatterns || []), newExclude.trim()]);
      setNewExclude('');
    }
  };

  const removeExcludePattern = (pattern: string) => {
    updateConfig('excludePatterns', value.excludePatterns?.filter((p) => p !== pattern) || []);
  };

  const addCustomRule = () => {
    const newRule: ShardingRule = {
      id: `rule-${Date.now()}`,
      name: `Rule ${(value.customRules?.length || 0) + 1}`,
      pattern: '*',
      shardIndex: 0,
      priority: (value.customRules?.length || 0) + 1,
    };
    updateConfig('customRules', [...(value.customRules || []), newRule]);
  };

  const updateCustomRule = (id: string, updates: Partial<ShardingRule>) => {
    updateConfig(
      'customRules',
      value.customRules?.map((rule) => (rule.id === id ? { ...rule, ...updates } : rule)) || []
    );
  };

  const removeCustomRule = (id: string) => {
    updateConfig('customRules', value.customRules?.filter((rule) => rule.id !== id) || []);
  };

  return (
    <div className="space-y-6">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-dark-card/50 border border-border-default">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-status-info" />
          <div>
            <div className="font-medium text-text-primary">Test Sharding</div>
            <div className="text-sm text-text-secondary">Distribute tests across multiple workers</div>
          </div>
        </div>
        <button
          onClick={() => updateConfig('enabled', !value.enabled)}
          disabled={disabled}
          className={`
            relative w-12 h-6 rounded-full transition-colors
            ${value.enabled ? 'bg-status-info' : 'bg-dark-elevated'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          role="switch"
          aria-checked={value.enabled}
          aria-label="Enable sharding"
        >
          <span
            className={`
              absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform
              ${value.enabled ? 'translate-x-7' : 'translate-x-1'}
            `}
          />
        </button>
      </div>

      {value.enabled && (
        <>
          {/* Shard Count */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">
              Number of Shards
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                value={value.shardCount}
                onChange={(e) => updateConfig('shardCount', parseInt(e.target.value, 10))}
                min={1}
                max={32}
                disabled={disabled}
                className="flex-1 h-2 bg-dark-elevated rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <input
                type="number"
                value={value.shardCount}
                onChange={(e) => updateConfig('shardCount', Math.max(1, Math.min(32, parseInt(e.target.value, 10) || 1)))}
                min={1}
                max={32}
                disabled={disabled}
                className="w-16 text-center bg-dark-card border border-border-default rounded px-2 py-1.5 text-sm text-text-primary"
              />
            </div>
          </div>

          {/* Strategy Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-text-primary">
              Sharding Strategy
            </label>
            <div className="space-y-2">
              {strategies.map((strategy) => (
                <button
                  key={strategy.value}
                  onClick={() => updateConfig('strategy', strategy.value)}
                  disabled={disabled}
                  className={`
                    w-full flex items-start gap-3 p-3 rounded-lg border transition-colors text-left
                    ${value.strategy === strategy.value
                      ? 'border-status-info bg-status-info/10'
                      : 'border-border-default bg-dark-card/50 hover:border-border-default'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <span className={`mt-0.5 ${value.strategy === strategy.value ? 'text-status-info' : 'text-text-secondary'}`}>
                    {strategy.icon}
                  </span>
                  <div className="flex-1">
                    <div className={`font-medium text-sm ${value.strategy === strategy.value ? 'text-status-info' : 'text-text-primary'}`}>
                      {strategy.label}
                    </div>
                    <div className="text-xs text-text-secondary">{strategy.description}</div>
                  </div>
                  {value.strategy === strategy.value && (
                    <span className="w-2 h-2 mt-2 rounded-full bg-status-info" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tag Filters (for by-tag strategy) */}
          {value.strategy === 'by-tag' && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
                <Tag className="w-4 h-4" />
                Tag Filters
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  placeholder="Enter tag name..."
                  disabled={disabled}
                  className="flex-1 bg-dark-card border border-border-default rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-status-info"
                />
                <button
                  onClick={addTag}
                  disabled={disabled || !newTag.trim()}
                  className="px-3 py-2 bg-brand-primary hover:bg-brand-primary text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {value.tagFilters && value.tagFilters.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {value.tagFilters.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-dark-card border border-border-default rounded-full text-sm text-text-primary"
                    >
                      <Tag className="w-3 h-3 text-status-info" />
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        disabled={disabled}
                        className="p-0.5 hover:bg-dark-elevated rounded-full text-text-secondary hover:text-status-danger"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Custom Rules (for custom strategy) */}
          {value.strategy === 'custom' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-primary">Custom Rules</label>
                <button
                  onClick={addCustomRule}
                  disabled={disabled}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm bg-brand-primary hover:bg-brand-primary text-white rounded disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Rule
                </button>
              </div>

              {value.customRules && value.customRules.length > 0 ? (
                <div className="space-y-2">
                  {value.customRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-dark-card/50 border border-border-default"
                    >
                      <GripVertical className="w-4 h-4 text-text-muted cursor-grab" />
                      <input
                        type="text"
                        value={rule.name}
                        onChange={(e) => updateCustomRule(rule.id, { name: e.target.value })}
                        disabled={disabled}
                        className="w-32 bg-dark-elevated border border-border-default rounded px-2 py-1 text-sm text-text-primary"
                        placeholder="Rule name"
                      />
                      <input
                        type="text"
                        value={rule.pattern}
                        onChange={(e) => updateCustomRule(rule.id, { pattern: e.target.value })}
                        disabled={disabled}
                        className="flex-1 bg-dark-elevated border border-border-default rounded px-2 py-1 text-sm text-text-primary font-mono"
                        placeholder="Pattern (e.g., **/auth/*.spec.ts)"
                      />
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-text-secondary">Shard:</span>
                        <input
                          type="number"
                          value={rule.shardIndex}
                          onChange={(e) => updateCustomRule(rule.id, { shardIndex: parseInt(e.target.value, 10) || 0 })}
                          min={0}
                          max={value.shardCount - 1}
                          disabled={disabled}
                          className="w-12 text-center bg-dark-elevated border border-border-default rounded px-1 py-1 text-sm text-text-primary"
                        />
                      </div>
                      <button
                        onClick={() => removeCustomRule(rule.id)}
                        disabled={disabled}
                        className="p-1.5 hover:bg-dark-elevated rounded text-text-secondary hover:text-status-danger"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-dark-card/30 border border-dashed border-border-default text-center">
                  <p className="text-sm text-text-secondary">No custom rules defined</p>
                  <p className="text-xs text-text-muted mt-1">Add rules to control test distribution</p>
                </div>
              )}
            </div>
          )}

          {/* Exclude Patterns */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
              <Filter className="w-4 h-4" />
              Exclude Patterns
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newExclude}
                onChange={(e) => setNewExclude(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addExcludePattern()}
                placeholder="e.g., **/skip/**"
                disabled={disabled}
                className="flex-1 bg-dark-card border border-border-default rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted font-mono focus:outline-none focus:border-status-info"
              />
              <button
                onClick={addExcludePattern}
                disabled={disabled || !newExclude.trim()}
                className="px-3 py-2 bg-dark-elevated hover:bg-dark-elevated text-text-primary rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {value.excludePatterns && value.excludePatterns.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {value.excludePatterns.map((pattern) => (
                  <span
                    key={pattern}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-status-danger/10 border border-status-danger/30 rounded text-sm text-status-danger font-mono"
                  >
                    {pattern}
                    <button
                      onClick={() => removeExcludePattern(pattern)}
                      disabled={disabled}
                      className="p-0.5 hover:bg-status-danger/20 rounded-full"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-status-info/10 border border-status-info/30">
            <Info className="w-4 h-4 text-status-info shrink-0 mt-0.5" />
            <div className="text-xs text-status-info">
              <strong>Tip:</strong> Use sharding to parallelize test execution across multiple workers.
              Each shard runs a subset of tests independently, reducing overall execution time.
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ShardingConfig;
