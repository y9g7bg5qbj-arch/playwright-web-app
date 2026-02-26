import { useState, useRef, type MutableRefObject } from 'react';
import { io, Socket } from 'socket.io-client';
import type { NestedProject } from './ExplorerPanel.js';
import type { OpenTab } from './workspace.types.js';

const API_BASE = '/api';
const SESSION_POLL_INTERVAL_MS = 1500;

/** Convert a string to a PascalCase identifier (no spaces, no quotes). */
function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function toSocketToken(headers: Record<string, string>): string | null {
  const rawAuth = headers.Authorization || headers.authorization;
  if (typeof rawAuth !== 'string') return null;
  const trimmed = rawAuth.trim();
  if (!trimmed) return null;
  return trimmed.replace(/^Bearer\s+/i, '').trim() || null;
}

/** Extract unique page names referenced as PageName.fieldName in Vero lines. */


export interface UseRecordingParams {
  socketRef: MutableRefObject<Socket | null>;
  activeTab: OpenTab | undefined;
  selectedProjectId: string | null;
  nestedProjects: NestedProject[];
  currentProjectId: string | undefined;
  getActiveTabId: () => string | null;
  getTabById: (tabId: string) => OpenTab | undefined;
  mutateTabContent: (tabId: string, updater: (prev: string) => string, options?: { markDirty?: boolean }) => void;
  addConsoleOutput: (message: string) => void;
  setShowConsole: (show: boolean) => void;
  loadProjectFiles: (projectId: string, veroPath?: string) => Promise<void>;
  getAuthHeaders: (extraHeaders?: Record<string, string>) => Record<string, string>;
  toDevRootPath: (basePath?: string) => string | undefined;
}

export interface UseRecordingReturn {
  isRecording: boolean;
  setIsRecording: (value: boolean) => void;
  showRecordingModal: boolean;
  setShowRecordingModal: (value: boolean) => void;
  recordingSessionId: string | null;
  prefilledScenarioName: string;
  setPrefilledScenarioName: (name: string) => void;
  handleRecordClick: () => void;
  startRecording: (scenarioName: string, url: string) => Promise<void>;
  stopRecording: () => Promise<void>;
}

interface CodegenStartResponse {
  success: boolean;
  sessionId?: string;
  error?: string;
}

interface CodegenStopResponse {
  success: boolean;
  scenarioName?: string;
  veroLines?: string[];
  error?: string;
  message?: string;
}

interface CodegenActionEvent {
  veroCode: string;
  pagePath?: string;
  fieldCreated?: unknown;
  duplicateWarning?: {
    newSelector: string;
    existingField: string;
    similarity: number;
    recommendation: string;
    reason: string;
  };
}

interface CodegenErrorEvent {
  sessionId: string;
  error: string;
}

interface CodegenStoppedEvent {
  sessionId: string;
  veroLines: string[];
  scenarioName: string;
}

interface CodegenSessionResponse {
  success: boolean;
  sessionId?: string;
  isActive?: boolean;
  scenarioName?: string;
  veroLines?: string[];
  error?: string;
  message?: string;
}

export function useRecording({
  socketRef,
  activeTab,
  selectedProjectId,
  nestedProjects,
  currentProjectId,
  getActiveTabId,
  getTabById,
  mutateTabContent,
  addConsoleOutput,
  setShowConsole,
  loadProjectFiles,
  getAuthHeaders,
  toDevRootPath,
}: UseRecordingParams): UseRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [recordingSessionId, setRecordingSessionId] = useState<string | null>(null);
  const [prefilledScenarioName, setPrefilledScenarioName] = useState<string>('');

  const explicitStopRef = useRef(false);
  const recordingTargetTabIdRef = useRef<string | null>(null);
  const recordingAuthHeadersRef = useRef<Record<string, string> | null>(null);
  const recordingTokenRef = useRef<string | null>(null);
  const recordingFinalizedRef = useRef(false);
  const sessionPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackNoticeShownRef = useRef(false);

  // Insert recorded scenario into the active editor
  function insertRecordedScenario(scenarioName: string, veroLines: string[]): void {
    // Generate complete Vero scenario with brace syntax
    // Scenario names must be PascalCase identifiers (no quotes)
    const stepsIndented = veroLines.map(line => `    ${line}`).join('\n');
    const veroScenario = `  scenario ${toPascalCase(scenarioName)} {\n${stepsIndented}\n  }`;

    // Prefer the tab that was active when recording started for deterministic insertion
    const targetTabId = recordingTargetTabIdRef.current || getActiveTabId();
    const currentActiveTab = targetTabId ? getTabById(targetTabId) : undefined;

    // If we have an active .vero file, insert the scenario inside the feature block
    if (currentActiveTab && currentActiveTab.name.endsWith('.vero') && targetTabId) {
      mutateTabContent(targetTabId, (prevContent) => {
        let content = prevContent;

        // Try to find closing brace of feature block (handles both `}` and `end feature`)
        // Insert the scenario before the closing brace/end-feature keyword
        if (/(\s*}\s*)$/.test(content)) {
          content = content.replace(/(\s*}\s*)$/, `\n\n${veroScenario}\n}`);
        } else if (/(\s*end\s+feature\s*)$/i.test(content)) {
          content = content.replace(/(\s*end\s+feature\s*)$/i, `\n\n${veroScenario}\n\nend feature\n`);
        } else {
          content = content + '\n\n' + veroScenario + '\n';
        }

        return content;
      }, { markDirty: true });

      addConsoleOutput(`Scenario "${scenarioName}" added to ${currentActiveTab.name}`);
    } else {
      // No .vero file open - log to console
      const newFileContent = `FEATURE RecordedTests {\n\n${veroScenario}\n\n}`;
      addConsoleOutput('No .vero file open. Recorded scenario:');
      addConsoleOutput(newFileContent);
    }
  }

  function clearSessionPolling(): void {
    if (!sessionPollIntervalRef.current) return;
    clearInterval(sessionPollIntervalRef.current);
    sessionPollIntervalRef.current = null;
  }

  function getPinnedAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
    const baseHeaders = recordingAuthHeadersRef.current || getAuthHeaders();
    return {
      ...baseHeaders,
      ...extraHeaders,
    };
  }

  function isRealtimeSubscriptionFailure(errorMessage: string): boolean {
    const normalized = errorMessage.toLowerCase();
    return normalized.includes('not authorized')
      || normalized.includes('session not found')
      || normalized.includes('authentication error');
  }

  function finalizeRecording(
    scenarioName: string,
    veroLines: string[],
    completionMessage: string,
  ): void {
    if (recordingFinalizedRef.current) return;
    recordingFinalizedRef.current = true;
    clearSessionPolling();

    addConsoleOutput(completionMessage);

    if (veroLines.length > 0) {
      insertRecordedScenario(scenarioName, veroLines);
    } else {
      addConsoleOutput('No actions were recorded');
    }

    cleanupRecordingState();
  }

  function cleanupRecordingState(): void {
    clearSessionPolling();
    if (fileRefreshTimerRef.current) {
      clearTimeout(fileRefreshTimerRef.current);
      fileRefreshTimerRef.current = null;
    }

    setIsRecording(false);
    setRecordingSessionId(null);
    explicitStopRef.current = false;
    recordingTargetTabIdRef.current = null;
    recordingAuthHeadersRef.current = null;
    recordingTokenRef.current = null;
    fallbackNoticeShownRef.current = false;

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }

  function deriveSandboxPath(): string | undefined {
    if (activeTab?.path) {
      const match = activeTab.path.match(/^(.+?)\/(Features|Pages|PageActions)\//);
      if (match) return match[1];
    }
    // Fallback: use the project's dev root (never project root).
    const projId = activeTab?.projectId || selectedProjectId;
    if (projId) {
      return toDevRootPath(nestedProjects.find(p => p.id === projId)?.veroPath);
    }
    return undefined;
  }

  async function startRecording(scenarioName: string, url: string): Promise<void> {
    setShowRecordingModal(false);
    setIsRecording(true);
    setShowConsole(true);
    explicitStopRef.current = false;
    recordingFinalizedRef.current = false;
    fallbackNoticeShownRef.current = false;

    // Capture the active tab at recording start for deterministic insertion
    recordingTargetTabIdRef.current = getActiveTabId();

    addConsoleOutput(`Starting recording: ${scenarioName}`);
    addConsoleOutput(`URL: ${url}`);

    try {
      const startHeaders = getAuthHeaders({ 'Content-Type': 'application/json' });
      recordingAuthHeadersRef.current = { ...startHeaders };
      recordingTokenRef.current = toSocketToken(startHeaders) || localStorage.getItem('auth_token');

      // Canonical recording path is /api/codegen/* (legacy /api/vero/recording/* is deprecated).
      const response = await fetch(`${API_BASE}/codegen/start`, {
        method: 'POST',
        headers: startHeaders,
        credentials: 'include',
        body: JSON.stringify({
          url,
          scenarioName,
          projectId: currentProjectId,
          sandboxPath: deriveSandboxPath(),
        }),
      });

      const data = await response.json() as CodegenStartResponse;
      if (!data.success) {
        throw new Error(data.error || 'Failed to start recording');
      }

      // Use server-generated session ID
      const sessionId = data.sessionId;
      if (!sessionId) {
        throw new Error('Failed to start recording: missing session ID');
      }
      setRecordingSessionId(sessionId);

      // Connect to WebSocket for real-time updates (after we have the session ID)
      // Real-time Vero code updates
      // Capture project info at recording start for reliable refresh in callbacks
      const recProjId = activeTab?.projectId || selectedProjectId;
      const recProject = nestedProjects.find(p => p.id === recProjId);

      const connectRecordingSocket = (socketToken: string | null) => {
        const nextSocket = io(window.location.origin, {
          path: '/socket.io',
          transports: ['websocket', 'polling'],
          auth: socketToken ? { token: socketToken } : {},
          withCredentials: true,
        });
        socketRef.current = nextSocket;

        // Subscribe to recording session once connected
        nextSocket.on('connect', () => {
          nextSocket.emit('codegen:subscribe', { sessionId });
        });

        nextSocket.on('codegen:action', (data: CodegenActionEvent) => {
          addConsoleOutput(`  Recording: ${data.veroCode}`);

          // Surface duplicate selector warnings from backend
          if (data.duplicateWarning) {
            addConsoleOutput(
              `  Warning: Possible duplicate selector - ${data.duplicateWarning.reason} ` +
              `(existing: ${data.duplicateWarning.existingField}, ` +
              `recommendation: ${data.duplicateWarning.recommendation})`
            );
          }

          // Debounced file tree refresh during recording to pick up new page files
          if (fileRefreshTimerRef.current) clearTimeout(fileRefreshTimerRef.current);
          fileRefreshTimerRef.current = setTimeout(() => {
            if (recProjId && recProject?.veroPath) {
              loadProjectFiles(recProjId, recProject.veroPath);
            }
          }, 1000);
        });

        nextSocket.on('codegen:error', (data: CodegenErrorEvent) => {
          console.error('[Recording] Error:', data.error);
          addConsoleOutput(`Recording error: ${data.error}`);
          if (isRealtimeSubscriptionFailure(data.error) && !fallbackNoticeShownRef.current) {
            fallbackNoticeShownRef.current = true;
            addConsoleOutput('Realtime recording channel is unavailable; waiting for backend completion via session polling.');
          }
        });

        nextSocket.on('connect_error', (error: Error) => {
          addConsoleOutput(`Recording socket connection failed: ${error.message}`);
          if (isRealtimeSubscriptionFailure(error.message) && !fallbackNoticeShownRef.current) {
            fallbackNoticeShownRef.current = true;
            addConsoleOutput('Realtime recording channel is unavailable; waiting for backend completion via session polling.');
          }
        });

        // Handle browser-close completion (only if stop was not explicitly called)
        nextSocket.on('codegen:stopped', (data: CodegenStoppedEvent) => {
          if (explicitStopRef.current) {
            // Already handled by stopRecording() via HTTP response
            return;
          }

          finalizeRecording(
            data.scenarioName || scenarioName,
            data.veroLines || [],
            'Recording completed',
          );
        });
      };

      const pollSessionStatus = async () => {
        if (recordingFinalizedRef.current) return;

        try {
          const sessionResponse = await fetch(`${API_BASE}/codegen/session/${sessionId}`, {
            method: 'GET',
            headers: getPinnedAuthHeaders(),
            credentials: 'include',
          });

          if (!sessionResponse.ok) {
            return;
          }

          const sessionData = await sessionResponse.json() as CodegenSessionResponse;
          if (!sessionData.success) {
            return;
          }

          if (sessionData.isActive === false) {
            finalizeRecording(
              sessionData.scenarioName || scenarioName,
              sessionData.veroLines || [],
              'Recording completed',
            );
          }
        } catch (pollError) {
          console.error('[Recording] Session polling error:', pollError);
        }
      };

      clearSessionPolling();
      sessionPollIntervalRef.current = setInterval(() => {
        void pollSessionStatus();
      }, SESSION_POLL_INTERVAL_MS);
      void pollSessionStatus();

      connectRecordingSocket(recordingTokenRef.current);

      addConsoleOutput('Playwright Codegen browser launched');
      addConsoleOutput('Record your actions, then close the browser when done');
    } catch (error) {
      console.error('Failed to start recording:', error);
      addConsoleOutput(`Error: ${error}`);
      cleanupRecordingState();
    }
  }

  async function stopRecording(): Promise<void> {
    if (!recordingSessionId) {
      setIsRecording(false);
      return;
    }

    explicitStopRef.current = true;

    try {
      addConsoleOutput('Stopping recording...');
      // Canonical recording path is /api/codegen/* (legacy /api/vero/recording/* is deprecated).
      const response = await fetch(`${API_BASE}/codegen/stop/${recordingSessionId}`, {
        method: 'POST',
        headers: getPinnedAuthHeaders(),
        credentials: 'include',
      });
      const data = await response.json() as CodegenStopResponse;
      if (response.ok && data.success) {
        finalizeRecording(
          data.scenarioName || 'Recorded Scenario',
          data.veroLines || [],
          'Recording stopped',
        );
      } else {
        addConsoleOutput(`Error stopping recording: ${data.error || data.message || `HTTP ${response.status}`}`);
        cleanupRecordingState();
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      addConsoleOutput(`Error stopping recording: ${error}`);
      cleanupRecordingState();
    }
  }

  const handleRecordClick = () => setShowRecordingModal(true);

  return {
    isRecording,
    setIsRecording,
    showRecordingModal,
    setShowRecordingModal,
    recordingSessionId,
    prefilledScenarioName,
    setPrefilledScenarioName,
    handleRecordClick,
    startRecording,
    stopRecording,
  };
}
