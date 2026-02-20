import { FileBarChart2 } from 'lucide-react';
import { Toolbar, ToolbarGroup } from '@/components/ui';

export interface WorkspaceStatusBarProps {
  showConsole: boolean;
  onToggleConsole: () => void;
  showProblems: boolean;
  onToggleProblems: () => void;
  problemCount: number;
  isRunning: boolean;
  activeTabName?: string;
  lastCompletedExecutionId: string | null;
  activeView: string;
  onViewReport: () => void;
}

export function WorkspaceStatusBar({
  showConsole,
  onToggleConsole,
  showProblems,
  onToggleProblems,
  problemCount,
  isRunning,
  activeTabName,
  lastCompletedExecutionId,
  activeView,
  onViewReport,
}: WorkspaceStatusBarProps) {
  return (
    <Toolbar position="bottom" size="sm" className="h-6 px-1 bg-dark-card">
      <ToolbarGroup>
        <button
          onClick={onToggleConsole}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${showConsole
            ? 'bg-status-success text-white'
            : 'text-text-secondary hover:text-white hover:bg-dark-elevated'
            }`}
          title="Toggle Terminal"
        >
          <span className="material-symbols-outlined text-base">terminal</span>
          <span>Terminal</span>
        </button>
        <button
          onClick={onToggleProblems}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${showProblems
            ? 'bg-status-warning text-white'
            : 'text-text-secondary hover:text-white hover:bg-dark-elevated'
            }`}
          title="Toggle Problems (Ctrl+Shift+M)"
        >
          <span className="material-symbols-outlined text-base">error</span>
          <span>Problems{problemCount > 0 ? ` (${problemCount})` : ''}</span>
        </button>
      </ToolbarGroup>

      <div className="flex-1" />

      <ToolbarGroup className="gap-3 text-xs text-text-secondary">
        {lastCompletedExecutionId && !isRunning && activeView !== 'executions' && (
          <button
            onClick={onViewReport}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded text-3xs font-medium text-status-info bg-status-info/12 border border-status-info/30 hover:bg-status-info/20 transition-colors"
          >
            <FileBarChart2 className="h-3 w-3" />
            View Report
          </button>
        )}
        {isRunning && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-status-success rounded-full animate-pulse" />
            Running
          </span>
        )}
        {activeTabName && (
          <span className="truncate max-w-[200px]">{activeTabName}</span>
        )}
      </ToolbarGroup>
    </Toolbar>
  );
}
