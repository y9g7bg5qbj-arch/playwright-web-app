/**
 * Shared helpers for test-data route modules.
 *
 * Extracted from the monolithic test-data.routes.ts to be reused by
 * sheets, rows, views, relationships, and other sub-route files.
 */

import { applicationRepository, projectRepository } from '../../db/repositories/mongo';
import { isAdmin } from '../../middleware/rbac';

// ==================== TYPES ====================

export type TestDataScope = {
    applicationId: string;
    nestedProjectId?: string;
};

// ==================== PARAMETER HELPERS ====================

/**
 * Safely extract a non-empty trimmed string from a query/body value.
 * Returns undefined for missing, empty, or non-string values.
 */
export function getStringParam(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

// ==================== SCOPE RESOLUTION ====================

/**
 * Resolve the application + nested-project scope for a request.
 *
 * - If applicationId is missing and `allowFallbackApplication` is true, falls
 *   back to the user's first (oldest) application.
 * - Validates that the user owns the application.
 * - Validates that the nested project belongs to the application (if provided).
 *
 * Returns `{ scope }` on success or `{ error, status }` on failure.
 */
export async function resolveScopeForRequest(
    userId: string,
    applicationIdInput?: string,
    nestedProjectIdInput?: string,
    allowFallbackApplication = true,
    userRole?: string
): Promise<{ scope?: TestDataScope; error?: string; status?: number }> {
    let applicationId = applicationIdInput;

    if (!applicationId && allowFallbackApplication) {
        const userApps = isAdmin(userRole)
            ? await applicationRepository.findAll()
            : await applicationRepository.findByUserId(userId);
        const firstApp = userApps.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
        applicationId = firstApp?.id;
    }

    if (!applicationId) {
        return {
            status: 400,
            error: 'projectId is required'
        };
    }

    const application = await applicationRepository.findById(applicationId);
    if (!application || (!isAdmin(userRole) && application.userId !== userId)) {
        return {
            status: 403,
            error: 'Access denied to this application'
        };
    }

    const nestedProjectId = nestedProjectIdInput;
    if (nestedProjectId) {
        const nestedProject = await projectRepository.findById(nestedProjectId);
        if (!nestedProject || nestedProject.applicationId !== applicationId) {
            return {
                status: 400,
                error: 'Invalid nestedProjectId for the selected application'
            };
        }
    }

    return {
        scope: {
            applicationId,
            nestedProjectId,
        }
    };
}

// ==================== SCOPE FILTERING ====================

/**
 * Check whether a sheet belongs to the given scope.
 *
 * - Sheet must match scope.applicationId.
 * - If scope has a nestedProjectId, sheet.projectId must match.
 * - If scope has no nestedProjectId, only app-level sheets (no projectId) match.
 */
export function sheetInScope(
    sheet: { applicationId: string; projectId?: string },
    scope: TestDataScope
): boolean {
    if (sheet.applicationId !== scope.applicationId) {
        return false;
    }

    if (scope.nestedProjectId) {
        return sheet.projectId === scope.nestedProjectId;
    }

    // App-level scope only
    return !sheet.projectId;
}
