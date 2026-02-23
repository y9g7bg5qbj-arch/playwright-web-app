import { useState, useEffect, useCallback } from 'react';
import { usersApi } from '@/api/users';
import { useToastStore } from '@/store/useToastStore';
import { Loader2, ChevronDown } from 'lucide-react';
import type { User, UserRole } from '@playwright-web-app/shared';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'qa_lead', label: 'QA Lead' },
  { value: 'senior_qa', label: 'Senior QA' },
  { value: 'qa_tester', label: 'QA Tester' },
  { value: 'viewer', label: 'Viewer' },
];

interface UserManagementPanelProps {
  currentUserId: string;
  onAddUser?: () => void;
}

export function UserManagementPanel({ currentUserId, onAddUser }: UserManagementPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const { addToast } = useToastStore();

  const fetchUsers = useCallback(async () => {
    try {
      setError(null);
      const data = await usersApi.listUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingUserId(userId);
    try {
      await usersApi.updateUserRole(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      addToast({ message: 'Role updated successfully', variant: 'success' });
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to update role', variant: 'error' });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-status-danger/10 border border-status-danger/30 rounded-lg p-3 text-sm text-status-danger">
          {error}
        </div>
        <button
          onClick={fetchUsers}
          className="mt-3 text-sm text-brand-primary hover:text-brand-hover"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add User button */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-muted">
          {users.length} user{users.length !== 1 ? 's' : ''}
        </p>
        {onAddUser && (
          <button
            onClick={onAddUser}
            className="px-3 py-1.5 bg-brand-primary text-white text-xs font-medium rounded hover:bg-brand-hover transition-colors"
          >
            + Add User
          </button>
        )}
      </div>

      {/* Users table */}
      {users.length === 0 ? (
        <div className="text-center py-8 text-text-muted text-sm">
          No users yet. Add your first team member.
        </div>
      ) : (
        <div className="border border-border-default rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-dark-bg border-b border-border-default">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-text-muted uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-text-muted uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-text-muted uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = user.id === currentUserId;
                const isUpdating = updatingUserId === user.id;

                return (
                  <tr
                    key={user.id}
                    className="border-b border-border-default last:border-b-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-text-primary font-medium">
                          {user.name || 'Unnamed'}
                        </span>
                        {isSelf && (
                          <span className="ml-2 text-3xs text-text-muted bg-white/[0.06] px-1.5 py-0.5 rounded">
                            you
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-text-muted mt-0.5">{user.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative inline-block">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                          disabled={isSelf || isUpdating}
                          className="appearance-none bg-dark-elevated border border-border-default rounded px-2.5 py-1 pr-7 text-xs text-text-primary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:border-border-emphasis focus:outline-none focus:ring-1 focus:ring-brand-primary/40 transition-colors"
                        >
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                        {isUpdating ? (
                          <Loader2 className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-text-muted pointer-events-none" />
                        ) : (
                          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {formatDate(user.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
