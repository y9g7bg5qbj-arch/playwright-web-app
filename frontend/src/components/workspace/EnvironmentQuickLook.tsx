/**
 * EnvironmentQuickLook - Postman-style quick look popover
 *
 * Shows the current environment variables at a glance.
 * Triggered by the eye icon next to the environment selector.
 */

import { useState, useRef, useEffect } from 'react';
import { useEnvironmentStore } from '@/store/environmentStore';

interface EnvironmentQuickLookProps {
  onOpenManager: () => void;
}

export function EnvironmentQuickLook({ onOpenManager }: EnvironmentQuickLookProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { getActiveEnvironment } = useEnvironmentStore();

  const activeEnv = getActiveEnvironment();

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative">
      {/* Eye Icon Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-md transition-colors ${
          isOpen
            ? 'bg-[#30363d] text-white'
            : 'hover:bg-[#21262d] text-[#8b949e] hover:text-white'
        }`}
        title="Environment Quick Look"
      >
        <span className="material-symbols-outlined text-[18px]">
          {isOpen ? 'visibility' : 'visibility'}
        </span>
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full mt-2 w-80 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-[#8b949e]">
                {activeEnv ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              <span className="text-white font-medium text-sm">
                {activeEnv?.name || 'No Environment'}
              </span>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenManager();
              }}
              className="p-1 rounded hover:bg-[#30363d] text-[#8b949e] hover:text-white transition-colors"
              title="Edit Environment"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
            </button>
          </div>

          {/* Variables List */}
          {activeEnv && activeEnv.variables.length > 0 ? (
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full">
                <tbody>
                  {activeEnv.variables.map((variable) => (
                    <tr
                      key={variable.id}
                      className="border-b border-[#21262d] last:border-b-0 hover:bg-[#21262d]/50"
                    >
                      <td className="px-4 py-2 text-xs font-mono text-[#58a6ff]">
                        {variable.key}
                      </td>
                      <td className="px-4 py-2 text-xs font-mono text-[#8b949e] text-right">
                        {variable.isSecret ? (
                          <span className="text-[#6e7681]">{'••••••••'}</span>
                        ) : (
                          <span className="text-[#c9d1d9] truncate max-w-[150px] inline-block">
                            {variable.value || <span className="text-[#6e7681] italic">empty</span>}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeEnv ? (
            <div className="px-4 py-6 text-center">
              <span className="material-symbols-outlined text-3xl text-[#30363d] mb-2 block">
                data_object
              </span>
              <p className="text-sm text-[#8b949e]">No variables defined</p>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenManager();
                }}
                className="mt-2 text-xs text-[#58a6ff] hover:underline"
              >
                Add variables
              </button>
            </div>
          ) : (
            <div className="px-4 py-6 text-center">
              <span className="material-symbols-outlined text-3xl text-[#30363d] mb-2 block">
                folder_off
              </span>
              <p className="text-sm text-[#8b949e]">No environment selected</p>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenManager();
                }}
                className="mt-2 text-xs text-[#58a6ff] hover:underline"
              >
                Create environment
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-[#30363d] p-2">
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenManager();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left hover:bg-[#21262d] transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] text-[#8b949e]">settings</span>
              <span className="text-sm text-[#c9d1d9]">Manage Environments...</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * EnvironmentSelector - Dropdown to select active environment
 */
interface EnvironmentSelectorProps {
  onOpenManager: () => void;
}

export function EnvironmentSelector({ onOpenManager }: EnvironmentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { environments, activateEnvironment, getActiveEnvironment, isLoading } = useEnvironmentStore();

  const activeEnv = getActiveEnvironment();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelectEnvironment = async (envId: string) => {
    await activateEnvironment(envId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors min-w-[140px] ${
          isOpen
            ? 'bg-[#30363d] text-white'
            : 'bg-[#21262d] border border-[#30363d] hover:bg-[#30363d] text-white'
        }`}
      >
        <span className="material-symbols-outlined text-[16px] text-[#8b949e]">
          {activeEnv ? 'check_circle' : 'radio_button_unchecked'}
        </span>
        <span className="truncate flex-1 text-left">
          {isLoading ? 'Loading...' : activeEnv?.name || 'No Environment'}
        </span>
        <span
          className={`material-symbols-outlined text-[16px] text-[#8b949e] transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          expand_more
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Environments List */}
          {environments.length > 0 ? (
            <div className="max-h-64 overflow-y-auto py-1">
              {environments.map((env) => (
                <button
                  key={env.id}
                  onClick={() => handleSelectEnvironment(env.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-[#21262d] transition-colors ${
                    env.isActive ? 'bg-[#21262d]/50' : ''
                  }`}
                >
                  <span className="w-5 flex justify-center shrink-0">
                    {env.isActive && (
                      <span className="material-symbols-outlined text-[16px] text-[#238636]">
                        check
                      </span>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{env.name}</div>
                    <div className="text-xs text-[#6e7681]">
                      {env.variables.length} variable{env.variables.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-6 text-center">
              <span className="material-symbols-outlined text-3xl text-[#30363d] mb-2 block">
                folder_off
              </span>
              <p className="text-sm text-[#8b949e]">No environments</p>
              <p className="text-xs text-[#6e7681] mt-1">Create one to get started</p>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-[#30363d]" />

          {/* Actions */}
          <div className="p-2">
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenManager();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left hover:bg-[#21262d] transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] text-[#8b949e]">settings</span>
              <span className="text-sm text-[#c9d1d9]">Manage Environments...</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
