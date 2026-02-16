import { describe, it, expect, vi, beforeAll } from 'vitest';

vi.mock('vero-lang', async () => await import('../../../vero-lang/src/index.ts'));

let transpileVero: typeof import('../services/veroTranspiler').transpileVero;

beforeAll(async () => {
  ({ transpileVero } = await import('../services/veroTranspiler'));
});

describe('veroTranspiler scenario selection', () => {
  const source = `
PAGE LoginPage {
  FIELD username = text "Username"
}

FEATURE LoginFlows {
  USE LoginPage

  SCENARIO SuccessfulLogin @smoke @loginComponent {
    CLICK LoginPage.username
  }

  SCENARIO DashboardLogin @smoke @loginComponent @dashboard {
    CLICK LoginPage.username
  }

  SCENARIO DashboardSmoke @smoke @dashboard {
    CLICK LoginPage.username
  }

  SCENARIO CheckoutSmoke @smoke @loginComponent @checkout {
    CLICK LoginPage.username
  }

  SCENARIO RegressionOnly @regression {
    CLICK LoginPage.username
  }
}
`;

  const serialSource = `
PAGE LoginPage {
  FIELD username = text "Username"
}

@serial FEATURE SerialLoginFlows {
  USE LoginPage

  SCENARIO SerialLogin @smoke {
    CLICK LoginPage.username
  }
}
`;

  it('emits parallel mode for non-serial features', () => {
    const code = transpileVero(source);
    expect(code).toContain("test.describe.configure({ mode: 'parallel' });");
    expect(code).toContain("test.describe('LoginFlows'");
  });

  it('keeps explicit @serial features serial without parallel configure', () => {
    const code = transpileVero(serialSource);
    expect(code).toContain("test.describe.serial('SerialLoginFlows'");
    expect(code).not.toContain("test.describe.configure({ mode: 'parallel' });");
  });

  it('filters scenarios using a simple tag expression', () => {
    const code = transpileVero(source, {
      selection: {
        tagExpression: '@smoke',
      },
    });

    expect(code).toContain("test('Successful Login @smoke @loginComponent'");
    expect(code).toContain("test('Dashboard Login @smoke @loginComponent @dashboard'");
    expect(code).toContain("test('Dashboard Smoke @smoke @dashboard'");
    expect(code).toContain("test('Checkout Smoke @smoke @loginComponent @checkout'");
    expect(code).not.toContain('Regression Only @regression');
  });

  it('filters scenarios using a conjunctive tag expression', () => {
    const code = transpileVero(source, {
      selection: {
        tagExpression: '@smoke and @loginComponent',
      },
    });

    expect(code).toContain("test('Successful Login @smoke @loginComponent'");
    expect(code).toContain("test('Dashboard Login @smoke @loginComponent @dashboard'");
    expect(code).toContain("test('Checkout Smoke @smoke @loginComponent @checkout'");
    expect(code).not.toContain('Dashboard Smoke @smoke @dashboard');
    expect(code).not.toContain('Regression Only @regression');
  });

  it('filters scenarios using Cucumber-style tag expressions', () => {
    const code = transpileVero(source, {
      selection: {
        tagExpression: '(@smoke and @loginComponent) and not @dashboard',
      },
    });

    expect(code).toContain("test('Successful Login @smoke @loginComponent'");
    expect(code).toContain("test('Checkout Smoke @smoke @loginComponent @checkout'");
    expect(code).not.toContain('Dashboard Login @smoke @loginComponent @dashboard');
    expect(code).not.toContain('Dashboard Smoke @smoke @dashboard');
    expect(code).not.toContain('Regression Only @regression');
  });

  it('supports combining scenario name and tag filters', () => {
    const code = transpileVero(source, {
      selection: {
        scenarioNames: ['SuccessfulLogin', 'DashboardSmoke'],
        tagExpression: '@smoke and @loginComponent',
      },
    });

    expect(code).toContain("test('Successful Login @smoke @loginComponent'");
    expect(code).not.toContain('Dashboard Login @smoke @loginComponent @dashboard');
    expect(code).not.toContain('Dashboard Smoke @smoke @dashboard');
    expect(code).not.toContain('Checkout Smoke @smoke @loginComponent @checkout');
    expect(code).not.toContain('Regression Only @regression');
  });

  it('throws a clear error when no scenarios match', () => {
    expect(() =>
      transpileVero(source, {
        selection: {
          tagExpression: '@doesNotExist',
        },
      })
    ).toThrow(/No scenarios matched/i);
  });

  it('throws a clear error for invalid tag expressions', () => {
    expect(() =>
      transpileVero(source, {
        selection: {
          tagExpression: '@smoke and not(',
        },
      })
    ).toThrow(/Invalid tag expression|Expected '\)'/i);
  });
});
