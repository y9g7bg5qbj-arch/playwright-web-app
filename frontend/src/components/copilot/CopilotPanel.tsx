/**
 * CopilotPanel - VS Code Copilot-style chat sidebar
 *
 * A conversational interface for the Vero Copilot Agent that allows users to
 * describe tests in plain English and receive generated Vero code.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bot,
  Send,
  Loader2,
  X,
  Check,
  RefreshCw,
  AlertCircle,
  Globe,
  Code,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Settings,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { AISettingsModal } from './AISettingsModal';

// ============================================
// Types
// ============================================

type AgentState =
  | 'idle'
  | 'analyzing'
  | 'clarifying'
  | 'exploring'
  | 'generating'
  | 'validating'
  | 'reflecting'
  | 'staging'
  | 'awaiting_approval'
  | 'merging'
  | 'complete'
  | 'error';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    state?: AgentState;
    clarification?: ClarificationRequest;
    stagedChanges?: string[];
  };
}

interface ClarificationRequest {
  id: string;
  question: string;
  options?: ClarificationOption[];
  type: 'selector' | 'action' | 'info' | 'confirmation';
}

interface ClarificationOption {
  id: string;
  label: string;
  description?: string;
}

interface ExplorationUpdate {
  status: 'starting' | 'observing' | 'acting' | 'extracting' | 'completed' | 'failed';
  url?: string;
  screenshot?: string; // Base64 encoded
  discoveredElements?: DiscoveredElement[];
  message?: string;
}

interface DiscoveredElement {
  description: string;
  selector: string;
  selectorType: string;
  confidence: number;
}

interface StagedChange {
  id: string;
  filePath: string;
  changeType: 'create' | 'modify' | 'delete';
  newContent: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface CopilotPanelProps {
  projectId: string;
  onCodeGenerated?: (code: string, filePath: string) => void;
  className?: string;
}

// ============================================
// State Badge Component
// ============================================

function StateBadge({ state }: { state: AgentState }) {
  const stateConfig: Record<AgentState, { label: string; color: string; icon: React.ReactNode }> = {
    idle: { label: 'Ready', color: 'bg-gray-100 text-gray-600', icon: <Bot className="w-3 h-3" /> },
    analyzing: { label: 'Analyzing', color: 'bg-blue-100 text-blue-600', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    clarifying: { label: 'Needs Input', color: 'bg-yellow-100 text-yellow-600', icon: <AlertCircle className="w-3 h-3" /> },
    exploring: { label: 'Exploring', color: 'bg-purple-100 text-purple-600', icon: <Globe className="w-3 h-3 animate-pulse" /> },
    generating: { label: 'Generating', color: 'bg-green-100 text-green-600', icon: <Code className="w-3 h-3" /> },
    validating: { label: 'Validating', color: 'bg-blue-100 text-blue-600', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    reflecting: { label: 'Reflecting', color: 'bg-orange-100 text-orange-600', icon: <RefreshCw className="w-3 h-3 animate-spin" /> },
    staging: { label: 'Staging', color: 'bg-indigo-100 text-indigo-600', icon: <Code className="w-3 h-3" /> },
    awaiting_approval: { label: 'Review', color: 'bg-yellow-100 text-yellow-700', icon: <AlertCircle className="w-3 h-3" /> },
    merging: { label: 'Merging', color: 'bg-green-100 text-green-600', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    complete: { label: 'Complete', color: 'bg-green-100 text-green-600', icon: <Check className="w-3 h-3" /> },
    error: { label: 'Error', color: 'bg-red-100 text-red-600', icon: <X className="w-3 h-3" /> },
  };

  const config = stateConfig[state];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

// ============================================
// Message Component
// ============================================

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-blue-500' : 'bg-gradient-to-br from-purple-500 to-pink-500'
        }`}
      >
        {isUser ? (
          <span className="text-white text-sm font-medium">U</span>
        ) : (
          <Sparkles className="w-4 h-4 text-white" />
        )}
      </div>

      <div className={`flex-1 ${isUser ? 'text-right' : ''}`}>
        <div
          className={`inline-block max-w-[85%] px-4 py-2 rounded-2xl ${
            isUser
              ? 'bg-purple-600 text-white rounded-br-md'
              : 'bg-gray-800 text-gray-100 rounded-bl-md'
          }`}
        >
          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Clarification Component
// ============================================

function ClarificationBubble({
  clarification,
  onRespond,
}: {
  clarification: ClarificationRequest;
  onRespond: (response: string) => void;
}) {
  const [customInput, setCustomInput] = useState('');

  return (
    <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
      <div className="flex items-start gap-2 mb-3">
        <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-yellow-200">{clarification.question}</p>
      </div>

      {clarification.options && clarification.options.length > 0 ? (
        <div className="space-y-2">
          {clarification.options.map((option) => (
            <button
              key={option.id}
              onClick={() => onRespond(option.label)}
              className="w-full text-left px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 hover:border-purple-500 hover:bg-gray-700 transition-colors"
            >
              <div className="font-medium text-sm text-gray-200">{option.label}</div>
              {option.description && (
                <div className="text-xs text-gray-400 mt-0.5">{option.description}</div>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customInput.trim()) {
                onRespond(customInput.trim());
                setCustomInput('');
              }
            }}
            placeholder="Type your answer..."
            className="flex-1 px-3 py-2 text-sm border border-gray-600 rounded-lg bg-gray-800 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={() => {
              if (customInput.trim()) {
                onRespond(customInput.trim());
                setCustomInput('');
              }
            }}
            disabled={!customInput.trim()}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// Staged Changes Component
// ============================================

function StagedChangesView({
  changes,
  onApprove,
  onReject,
  onApproveAll,
}: {
  changes: StagedChange[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onApproveAll: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (changes.length === 0) return null;

  const pendingChanges = changes.filter((c) => c.status === 'pending');

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-200">
          Staged Changes ({pendingChanges.length} pending)
        </span>
        {pendingChanges.length > 0 && (
          <button
            onClick={onApproveAll}
            className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Approve All
          </button>
        )}
      </div>

      <div className="divide-y divide-gray-700">
        {changes.map((change) => (
          <div key={change.id} className="bg-gray-900">
            <div
              className="px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-800"
              onClick={() => setExpanded(expanded === change.id ? null : change.id)}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    change.changeType === 'create'
                      ? 'bg-green-900/50 text-green-400'
                      : change.changeType === 'modify'
                      ? 'bg-yellow-900/50 text-yellow-400'
                      : 'bg-red-900/50 text-red-400'
                  }`}
                >
                  {change.changeType}
                </span>
                <span className="text-sm font-mono text-gray-300">{change.filePath}</span>
              </div>
              <div className="flex items-center gap-2">
                {change.status === 'pending' && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onApprove(change.id);
                      }}
                      className="p-1 text-green-400 hover:bg-green-900/50 rounded"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onReject(change.id);
                      }}
                      className="p-1 text-red-400 hover:bg-red-900/50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
                {expanded === change.id ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </div>

            {expanded === change.id && (
              <div className="px-4 py-2 bg-gray-800">
                <pre className="text-xs font-mono overflow-x-auto p-2 bg-gray-950 text-gray-300 rounded border border-gray-700">
                  {change.newContent}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Exploration Progress Component
// ============================================

function ExplorationProgress({
  exploration,
  onClose,
}: {
  exploration: ExplorationUpdate;
  onClose?: () => void;
}) {
  const statusConfig: Record<
    ExplorationUpdate['status'],
    { label: string; color: string; icon: React.ReactNode }
  > = {
    starting: {
      label: 'Opening page...',
      color: 'text-blue-400',
      icon: <Globe className="w-4 h-4 animate-pulse" />,
    },
    observing: {
      label: 'Analyzing elements...',
      color: 'text-purple-400',
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
    },
    acting: {
      label: 'Performing action...',
      color: 'text-orange-400',
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
    },
    extracting: {
      label: 'Extracting data...',
      color: 'text-green-400',
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
    },
    completed: {
      label: 'Exploration complete',
      color: 'text-green-400',
      icon: <Check className="w-4 h-4" />,
    },
    failed: {
      label: 'Exploration failed',
      color: 'text-red-400',
      icon: <X className="w-4 h-4" />,
    },
  };

  const config = statusConfig[exploration.status];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-gray-200">Browser Exploration</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 text-xs ${config.color}`}>
            {config.icon}
            {config.label}
          </span>
          {onClose && exploration.status === 'completed' && (
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* URL */}
      {exploration.url && (
        <div className="px-4 py-1.5 text-xs text-gray-400 bg-gray-900 font-mono truncate">
          {exploration.url}
        </div>
      )}

      {/* Screenshot */}
      {exploration.screenshot && (
        <div className="p-2">
          <div className="relative rounded-lg overflow-hidden border border-gray-700 bg-gray-900">
            <img
              src={`data:image/png;base64,${exploration.screenshot}`}
              alt="Browser screenshot"
              className="w-full h-auto max-h-48 object-contain"
            />
            {exploration.status !== 'completed' && exploration.status !== 'failed' && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="bg-gray-800/90 rounded-lg px-3 py-2 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                  <span className="text-sm text-gray-200">{exploration.message || 'Processing...'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Discovered Elements Summary */}
      {exploration.discoveredElements && exploration.discoveredElements.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Code className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-300">
              Discovered {exploration.discoveredElements.length} interactive elements
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {exploration.discoveredElements.slice(0, 6).map((el, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-900/40 text-purple-300"
                title={el.selector}
              >
                {el.description.slice(0, 20)}
                {el.description.length > 20 && '...'}
              </span>
            ))}
            {exploration.discoveredElements.length > 6 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-700 text-gray-400">
                +{exploration.discoveredElements.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Status Message */}
      {exploration.message && exploration.status !== 'completed' && (
        <div className="px-4 py-2 text-xs text-gray-400">
          {exploration.message}
        </div>
      )}
    </div>
  );
}

// ============================================
// Main CopilotPanel Component
// ============================================

export function CopilotPanel({ projectId, onCodeGenerated, className = '' }: CopilotPanelProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [state, setState] = useState<AgentState>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [stagedChanges, setStagedChanges] = useState<StagedChange[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState('');
  const [currentClarification, setCurrentClarification] = useState<ClarificationRequest | null>(null);
  const [currentExploration, setCurrentExploration] = useState<ExplorationUpdate | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize socket connection and create session
  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
      auth: {
        token: localStorage.getItem('token'),
      },
    });

    newSocket.on('connect', () => {
      console.log('Copilot socket connected');
      // Reset thinking state on reconnect
      setIsThinking(false);
    });

    newSocket.on('disconnect', () => {
      console.log('Copilot socket disconnected');
      setIsThinking(false);
    });

    setSocket(newSocket);

    // Create session
    const createSession = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/copilot/sessions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ projectId }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          setSessionId(data.session.id);
          // Reset state for new session
          setIsThinking(false);
          setState('idle');

          // Join session room
          newSocket.emit('copilot:join', { sessionId: data.session.id });
        }
      } catch (error) {
        console.error('Failed to create copilot session:', error);
        setIsThinking(false);
      }
    };

    createSession();

    return () => {
      newSocket.disconnect();
    };
  }, [projectId]);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket || !sessionId) return;

    socket.on('copilot:state', (data: { state: AgentState; errorMessage?: string }) => {
      setState(data.state);
      // Reset thinking on certain state transitions
      if (['idle', 'clarifying', 'error', 'complete', 'awaiting_approval'].includes(data.state)) {
        setIsThinking(false);
      }
      if (data.state === 'error' && data.errorMessage) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'system',
            content: `Error: ${data.errorMessage}`,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    });

    socket.on('copilot:thinking', (data: { message: string }) => {
      setIsThinking(true);
      setThinkingMessage(data.message);
    });

    socket.on('copilot:message', (data: { message: Message }) => {
      setIsThinking(false);
      setMessages((prev) => [...prev, data.message]);

      // Check for clarification
      if (data.message.metadata?.clarification) {
        setCurrentClarification(data.message.metadata.clarification);
      } else {
        setCurrentClarification(null);
      }
    });

    socket.on('copilot:exploration', (data: ExplorationUpdate) => {
      // Update exploration state with screenshot and discovered elements
      setCurrentExploration(data);

      // Clear exploration view when completed (after a delay to show final state)
      if (data.status === 'completed' || data.status === 'failed') {
        setTimeout(() => {
          // Keep the exploration visible until dismissed or new message arrives
        }, 2000);
      }
    });

    socket.on('copilot:staged', async (_data: { changeIds: string[] }) => {
      // Fetch staged changes (changeIds not used - we fetch all)
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/copilot/sessions/${sessionId}/changes`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        if (response.ok) {
          const result = await response.json();
          setStagedChanges(result.changes);
        }
      } catch (error) {
        console.error('Failed to fetch staged changes:', error);
      }
    });

    socket.on('copilot:merged', (data: { changes: StagedChange[] }) => {
      setStagedChanges([]);
      // Notify parent about generated code
      data.changes.forEach((change) => {
        onCodeGenerated?.(change.newContent, change.filePath);
      });
    });

    socket.on('copilot:filesCreated', (data: { veroPath: string; createdFiles: string[]; skippedFiles: string[] }) => {
      console.log('Files created by Copilot:', data);
      // Clear exploration and thinking states
      setCurrentExploration(null);
      setIsThinking(false);
      // Notify parent to refresh file tree
      data.createdFiles.forEach((filePath) => {
        onCodeGenerated?.('', filePath); // Empty content signals file was created on disk
      });
      // Dispatch custom event for file tree refresh
      window.dispatchEvent(new CustomEvent('vero:files-changed', { detail: data }));
    });

    return () => {
      socket.off('copilot:state');
      socket.off('copilot:thinking');
      socket.off('copilot:message');
      socket.off('copilot:exploration');
      socket.off('copilot:staged');
      socket.off('copilot:merged');
      socket.off('copilot:filesCreated');
    };
  }, [socket, sessionId, onCodeGenerated]);

  // Clear exploration when code is generated (message arrives after exploration)
  useEffect(() => {
    if (state === 'generating' || state === 'staging' || state === 'awaiting_approval') {
      // Don't clear during these states - exploration may still be visible
    } else if (state === 'idle' || state === 'complete') {
      setCurrentExploration(null);
    }
  }, [state]);

  // Send message
  const sendMessage = useCallback(() => {
    if (!inputValue.trim() || !socket || !sessionId) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    socket.emit('copilot:message', { sessionId, content: inputValue.trim() });
    setInputValue('');
    setIsThinking(true);
  }, [inputValue, socket, sessionId]);

  // Handle clarification response
  const handleClarificationResponse = useCallback(
    (response: string) => {
      if (!socket || !sessionId || !currentClarification) return;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: response,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      socket.emit('copilot:clarify', {
        sessionId,
        clarificationId: currentClarification.id,
        response,
      });
      setCurrentClarification(null);
      setIsThinking(true);
    },
    [socket, sessionId, currentClarification]
  );

  // Handle change approval/rejection
  const handleApproveChange = useCallback(
    (changeId: string) => {
      if (!socket || !sessionId) return;
      socket.emit('copilot:approve', { sessionId, changeId });
      setStagedChanges((prev) =>
        prev.map((c) => (c.id === changeId ? { ...c, status: 'approved' } : c))
      );
    },
    [socket, sessionId]
  );

  const handleRejectChange = useCallback(
    (changeId: string) => {
      if (!socket || !sessionId) return;
      socket.emit('copilot:reject', { sessionId, changeId });
      setStagedChanges((prev) =>
        prev.map((c) => (c.id === changeId ? { ...c, status: 'rejected' } : c))
      );
    },
    [socket, sessionId]
  );

  const handleApproveAll = useCallback(() => {
    if (!socket || !sessionId) return;
    socket.emit('copilot:approve-all', { sessionId });
  }, [socket, sessionId]);

  // Reset session
  const handleReset = useCallback(() => {
    if (!socket || !sessionId) return;
    socket.emit('copilot:reset', { sessionId });
    setMessages([]);
    setStagedChanges([]);
    setCurrentClarification(null);
    setCurrentExploration(null);
    setState('idle');
  }, [socket, sessionId]);

  return (
    <div className={`flex flex-col h-full bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-sm text-gray-100">Vero Copilot</h2>
            <StateBadge state={state} />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg"
            title="AI Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg"
            title="Reset conversation"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-medium text-gray-100 mb-1">
              Hi! I'm Vero Copilot
            </h3>
            <p className="text-sm text-gray-400 max-w-xs mx-auto">
              Describe the test you want to create in plain English, and I'll generate the Vero
              code for you.
            </p>
            <div className="mt-4 space-y-2">
              <p className="text-xs text-gray-500">Try saying:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  'Create a login test for example.com',
                  'Test the checkout flow',
                  'Verify form validation',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInputValue(suggestion)}
                    className="text-xs px-3 py-1.5 bg-gray-800 text-gray-300 rounded-full hover:bg-gray-700"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {/* Exploration Progress with Screenshot Streaming */}
        {currentExploration && (
          <ExplorationProgress
            exploration={currentExploration}
            onClose={() => setCurrentExploration(null)}
          />
        )}

        {isThinking && !currentExploration && (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
            <span className="text-sm">{thinkingMessage || 'Thinking...'}</span>
          </div>
        )}

        {currentClarification && (
          <ClarificationBubble
            clarification={currentClarification}
            onRespond={handleClarificationResponse}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Staged Changes */}
      {stagedChanges.length > 0 && (
        <div className="px-4 pb-4">
          <StagedChangesView
            changes={stagedChanges}
            onApprove={handleApproveChange}
            onReject={handleRejectChange}
            onApproveAll={handleApproveAll}
          />
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Describe your test..."
            disabled={state !== 'idle' && state !== 'complete' && state !== 'error'}
            className="flex-1 px-4 py-2 border border-gray-600 rounded-lg bg-gray-800 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={sendMessage}
            disabled={
              !inputValue.trim() ||
              (state !== 'idle' && state !== 'complete' && state !== 'error')
            }
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* AI Settings Modal */}
      <AISettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

export default CopilotPanel;
