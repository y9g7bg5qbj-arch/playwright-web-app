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
  icon: string;
  activeIcon?: string; // Different icon when active
  label: string;
  description: string; // Tooltip description
  color?: string; // Accent color when active
}

const ACTIVITIES: ActivityItem[] = [
  {
    id: 'explorer',
    icon: 'folder_copy',
    activeIcon: 'folder_open',
    label: 'Explorer',
    description: 'Browse project files and folders',
    color: '#58a6ff'
  },
  {
    id: 'executions',
    icon: 'rocket_launch',
    label: 'Runs',
    description: 'View test execution history and reports',
    color: '#3fb950'
  },
  {
    id: 'schedules',
    icon: 'event_repeat',
    label: 'Schedules',
    description: 'Manage automated test schedules',
    color: '#d29922'
  },
  {
    id: 'testdata',
    icon: 'table_chart',
    label: 'Data',
    description: 'Manage test data tables and variables',
    color: '#a371f7'
  },
  {
    id: 'ai-test-generator',
    icon: 'auto_awesome',
    label: 'AI Studio',
    description: 'Generate tests with AI assistance',
    color: '#f778ba'
  },
];

export function ActivityBar({ activeView, onViewChange, executionBadge, onOpenScenarioBrowser, scenarioCount }: ActivityBarProps): JSX.Element {
  return (
    <aside className="w-14 bg-[#0d1117] border-r border-[#30363d] flex flex-col items-center py-3 gap-1 z-20 shrink-0">
      {ACTIVITIES.map((activity) => {
        const isActive = activeView === activity.id;
        const showBadge = activity.id === 'executions' && executionBadge !== undefined && executionBadge > 0;
        const iconToShow = isActive && activity.activeIcon ? activity.activeIcon : activity.icon;

        return (
          <button
            key={activity.id}
            onClick={() => onViewChange(activity.id)}
            className={`relative w-full flex flex-col items-center py-2 px-1 transition-all duration-150 group ${
              isActive
                ? 'text-white'
                : 'text-[#6e7681] hover:text-[#c9d1d9]'
            }`}
            title={`${activity.label} - ${activity.description}`}
          >
            {/* Active indicator bar */}
            {isActive && (
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-7 rounded-r transition-all"
                style={{ backgroundColor: activity.color || '#2479f9' }}
              />
            )}

            {/* Icon */}
            <span
              className={`material-symbols-outlined transition-all ${
                isActive ? 'text-[22px] icon-filled' : 'text-[20px] group-hover:text-[21px]'
              }`}
              style={isActive ? { color: activity.color } : undefined}
            >
              {iconToShow}
            </span>

            {/* Label - only show on hover or active */}
            <span
              className={`text-[8px] font-medium mt-0.5 uppercase tracking-wide transition-opacity ${
                isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-70'
              }`}
              style={isActive ? { color: activity.color } : undefined}
            >
              {activity.label}
            </span>

            {showBadge && (
              <span
                className="absolute top-1 right-1.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full text-white text-[8px] font-bold px-0.5 shadow-sm"
                style={{ backgroundColor: activity.color || '#2479f9' }}
              >
                {executionBadge > 9 ? '9+' : executionBadge}
              </span>
            )}
          </button>
        );
      })}

      {/* Divider */}
      <div className="w-6 h-px bg-[#30363d] my-1" />

      {/* Scenarios Button */}
      {onOpenScenarioBrowser && (
        <button
          onClick={onOpenScenarioBrowser}
          className="relative w-full flex flex-col items-center py-2 px-1 text-[#6e7681] hover:text-[#c9d1d9] transition-all group"
          title="Scenario Browser - Browse all test scenarios"
        >
          <span className="material-symbols-outlined text-[20px] group-hover:text-[21px] transition-all">
            checklist
          </span>
          <span className="text-[7px] font-medium mt-0.5 uppercase tracking-wide opacity-0 group-hover:opacity-70 transition-opacity">
            Scenarios
          </span>
          {scenarioCount !== undefined && scenarioCount > 0 && (
            <span className="absolute top-1 right-1.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-[#58a6ff] text-white text-[8px] font-bold px-0.5 shadow-sm">
              {scenarioCount > 9 ? '9+' : scenarioCount}
            </span>
          )}
        </button>
      )}

      {/* Spacer */}
      <div className="mt-auto flex flex-col gap-1 mb-1">
        {/* Divider */}
        <div className="w-6 h-px bg-[#30363d] mx-auto mb-1" />

        {/* Account */}
        <button
          className="w-full flex flex-col items-center py-2 px-1 text-[#6e7681] hover:text-[#c9d1d9] transition-all group"
          title="Account - Manage your profile"
        >
          <span className="material-symbols-outlined text-[20px] group-hover:text-[21px] transition-all">
            person
          </span>
        </button>

        {/* Settings */}
        <button
          onClick={() => onViewChange('settings')}
          className={`w-full flex flex-col items-center py-2 px-1 transition-all group ${
            activeView === 'settings'
              ? 'text-white'
              : 'text-[#6e7681] hover:text-[#c9d1d9]'
          }`}
          title="Settings - Configure Vero IDE"
        >
          {activeView === 'settings' && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-7 rounded-r bg-[#8b949e]" />
          )}
          <span className={`material-symbols-outlined text-[20px] ${
            activeView === 'settings' ? 'icon-filled text-[22px]' : 'group-hover:text-[21px]'
          } transition-all`}>
            tune
          </span>
          {activeView === 'settings' && (
            <span className="text-[8px] font-medium mt-0.5 uppercase tracking-wide text-[#8b949e]">
              Settings
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}
