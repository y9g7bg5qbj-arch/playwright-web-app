import { useState, useEffect } from 'react';
import { GitBranch, Box, GitCompare } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { compareApi, type CompareEnvironment } from '@/api/sandbox';

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

  useEffect(() => {
    if (!isOpen) return;

    const fetchEnvironments = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const envs = await compareApi.getEnvironments(projectId);
        setEnvironments(envs);

        // Auto-select first environment that's different from current
        const defaultTarget = envs.find(e => e.id !== currentEnvironment);
        if (defaultTarget) {
          setSelectedTarget(defaultTarget.id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load environments');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEnvironments();
  }, [isOpen, projectId, currentEnvironment]);

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
      onCompare(currentEnvironment, selectedTarget);
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
          currentEnvironment === 'master' ? 'text-status-success border-status-success/30 bg-status-success/10' :
          currentEnvironment === 'dev' ? 'text-status-info border-status-info/30 bg-status-info/10' :
          'text-accent-purple border-accent-purple/30 bg-accent-purple/10'
        }`}>
          {currentEnvironment === 'master' || currentEnvironment === 'dev' ? (
            <GitBranch className="w-4 h-4" />
          ) : (
            <Box className="w-4 h-4" />
          )}
          {environments.find(e => e.id === currentEnvironment)?.name || currentEnvironment}
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
        ) : (
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {environments
              .filter(env => env.id !== currentEnvironment)
              .map(env => (
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
