import { type ComponentType } from 'react';
import { PlayCircle, Bug, PanelsTopLeft, Split, Layers } from 'lucide-react';
import type { RunConfiguration } from '@/store/runConfigStore';
import { runConfigTheme, chipClass, cx } from './theme';

interface ExecutionTabProps {
  config: RunConfiguration;
  onChange: <K extends keyof RunConfiguration>(field: K, value: RunConfiguration[K]) => void;
}

interface ToggleOption {
  id: 'headed' | 'debug' | 'ui';
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}

const TOGGLE_OPTIONS: ToggleOption[] = [
  {
    id: 'headed',
    title: 'Headed Mode',
    description: 'Keep browser visible during execution.',
    icon: PlayCircle,
  },
  {
    id: 'debug',
    title: 'Debug Mode',
    description: 'Enable Playwright inspector and breakpoint flow.',
    icon: Bug,
  },
  {
    id: 'ui',
    title: 'Playwright UI Mode',
    description: 'Open Playwright UI for interactive exploration.',
    icon: PanelsTopLeft,
  },
];

export function ExecutionTab({ config, onChange }: ExecutionTabProps) {
  const sectionTitleClass = 'text-sm font-semibold text-text-primary';
  const fieldLabelClass = 'text-xs font-medium text-text-secondary';
  const helperCopyClass = 'mt-1 text-xs text-text-secondary';

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className={runConfigTheme.section}>
        <p className={sectionTitleClass}>Execution Mode</p>
        <p className="mt-1 text-xs text-text-secondary">Controls below tune local Playwright run behavior.</p>
        <div className="mt-3 grid gap-2">
          {TOGGLE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const enabled = Boolean(config[option.id]);
            return (
              <label
                key={option.id}
                className={cx(
                  'flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 transition-colors',
                  enabled
                    ? 'border-border-selected bg-surface-selected'
                    : 'border-border-default bg-dark-elevated/35 hover:border-border-emphasis hover:bg-surface-hover/70'
                )}
              >
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(event) => onChange(option.id, event.target.checked)}
                  className={cx(runConfigTheme.toggle, 'mt-0.5 shrink-0')}
                />
                <Icon className={cx('mt-0.5 h-4 w-4', enabled ? 'text-brand-secondary' : 'text-text-secondary')} />
                <div>
                  <p className="text-sm font-semibold text-text-primary">{option.title}</p>
                  <p className="text-xs text-text-secondary">{option.description}</p>
                </div>
              </label>
            );
          })}
        </div>
      </section>

      <section className={runConfigTheme.section}>
        <div className="mb-3 flex items-center gap-2">
          <Layers className="h-4 w-4 text-brand-secondary" />
          <p className={sectionTitleClass}>Parallelism</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={fieldLabelClass}>Workers</label>
            <input
              type="number"
              min={1}
              max={32}
              value={config.workers}
              onChange={(event) => onChange('workers', parseInt(event.target.value, 10) || 1)}
              className={cx(runConfigTheme.input, 'mt-2')}
            />
            <p className={helperCopyClass}>Number of concurrent workers for local execution.</p>
          </div>

          <div>
            <label className={fieldLabelClass}>Quick Presets</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {[1, 2, 4, 8].map((workers) => (
                <button
                  key={workers}
                  type="button"
                  onClick={() => onChange('workers', workers)}
                  className={chipClass(config.workers === workers)}
                >
                  {workers}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={runConfigTheme.section}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Split className="h-4 w-4 text-brand-secondary" />
            <p className={sectionTitleClass}>Sharding</p>
          </div>

          {config.target === 'github-actions' && (
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-text-secondary">
              <input
                type="checkbox"
                checked={Boolean(config.shards)}
                onChange={(event) => {
                  if (event.target.checked) {
                    onChange('shards', { current: 1, total: 4 });
                    return;
                  }
                  onChange('shards', undefined);
                }}
                className={runConfigTheme.toggle}
              />
              Enable sharding
            </label>
          )}
        </div>

        {config.target !== 'github-actions' ? (
          <p className="text-xs text-text-secondary">
            Local Vero runs use workers only. Sharding is enabled for GitHub Actions target.
          </p>
        ) : config.shards ? (
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={fieldLabelClass}>Current Shard</label>
              <input
                type="number"
                min={1}
                max={config.shards.total}
                value={config.shards.current}
                onChange={(event) =>
                  onChange('shards', {
                    ...config.shards!,
                    current: parseInt(event.target.value, 10) || 1,
                  })
                }
                className={cx(runConfigTheme.input, 'mt-2')}
              />
            </div>

            <div>
              <label className={fieldLabelClass}>Total Shards</label>
              <input
                type="number"
                min={1}
                max={100}
                value={config.shards.total}
                onChange={(event) =>
                  onChange('shards', {
                    ...config.shards!,
                    total: parseInt(event.target.value, 10) || 1,
                  })
                }
                className={cx(runConfigTheme.input, 'mt-2')}
              />
            </div>

            <div className="md:col-span-2">
              <p className="text-xs font-medium text-text-secondary">
                Shard CLI preview:
              </p>
              <div className={cx(runConfigTheme.code, 'mt-1')}>
                --shard={config.shards.current}/{config.shards.total}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-text-secondary">Disable for local single-node runs. Enable for distributed CI jobs.</p>
        )}
      </section>

      <section className={runConfigTheme.section}>
        <p className={sectionTitleClass}>Playwright Project (Optional)</p>
        <input
          type="text"
          value={config.project || ''}
          onChange={(event) => onChange('project', event.target.value || undefined)}
          className={cx(runConfigTheme.input, 'mt-2')}
          placeholder="chromium, firefox, mobile"
        />
        <p className="mt-2 text-xs text-text-secondary">Target a single `project` from `playwright.config.ts`.</p>
      </section>
    </div>
  );
}
