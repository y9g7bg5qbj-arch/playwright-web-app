import React, { useEffect, useRef } from 'react';
import { Play, Bug } from 'lucide-react';

export interface GutterContextMenuProps {
  x: number;
  y: number;
  itemType: 'scenario' | 'feature';
  itemName: string;
  onRun: () => void;
  onDebug: () => void;
  onClose: () => void;
}

export function GutterContextMenu({
  x,
  y,
  itemType,
  itemName,
  onRun,
  onDebug,
  onClose,
}: GutterContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Defer the click-outside listener by one frame to avoid racing
  // with the originating mousedown that opened this menu
  useEffect(() => {
    let mousedownHandler: ((e: MouseEvent) => void) | null = null;
    let keydownHandler: ((e: KeyboardEvent) => void) | null = null;

    const timerId = requestAnimationFrame(() => {
      mousedownHandler = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          onCloseRef.current();
        }
      };

      keydownHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onCloseRef.current();
        }
      };

      document.addEventListener('mousedown', mousedownHandler);
      document.addEventListener('keydown', keydownHandler);
    });

    return () => {
      cancelAnimationFrame(timerId);
      if (mousedownHandler) document.removeEventListener('mousedown', mousedownHandler);
      if (keydownHandler) document.removeEventListener('keydown', keydownHandler);
    };
  }, []);

  // Adjust position to keep menu in viewport
  const adjustedStyle: React.CSSProperties = {
    position: 'fixed',
    left: x,
    top: y,
    zIndex: 1000,
  };

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

  const label = itemType === 'feature' ? 'Feature' : 'Scenario';
  const truncatedName = itemName.length > 30 ? itemName.substring(0, 30) + '...' : itemName;

  return (
    <div
      ref={menuRef}
      style={adjustedStyle}
      className="bg-dark-card border border-border-default rounded-lg shadow-xl py-1 min-w-[220px]"
    >
      {/* Header */}
      <div className="px-3 py-1.5 text-xs text-text-secondary border-b border-border-default truncate">
        {label}: {truncatedName}
      </div>

      {/* Run */}
      <button
        onClick={onRun}
        className="w-full flex items-center gap-3 px-3 py-1.5 text-sm text-text-primary hover:bg-dark-elevated transition-colors"
      >
        <Play className="w-4 h-4 text-status-success" />
        <span className="flex-1 text-left">Run '{truncatedName}'</span>
        <span className="text-xs text-text-muted">Ctrl+Shift+F10</span>
      </button>

      {/* Debug */}
      <button
        onClick={onDebug}
        className="w-full flex items-center gap-3 px-3 py-1.5 text-sm text-text-primary hover:bg-dark-elevated transition-colors"
      >
        <Bug className="w-4 h-4 text-status-success" />
        <span className="flex-1 text-left">Debug '{truncatedName}'</span>
        <span className="text-xs text-text-muted">Ctrl+Shift+F9</span>
      </button>
    </div>
  );
}
