import React, { useEffect, useState } from 'react';
import {
  GitPullRequest,
  Clock,
  CheckCircle2,
  XCircle,
  GitMerge,
  AlertCircle,
  FileText,
  MessageSquare,
  User,
  Filter,
} from 'lucide-react';
import { useSandboxStore } from '@/store/sandboxStore';
import type { PullRequest } from '@/api/pullRequest';

interface PullRequestListProps {
  projectId: string;
  onSelectPR?: (pr: PullRequest) => void;
}

const statusConfig = {
  draft: {
    icon: FileText,
    color: 'text-text-muted',
    bgColor: 'bg-dark-elevated/10',
    label: 'Draft',
  },
  open: {
    icon: GitPullRequest,
    color: 'text-status-success',
    bgColor: 'bg-status-success/10',
    label: 'Open',
  },
  approved: {
    icon: CheckCircle2,
    color: 'text-status-info',
    bgColor: 'bg-status-info/10',
    label: 'Approved',
  },
  merged: {
    icon: GitMerge,
    color: 'text-accent-purple',
    bgColor: 'bg-accent-purple/10',
    label: 'Merged',
  },
  closed: {
    icon: XCircle,
    color: 'text-status-danger',
    bgColor: 'bg-status-danger/10',
    label: 'Closed',
  },
};

export const PullRequestList: React.FC<PullRequestListProps> = ({
  projectId,
  onSelectPR,
}) => {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const {
    pullRequests,
    fetchPullRequests,
    isLoading,
    error,
  } = useSandboxStore();

  useEffect(() => {
    if (projectId) {
      fetchPullRequests(projectId, statusFilter);
    }
  }, [projectId, statusFilter, fetchPullRequests]);

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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
        <div className="flex items-center gap-2">
          <GitPullRequest className="w-5 h-5 text-status-warning" />
          <h2 className="text-lg font-semibold text-text-primary">Pull Requests</h2>
          <span className="px-2 py-0.5 text-xs font-medium bg-dark-elevated text-text-muted rounded-full">
            {pullRequests.length}
          </span>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-muted" />
          <select
            value={statusFilter || ''}
            onChange={(e) => setStatusFilter(e.target.value || undefined)}
            className="px-2 py-1 text-sm bg-dark-elevated border border-border-default rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
          >
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="open">Open</option>
            <option value="approved">Approved</option>
            <option value="merged">Merged</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="m-4 p-3 bg-status-danger/10 border border-status-danger/20 rounded-md flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-status-danger" />
          <p className="text-sm text-status-danger">{error}</p>
        </div>
      )}

      {/* PR List */}
      <div className="flex-1 overflow-y-auto">
        {pullRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-text-muted">
            <GitPullRequest className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-lg font-medium">No Pull Requests</p>
            <p className="text-sm">Create a PR from a sandbox to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-border-default">
            {pullRequests.map((pr) => {
              const status = statusConfig[pr.status];
              const StatusIcon = status.icon;

              return (
                <div
                  key={pr.id}
                  onClick={() => onSelectPR?.(pr)}
                  className="px-4 py-3 hover:bg-dark-elevated cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Status icon */}
                    <div className={`p-1.5 rounded ${status.bgColor}`}>
                      <StatusIcon className={`w-4 h-4 ${status.color}`} />
                    </div>

                    {/* PR info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary hover:text-accent-blue">
                          {pr.title}
                        </span>
                        <span className="text-xs text-text-muted">
                          #{pr.number}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mt-1 text-xs text-text-muted">
                        {/* Author */}
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{pr.authorName || pr.authorEmail}</span>
                        </div>

                        {/* Sandbox */}
                        <div className="flex items-center gap-1">
                          <GitPullRequest className="w-3 h-3" />
                          <span>{pr.sandboxName} → {pr.targetBranch}</span>
                        </div>

                        {/* Time */}
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(pr.createdAt)}</span>
                        </div>
                      </div>

                      {/* Description preview */}
                      {pr.description && (
                        <p className="mt-1 text-sm text-text-muted line-clamp-1">
                          {pr.description}
                        </p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      {/* Files changed */}
                      <div className="flex items-center gap-1" title="Files changed">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{pr.fileCount}</span>
                      </div>

                      {/* Comments */}
                      <div className="flex items-center gap-1" title="Comments">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{pr.commentCount}</span>
                      </div>

                      {/* Approvals */}
                      <div
                        className={`flex items-center gap-1 ${pr.approvalCount > 0 ? 'text-status-success' : ''}`}
                        title="Approvals"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{pr.approvalCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PullRequestList;
