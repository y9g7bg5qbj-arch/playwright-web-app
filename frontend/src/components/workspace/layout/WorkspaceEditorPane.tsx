import type { OpenTab } from '../workspace.types';
import { CompareTab } from '../CompareTab';
import { VeroEditor, type VeroEditorHandle } from '../../vero/VeroEditor';

export interface WorkspaceEditorPaneProps {
  activeTab: OpenTab;
  editorRef: React.Ref<VeroEditorHandle>;
  currentProjectId?: string;
  nestedProjects: Array<{ id: string; veroPath?: string }>;
  // Editor callbacks
  onTabContentChange: (tabId: string, content: string) => void;
  onCloseTab: (tabId: string) => void;
  onApplyCompareChanges: (tabId: string, content: string) => void;
  onRunScenario: (name: string) => void;
  onRunFeature: (name: string) => void;
  onGutterContextMenu: (info: { x: number; y: number; itemType: 'scenario' | 'feature'; itemName: string }) => void;
  onNavigateToDefinition: (targetPath: string, line: number, column: number) => Promise<void>;
  onInsertDataQuery: () => void;
  // Debug state
  breakpoints: Set<number>;
  onToggleBreakpoint: (line: number) => void;
  debugCurrentLine: number | null;
  isDebugging: boolean;
  // Recording
  isRecording: boolean;
  onStartRecording: (scenarioName: string) => void;
  // Failure lines from test execution
  failureLines?: Array<{ line: number; category: string; userMessage: string }>;
}

export function WorkspaceEditorPane({
  activeTab,
  editorRef,
  currentProjectId,
  nestedProjects,
  onTabContentChange,
  onCloseTab,
  onApplyCompareChanges,
  onRunScenario,
  onRunFeature,
  onGutterContextMenu,
  onNavigateToDefinition,
  onInsertDataQuery,
  breakpoints,
  onToggleBreakpoint,
  debugCurrentLine,
  isDebugging,
  isRecording,
  onStartRecording,
  failureLines,
}: WorkspaceEditorPaneProps) {
  if (activeTab.type === 'compare') {
    return (
      <CompareTab
        key={activeTab.id}
        projectId={activeTab.projectId || currentProjectId || ''}
        filePath={activeTab.path}
        initialSource={activeTab.compareSource}
        initialTarget={activeTab.compareTarget}
        onClose={() => onCloseTab(activeTab.id)}
        onApplyChanges={(content) => onApplyCompareChanges(activeTab.id, content)}
      />
    );
  }

  if (activeTab.type === 'image') {
    return (
      <div className="flex-1 overflow-auto p-4 bg-dark-canvas">
        <div className="text-xs text-text-secondary mb-2">{activeTab.path}</div>
        <div className="rounded border border-border-default bg-dark-card p-2 inline-block">
          <img
            src={activeTab.content}
            alt={activeTab.name}
            className="max-w-full h-auto block"
          />
        </div>
      </div>
    );
  }

  if (activeTab.type === 'binary') {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-xl text-center">
          <h3 className="text-text-primary font-medium mb-2">Binary file preview unavailable</h3>
          <p className="text-sm text-text-secondary break-all">{activeTab.path}</p>
          {activeTab.contentType && (
            <p className="text-xs text-text-muted mt-2">Content type: {activeTab.contentType}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <VeroEditor
      ref={editorRef}
      key={activeTab.id}
      initialValue={activeTab.content}
      onChange={(value) => value && onTabContentChange(activeTab.id, value)}
      onRunScenario={onRunScenario}
      onRunFeature={onRunFeature}
      onGutterContextMenu={onGutterContextMenu}
      showErrorPanel={true}
      token={null}
      veroPath={nestedProjects.find(p => activeTab.path.startsWith(p.veroPath || ''))?.veroPath}
      filePath={activeTab.path}
      projectId={nestedProjects.find(p => activeTab.path.startsWith(p.veroPath || ''))?.id}
      applicationId={currentProjectId}
      onNavigateToDefinition={onNavigateToDefinition}
      onInsertDataQuery={onInsertDataQuery}
      breakpoints={breakpoints}
      onToggleBreakpoint={onToggleBreakpoint}
      debugCurrentLine={debugCurrentLine}
      isDebugging={isDebugging}
      isRecording={isRecording}
      onStartRecording={onStartRecording}
      failureLines={failureLines}
    />
  );
}
