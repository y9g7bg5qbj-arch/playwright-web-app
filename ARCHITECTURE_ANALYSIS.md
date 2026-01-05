# Architecture Analysis & Implementation Plan
## Smart Web-Based IDE for Playwright with Vero DSL

**Date:** 2025-12-31
**Analyzed by:** Claude Sonnet 4.5 Test Automation Architect

---

## Executive Summary

You've built an impressive foundation for a **smart web-based IDE for Playwright test automation** with the **Vero DSL** language. The system has:

✅ **Vero Language** - Plain-English DSL that transpiles to Playwright
✅ **Web IDE** - React frontend with Monaco editor
✅ **Backend API** - Express + Prisma + WebSocket
✅ **AI Agent** - Python-based generator using LLMs (Gemini/Claude/OpenAI)
✅ **Retry System** - Self-healing test execution (up to 20 retries)
✅ **Page Object Pattern** - Smart selector management and reuse

---

## Current System Architecture

### 1. **Vero Language Layer**
```
vero-lang/
├── grammar/Vero.g4         # ANTLR4 grammar definition
├── src/
│   ├── parser/             # AST and parser
│   ├── transpiler/         # Vero → Playwright transpiler
│   └── cli/                # CLI tool (vero compile, vero run)
└── test-project/
    ├── pages/              # Page objects (.vero files)
    └── features/           # Test scenarios (.vero files)
```

**Key Features:**
- **Case-insensitive** grammar
- **Page Object pattern** built-in (field declarations + action methods)
- **Feature/Scenario** structure (BDD-style)
- **Smart selectors** - Text, CSS, test IDs, roles
- Transpiles to **TypeScript + Playwright**

**Example:**
```vero
page LoginPage {
    field emailInput = "Email"
    field passwordInput = "Password"
    field submitBtn = "Sign In"
}

feature Login {
    use LoginPage

    scenario "Valid login" {
        fill LoginPage.emailInput with "test@example.com"
        fill LoginPage.passwordInput with "secret"
        click LoginPage.submitBtn
        verify "Dashboard" is visible
    }
}
```

---

### 2. **AI Agent Layer** (vero-agent/)

**Technology:** Python + FastAPI + LangChain

**Components:**

#### A. **VeroGenerator** (`vero_generator.py`)
- Converts **plain English → Vero DSL**
- LLM-aware of existing Page objects
- Prompts AI to reuse existing selectors
- Supports Gemini, Claude, OpenAI, Ollama

#### B. **SelectorResolver** (`selector_resolver.py`)
- **Codebase-aware**: Parses all `.vero` files to extract existing Pages
- **Smart reuse**: Finds matching selectors before creating new ones
- **AI-powered discovery**: Uses browser-use + Gemini computer vision
- **Coordinate → Selector bridge**: Gemini clicks → Playwright selector

#### C. **RetryExecutor** (`retry_executor.py`)
- **Self-healing**: Runs test, analyzes errors, fixes with AI
- **Max 20 retries** (configurable)
- **Error patterns**: Selector not found, timeout, wrong text, etc.
- **Healing strategy**: LLM analyzes error + fixes Vero code

#### D. **SelectorBridge** (`selector_bridge.py`)
- **Hybrid approach**: Gemini Computer Use (visual) → Playwright (code)
- `element_at_coordinates(page, x, y)` - DOM inspection at click point
- `generate_playwright_selector(info)` - Best-practice selector generation
  - Priority: testId > role > label > placeholder > text > CSS
- `selector_to_vero()` - Convert Playwright → Vero field syntax

**API Endpoints:**
```
POST /api/generate          # Plain English → Vero code
POST /api/run               # Run Vero with self-healing
POST /api/generate-and-run  # Combined workflow
```

---

### 3. **Backend Layer** (backend/)

**Technology:** Node.js + Express + Prisma + Socket.IO

**Database Schema (Prisma):**
```
users
workflows
test_flows (stores Vero code)
executions
execution_logs
agents (local desktop agents)
schedules (for scheduling)
```

**Key Services:**
- `veroTranspiler.ts` - Transpiles Vero → Playwright
- `execution.service.ts` - Test execution management
- `schedule.service.ts` - Scheduling system
- `playwright.service.ts` - Playwright runner integration
- `flowExecutor.ts` - Visual flow execution engine

---

### 4. **Frontend Layer** (frontend/)

**Technology:** React + Vite + Monaco Editor + TailwindCSS + Zustand

**Key Components:**
- `UnifiedIDE.tsx` - Main IDE interface
- `VeroIDE.tsx` - Vero-specific IDE
- `PlaywrightIDE.tsx` - Playwright code editor
- `IDEFlowCanvas.tsx` - Visual flow builder (React Flow)
- `ExecutionReportPage.tsx` - Results viewer
- `ExecutionHistoryPage.tsx` - Test history

---

## Gap Analysis & Requirements

### What You Need

Based on your requirements, here's what needs to be enhanced:

#### 1. ✅ **Vero Language** - COMPLETE
- Already has grammar, transpiler, parser

#### 2. ⚠️ **AI Test Generation** - NEEDS ENHANCEMENT
**Current:**
- Basic LLM integration
- Simple selector resolution

**Needed:**
- **Gemini 2.0 Flash Thinking** with computer use
- **Headless mode** support
- **20-retry flow** with better error handling
- **Visual element detection** → Playwright selector pipeline
- **Automatic page object updates** (add new fields to .vero files)

#### 3. ⚠️ **Web IDE** - NEEDS FEATURES
**Current:**
- Monaco editor integration
- Basic UI

**Needed:**
- **Live preview** of test execution
- **Trace viewer** integration (Playwright traces)
- **Screenshot viewer**
- **Debug mode** with breakpoints
- **Test scenario library**

#### 4. ⚠️ **Test Execution** - NEEDS ENHANCEMENT
**Current:**
- Basic execution service
- WebSocket logs

**Needed:**
- **Parallel execution** across multiple agents
- **Headless/headed toggle**
- **Video recording** option
- **Trace generation** for debugging
- **Test suite execution** (multiple scenarios)

#### 5. ⚠️ **Scheduling** - NEEDS IMPLEMENTATION
**Current:**
- Schema exists, routes partially implemented

**Needed:**
- **Cron-based scheduling**
- **Recurring test runs**
- **Email notifications**
- **Slack/webhook integrations**

#### 6. ⚠️ **Reporting** - NEEDS ENHANCEMENT
**Current:**
- Basic execution logs
- History page

**Needed:**
- **HTML reports** (like Playwright HTML reporter)
- **Test metrics** (pass rate, duration trends)
- **Trace viewer UI** (integrated Playwright trace viewer)
- **Screenshot comparison**
- **Flaky test detection**

#### 7. ❌ **Chrome Extension** - NOT STARTED
**Needed:**
- **Chrome extension** for testing the web IDE itself
- Integration with Claude Code for testing

---

## Enhanced Architecture Design

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    WEB IDE (React)                          │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Vero Editor │  │ Trace Viewer │  │  Reports     │      │
│  └─────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────────┬────────────────────────────────┘
                             │ WebSocket + REST API
┌────────────────────────────┴────────────────────────────────┐
│                    BACKEND (Node.js)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Vero Trans-  │  │  Execution   │  │  Scheduler   │     │
│  │  piler       │  │   Engine     │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP API
┌────────────────────────────┴────────────────────────────────┐
│              VERO AI AGENT (Python)                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Gemini 2.0 Flash Thinking + Computer Use          │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Selector   │  │    Retry     │  │    Vero      │     │
│  │  Resolver    │  │  Executor    │  │  Generator   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────────┬────────────────────────────────┘
                             │ Playwright + Browser Control
┌────────────────────────────┴────────────────────────────────┐
│                   BROWSER (Headless/Headed)                 │
│         Chromium / Firefox / WebKit                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Enhanced AI Agent (CRITICAL)

**Goal:** Robust AI test generation with Gemini computer use

**Tasks:**
1. Upgrade to **Gemini 2.0 Flash Thinking**
2. Implement **headless mode** toggle
3. Enhance **selector detection** pipeline:
   - Gemini identifies element visually
   - Get coordinates
   - Use `element_at_coordinates()` to extract DOM info
   - Generate best Playwright selector
   - Convert to Vero field syntax
4. **Auto-update .vero files** with new selectors
5. **Improve retry logic**:
   - Better error pattern matching
   - Smarter healing strategies
   - Progress tracking per attempt

**Acceptance Criteria:**
- ✅ User describes test in plain English
- ✅ AI generates Vero code with proper Page objects
- ✅ Selectors stored in pages/ directory
- ✅ Scenarios reference page fields (no raw selectors)
- ✅ Retries up to 20 times with self-healing
- ✅ Works in headless mode

---

### Phase 2: Test Execution & Reporting

**Goal:** Professional test execution and reporting

**Tasks:**
1. **Execution Engine Enhancement:**
   - Parallel test execution
   - Headless/headed mode
   - Video recording toggle
   - Trace generation (`.zip` files)
   - Screenshot capture

2. **Trace Viewer Integration:**
   - Embed Playwright trace viewer in frontend
   - Upload/download trace files
   - Step-by-step debugging

3. **Reporting System:**
   - HTML report generation
   - Test metrics dashboard
   - Flaky test detection
   - Historical trends

**Acceptance Criteria:**
- ✅ Tests run with traces enabled
- ✅ Trace viewer accessible from web IDE
- ✅ HTML reports generated automatically
- ✅ Screenshots attached to test results

---

### Phase 3: Scheduling & Notifications

**Goal:** Automated test execution

**Tasks:**
1. **Scheduler Implementation:**
   - Cron expression parser
   - Recurring test runs
   - Queue management
   - Retry failed schedules

2. **Notifications:**
   - Email alerts (test passed/failed)
   - Slack webhooks
   - Custom webhook support

**Acceptance Criteria:**
- ✅ Schedule tests via cron expressions
- ✅ Receive email on test failure
- ✅ Slack notification on completion

---

### Phase 4: Chrome Extension & Testing

**Goal:** Test the IDE itself using Claude Code

**Tasks:**
1. Create Chrome extension for IDE testing
2. Integrate with Claude Code
3. E2E test suite for the web IDE
4. CI/CD integration

**Acceptance Criteria:**
- ✅ Chrome extension installed
- ✅ Can test IDE features automatically
- ✅ Tests run in CI/CD pipeline

---

## Agent Delegation Plan

### Specialized Agents

I'll create specialized agents with clear responsibilities:

#### **Agent 1: AI Enhancement Specialist** (Opus)
**Role:** Enhance vero-agent with Gemini 2.0 Flash Thinking
**Tasks:**
- Upgrade LLM integration
- Implement headless mode
- Enhance selector resolution
- Improve retry executor
- Auto-update .vero files

**Model:** Opus (complex reasoning required)

---

#### **Agent 2: Backend Engineer** (Sonnet)
**Role:** Enhance backend services
**Tasks:**
- Improve execution service
- Add trace generation
- Enhance WebSocket events
- Implement parallel execution
- Add video recording

**Model:** Sonnet (balanced)

---

#### **Agent 3: Frontend Developer** (Sonnet)
**Role:** Build IDE features
**Tasks:**
- Integrate trace viewer
- Build reporting dashboard
- Add test execution controls
- Enhance Monaco editor features
- Create screenshot viewer

**Model:** Sonnet (balanced)

---

#### **Agent 4: Scheduler Engineer** (Sonnet)
**Role:** Implement scheduling
**Tasks:**
- Build cron scheduler
- Create notification system
- Queue management
- Retry logic for schedules

**Model:** Sonnet (balanced)

---

#### **Agent 5: QA & Testing** (Sonnet)
**Role:** Build Chrome extension and test suite
**Tasks:**
- Create Chrome extension
- E2E test suite
- Integration tests
- CI/CD setup

**Model:** Sonnet (balanced)

---

## Architecture Improvements

### 1. **Gemini Computer Use Flow**

```
User Input: "Click login, fill email test@example.com, click submit"
                          ↓
              ┌───────────────────────┐
              │  Gemini 2.0 Flash     │
              │  (Computer Use)       │
              └───────────┬───────────┘
                          ↓
              Navigate to URL (headless)
                          ↓
              For each action:
                          ↓
              ┌───────────────────────┐
              │  Gemini identifies    │
              │  element visually     │
              │  Returns: (x, y)      │
              └───────────┬───────────┘
                          ↓
              ┌───────────────────────┐
              │  element_at_coords    │
              │  Extract DOM info     │
              └───────────┬───────────┘
                          ↓
              ┌───────────────────────┐
              │  generate_pw_selector │
              │  Best-practice        │
              │  selector             │
              └───────────┬───────────┘
                          ↓
              ┌───────────────────────┐
              │  Check existing pages │
              │  Reuse or create new  │
              └───────────┬───────────┘
                          ↓
              ┌───────────────────────┐
              │  Update .vero file    │
              │  Add field to Page    │
              └───────────┬───────────┘
                          ↓
              Generate Vero scenario
                          ↓
              ┌───────────────────────┐
              │  RetryExecutor        │
              │  Run with healing     │
              │  (max 20 retries)     │
              └───────────────────────┘
```

### 2. **Page Object Auto-Update**

When AI generates new selectors:

```python
# BEFORE (existing)
page LoginPage {
    field emailInput = "Email"
    field passwordInput = "Password"
}

# NEW SELECTOR DISCOVERED
AI finds: submitBtn at coordinates (500, 300)
Selector: getByRole("button", { name: "Sign In" })

# AFTER (auto-updated)
page LoginPage {
    field emailInput = "Email"
    field passwordInput = "Password"
    field submitBtn = "Sign In"  # ← ADDED AUTOMATICALLY
}
```

### 3. **Retry with Healing**

```
Attempt 1: Run test
  └→ FAIL: Selector "Login Button" not found
      ↓
  AI Analysis: Element text might have changed
      ↓
  AI Fix: Update selector to "Sign In"
      ↓
Attempt 2: Run test
  └→ FAIL: Element not visible (timeout)
      ↓
  AI Analysis: Page might need to load first
      ↓
  AI Fix: Add "wait 2 seconds" before click
      ↓
Attempt 3: Run test
  └→ SUCCESS ✓
```

---

## Technology Stack Recommendations

### For Gemini Computer Use
```python
# vero-agent requirements
google-genai>=0.4.0        # Gemini 2.0 Flash Thinking
playwright>=1.40.0         # Browser automation
browser-use>=1.0.0         # AI browser automation
langchain>=0.1.0           # LLM orchestration
fastapi>=0.100.0           # API server
```

### For Trace Viewer
```typescript
// frontend
@playwright/test>=1.40.0   // Trace viewer component
```

### For Scheduling
```typescript
// backend
node-cron                  // Cron scheduling
bull                       // Job queue (optional)
```

---

## Next Steps

1. **Approve this architecture plan**
2. **I will spawn 5 specialized agents** to work in parallel:
   - AI Enhancement Specialist (Opus)
   - Backend Engineer (Sonnet)
   - Frontend Developer (Sonnet)
   - Scheduler Engineer (Sonnet)
   - QA Engineer (Sonnet)
3. **Each agent will:**
   - Implement their assigned tasks
   - Report progress
   - Hand over results with testing evidence
4. **I will coordinate** agents and ensure integration
5. **Final handover** with comprehensive testing via Chrome extension

---

## Questions to Clarify

Before I delegate tasks, please confirm:

1. **LLM Provider**: Gemini 2.0 Flash Thinking? (you mentioned Gemini 3 computer use - did you mean Gemini 2.0 Flash?)
2. **Headless by default?** Or user toggle?
3. **Trace storage**: Local filesystem or cloud (S3, etc.)?
4. **Email provider**: SendGrid, AWS SES, SMTP?
5. **Priority**: Which phase should we tackle first?

Let me know, and I'll immediately spawn the agent swarm!
