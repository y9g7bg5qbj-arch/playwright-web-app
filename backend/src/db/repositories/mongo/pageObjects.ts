import { Collection, Document } from 'mongodb';
import { getDb, COLLECTIONS, MongoObjectRepository, MongoPageObject } from '../../mongodb';
import { ObjectRepository, ObjectRepositoryCreate, ObjectRepositoryUpdate, PageObject, PageObjectCreate, PageObjectUpdate, PageElementCreate, PageElementUpdate } from '@playwright-web-app/shared';
import { v4 as uuidv4 } from 'uuid';

function getCollection<T extends Document>(name: string): Collection<T> {
  return getDb().collection<T>(name);
}

// ============================================
// PAGE OBJECT REPOSITORY
// ============================================

export const pageObjectRepository = {
  async findById(id: string): Promise<PageObject | null> {
    return getCollection<MongoPageObject>(COLLECTIONS.PAGE_OBJECTS).findOne({ id }) as Promise<PageObject | null>;
  },

  async findByRepositoryId(repositoryId: string): Promise<PageObject[]> {
    return getCollection<MongoPageObject>(COLLECTIONS.PAGE_OBJECTS)
      .find({ repositoryId })
      .sort({ order: 1 })
      .toArray() as Promise<PageObject[]>;
  },

  async create(data: PageObjectCreate): Promise<PageObject> {
    const now = new Date();
    // Get the max order for this repository
    const maxOrderDoc = await getCollection<MongoPageObject>(COLLECTIONS.PAGE_OBJECTS)
      .findOne({ repositoryId: data.repositoryId }, { sort: { order: -1 } });
    const maxOrder = maxOrderDoc?.order ?? -1;

    const page: MongoPageObject = {
      id: uuidv4(),
      repositoryId: data.repositoryId,
      name: data.name,
      description: data.description,
      urlPattern: data.urlPattern,
      baseUrl: data.baseUrl,
      elements: data.elements || [],
      order: data.order ?? (maxOrder + 1),
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoPageObject>(COLLECTIONS.PAGE_OBJECTS).insertOne(page);
    return page as PageObject;
  },

  async update(id: string, data: PageObjectUpdate): Promise<PageObject> {
    const result = await getCollection<MongoPageObject>(COLLECTIONS.PAGE_OBJECTS).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!result) throw new Error('Page Object not found');
    return result as PageObject;
  },

  async delete(id: string): Promise<void> {
    await getCollection<MongoPageObject>(COLLECTIONS.PAGE_OBJECTS).deleteOne({ id });
  },

  async reorder(repositoryId: string, pageIds: string[]): Promise<void> {
    const bulkOps = pageIds.map((id, index) => ({
      updateOne: {
        filter: { id, repositoryId },
        update: { $set: { order: index, updatedAt: new Date() } }
      }
    }));
    if (bulkOps.length > 0) {
      await getCollection<MongoPageObject>(COLLECTIONS.PAGE_OBJECTS).bulkWrite(bulkOps);
    }
  },

  async addElement(pageId: string, element: PageElementCreate): Promise<PageObject> {
    const elementId = uuidv4();
    const newElement = { id: elementId, ...element };
    const result = await getCollection<MongoPageObject>(COLLECTIONS.PAGE_OBJECTS).findOneAndUpdate(
      { id: pageId },
      { $push: { elements: newElement }, $set: { updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!result) throw new Error('Page Object not found');
    return result as PageObject;
  },

  async updateElement(pageId: string, elementId: string, data: PageElementUpdate): Promise<PageObject> {
    const page = await this.findById(pageId);
    if (!page) throw new Error('Page Object not found');

    const elements = page.elements.map((el: any) =>
      el.id === elementId ? { ...el, ...data } : el
    );

    const result = await getCollection<MongoPageObject>(COLLECTIONS.PAGE_OBJECTS).findOneAndUpdate(
      { id: pageId },
      { $set: { elements, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!result) throw new Error('Page Object not found');
    return result as PageObject;
  },

  async removeElement(pageId: string, elementId: string): Promise<PageObject> {
    const result = await getCollection<MongoPageObject>(COLLECTIONS.PAGE_OBJECTS).findOneAndUpdate(
      { id: pageId },
      { $pull: { elements: { id: elementId } }, $set: { updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!result) throw new Error('Page Object not found');
    return result as PageObject;
  }
};

// ============================================
// OBJECT REPOSITORY REPOSITORY
// ============================================

export const objectRepositoryRepository = {
  async findById(id: string): Promise<ObjectRepository | null> {
    const repo = await getCollection<MongoObjectRepository>(COLLECTIONS.OBJECT_REPOSITORIES).findOne({ id });
    if (!repo) return null;
    const pages = await pageObjectRepository.findByRepositoryId(repo.id);
    return { ...repo, pages };
  },

  async findByWorkflowId(workflowId: string): Promise<ObjectRepository | null> {
    const repo = await getCollection<MongoObjectRepository>(COLLECTIONS.OBJECT_REPOSITORIES).findOne({ workflowId });
    if (!repo) return null;
    const pages = await pageObjectRepository.findByRepositoryId(repo.id);
    return { ...repo, pages };
  },

  async create(data: ObjectRepositoryCreate): Promise<ObjectRepository> {
    const now = new Date();
    const repo: MongoObjectRepository = {
      id: uuidv4(),
      workflowId: data.workflowId,
      name: data.name || 'Default Repository',
      description: data.description,
      globalElements: [],
      createdAt: now,
      updatedAt: now
    };
    await getCollection<MongoObjectRepository>(COLLECTIONS.OBJECT_REPOSITORIES).insertOne(repo);
    return { ...repo, pages: [] };
  },

  async update(id: string, data: ObjectRepositoryUpdate): Promise<ObjectRepository> {
    const result = await getCollection<MongoObjectRepository>(COLLECTIONS.OBJECT_REPOSITORIES).findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!result) throw new Error('Object Repository not found');
    const pages = await pageObjectRepository.findByRepositoryId(result.id);
    return { ...result, pages };
  },

  async delete(id: string): Promise<void> {
    await getCollection<MongoObjectRepository>(COLLECTIONS.OBJECT_REPOSITORIES).deleteOne({ id });
    await getCollection<MongoPageObject>(COLLECTIONS.PAGE_OBJECTS).deleteMany({ repositoryId: id });
  },

  async getOrCreateByWorkflowId(workflowId: string): Promise<ObjectRepository> {
    const existing = await this.findByWorkflowId(workflowId);
    if (existing) return existing;
    return this.create({ workflowId });
  }
};
