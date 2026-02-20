import { describe, expect, it } from 'vitest';
import { resolveRunSelectionScope } from '../services/veroRunService';

describe('resolveRunSelectionScope', () => {
  it('keeps current-sandbox for manual runs when requested', () => {
    const scope = resolveRunSelectionScope({
      requestedScope: 'current-sandbox',
      triggeredBy: 'manual',
      scenarioName: undefined,
      hasScenarioNamesSelection: false,
    });

    expect(scope).toBe('current-sandbox');
  });

  it('forces active-file for scheduled runs when current-sandbox is requested', () => {
    const scope = resolveRunSelectionScope({
      requestedScope: 'current-sandbox',
      triggeredBy: 'schedule',
      scenarioName: undefined,
      hasScenarioNamesSelection: false,
    });

    expect(scope).toBe('active-file');
  });

  it('keeps active-file for scheduled runs when active-file is requested', () => {
    const scope = resolveRunSelectionScope({
      requestedScope: 'active-file',
      triggeredBy: 'schedule',
      scenarioName: undefined,
      hasScenarioNamesSelection: false,
    });

    expect(scope).toBe('active-file');
  });

  it('forces active-file for scheduled runs with explicit scenario selection', () => {
    const scope = resolveRunSelectionScope({
      requestedScope: 'current-sandbox',
      triggeredBy: 'schedule',
      scenarioName: 'Smoke Login',
      hasScenarioNamesSelection: true,
    });

    expect(scope).toBe('active-file');
  });
});
