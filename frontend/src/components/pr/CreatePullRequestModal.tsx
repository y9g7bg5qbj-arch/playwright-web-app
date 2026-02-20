import React, { useEffect, useMemo, useState } from 'react';
import { Box, GitBranch, GitPullRequest } from 'lucide-react';
import { Button, Input, Modal, Select, cardSelectClass, cn } from '@/components/ui';
import { useSandboxStore } from '@/store/sandboxStore';
import type { Sandbox } from '@/api/sandbox';

interface CreatePullRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  sandbox?: Sandbox | null;
  sandboxes?: Sandbox[];
  initialSandboxId?: string;
  onSuccess?: () => void;
}

export const CreatePullRequestModal: React.FC<CreatePullRequestModalProps> = ({
  isOpen,
  onClose,
  sandbox,
  sandboxes,
  initialSandboxId,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetBranch, setTargetBranch] = useState<'dev' | 'master'>('dev');
  const [error, setError] = useState<string | null>(null);
  const [selectedSandboxId, setSelectedSandboxId] = useState<string>(
    sandbox?.id || initialSandboxId || ''
  );

  const { createPullRequest, isLoading } = useSandboxStore();

  const availableSandboxes = useMemo(() => {
    if (sandbox) {
      return [sandbox];
    }
    return (sandboxes || []).filter((item) => item.status === 'active');
  }, [sandbox, sandboxes]);

  const selectedSandbox = useMemo(
    () => availableSandboxes.find((item) => item.id === selectedSandboxId) || null,
    [availableSandboxes, selectedSandboxId]
  );

  const sandboxOptions = useMemo(
    () =>
      availableSandboxes.length > 0
        ? availableSandboxes.map((item) => ({ value: item.id, label: item.name }))
        : [{ value: '', label: 'No active sandboxes available', disabled: true }],
    [availableSandboxes]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (selectedSandboxId && availableSandboxes.some((item) => item.id === selectedSandboxId)) {
      return;
    }

    const preferredId = sandbox?.id || initialSandboxId;
    const nextSandboxId =
      preferredId && availableSandboxes.some((item) => item.id === preferredId)
        ? preferredId
        : availableSandboxes[0]?.id || '';

    setSelectedSandboxId(nextSandboxId);
  }, [isOpen, availableSandboxes, selectedSandboxId, sandbox?.id, initialSandboxId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Pull request title is required');
      return;
    }

    if (!selectedSandbox) {
      setError('Please select a sandbox');
      return;
    }

    try {
      await createPullRequest(selectedSandbox.id, {
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

    const preferredId = sandbox?.id || initialSandboxId;
    const nextSandboxId =
      preferredId && availableSandboxes.some((item) => item.id === preferredId)
        ? preferredId
        : availableSandboxes[0]?.id || '';

    setSelectedSandboxId(nextSandboxId);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Pull Request"
      description="Open a pull request from a sandbox into a target branch."
      size="lg"
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-pr-form"
            variant="action"
            size="md"
            disabled={isLoading || !title.trim() || !selectedSandbox}
          >
            {isLoading ? 'Creating...' : 'Create Pull Request'}
          </Button>
        </>
      }
    >
      <form id="create-pr-form" onSubmit={handleSubmit} className="space-y-4">
        {!sandbox && (
          <div>
            <Select
              id="pr-sandbox"
              label="Source Sandbox"
              value={selectedSandboxId}
              onChange={(event) => setSelectedSandboxId(event.target.value)}
              options={sandboxOptions}
              disabled={availableSandboxes.length === 0}
            />
            {availableSandboxes.length === 0 && (
              <p className="mt-1 text-xs text-text-muted">
                Create and populate a sandbox before opening a pull request.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border-default bg-dark-elevated/35 px-3 py-2 text-xs">
          <span className="inline-flex items-center gap-1.5 text-text-secondary">
            <Box className="h-3.5 w-3.5 text-accent-purple" />
            <span className="font-medium text-text-primary">
              {selectedSandbox?.name || 'Select sandbox'}
            </span>
          </span>
          <span className="text-text-muted">→</span>
          <span className="inline-flex items-center gap-1.5 text-text-secondary">
            <GitBranch className="h-3.5 w-3.5 text-status-info" />
            <span className="font-medium text-text-primary">{targetBranch}</span>
          </span>
        </div>

        <Input
          id="pr-title"
          label="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Brief description of your changes"
          maxLength={200}
          autoFocus
        />

        <div>
          <label htmlFor="pr-description" className="mb-1 block text-xs font-medium text-text-secondary">
            Description <span className="text-text-muted">(optional)</span>
          </label>
          <textarea
            id="pr-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Detailed explanation of what changed and why"
            rows={4}
            className="w-full resize-none rounded border border-border-default bg-dark-canvas px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15"
            maxLength={2000}
          />
          <p className="mt-1 text-xs text-text-muted">
            Describe the changes you made and why they are needed.
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-text-secondary">Target Branch</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setTargetBranch('dev')}
              className={cn(cardSelectClass(targetBranch === 'dev'), 'w-full items-start gap-2')}
            >
              <GitBranch
                className={cn(
                  'mt-0.5 h-4 w-4',
                  targetBranch === 'dev' ? 'text-status-info' : 'text-text-muted'
                )}
              />
              <div>
                <p className="text-sm font-medium text-text-primary">Development</p>
                <p className="text-xs text-text-muted">Integration branch (recommended)</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTargetBranch('master')}
              className={cn(cardSelectClass(targetBranch === 'master'), 'w-full items-start gap-2')}
            >
              <GitBranch
                className={cn(
                  'mt-0.5 h-4 w-4',
                  targetBranch === 'master' ? 'text-status-success' : 'text-text-muted'
                )}
              />
              <div>
                <p className="text-sm font-medium text-text-primary">Production</p>
                <p className="text-xs text-text-muted">Stable release branch</p>
              </div>
            </button>
          </div>
        </div>

        <div className="rounded-md border border-status-info/30 bg-status-info/10 px-3 py-2 text-xs">
          <div className="flex items-start gap-2">
            <GitPullRequest className="mt-0.5 h-4 w-4 shrink-0 text-status-info" />
            <div>
              <p className="font-medium text-status-info">What happens next?</p>
              <p className="mt-1 text-text-secondary">
                Team members can review this pull request and a senior member can merge changes
                into {targetBranch} when it is approved.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-status-danger/30 bg-status-danger/10 px-3 py-2 text-xs text-status-danger">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
};

export default CreatePullRequestModal;
