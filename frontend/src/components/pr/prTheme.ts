import type { PullRequest } from '@/api/pullRequest';
import type { BadgeProps } from '@/components/ui';
import {
  CheckCircle2,
  FileText,
  GitMerge,
  GitPullRequest,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

export type PullRequestStatus = PullRequest['status'];

export interface PullRequestStatusTheme {
  label: string;
  icon: LucideIcon;
  badgeVariant: BadgeProps['variant'];
  iconClassName: string;
  surfaceClassName: string;
  borderClassName: string;
  textClassName: string;
}

const pullRequestStatusTheme: Record<PullRequestStatus, PullRequestStatusTheme> = {
  draft: {
    label: 'Draft',
    icon: FileText,
    badgeVariant: 'default',
    iconClassName: 'text-text-muted',
    surfaceClassName: 'bg-dark-elevated/45',
    borderClassName: 'border-border-default',
    textClassName: 'text-text-muted',
  },
  open: {
    label: 'Open',
    icon: GitPullRequest,
    badgeVariant: 'green',
    iconClassName: 'text-status-success',
    surfaceClassName: 'bg-status-success/12',
    borderClassName: 'border-status-success/25',
    textClassName: 'text-status-success',
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle2,
    badgeVariant: 'blue',
    iconClassName: 'text-status-info',
    surfaceClassName: 'bg-status-info/12',
    borderClassName: 'border-status-info/25',
    textClassName: 'text-status-info',
  },
  merged: {
    label: 'Merged',
    icon: GitMerge,
    badgeVariant: 'purple',
    iconClassName: 'text-accent-purple',
    surfaceClassName: 'bg-accent-purple/12',
    borderClassName: 'border-accent-purple/25',
    textClassName: 'text-accent-purple',
  },
  closed: {
    label: 'Closed',
    icon: XCircle,
    badgeVariant: 'red',
    iconClassName: 'text-status-danger',
    surfaceClassName: 'bg-status-danger/12',
    borderClassName: 'border-status-danger/25',
    textClassName: 'text-status-danger',
  },
};

export const pullRequestStatusOptions = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Open' },
  { value: 'approved', label: 'Approved' },
  { value: 'merged', label: 'Merged' },
  { value: 'closed', label: 'Closed' },
] as const;

export const prUiClasses = {
  sectionCard: 'rounded-lg border border-border-default bg-dark-card p-4',
  sectionMuted: 'rounded-lg border border-border-default bg-dark-elevated/35 p-4',
  sectionLabel: 'text-3xs font-semibold uppercase tracking-wide text-text-secondary',
  metaRow: 'flex flex-wrap items-center gap-3 text-xs text-text-muted',
  metaItem: 'inline-flex items-center gap-1.5',
  listRowBase:
    'group w-full border-b border-border-default px-3 py-2.5 text-left transition-colors duration-fast',
  listRowIdle: 'hover:bg-dark-elevated/45',
  listRowSelected: 'bg-brand-primary/12',
  listTitle: 'text-sm font-medium text-text-primary',
  listDescription: 'mt-1 text-xs text-text-secondary line-clamp-1',
  listStat: 'inline-flex items-center gap-1 text-3xs text-text-muted',
};

export const getPullRequestStatusTheme = (status: PullRequestStatus): PullRequestStatusTheme =>
  pullRequestStatusTheme[status];
