# Run Configuration System - Implementation Plan

## Executive Summary

This plan redesigns the Run Configuration system to expose full Playwright power while maintaining usability. Key changes:

1. **Separate Concerns**: Environments, Reporters, and Run Configs become independent entities
2. **Full Playwright Parity**: All configuration options available
3. **Smart Defaults**: Presets and sensible defaults reduce cognitive load
4. **CI Integration**: First-class support for GitHub Actions, GitLab CI, etc.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PROJECT SETTINGS                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │  ENVIRONMENTS   │  │    REPORTERS    │  │   CREDENTIALS   │         │
│  │  (where to run) │  │  (what output)  │  │   (auth/keys)   │         │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘         │
│           │                    │                    │                   │
│           └────────────────────┼────────────────────┘                   │
│                                ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    RUN CONFIGURATIONS                            │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │   │
│  │  │ Quick Smoke │ │ Regression  │ │ CI Pipeline │ │ Custom...    │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘                │   │
│  │                                                                  │   │
│  │  Each config references:                                         │   │
│  │  • Environment (dev/staging/prod)                               │   │
│  │  • Reporter Profile (html/junit/etc)                            │   │
│  │  • Execution Settings (browser, workers, retries)               │   │
│  │  • Artifact Settings (trace, video, screenshot)                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### 1. Environment (Project-level)

```typescript
interface ExecutionEnvironment {
  id: string;
  projectId: string;  // Changed from workflowId - environments are project-wide
  name: string;
  slug: string;       // 'dev', 'staging', 'prod', 'custom'
  baseUrl: string;
  description?: string;

  // Environment Variables
  variables: Record<string, string>;

  // Secrets (stored encrypted, referenced by name)
  secretRefs: string[];  // References to StoredCredential IDs

  // Playwright-specific env vars
  playwrightEnv: {
    CI?: boolean;           // Enables CI-specific behavior
    DEBUG?: string;         // 'pw:api', 'pw:browser', etc.
    PWDEBUG?: '1' | 'console';  // Enable Playwright Inspector
  };

  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 2. Reporter Profile (Project-level)

```typescript
interface ReporterProfile {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  isDefault: boolean;

  reporters: ReporterConfig[];

  createdAt: string;
  updatedAt: string;
}

interface ReporterConfig {
  type: 'list' | 'dot' | 'line' | 'html' | 'json' | 'junit' | 'github' | 'blob';
  enabled: boolean;
  options?: {
    // HTML Reporter
    outputFolder?: string;
    open?: 'always' | 'never' | 'on-failure';

    // JSON/JUnit Reporter
    outputFile?: string;

    // Blob Reporter (for merging sharded results)
    outputDir?: string;
  };
}

// Default profiles created automatically
const DEFAULT_REPORTER_PROFILES: Partial<ReporterProfile>[] = [
  {
    name: 'Default',
    description: 'HTML report with list output',
    reporters: [
      { type: 'list', enabled: true },
      { type: 'html', enabled: true, options: { open: 'on-failure' } },
    ],
  },
  {
    name: 'CI Pipeline',
    description: 'JUnit for CI + GitHub annotations + Blob for sharding',
    reporters: [
      { type: 'dot', enabled: true },
      { type: 'junit', enabled: true, options: { outputFile: 'results.xml' } },
      { type: 'github', enabled: true },
      { type: 'blob', enabled: true },
    ],
  },
  {
    name: 'Minimal',
    description: 'Dot reporter only (fastest)',
    reporters: [
      { type: 'dot', enabled: true },
    ],
  },
];
```

### 3. Run Configuration (Workflow-level)

```typescript
interface RunConfiguration {
  id: string;
  workflowId: string;
  name: string;
  description?: string;
  isDefault: boolean;

  // ═══════════════════════════════════════════════════════════════
  // REFERENCES (to project-level entities)
  // ═══════════════════════════════════════════════════════════════
  environmentId?: string;
  reporterProfileId?: string;

  // ═══════════════════════════════════════════════════════════════
  // TEST SELECTION
  // ═══════════════════════════════════════════════════════════════
  testSelection: {
    mode: 'all' | 'tagged' | 'specific';

    // When mode === 'tagged'
    tags?: string[];
    tagMode?: 'any' | 'all';
    excludeTags?: string[];

    // When mode === 'specific'
    testFlowIds?: string[];

    // Grep filter (applies to all modes)
    grep?: string;
    grepInvert?: string;
  };

  // ═══════════════════════════════════════════════════════════════
  // EXECUTION TARGET
  // ═══════════════════════════════════════════════════════════════
  execution: {
    target: 'local' | 'docker' | 'remote';

    // Docker-specific
    docker?: {
      shardCount: number;
      image: string;
      memory: '1G' | '2G' | '4G' | '8G';
      cpus: '0.5' | '1.0' | '2.0' | '4.0';
      keepContainers: boolean;
    };

    // Remote-specific
    remote?: {
      runnerId: string;
    };
  };

  // ═══════════════════════════════════════════════════════════════
  // BROWSER CONFIGURATION
  // ═══════════════════════════════════════════════════════════════
  browser: {
    type: 'chromium' | 'firefox' | 'webkit';
    channel?: 'chrome' | 'chrome-beta' | 'msedge' | 'msedge-beta' | 'msedge-dev';
    headless: boolean;

    // Viewport
    viewport: { width: number; height: number };

    // Device Emulation (optional - overrides viewport)
    device?: string;  // 'iPhone 14', 'Pixel 7', etc.

    // Advanced Browser Options
    advanced?: {
      ignoreHTTPSErrors: boolean;
      bypassCSP: boolean;
      javaScriptEnabled: boolean;
      acceptDownloads: boolean;
      offline: boolean;
    };
  };

  // ═══════════════════════════════════════════════════════════════
  // LOCALE & EMULATION
  // ═══════════════════════════════════════════════════════════════
  emulation?: {
    locale?: string;           // 'en-US', 'de-DE', 'ja-JP'
    timezoneId?: string;       // 'America/New_York', 'Europe/London'
    geolocation?: { latitude: number; longitude: number; accuracy?: number };
    colorScheme?: 'light' | 'dark' | 'no-preference';
    reducedMotion?: 'reduce' | 'no-preference';
    forcedColors?: 'active' | 'none';
    permissions?: string[];    // ['geolocation', 'notifications']
  };

  // ═══════════════════════════════════════════════════════════════
  // PARALLELIZATION
  // ═══════════════════════════════════════════════════════════════
  parallel: {
    workers: number | 'auto';  // 'auto' = 50% of CPU cores
    fullyParallel: boolean;    // Run tests within files in parallel
  };

  // ═══════════════════════════════════════════════════════════════
  // TIMEOUTS
  // ═══════════════════════════════════════════════════════════════
  timeouts: {
    test: number;        // Per-test timeout (default: 30000ms)
    expect: number;      // Assertion timeout (default: 5000ms)
    action: number;      // Click/fill timeout (default: 0 = no limit)
    navigation: number;  // goto/reload timeout (default: 0 = no limit)
    global: number;      // Entire suite timeout (default: 0 = disabled)
  };

  // ═══════════════════════════════════════════════════════════════
  // RETRIES
  // ═══════════════════════════════════════════════════════════════
  retries: {
    count: number;       // 0 = no retries
    // Future: could add 'retryOnlyFlaky' option
  };

  // ═══════════════════════════════════════════════════════════════
  // ARTIFACTS
  // ═══════════════════════════════════════════════════════════════
  artifacts: {
    trace: 'off' | 'on' | 'retain-on-failure' | 'on-first-retry';
    screenshot: 'off' | 'on' | 'only-on-failure';
    video: 'off' | 'on' | 'retain-on-failure' | 'on-first-retry';

    // Output directory (relative to project root)
    outputDir: string;  // default: 'test-results'

    // Retention
    retentionDays: number;
  };

  // ═══════════════════════════════════════════════════════════════
  // ADVANCED OPTIONS
  // ═══════════════════════════════════════════════════════════════
  advanced?: {
    forbidOnly: boolean;      // Fail if test.only exists
    maxFailures: number;      // Stop after N failures (0 = no limit)
    preserveOutput: 'always' | 'never' | 'failures-only';
    updateSnapshots: 'all' | 'none' | 'missing';

    // Debug options
    slowMo: number;           // Slow down actions by N ms
    pauseOnFailure: boolean;  // Pause for debugging on failure
  };

  createdAt: string;
  updatedAt: string;
}
```

---

## UI Design

### Main Run Configuration Panel

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ⚡ Run Configuration                                    [Save] [Reset]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Configuration: [▼ Regression Suite        ] [+ New] [Duplicate]       │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  ▼ Environment & Output                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Environment:  [▼ Staging                    ] [⚙️ Manage]       │   │
│  │  Reporters:    [▼ Default (HTML + List)      ] [⚙️ Manage]       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ▼ Browser                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Browser:  ○ Chromium  ○ Chrome  ○ Edge  ○ Firefox  ○ WebKit    │   │
│  │  Mode:     ○ Headless  ○ Headed                                 │   │
│  │  Viewport: [▼ Desktop 1280×720     ] or Device: [▼ None       ] │   │
│  │  [▸ Advanced Browser Options...]                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ▼ Execution                                                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Target:  ○ Local  ○ Docker Sharding  ○ Remote Runner           │   │
│  │                                                                  │   │
│  │  ┌─ Local/Remote ──────────────────────────────────────────┐    │   │
│  │  │  Workers: [====●=======] 4    □ Fully Parallel          │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  │  ┌─ Docker (when selected) ────────────────────────────────┐    │   │
│  │  │  Shards: [====●=======] 4     Memory: [▼ 2GB]           │    │   │
│  │  │  Status: ● Running (4/4 healthy)      [Stop Cluster]    │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ▶ Timeouts & Retries                                                   │
│  ▶ Artifacts (Trace, Video, Screenshots)                                │
│  ▶ Locale & Emulation                                                   │
│  ▶ Advanced Options                                                     │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Summary: Chrome headed on Staging | 4 workers | 2 retries | HTML       │
│                                                                         │
│  [▶ Run Tests]  [▶ Run Selected]  [Schedule...]                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Expanded Sections

#### Timeouts & Retries (expanded)
```
┌─────────────────────────────────────────────────────────────────────┐
│  Retries:     [  2  ] retries before failing                        │
│                                                                      │
│  Timeouts:                                                           │
│  ├── Test:        [ 30 ] seconds  (per test)                        │
│  ├── Assertion:   [  5 ] seconds  (expect timeout)                  │
│  ├── Action:      [  0 ] seconds  (click/fill, 0=no limit)          │
│  ├── Navigation:  [ 30 ] seconds  (goto/reload)                     │
│  └── Global:      [  0 ] seconds  (entire suite, 0=disabled)        │
└─────────────────────────────────────────────────────────────────────┘
```

#### Artifacts (expanded)
```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  🎬 Trace:       [▼ On First Retry    ]  Best for debugging flaky   │
│  📹 Video:       [▼ Retain on Failure ]  Good balance               │
│  📸 Screenshot:  [▼ Only on Failure   ]  Recommended                │
│                                                                      │
│  Output:  [ test-results ]     Retention: [ 30 ] days               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### Locale & Emulation (expanded)
```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  Locale:        [▼ en-US (English)           ]                      │
│  Timezone:      [▼ America/New_York          ]                      │
│  Color Scheme:  ○ Light  ○ Dark  ○ No Preference                   │
│                                                                      │
│  □ Geolocation  Lat: [ 40.7128 ]  Long: [ -74.0060 ]               │
│  □ Reduced Motion                                                    │
│  □ Forced Colors                                                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### Advanced Options (expanded)
```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  Execution Control:                                                  │
│  □ Forbid test.only (fail if present)                               │
│  □ Stop after [ 0 ] failures (0 = run all)                          │
│                                                                      │
│  Output Handling:                                                    │
│  Preserve Output: [▼ Failures Only ]                                │
│  Update Snapshots: [▼ Missing Only ]                                │
│                                                                      │
│  Debugging:                                                          │
│  □ Slow Motion: [ 0 ] ms between actions                            │
│  □ Pause on Failure (opens Playwright Inspector)                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Preset Configurations

### Updated Presets

```typescript
const RUN_CONFIGURATION_PRESETS = [
  {
    name: 'Quick Development',
    icon: 'Zap',
    description: 'Fast feedback during test authoring',
    config: {
      execution: { target: 'local' },
      browser: { type: 'chromium', channel: 'chrome', headless: false },
      parallel: { workers: 1, fullyParallel: false },
      retries: { count: 0 },
      timeouts: { test: 60000 },
      artifacts: { trace: 'on', screenshot: 'on', video: 'off' },
    },
  },
  {
    name: 'Smoke Test',
    icon: 'Flame',
    description: 'Quick validation of critical paths',
    config: {
      testSelection: { mode: 'tagged', tags: ['smoke', 'critical'] },
      execution: { target: 'local' },
      browser: { type: 'chromium', headless: true },
      parallel: { workers: 4, fullyParallel: true },
      retries: { count: 1 },
      artifacts: { trace: 'on-first-retry', screenshot: 'only-on-failure', video: 'off' },
    },
  },
  {
    name: 'Full Regression',
    icon: 'Shield',
    description: 'Complete test suite with thorough coverage',
    config: {
      testSelection: { mode: 'all', excludeTags: ['wip', 'flaky', 'manual'] },
      execution: { target: 'docker', docker: { shardCount: 4, memory: '2G', cpus: '1.0' } },
      browser: { type: 'chromium', headless: true },
      parallel: { workers: 2, fullyParallel: true },  // 2 workers per shard
      retries: { count: 2 },
      artifacts: { trace: 'on-first-retry', screenshot: 'only-on-failure', video: 'retain-on-failure' },
    },
  },
  {
    name: 'Cross-Browser',
    icon: 'Globe',
    description: 'Test on Chrome, Firefox, and Safari',
    note: 'Creates 3 configurations, one per browser',
    browsers: ['chromium', 'firefox', 'webkit'],
    config: {
      execution: { target: 'docker', docker: { shardCount: 3 } },
      parallel: { workers: 2, fullyParallel: true },
      retries: { count: 1 },
    },
  },
  {
    name: 'Debug Mode',
    icon: 'Bug',
    description: 'Maximum visibility for troubleshooting',
    config: {
      execution: { target: 'local' },
      browser: { type: 'chromium', channel: 'chrome', headless: false },
      parallel: { workers: 1, fullyParallel: false },
      retries: { count: 0 },
      timeouts: { test: 0, action: 0 },  // No timeouts
      artifacts: { trace: 'on', screenshot: 'on', video: 'on' },
      advanced: { slowMo: 250, pauseOnFailure: true },
    },
  },
  {
    name: 'CI Pipeline',
    icon: 'GitBranch',
    description: 'Optimized for GitHub Actions / GitLab CI',
    config: {
      execution: { target: 'local' },  // CI provides the container
      browser: { type: 'chromium', headless: true },
      parallel: { workers: 1, fullyParallel: false },  // Stability in CI
      retries: { count: 2 },
      artifacts: { trace: 'on-first-retry', screenshot: 'only-on-failure', video: 'off' },
      advanced: { forbidOnly: true },  // Fail if test.only exists
    },
  },
];
```

---

## Implementation Phases

### Phase 1: Data Model Refactoring (Backend)

1. **Create ReporterProfile model** in Prisma schema
2. **Migrate Environment** from workflow-level to project-level
3. **Update RunConfiguration** schema with new structure
4. **Create migration scripts** for existing data
5. **Update services** (runConfiguration.service.ts, environment.service.ts)
6. **Update API routes**

### Phase 2: Shared Types Update

1. **Update shared/src/runConfiguration.ts** with new interfaces
2. **Add reporter profile types**
3. **Update environment types**
4. **Add preset definitions**
5. **Add Playwright config generator utility**

### Phase 3: Frontend - Store Updates

1. **Update useRunConfigStore** with new structure
2. **Add reporter profile management**
3. **Update environment management**
4. **Add preset application logic**

### Phase 4: Frontend - UI Components

1. **Redesign ExecutionConfigPanel** with collapsible sections
2. **Create BrowserSection** (browser type, channel, headless, viewport, device)
3. **Create ExecutionSection** (target, workers, sharding)
4. **Create TimeoutSection** (all timeout types)
5. **Create ArtifactSection** (trace, video, screenshot with all modes)
6. **Create EmulationSection** (locale, timezone, geo, colors)
7. **Create AdvancedSection** (forbidOnly, maxFailures, debug)
8. **Create EnvironmentSelector** with manage button
9. **Create ReporterProfileSelector** with manage button
10. **Create PresetSelector** with preview

### Phase 5: Playwright Config Generation

1. **Create config generator** that converts RunConfiguration to playwright.config.ts
2. **Handle sharding** command line generation
3. **Handle reporter** configuration
4. **Handle environment variables**

### Phase 6: CI Integration (Future)

1. **GitHub Actions** workflow generator
2. **GitLab CI** yaml generator
3. **Scheduled runs** integration

---

## File Changes Summary

### Backend

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | MODIFY | Add ReporterProfile, update RunConfiguration |
| `src/services/reporterProfile.service.ts` | CREATE | CRUD for reporter profiles |
| `src/services/runConfiguration.service.ts` | MODIFY | Update for new structure |
| `src/routes/reporterProfile.routes.ts` | CREATE | API routes for profiles |
| `src/routes/runConfiguration.routes.ts` | MODIFY | Update endpoints |

### Shared

| File | Action | Description |
|------|--------|-------------|
| `src/runConfiguration.ts` | MODIFY | New type definitions |
| `src/reporterProfile.ts` | CREATE | Reporter profile types |
| `src/playwrightConfigGenerator.ts` | CREATE | Generate playwright.config.ts |

### Frontend

| File | Action | Description |
|------|--------|-------------|
| `src/store/useRunConfigStore.ts` | MODIFY | Update state structure |
| `src/components/ExecutionConfig/ExecutionConfigPanel.tsx` | REWRITE | New layout |
| `src/components/ExecutionConfig/BrowserSection.tsx` | CREATE | Browser config |
| `src/components/ExecutionConfig/ExecutionSection.tsx` | CREATE | Target & workers |
| `src/components/ExecutionConfig/TimeoutSection.tsx` | CREATE | All timeouts |
| `src/components/ExecutionConfig/ArtifactSection.tsx` | MODIFY | All artifact modes |
| `src/components/ExecutionConfig/EmulationSection.tsx` | CREATE | Locale, geo, etc. |
| `src/components/ExecutionConfig/AdvancedSection.tsx` | CREATE | Advanced options |
| `src/components/ExecutionConfig/PresetSelector.tsx` | CREATE | Preset cards |
| `src/components/Settings/ReporterProfileManager.tsx` | CREATE | Manage profiles |
| `src/components/Settings/EnvironmentManager.tsx` | MODIFY | Project-level envs |

---

## Questions for Confirmation

Before implementation, please confirm:

1. **Remove QuickRunRequest?** You said to remove it. Confirm we'll have one unified RunConfiguration model with a "Run with overrides" option?

2. **Project-level vs Workflow-level**:
   - Environments → Project-level (shared across workflows) ✓
   - Reporter Profiles → Project-level (shared) ✓
   - Run Configurations → Workflow-level (specific to workflow) ✓
   - Is this correct?

3. **Chrome Channel**: Add Chrome, Chrome Beta, Edge, Edge Beta, Edge Dev?

4. **Preset Behavior**: When user selects a preset, should it:
   - A) Populate all fields (user can then modify)
   - B) Create a new named configuration based on preset
   - C) Both options available

5. **Run Button Behavior**: On click, run immediately or show quick confirmation?

---

## Appendix: Playwright Config Generator

Example output:

```typescript
// Generated by Vero IDE
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  // Parallel execution
  workers: 4,
  fullyParallel: true,

  // Retries
  retries: 2,

  // Timeouts
  timeout: 30000,
  expect: { timeout: 5000 },

  // Artifacts
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Browser
    headless: true,
    viewport: { width: 1280, height: 720 },

    // Base URL from environment
    baseURL: process.env.BASE_URL || 'https://staging.example.com',

    // Locale & Timezone
    locale: 'en-US',
    timezoneId: 'America/New_York',
  },

  // Reporters
  reporter: [
    ['list'],
    ['html', { open: 'on-failure' }],
    ['junit', { outputFile: 'results.xml' }],
  ],

  // Advanced
  forbidOnly: !!process.env.CI,

  // Projects (for cross-browser)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```
