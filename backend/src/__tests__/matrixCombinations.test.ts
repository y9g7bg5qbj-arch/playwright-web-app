import { describe, it, expect } from 'vitest';
import { computeMatrixCombinations, clampConcurrency, MAX_MATRIX_COMBINATIONS, DEFAULT_CONCURRENCY, MAX_CONCURRENCY,  } from '../services/matrixCombinations';

describe('computeMatrixCombinations', () => {
  it('should produce 3 combinations for state=IL,NY,MO', () => {
    const { combinations, baseEnvVars } = computeMatrixCombinations(
      { state: 'IL,NY,MO', browser: 'chromium' },
      ['state']
    );

    expect(combinations).toHaveLength(3);
    expect(combinations[0]).toEqual({ label: 'state=IL', values: { state: 'IL' } });
    expect(combinations[1]).toEqual({ label: 'state=NY', values: { state: 'NY' } });
    expect(combinations[2]).toEqual({ label: 'state=MO', values: { state: 'MO' } });

    // baseEnvVars should have 'browser' but not 'state'
    expect(baseEnvVars).toEqual({ browser: 'chromium' });
  });

  it('should compute Cartesian product for two parallel params', () => {
    const { combinations } = computeMatrixCombinations(
      { state: 'IL,NY', region: 'east,west' },
      ['state', 'region']
    );

    expect(combinations).toHaveLength(4);
    expect(combinations.map((c) => c.label)).toEqual([
      'state=IL, region=east',
      'state=IL, region=west',
      'state=NY, region=east',
      'state=NY, region=west',
    ]);
  });

  it('should return empty combinations when no comma values (product = 1)', () => {
    const { combinations, baseEnvVars } = computeMatrixCombinations(
      { state: 'IL', browser: 'chromium' },
      ['state']
    );

    expect(combinations).toHaveLength(0);
    // baseEnvVars is the original since no fan-out needed
    expect(baseEnvVars).toEqual({ state: 'IL', browser: 'chromium' });
  });

  it('should return empty combinations when single parallel param has single value', () => {
    const { combinations } = computeMatrixCombinations(
      { state: 'IL' },
      ['state']
    );
    expect(combinations).toHaveLength(0);
  });

  it('should handle mixed: one single-value parallel + one multi-value parallel', () => {
    const { combinations } = computeMatrixCombinations(
      { state: 'IL', region: 'east,west,central' },
      ['state', 'region']
    );

    // state=IL × region=3 = 3 combos (product > 1 → matrix)
    expect(combinations).toHaveLength(3);
    expect(combinations[0]).toEqual({ label: 'state=IL, region=east', values: { state: 'IL', region: 'east' } });
  });

  it('should throw when exceeding MAX_MATRIX_COMBINATIONS', () => {
    // Create values that would produce > 50 combinations (e.g., 8 × 8 = 64)
    const eightValues = Array.from({ length: 8 }, (_, i) => `v${i}`).join(',');
    expect(() =>
      computeMatrixCombinations(
        { a: eightValues, b: eightValues },
        ['a', 'b']
      )
    ).toThrow(/exceeding the limit/);
  });

  it('should trim whitespace from comma-separated values', () => {
    const { combinations } = computeMatrixCombinations(
      { state: ' IL , NY , MO ' },
      ['state']
    );

    expect(combinations).toHaveLength(3);
    expect(combinations[0].values.state).toBe('IL');
    expect(combinations[1].values.state).toBe('NY');
    expect(combinations[2].values.state).toBe('MO');
  });

  it('should skip empty strings in comma-separated values', () => {
    const { combinations } = computeMatrixCombinations(
      { state: 'IL,,NY,' },
      ['state']
    );

    expect(combinations).toHaveLength(2);
    expect(combinations[0].values.state).toBe('IL');
    expect(combinations[1].values.state).toBe('NY');
  });

  it('should ignore parallel param names not present in envVars', () => {
    const { combinations } = computeMatrixCombinations(
      { state: 'IL,NY' },
      ['state', 'nonExistent']
    );

    expect(combinations).toHaveLength(2);
  });

  it('should return empty combinations when parallelParamNames is empty', () => {
    const { combinations, baseEnvVars } = computeMatrixCombinations(
      { state: 'IL,NY,MO' },
      []
    );

    expect(combinations).toHaveLength(0);
    expect(baseEnvVars).toEqual({ state: 'IL,NY,MO' });
  });
});

describe('clampConcurrency', () => {
  it('should clamp to 1 minimum', () => {
    expect(clampConcurrency(0)).toBe(1);
    expect(clampConcurrency(-5)).toBe(1);
  });

  it('should clamp to MAX_CONCURRENCY', () => {
    expect(clampConcurrency(100)).toBe(MAX_CONCURRENCY);
  });

  it('should pass through valid values', () => {
    expect(clampConcurrency(5)).toBe(5);
    expect(clampConcurrency(1)).toBe(1);
    expect(clampConcurrency(MAX_CONCURRENCY)).toBe(MAX_CONCURRENCY);
  });

  it('should floor floating point values', () => {
    expect(clampConcurrency(3.7)).toBe(3);
  });
});

describe('constants', () => {
  it('should have expected default values', () => {
    expect(MAX_MATRIX_COMBINATIONS).toBe(50);
    expect(DEFAULT_CONCURRENCY).toBe(5);
    expect(MAX_CONCURRENCY).toBe(10);
  });
});
