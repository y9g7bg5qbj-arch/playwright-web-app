import React, { useState, useRef, useEffect } from 'react';

interface ConfigBlockProps {
  label: string;
  bgClass: string;
  children: React.ReactNode;
}

/** A visually distinct config section with colored background and label */
export function ConfigBlock({ label, bgClass, children }: ConfigBlockProps) {
  return (
    <div className={`rounded-md ${bgClass} p-3 space-y-2`}>
      <div className="text-4xs font-mono uppercase tracking-widest text-text-muted font-semibold">
        {label}
      </div>
      {children}
    </div>
  );
}

interface ConfigRowProps {
  label: string;
  children: React.ReactNode;
}

/** A single key-value row inside a config block */
export function ConfigRow({ label, children }: ConfigRowProps) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-3xs text-text-muted w-20 flex-shrink-0 text-right pt-0.5">{label}</span>
      <div className="text-3xs text-text-primary flex-1 min-w-0">{children}</div>
    </div>
  );
}

/** Read-only value pill */
export function ValuePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded bg-dark-elevated border border-border-default text-text-primary font-mono text-3xs">
      {children}
    </span>
  );
}

// ==================== EditableField ====================

interface EditableFieldProps {
  /** The current display value */
  value: string;
  /** Callback when the user commits a new value */
  onChange: (newValue: string) => void;
  /** Use monospace font */
  mono?: boolean;
  /** Field type: text input or select dropdown */
  type?: 'text' | 'select';
  /** Options for select type */
  options?: Array<{ label: string; value: string }>;
  /** Placeholder text when empty */
  placeholder?: string;
}

/**
 * Click-to-edit inline field. Displays like a ValuePill in read mode,
 * switches to an input on click. Commits on Enter/blur, cancels on Escape.
 */
export function EditableField({
  value,
  onChange,
  mono = true,
  type = 'text',
  options,
  placeholder,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update local value when prop changes
  useEffect(() => {
    if (!isEditing) setEditValue(value);
  }, [value, isEditing]);

  // Auto-focus and select on entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const commit = () => {
    const trimmed = editValue.trim();
    if (trimmed !== value && trimmed !== '') {
      onChange(trimmed);
    }
    setIsEditing(false);
  };

  const cancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  // Select dropdown
  if (type === 'select' && options) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          inline-block px-2 py-0.5 rounded bg-dark-elevated border border-border-default
          text-text-primary text-3xs outline-none cursor-pointer
          hover:border-brand-primary/40 focus:border-brand-primary transition-colors
          ${mono ? 'font-mono' : ''}
        `}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }

  // Display mode — looks like ValuePill with edit affordance
  if (!isEditing) {
    return (
      <span
        role="button"
        tabIndex={0}
        onClick={() => {
          setEditValue(value);
          setIsEditing(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setEditValue(value);
            setIsEditing(true);
          }
        }}
        className={`
          inline-block px-2 py-0.5 rounded bg-dark-elevated border border-border-default
          text-text-primary text-3xs cursor-pointer
          hover:border-brand-primary/40 hover:bg-brand-primary/5 transition-colors
          ${mono ? 'font-mono' : ''}
        `}
        title="Click to edit"
      >
        {value || <span className="text-text-muted">{placeholder || '—'}</span>}
      </span>
    );
  }

  // Edit mode — inline input
  return (
    <input
      ref={inputRef}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          cancel();
        }
      }}
      className={`
        inline-block px-2 py-0.5 rounded bg-dark-elevated border border-brand-primary
        text-text-primary text-3xs outline-none w-full
        ring-1 ring-brand-primary/30
        ${mono ? 'font-mono' : ''}
      `}
      placeholder={placeholder}
    />
  );
}
