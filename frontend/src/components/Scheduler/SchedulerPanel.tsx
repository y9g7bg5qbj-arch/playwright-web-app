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
  Folder,
  FileText,
  CheckSquare,
} from 'lucide-react';
import { schedulesApi, type SchedulePreset } from '@/api/schedules';
import type {
  Schedule,
  ScheduleRun,
  ScheduleTriggerRequest,
  ScheduleParameterDefinition,
  ScheduleExecutionTarget,
} from '@playwright-web-app/shared';
import { RunParametersModal } from './RunParametersModal';
import { ParameterBuilder } from './ParameterBuilder';
import { useGitHubStore } from '@/store/useGitHubStore';
import { Github, Monitor } from 'lucide-react';

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
      return { color: 'bg-text-muted', text: 'Paused' };
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
        return { color: 'bg-text-muted', text: 'Cancelled' };
      default:
        return { color: 'bg-text-muted', text: status };
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
    <div className={`border rounded-lg overflow-hidden transition-all ${schedule.isActive ? 'border-border-default bg-dark-card/50' : 'border-border-default bg-dark-bg/50 opacity-60'
      }`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-text-primary truncate">{schedule.name}</h3>
              {schedule.executionTarget === 'github-actions' && (
                <span className="flex items-center gap-1 text-xs text-green-400 bg-green-900/30 px-1.5 py-0.5 rounded">
                  <Github className="w-3 h-3" />
                  Actions
                </span>
              )}
              {!schedule.isActive && (
                <span className="text-xs text-text-muted bg-dark-card px-1.5 py-0.5 rounded">Paused</span>
              )}
            </div>
            {schedule.description && (
              <p className="text-sm text-text-muted mt-1 truncate">{schedule.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => onTrigger(schedule)}
              className="p-1.5 text-text-muted hover:text-green-400 hover:bg-dark-elevated rounded transition-colors"
              title="Run now"
            >
              <Play className="w-4 h-4" />
            </button>
            <button
              onClick={() => onToggle(schedule.id)}
              className="p-1.5 text-text-muted hover:text-yellow-400 hover:bg-dark-elevated rounded transition-colors"
              title={schedule.isActive ? 'Pause' : 'Resume'}
            >
              {schedule.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onEdit(schedule)}
              className="p-1.5 text-text-muted hover:text-blue-400 hover:bg-dark-elevated rounded transition-colors"
              title="Edit"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(schedule.id)}
              className="p-1.5 text-text-muted hover:text-red-400 hover:bg-dark-elevated rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Schedule Info */}
        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
          <div className="flex items-center gap-1.5 text-text-muted">
            <Clock className="w-4 h-4" />
            <code className="text-xs bg-dark-elevated px-1.5 py-0.5 rounded">{schedule.cronExpression}</code>
          </div>
          <div className="flex items-center gap-1.5 text-text-muted">
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
          className="flex items-center gap-1 mt-3 text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {isExpanded ? 'Less details' : 'More details'}
        </button>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border-default pt-3 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-text-muted">Timezone:</span>
              <span className="text-text-secondary ml-2">{schedule.timezone}</span>
            </div>
            <div>
              <span className="text-text-muted">Last run:</span>
              <span className="text-text-secondary ml-2">{formatRelativeTime(schedule.lastRunAt)}</span>
            </div>
          </div>

          {schedule.testSelector && (
            <div className="text-sm space-y-2">
              <span className="text-text-muted">Test Selection:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {schedule.testSelector.tags?.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded text-xs">
                    <span className="material-symbols-outlined text-[12px]">label</span>
                    {tag}
                  </span>
                ))}
                {schedule.testSelector.folders?.map((folder) => (
                  <span key={folder} className="inline-flex items-center gap-1 bg-orange-900/50 text-orange-300 px-2 py-0.5 rounded text-xs">
                    <Folder className="w-3 h-3" />
                    {folder}
                  </span>
                ))}
                {schedule.testSelector.patterns?.map((pattern) => (
                  <span key={pattern} className="inline-flex items-center gap-1 bg-green-900/50 text-green-300 px-2 py-0.5 rounded text-xs">
                    <FileText className="w-3 h-3" />
                    {pattern}
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
  const [folders, setFolders] = useState<string[]>(schedule?.testSelector?.folders || []);
  const [folderInput, setFolderInput] = useState('');
  const [patterns, setPatterns] = useState<string[]>(schedule?.testSelector?.patterns || []);
  const [patternInput, setPatternInput] = useState('');
  const [showTestSelector, setShowTestSelector] = useState(false);
  const [cronError, setCronError] = useState<string | null>(null);
  const [cronDescription, setCronDescription] = useState<string | null>(null);
  const [nextRuns, setNextRuns] = useState<string[]>([]);

  // Parameter system
  const [parameters, setParameters] = useState<ScheduleParameterDefinition[]>(schedule?.parameters || []);
  const [showParameterSection, setShowParameterSection] = useState(false);

  // Execution target (local or github-actions)
  const [executionTarget, setExecutionTarget] = useState<ScheduleExecutionTarget>(
    schedule?.executionTarget || 'local'
  );

  // GitHub Actions configuration
  const [githubRepoFullName, setGithubRepoFullName] = useState(schedule?.githubConfig?.repoFullName || '');
  const [githubBranch, setGithubBranch] = useState(schedule?.githubConfig?.branch || 'main');
  const [githubWorkflowFile, setGithubWorkflowFile] = useState(schedule?.githubConfig?.workflowFile || 'vero-tests.yml');

  // GitHub store for repo list
  const { isConnected, repositories, loadRepositories } = useGitHubStore();

  // Load repositories when GitHub Actions is selected
  useEffect(() => {
    if (executionTarget === 'github-actions' && isConnected() && repositories.length === 0) {
      loadRepositories();
    }
  }, [executionTarget, isConnected, repositories.length, loadRepositories]);

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

  const handleAddFolder = () => {
    const folder = folderInput.trim();
    if (folder && !folders.includes(folder)) {
      setFolders([...folders, folder]);
      setFolderInput('');
    }
  };

  const handleRemoveFolder = (folderToRemove: string) => {
    setFolders(folders.filter((f) => f !== folderToRemove));
  };

  const handleAddPattern = () => {
    const pattern = patternInput.trim();
    if (pattern && !patterns.includes(pattern)) {
      setPatterns([...patterns, pattern]);
      setPatternInput('');
    }
  };

  const handleRemovePattern = (patternToRemove: string) => {
    setPatterns(patterns.filter((p) => p !== patternToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !cronExpression || cronError) return;

    // Validate GitHub Actions config if selected
    if (executionTarget === 'github-actions') {
      if (!githubRepoFullName) {
        alert('Please select a GitHub repository');
        return;
      }
      if (!githubWorkflowFile) {
        alert('Please enter a workflow file name');
        return;
      }
    }

    // Build testSelector only with non-empty arrays
    const testSelector: any = {};
    if (tags.length > 0) testSelector.tags = tags;
    if (folders.length > 0) testSelector.folders = folders;
    if (patterns.length > 0) testSelector.patterns = patterns;

    onSave({
      name,
      description,
      cronExpression,
      timezone,
      workflowId,
      testSelector: Object.keys(testSelector).length > 0 ? testSelector : undefined,
      isActive: true,
      // Parameter system
      parameters: parameters.length > 0 ? parameters : undefined,
      // Execution target
      executionTarget,
      // GitHub Actions configuration
      githubConfig: executionTarget === 'github-actions' ? {
        repoFullName: githubRepoFullName,
        branch: githubBranch,
        workflowFile: githubWorkflowFile,
      } : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Schedule Name */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Schedule Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Nightly Regression Suite"
          className="w-full px-3 py-2 bg-dark-card border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Runs all regression tests every night"
          className="w-full px-3 py-2 bg-dark-card border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Execution Target */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Run Tests On
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setExecutionTarget('local')}
            className={`p-4 flex flex-col items-center gap-2 border rounded-lg transition-all ${executionTarget === 'local'
                ? 'border-blue-500 bg-blue-900/30 text-blue-300'
                : 'border-border-default hover:border-border-default text-text-muted'
              }`}
          >
            <Monitor className="w-6 h-6" />
            <div className="text-sm font-medium">Local Machine</div>
            <div className="text-xs text-text-muted">Run tests on your machine</div>
          </button>
          <button
            type="button"
            onClick={() => setExecutionTarget('github-actions')}
            className={`p-4 flex flex-col items-center gap-2 border rounded-lg transition-all ${executionTarget === 'github-actions'
                ? 'border-green-500 bg-green-900/30 text-green-300'
                : 'border-border-default hover:border-border-default text-text-muted'
              }`}
          >
            <Github className="w-6 h-6" />
            <div className="text-sm font-medium">GitHub Actions</div>
            <div className="text-xs text-text-muted">Run tests in the cloud</div>
          </button>
        </div>
      </div>

      {/* GitHub Actions Configuration */}
      {executionTarget === 'github-actions' && (
        <div className="space-y-4 p-4 bg-dark-card/50 rounded-lg border border-border-default">
          <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
            <Github className="w-4 h-4" />
            GitHub Actions Configuration
          </div>

          {!isConnected() ? (
            <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-300">
                Connect your GitHub account to use GitHub Actions.
              </p>
              <p className="text-xs text-text-muted mt-1">
                Go to Settings → GitHub to connect.
              </p>
            </div>
          ) : (
            <>
              {/* Repository Selection */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Repository *
                </label>
                <select
                  value={githubRepoFullName}
                  onChange={(e) => setGithubRepoFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-card border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select a repository...</option>
                  {repositories.map((repo) => (
                    <option key={repo.fullName} value={repo.fullName}>
                      {repo.fullName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Branch */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Branch
                </label>
                <input
                  type="text"
                  value={githubBranch}
                  onChange={(e) => setGithubBranch(e.target.value)}
                  placeholder="main"
                  className="w-full px-3 py-2 bg-dark-card border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Workflow File */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Workflow File *
                </label>
                <input
                  type="text"
                  value={githubWorkflowFile}
                  onChange={(e) => setGithubWorkflowFile(e.target.value)}
                  placeholder="vero-tests.yml"
                  className="w-full px-3 py-2 bg-dark-card border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-text-muted mt-1">
                  The workflow file in .github/workflows/ directory
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Cron Presets */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Schedule Frequency
        </label>
        <div className="grid grid-cols-3 gap-2">
          {CRON_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handlePresetSelect(preset)}
              className={`p-2 text-left border rounded-lg transition-colors ${selectedPreset === preset.label || cronExpression === preset.cronExpression
                  ? 'border-blue-500 bg-blue-900/30 text-blue-300'
                  : 'border-border-default hover:border-border-default text-text-muted'
                }`}
            >
              <div className="text-sm font-medium">{preset.label}</div>
              <div className="text-xs text-text-muted mt-0.5">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Cron Expression */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Cron Expression *
        </label>
        <input
          type="text"
          value={cronExpression}
          onChange={(e) => setCronExpression(e.target.value)}
          placeholder="0 6 * * *"
          className={`w-full px-3 py-2 bg-dark-card border rounded-lg text-text-primary font-mono text-sm focus:outline-none focus:ring-2 ${cronError ? 'border-red-500 focus:ring-red-500' : 'border-border-default focus:ring-blue-500'
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
          <div className="mt-2 text-xs text-text-muted">
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
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Timezone
        </label>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full px-3 py-2 bg-dark-card border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* Test Selection (Collapsible - Jenkins-style) */}
      <div className="border border-border-default rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowTestSelector(!showTestSelector)}
          className="w-full flex items-center justify-between p-3 bg-dark-card/50 hover:bg-dark-card transition-colors"
        >
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-text-muted" />
            <span className="text-sm font-medium text-text-secondary">
              Test Selection
              {(tags.length > 0 || folders.length > 0 || patterns.length > 0) && (
                <span className="ml-2 text-xs text-blue-400">
                  ({tags.length + folders.length + patterns.length} filters)
                </span>
              )}
            </span>
          </div>
          {showTestSelector ? (
            <ChevronUp className="w-4 h-4 text-text-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-muted" />
          )}
        </button>

        {showTestSelector && (
          <div className="p-4 border-t border-border-default space-y-4">
            <p className="text-xs text-text-muted">
              Filter which tests to run. Leave empty to run all tests. Multiple filters are combined with AND logic.
            </p>

            {/* Tags */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
                <span className="material-symbols-outlined text-[16px] text-blue-400">label</span>
                Tags
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder="@smoke, @regression, @critical"
                  className="flex-1 px-3 py-2 bg-dark-card border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm"
                >
                  Add
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded text-xs"
                    >
                      {tag}
                      <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-red-400">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-text-muted mt-1">Filter tests by tags (e.g., @smoke, @regression)</p>
            </div>

            {/* Folders */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
                <Folder className="w-4 h-4 text-orange-400" />
                Folders
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={folderInput}
                  onChange={(e) => setFolderInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFolder())}
                  placeholder="features/auth/**, tests/checkout/*"
                  className="flex-1 px-3 py-2 bg-dark-card border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddFolder}
                  className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-500 transition-colors text-sm"
                >
                  Add
                </button>
              </div>
              {folders.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {folders.map((folder) => (
                    <span
                      key={folder}
                      className="inline-flex items-center gap-1 bg-orange-900/50 text-orange-300 px-2 py-0.5 rounded text-xs"
                    >
                      <Folder className="w-3 h-3" />
                      {folder}
                      <button type="button" onClick={() => handleRemoveFolder(folder)} className="hover:text-red-400">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-text-muted mt-1">Run tests from specific folders (supports glob patterns)</p>
            </div>

            {/* File Patterns */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
                <FileText className="w-4 h-4 text-green-400" />
                File Patterns
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={patternInput}
                  onChange={(e) => setPatternInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPattern())}
                  placeholder="*.login.*, checkout-*.vero"
                  className="flex-1 px-3 py-2 bg-dark-card border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddPattern}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors text-sm"
                >
                  Add
                </button>
              </div>
              {patterns.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {patterns.map((pattern) => (
                    <span
                      key={pattern}
                      className="inline-flex items-center gap-1 bg-green-900/50 text-green-300 px-2 py-0.5 rounded text-xs"
                    >
                      <FileText className="w-3 h-3" />
                      {pattern}
                      <button type="button" onClick={() => handleRemovePattern(pattern)} className="hover:text-red-400">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-text-muted mt-1">Match test files by name pattern (wildcards supported)</p>
            </div>

            {/* Summary */}
            {(tags.length > 0 || folders.length > 0 || patterns.length > 0) && (
              <div className="p-3 bg-dark-elevated rounded-lg border border-border-default">
                <div className="text-xs font-medium text-text-secondary mb-1">Selection Summary</div>
                <div className="text-xs text-text-muted">
                  Will run tests that match:
                  {tags.length > 0 && <span className="text-blue-300"> {tags.length} tag(s)</span>}
                  {tags.length > 0 && (folders.length > 0 || patterns.length > 0) && <span> AND</span>}
                  {folders.length > 0 && <span className="text-purple-300"> {folders.length} folder(s)</span>}
                  {folders.length > 0 && patterns.length > 0 && <span> AND</span>}
                  {patterns.length > 0 && <span className="text-green-300"> {patterns.length} pattern(s)</span>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Run Parameters (Collapsible) */}
      <div className="border border-border-default rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowParameterSection(!showParameterSection)}
          className="w-full flex items-center justify-between p-3 bg-dark-card/50 hover:bg-dark-card transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-text-muted" />
            <span className="text-sm font-medium text-text-secondary">
              Run Parameters
              {parameters.length > 0 && (
                <span className="ml-2 text-xs text-blue-400">({parameters.length})</span>
              )}
            </span>
          </div>
          {showParameterSection ? (
            <ChevronUp className="w-4 h-4 text-text-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-muted" />
          )}
        </button>

        {showParameterSection && (
          <div className="p-4 border-t border-border-default">
            <p className="text-xs text-text-muted mb-4">
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
      <div className="flex justify-end gap-3 pt-4 border-t border-border-default">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-text-muted hover:text-text-primary transition-colors"
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
          <h3 className="text-lg font-medium text-text-primary">{schedule.name}</h3>
          <p className="text-sm text-text-muted">Run History</p>
        </div>
        <button
          onClick={onBack}
          className="px-3 py-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
        >
          Back to schedules
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 text-text-muted animate-spin" />
        </div>
      ) : runs.length === 0 ? (
        <div className="text-center py-8 text-text-muted">
          <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No runs yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {runs.map((run) => (
            <div
              key={run.id}
              className="flex items-center justify-between p-3 bg-dark-card/50 border border-border-default rounded-lg"
            >
              <div className="flex items-center gap-3">
                <StatusBadge status={run.status} />
                <div>
                  <p className="text-sm text-text-secondary">
                    {formatDate(run.createdAt)}
                  </p>
                  <p className="text-xs text-text-muted">
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
    <div className="flex flex-col h-full bg-dark-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-400" />
          <h2 className="font-semibold text-text-primary">Test Scheduler</h2>
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
                <RefreshCw className="w-6 h-6 text-text-muted animate-spin" />
              </div>
            ) : schedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-text-muted">
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
