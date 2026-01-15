/**
 * Recording Modal Component
 *
 * Modal for setting up a new recording session with Playwright codegen.
 * User enters scenario name and starting URL, then launches recording.
 */

import { useState } from 'react';

export interface RecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (scenarioName: string, url: string) => void;
  defaultUrl?: string;
}

export function RecordingModal({
  isOpen,
  onClose,
  onStart,
  defaultUrl = 'https://example.com',
}: RecordingModalProps) {
  const [scenarioName, setScenarioName] = useState('');
  const [url, setUrl] = useState(defaultUrl);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStart = () => {
    // Validate inputs
    if (!scenarioName.trim()) {
      setError('Please enter a scenario name');
      return;
    }
    if (!url.trim()) {
      setError('Please enter a starting URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL (e.g., https://example.com)');
      return;
    }

    setError(null);
    onStart(scenarioName.trim(), url.trim());
    // Reset form
    setScenarioName('');
    setUrl(defaultUrl);
  };

  const handleClose = () => {
    setError(null);
    setScenarioName('');
    setUrl(defaultUrl);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div
          className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl w-full max-w-md pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363d]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-500 text-xl icon-filled">
                  fiber_manual_record
                </span>
              </div>
              <div>
                <h2 className="text-white font-semibold text-lg">Start Recording</h2>
                <p className="text-[#8b949e] text-sm">Create a new scenario from browser actions</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-[#21262d] rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-[#8b949e]">close</span>
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                <span className="material-symbols-outlined text-lg">error</span>
                {error}
              </div>
            )}

            {/* Scenario Name */}
            <div>
              <label className="block text-[#c9d1d9] text-sm font-medium mb-2">
                Scenario Name
              </label>
              <input
                type="text"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="e.g., Login with valid credentials"
                className="w-full px-4 py-3 bg-[#0d1117] border border-[#30363d] rounded-lg text-white placeholder-[#6e7681] focus:border-[#58a6ff] focus:outline-none transition-colors"
                autoFocus
              />
              <p className="mt-1.5 text-xs text-[#8b949e]">
                This will be the name of your test scenario
              </p>
            </div>

            {/* Starting URL */}
            <div>
              <label className="block text-[#c9d1d9] text-sm font-medium mb-2">
                Starting URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-4 py-3 bg-[#0d1117] border border-[#30363d] rounded-lg text-white placeholder-[#6e7681] focus:border-[#58a6ff] focus:outline-none transition-colors font-mono text-sm"
              />
              <p className="mt-1.5 text-xs text-[#8b949e]">
                The browser will open to this URL when recording starts
              </p>
            </div>

            {/* Info Box */}
            <div className="flex gap-3 px-4 py-3 bg-[#0d1117] border border-[#30363d] rounded-lg">
              <span className="material-symbols-outlined text-[#58a6ff] text-lg shrink-0 mt-0.5">
                info
              </span>
              <div className="text-sm text-[#8b949e]">
                <p className="mb-1">
                  <span className="text-white font-medium">Playwright Codegen</span> will open a browser window for recording.
                </p>
                <p>
                  Your actions will be converted to Vero script in real-time. Close the browser when done.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#30363d]">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-[#c9d1d9] hover:bg-[#21262d] rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleStart}
              className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <span className="material-symbols-outlined text-lg icon-filled">
                fiber_manual_record
              </span>
              Start Recording
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
