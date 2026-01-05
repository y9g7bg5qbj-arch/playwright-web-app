import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { executionsApi } from '@/api/executions';
import { testFlowsApi } from '@/api/testFlows';
import type { Execution, TestFlow } from '@playwright-web-app/shared';

export function ExecutionHistoryPage() {
  const { testFlowId } = useParams<{ testFlowId: string }>();
  const navigate = useNavigate();
  const [testFlow, setTestFlow] = useState<TestFlow | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (testFlowId) {
      loadData();
    }
  }, [testFlowId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [flowData, executionData] = await Promise.all([
        testFlowsApi.getOne(testFlowId!),
        executionsApi.getAll(testFlowId!),
      ]);
      setTestFlow(flowData);
      setExecutions(executionData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'running': return '⏳';
      case 'cancelled': return '🚫';
      default: return '⏸️';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-800 border-green-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'running': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const formatDuration = (startedAt?: Date | string, finishedAt?: Date | string) => {
    if (!startedAt || !finishedAt) return '-';
    const start = new Date(startedAt).getTime();
    const end = new Date(finishedAt).getTime();
    const ms = end - start;
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const formatDate = (date?: Date | string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString();
  };

  // Calculate stats
  const stats = executions.reduce(
    (acc, exec) => {
      acc.total++;
      if (exec.status === 'passed') acc.passed++;
      else if (exec.status === 'failed') acc.failed++;
      return acc;
    },
    { total: 0, passed: 0, failed: 0 }
  );

  const passRate = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading execution history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => navigate(-1)}
                className="text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1 text-sm"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                Execution History
              </h1>
              {testFlow && (
                <p className="text-gray-600 mt-1">{testFlow.name}</p>
              )}
            </div>
            <Link
              to={`/test-flow/${testFlowId}`}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              ← Back to Test Flow
            </Link>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm font-medium text-gray-500">Total Runs</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm font-medium text-gray-500">Passed</div>
            <div className="text-3xl font-bold text-green-600 mt-1">{stats.passed}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm font-medium text-gray-500">Failed</div>
            <div className="text-3xl font-bold text-red-600 mt-1">{stats.failed}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm font-medium text-gray-500">Pass Rate</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{passRate.toFixed(0)}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${passRate === 100 ? 'bg-green-500' : passRate >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${passRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Trend Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Execution Trend</h2>
          <div className="flex items-end gap-1 h-24">
            {executions.slice(0, 20).reverse().map((exec, index) => (
              <div
                key={exec.id}
                className={`flex-1 rounded-t cursor-pointer transition-opacity hover:opacity-80 ${
                  exec.status === 'passed' ? 'bg-green-500' :
                  exec.status === 'failed' ? 'bg-red-500' :
                  'bg-gray-300'
                }`}
                style={{ height: exec.status === 'passed' ? '100%' : exec.status === 'failed' ? '60%' : '30%' }}
                title={`#${executions.length - index}: ${exec.status}`}
                onClick={() => navigate(`/execution/${exec.id}`)}
              />
            ))}
            {executions.length === 0 && (
              <div className="flex-1 text-center text-gray-500 py-8">
                No executions yet
              </div>
            )}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Older</span>
            <span>Recent</span>
          </div>
        </div>

        {/* Execution List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">All Executions</h2>
          </div>

          {executions.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {executions.map((execution, index) => (
                <Link
                  key={execution.id}
                  to={`/execution/${execution.id}`}
                  className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Run Number */}
                  <div className="flex-shrink-0 w-12 text-center">
                    <div className="text-lg font-bold text-gray-400">
                      #{executions.length - index}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className={`flex-shrink-0 px-3 py-1 rounded-full border text-sm font-semibold ${getStatusColor(execution.status)}`}>
                    {getStatusIcon(execution.status)} {execution.status.toUpperCase()}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900 font-mono truncate">
                      {execution.id}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(execution.createdAt)}
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {formatDuration(execution.startedAt, execution.finishedAt)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {execution.target}
                    </div>
                  </div>

                  {/* Exit Code */}
                  {execution.exitCode !== undefined && (
                    <div className="flex-shrink-0">
                      <span className={`px-2 py-1 text-xs rounded ${
                        execution.exitCode === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        Exit: {execution.exitCode}
                      </span>
                    </div>
                  )}

                  {/* Arrow */}
                  <div className="flex-shrink-0 text-gray-400">
                    →
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-4 py-12 text-center text-gray-500">
              <div className="text-4xl mb-4">📋</div>
              <p className="text-lg font-medium">No executions yet</p>
              <p className="text-sm mt-1">Run the test to see execution history here</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
