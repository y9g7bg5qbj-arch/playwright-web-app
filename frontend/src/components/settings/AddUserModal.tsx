import { useState } from 'react';
import { Modal, Button } from '@/components/ui';
import { usersApi } from '@/api/users';
import { useToastStore } from '@/store/useToastStore';
import type { UserRole } from '@playwright-web-app/shared';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'qa_tester', label: 'QA Tester' },
  { value: 'senior_qa', label: 'Senior QA' },
  { value: 'qa_lead', label: 'QA Lead' },
  { value: 'admin', label: 'Admin' },
  { value: 'viewer', label: 'Viewer' },
];

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

export function AddUserModal({ isOpen, onClose, onUserCreated }: AddUserModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('qa_tester');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToastStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await usersApi.createUser({ name, email, role });
      addToast({ message: `User ${name} created. Welcome email sent to ${email}.`, variant: 'success', duration: 6000 });
      setName('');
      setEmail('');
      setRole('qa_tester');
      onUserCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setName('');
    setEmail('');
    setRole('qa_tester');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add User" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-status-danger/10 border border-status-danger/30 rounded-lg p-3 text-sm text-status-danger">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-dark-bg border border-border-default rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-brand-primary/40 focus:border-brand-primary"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-dark-bg border border-border-default rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-brand-primary/40 focus:border-brand-primary"
            placeholder="john@company.com"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full px-3 py-2 bg-dark-bg border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/40 focus:border-brand-primary"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSubmitting}>
            Create & Send Welcome Email
          </Button>
        </div>
      </form>
    </Modal>
  );
}
