import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('vero-lang', async () => await import('../../../vero-lang/src/index.ts'));

let transpileVero: typeof import('../services/veroTranspiler').transpileVero;

beforeAll(async () => {
  ({ transpileVero } = await import('../services/veroTranspiler'));
});

const rowModifierSource = `
FEATURE RowTempVarCollision {
  SCENARIO MultipleRowModifiers {
    ROW firstCred = FIRST LoginCredentials WHERE username CONTAINS "tom" ORDER BY username ASC
    ROW lastCred = LAST LoginCredentials WHERE username STARTS WITH "t" ORDER BY username DESC
    ROW randomCred = RANDOM LoginCredentials WHERE username ENDS WITH "h"
  }
}
`;

describe('veroTranspiler row temp vars', () => {
  it('generates unique sorted/filtered temp identifiers for multiple ROW modifier statements', () => {
    const code = transpileVero(rowModifierSource);

    // Legacy fixed names caused duplicate declarations in one scenario scope.
    expect(code).not.toContain('const _sorted =');
    expect(code).not.toContain('const _filtered =');

    const sortedTempVars = [...code.matchAll(/\bconst\s+(_sorted[A-Za-z0-9_$]*)\s*=/g)].map((match) => match[1]);
    const filteredTempVars = [...code.matchAll(/\bconst\s+(_filtered[A-Za-z0-9_$]*)\s*=/g)].map((match) => match[1]);

    expect(sortedTempVars.length).toBeGreaterThanOrEqual(2);
    expect(new Set(sortedTempVars).size).toBe(sortedTempVars.length);

    expect(filteredTempVars.length).toBeGreaterThanOrEqual(3);
    expect(new Set(filteredTempVars).size).toBe(filteredTempVars.length);
  });

  it('resets temp var counter for deterministic output across transpile calls', () => {
    const firstPass = transpileVero(rowModifierSource);
    const secondPass = transpileVero(rowModifierSource);

    expect(firstPass).toBe(secondPass);
  });
});
