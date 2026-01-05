/**
 * WorkerDetailsModal - Full worker information modal
 */
import React from 'react';
import {
  X,
  Monitor,
  Cpu,
  MemoryStick,
  Timer,
  CheckCircle,
  AlertCircle,
  Clock,
  Wifi,
  Chrome,
  Compass,
  Globe,
  Activity,
  BarChart3,
} from 'lucide-react';
import type { Worker, BrowserType, TestResult } from '@/types/execution';

interface WorkerDetailsModalProps {
  worker: Worker;
  recentResults?: TestResult[];
  onClose: () => void;
}

const browserIcons: Record<BrowserType, React.ReactNode> = {
  chromium: <Chrome className="w-5 h-5" />,
  firefox: <Compass className="w-5 h-5" />,
  webkit: <Globe className="w-5 h-5" />,
};

const browserNames: Record<BrowserType, string> = {
  chromium: 'Chromium',
  firefox: 'Firefox',
  webkit: 'WebKit (Safari)',
};

export const WorkerDetailsModal: React.FC<WorkerDetailsModalProps> = ({
  worker,
  recentResults = [],
  onClose,
}) => {
  const passRate = worker.testsCompleted > 0
    ? Math.round((worker.testsPassed / worker.testsCompleted) * 100)
    : 0;

  const avgDuration = worker.metrics?.avgTestDuration
    ? (worker.metrics.avgTestDuration / 1000).toFixed(1)
    : '--';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="w-full max-w-2xl bg-slate-900 rounded-lg border border-slate-700 shadow-xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="worker-details-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h2 id="worker-details-title" className="text-lg font-semibold text-slate-200">
                Worker {worker.index + 1}
              </h2>
              <p className="text-sm text-slate-500">ID: {worker.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Status & Browser */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-400">Status</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`
                  w-2.5 h-2.5 rounded-full
                  ${worker.status === 'running' ? 'bg-green-500 animate-pulse' :
                    worker.status === 'paused' ? 'bg-yellow-500' :
                    worker.status === 'error' ? 'bg-red-500' :
                    worker.status === 'idle' ? 'bg-slate-500' : 'bg-gray-500'}
                `} />
                <span className="text-lg font-semibold text-slate-200 capitalize">
                  {worker.status}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-slate-500">{browserIcons[worker.browser]}</span>
                <span className="text-sm font-medium text-slate-400">Browser</span>
              </div>
              <span className="text-lg font-semibold text-slate-200">
                {browserNames[worker.browser]}
              </span>
            </div>
          </div>

          {/* Current Test */}
          {worker.currentTest && (
            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-slate-400">Currently Running</span>
              </div>
              <div className="space-y-1">
                <div className="text-slate-200 font-medium">{worker.currentTest.name}</div>
                <div className="text-sm text-slate-500">{worker.currentTest.file}</div>
                <div className="text-xs text-slate-600">
                  Started: {new Date(worker.currentTest.startTime).toLocaleTimeString()}
                </div>
              </div>
            </div>
          )}

          {/* Test Statistics */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-medium text-slate-400">
              <BarChart3 className="w-4 h-4" />
              Test Statistics
            </h3>
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-center">
                <div className="text-2xl font-bold text-slate-200">{worker.testsCompleted}</div>
                <div className="text-xs text-slate-500">Total</div>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                <div className="text-2xl font-bold text-green-400">{worker.testsPassed}</div>
                <div className="text-xs text-green-400/70">Passed</div>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
                <div className="text-2xl font-bold text-red-400">{worker.testsFailed}</div>
                <div className="text-xs text-red-400/70">Failed</div>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-center">
                <div className="text-2xl font-bold text-blue-400">{passRate}%</div>
                <div className="text-xs text-blue-400/70">Pass Rate</div>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          {worker.metrics && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-400">Performance Metrics</h3>
              <div className="grid grid-cols-2 gap-4">
                {worker.metrics.cpuUsage !== undefined && (
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-blue-400" />
                        <span className="text-sm text-slate-400">CPU Usage</span>
                      </div>
                      <span className="text-lg font-semibold text-slate-200">
                        {worker.metrics.cpuUsage}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${worker.metrics.cpuUsage}%` }}
                      />
                    </div>
                  </div>
                )}

                {worker.metrics.memoryUsage !== undefined && (
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MemoryStick className="w-4 h-4 text-purple-400" />
                        <span className="text-sm text-slate-400">Memory Usage</span>
                      </div>
                      <span className="text-lg font-semibold text-slate-200">
                        {worker.metrics.memoryUsage}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 transition-all"
                        style={{ width: `${worker.metrics.memoryUsage}%` }}
                      />
                    </div>
                  </div>
                )}

                {worker.metrics.networkLatency !== undefined && (
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-slate-400">Network Latency</span>
                    </div>
                    <span className="text-lg font-semibold text-slate-200">
                      {worker.metrics.networkLatency}ms
                    </span>
                  </div>
                )}

                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-slate-400">Avg Test Duration</span>
                  </div>
                  <span className="text-lg font-semibold text-slate-200">
                    {avgDuration}s
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Recent Results */}
          {recentResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-400">Recent Test Results</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {recentResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/50"
                  >
                    {result.status === 'passed' ? (
                      <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-300 truncate">{result.testName}</div>
                      <div className="text-xs text-slate-500 truncate">{result.file}</div>
                    </div>
                    <span className="text-xs text-slate-500 shrink-0">
                      {(result.duration / 1000).toFixed(1)}s
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Configuration */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-400">Configuration</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {worker.endpoint && (
                <div>
                  <span className="text-slate-500">Endpoint:</span>
                  <span className="ml-2 text-slate-300">{worker.endpoint}</span>
                </div>
              )}
              {worker.shardIndex !== undefined && (
                <div>
                  <span className="text-slate-500">Shard Index:</span>
                  <span className="ml-2 text-slate-300">{worker.shardIndex}</span>
                </div>
              )}
              {worker.startTime && (
                <div>
                  <span className="text-slate-500">Started:</span>
                  <span className="ml-2 text-slate-300">
                    {new Date(worker.startTime).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 bg-slate-800/50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkerDetailsModal;
