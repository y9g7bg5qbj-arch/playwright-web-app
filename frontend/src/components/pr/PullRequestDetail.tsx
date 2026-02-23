import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  GitMerge,
  GitPullRequest,
  Loader2,
  MessageSquare,
  Minus,
  Plus,
  Send,
  User,
  XCircle,
} from 'lucide-react';
import {
  Badge,
  Button,
  EmptyState,
  IconButton,
  Tabs,
  TabsList,
  TabsTrigger,
  cn,
} from '@/components/ui';
import { useSandboxStore } from '@/store/sandboxStore';
import { useToastStore } from '@/store/useToastStore';
import { DiffViewer } from './DiffViewer';
import { getPullRequestStatusTheme, prUiClasses } from './prTheme';

interface PullRequestDetailProps {
  prId: string;
  onBack?: () => void;
}

type ActiveTab = 'overview' | 'files' | 'comments';

const reviewStatusLabel = {
  approved: 'Approved',
  changes_requested: 'Requested changes',
  pending: 'Pending',
} as const;

export const PullRequestDetail: React.FC<PullRequestDetailProps> = ({
  prId,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [newComment, setNewComment] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'request_changes' | null>(null);
  const [reviewComment, setReviewComment] = useState('');

  const addToast = useToastStore((s) => s.addToast);

  const {
    currentPullRequest,
    currentPRReviews,
    currentPRComments,
    currentPRFiles,
    currentPRDiff,
    canMergeResult,
    fetchPullRequest,
    fetchPRReviews,
    fetchPRComments,
    fetchPRFiles,
    fetchPRDiff,
    fetchFileDiff,
    checkCanMerge,
    submitReview,
    addComment,
    mergePullRequest,
    openPullRequestForReview,
    closePullRequest,
    isLoading,
    error,
    clearCurrentPR,
  } = useSandboxStore();

  useEffect(() => {
    if (prId) {
      setActiveTab('overview');
      setSelectedFile(null);
      setReviewAction(null);
      setReviewComment('');
      setNewComment('');

      fetchPullRequest(prId);
      fetchPRReviews(prId);
      fetchPRComments(prId);
      fetchPRFiles(prId);
      fetchPRDiff(prId);
      checkCanMerge(prId);
    }

    return () => clearCurrentPR();
  }, [prId]);

  useEffect(() => {
    if (selectedFile && prId) {
      fetchFileDiff(prId, selectedFile);
    }
  }, [selectedFile, prId]);

  const formatDate = (dateString: string) => new Date(dateString).toLocaleString();

  const handleSubmitReview = async () => {
    if (!reviewAction) {
      return;
    }

    try {
      await submitReview(prId, {
        status: reviewAction === 'approve' ? 'approved' : 'changes_requested',
        comment: reviewComment || undefined,
      });
      setReviewAction(null);
      setReviewComment('');
      addToast({
        message: reviewAction === 'approve' ? 'Review approved' : 'Changes requested',
        variant: 'success',
      });
    } catch (err) {
      addToast({
        message: `Failed to submit review: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'error',
      });
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      return;
    }

    try {
      await addComment(prId, { body: newComment.trim() });
      setNewComment('');
      addToast({ message: 'Comment added', variant: 'success' });
    } catch (err) {
      addToast({
        message: `Failed to add comment: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'error',
      });
    }
  };

  const handleMerge = async () => {
    if (confirm('Are you sure you want to merge this pull request?')) {
      try {
        await mergePullRequest(prId);
        addToast({ message: 'Pull request merged successfully', variant: 'success' });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        const isConflict = message.includes('MERGE_CONFLICT:');
        addToast({
          message: isConflict
            ? 'Merge conflicts detected. Update Sandbox from Dev to resolve conflicts.'
            : `Failed to merge: ${message}`,
          variant: 'error',
        });
      }
    }
  };

  if (!currentPullRequest) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading pull request...
          </div>
        ) : (
          <EmptyState
            icon={<GitPullRequest className="h-5 w-5" />}
            title="Unable to load pull request"
            message={error || 'Try selecting a different pull request.'}
          />
        )}
      </div>
    );
  }

  const pr = currentPullRequest;
  const status = getPullRequestStatusTheme(pr.status);

  return (
    <div className="flex h-full flex-col bg-dark-canvas">
      <div className="border-b border-border-default bg-dark-bg px-4 py-3">
        <div className="flex items-center gap-2">
          {onBack && (
            <IconButton
              icon={<ArrowLeft className="h-4 w-4" />}
              variant="ghost"
              tooltip="Back"
              onClick={onBack}
              className="md:hidden"
            />
          )}
          <Badge variant={status.badgeVariant} size="sm">{status.label}</Badge>
          <span className="text-xs text-text-muted">#{pr.number}</span>
        </div>

        <h1 className="mt-2 text-lg font-semibold text-text-primary">{pr.title}</h1>

        <div className={cn(prUiClasses.metaRow, 'mt-2')}>
          <span className={prUiClasses.metaItem}>
            <User className="h-3.5 w-3.5" />
            {pr.authorName || pr.authorEmail}
          </span>
          <span className={prUiClasses.metaItem}>
            <GitPullRequest className="h-3.5 w-3.5" />
            {pr.sandboxName} → {pr.targetBranch}
          </span>
          <span className={prUiClasses.metaItem}>
            <Clock className="h-3.5 w-3.5" />
            {formatDate(pr.createdAt)}
          </span>
        </div>
      </div>

      <div className="border-b border-border-default bg-dark-bg px-4">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as ActiveTab)}
          variant="underline"
          size="md"
        >
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="files" count={currentPRDiff?.totalFiles}>Files</TabsTrigger>
            <TabsTrigger value="comments" count={currentPRComments.length}>Comments</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {error && (
          <div className="mb-4 rounded-md border border-status-danger/30 bg-status-danger/10 px-3 py-2 text-xs text-status-danger">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              {error}
            </div>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-4">
            {pr.description && (
              <section className={prUiClasses.sectionCard}>
                <p className={prUiClasses.sectionLabel}>Description</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">{pr.description}</p>
              </section>
            )}

            {currentPRDiff && (
              <section className={prUiClasses.sectionCard}>
                <p className={prUiClasses.sectionLabel}>Changes</p>
                <div className="mt-3 flex flex-wrap items-center gap-5 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-text-secondary">
                    <FileText className="h-4 w-4 text-text-muted" />
                    <span className="text-sm text-text-primary">{currentPRDiff.totalFiles} files</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-status-success">
                    <Plus className="h-4 w-4" />
                    <span className="text-sm">{currentPRDiff.totalAdditions}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-status-danger">
                    <Minus className="h-4 w-4" />
                    <span className="text-sm">{currentPRDiff.totalDeletions}</span>
                  </span>
                </div>
              </section>
            )}

            <section className={prUiClasses.sectionCard}>
              <p className={prUiClasses.sectionLabel}>Reviews</p>

              {currentPRReviews.length === 0 ? (
                <p className="mt-3 text-xs text-text-muted">No reviews yet.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {currentPRReviews.map((review) => {
                    const isApproved = review.status === 'approved';
                    const isChangesRequested = review.status === 'changes_requested';
                    const statusTextClass = isApproved
                      ? 'text-status-success'
                      : isChangesRequested
                      ? 'text-status-danger'
                      : 'text-text-muted';

                    return (
                      <div
                        key={review.id}
                        className="rounded-md border border-border-default bg-dark-elevated/35 px-3 py-2"
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={cn(
                              'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border',
                              isApproved
                                ? 'border-status-success/30 bg-status-success/12 text-status-success'
                                : isChangesRequested
                                ? 'border-status-danger/30 bg-status-danger/12 text-status-danger'
                                : 'border-border-default bg-dark-card text-text-muted'
                            )}
                          >
                            {isApproved ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : isChangesRequested ? (
                              <XCircle className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-text-primary">
                                {review.reviewerName || review.reviewerEmail}
                              </span>
                              <span className={cn('text-xs', statusTextClass)}>
                                {reviewStatusLabel[review.status]}
                              </span>
                            </div>
                            {review.comment && (
                              <p className="mt-1 whitespace-pre-wrap text-xs text-text-secondary">
                                {review.comment}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {pr.status === 'open' && (
                <div className="mt-4 border-t border-border-default pt-4">
                  <p className={prUiClasses.sectionLabel}>Submit Review</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      onClick={() =>
                        setReviewAction(reviewAction === 'approve' ? null : 'approve')
                      }
                      className={cn(
                        'border-border-default text-text-secondary',
                        reviewAction === 'approve'
                          ? 'border-status-success/40 bg-status-success/15 text-status-success'
                          : 'hover:text-status-success'
                      )}
                      leftIcon={<CheckCircle2 className="h-4 w-4" />}
                    >
                      Approve
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      onClick={() =>
                        setReviewAction(
                          reviewAction === 'request_changes' ? null : 'request_changes'
                        )
                      }
                      className={cn(
                        'border-border-default text-text-secondary',
                        reviewAction === 'request_changes'
                          ? 'border-status-danger/40 bg-status-danger/15 text-status-danger'
                          : 'hover:text-status-danger'
                      )}
                      leftIcon={<XCircle className="h-4 w-4" />}
                    >
                      Request Changes
                    </Button>
                  </div>

                  {reviewAction && (
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={reviewComment}
                        onChange={(event) => setReviewComment(event.target.value)}
                        placeholder="Add a comment (optional)"
                        rows={3}
                        className="w-full resize-none rounded border border-border-default bg-dark-canvas px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15"
                      />

                      <Button
                        type="button"
                        variant="action"
                        size="md"
                        onClick={handleSubmitReview}
                        disabled={isLoading}
                      >
                        Submit Review
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className={prUiClasses.sectionCard}>
              <p className={prUiClasses.sectionLabel}>Merge Status</p>

              {canMergeResult && canMergeResult.reasons.length > 0 && (
                <div className="mt-3 space-y-2">
                  {canMergeResult.reasons.map((reason, index) => (
                    <div key={index} className="inline-flex items-start gap-1.5 text-xs text-text-secondary">
                      {canMergeResult.canMerge ? (
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-status-success" />
                      ) : (
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 text-status-warning" />
                      )}
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {pr.status === 'draft' && (
                  <Button
                    type="button"
                    variant="success"
                    size="md"
                    onClick={async () => {
                      try {
                        await openPullRequestForReview(prId);
                        addToast({ message: 'Pull request opened for review', variant: 'success' });
                      } catch (err) {
                        addToast({
                          message: `Failed to open for review: ${
                            err instanceof Error ? err.message : 'Unknown error'
                          }`,
                          variant: 'error',
                        });
                      }
                    }}
                    disabled={isLoading}
                  >
                    Ready for Review
                  </Button>
                )}

                {(pr.status === 'open' || pr.status === 'approved') && canMergeResult?.canMerge && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={handleMerge}
                    disabled={isLoading}
                    leftIcon={<GitMerge className="h-4 w-4" />}
                    className="border-accent-purple/35 text-accent-purple hover:border-accent-purple/55 hover:text-accent-purple"
                  >
                    Merge Pull Request
                  </Button>
                )}

                {pr.status !== 'merged' && pr.status !== 'closed' && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={async () => {
                      try {
                        await closePullRequest(prId);
                        addToast({ message: 'Pull request closed', variant: 'success' });
                      } catch (err) {
                        addToast({
                          message: `Failed to close PR: ${
                            err instanceof Error ? err.message : 'Unknown error'
                          }`,
                          variant: 'error',
                        });
                      }
                    }}
                    disabled={isLoading}
                    className="border-status-danger/30 text-status-danger hover:border-status-danger/45 hover:text-status-danger"
                  >
                    Close PR
                  </Button>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'files' && (
          <div className="space-y-4">
            <section className={prUiClasses.sectionCard}>
              <div className="mb-2 flex items-center justify-between">
                <p className={prUiClasses.sectionLabel}>Changed Files</p>
                <span className="text-xs text-text-muted">{currentPRFiles.length}</span>
              </div>

              {currentPRFiles.length === 0 ? (
                <EmptyState title="No files changed" compact />
              ) : (
                <div className="overflow-hidden rounded border border-border-default">
                  {currentPRFiles.map((file) => (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => setSelectedFile(file.filePath)}
                      className={cn(
                        'flex w-full items-center gap-2 border-b border-border-default px-3 py-2 text-left transition-colors last:border-b-0',
                        selectedFile === file.filePath
                          ? 'bg-brand-primary/12'
                          : 'hover:bg-dark-elevated/45'
                      )}
                    >
                      <FileText
                        className={cn(
                          'h-4 w-4 shrink-0',
                          file.changeType === 'added'
                            ? 'text-status-success'
                            : file.changeType === 'deleted'
                            ? 'text-status-danger'
                            : 'text-status-warning'
                        )}
                      />

                      <span className="min-w-0 flex-1 truncate font-mono text-xs text-text-primary">
                        {file.filePath}
                      </span>

                      <span className="text-xxs text-status-success">+{file.additions}</span>
                      <span className="text-xxs text-status-danger">-{file.deletions}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {selectedFile ? (
              <DiffViewer prId={prId} filePath={selectedFile} />
            ) : (
              currentPRFiles.length > 0 && (
                <section className={prUiClasses.sectionMuted}>
                  <p className="text-xs text-text-muted">Select a file to view its diff.</p>
                </section>
              )
            )}
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="space-y-4">
            {currentPRComments.length === 0 ? (
              <EmptyState icon={<MessageSquare className="h-5 w-5" />} title="No comments yet" />
            ) : (
              <div className="space-y-3">
                {currentPRComments.map((comment) => (
                  <section key={comment.id} className={prUiClasses.sectionCard}>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 font-medium text-text-primary">
                        <User className="h-3.5 w-3.5 text-text-muted" />
                        {comment.authorName || comment.authorEmail}
                      </span>
                      <span className="text-text-muted">{formatDate(comment.createdAt)}</span>
                      {comment.filePath && (
                        <span className="font-mono text-xxs text-brand-secondary">
                          {comment.filePath}:{comment.lineNumber}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">{comment.body}</p>
                  </section>
                ))}
              </div>
            )}

            <section className={prUiClasses.sectionCard}>
              <p className={prUiClasses.sectionLabel}>Add Comment</p>
              <textarea
                value={newComment}
                onChange={(event) => setNewComment(event.target.value)}
                placeholder="Add a comment..."
                rows={4}
                className="mt-2 w-full resize-none rounded border border-border-default bg-dark-canvas px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15"
              />
              <div className="mt-2 flex justify-end">
                <Button
                  type="button"
                  onClick={handleAddComment}
                  disabled={isLoading || !newComment.trim()}
                  variant="action"
                  size="md"
                  leftIcon={<Send className="h-4 w-4" />}
                >
                  Comment
                </Button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default PullRequestDetail;
