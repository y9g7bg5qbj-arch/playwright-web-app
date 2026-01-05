/**
 * ExecutionCard - Expandable card showing execution metadata and details
 */
import React from 'react';
import {
  ChevronDown,
  ChevronRight,
  User,
  Calendar,
  Webhook,
  Cpu,
  Clock,
  Play,
  Monitor,
} from 'lucide-react';
import { ExecutionReport } from './ExecutionReport';
import type { ExecutionWithDetails } from './ExecutionDashboard';

interface ExecutionCardProps {
  execution: ExecutionWithDetails;
  isExpanded: boolean;
  onToggle: () => void;
  onViewLive: () => void;
  onViewTrace: (traceUrl: string, testName: string) => void;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const formatDuration = (ms?: number): string => {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
};

const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'running':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'passed':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'failed':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'cancelled':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    default:
      return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
};

const getTriggerIcon = (type: string) => {
  switch (type) {
    case 'user':
      return User;
    case 'scheduled':
      return Calendar;
    case 'api':
    case 'webhook':
      return Webhook;
    default:
      return Cpu;
  }
};

export const ExecutionCard: React.FC<ExecutionCardProps> = ({
  execution,
  isExpanded,
  onToggle,
  onViewLive,
  onViewTrace,
}) => {
  const TriggerIcon = getTriggerIcon(execution.triggeredBy.type);
  const isRunning = execution.status === 'running';
  const progressPercent = execution.stepCount > 0
    ? ((execution.passedCount + execution.failedCount) / execution.stepCount) * 100
    : 0;

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden transition-all">
      {/* Header Row - Always Visible */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-4 hover:bg-slate-800/50 transition-colors"
      >
        {/* Expand Arrow */}
        <div className="text-slate-500">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </div>

        {/* Flow Name & Timestamp */}
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-200">{execution.testFlowName}</span>
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
              {execution.target}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(execution.startedAt)}
            </span>
            <span className="text-slate-600">|</span>
            <span>{getRelativeTime(execution.startedAt)}</span>
          </div>
        </div>

        {/* Triggered By */}
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <TriggerIcon className="w-4 h-4" />
          <span>
            {execution.triggeredBy.type === 'user'
              ? execution.triggeredBy.name || 'User'
              : execution.triggeredBy.type.charAt(0).toUpperCase() + execution.triggeredBy.type.slice(1)}
          </span>
        </div>

        {/* Duration */}
        <div className="text-sm text-slate-400 w-20 text-right">
          {execution.duration ? formatDuration(execution.duration) : isRunning ? '-' : '-'}
        </div>

        {/* Status Badge */}
        <div
          className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(execution.status)} ${
            isRunning ? 'animate-pulse' : ''
          }`}
        >
          {execution.status.charAt(0).toUpperCase() + execution.status.slice(1)}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-slate-700/50 bg-slate-900/30">
          {isRunning ? (
            /* Running State - Show Progress & Live View Button */
            <div className="p-4 space-y-4">
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">
                    Running step {execution.passedCount + execution.failedCount + 1} of {execution.stepCount}...
                  </span>
                  <span className="text-slate-500">{progressPercent.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {execution.scenarios && execution.scenarios.length > 0 && (
                  <p className="text-xs text-slate-500">
                    Current: {execution.scenarios.find(s => s.status === 'running')?.name || 'Processing...'}
                  </p>
                )}
              </div>

              {/* Live View Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewLive();
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {execution.target === 'docker' ? (
                  <>
                    <Monitor className="w-4 h-4" />
                    View Live Execution (Netflix View)
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    View Live Execution
                  </>
                )}
              </button>

              {/* Shards Info for Docker */}
              {execution.target === 'docker' && execution.shards && execution.shards.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Monitor className="w-3.5 h-3.5" />
                  <span>
                    {execution.shards.filter(s => s.status === 'running').length} of {execution.shards.length} shards running
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Completed State - Show Allure-style Report */
            <ExecutionReport
              execution={execution}
              scenarios={execution.scenarios || []}
              onViewTrace={onViewTrace}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ExecutionCard;
