import { Collection, Document } from 'mongodb';
import { getDb, COLLECTIONS, MongoSandbox, MongoPullRequest } from '../../mongodb';
import { v4 as uuidv4 } from 'uuid';

function getCollection<T extends Document>(name: string): Collection<T> {
  return getDb().collection<T>(name);
}

// ============================================
// SANDBOX REPOSITORY
// ============================================

export const sandboxRepository = {
  async findById(id: string): Promise<MongoSandbox | null> {
    return getCollection<MongoSandbox>(COLLECTIONS.SANDBOXES).findOne({ id });
  },

  async findAll(): Promise<MongoSandbox[]> {
    return getCollection<MongoSandbox>(COLLECTIONS.SANDBOXES)
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
  },

  async findByProjectId(projectId: string): Promise<MongoSandbox[]> {
    return getCollection<MongoSandbox>(COLLECTIONS.SANDBOXES)
      .find({ projectId })
      .sort({ createdAt: -1 })
      .toArray();
  },

  async findByOwnerId(ownerId: string, projectId?: string): Promise<MongoSandbox[]> {
    const query: any = { ownerId };
    if (projectId) query.projectId = projectId;
    return getCollection<MongoSandbox>(COLLECTIONS.SANDBOXES)
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
  },

  async countByOwnerAndProject(ownerId: string, projectId: string, status: 'active' | 'merged' | 'archived'): Promise<number> {
    return getCollection<MongoSandbox>(COLLECTIONS.SANDBOXES).countDocuments({
      ownerId,
      projectId,
      status
    });
  },

  async create(data: Omit<MongoSandbox, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoSandbox> {
    const now = new Date();
    const sandbox: MongoSandbox = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoSandbox>(COLLECTIONS.SANDBOXES).insertOne(sandbox);
    return sandbox;
  },

  async update(id: string, data: Partial<MongoSandbox>): Promise<MongoSandbox | null> {
    const result = await getCollection<MongoSandbox>(COLLECTIONS.SANDBOXES).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoSandbox>(COLLECTIONS.SANDBOXES).deleteOne({ id });
    return result.deletedCount > 0;
  }
};

// ============================================
// PULL REQUEST REPOSITORY
// ============================================

export const pullRequestRepository = {
  async findById(id: string): Promise<MongoPullRequest | null> {
    return getCollection<MongoPullRequest>(COLLECTIONS.PULL_REQUESTS).findOne({ id });
  },

  async findByNumber(projectId: string, number: number): Promise<MongoPullRequest | null> {
    return getCollection<MongoPullRequest>(COLLECTIONS.PULL_REQUESTS).findOne({ projectId, number });
  },

  async findBySandboxId(sandboxId: string): Promise<MongoPullRequest[]> {
    return getCollection<MongoPullRequest>(COLLECTIONS.PULL_REQUESTS)
      .find({ sandboxId })
      .sort({ createdAt: -1 })
      .toArray();
  },

  async findByProjectId(projectId: string, status?: string): Promise<MongoPullRequest[]> {
    const query: any = { projectId };
    if (status) query.status = status;
    return getCollection<MongoPullRequest>(COLLECTIONS.PULL_REQUESTS)
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
  },

  async findOpenBySandboxId(sandboxId: string): Promise<MongoPullRequest[]> {
    return getCollection<MongoPullRequest>(COLLECTIONS.PULL_REQUESTS)
      .find({ sandboxId, status: { $in: ['draft', 'open'] } })
      .toArray();
  },

  async countByProjectId(projectId: string): Promise<number> {
    return getCollection<MongoPullRequest>(COLLECTIONS.PULL_REQUESTS).countDocuments({ projectId });
  },

  async getNextPRNumber(projectId: string): Promise<number> {
    const lastPR = await getCollection<MongoPullRequest>(COLLECTIONS.PULL_REQUESTS)
      .find({ projectId })
      .sort({ number: -1 })
      .limit(1)
      .toArray();
    return lastPR.length > 0 ? lastPR[0].number + 1 : 1;
  },

  async create(data: Omit<MongoPullRequest, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoPullRequest> {
    const now = new Date();
    const pr: MongoPullRequest = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoPullRequest>(COLLECTIONS.PULL_REQUESTS).insertOne(pr);
    return pr;
  },

  async update(id: string, data: Partial<MongoPullRequest>): Promise<MongoPullRequest | null> {
    const result = await getCollection<MongoPullRequest>(COLLECTIONS.PULL_REQUESTS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoPullRequest>(COLLECTIONS.PULL_REQUESTS).deleteOne({ id });
    return result.deletedCount > 0;
  },

  async deleteBySandboxId(sandboxId: string): Promise<number> {
    const result = await getCollection<MongoPullRequest>(COLLECTIONS.PULL_REQUESTS).deleteMany({ sandboxId });
    return result.deletedCount;
  }
};

// ============================================
// PULL REQUEST REVIEW REPOSITORY
// ============================================

export interface MongoPullRequestReview {
  _id?: string;
  id: string;
  pullRequestId: string;
  reviewerId: string;
  status: 'approved' | 'changes_requested' | 'pending';
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const pullRequestReviewRepository = {
  async findById(id: string): Promise<MongoPullRequestReview | null> {
    return getCollection<MongoPullRequestReview>('pull_request_reviews').findOne({ id });
  },

  async findByPullRequestId(pullRequestId: string): Promise<MongoPullRequestReview[]> {
    return getCollection<MongoPullRequestReview>('pull_request_reviews')
      .find({ pullRequestId })
      .sort({ createdAt: -1 })
      .toArray();
  },

  async findByPullRequestAndReviewer(pullRequestId: string, reviewerId: string): Promise<MongoPullRequestReview | null> {
    return getCollection<MongoPullRequestReview>('pull_request_reviews').findOne({ pullRequestId, reviewerId });
  },

  async countByStatus(pullRequestId: string, status: 'approved' | 'changes_requested' | 'pending'): Promise<number> {
    return getCollection<MongoPullRequestReview>('pull_request_reviews').countDocuments({ pullRequestId, status });
  },

  async create(data: Omit<MongoPullRequestReview, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoPullRequestReview> {
    const now = new Date();
    const review: MongoPullRequestReview = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoPullRequestReview>('pull_request_reviews').insertOne(review);
    return review;
  },

  async upsert(pullRequestId: string, reviewerId: string, data: Partial<MongoPullRequestReview>): Promise<MongoPullRequestReview> {
    const now = new Date();
    const result = await getCollection<MongoPullRequestReview>('pull_request_reviews').findOneAndUpdate(
      { pullRequestId, reviewerId },
      {
        $set: { ...data, updatedAt: now },
        $setOnInsert: { id: uuidv4(), pullRequestId, reviewerId, createdAt: now }
      },
      { upsert: true, returnDocument: 'after' }
    );
    return result!;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoPullRequestReview>('pull_request_reviews').deleteOne({ id });
    return result.deletedCount > 0;
  },

  async deleteByPullRequestId(pullRequestId: string): Promise<number> {
    const result = await getCollection<MongoPullRequestReview>('pull_request_reviews').deleteMany({ pullRequestId });
    return result.deletedCount;
  }
};

// ============================================
// PULL REQUEST COMMENT REPOSITORY
// ============================================

export interface MongoPullRequestComment {
  _id?: string;
  id: string;
  pullRequestId: string;
  authorId: string;
  body: string;
  filePath?: string;
  lineNumber?: number;
  resolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const pullRequestCommentRepository = {
  async findById(id: string): Promise<MongoPullRequestComment | null> {
    return getCollection<MongoPullRequestComment>('pull_request_comments').findOne({ id });
  },

  async findByPullRequestId(pullRequestId: string): Promise<MongoPullRequestComment[]> {
    return getCollection<MongoPullRequestComment>('pull_request_comments')
      .find({ pullRequestId })
      .sort({ createdAt: 1 })
      .toArray();
  },

  async countByPullRequestId(pullRequestId: string): Promise<number> {
    return getCollection<MongoPullRequestComment>('pull_request_comments').countDocuments({ pullRequestId });
  },

  async create(data: Omit<MongoPullRequestComment, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoPullRequestComment> {
    const now = new Date();
    const comment: MongoPullRequestComment = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoPullRequestComment>('pull_request_comments').insertOne(comment);
    return comment;
  },

  async update(id: string, data: Partial<MongoPullRequestComment>): Promise<MongoPullRequestComment | null> {
    const result = await getCollection<MongoPullRequestComment>('pull_request_comments').findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoPullRequestComment>('pull_request_comments').deleteOne({ id });
    return result.deletedCount > 0;
  },

  async deleteByPullRequestId(pullRequestId: string): Promise<number> {
    const result = await getCollection<MongoPullRequestComment>('pull_request_comments').deleteMany({ pullRequestId });
    return result.deletedCount;
  }
};

// ============================================
// PULL REQUEST FILE REPOSITORY
// ============================================

export interface MongoPullRequestFile {
  _id?: string;
  id: string;
  pullRequestId: string;
  filePath: string;
  changeType: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
  createdAt: Date;
}

export const pullRequestFileRepository = {
  async findByPullRequestId(pullRequestId: string): Promise<MongoPullRequestFile[]> {
    return getCollection<MongoPullRequestFile>('pull_request_files')
      .find({ pullRequestId })
      .sort({ filePath: 1 })
      .toArray();
  },

  async countByPullRequestId(pullRequestId: string): Promise<number> {
    return getCollection<MongoPullRequestFile>('pull_request_files').countDocuments({ pullRequestId });
  },

  async create(data: Omit<MongoPullRequestFile, '_id' | 'id' | 'createdAt'>): Promise<MongoPullRequestFile> {
    const file: MongoPullRequestFile = {
      id: uuidv4(),
      ...data,
      createdAt: new Date()
    };
    await getCollection<MongoPullRequestFile>('pull_request_files').insertOne(file);
    return file;
  },

  async createMany(pullRequestId: string, files: Array<Omit<MongoPullRequestFile, '_id' | 'id' | 'pullRequestId' | 'createdAt'>>): Promise<MongoPullRequestFile[]> {
    const now = new Date();
    const docs = files.map(f => ({
      id: uuidv4(),
      pullRequestId,
      ...f,
      createdAt: now
    }));
    if (docs.length > 0) {
      await getCollection<MongoPullRequestFile>('pull_request_files').insertMany(docs);
    }
    return docs;
  },

  async deleteByPullRequestId(pullRequestId: string): Promise<number> {
    const result = await getCollection<MongoPullRequestFile>('pull_request_files').deleteMany({ pullRequestId });
    return result.deletedCount;
  }
};

// ============================================
// PROJECT SETTINGS REPOSITORY
// ============================================

export interface MongoProjectSettings {
  _id?: string;
  id: string;
  projectId: string;
  requiredApprovals: number;
  allowSelfApproval: boolean;
  autoDeleteSandbox: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const projectSettingsRepository = {
  async findByProjectId(projectId: string): Promise<MongoProjectSettings | null> {
    return getCollection<MongoProjectSettings>('project_settings').findOne({ projectId });
  },

  async upsert(projectId: string, data: Partial<MongoProjectSettings>): Promise<MongoProjectSettings> {
    const now = new Date();
    const result = await getCollection<MongoProjectSettings>('project_settings').findOneAndUpdate(
      { projectId },
      {
        $set: { ...data, updatedAt: now },
        $setOnInsert: { id: uuidv4(), projectId, createdAt: now }
      },
      { upsert: true, returnDocument: 'after' }
    );
    return result!;
  },

  async delete(projectId: string): Promise<boolean> {
    const result = await getCollection<MongoProjectSettings>('project_settings').deleteOne({ projectId });
    return result.deletedCount > 0;
  }
};
