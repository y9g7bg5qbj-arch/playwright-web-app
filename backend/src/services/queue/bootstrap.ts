import { logger } from '../../utils/logger';
import { queueService } from './QueueService';
import { QUEUE_NAMES } from './types';
import { processScheduleRunJob } from './workers/scheduleRunWorker';
import { scheduleService } from '../schedule.service';

let queueBootstrapped = false;
let dueSchedulePoller: NodeJS.Timeout | null = null;
let dueScheduleDispatchInFlight = false;

function parseConcurrency(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function parseIntervalMs(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 5000) {
    return fallback;
  }
  return Math.floor(parsed);
}

async function dispatchDueSchedulesTick(): Promise<void> {
  if (dueScheduleDispatchInFlight) {
    return;
  }

  dueScheduleDispatchInFlight = true;
  try {
    const { dispatched, failed } = await scheduleService.dispatchDueSchedules();
    if (dispatched > 0 || failed > 0) {
      logger.info(`Due schedule dispatch tick complete: dispatched=${dispatched}, failed=${failed}`);
    }
  } catch (error) {
    logger.error('Failed to dispatch due schedules:', error);
  } finally {
    dueScheduleDispatchInFlight = false;
  }
}

export async function initializeQueueWorkers(): Promise<void> {
  if (queueBootstrapped) {
    return;
  }

  // One-time scheduler migration: backfill runConfigurationId for legacy schedules.
  try {
    await scheduleService.ensureLegacySchedulesMigrated();
  } catch (error) {
    logger.error('Failed to run legacy scheduler migration; continuing startup', error);
  }

  await queueService.initialize();

  const concurrency = parseConcurrency(process.env.SCHEDULE_QUEUE_CONCURRENCY, 5);
  await queueService.startWorker(
    QUEUE_NAMES.SCHEDULE_RUN,
    async (job) => processScheduleRunJob(job as any),
    { concurrency }
  );

  const pollIntervalMs = parseIntervalMs(process.env.SCHEDULE_DISPATCH_INTERVAL_MS, 30000);
  dueSchedulePoller = setInterval(() => {
    void dispatchDueSchedulesTick();
  }, pollIntervalMs);

  // Dispatch immediately at startup so missed schedules are picked up without waiting for the first interval.
  await dispatchDueSchedulesTick();

  queueBootstrapped = true;
  logger.info(
    `Queue workers initialized (schedule-run concurrency: ${concurrency}, dispatch interval: ${pollIntervalMs}ms)`
  );
}

export async function shutdownQueueWorkers(): Promise<void> {
  if (!queueBootstrapped) {
    return;
  }

  if (dueSchedulePoller) {
    clearInterval(dueSchedulePoller);
    dueSchedulePoller = null;
  }

  await queueService.shutdown();
  queueBootstrapped = false;
  logger.info('Queue workers shut down');
}
