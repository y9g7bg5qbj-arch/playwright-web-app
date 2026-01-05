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
        if (!response.ok) {
          throw new Error('Failed to open local trace viewer');
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

    // Check if this is a regular execution trace URL
    const match = traceUrl.match(/\/api\/executions\/([^/]+)\/trace/);
    if (match) {
      const executionId = match[1];
      try {
        const response = await fetch(`/api/executions/${executionId}/trace/view`, {
          method: 'POST',
        });
        if (!response.ok) {
          throw new Error('Failed to open local trace viewer');
        }
        // Local viewer opens in a separate window
        setLocalViewerOpened(true);
      } catch (err) {
        console.error('Error opening local trace viewer:', err);
        // Fallback: open trace.playwright.dev in a new tab for drag/drop
        window.open('https://trace.playwright.dev/', '_blank');
        setLocalViewerOpened(true);
      }
    } else {
      // If URL pattern doesn't match, open trace.playwright.dev for drag/drop
      window.open('https://trace.playwright.dev/', '_blank');
      setLocalViewerOpened(true);
    }
  }, [traceUrl]);

  const handleOpenTraceViewer = useCallback(() => {
    // Open trace.playwright.dev in a new tab for drag/drop
    window.open('https://trace.playwright.dev/', '_blank');
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  return (
    <div className={`flex flex-col bg-slate-900 overflow-hidden ${isFullscreen ? 'fixed inset-4 z-50 border border-slate-700 rounded-lg' : 'flex-1'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          <div className="h-5 w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            <FileSearch className="w-4 h-4 text-blue-400" />
            <span className="font-medium text-slate-200">Trace Viewer</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
          <span className="text-sm text-slate-400 truncate max-w-[300px]" title={testName}>
            {testName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenLocalViewer}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-blue-600 text-white hover:bg-blue-500 rounded transition-colors"
            title="Open in local Playwright trace viewer (recommended)"
          >
            <Monitor className="w-3.5 h-3.5" />
            Open Local Viewer
          </button>
          {!isLocalhost && (
            <button
              onClick={() => setUseEmbedded(!useEmbedded)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded transition-colors"
              title="Toggle embedded viewer"
            >
              {useEmbedded ? 'Local View' : 'Embedded'}
            </button>
          )}
          <button
            onClick={handleDownloadTrace}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded transition-colors"
            title="Download trace file"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
          <button
            onClick={handleOpenExternal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded transition-colors"
            title="Open in Playwright Trace Viewer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open External
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Content */}
      {error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <X className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={handleOpenExternal}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Try opening in external viewer
            </button>
          </div>
        </div>
      ) : useEmbedded && !isLocalhost ? (
        // Embedded Playwright Trace Viewer (only for non-localhost)
        <div className="flex-1 flex flex-col">
          {/* Info banner about embedded viewer limitations */}
          <div className="px-4 py-2 bg-blue-500/10 border-b border-blue-500/20 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span className="text-xs text-blue-300">
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
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 p-8">
          <div className="max-w-md text-center">
            {localViewerOpened ? (
              <>
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Monitor className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-200 mb-2">Trace Viewer Opened</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Check your browser tabs for the Playwright Trace Viewer.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleOpenTraceViewer}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors text-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5 inline mr-1.5" />
                    Open Trace Viewer Again
                  </button>
                  <button
                    onClick={handleDownloadTrace}
                    className="px-4 py-2 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors text-sm"
                  >
                    <Download className="w-3.5 h-3.5 inline mr-1.5" />
                    Download Trace File
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileSearch className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-200 mb-2">View Trace</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Open the Playwright Trace Viewer in a new tab, then drag & drop your trace file or download it first.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleOpenTraceViewer}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium"
                  >
                    <ExternalLink className="w-4 h-4 inline mr-2" />
                    Open Trace Viewer
                  </button>
                  <button
                    onClick={handleDownloadTrace}
                    className="px-4 py-2 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors text-sm"
                  >
                    <Download className="w-3.5 h-3.5 inline mr-1.5" />
                    Download Trace File
                  </button>
                  <p className="text-xs text-slate-500 mt-2">
                    Or run: <code className="bg-slate-800 px-2 py-1 rounded">npx playwright show-trace [trace.zip]</code>
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
