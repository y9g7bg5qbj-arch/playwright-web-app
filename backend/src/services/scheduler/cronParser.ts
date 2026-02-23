/**
 * Cron Expression Parser and Utility
 * Provides parsing, validation, and calculation of cron expressions
 */

import { CronExpressionParser } from 'cron-parser';

// Cron field ranges
const CRON_RANGES = {
  minute: { min: 0, max: 59 },
  hour: { min: 0, max: 23 },
  dayOfMonth: { min: 1, max: 31 },
  month: { min: 1, max: 12 },
  dayOfWeek: { min: 0, max: 7 }, // 0 and 7 both represent Sunday
};

// Month names for parsing
const MONTH_NAMES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

// Day names for parsing
const DAY_NAMES: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

// Common preset aliases
const CRON_PRESETS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};

export interface CronValidationResult {
  valid: boolean;
  error?: string;
  normalized?: string;
}

export interface CronField {
  type: 'minute' | 'hour' | 'dayOfMonth' | 'month' | 'dayOfWeek';
  values: number[];
  raw: string;
}

export interface ParsedCron {
  minute: CronField;
  hour: CronField;
  dayOfMonth: CronField;
  month: CronField;
  dayOfWeek: CronField;
  original: string;
}

/**
 * Parse a cron field value into an array of valid values
 */
function parseField(
  value: string,
  type: keyof typeof CRON_RANGES
): { values: number[]; error?: string } {
  const range = CRON_RANGES[type];
  const values: number[] = [];

  // Handle wildcard
  if (value === '*') {
    for (let i = range.min; i <= range.max; i++) {
      values.push(i);
    }
    return { values };
  }

  // Split by comma for multiple values
  const parts = value.split(',');

  for (const part of parts) {
    // Handle step values (*/5, 1-10/2)
    if (part.includes('/')) {
      const [rangeStr, stepStr] = part.split('/');
      const step = parseInt(stepStr, 10);

      if (isNaN(step) || step <= 0) {
        return { values: [], error: `Invalid step value: ${stepStr}` };
      }

      let start = range.min;
      let end = range.max;

      if (rangeStr !== '*') {
        if (rangeStr.includes('-')) {
          const [s, e] = rangeStr.split('-').map(n => parseInt(n, 10));
          start = s;
          end = e;
        } else {
          start = parseInt(rangeStr, 10);
        }
      }

      for (let i = start; i <= end; i += step) {
        if (i >= range.min && i <= range.max) {
          values.push(i);
        }
      }
      continue;
    }

    // Handle ranges (1-5)
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      let start = parseInt(startStr, 10);
      let end = parseInt(endStr, 10);

      // Handle named months/days
      if (type === 'month') {
        start = MONTH_NAMES[startStr.toLowerCase()] || start;
        end = MONTH_NAMES[endStr.toLowerCase()] || end;
      } else if (type === 'dayOfWeek') {
        start = DAY_NAMES[startStr.toLowerCase()] ?? start;
        end = DAY_NAMES[endStr.toLowerCase()] ?? end;
      }

      if (isNaN(start) || isNaN(end)) {
        return { values: [], error: `Invalid range: ${part}` };
      }

      for (let i = start; i <= end; i++) {
        if (i >= range.min && i <= range.max) {
          values.push(i);
        }
      }
      continue;
    }

    // Handle single value
    let num = parseInt(part, 10);

    // Handle named months/days
    if (type === 'month') {
      num = MONTH_NAMES[part.toLowerCase()] || num;
    } else if (type === 'dayOfWeek') {
      num = DAY_NAMES[part.toLowerCase()] ?? num;
    }

    if (isNaN(num) || num < range.min || num > range.max) {
      return { values: [], error: `Invalid value for ${type}: ${part} (must be ${range.min}-${range.max})` };
    }

    values.push(num);
  }

  // Normalize day of week (7 = 0 = Sunday)
  if (type === 'dayOfWeek') {
    return { values: values.map(v => v === 7 ? 0 : v) };
  }

  return { values: [...new Set(values)].sort((a, b) => a - b) };
}

/**
 * Parse a cron expression into its components
 */
export function parseCronExpression(expression: string): ParsedCron | null {
  // Handle preset aliases
  const normalized = CRON_PRESETS[expression.toLowerCase()] || expression;
  const parts = normalized.trim().split(/\s+/);

  if (parts.length !== 5) {
    return null;
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  const minuteResult = parseField(minute, 'minute');
  const hourResult = parseField(hour, 'hour');
  const dayOfMonthResult = parseField(dayOfMonth, 'dayOfMonth');
  const monthResult = parseField(month, 'month');
  const dayOfWeekResult = parseField(dayOfWeek, 'dayOfWeek');

  if (
    minuteResult.error ||
    hourResult.error ||
    dayOfMonthResult.error ||
    monthResult.error ||
    dayOfWeekResult.error
  ) {
    return null;
  }

  return {
    minute: { type: 'minute', values: minuteResult.values, raw: minute },
    hour: { type: 'hour', values: hourResult.values, raw: hour },
    dayOfMonth: { type: 'dayOfMonth', values: dayOfMonthResult.values, raw: dayOfMonth },
    month: { type: 'month', values: monthResult.values, raw: month },
    dayOfWeek: { type: 'dayOfWeek', values: dayOfWeekResult.values, raw: dayOfWeek },
    original: expression,
  };
}

/**
 * Validate a cron expression
 */
export function validateCronExpression(expression: string): CronValidationResult {
  // Handle preset aliases
  const normalized = CRON_PRESETS[expression.toLowerCase()] || expression;
  const parts = normalized.trim().split(/\s+/);

  if (parts.length !== 5) {
    return {
      valid: false,
      error: 'Cron expression must have 5 fields (minute, hour, day of month, month, day of week)',
    };
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  const fields: [string, keyof typeof CRON_RANGES][] = [
    [minute, 'minute'],
    [hour, 'hour'],
    [dayOfMonth, 'dayOfMonth'],
    [month, 'month'],
    [dayOfWeek, 'dayOfWeek'],
  ];

  for (const [value, type] of fields) {
    const result = parseField(value, type);
    if (result.error) {
      return { valid: false, error: result.error };
    }
    if (result.values.length === 0) {
      return { valid: false, error: `Invalid ${type} field: ${value}` };
    }
  }

  return { valid: true, normalized };
}

/**
 * Normalize a timezone string, falling back to UTC for invalid values.
 */
function normalizeTimezone(timezone: string): string {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    return 'UTC';
  }
}

/**
 * Calculate the next run time from a cron expression.
 * Uses cron-parser for efficient calculation (no minute-by-minute iteration).
 */
export function getNextRunTime(
  expression: string,
  fromDate: Date = new Date(),
  timezone: string = 'UTC'
): Date | null {
  const normalized = CRON_PRESETS[expression.toLowerCase()] || expression;
  try {
    const expr = CronExpressionParser.parse(normalized, {
      tz: normalizeTimezone(timezone),
      currentDate: fromDate,
    });
    const next = expr.next();
    return next.toDate();
  } catch {
    return null;
  }
}

/**
 * Get the next N run times from a cron expression.
 * Uses cron-parser for efficient calculation.
 */
export function getNextRunTimes(
  expression: string,
  count: number = 5,
  fromDate: Date = new Date(),
  timezone: string = 'UTC'
): Date[] {
  const normalized = CRON_PRESETS[expression.toLowerCase()] || expression;
  try {
    const expr = CronExpressionParser.parse(normalized, {
      tz: normalizeTimezone(timezone),
      currentDate: fromDate,
    });
    const results: Date[] = [];
    for (let i = 0; i < count; i++) {
      const next = expr.next();
      results.push(next.toDate());
    }
    return results;
  } catch {
    return [];
  }
}

/**
 * Generate a human-readable description of a cron expression
 */
export function describeCronExpression(expression: string): string {
  // Handle preset aliases
  if (CRON_PRESETS[expression.toLowerCase()]) {
    const labels: Record<string, string> = {
      '@yearly': 'Every year on January 1st at midnight',
      '@annually': 'Every year on January 1st at midnight',
      '@monthly': 'Every month on the 1st at midnight',
      '@weekly': 'Every Sunday at midnight',
      '@daily': 'Every day at midnight',
      '@midnight': 'Every day at midnight',
      '@hourly': 'At the start of every hour',
    };
    return labels[expression.toLowerCase()] || expression;
  }

  const parsed = parseCronExpression(expression);
  if (!parsed) {
    return expression;
  }

  const parts: string[] = [];

  // Minute description
  if (parsed.minute.raw === '*') {
    parts.push('Every minute');
  } else if (parsed.minute.raw.startsWith('*/')) {
    const step = parseInt(parsed.minute.raw.slice(2), 10);
    parts.push(`Every ${step} minutes`);
  } else if (parsed.minute.values.length === 1) {
    parts.push(`At minute ${parsed.minute.values[0]}`);
  }

  // Hour description
  if (parsed.hour.raw === '*') {
    if (parsed.minute.raw !== '*' && !parsed.minute.raw.startsWith('*/')) {
      parts.push('of every hour');
    }
  } else if (parsed.hour.raw.startsWith('*/')) {
    const step = parseInt(parsed.hour.raw.slice(2), 10);
    parts.push(`every ${step} hours`);
  } else if (parsed.hour.values.length === 1) {
    const hour = parsed.hour.values[0];
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const minute = parsed.minute.values[0] || 0;
    const minuteStr = minute.toString().padStart(2, '0');
    parts.length = 0; // Reset and format as time
    parts.push(`At ${displayHour}:${minuteStr} ${period}`);
  }

  // Day of week description
  if (parsed.dayOfWeek.raw !== '*') {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if (parsed.dayOfWeek.values.length === 1) {
      parts.push(`on ${dayNames[parsed.dayOfWeek.values[0]]}`);
    } else if (parsed.dayOfWeek.raw === '1-5') {
      parts.push('on weekdays');
    } else if (parsed.dayOfWeek.raw === '0,6' || parsed.dayOfWeek.raw === '6,0') {
      parts.push('on weekends');
    } else {
      const days = parsed.dayOfWeek.values.map(d => dayNames[d]).join(', ');
      parts.push(`on ${days}`);
    }
  }

  // Day of month description
  if (parsed.dayOfMonth.raw !== '*') {
    if (parsed.dayOfMonth.values.length === 1) {
      const day = parsed.dayOfMonth.values[0];
      const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th';
      parts.push(`on the ${day}${suffix}`);
    }
  }

  // Month description
  if (parsed.month.raw !== '*') {
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    if (parsed.month.values.length === 1) {
      parts.push(`in ${monthNames[parsed.month.values[0]]}`);
    }
  }

  if (parts.length === 0) {
    return expression;
  }

  return parts.join(' ');
}

/**
 * Common cron presets for UI
 */
export const CRON_PRESET_OPTIONS = [
  { label: 'Every minute', expression: '* * * * *', description: 'Runs every minute (for testing)' },
  { label: 'Every 5 minutes', expression: '*/5 * * * *', description: 'Runs every 5 minutes' },
  { label: 'Every 15 minutes', expression: '*/15 * * * *', description: 'Runs every 15 minutes' },
  { label: 'Every 30 minutes', expression: '*/30 * * * *', description: 'Runs every 30 minutes' },
  { label: 'Every hour', expression: '@hourly', description: 'Runs at the start of every hour' },
  { label: 'Every 2 hours', expression: '0 */2 * * *', description: 'Runs every 2 hours' },
  { label: 'Every 6 hours', expression: '0 */6 * * *', description: 'Runs at 12am, 6am, 12pm, 6pm' },
  { label: 'Daily at midnight', expression: '@daily', description: 'Runs every day at 12:00 AM' },
  { label: 'Daily at 6 AM', expression: '0 6 * * *', description: 'Runs every day at 6:00 AM' },
  { label: 'Daily at 9 AM', expression: '0 9 * * *', description: 'Runs every day at 9:00 AM' },
  { label: 'Daily at 6 PM', expression: '0 18 * * *', description: 'Runs every day at 6:00 PM' },
  { label: 'Weekdays at 9 AM', expression: '0 9 * * 1-5', description: 'Runs Monday-Friday at 9:00 AM' },
  { label: 'Weekly on Sunday', expression: '@weekly', description: 'Runs every Sunday at midnight' },
  { label: 'Weekly on Monday', expression: '0 0 * * 1', description: 'Runs every Monday at midnight' },
  { label: 'Monthly', expression: '@monthly', description: 'Runs on the 1st of every month at midnight' },
  { label: 'Yearly', expression: '@yearly', description: 'Runs on January 1st at midnight' },
];

export default {
  parseCronExpression,
  validateCronExpression,
  getNextRunTime,
  getNextRunTimes,
  describeCronExpression,
  CRON_PRESET_OPTIONS,
};
