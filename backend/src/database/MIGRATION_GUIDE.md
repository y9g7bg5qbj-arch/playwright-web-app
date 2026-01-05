# Database Migration Guide

## Quick Start

### Current State (Phase 1 - Legacy Adapter)
You can start using the repository pattern TODAY with the legacy adapter:

```typescript
// In your route file
import { getProjectContext } from '../database/adapters/legacy-prisma';

router.get('/sheets', async (req, res) => {
  const projectCtx = getProjectContext(req.query.projectId);

  // No more JSON.parse/stringify!
  const sheets = await projectCtx.testDataSheets.findMany();

  res.json({ success: true, sheets });
});
```

### Future State (Phase 2 - Multi-Database)
When ready for enterprise multi-tenancy:

```typescript
import { db } from '../database';

// Initialize once at startup
await db.initialize({
  type: 'mongodb',  // or 'prisma-sqlite' with separate DBs
  mongoUri: 'mongodb://...'
});

// Same repository API, different backend
const projectCtx = await db.getProject(projectId);
const sheets = await projectCtx.testDataSheets.findMany();
```

---

## Current Architecture

The application uses a **plug-and-play database abstraction layer** that allows switching between different database backends without changing business logic.

```
src/database/
├── index.ts                  # Main entry point (db singleton)
├── interfaces/
│   └── index.ts             # All repository interfaces
└── providers/
    ├── prisma-sqlite/       # Current: SQLite with Prisma
    │   ├── index.ts
    │   ├── catalog-context.ts
    │   └── project-context.ts
    └── mongodb/             # Future: MongoDB
        └── index.ts         # Stub implementation
```

## Supported Providers

| Provider | Status | Use Case |
|----------|--------|----------|
| `prisma-sqlite` | ✅ Implemented | Development, small teams |
| `mongodb` | 🔧 Stub | Enterprise, large scale |
| `prisma-postgres` | 📋 Planned | Cloud deployments |

## How to Switch Providers

### Step 1: Update Configuration

```typescript
// Before (SQLite)
await db.initialize({
  type: 'prisma-sqlite',
  catalogDbPath: './databases/catalog/catalog.db',
  projectsDbDir: './databases/projects'
});

// After (MongoDB)
await db.initialize({
  type: 'mongodb',
  mongoUri: 'mongodb://localhost:27017',
  mongoDatabaseName: 'vero_catalog'
});
```

### Step 2: Run Data Migration

```bash
# Export existing data
npm run db:export

# Switch provider in config
# Edit src/index.ts or .env

# Import to new provider
npm run db:import
```

## Migrating to MongoDB

### Prerequisites

1. Install MongoDB dependencies:
```bash
npm install mongodb
```

2. Set up MongoDB server (local or Atlas)

### Implementation Steps

1. **Complete the MongoDB provider** (`src/database/providers/mongodb/index.ts`)
   - Implement all repository classes
   - Add connection pooling
   - Create indexes

2. **Create migration script**
   - Export from SQLite: `prisma db dump`
   - Transform data format if needed
   - Import to MongoDB

3. **Update environment config**
```env
DATABASE_PROVIDER=mongodb
MONGO_URI=mongodb+srv://...
```

### MongoDB Schema Design

**Catalog Database: `vero_catalog`**
- `users` collection
- `projects` collection
- `executions` collection
- `schedules` collection

**Project Databases: `vero_project_{projectId}`**
- `testDataSheets` collection
- `testDataRows` collection
- `workflows` collection
- `testFlows` collection
- `globalVariables` collection
- `workflowVariables` collection
- `environments` collection

### Example MongoDB Repository

```typescript
class MongoTestDataSheetRepository implements ITestDataSheetRepository {
  constructor(private collection: Collection) {}

  async findById(id: string): Promise<ITestDataSheet | null> {
    const doc = await this.collection.findOne({ _id: id });
    return doc ? this.mapDocument(doc) : null;
  }

  async create(data: CreateInput): Promise<ITestDataSheet> {
    const now = new Date();
    const doc = {
      _id: uuid(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    await this.collection.insertOne(doc);
    return this.mapDocument(doc);
  }

  // ... other methods
}
```

## Adding a New Provider

1. Create provider folder: `src/database/providers/your-provider/`

2. Implement `IDatabaseProvider` interface:
```typescript
export class YourProvider implements IDatabaseProvider {
  readonly type: DatabaseProviderType = 'your-provider';

  async initialize(config: DatabaseConfig): Promise<void> { }
  getCatalogContext(): ICatalogDatabaseContext { }
  async getProjectContext(projectId: string): Promise<IProjectDatabaseContext> { }
  // ... other methods
}
```

3. Implement catalog and project contexts with all repositories

4. Register in `src/database/index.ts`:
```typescript
private createProvider(type: DatabaseProviderType): IDatabaseProvider {
  switch (type) {
    case 'your-provider':
      return createYourProvider();
    // ...
  }
}
```

5. Add type to `DatabaseProviderType` in interfaces

## Best Practices

1. **Never access database directly** - Always use `db.catalog` or `db.getProject()`

2. **Use repository methods** - Don't write raw queries in routes

3. **Handle JSON fields consistently** - The interface layer expects parsed objects

4. **Release connections** - Call `db.releaseProject()` for long-running processes

5. **Transaction support** - Use `context.transaction()` for atomic operations

## Environment Variables

```env
# Provider selection
DATABASE_PROVIDER=prisma-sqlite

# SQLite config
CATALOG_DATABASE_URL=file:./databases/catalog/catalog.db
PROJECTS_DATABASE_DIR=./databases/projects

# MongoDB config (when using mongodb provider)
MONGO_URI=mongodb://localhost:27017
MONGO_DATABASE_NAME=vero_catalog

# Connection pool
DATABASE_POOL_SIZE=10
DATABASE_CONNECTION_TIMEOUT=30000
```

---

## Step-by-Step Migration

### Phase 1: Adopt Repository Pattern (Now)

**Goal:** Use repository interfaces while keeping existing database

1. **Update imports in route files:**
```typescript
// Before
import { prisma } from '../db/prisma';

// After
import { getProjectContext, getCatalog } from '../database/adapters/legacy-prisma';
```

2. **Replace direct Prisma calls:**
```typescript
// Before
const sheet = await prisma.testDataSheet.findUnique({
  where: { id },
  include: { rows: true }
});
const parsed = {
  ...sheet,
  columns: JSON.parse(sheet.columns),
  rows: sheet.rows.map(r => ({ ...r, data: JSON.parse(r.data) }))
};

// After
const projectCtx = getProjectContext(projectId);
const sheet = await projectCtx.testDataSheets.findWithRows(id);
// Data is already parsed!
```

3. **Benefits:**
   - Type-safe interfaces
   - Automatic JSON parsing
   - Easier testing (mock repositories)
   - Ready for multi-DB migration

### Phase 2: Multi-Database Architecture (Future)

**When:** Enterprise deployment, >100 projects, compliance requirements

1. **Generate Prisma clients for both schemas:**
```bash
npx prisma generate --schema=prisma/catalog/schema.prisma
npx prisma generate --schema=prisma/project/schema.prisma
```

2. **Create catalog database:**
```bash
npx prisma db push --schema=prisma/catalog/schema.prisma
```

3. **Update initialization:**
```typescript
// src/index.ts
import { db } from './database';

async function start() {
  await db.initialize({
    type: 'prisma-sqlite',
    catalogDbPath: './databases/catalog/catalog.db',
    projectsDbDir: './databases/projects'
  });

  // Rest of startup...
}
```

4. **Migrate routes from legacy adapter:**
```typescript
// Before (legacy)
import { getProjectContext } from '../database/adapters/legacy-prisma';
const ctx = getProjectContext(projectId);

// After (full multi-DB)
import { db } from '../database';
const ctx = await db.getProject(projectId);
```

5. **Run data migration script** (to be created)

### Phase 3: MongoDB Migration (Enterprise)

**When:** Need for horizontal scaling, cloud-native deployment

1. **Install MongoDB driver:**
```bash
npm install mongodb
```

2. **Complete MongoDB provider** (`src/database/providers/mongodb/index.ts`)

3. **Update configuration:**
```typescript
await db.initialize({
  type: 'mongodb',
  mongoUri: process.env.MONGO_URI,
  mongoDatabaseName: 'vero'
});
```

4. **Run data export/import:**
```bash
npm run db:export --provider=prisma-sqlite --output=./backup.json
npm run db:import --provider=mongodb --input=./backup.json
```

---

## File Reference

| File | Purpose |
|------|---------|
| `src/database/index.ts` | Main entry point, `db` singleton |
| `src/database/interfaces/index.ts` | All repository interfaces |
| `src/database/adapters/legacy-prisma.ts` | Backward-compatible adapter |
| `src/database/providers/prisma-sqlite/` | Full multi-DB SQLite provider |
| `src/database/providers/mongodb/` | MongoDB provider stub |
| `src/routes/test-data-v2.routes.ts` | Example migrated routes |
| `prisma/catalog/schema.prisma` | Catalog DB schema |
| `prisma/project/schema.prisma` | Project DB schema (template) |
