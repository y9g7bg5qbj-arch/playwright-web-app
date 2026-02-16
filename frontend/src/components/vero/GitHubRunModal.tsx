/**
 * GitHubRunModal - Simplified modal for running tests on GitHub Actions
 */
import React, { useState } from 'react';
import { Github, Play, Monitor, Layers, Cpu, ExternalLink, Clock } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { useRunConfigStore } from '@/store/runConfigStore';

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

  const repository = useRunConfigStore((s) => s.getActiveConfig()?.github?.repository);
  const actionsUrl = repository
    ? `https://github.com/${repository}/actions`
    : null;

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Run on GitHub Actions"
      description={fileName}
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          {actionsUrl ? (
            <a
              href={actionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-accent-purple transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View on GitHub
            </a>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button
              variant="primary"
              className="!bg-accent-purple hover:!bg-accent-purple/90"
              onClick={handleRun}
              disabled={!isConnected}
              leftIcon={<Play className="w-4 h-4" />}
            >
              Run on GitHub
            </Button>
          </div>
        </div>
      }
    >
      {/* Decorative gradient banner */}
      <div className="bg-gradient-to-r from-accent-purple/30 to-transparent -mx-4 -mt-3 px-4 py-3 mb-3 flex items-center gap-3">
        <div className="p-2 bg-accent-purple/20 rounded-lg">
          <Github className="w-5 h-5 text-accent-purple" />
        </div>
      </div>

      <div className="space-y-5">
        {!isConnected ? (
          <div className="text-center py-6">
            <Github className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary">GitHub not connected</p>
            <p className="text-sm text-text-secondary mt-1">
              Connect your GitHub account in Settings to run tests on GitHub Actions
            </p>
          </div>
        ) : (
          <>
            {/* Browser Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
                  <Monitor className="w-4 h-4" />
                  Browser
                </label>
                <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={multiBrowser}
                    onChange={(e) => setMultiBrowser(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border-default bg-dark-card text-accent-purple"
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
                          ? 'bg-accent-purple/20 border-accent-purple text-accent-purple'
                          : 'bg-dark-card border-border-default text-text-secondary hover:border-border-default'
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
                          ? 'bg-accent-purple/20 border-accent-purple text-accent-purple'
                          : 'bg-dark-card border-border-default text-text-secondary hover:border-border-default'
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
                <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
                  <Cpu className="w-4 h-4" />
                  Workers per Job
                </label>
                <span className="text-sm text-accent-purple font-mono">{workers}</span>
              </div>
              <input
                type="range"
                min={1}
                max={4}
                value={workers}
                onChange={(e) => setWorkers(parseInt(e.target.value))}
                className="w-full h-2 bg-dark-card rounded-lg appearance-none cursor-pointer accent-accent-purple"
              />
              <div className="flex justify-between text-xs text-text-secondary">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
              </div>
              <p className="text-xs text-text-secondary">
                Parallel browser instances on each GitHub runner
              </p>
            </div>

            {/* Shards (parallel jobs) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
                  <Layers className="w-4 h-4" />
                  Parallel Jobs (Shards)
                </label>
                <span className="text-sm text-accent-purple font-mono">{shards}</span>
              </div>
              <input
                type="range"
                min={1}
                max={4}
                value={shards}
                onChange={(e) => setShards(parseInt(e.target.value))}
                className="w-full h-2 bg-dark-card rounded-lg appearance-none cursor-pointer accent-accent-purple"
              />
              <div className="flex justify-between text-xs text-text-secondary">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
              </div>
              <p className="text-xs text-text-secondary">
                Separate GitHub runner VMs running in parallel
              </p>
            </div>

            {/* Summary Card */}
            <div className="bg-dark-card/50 border border-border-default rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Total parallel browsers:</span>
                <span className="text-white font-semibold">{totalParallel}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">GitHub Jobs:</span>
                <span className="text-white">{totalJobs} jobs</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Est. execution time:</span>
                <span className="text-status-success flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  ~{estimatedMinutes} min
                </span>
              </div>
              {(workers > 1 || shards > 1) && (
                <p className="text-xs text-status-success/70 pt-1 border-t border-border-default">
                  {Math.round((1 - estimatedMinutes / baselineMinutes) * 100)}% faster than single runner
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default GitHubRunModal;
