import { useState } from 'react';
import { useEnvironmentStore } from '@/store/environmentStore';

export interface Schedule {
  id: string;
  name: string;
  cron: string;
  cronDescription: string;
  environment: string;  // Legacy: display string like "Staging - Chrome"
  environmentId?: string;  // NEW: Link to Environment Manager environment
  retryStrategy: string;
  enabled: boolean;
  nextRun: string;
  lastRun?: {
    status: 'success' | 'failed';
    time: string;
  };
  tags: string[];
  notifications: {
    slack: { enabled: boolean; webhook: string };
    email: { enabled: boolean; address: string };
    teams: { enabled: boolean };
  };
  reporting: {
    allureReport: boolean;
    traceOnFailure: boolean;
    recordVideo: boolean;
  };
}

export interface SchedulePanelProps {
  schedules: Schedule[];
  selectedScheduleId: string | null;
  onSelectSchedule: (id: string) => void;
  onCreateSchedule: () => void;
  onSaveSchedule: (schedule: Schedule) => void;
  onRunNow: (id: string) => void;
  onDeleteSchedule: (id: string) => void;
}

const defaultSchedule: Schedule = {
  id: '',
  name: 'Nightly Regression',
  cron: '0 0 * * *',
  cronDescription: 'Runs every day at 12:00 AM',
  environment: 'Staging - Chrome',
  retryStrategy: 'Retry failed tests (2x)',
  enabled: true,
  nextRun: 'Tomorrow 12:00 AM',
  tags: ['@smoke', '@regression', '@login', '@p0'],
  notifications: {
    slack: { enabled: true, webhook: '' },
    email: { enabled: false, address: 'qa-team@vero.com' },
    teams: { enabled: false },
  },
  reporting: {
    allureReport: true,
    traceOnFailure: true,
    recordVideo: false,
  },
};

export function SchedulePanel({
  schedules,
  selectedScheduleId,
  onSelectSchedule,
  onCreateSchedule,
  onSaveSchedule,
  onRunNow,
}: SchedulePanelProps) {
  const [editedSchedule, setEditedSchedule] = useState<Schedule>(
    schedules.find(s => s.id === selectedScheduleId) || defaultSchedule
  );
  const [newTag, setNewTag] = useState('');

  // Get environments from store
  const { environments } = useEnvironmentStore();

  const selectedSchedule = schedules.find(s => s.id === selectedScheduleId);

  const handleTagRemove = (tagToRemove: string) => {
    setEditedSchedule(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const handleTagAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTag.trim()) {
      const tag = newTag.startsWith('@') ? newTag.trim() : `@${newTag.trim()}`;
      if (!editedSchedule.tags.includes(tag)) {
        setEditedSchedule(prev => ({
          ...prev,
          tags: [...prev.tags, tag],
        }));
      }
      setNewTag('');
    }
  };

  const getScheduleIcon = (name: string) => {
    if (name.toLowerCase().includes('nightly')) return 'schedule';
    if (name.toLowerCase().includes('hourly')) return 'timelapse';
    if (name.toLowerCase().includes('weekly')) return 'calendar_today';
    return 'schedule';
  };

  return (
    <div className="h-full flex bg-[#0d1117]">
      {/* Left Sidebar - Schedule List */}
      <aside className="w-[280px] bg-[#161b22] border-r border-[#30363d] flex flex-col shrink-0">
        {/* Header */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-[#30363d]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">Schedules</span>
          <div className="flex gap-2">
            <button className="text-[#8b949e] hover:text-white transition-colors">
              <span className="material-symbols-outlined text-sm">filter_list</span>
            </button>
            <button
              onClick={onCreateSchedule}
              className="text-[#8b949e] hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-sm">add</span>
            </button>
          </div>
        </div>

        {/* Schedule List */}
        <div className="flex-1 overflow-y-auto py-2">
          {schedules.map((schedule) => {
            const isSelected = schedule.id === selectedScheduleId;
            return (
              <div key={schedule.id} className="px-2 mb-1">
                <div
                  onClick={() => onSelectSchedule(schedule.id)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer group transition-colors ${
                    isSelected
                      ? 'bg-[#233448] border-l-2 border-[#197df0]'
                      : 'hover:bg-[#233448]/50 border-l-2 border-transparent'
                  }`}
                >
                  <span className={`material-symbols-outlined text-lg ${
                    isSelected ? 'text-[#197df0]' : 'text-[#8b949e] group-hover:text-white'
                  }`}>
                    {getScheduleIcon(schedule.name)}
                  </span>
                  <div className="flex flex-col overflow-hidden">
                    <span className={`text-sm font-medium truncate ${
                      isSelected ? 'text-white' : 'text-[#c9d1d9]'
                    }`}>
                      {schedule.name}
                    </span>
                    <span className="text-xs text-[#8b949e] truncate">
                      Next: {schedule.nextRun}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {schedules.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-[#8b949e] p-4">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-50">calendar_month</span>
              <p className="text-sm text-center">No schedules configured</p>
              <button
                onClick={onCreateSchedule}
                className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded bg-[#197df0] hover:bg-blue-600 text-white text-xs font-medium transition-colors"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Create Schedule
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-[#0d1117] min-w-0">
        {/* Header */}
        <div className="h-12 flex items-center justify-between px-6 border-b border-[#30363d] bg-[#0d1117]">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#197df0]">edit_calendar</span>
            <h1 className="text-sm font-semibold text-white">
              {editedSchedule.name}
              <span className="text-[#8b949e] font-normal ml-2 text-xs">/ schedule.json</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={editedSchedule.enabled}
                onChange={(e) => setEditedSchedule(prev => ({ ...prev, enabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#197df0]"></div>
              <span className="ms-2 text-xs font-medium text-[#8b949e]">Enabled</span>
            </label>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:px-12 lg:px-24">
          <div className="max-w-4xl mx-auto space-y-8 pb-20">
            {/* Trigger Settings */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#8b949e]">update</span>
                  Trigger Settings
                </h2>
              </div>
              <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5">
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
                    <div>
                      <label className="block text-xs font-medium text-[#8b949e] mb-1.5">Cron Expression</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={editedSchedule.cron}
                          onChange={(e) => setEditedSchedule(prev => ({ ...prev, cron: e.target.value }))}
                          className="w-full bg-[#010409] border border-[#30363d] rounded px-3 py-2 text-sm font-mono text-green-400 focus:outline-none focus:border-[#197df0] focus:ring-1 focus:ring-[#197df0] placeholder-gray-600"
                        />
                        <div className="absolute right-3 top-2.5 text-xs text-[#8b949e] font-mono">UTC</div>
                      </div>
                      <p className="mt-2 text-sm text-[#8b949e] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[#197df0] text-sm">info</span>
                        {editedSchedule.cronDescription}
                      </p>
                    </div>
                    <div className="flex gap-1 pt-6">
                      <button className="bg-[#233448] hover:bg-[#2c3f56] text-white px-3 py-1.5 rounded text-xs font-medium border border-[#30363d] transition-colors">
                        Minute
                      </button>
                      <button className="bg-[#197df0] text-white px-3 py-1.5 rounded text-xs font-medium border border-[#197df0]">
                        Hour
                      </button>
                      <button className="bg-[#233448] hover:bg-[#2c3f56] text-white px-3 py-1.5 rounded text-xs font-medium border border-[#30363d] transition-colors">
                        Day
                      </button>
                      <button className="bg-[#233448] hover:bg-[#2c3f56] text-white px-3 py-1.5 rounded text-xs font-medium border border-[#30363d] transition-colors">
                        Month
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Run Configuration */}
            <section>
              <h2 className="text-lg font-bold text-white tracking-tight mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#8b949e]">tune</span>
                Run Configuration
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-[#8b949e] mb-1.5">Environment</label>
                  <div className="relative">
                    <select
                      value={editedSchedule.environmentId || ''}
                      onChange={(e) => {
                        const envId = e.target.value || undefined;
                        const env = environments.find(env => env.id === envId);
                        setEditedSchedule(prev => ({
                          ...prev,
                          environmentId: envId,
                          environment: env?.name || 'No Environment'
                        }));
                      }}
                      className="w-full appearance-none bg-[#161b22] border border-[#30363d] rounded px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#197df0] focus:ring-1 focus:ring-[#197df0] cursor-pointer"
                    >
                      <option value="">Use active environment</option>
                      {environments.map((env) => (
                        <option key={env.id} value={env.id}>
                          {env.name} {env.isActive && '(Active)'}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-2.5 text-[#8b949e] pointer-events-none text-lg">expand_more</span>
                  </div>
                  <p className="mt-1 text-xs text-[#6e7681]">
                    Environment variables like <code className="px-1 py-0.5 bg-[#21262d] rounded text-[#58a6ff]">{'{{baseUrl}}'}</code> will be resolved from this environment.
                  </p>
                  {environments.length === 0 && (
                    <p className="mt-1 text-xs text-[#f0883e]">
                      No environments defined. Click the environment dropdown in the header to create one.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#8b949e] mb-1.5">Retry Strategy</label>
                  <div className="relative">
                    <select
                      value={editedSchedule.retryStrategy}
                      onChange={(e) => setEditedSchedule(prev => ({ ...prev, retryStrategy: e.target.value }))}
                      className="w-full appearance-none bg-[#161b22] border border-[#30363d] rounded px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#197df0] focus:ring-1 focus:ring-[#197df0] cursor-pointer"
                    >
                      <option>Retry failed tests (2x)</option>
                      <option>No Retry</option>
                      <option>Retry failed tests (1x)</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-2.5 text-[#8b949e] pointer-events-none text-lg">expand_more</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Tests to Run */}
            <section>
              <h2 className="text-lg font-bold text-white tracking-tight mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#8b949e]">fact_check</span>
                Tests to Run
              </h2>
              <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5">
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#8b949e] mb-1.5">Filter by Tags</label>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#8b949e] pointer-events-none">tag</span>
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={handleTagAdd}
                        placeholder="Search tags (e.g. @smoke, @p0)..."
                        className="w-full bg-[#010409] border border-[#30363d] rounded px-3 pl-10 py-2 text-sm font-mono text-white placeholder-gray-600 focus:border-[#197df0] focus:ring-1 focus:ring-[#197df0] focus:outline-none transition-all"
                      />
                      <div className="absolute right-3 top-2 flex items-center gap-1">
                        <kbd className="hidden md:inline-flex items-center h-5 px-1.5 text-[10px] font-mono text-[#8b949e] bg-[#233448] border border-[#30363d] rounded">
                          Cmd+K
                        </kbd>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {editedSchedule.tags.map((tag) => (
                      <div
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1f6feb]/15 border border-[#1f6feb]/40 text-[#58a6ff] text-xs font-mono"
                      >
                        {tag}
                        <button
                          onClick={() => handleTagRemove(tag)}
                          className="hover:text-white transition-colors flex items-center justify-center"
                        >
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Match Count */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#30363d] mt-1">
                    <div className="flex items-center gap-2 text-sm text-[#8b949e]">
                      <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
                      <span>
                        Matches <span className="text-white font-mono font-semibold">42</span> scenarios
                      </span>
                    </div>
                    <div className="text-xs text-[#8b949e]">
                      <button className="hover:text-[#197df0] cursor-pointer transition-colors focus:outline-none">
                        View details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Notification Settings */}
            <section>
              <h2 className="text-lg font-bold text-white tracking-tight mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#8b949e]">notifications</span>
                Notification Settings
              </h2>
              <div className="bg-[#161b22] border border-[#30363d] rounded-lg divide-y divide-[#30363d]">
                {/* Slack */}
                <div className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#4A154B] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-white text-lg">tag</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Slack</p>
                      <p className="text-xs text-[#8b949e]">Post run summaries to a channel</p>
                    </div>
                  </div>
                  <div className="flex flex-1 w-full md:w-auto items-center gap-4 justify-end">
                    <input
                      type="text"
                      placeholder="https://hooks.slack.com/services/..."
                      value={editedSchedule.notifications.slack.webhook}
                      onChange={(e) => setEditedSchedule(prev => ({
                        ...prev,
                        notifications: {
                          ...prev.notifications,
                          slack: { ...prev.notifications.slack, webhook: e.target.value }
                        }
                      }))}
                      className="hidden md:block flex-1 max-w-sm bg-[#010409] border border-[#30363d] rounded px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:border-[#197df0] focus:outline-none"
                    />
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editedSchedule.notifications.slack.enabled}
                        onChange={(e) => setEditedSchedule(prev => ({
                          ...prev,
                          notifications: {
                            ...prev.notifications,
                            slack: { ...prev.notifications.slack, enabled: e.target.checked }
                          }
                        }))}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#197df0]"></div>
                    </label>
                  </div>
                </div>

                {/* Email */}
                <div className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-white text-lg">mail</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Email</p>
                      <p className="text-xs text-[#8b949e]">Send report to team distribution list</p>
                    </div>
                  </div>
                  <div className="flex flex-1 w-full md:w-auto items-center gap-4 justify-end">
                    <input
                      type="text"
                      value={editedSchedule.notifications.email.address}
                      disabled={!editedSchedule.notifications.email.enabled}
                      onChange={(e) => setEditedSchedule(prev => ({
                        ...prev,
                        notifications: {
                          ...prev.notifications,
                          email: { ...prev.notifications.email, address: e.target.value }
                        }
                      }))}
                      className="hidden md:block flex-1 max-w-sm bg-[#010409] border border-[#30363d] rounded px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:border-[#197df0] focus:outline-none disabled:opacity-50"
                    />
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editedSchedule.notifications.email.enabled}
                        onChange={(e) => setEditedSchedule(prev => ({
                          ...prev,
                          notifications: {
                            ...prev.notifications,
                            email: { ...prev.notifications.email, enabled: e.target.checked }
                          }
                        }))}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#197df0]"></div>
                    </label>
                  </div>
                </div>

                {/* Microsoft Teams */}
                <div className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#6264A7] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-white text-lg">group</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Microsoft Teams</p>
                      <p className="text-xs text-[#8b949e]">Send alerts to Teams channel</p>
                    </div>
                  </div>
                  <div className="flex flex-1 w-full md:w-auto items-center gap-4 justify-end">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editedSchedule.notifications.teams.enabled}
                        onChange={(e) => setEditedSchedule(prev => ({
                          ...prev,
                          notifications: {
                            ...prev.notifications,
                            teams: { enabled: e.target.checked }
                          }
                        }))}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#197df0]"></div>
                    </label>
                  </div>
                </div>
              </div>
            </section>

            {/* Reporting & Artifacts */}
            <section>
              <h2 className="text-lg font-bold text-white tracking-tight mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#8b949e]">summarize</span>
                Reporting &amp; Artifacts
              </h2>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={editedSchedule.reporting.allureReport}
                      onChange={(e) => setEditedSchedule(prev => ({
                        ...prev,
                        reporting: { ...prev.reporting, allureReport: e.target.checked }
                      }))}
                      className="peer h-5 w-5 border-2 border-[#324b67] rounded bg-transparent appearance-none checked:border-[#197df0] checked:bg-[#197df0] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </div>
                  <span className="text-sm text-white group-hover:text-[#197df0] transition-colors">Generate Allure Report</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={editedSchedule.reporting.traceOnFailure}
                      onChange={(e) => setEditedSchedule(prev => ({
                        ...prev,
                        reporting: { ...prev.reporting, traceOnFailure: e.target.checked }
                      }))}
                      className="peer h-5 w-5 border-2 border-[#324b67] rounded bg-transparent appearance-none checked:border-[#197df0] checked:bg-[#197df0] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </div>
                  <span className="text-sm text-white group-hover:text-[#197df0] transition-colors">Retain Trace on Failure</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={editedSchedule.reporting.recordVideo}
                      onChange={(e) => setEditedSchedule(prev => ({
                        ...prev,
                        reporting: { ...prev.reporting, recordVideo: e.target.checked }
                      }))}
                      className="peer h-5 w-5 border-2 border-[#324b67] rounded bg-transparent appearance-none checked:border-[#197df0] checked:bg-[#197df0] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </div>
                  <span className="text-sm text-white group-hover:text-[#197df0] transition-colors">Record Video</span>
                </label>
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="h-16 bg-[#161b22] border-t border-[#30363d] flex items-center justify-between px-6 md:px-12 lg:px-24 shrink-0">
          <div className="flex items-center gap-2 text-[#8b949e] text-sm">
            <span className="material-symbols-outlined text-lg">history</span>
            <span>
              Last run: {selectedSchedule?.lastRun?.time || 'Never'}
              {selectedSchedule?.lastRun && ` (${selectedSchedule.lastRun.status === 'success' ? 'Success' : 'Failed'})`}
            </span>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => selectedScheduleId && onRunNow(selectedScheduleId)}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-[#233448] hover:bg-[#2c3f56] text-white border border-[#30363d] font-medium transition-all text-sm"
            >
              <span className="material-symbols-outlined text-lg">play_arrow</span>
              Run Now
            </button>
            <button
              onClick={() => onSaveSchedule(editedSchedule)}
              className="flex items-center gap-2 px-6 py-2 rounded-md bg-[#197df0] hover:bg-blue-600 text-white font-semibold shadow-lg shadow-blue-500/20 transition-all text-sm"
            >
              <span className="material-symbols-outlined text-lg">save</span>
              Save Schedule
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
