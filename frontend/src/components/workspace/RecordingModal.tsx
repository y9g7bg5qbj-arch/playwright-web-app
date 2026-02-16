/**
 * Recording Modal Component
 *
 * Modal for setting up a new recording session with Playwright codegen.
 * User enters scenario name and starting URL, then launches recording.
 */

import { useState, useEffect } from 'react';
import { Modal, Button } from '@/components/ui';

export interface RecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (scenarioName: string, url: string) => void;
  defaultUrl?: string;
  defaultScenarioName?: string;
}

export function RecordingModal({
  isOpen,
  onClose,
  onStart,
  defaultUrl = 'https://example.com',
  defaultScenarioName = '',
}: RecordingModalProps) {
  const [scenarioName, setScenarioName] = useState(defaultScenarioName);
  const [url, setUrl] = useState(defaultUrl);
  const [error, setError] = useState<string | null>(null);

  // Sync scenario name when modal opens with a prefilled value
  useEffect(() => {
    if (isOpen && defaultScenarioName) {
      setScenarioName(defaultScenarioName);
    }
  }, [isOpen, defaultScenarioName]);

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
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Start Recording"
      description="Create a new scenario from browser actions"
      size="md"
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="lg"
            leftIcon={
              <span className="material-symbols-outlined text-lg icon-filled">
                fiber_manual_record
              </span>
            }
            onClick={handleStart}
          >
            Start Recording
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-status-danger/10 border border-status-danger/20 rounded-lg text-status-danger text-sm">
            <span className="material-symbols-outlined text-lg">error</span>
            {error}
          </div>
        )}

        {/* Scenario Name */}
        <div>
          <label className="block text-text-primary text-sm font-medium mb-2">
            Scenario Name
          </label>
          <input
            type="text"
            value={scenarioName}
            onChange={(e) => setScenarioName(e.target.value)}
            placeholder="e.g., Login with valid credentials"
            className="w-full px-4 py-3 bg-dark-canvas border border-border-default rounded-lg text-white placeholder-text-muted focus:border-brand-primary focus:outline-none transition-colors"
            autoFocus
          />
          <p className="mt-1.5 text-xs text-text-secondary">
            This will be the name of your test scenario
          </p>
        </div>

        {/* Starting URL */}
        <div>
          <label className="block text-text-primary text-sm font-medium mb-2">
            Starting URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-4 py-3 bg-dark-canvas border border-border-default rounded-lg text-white placeholder-text-muted focus:border-brand-primary focus:outline-none transition-colors font-mono text-sm"
          />
          <p className="mt-1.5 text-xs text-text-secondary">
            The browser will open to this URL when recording starts
          </p>
        </div>

        {/* Info Box */}
        <div className="flex gap-3 px-4 py-3 bg-dark-canvas border border-border-default rounded-lg">
          <span className="material-symbols-outlined text-status-info text-lg shrink-0 mt-0.5">
            info
          </span>
          <div className="text-sm text-text-secondary">
            <p className="mb-1">
              <span className="text-white font-medium">Playwright Codegen</span> will open a browser window for recording.
            </p>
            <p>
              Your actions will be converted to Vero script in real-time. Close the browser when done.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
