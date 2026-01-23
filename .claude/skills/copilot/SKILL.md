# Copilot - AI Agent Expert Skill

Auto-invoke when working with copilot service, Stagehand integration, or AI test generation.

---

## Architecture Overview

```
User Message (Chat)
    ↓
[WebSocket] copilot:message
    ↓
CopilotAgentService.processUserMessage()
    ↓
┌─────────────────────────────────────────┐
│            STATE MACHINE                │
│                                         │
│  idle → analyzing → exploring/clarifying│
│              ↓                          │
│         generating → validating         │
│              ↓                          │
│         staging → awaiting_approval     │
│              ↓                          │
│         merging → complete              │
└─────────────────────────────────────────┘
    ↓
Staged Changes for Review
    ↓
User Approves → Merge
```

---

## Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `/backend/src/services/copilot/CopilotAgentService.ts` | 920 | Core state machine |
| `/backend/src/services/copilot/StagehandService.ts` | 553 | Browser exploration |
| `/backend/src/routes/copilot.routes.ts` | 379 | REST endpoints |
| `/backend/src/websocket/index.ts` | 692-850 | Real-time events |
| `/frontend/src/components/copilot/CopilotPanel.tsx` | 873 | Chat UI |
| `/frontend/src/components/copilot/AISettingsModal.tsx` | 400+ | LLM config |

---

## State Machine

### States

| State | Description |
|-------|-------------|
| `idle` | Waiting for user input |
| `analyzing` | Parsing user intent |
| `clarifying` | Asking follow-up questions |
| `exploring` | Browser automation running |
| `generating` | Creating Vero code |
| `validating` | Checking generated code |
| `staging` | Preparing changes for review |
| `awaiting_approval` | User reviewing changes |
| `merging` | Writing approved changes |
| `complete` | Task finished |
| `error` | Something went wrong |

### Transitions

```typescript
const STATE_TRANSITIONS = {
    idle: ['analyzing'],
    analyzing: ['clarifying', 'exploring', 'generating', 'error'],
    clarifying: ['analyzing', 'exploring', 'error'],
    exploring: ['generating', 'error'],
    generating: ['validating', 'error'],
    validating: ['staging', 'generating', 'error'],
    staging: ['awaiting_approval', 'error'],
    awaiting_approval: ['merging', 'reflecting', 'error'],
    reflecting: ['generating', 'error'],
    merging: ['complete', 'error'],
    complete: ['idle'],
    error: ['idle']
};
```

---

## Stagehand Browser Exploration

### Multi-Provider LLM Support

```typescript
interface AISettings {
    provider: 'gemini' | 'openai' | 'anthropic';

    // Gemini
    geminiApiKey?: string;
    geminiModel?: 'gemini-2.0-flash' | 'gemini-2.5-pro' | 'gemini-1.5-pro';

    // OpenAI
    openaiApiKey?: string;
    openaiModel?: 'gpt-4o' | 'gpt-4-turbo' | 'gpt-3.5-turbo';

    // Anthropic
    anthropicApiKey?: string;
    anthropicModel?: 'claude-sonnet-4-20250514' | 'claude-3-5-sonnet' | 'claude-3-opus';

    // Browserbase (cloud browser)
    useBrowserbase?: boolean;
    browserbaseApiKey?: string;

    // Stagehand options
    stagehandHeadless?: boolean;
    stagehandDebug?: boolean;
}
```

### Core Methods

```typescript
class StagehandService {
    // Initialize with user's AI settings
    async initialize(settings: AISettings): Promise<void>;

    // Navigate and analyze page
    async explorePage(url: string): Promise<PageExploration>;

    // AI-powered element discovery
    async observe(): Promise<DiscoveredElement[]>;

    // Execute action with self-healing
    async act(instruction: string): Promise<ActionResult>;

    // Extract structured data
    async extract<T>(
        instruction: string,
        schema: z.ZodSchema<T>
    ): Promise<T>;

    // Convert element to Vero selector
    generateVeroSelector(element: DiscoveredElement): string;
}
```

### Page Exploration Result

```typescript
interface PageExploration {
    url: string;
    title: string;
    screenshot: string;  // base64

    structure: {
        forms: FormElement[];
        buttons: ButtonElement[];
        inputs: InputElement[];
        links: LinkElement[];
        navigation: NavigationElement[];
    };

    discoveredElements: DiscoveredElement[];
}

interface DiscoveredElement {
    selector: string;
    selectorType: 'testId' | 'role' | 'label' | 'text' | 'css';
    confidence: number;  // 0-100
    elementType: string;
    text?: string;
    attributes: Record<string, string>;
}
```

---

## Staged Changes Workflow

### Change Model

```typescript
interface CopilotStagedChange {
    id: string;
    sessionId: string;
    filePath: string;           // "pages/LoginPage.page.vero"
    changeType: 'create' | 'modify' | 'delete';
    originalContent?: string;   // For diffs
    newContent: string;
    reasoningJson: string;      // Why this change
    status: 'pending' | 'approved' | 'rejected' | 'modified';
    userFeedback?: string;      // If rejected
    order: number;              // Execution order
}
```

### Approval Flow

```typescript
// Stage changes
await copilotService.stageChanges([
    {
        filePath: "pages/LoginPage.page.vero",
        changeType: "create",
        newContent: "PAGE LoginPage { ... }",
        reasoning: "Created page object for login form elements"
    },
    {
        filePath: "features/LoginTest.feature.vero",
        changeType: "create",
        newContent: "FEATURE LoginTest { ... }",
        reasoning: "Created test scenario for user login"
    }
]);

// User approves
await copilotService.approveChange(changeId);
// or
await copilotService.rejectChange(changeId, "Need different selectors");

// Merge when all approved
await copilotService.mergeApprovedChanges();
```

---

## Clarification System

### Clarification Request

```typescript
interface ClarificationRequest {
    id: string;
    question: string;
    type: 'selector' | 'action' | 'info' | 'confirmation';
    options?: string[];  // Pre-defined choices
}

// Example
{
    question: "Which login form should I use?",
    type: "selector",
    options: [
        "Main login (top right)",
        "Modal login (popup)",
        "Social login buttons"
    ]
}
```

### Clarification Flow

```typescript
// Agent requests clarification
transitionTo('clarifying');
emit('copilot:clarification', {
    sessionId,
    clarification: {
        id: 'clr_123',
        question: 'What browser should I test with?',
        options: ['Chrome', 'Firefox', 'All browsers']
    }
});

// User responds
socket.emit('copilot:clarify', {
    sessionId,
    clarificationId: 'clr_123',
    response: 'Chrome'
});

// Agent continues
transitionTo('analyzing');
await processWithClarification(response);
```

---

## Code Generation

### From Exploration to Vero

```typescript
async generateCodeFromExploration(exploration: PageExploration) {
    // 1. Infer page name from URL
    const pageName = inferPageName(exploration.url);
    // "/login" → "LoginPage"

    // 2. Build PAGE object
    const pageFields = exploration.structure.inputs.map(input => ({
        name: generateFieldName(input),
        selector: generateVeroSelector(input)
    }));

    const pageCode = `
PAGE ${pageName} {
    ${pageFields.map(f => `FIELD ${f.name} = ${f.selector}`).join('\n    ')}
}`;

    // 3. Build FEATURE with SCENARIO
    const featureCode = `
FEATURE ${pageName.replace('Page', 'Test')} {
    USE ${pageName}

    SCENARIO UserCanInteractWith${pageName} {
        OPEN "${exploration.url}"
        ${generateTestSteps(exploration)}
    }
}`;

    // 4. Stage changes
    await stageChanges([
        { filePath: `pages/${pageName}.page.vero`, newContent: pageCode },
        { filePath: `features/${pageName}Test.feature.vero`, newContent: featureCode }
    ]);
}
```

---

## WebSocket Events

### Client → Server

| Event | Payload | Purpose |
|-------|---------|---------|
| `copilot:join` | `{ sessionId }` | Join session room |
| `copilot:message` | `{ sessionId, content }` | Send message |
| `copilot:clarify` | `{ sessionId, clarificationId, response }` | Answer clarification |
| `copilot:approve` | `{ sessionId, changeId }` | Approve change |
| `copilot:reject` | `{ sessionId, changeId, feedback }` | Reject change |
| `copilot:approve-all` | `{ sessionId }` | Approve all |
| `copilot:reset` | `{ sessionId }` | Clear conversation |

### Server → Client

| Event | When | Payload |
|-------|------|---------|
| `copilot:state` | State change | `{ state, errorMessage? }` |
| `copilot:thinking` | Processing | `{ message }` |
| `copilot:message` | Response | Full Message object |
| `copilot:clarification` | Need input | ClarificationRequest |
| `copilot:exploration` | Browser exploring | `{ status, screenshot?, elements? }` |
| `copilot:staged` | Changes ready | `{ changeIds }` |
| `copilot:merged` | All approved | `{ changes }` |
| `copilot:error` | Error occurred | `{ error }` |

---

## Database Models

```prisma
model CopilotSession {
    id                String   @id
    userId            String
    projectId         String
    state             String   @default("idle")
    conversationJson  Json     // Message[]
    currentTaskJson   Json?    // AgentTask
    reflectionCount   Int      @default(0)
    errorMessage      String?
    stagedChanges     CopilotStagedChange[]
    explorations      CopilotExploration[]
}

model CopilotExploration {
    id              String   @id
    sessionId       String
    targetUrl       String
    status          String   // running | completed | failed
    resultsJson     Json     // DiscoveredElement[]
    screenshotsJson Json     // base64 images
    stagehandLogJson Json    // Action logs
}

model CopilotLearnedSelector {
    id                  String   @id
    elementDescription  String   // "Login button"
    primarySelector     String
    fallbacksJson       Json
    usageCount          Int      @default(0)
}

model AISettings {
    id                  String   @id
    userId              String   @unique
    provider            String   @default("gemini")
    geminiApiKey        String?
    geminiModel         String?
    openaiApiKey        String?
    openaiModel         String?
    anthropicApiKey     String?
    anthropicModel      String?
    useBrowserbase      Boolean  @default(false)
    browserbaseApiKey   String?
    stagehandHeadless   Boolean  @default(true)
    stagehandDebug      Boolean  @default(false)
}
```

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/copilot/sessions` | Create session |
| GET | `/api/copilot/sessions/:id` | Get session |
| DELETE | `/api/copilot/sessions/:id` | Delete session |
| GET | `/api/copilot/sessions/:id/changes` | Get staged changes |
| POST | `/api/copilot/sessions/:id/changes/:changeId/approve` | Approve |
| POST | `/api/copilot/sessions/:id/changes/:changeId/reject` | Reject |
| POST | `/api/copilot/sessions/:id/merge` | Merge all |
| GET | `/api/copilot/ai-settings` | Get AI config |
| PUT | `/api/copilot/ai-settings` | Update AI config |

---

## Common Tasks

### Adding New LLM Provider

1. Update `AISettings` model in schema
2. Update `/backend/src/services/copilot/StagehandService.ts`:
   - Add provider initialization
   - Configure model options

3. Update frontend `AISettingsModal.tsx`

### Modifying State Machine

Update `/backend/src/services/copilot/CopilotAgentService.ts`:
- Add state to `CopilotState` enum
- Update `STATE_TRANSITIONS` map
- Implement state handler method

### Improving Code Generation

Update `generateCodeFromExploration()`:
- Enhance selector priority
- Add more test step patterns
- Improve page/feature naming

---

## Gotchas

1. **State Transitions**: Only allowed transitions are valid. Check `STATE_TRANSITIONS`.
2. **Reflection Limit**: Max 5 reflections before giving up (`maxReflections`).
3. **File Writing**: Changes stored in DB only, not written to disk yet (TODO).
4. **LLM Calls**: Stagehand handles retries internally.
5. **Screenshot Size**: Base64 images can be large - consider compression.
6. **Session Persistence**: Conversations survive server restarts via DB.
