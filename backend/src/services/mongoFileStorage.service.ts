/**
 * MongoDB File Storage Service
 *
 * Stores Vero files (pages, features, data) in MongoDB instead of the filesystem.
 * This allows all data to be stored in a single configurable database.
 */

import { getDb, COLLECTIONS } from '../db/mongodb';
import { Collection, ObjectId } from 'mongodb';

// Add VERO_FILES to COLLECTIONS
const VERO_FILES_COLLECTION = 'vero_files';

// File document interface
export interface MongoVeroFile {
  _id?: ObjectId;
  projectId: string;
  path: string;          // Relative path: "Pages/LoginPage.vero" or "Features/Login.vero"
  content: string;       // File content
  type: 'page' | 'feature' | 'data' | 'other';
  createdAt: Date;
  updatedAt: Date;
}

// File info returned to clients (without content)
export interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileInfo[];
}

/**
 * Get the vero_files collection
 */
function getFilesCollection(): Collection<MongoVeroFile> {
  return getDb().collection<MongoVeroFile>(VERO_FILES_COLLECTION);
}

/**
 * Determine file type from path
 */
function getFileType(path: string): MongoVeroFile['type'] {
  const lowerPath = path.toLowerCase();
  if (lowerPath.includes('/pages/') || lowerPath.startsWith('pages/')) {
    return 'page';
  }
  if (lowerPath.includes('/features/') || lowerPath.startsWith('features/')) {
    return 'feature';
  }
  if (lowerPath.includes('/data/') || lowerPath.startsWith('data/')) {
    return 'data';
  }
  return 'other';
}

/**
 * List all files for a project
 */
export async function listFiles(projectId: string): Promise<FileInfo[]> {
  const collection = getFilesCollection();
  const files = await collection.find({ projectId }).toArray();

  // Build folder structure from flat file list
  const root: FileInfo[] = [];
  const folderMap = new Map<string, FileInfo>();

  // Sort files by path to ensure folders are processed before their contents
  files.sort((a, b) => a.path.localeCompare(b.path));

  for (const file of files) {
    const pathParts = file.path.split('/');
    const fileName = pathParts.pop() || '';
    let currentLevel = root;
    let currentPath = '';

    // Create folder structure
    for (const part of pathParts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!folderMap.has(currentPath)) {
        const folder: FileInfo = {
          name: part,
          path: currentPath,
          type: 'folder',
          children: []
        };
        folderMap.set(currentPath, folder);
        currentLevel.push(folder);
      }

      currentLevel = folderMap.get(currentPath)!.children!;
    }

    // Add the file
    currentLevel.push({
      name: fileName,
      path: file.path,
      type: 'file'
    });
  }

  return root;
}

/**
 * Read a file's content
 */
export async function readFile(projectId: string, path: string): Promise<string | null> {
  const collection = getFilesCollection();
  const file = await collection.findOne({ projectId, path });
  return file?.content || null;
}

/**
 * Write/update a file
 */
export async function writeFile(projectId: string, path: string, content: string): Promise<void> {
  const collection = getFilesCollection();
  const now = new Date();

  await collection.updateOne(
    { projectId, path },
    {
      $set: {
        content,
        type: getFileType(path),
        updatedAt: now
      },
      $setOnInsert: {
        projectId,
        path,
        createdAt: now
      }
    },
    { upsert: true }
  );
}

/**
 * Delete a file
 */
export async function deleteFile(projectId: string, path: string): Promise<boolean> {
  const collection = getFilesCollection();
  const result = await collection.deleteOne({ projectId, path });
  return result.deletedCount > 0;
}

/**
 * Delete a folder and all its contents
 */
export async function deleteFolder(projectId: string, folderPath: string): Promise<number> {
  const collection = getFilesCollection();
  // Delete all files that start with the folder path
  const result = await collection.deleteMany({
    projectId,
    path: { $regex: `^${escapeRegex(folderPath)}/` }
  });
  return result.deletedCount;
}

/**
 * Rename/move a file or folder
 */
export async function renameFile(
  projectId: string,
  oldPath: string,
  newPath: string
): Promise<boolean> {
  const collection = getFilesCollection();

  // Check if it's a folder (has children)
  const children = await collection.find({
    projectId,
    path: { $regex: `^${escapeRegex(oldPath)}/` }
  }).toArray();

  if (children.length > 0) {
    // It's a folder - rename all children
    for (const child of children) {
      const newChildPath = child.path.replace(oldPath, newPath);
      await collection.updateOne(
        { _id: child._id },
        { $set: { path: newChildPath, updatedAt: new Date() } }
      );
    }
    return true;
  } else {
    // It's a file
    const result = await collection.updateOne(
      { projectId, path: oldPath },
      {
        $set: {
          path: newPath,
          type: getFileType(newPath),
          updatedAt: new Date()
        }
      }
    );
    return result.modifiedCount > 0;
  }
}

/**
 * Check if a file exists
 */
export async function fileExists(projectId: string, path: string): Promise<boolean> {
  const collection = getFilesCollection();
  const count = await collection.countDocuments({ projectId, path });
  return count > 0;
}

/**
 * Create a folder (creates a placeholder file to mark the folder)
 * Note: MongoDB doesn't have real folders, so we just create files.
 * Empty folders are represented by their first file.
 */
export async function createFolder(projectId: string, folderPath: string): Promise<void> {
  // Folders are implicitly created when files are added
  // This is a no-op but can be used to pre-create folder structure
  // For now, we'll create a .gitkeep-like placeholder
  const placeholderPath = `${folderPath}/.folder`;
  const collection = getFilesCollection();
  const now = new Date();

  await collection.updateOne(
    { projectId, path: placeholderPath },
    {
      $set: {
        content: '',
        type: 'other' as const,
        updatedAt: now
      },
      $setOnInsert: {
        projectId,
        path: placeholderPath,
        createdAt: now
      }
    },
    { upsert: true }
  );
}

/**
 * Get all files matching a pattern (for scenarios endpoint)
 */
export async function findFiles(
  projectId: string,
  pattern: string
): Promise<Array<{ path: string; content: string }>> {
  const collection = getFilesCollection();
  const regex = new RegExp(pattern.replace('*', '.*'));

  const files = await collection.find({
    projectId,
    path: { $regex: regex }
  }).toArray();

  return files.map(f => ({ path: f.path, content: f.content }));
}

/**
 * Initialize default project files
 */
export async function initializeProjectFiles(projectId: string): Promise<void> {
  const defaultFiles = [
    {
      path: 'Pages/example.vero',
      content: `# ExamplePage
# This page object defines reusable elements for your tests

page ExamplePage {
    url "https://example.com"

    # Define page elements using various locator strategies
    field searchInput = testId "search-input"
    field submitButton = testId "submit-btn"
    field resultsList = css ".results-list"
    field pageTitle = text "Welcome"

    # Define reusable actions
    search with $query {
        fill searchInput with $query
        click submitButton
        wait for resultsList to be visible
    }

    verifyPageLoaded {
        assert pageTitle is visible
    }
}
`
    },
    {
      path: 'Features/example.vero',
      content: `# Example Feature
# Test scenarios for the example page

@smoke @example
feature "Example Tests" {

    @testId("TC001") @critical
    scenario "User can search for items" {
        use ExamplePage

        navigate to ExamplePage
        call verifyPageLoaded
        call search with "test query"

        assert resultsList is visible
    }

    @testId("TC002")
    scenario "Page loads correctly" {
        use ExamplePage

        navigate to ExamplePage
        call verifyPageLoaded
    }
}
`
    },
    {
      path: 'Data/testdata.vero',
      content: `# Test Data
# Define test data for data-driven testing

data LoginCredentials {
    | username      | password    | expected    |
    | "user1"       | "pass123"   | "success"   |
    | "user2"       | "pass456"   | "success"   |
    | "invalid"     | "wrong"     | "error"     |
}

data SearchTerms {
    | term          | resultCount |
    | "playwright"  | 10          |
    | "testing"     | 25          |
    | "automation"  | 15          |
}
`
    }
  ];

  for (const file of defaultFiles) {
    await writeFile(projectId, file.path, file.content);
  }
}

/**
 * Helper to escape regex special characters
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Export the service
export const mongoFileStorage = {
  listFiles,
  readFile,
  writeFile,
  deleteFile,
  deleteFolder,
  renameFile,
  fileExists,
  createFolder,
  findFiles,
  initializeProjectFiles
};

export default mongoFileStorage;
