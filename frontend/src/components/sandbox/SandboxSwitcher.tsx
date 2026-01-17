import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  GitBranch,
  Plus,
  RefreshCw,
  Trash2,
  Archive,
  GitPullRequest,
  Check,
  Server,
  Box,
} from 'lucide-react';
import { useSandboxStore, type ActiveEnvironment } from '@/store/sandboxStore';
import { CreateSandboxModal } from './CreateSandboxModal';
import type { Sandbox } from '@/api/sandbox';

interface SandboxSwitcherProps {
  projectId: string;
  onNavigateToPRs?: () => void;
}

export const SandboxSwitcher: React.FC<SandboxSwitcherProps> = ({
  projectId,
  onNavigateToPRs,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    activeEnvironment,
    setActiveEnvironment,
    getActiveEnvironmentLabel,
    sandboxes,
    fetchSandboxes,
    syncSandbox,
    deleteSandbox,
    archiveSandbox,
    syncInProgress,
    pullRequests,
    fetchPullRequests,
  } = useSandboxStore();

  // Fetch sandboxes and PRs when project changes
  useEffect(() => {
    if (projectId) {
      fetchSandboxes(projectId);
      fetchPullRequests(projectId);
    }
  }, [projectId, fetchSandboxes, fetchPullRequests]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeSandboxes = sandboxes.filter(s => s.status === 'active');
  const openPRCount = pullRequests.filter(pr => pr.status === 'open' || pr.status === 'draft').length;

  const isActiveSandbox = typeof activeEnvironment === 'object' && 'sandboxId' in activeEnvironment;
  const currentSandboxId = isActiveSandbox ? activeEnvironment.sandboxId : null;

  const handleEnvironmentSelect = (env: ActiveEnvironment) => {
    setActiveEnvironment(env);
    setIsOpen(false);
  };

  const handleSyncSandbox = async (e: React.MouseEvent, sandbox: Sandbox) => {
    e.stopPropagation();
    try {
      await syncSandbox(sandbox.id);
    } catch (error) {
      console.error('Failed to sync sandbox:', error);
    }
  };

  const handleDeleteSandbox = async (e: React.MouseEvent, sandbox: Sandbox) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${sandbox.name}"?`)) {
      try {
        await deleteSandbox(sandbox.id);
      } catch (error) {
        console.error('Failed to delete sandbox:', error);
      }
    }
  };

  const handleArchiveSandbox = async (e: React.MouseEvent, sandbox: Sandbox) => {
    e.stopPropagation();
    try {
      await archiveSandbox(sandbox.id);
    } catch (error) {
      console.error('Failed to archive sandbox:', error);
    }
  };

  const getEnvironmentIcon = () => {
    if (activeEnvironment === 'master') return <Server className="w-4 h-4" />;
    if (activeEnvironment === 'dev') return <GitBranch className="w-4 h-4" />;
    return <Box className="w-4 h-4" />;
  };

  const getEnvironmentColor = () => {
    if (activeEnvironment === 'master') return 'text-green-400';
    if (activeEnvironment === 'dev') return 'text-blue-400';
    return 'text-purple-400';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-1.5
          bg-dark-elevated border border-border-default rounded-md
          hover:bg-dark-card transition-colors
          text-sm font-medium ${getEnvironmentColor()}
        `}
      >
        {getEnvironmentIcon()}
        <span className="max-w-32 truncate">{getActiveEnvironmentLabel()}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-dark-card border border-border-default rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Main branches section */}
          <div className="p-2 border-b border-border-default">
            <div className="text-xs font-medium text-text-muted uppercase tracking-wider px-2 py-1">
              Branches
            </div>

            {/* Master */}
            <button
              onClick={() => handleEnvironmentSelect('master')}
              className={`
                w-full flex items-center gap-3 px-2 py-2 rounded-md transition-colors
                ${activeEnvironment === 'master' ? 'bg-green-500/10 text-green-400' : 'hover:bg-dark-elevated text-text-primary'}
              `}
            >
              <Server className="w-4 h-4 text-green-400" />
              <div className="flex-1 text-left">
                <div className="font-medium">Production</div>
                <div className="text-xs text-text-muted">Stable, tested code</div>
              </div>
              {activeEnvironment === 'master' && <Check className="w-4 h-4" />}
            </button>

            {/* Dev */}
            <button
              onClick={() => handleEnvironmentSelect('dev')}
              className={`
                w-full flex items-center gap-3 px-2 py-2 rounded-md transition-colors
                ${activeEnvironment === 'dev' ? 'bg-blue-500/10 text-blue-400' : 'hover:bg-dark-elevated text-text-primary'}
              `}
            >
              <GitBranch className="w-4 h-4 text-blue-400" />
              <div className="flex-1 text-left">
                <div className="font-medium">Development</div>
                <div className="text-xs text-text-muted">Integration branch</div>
              </div>
              {activeEnvironment === 'dev' && <Check className="w-4 h-4" />}
            </button>
          </div>

          {/* Sandboxes section */}
          <div className="p-2 border-b border-border-default max-h-64 overflow-y-auto">
            <div className="flex items-center justify-between px-2 py-1">
              <div className="text-xs font-medium text-text-muted uppercase tracking-wider">
                My Sandboxes
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowCreateModal(true);
                }}
                className="p-1 text-text-muted hover:text-accent-blue rounded transition-colors"
                title="Create new sandbox"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {activeSandboxes.length === 0 ? (
              <div className="px-2 py-3 text-sm text-text-muted text-center">
                No sandboxes yet. Create one to start working.
              </div>
            ) : (
              activeSandboxes.map((sandbox) => (
                <div
                  key={sandbox.id}
                  onClick={() => handleEnvironmentSelect({ sandboxId: sandbox.id })}
                  className={`
                    w-full flex items-center gap-3 px-2 py-2 rounded-md transition-colors cursor-pointer group
                    ${currentSandboxId === sandbox.id ? 'bg-purple-500/10 text-purple-400' : 'hover:bg-dark-elevated text-text-primary'}
                  `}
                >
                  <Box className="w-4 h-4 text-purple-400" />
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-medium truncate">{sandbox.name}</div>
                    <div className="text-xs text-text-muted">
                      from {sandbox.sourceBranch} · {sandbox.pullRequestCount} PR{sandbox.pullRequestCount !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Sandbox actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleSyncSandbox(e, sandbox)}
                      className="p-1 text-text-muted hover:text-accent-blue rounded transition-colors"
                      title="Sync with source branch"
                      disabled={syncInProgress}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncInProgress ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => handleArchiveSandbox(e, sandbox)}
                      className="p-1 text-text-muted hover:text-yellow-400 rounded transition-colors"
                      title="Archive sandbox"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteSandbox(e, sandbox)}
                      className="p-1 text-text-muted hover:text-status-danger rounded transition-colors"
                      title="Delete sandbox"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {currentSandboxId === sandbox.id && <Check className="w-4 h-4" />}
                </div>
              ))
            )}
          </div>

          {/* Pull Requests link */}
          {onNavigateToPRs && (
            <div className="p-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onNavigateToPRs();
                }}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-dark-elevated transition-colors text-text-primary"
              >
                <GitPullRequest className="w-4 h-4 text-orange-400" />
                <div className="flex-1 text-left">
                  <div className="font-medium">Pull Requests</div>
                  <div className="text-xs text-text-muted">
                    {openPRCount > 0 ? `${openPRCount} open` : 'View all PRs'}
                  </div>
                </div>
                {openPRCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-orange-500/20 text-orange-400 rounded-full">
                    {openPRCount}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Sandbox Modal */}
      <CreateSandboxModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        projectId={projectId}
      />
    </div>
  );
};

export default SandboxSwitcher;
