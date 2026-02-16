import { useEffect, useState } from 'react';
import { Monitor, Github, CheckCircle2, AlertCircle, Globe, Rocket, Eye, EyeOff, Loader2, LogOut, ExternalLink } from 'lucide-react';
import type { RunConfiguration } from '@/store/runConfigStore';
import { useEnvironmentStore } from '@/store/environmentStore';
import { useGitHubStore } from '@/store/useGitHubStore';
import { runConfigTheme, cardSelectClass, chipClass, cx } from './theme';

interface GeneralTabProps {
  config: RunConfiguration;
  onChange: <K extends keyof RunConfiguration>(field: K, value: RunConfiguration[K]) => void;
}

export function GeneralTab({ config, onChange }: GeneralTabProps) {
  const { environments, setManagerOpen } = useEnvironmentStore();
  const {
    isConnected,
    integration,
    integrationLoading,
    repositories,
    selectedRepository,
    selectedBranch,
    branches,
    loadIntegration,
    connectWithToken,
    disconnect,
    selectRepository,
  } = useGitHubStore();

  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    loadIntegration();
  }, [loadIntegration]);

  useEffect(() => {
    if (config.target !== 'github-actions' || !isConnected() || !selectedRepository) return;

    if (config.github?.repository) return;

    onChange('github', {
      ...config.github,
      repository: selectedRepository.fullName,
      branch: selectedBranch || selectedRepository.defaultBranch,
      workflowFile: config.github?.workflowFile || '.github/workflows/vero-tests.yml',
    });
  }, [config.target, isConnected, selectedRepository, selectedBranch]);

  const handleConnect = async () => {
    if (!tokenInput.trim()) return;
    setIsConnecting(true);
    setConnectError(null);
    try {
      const success = await connectWithToken(tokenInput.trim());
      if (success) {
        setTokenInput('');
        setShowToken(false);
      } else {
        setConnectError('Failed to connect. Check that your token is valid and has repo + workflow scopes.');
      }
    } catch {
      setConnectError('Connection failed. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  const handleSelectRepo = (fullName: string) => {
    const repo = repositories.find((r) => r.fullName === fullName);
    if (repo) {
      selectRepository(repo);
      onChange('github', {
        ...config.github,
        repository: repo.fullName,
        branch: repo.defaultBranch,
        workflowFile: config.github?.workflowFile || '.github/workflows/vero-tests.yml',
      });
    }
  };

  const handleSelectBranch = (branch: string) => {
    onChange('github', {
      ...config.github,
      branch,
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className={runConfigTheme.section}>
        <div className="mb-2 flex items-center gap-2">
          <Rocket className="h-4 w-4 text-brand-secondary" />
          <label className={runConfigTheme.label}>Configuration Name</label>
        </div>
        <input
          type="text"
          value={config.name}
          onChange={(event) => onChange('name', event.target.value)}
          className={runConfigTheme.input}
          placeholder="Nightly regression - chrome"
        />
      </section>

      <section className={runConfigTheme.section}>
        <div className="mb-2 flex items-center gap-2">
          <Globe className="h-4 w-4 text-brand-secondary" />
          <label className={runConfigTheme.label}>Environment</label>
        </div>
        <select
          value={config.environmentId || ''}
          onChange={(event) => onChange('environmentId', event.target.value || undefined)}
          className={runConfigTheme.select}
        >
          <option value="">Use active environment</option>
          {environments.map((environment) => (
            <option key={environment.id} value={environment.id}>
              {environment.name} {environment.isActive && '(Active)'}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-text-muted">
          Variables like{' '}
          <code className="rounded bg-dark-elevated px-1 py-0.5 font-mono text-brand-secondary">{'{{baseUrl}}'}</code>{' '}
          resolve from this environment.
        </p>
        <button
          type="button"
          onClick={() => setManagerOpen(true)}
          className="mt-2 inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-brand-secondary transition-colors hover:bg-white/[0.06] hover:text-brand-hover"
        >
          Manage Environments...
        </button>
        {environments.length === 0 && (
          <p className="mt-1 text-xs text-status-warning">
            No environments found. Use &quot;Manage Environments...&quot; to create one.
          </p>
        )}
      </section>

      <section className={runConfigTheme.section}>
        <p className={runConfigTheme.label}>Execution Target</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => onChange('target', 'local')}
            className={cardSelectClass(config.target === 'local')}
          >
            <div className="flex items-center gap-3">
              <Monitor className={cx('h-5 w-5', config.target === 'local' ? 'text-brand-secondary' : 'text-text-muted')} />
              <div>
                <p className="text-sm font-semibold text-text-primary">Local Runtime</p>
                <p className="text-xs text-text-secondary">Run Playwright directly from your machine.</p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onChange('target', 'github-actions')}
            className={cardSelectClass(config.target === 'github-actions')}
          >
            <div className="flex items-center gap-3">
              <Github className={cx('h-5 w-5', config.target === 'github-actions' ? 'text-brand-secondary' : 'text-text-muted')} />
              <div>
                <p className="text-sm font-semibold text-text-primary">GitHub Actions</p>
                <p className="text-xs text-text-secondary">Run in CI with artifacts and workflow history.</p>
              </div>
            </div>
          </button>
        </div>
      </section>

      {config.target === 'github-actions' && (
        <section className={runConfigTheme.section}>
          <div className="mb-3 flex items-center justify-between">
            <p className={runConfigTheme.label}>GitHub Connection</p>
            {integrationLoading ? (
              <div className="inline-flex items-center gap-1 text-xs text-text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Checking...
              </div>
            ) : isConnected() ? (
              <div className="inline-flex items-center gap-1.5 text-xs text-status-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Connected as {integration?.login}
              </div>
            ) : (
              <div className="inline-flex items-center gap-1 text-xs text-status-warning">
                <AlertCircle className="h-3.5 w-3.5" />
                Not connected
              </div>
            )}
          </div>

          {!isConnected() && !integrationLoading && (
            <div className="mb-4 space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={tokenInput}
                    onChange={(e) => { setTokenInput(e.target.value); setConnectError(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleConnect(); }}
                    className={cx(runConfigTheme.input, 'pr-9 font-mono')}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    disabled={isConnecting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                    tabIndex={-1}
                  >
                    {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={!tokenInput.trim() || isConnecting}
                  className={cx(
                    'inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-medium transition-colors',
                    !tokenInput.trim() || isConnecting
                      ? 'cursor-not-allowed border border-border-default bg-dark-elevated text-text-muted'
                      : 'bg-brand-primary text-white hover:bg-brand-hover'
                  )}
                >
                  {isConnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Github className="h-3.5 w-3.5" />}
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </button>
              </div>
              {connectError && (
                <p className="text-xs text-status-danger">{connectError}</p>
              )}
              <p className="text-xs text-text-muted">
                Paste a GitHub Personal Access Token with{' '}
                <code className="rounded bg-dark-elevated px-1 py-0.5 font-mono text-brand-secondary">repo</code> and{' '}
                <code className="rounded bg-dark-elevated px-1 py-0.5 font-mono text-brand-secondary">workflow</code> scopes.{' '}
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo,workflow&description=Vero+IDE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-brand-secondary hover:underline"
                >
                  Create token <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>
          )}

          {isConnected() && (
            <div className="mb-4 flex items-center justify-between rounded-md border border-status-success/20 bg-status-success/5 px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <Github className="h-3.5 w-3.5 text-status-success" />
                Authenticated as <span className="font-medium text-text-primary">{integration?.login}</span>
              </div>
              <button
                type="button"
                onClick={handleDisconnect}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-text-muted transition-colors hover:bg-white/[0.06] hover:text-status-danger"
              >
                <LogOut className="h-3 w-3" />
                Disconnect
              </button>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={runConfigTheme.label}>Repository</label>
              {isConnected() && repositories.length > 0 ? (
                <select
                  value={config.github?.repository || ''}
                  onChange={(e) => handleSelectRepo(e.target.value)}
                  className={cx(runConfigTheme.select, 'mt-2')}
                >
                  <option value="">Select repository...</option>
                  {repositories.map((repo) => (
                    <option key={repo.id} value={repo.fullName}>
                      {repo.fullName}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={config.github?.repository || ''}
                  onChange={(event) => onChange('github', { ...config.github, repository: event.target.value })}
                  className={cx(runConfigTheme.input, 'mt-2')}
                  placeholder="owner/repository"
                />
              )}
            </div>
            <div>
              <label className={runConfigTheme.label}>Branch</label>
              {isConnected() && branches.length > 0 ? (
                <select
                  value={config.github?.branch || ''}
                  onChange={(e) => handleSelectBranch(e.target.value)}
                  className={cx(runConfigTheme.select, 'mt-2')}
                >
                  {branches.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={config.github?.branch || ''}
                  onChange={(event) => onChange('github', { ...config.github, branch: event.target.value })}
                  className={cx(runConfigTheme.input, 'mt-2')}
                  placeholder="main"
                />
              )}
            </div>
          </div>

          <div className="mt-3">
            <label className={runConfigTheme.label}>Workflow File</label>
            <input
              type="text"
              value={config.github?.workflowFile || ''}
              onChange={(event) => onChange('github', { ...config.github, workflowFile: event.target.value })}
              className={cx(runConfigTheme.input, 'mt-2 font-mono')}
              placeholder=".github/workflows/vero-tests.yml"
            />
          </div>
        </section>
      )}

      <section className={runConfigTheme.section}>
        <p className={runConfigTheme.label}>Browser</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(['chromium', 'firefox', 'webkit'] as const).map((browser) => (
            <button
              key={browser}
              type="button"
              onClick={() => onChange('browser', browser)}
              className={chipClass(config.browser === browser)}
            >
              {browser.charAt(0).toUpperCase() + browser.slice(1)}
            </button>
          ))}
        </div>
      </section>

      <section className={runConfigTheme.section}>
        <p className={runConfigTheme.label}>Base URL</p>
        <input
          type="text"
          value={config.baseURL || ''}
          onChange={(event) => onChange('baseURL', event.target.value)}
          className={cx(runConfigTheme.input, 'mt-2 font-mono')}
          placeholder="http://localhost:3000"
        />
        <p className="mt-2 text-xs text-text-muted">Used by relative `page.goto()` calls in generated Playwright tests.</p>
      </section>
    </div>
  );
}
