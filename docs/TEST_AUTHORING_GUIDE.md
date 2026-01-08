# Test Authoring Guide

This guide covers the three methods for authoring tests in Vero IDE:

1. **Manual** - Write Vero DSL directly
2. **Recording** - Playwright codegen with automatic Vero conversion
3. **AI Agent** - Plain English to Vero DSL generation

## Overview

Vero IDE supports multiple authoring workflows to accommodate different user preferences and experience levels:

```
┌─────────────────────────────────────────────────────────────────┐
│                      AUTHORING OPTIONS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Manual ──────▶ Write Vero Script directly in CodeMirror 6     │
│                                                                 │
│  Recording ───▶ Playwright codegen ──▶ Vero Script             │
│                 (codebase-aware, editable after)                │
│                                                                 │
│  AI Agent ────▶ Plain English ──▶ AI creates Vero Script       │
│                 (Claude/Gemini API, user reviews before save)   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Manual Authoring

Write Vero DSL directly using the visual flow editor or code view.

### Using the Visual Flow Editor

1. Open a test flow from the Project Sidebar
2. Drag action blocks from the toolbox to the canvas
3. Configure each action in the Properties Panel
4. Connect blocks using edges

### Using Code View

1. Click the "Code" toggle in the toolbar
2. View the generated Playwright/Vero code
3. The code is read-only (source of truth is the visual flow)

### Vero DSL Syntax

```vero
# Navigation
navigate to "https://example.com"

# Actions
click "Login" button
fill "Username" with "admin"
fill "Password" with "${password}"
select "Country" option "USA"
check "Remember me"

# Assertions
assert "Welcome" is visible
assert url contains "/dashboard"

# Waits
wait 2 seconds
wait for "Dashboard" to be visible
```

See [VERO_GRAMMAR_REFERENCE.md](./VERO_GRAMMAR_REFERENCE.md) for complete syntax.

---

## 2. Recording Mode

Record browser interactions that automatically convert to Vero DSL.

### Starting a Recording

1. Open a test flow
2. Click the **Record** button in the toolbar
3. A new browser window opens with Playwright codegen
4. Interact with your application
5. Click **Stop Recording** when done

### How It Works

```
Browser Recording → Playwright Codegen → Vero DSL → Flow Nodes
```

The recording pipeline:
1. **Playwright Codegen** captures browser interactions
2. **Code Parser** converts Playwright JS to AST
3. **Vero Converter** transforms actions to Vero DSL syntax
4. **Flow Generator** creates visual nodes from Vero

### Supported Actions

| Browser Action | Vero Output |
|---------------|-------------|
| Page navigation | `navigate to "url"` |
| Button click | `click "button text"` |
| Text input | `fill "field label" with "value"` |
| Dropdown selection | `select "dropdown" option "value"` |
| Checkbox toggle | `check "checkbox label"` |
| Hover action | `hover over "element"` |

### Post-Recording Editing

After recording:
1. Review generated flow nodes
2. Edit action labels and selectors
3. Add assertions and waits
4. Save the test flow

---

## 3. AI Agent (Plain English to Vero)

Convert natural language test descriptions to Vero DSL using AI.

### Opening the AI Panel

1. Open a test flow
2. Click the **AI Agent** button in the toolbar
3. The AI panel opens on the right side

### Generating Tests

1. **Enter Target URL** (optional): Base URL for the test
2. **Enter Test Steps**: Plain English description of your test
3. Click **Generate Vero Code**
4. Review the generated code
5. Click **Insert** to add to your flow

### Example Prompts

Good prompts are specific and action-oriented:

```
Navigate to the login page
Fill the email field with test@example.com
Fill the password field with secret123
Click the Login button
Wait for the dashboard to load
Verify that the welcome message is visible
```

### Settings

- **Use AI**: Toggle AI generation (requires API key)
- **Stream Progress**: Show real-time generation updates
- **Feature Name**: Name for the generated feature
- **Scenario Name**: Name for the generated scenario

### Generation History

The AI panel maintains a history of your generations:
- Click the **History** icon to view past generations
- Click any entry to reload it
- Delete entries you no longer need

### API Configuration

The AI Agent requires a running vero-agent service:

```bash
cd vero-agent
uvicorn src.main:app --port 5001
```

Configure LLM provider in `vero-agent/.env`:

```env
# Recommended: Gemini 2.0 Flash
LLM_PROVIDER=gemini
GEMINI_API_KEY=your-key-here

# Alternative: Claude 3.5 Sonnet
# LLM_PROVIDER=claude
# ANTHROPIC_API_KEY=your-key-here

# Alternative: OpenAI GPT-4
# LLM_PROVIDER=openai
# OPENAI_API_KEY=your-key-here
```

---

## API Reference

### AI Generation Endpoints

#### Generate Vero Code

```http
POST /api/vero/agent/generate
Authorization: Bearer <token>
Content-Type: application/json

{
    "steps": "Navigate to login\nFill email with test@test.com",
    "url": "https://example.com",
    "featureName": "LoginFeature",
    "scenarioName": "Login Test",
    "useAi": true
}

Response:
{
    "success": true,
    "veroCode": "feature LoginFeature\n\nscenario \"Login Test\"\n    navigate to \"https://example.com\"\n    fill \"email\" with \"test@test.com\"\nend",
    "newPages": {},
    "message": "Generated successfully"
}
```

#### Streaming Generation

```http
POST /api/vero/agent/generate-stream
Authorization: Bearer <token>
Content-Type: application/json

{
    "steps": "Test steps here",
    "useAi": true
}

Response: Server-Sent Events
event: start
data: {"message": "Starting generation...", "timestamp": 1234567890}

event: progress
data: {"step": "parsing", "message": "Parsing English steps..."}

event: progress
data: {"step": "generating", "message": "Generating Vero code with AI..."}

event: result
data: {"success": true, "veroCode": "..."}

event: end
data: {"timestamp": 1234567891}
```

#### Run with Self-Healing

```http
POST /api/vero/agent/run
Authorization: Bearer <token>
Content-Type: application/json

{
    "veroCode": "navigate to \"/\"\nclick \"Login\"",
    "maxRetries": 20
}

Response:
{
    "success": true,
    "finalCode": "...",
    "attempts": 3,
    "message": "Test passed after 3 attempts"
}
```

#### Check Agent Health

```http
GET /api/vero/agent/health
Authorization: Bearer <token>

Response:
{
    "success": true,
    "agentStatus": "healthy",
    "llmProvider": "Gemini 2.0 Flash",
    "existingPages": 5
}
```

#### Generation History

```http
GET /api/vero/agent/history
Authorization: Bearer <token>

Response:
{
    "success": true,
    "history": [
        {
            "id": "uuid",
            "steps": "...",
            "generatedCode": "...",
            "featureName": "...",
            "scenarioName": "...",
            "createdAt": "2024-01-15T10:30:00Z"
        }
    ]
}

POST /api/vero/agent/history
{
    "steps": "...",
    "generatedCode": "...",
    "featureName": "...",
    "scenarioName": "..."
}

DELETE /api/vero/agent/history/:entryId
```

---

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
│  ┌───────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │PlaywrightIDE  │  │AIAgentPanel  │  │ Flow Editor / Canvas  │ │
│  │               │──│              │──│                       │ │
│  └───────────────┘  └──────────────┘  └───────────────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Backend                                  │
│  ┌───────────────┐  ┌──────────────────────────────────────────┐│
│  │ vero.routes   │  │              AgentService                 ││
│  │ /agent/*      │──│  - generateVeroCode()                    ││
│  │               │  │  - checkAgentHealth()                    ││
│  └───────┬───────┘  │  - buildContext()                        ││
│          │          │  - caching & history                      ││
│          │          └──────────────────────────────────────────┘│
└──────────┼──────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Vero Agent (Python)                           │
│  ┌──────────────────┐  ┌────────────────┐  ┌──────────────────┐ │
│  │  VeroGenerator   │  │SelectorResolver│  │  RetryExecutor   │ │
│  │  - AI generation │──│  - Page aware  │──│  - Self-healing  │ │
│  │  - Pattern match │  │  - Reuse exist │  │  - Visual repair │ │
│  └──────────────────┘  └────────────────┘  └──────────────────┘ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │                    LLM Providers                              ││
│  │  Gemini 2.0 Flash │ Claude 3.5 Sonnet │ GPT-4o │ Ollama     ││
│  └──────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Input** → Plain English test steps
2. **Frontend** → API call to `/api/vero/agent/generate`
3. **Backend** → Proxy to vero-agent Python service
4. **Vero Agent** → AI-powered code generation
5. **Response** → Generated Vero DSL
6. **Frontend** → Display code, allow insert into flow

---

## Troubleshooting

### AI Agent Not Available

Error: "Vero Agent not available"

**Solution:**
```bash
cd vero-agent
uvicorn src.main:app --port 5001
```

### LLM API Errors

Error: "LLM API error"

**Check:**
1. API key is set in `.env`
2. API key has sufficient credits
3. Network connectivity to API endpoint

### Generation Failures

If AI generates incorrect code:

1. Try more specific prompts
2. Break complex tests into smaller steps
3. Use the self-healing run feature to auto-fix selectors

### Cache Issues

If you're seeing stale results:

```typescript
// Clear cache via API (admin only)
agentService.clearCache();
```

---

## Best Practices

### Writing Good Prompts

1. **Be specific**: "Click the blue Login button" vs "Click Login"
2. **Use actual labels**: Reference field labels from your app
3. **One action per line**: Makes parsing more reliable
4. **Include waits**: "Wait for the dashboard to load"

### Organizing Tests

1. Use meaningful feature/scenario names
2. Group related tests in the same feature
3. Create reusable page objects for common elements
4. Use variables for test data

### Performance Tips

1. Enable caching for repeated generations
2. Use streaming for long generations
3. Pre-warm the AI by checking health on load
4. Batch similar tests together

---

## Next Steps

- [VERO_GRAMMAR_REFERENCE.md](./VERO_GRAMMAR_REFERENCE.md) - Complete DSL syntax
- [API.md](./API.md) - Full API documentation
- [GETTING_STARTED.md](./GETTING_STARTED.md) - Initial setup guide
