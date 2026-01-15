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
      <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-blue-400" />
          <div>
            <div className="font-medium text-slate-200">Test Sharding</div>
            <div className="text-sm text-slate-500">Distribute tests across multiple workers</div>
          </div>
        </div>
        <button
          onClick={() => updateConfig('enabled', !value.enabled)}
          disabled={disabled}
          className={`
            relative w-12 h-6 rounded-full transition-colors
            ${value.enabled ? 'bg-blue-500' : 'bg-slate-600'}
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
            <label className="block text-sm font-medium text-slate-300">
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
                className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <input
                type="number"
                value={value.shardCount}
                onChange={(e) => updateConfig('shardCount', Math.max(1, Math.min(32, parseInt(e.target.value, 10) || 1)))}
                min={1}
                max={32}
                disabled={disabled}
                className="w-16 text-center bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200"
              />
            </div>
          </div>

          {/* Strategy Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-300">
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
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <span className={`mt-0.5 ${value.strategy === strategy.value ? 'text-blue-400' : 'text-slate-500'}`}>
                    {strategy.icon}
                  </span>
                  <div className="flex-1">
                    <div className={`font-medium text-sm ${value.strategy === strategy.value ? 'text-blue-400' : 'text-slate-300'}`}>
                      {strategy.label}
                    </div>
                    <div className="text-xs text-slate-500">{strategy.description}</div>
                  </div>
                  {value.strategy === strategy.value && (
                    <span className="w-2 h-2 mt-2 rounded-full bg-blue-400" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tag Filters (for by-tag strategy) */}
          {value.strategy === 'by-tag' && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
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
                  className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={addTag}
                  disabled={disabled || !newTag.trim()}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {value.tagFilters && value.tagFilters.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {value.tagFilters.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-full text-sm text-slate-300"
                    >
                      <Tag className="w-3 h-3 text-blue-400" />
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        disabled={disabled}
                        className="p-0.5 hover:bg-slate-700 rounded-full text-slate-500 hover:text-red-400"
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
                <label className="text-sm font-medium text-slate-300">Custom Rules</label>
                <button
                  onClick={addCustomRule}
                  disabled={disabled}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50"
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
                      className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700"
                    >
                      <GripVertical className="w-4 h-4 text-slate-600 cursor-grab" />
                      <input
                        type="text"
                        value={rule.name}
                        onChange={(e) => updateCustomRule(rule.id, { name: e.target.value })}
                        disabled={disabled}
                        className="w-32 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200"
                        placeholder="Rule name"
                      />
                      <input
                        type="text"
                        value={rule.pattern}
                        onChange={(e) => updateCustomRule(rule.id, { pattern: e.target.value })}
                        disabled={disabled}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 font-mono"
                        placeholder="Pattern (e.g., **/auth/*.spec.ts)"
                      />
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500">Shard:</span>
                        <input
                          type="number"
                          value={rule.shardIndex}
                          onChange={(e) => updateCustomRule(rule.id, { shardIndex: parseInt(e.target.value, 10) || 0 })}
                          min={0}
                          max={value.shardCount - 1}
                          disabled={disabled}
                          className="w-12 text-center bg-slate-700 border border-slate-600 rounded px-1 py-1 text-sm text-slate-200"
                        />
                      </div>
                      <button
                        onClick={() => removeCustomRule(rule.id)}
                        disabled={disabled}
                        className="p-1.5 hover:bg-slate-700 rounded text-slate-500 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-slate-800/30 border border-dashed border-slate-700 text-center">
                  <p className="text-sm text-slate-500">No custom rules defined</p>
                  <p className="text-xs text-slate-600 mt-1">Add rules to control test distribution</p>
                </div>
              )}
            </div>
          )}

          {/* Exclude Patterns */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
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
                className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={addExcludePattern}
                disabled={disabled || !newExclude.trim()}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {value.excludePatterns && value.excludePatterns.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {value.excludePatterns.map((pattern) => (
                  <span
                    key={pattern}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400 font-mono"
                  >
                    {pattern}
                    <button
                      onClick={() => removeExcludePattern(pattern)}
                      disabled={disabled}
                      className="p-0.5 hover:bg-red-500/20 rounded-full"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-300">
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
