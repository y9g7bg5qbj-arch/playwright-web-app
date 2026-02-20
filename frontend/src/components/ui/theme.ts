/**
 * Shared UI Style Contract
 *
 * Single source of truth for reusable class maps across the application.
 * All modules should import from here instead of defining local style constants.
 * Uses design tokens from index.css — no hardcoded hex values.
 */

export { cn } from '@/lib/utils';
import { cn } from '@/lib/utils';

// ── Surface Classes ──────────────────────────────────────────────
export const surfaceClasses = {
  canvas: 'bg-dark-canvas',
  primary: 'bg-dark-bg',
  card: 'bg-dark-card border border-border-default rounded',
  elevated: 'bg-dark-elevated border border-border-default rounded',
  overlay: 'bg-dark-overlay',
} as const;

// ── Toolbar Classes ──────────────────────────────────────────────
export const toolbarClasses = {
  root: 'flex items-center gap-1 px-2 py-1 border-b border-border-default bg-dark-bg',
  section: 'flex items-center gap-1',
  divider: 'h-5 w-px bg-border-default mx-1',
} as const;

// ── Text Tone Classes ────────────────────────────────────────────
export const textToneClasses = {
  primary: 'text-text-primary',
  secondary: 'text-text-secondary',
  muted: 'text-text-muted',
  inverted: 'text-text-inverted',
  brand: 'text-brand-primary',
  link: 'text-brand-secondary hover:text-brand-secondary/80 hover:underline',
} as const;

// ── Status Tone Classes ──────────────────────────────────────────
export const statusToneClasses = {
  success: {
    text: 'text-status-success',
    bg: 'bg-[var(--bg-success)]',
    border: 'border-status-success/20',
    dot: 'bg-status-success',
  },
  warning: {
    text: 'text-status-warning',
    bg: 'bg-[var(--bg-warning)]',
    border: 'border-status-warning/20',
    dot: 'bg-status-warning',
  },
  danger: {
    text: 'text-status-danger',
    bg: 'bg-[var(--bg-danger)]',
    border: 'border-status-danger/20',
    dot: 'bg-status-danger',
  },
  info: {
    text: 'text-status-info',
    bg: 'bg-[var(--bg-info)]',
    border: 'border-status-info/20',
    dot: 'bg-status-info',
  },
  neutral: {
    text: 'text-text-muted',
    bg: 'bg-dark-elevated',
    border: 'border-border-default',
    dot: 'bg-text-muted',
  },
} as const;

export type StatusTone = keyof typeof statusToneClasses;

// ── Input Classes ────────────────────────────────────────────────
export const inputClasses = {
  base: 'w-full rounded border border-border-default bg-dark-canvas px-2.5 py-1 text-sm text-text-primary placeholder-text-muted outline-none transition-colors duration-fast focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 disabled:opacity-50 disabled:cursor-not-allowed',
  label: 'block text-xs font-medium text-text-secondary mb-1',
  error: 'mt-1 text-xs text-status-danger',
  hint: 'mt-1 text-xs text-text-muted',
} as const;

// ── Chip Classes ─────────────────────────────────────────────────
export const chipClasses = {
  base: 'inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
  active: 'border-brand-primary/40 bg-brand-primary/20 text-text-primary',
  inactive: 'border-border-default bg-dark-elevated/40 text-text-secondary hover:border-border-emphasis hover:text-text-primary',
} as const;

export const chipClass = (active: boolean): string =>
  cn(chipClasses.base, active ? chipClasses.active : chipClasses.inactive);

// ── Code Block Classes ───────────────────────────────────────────
export const codeBlockClasses = {
  inline: 'rounded border border-border-default bg-dark-canvas px-1.5 py-0.5 font-mono text-xs text-brand-secondary',
  block: 'rounded border border-border-default bg-dark-canvas px-3 py-2 font-mono text-xs text-brand-secondary overflow-x-auto',
} as const;

// ── Card Select Classes ──────────────────────────────────────────
export const cardSelectClass = (active: boolean): string =>
  cn(
    'rounded-lg border p-3 text-left transition-colors',
    active
      ? 'border-border-active bg-brand-primary/12'
      : 'border-border-default bg-dark-canvas/60 hover:border-border-emphasis hover:bg-dark-elevated/45'
  );

// ── Section Classes ──────────────────────────────────────────────
export const sectionClasses = {
  default: 'rounded-md border border-border-default bg-dark-card p-3',
  muted: 'rounded-md border border-border-default bg-dark-elevated/45 p-3',
  label: 'text-xs font-semibold uppercase tracking-wide text-text-secondary',
  helper: 'text-xs text-text-muted',
} as const;

// ── Panel Header Classes ─────────────────────────────────────────
export const panelHeaderClasses = {
  root: 'h-[34px] px-3 flex items-center justify-between border-b border-border-default bg-dark-bg shrink-0',
  title: 'text-3xs font-semibold text-text-muted uppercase tracking-wider',
  actions: 'flex items-center gap-0.5',
} as const;

// ── Empty State Classes ──────────────────────────────────────────
export const emptyStateClasses = {
  root: 'flex flex-col items-center justify-center py-12 text-center',
  icon: 'w-12 h-12 rounded-xl bg-dark-elevated flex items-center justify-center mb-3 text-text-muted',
  title: 'text-sm text-text-secondary mb-1',
  message: 'text-xs text-text-muted',
  action: 'mt-4',
} as const;
