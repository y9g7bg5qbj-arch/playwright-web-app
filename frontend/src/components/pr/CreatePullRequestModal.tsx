import React, { useState } from 'react';
import { GitPullRequest, GitBranch, Box } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useSandboxStore } from '@/store/sandboxStore';
import type { Sandbox } from '@/api/sandbox';

interface CreatePullRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  sandbox: Sandbox;
  onSuccess?: () => void;
}

export const CreatePullRequestModal: React.FC<CreatePullRequestModalProps> = ({
  isOpen,
  onClose,
  sandbox,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetBranch, setTargetBranch] = useState<'dev' | 'master'>('dev');
  const [error, setError] = useState<string | null>(null);

  const { createPullRequest, isLoading } = useSandboxStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Pull request title is required');
      return;
    }

    try {
      await createPullRequest(sandbox.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        targetBranch,
      });
      handleClose();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pull request');
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setTargetBranch('dev');
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Pull Request"
      size="lg"
      footer={
        <>
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-text-primary bg-dark-elevated border border-border-default rounded-md hover:bg-dark-card transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-accent-blue hover:bg-blue-600 rounded-md transition-colors disabled:opacity-50"
            disabled={isLoading || !title.trim()}
          >
            {isLoading ? 'Creating...' : 'Create Pull Request'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Branch info */}
        <div className="flex items-center gap-3 p-3 bg-dark-elevated border border-border-default rounded-lg">
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-400">{sandbox.name}</span>
          </div>
          <span className="text-text-muted">→</span>
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-400">{targetBranch}</span>
          </div>
        </div>

        {/* Title field */}
        <div>
          <label htmlFor="pr-title" className="block text-sm font-medium text-text-primary mb-1">
            Title
          </label>
          <input
            id="pr-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief description of your changes"
            className="w-full px-3 py-2 bg-dark-elevated border border-border-default rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent"
            maxLength={200}
            autoFocus
          />
        </div>

        {/* Description field */}
        <div>
          <label htmlFor="pr-description" className="block text-sm font-medium text-text-primary mb-1">
            Description <span className="text-text-muted">(optional)</span>
          </label>
          <textarea
            id="pr-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed explanation of what changed and why"
            rows={4}
            className="w-full px-3 py-2 bg-dark-elevated border border-border-default rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent resize-none"
            maxLength={2000}
          />
          <p className="mt-1 text-xs text-text-muted">
            Describe the changes you've made. What was the problem? What's the solution?
          </p>
        </div>

        {/* Target branch selection */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Target Branch
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setTargetBranch('dev')}
              className={`
                flex-1 flex items-center gap-3 p-3 rounded-lg border transition-colors
                ${targetBranch === 'dev'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-border-default hover:border-border-emphasis bg-dark-elevated'
                }
              `}
            >
              <GitBranch className={`w-5 h-5 ${targetBranch === 'dev' ? 'text-blue-400' : 'text-text-muted'}`} />
              <div className="text-left">
                <div className={`font-medium ${targetBranch === 'dev' ? 'text-blue-400' : 'text-text-primary'}`}>
                  Development
                </div>
                <div className="text-xs text-text-muted">Integration branch (recommended)</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTargetBranch('master')}
              className={`
                flex-1 flex items-center gap-3 p-3 rounded-lg border transition-colors
                ${targetBranch === 'master'
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-border-default hover:border-border-emphasis bg-dark-elevated'
                }
              `}
            >
              <GitBranch className={`w-5 h-5 ${targetBranch === 'master' ? 'text-green-400' : 'text-text-muted'}`} />
              <div className="text-left">
                <div className={`font-medium ${targetBranch === 'master' ? 'text-green-400' : 'text-text-primary'}`}>
                  Production
                </div>
                <div className="text-xs text-text-muted">Stable release branch</div>
              </div>
            </button>
          </div>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
          <GitPullRequest className="w-5 h-5 text-orange-400 mt-0.5" />
          <div className="text-sm">
            <p className="text-orange-300 font-medium">What happens next?</p>
            <p className="text-text-muted mt-1">
              After creating this PR, team members can review your changes.
              Once approved, a senior member can merge the changes into {targetBranch}.
            </p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-status-danger/10 border border-status-danger/20 rounded-md">
            <p className="text-sm text-status-danger">{error}</p>
          </div>
        )}
      </form>
    </Modal>
  );
};

export default CreatePullRequestModal;
