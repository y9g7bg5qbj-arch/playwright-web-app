# Run Configuration Skill

This skill manages test execution configurations for both local and GitHub Actions runs in the Vero IDE.

## How to Access

### From Run Button Dropdown (Primary)
1. In the Header toolbar, click the **dropdown arrow (▾)** on the green Run button
2. The dropdown shows:
   - **Recent configurations** (last 5 used) - click any to run with that config
   - **"Run Configuration..."** - opens the full settings modal
3. The modal has 6 tabs for all Playwright options

### UI Layout
```
[▶ Run ▾]  ← Click the ▾ arrow
     │
     ├── Recent
     │   ├── ✓ Default (Local, chromium, 1 worker)
     │   ├── Debug Mode (Local, chromium, 1 worker)
     │   └── ...
     │
     └── ⚙ Run Configuration...  ← Opens modal
```

## Architecture Overview

### Components

```
frontend/src/
├── store/
│   └── runConfigStore.ts          # Zustand store for run configurations
├── components/
│   ├── ide/
│   │   ├── DebugToolbar.tsx       # Modified with RunButtonWithDropdown
│   │   └── RunConfigDropdown.tsx  # Split button with dropdown menu
│   └── RunConfig/
│       ├── index.ts               # Barrel exports
│       ├── RunConfigModal.tsx     # Main configuration modal
│       ├── GeneralTab.tsx         # Name, target, browser, baseURL
│       ├── ExecutionTab.tsx       # Headed, debug, workers, shards
│       ├── FilteringTab.tsx       # Grep, grep-invert, lastFailed
│       ├── TimeoutsTab.tsx        # Test timeout, global timeout, retries
│       ├── ArtifactsTab.tsx       # Trace, screenshot, video, reporters
│       └── AdvancedTab.tsx        # Viewport, locale, timezone, env vars
```

### State Management

The `runConfigStore` (Zustand) manages:
- All configurations (`configurations[]`)
- Recent configs (max 5) (`recentConfigs[]`)
- Active configuration (`activeConfigId`)
- UI state (`isDropdownOpen`, `isModalOpen`)

### Data Flow

```
User clicks dropdown arrow
        │
        ▼
RunConfigDropdown shows menu
        │
        ├── Select recent config → Runs with that config
        │
        └── Click "Configuration Settings..."
                    │
                    ▼
            RunConfigModal opens (tabs for all options)
                    │
                    ▼
            User edits & clicks "Save & Run"
                    │
                    ▼
            Store updates → Config marked as used → Execution starts
```

## Configuration Options Reference

### General Tab
| Option | Type | Description |
|--------|------|-------------|
| name | string | Configuration display name |
| target | 'local' \| 'github' | Where tests run |
| browser | 'chromium' \| 'firefox' \| 'webkit' | Browser engine |
| baseURL | string | Base URL for navigation |
| github.repository | string | GitHub repo (owner/repo) |
| github.branch | string | Branch to run against |
| github.workflowFile | string | Workflow YAML path |

### Execution Tab
| Option | Type | CLI Flag | Description |
|--------|------|----------|-------------|
| headed | boolean | --headed | Show browser window |
| debug | boolean | --debug | Enable Playwright Inspector |
| ui | boolean | --ui | Open Playwright UI Mode |
| workers | number | --workers | Parallel test workers |
| shards | {current, total} | --shard | Shard specification |
| project | string | --project | Run specific project |

### Filtering Tab
| Option | Type | CLI Flag | Description |
|--------|------|----------|-------------|
| grep | string | --grep | Regex to match test names |
| grepInvert | string | --grep-invert | Regex to exclude tests |
| lastFailed | boolean | --last-failed | Only run previously failed |

### Timeouts Tab
| Option | Type | CLI Flag | Description |
|--------|------|----------|-------------|
| timeout | number | --timeout | Test timeout (ms) |
| globalTimeout | number | --global-timeout | Total run timeout (ms) |
| retries | number | --retries | Retry count on failure |

### Artifacts Tab
| Option | Type | CLI Flag | Description |
|--------|------|----------|-------------|
| trace | enum | --trace | off, on, retain-on-failure, on-first-retry |
| screenshot | enum | --screenshot | off, on, only-on-failure |
| video | enum | --video | off, on, on-failure, retain-on-failure |
| reporter | string[] | --reporter | list, html, json, junit, allure |
| outputDir | string | --output | Artifacts directory |

### Advanced Tab
| Option | Type | Description |
|--------|------|-------------|
| viewport | {width, height} | Browser viewport size |
| locale | string | Browser locale (en-US, de-DE, etc.) |
| timezoneId | string | Timezone (America/New_York, etc.) |
| geolocation | {lat, lng} | Mock geolocation |
| envVars | Record<string, string> | Environment variables |

## Common Tasks

### Add a New Configuration Option

1. Add the field to `RunConfiguration` interface in `runConfigStore.ts`
2. Add to `DEFAULT_CONFIG` if needed
3. Add UI in the appropriate tab component
4. Update `configToPlaywrightArgs()` if it maps to CLI

### Modify Default Values

Edit `DEFAULT_CONFIG` in `runConfigStore.ts`:
```typescript
export const DEFAULT_CONFIG: Omit<RunConfiguration, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Default',
  target: 'local',
  browser: 'chromium',
  // ... other defaults
};
```

### Add a New Preset

Add to `PRESET_CONFIGS` in `runConfigStore.ts`:
```typescript
export const PRESET_CONFIGS = [
  // ... existing presets
  {
    ...DEFAULT_CONFIG,
    name: 'My New Preset',
    // override specific values
  },
];
```

### Convert Config to CLI Args

Use `configToPlaywrightArgs()` from the store:
```typescript
import { configToPlaywrightArgs } from '@/store/runConfigStore';

const args = configToPlaywrightArgs(config);
// Returns: ['--browser=chromium', '--workers=4', ...]
```

## UI Components

### RunConfigDropdown
Split button: [Run][▼]
- Left button runs with active config
- Arrow opens dropdown with recent + settings

### RunConfigModal
6-tab modal for full configuration:
- General, Execution, Filtering, Timeouts, Artifacts, Advanced

## Storage

Configs persist to localStorage via Zustand's `persist` middleware:
- Key: `run-config-storage`
- Partials: configurations, recentConfigs, activeConfigId

## Integration Points

- **VeroWorkspace**: Renders `<RunConfigModal />` for modal
- **DebugToolbar**: Uses `RunButtonWithDropdown` for run button
- **Header**: Legacy config dropdown (can be replaced)

## Future Enhancements

1. Backend API for storing configs in database
2. Sync configs across devices
3. Team-shared configurations
4. Config import/export (JSON)
5. GitHub Actions workflow generation
