import type { SchedulePreset } from '@/api/schedules';

export const CRON_PRESETS: SchedulePreset[] = [
  { label: 'Every hour', cronExpression: '0 * * * *', description: 'Runs at the start of every hour' },
  { label: 'Every 30 minutes', cronExpression: '*/30 * * * *', description: 'Runs twice per hour' },
  { label: 'Every 6 hours', cronExpression: '0 */6 * * *', description: 'Runs 4 times daily' },
  { label: 'Daily at midnight', cronExpression: '0 0 * * *', description: 'Runs once daily at 12:00 AM' },
  { label: 'Daily at 6 AM', cronExpression: '0 6 * * *', description: 'Runs once daily at 6:00 AM' },
  { label: 'Daily at 2 AM', cronExpression: '0 2 * * *', description: 'Ideal for nightly regression' },
  { label: 'Weekdays at 9 AM', cronExpression: '0 9 * * 1-5', description: 'Business hours only' },
  { label: 'Every Monday at 6 AM', cronExpression: '0 6 * * 1', description: 'Weekly smoke tests' },
  { label: 'Custom', cronExpression: '', description: 'Enter your own cron expression' },
];

export function formatDate(date: Date | string | undefined | null): string {
  if (!date) return 'Never';
  const d = new Date(date);
  return d.toLocaleString();
}

export function formatRelativeTime(date: Date | string | undefined | null): string {
  if (!date) return 'Never';
  const d = new Date(date);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const absDiff = Math.abs(diff);

  if (absDiff < 60000) return diff > 0 ? 'in less than a minute' : 'just now';
  if (absDiff < 3600000) {
    const mins = Math.round(absDiff / 60000);
    return diff > 0 ? `in ${mins} min` : `${mins} min ago`;
  }
  if (absDiff < 86400000) {
    const hours = Math.round(absDiff / 3600000);
    return diff > 0 ? `in ${hours} hr` : `${hours} hr ago`;
  }
  const days = Math.round(absDiff / 86400000);
  return diff > 0 ? `in ${days} days` : `${days} days ago`;
}

export function formatDuration(ms: number | undefined): string {
  if (!ms) return '';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
}
