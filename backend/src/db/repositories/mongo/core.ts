import { Collection, Document } from 'mongodb';
import { getDb, COLLECTIONS, MongoUser, MongoApplication, MongoProject, MongoWorkflow, MongoPasswordToken } from '../../mongodb';
import { v4 as uuidv4 } from 'uuid';

function getCollection<T extends Document>(name: string): Collection<T> {
  return getDb().collection<T>(name);
}

// ============================================
// USER REPOSITORY
// ============================================

export const userRepository = {
  async findById(id: string): Promise<MongoUser | null> {
    return getCollection<MongoUser>(COLLECTIONS.USERS).findOne({ id });
  },

  async findByEmail(email: string): Promise<MongoUser | null> {
    return getCollection<MongoUser>(COLLECTIONS.USERS).findOne({ email });
  },

  async create(data: Omit<MongoUser, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoUser> {
    const now = new Date();
    const user: MongoUser = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoUser>(COLLECTIONS.USERS).insertOne(user);
    return user;
  },

  async findAll(): Promise<MongoUser[]> {
    return getCollection<MongoUser>(COLLECTIONS.USERS).find({}).toArray();
  },

  async updateRole(userId: string, role: string): Promise<MongoUser | null> {
    const result = await getCollection<MongoUser>(COLLECTIONS.USERS).findOneAndUpdate(
      { id: userId },
      { $set: { role, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async countByRole(role: string): Promise<number> {
    return getCollection<MongoUser>(COLLECTIONS.USERS).countDocuments({ role });
  },

  async updatePassword(userId: string, passwordHash: string): Promise<MongoUser | null> {
    const result = await getCollection<MongoUser>(COLLECTIONS.USERS).findOneAndUpdate(
      { id: userId },
      { $set: { passwordHash, passwordSetAt: new Date(), updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async updateOnboardingCompleted(userId: string): Promise<MongoUser | null> {
    const result = await getCollection<MongoUser>(COLLECTIONS.USERS).findOneAndUpdate(
      { id: userId },
      { $set: { onboardingCompleted: true, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },
};

// ============================================
// PASSWORD TOKEN REPOSITORY
// ============================================

export const passwordTokenRepository = {
  async create(data: Omit<MongoPasswordToken, '_id' | 'id' | 'createdAt'>): Promise<MongoPasswordToken> {
    const token: MongoPasswordToken = {
      id: uuidv4(),
      ...data,
      createdAt: new Date(),
    };
    await getCollection<MongoPasswordToken>(COLLECTIONS.PASSWORD_TOKENS).insertOne(token);
    return token;
  },

  async findByToken(token: string): Promise<MongoPasswordToken | null> {
    return getCollection<MongoPasswordToken>(COLLECTIONS.PASSWORD_TOKENS).findOne({ token });
  },

  async markUsed(id: string): Promise<void> {
    await getCollection<MongoPasswordToken>(COLLECTIONS.PASSWORD_TOKENS).updateOne(
      { id },
      { $set: { usedAt: new Date() } }
    );
  },

  async findPendingByUserId(userId: string, type: 'welcome' | 'reset'): Promise<MongoPasswordToken | null> {
    return getCollection<MongoPasswordToken>(COLLECTIONS.PASSWORD_TOKENS).findOne({
      userId,
      type,
      usedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });
  },
};

// ============================================
// APPLICATION REPOSITORY
// ============================================

export const applicationRepository = {
  async findById(id: string): Promise<MongoApplication | null> {
    return getCollection<MongoApplication>(COLLECTIONS.APPLICATIONS).findOne({ id });
  },

  async findByUserId(userId: string): Promise<MongoApplication[]> {
    return getCollection<MongoApplication>(COLLECTIONS.APPLICATIONS).find({ userId }).toArray();
  },

  async findAll(): Promise<MongoApplication[]> {
    return getCollection<MongoApplication>(COLLECTIONS.APPLICATIONS).find({}).toArray();
  },

  async findByUserIdAndName(userId: string, name: string): Promise<MongoApplication | null> {
    return getCollection<MongoApplication>(COLLECTIONS.APPLICATIONS).findOne({ userId, name });
  },

  async findByIdAndUserId(id: string, userId: string): Promise<MongoApplication | null> {
    return getCollection<MongoApplication>(COLLECTIONS.APPLICATIONS).findOne({ id, userId });
  },

  async create(data: Omit<MongoApplication, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoApplication> {
    const now = new Date();
    const app: MongoApplication = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoApplication>(COLLECTIONS.APPLICATIONS).insertOne(app);
    return app;
  },

  async update(id: string, data: Partial<MongoApplication>): Promise<MongoApplication | null> {
    const result = await getCollection<MongoApplication>(COLLECTIONS.APPLICATIONS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoApplication>(COLLECTIONS.APPLICATIONS).deleteOne({ id });
    return result.deletedCount > 0;
  }
};

// ============================================
// PROJECT REPOSITORY
// ============================================

export const projectRepository = {
  async findById(id: string): Promise<MongoProject | null> {
    return getCollection<MongoProject>(COLLECTIONS.PROJECTS).findOne({ id });
  },

  async findByApplicationId(applicationId: string): Promise<MongoProject[]> {
    return getCollection<MongoProject>(COLLECTIONS.PROJECTS).find({ applicationId }).toArray();
  },

  async findByApplicationIdAndName(applicationId: string, name: string): Promise<MongoProject | null> {
    return getCollection<MongoProject>(COLLECTIONS.PROJECTS).findOne({ applicationId, name });
  },

  async create(data: Omit<MongoProject, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoProject> {
    const now = new Date();
    const project: MongoProject = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoProject>(COLLECTIONS.PROJECTS).insertOne(project);
    return project;
  },

  async update(id: string, data: Partial<MongoProject>): Promise<MongoProject | null> {
    const result = await getCollection<MongoProject>(COLLECTIONS.PROJECTS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const result = await getCollection<MongoProject>(COLLECTIONS.PROJECTS).deleteOne({ id });
    return result.deletedCount > 0;
  }
};

// ============================================
// WORKFLOW REPOSITORY
// ============================================

export const workflowRepository = {
  async findById(id: string): Promise<MongoWorkflow | null> {
    return getCollection<MongoWorkflow>(COLLECTIONS.WORKFLOWS).findOne({ id });
  },

  async findByUserId(userId: string): Promise<MongoWorkflow[]> {
    return getCollection<MongoWorkflow>(COLLECTIONS.WORKFLOWS).find({ userId }).toArray();
  },

  async findAll(): Promise<MongoWorkflow[]> {
    return getCollection<MongoWorkflow>(COLLECTIONS.WORKFLOWS).find({}).toArray();
  },

  async findByApplicationId(applicationId: string): Promise<MongoWorkflow[]> {
    return getCollection<MongoWorkflow>(COLLECTIONS.WORKFLOWS).find({ applicationId }).toArray();
  },

  async create(data: Omit<MongoWorkflow, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<MongoWorkflow> {
    const now = new Date();
    const workflow: MongoWorkflow = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoWorkflow>(COLLECTIONS.WORKFLOWS).insertOne(workflow);
    return workflow;
  },

  async update(id: string, data: Partial<MongoWorkflow>): Promise<MongoWorkflow | null> {
    const result = await getCollection<MongoWorkflow>(COLLECTIONS.WORKFLOWS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async findByUserIdAndName(userId: string, name: string): Promise<MongoWorkflow | null> {
    return getCollection<MongoWorkflow>(COLLECTIONS.WORKFLOWS).findOne({ userId, name });
  }
};
