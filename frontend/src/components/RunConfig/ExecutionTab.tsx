import type { RunConfiguration } from '@/store/runConfigStore';

interface ExecutionTabProps {
  config: RunConfiguration;
  onChange: <K extends keyof RunConfiguration>(field: K, value: RunConfiguration[K]) => void;
}

export function ExecutionTab({ config, onChange }: ExecutionTabProps) {
  return (
    <div className="space-y-6 max-w-2xl">
      {/* Execution Mode */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-[#c9d1d9]">
          Execution Mode
        </label>

        <div className="space-y-2">
          <label className="flex items-center gap-3 p-3 bg-[#0d1117] rounded border border-[#30363d] cursor-pointer hover:border-[#484f58]">
            <input
              type="checkbox"
              checked={config.headed}
              onChange={(e) => onChange('headed', e.target.checked)}
              className="w-4 h-4 rounded border-[#30363d] bg-[#0d1117] text-sky-500 focus:ring-sky-500 focus:ring-offset-[#161b22]"
            />
            <div>
              <div className="text-sm text-white">Headed Mode</div>
              <div className="text-xs text-[#6e7681]">Show browser window during test execution</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-[#0d1117] rounded border border-[#30363d] cursor-pointer hover:border-[#484f58]">
            <input
              type="checkbox"
              checked={config.debug}
              onChange={(e) => onChange('debug', e.target.checked)}
              className="w-4 h-4 rounded border-[#30363d] bg-[#0d1117] text-sky-500 focus:ring-sky-500 focus:ring-offset-[#161b22]"
            />
            <div>
              <div className="text-sm text-white">Debug Mode</div>
              <div className="text-xs text-[#6e7681]">Enable Playwright Inspector for step-by-step debugging</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-[#0d1117] rounded border border-[#30363d] cursor-pointer hover:border-[#484f58]">
            <input
              type="checkbox"
              checked={config.ui}
              onChange={(e) => onChange('ui', e.target.checked)}
              className="w-4 h-4 rounded border-[#30363d] bg-[#0d1117] text-sky-500 focus:ring-sky-500 focus:ring-offset-[#161b22]"
            />
            <div>
              <div className="text-sm text-white">UI Mode</div>
              <div className="text-xs text-[#6e7681]">Open Playwright UI for interactive test exploration</div>
            </div>
          </label>
        </div>
      </div>

      {/* Parallelism */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-[#c9d1d9]">
          Parallelism
        </label>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-xs text-[#8b949e]">Workers</label>
            <input
              type="number"
              min={1}
              max={32}
              value={config.workers}
              onChange={(e) => onChange('workers', parseInt(e.target.value) || 1)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
            <p className="text-xs text-[#6e7681]">Number of parallel test workers</p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs text-[#8b949e]">Quick Presets</label>
            <div className="flex gap-2">
              {[1, 2, 4, 8].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange('workers', n)}
                  className={`px-3 py-2 rounded text-sm transition-colors ${
                    config.workers === n
                      ? 'bg-sky-500 text-white'
                      : 'bg-[#21262d] text-[#8b949e] hover:text-white hover:bg-[#30363d]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sharding */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-[#c9d1d9]">
            Sharding
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!config.shards}
              onChange={(e) => {
                if (e.target.checked) {
                  onChange('shards', { current: 1, total: 4 });
                } else {
                  onChange('shards', undefined);
                }
              }}
              className="w-4 h-4 rounded border-[#30363d] bg-[#0d1117] text-sky-500 focus:ring-sky-500 focus:ring-offset-[#161b22]"
            />
            <span className="text-sm text-[#8b949e]">Enable sharding</span>
          </label>
        </div>

        {config.shards && (
          <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d] space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs text-[#8b949e]">Current Shard</label>
                <input
                  type="number"
                  min={1}
                  max={config.shards.total}
                  value={config.shards.current}
                  onChange={(e) => onChange('shards', {
                    ...config.shards!,
                    current: parseInt(e.target.value) || 1
                  })}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs text-[#8b949e]">Total Shards</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={config.shards.total}
                  onChange={(e) => onChange('shards', {
                    ...config.shards!,
                    total: parseInt(e.target.value) || 1
                  })}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <p className="text-xs text-[#6e7681]">
              Shards split tests across multiple CI jobs. Use <code className="bg-[#21262d] px-1 rounded">--shard={config.shards.current}/{config.shards.total}</code>
            </p>
          </div>
        )}
      </div>

      {/* Project Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[#c9d1d9]">
          Project (optional)
        </label>
        <input
          type="text"
          value={config.project || ''}
          onChange={(e) => onChange('project', e.target.value || undefined)}
          className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 placeholder-[#6e7681]"
          placeholder="e.g., chromium, firefox, mobile"
        />
        <p className="text-xs text-[#6e7681]">
          Run tests only for specified project from playwright.config.ts
        </p>
      </div>
    </div>
  );
}
