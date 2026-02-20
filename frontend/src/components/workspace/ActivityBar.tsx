import {
  FolderTree,
  FileBarChart2,
  Clock3,
  Table2,
  Bot,
  ListTree,
  GitPullRequest,
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
  | 'prs'
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
  {
    id: 'prs',
    icon: GitPullRequest,
    label: 'Pull Requests',
    description: 'Review and merge changes',
  },
];

export function ActivityBar({ activeView, onViewChange, executionBadge, onOpenScenarioBrowser, scenarioCount }: ActivityBarProps): JSX.Element {
  return (
    <aside className="w-[42px] border-r border-border-default bg-dark-bg flex flex-col items-center py-2 gap-0.5 z-20 shrink-0 select-none">
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
                'w-[34px] h-[34px] rounded transition-colors duration-fast',
                isActive
                  ? 'text-text-primary'
                  : 'text-text-muted hover:text-text-primary hover:bg-white/[0.05]'
              )}
              aria-label={activity.label}
            >
              {/* Active Indicator — 3px left stripe */}
              {isActive && (
                <div
                  className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r bg-brand-primary"
                />
              )}

              <Icon
                size={18}
                className="transition-colors"
                strokeWidth={isActive ? 2 : 1.5}
              />

              {showBadge && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 flex items-center justify-center rounded-sm bg-status-danger text-white text-4xs font-bold px-0.5">
                  {executionBadge > 9 ? '9+' : executionBadge}
                </span>
              )}
            </button>
          </Tooltip>
        );
      })}

      <div className="w-5 h-px bg-border-default my-1" />

      {/* Scenario Browser */}
      {onOpenScenarioBrowser && (
        <Tooltip content="Scenario Browser" showDelayMs={0} hideDelayMs={0}>
          <button
            onClick={onOpenScenarioBrowser}
            className="relative group flex items-center justify-center w-[34px] h-[34px] rounded text-text-muted hover:text-text-primary hover:bg-white/[0.05] transition-colors duration-fast"
            aria-label="Scenario Browser"
          >
            <ListTree size={18} strokeWidth={1.5} className="transition-colors" />

            {scenarioCount !== undefined && scenarioCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 flex items-center justify-center rounded-sm bg-status-info text-white text-4xs font-bold px-0.5">
                {scenarioCount > 9 ? '9+' : scenarioCount}
              </span>
            )}
          </button>
        </Tooltip>
      )}

      {/* Bottom Section */}
      <div className="mt-auto flex flex-col gap-0.5 mb-1">
        <div className="w-5 h-px bg-border-default mx-auto mb-0.5" />

        {/* Profile */}
        <IconButton
          icon={<User size={18} strokeWidth={1.5} />}
          variant="ghost"
          tooltip="Account"
          className="w-[34px] h-[34px]"
        />

        {/* Settings */}
        <Tooltip content="Settings" showDelayMs={0} hideDelayMs={0}>
          <button
            onClick={() => onViewChange('settings')}
            className={cn(
              'relative group flex items-center justify-center',
              'w-[34px] h-[34px] rounded transition-colors duration-fast',
              activeView === 'settings'
                ? 'text-text-primary'
                : 'text-text-muted hover:text-text-primary hover:bg-white/[0.05]'
            )}
            aria-label="Settings"
          >
            {activeView === 'settings' && (
              <div
                className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r bg-brand-primary"
              />
            )}
            <Settings
              size={18}
              strokeWidth={activeView === 'settings' ? 2 : 1.5}
              className="transition-colors"
            />
          </button>
        </Tooltip>
      </div>
    </aside>
  );
}
