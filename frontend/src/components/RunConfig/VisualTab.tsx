import { Image, RefreshCw } from 'lucide-react';
import type { RunConfiguration } from '@/store/runConfigStore';
import { cardSelectClass, cx, runConfigTheme } from './theme';

interface VisualTabProps {
  config: RunConfiguration;
  onChange: <K extends keyof RunConfiguration>(field: K, value: RunConfiguration[K]) => void;
}

type VisualPreset = RunConfiguration['visualPreset'];

const PRESET_OPTIONS: Array<{
  value: VisualPreset;
  label: string;
  description: string;
  threshold: number;
  maxDiffPixels?: number;
  maxDiffPixelRatio?: number;
}> = [
  {
    value: 'strict',
    label: 'Strict',
    description: 'Lowest tolerance. Best for static UI snapshots.',
    threshold: 0.1,
    maxDiffPixels: 0,
    maxDiffPixelRatio: 0,
  },
  {
    value: 'balanced',
    label: 'Balanced',
    description: 'Default profile for local UI comparisons.',
    threshold: 0.2,
  },
  {
    value: 'relaxed',
    label: 'Relaxed',
    description: 'Higher tolerance for noisy rendering.',
    threshold: 0.3,
    maxDiffPixelRatio: 0.01,
  },
  {
    value: 'custom',
    label: 'Custom',
    description: 'Manually tune advanced numeric limits.',
    threshold: 0.2,
  },
];

function parseThreshold(value: string, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(1, parsed));
}

function parseOptionalNonNegativeInt(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.floor(parsed);
}

function parseOptionalRatio(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(0, Math.min(1, parsed));
}

export function VisualTab({ config, onChange }: VisualTabProps) {
  const activePreset = config.visualPreset || 'balanced';
  const threshold = typeof config.visualThreshold === 'number' ? config.visualThreshold : 0.2;

  const applyPreset = (preset: (typeof PRESET_OPTIONS)[number]) => {
    onChange('visualPreset', preset.value);
    onChange('visualThreshold', preset.threshold);
    onChange('visualMaxDiffPixels', preset.maxDiffPixels);
    onChange('visualMaxDiffPixelRatio', preset.maxDiffPixelRatio);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className={runConfigTheme.section}>
        <div className="mb-2 flex items-center gap-2">
          <Image className="h-4 w-4 text-brand-secondary" />
          <p className={runConfigTheme.label}>Visual Preset</p>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {PRESET_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => applyPreset(option)}
              className={cardSelectClass(activePreset === option.value)}
            >
              <p className="text-sm font-semibold text-text-primary">{option.label}</p>
              <p className="mt-1 text-xs text-text-secondary">{option.description}</p>
            </button>
          ))}
        </div>
      </section>

      <section className={runConfigTheme.section}>
        <p className={runConfigTheme.label}>Advanced Thresholds</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="space-y-1">
            <span className="text-xs text-text-secondary">Threshold (0-1)</span>
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={threshold}
              onChange={(event) => onChange('visualThreshold', parseThreshold(event.target.value, threshold))}
              className={runConfigTheme.input}
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs text-text-secondary">Max Diff Pixels</span>
            <input
              type="number"
              min={0}
              step={1}
              value={config.visualMaxDiffPixels ?? ''}
              onChange={(event) => onChange('visualMaxDiffPixels', parseOptionalNonNegativeInt(event.target.value))}
              className={runConfigTheme.input}
              placeholder="unlimited"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs text-text-secondary">Max Diff Ratio (0-1)</span>
            <input
              type="number"
              min={0}
              max={1}
              step={0.001}
              value={config.visualMaxDiffPixelRatio ?? ''}
              onChange={(event) => onChange('visualMaxDiffPixelRatio', parseOptionalRatio(event.target.value))}
              className={runConfigTheme.input}
              placeholder="unlimited"
            />
          </label>
        </div>
      </section>

      <section className={runConfigTheme.section}>
        <label className="flex items-center justify-between gap-3 rounded border border-border-default px-3 py-2">
          <div>
            <p className="text-sm font-medium text-text-primary">Update Visual Baselines</p>
            <p className="text-xs text-text-secondary">Runs Playwright with `--update-snapshots=changed`.</p>
          </div>
          <input
            type="checkbox"
            checked={Boolean(config.visualUpdateSnapshots)}
            onChange={(event) => onChange('visualUpdateSnapshots', event.target.checked)}
            className={runConfigTheme.toggle}
          />
        </label>
      </section>

      <section className={runConfigTheme.sectionMuted}>
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-text-muted" />
          <p className={runConfigTheme.label}>CLI Preview</p>
        </div>
        <code className={cx(runConfigTheme.code, 'mt-2 block whitespace-pre-wrap')}>
          npx playwright test
          {config.visualUpdateSnapshots && ' --update-snapshots=changed'}
        </code>
      </section>
    </div>
  );
}
