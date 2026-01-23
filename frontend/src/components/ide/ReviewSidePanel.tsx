/**
 * ReviewSidePanel - Shows sessions needing attention (human_review or stuck)
 *
 * This panel is always visible on the right side when there are sessions
 * that need user attention.
 * Force Rebuild
 */

import { useState, useEffect, useCallback } from 'react';
import { listSessions, deleteSession, type AIRecorderSession } from '@/api/aiRecorder';

interface ReviewSession {
  id: string;
  status: 'human_review' | 'stuck' | 'processing';
  testCaseName: string;
  completedSteps: number;
  totalSteps: number;
  stuckAtStep?: number;
  createdAt: string;
}

interface ReviewSidePanelProps {
  onSelectSession: (sessionId: string) => void;
  onOpenAIStudio: () => void;
}

export function ReviewSidePanel({ onSelectSession, onOpenAIStudio }: ReviewSidePanelProps) {
  const [sessions, setSessions] = useState<ReviewSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  const handleDeleteSession = useCallback(async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this session?')) {
      return;
    }
    setDeletingSessionId(sessionId);
    try {
      await deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('Failed to delete session');
    } finally {
      setDeletingSessionId(null);
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      const allSessions = await listSessions();
      // Filter sessions that need attention
      const needsAttention = allSessions
        .filter((s: AIRecorderSession) =>
          s.status === 'human_review' ||
          s.status === 'stuck' ||
          (s.status === 'processing' && s.testCases?.some(tc => tc.status === 'stuck'))
        )
        .map((s: AIRecorderSession) => {
          const testCase = s.testCases?.[0];
          const stuckStep = testCase?.steps?.find(step => step.status === 'stuck');
          return {
            id: s.id,
            status: s.status as 'human_review' | 'stuck' | 'processing',
            testCaseName: testCase?.name || 'Unknown Test',
            completedSteps: testCase?.steps?.filter(step => step.status === 'success').length || 0,
            totalSteps: testCase?.steps?.length || 0,
            stuckAtStep: stuckStep?.stepNumber,
            createdAt: s.createdAt,
          };
        });
      setSessions(needsAttention);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  // Don't render if no sessions need attention
  if (!isLoading && sessions.length === 0) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'human_review':
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
            Review
          </span>
        );
      case 'stuck':
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
            Stuck
          </span>
        );
      case 'processing':
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
            Processing
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'human_review':
        return 'rate_review';
      case 'stuck':
        return 'error';
      case 'processing':
        return 'hourglass_top';
      default:
        return 'help';
    }
  };

  return (
    <aside
      className={`flex flex-col bg-[#161b22] border-l border-[#30363d] shrink-0 transition-all duration-200 ${isCollapsed ? 'w-12' : 'w-[280px]'
        }`}
    >
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-3 border-b border-[#30363d] bg-[#21262d]">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-400 text-lg">notifications_active</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#e6edf3]">
              Needs Attention
            </span>
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400">
              {sessions.length}
            </span>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded hover:bg-[#30363d] text-[#8b949e] hover:text-white transition-colors"
          title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
        >
          <span className="material-symbols-outlined text-lg">
            {isCollapsed ? 'chevron_left' : 'chevron_right'}
          </span>
        </button>
      </div>

      {/* Collapsed state - just icons */}
      {isCollapsed ? (
        <div className="flex-1 flex flex-col items-center py-4 gap-3">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => {
                setIsCollapsed(false);
                onSelectSession(session.id);
              }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${session.status === 'human_review'
                  ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                  : session.status === 'stuck'
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                }`}
              title={`${session.testCaseName} - ${session.status}`}
            >
              <span className="material-symbols-outlined text-lg">
                {getStatusIcon(session.status)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <>
          {/* Session List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500"></div>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] hover:border-[#58a6ff] transition-colors cursor-pointer"
                    onClick={() => onSelectSession(session.id)}
                  >
                    {/* Session Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`material-symbols-outlined text-lg ${session.status === 'human_review' ? 'text-amber-400' :
                            session.status === 'stuck' ? 'text-red-400' : 'text-blue-400'
                          }`}>
                          {getStatusIcon(session.status)}
                        </span>
                        <span className="text-sm font-medium text-[#e6edf3] truncate">
                          {session.testCaseName}
                        </span>
                      </div>
                      {getStatusBadge(session.status)}
                    </div>

                    {/* Progress */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-xs text-[#8b949e] mb-1">
                        <span>Progress</span>
                        <span>{session.completedSteps}/{session.totalSteps} steps</span>
                      </div>
                      <div className="h-1.5 bg-[#21262d] rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${session.status === 'stuck' ? 'bg-red-500' :
                              session.status === 'human_review' ? 'bg-amber-500' : 'bg-blue-500'
                            }`}
                          style={{ width: `${(session.completedSteps / session.totalSteps) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Stuck Info */}
                    {session.stuckAtStep && (
                      <div className="text-xs text-red-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">warning</span>
                        Stuck at step {session.stuckAtStep}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSession(session.id);
                          onOpenAIStudio();
                        }}
                        className="flex-1 px-2 py-1.5 text-xs bg-[#238636] hover:bg-[#2ea043] text-white rounded transition-colors flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                        {session.status === 'human_review' ? 'Review' : 'Resolve'}
                      </button>
                      <button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        disabled={deletingSessionId === session.id}
                        className="px-2 py-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors flex items-center justify-center disabled:opacity-50"
                        title="Delete session"
                      >
                        {deletingSessionId === session.id ? (
                          <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                        ) : (
                          <span className="material-symbols-outlined text-sm">delete</span>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-[#30363d] space-y-2">
            <button
              onClick={onOpenAIStudio}
              className="w-full px-3 py-2 text-xs bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              Open AI Studio
            </button>
            {sessions.length > 0 && (
              <button
                onClick={async () => {
                  if (!confirm(`Delete all ${sessions.length} session(s)?`)) return;
                  for (const session of sessions) {
                    try {
                      await deleteSession(session.id);
                    } catch (error) {
                      console.error(`Failed to delete session ${session.id}:`, error);
                    }
                  }
                  setSessions([]);
                }}
                className="w-full px-3 py-2 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">delete_sweep</span>
                Delete All Sessions
              </button>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

export default ReviewSidePanel;
