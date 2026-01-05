/**
 * GitHubConnectionPanel - Panel for connecting and managing GitHub integration
 */
import React, { useState, useEffect } from 'react';
import {
  Github,
  Check,
  AlertCircle,
  ExternalLink,
  Key,
  RefreshCw,
  LogOut,
  ChevronDown,
  ChevronUp,
  FolderGit2,
} from 'lucide-react';
import { useGitHubStore } from '@/store/useGitHubStore';

interface GitHubConnectionPanelProps {
  onClose?: () => void;
  onConnected?: () => void;
}

export const GitHubConnectionPanel: React.FC<GitHubConnectionPanelProps> = ({
  onClose,
  onConnected,
}) => {
  const {
    integration,
    integrationLoading,
    integrationError,
    repositories,
    repositoriesLoading,
    selectedRepository,
    branches,
    branchesLoading,
    selectedBranch,
    loadIntegration,
    connectWithToken,
    disconnect,
    validateToken,
    loadRepositories,
    selectRepository,
    selectBranch,
    isConnected,
  } = useGitHubStore();

  const [token, setToken] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [showRepos, setShowRepos] = useState(false);

  useEffect(() => {
    loadIntegration();
  }, [loadIntegration]);

  const handleValidateAndConnect = async () => {
    if (!token.trim()) {
      setTokenError('Please enter a Personal Access Token');
      return;
    }

    setValidating(true);
    setTokenError(null);

    const result = await validateToken(token);
    if (!result.valid) {
      setTokenError(result.error || 'Invalid token');
      setValidating(false);
      return;
    }

    const success = await connectWithToken(token);
    setValidating(false);

    if (success) {
      setToken('');
      onConnected?.();
    }
  };

  const handleDisconnect = async () => {
    if (confirm('Disconnect from GitHub? You will need to reconnect to use GitHub Actions.')) {
      await disconnect();
    }
  };

  if (integrationLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Github className="w-5 h-5 text-slate-300" />
          <h3 className="font-medium text-slate-200">GitHub Integration</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
          >
            &times;
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {isConnected() && integration ? (
          <>
            {/* Connected state */}
            <div className="flex items-center gap-3 p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
              <Check className="w-5 h-5 text-green-400" />
              <div className="flex-1">
                <p className="text-sm text-green-300">Connected to GitHub</p>
                <p className="text-xs text-green-400/70">
                  Signed in as <strong>{integration.login}</strong>
                </p>
              </div>
              {integration.avatarUrl && (
                <img
                  src={integration.avatarUrl}
                  alt={integration.login}
                  className="w-8 h-8 rounded-full border border-green-600/50"
                />
              )}
            </div>

            {/* Repository selection */}
            <div className="space-y-2">
              <button
                onClick={() => setShowRepos(!showRepos)}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:border-slate-600"
              >
                <div className="flex items-center gap-2">
                  <FolderGit2 className="w-4 h-4 text-slate-400" />
                  <span>
                    {selectedRepository
                      ? selectedRepository.fullName
                      : 'Select a repository...'}
                  </span>
                </div>
                {showRepos ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {showRepos && (
                <div className="max-h-48 overflow-y-auto border border-slate-700 rounded-lg bg-slate-800">
                  {repositoriesLoading ? (
                    <div className="p-3 flex items-center justify-center">
                      <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />
                    </div>
                  ) : repositories.length === 0 ? (
                    <div className="p-3 text-center text-sm text-slate-500">
                      No repositories found
                    </div>
                  ) : (
                    repositories.map((repo) => (
                      <button
                        key={repo.id}
                        onClick={() => {
                          selectRepository(repo);
                          setShowRepos(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-700 transition-colors ${
                          selectedRepository?.id === repo.id
                            ? 'bg-blue-600/20 text-blue-300'
                            : 'text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{repo.fullName}</span>
                          {repo.private && (
                            <span className="text-xs text-slate-500 px-1.5 py-0.5 bg-slate-700 rounded">
                              Private
                            </span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Branch selection */}
            {selectedRepository && (
              <div className="space-y-2">
                <label className="block text-sm text-slate-400">Branch</label>
                <select
                  value={selectedBranch || ''}
                  onChange={(e) => selectBranch(e.target.value)}
                  disabled={branchesLoading}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                >
                  {branchesLoading ? (
                    <option>Loading...</option>
                  ) : (
                    branches.map((branch) => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-700">
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
              <button
                onClick={loadRepositories}
                disabled={repositoriesLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${repositoriesLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Not connected state */}
            <div className="space-y-3">
              <p className="text-sm text-slate-400">
                Connect your GitHub account to run tests with GitHub Actions.
              </p>

              {/* Token input */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm text-slate-300">
                  <Key className="w-4 h-4" />
                  Personal Access Token
                </label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    setTokenError(null);
                  }}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                {tokenError && (
                  <div className="flex items-center gap-1.5 text-sm text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    {tokenError}
                  </div>
                )}
              </div>

              {/* Help text */}
              <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                <p className="text-xs text-slate-400 mb-2">
                  Create a Personal Access Token with these scopes:
                </p>
                <ul className="text-xs text-slate-500 space-y-1 ml-4 list-disc">
                  <li><code className="text-slate-400">repo</code> - Full repository access</li>
                  <li><code className="text-slate-400">workflow</code> - Update GitHub Action workflows</li>
                </ul>
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo,workflow&description=Vero%20IDE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-blue-400 hover:text-blue-300"
                >
                  Create token on GitHub
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Connect button */}
              <button
                onClick={handleValidateAndConnect}
                disabled={validating || !token.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {validating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Github className="w-4 h-4" />
                    Connect GitHub
                  </>
                )}
              </button>

              {integrationError && (
                <div className="flex items-center gap-1.5 text-sm text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  {integrationError}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GitHubConnectionPanel;
