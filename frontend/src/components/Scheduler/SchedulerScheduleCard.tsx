import React, { useState, useCallback, useEffect } from 'react';
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
  Copy,
  RefreshCw,
  Link,
  Check,
} from 'lucide-react';
import { Github } from 'lucide-react';
import { IconButton } from '@/components/ui';
import type { Schedule } from '@playwright-web-app/shared';
import { schedulesApi, type WebhookInfo } from '@/api/schedules';
import { runConfigurationApi } from '@/api/runConfiguration';
import { fromBackendConfig } from '@/store/runConfigMapper';
import type { RunConfiguration } from '@/store/runConfigStore';
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
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null);
  const [isLoadingWebhook, setIsLoadingWebhook] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCurl, setShowCurl] = useState(false);
  const [resolvedConfig, setResolvedConfig] = useState<RunConfiguration | null>(null);
  const lastRun = schedule.runs?.[0];

  useEffect(() => {
    if (!isExpanded || !schedule.runConfigurationId || resolvedConfig) return;
    runConfigurationApi.getOne(schedule.runConfigurationId)
      .then((backend) => setResolvedConfig(fromBackendConfig(backend)))
      .catch(() => { /* ignore */ });
  }, [isExpanded, schedule.runConfigurationId, resolvedConfig]);

  const loadWebhookInfo = useCallback(async () => {
    if (webhookInfo || isLoadingWebhook) return;
    setIsLoadingWebhook(true);
    try {
      const info = await schedulesApi.getWebhookInfo(schedule.id);
      setWebhookInfo(info);
    } catch {
      // Silently fail — webhook section will show generate button
    } finally {
      setIsLoadingWebhook(false);
    }
  }, [schedule.id, webhookInfo, isLoadingWebhook]);

  const handleExpand = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    if (next) loadWebhookInfo();
  };

  const handleCopyUrl = async () => {
    if (!webhookInfo?.webhookUrl) return;
    await navigator.clipboard.writeText(webhookInfo.webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateToken = async () => {
    if (!confirm('Regenerate webhook token? The previous URL will stop working.')) return;
    try {
      const result = await schedulesApi.regenerateWebhookToken(schedule.id);
      setWebhookInfo({ token: result.token, webhookUrl: result.webhookUrl, hasToken: true });
    } catch {
      // ignore
    }
  };

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
                  Configured
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
          onClick={handleExpand}
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
            {resolvedConfig ? (
              <span className="text-text-secondary ml-2">
                {resolvedConfig.target === 'github-actions' ? 'GitHub Actions' : 'Local'} · {resolvedConfig.browser} · {resolvedConfig.workers}w · {resolvedConfig.retries} retries · {Math.round(resolvedConfig.timeout / 1000)}s · {resolvedConfig.headed ? 'headed' : 'headless'}
              </span>
            ) : (
              <span className="text-text-secondary ml-2">{schedule.runConfigurationId ? 'Loading...' : 'Not configured'}</span>
            )}
          </div>

          {/* Webhook Section */}
          <div className="border-t border-border-default pt-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Link className="w-4 h-4 text-text-muted" />
              <span className="text-sm font-medium text-text-secondary">Webhook Trigger</span>
            </div>
            {isLoadingWebhook ? (
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Loading webhook info...
              </div>
            ) : webhookInfo?.hasToken && webhookInfo.webhookUrl ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-dark-elevated px-2 py-1.5 rounded truncate text-text-muted">
                    {webhookInfo.webhookUrl}
                  </code>
                  <IconButton
                    icon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    variant="ghost"
                    tooltip={copied ? 'Copied!' : 'Copy URL'}
                    onClick={handleCopyUrl}
                  />
                  <IconButton
                    icon={<RefreshCw className="w-3.5 h-3.5" />}
                    variant="ghost"
                    tone="danger"
                    tooltip="Regenerate token"
                    onClick={handleRegenerateToken}
                  />
                </div>
                <button
                  onClick={() => setShowCurl(!showCurl)}
                  className="text-xs text-text-muted hover:text-text-secondary transition-colors"
                >
                  {showCurl ? 'Hide' : 'Show'} cURL example
                </button>
                {showCurl && (
                  <pre className="text-xs bg-dark-elevated px-3 py-2 rounded text-text-muted overflow-x-auto">
                    {`curl -X POST "${webhookInfo.webhookUrl}"`}
                  </pre>
                )}
              </div>
            ) : (
              <button
                onClick={handleRegenerateToken}
                className="text-xs text-status-info hover:text-status-info transition-colors"
              >
                Generate Webhook Token
              </button>
            )}
          </div>

          {/* Chained Schedules */}
          {schedule.onSuccessTriggerScheduleIds && schedule.onSuccessTriggerScheduleIds.length > 0 && (
            <div className="text-sm">
              <span className="text-text-muted">Chains to:</span>
              <span className="text-text-secondary ml-2">
                {schedule.onSuccessTriggerScheduleIds.length} schedule{schedule.onSuccessTriggerScheduleIds.length !== 1 ? 's' : ''} on success
              </span>
            </div>
          )}

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
