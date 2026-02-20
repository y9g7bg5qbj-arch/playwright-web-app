import { useState, useEffect, useMemo } from 'react';
import { GitBranch, Box, GitCompare } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { compareApi, sandboxApi, type CompareEnvironment, type Sandbox } from '@/api/sandbox';
import { useSandboxStore } from '@/store/sandboxStore';

export interface CompareWithModalProps {
  isOpen: boolean;
  projectId: string;
  filePath: string;
  currentEnvironment?: string;
  onClose: () => void;
  onCompare: (source: string, target: string) => void;
}

export function CompareWithModal({
  isOpen,
  projectId,
  filePath,
  currentEnvironment = 'dev',
  onClose,
  onCompare,
}: CompareWithModalProps) {
  const [environments, setEnvironments] = useState<CompareEnvironment[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectSandboxes, setProjectSandboxes] = useState<Sandbox[]>([]);
  const sandboxes = useSandboxStore(s => s.sandboxes);

  const mergedEnvironments = useMemo<CompareEnvironment[]>(() => {
    const envMap = new Map<string, CompareEnvironment>();

    // Start with backend-provided environments for this project.
    for (const env of environments) {
      envMap.set(env.id, env);
    }

    // Ensure branch entries are always present.
    if (!envMap.has('master')) {
      envMap.set('master', {
        id: 'master',
        name: 'Production',
        type: 'branch',
        branch: 'master',
      });
    }
    if (!envMap.has('dev')) {
      envMap.set('dev', {
        id: 'dev',
        name: 'Development',
        type: 'branch',
        branch: 'dev',
      });
    }

    // Add active sandbox options from project fetch + store fallback.
    const sandboxSources = [...projectSandboxes, ...sandboxes];
    for (const sandbox of sandboxSources) {
      if (sandbox.status !== 'active') continue;
      const envId = `sandbox:${sandbox.id}`;
      if (!envMap.has(envId)) {
        envMap.set(envId, {
          id: envId,
          name: sandbox.name,
          type: 'sandbox',
          branch: sandbox.folderPath,
          owner: sandbox.ownerName || sandbox.ownerEmail || sandbox.ownerId,
        });
      }
    }

    const values = Array.from(envMap.values());
    return values.sort((a, b) => {
      const rank = (env: CompareEnvironment) => {
        if (env.id === 'master') return 0;
        if (env.id === 'dev') return 1;
        return 2;
      };
      const rankDiff = rank(a) - rank(b);
      if (rankDiff !== 0) return rankDiff;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  }, [environments, projectSandboxes, sandboxes]);

  const resolvedSourceEnvironment = useMemo(() => {
    if (mergedEnvironments.some(env => env.id === currentEnvironment)) {
      return currentEnvironment;
    }

    const sandboxNameMatch = currentEnvironment.match(/^sandbox-name:(.+)$/);
    if (sandboxNameMatch) {
      const targetName = sandboxNameMatch[1].toLowerCase();
      const matched = mergedEnvironments.find(env =>
        env.type === 'sandbox' && env.name.toLowerCase() === targetName
      );
      if (matched) {
        return matched.id;
      }
    }

    return currentEnvironment;
  }, [currentEnvironment, mergedEnvironments]);

  const targetOptions = useMemo(
    () => mergedEnvironments.filter(env => env.id !== resolvedSourceEnvironment),
    [mergedEnvironments, resolvedSourceEnvironment]
  );

  useEffect(() => {
    if (!isOpen) return;

    const fetchEnvironments = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [envs, projectSandboxes] = await Promise.all([
          compareApi.getEnvironments(projectId),
          sandboxApi.listByProject(projectId).catch(() => [] as Sandbox[]),
        ]);
        setEnvironments(envs);
        setProjectSandboxes(projectSandboxes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load environments');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEnvironments();
  }, [isOpen, projectId, currentEnvironment]);

  useEffect(() => {
    if (!isOpen) return;

    setSelectedTarget((prev) => {
      if (prev && targetOptions.some(env => env.id === prev)) {
        return prev;
      }
      return targetOptions[0]?.id || '';
    });
  }, [isOpen, targetOptions]);

  const getEnvironmentIcon = (env: CompareEnvironment) => {
    if (env.type === 'branch') {
      return <GitBranch className="w-4 h-4" />;
    }
    return <Box className="w-4 h-4" />;
  };

  const getEnvironmentColor = (env: CompareEnvironment) => {
    if (env.id === 'master') return 'text-status-success border-status-success/30 bg-status-success/10';
    if (env.id === 'dev') return 'text-status-info border-status-info/30 bg-status-info/10';
    return 'text-accent-purple border-accent-purple/30 bg-accent-purple/10';
  };

  const handleCompare = () => {
    if (selectedTarget) {
      onCompare(resolvedSourceEnvironment, selectedTarget);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Compare With"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="success"
            leftIcon={<GitCompare className="w-4 h-4" />}
            disabled={!selectedTarget}
            onClick={handleCompare}
          >
            Compare
          </Button>
        </>
      }
    >
      {/* File path */}
      <div className="mb-4">
        <label className="block text-xs text-text-secondary uppercase tracking-wide mb-1">
          File
        </label>
        <div className="px-3 py-2 bg-dark-canvas border border-border-default rounded text-sm font-mono text-text-primary truncate">
          {filePath}
        </div>
      </div>

      {/* Current environment */}
      <div className="mb-4">
        <label className="block text-xs text-text-secondary uppercase tracking-wide mb-1">
          Current (Source)
        </label>
        <div className={`px-3 py-2 border rounded text-sm flex items-center gap-2 ${
          resolvedSourceEnvironment === 'master' ? 'text-status-success border-status-success/30 bg-status-success/10' :
          resolvedSourceEnvironment === 'dev' ? 'text-status-info border-status-info/30 bg-status-info/10' :
          'text-accent-purple border-accent-purple/30 bg-accent-purple/10'
        }`}>
          {resolvedSourceEnvironment === 'master' || resolvedSourceEnvironment === 'dev' ? (
            <GitBranch className="w-4 h-4" />
          ) : (
            <Box className="w-4 h-4" />
          )}
          {mergedEnvironments.find(e => e.id === resolvedSourceEnvironment)?.name || resolvedSourceEnvironment}
        </div>
      </div>

      {/* Target selection */}
      <div className="mb-4">
        <label className="block text-xs text-text-secondary uppercase tracking-wide mb-2">
          Compare With (Target)
        </label>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-secondary"></div>
          </div>
        ) : error ? (
          <div className="text-center py-4 text-status-danger">{error}</div>
        ) : targetOptions.length === 0 ? (
          <div className="text-center py-4 text-text-secondary">
            No other environments available for comparison.
          </div>
        ) : (
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {targetOptions.map(env => (
                <button
                  key={env.id}
                  onClick={() => setSelectedTarget(env.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded border transition-colors ${
                    selectedTarget === env.id
                      ? getEnvironmentColor(env)
                      : 'border-border-default hover:border-border-emphasis text-text-primary'
                  }`}
                >
                  {getEnvironmentIcon(env)}
                  <div className="flex-1 text-left">
                    <div className="font-medium">{env.name}</div>
                    {env.owner && (
                      <div className="text-xs text-text-secondary">by {env.owner}</div>
                    )}
                  </div>
                  {selectedTarget === env.id && (
                    <span className="text-xs">Selected</span>
                  )}
                </button>
              ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default CompareWithModal;
