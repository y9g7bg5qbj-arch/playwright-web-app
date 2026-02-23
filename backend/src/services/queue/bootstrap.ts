import { logger } from '../../utils/logger';
import { queueService } from './QueueService';
import { QUEUE_NAMES } from './types';
import { processScheduleRunJob } from './workers/scheduleRunWorker';
import { scheduleService } from '../schedule.service';

let infrastructureReady = false;
let workersStarted = false;

function parseConcurrency(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

/**
 * Initialize queue infrastructure (Redis connection, queue producers/clients).
 * Required by both API and worker roles so that the API can enqueue jobs.
 */
export async function initializeQueueInfrastructure(): Promise<void> {
  if (infrastructureReady) {
    return;
  }

  // One-time scheduler migration: backfill runConfigurationId for legacy schedules.
  try {
    await scheduleService.ensureLegacySchedulesMigrated();
  } catch (error) {
    logger.error('Failed to run legacy scheduler migration; continuing startup', error);
  }

  await queueService.initialize();
  infrastructureReady = true;
  logger.info('Queue infrastructure initialized');
}

/**
 * Reconcile repeatable schedules on worker startup.
 * Ensures all active schedules have BullMQ job schedulers registered
 * and stale schedulers for inactive/deleted schedules are removed.
 */
async function reconcileRepeatableSchedules(): Promise<void> {
  try {
    await scheduleService.reconcileRepeatableSchedules();
  } catch (error) {
    logger.error('Failed to reconcile repeatable schedules at startup:', error);
  }
}

/**
 * Start queue workers and reconcile repeatable schedules.
 * Only needed by the worker role. Requires initializeQueueInfrastructure() first.
 */
export async function startQueueWorkers(): Promise<void> {
  if (workersStarted) {
    return;
  }

  if (!infrastructureReady) {
    await initializeQueueInfrastructure();
  }

  const concurrency = parseConcurrency(process.env.SCHEDULE_QUEUE_CONCURRENCY, 5);
  await queueService.startWorker(
    QUEUE_NAMES.SCHEDULE_RUN,
    async (job) => processScheduleRunJob(job as any),
    { concurrency }
  );

  // Reconcile repeatable schedules so all active DB schedules have BullMQ schedulers.
  await reconcileRepeatableSchedules();

  workersStarted = true;
  logger.info(`Queue workers started (schedule-run concurrency: ${concurrency})`);
}

/**
 * Combined init for backward compatibility (PROCESS_ROLE=all or unset).
 */
export async function initializeQueueWorkers(): Promise<void> {
  await initializeQueueInfrastructure();
  await startQueueWorkers();
}

export async function shutdownQueueWorkers(): Promise<void> {
  if (infrastructureReady || workersStarted) {
    await queueService.shutdown();
  }

  infrastructureReady = false;
  workersStarted = false;
  logger.info('Queue workers shut down');
}
