import type { RunConfiguration } from '@/store/runConfigStore';

interface FilteringTabProps {
  config: RunConfiguration;
  onChange: <K extends keyof RunConfiguration>(field: K, value: RunConfiguration[K]) => void;
}

export function FilteringTab({ config, onChange }: FilteringTabProps) {
  return (
    <div className="space-y-6 max-w-2xl">
      {/* Grep Filter */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[#c9d1d9]">
          Test Filter (grep)
        </label>
        <input
          type="text"
          value={config.grep || ''}
          onChange={(e) => onChange('grep', e.target.value || undefined)}
          className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-sky-500 placeholder-[#6e7681]"
          placeholder="@smoke|@critical"
        />
        <p className="text-xs text-[#6e7681]">
          Regular expression to match test names. Only matching tests will run.
        </p>
      </div>

      {/* Grep Invert Filter */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[#c9d1d9]">
          Exclude Filter (grep-invert)
        </label>
        <input
          type="text"
          value={config.grepInvert || ''}
          onChange={(e) => onChange('grepInvert', e.target.value || undefined)}
          className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-sky-500 placeholder-[#6e7681]"
          placeholder="@skip|@wip"
        />
        <p className="text-xs text-[#6e7681]">
          Regular expression to exclude tests by name. Matching tests will be skipped.
        </p>
      </div>

      {/* Common Filters */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-[#c9d1d9]">
          Quick Filters
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { label: '@smoke', value: '@smoke' },
            { label: '@critical', value: '@critical' },
            { label: '@regression', value: '@regression' },
            { label: '@e2e', value: '@e2e' },
            { label: '@unit', value: '@unit' },
          ].map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => {
                const current = config.grep || '';
                if (current.includes(filter.value)) {
                  onChange('grep', current.replace(new RegExp(`\\|?${filter.value}|${filter.value}\\|?`), ''));
                } else {
                  onChange('grep', current ? `${current}|${filter.value}` : filter.value);
                }
              }}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                config.grep?.includes(filter.value)
                  ? 'bg-sky-500 text-white'
                  : 'bg-[#21262d] text-[#8b949e] hover:text-white hover:bg-[#30363d]'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Last Failed */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-[#c9d1d9]">
          Run Mode
        </label>

        <label className="flex items-center gap-3 p-3 bg-[#0d1117] rounded border border-[#30363d] cursor-pointer hover:border-[#484f58]">
          <input
            type="checkbox"
            checked={config.lastFailed}
            onChange={(e) => onChange('lastFailed', e.target.checked)}
            className="w-4 h-4 rounded border-[#30363d] bg-[#0d1117] text-sky-500 focus:ring-sky-500 focus:ring-offset-[#161b22]"
          />
          <div>
            <div className="text-sm text-white">Run Last Failed</div>
            <div className="text-xs text-[#6e7681]">Only run tests that failed in the previous run</div>
          </div>
        </label>
      </div>

      {/* Filter Preview */}
      {(config.grep || config.grepInvert || config.lastFailed) && (
        <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d]">
          <label className="block text-xs font-medium text-[#8b949e] uppercase tracking-wider mb-2">
            Playwright CLI Preview
          </label>
          <code className="text-sm text-[#58a6ff] font-mono break-all">
            npx playwright test
            {config.grep && ` --grep="${config.grep}"`}
            {config.grepInvert && ` --grep-invert="${config.grepInvert}"`}
            {config.lastFailed && ' --last-failed'}
          </code>
        </div>
      )}
    </div>
  );
}
