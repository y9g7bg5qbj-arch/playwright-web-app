import React, { useState } from 'react';
import {
  Play,
  Pause,
  Trash2,
  Clock,
  ChevronDown,
  ChevronUp,
  Settings,
  History,
  Calendar,
} from 'lucide-react';
import { Github } from 'lucide-react';
import { IconButton } from '@/components/ui';
import type { Schedule } from '@playwright-web-app/shared';
import { StatusBadge, MiniRunHistory } from './SchedulerStatusBadge';
import { formatRelativeTime } from './schedulerUtils';

export interface ScheduleCardProps {
  schedule: Schedule;
  onEdit: (schedule: Schedule) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onTrigger: (schedule: Schedule) => void;
  onViewHistory: (schedule: Schedule) => void;
}

export const ScheduleCard: React.FC<ScheduleCardProps> = ({
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
                <span className="flex items-center gap-1 text-xs text-status-success bg-status-success/30 px-1.5 py-0.5 rounded">
                  <Github className="w-3 h-3" />
                  Actions
                </span>
              )}
              {schedule.runConfigurationId && (
                <span className="text-xs text-status-info bg-status-info/20 px-1.5 py-0.5 rounded">
                  Run Config Linked
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
            <IconButton
              icon={<Play className="w-4 h-4" />}
              variant="ghost"
              tooltip="Run now"
              onClick={() => onTrigger(schedule)}
            />
            <IconButton
              icon={schedule.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              variant="ghost"
              tooltip={schedule.isActive ? 'Pause' : 'Resume'}
              onClick={() => onToggle(schedule.id)}
            />
            <IconButton
              icon={<Settings className="w-4 h-4" />}
              variant="ghost"
              tooltip="Edit"
              onClick={() => onEdit(schedule)}
            />
            <IconButton
              icon={<Trash2 className="w-4 h-4" />}
              variant="ghost"
              tone="danger"
              tooltip="Delete"
              onClick={() => onDelete(schedule.id)}
            />
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
          {schedule.runs && schedule.runs.length > 1 && (
            <MiniRunHistory runs={schedule.runs} />
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

          <div className="text-sm">
            <span className="text-text-muted">Run Configuration:</span>
            <span className="text-text-secondary ml-2">{schedule.runConfigurationId || 'Not linked'}</span>
          </div>

          <button
            onClick={() => onViewHistory(schedule)}
            className="flex items-center gap-1.5 text-sm text-status-info hover:text-status-info transition-colors"
          >
            <History className="w-4 h-4" />
            View run history
          </button>
        </div>
      )}
    </div>
  );
};
