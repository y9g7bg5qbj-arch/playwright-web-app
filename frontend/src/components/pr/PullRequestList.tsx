import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  GitPullRequest,
  Loader2,
  MessageSquare,
  Plus,
  User,
} from 'lucide-react';
import {
  Badge,
  Button,
  EmptyState,
  Select,
  cn,
  type SelectOption,
} from '@/components/ui';
import { useSandboxStore } from '@/store/sandboxStore';
import type { PullRequest } from '@/api/pullRequest';
import { CreatePullRequestModal } from './CreatePullRequestModal';
import {
  getPullRequestStatusTheme,
  prUiClasses,
  pullRequestStatusOptions,
} from './prTheme';

interface PullRequestListProps {
  projectId: string;
  onSelectPR?: (pr: PullRequest) => void;
  nestedProjects?: Array<{ id: string; name: string }>;
  onSelectProject?: (id: string) => void;
}

const statusFilterOptions: SelectOption[] = [...pullRequestStatusOptions];

export const PullRequestList: React.FC<PullRequestListProps> = ({
  projectId,
  onSelectPR,
  nestedProjects,
  onSelectProject,
}) => {
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreatePRModal, setShowCreatePRModal] = useState(false);
  const [createPRSandboxId, setCreatePRSandboxId] = useState<string>('');

  const {
    pullRequests,
    sandboxes,
    fetchPullRequests,
    fetchSandboxes,
    activeEnvironment,
    selectedPullRequestId,
    isLoading,
    error,
  } = useSandboxStore();

  useEffect(() => {
    if (projectId) {
      fetchPullRequests(projectId, statusFilter || undefined);
    }
  }, [projectId, statusFilter, fetchPullRequests]);

  useEffect(() => {
    if (projectId) {
      fetchSandboxes(projectId);
    }
  }, [projectId, fetchSandboxes]);

  const activeSandboxes = useMemo(
    () => sandboxes.filter((sandbox) => sandbox.status === 'active'),
    [sandboxes]
  );
  const canCreatePR = activeSandboxes.length > 0;

  const handleOpenCreatePR = () => {
    const preferredSandboxId =
      typeof activeEnvironment === 'object' && 'sandboxId' in activeEnvironment
        ? activeEnvironment.sandboxId
        : activeSandboxes[0]?.id || '';
    const fallbackSandboxId =
      preferredSandboxId && activeSandboxes.some((sandbox) => sandbox.id === preferredSandboxId)
        ? preferredSandboxId
        : activeSandboxes[0]?.id || '';

    setCreatePRSandboxId(fallbackSandboxId);
    setShowCreatePRModal(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading && pullRequests.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-text-muted">
        <div className="flex items-center gap-2 text-xs">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading pull requests...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-dark-bg">
      {/* Header */}
      <div className="shrink-0 border-b border-border-default bg-dark-bg">
        <div className="flex items-center justify-between px-3 py-2.5">
          <div className="flex items-center gap-2">
            <GitPullRequest className="h-4 w-4 text-brand-secondary" />
            <span className="text-sm font-semibold text-text-primary">Pull Requests</span>
            <Badge variant="default" size="sm">{pullRequests.length}</Badge>
          </div>
          <Button
            type="button"
            onClick={handleOpenCreatePR}
            size="sm"
            variant="action"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            title="Create a new pull request"
            className="whitespace-nowrap"
          >
            New PR
          </Button>
        </div>

        <div className="flex items-center gap-2 px-3 pb-2">
          {nestedProjects && nestedProjects.length > 1 && (
            <div className="flex-1 min-w-0">
              <Select
                aria-label="Select project"
                options={nestedProjects.map((p) => ({ value: p.id, label: p.name }))}
                value={projectId}
                onChange={(event) => onSelectProject?.(event.target.value)}
                className="h-7 w-full border-border-default bg-dark-canvas py-1 pl-2 pr-7 text-xs rounded-md"
              />
            </div>
          )}
          <div className={nestedProjects && nestedProjects.length > 1 ? 'w-[120px] shrink-0' : 'flex-1'}>
            <Select
              aria-label="Filter pull requests by status"
              options={statusFilterOptions}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-7 w-full border-border-default bg-dark-canvas py-1 pl-2 pr-7 text-xs rounded-md"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-3 mt-3 rounded-md border border-status-danger/30 bg-status-danger/10 px-3 py-2 text-xs text-status-danger">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {pullRequests.length === 0 ? (
          <div className="p-3">
            <EmptyState
              icon={<GitPullRequest className="h-5 w-5" />}
              title="No pull requests"
              message="Use Create Pull Request in this panel to get started."
              action={
                <Button
                  type="button"
                  onClick={handleOpenCreatePR}
                  disabled={!canCreatePR}
                  size="md"
                  variant="action"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  title={canCreatePR ? 'Create a new pull request' : 'Create an active sandbox first'}
                >
                  Create Pull Request
                </Button>
              }
              className="py-16"
            />
            {!canCreatePR && (
              <p className="mt-2 text-center text-xs text-text-muted">
                Create an active sandbox first in Explorer.
              </p>
            )}
          </div>
        ) : (
          <div className="p-2 space-y-1.5">
            {pullRequests.map((pr) => {
              const status = getPullRequestStatusTheme(pr.status);
              const StatusIcon = status.icon;
              const isSelected = selectedPullRequestId === pr.id;

              return (
                <button
                  key={pr.id}
                  type="button"
                  onClick={() => onSelectPR?.(pr)}
                  className={cn(
                    'group w-full rounded-lg px-3 py-2.5 text-left transition-all duration-fast',
                    isSelected
                      ? 'bg-brand-primary/10 ring-1 ring-brand-primary/30'
                      : 'hover:bg-dark-elevated/50'
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={cn(
                        'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
                        status.surfaceClassName
                      )}
                    >
                      <StatusIcon className={cn('h-3.5 w-3.5', status.iconClassName)} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-medium text-text-primary">{pr.title}</span>
                        <span className="text-xxs text-text-muted">#{pr.number}</span>
                        <Badge variant={status.badgeVariant} size="sm">{status.label}</Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-text-muted">
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {pr.authorName || pr.authorEmail}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <GitPullRequest className="h-3 w-3" />
                          {pr.sandboxName} <span className="text-text-muted/50">&rarr;</span> {pr.targetBranch}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(pr.createdAt)}
                        </span>
                      </div>

                      {pr.description && (
                        <p className="mt-1 text-xs text-text-secondary line-clamp-1">{pr.description}</p>
                      )}
                    </div>

                    <div className="ml-1 flex shrink-0 items-center gap-2 text-3xs text-text-muted">
                      <span className="inline-flex items-center gap-1" title="Files changed">
                        <FileText className="h-3 w-3" />
                        {pr.fileCount}
                      </span>
                      <span className="inline-flex items-center gap-1" title="Comments">
                        <MessageSquare className="h-3 w-3" />
                        {pr.commentCount}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1',
                          pr.approvalCount > 0 && 'text-status-success'
                        )}
                        title="Approvals"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {pr.approvalCount}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <CreatePullRequestModal
        isOpen={showCreatePRModal}
        onClose={() => setShowCreatePRModal(false)}
        sandboxes={activeSandboxes}
        initialSandboxId={createPRSandboxId}
        projectId={projectId}
        nestedProjects={nestedProjects}
        onSuccess={() => {
          setShowCreatePRModal(false);
          fetchPullRequests(projectId, statusFilter || undefined);
          fetchSandboxes(projectId);
        }}
      />
    </div>
  );
};

export default PullRequestList;
