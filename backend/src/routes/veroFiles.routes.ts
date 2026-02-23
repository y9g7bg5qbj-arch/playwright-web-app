import { Router, Response, NextFunction } from 'express';
import { readFile, writeFile, readdir, stat, mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname, extname } from 'path';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { resolveProjectPath, confineToBase } from './veroProjectPath.utils';
import { ensureProjectEnvironmentResources } from './veroVisualSnapshots.utils';
import { logger } from '../utils/logger';

interface FileNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    children?: FileNode[];
}

const ROOT_ENV_FOLDERS = new Set(['dev', 'master', 'sandboxes']);
const CONTENT_FOLDERS = new Set(['pages', 'features', 'pageactions']);
const SANDBOX_HIDDEN_DIRS = new Set(['data', '.sync-base']);

const IMAGE_CONTENT_TYPES: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
};

const RESOURCE_TEXT_EXTENSIONS = new Set([
    '.txt',
    '.md',
    '.json',
    '.yaml',
    '.yml',
    '.csv',
    '.log',
]);

function isWithinResources(relativePathLower: string): boolean {
    return relativePathLower === 'resources'
        || relativePathLower.startsWith('resources/')
        || relativePathLower.endsWith('/resources')
        || relativePathLower.includes('/resources/');
}

function shouldExposeResourceFile(entryName: string): boolean {
    return !entryName.startsWith('.');
}

function getContentType(filePath: string): string {
    const extension = extname(filePath).toLowerCase();
    if (IMAGE_CONTENT_TYPES[extension]) {
        return IMAGE_CONTENT_TYPES[extension];
    }
    if (extension === '.pdf') {
        return 'application/pdf';
    }
    if (RESOURCE_TEXT_EXTENSIONS.has(extension) || extension === '.vero') {
        return 'text/plain; charset=utf-8';
    }
    return 'application/octet-stream';
}

function isBinaryFile(filePath: string): boolean {
    const extension = extname(filePath).toLowerCase();
    if (IMAGE_CONTENT_TYPES[extension]) {
        return true;
    }
    return extension === '.pdf';
}

async function cleanupInvalidRootPagesFolders(projectRoot: string): Promise<void> {
    const entries = await readdir(projectRoot);
    for (const entry of entries) {
        if (entry.toLowerCase() !== 'pages') {
            continue;
        }

        const fullPath = join(projectRoot, entry);
        const stats = await stat(fullPath);
        if (!stats.isDirectory()) {
            continue;
        }

        await rm(fullPath, { recursive: true, force: true });
        console.info(`[Vero Files] Removed invalid root pages folder: ${fullPath}`);
    }
}

async function scanDirectory(dirPath: string, relativePath = '', scoped = false): Promise<FileNode[]> {
    const entries = await readdir(dirPath);
    const result: FileNode[] = [];

    for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        const relPath = relativePath ? `${relativePath}/${entry}` : entry;
        const stats = await stat(fullPath);
        const lowerEntry = entry.toLowerCase();
        const relativePathLower = relativePath.toLowerCase();
        const atProjectRoot = relativePath === '';
        const atSandboxesRoot = relativePathLower === 'sandboxes';
        const inSandbox = relativePathLower.startsWith('sandboxes/');

        if (stats.isDirectory()) {
            // When scoped (root is already an env folder), skip env-folder filtering.
            // Only expose root environment folders (dev/master/sandboxes) when unscoped.
            if (atProjectRoot && !scoped && !ROOT_ENV_FOLDERS.has(lowerEntry)) {
                continue;
            }

            // sandboxes/Pages (and similar content dirs) are invalid peers and must be hidden.
            if (atSandboxesRoot && CONTENT_FOLDERS.has(lowerEntry)) {
                continue;
            }

            // Never expose internal or deprecated sandbox folders in the tree.
            if (inSandbox && SANDBOX_HIDDEN_DIRS.has(lowerEntry)) {
                continue;
            }

            const children = await scanDirectory(fullPath, relPath);
            result.push({
                name: entry,
                path: relPath,
                type: 'directory',
                children,
            });
        } else if (entry.endsWith('.vero')) {
            // Keep root and sandboxes root flat of content files.
            if (atProjectRoot || atSandboxesRoot) {
                continue;
            }

            // Ignore accidental .vero files directly inside sandboxes/<name> root.
            if (inSandbox) {
                const pathParts = relativePathLower.split('/').filter(Boolean);
                if (pathParts.length === 2) {
                    continue;
                }
            }

            result.push({
                name: entry,
                path: relPath,
                type: 'file',
            });
        } else if (isWithinResources(relativePathLower) && shouldExposeResourceFile(entry)) {
            result.push({
                name: entry,
                path: relPath,
                type: 'file',
            });
        }
    }

    return result;
}

export const __veroFilesRouteTestUtils = {
    scanDirectory,
};

const filesRouter = Router();

// List project files (VERO plus Resources content)
filesRouter.get('/files', authenticateToken, async (req: AuthRequest, res: Response, _next: NextFunction) => {
    try {
        const projectId = req.query.projectId as string | undefined;
        const veroPathParam = req.query.veroPath as string | undefined;
        const projectPath = await resolveProjectPath(veroPathParam, projectId);
        const fullPath = projectPath.startsWith('/') ? projectPath : join(process.cwd(), projectPath);

        if (!existsSync(fullPath)) {
            return res.json({ success: true, files: [] });
        }

        await ensureProjectEnvironmentResources(fullPath);
        await cleanupInvalidRootPagesFolders(fullPath);
        const result = await scanDirectory(fullPath);
        res.json({ success: true, files: result });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to list files';
        if (message.includes('Project not found')) {
            return res.status(404).json({ success: false, error: message });
        }
        if (message.includes('Access denied')) {
            return res.status(403).json({ success: false, error: message });
        }
        logger.error('Failed to list files:', error);
        res.status(500).json({ success: false, error: 'Failed to list files' });
    }
});

// Get file content
filesRouter.get('/files/:path(*)', authenticateToken, async (req: AuthRequest, res: Response, _next: NextFunction) => {
    try {
        const filePath = req.params.path;
        const projectId = req.query.projectId as string | undefined;
        const veroPathParam = req.query.veroPath as string | undefined;
        const projectPath = await resolveProjectPath(veroPathParam, projectId);
        const fullPath = confineToBase(projectPath, filePath);

        const contentType = getContentType(fullPath);
        if (isBinaryFile(fullPath)) {
            const content = (await readFile(fullPath)).toString('base64');
            const dataUrl = `data:${contentType};base64,${content}`;
            return res.json({ success: true, content: dataUrl, contentType, isBinary: true });
        }

        const content = await readFile(fullPath, 'utf-8');
        res.json({ success: true, content, contentType, isBinary: false });
    } catch (error) {
        logger.error('Failed to read file:', error);
        res.status(404).json({ success: false, error: 'File not found' });
    }
});

// Save file content
filesRouter.put('/files/:path(*)', authenticateToken, async (req: AuthRequest, res: Response, _next: NextFunction) => {
    try {
        const filePath = req.params.path;
        const { content } = req.body;
        const projectId = req.query.projectId as string | undefined;
        const veroPathParam = req.query.veroPath as string | undefined;
        const projectPath = await resolveProjectPath(veroPathParam, projectId);
        const fullPath = confineToBase(projectPath, filePath);

        if (isBinaryFile(fullPath)) {
            return res.status(400).json({
                success: false,
                error: 'Binary resource files are read-only in the editor',
            });
        }

        // Ensure directory exists
        const dir = dirname(fullPath);
        if (!existsSync(dir)) {
            await mkdir(dir, { recursive: true });
        }

        await writeFile(fullPath, content, 'utf-8');
        res.json({ success: true, message: 'File saved' });
    } catch (error) {
        logger.error('Failed to save file:', error);
        res.status(500).json({ success: false, error: 'Failed to save file' });
    }
});

// Rename file
filesRouter.post('/files/rename', authenticateToken, async (req: AuthRequest, res: Response, _next: NextFunction) => {
    try {
        const { oldPath, newPath } = req.body;
        const projectId = req.query.projectId as string | undefined;
        const veroPathParam = (req.body?.veroPath as string | undefined) ?? (req.query.veroPath as string | undefined);

        if (!oldPath || !newPath) {
            return res.status(400).json({ success: false, error: 'Both oldPath and newPath are required' });
        }

        const projectPath = await resolveProjectPath(veroPathParam, projectId);
        const fullOldPath = confineToBase(projectPath, oldPath);
        const fullNewPath = confineToBase(projectPath, newPath);

        // Import rename from fs/promises
        const { rename } = await import('fs/promises');
        await rename(fullOldPath, fullNewPath);

        res.json({ success: true, message: 'File renamed', newPath });
    } catch (error) {
        logger.error('Failed to rename file:', error);
        res.status(500).json({ success: false, error: 'Failed to rename file' });
    }
});

// Delete file
filesRouter.delete('/files/:path(*)', authenticateToken, async (req: AuthRequest, res: Response, _next: NextFunction) => {
    try {
        const filePath = req.params.path;
        const projectId = req.query.projectId as string | undefined;
        const veroPath = req.query.veroPath as string | undefined;
        const projectPath = await resolveProjectPath(veroPath, projectId);
        const fullPath = confineToBase(projectPath, filePath);

        const { unlink } = await import('fs/promises');
        await unlink(fullPath);

        res.json({ success: true, message: 'File deleted' });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete file';
        if (message.includes('Access denied')) {
            return res.status(403).json({ success: false, error: message });
        }
        logger.error('Failed to delete file:', error);
        res.status(500).json({ success: false, error: 'Failed to delete file' });
    }
});

export { filesRouter as veroFilesRouter };
