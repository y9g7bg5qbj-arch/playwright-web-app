/**
 * ExecutionSettingsModal - Modal for configuring execution settings
 * Contains GitHub connection, local/docker/GitHub Actions config options
 */
import React, { useState, useEffect } from 'react';
import {
  X,
  Settings2,
  Github,
  Monitor,
  Cloud,
  Check,
  AlertCircle,
  RefreshCw,
  LogOut,
  ChevronDown,
  ChevronUp,
  FolderGit2,
  Key,
  ExternalLink,
} from 'lucide-react';
import { useGitHubStore } from '@/store/useGitHubStore';
import type {
  GitHubActionsConfig,
  LocalExecutionConfig,
  RunnerType,
} from '@playwright-web-app/shared';

interface ExecutionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Local config
  localConfig?: LocalExecutionConfig;
  onLocalConfigChange?: (config: LocalExecutionConfig) => void;
  // GitHub Actions config
  githubActionsConfig?: GitHubActionsConfig;
  onGitHubActionsConfigChange?: (config: GitHubActionsConfig) => void;
}

type SettingsTab = 'github' | 'local' | 'github-actions';

export const ExecutionSettingsModal: React.FC<ExecutionSettingsModalProps> = ({
  isOpen,
  onClose,
  localConfig,
  onLocalConfigChange,
  githubActionsConfig,
  onGitHubActionsConfigChange,
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

  const [activeTab, setActiveTab] = useState<SettingsTab>('github');
  const [token, setToken] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [showRepos, setShowRepos] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadIntegration();
    }
  }, [isOpen, loadIntegration]);

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
    }
  };

  const handleDisconnect = async () => {
    if (confirm('Disconnect from GitHub? You will need to reconnect to use GitHub Actions.')) {
      await disconnect();
    }
  };

  const defaultGitHubConfig: GitHubActionsConfig = {
    runnerType: 'cloud-hosted',
    shardCount: 1,
    workersPerShard: 1,
  };

  const currentGitHubConfig = githubActionsConfig || defaultGitHubConfig;
  const currentLocalConfig = localConfig || { workers: 1 };

  if (!isOpen) return null;

  const tabs = [
    { id: 'github' as SettingsTab, label: 'GitHub Connection', icon: Github },
    { id: 'local' as SettingsTab, label: 'Local Execution', icon: Monitor },
    { id: 'github-actions' as SettingsTab, label: 'GitHub Actions', icon: Cloud },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-lg border border-slate-700 shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold text-slate-200">Execution Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400 -mb-[1px]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* GitHub Connection Tab */}
          {activeTab === 'github' && (
            <div className="space-y-4">
              {integrationLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
                </div>
              ) : isConnected() && integration ? (
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
                    <label className="block text-sm font-medium text-slate-300">Repository</label>
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
                      <label className="block text-sm font-medium text-slate-300">Branch</label>
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
                  <div className="flex items-center justify-between pt-4 border-t border-slate-700">
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
                  <p className="text-sm text-slate-400">
                    Connect your GitHub account to run tests with GitHub Actions.
                  </p>

                  {/* Token input */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-slate-300">
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
                </>
              )}
            </div>
          )}

          {/* Local Execution Tab */}
          {activeTab === 'local' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                Configure settings for running tests locally on your machine.
              </p>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Workers</label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={currentLocalConfig.workers}
                  onChange={(e) =>
                    onLocalConfigChange?.({
                      workers: Math.max(1, Math.min(8, parseInt(e.target.value) || 1)),
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-slate-500">
                  Number of parallel browser processes (1-8). More workers = faster execution but higher resource usage.
                </p>
              </div>
            </div>
          )}

          {/* GitHub Actions Tab */}
          {activeTab === 'github-actions' && (
            <div className="space-y-4">
              {!isConnected() && (
                <div className="p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
                  <p className="text-sm text-yellow-300">
                    Connect to GitHub first to configure GitHub Actions settings.
                  </p>
                  <button
                    onClick={() => setActiveTab('github')}
                    className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                  >
                    Go to GitHub Connection →
                  </button>
                </div>
              )}

              {/* Runner Type */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Runner Type</label>
                <div className="flex gap-2">
                  {(['cloud-hosted', 'self-hosted'] as RunnerType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        onGitHubActionsConfigChange?.({ ...currentGitHubConfig, runnerType: type })
                      }
                      className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                        currentGitHubConfig.runnerType === type
                          ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {type === 'cloud-hosted' ? 'Cloud-hosted' : 'Self-hosted'}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  {currentGitHubConfig.runnerType === 'cloud-hosted'
                    ? 'Free tier: 2000 min/month. ~2min cold start per job.'
                    : 'Use your own runners for faster starts and unlimited minutes.'}
                </p>
              </div>

              {/* Parallelism */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">Parallel Jobs (Shards)</label>
                  <input
                    type="number"
                    min={1}
                    max={currentGitHubConfig.runnerType === 'cloud-hosted' ? 20 : 100}
                    value={currentGitHubConfig.shardCount}
                    onChange={(e) =>
                      onGitHubActionsConfigChange?.({
                        ...currentGitHubConfig,
                        shardCount: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">Workers per Job</label>
                  <input
                    type="number"
                    min={1}
                    max={4}
                    value={currentGitHubConfig.workersPerShard}
                    onChange={(e) =>
                      onGitHubActionsConfigChange?.({
                        ...currentGitHubConfig,
                        workersPerShard: Math.max(1, Math.min(4, parseInt(e.target.value) || 1)),
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                <p className="text-xs text-slate-400">
                  Total parallelism:{' '}
                  <span className="text-slate-200 font-medium">
                    {currentGitHubConfig.shardCount * currentGitHubConfig.workersPerShard} browser instances
                  </span>
                </p>
              </div>

              {/* Advanced options */}
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-slate-400 hover:text-slate-300"
              >
                {showAdvanced ? '▼ Hide' : '▶ Show'} advanced options
              </button>

              {showAdvanced && (
                <div className="space-y-4 pt-2 border-t border-slate-700">
                  {currentGitHubConfig.runnerType === 'self-hosted' && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-300">Runner Labels</label>
                      <input
                        type="text"
                        value={currentGitHubConfig.runnerLabels?.join(', ') || 'self-hosted, linux, x64'}
                        onChange={(e) =>
                          onGitHubActionsConfigChange?.({
                            ...currentGitHubConfig,
                            runnerLabels: e.target.value.split(',').map((l) => l.trim()).filter(Boolean),
                          })
                        }
                        placeholder="self-hosted, linux, x64"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                      <p className="text-xs text-slate-500">
                        Comma-separated labels to select specific self-hosted runners.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-300">Timeout (minutes)</label>
                      <input
                        type="number"
                        min={1}
                        max={360}
                        value={currentGitHubConfig.timeoutMinutes || 60}
                        onChange={(e) =>
                          onGitHubActionsConfigChange?.({
                            ...currentGitHubConfig,
                            timeoutMinutes: Math.max(1, parseInt(e.target.value) || 60),
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-300">Continue on Error</label>
                      <label className="flex items-center gap-2 mt-2">
                        <input
                          type="checkbox"
                          checked={currentGitHubConfig.continueOnError || false}
                          onChange={(e) =>
                            onGitHubActionsConfigChange?.({
                              ...currentGitHubConfig,
                              continueOnError: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600"
                        />
                        <span className="text-sm text-slate-400">Run all shards even if one fails</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-4 py-3 border-t border-slate-700 bg-slate-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExecutionSettingsModal;
