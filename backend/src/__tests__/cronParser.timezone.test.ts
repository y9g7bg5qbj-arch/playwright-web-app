import { describe, expect, it } from 'vitest';
import { getNextRunTime } from '../services/scheduler/cronParser';

describe('cronParser timezone support', () => {
  it('calculates next run in UTC timezone', () => {
    const fromDate = new Date('2026-02-09T13:00:00.000Z');
    const next = getNextRunTime('0 9 * * *', fromDate, 'UTC');

    expect(next?.toISOString()).toBe('2026-02-10T09:00:00.000Z');
  });

  it('calculates next run in America/New_York timezone', () => {
    const fromDate = new Date('2026-02-09T13:00:00.000Z');
    const next = getNextRunTime('0 9 * * *', fromDate, 'America/New_York');

    expect(next?.toISOString()).toBe('2026-02-09T14:00:00.000Z');
  });
});

