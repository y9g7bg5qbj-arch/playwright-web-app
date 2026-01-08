/**
 * GitHubRunModal - Simplified modal for running tests on GitHub Actions
 */
import React, { useState } from 'react';
import { X, Github, Play, Monitor, Layers, Cpu, ExternalLink, Clock } from 'lucide-react';

interface GitHubRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRun: (config: GitHubRunConfig) => void;
  fileName?: string;
  isConnected: boolean;
}

export interface GitHubRunConfig {
  browser: 'chromium' | 'firefox' | 'webkit';
  browsers: string[]; // For multi-browser
  workers: number;    // Parallel browsers per job
  shards: number;     // Number of parallel jobs
}

const BROWSERS = [
  { value: 'chromium', label: 'Chromium', icon: '🌐' },
  { value: 'firefox', label: 'Firefox', icon: '🦊' },
  { value: 'webkit', label: 'WebKit/Safari', icon: '🧭' },
];

export const GitHubRunModal: React.FC<GitHubRunModalProps> = ({
  isOpen,
  onClose,
  onRun,
  fileName,
  isConnected,
}) => {
  const [browser, setBrowser] = useState<'chromium' | 'firefox' | 'webkit'>('chromium');
  const [selectedBrowsers, setSelectedBrowsers] = useState<string[]>(['chromium']);
  const [workers, setWorkers] = useState(2);
  const [shards, setShards] = useState(1);
  const [multiBrowser, setMultiBrowser] = useState(false);

  // Calculate totals
  const totalBrowsers = multiBrowser ? selectedBrowsers.length : 1;
  const totalJobs = shards * totalBrowsers;
  const totalParallel = workers * totalJobs;

  // Estimate time (assuming 10 min baseline for single browser, single worker)
  const baselineMinutes = 10;
  const estimatedMinutes = Math.ceil(baselineMinutes / (workers * shards));

  const handleRun = () => {
    onRun({
      browser,
      browsers: multiBrowser ? selectedBrowsers : [browser],
      workers,
      shards,
    });
    onClose();
  };

  const toggleBrowser = (browserValue: string) => {
    setSelectedBrowsers(prev => {
      if (prev.includes(browserValue)) {
        // Don't allow removing last browser
        if (prev.length === 1) return prev;
        return prev.filter(b => b !== browserValue);
      }
      return [...prev, browserValue];
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 bg-gradient-to-r from-purple-900/30 to-gray-900">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600/20 rounded-lg">
              <Github className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Run on GitHub Actions</h2>
              {fileName && (
                <p className="text-xs text-gray-400 truncate max-w-[200px]">{fileName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {!isConnected ? (
            <div className="text-center py-6">
              <Github className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">GitHub not connected</p>
              <p className="text-sm text-gray-500 mt-1">
                Connect your GitHub account in Settings to run tests on GitHub Actions
              </p>
            </div>
          ) : (
            <>
              {/* Browser Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                    <Monitor className="w-4 h-4" />
                    Browser
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={multiBrowser}
                      onChange={(e) => setMultiBrowser(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-purple-500"
                    />
                    Multi-browser
                  </label>
                </div>

                {multiBrowser ? (
                  <div className="flex gap-2">
                    {BROWSERS.map((b) => (
                      <button
                        key={b.value}
                        onClick={() => toggleBrowser(b.value)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm transition-all ${
                          selectedBrowsers.includes(b.value)
                            ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        <span>{b.icon}</span>
                        <span className="hidden sm:inline">{b.label.split('/')[0]}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {BROWSERS.map((b) => (
                      <button
                        key={b.value}
                        onClick={() => setBrowser(b.value as any)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm transition-all ${
                          browser === b.value
                            ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        <span>{b.icon}</span>
                        <span className="hidden sm:inline">{b.label.split('/')[0]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Workers (parallel browsers per job) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                    <Cpu className="w-4 h-4" />
                    Workers per Job
                  </label>
                  <span className="text-sm text-purple-400 font-mono">{workers}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={4}
                  value={workers}
                  onChange={(e) => setWorkers(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                </div>
                <p className="text-xs text-gray-500">
                  Parallel browser instances on each GitHub runner
                </p>
              </div>

              {/* Shards (parallel jobs) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                    <Layers className="w-4 h-4" />
                    Parallel Jobs (Shards)
                  </label>
                  <span className="text-sm text-purple-400 font-mono">{shards}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={4}
                  value={shards}
                  onChange={(e) => setShards(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                </div>
                <p className="text-xs text-gray-500">
                  Separate GitHub runner VMs running in parallel
                </p>
              </div>

              {/* Summary Card */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Total parallel browsers:</span>
                  <span className="text-white font-semibold">{totalParallel}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">GitHub Jobs:</span>
                  <span className="text-white">{totalJobs} jobs</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Est. execution time:</span>
                  <span className="text-green-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    ~{estimatedMinutes} min
                  </span>
                </div>
                {(workers > 1 || shards > 1) && (
                  <p className="text-xs text-green-400/70 pt-1 border-t border-gray-700">
                    {Math.round((1 - estimatedMinutes / baselineMinutes) * 100)}% faster than single runner
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-800 bg-gray-800/30">
          <a
            href="https://github.com/y9g7bg5qbj-arch/playwright-web-app/actions"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-purple-400 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View on GitHub
          </a>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRun}
              disabled={!isConnected}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg font-medium transition-colors ${
                isConnected
                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Play className="w-4 h-4" />
              Run on GitHub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GitHubRunModal;
