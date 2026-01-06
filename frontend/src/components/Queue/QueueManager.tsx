/**
 * Queue Manager Component
 * UI for managing and monitoring job queues
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RefreshCw,
  Trash2,
  RotateCcw,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Server,
  Database,
} from 'lucide-react';

interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

interface QueueJob {
  id: string;
  name: string;
  priority: number;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';
  attempts: number;
  maxAttempts: number;
  progress: number;
  createdAt: string;
  processedAt?: string;
  finishedAt?: string;
  failedReason?: string;
  dataPreview?: {
    scheduleId?: string;
    runId?: string;
    triggerType?: string;
  };
}

interface QueueInfo {
  key: string;
  name: string;
  description: string;
}

const API_BASE = '/api/queue';

export const QueueManager: React.FC = () => {
  const [queues, setQueues] = useState<QueueStats[]>([]);
  const [queueInfo, setQueueInfo] = useState<QueueInfo[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [jobStatus, setJobStatus] = useState<string>('waiting');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redisConnected, setRedisConnected] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch queue stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/stats`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setQueues(data.data.queues);
        setRedisConnected(data.data.redisConnected);
      }
    } catch (err) {
      console.error('Failed to fetch queue stats:', err);
    }
  }, []);

  // Fetch queue info
  const fetchQueueInfo = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/info`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setQueueInfo(data.data.queues);
      }
    } catch (err) {
      console.error('Failed to fetch queue info:', err);
    }
  }, []);

  // Fetch jobs for selected queue
  const fetchJobs = useCallback(async () => {
    if (!selectedQueue) return;

    try {
      const response = await fetch(
        `${API_BASE}/${selectedQueue}/jobs?status=${jobStatus}`,
        { credentials: 'include' }
      );
      const data = await response.json();
      if (data.success) {
        setJobs(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    }
  }, [selectedQueue, jobStatus]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchQueueInfo()]);
      setLoading(false);
    };
    init();

    // Refresh stats every 5 seconds
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchQueueInfo]);

  // Fetch jobs when queue or status changes
  useEffect(() => {
    if (selectedQueue) {
      fetchJobs();
    }
  }, [selectedQueue, jobStatus, fetchJobs]);

  // Refresh all data
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchJobs()]);
    setRefreshing(false);
  };

  // Pause/Resume queue
  const handleTogglePause = async (queueName: string, isPaused: boolean) => {
    try {
      const action = isPaused ? 'resume' : 'pause';
      const response = await fetch(`${API_BASE}/${queueName}/${action}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        await fetchStats();
      }
    } catch (err) {
      console.error(`Failed to ${isPaused ? 'resume' : 'pause'} queue:`, err);
    }
  };

  // Clean queue
  const handleCleanQueue = async (queueName: string, status: 'completed' | 'failed') => {
    try {
      const response = await fetch(`${API_BASE}/${queueName}/clean`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, grace: 0 }),
      });
      if (response.ok) {
        await fetchStats();
        if (selectedQueue === queueName) {
          await fetchJobs();
        }
      }
    } catch (err) {
      console.error('Failed to clean queue:', err);
    }
  };

  // Retry failed job
  const handleRetryJob = async (queueName: string, jobId: string) => {
    try {
      const response = await fetch(`${API_BASE}/${queueName}/jobs/${jobId}/retry`, {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        await fetchJobs();
        await fetchStats();
      }
    } catch (err) {
      console.error('Failed to retry job:', err);
    }
  };

  // Remove job
  const handleRemoveJob = async (queueName: string, jobId: string) => {
    try {
      const response = await fetch(`${API_BASE}/${queueName}/jobs/${jobId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        await fetchJobs();
        await fetchStats();
      }
    } catch (err) {
      console.error('Failed to remove job:', err);
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'waiting':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'active':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'delayed':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  // Get priority label
  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 0:
        return { label: 'Low', color: 'text-gray-500' };
      case 1:
        return { label: 'Normal', color: 'text-blue-500' };
      case 2:
        return { label: 'High', color: 'text-orange-500' };
      case 3:
        return { label: 'Critical', color: 'text-red-500' };
      default:
        return { label: 'Normal', color: 'text-blue-500' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Queue Manager
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Monitor and manage job queues
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Redis Status */}
          <div className="flex items-center gap-2 text-sm">
            <Database className="w-4 h-4" />
            <span
              className={redisConnected ? 'text-green-500' : 'text-yellow-500'}
            >
              {redisConnected ? 'Redis Connected' : 'In-Memory Mode'}
            </span>
          </div>
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Queue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {queues.map((queue) => {
          const info = queueInfo.find((q) => q.name === queue.name);
          const isSelected = selectedQueue === queue.name;

          return (
            <div
              key={queue.name}
              onClick={() => setSelectedQueue(queue.name)}
              className={`
                p-4 rounded-lg border cursor-pointer transition-all
                ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }
                ${queue.paused ? 'opacity-60' : ''}
              `}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-gray-500" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {info?.key || queue.name}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTogglePause(queue.name, queue.paused);
                  }}
                  className={`p-1 rounded ${
                    queue.paused
                      ? 'text-green-500 hover:bg-green-100 dark:hover:bg-green-900/20'
                      : 'text-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-900/20'
                  }`}
                  title={queue.paused ? 'Resume Queue' : 'Pause Queue'}
                >
                  {queue.paused ? (
                    <Play className="w-4 h-4" />
                  ) : (
                    <Pause className="w-4 h-4" />
                  )}
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {info?.description}
              </p>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-bold text-yellow-500">
                    {queue.waiting}
                  </div>
                  <div className="text-xs text-gray-500">Waiting</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-500">
                    {queue.active}
                  </div>
                  <div className="text-xs text-gray-500">Active</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-red-500">
                    {queue.failed}
                  </div>
                  <div className="text-xs text-gray-500">Failed</div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCleanQueue(queue.name, 'completed');
                  }}
                  className="flex-1 text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  title="Clean completed jobs"
                >
                  Clear Done ({queue.completed})
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCleanQueue(queue.name, 'failed');
                  }}
                  className="flex-1 text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  title="Clean failed jobs"
                >
                  Clear Failed
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Jobs Table */}
      {selectedQueue && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-gray-900 dark:text-white">
                Jobs in {selectedQueue}
              </h2>
              <div className="flex items-center gap-2">
                <select
                  value={jobStatus}
                  onChange={(e) => setJobStatus(e.target.value)}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="waiting">Waiting</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="delayed">Delayed</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Job ID
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Name
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Priority
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Attempts
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Created
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {jobs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      No {jobStatus} jobs
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => {
                    const priority = getPriorityLabel(job.priority);
                    return (
                      <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(job.status)}
                            <span className="text-sm capitalize">
                              {job.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-mono text-gray-600 dark:text-gray-300">
                            {job.id.slice(0, 8)}...
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="text-sm text-gray-900 dark:text-white">
                              {job.name}
                            </div>
                            {job.dataPreview?.runId && (
                              <div className="text-xs text-gray-500">
                                Run: {job.dataPreview.runId.slice(0, 8)}...
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm ${priority.color}`}>
                            {priority.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm">
                            {job.attempts}/{job.maxAttempts}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-500">
                            {new Date(job.createdAt).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {job.status === 'failed' && (
                              <button
                                onClick={() =>
                                  handleRetryJob(selectedQueue, job.id)
                                }
                                className="p-1 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded"
                                title="Retry Job"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() =>
                                handleRemoveJob(selectedQueue, job.id)
                              }
                              className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                              title="Remove Job"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Failed Job Error */}
          {jobStatus === 'failed' && jobs.some((j) => j.failedReason) && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Error Details
              </h3>
              {jobs
                .filter((j) => j.failedReason)
                .map((job) => (
                  <div
                    key={job.id}
                    className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm"
                  >
                    <span className="font-mono text-red-700 dark:text-red-300">
                      {job.id.slice(0, 8)}:
                    </span>{' '}
                    <span className="text-red-600 dark:text-red-400">
                      {job.failedReason}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QueueManager;
