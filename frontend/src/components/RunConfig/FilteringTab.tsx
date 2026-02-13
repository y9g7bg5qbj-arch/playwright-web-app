import { Filter, SearchCheck, CircleSlash } from 'lucide-react';
import type { RunConfiguration } from '@/store/runConfigStore';
import { runConfigTheme, chipClass, cx } from './theme';

interface FilteringTabProps {
  config: RunConfiguration;
  onChange: <K extends keyof RunConfiguration>(field: K, value: RunConfiguration[K]) => void;
}

const QUICK_FILTERS = ['@smoke', '@critical', '@regression', '@e2e', '@wip'];

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
  return (
    <div className="mx-auto max-w-3xl space-y-5">
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

      {(config.grep || config.grepInvert || config.lastFailed) && (
        <section className={runConfigTheme.sectionMuted}>
          <p className={runConfigTheme.label}>CLI Preview</p>
          <code className={cx(runConfigTheme.code, 'mt-2 block whitespace-pre-wrap')}>
            npx playwright test
            {config.grep && ` --grep="${config.grep}"`}
            {config.grepInvert && ` --grep-invert="${config.grepInvert}"`}
            {config.lastFailed && ' --last-failed'}
          </code>
        </section>
      )}
    </div>
  );
}
