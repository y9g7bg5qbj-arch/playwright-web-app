import {
  FolderTree,
  FileBarChart2,
  Clock3,
  Table2,
  Bot,
  ListTree,
  Settings,
  User
} from 'lucide-react';
import { IconButton, Tooltip } from '@/components/ui';
import { cn } from '@/lib/utils';

export type ActivityView =
  | 'explorer'
  | 'executions'
  | 'schedules'
  | 'testdata'
  | 'ai-test-generator'
  | 'trace'
  | 'settings';

export interface ActivityBarProps {
  activeView: ActivityView;
  onViewChange: (view: ActivityView) => void;
  executionBadge?: number;
  onOpenScenarioBrowser?: () => void;
  scenarioCount?: number;
}

interface ActivityItem {
  id: ActivityView;
  icon: React.FC<any>;
  label: string;
  description: string;
}

const ACTIVITIES: ActivityItem[] = [
  {
    id: 'explorer',
    icon: FolderTree,
    label: 'Explorer',
    description: 'Browse project files',
  },
  {
    id: 'executions',
    icon: FileBarChart2,
    label: 'Results',
    description: 'Execution results',
  },
  {
    id: 'schedules',
    icon: Clock3,
    label: 'Schedules',
    description: 'Automated jobs',
  },
  {
    id: 'testdata',
    icon: Table2,
    label: 'Data Tables',
    description: 'Test data management',
  },
  {
    id: 'ai-test-generator',
    icon: Bot,
    label: 'AI Studio',
    description: 'Generate tests with AI',
  },
];

export function ActivityBar({ activeView, onViewChange, executionBadge, onOpenScenarioBrowser, scenarioCount }: ActivityBarProps): JSX.Element {
  return (
    <aside className="w-12 border-r border-border-muted bg-dark-bg flex flex-col items-center py-3 gap-1 z-20 shrink-0 select-none">
      {ACTIVITIES.map((activity) => {
        const isActive = activeView === activity.id;
        const showBadge = activity.id === 'executions' && executionBadge !== undefined && executionBadge > 0;
        const Icon = activity.icon;

        return (
          <Tooltip key={activity.id} content={`${activity.label} - ${activity.description}`} showDelayMs={0} hideDelayMs={0}>
            <button
              onClick={() => onViewChange(activity.id)}
              className={cn(
                'relative group flex items-center justify-center',
                'w-9 h-9 rounded-md transition-all duration-fast ease-out',
                isActive
                  ? 'bg-dark-elevated text-white'
                  : 'text-text-secondary hover:text-white hover:bg-dark-elevated'
              )}
              aria-label={activity.label}
            >
              {/* Active Indicator (Left Bar) */}
              {isActive && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-sm bg-brand-primary"
                />
              )}

              <Icon
                size={17}
                className="transition-colors"
                strokeWidth={isActive ? 2 : 1.75}
              />

              {showBadge && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 flex items-center justify-center rounded bg-status-danger text-white text-4xs font-bold px-0.5">
                  {executionBadge > 9 ? '9+' : executionBadge}
                </span>
              )}
            </button>
          </Tooltip>
        );
      })}

      <div className="w-5 h-px bg-border-muted my-1.5" />

      {/* Scenario Browser */}
      {onOpenScenarioBrowser && (
        <Tooltip content="Scenario Browser" showDelayMs={0} hideDelayMs={0}>
          <button
            onClick={onOpenScenarioBrowser}
            className="relative group flex items-center justify-center w-9 h-9 rounded-md text-text-secondary hover:text-white hover:bg-dark-elevated transition-all duration-fast ease-out"
            aria-label="Scenario Browser"
          >
            <ListTree size={17} strokeWidth={1.75} className="transition-colors" />

            {scenarioCount !== undefined && scenarioCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 flex items-center justify-center rounded bg-status-info text-white text-4xs font-bold px-0.5">
                {scenarioCount > 9 ? '9+' : scenarioCount}
              </span>
            )}
          </button>
        </Tooltip>
      )}

      {/* Bottom Section */}
      <div className="mt-auto flex flex-col gap-1 mb-1.5">
        <div className="w-5 h-px bg-border-muted mx-auto" />

        {/* Profile */}
        <IconButton
          icon={<User size={17} strokeWidth={1.75} />}
          variant="ghost"
          tooltip="Account"
          className="w-9 h-9"
        />

        {/* Settings */}
        <Tooltip content="Settings" showDelayMs={0} hideDelayMs={0}>
          <button
            onClick={() => onViewChange('settings')}
            className={cn(
              'relative group flex items-center justify-center',
              'w-9 h-9 rounded-md transition-all duration-fast ease-out',
              activeView === 'settings'
                ? 'bg-dark-elevated text-white'
                : 'text-text-secondary hover:text-white hover:bg-dark-elevated'
            )}
            aria-label="Settings"
          >
            <Settings
              size={17}
              strokeWidth={activeView === 'settings' ? 2 : 1.75}
              className="transition-colors"
            />
          </button>
        </Tooltip>
      </div>
    </aside>
  );
}
