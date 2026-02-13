import { Clock3, RotateCcw } from 'lucide-react';
import type { RunConfiguration } from '@/store/runConfigStore';
import { runConfigTheme, chipClass, cx } from './theme';

interface TimeoutsTabProps {
  config: RunConfiguration;
  onChange: <K extends keyof RunConfiguration>(field: K, value: RunConfiguration[K]) => void;
}

const TEST_TIMEOUT_PRESETS = [30000, 60000, 120000, 300000];
const GLOBAL_TIMEOUT_PRESETS = [0, 300000, 600000, 1800000, 3600000];
const RETRY_PRESETS = [0, 1, 2, 3];

const msToSec = (ms: number) => Math.round(ms / 1000);
const secToMs = (sec: number) => sec * 1000;

export function TimeoutsTab({ config, onChange }: TimeoutsTabProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className={runConfigTheme.section}>
        <div className="mb-2 flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-brand-secondary" />
          <label className={runConfigTheme.label}>Test Timeout</label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={msToSec(config.timeout)}
            onChange={(event) => onChange('timeout', secToMs(parseInt(event.target.value, 10) || 0))}
            className={cx(runConfigTheme.input, 'w-32')}
          />
          <span className="text-sm text-text-secondary">seconds</span>
          <span className="text-xs text-text-muted">({config.timeout.toLocaleString()} ms)</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {TEST_TIMEOUT_PRESETS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange('timeout', value)}
              className={chipClass(config.timeout === value)}
            >
              {value < 60000 ? `${value / 1000}s` : `${value / 60000}m`}
            </button>
          ))}
        </div>
      </section>

      <section className={runConfigTheme.section}>
        <label className={runConfigTheme.label}>Global Timeout</label>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={msToSec(config.globalTimeout)}
            onChange={(event) => onChange('globalTimeout', secToMs(parseInt(event.target.value, 10) || 0))}
            className={cx(runConfigTheme.input, 'w-32')}
          />
          <span className="text-sm text-text-secondary">seconds</span>
          {config.globalTimeout > 0 && (
            <span className="text-xs text-text-muted">({config.globalTimeout.toLocaleString()} ms)</span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {GLOBAL_TIMEOUT_PRESETS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange('globalTimeout', value)}
              className={chipClass(config.globalTimeout === value)}
            >
              {value === 0 ? 'No limit' : value < 3600000 ? `${value / 60000}m` : '1h'}
            </button>
          ))}
        </div>
      </section>

      <section className={runConfigTheme.section}>
        <div className="mb-2 flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-brand-secondary" />
          <label className={runConfigTheme.label}>Retries</label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={10}
            value={config.retries}
            onChange={(event) => onChange('retries', parseInt(event.target.value, 10) || 0)}
            className={cx(runConfigTheme.input, 'w-24')}
          />
          <span className="text-sm text-text-secondary">attempts</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {RETRY_PRESETS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange('retries', value)}
              className={chipClass(config.retries === value)}
            >
              {value}
            </button>
          ))}
        </div>
      </section>

      <section className={runConfigTheme.sectionMuted}>
        <p className={runConfigTheme.label}>Timeout Summary</p>
        <div className="mt-2 grid gap-3 text-xs text-text-secondary md:grid-cols-3">
          <div>
            <p className="text-text-muted">Test Timeout</p>
            <p className="mt-1 text-sm font-semibold text-text-primary">
              {config.timeout === 0 ? 'No limit' : `${msToSec(config.timeout)}s`}
            </p>
          </div>
          <div>
            <p className="text-text-muted">Global Timeout</p>
            <p className="mt-1 text-sm font-semibold text-text-primary">
              {config.globalTimeout === 0 ? 'No limit' : `${msToSec(config.globalTimeout)}s`}
            </p>
          </div>
          <div>
            <p className="text-text-muted">Retries</p>
            <p className="mt-1 text-sm font-semibold text-text-primary">
              {config.retries === 0 ? 'Disabled' : `${config.retries}x`}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
