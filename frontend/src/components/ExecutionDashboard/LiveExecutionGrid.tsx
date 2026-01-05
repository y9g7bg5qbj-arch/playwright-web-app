/**
 * LiveExecutionGrid - Netflix-style grid for watching live test execution
 *
 * Shows VNC tiles for Docker shards or single view for local execution
 * Reuses existing VNCTile and FullscreenViewer components
 */
import React, { useState } from 'react';
import {
  ArrowLeft,
  Monitor,
  Maximize2,
  RefreshCw,
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { VNCTile } from '../execution/VNCTile';
import { FullscreenViewer } from '../execution/FullscreenViewer';
import type { ShardInfo } from '../execution/LiveExecutionViewer';

export interface LiveExecutionGridProps {
  executionId: string;
  shards: ShardInfo[];
  mode: 'docker' | 'local';
  onBack: () => void;
}

export const LiveExecutionGrid: React.FC<LiveExecutionGridProps> = ({
  executionId,
  shards,
  mode: _mode,
  onBack,
}) => {
  const [selectedShard, setSelectedShard] = useState<ShardInfo | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const runningCount = shards.filter(s => s.status === 'running').length;
  const passedCount = shards.filter(s => s.status === 'passed').length;
  const failedCount = shards.filter(s => s.status === 'failed').length;
  const totalProgress = shards.reduce((acc, s) => {
    if (s.progress) {
      return {
        passed: acc.passed + s.progress.passed,
        failed: acc.failed + s.progress.failed,
        total: acc.total + s.progress.total,
      };
    }
    return acc;
  }, { passed: 0, failed: 0, total: 0 });

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getShardStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'passed':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          <div className="h-6 w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-blue-400" />
            <h1 className="text-lg font-semibold text-slate-100">Live Execution</h1>
          </div>
          <span className="text-sm text-slate-500 font-mono">
            {executionId.slice(0, 12)}...
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1 text-blue-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              {runningCount} Running
            </span>
            <span className="flex items-center gap-1 text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              {passedCount} Passed
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <XCircle className="w-4 h-4" />
              {failedCount} Failed
            </span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {totalProgress.total > 0 && (
        <div className="px-6 py-3 bg-slate-900/50 border-b border-slate-800">
          <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
            <span>Overall Progress</span>
            <span>
              {totalProgress.passed + totalProgress.failed} / {totalProgress.total} tests
            </span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-green-500 transition-all"
              style={{
                width: `${(totalProgress.passed / totalProgress.total) * 100}%`,
              }}
            />
            <div
              className="h-full bg-red-500 transition-all"
              style={{
                width: `${(totalProgress.failed / totalProgress.total) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Grid of VNC Tiles */}
      <div className="flex-1 overflow-auto p-6">
        {shards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <Monitor className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-slate-400 font-medium">No shards available</p>
            <p className="text-sm text-slate-500 mt-1">
              Waiting for execution to start...
            </p>
          </div>
        ) : (
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(${
                shards.length === 1 ? '100%' : shards.length <= 4 ? '400px' : '300px'
              }, 1fr))`,
            }}
          >
            {shards.map((shard) => (
              <div
                key={shard.id}
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden hover:border-slate-600 transition-colors cursor-pointer"
                onClick={() => setSelectedShard(shard)}
              >
                {/* Shard Header */}
                <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getShardStatusIcon(shard.status)}
                    <span className="text-sm font-medium text-slate-200">
                      Shard {shard.shardIndex + 1} / {shard.totalShards}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedShard(shard);
                    }}
                    className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700 rounded transition-colors"
                    title="Fullscreen"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>

                {/* VNC View Area */}
                <div className="aspect-video bg-slate-900 relative">
                  {shard.status === 'running' || shard.status === 'connecting' ? (
                    <VNCTile
                      shard={shard}
                      isExpanded={false}
                      onClick={() => setSelectedShard(shard)}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        {getShardStatusIcon(shard.status)}
                        <p className="text-sm text-slate-500 mt-2">
                          {shard.status === 'pending' ? 'Waiting to start...' :
                           shard.status === 'passed' ? 'Completed successfully' :
                           shard.status === 'failed' ? 'Execution failed' :
                           'Unknown status'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Shard Info */}
                <div className="px-4 py-3 bg-slate-900/50">
                  {shard.currentTest && (
                    <p className="text-xs text-slate-400 truncate">
                      {shard.currentTest}
                    </p>
                  )}
                  {shard.progress && (
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <span className="text-green-400">
                        {shard.progress.passed} passed
                      </span>
                      <span className="text-red-400">
                        {shard.progress.failed} failed
                      </span>
                      <span className="text-slate-500 ml-auto">
                        {shard.progress.passed + shard.progress.failed} / {shard.progress.total}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {selectedShard && (
        <FullscreenViewer
          shard={selectedShard}
          onClose={() => setSelectedShard(null)}
        />
      )}
    </div>
  );
};

export default LiveExecutionGrid;
