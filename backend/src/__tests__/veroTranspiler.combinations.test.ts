import { describe, it, expect, vi, beforeAll } from 'vitest';

vi.mock('vero-lang', async () => await import('../../../vero-lang/src/index.ts'));

let transpileVero: typeof import('../services/veroTranspiler').transpileVero;
let parseFeatureTitleForSnapshot: typeof import('../services/veroTranspiler').parseFeatureTitleForSnapshot;
let sanitizeSnapshotCombinationLabel: typeof import('../services/veroTranspiler').sanitizeSnapshotCombinationLabel;
let stripScenarioTagsForSnapshot: typeof import('../services/veroTranspiler').stripScenarioTagsForSnapshot;
let scoreLegacySnapshotCandidateRelativePath: typeof import('../services/veroTranspiler').scoreLegacySnapshotCandidateRelativePath;

beforeAll(async () => {
  ({
    transpileVero,
    parseFeatureTitleForSnapshot,
    sanitizeSnapshotCombinationLabel,
    stripScenarioTagsForSnapshot,
    scoreLegacySnapshotCandidateRelativePath,
  } = await import('../services/veroTranspiler'));
});

const source = `
PAGE LoginPage {
  FIELD username = text "Username"
  FIELD password = text "Password"
}

FEATURE LoginFlows {
  SCENARIO SuccessfulLogin {
    FILL LoginPage.username WITH "user"
    FILL LoginPage.password WITH "pass"
  }

  SCENARIO FailedLogin {
    FILL LoginPage.username WITH "bad"
  }
}
`;

const serialSource = `
PAGE LoginPage {
  FIELD username = text "Username"
}

@serial FEATURE SerialLoginFlows {
  SCENARIO SerialLogin {
    FILL LoginPage.username WITH "user"
  }
}
`;

const visualSource = `
PAGE LoginPage {
  FIELD header = text "Welcome"
}

FEATURE VisualFlows {
  SCENARIO VisualValidation @smoke @rt {
    VERIFY LoginPage.header MATCHES SCREENSHOT AS "header" WITH STRICT
  }
}
`;

const hookSource = `
PAGE LoginPage {
  FIELD username = text "Username"
}

FEATURE HookFlows {
  BEFORE ALL {
    LOG "before all"
  }

  BEFORE EACH {
    LOG "before each"
  }

  AFTER ALL {
    LOG "after all"
  }

  SCENARIO BasicScenario {
    FILL LoginPage.username WITH "user"
  }
}
`;

const pageActionsOpenSource = `
PAGE LoginPage {
  FIELD username = text "Username"
}

PAGEACTIONS LoginActions FOR LoginPage {
  openPage {
    OPEN "https://example.com"
  }
}

FEATURE LoginActionFlows {
  SCENARIO OpenWithAction {
    PERFORM LoginActions.openPage
  }
}
`;

const fixtureSource = `
FIXTURE WorkerLogFixture {
  SCOPE worker
  AUTO

  SETUP {
    LOG "worker setup"
  }

  TEARDOWN {
    LOG "worker teardown"
  }
}

FEATURE FixtureFlow {
  WITH FIXTURE WorkerLogFixture { }

  SCENARIO BasicScenario {
    LOG "inside scenario"
  }
}
`;

describe('veroTranspiler parameterized combinations', () => {
  it('generates parameterized describe blocks with combo labels', () => {
    const code = transpileVero(source, {
      combinations: [
        { label: 'state=CA', values: { state: 'CA' } },
        { label: 'state=NY', values: { state: 'NY' } },
      ],
    });

    // Should have parallel mode configured
    expect(code).toContain("test.describe.configure({ mode: 'parallel' });");

    // Should have the combinations array embedded
    expect(code).toContain('__paramCombinations__');
    expect(code).toContain('"state=CA"');
    expect(code).toContain('"state=NY"');

    // Should have a for loop
    expect(code).toContain('for (const __combo__ of __paramCombinations__)');

    // Should have combo-scoped __env__
    expect(code).toContain('const __env__: Record<string, string> = { ...__baseEnv__, ...__combo__.values };');

    // Should append combo label to test.describe name
    expect(code).toContain('[${__combo__.label}]');

    // Original VERO_ENV_VARS line should be stripped (combo provides __env__)
    expect(code).not.toMatch(/const __env__.*VERO_ENV_VARS/);
  });

  it('does not generate parameterized blocks for single combination', () => {
    const code = transpileVero(source, {
      combinations: [
        { label: 'state=CA', values: { state: 'CA' } },
      ],
    });

    // Single combination: no parameterized loop
    expect(code).not.toContain('__paramCombinations__');
    expect(code).not.toContain('for (const __combo__');

    // Non-serial feature still enables parallel mode at feature scope.
    expect(code).toContain("test.describe.configure({ mode: 'parallel' });");

    // Normal describe block
    expect(code).toContain('test.describe(');
  });

  it('does not generate parameterized blocks when combinations is undefined', () => {
    const code = transpileVero(source);

    expect(code).not.toContain('__paramCombinations__');
    expect(code).not.toContain('for (const __combo__');
    expect(code).toContain("test.describe.configure({ mode: 'parallel' });");
    expect(code).toContain('test.describe(');
  });

  it('generates correct number of embedded combinations for multi-param cross product', () => {
    const code = transpileVero(source, {
      combinations: [
        { label: 'state=CA, tier=free', values: { state: 'CA', tier: 'free' } },
        { label: 'state=CA, tier=pro', values: { state: 'CA', tier: 'pro' } },
        { label: 'state=NY, tier=free', values: { state: 'NY', tier: 'free' } },
        { label: 'state=NY, tier=pro', values: { state: 'NY', tier: 'pro' } },
      ],
    });

    expect(code).toContain("test.describe.configure({ mode: 'parallel' });");
    expect(code).toContain('"state=CA, tier=free"');
    expect(code).toContain('"state=NY, tier=pro"');

    // All 4 combinations should be present in the embedded array
    const comboMatches = code.match(/"label":/g);
    expect(comboMatches).toHaveLength(4);
  });

  it('produces valid code structure with baseEnv and combo merge', () => {
    const code = transpileVero(source, {
      combinations: [
        { label: 'env=staging', values: { env: 'staging' } },
        { label: 'env=prod', values: { env: 'prod' } },
      ],
    });

    // baseEnv reads from VERO_ENV_VARS (non-parameterized vars)
    expect(code).toContain("const __baseEnv__: Record<string, string> = JSON.parse(process.env.VERO_ENV_VARS || '{}');");

    // combo __env__ merges base + combo values
    expect(code).toContain('{ ...__baseEnv__, ...__combo__.values }');
  });

  it('indents test blocks inside the for loop', () => {
    const code = transpileVero(source, {
      combinations: [
        { label: 'a=1', values: { a: '1' } },
        { label: 'a=2', values: { a: '2' } },
      ],
    });

    // After 'for (' line, test.describe should be indented
    const lines = code.split('\n');
    const forLineIdx = lines.findIndex((l) => l.includes('for (const __combo__'));
    expect(forLineIdx).toBeGreaterThan(-1);

    // Find first test.describe after the for loop
    const describeLineIdx = lines.findIndex((l, i) => i > forLineIdx && l.includes('test.describe('));
    expect(describeLineIdx).toBeGreaterThan(forLineIdx);

    // Should be indented (starts with spaces)
    expect(lines[describeLineIdx]).toMatch(/^\s{2,}/);
  });

  it('patches combo labels for serial describe variants', () => {
    const code = transpileVero(serialSource, {
      combinations: [
        { label: 'state=CA', values: { state: 'CA' } },
        { label: 'state=NY', values: { state: 'NY' } },
      ],
    });

    expect(code).toContain('test.describe.serial(`SerialLoginFlows [${__combo__.label}]`');
    expect(code).toContain('for (const __combo__ of __paramCombinations__)');
  });

  it('uses screenshot helper wrapper and injects runtime helper code', () => {
    const code = transpileVero(visualSource);

    expect(code).toContain('async function __veroExpectScreenshot(');
    expect(code).toContain("await __veroExpectScreenshot(loginPage.header, testInfo, 'header.png', {");
    expect(code).not.toContain("await expect(loginPage.header).toHaveScreenshot('header.png'");
    expect(code).not.toContain('interface __VeroSnapshotMigrationContext {\\n');
  });

  it('keeps combo labels human-readable while using sanitized combo keys in helper', () => {
    const code = transpileVero(visualSource, {
      combinations: [
        { label: 'state=IL, region=east', values: { state: 'IL', region: 'east' } },
        { label: 'state=CA, region=west', values: { state: 'CA', region: 'west' } },
      ],
    });

    expect(code).toContain('"state=IL, region=east"');
    expect(code).toContain('[${__combo__.label}]');
    expect(code).toContain("return sanitized.length > 0 ? sanitized.join('__') : undefined;");
    expect(code).toContain('if (comboSegment) argParts.push(comboSegment);');
  });

  it('does not inject page fixture params into beforeAll/afterAll hooks', () => {
    const code = transpileVero(hookSource);

    expect(code).toContain('test.beforeAll(async () => {');
    expect(code).not.toContain('test.beforeAll(async ({ page }) => {');

    expect(code).toContain('test.afterAll(async () => {');
    expect(code).not.toContain('test.afterAll(async ({ page }) => {');

    // beforeEach still receives page + testInfo for hook steps.
    expect(code).toContain('test.beforeEach(async ({ page }, testInfo) => {');
  });

  it('uses this.page for OPEN statements inside PAGEACTIONS methods', () => {
    const code = transpileVero(pageActionsOpenSource);

    expect(code).toContain('async openPage(): Promise<void> {');
    expect(code).toContain("await this.page.goto('https://example.com');");
    expect(code).not.toContain("await page.goto('https://example.com');");
  });

  it('does not wrap fixture setup/teardown statements in test.step', () => {
    const code = transpileVero(fixtureSource);

    expect(code).toContain("console.log('worker setup');");
    expect(code).toContain("console.log('worker teardown');");
    expect(code).not.toContain("test.step('Log: ' + 'worker setup'");
    expect(code).not.toContain("test.step('Log: ' + 'worker teardown'");
    expect(code).toContain('async ({ browser }, use) =>');
    expect(code).not.toContain('async ({ page }, use) =>');
  });
});

describe('snapshot key utilities', () => {
  it('parses feature title combo suffix from describe labels', () => {
    expect(parseFeatureTitleForSnapshot('HerokuLogin [state=IL]')).toEqual({
      baseTitle: 'HerokuLogin',
      comboLabel: 'state=IL',
    });
    expect(parseFeatureTitleForSnapshot('HerokuLogin')).toEqual({
      baseTitle: 'HerokuLogin',
    });
  });

  it('strips trailing @tags from scenario names', () => {
    expect(stripScenarioTagsForSnapshot('Heroku Visual Validation @smoke @rt')).toBe('Heroku Visual Validation');
    expect(stripScenarioTagsForSnapshot('Heroku Visual Validation')).toBe('Heroku Visual Validation');
  });

  it('sanitizes combo labels for deterministic folder naming', () => {
    expect(sanitizeSnapshotCombinationLabel('state=IL')).toBe('state-IL');
    expect(sanitizeSnapshotCombinationLabel('state=IL, region=east')).toBe('state-IL__region-east');
    expect(sanitizeSnapshotCombinationLabel(' state = IL , region = east ')).toBe('state-IL__region-east');
  });

  it('scores legacy candidates and rejects mismatched combos', () => {
    const context = {
      featureSegment: 'HerokuLogin',
      scenarioSegment: 'Heroku-Visual-Validation',
      comboSegment: 'state-IL',
    };

    const matchScore = scoreLegacySnapshotCandidateRelativePath(
      'HerokuLogin-state-IL-Heroku-Visual-Validation-smoke-rt',
      context,
    );
    const mismatchScore = scoreLegacySnapshotCandidateRelativePath(
      'HerokuLogin-state-CA-Heroku-Visual-Validation-smoke-rt',
      context,
    );

    expect(matchScore).toBeGreaterThan(0);
    expect(mismatchScore).toBe(-1);
  });
});
