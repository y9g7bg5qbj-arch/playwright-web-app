import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { buildVeroRunTempSpecFileName, buildVeroRunPlaywrightArgs, detectVeroRunFailure, preserveStartupFailureSpec, resolveVeroScenarioSelection, resolvePlaywrightHostPlatformOverride, shouldWriteLegacyDockerSpec, VERO_RUN_MODULE_MISMATCH_ERROR_CODE,  } from '../routes/veroRunExecution.utils';

describe('veroRunExecution utils', () => {
  it('builds .mts temp spec names for /vero/run', () => {
    expect(buildVeroRunTempSpecFileName('run-123')).toBe('.vero-run-run-123.spec.mts');
  });

  it('builds human-readable spec names when readableName is provided', () => {
    expect(buildVeroRunTempSpecFileName('d0a8cb94-ad05-47b3-b8cd-903d16fe75a5', 'Login'))
      .toBe('.vero-run-Login-d0a8cb94.spec.mts');
  });

  it('sanitizes special characters in readable names', () => {
    expect(buildVeroRunTempSpecFileName('abc12345-0000-0000-0000-000000000000', 'My Test Flow!'))
      .toBe('.vero-run-My-Test-Flow--abc12345.spec.mts');
  });

  it('truncates long readable names to 60 chars', () => {
    const longName = 'A'.repeat(100);
    const result = buildVeroRunTempSpecFileName('abc12345-xxxx', longName);
    expect(result.startsWith('.vero-run-')).toBe(true);
    expect(result.endsWith('-abc12345.spec.mts')).toBe(true);
    // The readable part should be max 60 chars
    const readablePart = result.replace('.vero-run-', '').replace('-abc12345.spec.mts', '');
    expect(readablePart.length).toBeLessThanOrEqual(60);
  });

  it('builds Playwright args with explicit config and optional grep flags', () => {
    const args = buildVeroRunPlaywrightArgs({
      tempSpecFileName: '.vero-run-abc.spec.mts',
      configPath: '/tmp/playwright.config.ts',
      headed: true,
      workers: 2,
      retries: 1,
      grep: '@smoke',
      grepInvert: '@wip',
      lastFailed: true,
      updateSnapshotsMode: 'changed',
      timeoutMs: 60000,
    });

    expect(args).toEqual([
      'playwright',
      'test',
      '.vero-run-abc.spec.mts',
      '--config',
      '/tmp/playwright.config.ts',
      '--headed',
      '--workers=2',
      '--retries=1',
      '--grep',
      '@smoke',
      '--grep-invert',
      '@wip',
      '--last-failed',
      '--update-snapshots=changed',
      '--timeout=60000',
    ]);
  });

  it('builds Playwright args for multiple temp specs', () => {
    const args = buildVeroRunPlaywrightArgs({
      tempSpecFileNames: ['.vero-run-a.spec.mts', '.vero-run-b.spec.mts'],
      configPath: '/tmp/playwright.config.ts',
      headed: false,
      workers: 1,
      timeoutMs: 60000,
    });

    expect(args).toEqual([
      'playwright',
      'test',
      '.vero-run-a.spec.mts',
      '.vero-run-b.spec.mts',
      '--config',
      '/tmp/playwright.config.ts',
      '--timeout=60000',
    ]);
  });

  it('omits --workers when worker count is 1 and includes it when >1', () => {
    const singleWorkerArgs = buildVeroRunPlaywrightArgs({
      tempSpecFileName: '.vero-run-single.spec.mts',
      configPath: '/tmp/playwright.config.ts',
      headed: false,
      workers: 1,
      timeoutMs: 60000,
    });
    expect(singleWorkerArgs.some((arg) => arg.startsWith('--workers='))).toBe(false);

    const multiWorkerArgs = buildVeroRunPlaywrightArgs({
      tempSpecFileName: '.vero-run-multi.spec.mts',
      configPath: '/tmp/playwright.config.ts',
      headed: false,
      workers: 3,
      timeoutMs: 60000,
    });
    expect(multiWorkerArgs).toContain('--workers=3');
  });

  it('omits --update-snapshots when update mode is not provided', () => {
    const args = buildVeroRunPlaywrightArgs({
      tempSpecFileName: '.vero-run-abc.spec.mts',
      configPath: '/tmp/playwright.config.ts',
      headed: false,
      timeoutMs: 60000,
    });

    expect(args.some((arg) => arg.startsWith('--update-snapshots='))).toBe(false);
  });

  it('resolves Cucumber-style selection from scenario name and explicit tag expression', () => {
    const selection = resolveVeroScenarioSelection({
      scenarioName: 'SuccessfulLogin',
      config: {
        tagExpression: '(@smoke and @loginComponent) and not @dashboard',
      },
    });

    expect(selection).toEqual({
      scenarioNames: ['SuccessfulLogin'],
      tagExpression: '(@smoke and @loginComponent) and not @dashboard',
      namePatterns: undefined,
    });
  });

  it('merges explicit scenarioNames array into selection', () => {
    const selection = resolveVeroScenarioSelection({
      config: {
        scenarioNames: ['FirstScenario', 'SecondScenario', 'FirstScenario'],
      },
    });

    expect(selection).toEqual({
      scenarioNames: ['FirstScenario', 'SecondScenario'],
      namePatterns: undefined,
      tagExpression: undefined,
    });
  });

  it('builds fallback tag expression from legacy tags/tagMode/excludeTags', () => {
    const selection = resolveVeroScenarioSelection({
      config: {
        tags: ['smoke', 'critical'],
        tagMode: 'all',
        excludeTags: ['dashboard'],
      },
    });

    expect(selection?.tagExpression).toBe('(@smoke and @critical) and not @dashboard');
  });

  it('returns undefined selection when no filters are provided', () => {
    expect(resolveVeroScenarioSelection({})).toBeUndefined();
  });

  it('maps startup module mismatch to normalized error code', () => {
    const failure = detectVeroRunFailure({
      exitCode: 1,
      resultsJsonExists: false,
      stderr: 'ReferenceError: exports is not defined in ES module scope\nat file:///tmp/spec.mts:1:1',
      tempSpecPath: '/tmp/.vero-run-abc.spec.mts',
      configPath: '/tmp/playwright.config.ts',
    });

    expect(failure.isStartupFailure).toBe(true);
    expect(failure.errorCode).toBe(VERO_RUN_MODULE_MISMATCH_ERROR_CODE);
    expect(failure.diagnostics.phase).toBe('startup');
    expect(failure.diagnostics.tempSpecPath).toBe('/tmp/.vero-run-abc.spec.mts');
    expect(failure.diagnostics.configPath).toBe('/tmp/playwright.config.ts');
    expect(failure.diagnostics.stderrSnippet).toContain('exports is not defined');
  });

  it('retains only the latest startup failure specs', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'vero-run-utils-'));
    const debugDir = join(tempRoot, 'startup-failures');

    try {
      for (let i = 0; i < 25; i += 1) {
        const sourceSpec = join(tempRoot, `.source-${i}.spec.mts`);
        await writeFile(sourceSpec, `// source ${i}`, 'utf-8');
        await preserveStartupFailureSpec({
          tempSpecPath: sourceSpec,
          debugDir,
          runId: `run-${i}`,
          maxRetained: 20,
        });
      }

      const retained = await readdir(debugDir);
      expect(retained.length).toBeLessThanOrEqual(20);
      expect(retained.some((name) => name.startsWith('run-24-'))).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('writes docker legacy .spec.ts only when docker config is ts-only', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'vero-docker-config-'));
    const configPath = join(tempRoot, 'playwright.config.ts');

    try {
      await mkdir(tempRoot, { recursive: true });
      await writeFile(configPath, `export default { testMatch: ['**/*.spec.ts'] };`, 'utf-8');
      expect(await shouldWriteLegacyDockerSpec(configPath)).toBe(true);

      await writeFile(configPath, `export default { testMatch: [/\\.spec\\.(ts|mts)$/] };`, 'utf-8');
      expect(await shouldWriteLegacyDockerSpec(configPath)).toBe(false);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('derives Darwin arm64 host platform override for Playwright browser resolution', () => {
    const override = resolvePlaywrightHostPlatformOverride({
      platform: 'darwin',
      arch: 'arm64',
      osRelease: '24.3.0',
    });
    expect(override).toBe('mac15-arm64');
  });

  it('preserves existing Playwright host override and skips non-darwin', () => {
    expect(resolvePlaywrightHostPlatformOverride({
      existingOverride: 'mac15-arm64',
      platform: 'darwin',
      arch: 'arm64',
      osRelease: '24.3.0',
    })).toBe('mac15-arm64');

    expect(resolvePlaywrightHostPlatformOverride({
      platform: 'linux',
      arch: 'arm64',
      osRelease: '6.8.0',
    })).toBeUndefined();
  });
});
