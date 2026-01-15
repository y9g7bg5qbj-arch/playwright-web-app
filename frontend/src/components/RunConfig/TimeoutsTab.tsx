import type { RunConfiguration } from '@/store/runConfigStore';

interface TimeoutsTabProps {
  config: RunConfiguration;
  onChange: <K extends keyof RunConfiguration>(field: K, value: RunConfiguration[K]) => void;
}

export function TimeoutsTab({ config, onChange }: TimeoutsTabProps) {
  // Convert ms to seconds for display
  const msToSec = (ms: number) => Math.round(ms / 1000);
  const secToMs = (sec: number) => sec * 1000;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Test Timeout */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[#c9d1d9]">
          Test Timeout
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            value={msToSec(config.timeout)}
            onChange={(e) => onChange('timeout', secToMs(parseInt(e.target.value) || 0))}
            className="w-32 bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
          />
          <span className="text-sm text-[#8b949e]">seconds</span>
          <span className="text-xs text-[#6e7681]">({config.timeout.toLocaleString()} ms)</span>
        </div>
        <p className="text-xs text-[#6e7681]">
          Maximum time per test. Use 0 for no limit. Default is 30 seconds.
        </p>

        {/* Quick presets */}
        <div className="flex gap-2 mt-2">
          {[
            { label: '30s', ms: 30000 },
            { label: '1m', ms: 60000 },
            { label: '2m', ms: 120000 },
            { label: '5m', ms: 300000 },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange('timeout', preset.ms)}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                config.timeout === preset.ms
                  ? 'bg-sky-500 text-white'
                  : 'bg-[#21262d] text-[#8b949e] hover:text-white hover:bg-[#30363d]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Global Timeout */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[#c9d1d9]">
          Global Timeout
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            value={msToSec(config.globalTimeout)}
            onChange={(e) => onChange('globalTimeout', secToMs(parseInt(e.target.value) || 0))}
            className="w-32 bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
          />
          <span className="text-sm text-[#8b949e]">seconds</span>
          {config.globalTimeout > 0 && (
            <span className="text-xs text-[#6e7681]">({config.globalTimeout.toLocaleString()} ms)</span>
          )}
        </div>
        <p className="text-xs text-[#6e7681]">
          Maximum time for the entire test run. Use 0 for no limit.
        </p>

        {/* Quick presets */}
        <div className="flex gap-2 mt-2">
          {[
            { label: 'No limit', ms: 0 },
            { label: '5m', ms: 300000 },
            { label: '10m', ms: 600000 },
            { label: '30m', ms: 1800000 },
            { label: '1h', ms: 3600000 },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange('globalTimeout', preset.ms)}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                config.globalTimeout === preset.ms
                  ? 'bg-sky-500 text-white'
                  : 'bg-[#21262d] text-[#8b949e] hover:text-white hover:bg-[#30363d]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Retries */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[#c9d1d9]">
          Retries
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            max={10}
            value={config.retries}
            onChange={(e) => onChange('retries', parseInt(e.target.value) || 0)}
            className="w-24 bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
          />
          <span className="text-sm text-[#8b949e]">times</span>
        </div>
        <p className="text-xs text-[#6e7681]">
          Number of times to retry a failing test. Use 0 to disable retries.
        </p>

        {/* Quick presets */}
        <div className="flex gap-2 mt-2">
          {[0, 1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange('retries', n)}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                config.retries === n
                  ? 'bg-sky-500 text-white'
                  : 'bg-[#21262d] text-[#8b949e] hover:text-white hover:bg-[#30363d]'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d]">
        <label className="block text-xs font-medium text-[#8b949e] uppercase tracking-wider mb-3">
          Configuration Summary
        </label>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-[#6e7681]">Test Timeout</div>
            <div className="text-white font-medium">
              {config.timeout === 0 ? 'No limit' : `${msToSec(config.timeout)}s`}
            </div>
          </div>
          <div>
            <div className="text-[#6e7681]">Global Timeout</div>
            <div className="text-white font-medium">
              {config.globalTimeout === 0 ? 'No limit' : `${msToSec(config.globalTimeout)}s`}
            </div>
          </div>
          <div>
            <div className="text-[#6e7681]">Retries</div>
            <div className="text-white font-medium">
              {config.retries === 0 ? 'Disabled' : `${config.retries}x`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
