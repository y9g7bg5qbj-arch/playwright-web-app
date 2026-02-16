import { useEffect, useState } from 'react';
import { Filter, SearchCheck, CircleSlash, Compass } from 'lucide-react';
import type { RunConfiguration } from '@/store/runConfigStore';
import { runConfigTheme, chipClass, cx } from './theme';
import { useEnvironmentStore } from '@/store/environmentStore';
import { veroApi } from '@/api/vero';

interface FilteringTabProps {
  config: RunConfiguration;
  onChange: <K extends keyof RunConfiguration>(field: K, value: RunConfiguration[K]) => void;
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

export function FilteringTab({ config, onChange }: FilteringTabProps) {
  const applicationId = useEnvironmentStore((state) => state.applicationId);
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
          setEstimateNote(
            config.selectionScope === 'current-sandbox'
              ? 'Application-level estimate. Final run scope is current sandbox.'
              : null
          );
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
  }, [applicationId, config.tagExpression, config.selectionScope]);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className={runConfigTheme.section}>
        <div className="mb-2 flex items-center gap-2">
          <Compass className="h-4 w-4 text-brand-secondary" />
          <label className={runConfigTheme.label}>Selection Scope</label>
        </div>
        <select
          className={runConfigTheme.select}
          value={config.selectionScope || 'current-sandbox'}
          onChange={(event) => onChange('selectionScope', (event.target.value as RunConfiguration['selectionScope']) || 'current-sandbox')}
        >
          <option value="current-sandbox">Current Sandbox</option>
          <option value="active-file">Active File</option>
        </select>
        <p className="mt-2 text-xs text-text-muted">
          Current Sandbox cherry-picks matching scenarios across all `.vero` files in the active sandbox.
        </p>
      </section>

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
