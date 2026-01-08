# Recording - Codegen & Selector Expert Skill

Auto-invoke when working with recording service, codegen, selector generation, or page object registry.

---

## Architecture Overview

```
User Browser Session
         ↓
Playwright Codegen (spawned process)
         ↓
Real-time code file watcher (500ms polling)
         ↓
Playwright Code Parser (extracts actions)
         ↓
Vero Script Converter
         ↓
Page Object Registry (codebase-aware)
         ↓
Database Persistence (RecordingSession/RecordingStep)
         ↓
Frontend (WebSocket/HTTP polling)
         ↓
IDE Editor (live update)
```

---

## Key Files

| File | Purpose |
|------|---------|
| `/backend/src/services/codegenRecorder.service.ts` | Main orchestrator - spawns codegen, parses output, converts to Vero |
| `/backend/src/services/pageObjectRegistry.ts` | Page object management - loads existing, detects duplicates, creates new |
| `/backend/src/services/selectorHealing/selectorGenerator.ts` | Generates resilient selectors with fallbacks |
| `/backend/src/services/selectorHealing/types.ts` | Selector type definitions |
| `/backend/src/services/recordingPersistence.service.ts` | DB persistence for sessions and steps |
| `/backend/src/routes/recorder.routes.ts` | HTTP endpoints |

---

## Recording Flow

### 1. Start Recording

```typescript
// codegenRecorder.service.ts - startRecording()
const codegenProcess = spawn('npx', [
    'playwright',
    'codegen',
    '--target', 'javascript',
    '--output', outputFile,
    url
]);
```

### 2. File Polling (500ms)

```typescript
const pollInterval = setInterval(async () => {
    const currentCode = await readFile(outputFile, 'utf-8');
    if (currentCode !== currentSession.lastCode) {
        await this.processCodeChanges(currentSession, currentCode, onAction);
    }
}, 500);
```

### 3. Parse Playwright Code → Actions

```typescript
// Regex-based parsing of Playwright code lines
// Extracts: click(), fill(), select(), expect(), etc.

// Example:
// await page.getByRole('button', { name: 'Submit' }).click()
// → { type: 'click', selector: 'button "Submit"' }
```

### 4. Convert to Vero Script

```typescript
// For each action:
// 1. Check if selector exists in registry
// 2. If found: reuse existing field reference
// 3. If not found:
//    a. Check for duplicates (fuzzy match)
//    b. Generate field name
//    c. Create new field in page object
//    d. Persist to disk
```

---

## Page Object Registry

### Loading Existing Pages

```typescript
// pageObjectRegistry.ts - loads from pages/ directory
// Parses all .vero files and indexes selectors

interface PageFieldRef {
    pageName: string;       // "LoginPage"
    fieldName: string;      // "emailInput"
    selector: string;       // 'placeholder "Enter email"'
    filePath: string;       // "/pages/LoginPage.vero"
}
```

### Selector Lookup

```typescript
findBySelector(selector: string): PageFieldRef | null {
    const normalized = this.normalizeSelector(selector);
    return this.selectorIndex.get(normalized) || null;
}
```

### Duplicate Detection

**Three-tier approach:**

1. **Exact Match** - Direct selector string match → Reuse existing
2. **Similar Variations** - Same element, different syntax (case variations)
3. **Fuzzy Matching** - Levenshtein distance
   - `≥ 0.8 (80%)` = Likely duplicate → Recommend reuse
   - `0.6 - 0.79` = Needs review
   - `< 0.6` = Different element → Create new

```typescript
interface DuplicateCheckResult {
    isDuplicate: boolean;
    existingRef: PageFieldRef | null;
    similarity: number;
    matchType: 'exact' | 'fuzzy' | 'semantic' | 'none';
    recommendation: 'reuse' | 'create' | 'review';
}
```

---

## Selector Detection Priority

| Priority | Strategy | Confidence | Example |
|----------|----------|------------|---------|
| 1 | testId | 100% | `[data-testid='email-input']` |
| 2 | role + name | 90% | `button "Submit"` |
| 3 | label | 85% | `label "Email"` |
| 4 | placeholder | 80% | `placeholder "Enter email"` |
| 5 | alt text | 85% | `alt "Logo"` |
| 6 | title | 75% | `title "Close"` |
| 7 | id | 70% | `#loginBtn` |
| 8 | text | 60% | `text "Click here"` |
| 9 | CSS | 40% | `.btn-primary` |

---

## Resilient Selectors

### Structure

```typescript
interface ResilientSelector {
    primary: SelectorCandidate;           // Best choice
    fallbacks: SelectorCandidate[];       // Alternatives
    fingerprint?: ElementFingerprint;     // Visual/structural data
    overallConfidence: number;
    isReliable: boolean;
}

interface SelectorCandidate {
    strategy: string;      // 'testId', 'role', 'label', etc.
    selector: string;      // The actual selector string
    confidence: number;    // 0-100
}
```

### Database Storage

```prisma
model RecordingStep {
    primarySelector     String
    selectorType        String
    fallbackSelectors   Json      // SelectorCandidate[]
    confidence          Float
    isStable            Boolean   // Won't change with i18n
    pageName            String?
    fieldName           String?
}
```

---

## Field Name Generation

```typescript
// Extract from element attributes:
// testId: "email-input" → emailInput
// role + text: button "Submit" → submitButton
// label: "Email Address" → emailAddressInput
// placeholder: "Enter email" → enterEmailInput

function generateFieldName(action: ParsedAction): string {
    // 1. Try testId
    // 2. Try role + name
    // 3. Try label/placeholder
    // 4. Fallback to element type + counter
}
```

---

## Page Name Suggestion

```typescript
// From URL path:
// /login → LoginPage
// /checkout/confirmation → CheckoutConfirmationPage
// / → MainPage

function inferPageName(url: string): string {
    const path = new URL(url).pathname;
    // Convert to PascalCase + "Page" suffix
}
```

---

## WebSocket Events

### Actions Emitted

```typescript
onAction(
    veroCode: string,              // "CLICK LoginPage.submitBtn"
    pagePath?: string,             // "/path/to/LoginPage.vero"
    pageCode?: string,             // Updated page object content
    fieldCreated?: {
        pageName: string,
        fieldName: string
    },
    duplicateWarning?: DuplicateWarning
)
```

### Duplicate Warning

```typescript
interface DuplicateWarning {
    newSelector: string;
    existingField: string;         // "LoginPage.emailInput"
    similarity: number;            // 0-100
    recommendation: 'reuse' | 'create' | 'review';
}
```

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/recorder/start` | Start recording session |
| GET | `/api/recorder/code/:testFlowId` | Poll for current code |
| POST | `/api/recorder/stop/:testFlowId` | Stop and get final code |
| POST | `/api/recorder/import` | Import from Chrome extension |
| POST | `/api/recorder/convert` | Convert actions to Vero |

---

## Common Tasks

### Adding New Selector Strategy

1. Update `/backend/src/services/selectorHealing/selectorGenerator.ts`:
   - Add to `generateResilientSelector()` priority list
   - Implement extraction logic

2. Update `/backend/src/services/selectorHealing/types.ts`:
   - Add new strategy to `SelectorStrategy` type

### Improving Duplicate Detection

Update `/backend/src/services/pageObjectRegistry.ts`:
- Adjust similarity thresholds
- Add semantic grouping rules
- Modify `checkForDuplicate()` logic

### Customizing Field Naming

Update `generateFieldName()` in `codegenRecorder.service.ts`:
- Add new extraction patterns
- Modify camelCase conversion
- Handle special characters

---

## Gotchas

1. **File Polling vs Watch**: Uses 500ms polling for cross-platform reliability (fs.watch issues)
2. **Regex Parsing**: Playwright code parsed via regex, not AST (simpler, covers common cases)
3. **Disk Persistence**: Page objects written to disk immediately (survives restarts)
4. **Fuzzy Threshold**: 80% similarity = duplicate, 60-79% = review, <60% = new
5. **Selector Normalization**: Case-insensitive, whitespace-normalized for matching
6. **Concurrent Sessions**: Each recording session has isolated state

---

## Example: End-to-End Selector Creation

```
1. User clicks email input with placeholder "Enter email"
   Playwright: await page.getByPlaceholder('Enter email').click()

2. Parser extracts:
   { type: 'click', selector: 'placeholder "Enter email"' }

3. Registry lookup:
   findBySelector('placeholder "Enter email"') → null

4. Duplicate detection:
   checkForDuplicate('placeholder "Enter email"', 'LoginPage')
   → Found: LoginPage.emailField (85% match)
   → Recommendation: 'review'

5. Decision (if no duplicate):
   - fieldName = generateFieldName() → "enterEmailInput"
   - registry.addField('LoginPage', 'enterEmailInput', 'placeholder "Enter email"')
   - registry.persist('LoginPage')
   - File written: pages/LoginPage.vero

6. Vero output:
   CLICK LoginPage.enterEmailInput

7. Resilient selector stored:
   {
     primary: { strategy: 'placeholder', selector: 'placeholder "Enter email"', confidence: 80 },
     fallbacks: [
       { strategy: 'label', selector: 'label "Email"', confidence: 85 },
       { strategy: 'css', selector: 'input[type="email"]', confidence: 40 }
     ]
   }
```
