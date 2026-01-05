import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { executionsApi } from '@/api/executions';
import { apiClient } from '@/api/client';
import type { Execution } from '@playwright-web-app/shared';

interface Screenshot {
  stepNumber: number;
  filename: string;
  url: string;
  blobUrl?: string;
}

export function ExecutionReportPage() {
  const { executionId } = useParams<{ executionId: string }>();
  const navigate = useNavigate();
  const [execution, setExecution] = useState<Execution | null>(null);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [logFilter, setLogFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');

  useEffect(() => {
    if (executionId) {
      loadExecution();
      loadScreenshots();
    }
  }, [executionId]);

  const loadExecution = async () => {
    try {
      setIsLoading(true);
      const data = await executionsApi.getOne(executionId!);
      setExecution(data);
    } catch (error) {
      console.error('Failed to load execution:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadScreenshots = async () => {
    try {
      const data = await apiClient.get<Screenshot[]>(`/executions/${executionId}/screenshots`);

      // Fetch each screenshot with auth
      const screenshotsWithBlobs = await Promise.all(
        (data || []).map(async (screenshot) => {
          try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`http://localhost:3000/api${screenshot.url}`, {
              headers: { 'Authorization': `Bearer ${token}` },
            });
            if (response.ok) {
              const blob = await response.blob();
              return { ...screenshot, blobUrl: URL.createObjectURL(blob) };
            }
          } catch (error) {
            console.error('Failed to fetch screenshot:', error);
          }
          return screenshot;
        })
      );
      setScreenshots(screenshotsWithBlobs);
    } catch (error) {
      console.error('Failed to load screenshots:', error);
    }
  };

  const toggleStep = (stepNumber: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepNumber)) {
        next.delete(stepNumber);
      } else {
        next.add(stepNumber);
      }
      return next;
    });
  };

  const expandAllSteps = () => {
    if (execution?.steps) {
      setExpandedSteps(new Set(execution.steps.map(s => s.stepNumber)));
    }
  };

  const collapseAllSteps = () => {
    setExpandedSteps(new Set());
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'running': return '⏳';
      case 'skipped': return '⏭️';
      default: return '⏸️';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-green-600 bg-green-50 border-green-200';
      case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      case 'running': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'skipped': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50';
      case 'warn': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTimestamp = (date?: Date | string) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour12: false });
  };

  const calculateDuration = () => {
    if (!execution?.startedAt || !execution?.finishedAt) return null;
    const start = new Date(execution.startedAt).getTime();
    const end = new Date(execution.finishedAt).getTime();
    return end - start;
  };

  const calculateStepStats = () => {
    if (!execution?.steps) return { total: 0, passed: 0, failed: 0, skipped: 0 };
    return execution.steps.reduce(
      (acc, step) => {
        acc.total++;
        if (step.status === 'passed') acc.passed++;
        else if (step.status === 'failed') acc.failed++;
        else if (step.status === 'skipped') acc.skipped++;
        return acc;
      },
      { total: 0, passed: 0, failed: 0, skipped: 0 }
    );
  };

  const filteredLogs = execution?.logs?.filter(log => {
    if (logFilter === 'all') return true;
    return log.level === logFilter;
  }) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading execution report...</p>
        </div>
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-900">Execution not found</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-primary-600 hover:text-primary-700">
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  const duration = calculateDuration();
  const stepStats = calculateStepStats();
  const passRate = stepStats.total > 0 ? (stepStats.passed / stepStats.total) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className={`${execution.status === 'passed' ? 'bg-green-600' : execution.status === 'failed' ? 'bg-red-600' : 'bg-gray-600'} text-white`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white mb-2 flex items-center gap-1">
                ← Back to Test Flow
              </button>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                {getStatusIcon(execution.status)}
                Execution Report
              </h1>
              <p className="text-white/80 mt-1 font-mono text-sm">
                ID: {execution.id}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold uppercase">{execution.status}</div>
              <div className="text-white/80 text-sm">
                {execution.createdAt && new Date(execution.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Status Card */}
          <div className={`rounded-lg border-2 p-4 ${getStatusColor(execution.status)}`}>
            <div className="text-sm font-medium opacity-75">Status</div>
            <div className="text-2xl font-bold flex items-center gap-2 mt-1">
              {getStatusIcon(execution.status)}
              <span className="uppercase">{execution.status}</span>
            </div>
            {execution.exitCode !== undefined && (
              <div className="text-sm mt-1 opacity-75">Exit Code: {execution.exitCode}</div>
            )}
          </div>

          {/* Duration Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm font-medium text-gray-500">Duration</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {duration ? formatDuration(duration) : '-'}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {execution.startedAt && `Started: ${formatTimestamp(execution.startedAt)}`}
            </div>
          </div>

          {/* Steps Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm font-medium text-gray-500">Steps</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {stepStats.total} Total
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm">
              <span className="text-green-600">✅ {stepStats.passed}</span>
              <span className="text-red-600">❌ {stepStats.failed}</span>
              {stepStats.skipped > 0 && <span className="text-gray-500">⏭️ {stepStats.skipped}</span>}
            </div>
          </div>

          {/* Pass Rate Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm font-medium text-gray-500">Pass Rate</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {passRate.toFixed(1)}%
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${passRate === 100 ? 'bg-green-500' : passRate >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${passRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Steps Timeline */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Steps Timeline</h2>
            <div className="flex gap-2">
              <button
                onClick={expandAllSteps}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                Expand All
              </button>
              <button
                onClick={collapseAllSteps}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                Collapse All
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {execution.steps && execution.steps.length > 0 ? (
              execution.steps.map((step) => {
                const isExpanded = expandedSteps.has(step.stepNumber);
                const screenshot = screenshots.find(s => s.stepNumber === step.stepNumber);

                return (
                  <div key={step.id} className={`${step.status === 'failed' ? 'bg-red-50/50' : ''}`}>
                    {/* Step Header */}
                    <div
                      className="px-4 py-3 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleStep(step.stepNumber)}
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-semibold text-sm">
                        {step.stepNumber}
                      </div>
                      <div className="flex-shrink-0 text-xl">
                        {getStatusIcon(step.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-xs font-semibold uppercase bg-gray-200 rounded">
                            {step.action}
                          </span>
                          <span className="text-sm text-gray-900 truncate">
                            {step.description || step.selector || '-'}
                          </span>
                        </div>
                        {step.error && (
                          <div className="text-xs text-red-600 mt-1 truncate">
                            {step.error}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-sm font-mono text-gray-600">
                          {formatDuration(step.duration)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatTimestamp(step.startedAt)}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-gray-400">
                        {isExpanded ? '▼' : '▶'}
                      </div>
                    </div>

                    {/* Step Details (Expanded) */}
                    {isExpanded && (
                      <div className="px-4 pb-4 ml-12 space-y-3">
                        {/* Screenshot */}
                        {screenshot?.blobUrl && (
                          <div className="border border-gray-200 rounded-lg overflow-hidden inline-block">
                            <img
                              src={screenshot.blobUrl}
                              alt={`Step ${step.stepNumber} screenshot`}
                              className="max-w-md h-auto cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(screenshot.blobUrl, '_blank')}
                            />
                            <div className="px-3 py-2 bg-gray-50 text-xs text-gray-500">
                              Click to enlarge
                            </div>
                          </div>
                        )}

                        {/* Step Properties */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {step.selector && (
                            <div>
                              <div className="text-gray-500 font-medium">Selector</div>
                              <div className="font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded mt-1 break-all">
                                {step.selector}
                              </div>
                            </div>
                          )}
                          {step.selectorName && (
                            <div>
                              <div className="text-gray-500 font-medium">Element</div>
                              <div className="text-gray-900 mt-1">{step.selectorName}</div>
                            </div>
                          )}
                          {step.value && (
                            <div>
                              <div className="text-gray-500 font-medium">Value</div>
                              <div className="text-gray-900 mt-1">{step.value}</div>
                            </div>
                          )}
                          {step.url && (
                            <div className="col-span-2">
                              <div className="text-gray-500 font-medium">URL</div>
                              <div className="font-mono text-gray-900 text-xs mt-1 break-all">{step.url}</div>
                            </div>
                          )}
                        </div>

                        {/* Error Details */}
                        {step.error && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="text-red-800 font-medium text-sm mb-1">Error</div>
                            <pre className="text-red-700 text-xs whitespace-pre-wrap font-mono">
                              {step.error}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-8 text-center text-gray-500">
                <p>No step data available for this execution.</p>
                <p className="text-sm mt-1">Step-level tracking requires the latest agent version.</p>
              </div>
            )}
          </div>
        </div>

        {/* Execution Logs */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Execution Logs</h2>
            <div className="flex gap-1">
              {(['all', 'info', 'warn', 'error'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setLogFilter(level)}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    logFilter === level
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                  {level !== 'all' && execution.logs && (
                    <span className="ml-1 opacity-75">
                      ({execution.logs.filter(l => l.level === level).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {filteredLogs.length > 0 ? (
              <div className="divide-y divide-gray-100 font-mono text-sm">
                {filteredLogs.map((log) => (
                  <div key={log.id} className={`px-4 py-2 flex gap-4 ${getLogLevelColor(log.level)}`}>
                    <span className="text-gray-400 flex-shrink-0">
                      {formatTimestamp(log.timestamp)}
                    </span>
                    <span className={`flex-shrink-0 uppercase font-semibold w-14 ${
                      log.level === 'error' ? 'text-red-600' :
                      log.level === 'warn' ? 'text-yellow-600' : 'text-gray-500'
                    }`}>
                      [{log.level}]
                    </span>
                    <span className="flex-1 whitespace-pre-wrap break-all">
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-gray-500">
                No logs available
              </div>
            )}
          </div>
        </div>

        {/* Raw Screenshots (if no steps data) */}
        {(!execution.steps || execution.steps.length === 0) && screenshots.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 mt-6">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Screenshots</h2>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
              {screenshots.map((screenshot) => (
                <div key={screenshot.filename} className="border border-gray-200 rounded-lg overflow-hidden">
                  {screenshot.blobUrl && (
                    <img
                      src={screenshot.blobUrl}
                      alt={screenshot.filename}
                      className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(screenshot.blobUrl, '_blank')}
                    />
                  )}
                  <div className="px-3 py-2 bg-gray-50 text-xs text-gray-500">
                    Step {screenshot.stepNumber}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
