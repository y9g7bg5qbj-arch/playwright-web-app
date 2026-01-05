/**
 * WorkerCard - Individual worker status card
 */
import React from 'react';
import {
  Monitor,
  Pause,
  Play,
  XCircle,
  Loader2,
  CheckCircle,
  AlertCircle,
  Cpu,
  MemoryStick,
  Timer,
  Chrome,
  Compass,
  Globe,
} from 'lucide-react';
import type { Worker, BrowserType } from '@/types/execution';

interface WorkerCardProps {
  worker: Worker;
  onPause?: (workerId: string) => void;
  onResume?: (workerId: string) => void;
  onDisconnect?: (workerId: string) => void;
  onClick?: (worker: Worker) => void;
  compact?: boolean;
}

const browserIcons: Record<BrowserType, React.ReactNode> = {
  chromium: <Chrome className="w-4 h-4" />,
  firefox: <Compass className="w-4 h-4" />,
  webkit: <Globe className="w-4 h-4" />,
};

const statusColors = {
  idle: 'bg-slate-500',
  running: 'bg-green-500',
  paused: 'bg-yellow-500',
  error: 'bg-red-500',
  disconnected: 'bg-gray-500',
  connecting: 'bg-blue-500',
};

const statusIcons = {
  idle: <Monitor className="w-4 h-4" />,
  running: <Loader2 className="w-4 h-4 animate-spin" />,
  paused: <Pause className="w-4 h-4" />,
  error: <AlertCircle className="w-4 h-4" />,
  disconnected: <XCircle className="w-4 h-4" />,
  connecting: <Loader2 className="w-4 h-4 animate-spin" />,
};

export const WorkerCard: React.FC<WorkerCardProps> = ({
  worker,
  onPause,
  onResume,
  onDisconnect,
  onClick,
  compact = false,
}) => {
  const passRate = worker.testsCompleted > 0
    ? Math.round((worker.testsPassed / worker.testsCompleted) * 100)
    : 0;

  if (compact) {
    return (
      <div
        onClick={() => onClick?.(worker)}
        className={`
          flex items-center gap-3 p-3 rounded-lg border border-slate-700 bg-slate-800/50
          hover:bg-slate-800 transition-colors cursor-pointer
        `}
        role="button"
        tabIndex={0}
        aria-label={`Worker ${worker.index + 1}: ${worker.status}`}
      >
        <div className={`w-2 h-2 rounded-full ${statusColors[worker.status]}`} />
        <span className="text-sm font-medium text-slate-300">
          Worker {worker.index + 1}
        </span>
        <span className="text-slate-500">{browserIcons[worker.browser]}</span>
        <span className="flex-1 text-xs text-slate-500 truncate">
          {worker.currentTest?.name || 'Idle'}
        </span>
        <span className="text-xs text-slate-400">{worker.testsCompleted} tests</span>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-slate-700 bg-slate-800/50 overflow-hidden hover:border-slate-600 transition-colors"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-slate-800/80 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded ${statusColors[worker.status]} bg-opacity-20`}>
            <span className={`text-${worker.status === 'running' ? 'green' : worker.status === 'error' ? 'red' : 'slate'}-400`}>
              {statusIcons[worker.status]}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-slate-200">
                Worker {worker.index + 1}
              </span>
              <span className="text-slate-500">{browserIcons[worker.browser]}</span>
            </div>
            <span className="text-xs text-slate-500 capitalize">{worker.status}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {worker.status === 'running' && onPause && (
            <button
              onClick={(e) => { e.stopPropagation(); onPause(worker.id); }}
              className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-yellow-400 transition-colors"
              aria-label="Pause worker"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}
          {worker.status === 'paused' && onResume && (
            <button
              onClick={(e) => { e.stopPropagation(); onResume(worker.id); }}
              className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-green-400 transition-colors"
              aria-label="Resume worker"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
          {onDisconnect && worker.status !== 'disconnected' && (
            <button
              onClick={(e) => { e.stopPropagation(); onDisconnect(worker.id); }}
              className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors"
              aria-label="Disconnect worker"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Current Test */}
      {worker.currentTest && (
        <div className="px-3 py-2 border-b border-slate-700">
          <div className="text-xs text-slate-500 mb-1">Current Test</div>
          <div className="text-sm text-slate-300 truncate" title={worker.currentTest.name}>
            {worker.currentTest.name}
          </div>
          <div className="text-xs text-slate-500 truncate" title={worker.currentTest.file}>
            {worker.currentTest.file}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 p-3">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-green-400">
            <CheckCircle className="w-3.5 h-3.5" />
            <span className="font-medium">{worker.testsPassed}</span>
          </div>
          <div className="text-xs text-slate-500">Passed</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-red-400">
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="font-medium">{worker.testsFailed}</span>
          </div>
          <div className="text-xs text-slate-500">Failed</div>
        </div>
        <div className="text-center">
          <div className="font-medium text-slate-300">{worker.testsCompleted}</div>
          <div className="text-xs text-slate-500">Total</div>
        </div>
      </div>

      {/* Metrics */}
      {worker.metrics && (
        <div className="px-3 pb-3 space-y-2">
          {worker.metrics.cpuUsage !== undefined && (
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-slate-500" />
              <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${worker.metrics.cpuUsage}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 w-10 text-right">
                {worker.metrics.cpuUsage}%
              </span>
            </div>
          )}
          {worker.metrics.memoryUsage !== undefined && (
            <div className="flex items-center gap-2">
              <MemoryStick className="w-3.5 h-3.5 text-slate-500" />
              <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all"
                  style={{ width: `${worker.metrics.memoryUsage}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 w-10 text-right">
                {worker.metrics.memoryUsage}%
              </span>
            </div>
          )}
          {worker.metrics.avgTestDuration !== undefined && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Timer className="w-3.5 h-3.5" />
              <span>Avg: {(worker.metrics.avgTestDuration / 1000).toFixed(1)}s</span>
            </div>
          )}
        </div>
      )}

      {/* Footer with pass rate */}
      <div className="px-3 py-2 bg-slate-800/50 border-t border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Pass Rate</span>
          <span className={`text-xs font-medium ${passRate >= 80 ? 'text-green-400' : passRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
            {passRate}%
          </span>
        </div>
        <div className="mt-1 h-1 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${passRate >= 80 ? 'bg-green-500' : passRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${passRate}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default WorkerCard;
