import { useState } from 'react';
import { Modal, Button } from '@/components/ui';
import { authApi } from '@/api/auth';
import { usersApi } from '@/api/users';
import { useToastStore } from '@/store/useToastStore';
import { Settings, FolderPlus, UserPlus, ChevronRight, Check } from 'lucide-react';
import type { UserRole } from '@playwright-web-app/shared';

interface AdminWelcomeWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAISettings: () => void;
  onCreateApplication: (name: string) => Promise<void>;
}

const STEPS = [
  { id: 'ai', title: 'Configure AI Provider', icon: Settings, description: 'Set up your AI provider to enable test generation.' },
  { id: 'app', title: 'Create Your First Application', icon: FolderPlus, description: 'Create an application to organize your tests.' },
  { id: 'team', title: 'Add Your Team', icon: UserPlus, description: 'Invite team members to collaborate.' },
] as const;

interface TeamMember {
  name: string;
  email: string;
  role: UserRole;
}

export function AdminWelcomeWizard({ isOpen, onClose, onOpenAISettings, onCreateApplication }: AdminWelcomeWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [appName, setAppName] = useState('');
  const [isCreatingApp, setIsCreatingApp] = useState(false);
  const [appCreated, setAppCreated] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    { name: '', email: '', role: 'qa_tester' },
  ]);
  const [isInviting, setIsInviting] = useState(false);
  const { addToast } = useToastStore();

  const handleComplete = async () => {
    try {
      await authApi.completeOnboarding();
    } catch {
      // Non-critical — don't block the user
    }
    onClose();
  };

  const handleSkip = async () => {
    await handleComplete();
  };

  const handleCreateApp = async () => {
    if (!appName.trim()) return;
    setIsCreatingApp(true);
    try {
      await onCreateApplication(appName.trim());
      setAppCreated(true);
      addToast({ message: `Application "${appName}" created!`, variant: 'success' });
    } catch (err: any) {
      addToast({ message: err.message || 'Failed to create application', variant: 'error' });
    } finally {
      setIsCreatingApp(false);
    }
  };

  const handleInviteTeam = async () => {
    const validMembers = teamMembers.filter(m => m.name.trim() && m.email.trim());
    if (validMembers.length === 0) {
      await handleComplete();
      return;
    }

    setIsInviting(true);
    let successCount = 0;

    for (const member of validMembers) {
      try {
        await usersApi.createUser({ name: member.name, email: member.email, role: member.role });
        successCount++;
      } catch (err: any) {
        addToast({ message: `Failed to add ${member.email}: ${err.message}`, variant: 'error' });
      }
    }

    if (successCount > 0) {
      addToast({ message: `${successCount} team member${successCount > 1 ? 's' : ''} invited!`, variant: 'success' });
    }

    setIsInviting(false);
    await handleComplete();
  };

  const updateTeamMember = (index: number, field: keyof TeamMember, value: string) => {
    setTeamMembers(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };

  const addTeamMemberRow = () => {
    if (teamMembers.length < 5) {
      setTeamMembers(prev => [...prev, { name: '', email: '', role: 'qa_tester' as UserRole }]);
    }
  };

  const removeTeamMemberRow = (index: number) => {
    if (teamMembers.length > 1) {
      setTeamMembers(prev => prev.filter((_, i) => i !== index));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleSkip} title="Welcome to Vero IDE" size="lg" closeOnOverlayClick={false}>
      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              i < currentStep ? 'bg-status-success text-white' :
              i === currentStep ? 'bg-brand-primary text-white' :
              'bg-dark-bg text-text-muted border border-border-default'
            }`}>
              {i < currentStep ? <Check size={14} /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-px ${i < currentStep ? 'bg-status-success' : 'bg-border-default'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: AI Settings */}
      {currentStep === 0 && (
        <div className="space-y-4">
          <div className="text-center">
            <Settings className="mx-auto mb-3 text-brand-primary" size={32} />
            <h3 className="text-lg font-semibold text-text-primary">Configure AI Provider</h3>
            <p className="text-sm text-text-muted mt-1">Set up an AI provider to enable intelligent test generation.</p>
          </div>
          <div className="flex justify-center gap-3 pt-4">
            <Button variant="ghost" onClick={() => setCurrentStep(1)}>
              Skip for now
            </Button>
            <Button
              variant="primary"
              rightIcon={<ChevronRight size={14} />}
              onClick={() => {
                onOpenAISettings();
                setCurrentStep(1);
              }}
            >
              Open AI Settings
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Create Application */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div className="text-center">
            <FolderPlus className="mx-auto mb-3 text-brand-primary" size={32} />
            <h3 className="text-lg font-semibold text-text-primary">Create Your First Application</h3>
            <p className="text-sm text-text-muted mt-1">An application organizes your test files and configurations.</p>
          </div>

          {appCreated ? (
            <div className="flex items-center justify-center gap-2 py-4 text-status-success">
              <Check size={18} />
              <span className="text-sm font-medium">Application "{appName}" created!</span>
            </div>
          ) : (
            <div className="max-w-sm mx-auto">
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="e.g., My Web App"
                className="w-full px-3 py-2 bg-dark-bg border border-border-default rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-brand-primary/40"
              />
            </div>
          )}

          <div className="flex justify-center gap-3 pt-2">
            <Button variant="ghost" onClick={() => setCurrentStep(2)}>
              {appCreated ? 'Next' : 'Skip'}
            </Button>
            {!appCreated && (
              <Button
                variant="primary"
                isLoading={isCreatingApp}
                disabled={!appName.trim()}
                onClick={handleCreateApp}
              >
                Create Application
              </Button>
            )}
            {appCreated && (
              <Button variant="primary" rightIcon={<ChevronRight size={14} />} onClick={() => setCurrentStep(2)}>
                Continue
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Add Team */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="text-center">
            <UserPlus className="mx-auto mb-3 text-brand-primary" size={32} />
            <h3 className="text-lg font-semibold text-text-primary">Add Your Team</h3>
            <p className="text-sm text-text-muted mt-1">Invite team members — they'll receive a welcome email.</p>
          </div>

          <div className="space-y-3 max-w-lg mx-auto">
            {teamMembers.map((member, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={member.name}
                  onChange={(e) => updateTeamMember(i, 'name', e.target.value)}
                  placeholder="Name"
                  className="flex-1 px-2 py-1.5 bg-dark-bg border border-border-default rounded text-xs text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-brand-primary/40"
                />
                <input
                  type="email"
                  value={member.email}
                  onChange={(e) => updateTeamMember(i, 'email', e.target.value)}
                  placeholder="Email"
                  className="flex-1 px-2 py-1.5 bg-dark-bg border border-border-default rounded text-xs text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-brand-primary/40"
                />
                <select
                  value={member.role}
                  onChange={(e) => updateTeamMember(i, 'role', e.target.value)}
                  className="px-2 py-1.5 bg-dark-bg border border-border-default rounded text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/40"
                >
                  <option value="qa_tester">QA Tester</option>
                  <option value="senior_qa">Senior QA</option>
                  <option value="qa_lead">QA Lead</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
                {teamMembers.length > 1 && (
                  <button
                    onClick={() => removeTeamMemberRow(i)}
                    className="text-text-muted hover:text-status-danger text-xs px-1"
                  >
                    x
                  </button>
                )}
              </div>
            ))}
            {teamMembers.length < 5 && (
              <button
                onClick={addTeamMemberRow}
                className="text-xs text-brand-primary hover:text-brand-hover"
              >
                + Add another
              </button>
            )}
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <Button variant="ghost" onClick={handleSkip}>
              Skip & Finish
            </Button>
            <Button variant="primary" isLoading={isInviting} onClick={handleInviteTeam}>
              Invite & Get Started
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
