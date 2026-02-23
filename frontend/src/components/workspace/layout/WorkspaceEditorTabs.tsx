import React from 'react';
import type { OpenTab } from '../workspace.types';
import { IconButton } from '@/components/ui';

export interface WorkspaceEditorTabsProps {
  tabs: OpenTab[];
  activeTabId: string | null;
  onActivate: (tabId: string) => void;
  onClose: (tabId: string) => void;
  onToggleEditorMode?: (tabId: string, mode: 'code' | 'builder') => void;
}

/** Check if a tab is a .vero feature file eligible for visual builder */
function isFeatureFile(tab: OpenTab): boolean {
  if (!tab.path.endsWith('.vero')) return false;
  const trimmed = tab.content.trimStart();
  return trimmed.startsWith('FEATURE') || /^\s*(@\w+\s+)*FEATURE\b/.test(trimmed);
}

export const WorkspaceEditorTabs = React.memo(function WorkspaceEditorTabs({ tabs, activeTabId, onActivate, onClose, onToggleEditorMode }: WorkspaceEditorTabsProps) {
  const activeTab = tabs.find(t => t.id === activeTabId);
  const showModeToggle = activeTab && isFeatureFile(activeTab) && onToggleEditorMode;
  const currentMode = activeTab?.editorMode ?? 'code';

  return (
    <div className="h-[38px] flex items-center border-b border-border-default bg-dark-shell px-1.5" role="tablist">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar min-w-0 flex-1">
        {tabs.map(tab => {
          const isActiveTab = activeTabId === tab.id;
          return (
            <div
              key={tab.id}
              role="tab"
              tabIndex={0}
              aria-selected={isActiveTab}
              onClick={() => onActivate(tab.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate(tab.id); } }}
              className={`group flex items-center gap-1.5 px-2.5 h-7 cursor-pointer text-sm min-w-0 max-w-[220px] rounded-full border transition-colors ${
                isActiveTab
                  ? 'bg-dark-elevated text-text-primary border-brand-primary/60'
                  : 'bg-transparent text-text-muted border-transparent hover:text-text-primary hover:bg-dark-elevated/70'
              }`}
            >
              <span className={`material-symbols-outlined text-sm ${
                tab.type === 'compare'
                  ? (isActiveTab ? 'text-accent-purple' : 'text-text-muted')
                  : (isActiveTab ? 'text-brand-primary' : 'text-text-muted')
              }`}>
                {tab.type === 'compare'
                  ? 'compare'
                  : tab.type === 'image'
                    ? 'image'
                    : tab.type === 'binary'
                      ? 'draft'
                      : 'description'}
              </span>
              <span className="truncate max-w-[140px]">{tab.name}</span>
              {tab.hasChanges && (
                <span className="w-1.5 h-1.5 bg-brand-secondary rounded-full flex-shrink-0" />
              )}
              <IconButton
                icon={<span className="material-symbols-outlined text-sm">close</span>}
                size="sm"
                tooltip="Close tab"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab.id);
                }}
                className={`ml-0.5 transition-opacity ${
                  isActiveTab ? 'opacity-90' : 'opacity-0 group-hover:opacity-100'
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Code / Builder mode toggle */}
      {showModeToggle && (
        <div className="flex items-center gap-0.5 ml-2 mr-1 flex-shrink-0">
          <button
            onClick={() => onToggleEditorMode!(activeTab!.id, 'code')}
            className={`flex items-center gap-1 px-2 py-0.5 text-3xs rounded-md border transition-colors ${
              currentMode === 'code'
                ? 'border-brand-primary/60 bg-brand-primary/15 text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-primary hover:bg-dark-elevated/45'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>code</span>
            Code
          </button>
          <button
            onClick={() => onToggleEditorMode!(activeTab!.id, 'builder')}
            className={`flex items-center gap-1 px-2 py-0.5 text-3xs rounded-md border transition-colors ${
              currentMode === 'builder'
                ? 'border-brand-primary/60 bg-brand-primary/15 text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-primary hover:bg-dark-elevated/45'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>view_list</span>
            Builder
          </button>
        </div>
      )}
    </div>
  );
});
