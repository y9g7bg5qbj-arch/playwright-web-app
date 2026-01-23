import {
  Files,
  Rocket,
  CalendarClock,
  Database,
  Sparkles,
  Settings,
  ScrollText,
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
    icon: Files,
    label: 'Explorer',
    description: 'Browse project files',
  },
  {
    id: 'executions',
    icon: Rocket,
    label: 'Runs',
    description: 'Execution history',
  },
  {
    id: 'schedules',
    icon: CalendarClock,
    label: 'Schedules',
    description: 'Automated jobs',
  },
  {
    id: 'testdata',
    icon: Database,
    label: 'Data',
    description: 'Test data management',
  },
  {
    id: 'ai-test-generator',
    icon: Sparkles,
    label: 'AI Studio',
    description: 'Generate tests with AI',
  },
];

export function ActivityBar({ activeView, onViewChange, executionBadge, onOpenScenarioBrowser, scenarioCount }: ActivityBarProps): JSX.Element {
  return (
    <aside className="w-[52px] bg-dark-bg border-r border-border-muted flex flex-col items-center py-4 gap-2 z-20 shrink-0 select-none">
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
              w-10 h-10 rounded-lg transition-all duration-200
              ${isActive
                ? 'bg-brand-primary/10 text-brand-primary'
                : 'text-text-muted hover:text-text-primary hover:bg-dark-elevated'
              }
            `}
            title={`${activity.label} - ${activity.description}`}
          >
            {/* Active Indicator (Left Bar) */}
            {isActive && (
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-sm bg-brand-primary shadow-[0_0_8px_rgba(99,102,241,0.6)]"
              />
            )}

            <Icon
              size={20}
              className={`transition-transform duration-200 ${isActive ? 'scale-105' : 'group-hover:scale-110'}`}
              strokeWidth={isActive ? 2.5 : 2}
            />

            {/* Notification Badge */}
            {showBadge && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-status-danger text-white text-[10px] font-bold px-1 ring-2 ring-dark-bg animate-pulse-subtle">
                {executionBadge > 9 ? '9+' : executionBadge}
              </span>
            )}

            {/* Tooltip (Custom implementation would be better, but basic title works for now) */}
          </button>
        );
      })}

      <div className="w-6 h-px bg-border-subtle my-2" />

      {/* Scenario Browser */}
      {onOpenScenarioBrowser && (
        <button
          onClick={onOpenScenarioBrowser}
          className="relative group flex items-center justify-center w-10 h-10 rounded-lg text-text-muted hover:text-text-primary hover:bg-dark-elevated transition-all duration-200"
          title="Scenario Browser"
        >
          <ScrollText size={20} strokeWidth={2} className="group-hover:scale-110 transition-transform" />

          {scenarioCount !== undefined && scenarioCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-status-info text-white text-[10px] font-bold px-1 ring-2 ring-dark-bg">
              {scenarioCount > 9 ? '9+' : scenarioCount}
            </span>
          )}
        </button>
      )}

      {/* Bottom Section */}
      <div className="mt-auto flex flex-col gap-2 mb-2">
        <div className="w-6 h-px bg-border-subtle mx-auto" />

        {/* Profile */}
        <button
          className="relative group flex items-center justify-center w-10 h-10 rounded-lg text-text-muted hover:text-text-primary hover:bg-dark-elevated transition-all duration-200"
          title="Account"
        >
          <User size={20} strokeWidth={2} className="group-hover:scale-110 transition-transform" />
        </button>

        {/* Settings */}
        <button
          onClick={() => onViewChange('settings')}
          className={`
            relative group flex items-center justify-center
            w-10 h-10 rounded-lg transition-all duration-200
            ${activeView === 'settings'
              ? 'bg-dark-elevated text-text-primary'
              : 'text-text-muted hover:text-text-primary hover:bg-dark-elevated'
            }
          `}
          title="Settings"
        >
          <Settings
            size={20}
            strokeWidth={activeView === 'settings' ? 2.5 : 2}
            className={`transition-transform duration-500 ${activeView === 'settings' ? 'rotate-90' : 'group-hover:rotate-45'}`}
          />
        </button>
      </div>
    </aside>
  );
}
