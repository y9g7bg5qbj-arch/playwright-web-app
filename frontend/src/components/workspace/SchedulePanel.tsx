import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CalendarClock,
  Clock3,
  Filter,
  Loader2,
  Mail,
  MessageSquare,
  Play,
  Plus,
  Save,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { useEnvironmentStore } from '@/store/environmentStore';
import { useScheduleStore } from '@/store/scheduleStore';

export interface Schedule {
  id: string;
  name: string;
  cron: string;
  cronDescription: string;
  environment: string;
  environmentId?: string;
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
  schedules?: Schedule[];
  selectedScheduleId?: string | null;
  onSelectSchedule?: (id: string) => void;
  onCreateSchedule?: () => void;
  onSaveSchedule?: (schedule: Schedule) => void;
  onRunNow?: (id: string) => void;
  onDeleteSchedule?: (id: string) => void;
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

const inputClass =
  'w-full rounded-md border border-border-default bg-dark-canvas px-3 py-2 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-border-active focus:ring-2 focus:ring-brand-primary/20';
const sectionClass = 'rounded-lg border border-border-default bg-dark-card p-4';

const retryOptions = ['No Retry', 'Retry failed tests (1x)', 'Retry failed tests (2x)', 'Retry failed tests (3x)'];

function normalizeTag(rawTag: string): string {
  const trimmed = rawTag.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-10 items-center rounded-full border transition-colors ${
        checked
          ? 'border-brand-primary bg-brand-primary/30'
          : 'border-border-default bg-dark-elevated'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export function SchedulePanel(props: SchedulePanelProps) {
  const store = useScheduleStore();
  const { environments } = useEnvironmentStore();

  // Use store by default, fall back to props for backward compatibility
  const schedules = props.schedules ?? store.schedules;
  const selectedScheduleId = props.selectedScheduleId ?? store.selectedScheduleId;
  const onSelectSchedule = props.onSelectSchedule ?? store.selectSchedule;
  const onCreateSchedule = props.onCreateSchedule ?? store.createSchedule;
  const onSaveSchedule = props.onSaveSchedule ?? store.saveSchedule;
  const onRunNow = props.onRunNow ?? store.runNow;
  const onDeleteSchedule = props.onDeleteSchedule ?? store.deleteSchedule;

  // Fetch schedules on mount when using store (no props passed)
  useEffect(() => {
    if (!props.schedules) {
      store.fetchSchedules();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [editedSchedule, setEditedSchedule] = useState<Schedule>(
    schedules.find((schedule) => schedule.id === selectedScheduleId) || defaultSchedule
  );
  const [newTag, setNewTag] = useState('');

  const selectedSchedule = useMemo(
    () => schedules.find((schedule) => schedule.id === selectedScheduleId) || null,
    [schedules, selectedScheduleId]
  );

  useEffect(() => {
    setEditedSchedule(selectedSchedule || defaultSchedule);
  }, [selectedSchedule]);

  const handleTagRemove = (tagToRemove: string) => {
    setEditedSchedule((previous) => ({
      ...previous,
      tags: previous.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleTagAdd = () => {
    const normalized = normalizeTag(newTag);
    if (!normalized || editedSchedule.tags.includes(normalized)) {
      setNewTag('');
      return;
    }

    setEditedSchedule((previous) => ({
      ...previous,
      tags: [...previous.tags, normalized],
    }));
    setNewTag('');
  };

  const scheduleName = editedSchedule.name || selectedSchedule?.name || 'Untitled Schedule';

  return (
    <div className="flex h-full bg-dark-canvas">
      <aside className="flex w-[300px] shrink-0 flex-col border-r border-border-default bg-dark-bg">
        <div className="flex h-11 items-center justify-between border-b border-border-default px-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-brand-secondary" />
            <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Schedules</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded border border-border-default text-text-secondary transition-colors hover:border-border-emphasis hover:text-text-primary"
              title="Filter schedules"
            >
              <Filter className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onCreateSchedule}
              className="inline-flex h-7 w-7 items-center justify-center rounded border border-border-default text-text-secondary transition-colors hover:border-border-emphasis hover:text-text-primary"
              title="Create schedule"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {store.loading && !props.schedules ? (
            <div className="mt-8 flex flex-col items-center gap-2 text-text-muted">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-xs">Loading schedules...</p>
            </div>
          ) : schedules.length > 0 ? (
            <div className="space-y-1.5">
              {schedules.map((schedule) => {
                const selected = schedule.id === selectedScheduleId;
                return (
                  <button
                    key={schedule.id}
                    onClick={() => onSelectSchedule(schedule.id)}
                    className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                      selected
                        ? 'border-border-active bg-brand-primary/12'
                        : 'border-transparent bg-transparent hover:border-border-default hover:bg-dark-elevated/45'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-text-primary">{schedule.name}</span>
                      <span
                        className={`inline-flex h-2 w-2 rounded-full ${
                          schedule.enabled ? 'bg-status-success' : 'bg-text-muted'
                        }`}
                      />
                    </div>
                    <div className="mt-1 text-xs text-text-muted">Next run: {schedule.nextRun}</div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-8 rounded-lg border border-dashed border-border-default p-4 text-center">
              <CalendarClock className="mx-auto h-8 w-8 text-text-muted" />
              <p className="mt-2 text-sm text-text-secondary">No schedules configured</p>
              <button
                type="button"
                onClick={onCreateSchedule}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-brand-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-hover"
              >
                <Plus className="h-3.5 w-3.5" />
                Create schedule
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col bg-dark-canvas">
        <header className="flex h-12 items-center justify-between border-b border-border-default bg-dark-bg px-6">
          <div className="flex min-w-0 items-center gap-3">
            <CalendarClock className="h-4 w-4 text-brand-secondary" />
            <input
              type="text"
              value={editedSchedule.name}
              onChange={(event) =>
                setEditedSchedule((previous) => ({
                  ...previous,
                  name: event.target.value,
                }))
              }
              className="min-w-[220px] bg-transparent text-sm font-semibold text-text-primary outline-none"
              placeholder="Schedule name"
            />
            <span className="truncate text-xs text-text-muted">{scheduleName}.schedule.json</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <span>Enabled</span>
            <Toggle
              checked={editedSchedule.enabled}
              onChange={(next) => setEditedSchedule((previous) => ({ ...previous, enabled: next }))}
            />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
          <div className="mx-auto max-w-5xl space-y-5 pb-20">
            <section className={sectionClass}>
              <div className="mb-3 flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-brand-secondary" />
                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Trigger Settings</p>
              </div>
              <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                <div>
                  <label className="text-xs font-medium text-text-secondary">Cron Expression (UTC)</label>
                  <input
                    type="text"
                    value={editedSchedule.cron}
                    onChange={(event) =>
                      setEditedSchedule((previous) => ({
                        ...previous,
                        cron: event.target.value,
                      }))
                    }
                    className={cx(inputClass, 'mt-2 font-mono')}
                  />
                  <p className="mt-2 text-xs text-text-muted">{editedSchedule.cronDescription}</p>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  {['Minute', 'Hour', 'Day', 'Month'].map((label) => (
                    <button
                      key={label}
                      type="button"
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                        label === 'Hour'
                          ? 'border-border-active bg-brand-primary/20 text-text-primary'
                          : 'border-border-default bg-dark-elevated/45 text-text-secondary hover:border-border-emphasis hover:text-text-primary'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-5 md:grid-cols-2">
              <div className={sectionClass}>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Run Configuration</p>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-text-secondary">Environment</label>
                    <select
                      value={editedSchedule.environmentId || ''}
                      onChange={(event) => {
                        const environmentId = event.target.value || undefined;
                        const environment = environments.find((item) => item.id === environmentId);
                        setEditedSchedule((previous) => ({
                          ...previous,
                          environmentId,
                          environment: environment?.name || 'Use active environment',
                        }));
                      }}
                      className={cx(inputClass, 'mt-2')}
                    >
                      <option value="">Use active environment</option>
                      {environments.map((environment) => (
                        <option key={environment.id} value={environment.id}>
                          {environment.name} {environment.isActive && '(Active)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-text-secondary">Retry Strategy</label>
                    <select
                      value={editedSchedule.retryStrategy}
                      onChange={(event) =>
                        setEditedSchedule((previous) => ({
                          ...previous,
                          retryStrategy: event.target.value,
                        }))
                      }
                      className={cx(inputClass, 'mt-2')}
                    >
                      {retryOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className={sectionClass}>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Scenario Tags</p>
                <div className="mt-3">
                  <label className="text-xs font-medium text-text-secondary">Add Tag Filter</label>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="relative flex-1">
                      <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                      <input
                        type="text"
                        value={newTag}
                        onChange={(event) => setNewTag(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            handleTagAdd();
                          }
                        }}
                        placeholder="@smoke"
                        className={cx(inputClass, 'pl-10 font-mono')}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleTagAdd}
                      className="rounded-md border border-border-default bg-dark-elevated/45 px-3 py-2 text-xs text-text-secondary transition-colors hover:border-border-emphasis hover:text-text-primary"
                    >
                      Add
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {editedSchedule.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full border border-brand-primary/35 bg-brand-primary/15 px-2.5 py-1 text-xs font-mono text-brand-secondary"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleTagRemove(tag)}
                        className="text-text-secondary transition-colors hover:text-text-primary"
                        title={`Remove ${tag}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <section className={sectionClass}>
              <div className="mb-3 flex items-center gap-2">
                <Bell className="h-4 w-4 text-brand-secondary" />
                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Notifications</p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-md border border-border-default bg-dark-elevated/40 p-3">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 text-sm font-medium text-text-primary">
                      <MessageSquare className="h-4 w-4 text-text-secondary" />
                      Slack
                    </div>
                    <Toggle
                      checked={editedSchedule.notifications.slack.enabled}
                      onChange={(next) =>
                        setEditedSchedule((previous) => ({
                          ...previous,
                          notifications: {
                            ...previous.notifications,
                            slack: { ...previous.notifications.slack, enabled: next },
                          },
                        }))
                      }
                    />
                  </div>
                  <input
                    type="text"
                    value={editedSchedule.notifications.slack.webhook}
                    onChange={(event) =>
                      setEditedSchedule((previous) => ({
                        ...previous,
                        notifications: {
                          ...previous.notifications,
                          slack: { ...previous.notifications.slack, webhook: event.target.value },
                        },
                      }))
                    }
                    placeholder="Webhook URL"
                    className={cx(inputClass, 'mt-3 text-xs')}
                  />
                </div>

                <div className="rounded-md border border-border-default bg-dark-elevated/40 p-3">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 text-sm font-medium text-text-primary">
                      <Mail className="h-4 w-4 text-text-secondary" />
                      Email
                    </div>
                    <Toggle
                      checked={editedSchedule.notifications.email.enabled}
                      onChange={(next) =>
                        setEditedSchedule((previous) => ({
                          ...previous,
                          notifications: {
                            ...previous.notifications,
                            email: { ...previous.notifications.email, enabled: next },
                          },
                        }))
                      }
                    />
                  </div>
                  <input
                    type="text"
                    value={editedSchedule.notifications.email.address}
                    disabled={!editedSchedule.notifications.email.enabled}
                    onChange={(event) =>
                      setEditedSchedule((previous) => ({
                        ...previous,
                        notifications: {
                          ...previous.notifications,
                          email: { ...previous.notifications.email, address: event.target.value },
                        },
                      }))
                    }
                    placeholder="qa-team@company.com"
                    className={cx(inputClass, 'mt-3 text-xs disabled:cursor-not-allowed disabled:opacity-60')}
                  />
                </div>

                <div className="rounded-md border border-border-default bg-dark-elevated/40 p-3">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 text-sm font-medium text-text-primary">
                      <MessageSquare className="h-4 w-4 text-text-secondary" />
                      Teams
                    </div>
                    <Toggle
                      checked={editedSchedule.notifications.teams.enabled}
                      onChange={(next) =>
                        setEditedSchedule((previous) => ({
                          ...previous,
                          notifications: {
                            ...previous.notifications,
                            teams: { enabled: next },
                          },
                        }))
                      }
                    />
                  </div>
                  <p className="mt-3 text-xs text-text-muted">Teams webhook delivery for run summaries.</p>
                </div>
              </div>
            </section>

            <section className={sectionClass}>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Artifacts</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {[
                  {
                    key: 'allureReport',
                    label: 'Generate Allure Report',
                    value: editedSchedule.reporting.allureReport,
                  },
                  {
                    key: 'traceOnFailure',
                    label: 'Retain Trace on Failure',
                    value: editedSchedule.reporting.traceOnFailure,
                  },
                  {
                    key: 'recordVideo',
                    label: 'Record Video',
                    value: editedSchedule.reporting.recordVideo,
                  },
                ].map((setting) => (
                  <label
                    key={setting.key}
                    className="flex items-center justify-between rounded-md border border-border-default bg-dark-elevated/40 px-3 py-2 text-sm text-text-primary"
                  >
                    {setting.label}
                    <input
                      type="checkbox"
                      checked={setting.value}
                      onChange={(event) =>
                        setEditedSchedule((previous) => ({
                          ...previous,
                          reporting: {
                            ...previous.reporting,
                            [setting.key]: event.target.checked,
                          },
                        }))
                      }
                      className="h-4 w-4 rounded border-border-default bg-dark-canvas text-brand-primary focus:ring-brand-primary/30"
                    />
                  </label>
                ))}
              </div>
            </section>
          </div>
        </div>

        <footer className="flex h-14 items-center justify-between border-t border-border-default bg-dark-bg px-6">
          <div className="text-xs text-text-secondary">
            Last run:{' '}
            {selectedSchedule?.lastRun
              ? `${selectedSchedule.lastRun.time} (${selectedSchedule.lastRun.status})`
              : 'Never'}
          </div>
          <div className="flex items-center gap-2">
            {selectedScheduleId && (
              <button
                type="button"
                onClick={() => onDeleteSchedule(selectedScheduleId)}
                className="inline-flex items-center gap-1.5 rounded-md border border-status-danger/35 bg-status-danger/10 px-3 py-1.5 text-xs font-medium text-status-danger transition-colors hover:bg-status-danger/15"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={() => selectedScheduleId && onRunNow(selectedScheduleId)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border-default bg-dark-elevated/45 px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-border-emphasis"
            >
              <Play className="h-3.5 w-3.5" />
              Run Now
            </button>
            <button
              type="button"
              onClick={() => onSaveSchedule(editedSchedule)}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              <Save className="h-3.5 w-3.5" />
              Save Schedule
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}

function cx(...classes: Array<string | undefined | null | false>): string {
  return classes.filter(Boolean).join(' ');
}
