import { useEffect, useRef } from 'react';
import {
  Play,
  ChevronDown,
  Settings,
  Check,
  Monitor,
  Github,
  Clock,
} from 'lucide-react';
import { useRunConfigStore, initializeDefaultConfig, type RunConfigSummary } from '@/store/runConfigStore';

interface RunConfigDropdownProps {
  onRun: (configId?: string) => void;
  disabled?: boolean;
  className?: string;
}

export function RunConfigDropdown({
  onRun,
  disabled = false,
  className = '',
}: RunConfigDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    recentConfigs,
    activeConfigId,
    isDropdownOpen,
    setDropdownOpen,
    setModalOpen,
    setActiveConfig,
    markConfigUsed,
  } = useRunConfigStore();

  // Initialize default config on mount
  useEffect(() => {
    initializeDefaultConfig();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen, setDropdownOpen]);

  // Handle run with active config
  const handleRun = () => {
    if (activeConfigId) {
      markConfigUsed(activeConfigId);
    }
    onRun(activeConfigId || undefined);
  };

  // Handle run with specific config
  const handleRunWithConfig = (configId: string) => {
    setActiveConfig(configId);
    markConfigUsed(configId);
    setDropdownOpen(false);
    onRun(configId);
  };

  // Open configuration modal
  const handleOpenSettings = () => {
    setDropdownOpen(false);
    setModalOpen(true);
  };

  // Get icon for config target
  const getTargetIcon = (target: 'local' | 'github') => {
    return target === 'github' ? (
      <Github className="w-3.5 h-3.5" />
    ) : (
      <Monitor className="w-3.5 h-3.5" />
    );
  };

  // Format last used time
  const formatLastUsed = (lastUsedAt?: string) => {
    if (!lastUsedAt) return '';
    const date = new Date(lastUsedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div ref={dropdownRef} className={`relative inline-flex ${className}`}>
      {/* Split Button: Run + Dropdown Arrow */}
      <div className="flex items-center">
        {/* Run Button */}
        <button
          onClick={handleRun}
          disabled={disabled}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-l
            ${disabled
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
            }
            transition-colors font-medium text-sm
          `}
          title="Run (F5)"
        >
          <Play className="w-4 h-4" />
          <span>Run</span>
        </button>

        {/* Dropdown Arrow */}
        <button
          onClick={() => setDropdownOpen(!isDropdownOpen)}
          disabled={disabled}
          className={`
            flex items-center px-1.5 py-1.5 rounded-r border-l
            ${disabled
              ? 'bg-gray-700 text-gray-500 border-gray-600 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white border-green-700'
            }
            transition-colors
          `}
          title="Run Configuration"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-[#1c2128] border border-[#30363d] rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Recent Configurations Section */}
          {recentConfigs.length > 0 && (
            <>
              <div className="px-3 py-2 border-b border-[#30363d]">
                <div className="flex items-center gap-2 text-xs font-medium text-[#8b949e] uppercase tracking-wider">
                  <Clock className="w-3 h-3" />
                  Recent
                </div>
              </div>
              <div className="py-1">
                {recentConfigs.map((config: RunConfigSummary) => (
                  <button
                    key={config.id}
                    onClick={() => handleRunWithConfig(config.id)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 text-left
                      hover:bg-[#30363d]/50 transition-colors
                      ${config.id === activeConfigId ? 'bg-[#30363d]/30' : ''}
                    `}
                  >
                    {/* Checkmark for active config */}
                    <span className="w-4 flex justify-center">
                      {config.id === activeConfigId && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                    </span>

                    {/* Target icon */}
                    <span className="text-[#8b949e]">
                      {getTargetIcon(config.target)}
                    </span>

                    {/* Config details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white truncate">
                          {config.name}
                        </span>
                        {config.lastUsedAt && (
                          <span className="text-xs text-[#6e7681] ml-2">
                            {formatLastUsed(config.lastUsedAt)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#6e7681]">
                        {config.target === 'github' ? 'GitHub Actions' : 'Local'} · {config.browser} · {config.workers} worker{config.workers !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Empty State */}
          {recentConfigs.length === 0 && (
            <div className="px-3 py-4 text-center">
              <p className="text-sm text-[#8b949e]">No recent configurations</p>
              <p className="text-xs text-[#6e7681] mt-1">
                Run a test to see your configurations here
              </p>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-[#30363d]" />

          {/* Configuration Settings */}
          <button
            onClick={handleOpenSettings}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[#30363d]/50 transition-colors"
          >
            <span className="w-4 flex justify-center">
              <Settings className="w-4 h-4 text-[#8b949e]" />
            </span>
            <span className="text-sm text-[#c9d1d9]">
              Configuration Settings...
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

// Export a compact version for the debug toolbar
export function RunButtonWithDropdown({
  onRun,
  disabled = false,
}: {
  onRun: (configId?: string) => void;
  disabled?: boolean;
}) {
  return (
    <RunConfigDropdown
      onRun={onRun}
      disabled={disabled}
    />
  );
}
