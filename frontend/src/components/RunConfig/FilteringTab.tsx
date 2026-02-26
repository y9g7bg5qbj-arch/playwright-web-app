import { useEffect, useMemo, useState } from 'react';
import { Filter, SearchCheck, CircleSlash, Compass, FolderTree, GitBranch } from 'lucide-react';
import type { RunConfiguration } from '@/store/runConfigStore';
import { runConfigTheme, chipClass, cx } from './theme';
import { useProjectStore } from '@/store/projectStore';
import { useSandboxStore } from '@/store/sandboxStore';
import { sandboxApi, type Sandbox } from '@/api/sandbox';
import { veroApi } from '@/api/vero';

interface FilteringTabProps {
  config: RunConfiguration;
  onChange: <K extends keyof RunConfiguration>(field: K, value: RunConfiguration[K]) => void;
  hideScope?: boolean;
}

const QUICK_FILTERS = ['@smoke', '@critical', '@regression', '@e2e', '@wip'];

interface ParsedTagExpression {
  tags: string[];
  excludeTags: string[];
  tagMode: 'any' | 'all';
  supported: boolean;
}

function parseSimpleTagExpression(expression: string | undefined): ParsedTagExpression {
  const raw = (expression || '').trim().toLowerCase();
  if (!raw) {
    return { tags: [], excludeTags: [], tagMode: 'any', supported: true };
  }
  if (raw.includes('(') || raw.includes(')')) {
    return { tags: [], excludeTags: [], tagMode: 'any', supported: false };
  }

  const hasAnd = /\band\b/.test(raw);
  const hasOr = /\bor\b/.test(raw);
  if (hasAnd && hasOr) {
    return { tags: [], excludeTags: [], tagMode: 'any', supported: false };
  }

  const tagMatches = Array.from(raw.matchAll(/@([a-z0-9_-]+)/g)).map((match) => match[1]);
  if (tagMatches.length === 0) {
    return { tags: [], excludeTags: [], tagMode: hasAnd ? 'all' : 'any', supported: false };
  }

  const excludeMatches = Array.from(raw.matchAll(/\bnot\s+@([a-z0-9_-]+)/g)).map((match) => match[1]);
  const excludeTags = Array.from(new Set(excludeMatches));
  const tags = Array.from(new Set(tagMatches.filter((tag) => !excludeTags.includes(tag))));

  return {
    tags,
    excludeTags,
    tagMode: hasAnd ? 'all' : 'any',
    supported: true,
  };
}

function addOrRemovePattern(current: string | undefined, token: string): string | undefined {
  if (!current) return token;

  const parts = current
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.includes(token)) {
    const next = parts.filter((part) => part !== token);
    return next.length ? next.join('|') : undefined;
  }

  return [...parts, token].join('|');
}

export function FilteringTab({ config, onChange, hideScope }: FilteringTabProps) {
  const currentApplication = useProjectStore((state) => state.currentProject);
  const applicationId = currentApplication?.id || null;
  const currentNestedProject = useProjectStore((state) => state.currentNestedProject);
  const activeSandboxes = useSandboxStore((state) => state.sandboxes);
  const activeEnvironment = useSandboxStore((state) => state.activeEnvironment);

  const nestedProjects = currentApplication?.projects || [];
  const effectiveProjectId = config.targetProjectId || currentNestedProject?.id || nestedProjects[0]?.id || '';
  // Determine environment type from config or current context
  const envType: 'dev' | 'master' | 'sandbox' = useMemo(() => {
    const env = config.targetEnvironment;
    if (env === 'dev') return 'dev';
    if (env === 'master') return 'master';
    if (typeof env === 'object' && 'sandboxId' in env) return 'sandbox';
    // Fallback to current active environment
    if (activeEnvironment === 'dev') return 'dev';
    if (activeEnvironment === 'master') return 'master';
    return 'sandbox';
  }, [config.targetEnvironment, activeEnvironment]);

  // Effective sandbox ID (from config or from current context)
  const effectiveSandboxId = useMemo(() => {
    const env = config.targetEnvironment;
    if (typeof env === 'object' && 'sandboxId' in env) return env.sandboxId;
    if (typeof activeEnvironment === 'object' && 'sandboxId' in activeEnvironment) return activeEnvironment.sandboxId;
    return '';
  }, [config.targetEnvironment, activeEnvironment]);

  // Always fetch sandboxes for the effective project via the API so the backend's
  // filesystem auto-discovery picks up all sandbox folders on disk.
  const [fetchedSandboxes, setFetchedSandboxes] = useState<Sandbox[]>([]);
  useEffect(() => {
    if (!effectiveProjectId) {
      setFetchedSandboxes([]);
      return;
    }
    let cancelled = false;
    sandboxApi.listByProject(effectiveProjectId)
      .then((result) => { if (!cancelled) setFetchedSandboxes(result); })
      .catch(() => { if (!cancelled) setFetchedSandboxes([]); });
    return () => { cancelled = true; };
  }, [effectiveProjectId]);

  const targetSandboxes = fetchedSandboxes.length > 0 ? fetchedSandboxes : activeSandboxes;

  const [estimatedScenarioCount, setEstimatedScenarioCount] = useState<number | null>(null);
  const [estimateNote, setEstimateNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadEstimate() {
      if (!applicationId) {
        if (!cancelled) {
          setEstimatedScenarioCount(null);
          setEstimateNote(null);
        }
        return;
      }

      const parsed = parseSimpleTagExpression(config.tagExpression);
      if (!parsed.supported) {
        if (!cancelled) {
          setEstimatedScenarioCount(null);
          setEstimateNote('Estimate supports simple tag expressions only (no mixed and/or or parentheses).');
        }
        return;
      }

      try {
        const result = await veroApi.getScenarios({
          applicationId,
          tags: parsed.tags.length > 0 ? parsed.tags : undefined,
          excludeTags: parsed.excludeTags.length > 0 ? parsed.excludeTags : undefined,
          tagMode: parsed.tagMode,
        });
        if (!cancelled) {
          setEstimatedScenarioCount(result.totalScenarios);
          setEstimateNote('Application-level estimate. Final run scope is selected target.');
        }
      } catch {
        if (!cancelled) {
          setEstimatedScenarioCount(null);
          setEstimateNote('Unable to fetch scenario estimate.');
        }
      }
    }

    void loadEstimate();
    return () => {
      cancelled = true;
    };
  }, [applicationId, config.tagExpression]);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {!hideScope && (
        <section className={runConfigTheme.section}>
          <div className="mb-2 flex items-center gap-2">
            <Compass className="h-4 w-4 text-brand-secondary" />
            <label className={runConfigTheme.label}>Target Scope</label>
          </div>

          {/* Project picker */}
          <div className="mb-3">
            <label className="mb-1 flex items-center gap-1.5 text-xs text-text-secondary">
              <FolderTree className="h-3 w-3" /> Project
            </label>
            <select
              className={runConfigTheme.select}
              value={effectiveProjectId}
              onChange={(e) => {
                const newProjectId = e.target.value || undefined;
                onChange('targetProjectId', newProjectId);
                // Reset environment to dev when switching projects
                onChange('targetEnvironment', 'dev');
              }}
            >
              {nestedProjects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>

          {/* Environment picker */}
          <div className="mb-3">
            <label className="mb-1 flex items-center gap-1.5 text-xs text-text-secondary">
              <GitBranch className="h-3 w-3" /> Environment
            </label>
            <select
              className={runConfigTheme.select}
              value={envType}
              onChange={(e) => {
                const val = e.target.value as 'dev' | 'master' | 'sandbox';
                if (val === 'dev') {
                  onChange('targetEnvironment', 'dev');
                } else if (val === 'master') {
                  onChange('targetEnvironment', 'master');
                } else {
                  // Default to first available sandbox
                  const first = targetSandboxes[0];
                  if (first) {
                    onChange('targetEnvironment', { sandboxId: first.id });
                  }
                }
              }}
            >
              <option value="dev">Development (dev)</option>
              <option value="master">Production (master)</option>
              {targetSandboxes.length > 0 && (
                <option value="sandbox">Sandbox</option>
              )}
            </select>
          </div>

          {/* Sandbox sub-picker */}
          {envType === 'sandbox' && targetSandboxes.length > 0 && (
            <div className="mb-3">
              <label className="mb-1 block text-xs text-text-secondary">Sandbox</label>
              <select
                className={runConfigTheme.select}
                value={effectiveSandboxId}
                onChange={(e) => onChange('targetEnvironment', { sandboxId: e.target.value })}
              >
                {targetSandboxes.map((sandbox) => (
                  <option key={sandbox.id} value={sandbox.id}>{sandbox.name}</option>
                ))}
              </select>
            </div>
          )}

          <p className="mt-2 text-xs text-text-muted">
            Runs all <code className="rounded bg-dark-canvas px-1">.vero</code> files in the selected project and environment.
          </p>
        </section>
      )}

      <section className={runConfigTheme.section}>
        <div className="mb-2 flex items-center gap-2">
          <Filter className="h-4 w-4 text-brand-secondary" />
          <label className={runConfigTheme.label}>Tag Expression (Cucumber Style)</label>
        </div>
        <input
          type="text"
          value={config.tagExpression || ''}
          onChange={(event) => onChange('tagExpression', event.target.value || undefined)}
          className={cx(runConfigTheme.input, 'font-mono')}
          placeholder="(@smoke and @loginComponent) and not @dashboard"
        />
        <p className="mt-2 text-xs text-text-muted">
          Primary Vero scenario filter. Supports `and`, `or`, `not`, and parentheses.
        </p>
        {(estimatedScenarioCount !== null || estimateNote) && (
          <p className="mt-2 text-xs text-text-secondary">
            {estimatedScenarioCount !== null ? `Estimated matching scenarios: ${estimatedScenarioCount}. ` : ''}
            {estimateNote || ''}
          </p>
        )}
      </section>

      <section className={runConfigTheme.section}>
        <div className="mb-2 flex items-center gap-2">
          <Filter className="h-4 w-4 text-brand-secondary" />
          <label className={runConfigTheme.label}>Include Filter (`--grep`)</label>
        </div>
        <input
          type="text"
          value={config.grep || ''}
          onChange={(event) => onChange('grep', event.target.value || undefined)}
          className={cx(runConfigTheme.input, 'font-mono')}
          placeholder="@smoke|checkout.*"
        />
        <p className="mt-2 text-xs text-text-muted">
          Regex applied to test names. Only matching tests run.
        </p>
      </section>

      <section className={runConfigTheme.section}>
        <div className="mb-2 flex items-center gap-2">
          <CircleSlash className="h-4 w-4 text-brand-secondary" />
          <label className={runConfigTheme.label}>Exclude Filter (`--grep-invert`)</label>
        </div>
        <input
          type="text"
          value={config.grepInvert || ''}
          onChange={(event) => onChange('grepInvert', event.target.value || undefined)}
          className={cx(runConfigTheme.input, 'font-mono')}
          placeholder="@skip|@flaky"
        />
        <p className="mt-2 text-xs text-text-muted">
          Regex for tests that should be excluded from this run.
        </p>
      </section>

      <section className={runConfigTheme.section}>
        <p className={runConfigTheme.label}>Quick Filters</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_FILTERS.map((token) => (
            <button
              key={token}
              type="button"
              onClick={() => onChange('grep', addOrRemovePattern(config.grep, token))}
              className={chipClass(Boolean(config.grep?.split('|').map((item) => item.trim()).includes(token)))}
            >
              {token}
            </button>
          ))}
        </div>
      </section>

      <section className={runConfigTheme.section}>
        <label className="inline-flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={config.lastFailed}
            onChange={(event) => onChange('lastFailed', event.target.checked)}
            className={cx(runConfigTheme.toggle, 'mt-0.5')}
          />
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
              <SearchCheck className="h-4 w-4 text-brand-secondary" />
              Run Last Failed
            </div>
            <p className="text-xs text-text-secondary">Run only scenarios that failed in the previous execution.</p>
          </div>
        </label>
      </section>

      {(config.tagExpression || config.grep || config.grepInvert || config.lastFailed) && (
        <section className={runConfigTheme.sectionMuted}>
          <p className={runConfigTheme.label}>CLI Preview</p>
          <code className={cx(runConfigTheme.code, 'mt-2 block whitespace-pre-wrap')}>
            npx playwright test
            {config.tagExpression && `\n# Vero tag expression: ${config.tagExpression}`}
            {config.grep && ` --grep="${config.grep}"`}
            {config.grepInvert && ` --grep-invert="${config.grepInvert}"`}
            {config.lastFailed && ' --last-failed'}
          </code>
        </section>
      )}
    </div>
  );
}
