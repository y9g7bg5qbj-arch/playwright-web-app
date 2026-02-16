import type { ComponentType } from 'react';
import { X, Wrench, Search, CopyPlus, Wand2, ArrowUpDown, Palette, Download, Upload, Rows4, Sigma } from 'lucide-react';
import { Tooltip } from '@/components/ui';

export type AdvancedToolId =
  | 'bulkUpdate'
  | 'findReplace'
  | 'duplicateRows'
  | 'fillSeries'
  | 'dataGenerator'
  | 'multiSort'
  | 'conditionalFormatting'
  | 'importCsv'
  | 'exportCsv';

interface AdvancedToolsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onToolSelect: (toolId: AdvancedToolId) => void;
}

const TOOLS: Array<{ id: AdvancedToolId; label: string; description: string; icon: ComponentType<{ className?: string }> }> = [
  {
    id: 'bulkUpdate',
    label: 'Bulk Update',
    description: 'Update selected or filtered rows in one action.',
    icon: Rows4,
  },
  {
    id: 'findReplace',
    label: 'Find & Replace',
    description: 'Replace values across column or sheet.',
    icon: Search,
  },
  {
    id: 'duplicateRows',
    label: 'Duplicate Rows',
    description: 'Duplicate current selection instantly.',
    icon: CopyPlus,
  },
  {
    id: 'fillSeries',
    label: 'Fill Series',
    description: 'Fill column with value, sequence, or pattern.',
    icon: Sigma,
  },
  {
    id: 'dataGenerator',
    label: 'Generator',
    description: 'Generate sample values for a column.',
    icon: Wand2,
  },
  {
    id: 'multiSort',
    label: 'Multi Sort',
    description: 'Apply controlled multi-column sorting.',
    icon: ArrowUpDown,
  },
  {
    id: 'conditionalFormatting',
    label: 'Conditional Format',
    description: 'Highlight patterns with visual rules.',
    icon: Palette,
  },
  {
    id: 'importCsv',
    label: 'Import CSV',
    description: 'Bring data from local CSV files.',
    icon: Upload,
  },
  {
    id: 'exportCsv',
    label: 'Export CSV',
    description: 'Export current table rows.',
    icon: Download,
  },
];

export function AdvancedToolsDrawer({ isOpen, onClose, onToolSelect }: AdvancedToolsDrawerProps) {
  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-black/45" onClick={onClose} />}

      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border-default bg-dark-bg shadow-2xl transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="rounded-md border border-brand-primary/30 bg-brand-primary/10 p-1.5">
              <Wrench className="h-4 w-4 text-brand-secondary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Advanced Tools</h3>
              <p className="text-xxs text-text-muted">Power features grouped for expert workflows</p>
            </div>
          </div>

          <Tooltip content="Close advanced tools" showDelayMs={0} hideDelayMs={0}>
            <button
              onClick={onClose}
              className="rounded-md border border-border-default bg-dark-elevated/70 p-1 text-text-muted transition-colors hover:border-border-emphasis hover:text-text-primary"
              aria-label="Close advanced tools"
            >
              <X className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="space-y-2">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => onToolSelect(tool.id)}
                  className="w-full rounded-lg border border-border-default bg-dark-elevated/60 px-3 py-2 text-left transition-colors hover:border-border-emphasis hover:bg-dark-elevated"
                >
                  <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-text-primary">
                    <Icon className="h-3.5 w-3.5 text-brand-secondary" />
                    {tool.label}
                  </div>
                  <p className="text-xxs text-text-muted">{tool.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}

export default AdvancedToolsDrawer;
