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
    <aside className="w-12 border-r border-[#2d2d30] bg-[#181818] flex flex-col items-center py-3 gap-1 z-20 shrink-0 select-none">
      {ACTIVITIES.map((activity) => {
        const isActive = activeView === activity.id;
        const showBadge = activity.id === 'executions' && executionBadge !== undefined && executionBadge > 0;
        const Icon = activity.icon;

        return (
          <button
            key={activity.id}
            onClick={() => onViewChange(activity.id)}
            className={`
              relative group flex items-center justify-center
              w-9 h-9 rounded-md transition-all duration-fast ease-out
              ${isActive
                ? 'bg-[#37373d] text-[#ffffff]'
                : 'text-[#9da1a6] hover:text-[#ffffff] hover:bg-[#2a2d2e]'
              }
            `}
            title={`${activity.label} - ${activity.description}`}
          >
            {/* Active Indicator (Left Bar) - Thinner */}
            {isActive && (
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-sm bg-[#0078d4]"
              />
            )}

            <Icon
              size={17}
              className="transition-colors"
              strokeWidth={isActive ? 2 : 1.75}
            />

            {showBadge && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 flex items-center justify-center rounded bg-status-danger text-white text-[9px] font-bold px-0.5">
                {executionBadge > 9 ? '9+' : executionBadge}
              </span>
            )}
          </button>
        );
      })}

      <div className="w-5 h-px bg-[#2d2d30] my-1.5" />

      {/* Scenario Browser */}
      {onOpenScenarioBrowser && (
        <button
          onClick={onOpenScenarioBrowser}
          className="relative group flex items-center justify-center w-9 h-9 rounded-md text-[#9da1a6] hover:text-[#ffffff] hover:bg-[#2a2d2e] transition-all duration-fast ease-out"
          title="Scenario Browser"
        >
          <ListTree size={17} strokeWidth={1.75} className="transition-colors" />

          {scenarioCount !== undefined && scenarioCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 flex items-center justify-center rounded bg-status-info text-white text-[9px] font-bold px-0.5">
              {scenarioCount > 9 ? '9+' : scenarioCount}
            </span>
          )}
        </button>
      )}

      {/* Bottom Section */}
      <div className="mt-auto flex flex-col gap-1 mb-1.5">
        <div className="w-5 h-px bg-[#2d2d30] mx-auto" />

        {/* Profile */}
        <button
          className="relative group flex items-center justify-center w-9 h-9 rounded-md text-[#9da1a6] hover:text-[#ffffff] hover:bg-[#2a2d2e] transition-all duration-fast ease-out"
          title="Account"
        >
          <User size={17} strokeWidth={1.75} className="transition-colors" />
        </button>

        {/* Settings */}
        <button
          onClick={() => onViewChange('settings')}
          className={`
            relative group flex items-center justify-center
            w-9 h-9 rounded-md transition-all duration-fast ease-out
            ${activeView === 'settings'
              ? 'bg-[#37373d] text-[#ffffff]'
              : 'text-[#9da1a6] hover:text-[#ffffff] hover:bg-[#2a2d2e]'
            }
          `}
          title="Settings"
        >
          <Settings
            size={17}
            strokeWidth={activeView === 'settings' ? 2 : 1.75}
            className="transition-colors"
          />
        </button>
      </div>
    </aside>
  );
}
