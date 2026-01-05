/**
 * ShardPreview - Visual preview of test distribution across shards
 */
import React, { useMemo } from 'react';
import {
  Layers,
  Clock,
  FileCode,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart,
} from 'lucide-react';
import type { ShardDistribution, ShardTest } from '@/types/execution';

interface ShardPreviewProps {
  distributions: ShardDistribution[];
  isLoading?: boolean;
  viewMode?: 'pie' | 'bar' | 'list';
  onViewModeChange?: (mode: 'pie' | 'bar' | 'list') => void;
}

// Color palette for shards
const shardColors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-yellow-500',
  'bg-red-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-rose-500',
  'bg-amber-500',
];

const shardBorderColors = [
  'border-blue-500',
  'border-green-500',
  'border-purple-500',
  'border-orange-500',
  'border-pink-500',
  'border-cyan-500',
  'border-yellow-500',
  'border-red-500',
  'border-indigo-500',
  'border-teal-500',
  'border-rose-500',
  'border-amber-500',
];

export const ShardPreview: React.FC<ShardPreviewProps> = ({
  distributions,
  isLoading = false,
  viewMode = 'bar',
  onViewModeChange,
}) => {
  const totalTests = useMemo(
    () => distributions.reduce((sum, d) => sum + d.testCount, 0),
    [distributions]
  );

  const totalDuration = useMemo(
    () => distributions.reduce((sum, d) => sum + d.estimatedDuration, 0),
    [distributions]
  );

  const maxDuration = useMemo(
    () => Math.max(...distributions.map((d) => d.estimatedDuration), 1),
    [distributions]
  );

  const avgDuration = useMemo(
    () => distributions.length > 0 ? totalDuration / distributions.length : 0,
    [distributions, totalDuration]
  );

  // Check if distribution is balanced (within 20% of average)
  const isBalanced = useMemo(() => {
    if (distributions.length === 0) return true;
    const threshold = avgDuration * 0.2;
    return distributions.every(
      (d) => Math.abs(d.estimatedDuration - avgDuration) <= threshold
    );
  }, [distributions, avgDuration]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-2 text-sm text-slate-500">Calculating distribution...</p>
        </div>
      </div>
    );
  }

  if (distributions.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 rounded-lg border border-dashed border-slate-700 bg-slate-800/30">
        <div className="text-center">
          <Layers className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="mt-2 text-slate-400">No sharding configured</p>
          <p className="text-sm text-slate-500">Enable sharding to see distribution preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-medium text-slate-300">
          <Layers className="w-4 h-4 text-blue-400" />
          Shard Distribution Preview
        </h3>
        {onViewModeChange && (
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => onViewModeChange('bar')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'bar' ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'
              }`}
              aria-label="Bar chart view"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('pie')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'pie' ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'
              }`}
              aria-label="Pie chart view"
            >
              <PieChart className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'list' ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'
              }`}
              aria-label="List view"
            >
              <FileCode className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-center">
          <div className="text-lg font-bold text-slate-200">{distributions.length}</div>
          <div className="text-xs text-slate-500">Shards</div>
        </div>
        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-center">
          <div className="text-lg font-bold text-slate-200">{totalTests}</div>
          <div className="text-xs text-slate-500">Total Tests</div>
        </div>
        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-center">
          <div className="text-lg font-bold text-slate-200">
            {(maxDuration / 1000 / 60).toFixed(1)}m
          </div>
          <div className="text-xs text-slate-500">Est. Duration</div>
        </div>
        <div className={`p-3 rounded-lg border text-center ${
          isBalanced
            ? 'bg-green-500/10 border-green-500/30'
            : 'bg-yellow-500/10 border-yellow-500/30'
        }`}>
          <div className="flex items-center justify-center gap-1">
            {isBalanced ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
            )}
            <span className={`text-lg font-bold ${isBalanced ? 'text-green-400' : 'text-yellow-400'}`}>
              {isBalanced ? 'Balanced' : 'Uneven'}
            </span>
          </div>
          <div className="text-xs text-slate-500">Distribution</div>
        </div>
      </div>

      {/* Visualization */}
      {viewMode === 'bar' && (
        <div className="space-y-3">
          {distributions.map((dist, idx) => {
            const percentage = (dist.estimatedDuration / maxDuration) * 100;
            const color = shardColors[idx % shardColors.length];

            return (
              <div key={dist.shardIndex} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Shard {dist.shardIndex + 1}</span>
                  <span className="text-slate-500">
                    {dist.testCount} tests | {(dist.estimatedDuration / 1000).toFixed(1)}s
                  </span>
                </div>
                <div className="h-6 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color} transition-all flex items-center justify-end px-2`}
                    style={{ width: `${percentage}%` }}
                  >
                    <span className="text-xs font-medium text-white/80">
                      {Math.round(percentage)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'pie' && (
        <div className="flex items-center justify-center p-4">
          <div className="relative w-48 h-48">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              {(() => {
                let accumulatedPercentage = 0;
                return distributions.map((dist, idx) => {
                  const percentage = totalTests > 0 ? (dist.testCount / totalTests) * 100 : 0;
                  const strokeDasharray = `${percentage} ${100 - percentage}`;
                  const strokeDashoffset = -accumulatedPercentage;
                  accumulatedPercentage += percentage;

                  const colorClasses = [
                    'stroke-blue-500',
                    'stroke-green-500',
                    'stroke-purple-500',
                    'stroke-orange-500',
                    'stroke-pink-500',
                    'stroke-cyan-500',
                  ];

                  return (
                    <circle
                      key={dist.shardIndex}
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      className={colorClasses[idx % colorClasses.length]}
                      strokeWidth="20"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      style={{ transition: 'stroke-dasharray 0.3s' }}
                    />
                  );
                });
              })()}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-200">{totalTests}</div>
                <div className="text-xs text-slate-500">tests</div>
              </div>
            </div>
          </div>
          <div className="ml-6 space-y-2">
            {distributions.map((dist, idx) => {
              const color = shardColors[idx % shardColors.length];
              const percentage = totalTests > 0 ? ((dist.testCount / totalTests) * 100).toFixed(1) : '0';

              return (
                <div key={dist.shardIndex} className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded ${color}`} />
                  <span className="text-sm text-slate-400">
                    Shard {dist.shardIndex + 1}: {dist.testCount} ({percentage}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === 'list' && (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {distributions.map((dist, idx) => {
            const borderColor = shardBorderColors[idx % shardBorderColors.length];

            return (
              <div
                key={dist.shardIndex}
                className={`rounded-lg bg-slate-800/50 border-l-4 ${borderColor} overflow-hidden`}
              >
                <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700">
                  <span className="font-medium text-sm text-slate-200">
                    Shard {dist.shardIndex + 1}
                  </span>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <FileCode className="w-3.5 h-3.5" />
                      {dist.testCount} tests
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      ~{(dist.estimatedDuration / 1000).toFixed(1)}s
                    </span>
                  </div>
                </div>
                <div className="px-4 py-2 max-h-24 overflow-y-auto">
                  {dist.tests.slice(0, 5).map((test) => (
                    <div key={test.id} className="flex items-center gap-2 py-1 text-xs">
                      <FileCode className="w-3 h-3 text-slate-600 shrink-0" />
                      <span className="text-slate-400 truncate" title={test.name}>
                        {test.name}
                      </span>
                      {test.tags && test.tags.length > 0 && (
                        <span className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-500">
                          {test.tags[0]}
                        </span>
                      )}
                    </div>
                  ))}
                  {dist.tests.length > 5 && (
                    <div className="text-xs text-slate-600 py-1">
                      +{dist.tests.length - 5} more tests
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Balance Warning */}
      {!isBalanced && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <div className="text-xs text-yellow-300">
            <strong>Uneven Distribution:</strong> Some shards have significantly more tests than others.
            Consider adjusting your sharding strategy for better parallelization.
          </div>
        </div>
      )}
    </div>
  );
};

export default ShardPreview;
