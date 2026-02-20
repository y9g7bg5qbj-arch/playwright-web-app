import { Collection, Document } from 'mongodb';
import { getDb, COLLECTIONS, MongoSchedule, MongoScheduledTest, MongoScheduledTestRun, MongoScheduleNotification } from '../../mongodb';
import { v4 as uuidv4 } from 'uuid';

function getCollection<T extends Document>(name: string): Collection<T> {
  return getDb().collection<T>(name);
}

// ============================================
// SCHEDULE REPOSITORY
// ============================================

export interface MongoScheduleRun {
  _id?: string;
  id: string;
  scheduleId: string;
  triggerType: 'cron' | 'scheduled' | 'manual' | 'webhook' | 'api';
  status: 'pending' | 'running' | 'passed' | 'failed' | 'cancelled';
  testCount?: number;
  passedCount?: number;
  failedCount?: number;
  skippedCount?: number;
  durationMs?: number;
  artifactsPath?: string;
  errorMessage?: string;
  parameterValues?: string;
  executionConfig?: string;
  triggeredByUser?: string;
  webhookToken?: string;
  githubRunId?: string;
  githubRunUrl?: string;
  executionId?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface MongoScheduleTestResult {
  _id?: string;
  id: string;
  runId: string;
  testName: string;
  testPath?: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs?: number;
  errorMessage?: string;
  errorStack?: string;
  retryCount?: number;
  screenshotPath?: string;
  tracePath?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface MongoNotificationHistory {
  _id?: string;
  id: string;
  scheduleId: string;
  runId: string;
  type: 'email' | 'slack' | 'webhook';
  recipient: string;
  subject?: string;
  content?: string;
  status: 'pending' | 'sent' | 'failed' | 'bounced';
  errorMessage?: string;
  sentAt?: Date;
  createdAt: Date;
}

export const scheduleRepository = {
  async findById(id: string): Promise<MongoSchedule | null> {
    return getCollection<MongoSchedule>(COLLECTIONS.SCHEDULES).findOne({ id });
  },

  async findByUserId(userId: string): Promise<MongoSchedule[]> {
    return getCollection<MongoSchedule>(COLLECTIONS.SCHEDULES).find({ userId }).toArray();
  },

  async findByUserIdAndWorkflowId(userId: string, workflowId: string): Promise<MongoSchedule[]> {
    return getCollection<MongoSchedule>(COLLECTIONS.SCHEDULES).find({ userId, workflowId }).toArray();
  },

  async findDue(): Promise<MongoSchedule[]> {
    const now = new Date();
    return getCollection<MongoSchedule>(COLLECTIONS.SCHEDULES).find({
      isActive: true,
      nextRunAt: { $lte: now }
    }).toArray();
  },

  async findByWebhookToken(webhookToken: string): Promise<MongoSchedule | null> {
    return getCollection<MongoSchedule>(COLLECTIONS.SCHEDULES).findOne({ webhookToken });
  },

  async findByRunConfigurationId(runConfigurationId: string): Promise<MongoSchedule[]> {
    return getCollection<MongoSchedule>(COLLECTIONS.SCHEDULES)
      .find({ runConfigurationId })
      .toArray();
  },

  async create(data: Omit<MongoSchedule, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoSchedule> {
    const now = new Date();
    const schedule: MongoSchedule = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoSchedule>(COLLECTIONS.SCHEDULES).insertOne(schedule);
    return schedule;
  },

  async update(id: string, data: Partial<MongoSchedule>): Promise<MongoSchedule | null> {
    const result = await getCollection<MongoSchedule>(COLLECTIONS.SCHEDULES).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoSchedule>(COLLECTIONS.SCHEDULES).deleteOne({ id });
    return result.deletedCount > 0;
  }
};

// ============================================
// SCHEDULE RUN REPOSITORY
// ============================================

export const scheduleRunRepository = {
  async findById(id: string): Promise<MongoScheduleRun | null> {
    return getCollection<MongoScheduleRun>(COLLECTIONS.SCHEDULE_RUNS).findOne({ id });
  },

  async findByGithubRunId(githubRunId: string): Promise<MongoScheduleRun | null> {
    return getCollection<MongoScheduleRun>(COLLECTIONS.SCHEDULE_RUNS).findOne({ githubRunId });
  },

  async findByScheduleId(scheduleId: string, limit?: number, offset?: number): Promise<MongoScheduleRun[]> {
    const cursor = getCollection<MongoScheduleRun>(COLLECTIONS.SCHEDULE_RUNS)
      .find({ scheduleId })
      .sort({ createdAt: -1 });

    if (offset) {
      cursor.skip(offset);
    }
    if (limit) {
      cursor.limit(limit);
    }

    return cursor.toArray();
  },

  async countByScheduleId(scheduleId: string): Promise<number> {
    return getCollection<MongoScheduleRun>(COLLECTIONS.SCHEDULE_RUNS).countDocuments({ scheduleId });
  },

  async create(data: Omit<MongoScheduleRun, '_id' | 'id' | 'createdAt'>): Promise<MongoScheduleRun> {
    const run: MongoScheduleRun = {
      id: uuidv4(),
      ...data,
      createdAt: new Date()
    };
    await getCollection<MongoScheduleRun>(COLLECTIONS.SCHEDULE_RUNS).insertOne(run);
    return run;
  },

  async update(id: string, data: Partial<MongoScheduleRun>): Promise<MongoScheduleRun | null> {
    const result = await getCollection<MongoScheduleRun>(COLLECTIONS.SCHEDULE_RUNS).findOneAndUpdate(
      { id },
      { $set: data },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoScheduleRun>(COLLECTIONS.SCHEDULE_RUNS).deleteOne({ id });
    return result.deletedCount > 0;
  }
};

// ============================================
// SCHEDULE TEST RESULT REPOSITORY
// ============================================

export const scheduleTestResultRepository = {
  async findByRunId(runId: string): Promise<MongoScheduleTestResult[]> {
    return getCollection<MongoScheduleTestResult>(COLLECTIONS.SCHEDULE_TEST_RESULTS).find({ runId }).toArray();
  },

  async create(data: Omit<MongoScheduleTestResult, '_id' | 'id'>): Promise<MongoScheduleTestResult> {
    const result: MongoScheduleTestResult = {
      id: uuidv4(),
      ...data
    };
    await getCollection<MongoScheduleTestResult>(COLLECTIONS.SCHEDULE_TEST_RESULTS).insertOne(result);
    return result;
  },

};

// ============================================
// SCHEDULED TEST REPOSITORY
// ============================================

export const scheduledTestRepository = {
  async findById(id: string): Promise<MongoScheduledTest | null> {
    return getCollection<MongoScheduledTest>(COLLECTIONS.SCHEDULED_TESTS).findOne({ id });
  },

  async findByUserId(userId: string): Promise<MongoScheduledTest[]> {
    return getCollection<MongoScheduledTest>(COLLECTIONS.SCHEDULED_TESTS)
      .find({ userId })
      .sort({ updatedAt: -1 })
      .toArray();
  },

  async findByProjectId(projectId: string): Promise<MongoScheduledTest[]> {
    return getCollection<MongoScheduledTest>(COLLECTIONS.SCHEDULED_TESTS)
      .find({ projectId })
      .sort({ updatedAt: -1 })
      .toArray();
  },

  async findEnabledSchedules(): Promise<MongoScheduledTest[]> {
    return getCollection<MongoScheduledTest>(COLLECTIONS.SCHEDULED_TESTS)
      .find({ enabled: true })
      .toArray();
  },

  async findDueSchedules(now: Date): Promise<MongoScheduledTest[]> {
    return getCollection<MongoScheduledTest>(COLLECTIONS.SCHEDULED_TESTS)
      .find({
        enabled: true,
        nextRunAt: { $lte: now }
      })
      .toArray();
  },

  async create(data: Omit<MongoScheduledTest, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoScheduledTest> {
    const now = new Date();
    const schedule: MongoScheduledTest = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoScheduledTest>(COLLECTIONS.SCHEDULED_TESTS).insertOne(schedule);
    return schedule;
  },

  async update(id: string, data: Partial<MongoScheduledTest>): Promise<MongoScheduledTest | null> {
    const result = await getCollection<MongoScheduledTest>(COLLECTIONS.SCHEDULED_TESTS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoScheduledTest>(COLLECTIONS.SCHEDULED_TESTS).deleteOne({ id });
    return result.deletedCount > 0;
  }
};

// ============================================
// SCHEDULED TEST RUN REPOSITORY
// ============================================

export const scheduledTestRunRepository = {
  async findById(id: string): Promise<MongoScheduledTestRun | null> {
    return getCollection<MongoScheduledTestRun>(COLLECTIONS.SCHEDULED_TEST_RUNS).findOne({ id });
  },

  async findByScheduleId(scheduleId: string, limit?: number): Promise<MongoScheduledTestRun[]> {
    const cursor = getCollection<MongoScheduledTestRun>(COLLECTIONS.SCHEDULED_TEST_RUNS)
      .find({ scheduleId })
      .sort({ createdAt: -1 });

    if (limit) {
      cursor.limit(limit);
    }

    return cursor.toArray();
  },

  async create(data: Omit<MongoScheduledTestRun, '_id' | 'id' | 'createdAt'>): Promise<MongoScheduledTestRun> {
    const run: MongoScheduledTestRun = {
      id: uuidv4(),
      ...data,
      createdAt: new Date()
    };
    await getCollection<MongoScheduledTestRun>(COLLECTIONS.SCHEDULED_TEST_RUNS).insertOne(run);
    return run;
  },

  async update(id: string, data: Partial<MongoScheduledTestRun>): Promise<MongoScheduledTestRun | null> {
    const result = await getCollection<MongoScheduledTestRun>(COLLECTIONS.SCHEDULED_TEST_RUNS).findOneAndUpdate(
      { id },
      { $set: data },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoScheduledTestRun>(COLLECTIONS.SCHEDULED_TEST_RUNS).deleteOne({ id });
    return result.deletedCount > 0;
  },

  async deleteByScheduleId(scheduleId: string): Promise<number> {
    const result = await getCollection<MongoScheduledTestRun>(COLLECTIONS.SCHEDULED_TEST_RUNS).deleteMany({ scheduleId });
    return result.deletedCount;
  }
};

// ============================================
// SCHEDULE NOTIFICATION REPOSITORY
// ============================================

export const scheduleNotificationRepository = {
  async findById(id: string): Promise<MongoScheduleNotification | null> {
    return getCollection<MongoScheduleNotification>(COLLECTIONS.SCHEDULE_NOTIFICATIONS).findOne({ id });
  },

  async findByScheduleId(scheduleId: string): Promise<MongoScheduleNotification[]> {
    return getCollection<MongoScheduleNotification>(COLLECTIONS.SCHEDULE_NOTIFICATIONS)
      .find({ scheduleId })
      .toArray();
  },

  async create(data: Omit<MongoScheduleNotification, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoScheduleNotification> {
    const now = new Date();
    const notification: MongoScheduleNotification = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoScheduleNotification>(COLLECTIONS.SCHEDULE_NOTIFICATIONS).insertOne(notification);
    return notification;
  },

  async update(id: string, data: Partial<MongoScheduleNotification>): Promise<MongoScheduleNotification | null> {
    const result = await getCollection<MongoScheduleNotification>(COLLECTIONS.SCHEDULE_NOTIFICATIONS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoScheduleNotification>(COLLECTIONS.SCHEDULE_NOTIFICATIONS).deleteOne({ id });
    return result.deletedCount > 0;
  },

  async deleteByScheduleId(scheduleId: string): Promise<number> {
    const result = await getCollection<MongoScheduleNotification>(COLLECTIONS.SCHEDULE_NOTIFICATIONS).deleteMany({ scheduleId });
    return result.deletedCount;
  }
};

// ============================================
// NOTIFICATION HISTORY REPOSITORY
// ============================================

export const notificationHistoryRepository = {
  async findById(id: string): Promise<MongoNotificationHistory | null> {
    return getCollection<MongoNotificationHistory>(COLLECTIONS.NOTIFICATION_HISTORY).findOne({ id });
  },

  async findByScheduleId(scheduleId: string, limit: number = 50): Promise<MongoNotificationHistory[]> {
    return getCollection<MongoNotificationHistory>(COLLECTIONS.NOTIFICATION_HISTORY)
      .find({ scheduleId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  },

  async findByRunId(runId: string): Promise<MongoNotificationHistory[]> {
    return getCollection<MongoNotificationHistory>(COLLECTIONS.NOTIFICATION_HISTORY)
      .find({ runId })
      .sort({ createdAt: -1 })
      .toArray();
  },

  async create(data: Omit<MongoNotificationHistory, '_id' | 'id' | 'createdAt'>): Promise<MongoNotificationHistory> {
    const notification: MongoNotificationHistory = {
      id: uuidv4(),
      ...data,
      createdAt: new Date()
    };
    await getCollection<MongoNotificationHistory>(COLLECTIONS.NOTIFICATION_HISTORY).insertOne(notification);
    return notification;
  },

  async update(id: string, data: Partial<MongoNotificationHistory>): Promise<MongoNotificationHistory | null> {
    const result = await getCollection<MongoNotificationHistory>(COLLECTIONS.NOTIFICATION_HISTORY).findOneAndUpdate(
      { id },
      { $set: data },
      { returnDocument: 'after' }
    );
    return result;
  }
};
