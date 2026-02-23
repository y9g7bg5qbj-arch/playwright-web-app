import { useState, useRef, type MutableRefObject } from 'react';
import { io, Socket } from 'socket.io-client';
import type { NestedProject } from './ExplorerPanel.js';
import type { OpenTab } from './workspace.types.js';

const API_BASE = '/api';

/** Convert a string to a PascalCase identifier (no spaces, no quotes). */
function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
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

  function cleanupRecordingState(): void {
    setIsRecording(false);
    setRecordingSessionId(null);
    explicitStopRef.current = false;
    recordingTargetTabIdRef.current = null;
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

    // Capture the active tab at recording start for deterministic insertion
    recordingTargetTabIdRef.current = getActiveTabId();

    addConsoleOutput(`Starting recording: ${scenarioName}`);
    addConsoleOutput(`URL: ${url}`);

    try {
      // Canonical recording path is /api/codegen/* (legacy /api/vero/recording/* is deprecated).
      const response = await fetch(`${API_BASE}/codegen/start`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
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
      const token = localStorage.getItem('auth_token');
      const socket = io(window.location.origin, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        auth: { token },
      });
      socketRef.current = socket;

      // Subscribe to recording session once connected
      socket.on('connect', () => {
        socket.emit('codegen:subscribe', { sessionId });
      });

      // Real-time Vero code updates
      // Capture project info at recording start for reliable refresh in callbacks
      const recProjId = activeTab?.projectId || selectedProjectId;
      const recProject = nestedProjects.find(p => p.id === recProjId);
      let fileRefreshTimer: ReturnType<typeof setTimeout> | null = null;
      socket.on('codegen:action', (data: CodegenActionEvent) => {
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
        if (fileRefreshTimer) clearTimeout(fileRefreshTimer);
        fileRefreshTimer = setTimeout(() => {
          if (recProjId && recProject?.veroPath) {
            loadProjectFiles(recProjId, recProject.veroPath);
          }
        }, 1000);
      });

      socket.on('codegen:error', (data: CodegenErrorEvent) => {
        console.error('[Recording] Error:', data.error);
        addConsoleOutput(`Recording error: ${data.error}`);
      });

      // Handle browser-close completion (only if stop was not explicitly called)
      socket.on('codegen:stopped', (data: CodegenStoppedEvent) => {
        if (explicitStopRef.current) {
          // Already handled by stopRecording() via HTTP response
          return;
        }

        addConsoleOutput('Recording completed');

        if (data.veroLines && data.veroLines.length > 0) {
          insertRecordedScenario(data.scenarioName || scenarioName, data.veroLines);
        } else {
          addConsoleOutput('No actions were recorded');
        }

        cleanupRecordingState();
      });

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
        headers: getAuthHeaders(),
      });
      const data = await response.json() as CodegenStopResponse;
      if (data.success) {
        addConsoleOutput('Recording stopped');
        // Insert using HTTP response data (avoids race with socket disconnect)
        if (data.veroLines && data.veroLines.length > 0) {
          insertRecordedScenario(data.scenarioName || 'Recorded Scenario', data.veroLines);
        } else {
          addConsoleOutput('No actions were recorded');
        }
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      addConsoleOutput(`Error stopping recording: ${error}`);
    } finally {
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
