# Intelligent Agent Architecture

## Overview

The Vero Agent is an AI-powered test execution system that learns from every interaction to improve over time. This document describes the architecture for achieving Playwright codegen-quality selector selection, continuous learning, and automatic Vero scenario generation.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           INTELLIGENT AGENT SYSTEM                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐          │
│  │  Natural Lang    │───▶│  Live Execution  │───▶│  Vero Scenario   │          │
│  │  Test Steps      │    │  Agent           │    │  Generator       │          │
│  └──────────────────┘    └────────┬─────────┘    └──────────────────┘          │
│                                   │                                              │
│                                   ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         LEARNING LOOP                                    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │ Intelligent │  │  Semantic   │  │  Execution  │  │  Adaptive   │    │   │
│  │  │  Selector   │  │   Search    │  │   Store     │  │   Matcher   │    │   │
│  │  │  Generator  │  │  (Vectors)  │  │    (DB)     │  │  (Weights)  │    │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │   │
│  │         │                │                │                │           │   │
│  │         └────────────────┴────────────────┴────────────────┘           │   │
│  │                                   │                                     │   │
│  │                         FEEDBACK LOOP                                   │   │
│  │                     (Records outcomes, learns)                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Intelligent Selector Generator (`intelligent_selector.py`)

Generates Playwright codegen-quality selectors using 11 strategies ranked by reliability:

```python
class SelectorStrategy(Enum):
    TEST_ID = 1        # data-testid, data-test-id (most stable)
    ROLE_NAME = 2      # getByRole with accessible name
    LABEL = 3          # getByLabel (form fields)
    PLACEHOLDER = 4    # getByPlaceholder
    ALT_TEXT = 5       # getByAltText (images)
    TITLE = 6          # getByTitle
    TEXT = 7           # getByText (exact or partial)
    CSS_ID = 8         # #element-id
    CSS_CLASS = 9      # .specific-class
    CSS_ATTR = 10      # [attribute="value"]
    XPATH = 11         # //xpath/expression (last resort)
```

**Key Features:**
- Multi-strategy generation with confidence scoring
- Historical success rate integration
- Uniqueness verification across page
- Direct Vero syntax output

**Example Output:**
```python
# Input element
element = {
    'tag_name': 'button',
    'text': 'Sign In',
    'attributes': {'data-testid': 'login-submit-btn'}
}

# Generated candidates (ranked by score)
[
    SelectorCandidate(
        selector='[data-testid="login-submit-btn"]',
        strategy=SelectorStrategy.TEST_ID,
        vero_syntax='testId "login-submit-btn"',
        score=0.95
    ),
    SelectorCandidate(
        selector='button[name="Sign In"]',
        strategy=SelectorStrategy.ROLE_NAME,
        vero_syntax='role "button" name "Sign In"',
        score=0.90
    ),
    ...
]
```

### 2. Execution Store (`execution_store.py`)

SQLite database for collecting execution data:

**Schema:**

```sql
-- Sessions: Track execution sessions
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    started_at TIMESTAMP,
    target_url TEXT,
    original_steps TEXT,  -- JSON array
    successful_steps INTEGER,
    failed_steps INTEGER,
    generated_vero TEXT
);

-- Interactions: Every element interaction
CREATE TABLE interactions (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    element_hash TEXT,    -- Stable element identifier
    selector_used TEXT,
    selector_strategy TEXT,
    step_text TEXT,       -- Original natural language
    action_type TEXT,
    outcome TEXT,         -- success, failure, corrected
    duration_ms INTEGER,
    user_correction TEXT,
    confidence_score REAL
);

-- Selector Stats: Aggregated for fast lookup
CREATE TABLE selector_stats (
    element_hash TEXT,
    selector TEXT,
    success_rate REAL,
    total_attempts INTEGER,
    avg_duration_ms REAL,
    PRIMARY KEY (element_hash, selector)
);

-- Corrections: Learn from user corrections
CREATE TABLE correction_mappings (
    original_step TEXT,
    corrected_selector TEXT,
    times_applied INTEGER,
    page_url_pattern TEXT
);
```

**Key Features:**
- Full interaction history for learning
- Aggregated selector success rates
- Correction mappings for self-healing
- Cleanup policies for data retention

### 3. Semantic Search (`semantic_search.py`)

Vector embedding-based element matching:

**Embedding Providers:**
- `SentenceTransformerProvider` - Local, offline (default)
- `OpenAIProvider` - text-embedding-3-small
- `MockEmbeddingProvider` - Testing

**Element Description Building:**
```python
def _build_element_description(element):
    """
    Build rich text for embedding:
    - Tag name and ARIA role
    - Text content
    - Key attributes (aria-label, placeholder, name)
    - Data test IDs
    - Semantic class names
    - Page context
    """
    return "button role='button' with text 'Login' test-id 'login-btn' class 'btn-primary' on page 'Home'"
```

**Similarity Search:**
```python
# Find similar elements across all pages
similar = search.find_similar(element, top_k=5, min_similarity=0.7)
# Returns elements with selectors that worked historically
```

### 4. Adaptive Element Matcher (`learning_loop.py`)

Combines all strategies with adaptive weighting:

```python
class AdaptiveElementMatcher:
    weights = {
        "history_match": 0.4,      # Known good selector
        "semantic_similarity": 0.3, # Similar element found
        "text_match": 0.2,          # Text-based match
        "position_heuristic": 0.1   # DOM position
    }

    def find_best_selector(element, page_elements):
        # 1. Check history for known good selector
        # 2. Query semantic search for similar elements
        # 3. Generate fresh selectors
        # 4. Combine signals and pick best
        pass
```

**Weight Adaptation:**
Weights automatically adjust based on success/failure:
- Success: Increase weight for strategy that worked
- Failure: Decrease weight for strategy that failed

### 5. Vero Scenario Generator (`vero_recorder.py`)

Generates Vero DSL from execution recordings:

**Example Output:**
```vero
Feature "Login"

  use LoginPage

  Scenario "User can login with valid credentials"
    fill "Username" with "admin"
    fill "Password" with "secret123"
    click "Sign In" button
```

**Page Generation:**
```vero
Page LoginPage
  url pattern "example.com/login"

  field usernameInput = placeholder "Username"
  field passwordInput = placeholder "Password"
  field signInButton = testId "login-submit-btn"
```

### 6. Learning Loop (`learning_loop.py`)

Orchestrates all components:

```python
class LearningLoop:
    def decide_selector(element_context, step_text) -> SelectorDecision:
        """
        Decision process:
        1. Check for known corrections for this step
        2. Look up historical best selector
        3. Query semantic search for similar elements
        4. Generate fresh selectors
        5. Combine signals to pick best
        """

    def record_success(context, selector, strategy, ...):
        """Record successful interaction"""
        # Update selector stats
        # Index in semantic search
        # Record for Vero generation

    def record_failure(context, selector, error):
        """Record failed interaction"""
        # Update selector stats (decrement)
        # Store for analysis

    def record_correction(context, original, corrected, user_text):
        """Record user correction"""
        # Save correction mapping
        # Update semantic index
```

## Data Flow

### Execution Flow

```
1. User provides English steps: ["Click Login", "Fill username with admin"]

2. Start Session
   └─▶ Create ExecutionSession in DB
   └─▶ Initialize LearningLoop

3. For each step:
   ├─▶ Parse natural language → ParsedAction
   ├─▶ Find element:
   │   ├─▶ Check LearningLoop for known selector
   │   ├─▶ Try Playwright role/text/label strategies
   │   ├─▶ Use AI vision if needed
   │   └─▶ Query semantic search as fallback
   ├─▶ Execute action
   ├─▶ Record outcome:
   │   ├─▶ Update selector_stats
   │   ├─▶ Index in semantic search
   │   └─▶ Add to live Vero recording
   └─▶ Send real-time update to UI

4. End Session
   └─▶ Generate Vero code from interactions
   └─▶ Store session summary
   └─▶ Return generated code
```

### Learning Flow

```
Interaction Outcome
       │
       ▼
┌──────────────────────┐
│  Record to DB        │
│  - selector_stats    │
│  - interactions      │
│  - corrections       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Update Semantic     │
│  - Index element     │
│  - Record outcome    │
│  - Adjust scores     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Adapt Weights       │
│  - Increase winning  │
│  - Decrease losing   │
└──────────────────────┘
```

## Configuration

```python
@dataclass
class LearningConfig:
    # Database paths
    execution_db_path: str = "execution_history.db"
    embedding_db_path: str = "element_embeddings.db"

    # Learning parameters
    min_interactions_for_learning: int = 3
    similarity_threshold: float = 0.7
    success_rate_threshold: float = 0.8

    # Selector preferences
    prefer_test_ids: bool = True
    prefer_semantic_selectors: bool = True

    # Cleanup
    history_retention_days: int = 30

    # Fine-tuning
    enable_weight_adaptation: bool = True
    enable_pattern_learning: bool = True
```

## Fine-Tuning Strategy

### 1. Embedding Fine-Tuning

For domain-specific element matching (e.g., Salesforce):

```python
# Collect pairs of similar elements
training_pairs = [
    ("lightning-button with text 'Save'", "button[data-key='saveButton']"),
    ("lightning-input with label 'Email'", "input[name='email']"),
    ...
]

# Fine-tune sentence transformer
model = SentenceTransformer('all-MiniLM-L6-v2')
model.fit(training_pairs, loss='cosine_similarity')
```

### 2. Selector Scoring Fine-Tuning

Adjust base scores based on application patterns:

```python
# If test-ids are always present, boost their score
if app_always_has_test_ids:
    SelectorStrategy.TEST_ID.base_score = 0.98

# If app uses custom data attributes
custom_attributes = ['data-automation-id', 'data-e2e']
for attr in custom_attributes:
    IntelligentSelectorGenerator.TEST_ID_ATTRS.append(attr)
```

### 3. Pattern Learning

Learn from repeated interactions:

```python
# Detect patterns
patterns = learning_loop.detect_patterns()

# Example pattern: "All tables use data-row-id"
{
    "pattern": "table rows",
    "selector_template": "tr[data-row-id='$id']",
    "confidence": 0.92,
    "occurrences": 45
}
```

## API Integration

### REST Endpoints

```
POST /api/live/start
  → Returns session_id, websocket_url

WebSocket /ws/live/{session_id}
  ← state_change, step_complete, screenshot, vero_generated
  → start, pause, resume, stop, correct

GET /api/live/sessions/{session_id}/vero
  → Returns generated Vero code

GET /api/live/stats
  → Returns learning system statistics
```

### WebSocket Messages

```typescript
// Server → Client
interface StepCompleteMessage {
  type: 'step_complete';
  data: {
    step_index: number;
    step_text: string;
    success: boolean;
    selector_used: string;
    confidence: number;
    duration_ms: number;
  };
}

interface VeroGeneratedMessage {
  type: 'vero_generated';
  data: {
    code: string;
    pages: Record<string, string>;
  };
}

// Client → Server
interface CorrectionMessage {
  type: 'correct';
  correction: string;  // e.g., "Click the BLUE button"
}
```

## Performance Considerations

1. **Caching**
   - In-memory embedding cache (1000 elements)
   - SQLite for persistent storage
   - Index on frequently queried columns

2. **Batch Processing**
   - Batch embed when indexing many elements
   - Batch DB writes where possible

3. **Lazy Loading**
   - Load learning components on first use
   - Defer embedding provider initialization

4. **Cleanup**
   - Auto-cleanup data older than 30 days
   - Limit stored interactions per session

## Future Enhancements

1. **Multi-Page Learning**
   - Learn patterns across similar pages
   - Transfer knowledge between applications

2. **Visual Similarity**
   - Use image embeddings for element matching
   - Handle elements with no text/attributes

3. **Action Sequence Learning**
   - Learn common action sequences
   - Suggest next steps during recording

4. **Distributed Learning**
   - Share learnings across team
   - Central model for organization-wide patterns

5. **Active Learning**
   - Ask user for feedback on uncertain matches
   - Prioritize learning from corrections
