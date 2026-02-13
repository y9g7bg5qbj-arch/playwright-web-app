/**
 * ScenarioRow - Individual scenario in the execution report
 *
 * Shows status, scenario name, tags, duration, screenshot thumbnail, trace viewer button,
 * and always displays steps when available
 */
import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  SkipForward,
  Clock,
  FileSearch,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  ListOrdered,
  MessageSquare,
  Image,
  AlertTriangle,
  Info,
  Bug,
} from 'lucide-react';
import type { ExecutionScenario, ExecutionLog, ExecutionAttachment } from './ExecutionDashboard';

interface ScenarioRowProps {
  scenario: ExecutionScenario;
  onViewTrace: () => void;
}

const formatDuration = (ms?: number): string => {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

const getStatusIcon = (status: string, size: 'sm' | 'md' = 'md') => {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  switch (status) {
    case 'passed':
      return <CheckCircle2 className={`${sizeClass} text-green-400`} />;
    case 'failed':
      return <XCircle className={`${sizeClass} text-red-400`} />;
    case 'skipped':
      return <SkipForward className={`${sizeClass} text-yellow-400`} />;
    case 'running':
      return <Loader2 className={`${sizeClass} text-blue-400 animate-spin`} />;
    default:
      return <Clock className={`${sizeClass} text-slate-500`} />;
  }
};

const getActionLabel = (action: string): string => {
  const labels: Record<string, string> = {
    navigate: 'Navigate',
    click: 'Click',
    fill: 'Fill',
    type: 'Type',
    expect: 'Assert',
    screenshot: 'Screenshot',
    wait: 'Wait',
    hover: 'Hover',
    select: 'Select',
    check: 'Check',
    uncheck: 'Uncheck',
  };
  return labels[action] || action.charAt(0).toUpperCase() + action.slice(1);
};

export const ScenarioRow: React.FC<ScenarioRowProps> = ({
  scenario,
  onViewTrace,
}) => {
  const [showScreenshot, setShowScreenshot] = useState(false);
  const [stepsCollapsed, setStepsCollapsed] = useState(false);

  const [showLogs, setShowLogs] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<ExecutionAttachment | null>(null);

  const isFailed = scenario.status === 'failed';
  const hasError = !!scenario.error;
  const hasScreenshot = !!scenario.screenshot;
  const hasTrace = !!scenario.traceUrl;
  const hasTags = scenario.tags && scenario.tags.length > 0;
  const hasSteps = scenario.steps && scenario.steps.length > 0;
  const hasLogs = scenario.logs && scenario.logs.length > 0;
  const hasAttachments = scenario.attachments && scenario.attachments.length > 0;

  const getLogIcon = (level: ExecutionLog['level']) => {
    switch (level) {
      case 'error':
        return <XCircle className="w-3 h-3 text-red-400" />;
      case 'warn':
        return <AlertTriangle className="w-3 h-3 text-yellow-400" />;
      case 'debug':
        return <Bug className="w-3 h-3 text-slate-500" />;
      default:
        return <Info className="w-3 h-3 text-blue-400" />;
    }
  };

  const getLogColor = (level: ExecutionLog['level']) => {
    switch (level) {
      case 'error':
        return 'text-red-400';
      case 'warn':
        return 'text-yellow-400';
      case 'debug':
        return 'text-slate-500';
      default:
        return 'text-slate-300';
    }
  };

  return (
    <div
      className={`rounded-lg border transition-all ${
        isFailed
          ? 'bg-red-500/5 border-red-500/20'
          : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600/50'
      }`}
    >
      {/* Main Scenario Row */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Status Icon */}
        <div className="flex-shrink-0">{getStatusIcon(scenario.status)}</div>

        {/* Scenario Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-slate-200 font-medium">
              {scenario.name}
            </span>
            {/* Tags */}
            {hasTags && (
              <div className="flex items-center gap-1">
                {scenario.tags!.slice(0, 3).map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-1.5 py-0.5 bg-slate-700/50 text-slate-400 rounded"
                  >
                    {tag}
                  </span>
                ))}
                {scenario.tags!.length > 3 && (
                  <span className="text-xs text-slate-500">
                    +{scenario.tags!.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
          {/* Step count indicator and extras */}
          <div className="flex items-center gap-3 mt-0.5">
            {hasSteps && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <ListOrdered className="w-3 h-3" />
                {scenario.steps!.length} steps
              </span>
            )}
            {hasLogs && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowLogs(!showLogs); }}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <MessageSquare className="w-3 h-3" />
                {scenario.logs!.length} logs
              </button>
            )}
            {hasAttachments && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowAttachments(!showAttachments); }}
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                <Image className="w-3 h-3" />
                {scenario.attachments!.length} attachments
              </button>
            )}
          </div>
        </div>

        {/* Duration */}
        <div className="flex-shrink-0 text-xs text-slate-500 w-16 text-right">
          {formatDuration(scenario.duration)}
        </div>

        {/* Screenshot Thumbnail */}
        {hasScreenshot && (
          <button
            onClick={() => setShowScreenshot(!showScreenshot)}
            className="flex-shrink-0 w-10 h-7 rounded border border-slate-600 overflow-hidden hover:border-slate-500 transition-colors"
            title="View screenshot"
          >
            <img
              src={scenario.screenshot}
              alt="Screenshot"
              className="w-full h-full object-cover"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.style.display = 'none';
                const placeholder = document.createElement('div');
                placeholder.className = 'w-full h-full flex items-center justify-center bg-slate-800';
                placeholder.innerHTML = '<svg class="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="15" x2="21" y2="15"/><circle cx="8.5" cy="8.5" r="1.5"/></svg>';
                placeholder.title = 'Screenshot not available';
                img.parentElement?.appendChild(placeholder);
              }}
            />
          </button>
        )}

        {/* View Trace Button - Prominent for failed scenarios */}
        {hasTrace && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onViewTrace();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors relative z-10 cursor-pointer ${
              isFailed
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <FileSearch className="w-3.5 h-3.5" />
            View Trace
          </button>
        )}

        {/* Collapse/Expand Steps Button */}
        {hasSteps && (
          <button
            onClick={() => setStepsCollapsed(!stepsCollapsed)}
            className="flex-shrink-0 p-1 text-slate-500 hover:text-slate-300 transition-colors"
            title={stepsCollapsed ? 'Show steps' : 'Hide steps'}
          >
            {stepsCollapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Error Section (always visible for failed) */}
      {hasError && (
        <div className="px-3 pb-2">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-red-300 font-medium">Error</p>
                <p className="text-xs text-red-400/80 mt-1 font-mono whitespace-pre-wrap break-words">
                  {scenario.error}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Steps Section (visible by default, can be collapsed) */}
      {hasSteps && !stepsCollapsed && (
        <div className="px-3 pb-3">
          <div className="bg-slate-900/50 rounded-lg border border-slate-700/30 overflow-hidden">
            {/* Steps Header */}
            <div className="px-3 py-2 bg-slate-800/50 border-b border-slate-700/30 flex items-center gap-2">
              <ListOrdered className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-medium text-slate-400">
                Steps ({scenario.steps!.length})
              </span>
            </div>

            {/* Steps List */}
            <div className="divide-y divide-slate-700/30">
              {scenario.steps!.map((step, idx) => (
                <div
                  key={step.id || idx}
                  className={`flex items-center gap-3 px-3 py-2 text-xs ${
                    step.status === 'failed' ? 'bg-red-500/5' : ''
                  }`}
                >
                  {/* Step Number */}
                  <span className="w-5 h-5 rounded-full bg-slate-700/50 text-slate-500 flex items-center justify-center text-[10px] font-medium flex-shrink-0">
                    {step.stepNumber || idx + 1}
                  </span>

                  {/* Step Status Icon */}
                  <div className="flex-shrink-0">
                    {getStatusIcon(step.status, 'sm')}
                  </div>

                  {/* Action Badge */}
                  <span className="px-1.5 py-0.5 bg-slate-700/50 text-slate-400 rounded text-[10px] font-medium flex-shrink-0">
                    {getActionLabel(step.action)}
                  </span>

                  {/* Page Badge */}
                  {step.page && (
                    <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px] font-medium flex-shrink-0 border border-blue-500/30">
                      {step.page}
                    </span>
                  )}

                  {/* Description */}
                  <span className={`flex-1 truncate ${
                    step.status === 'failed' ? 'text-red-400' :
                    step.status === 'passed' ? 'text-slate-300' :
                    'text-slate-500'
                  }`}>
                    {step.description || step.selector || '-'}
                  </span>

                  {/* Selector (if different from description) */}
                  {step.selector && step.description && (
                    <span className="text-slate-600 font-mono truncate max-w-[120px]" title={step.selector}>
                      {step.selector}
                    </span>
                  )}

                  {/* Step Screenshot Thumbnail */}
                  {step.screenshot && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAttachment({
                          id: step.id,
                          name: step.description || 'Screenshot',
                          type: 'screenshot',
                          path: step.screenshot!,
                          timestamp: step.startedAt || new Date().toISOString(),
                          description: `Step ${step.stepNumber}: ${step.description || step.action}`
                        });
                      }}
                      className="flex-shrink-0 w-8 h-6 rounded border border-slate-600 overflow-hidden hover:border-blue-400 transition-colors"
                      title="View screenshot"
                    >
                      <img
                        src={step.screenshot}
                        alt="Step screenshot"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          img.style.display = 'none';
                          const placeholder = document.createElement('div');
                          placeholder.className = 'w-full h-full flex items-center justify-center bg-slate-800';
                          placeholder.title = 'Screenshot not available';
                          placeholder.innerHTML = '<svg class="w-3 h-3 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="15" x2="21" y2="15"/></svg>';
                          img.parentElement?.appendChild(placeholder);
                        }}
                      />
                    </button>
                  )}

                  {/* Duration */}
                  <span className="text-slate-600 flex-shrink-0 w-12 text-right">
                    {formatDuration(step.duration)}
                  </span>
                </div>
              ))}
            </div>

            {/* Step Error (if any step failed) */}
            {scenario.steps!.some(s => s.error) && (
              <div className="px-3 py-2 border-t border-slate-700/30 bg-red-500/5">
                {scenario.steps!.filter(s => s.error).map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-red-400 font-medium">Step {step.stepNumber}: </span>
                      <span className="text-red-400/80 font-mono">{step.error}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Logs Section */}
      {showLogs && hasLogs && (
        <div className="px-3 pb-3">
          <div className="bg-slate-900/50 rounded-lg border border-slate-700/30 overflow-hidden">
            <div className="px-3 py-2 bg-slate-800/50 border-b border-slate-700/30 flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-medium text-slate-400">
                Custom Logs ({scenario.logs!.length})
              </span>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {scenario.logs!.map((log, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 px-3 py-1.5 text-xs border-b border-slate-700/20 last:border-b-0"
                >
                  <span className="text-slate-600 font-mono text-[10px] flex-shrink-0 w-20">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <div className="flex-shrink-0 mt-0.5">
                    {getLogIcon(log.level)}
                  </div>
                  <span className={`flex-1 font-mono ${getLogColor(log.level)}`}>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Custom Attachments Section */}
      {showAttachments && hasAttachments && (
        <div className="px-3 pb-3">
          <div className="bg-slate-900/50 rounded-lg border border-slate-700/30 overflow-hidden">
            <div className="px-3 py-2 bg-slate-800/50 border-b border-slate-700/30 flex items-center gap-2">
              <Image className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-medium text-slate-400">
                Attachments ({scenario.attachments!.length})
              </span>
            </div>
            <div className="p-3 grid grid-cols-4 gap-2">
              {scenario.attachments!.map((attachment) => (
                <button
                  key={attachment.id}
                  onClick={() => setSelectedAttachment(attachment)}
                  className="group relative aspect-video rounded border border-slate-600 overflow-hidden hover:border-purple-400 transition-colors"
                >
                  {attachment.type === 'screenshot' ? (
                    <img
                      src={attachment.path}
                      alt={attachment.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                      <Image className="w-6 h-6 text-slate-500" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1.5 py-0.5 text-[10px] text-slate-300 truncate">
                    {attachment.name}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Modal */}
      {showScreenshot && hasScreenshot && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowScreenshot(false)}
        >
          <div className="max-w-4xl max-h-[90vh] relative">
            <img
              src={scenario.screenshot}
              alt="Scenario screenshot"
              className="max-w-full max-h-[90vh] object-contain rounded-lg border border-slate-600"
            />
            <button
              onClick={() => setShowScreenshot(false)}
              className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
            <div className="absolute bottom-2 left-2 px-3 py-1.5 bg-black/70 rounded text-sm text-white">
              {scenario.name}
            </div>
          </div>
        </div>
      )}

      {/* Attachment Modal */}
      {selectedAttachment && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedAttachment(null)}
        >
          <div className="max-w-4xl max-h-[90vh] relative">
            <img
              src={selectedAttachment.path}
              alt={selectedAttachment.name}
              className="max-w-full max-h-[90vh] object-contain rounded-lg border border-slate-600"
            />
            <button
              onClick={() => setSelectedAttachment(null)}
              className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
            <div className="absolute bottom-2 left-2 px-3 py-1.5 bg-black/70 rounded text-sm text-white">
              <div>{selectedAttachment.name}</div>
              {selectedAttachment.description && (
                <div className="text-xs text-slate-400">{selectedAttachment.description}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScenarioRow;
