import React, { useState } from 'react';
import { Box, GitBranch } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useSandboxStore } from '@/store/sandboxStore';

interface CreateSandboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export const CreateSandboxModal: React.FC<CreateSandboxModalProps> = ({
  isOpen,
  onClose,
  projectId,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sourceBranch, setSourceBranch] = useState<'dev' | 'master'>('dev');
  const [error, setError] = useState<string | null>(null);

  const { createSandbox, isLoading } = useSandboxStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Sandbox name is required');
      return;
    }

    try {
      await createSandbox(projectId, {
        name: name.trim(),
        description: description.trim() || undefined,
        sourceBranch,
      });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sandbox');
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setSourceBranch('dev');
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Sandbox"
      size="md"
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
            className="px-4 py-2 text-sm font-medium text-white bg-accent-blue hover:bg-brand-primary rounded-md transition-colors disabled:opacity-50"
            disabled={isLoading || !name.trim()}
          >
            {isLoading ? 'Creating...' : 'Create Sandbox'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info banner */}
        <div className="flex items-start gap-3 p-3 bg-accent-purple/10 border border-accent-purple/20 rounded-lg">
          <Box className="w-5 h-5 text-accent-purple mt-0.5" />
          <div className="text-sm">
            <p className="text-accent-purple font-medium">What is a Sandbox?</p>
            <p className="text-text-muted mt-1">
              A sandbox is your private workspace where you can make changes without affecting others.
              When ready, create a Pull Request to merge your changes.
            </p>
          </div>
        </div>

        {/* Name field */}
        <div>
          <label htmlFor="sandbox-name" className="block text-sm font-medium text-text-primary mb-1">
            Sandbox Name
          </label>
          <input
            id="sandbox-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., login-refactor"
            className="w-full px-3 py-2 bg-dark-elevated border border-border-default rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent"
            maxLength={100}
            autoFocus
          />
          <p className="mt-1 text-xs text-text-muted">
            A short, descriptive name for your work
          </p>
        </div>

        {/* Description field */}
        <div>
          <label htmlFor="sandbox-description" className="block text-sm font-medium text-text-primary mb-1">
            Description <span className="text-text-muted">(optional)</span>
          </label>
          <textarea
            id="sandbox-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What are you working on?"
            rows={2}
            className="w-full px-3 py-2 bg-dark-elevated border border-border-default rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent resize-none"
            maxLength={500}
          />
        </div>

        {/* Source branch selection */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Create From
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setSourceBranch('dev')}
              className={`
                flex-1 flex items-center gap-3 p-3 rounded-lg border transition-colors
                ${sourceBranch === 'dev'
                  ? 'border-status-info bg-status-info/10'
                  : 'border-border-default hover:border-border-emphasis bg-dark-elevated'
                }
              `}
            >
              <GitBranch className={`w-5 h-5 ${sourceBranch === 'dev' ? 'text-status-info' : 'text-text-muted'}`} />
              <div className="text-left">
                <div className={`font-medium ${sourceBranch === 'dev' ? 'text-status-info' : 'text-text-primary'}`}>
                  Development
                </div>
                <div className="text-xs text-text-muted">Latest integrated code</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSourceBranch('master')}
              className={`
                flex-1 flex items-center gap-3 p-3 rounded-lg border transition-colors
                ${sourceBranch === 'master'
                  ? 'border-status-success bg-status-success/10'
                  : 'border-border-default hover:border-border-emphasis bg-dark-elevated'
                }
              `}
            >
              <GitBranch className={`w-5 h-5 ${sourceBranch === 'master' ? 'text-status-success' : 'text-text-muted'}`} />
              <div className="text-left">
                <div className={`font-medium ${sourceBranch === 'master' ? 'text-status-success' : 'text-text-primary'}`}>
                  Production
                </div>
                <div className="text-xs text-text-muted">Stable, released code</div>
              </div>
            </button>
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

export default CreateSandboxModal;
