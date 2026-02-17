import { type ComponentType, useState, useCallback } from 'react';
import { PlayCircle, Bug, PanelsTopLeft, Split, Layers } from 'lucide-react';
import type { RunConfiguration } from '@/store/runConfigStore';
import { ShardingConfig } from '@/components/Sharding/ShardingConfig';
import type { ShardingConfig as ShardingConfigType } from '@/types/execution';
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

function ShardingSection({ config, onChange }: ExecutionTabProps) {
  const [shardingState, setShardingState] = useState<ShardingConfigType>(() => ({
    enabled: Boolean(config.shards) && config.target === 'github-actions',
    strategy: 'round-robin',
    shardCount: config.shards?.total || 4,
  }));

  const handleShardingChange = useCallback((updated: ShardingConfigType) => {
    setShardingState(updated);
    if (updated.enabled) {
      onChange('shards', { current: 1, total: updated.shardCount });
    } else {
      onChange('shards', undefined);
    }
  }, [onChange]);

  if (config.target !== 'github-actions') {
    return (
      <section className={runConfigTheme.section}>
        <div className="mb-3 flex items-center gap-2">
          <Split className="h-4 w-4 text-brand-secondary" />
          <p className="text-sm font-semibold text-text-primary">Sharding</p>
        </div>
        <p className="text-xs text-text-secondary">
          Local Vero runs use workers only. Sharding is enabled for GitHub Actions target.
        </p>
      </section>
    );
  }

  return (
    <section className={runConfigTheme.section}>
      <ShardingConfig
        value={shardingState}
        onChange={handleShardingChange}
      />
      {shardingState.enabled && (
        <div className="mt-3">
          <p className="text-xs font-medium text-text-secondary">
            Shard CLI preview:
          </p>
          <div className={cx(runConfigTheme.code, 'mt-1')}>
            --shard=1/{shardingState.shardCount}
          </div>
        </div>
      )}
    </section>
  );
}

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

      <ShardingSection config={config} onChange={onChange} />

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
