import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { projectRepository } from '../db/repositories/mongo';

const VERO_PROJECTS_BASE = process.env.VERO_PROJECTS_PATH
    || (existsSync(join(process.cwd(), 'vero-projects'))
        ? join(process.cwd(), 'vero-projects')
        : join(process.cwd(), '..', 'vero-projects'));

export const VERO_PROJECT_PATH = process.env.VERO_PROJECT_PATH ||
    join(process.cwd(), '..', 'vero-lang', 'test-project');

// Allowed roots that project paths must fall within.
// Defaults to the parent of the working directory (covers vero-projects/, vero-lang/).
const ALLOWED_ROOTS: string[] = (() => {
    const roots = [resolve(VERO_PROJECT_PATH)];
    if (process.env.VERO_PROJECTS_ROOT) {
        roots.push(resolve(process.env.VERO_PROJECTS_ROOT));
    }
    // Also allow the vero-projects directory next to the app
    roots.push(resolve(process.cwd(), '..', 'vero-projects'));
    roots.push(resolve(process.cwd(), 'vero-projects'));
    return [...new Set(roots)]; // deduplicate
})();

/**
 * Check whether a resolved path falls within one of the allowed roots.
 */
function isPathAllowed(resolvedPath: string): boolean {
    return ALLOWED_ROOTS.some(root => resolvedPath.startsWith(root + '/') || resolvedPath === root);
}

// Resolve project path from either a direct veroPath param or a projectId lookup.
// Always resolves to an absolute path and validates it falls within allowed roots.
export async function resolveProjectPath(
    veroPathParam: string | undefined,
    projectId: string | undefined
): Promise<string> {
    let projectPath: string;

    if (veroPathParam) {
        projectPath = resolve(veroPathParam);
    } else if (projectId) {
        const project = await projectRepository.findById(projectId);
        if (project) {
            const explicitProjectPath = project.veroPath?.trim();
            if (explicitProjectPath) {
                projectPath = resolve(explicitProjectPath);
            } else {
                projectPath = resolve(VERO_PROJECTS_BASE, project.applicationId, project.id);
            }
        } else {
            throw new Error(`Project not found: ${projectId}`);
        }
    } else {
        return resolve(VERO_PROJECT_PATH);
    }

    if (!isPathAllowed(projectPath)) {
        throw new Error(`Access denied: path outside allowed project roots`);
    }

    return projectPath;
}

/**
 * Validate that a file path resolves within a given base directory.
 * Prevents path traversal via ../ sequences.
 */
export function confineToBase(basePath: string, filePath: string): string {
    const resolvedBase = resolve(basePath);
    const resolvedFull = resolve(resolvedBase, filePath);

    if (!resolvedFull.startsWith(resolvedBase + '/') && resolvedFull !== resolvedBase) {
        throw new Error('Access denied: path traversal blocked');
    }

    return resolvedFull;
}
