import type { OpenTab } from '../workspace.types';
import { IconButton } from '@/components/ui';

export interface WorkspaceEditorTabsProps {
  tabs: OpenTab[];
  activeTabId: string | null;
  onActivate: (tabId: string) => void;
  onClose: (tabId: string) => void;
}

export function WorkspaceEditorTabs({ tabs, activeTabId, onActivate, onClose }: WorkspaceEditorTabsProps) {
  return (
    <div className="h-[38px] flex items-center border-b border-border-default bg-dark-shell px-1.5">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar min-w-0 flex-1">
        {tabs.map(tab => {
          const isActiveTab = activeTabId === tab.id;
          return (
            <div
              key={tab.id}
              onClick={() => onActivate(tab.id)}
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
    </div>
  );
}
