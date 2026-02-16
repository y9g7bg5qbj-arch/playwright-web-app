import type { MatrixCombination } from '@playwright-web-app/shared';

export const MAX_MATRIX_COMBINATIONS = 50;
export const DEFAULT_CONCURRENCY = 5;
export const MAX_CONCURRENCY = 10;

export function clampConcurrency(n: unknown): number {
  const num = Number(n);
  if (!Number.isFinite(num)) return DEFAULT_CONCURRENCY;
  return Math.max(1, Math.min(MAX_CONCURRENCY, Math.floor(num)));
}

export function computeMatrixCombinations(
  envVars: Record<string, string>,
  parameterizedNames: string[]
): { combinations: MatrixCombination[]; baseEnvVars: Record<string, string> } {
  const paramValues: { name: string; values: string[] }[] = [];
  for (const name of parameterizedNames) {
    const raw = envVars[name];
    if (!raw) continue;
    const values = raw.split(',').map((v) => v.trim()).filter(Boolean);
    if (values.length > 0) {
      paramValues.push({ name, values });
    }
  }

  let product: Record<string, string>[] = [{}];
  for (const { name, values } of paramValues) {
    const next: Record<string, string>[] = [];
    for (const existing of product) {
      for (const value of values) {
        next.push({ ...existing, [name]: value });
      }
    }
    product = next;
  }

  if (product.length <= 1) {
    return { combinations: [], baseEnvVars: envVars };
  }

  if (product.length > MAX_MATRIX_COMBINATIONS) {
    throw new Error(
      `Matrix produces ${product.length} combinations, exceeding the limit of ${MAX_MATRIX_COMBINATIONS}. ` +
        `Reduce the number of comma-separated values in your parameterized parameters.`
    );
  }

  const combinations: MatrixCombination[] = product.map((values) => ({
    label: Object.entries(values).map(([k, v]) => `${k}=${v}`).join(', '),
    values,
  }));

  const baseEnvVars = { ...envVars };
  for (const { name } of paramValues) {
    delete baseEnvVars[name];
  }

  return { combinations, baseEnvVars };
}

/**
 * Canonical name for local parameterization logic.
 * Keeps `computeMatrixCombinations` for backward compatibility with older callers.
 */
export function computeParameterizedCombinations(
  envVars: Record<string, string>,
  parameterizedNames: string[]
): { combinations: MatrixCombination[]; baseEnvVars: Record<string, string> } {
  return computeMatrixCombinations(envVars, parameterizedNames);
}
