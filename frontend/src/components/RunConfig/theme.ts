export const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

export const runConfigTheme = {
  section: 'rounded-lg border border-border-default bg-dark-card p-4 shadow-sm',
  sectionMuted: 'rounded-lg border border-border-default bg-dark-elevated/45 p-4',
  label: 'text-xs font-semibold uppercase tracking-wide text-text-secondary',
  helper: 'text-xs text-text-muted',
  input:
    'w-full rounded-md border border-border-default bg-dark-canvas px-3 py-2 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-border-active focus:ring-2 focus:ring-brand-primary/20',
  select:
    'w-full rounded-md border border-border-default bg-dark-canvas px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-border-active focus:ring-2 focus:ring-brand-primary/20',
  code: 'rounded-md border border-border-default bg-dark-canvas px-3 py-2 font-mono text-xs text-brand-secondary',
  toggle:
    'h-4 w-4 rounded border-border-default bg-dark-canvas text-brand-primary focus:ring-brand-primary/30 focus:ring-offset-0',
  chipBase:
    'inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
};

export const chipClass = (active: boolean): string =>
  cx(
    runConfigTheme.chipBase,
    active
      ? 'border-brand-primary/40 bg-brand-primary/20 text-text-primary'
      : 'border-border-default bg-dark-elevated/40 text-text-secondary hover:border-border-emphasis hover:text-text-primary'
  );

export const cardSelectClass = (active: boolean): string =>
  cx(
    'rounded-lg border p-3 text-left transition-colors',
    active
      ? 'border-border-active bg-brand-primary/12'
      : 'border-border-default bg-dark-canvas/60 hover:border-border-emphasis hover:bg-dark-elevated/45'
  );
