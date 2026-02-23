import { describe, it, expect } from 'vitest';
import {
  normalizeRole,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getPermissionsForRole,
} from '../middleware/rbac';
import type { UserRole } from '@playwright-web-app/shared';

// ---------------------------------------------------------------------------
// normalizeRole
// ---------------------------------------------------------------------------
describe('normalizeRole', () => {
  it('returns qa_tester for undefined/null/empty', () => {
    expect(normalizeRole(undefined)).toBe('qa_tester');
    expect(normalizeRole(null)).toBe('qa_tester');
    expect(normalizeRole('')).toBe('qa_tester');
  });

  it('normalizes valid role strings', () => {
    expect(normalizeRole('admin')).toBe('admin');
    expect(normalizeRole('qa_lead')).toBe('qa_lead');
    expect(normalizeRole('senior_qa')).toBe('senior_qa');
    expect(normalizeRole('qa_tester')).toBe('qa_tester');
    expect(normalizeRole('viewer')).toBe('viewer');
  });

  it('is case-insensitive', () => {
    expect(normalizeRole('Admin')).toBe('admin');
    expect(normalizeRole('QA_LEAD')).toBe('qa_lead');
    expect(normalizeRole('VIEWER')).toBe('viewer');
  });

  it('handles aliases', () => {
    expect(normalizeRole('qa')).toBe('qa_tester');
    expect(normalizeRole('tester')).toBe('qa_tester');
    expect(normalizeRole('lead')).toBe('qa_lead');
    expect(normalizeRole('senior')).toBe('senior_qa');
  });

  it('defaults unknown roles to qa_tester', () => {
    expect(normalizeRole('superuser')).toBe('qa_tester');
    expect(normalizeRole('root')).toBe('qa_tester');
    expect(normalizeRole('garbage')).toBe('qa_tester');
  });
});

// ---------------------------------------------------------------------------
// hasPermission
// ---------------------------------------------------------------------------
describe('hasPermission', () => {
  const roles: UserRole[] = ['admin', 'qa_lead', 'senior_qa', 'qa_tester', 'viewer'];

  it('admin has all permissions', () => {
    expect(hasPermission('admin', 'manage:system')).toBe(true);
    expect(hasPermission('admin', 'manage:projects')).toBe(true);
    expect(hasPermission('admin', 'manage:users')).toBe(true);
    expect(hasPermission('admin', 'approve:pr')).toBe(true);
    expect(hasPermission('admin', 'merge:pr')).toBe(true);
    expect(hasPermission('admin', 'edit:tests')).toBe(true);
    expect(hasPermission('admin', 'view:tests')).toBe(true);
  });

  it('qa_lead can manage projects and PRs but NOT system or users', () => {
    expect(hasPermission('qa_lead', 'manage:projects')).toBe(true);
    expect(hasPermission('qa_lead', 'approve:pr')).toBe(true);
    expect(hasPermission('qa_lead', 'merge:pr')).toBe(true);
    expect(hasPermission('qa_lead', 'edit:tests')).toBe(true);
    expect(hasPermission('qa_lead', 'view:tests')).toBe(true);
    // Cannot manage system or users
    expect(hasPermission('qa_lead', 'manage:system')).toBe(false);
    expect(hasPermission('qa_lead', 'manage:users')).toBe(false);
  });

  it('senior_qa can approve/merge PRs but NOT manage projects/system/users', () => {
    expect(hasPermission('senior_qa', 'approve:pr')).toBe(true);
    expect(hasPermission('senior_qa', 'merge:pr')).toBe(true);
    expect(hasPermission('senior_qa', 'edit:tests')).toBe(true);
    expect(hasPermission('senior_qa', 'view:tests')).toBe(true);
    expect(hasPermission('senior_qa', 'manage:projects')).toBe(false);
    expect(hasPermission('senior_qa', 'manage:system')).toBe(false);
    expect(hasPermission('senior_qa', 'manage:users')).toBe(false);
  });

  it('qa_tester can only edit and view tests', () => {
    expect(hasPermission('qa_tester', 'edit:tests')).toBe(true);
    expect(hasPermission('qa_tester', 'view:tests')).toBe(true);
    expect(hasPermission('qa_tester', 'approve:pr')).toBe(false);
    expect(hasPermission('qa_tester', 'merge:pr')).toBe(false);
    expect(hasPermission('qa_tester', 'manage:projects')).toBe(false);
    expect(hasPermission('qa_tester', 'manage:system')).toBe(false);
    expect(hasPermission('qa_tester', 'manage:users')).toBe(false);
  });

  it('viewer can only view tests', () => {
    expect(hasPermission('viewer', 'view:tests')).toBe(true);
    expect(hasPermission('viewer', 'edit:tests')).toBe(false);
    expect(hasPermission('viewer', 'approve:pr')).toBe(false);
    expect(hasPermission('viewer', 'merge:pr')).toBe(false);
    expect(hasPermission('viewer', 'manage:projects')).toBe(false);
    expect(hasPermission('viewer', 'manage:system')).toBe(false);
    expect(hasPermission('viewer', 'manage:users')).toBe(false);
  });

  it('all roles can view tests', () => {
    for (const role of roles) {
      expect(hasPermission(role, 'view:tests')).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// hasAllPermissions / hasAnyPermission
// ---------------------------------------------------------------------------
describe('hasAllPermissions', () => {
  it('returns true when role has all requested permissions', () => {
    expect(hasAllPermissions('admin', ['manage:system', 'manage:users'])).toBe(true);
    expect(hasAllPermissions('qa_lead', ['approve:pr', 'edit:tests'])).toBe(true);
  });

  it('returns false when role lacks any requested permission', () => {
    expect(hasAllPermissions('qa_tester', ['edit:tests', 'approve:pr'])).toBe(false);
    expect(hasAllPermissions('viewer', ['edit:tests', 'view:tests'])).toBe(false);
  });
});

describe('hasAnyPermission', () => {
  it('returns true when role has at least one of the requested permissions', () => {
    expect(hasAnyPermission('qa_tester', ['manage:system', 'edit:tests'])).toBe(true);
    expect(hasAnyPermission('viewer', ['manage:system', 'view:tests'])).toBe(true);
  });

  it('returns false when role has none of the requested permissions', () => {
    expect(hasAnyPermission('viewer', ['manage:system', 'manage:users'])).toBe(false);
    expect(hasAnyPermission('qa_tester', ['manage:system', 'manage:users', 'manage:projects'])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getPermissionsForRole
// ---------------------------------------------------------------------------
describe('getPermissionsForRole', () => {
  it('returns correct permission count per role', () => {
    expect(getPermissionsForRole('admin')).toHaveLength(7);
    expect(getPermissionsForRole('qa_lead')).toHaveLength(5);
    expect(getPermissionsForRole('senior_qa')).toHaveLength(4);
    expect(getPermissionsForRole('qa_tester')).toHaveLength(2);
    expect(getPermissionsForRole('viewer')).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Permission hierarchy consistency
// ---------------------------------------------------------------------------
describe('permission hierarchy', () => {
  it('each role has a superset of the roles below it', () => {
    const hierarchy: UserRole[] = ['viewer', 'qa_tester', 'senior_qa', 'qa_lead', 'admin'];

    for (let i = 1; i < hierarchy.length; i++) {
      const higherRole = hierarchy[i];
      const lowerRole = hierarchy[i - 1];
      const lowerPerms = getPermissionsForRole(lowerRole);

      for (const perm of lowerPerms) {
        expect(
          hasPermission(higherRole, perm),
          `${higherRole} should have ${perm} (inherited from ${lowerRole})`
        ).toBe(true);
      }
    }
  });
});
