/**
 * RunConfig theme bridge — re-exports from the shared UI theme.
 * Keeps existing imports stable (cx, runConfigTheme, chipClass, cardSelectClass).
 */

import {
  cn,
  sectionClasses,
  inputClasses,
  codeBlockClasses,
  chipClasses,
  chipClass as _chipClass,
  cardSelectClass as _cardSelectClass,
} from '@/components/ui/theme';

// Alias cn as cx for backward compatibility (cn is a superset of the old filter+join cx)
export const cx = cn;

export const runConfigTheme = {
  section: sectionClasses.default,
  sectionMuted: sectionClasses.muted,
  label: sectionClasses.label,
  helper: sectionClasses.helper,
  input: inputClasses.base,
  select: inputClasses.base,
  code: codeBlockClasses.block,
  toggle:
    'h-4 w-4 rounded border-border-default bg-dark-canvas text-brand-primary focus:ring-brand-primary/30 focus:ring-offset-0',
  chipBase: chipClasses.base,
};

export const chipClass = _chipClass;
export const cardSelectClass = _cardSelectClass;
