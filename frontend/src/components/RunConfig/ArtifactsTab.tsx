import { Camera, Video, FileText, FileOutput } from 'lucide-react';
import type { RunConfiguration } from '@/store/runConfigStore';
import { runConfigTheme, cardSelectClass, chipClass, cx } from './theme';

interface ArtifactsTabProps {
  config: RunConfiguration;
  onChange: <K extends keyof RunConfiguration>(field: K, value: RunConfiguration[K]) => void;
}

type TraceOption = RunConfiguration['trace'];
type ScreenshotOption = RunConfiguration['screenshot'];
type VideoOption = RunConfiguration['video'];

const TRACE_OPTIONS: { value: TraceOption; label: string; description: string }[] = [
  { value: 'off', label: 'Off', description: 'Do not capture traces.' },
  { value: 'on', label: 'Always', description: 'Record traces for every test.' },
  { value: 'retain-on-failure', label: 'Retain on Failure', description: 'Store traces only when tests fail.' },
  { value: 'on-first-retry', label: 'First Retry', description: 'Capture traces when retry starts.' },
];

const SCREENSHOT_OPTIONS: { value: ScreenshotOption; label: string; description: string }[] = [
  { value: 'off', label: 'Off', description: 'No screenshots.' },
  { value: 'on', label: 'Always', description: 'Capture screenshot for all tests.' },
  { value: 'only-on-failure', label: 'On Failure', description: 'Capture screenshot only when failed.' },
];

const VIDEO_OPTIONS: { value: VideoOption; label: string; description: string }[] = [
  { value: 'off', label: 'Off', description: 'No videos.' },
  { value: 'on', label: 'Always', description: 'Record all test sessions.' },
  { value: 'on-failure', label: 'On Failure', description: 'Record only failed tests.' },
  { value: 'retain-on-failure', label: 'Retain on Failure', description: 'Discard passed videos, keep failures.' },
];

export function ArtifactsTab({ config, onChange }: ArtifactsTabProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className={runConfigTheme.section}>
        <div className="mb-2 flex items-center gap-2">
          <FileText className="h-4 w-4 text-brand-secondary" />
          <p className={runConfigTheme.label}>Trace Recording</p>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {TRACE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange('trace', option.value)}
              className={cardSelectClass(config.trace === option.value)}
            >
              <p className="text-sm font-semibold text-text-primary">{option.label}</p>
              <p className="mt-1 text-xs text-text-secondary">{option.description}</p>
            </button>
          ))}
        </div>
      </section>

      <section className={runConfigTheme.section}>
        <div className="mb-2 flex items-center gap-2">
          <Camera className="h-4 w-4 text-brand-secondary" />
          <p className={runConfigTheme.label}>Screenshots</p>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          {SCREENSHOT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange('screenshot', option.value)}
              className={cardSelectClass(config.screenshot === option.value)}
            >
              <p className="text-sm font-semibold text-text-primary">{option.label}</p>
              <p className="mt-1 text-xs text-text-secondary">{option.description}</p>
            </button>
          ))}
        </div>
      </section>

      <section className={runConfigTheme.section}>
        <div className="mb-2 flex items-center gap-2">
          <Video className="h-4 w-4 text-brand-secondary" />
          <p className={runConfigTheme.label}>Video Recording</p>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {VIDEO_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange('video', option.value)}
              className={cardSelectClass(config.video === option.value)}
            >
              <p className="text-sm font-semibold text-text-primary">{option.label}</p>
              <p className="mt-1 text-xs text-text-secondary">{option.description}</p>
            </button>
          ))}
        </div>
      </section>

      <section className={runConfigTheme.section}>
        <p className={runConfigTheme.label}>Reporters</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(['list', 'html', 'json', 'junit', 'allure'] as const).map((reporter) => (
            <button
              key={reporter}
              type="button"
              onClick={() => {
                const current = config.reporter || [];
                if (current.includes(reporter)) {
                  onChange('reporter', current.filter((item) => item !== reporter));
                  return;
                }
                onChange('reporter', [...current, reporter]);
              }}
              className={chipClass(Boolean(config.reporter?.includes(reporter)))}
            >
              {reporter}
            </button>
          ))}
        </div>
      </section>

      <section className={runConfigTheme.section}>
        <div className="mb-2 flex items-center gap-2">
          <FileOutput className="h-4 w-4 text-brand-secondary" />
          <label className={runConfigTheme.label}>Output Directory</label>
        </div>
        <input
          type="text"
          value={config.outputDir || ''}
          onChange={(event) => onChange('outputDir', event.target.value || undefined)}
          className={cx(runConfigTheme.input, 'font-mono')}
          placeholder="test-results"
        />
      </section>

      <section className={runConfigTheme.sectionMuted}>
        <p className={runConfigTheme.label}>CLI Preview</p>
        <code className={cx(runConfigTheme.code, 'mt-2 block whitespace-pre-wrap')}>
          npx playwright test
          {config.trace !== 'off' && ` --trace=${config.trace}`}
          {config.screenshot !== 'off' && ` --screenshot=${config.screenshot}`}
          {config.video !== 'off' && ` --video=${config.video}`}
          {config.reporter.length > 0 && ` --reporter=${config.reporter.join(',')}`}
          {config.outputDir && ` --output=${config.outputDir}`}
        </code>
      </section>
    </div>
  );
}
