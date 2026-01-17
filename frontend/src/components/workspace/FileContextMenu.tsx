import React, { useEffect, useRef } from 'react';
import { GitCompare, Copy, Trash2, Edit3, FileText } from 'lucide-react';

export interface FileContextMenuProps {
  x: number;
  y: number;
  filePath: string;
  fileName: string;
  onClose: () => void;
  onCompareWith: (filePath: string) => void;
  onRename?: (filePath: string) => void;
  onDelete?: (filePath: string) => void;
  onCopyPath?: (filePath: string) => void;
}

export function FileContextMenu({
  x,
  y,
  filePath,
  fileName,
  onClose,
  onCompareWith,
  onRename,
  onDelete,
  onCopyPath,
}: FileContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to keep menu in viewport
  const adjustedStyle: React.CSSProperties = {
    position: 'fixed',
    left: x,
    top: y,
    zIndex: 1000,
  };

  // Check if menu would overflow viewport and adjust
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (rect.right > viewportWidth) {
        menuRef.current.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > viewportHeight) {
        menuRef.current.style.top = `${y - rect.height}px`;
      }
    }
  }, [x, y]);

  const menuItems = [
    {
      icon: GitCompare,
      label: 'Compare With...',
      shortcut: 'Ctrl+D',
      onClick: () => {
        onCompareWith(filePath);
        onClose();
      },
    },
    { type: 'divider' as const },
    {
      icon: Copy,
      label: 'Copy Path',
      onClick: () => {
        navigator.clipboard.writeText(filePath);
        onCopyPath?.(filePath);
        onClose();
      },
    },
    ...(onRename ? [{
      icon: Edit3,
      label: 'Rename',
      shortcut: 'F2',
      onClick: () => {
        onRename(filePath);
        onClose();
      },
    }] : []),
    ...(onDelete ? [{
      icon: Trash2,
      label: 'Delete',
      shortcut: 'Delete',
      className: 'text-[#f85149] hover:bg-[#3d1f1f]',
      onClick: () => {
        onDelete(filePath);
        onClose();
      },
    }] : []),
  ];

  return (
    <div
      ref={menuRef}
      style={adjustedStyle}
      className="bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl py-1 min-w-[200px]"
    >
      {/* File name header */}
      <div className="px-3 py-1.5 text-xs text-[#8b949e] border-b border-[#30363d] flex items-center gap-2">
        <FileText className="w-3 h-3" />
        <span className="truncate">{fileName}</span>
      </div>

      {/* Menu items */}
      {menuItems.map((item, index) => {
        if (item.type === 'divider') {
          return <div key={index} className="border-t border-[#30363d] my-1" />;
        }

        const Icon = item.icon;

        return (
          <button
            key={index}
            onClick={item.onClick}
            className={`w-full flex items-center gap-3 px-3 py-1.5 text-sm text-[#c9d1d9] hover:bg-[#21262d] transition-colors ${(item as any).className || ''}`}
          >
            <Icon className="w-4 h-4" />
            <span className="flex-1 text-left">{item.label}</span>
            {(item as any).shortcut && (
              <span className="text-xs text-[#484f58]">{(item as any).shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default FileContextMenu;
