/**
 * UserManagementPage — Full-screen canvas page for managing users.
 *
 * Uses the app's design system: PanelHeader, Card, Badge, Button, SearchInput.
 * Matches the visual language of ExecutionReportView and TestDataPage.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usersApi } from '@/api/users';
import { useToastStore } from '@/store/useToastStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Input';
import { PanelHeader } from '@/components/ui/Panel';
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  UserPlus,
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Eye,
  Mail,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import type { User, UserRole } from '@playwright-web-app/shared';

// ─── Constants ────────────────────────────────────────────────

type BadgeVariant = 'red' | 'yellow' | 'blue' | 'green' | 'default';

const ROLES: { value: UserRole; label: string; badgeVariant: BadgeVariant; icon: React.FC<any> }[] = [
  { value: 'admin',     label: 'Admin',     badgeVariant: 'red',     icon: ShieldAlert },
  { value: 'qa_lead',   label: 'QA Lead',   badgeVariant: 'yellow',  icon: ShieldCheck },
  { value: 'senior_qa', label: 'Senior QA', badgeVariant: 'blue',    icon: Shield },
  { value: 'qa_tester', label: 'QA Tester', badgeVariant: 'green',   icon: Users },
  { value: 'viewer',    label: 'Viewer',    badgeVariant: 'default', icon: Eye },
];

const ROLE_META = Object.fromEntries(ROLES.map(r => [r.value, r]));

type SortField = 'name' | 'email' | 'role' | 'createdAt';
type SortDir = 'asc' | 'desc';

// ─── Props ────────────────────────────────────────────────────

interface UserManagementPageProps {
  currentUserId: string;
  onAddUser?: () => void;
}

// ─── Component ────────────────────────────────────────────────

export function UserManagementPage({ currentUserId, onAddUser }: UserManagementPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const { addToast } = useToastStore();

  // ─── Data fetching ──────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
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

  // ─── Role update ────────────────────────────────────────────

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

  // ─── Filtering, sorting, searching ──────────────────────────

  const filteredUsers = useMemo(() => {
    let result = [...users];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(u =>
        (u.name || '').toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    }

    if (roleFilter !== 'all') {
      result = result.filter(u => u.role === roleFilter);
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = (a.name || '').localeCompare(b.name || '');
          break;
        case 'email':
          cmp = a.email.localeCompare(b.email);
          break;
        case 'role': {
          const roleOrder: Record<string, number> = { admin: 0, qa_lead: 1, senior_qa: 2, qa_tester: 3, viewer: 4 };
          cmp = (roleOrder[a.role] ?? 5) - (roleOrder[b.role] ?? 5);
          break;
        }
        case 'createdAt':
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [users, search, roleFilter, sortField, sortDir]);

  // ─── Stats ──────────────────────────────────────────────────

  const stats = useMemo(() => {
    const recentlyJoined = users.filter(u => {
      const d = new Date(u.createdAt);
      const now = new Date();
      return (now.getTime() - d.getTime()) < 30 * 24 * 60 * 60 * 1000;
    }).length;
    const passwordSet = users.filter(u => u.passwordSetAt).length;
    return { total: users.length, recentlyJoined, passwordSet };
  }, [users]);

  // ─── Helpers ────────────────────────────────────────────────

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="opacity-0 group-hover/th:opacity-40 transition-opacity" />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-brand-primary" />
      : <ChevronDown size={12} className="text-brand-primary" />;
  };

  // ─── Loading state ──────────────────────────────────────────

  if (loading) {
    return (
      <div className="h-full min-h-0 flex flex-col bg-dark-canvas text-text-primary">
        <PanelHeader
          className="h-10 px-3"
          icon={<Users className="h-4 w-4 text-status-info" />}
          title="User Management"
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-6 h-6 animate-spin text-text-muted mx-auto mb-2" />
            <p className="text-xs text-text-muted">Loading users...</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Error state ────────────────────────────────────────────

  if (error) {
    return (
      <div className="h-full min-h-0 flex flex-col bg-dark-canvas text-text-primary">
        <PanelHeader
          className="h-10 px-3"
          icon={<Users className="h-4 w-4 text-status-info" />}
          title="User Management"
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <div className="w-10 h-10 rounded-lg bg-status-danger/12 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-5 h-5 text-status-danger" />
            </div>
            <h3 className="text-sm font-medium text-text-primary mb-1">Failed to load users</h3>
            <p className="text-xs text-text-muted mb-4">{error}</p>
            <Button variant="primary" size="md" onClick={fetchUsers}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="h-full min-h-0 flex flex-col bg-dark-canvas text-text-primary">

      {/* ─── Panel Header (matches ExecutionReportView) ──── */}
      <PanelHeader
        className="h-10 px-3"
        icon={<Users className="h-4 w-4 text-status-info" />}
        title="User Management"
        meta={
          <span className="text-xs font-medium text-text-secondary">
            {stats.total} user{stats.total !== 1 ? 's' : ''}
            {stats.recentlyJoined > 0 ? ` \u00B7 ${stats.recentlyJoined} new this month` : ''}
          </span>
        }
        actions={
          onAddUser ? (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<UserPlus className="w-3.5 h-3.5" />}
              onClick={onAddUser}
            >
              Add User
            </Button>
          ) : undefined
        }
      />

      {/* ─── Stats Cards ────────────────────────────────── */}
      <div className="shrink-0 px-3 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card padding="sm" hover>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-text-secondary">Total Users</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{stats.total}</p>
            </div>
            <div className="p-2 rounded-lg bg-accent-blue/20 text-accent-blue">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card padding="sm" hover>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-text-secondary">Active</p>
              <p className="text-2xl font-bold text-status-success mt-1">{stats.passwordSet}</p>
            </div>
            <div className="p-2 rounded-lg bg-status-success/12 text-status-success">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card padding="sm" hover>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-text-secondary">Pending</p>
              <p className="text-2xl font-bold text-status-warning mt-1">{stats.total - stats.passwordSet}</p>
            </div>
            <div className="p-2 rounded-lg bg-status-warning/12 text-status-warning">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card padding="sm" hover>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-text-secondary">New (30d)</p>
              <p className="text-2xl font-bold text-status-info mt-1">{stats.recentlyJoined}</p>
            </div>
            <div className="p-2 rounded-lg bg-status-info/12 text-status-info">
              <UserPlus className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* ─── Toolbar: Search + Filter ──────────────────── */}
      <div className="shrink-0 px-3 py-2 flex items-center gap-3 border-b border-border-default">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
          placeholder="Search by name or email..."
          className="max-w-sm"
        />

        {/* Role filter */}
        <div className="relative">
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value as UserRole | 'all')}
            className="appearance-none bg-dark-canvas border border-border-default rounded px-3 py-1.5 pr-8 text-sm text-text-primary cursor-pointer hover:border-border-emphasis focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 transition-colors duration-fast"
          >
            <option value="all">All Roles</option>
            {ROLES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        </div>

        {/* Result count */}
        <p className="text-xs text-text-muted ml-auto">
          {filteredUsers.length === users.length
            ? `${users.length} users`
            : `${filteredUsers.length} of ${users.length}`}
        </p>
      </div>

      {/* ─── Table ───────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-dark-card border-b border-border-default z-10">
            <tr className="text-left text-xs uppercase tracking-wide text-text-muted">
              <th
                className="py-2 px-4 font-medium cursor-pointer group/th select-none"
                onClick={() => handleSort('name')}
              >
                <span className="flex items-center gap-1">
                  User <SortIcon field="name" />
                </span>
              </th>
              <th
                className="py-2 px-4 font-medium cursor-pointer group/th select-none"
                onClick={() => handleSort('role')}
              >
                <span className="flex items-center gap-1">
                  Role <SortIcon field="role" />
                </span>
              </th>
              <th className="py-2 px-4 font-medium">
                Status
              </th>
              <th
                className="py-2 px-4 font-medium cursor-pointer group/th select-none"
                onClick={() => handleSort('createdAt')}
              >
                <span className="flex items-center gap-1">
                  Joined <SortIcon field="createdAt" />
                </span>
              </th>
              <th className="py-2 px-4 font-medium">
                Email
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-dark-elevated flex items-center justify-center text-text-muted">
                      <Users className="w-5 h-5" />
                    </div>
                    <p className="text-sm text-text-secondary">
                      {search || roleFilter !== 'all'
                        ? 'No users match the current filters'
                        : 'No users yet'}
                    </p>
                    <p className="text-xs text-text-muted">
                      {search || roleFilter !== 'all'
                        ? 'Try adjusting your search or filter criteria.'
                        : 'Add your first team member to get started.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                const isSelf = user.id === currentUserId;
                const isUpdating = updatingUserId === user.id;
                const roleMeta = ROLE_META[user.role] || ROLE_META.viewer;
                const hasPassword = Boolean(user.passwordSetAt);

                return (
                  <tr
                    key={user.id}
                    className="hover:bg-dark-card/30 transition-colors"
                  >
                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-brand-primary/15 flex items-center justify-center text-brand-secondary text-xxs font-bold shrink-0">
                          {(user.name || user.email)[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm text-text-primary font-medium truncate">
                              {user.name || 'Unnamed'}
                            </span>
                            {isSelf && (
                              <Badge variant="blue" size="sm">you</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      {isSelf ? (
                        <Badge variant={roleMeta.badgeVariant} size="md" dot>
                          {roleMeta.label}
                        </Badge>
                      ) : (
                        <div className="relative inline-block">
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                            disabled={isUpdating}
                            className="appearance-none bg-dark-elevated border border-border-default rounded px-2.5 py-1 pr-7 text-xs text-text-primary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:border-border-emphasis focus:outline-none focus:ring-1 focus:ring-brand-primary/40 transition-colors duration-fast"
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
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {hasPassword ? (
                        <Badge variant="green" size="sm" dot>Active</Badge>
                      ) : (
                        <Badge variant="yellow" size="sm" dot>Pending</Badge>
                      )}
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {formatDate(user.createdAt)}
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                        <Mail size={12} className="shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
