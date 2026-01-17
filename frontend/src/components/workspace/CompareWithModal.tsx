import { useState, useEffect } from 'react';
import { GitBranch, Box, X, GitCompare } from 'lucide-react';
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

  if (!isOpen) return null;

  const getEnvironmentIcon = (env: CompareEnvironment) => {
    if (env.type === 'branch') {
      return <GitBranch className="w-4 h-4" />;
    }
    return <Box className="w-4 h-4" />;
  };

  const getEnvironmentColor = (env: CompareEnvironment) => {
    if (env.id === 'master') return 'text-green-400 border-green-500/30 bg-green-500/10';
    if (env.id === 'dev') return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
    return 'text-purple-400 border-purple-500/30 bg-purple-500/10';
  };

  const handleCompare = () => {
    if (selectedTarget) {
      onCompare(currentEnvironment, selectedTarget);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d]">
          <div className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-[#58a6ff]" />
            <h2 className="text-lg font-semibold text-white">Compare With</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#8b949e] hover:text-white hover:bg-[#21262d] rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-4">
          {/* File path */}
          <div className="mb-4">
            <label className="block text-xs text-[#8b949e] uppercase tracking-wide mb-1">
              File
            </label>
            <div className="px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-sm font-mono text-[#c9d1d9] truncate">
              {filePath}
            </div>
          </div>

          {/* Current environment */}
          <div className="mb-4">
            <label className="block text-xs text-[#8b949e] uppercase tracking-wide mb-1">
              Current (Source)
            </label>
            <div className={`px-3 py-2 border rounded text-sm flex items-center gap-2 ${
              currentEnvironment === 'master' ? 'text-green-400 border-green-500/30 bg-green-500/10' :
              currentEnvironment === 'dev' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' :
              'text-purple-400 border-purple-500/30 bg-purple-500/10'
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
            <label className="block text-xs text-[#8b949e] uppercase tracking-wide mb-2">
              Compare With (Target)
            </label>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#58a6ff]"></div>
              </div>
            ) : error ? (
              <div className="text-center py-4 text-[#f85149]">{error}</div>
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
                          : 'border-[#30363d] hover:border-[#484f58] text-[#c9d1d9]'
                      }`}
                    >
                      {getEnvironmentIcon(env)}
                      <div className="flex-1 text-left">
                        <div className="font-medium">{env.name}</div>
                        {env.owner && (
                          <div className="text-xs text-[#8b949e]">by {env.owner}</div>
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
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[#30363d]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#c9d1d9] hover:text-white hover:bg-[#21262d] rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCompare}
            disabled={!selectedTarget}
            className="px-4 py-2 text-sm font-medium bg-[#238636] hover:bg-[#2ea043] text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <GitCompare className="w-4 h-4" />
            Compare
          </button>
        </div>
      </div>
    </div>
  );
}

export default CompareWithModal;
