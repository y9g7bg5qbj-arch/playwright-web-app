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
import type { ShardDistribution } from '@/types/execution';

interface ShardPreviewProps {
  distributions: ShardDistribution[];
  isLoading?: boolean;
  viewMode?: 'pie' | 'bar' | 'list';
  onViewModeChange?: (mode: 'pie' | 'bar' | 'list') => void;
}

// Color palette for shards
const shardColors = [
  'bg-shard-1',
  'bg-shard-2',
  'bg-shard-3',
  'bg-shard-4',
  'bg-shard-5',
  'bg-shard-6',
  'bg-shard-7',
  'bg-shard-8',
  'bg-shard-9',
  'bg-shard-10',
  'bg-shard-11',
  'bg-shard-12',
];

const shardBorderColors = [
  'border-shard-1',
  'border-shard-2',
  'border-shard-3',
  'border-shard-4',
  'border-shard-5',
  'border-shard-6',
  'border-shard-7',
  'border-shard-8',
  'border-shard-9',
  'border-shard-10',
  'border-shard-11',
  'border-shard-12',
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
          <div className="w-8 h-8 border-2 border-status-info border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-2 text-sm text-text-secondary">Calculating distribution...</p>
        </div>
      </div>
    );
  }

  if (distributions.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 rounded-lg border border-dashed border-border-default bg-dark-card/30">
        <div className="text-center">
          <Layers className="w-10 h-10 text-text-muted mx-auto" />
          <p className="mt-2 text-text-secondary">No sharding configured</p>
          <p className="text-sm text-text-secondary">Enable sharding to see distribution preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <Layers className="w-4 h-4 text-status-info" />
          Shard Distribution Preview
        </h3>
        {onViewModeChange && (
          <div className="flex items-center bg-dark-card rounded-lg p-0.5">
            <button
              onClick={() => onViewModeChange('bar')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'bar' ? 'bg-dark-elevated text-text-primary' : 'text-text-secondary hover:text-text-primary'
              }`}
              aria-label="Bar chart view"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('pie')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'pie' ? 'bg-dark-elevated text-text-primary' : 'text-text-secondary hover:text-text-primary'
              }`}
              aria-label="Pie chart view"
            >
              <PieChart className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'list' ? 'bg-dark-elevated text-text-primary' : 'text-text-secondary hover:text-text-primary'
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
        <div className="p-3 rounded-lg bg-dark-card/50 border border-border-default text-center">
          <div className="text-lg font-bold text-text-primary">{distributions.length}</div>
          <div className="text-xs text-text-secondary">Shards</div>
        </div>
        <div className="p-3 rounded-lg bg-dark-card/50 border border-border-default text-center">
          <div className="text-lg font-bold text-text-primary">{totalTests}</div>
          <div className="text-xs text-text-secondary">Total Tests</div>
        </div>
        <div className="p-3 rounded-lg bg-dark-card/50 border border-border-default text-center">
          <div className="text-lg font-bold text-text-primary">
            {(maxDuration / 1000 / 60).toFixed(1)}m
          </div>
          <div className="text-xs text-text-secondary">Est. Duration</div>
        </div>
        <div className={`p-3 rounded-lg border text-center ${
          isBalanced
            ? 'bg-status-success/10 border-status-success/30'
            : 'bg-status-warning/10 border-status-warning/30'
        }`}>
          <div className="flex items-center justify-center gap-1">
            {isBalanced ? (
              <CheckCircle className="w-4 h-4 text-status-success" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-status-warning" />
            )}
            <span className={`text-lg font-bold ${isBalanced ? 'text-status-success' : 'text-status-warning'}`}>
              {isBalanced ? 'Balanced' : 'Uneven'}
            </span>
          </div>
          <div className="text-xs text-text-secondary">Distribution</div>
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
                  <span className="text-text-secondary">Shard {dist.shardIndex + 1}</span>
                  <span className="text-text-secondary">
                    {dist.testCount} tests | {(dist.estimatedDuration / 1000).toFixed(1)}s
                  </span>
                </div>
                <div className="h-6 bg-dark-card rounded-full overflow-hidden">
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
                    'stroke-shard-1',
                    'stroke-shard-2',
                    'stroke-shard-3',
                    'stroke-shard-4',
                    'stroke-shard-5',
                    'stroke-shard-6',
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
                <div className="text-2xl font-bold text-text-primary">{totalTests}</div>
                <div className="text-xs text-text-secondary">tests</div>
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
                  <span className="text-sm text-text-secondary">
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
                className={`rounded-lg bg-dark-card/50 border-l-4 ${borderColor} overflow-hidden`}
              >
                <div className="flex items-center justify-between px-4 py-2 bg-dark-card/50 border-b border-border-default">
                  <span className="font-medium text-sm text-text-primary">
                    Shard {dist.shardIndex + 1}
                  </span>
                  <div className="flex items-center gap-3 text-xs text-text-secondary">
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
                      <FileCode className="w-3 h-3 text-text-muted shrink-0" />
                      <span className="text-text-secondary truncate" title={test.name}>
                        {test.name}
                      </span>
                      {test.tags && test.tags.length > 0 && (
                        <span className="px-1.5 py-0.5 bg-dark-elevated rounded text-text-secondary">
                          {test.tags[0]}
                        </span>
                      )}
                    </div>
                  ))}
                  {dist.tests.length > 5 && (
                    <div className="text-xs text-text-muted py-1">
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
        <div className="flex items-start gap-2 p-3 rounded-lg bg-status-warning/10 border border-status-warning/30">
          <AlertTriangle className="w-4 h-4 text-status-warning shrink-0 mt-0.5" />
          <div className="text-xs text-status-warning">
            <strong>Uneven Distribution:</strong> Some shards have significantly more tests than others.
            Consider adjusting your sharding strategy for better parallelization.
          </div>
        </div>
      )}
    </div>
  );
};

export default ShardPreview;
