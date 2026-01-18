/**
 * Migration Script: SQLite to MongoDB Atlas
 *
 * Migrates existing Vero test data from SQLite database to MongoDB Atlas.
 * Run with: npx tsx src/scripts/migrate-to-mongodb.ts
 */

import Database from 'better-sqlite3';
import { MongoClient } from 'mongodb';
import path from 'path';

// Configuration
const SQLITE_PATH = process.env.VERO_SQLITE_PATH ||
  '/Users/miker/Documents/vero-app-data/backend/prisma/dev.db';

const MONGODB_URI = process.env.MONGODB_URI ||
  'mongodb+srv://mikerejp_db_user:YjQGbSExl0J8TzNm@cluster0.tw7ocqu.mongodb.net/?appName=Cluster0';

const DATABASE_NAME = 'vero_ide';

interface SqliteRow {
  [key: string]: any;
}

async function migrate() {
  console.log('🚀 Starting migration from SQLite to MongoDB Atlas...\n');

  // Connect to SQLite
  console.log(`📂 Opening SQLite database: ${SQLITE_PATH}`);
  const sqlite = new Database(SQLITE_PATH, { readonly: true });

  // Connect to MongoDB
  console.log(`🌐 Connecting to MongoDB Atlas...`);
  const mongoClient = new MongoClient(MONGODB_URI);
  await mongoClient.connect();
  const db = mongoClient.db(DATABASE_NAME);
  console.log(`✅ Connected to MongoDB database: ${DATABASE_NAME}\n`);

  try {
    // Migrate Applications
    console.log('📦 Migrating applications...');
    const applications = sqlite.prepare('SELECT * FROM applications').all() as SqliteRow[];
    if (applications.length > 0) {
      await db.collection('applications').deleteMany({});
      await db.collection('applications').insertMany(
        applications.map(app => ({
          id: app.id,
          userId: app.user_id,
          name: app.name,
          description: app.description,
          createdAt: new Date(app.created_at),
          updatedAt: new Date(app.updated_at),
        }))
      );
      console.log(`   ✅ Migrated ${applications.length} applications`);
    } else {
      console.log('   ⚠️ No applications found');
    }

    // Migrate Projects
    console.log('📁 Migrating projects...');
    const projects = sqlite.prepare('SELECT * FROM projects').all() as SqliteRow[];
    if (projects.length > 0) {
      await db.collection('projects').deleteMany({});
      await db.collection('projects').insertMany(
        projects.map(proj => ({
          id: proj.id,
          applicationId: proj.application_id,
          name: proj.name,
          description: proj.description,
          veroPath: proj.vero_path,
          gitInitialized: Boolean(proj.git_initialized),
          createdAt: new Date(proj.created_at),
          updatedAt: new Date(proj.updated_at),
        }))
      );
      console.log(`   ✅ Migrated ${projects.length} projects`);
    } else {
      console.log('   ⚠️ No projects found');
    }

    // Migrate Test Data Sheets
    console.log('📊 Migrating test data sheets...');
    const sheets = sqlite.prepare('SELECT * FROM test_data_sheets').all() as SqliteRow[];
    if (sheets.length > 0) {
      await db.collection('test_data_sheets').deleteMany({});
      await db.collection('test_data_sheets').insertMany(
        sheets.map(sheet => ({
          id: sheet.id,
          applicationId: sheet.application_id,
          name: sheet.name,
          pageObject: sheet.page_object,
          description: sheet.description,
          columns: JSON.parse(sheet.columns || '[]'),
          createdAt: new Date(sheet.created_at),
          updatedAt: new Date(sheet.updated_at),
        }))
      );
      console.log(`   ✅ Migrated ${sheets.length} test data sheets`);
    } else {
      console.log('   ⚠️ No test data sheets found');
    }

    // Migrate Test Data Rows
    console.log('📝 Migrating test data rows...');
    const rows = sqlite.prepare('SELECT * FROM test_data_rows').all() as SqliteRow[];
    if (rows.length > 0) {
      await db.collection('test_data_rows').deleteMany({});
      await db.collection('test_data_rows').insertMany(
        rows.map(row => ({
          id: row.id,
          sheetId: row.sheet_id,
          scenarioId: row.scenario_id,
          data: JSON.parse(row.data || '{}'),
          enabled: Boolean(row.enabled),
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        }))
      );
      console.log(`   ✅ Migrated ${rows.length} test data rows`);
    } else {
      console.log('   ⚠️ No test data rows found');
    }

    // Migrate Users (for reference)
    console.log('👤 Migrating users...');
    const users = sqlite.prepare('SELECT * FROM users').all() as SqliteRow[];
    if (users.length > 0) {
      await db.collection('users').deleteMany({});
      await db.collection('users').insertMany(
        users.map(user => ({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: new Date(user.created_at),
          updatedAt: new Date(user.updated_at),
        }))
      );
      console.log(`   ✅ Migrated ${users.length} users`);
    } else {
      console.log('   ⚠️ No users found');
    }

    // Migrate Workflows
    console.log('🔄 Migrating workflows...');
    const workflows = sqlite.prepare('SELECT * FROM workflows').all() as SqliteRow[];
    if (workflows.length > 0) {
      await db.collection('workflows').deleteMany({});
      await db.collection('workflows').insertMany(
        workflows.map(wf => ({
          id: wf.id,
          applicationId: wf.application_id,
          userId: wf.user_id,
          name: wf.name,
          description: wf.description,
          createdAt: new Date(wf.created_at),
          updatedAt: new Date(wf.updated_at),
        }))
      );
      console.log(`   ✅ Migrated ${workflows.length} workflows`);
    } else {
      console.log('   ⚠️ No workflows found');
    }

    // Migrate Test Flows
    console.log('🧪 Migrating test flows...');
    const testFlows = sqlite.prepare('SELECT * FROM test_flows').all() as SqliteRow[];
    if (testFlows.length > 0) {
      await db.collection('test_flows').deleteMany({});
      await db.collection('test_flows').insertMany(
        testFlows.map(flow => ({
          id: flow.id,
          workflowId: flow.workflow_id,
          name: flow.name,
          code: flow.code,
          nodes: flow.nodes ? JSON.parse(flow.nodes) : null,
          edges: flow.edges ? JSON.parse(flow.edges) : null,
          variables: flow.variables ? JSON.parse(flow.variables) : null,
          dataSource: flow.data_source ? JSON.parse(flow.data_source) : null,
          language: flow.language,
          tags: JSON.parse(flow.tags || '[]'),
          timeout: flow.timeout,
          createdAt: new Date(flow.created_at),
          updatedAt: new Date(flow.updated_at),
        }))
      );
      console.log(`   ✅ Migrated ${testFlows.length} test flows`);
    } else {
      console.log('   ⚠️ No test flows found');
    }

    // Create indexes for better query performance
    console.log('\n📇 Creating indexes...');
    await db.collection('test_data_sheets').createIndex({ applicationId: 1 });
    await db.collection('test_data_sheets').createIndex({ name: 1 });
    await db.collection('test_data_rows').createIndex({ sheetId: 1 });
    await db.collection('test_data_rows').createIndex({ scenarioId: 1 });
    await db.collection('projects').createIndex({ applicationId: 1 });
    await db.collection('workflows').createIndex({ applicationId: 1 });
    await db.collection('test_flows').createIndex({ workflowId: 1 });
    console.log('   ✅ Indexes created');

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ Migration completed successfully!');
    console.log('='.repeat(50));
    console.log('\nSummary:');
    console.log(`   Applications: ${applications.length}`);
    console.log(`   Projects: ${projects.length}`);
    console.log(`   Test Data Sheets: ${sheets.length}`);
    console.log(`   Test Data Rows: ${rows.length}`);
    console.log(`   Users: ${users.length}`);
    console.log(`   Workflows: ${workflows.length}`);
    console.log(`   Test Flows: ${testFlows.length}`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    sqlite.close();
    await mongoClient.close();
    console.log('\n🔒 Database connections closed');
  }
}

// Run migration
migrate().catch(console.error);
