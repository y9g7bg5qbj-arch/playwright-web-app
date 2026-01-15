import { useEffect } from 'react';
import { Monitor, Github, CheckCircle2, AlertCircle } from 'lucide-react';
import type { RunConfiguration } from '@/store/runConfigStore';
import { useEnvironmentStore } from '@/store/environmentStore';
import { useGitHubStore } from '@/store/useGitHubStore';

interface GeneralTabProps {
  config: RunConfiguration;
  onChange: <K extends keyof RunConfiguration>(field: K, value: RunConfiguration[K]) => void;
}

export function GeneralTab({ config, onChange }: GeneralTabProps) {
  const { environments } = useEnvironmentStore();
  const {
    isConnected,
    integration,
    selectedRepository,
    selectedBranch,
    loadIntegration
  } = useGitHubStore();

  // Load GitHub integration on mount
  useEffect(() => {
    loadIntegration();
  }, [loadIntegration]);

  // Auto-populate GitHub settings when switching to github target if connected
  useEffect(() => {
    if (config.target === 'github' && isConnected() && selectedRepository) {
      // Only auto-populate if the fields are empty (not already set by user)
      if (!config.github?.repository) {
        onChange('github', {
          ...config.github,
          repository: selectedRepository.fullName,
          branch: selectedBranch || selectedRepository.defaultBranch,
          workflowFile: config.github?.workflowFile || '.github/workflows/vero-tests.yml',
        });
      }
    }
  }, [config.target, isConnected, selectedRepository, selectedBranch]);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Name */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[#c9d1d9]">
          Configuration Name
        </label>
        <input
          type="text"
          value={config.name}
          onChange={(e) => onChange('name', e.target.value)}
          className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 placeholder-[#6e7681]"
          placeholder="My Configuration"
        />
      </div>

      {/* Environment Selection (Postman-style) */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[#c9d1d9]">
          Environment
        </label>
        <select
          value={config.environmentId || ''}
          onChange={(e) => onChange('environmentId', e.target.value || undefined)}
          className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
        >
          <option value="">Use active environment</option>
          {environments.map((env) => (
            <option key={env.id} value={env.id}>
              {env.name} {env.isActive && '(Active)'}
            </option>
          ))}
        </select>
        <p className="text-xs text-[#6e7681]">
          Select an environment to use for this configuration. Variables like{' '}
          <code className="px-1 py-0.5 bg-[#21262d] rounded text-[#58a6ff]">{'{{baseUrl}}'}</code>{' '}
          will be resolved from this environment.
        </p>
        {environments.length === 0 && (
          <p className="text-xs text-[#f0883e]">
            No environments defined. Click the environment dropdown in the header to create one.
          </p>
        )}
      </div>

      {/* Target Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[#c9d1d9]">
          Execution Target
        </label>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => onChange('target', 'local')}
            className={`flex-1 flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
              config.target === 'local'
                ? 'border-sky-500 bg-sky-500/10'
                : 'border-[#30363d] hover:border-[#484f58]'
            }`}
          >
            <Monitor className={`w-6 h-6 ${config.target === 'local' ? 'text-sky-500' : 'text-[#8b949e]'}`} />
            <div className="text-left">
              <div className={`font-medium ${config.target === 'local' ? 'text-white' : 'text-[#8b949e]'}`}>
                Local
              </div>
              <div className="text-xs text-[#6e7681]">
                Run tests on your machine
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onChange('target', 'github')}
            className={`flex-1 flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
              config.target === 'github'
                ? 'border-sky-500 bg-sky-500/10'
                : 'border-[#30363d] hover:border-[#484f58]'
            }`}
          >
            <Github className={`w-6 h-6 ${config.target === 'github' ? 'text-sky-500' : 'text-[#8b949e]'}`} />
            <div className="text-left">
              <div className={`font-medium ${config.target === 'github' ? 'text-white' : 'text-[#8b949e]'}`}>
                GitHub Actions
              </div>
              <div className="text-xs text-[#6e7681]">
                Run tests in CI/CD pipeline
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* GitHub-specific settings */}
      {config.target === 'github' && (
        <div className="space-y-4 p-4 bg-[#0d1117] rounded-lg border border-[#30363d]">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-[#c9d1d9] flex items-center gap-2">
              <Github className="w-4 h-4" />
              GitHub Actions Settings
            </h4>
            {/* Connection status indicator */}
            {isConnected() ? (
              <div className="flex items-center gap-2 text-xs text-[#3fb950]">
                <CheckCircle2 className="w-4 h-4" />
                Connected as {integration?.login}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-[#f0883e]">
                <AlertCircle className="w-4 h-4" />
                Not connected
              </div>
            )}
          </div>

          {/* Auto-fill from connected repo button */}
          {isConnected() && selectedRepository && (
            <button
              type="button"
              onClick={() => onChange('github', {
                ...config.github,
                repository: selectedRepository.fullName,
                branch: selectedBranch || selectedRepository.defaultBranch,
                workflowFile: config.github?.workflowFile || '.github/workflows/vero-tests.yml',
              })}
              className="w-full py-2 px-3 bg-[#238636] hover:bg-[#2ea043] text-white text-sm rounded flex items-center justify-center gap-2 transition-colors"
            >
              <Github className="w-4 h-4" />
              Use connected repository: {selectedRepository.fullName}
            </button>
          )}

          {/* Not connected message */}
          {!isConnected() && (
            <div className="p-3 bg-[#161b22] border border-[#f0883e]/30 rounded text-xs text-[#8b949e]">
              <p className="mb-1">
                Connect your GitHub account in <strong>Settings &gt; GitHub</strong> to auto-populate repository details.
              </p>
              <p className="text-[#6e7681]">
                Or enter the repository details manually below.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs text-[#8b949e]">Repository</label>
              <input
                type="text"
                value={config.github?.repository || ''}
                onChange={(e) => onChange('github', { ...config.github, repository: e.target.value })}
                className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                placeholder="owner/repo"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs text-[#8b949e]">Branch</label>
              <input
                type="text"
                value={config.github?.branch || ''}
                onChange={(e) => onChange('github', { ...config.github, branch: e.target.value })}
                className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                placeholder="main"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs text-[#8b949e]">Workflow File (optional)</label>
            <input
              type="text"
              value={config.github?.workflowFile || ''}
              onChange={(e) => onChange('github', { ...config.github, workflowFile: e.target.value })}
              className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              placeholder=".github/workflows/test.yml"
            />
          </div>

          {/* Show current config summary */}
          {config.github?.repository && (
            <div className="pt-2 border-t border-[#30363d]">
              <p className="text-xs text-[#6e7681]">
                Tests will run on <span className="text-[#58a6ff]">{config.github.repository}</span>
                {config.github.branch && <> branch <span className="text-[#58a6ff]">{config.github.branch}</span></>}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Browser Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[#c9d1d9]">
          Browser
        </label>
        <div className="flex gap-2">
          {(['chromium', 'firefox', 'webkit'] as const).map((browser) => (
            <button
              key={browser}
              type="button"
              onClick={() => onChange('browser', browser)}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                config.browser === browser
                  ? 'bg-sky-500 text-white'
                  : 'bg-[#21262d] text-[#8b949e] hover:text-white hover:bg-[#30363d]'
              }`}
            >
              {browser.charAt(0).toUpperCase() + browser.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Base URL */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[#c9d1d9]">
          Base URL
        </label>
        <input
          type="text"
          value={config.baseURL || ''}
          onChange={(e) => onChange('baseURL', e.target.value)}
          className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 placeholder-[#6e7681]"
          placeholder="http://localhost:3000"
        />
        <p className="text-xs text-[#6e7681]">
          Base URL used for all relative navigation in tests
        </p>
      </div>
    </div>
  );
}
