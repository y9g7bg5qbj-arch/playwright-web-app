/**
 * SchedulerPanel - User-friendly interface for scheduling test runs
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Plus,
  Play,
  Pause,
  Trash2,
  Clock,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Settings,
  History,
  X,
} from 'lucide-react';
import { schedulesApi, type SchedulePreset } from '@/api/schedules';
import type {
  Schedule,
  ScheduleRun,
  ScheduleTriggerRequest,
  ScheduleParameterDefinition,
} from '@playwright-web-app/shared';
import { RunParametersModal } from './RunParametersModal';
import { ParameterBuilder } from './ParameterBuilder';

// =============================================
// Types
// =============================================

interface SchedulerPanelProps {
  workflowId?: string;
  onRunTriggered?: (runId: string) => void;
}

type ViewMode = 'list' | 'create' | 'edit' | 'history';

// =============================================
// Cron Presets (built-in)
// =============================================

const CRON_PRESETS: SchedulePreset[] = [
  { label: 'Every hour', cronExpression: '0 * * * *', description: 'Runs at the start of every hour' },
  { label: 'Every 30 minutes', cronExpression: '*/30 * * * *', description: 'Runs twice per hour' },
  { label: 'Every 6 hours', cronExpression: '0 */6 * * *', description: 'Runs 4 times daily' },
  { label: 'Daily at midnight', cronExpression: '0 0 * * *', description: 'Runs once daily at 12:00 AM' },
  { label: 'Daily at 6 AM', cronExpression: '0 6 * * *', description: 'Runs once daily at 6:00 AM' },
  { label: 'Daily at 2 AM', cronExpression: '0 2 * * *', description: 'Ideal for nightly regression' },
  { label: 'Weekdays at 9 AM', cronExpression: '0 9 * * 1-5', description: 'Business hours only' },
  { label: 'Every Monday at 6 AM', cronExpression: '0 6 * * 1', description: 'Weekly smoke tests' },
  { label: 'Custom', cronExpression: '', description: 'Enter your own cron expression' },
];

// =============================================
// Helper Components
// =============================================

const StatusBadge: React.FC<{ status: string; isActive?: boolean }> = ({ status, isActive }) => {
  const getStatusConfig = () => {
    if (isActive === false) {
      return { color: 'bg-gray-500', text: 'Paused' };
    }
    switch (status) {
      case 'passed':
      case 'completed':
        return { color: 'bg-green-500', text: 'Passed' };
      case 'failed':
        return { color: 'bg-red-500', text: 'Failed' };
      case 'running':
        return { color: 'bg-blue-500 animate-pulse', text: 'Running' };
      case 'pending':
      case 'queued':
        return { color: 'bg-yellow-500', text: 'Pending' };
      case 'cancelled':
        return { color: 'bg-gray-500', text: 'Cancelled' };
      default:
        return { color: 'bg-gray-500', text: status };
    }
  };

  const config = getStatusConfig();
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white ${config.color}`}>
      {config.text}
    </span>
  );
};

const formatDate = (date: Date | string | undefined | null): string => {
  if (!date) return 'Never';
  const d = new Date(date);
  return d.toLocaleString();
};

const formatRelativeTime = (date: Date | string | undefined | null): string => {
  if (!date) return 'Never';
  const d = new Date(date);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const absDiff = Math.abs(diff);

  if (absDiff < 60000) return diff > 0 ? 'in less than a minute' : 'just now';
  if (absDiff < 3600000) {
    const mins = Math.round(absDiff / 60000);
    return diff > 0 ? `in ${mins} min` : `${mins} min ago`;
  }
  if (absDiff < 86400000) {
    const hours = Math.round(absDiff / 3600000);
    return diff > 0 ? `in ${hours} hr` : `${hours} hr ago`;
  }
  const days = Math.round(absDiff / 86400000);
  return diff > 0 ? `in ${days} days` : `${days} days ago`;
};

// =============================================
// Schedule Card Component
// =============================================

interface ScheduleCardProps {
  schedule: Schedule;
  onEdit: (schedule: Schedule) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onTrigger: (schedule: Schedule) => void;
  onViewHistory: (schedule: Schedule) => void;
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({
  schedule,
  onEdit,
  onToggle,
  onDelete,
  onTrigger,
  onViewHistory,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const lastRun = schedule.runs?.[0];

  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${
      schedule.isActive ? 'border-slate-700 bg-slate-800/50' : 'border-slate-800 bg-slate-900/50 opacity-60'
    }`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-slate-200 truncate">{schedule.name}</h3>
              {!schedule.isActive && (
                <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">Paused</span>
              )}
            </div>
            {schedule.description && (
              <p className="text-sm text-slate-400 mt-1 truncate">{schedule.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => onTrigger(schedule)}
              className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-slate-700 rounded transition-colors"
              title="Run now"
            >
              <Play className="w-4 h-4" />
            </button>
            <button
              onClick={() => onToggle(schedule.id)}
              className="p-1.5 text-slate-400 hover:text-yellow-400 hover:bg-slate-700 rounded transition-colors"
              title={schedule.isActive ? 'Pause' : 'Resume'}
            >
              {schedule.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onEdit(schedule)}
              className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded transition-colors"
              title="Edit"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(schedule.id)}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Schedule Info */}
        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Clock className="w-4 h-4" />
            <code className="text-xs bg-slate-700 px-1.5 py-0.5 rounded">{schedule.cronExpression}</code>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Calendar className="w-4 h-4" />
            <span className="text-xs">Next: {formatRelativeTime(schedule.nextRunAt)}</span>
          </div>
          {lastRun && (
            <div className="flex items-center gap-1.5">
              <StatusBadge status={lastRun.status} />
            </div>
          )}
        </div>

        {/* Expand/Collapse */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 mt-3 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {isExpanded ? 'Less details' : 'More details'}
        </button>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-700 pt-3 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Timezone:</span>
              <span className="text-slate-300 ml-2">{schedule.timezone}</span>
            </div>
            <div>
              <span className="text-slate-500">Last run:</span>
              <span className="text-slate-300 ml-2">{formatRelativeTime(schedule.lastRunAt)}</span>
            </div>
          </div>

          {schedule.testSelector && (
            <div className="text-sm">
              <span className="text-slate-500">Test selector:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {schedule.testSelector.tags?.map((tag) => (
                  <span key={tag} className="bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded text-xs">
                    {tag}
                  </span>
                ))}
                {schedule.testSelector.folders?.map((folder) => (
                  <span key={folder} className="bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded text-xs">
                    {folder}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => onViewHistory(schedule)}
            className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            <History className="w-4 h-4" />
            View run history
          </button>
        </div>
      )}
    </div>
  );
};

// =============================================
// Schedule Form Component
// =============================================

interface ScheduleFormProps {
  schedule?: Schedule;
  workflowId?: string;
  onSave: (data: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ScheduleForm: React.FC<ScheduleFormProps> = ({
  schedule,
  workflowId,
  onSave,
  onCancel,
  isLoading = false,
}) => {
  const [name, setName] = useState(schedule?.name || '');
  const [description, setDescription] = useState(schedule?.description || '');
  const [cronExpression, setCronExpression] = useState(schedule?.cronExpression || '0 6 * * *');
  const [timezone, setTimezone] = useState(schedule?.timezone || 'UTC');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>(schedule?.testSelector?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [cronError, setCronError] = useState<string | null>(null);
  const [cronDescription, setCronDescription] = useState<string | null>(null);
  const [nextRuns, setNextRuns] = useState<string[]>([]);

  // Parameter system
  const [parameters, setParameters] = useState<ScheduleParameterDefinition[]>(schedule?.parameters || []);
  const [showParameterSection, setShowParameterSection] = useState(false);

  // Validate cron on change
  useEffect(() => {
    if (!cronExpression) return;

    const validateCron = async () => {
      try {
        const result = await schedulesApi.validateCron(cronExpression);
        if (result.valid) {
          setCronError(null);
          setCronDescription(result.description || null);
          setNextRuns(result.nextRuns || []);
        } else {
          setCronError(result.error || 'Invalid cron expression');
          setCronDescription(null);
          setNextRuns([]);
        }
      } catch (e) {
        // Ignore validation errors during typing
      }
    };

    const timer = setTimeout(validateCron, 500);
    return () => clearTimeout(timer);
  }, [cronExpression]);

  const handlePresetSelect = (preset: SchedulePreset) => {
    setSelectedPreset(preset.label);
    if (preset.cronExpression) {
      setCronExpression(preset.cronExpression);
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag.startsWith('@') ? tag : `@${tag}`]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !cronExpression || cronError) return;

    onSave({
      name,
      description,
      cronExpression,
      timezone,
      workflowId,
      testSelector: {
        tags: tags.length > 0 ? tags : undefined,
      },
      isActive: true,
      // Parameter system
      parameters: parameters.length > 0 ? parameters : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Schedule Name */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Schedule Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Nightly Regression Suite"
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Runs all regression tests every night"
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Cron Presets */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Schedule Frequency
        </label>
        <div className="grid grid-cols-3 gap-2">
          {CRON_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handlePresetSelect(preset)}
              className={`p-2 text-left border rounded-lg transition-colors ${
                selectedPreset === preset.label || cronExpression === preset.cronExpression
                  ? 'border-blue-500 bg-blue-900/30 text-blue-300'
                  : 'border-slate-700 hover:border-slate-600 text-slate-400'
              }`}
            >
              <div className="text-sm font-medium">{preset.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Cron Expression */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Cron Expression *
        </label>
        <input
          type="text"
          value={cronExpression}
          onChange={(e) => setCronExpression(e.target.value)}
          placeholder="0 6 * * *"
          className={`w-full px-3 py-2 bg-slate-800 border rounded-lg text-slate-200 font-mono text-sm focus:outline-none focus:ring-2 ${
            cronError ? 'border-red-500 focus:ring-red-500' : 'border-slate-700 focus:ring-blue-500'
          }`}
          required
        />
        {cronError && (
          <p className="text-red-400 text-xs mt-1">{cronError}</p>
        )}
        {cronDescription && !cronError && (
          <p className="text-green-400 text-xs mt-1">{cronDescription}</p>
        )}
        {nextRuns.length > 0 && !cronError && (
          <div className="mt-2 text-xs text-slate-500">
            <span className="font-medium">Next runs:</span>
            <ul className="mt-1 space-y-0.5">
              {nextRuns.slice(0, 3).map((run, i) => (
                <li key={i}>{new Date(run).toLocaleString()}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Timezone */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Timezone
        </label>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="UTC">UTC</option>
          <option value="America/New_York">America/New_York (EST/EDT)</option>
          <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
          <option value="Europe/London">Europe/London (GMT/BST)</option>
          <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
          <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
          <option value="Asia/Shanghai">Asia/Shanghai (CST)</option>
          <option value="Australia/Sydney">Australia/Sydney (AEST/AEDT)</option>
        </select>
      </div>

      {/* Test Tags */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Test Tags (optional)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
            placeholder="@smoke, @regression, @critical"
            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
          >
            Add
          </button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded text-sm"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-red-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Run Parameters (Collapsible) */}
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowParameterSection(!showParameterSection)}
          className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-300">
              Run Parameters
              {parameters.length > 0 && (
                <span className="ml-2 text-xs text-blue-400">({parameters.length})</span>
              )}
            </span>
          </div>
          {showParameterSection ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {showParameterSection && (
          <div className="p-4 border-t border-slate-700">
            <p className="text-xs text-slate-500 mb-4">
              Define parameters that can be customized when manually triggering this schedule (Jenkins-style)
            </p>
            <ParameterBuilder
              parameters={parameters}
              onChange={setParameters}
              disabled={isLoading}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading || !name || !cronExpression || !!cronError}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Calendar className="w-4 h-4" />
              {schedule ? 'Update Schedule' : 'Create Schedule'}
            </>
          )}
        </button>
      </div>
    </form>
  );
};

// =============================================
// Run History Component
// =============================================

interface RunHistoryProps {
  schedule: Schedule;
  onBack: () => void;
}

const RunHistory: React.FC<RunHistoryProps> = ({ schedule, onBack }) => {
  const [runs, setRuns] = useState<ScheduleRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRuns = async () => {
      try {
        const data = await schedulesApi.getRuns(schedule.id, 50);
        setRuns(data);
      } catch (e) {
        console.error('Failed to fetch runs:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRuns();
  }, [schedule.id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-slate-200">{schedule.name}</h3>
          <p className="text-sm text-slate-400">Run History</p>
        </div>
        <button
          onClick={onBack}
          className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          Back to schedules
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 text-slate-500 animate-spin" />
        </div>
      ) : runs.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No runs yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {runs.map((run) => (
            <div
              key={run.id}
              className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <StatusBadge status={run.status} />
                <div>
                  <p className="text-sm text-slate-300">
                    {formatDate(run.createdAt)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Triggered: {run.triggerType}
                    {run.durationMs && ` • Duration: ${(run.durationMs / 1000).toFixed(1)}s`}
                  </p>
                </div>
              </div>
              {(run.passedCount !== undefined || run.failedCount !== undefined) && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-green-400">{run.passedCount || 0} passed</span>
                  <span className="text-red-400">{run.failedCount || 0} failed</span>
                  {run.skippedCount > 0 && (
                    <span className="text-yellow-400">{run.skippedCount} skipped</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================
// Main SchedulerPanel Component
// =============================================

export const SchedulerPanel: React.FC<SchedulerPanelProps> = ({
  workflowId,
  onRunTriggered,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Run parameters modal state
  const [runModalSchedule, setRunModalSchedule] = useState<Schedule | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);

  // Fetch schedules
  const fetchSchedules = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await schedulesApi.list();
      setSchedules(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load schedules');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Handlers
  const handleCreate = async (data: any) => {
    try {
      setIsSaving(true);
      await schedulesApi.create(data);
      await fetchSchedules();
      setViewMode('list');
    } catch (e: any) {
      setError(e.message || 'Failed to create schedule');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (data: any) => {
    if (!selectedSchedule) return;
    try {
      setIsSaving(true);
      await schedulesApi.update(selectedSchedule.id, data);
      await fetchSchedules();
      setViewMode('list');
      setSelectedSchedule(null);
    } catch (e: any) {
      setError(e.message || 'Failed to update schedule');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await schedulesApi.toggle(id);
      await fetchSchedules();
    } catch (e: any) {
      setError(e.message || 'Failed to toggle schedule');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    try {
      await schedulesApi.delete(id);
      await fetchSchedules();
    } catch (e: any) {
      setError(e.message || 'Failed to delete schedule');
    }
  };

  // Open modal to configure run parameters
  const handleTrigger = (schedule: Schedule) => {
    setRunModalSchedule(schedule);
  };

  // Execute the run with parameters from modal
  const handleTriggerWithParams = async (request: ScheduleTriggerRequest) => {
    if (!runModalSchedule) return;

    try {
      setIsTriggering(true);
      const run = await schedulesApi.triggerRun(runModalSchedule.id, request);
      onRunTriggered?.(run.id);
      setRunModalSchedule(null);
      await fetchSchedules();
    } catch (e: any) {
      setError(e.message || 'Failed to trigger run');
    } finally {
      setIsTriggering(false);
    }
  };

  const handleEdit = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setViewMode('edit');
  };

  const handleViewHistory = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setViewMode('history');
  };

  // Render
  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-400" />
          <h2 className="font-semibold text-slate-200">Test Scheduler</h2>
        </div>
        {viewMode === 'list' && (
          <button
            onClick={() => setViewMode('create')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Schedule
          </button>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-900/30 border border-red-700 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {viewMode === 'list' && (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 text-slate-500 animate-spin" />
              </div>
            ) : schedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <Calendar className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">No schedules yet</p>
                <p className="text-xs mt-1">Create a schedule to run tests automatically</p>
                <button
                  onClick={() => setViewMode('create')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 transition-colors"
                >
                  Create Your First Schedule
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {schedules.map((schedule) => (
                  <ScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    onEdit={handleEdit}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    onTrigger={handleTrigger}
                    onViewHistory={handleViewHistory}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {viewMode === 'create' && (
          <ScheduleForm
            workflowId={workflowId}
            onSave={handleCreate}
            onCancel={() => setViewMode('list')}
            isLoading={isSaving}
          />
        )}

        {viewMode === 'edit' && selectedSchedule && (
          <ScheduleForm
            schedule={selectedSchedule}
            workflowId={workflowId}
            onSave={handleUpdate}
            onCancel={() => {
              setViewMode('list');
              setSelectedSchedule(null);
            }}
            isLoading={isSaving}
          />
        )}

        {viewMode === 'history' && selectedSchedule && (
          <RunHistory
            schedule={selectedSchedule}
            onBack={() => {
              setViewMode('list');
              setSelectedSchedule(null);
            }}
          />
        )}
      </div>

      {/* Run Parameters Modal */}
      {runModalSchedule && (
        <RunParametersModal
          isOpen={true}
          onClose={() => setRunModalSchedule(null)}
          onRun={handleTriggerWithParams}
          schedule={runModalSchedule}
          isLoading={isTriggering}
        />
      )}
    </div>
  );
};

export default SchedulerPanel;
