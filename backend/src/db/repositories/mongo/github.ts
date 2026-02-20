import { Collection, Document } from 'mongodb';
import { getDb, COLLECTIONS } from '../../mongodb';
import { v4 as uuidv4 } from 'uuid';

function getCollection<T extends Document>(name: string): Collection<T> {
  return getDb().collection<T>(name);
}

// ============================================
// GITHUB INTEGRATION REPOSITORY
// ============================================

export interface MongoGitHubIntegration {
  _id?: string;
  id: string;
  userId: string;
  accessToken: string;
  tokenType: 'oauth' | 'pat';
  login: string;
  avatarUrl?: string;
  isValid: boolean;
  lastValidatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const githubIntegrationRepository = {
  async findById(id: string): Promise<MongoGitHubIntegration | null> {
    return getCollection<MongoGitHubIntegration>(COLLECTIONS.GITHUB_INTEGRATIONS).findOne({ id });
  },

  async findByUserId(userId: string): Promise<MongoGitHubIntegration | null> {
    return getCollection<MongoGitHubIntegration>(COLLECTIONS.GITHUB_INTEGRATIONS).findOne({ userId });
  },

  async upsert(userId: string, data: Partial<MongoGitHubIntegration>): Promise<MongoGitHubIntegration> {
    const now = new Date();
    const result = await getCollection<MongoGitHubIntegration>(COLLECTIONS.GITHUB_INTEGRATIONS).findOneAndUpdate(
      { userId },
      {
        $set: { ...data, updatedAt: now },
        $setOnInsert: { id: uuidv4(), userId, createdAt: now }
      },
      { upsert: true, returnDocument: 'after' }
    );
    return result!;
  },

  async delete(userId: string): Promise<boolean> {
    const result = await getCollection<MongoGitHubIntegration>(COLLECTIONS.GITHUB_INTEGRATIONS).deleteOne({ userId });
    return result.deletedCount > 0;
  }
};

// ============================================
// GITHUB REPOSITORY CONFIG REPOSITORY
// ============================================

export interface MongoGitHubRepositoryConfig {
  _id?: string;
  id: string;
  integrationId: string;
  workflowId: string;
  repoFullName: string;
  repoId: number;
  defaultBranch: string;
  workflowPath: string;
  isActive: boolean;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const githubRepositoryConfigRepository = {
  async findByWorkflowId(workflowId: string): Promise<MongoGitHubRepositoryConfig | null> {
    return getCollection<MongoGitHubRepositoryConfig>(COLLECTIONS.GITHUB_REPOSITORY_CONFIGS).findOne({ workflowId, isActive: true });
  },

  async upsert(workflowId: string, repoFullName: string, data: Partial<MongoGitHubRepositoryConfig>): Promise<MongoGitHubRepositoryConfig> {
    const now = new Date();
    const result = await getCollection<MongoGitHubRepositoryConfig>(COLLECTIONS.GITHUB_REPOSITORY_CONFIGS).findOneAndUpdate(
      { workflowId, repoFullName },
      {
        $set: { ...data, updatedAt: now },
        $setOnInsert: { id: uuidv4(), workflowId, repoFullName, createdAt: now }
      },
      { upsert: true, returnDocument: 'after' }
    );
    return result!;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoGitHubRepositoryConfig>(COLLECTIONS.GITHUB_REPOSITORY_CONFIGS).deleteOne({ id });
    return result.deletedCount > 0;
  }
};

// ============================================
// GITHUB WORKFLOW RUN REPOSITORY
// ============================================

export interface MongoGitHubWorkflowRun {
  _id?: string;
  id: string;
  workflowId: string;
  executionId?: string;
  runId: string; // BigInt stored as string
  runNumber: number;
  repoFullName: string;
  status: string;
  conclusion?: string;
  htmlUrl: string;
  event: string;
  headBranch: string;
  headSha: string;
  configSnapshot?: string;
  artifactsUrl?: string;
  logsUrl?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export const githubWorkflowRunRepository = {
  async findById(id: string): Promise<MongoGitHubWorkflowRun | null> {
    return getCollection<MongoGitHubWorkflowRun>(COLLECTIONS.GITHUB_WORKFLOW_RUNS).findOne({ id });
  },

  async findByRunId(runId: string): Promise<MongoGitHubWorkflowRun | null> {
    return getCollection<MongoGitHubWorkflowRun>(COLLECTIONS.GITHUB_WORKFLOW_RUNS).findOne({ runId });
  },

  async findByRunIdAndRepo(runId: bigint | number, repoFullName: string): Promise<MongoGitHubWorkflowRun | null> {
    return getCollection<MongoGitHubWorkflowRun>(COLLECTIONS.GITHUB_WORKFLOW_RUNS).findOne({
      runId: String(runId),
      repoFullName
    });
  },

  async findByWorkflowId(workflowId: string, limit: number = 20): Promise<MongoGitHubWorkflowRun[]> {
    return getCollection<MongoGitHubWorkflowRun>(COLLECTIONS.GITHUB_WORKFLOW_RUNS)
      .find({ workflowId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  },

  async update(id: string, data: Partial<MongoGitHubWorkflowRun>): Promise<MongoGitHubWorkflowRun | null> {
    const result = await getCollection<MongoGitHubWorkflowRun>(COLLECTIONS.GITHUB_WORKFLOW_RUNS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async upsert(runId: string, data: Partial<MongoGitHubWorkflowRun>): Promise<MongoGitHubWorkflowRun> {
    const now = new Date();
    const result = await getCollection<MongoGitHubWorkflowRun>(COLLECTIONS.GITHUB_WORKFLOW_RUNS).findOneAndUpdate(
      { runId },
      {
        $set: { ...data, updatedAt: now },
        $setOnInsert: { id: uuidv4(), runId, createdAt: now }
      },
      { upsert: true, returnDocument: 'after' }
    );
    return result!;
  }
};

// ============================================
// GITHUB WORKFLOW JOB REPOSITORY
// ============================================

export interface MongoGitHubWorkflowJob {
  _id?: string;
  id: string;
  runDbId: string;
  jobId: string; // BigInt stored as string
  name: string;
  status: string;
  conclusion?: string;
  htmlUrl: string;
  runnerName?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export const githubWorkflowJobRepository = {
  async findByRunDbId(runDbId: string): Promise<MongoGitHubWorkflowJob[]> {
    return getCollection<MongoGitHubWorkflowJob>(COLLECTIONS.GITHUB_WORKFLOW_JOBS)
      .find({ runDbId })
      .toArray();
  },

  async upsert(jobId: string, data: Partial<MongoGitHubWorkflowJob>): Promise<MongoGitHubWorkflowJob> {
    const now = new Date();
    const result = await getCollection<MongoGitHubWorkflowJob>(COLLECTIONS.GITHUB_WORKFLOW_JOBS).findOneAndUpdate(
      { jobId },
      {
        $set: data,
        $setOnInsert: { id: uuidv4(), jobId, createdAt: now }
      },
      { upsert: true, returnDocument: 'after' }
    );
    return result!;
  }
};
