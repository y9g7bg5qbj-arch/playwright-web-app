/**
 * WorkerDashboard - Grid view of all workers with real-time status
 */
import React, { useState } from 'react';
import {
  Users,
  Plus,
  Minus,
  Grid3X3,
  List,
  RefreshCw,
  Loader2,
  Play,
  Pause,
  Square,
} from 'lucide-react';
import type { Worker, TestResult } from '@/types/execution';
import { WorkerCard } from './WorkerCard';
import { WorkerDetailsModal } from './WorkerDetailsModal';

interface WorkerDashboardProps {
  workers: Worker[];
  recentResults?: TestResult[];
  isLoading?: boolean;
  canScale?: boolean;
  minWorkers?: number;
  maxWorkers?: number;
  onAddWorker?: () => void;
  onRemoveWorker?: () => void;
  onPauseWorker?: (workerId: string) => void;
  onResumeWorker?: (workerId: string) => void;
  onDisconnectWorker?: (workerId: string) => void;
  onPauseAll?: () => void;
  onResumeAll?: () => void;
  onStopAll?: () => void;
  onRefresh?: () => void;
}

type ViewMode = 'grid' | 'list';

export const WorkerDashboard: React.FC<WorkerDashboardProps> = ({
  workers,
  recentResults = [],
  isLoading = false,
  canScale = false,
  minWorkers = 1,
  maxWorkers = 16,
  onAddWorker,
  onRemoveWorker,
  onPauseWorker,
  onResumeWorker,
  onDisconnectWorker,
  onPauseAll,
  onResumeAll,
  onStopAll,
  onRefresh,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);

  // Calculate aggregated stats
  const runningCount = workers.filter((w) => w.status === 'running').length;
  const idleCount = workers.filter((w) => w.status === 'idle').length;
  const errorCount = workers.filter((w) => w.status === 'error').length;
  const totalTests = workers.reduce((sum, w) => sum + w.testsCompleted, 0);
  const totalPassed = workers.reduce((sum, w) => sum + w.testsPassed, 0);
  const totalFailed = workers.reduce((sum, w) => sum + w.testsFailed, 0);

  const getWorkerResults = (workerId: string) => {
    return recentResults.filter((r) => r.workerId === workerId).slice(0, 10);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold text-slate-200">Workers</h2>
          </div>
          <span className="px-2 py-0.5 text-xs font-medium bg-slate-800 text-slate-400 rounded-full">
            {workers.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'
              }`}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'list' ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'
              }`}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Refresh */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
              aria-label="Refresh workers"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Scale Controls (for Docker mode) */}
      {canScale && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-800/30">
          <span className="text-sm text-slate-400">Scale Workers</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onRemoveWorker}
              disabled={isLoading || workers.length <= minWorkers}
              className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Remove worker"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center text-sm font-medium text-slate-300">
              {workers.length}
            </span>
            <button
              onClick={onAddWorker}
              disabled={isLoading || workers.length >= maxWorkers}
              className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Add worker"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800">
        {onResumeAll && idleCount > 0 && (
          <button
            onClick={onResumeAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-500 text-white rounded transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            Resume All
          </button>
        )}
        {onPauseAll && runningCount > 0 && (
          <button
            onClick={onPauseAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-yellow-600 hover:bg-yellow-500 text-white rounded transition-colors"
          >
            <Pause className="w-3.5 h-3.5" />
            Pause All
          </button>
        )}
        {onStopAll && (
          <button
            onClick={onStopAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
          >
            <Square className="w-3.5 h-3.5" />
            Stop All
          </button>
        )}

        {/* Status indicators */}
        <div className="flex-1" />
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-slate-400">Running: {runningCount}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            <span className="text-slate-400">Idle: {idleCount}</span>
          </span>
          {errorCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-slate-400">Error: {errorCount}</span>
            </span>
          )}
        </div>
      </div>

      {/* Worker Grid/List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && workers.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
              <p className="mt-2 text-sm text-slate-500">Loading workers...</p>
            </div>
          </div>
        ) : workers.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Users className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="mt-2 text-slate-400">No workers available</p>
              <p className="text-sm text-slate-500">Workers will appear here when execution starts</p>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {workers.map((worker) => (
              <WorkerCard
                key={worker.id}
                worker={worker}
                onPause={onPauseWorker}
                onResume={onResumeWorker}
                onDisconnect={onDisconnectWorker}
                onClick={setSelectedWorker}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {workers.map((worker) => (
              <WorkerCard
                key={worker.id}
                worker={worker}
                onPause={onPauseWorker}
                onResume={onResumeWorker}
                onDisconnect={onDisconnectWorker}
                onClick={setSelectedWorker}
                compact
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="px-4 py-3 border-t border-slate-800 bg-slate-800/50">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            {totalTests} tests completed | {totalPassed} passed | {totalFailed} failed
          </span>
          {totalTests > 0 && (
            <span className={`font-medium ${
              (totalPassed / totalTests) >= 0.9 ? 'text-green-400' :
              (totalPassed / totalTests) >= 0.7 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {Math.round((totalPassed / totalTests) * 100)}% pass rate
            </span>
          )}
        </div>
      </div>

      {/* Worker Details Modal */}
      {selectedWorker && (
        <WorkerDetailsModal
          worker={selectedWorker}
          recentResults={getWorkerResults(selectedWorker.id)}
          onClose={() => setSelectedWorker(null)}
        />
      )}
    </div>
  );
};

export default WorkerDashboard;
