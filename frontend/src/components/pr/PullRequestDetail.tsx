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
  ArrowLeft,
  Plus,
  Minus,
  Send,
  Eye,
} from 'lucide-react';
import { IconButton, EmptyState, Tabs, TabsList, TabsTrigger } from '@/components/ui';
import { useSandboxStore } from '@/store/sandboxStore';
import { DiffViewer } from './DiffViewer';

interface PullRequestDetailProps {
  prId: string;
  onBack?: () => void;
}

const statusConfig = {
  draft: {
    color: 'text-text-muted',
    bgColor: 'bg-dark-elevated/10',
    borderColor: 'border-border-default/20',
    label: 'Draft',
  },
  open: {
    color: 'text-status-success',
    bgColor: 'bg-status-success/10',
    borderColor: 'border-status-success/20',
    label: 'Open',
  },
  approved: {
    color: 'text-status-info',
    bgColor: 'bg-status-info/10',
    borderColor: 'border-status-info/20',
    label: 'Approved',
  },
  merged: {
    color: 'text-accent-purple',
    bgColor: 'bg-accent-purple/10',
    borderColor: 'border-accent-purple/20',
    label: 'Merged',
  },
  closed: {
    color: 'text-status-danger',
    bgColor: 'bg-status-danger/10',
    borderColor: 'border-status-danger/20',
    label: 'Closed',
  },
};

export const PullRequestDetail: React.FC<PullRequestDetailProps> = ({
  prId,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'comments'>('overview');
  const [newComment, setNewComment] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'request_changes' | null>(null);
  const [reviewComment, setReviewComment] = useState('');

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleSubmitReview = async () => {
    if (!reviewAction) return;

    try {
      await submitReview(prId, {
        status: reviewAction === 'approve' ? 'approved' : 'changes_requested',
        comment: reviewComment || undefined,
      });
      setReviewAction(null);
      setReviewComment('');
    } catch (err) {
      console.error('Failed to submit review:', err);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await addComment(prId, { body: newComment.trim() });
      setNewComment('');
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const handleMerge = async () => {
    if (confirm('Are you sure you want to merge this pull request?')) {
      try {
        await mergePullRequest(prId);
      } catch (err) {
        console.error('Failed to merge:', err);
      }
    }
  };

  if (!currentPullRequest) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue"></div>
      </div>
    );
  }

  const pr = currentPullRequest;
  const status = statusConfig[pr.status];

  return (
    <div className="h-full flex flex-col bg-dark-bg">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-default bg-dark-card">
        <div className="flex items-center gap-3 mb-2">
          {onBack && (
            <IconButton
              icon={<ArrowLeft className="w-5 h-5" />}
              variant="ghost"
              tooltip="Back"
              onClick={onBack}
            />
          )}

          <div className={`px-2 py-0.5 text-xs font-medium rounded ${status.bgColor} ${status.color}`}>
            {status.label}
          </div>

          <span className="text-text-muted">#{pr.number}</span>
        </div>

        <h1 className="text-xl font-semibold text-text-primary">{pr.title}</h1>

        <div className="flex items-center gap-4 mt-2 text-sm text-text-muted">
          <div className="flex items-center gap-1">
            <User className="w-4 h-4" />
            <span>{pr.authorName || pr.authorEmail}</span>
          </div>
          <div className="flex items-center gap-1">
            <GitPullRequest className="w-4 h-4" />
            <span>{pr.sandboxName} → {pr.targetBranch}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{formatDate(pr.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-dark-card">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} variant="underline" size="md" className="px-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="files" count={currentPRDiff?.totalFiles}>Files</TabsTrigger>
            <TabsTrigger value="comments" count={currentPRComments.length}>Comments</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="mb-4 p-3 bg-status-danger/10 border border-status-danger/20 rounded-md flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-status-danger" />
            <p className="text-sm text-status-danger">{error}</p>
          </div>
        )}

        {/* Overview tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Description */}
            {pr.description && (
              <div className="p-4 bg-dark-card border border-border-default rounded-lg">
                <h3 className="text-sm font-medium text-text-primary mb-2">Description</h3>
                <p className="text-sm text-text-secondary whitespace-pre-wrap">{pr.description}</p>
              </div>
            )}

            {/* Diff summary */}
            {currentPRDiff && (
              <div className="p-4 bg-dark-card border border-border-default rounded-lg">
                <h3 className="text-sm font-medium text-text-primary mb-3">Changes</h3>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-text-muted" />
                    <span className="text-text-primary">{currentPRDiff.totalFiles} files</span>
                  </div>
                  <div className="flex items-center gap-1 text-status-success">
                    <Plus className="w-4 h-4" />
                    <span>{currentPRDiff.totalAdditions}</span>
                  </div>
                  <div className="flex items-center gap-1 text-status-danger">
                    <Minus className="w-4 h-4" />
                    <span>{currentPRDiff.totalDeletions}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="p-4 bg-dark-card border border-border-default rounded-lg">
              <h3 className="text-sm font-medium text-text-primary mb-3">Reviews</h3>

              {currentPRReviews.length === 0 ? (
                <p className="text-sm text-text-muted">No reviews yet</p>
              ) : (
                <div className="space-y-3">
                  {currentPRReviews.map((review) => (
                    <div key={review.id} className="flex items-start gap-3">
                      <div className={`p-1 rounded ${
                        review.status === 'approved'
                          ? 'bg-status-success/10'
                          : review.status === 'changes_requested'
                          ? 'bg-status-danger/10'
                          : 'bg-dark-elevated/10'
                      }`}>
                        {review.status === 'approved' ? (
                          <CheckCircle2 className="w-4 h-4 text-status-success" />
                        ) : review.status === 'changes_requested' ? (
                          <XCircle className="w-4 h-4 text-status-danger" />
                        ) : (
                          <Eye className="w-4 h-4 text-text-muted" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-text-primary">
                            {review.reviewerName || review.reviewerEmail}
                          </span>
                          <span className={`text-xs ${
                            review.status === 'approved'
                              ? 'text-status-success'
                              : review.status === 'changes_requested'
                              ? 'text-status-danger'
                              : 'text-text-muted'
                          }`}>
                            {review.status === 'approved' ? 'Approved' :
                             review.status === 'changes_requested' ? 'Requested changes' : 'Pending'}
                          </span>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-text-muted mt-1">{review.comment}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Submit review form */}
              {pr.status === 'open' && (
                <div className="mt-4 pt-4 border-t border-border-default">
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setReviewAction(reviewAction === 'approve' ? null : 'approve')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        reviewAction === 'approve'
                          ? 'bg-status-success/20 text-status-success border border-status-success/30'
                          : 'bg-dark-elevated text-text-muted hover:text-status-success border border-border-default'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 inline mr-1" />
                      Approve
                    </button>
                    <button
                      onClick={() => setReviewAction(reviewAction === 'request_changes' ? null : 'request_changes')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        reviewAction === 'request_changes'
                          ? 'bg-status-danger/20 text-status-danger border border-status-danger/30'
                          : 'bg-dark-elevated text-text-muted hover:text-status-danger border border-border-default'
                      }`}
                    >
                      <XCircle className="w-4 h-4 inline mr-1" />
                      Request Changes
                    </button>
                  </div>

                  {reviewAction && (
                    <div className="space-y-2">
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Add a comment (optional)"
                        rows={2}
                        className="w-full px-3 py-2 bg-dark-elevated border border-border-default rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue resize-none"
                      />
                      <button
                        onClick={handleSubmitReview}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-white bg-accent-blue hover:bg-brand-primary rounded-md transition-colors disabled:opacity-50"
                      >
                        Submit Review
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Merge status */}
            <div className="p-4 bg-dark-card border border-border-default rounded-lg">
              <h3 className="text-sm font-medium text-text-primary mb-3">Merge Status</h3>

              {canMergeResult && (
                <div className="space-y-2 mb-4">
                  {canMergeResult.reasons.map((reason, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      {canMergeResult.canMerge ? (
                        <CheckCircle2 className="w-4 h-4 text-status-success" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-status-warning" />
                      )}
                      <span className="text-text-secondary">{reason}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                {pr.status === 'draft' && (
                  <button
                    onClick={() => openPullRequestForReview(prId)}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-status-success hover:bg-status-success/90 rounded-md transition-colors disabled:opacity-50"
                  >
                    Ready for Review
                  </button>
                )}

                {(pr.status === 'open' || pr.status === 'approved') && canMergeResult?.canMerge && (
                  <button
                    onClick={handleMerge}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-accent-purple hover:bg-accent-purple/90 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <GitMerge className="w-4 h-4" />
                    Merge Pull Request
                  </button>
                )}

                {pr.status !== 'merged' && pr.status !== 'closed' && (
                  <button
                    onClick={() => closePullRequest(prId)}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-status-danger bg-status-danger/10 hover:bg-status-danger/20 border border-status-danger/20 rounded-md transition-colors disabled:opacity-50"
                  >
                    Close PR
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Files tab */}
        {activeTab === 'files' && (
          <div className="space-y-4">
            {/* File list */}
            <div className="bg-dark-card border border-border-default rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-dark-elevated border-b border-border-default">
                <span className="text-sm font-medium text-text-primary">Changed Files</span>
              </div>

              {currentPRFiles.length === 0 ? (
                <div className="p-4 text-sm text-text-muted text-center">
                  No files changed
                </div>
              ) : (
                <div className="divide-y divide-border-default">
                  {currentPRFiles.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => setSelectedFile(file.filePath)}
                      className={`w-full px-4 py-2 flex items-center gap-3 text-left hover:bg-dark-elevated transition-colors ${
                        selectedFile === file.filePath ? 'bg-dark-elevated' : ''
                      }`}
                    >
                      <FileText className={`w-4 h-4 ${
                        file.changeType === 'added' ? 'text-status-success' :
                        file.changeType === 'deleted' ? 'text-status-danger' :
                        'text-status-warning'
                      }`} />
                      <span className="flex-1 text-sm text-text-primary font-mono truncate">
                        {file.filePath}
                      </span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-status-success">+{file.additions}</span>
                        <span className="text-status-danger">-{file.deletions}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Diff viewer */}
            {selectedFile && (
              <DiffViewer prId={prId} filePath={selectedFile} />
            )}
          </div>
        )}

        {/* Comments tab */}
        {activeTab === 'comments' && (
          <div className="space-y-4">
            {/* Comment list */}
            {currentPRComments.length === 0 ? (
              <EmptyState
                icon={<MessageSquare className="w-12 h-12" />}
                title="No comments yet"
              />
            ) : (
              <div className="space-y-4">
                {currentPRComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-4 bg-dark-card border border-border-default rounded-lg"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-text-muted" />
                      <span className="text-sm font-medium text-text-primary">
                        {comment.authorName || comment.authorEmail}
                      </span>
                      <span className="text-xs text-text-muted">
                        {formatDate(comment.createdAt)}
                      </span>
                      {comment.filePath && (
                        <span className="text-xs text-accent-blue font-mono">
                          {comment.filePath}:{comment.lineNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary whitespace-pre-wrap">
                      {comment.body}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Add comment form */}
            <div className="p-4 bg-dark-card border border-border-default rounded-lg">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                className="w-full px-3 py-2 bg-dark-elevated border border-border-default rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue resize-none"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleAddComment}
                  disabled={isLoading || !newComment.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-accent-blue hover:bg-brand-primary rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Comment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PullRequestDetail;
