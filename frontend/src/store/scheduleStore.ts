import { create } from 'zustand';
import { schedulesApi } from '@/api/schedules';
import type { Schedule as UISchedule } from '@/components/workspace/SchedulePanel';
import type {
  Schedule as BackendSchedule,
} from '@playwright-web-app/shared';

// ============================================
// Backend ↔ Frontend type mapping
// ============================================

function formatRelativeTime(dateInput?: Date | string | null): string {
  if (!dateInput) return 'Never';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const absDiffMs = Math.abs(diffMs);

  if (absDiffMs < 60_000) return diffMs > 0 ? 'in a moment' : 'just now';
  if (absDiffMs < 3_600_000) {
    const mins = Math.round(absDiffMs / 60_000);
    return diffMs > 0 ? `in ${mins} min` : `${mins} min ago`;
  }
  if (absDiffMs < 86_400_000) {
    const hours = Math.round(absDiffMs / 3_600_000);
    return diffMs > 0 ? `in ${hours} hours` : `${hours} hours ago`;
  }
  const days = Math.round(absDiffMs / 86_400_000);
  return diffMs > 0 ? `in ${days} days` : `${days} days ago`;
}

function retryCountToStrategy(retries?: number): string {
  if (!retries || retries === 0) return 'No Retry';
  return `Retry failed tests (${retries}x)`;
}

function retryStrategyToCount(strategy: string): number {
  const match = strategy.match(/\((\d+)x\)/);
  return match ? parseInt(match[1], 10) : 0;
}

function backendToUI(b: BackendSchedule): UISchedule {
  const lastRun = b.runs?.length ? b.runs[b.runs.length - 1] : null;
  const selectedEnvironmentId = b.defaultExecutionConfig?.environmentId;

  return {
    id: b.id,
    name: b.name,
    cron: b.cronExpression,
    cronDescription: b.description || b.cronExpression,
    environment: selectedEnvironmentId ? 'Selected environment' : 'Use active environment',
    environmentId: selectedEnvironmentId,
    parameterSetId: b.defaultExecutionConfig?.parameterSetId,
    retryStrategy: retryCountToStrategy(b.defaultExecutionConfig?.retries),
    enabled: b.isActive,
    nextRun: formatRelativeTime(b.nextRunAt),
    lastRun: lastRun
      ? {
          status: (lastRun.status === 'passed' ? 'success' : 'failed') as 'success' | 'failed',
          time: formatRelativeTime(lastRun.completedAt || lastRun.startedAt),
        }
      : b.lastRunAt
        ? { status: 'success' as const, time: formatRelativeTime(b.lastRunAt) }
        : undefined,
    tags: b.testSelector?.tags || [],
    notifications: {
      slack: {
        enabled: !!b.notificationConfig?.slack?.webhook,
        webhook: b.notificationConfig?.slack?.webhook || '',
      },
      email: {
        enabled: (b.notificationConfig?.email?.length ?? 0) > 0,
        address: b.notificationConfig?.email?.[0] || '',
      },
      teams: { enabled: false },
    },
    reporting: {
      traceOnFailure: b.defaultExecutionConfig?.tracing === 'on-failure'
        || b.defaultExecutionConfig?.tracing === 'always',
      recordVideo: b.defaultExecutionConfig?.video === 'on-failure'
        || b.defaultExecutionConfig?.video === 'always',
    },
  };
}

function uiToCreatePayload(ui: UISchedule): any {
  return {
    workflowId: (ui as any).workflowId || '',
    runConfigurationId: (ui as any).runConfigurationId || '',
    name: ui.name,
    cronExpression: ui.cron,
    description: ui.cronDescription,
    isActive: ui.enabled,
    testSelector: { tags: ui.tags },
    notificationConfig: {
      slack: ui.notifications.slack.enabled && ui.notifications.slack.webhook
        ? { webhook: ui.notifications.slack.webhook }
        : undefined,
      email: ui.notifications.email.enabled && ui.notifications.email.address
        ? [ui.notifications.email.address]
        : undefined,
    },
    defaultExecutionConfig: {
      retries: retryStrategyToCount(ui.retryStrategy),
      tracing: ui.reporting.traceOnFailure ? 'on-failure' : 'never',
      video: ui.reporting.recordVideo ? 'on-failure' : 'never',
      environmentId: ui.environmentId,
      parameterSetId: ui.parameterSetId,
    },
  };
}

function uiToUpdatePayload(ui: UISchedule): any {
  return uiToCreatePayload(ui);
}

// ============================================
// Store
// ============================================

interface ScheduleState {
  schedules: UISchedule[];
  selectedScheduleId: string | null;
  loading: boolean;
  error: string | null;

  fetchSchedules: () => Promise<void>;
  createSchedule: () => Promise<void>;
  saveSchedule: (schedule: UISchedule) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  runNow: (id: string) => Promise<void>;
  selectSchedule: (id: string) => void;
}

export const useScheduleStore = create<ScheduleState>()((set, get) => ({
  schedules: [],
  selectedScheduleId: null,
  loading: false,
  error: null,

  fetchSchedules: async () => {
    set({ loading: true, error: null });
    try {
      const backendSchedules = await schedulesApi.list();
      const schedules = backendSchedules.map(backendToUI);
      const { selectedScheduleId } = get();
      set({
        schedules,
        loading: false,
        selectedScheduleId:
          selectedScheduleId && schedules.some((s) => s.id === selectedScheduleId)
            ? selectedScheduleId
            : schedules[0]?.id || null,
      });
    } catch (err: any) {
      set({ loading: false, error: err.message || 'Failed to fetch schedules' });
    }
  },

  createSchedule: async () => {
    const payload: any = {
      workflowId: '',
      runConfigurationId: '',
      name: 'New Schedule',
      cronExpression: '0 0 * * *',
      isActive: false,
      testSelector: { tags: [] },
      defaultExecutionConfig: { retries: 0 },
    };

    try {
      const created = await schedulesApi.create(payload);
      const uiSchedule = backendToUI(created);
      set((state) => ({
        schedules: [...state.schedules, uiSchedule],
        selectedScheduleId: uiSchedule.id,
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to create schedule' });
    }
  },

  saveSchedule: async (schedule: UISchedule) => {
    try {
      const updated = await schedulesApi.update(schedule.id, uiToUpdatePayload(schedule));
      const uiUpdated = backendToUI(updated);
      set((state) => ({
        schedules: state.schedules.map((s) => (s.id === uiUpdated.id ? uiUpdated : s)),
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to save schedule' });
    }
  },

  deleteSchedule: async (id: string) => {
    try {
      await schedulesApi.delete(id);
      set((state) => {
        const remaining = state.schedules.filter((s) => s.id !== id);
        return {
          schedules: remaining,
          selectedScheduleId:
            state.selectedScheduleId === id
              ? remaining[0]?.id || null
              : state.selectedScheduleId,
        };
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete schedule' });
    }
  },

  runNow: async (id: string) => {
    try {
      await schedulesApi.triggerRun(id);
    } catch (err: any) {
      set({ error: err.message || 'Failed to trigger run' });
    }
  },

  selectSchedule: (id: string) => set({ selectedScheduleId: id }),
}));
