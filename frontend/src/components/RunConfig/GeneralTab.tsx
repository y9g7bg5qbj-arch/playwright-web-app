import { useEffect } from 'react';
import { Monitor, Github, CheckCircle2, AlertCircle, Globe, Rocket } from 'lucide-react';
import type { RunConfiguration } from '@/store/runConfigStore';
import { useEnvironmentStore } from '@/store/environmentStore';
import { useGitHubStore } from '@/store/useGitHubStore';
import { runConfigTheme, cardSelectClass, chipClass, cx } from './theme';

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
    loadIntegration,
  } = useGitHubStore();

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
        {environments.length === 0 && (
          <p className="mt-1 text-xs text-status-warning">
            No environments found. Create one from the environment selector in the IDE header.
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
            <p className={runConfigTheme.label}>GitHub Settings</p>
            {isConnected() ? (
              <div className="inline-flex items-center gap-1 text-xs text-status-success">
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

          {isConnected() && selectedRepository && (
            <button
              type="button"
              onClick={() =>
                onChange('github', {
                  ...config.github,
                  repository: selectedRepository.fullName,
                  branch: selectedBranch || selectedRepository.defaultBranch,
                  workflowFile: config.github?.workflowFile || '.github/workflows/vero-tests.yml',
                })
              }
              className="mb-3 inline-flex items-center gap-1.5 rounded-md bg-brand-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-hover"
            >
              <Github className="h-3.5 w-3.5" />
              Use {selectedRepository.fullName}
            </button>
          )}

          {!isConnected() && (
            <div className="mb-3 rounded-md border border-status-warning/30 bg-status-warning/10 px-3 py-2 text-xs text-text-secondary">
              Connect GitHub in settings to auto-fill repository and branch.
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={runConfigTheme.label}>Repository</label>
              <input
                type="text"
                value={config.github?.repository || ''}
                onChange={(event) => onChange('github', { ...config.github, repository: event.target.value })}
                className={cx(runConfigTheme.input, 'mt-2')}
                placeholder="owner/repository"
              />
            </div>
            <div>
              <label className={runConfigTheme.label}>Branch</label>
              <input
                type="text"
                value={config.github?.branch || ''}
                onChange={(event) => onChange('github', { ...config.github, branch: event.target.value })}
                className={cx(runConfigTheme.input, 'mt-2')}
                placeholder="main"
              />
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
