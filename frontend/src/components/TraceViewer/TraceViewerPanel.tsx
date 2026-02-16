/**
 * TraceViewerPanel - Main component for viewing Playwright trace files
 *
 * Integrates with Playwright's trace viewer to show:
 * - Action timeline with screenshots
 * - Network requests
 * - Console output
 * - DOM snapshots
 */
import React, { useState, useCallback } from 'react';
import { ExternalLink, Download, Maximize2, Minimize2, ArrowLeft, X, Monitor, AlertCircle, FileSearch, ChevronRight } from 'lucide-react';
import { IconButton, EmptyState } from '@/components/ui';
import { launchExecutionTrace } from '@/utils/traceLaunch';

export interface TraceViewerPanelProps {
  traceUrl: string;
  testId: string;
  testName: string;
  onClose: () => void;
}

export const TraceViewerPanel: React.FC<TraceViewerPanelProps> = ({
  traceUrl,
  testId,
  testName,
  onClose,
}) => {
  const [error] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localViewerOpened, setLocalViewerOpened] = useState(false);

  // Check if running on localhost - embedded viewer won't work
  const isLocalhost = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // Default to NOT using embedded on localhost since it can't access local URLs
  const [useEmbedded, setUseEmbedded] = useState(!isLocalhost);

  // Build absolute URL for trace file
  const getAbsoluteTraceUrl = useCallback(() => {
    // If already absolute, return as is
    if (traceUrl.startsWith('http://') || traceUrl.startsWith('https://')) {
      return traceUrl;
    }
    // Build absolute URL from relative path
    return `${window.location.origin}${traceUrl.startsWith('/') ? '' : '/'}${traceUrl}`;
  }, [traceUrl]);

  const handleOpenExternal = useCallback(() => {
    // Open Playwright's trace viewer in a new tab
    const absoluteUrl = getAbsoluteTraceUrl();
    const traceViewerUrl = `https://trace.playwright.dev/?trace=${encodeURIComponent(absoluteUrl)}`;
    window.open(traceViewerUrl, '_blank');
  }, [getAbsoluteTraceUrl]);

  const handleDownloadTrace = useCallback(() => {
    // Trigger download of the trace.zip file
    const link = document.createElement('a');
    link.href = getAbsoluteTraceUrl();
    link.download = `trace-${testId}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [getAbsoluteTraceUrl, testId]);

  const extractExecutionId = useCallback(() => {
    const match = traceUrl.match(/\/api\/executions\/([^/?#]+)\/trace(?:$|[/?#])/);
    return match ? decodeURIComponent(match[1]) : null;
  }, [traceUrl]);

  const handleOpenLocalViewer = useCallback(async () => {
    // Check if this is a Docker trace URL
    const dockerMatch = traceUrl.match(/\/api\/executions\/docker\/trace\/([^/]+)\/(.+)/);
    if (dockerMatch) {
      const shard = dockerMatch[1];
      const testDir = dockerMatch[2];
      try {
        const response = await fetch(`/api/executions/docker/trace/${shard}/${testDir}/view`, {
          method: 'POST',
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok || data?.success === false) {
          throw new Error('Failed to open local trace viewer');
        }

        const traceViewerUrl =
          typeof data?.traceViewerUrl === 'string' && data.traceViewerUrl.trim()
            ? data.traceViewerUrl.trim()
            : undefined;
        const viewerUrl =
          typeof data?.viewerUrl === 'string' && data.viewerUrl.trim()
            ? data.viewerUrl.trim()
            : undefined;
        const preferredUrl = viewerUrl || traceViewerUrl;
        if (preferredUrl) {
          const popup = window.open(preferredUrl, '_blank', 'noopener,noreferrer');
          if (!popup) {
            window.location.assign(preferredUrl);
          }
        }

        setLocalViewerOpened(true);
        return;
      } catch (err) {
        console.error('Error opening Docker trace viewer:', err);
        // Fallback: open trace.playwright.dev in a new tab for drag/drop
        window.open('https://trace.playwright.dev/', '_blank');
        setLocalViewerOpened(true);
        return;
      }
    }

    const executionId = extractExecutionId();
    if (executionId && executionId.toLowerCase() !== 'local' && executionId.toLowerCase() !== 'docker') {
      const launchResult = await launchExecutionTrace({
        executionId,
        scenarioName: testName,
      });

      if (launchResult.status === 'launched') {
        setLocalViewerOpened(true);
        return;
      }

      console.error('Error opening local trace viewer:', launchResult.message);
      window.open('https://trace.playwright.dev/', '_blank');
      setLocalViewerOpened(true);
      return;
    }

    // If URL pattern does not map to an execution, keep manual fallback UX.
    window.open('https://trace.playwright.dev/', '_blank');
    setLocalViewerOpened(true);
  }, [extractExecutionId, testName, traceUrl]);

  const handleOpenTraceViewer = useCallback(() => {
    // Open trace.playwright.dev in a new tab for drag/drop
    window.open('https://trace.playwright.dev/', '_blank');
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  return (
    <div className={`flex flex-col bg-dark-bg overflow-hidden ${isFullscreen ? 'fixed inset-4 z-50 border border-border-default rounded-lg' : 'flex-1'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-dark-card/50 border-b border-border-default">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          <div className="h-5 w-px bg-dark-elevated" />
          <div className="flex items-center gap-2">
            <FileSearch className="w-4 h-4 text-status-info" />
            <span className="font-medium text-text-primary">Trace Viewer</span>
          </div>
          <ChevronRight className="w-4 h-4 text-text-secondary" />
          <span className="text-sm text-text-secondary truncate max-w-[300px]" title={testName}>
            {testName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenLocalViewer}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-brand-primary text-white hover:bg-brand-primary rounded transition-colors"
            title="Open in local Playwright trace viewer (recommended)"
          >
            <Monitor className="w-3.5 h-3.5" />
            Open Local Viewer
          </button>
          {!isLocalhost && (
            <button
              onClick={() => setUseEmbedded(!useEmbedded)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-dark-elevated/50 rounded transition-colors"
              title="Toggle embedded viewer"
            >
              {useEmbedded ? 'Local View' : 'Embedded'}
            </button>
          )}
          <button
            onClick={handleDownloadTrace}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-dark-elevated/50 rounded transition-colors"
            title="Download trace file"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
          <button
            onClick={handleOpenExternal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-dark-elevated/50 rounded transition-colors"
            title="Open in Playwright Trace Viewer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open External
          </button>
          <IconButton
            icon={isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            variant="ghost"
            tooltip={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            onClick={toggleFullscreen}
          />
        </div>
      </div>

      {/* Content */}
      {error ? (
        <EmptyState
          className="flex-1"
          icon={<X className="w-5 h-5 text-status-danger" />}
          title={error}
          action={
            <button
              onClick={handleOpenExternal}
              className="text-xs text-status-info hover:text-status-info"
            >
              Try opening in external viewer
            </button>
          }
        />
      ) : useEmbedded && !isLocalhost ? (
        // Embedded Playwright Trace Viewer (only for non-localhost)
        <div className="flex-1 flex flex-col">
          {/* Info banner about embedded viewer limitations */}
          <div className="px-4 py-2 bg-status-info/10 border-b border-status-info/20 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-status-info flex-shrink-0" />
            <span className="text-xs text-status-info">
              The embedded viewer requires your trace URL to be publicly accessible.
              If the trace doesn't load, click <strong>"Open Local Viewer"</strong> to use Playwright's native trace viewer.
            </span>
          </div>
          <iframe
            src={`https://trace.playwright.dev/?trace=${encodeURIComponent(getAbsoluteTraceUrl())}`}
            className="flex-1 w-full border-0"
            title="Playwright Trace Viewer"
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        </div>
      ) : (
        // Local viewer UI - shown for localhost or when embedded is disabled
        <div className="flex-1 flex flex-col items-center justify-center bg-dark-bg p-8">
          <div className="max-w-md text-center">
            {localViewerOpened ? (
              <>
                <div className="w-16 h-16 bg-status-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Monitor className="w-8 h-8 text-status-success" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">Trace Viewer Opened</h3>
                <p className="text-sm text-text-secondary mb-4">
                  Check your browser tabs for the Playwright Trace Viewer.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleOpenTraceViewer}
                    className="px-4 py-2 bg-brand-primary text-white rounded hover:bg-brand-primary transition-colors text-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5 inline mr-1.5" />
                    Open Trace Viewer Again
                  </button>
                  <button
                    onClick={handleDownloadTrace}
                    className="px-4 py-2 bg-dark-elevated text-text-primary rounded hover:bg-dark-elevated transition-colors text-sm"
                  >
                    <Download className="w-3.5 h-3.5 inline mr-1.5" />
                    Download Trace File
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-status-info/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileSearch className="w-8 h-8 text-status-info" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">View Trace</h3>
                <p className="text-sm text-text-secondary mb-4">
                  Open the Playwright Trace Viewer in a new tab, then drag & drop your trace file or download it first.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleOpenTraceViewer}
                    className="px-6 py-3 bg-brand-primary text-white rounded-lg hover:bg-brand-primary transition-colors font-medium"
                  >
                    <ExternalLink className="w-4 h-4 inline mr-2" />
                    Open Trace Viewer
                  </button>
                  <button
                    onClick={handleDownloadTrace}
                    className="px-4 py-2 bg-dark-elevated text-text-primary rounded hover:bg-dark-elevated transition-colors text-sm"
                  >
                    <Download className="w-3.5 h-3.5 inline mr-1.5" />
                    Download Trace File
                  </button>
                  <p className="text-xs text-text-secondary mt-2">
                    Or run: <code className="bg-dark-card px-2 py-1 rounded">npx playwright show-trace [trace.zip]</code>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TraceViewerPanel;
