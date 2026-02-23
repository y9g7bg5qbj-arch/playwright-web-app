import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { StatementNode } from 'vero-lang';
import { STEP_TYPE_CATEGORIES, createDefaultStatement } from './defaultStatements';

interface AddStepMenuProps {
  onAddStep: (stmt: StatementNode) => void;
}

export function AddStepMenu({ onAddStep }: AddStepMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Calculate position when menu opens
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.top, // popup will grow upward from here
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    if (isOpen) updatePosition();
  }, [isOpen, updatePosition]);

  // Close menu on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target) &&
          buttonRef.current && !buttonRef.current.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  const popup = isOpen && menuPos ? createPortal(
    <div
      ref={menuRef}
      className="bg-dark-card border border-border-default rounded-lg shadow-xl z-[9999] max-h-[400px] overflow-y-auto"
      style={{
        position: 'fixed',
        bottom: `${window.innerHeight - menuPos.top + 4}px`,
        left: `${menuPos.left}px`,
        width: `${menuPos.width}px`,
      }}
    >
      {STEP_TYPE_CATEGORIES.map((cat) => (
        <div key={cat.label}>
          <div className="sticky top-0 px-3 py-1.5 text-4xs font-mono uppercase tracking-widest text-text-muted bg-dark-shell/95 backdrop-blur-sm border-b border-border-default flex items-center gap-1.5">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{cat.icon}</span>
            {cat.label}
          </div>
          {cat.types.map((item) => (
            <button
              key={item.type}
              onClick={() => {
                const stmt = createDefaultStatement(item.type);
                onAddStep(stmt);
                setIsOpen(false);
              }}
              className="
                w-full text-left px-3 py-1.5 text-3xs text-text-secondary
                hover:bg-brand-primary/10 hover:text-text-primary
                transition-colors flex items-center gap-2
              "
            >
              {item.label}
            </button>
          ))}
        </div>
      ))}
    </div>,
    document.body,
  ) : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center gap-1.5 px-3 py-1.5 text-3xs
          text-text-muted hover:text-brand-primary hover:bg-brand-primary/5
          transition-colors w-full border-t border-border-default
        "
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
        Add Step
      </button>
      {popup}
    </div>
  );
}
