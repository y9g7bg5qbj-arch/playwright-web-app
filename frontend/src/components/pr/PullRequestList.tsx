import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
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
  PanelHeader,
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
}

const statusFilterOptions: SelectOption[] = [...pullRequestStatusOptions];

export const PullRequestList: React.FC<PullRequestListProps> = ({
  projectId,
  onSelectPR,
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
    if (!canCreatePR) {
      return;
    }

    const preferredSandboxId =
      typeof activeEnvironment === 'object' && 'sandboxId' in activeEnvironment
        ? activeEnvironment.sandboxId
        : activeSandboxes[0].id;
    const fallbackSandboxId = activeSandboxes.some((sandbox) => sandbox.id === preferredSandboxId)
      ? preferredSandboxId
      : activeSandboxes[0].id;

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
      <PanelHeader
        icon={<GitPullRequest className="h-4 w-4 text-brand-secondary" />}
        title="Pull Requests"
        meta={<Badge variant="default" size="sm">{pullRequests.length}</Badge>}
        actions={
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              onClick={handleOpenCreatePR}
              disabled={!canCreatePR}
              size="md"
              variant="action"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              title={canCreatePR ? 'Create a new pull request' : 'Create an active sandbox first'}
              className="whitespace-nowrap"
            >
              Create Pull Request
            </Button>

            <div className="flex items-center gap-1 text-text-muted">
              <Filter className="h-3.5 w-3.5" />
              <div className="w-[120px]">
                <Select
                  aria-label="Filter pull requests by status"
                  options={statusFilterOptions}
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-7 border-border-default bg-dark-canvas py-1 pl-2 pr-7 text-xs"
                />
              </div>
            </div>
          </div>
        }
        className="h-11 px-3"
      />

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
          <div>
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
                    prUiClasses.listRowBase,
                    isSelected ? prUiClasses.listRowSelected : prUiClasses.listRowIdle
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded border',
                        status.surfaceClassName,
                        status.borderClassName
                      )}
                    >
                      <StatusIcon className={cn('h-3.5 w-3.5', status.iconClassName)} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={prUiClasses.listTitle}>{pr.title}</span>
                        <span className="text-xxs text-text-muted">#{pr.number}</span>
                        <Badge variant={status.badgeVariant} size="sm">{status.label}</Badge>
                      </div>

                      <div className={cn(prUiClasses.metaRow, 'mt-1')}>
                        <span className={prUiClasses.metaItem}>
                          <User className="h-3 w-3" />
                          {pr.authorName || pr.authorEmail}
                        </span>
                        <span className={prUiClasses.metaItem}>
                          <GitPullRequest className="h-3 w-3" />
                          {pr.sandboxName} → {pr.targetBranch}
                        </span>
                        <span className={prUiClasses.metaItem}>
                          <Clock className="h-3 w-3" />
                          {formatDate(pr.createdAt)}
                        </span>
                      </div>

                      {pr.description && (
                        <p className={prUiClasses.listDescription}>{pr.description}</p>
                      )}
                    </div>

                    <div className="ml-2 flex shrink-0 items-center gap-2">
                      <span className={prUiClasses.listStat} title="Files changed">
                        <FileText className="h-3.5 w-3.5" />
                        {pr.fileCount}
                      </span>
                      <span className={prUiClasses.listStat} title="Comments">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {pr.commentCount}
                      </span>
                      <span
                        className={cn(
                          prUiClasses.listStat,
                          pr.approvalCount > 0 && 'text-status-success'
                        )}
                        title="Approvals"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
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
