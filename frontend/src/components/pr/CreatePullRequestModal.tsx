import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, FileText, GitBranch, GitPullRequest, Loader2 } from 'lucide-react';
import { Button, Input, Modal, Select } from '@/components/ui';
import { useSandboxStore } from '@/store/sandboxStore';
import { sandboxApi } from '@/api/sandbox';
import { pullRequestApi, type DiffPreviewFile } from '@/api/pullRequest';
import type { Sandbox } from '@/api/sandbox';
import { cn } from '@/lib/utils';

interface CreatePullRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Single sandbox mode (e.g. opened from a sandbox context) */
  sandbox?: Sandbox | null;
  /** Pre-loaded sandboxes (legacy — ignored when nestedProjects provided) */
  sandboxes?: Sandbox[];
  initialSandboxId?: string;
  projectId?: string;
  /** Available projects for the project dropdown */
  nestedProjects?: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}

export const CreatePullRequestModal: React.FC<CreatePullRequestModalProps> = ({
  isOpen,
  onClose,
  sandbox,
  sandboxes,
  initialSandboxId,
  projectId,
  nestedProjects,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Project / sandbox cascading selection
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || '');
  const [projectSandboxes, setProjectSandboxes] = useState<Sandbox[]>([]);
  const [isLoadingSandboxes, setIsLoadingSandboxes] = useState(false);
  const [selectedSandboxId, setSelectedSandboxId] = useState<string>(
    sandbox?.id || initialSandboxId || ''
  );

  // Diff preview state
  const [diffFiles, setDiffFiles] = useState<DiffPreviewFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isLoadingDiff, setIsLoadingDiff] = useState(false);
  const [diffError, setDiffError] = useState<string | null>(null);

  const { createPullRequest, isLoading } = useSandboxStore();

  const hasProjects = nestedProjects && nestedProjects.length > 0;

  // Resolve available sandboxes: either from project fetch or from props
  const availableSandboxes = useMemo(() => {
    if (sandbox) return [sandbox];
    if (hasProjects) return projectSandboxes.filter((s) => s.status === 'active');
    return (sandboxes || []).filter((s) => s.status === 'active');
  }, [sandbox, sandboxes, projectSandboxes, hasProjects]);

  const selectedSandbox = useMemo(
    () => availableSandboxes.find((s) => s.id === selectedSandboxId) || null,
    [availableSandboxes, selectedSandboxId]
  );

  const sandboxOptions = useMemo(
    () =>
      availableSandboxes.length > 0
        ? availableSandboxes.map((s) => ({ value: s.id, label: s.name }))
        : [{ value: '', label: 'No active sandboxes', disabled: true }],
    [availableSandboxes]
  );

  const projectOptions = useMemo(
    () => hasProjects ? nestedProjects.map((p) => ({ value: p.id, label: p.name })) : [],
    [nestedProjects, hasProjects]
  );

  // Fetch sandboxes when selected project changes
  const fetchProjectSandboxes = useCallback(async (projId: string) => {
    if (!projId) {
      setProjectSandboxes([]);
      return;
    }
    setIsLoadingSandboxes(true);
    try {
      const list = await sandboxApi.listByProject(projId);
      setProjectSandboxes(list);
    } catch {
      setProjectSandboxes([]);
    } finally {
      setIsLoadingSandboxes(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !hasProjects) return;
    if (selectedProjectId) {
      fetchProjectSandboxes(selectedProjectId);
    }
  }, [isOpen, selectedProjectId, hasProjects, fetchProjectSandboxes]);

  // Auto-select first sandbox when list changes
  useEffect(() => {
    if (!isOpen) return;
    if (selectedSandboxId && availableSandboxes.some((s) => s.id === selectedSandboxId)) return;

    const preferredId = sandbox?.id || initialSandboxId;
    const nextId =
      preferredId && availableSandboxes.some((s) => s.id === preferredId)
        ? preferredId
        : availableSandboxes[0]?.id || '';
    setSelectedSandboxId(nextId);
  }, [isOpen, availableSandboxes, selectedSandboxId, sandbox?.id, initialSandboxId]);

  // Set initial project on open
  useEffect(() => {
    if (isOpen && hasProjects && !selectedProjectId) {
      setSelectedProjectId(projectId || nestedProjects[0]?.id || '');
    }
  }, [isOpen, hasProjects, selectedProjectId, projectId, nestedProjects]);

  // Fetch diff preview when sandbox selection changes
  useEffect(() => {
    if (!isOpen || !selectedSandboxId) {
      setDiffFiles([]);
      setSelectedFiles(new Set());
      setDiffError(null);
      return;
    }

    let cancelled = false;
    setIsLoadingDiff(true);
    setDiffError(null);

    pullRequestApi.getDiffPreview(selectedSandboxId)
      .then(preview => {
        if (cancelled) return;
        setDiffFiles(preview.files);
        setSelectedFiles(new Set(preview.files.map(f => f.filePath)));
      })
      .catch(err => {
        if (cancelled) return;
        setDiffError(err instanceof Error ? err.message : 'Failed to load diff');
        setDiffFiles([]);
        setSelectedFiles(new Set());
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDiff(false);
      });

    return () => { cancelled = true; };
  }, [isOpen, selectedSandboxId]);

  const toggleFile = (filePath: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedFiles.size === diffFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(diffFiles.map(f => f.filePath)));
    }
  };

  const handleProjectChange = (projId: string) => {
    setSelectedProjectId(projId);
    setSelectedSandboxId('');
  };

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
        selectedFiles: Array.from(selectedFiles),
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
    setError(null);
    setDiffFiles([]);
    setSelectedFiles(new Set());
    setDiffError(null);
    setSelectedProjectId(projectId || '');

    const preferredId = sandbox?.id || initialSandboxId;
    const nextId =
      preferredId && availableSandboxes.some((s) => s.id === preferredId)
        ? preferredId
        : availableSandboxes[0]?.id || '';
    setSelectedSandboxId(nextId);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Pull Request"
      description="Open a pull request from a sandbox into the dev branch."
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
            disabled={isLoading || !title.trim() || !selectedSandbox || selectedFiles.size === 0}
          >
            {isLoading ? 'Creating...' : 'Create Pull Request'}
          </Button>
        </>
      }
    >
      <form id="create-pr-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Project selector */}
        {!sandbox && hasProjects && (
          <Select
            id="pr-project"
            label="Project"
            value={selectedProjectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            options={projectOptions}
          />
        )}

        {/* Sandbox selector */}
        {!sandbox && (
          <div>
            {isLoadingSandboxes ? (
              <>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Sandbox</label>
                <div className="flex items-center gap-2 py-2 text-xs text-text-muted">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading sandboxes...
                </div>
              </>
            ) : (
              <Select
                id="pr-sandbox"
                label="Sandbox"
                value={selectedSandboxId}
                onChange={(e) => setSelectedSandboxId(e.target.value)}
                options={sandboxOptions}
                disabled={availableSandboxes.length === 0}
              />
            )}
            {!isLoadingSandboxes && availableSandboxes.length === 0 && (
              <p className="mt-1.5 text-xs text-text-muted">
                No active sandboxes in this project. Create one in the Explorer first.
              </p>
            )}
          </div>
        )}

        {/* Branch flow indicator */}
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border-default bg-dark-elevated/35 px-3 py-2 text-xs">
          <span className="inline-flex items-center gap-1.5 text-text-secondary">
            <Box className="h-3.5 w-3.5 text-accent-purple" />
            <span className="font-medium text-text-primary">
              {selectedSandbox?.name || 'Select sandbox'}
            </span>
          </span>
          <span className="text-text-muted">&rarr;</span>
          <span className="inline-flex items-center gap-1.5 text-text-secondary">
            <GitBranch className="h-3.5 w-3.5 text-status-info" />
            <span className="font-medium text-text-primary">dev</span>
          </span>
        </div>

        {/* File selection */}
        {selectedSandboxId && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-text-secondary">
                Changed Files
              </label>
              {diffFiles.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs text-brand-primary hover:underline"
                >
                  {selectedFiles.size === diffFiles.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {isLoadingDiff ? (
              <div className="flex items-center gap-2 rounded border border-border-default bg-dark-elevated/35 px-3 py-3 text-xs text-text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading changes...
              </div>
            ) : diffError ? (
              <div className="rounded border border-status-danger/30 bg-status-danger/10 px-3 py-2 text-xs text-status-danger">
                {diffError}
              </div>
            ) : diffFiles.length === 0 ? (
              <div className="rounded border border-border-default bg-dark-elevated/35 px-3 py-3 text-xs text-text-muted">
                No changes detected between sandbox and dev.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded border border-border-default bg-dark-elevated/35">
                {diffFiles.map(file => (
                  <label
                    key={file.filePath}
                    className="flex cursor-pointer items-center gap-2 border-b border-border-default/50 px-3 py-1.5 last:border-b-0 hover:bg-dark-elevated/60"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.filePath)}
                      onChange={() => toggleFile(file.filePath)}
                      className="h-3.5 w-3.5 shrink-0 rounded border-border-default accent-brand-primary"
                    />
                    <FileText
                      className={cn(
                        'h-3.5 w-3.5 shrink-0',
                        file.changeType === 'added' && 'text-status-success',
                        file.changeType === 'modified' && 'text-status-warning',
                        file.changeType === 'deleted' && 'text-status-danger',
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-text-primary">
                      {file.filePath}
                    </span>
                    <span className={cn(
                      'shrink-0 text-3xs font-medium',
                      file.changeType === 'added' && 'text-status-success',
                      file.changeType === 'modified' && 'text-status-warning',
                      file.changeType === 'deleted' && 'text-status-danger',
                    )}>
                      {file.changeType === 'added' ? 'A' : file.changeType === 'modified' ? 'M' : 'D'}
                    </span>
                    <span className="shrink-0 text-3xs text-text-muted">
                      {file.additions > 0 && <span className="text-status-success">+{file.additions}</span>}
                      {file.deletions > 0 && <span className="ml-1 text-status-danger">-{file.deletions}</span>}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {diffFiles.length > 0 && !isLoadingDiff && (
              <p className="mt-1 text-xs text-text-muted">
                {selectedFiles.size} of {diffFiles.length} file{diffFiles.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
        )}

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

        <div className="rounded-md border border-status-info/30 bg-status-info/10 px-3 py-2 text-xs">
          <div className="flex items-start gap-2">
            <GitPullRequest className="mt-0.5 h-4 w-4 shrink-0 text-status-info" />
            <div>
              <p className="font-medium text-status-info">What happens next?</p>
              <p className="mt-1 text-text-secondary">
                Team members can review this pull request and a senior member can merge changes
                into dev when it is approved.
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
