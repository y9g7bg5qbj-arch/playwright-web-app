import { Camera, Video, FileText } from 'lucide-react';
import type { RunConfiguration } from '@/store/runConfigStore';

interface ArtifactsTabProps {
  config: RunConfiguration;
  onChange: <K extends keyof RunConfiguration>(field: K, value: RunConfiguration[K]) => void;
}

type TraceOption = RunConfiguration['trace'];
type ScreenshotOption = RunConfiguration['screenshot'];
type VideoOption = RunConfiguration['video'];

const TRACE_OPTIONS: { value: TraceOption; label: string; description: string }[] = [
  { value: 'off', label: 'Off', description: 'No trace recording' },
  { value: 'on', label: 'On', description: 'Record trace for every test' },
  { value: 'retain-on-failure', label: 'Retain on Failure', description: 'Keep trace only for failed tests' },
  { value: 'on-first-retry', label: 'On First Retry', description: 'Record trace only on first retry' },
];

const SCREENSHOT_OPTIONS: { value: ScreenshotOption; label: string; description: string }[] = [
  { value: 'off', label: 'Off', description: 'No screenshots' },
  { value: 'on', label: 'On', description: 'Screenshot after each test' },
  { value: 'only-on-failure', label: 'On Failure', description: 'Screenshot only on test failure' },
];

const VIDEO_OPTIONS: { value: VideoOption; label: string; description: string }[] = [
  { value: 'off', label: 'Off', description: 'No video recording' },
  { value: 'on', label: 'On', description: 'Record video for every test' },
  { value: 'on-failure', label: 'On Failure', description: 'Record video only for failed tests' },
  { value: 'retain-on-failure', label: 'Retain on Failure', description: 'Keep video only for failed tests' },
];

export function ArtifactsTab({ config, onChange }: ArtifactsTabProps) {
  return (
    <div className="space-y-8 max-w-2xl">
      {/* Trace */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#8b949e]" />
          <label className="text-sm font-medium text-[#c9d1d9]">Trace Recording</label>
        </div>
        <p className="text-xs text-[#6e7681]">
          Playwright Trace Viewer captures screenshots, DOM snapshots, network, and console logs for debugging.
        </p>

        <div className="grid grid-cols-2 gap-2">
          {TRACE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange('trace', option.value)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                config.trace === option.value
                  ? 'border-sky-500 bg-sky-500/10'
                  : 'border-[#30363d] hover:border-[#484f58]'
              }`}
            >
              <div className={`text-sm font-medium ${config.trace === option.value ? 'text-white' : 'text-[#8b949e]'}`}>
                {option.label}
              </div>
              <div className="text-xs text-[#6e7681] mt-0.5">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Screenshots */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-[#8b949e]" />
          <label className="text-sm font-medium text-[#c9d1d9]">Screenshots</label>
        </div>
        <p className="text-xs text-[#6e7681]">
          Capture screenshots at the end of each test or on failure.
        </p>

        <div className="flex gap-2">
          {SCREENSHOT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange('screenshot', option.value)}
              className={`flex-1 p-3 rounded-lg border-2 text-left transition-all ${
                config.screenshot === option.value
                  ? 'border-sky-500 bg-sky-500/10'
                  : 'border-[#30363d] hover:border-[#484f58]'
              }`}
            >
              <div className={`text-sm font-medium ${config.screenshot === option.value ? 'text-white' : 'text-[#8b949e]'}`}>
                {option.label}
              </div>
              <div className="text-xs text-[#6e7681] mt-0.5">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Video */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5 text-[#8b949e]" />
          <label className="text-sm font-medium text-[#c9d1d9]">Video Recording</label>
        </div>
        <p className="text-xs text-[#6e7681]">
          Record video of test execution. Videos are saved in test-results directory.
        </p>

        <div className="grid grid-cols-2 gap-2">
          {VIDEO_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange('video', option.value)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                config.video === option.value
                  ? 'border-sky-500 bg-sky-500/10'
                  : 'border-[#30363d] hover:border-[#484f58]'
              }`}
            >
              <div className={`text-sm font-medium ${config.video === option.value ? 'text-white' : 'text-[#8b949e]'}`}>
                {option.label}
              </div>
              <div className="text-xs text-[#6e7681] mt-0.5">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Reporters */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-[#c9d1d9]">
          Reporters
        </label>
        <p className="text-xs text-[#6e7681]">
          Select one or more reporters for test results.
        </p>

        <div className="flex flex-wrap gap-2">
          {(['list', 'html', 'json', 'junit', 'allure'] as const).map((reporter) => (
            <button
              key={reporter}
              type="button"
              onClick={() => {
                const current = config.reporter || [];
                if (current.includes(reporter)) {
                  onChange('reporter', current.filter(r => r !== reporter));
                } else {
                  onChange('reporter', [...current, reporter]);
                }
              }}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                config.reporter?.includes(reporter)
                  ? 'bg-sky-500 text-white'
                  : 'bg-[#21262d] text-[#8b949e] hover:text-white hover:bg-[#30363d]'
              }`}
            >
              {reporter}
            </button>
          ))}
        </div>
      </div>

      {/* Output Directory */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[#c9d1d9]">
          Output Directory
        </label>
        <input
          type="text"
          value={config.outputDir || ''}
          onChange={(e) => onChange('outputDir', e.target.value || undefined)}
          className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-sky-500 placeholder-[#6e7681]"
          placeholder="test-results"
        />
        <p className="text-xs text-[#6e7681]">
          Directory for test artifacts (traces, screenshots, videos)
        </p>
      </div>

      {/* Preview */}
      <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d]">
        <label className="block text-xs font-medium text-[#8b949e] uppercase tracking-wider mb-2">
          Playwright CLI Preview
        </label>
        <code className="text-sm text-[#58a6ff] font-mono break-all">
          npx playwright test
          {config.trace !== 'off' && ` --trace=${config.trace}`}
          {config.screenshot !== 'off' && ` --screenshot=${config.screenshot}`}
          {config.video !== 'off' && ` --video=${config.video}`}
          {config.reporter.length > 0 && ` --reporter=${config.reporter.join(',')}`}
          {config.outputDir && ` --output=${config.outputDir}`}
        </code>
      </div>
    </div>
  );
}
