export type ExecutionTarget = 'local' | 'docker' | 'github-actions';

/**
 * Keeps target normalization behavior aligned with shared run-configuration logic
 * while avoiding frontend bundle-time CJS export interop issues.
 */
export function normalizeExecutionTarget(
  target: string | null | undefined,
  fallback: ExecutionTarget = 'local'
): ExecutionTarget {
  const normalized = (target || '').trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (normalized === 'local') return 'local';
  if (normalized === 'github-actions' || normalized === 'github' || normalized === 'gha') return 'github-actions';
  if (normalized === 'docker') return 'docker';
  if (normalized === 'remote') return 'local';
  return fallback;
}
