import React, { useState } from 'react';
import type { FlatStep } from './types';
import { getStepMeta } from './stepTypeMetadata';
import { useBuilderEditing } from './useBuilderEditing';
import { ActionConfig } from './configs/ActionConfig';
import { VerifyConfig } from './configs/VerifyConfig';
import { ForEachConfig } from './configs/ForEachConfig';
import { TryCatchConfig } from './configs/TryCatchConfig';
import { PerformConfig } from './configs/PerformConfig';
import { DataConfig } from './configs/DataConfig';
import { SetVariableConfig } from './configs/SetVariableConfig';
import { IfElseConfig } from './configs/IfElseConfig';
import { GenericConfig } from './configs/GenericConfig';

interface StepConfigPanelProps {
  selectedStep: FlatStep | null;
  sourceContent: string;
  className?: string;
}

export type OnEditField = (fieldPath: string, rawValue: string) => void;

const ACTION_TYPES = new Set([
  'Click', 'RightClick', 'DoubleClick', 'ForceClick',
  'Fill', 'Check', 'Uncheck', 'Hover', 'Press', 'Scroll',
  'ClearField', 'Upload', 'Download', 'Drag', 'Open', 'Refresh',
  'Select',
]);

const VERIFY_TYPES = new Set([
  'Verify', 'VerifyUrl', 'VerifyTitle', 'VerifyHas',
  'VerifyScreenshot', 'VerifyVariable', 'VerifyResponse',
]);

const DATA_TYPES = new Set([
  'Load', 'DataQuery', 'Row', 'Rows', 'ColumnAccess', 'Count',
]);

function StepConfigForm({ step, onEditField }: { step: FlatStep; onEditField: OnEditField }) {
  const { node } = step;

  if (ACTION_TYPES.has(node.type)) {
    return <ActionConfig stmt={node as any} onEditField={onEditField} />;
  }
  if (VERIFY_TYPES.has(node.type)) {
    return <VerifyConfig stmt={node as any} onEditField={onEditField} />;
  }
  if (node.type === 'UtilityAssignment') {
    return <SetVariableConfig stmt={node as any} onEditField={onEditField} />;
  }
  if (node.type === 'IfElse') {
    return <IfElseConfig stmt={node as any} />;
  }
  if (node.type === 'ForEach') {
    return <ForEachConfig stmt={node as any} onEditField={onEditField} />;
  }
  if (node.type === 'TryCatch') {
    return <TryCatchConfig stmt={node as any} />;
  }
  if (node.type === 'Perform' || node.type === 'PerformAssignment') {
    return <PerformConfig stmt={node as any} onEditField={onEditField} />;
  }
  if (DATA_TYPES.has(node.type)) {
    return <DataConfig stmt={node as any} onEditField={onEditField} />;
  }
  return <GenericConfig stmt={node} onEditField={onEditField} />;
}

/** Vero keyword patterns for basic syntax highlighting */
const VERO_KEYWORDS = /\b(CLICK|FILL|VERIFY|OPEN|HOVER|PRESS|SELECT|CHECK|UNCHECK|SCROLL|DRAG|UPLOAD|DOWNLOAD|CLEAR|REFRESH|WAIT|FOR EACH|IF|ELSE|TRY|CATCH|SET|PERFORM|LOG|TAKE SCREENSHOT|LOAD|ROW|ROWS|COLUMN|COUNT|WITH|IS|IS NOT|CONTAINS|VISIBLE|HIDDEN|ENABLED|DISABLED|IN|SWITCH TO|CLOSE TAB|ACCEPT DIALOG|DISMISS DIALOG)\b/g;

/** Highlight Vero keywords in a source line */
function highlightLine(line: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  VERO_KEYWORDS.lastIndex = 0;
  while ((match = VERO_KEYWORDS.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={match.index} className="text-blue-300">{match[0]}</span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }

  return parts.length > 0 ? <>{parts}</> : line;
}

/** Extract source context for code preview */
function extractSourceContext(
  content: string,
  lineNum: number,
): { lines: string[]; startLine: number; activeLine: number } {
  const allLines = content.split('\n');
  if (lineNum < 1 || lineNum > allLines.length) {
    return { lines: [], startLine: 1, activeLine: 1 };
  }

  // Show ~5 lines before and after, capped at file boundaries
  const contextRadius = 5;
  const start = Math.max(0, lineNum - 1 - contextRadius);
  const end = Math.min(allLines.length, lineNum + contextRadius);
  const lines = allLines.slice(start, end);

  return {
    lines,
    startLine: start + 1,
    activeLine: lineNum,
  };
}

export const StepConfigPanel = React.memo(function StepConfigPanel({
  selectedStep,
  sourceContent,
  className,
}: StepConfigPanelProps) {
  const [showCode, setShowCode] = useState(false);
  const { editField, deleteStep } = useBuilderEditing(sourceContent);

  // Create bound edit handler for the selected step
  const onEditField: OnEditField = (fieldPath, rawValue) => {
    if (selectedStep) {
      editField(selectedStep, fieldPath, rawValue);
    }
  };

  if (!selectedStep) {
    return (
      <div className={`flex flex-col items-center justify-center text-text-muted ${className ?? ''}`}>
        <span className="material-symbols-outlined text-3xl mb-2">touch_app</span>
        <p className="text-xs">Select a step to view its configuration</p>
      </div>
    );
  }

  const meta = getStepMeta(selectedStep.node.type);
  const label = selectedStep.blockLabel ?? meta.label;
  const codeCtx = showCode ? extractSourceContext(sourceContent, selectedStep.line) : null;

  return (
    <div className={`flex flex-col overflow-hidden ${className ?? ''}`}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-3 py-2.5 border-b border-border-default bg-dark-shell/95 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-3xs text-text-muted font-mono">Step {selectedStep.num}</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-3xs font-mono font-semibold ${meta.borderColor} border-l-[3px] ${meta.bgTint}`}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{meta.icon}</span>
            {label}
          </span>
          <div className="flex-1" />
          {/* Sync indicator */}
          <span className="flex items-center gap-1 text-4xs text-emerald-400">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            Synced
          </span>
          {/* Delete button */}
          <button
            onClick={() => {
              if (confirm('Delete this step?')) {
                deleteStep(selectedStep);
              }
            }}
            className="p-1 rounded text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Delete step"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
          </button>
        </div>
        <div className="text-4xs text-text-muted mt-0.5">Step Setup</div>
      </div>

      {/* Config forms */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <StepConfigForm step={selectedStep} onEditField={onEditField} />
      </div>

      {/* Code preview */}
      <div className="border-t border-border-default">
        <button
          onClick={() => setShowCode(!showCode)}
          className="w-full flex items-center gap-1.5 px-3 py-1.5 text-3xs text-text-muted hover:text-text-primary transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            {showCode ? 'expand_more' : 'chevron_right'}
          </span>
          {showCode ? 'Hide Generated Code' : 'Show Generated Code'}
          <span className="text-4xs text-text-muted ml-auto">Line {selectedStep.line}</span>
        </button>
        {showCode && codeCtx && (
          <div className="px-3 pb-2">
            <div className="text-3xs font-mono bg-dark-elevated rounded border border-border-default overflow-auto h-[200px]">
              <table className="w-full border-collapse">
                <tbody>
                  {codeCtx.lines.map((line, i) => {
                    const lineNo = codeCtx.startLine + i;
                    const isActive = lineNo === codeCtx.activeLine;
                    return (
                      <tr key={lineNo} className={isActive ? 'bg-blue-400/10' : ''}>
                        <td className="text-text-muted text-right pr-3 pl-2 select-none border-r border-border-default w-8 align-top">
                          {lineNo}
                        </td>
                        <td className="pl-2 pr-2 text-text-secondary whitespace-pre">
                          {highlightLine(line)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
