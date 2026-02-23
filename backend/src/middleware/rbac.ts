/**
 * RBAC (Role-Based Access Control) Middleware
 *
 * Defines permissions, maps roles to permissions, and provides Express middleware
 * for protecting routes based on user roles.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { ForbiddenError } from '../utils/errors';
import type { UserRole } from '@playwright-web-app/shared';

// All available permissions in the system
export type Permission =
  | 'manage:system'    // System settings, database config
  | 'manage:projects'  // Project/application configuration, data storage
  | 'manage:users'     // User management, role assignment
  | 'approve:pr'       // Approve pull requests
  | 'merge:pr'         // Merge pull requests
  | 'edit:tests'       // Create/edit/delete test files, sandboxes
  | 'view:tests';      // Read-only access to tests and results

// Role hierarchy — each role inherits all permissions of roles below it
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'manage:system',
    'manage:projects',
    'manage:users',
    'approve:pr',
    'merge:pr',
    'edit:tests',
    'view:tests',
  ],
  qa_lead: [
    'manage:projects',
    'approve:pr',
    'merge:pr',
    'edit:tests',
    'view:tests',
  ],
  senior_qa: [
    'approve:pr',
    'merge:pr',
    'edit:tests',
    'view:tests',
  ],
  qa_tester: [
    'edit:tests',
    'view:tests',
  ],
  viewer: [
    'view:tests',
  ],
};

// Valid role strings for normalization
const VALID_ROLES: Set<string> = new Set(['admin', 'qa_lead', 'senior_qa', 'qa_tester', 'viewer']);

// Role aliases for backward compatibility
const ROLE_ALIASES: Record<string, UserRole> = {
  qa: 'qa_tester',
  tester: 'qa_tester',
  lead: 'qa_lead',
  senior: 'senior_qa',
};

/**
 * Normalize a role string to a valid UserRole.
 * Handles aliases and defaults to 'qa_tester' for unknown values.
 */
export function normalizeRole(role: string | undefined | null): UserRole {
  if (!role) return 'qa_tester';
  const lower = role.toLowerCase().trim();
  if (VALID_ROLES.has(lower)) return lower as UserRole;
  if (ROLE_ALIASES[lower]) return ROLE_ALIASES[lower];
  return 'qa_tester';
}

/**
 * Check if a role (or AuthRequest) is an admin.
 * Accepts a raw role string or an object with userRole (e.g., AuthRequest).
 */
export function isAdmin(roleOrReq: string | undefined | null | { userRole?: string }): boolean {
  const role = typeof roleOrReq === 'object' && roleOrReq !== null
    ? (roleOrReq as { userRole?: string }).userRole
    : roleOrReq;
  return normalizeRole(role) === 'admin';
}

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Check if a role has ALL of the specified permissions.
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

/**
 * Check if a role has ANY of the specified permissions.
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

/**
 * Express middleware that requires the user to have ALL specified permissions.
 * Must be used after authenticateToken middleware.
 *
 * Usage:
 *   router.get('/settings', authenticateToken, requirePermission('manage:system'), handler);
 *   router.post('/merge', authenticateToken, requirePermission('merge:pr', 'edit:tests'), handler);
 */
export function requirePermission(...permissions: Permission[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    const role = normalizeRole(req.userRole);

    if (!hasAllPermissions(role, permissions)) {
      return next(
        new ForbiddenError(
          `Insufficient permissions. Required: ${permissions.join(', ')}. Your role: ${role}`
        )
      );
    }

    next();
  };
}

/**
 * Express middleware that requires the user to have ANY of the specified permissions.
 */
export function requireAnyPermission(...permissions: Permission[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    const role = normalizeRole(req.userRole);

    if (!hasAnyPermission(role, permissions)) {
      return next(
        new ForbiddenError(
          `Insufficient permissions. Required one of: ${permissions.join(', ')}. Your role: ${role}`
        )
      );
    }

    next();
  };
}

/**
 * Get all permissions for a given role.
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}
