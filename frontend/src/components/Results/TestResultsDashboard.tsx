/**
 * TestResultsDashboard - Summary dashboard for test results
 *
 * Features:
 * - Summary cards (passed, failed, skipped, flaky)
 * - Charts for pass rate trends
 * - Run history list
 * - Quick filters
 */
import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  SkipForward,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Filter,
  Calendar,
} from 'lucide-react';
import { TestResultCard, type TestResult } from './TestResultCard';
import { TestResultsTable } from './TestResultsTable';

export interface TestRun {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'running' | 'cancelled';
  startedAt: string;
  finishedAt?: string;
  duration: number;
  browser: string;
  results: TestResult[];
  branch?: string;
  commit?: string;
}

export interface TestResultsDashboardProps {
  runs: TestRun[];
  onViewRun?: (runId: string) => void;
  onViewTrace?: (testId: string, traceUrl: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

type ViewMode = 'grid' | 'table';
type StatusFilter = 'all' | 'passed' | 'failed' | 'flaky' | 'skipped';
type TimeFilter = 'today' | 'week' | 'month' | 'all';

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
};

export const TestResultsDashboard: React.FC<TestResultsDashboardProps> = ({
  runs,
  onViewRun,
  onViewTrace,
  onRefresh,
  isLoading = false,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate summary statistics
  const stats = useMemo(() => {
    const allResults = runs.flatMap(r => r.results);
    const passed = allResults.filter(r => r.status === 'passed').length;
    const failed = allResults.filter(r => r.status === 'failed').length;
    const skipped = allResults.filter(r => r.status === 'skipped').length;
    const flaky = allResults.filter(r => r.isFlaky).length;
    const total = allResults.length;
    const passRate = total > 0 ? (passed / total) * 100 : 0;

    // Calculate trend (compare last 2 runs)
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (runs.length >= 2) {
      const lastRun = runs[0];
      const prevRun = runs[1];
      const lastPassRate = lastRun.results.filter(r => r.status === 'passed').length / lastRun.results.length;
      const prevPassRate = prevRun.results.filter(r => r.status === 'passed').length / prevRun.results.length;
      if (lastPassRate > prevPassRate + 0.05) trend = 'up';
      else if (lastPassRate < prevPassRate - 0.05) trend = 'down';
    }

    const avgDuration = runs.length > 0
      ? runs.reduce((sum, r) => sum + r.duration, 0) / runs.length
      : 0;

    return { passed, failed, skipped, flaky, total, passRate, trend, avgDuration };
  }, [runs]);

  // Filter runs based on current filters
  const filteredRuns = useMemo(() => {
    return runs.filter(run => {
      // Time filter
      if (timeFilter !== 'all') {
        const runDate = new Date(run.startedAt);
        const now = new Date();
        const diffDays = (now.getTime() - runDate.getTime()) / (1000 * 60 * 60 * 24);
        if (timeFilter === 'today' && diffDays > 1) return false;
        if (timeFilter === 'week' && diffDays > 7) return false;
        if (timeFilter === 'month' && diffDays > 30) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        const hasStatus = run.results.some(r => {
          if (statusFilter === 'flaky') return r.isFlaky;
          return r.status === statusFilter;
        });
        if (!hasStatus) return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          run.name.toLowerCase().includes(query) ||
          run.branch?.toLowerCase().includes(query) ||
          run.results.some(r => r.name.toLowerCase().includes(query))
        );
      }

      return true;
    });
  }, [runs, timeFilter, statusFilter, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-100">Test Results</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {runs.length} runs | {stats.total} tests
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* Pass Rate */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 font-medium">Pass Rate</span>
            {stats.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-400" />}
            {stats.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-400" />}
            {stats.trend === 'stable' && <Minus className="w-4 h-4 text-slate-400" />}
          </div>
          <div className="text-2xl font-bold text-slate-100">{stats.passRate.toFixed(1)}%</div>
          <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${stats.passRate}%` }}
            />
          </div>
        </div>

        {/* Passed */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-xs text-slate-500 font-medium">Passed</span>
          </div>
          <div className="text-2xl font-bold text-green-400">{stats.passed}</div>
        </div>

        {/* Failed */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="text-xs text-slate-500 font-medium">Failed</span>
          </div>
          <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
        </div>

        {/* Skipped */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <SkipForward className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Skipped</span>
          </div>
          <div className="text-2xl font-bold text-slate-400">{stats.skipped}</div>
        </div>

        {/* Flaky */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-slate-500 font-medium">Flaky</span>
          </div>
          <div className="text-2xl font-bold text-yellow-400">{stats.flaky}</div>
        </div>

        {/* Avg Duration */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-slate-500 font-medium">Avg Duration</span>
          </div>
          <div className="text-2xl font-bold text-blue-400">{formatDuration(stats.avgDuration)}</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="px-6 py-3 border-b border-slate-800 flex items-center gap-4 flex-wrap">
        {/* Search */}
        <div className="flex-1 min-w-[200px] max-w-md">
          <input
            type="text"
            placeholder="Search tests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1">
          {(['all', 'passed', 'failed', 'flaky', 'skipped'] as StatusFilter[]).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === status
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-slate-800/50 text-slate-500 hover:text-slate-300 border border-transparent'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Time Filter */}
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4 text-slate-500" />
          {(['today', 'week', 'month', 'all'] as TimeFilter[]).map(time => (
            <button
              key={time}
              onClick={() => setTimeFilter(time)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                timeFilter === time
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-slate-800/50 text-slate-500 hover:text-slate-300 border border-transparent'
              }`}
            >
              {time.charAt(0).toUpperCase() + time.slice(1)}
            </button>
          ))}
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'grid' ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Grid view"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'table' ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Table view"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Results Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {filteredRuns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <Filter className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-slate-400 font-medium">No results found</p>
            <p className="text-sm text-slate-500 mt-1">Try adjusting your filters</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="space-y-6">
            {filteredRuns.map(run => (
              <div key={run.id} className="space-y-3">
                {/* Run header */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => onViewRun?.(run.id)}
                    className="flex items-center gap-2 hover:text-blue-400 transition-colors"
                  >
                    <span className={`w-2 h-2 rounded-full ${
                      run.status === 'passed' ? 'bg-green-400' :
                      run.status === 'failed' ? 'bg-red-400' :
                      run.status === 'running' ? 'bg-blue-400 animate-pulse' :
                      'bg-slate-400'
                    }`} />
                    <span className="font-medium text-slate-200">{run.name}</span>
                    {run.branch && (
                      <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                        {run.branch}
                      </span>
                    )}
                  </button>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{new Date(run.startedAt).toLocaleString()}</span>
                    <span>{formatDuration(run.duration)}</span>
                    <span className="text-slate-600">{run.browser}</span>
                  </div>
                </div>

                {/* Results grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {run.results
                    .filter(r => statusFilter === 'all' || r.status === statusFilter || (statusFilter === 'flaky' && r.isFlaky))
                    .map(result => (
                      <TestResultCard
                        key={result.id}
                        result={result}
                        onViewTrace={onViewTrace}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <TestResultsTable
            runs={filteredRuns}
            onViewRun={onViewRun}
            onViewTrace={onViewTrace}
          />
        )}
      </div>
    </div>
  );
};

export default TestResultsDashboard;
