import { Database } from 'lucide-react';
import { Tooltip } from '@/components/ui';
import { cn } from '@/lib/utils';

interface RightToolRailProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function RightToolRail({ isOpen, onToggle }: RightToolRailProps): JSX.Element {
  return (
    <aside className="w-[42px] border-l border-border-default bg-dark-bg flex flex-col items-center py-2 gap-1 shrink-0 select-none">
      <Tooltip content="Data Tools" showDelayMs={0} hideDelayMs={0}>
        <button
          onClick={onToggle}
          className={cn(
            'relative flex items-center justify-center w-[34px] h-[34px] rounded transition-colors duration-fast',
            isOpen
              ? 'text-text-primary bg-dark-elevated'
              : 'text-text-muted hover:text-text-primary hover:bg-white/[0.05]',
          )}
          aria-label="Data Tools"
        >
          {isOpen && (
            <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-l bg-brand-primary" />
          )}
          <Database size={18} strokeWidth={isOpen ? 2 : 1.5} />
        </button>
      </Tooltip>
    </aside>
  );
}
