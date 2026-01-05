/**
 * ShardingConfigPanel - Configure test sharding with strategy selection and distribution preview
 */
import React, { useMemo } from 'react';
import {
  Layers,
  LayoutGrid,
  FileText,
  Tag,
  Clock,
  Shuffle,
  Info,
} from 'lucide-react';
import type { ShardingConfig, ShardingStrategy } from '@playwright-web-app/shared';

interface ShardingConfigPanelProps {
  config: ShardingConfig;
  onChange: (config: ShardingConfig) => void;
  totalTests?: number;
  disabled?: boolean;
}

interface ShardDistributionPreview {
  shardIndex: number;
  testCount: number;
  estimatedDuration: number;
}

const STRATEGY_OPTIONS: {
  value: ShardingStrategy;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'round-robin',
    label: 'Round Robin',
    description: 'Distribute tests evenly across shards in order',
    icon: <Shuffle className="w-4 h-4" />,
  },
  {
    value: 'by-file',
    label: 'By File',
    description: 'Group tests from the same file in one shard',
    icon: <FileText className="w-4 h-4" />,
  },
  {
    value: 'by-test',
    label: 'By Test',
    description: 'Assign each test to a shard individually',
    icon: <LayoutGrid className="w-4 h-4" />,
  },
  {
    value: 'by-tag',
    label: 'By Tag',
    description: 'Group tests by their tags into shards',
    icon: <Tag className="w-4 h-4" />,
  },
  {
    value: 'by-duration',
    label: 'By Duration',
    description: 'Balance shards by estimated test runtime',
    icon: <Clock className="w-4 h-4" />,
  },
];

const DEFAULT_SHARDING_CONFIG: ShardingConfig = {
  enabled: false,
  count: 1,
  strategy: 'round-robin',
};

export const ShardingConfigPanel: React.FC<ShardingConfigPanelProps> = ({
  config: configProp,
  onChange,
  totalTests = 100,
  disabled = false,
}) => {
  // Ensure config is always defined with defaults
  const config = { ...DEFAULT_SHARDING_CONFIG, ...configProp };

  const updateConfig = <K extends keyof ShardingConfig>(key: K, value: ShardingConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  // Calculate shard distribution preview
  const shardDistribution = useMemo((): ShardDistributionPreview[] => {
    if (!config.enabled || config.count < 1) return [];

    const distribution: ShardDistributionPreview[] = [];
    const baseTestsPerShard = Math.floor(totalTests / config.count);
    const remainder = totalTests % config.count;

    for (let i = 0; i < config.count; i++) {
      const testCount = baseTestsPerShard + (i < remainder ? 1 : 0);
      // Estimate ~1.5 seconds per test on average
      const estimatedDuration = testCount * 1.5;
      distribution.push({
        shardIndex: i + 1,
        testCount,
        estimatedDuration,
      });
    }

    return distribution;
  }, [config.enabled, config.count, totalTests]);

  const maxDuration = Math.max(...shardDistribution.map((s) => s.estimatedDuration), 1);
  const totalDuration = shardDistribution.reduce((sum, s) => sum + s.estimatedDuration, 0);
  const parallelDuration = maxDuration;

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  };

  return (
    <div className="space-y-4">
      {/* Enable sharding toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-300">Enable Sharding</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={config.enabled}
          onClick={() => updateConfig('enabled', !config.enabled)}
          disabled={disabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
            config.enabled ? 'bg-blue-600' : 'bg-slate-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              config.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {config.enabled && (
        <>
          {/* Shard count slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300">Shard Count</label>
              <span className="text-sm text-blue-400 font-mono">{config.count}</span>
            </div>
            <input
              type="range"
              value={config.count}
              onChange={(e) => updateConfig('count', parseInt(e.target.value))}
              min={1}
              max={16}
              disabled={disabled}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>1</span>
              <span>4</span>
              <span>8</span>
              <span>16</span>
            </div>
          </div>

          {/* Strategy selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">Strategy</label>
            <div className="grid grid-cols-1 gap-2">
              {STRATEGY_OPTIONS.map((strategy) => (
                <button
                  key={strategy.value}
                  type="button"
                  onClick={() => updateConfig('strategy', strategy.value)}
                  disabled={disabled}
                  className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors disabled:opacity-50 ${
                    config.strategy === strategy.value
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <span
                    className={`mt-0.5 ${
                      config.strategy === strategy.value ? 'text-blue-400' : 'text-slate-500'
                    }`}
                  >
                    {strategy.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{strategy.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{strategy.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Distribution preview */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-300">Distribution Preview</label>
              <div className="group relative">
                <Info className="w-3.5 h-3.5 text-slate-500 cursor-help" />
                <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-slate-700 text-xs text-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                  Estimated based on {totalTests} tests
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-3 space-y-2">
              {shardDistribution.map((shard) => (
                <div key={shard.shardIndex} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-16">Shard {shard.shardIndex}</span>
                  <div className="flex-1 h-5 bg-slate-700 rounded overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-blue-500 rounded transition-all duration-300"
                      style={{ width: `${(shard.estimatedDuration / maxDuration) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 w-20 text-right">
                    {shard.testCount} tests
                  </span>
                  <span className="text-xs text-slate-500 w-12 text-right">
                    ~{formatDuration(shard.estimatedDuration)}
                  </span>
                </div>
              ))}
            </div>

            {/* Summary stats */}
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>Total: {totalTests} tests</span>
              <span className="flex items-center gap-4">
                <span>
                  Sequential: <span className="text-slate-400">{formatDuration(totalDuration)}</span>
                </span>
                <span>
                  Parallel: <span className="text-green-400">{formatDuration(parallelDuration)}</span>
                </span>
                <span className="text-green-400">
                  {Math.round(((totalDuration - parallelDuration) / totalDuration) * 100)}% faster
                </span>
              </span>
            </div>
          </div>

          {/* Fully parallel option */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-700">
            <div>
              <p className="text-sm text-slate-300">Fully Parallel</p>
              <p className="text-xs text-slate-500">Run tests within files in parallel</p>
            </div>
            <input
              type="checkbox"
              checked={false}
              onChange={() => {}}
              disabled={disabled}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 disabled:opacity-50"
            />
          </div>
        </>
      )}

      {!config.enabled && (
        <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <Info className="w-5 h-5 text-slate-500" />
          <p className="text-sm text-slate-400">
            Enable sharding to distribute tests across multiple machines or containers for faster
            execution.
          </p>
        </div>
      )}
    </div>
  );
};

export default ShardingConfigPanel;
