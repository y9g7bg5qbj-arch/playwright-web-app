"""
Execution Data Store

Collects and stores execution data for learning and improvement:
1. Element interactions (selectors, success/failure)
2. Step execution history
3. User corrections and their outcomes
4. Page snapshots for semantic matching

Uses SQLite for local storage with optional PostgreSQL for production.
"""

import json
import sqlite3
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Any, Tuple
from enum import Enum
import numpy as np


class ExecutionOutcome(Enum):
    """Outcome of a step execution"""
    SUCCESS = "success"
    FAILURE = "failure"
    CORRECTED = "corrected"  # Failed but user provided correction
    SKIPPED = "skipped"
    TIMEOUT = "timeout"


@dataclass
class ElementInteraction:
    """Record of an interaction with a page element"""
    id: str
    timestamp: datetime

    # Element identification
    element_hash: str  # Stable hash of element properties
    tag_name: str
    text_content: str
    attributes: Dict[str, str]
    bounding_box: Dict[str, float]

    # Selector used
    selector_used: str
    selector_strategy: str  # test_id, role, text, css, etc.
    all_selectors_tried: List[str]

    # Execution context
    page_url: str
    page_title: str
    step_text: str  # Original natural language step
    action_type: str  # click, fill, select, etc.
    action_value: Optional[str] = None  # For fill actions

    # Outcome
    outcome: ExecutionOutcome = ExecutionOutcome.SUCCESS
    error_message: Optional[str] = None
    duration_ms: int = 0
    retries: int = 0

    # Correction (if user provided one)
    user_correction: Optional[str] = None
    corrected_selector: Optional[str] = None

    # For learning
    confidence_score: float = 1.0
    embedding: Optional[List[float]] = None  # Semantic embedding


@dataclass
class PageSnapshot:
    """Snapshot of page state at a point in time"""
    id: str
    timestamp: datetime
    url: str
    title: str

    # DOM summary
    interactive_elements: List[Dict[str, Any]]
    element_count: int

    # Visual
    screenshot_path: Optional[str] = None
    viewport_size: Dict[str, int] = field(default_factory=lambda: {"width": 1280, "height": 720})

    # Semantic
    page_hash: str = ""  # Hash for quick comparison
    embedding: Optional[List[float]] = None


@dataclass
class ExecutionSession:
    """Complete execution session with all steps"""
    id: str
    started_at: datetime
    ended_at: Optional[datetime] = None

    # Configuration
    target_url: str = ""
    headless: bool = False
    browser_type: str = "chromium"

    # Steps
    original_steps: List[str] = field(default_factory=list)
    total_steps: int = 0

    # Outcomes
    successful_steps: int = 0
    failed_steps: int = 0
    corrected_steps: int = 0

    # Generated output
    generated_vero: Optional[str] = None

    # Interactions (foreign key references)
    interaction_ids: List[str] = field(default_factory=list)


class ExecutionStore:
    """
    SQLite-based storage for execution data.

    Schema designed for:
    1. Fast lookup of similar elements (by hash, text, attributes)
    2. Learning from historical success rates
    3. Semantic search via embeddings
    4. Generating Vero code from successful executions
    """

    def __init__(self, db_path: str = "execution_history.db"):
        self.db_path = Path(db_path)
        self._init_database()

    def _init_database(self):
        """Initialize database schema"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        # Sessions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                started_at TIMESTAMP,
                ended_at TIMESTAMP,
                target_url TEXT,
                headless BOOLEAN,
                browser_type TEXT,
                original_steps TEXT,  -- JSON array
                total_steps INTEGER,
                successful_steps INTEGER,
                failed_steps INTEGER,
                corrected_steps INTEGER,
                generated_vero TEXT
            )
        """)

        # Element interactions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS interactions (
                id TEXT PRIMARY KEY,
                session_id TEXT,
                timestamp TIMESTAMP,

                -- Element identification
                element_hash TEXT,
                tag_name TEXT,
                text_content TEXT,
                attributes TEXT,  -- JSON
                bounding_box TEXT,  -- JSON

                -- Selector info
                selector_used TEXT,
                selector_strategy TEXT,
                all_selectors_tried TEXT,  -- JSON array

                -- Context
                page_url TEXT,
                page_title TEXT,
                step_text TEXT,
                action_type TEXT,
                action_value TEXT,

                -- Outcome
                outcome TEXT,
                error_message TEXT,
                duration_ms INTEGER,
                retries INTEGER,

                -- Correction
                user_correction TEXT,
                corrected_selector TEXT,

                -- Learning
                confidence_score REAL,
                embedding BLOB,  -- Binary numpy array

                FOREIGN KEY (session_id) REFERENCES sessions(id)
            )
        """)

        # Page snapshots table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS page_snapshots (
                id TEXT PRIMARY KEY,
                session_id TEXT,
                timestamp TIMESTAMP,
                url TEXT,
                title TEXT,
                interactive_elements TEXT,  -- JSON array
                element_count INTEGER,
                screenshot_path TEXT,
                viewport_size TEXT,  -- JSON
                page_hash TEXT,
                embedding BLOB,

                FOREIGN KEY (session_id) REFERENCES sessions(id)
            )
        """)

        # Selector success rates (aggregated for fast lookup)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS selector_stats (
                element_hash TEXT,
                selector TEXT,
                strategy TEXT,
                total_attempts INTEGER DEFAULT 0,
                successes INTEGER DEFAULT 0,
                success_rate REAL DEFAULT 0.5,
                last_used TIMESTAMP,
                avg_duration_ms REAL,

                PRIMARY KEY (element_hash, selector)
            )
        """)

        # Semantic embeddings index (for vector search)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS element_embeddings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                element_hash TEXT,
                text_content TEXT,
                tag_name TEXT,
                context TEXT,  -- surrounding text, page title, etc.
                embedding BLOB,
                created_at TIMESTAMP,

                UNIQUE(element_hash)
            )
        """)

        # User corrections mapping (learn from corrections)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS correction_mappings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_step TEXT,
                original_selector TEXT,
                corrected_selector TEXT,
                correction_text TEXT,
                element_hash TEXT,
                page_url_pattern TEXT,
                times_applied INTEGER DEFAULT 1,
                created_at TIMESTAMP,
                last_used TIMESTAMP
            )
        """)

        # Create indexes for common queries
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_interactions_element_hash ON interactions(element_hash)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_interactions_step_text ON interactions(step_text)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_interactions_page_url ON interactions(page_url)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_selector_stats_hash ON selector_stats(element_hash)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_corrections_step ON correction_mappings(original_step)")

        conn.commit()
        conn.close()

    # ==================== Session Management ====================

    def create_session(self, session: ExecutionSession) -> str:
        """Create a new execution session"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO sessions (
                id, started_at, ended_at, target_url, headless, browser_type,
                original_steps, total_steps, successful_steps, failed_steps,
                corrected_steps, generated_vero
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            session.id,
            session.started_at.isoformat(),
            session.ended_at.isoformat() if session.ended_at else None,
            session.target_url,
            session.headless,
            session.browser_type,
            json.dumps(session.original_steps),
            session.total_steps,
            session.successful_steps,
            session.failed_steps,
            session.corrected_steps,
            session.generated_vero
        ))

        conn.commit()
        conn.close()
        return session.id

    def update_session(self, session: ExecutionSession):
        """Update an existing session"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE sessions SET
                ended_at = ?,
                successful_steps = ?,
                failed_steps = ?,
                corrected_steps = ?,
                generated_vero = ?
            WHERE id = ?
        """, (
            session.ended_at.isoformat() if session.ended_at else None,
            session.successful_steps,
            session.failed_steps,
            session.corrected_steps,
            session.generated_vero,
            session.id
        ))

        conn.commit()
        conn.close()

    # ==================== Interaction Recording ====================

    def record_interaction(self, interaction: ElementInteraction, session_id: str):
        """Record an element interaction"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        # Store interaction
        cursor.execute("""
            INSERT INTO interactions (
                id, session_id, timestamp, element_hash, tag_name, text_content,
                attributes, bounding_box, selector_used, selector_strategy,
                all_selectors_tried, page_url, page_title, step_text, action_type,
                action_value, outcome, error_message, duration_ms, retries,
                user_correction, corrected_selector, confidence_score, embedding
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            interaction.id,
            session_id,
            interaction.timestamp.isoformat(),
            interaction.element_hash,
            interaction.tag_name,
            interaction.text_content,
            json.dumps(interaction.attributes),
            json.dumps(interaction.bounding_box),
            interaction.selector_used,
            interaction.selector_strategy,
            json.dumps(interaction.all_selectors_tried),
            interaction.page_url,
            interaction.page_title,
            interaction.step_text,
            interaction.action_type,
            interaction.action_value,
            interaction.outcome.value,
            interaction.error_message,
            interaction.duration_ms,
            interaction.retries,
            interaction.user_correction,
            interaction.corrected_selector,
            interaction.confidence_score,
            np.array(interaction.embedding).tobytes() if interaction.embedding else None
        ))

        # Update selector stats
        self._update_selector_stats(
            cursor,
            interaction.element_hash,
            interaction.selector_used,
            interaction.selector_strategy,
            interaction.outcome == ExecutionOutcome.SUCCESS,
            interaction.duration_ms
        )

        # If corrected, save the correction mapping
        if interaction.user_correction and interaction.corrected_selector:
            self._save_correction_mapping(
                cursor,
                interaction.step_text,
                interaction.selector_used,
                interaction.corrected_selector,
                interaction.user_correction,
                interaction.element_hash,
                interaction.page_url
            )

        conn.commit()
        conn.close()

    def _update_selector_stats(
        self,
        cursor,
        element_hash: str,
        selector: str,
        strategy: str,
        success: bool,
        duration_ms: int
    ):
        """Update aggregated selector statistics"""
        cursor.execute("""
            INSERT INTO selector_stats (element_hash, selector, strategy, total_attempts, successes, last_used, avg_duration_ms)
            VALUES (?, ?, ?, 1, ?, ?, ?)
            ON CONFLICT(element_hash, selector) DO UPDATE SET
                total_attempts = total_attempts + 1,
                successes = successes + ?,
                success_rate = CAST((successes + ?) AS REAL) / (total_attempts + 1),
                last_used = ?,
                avg_duration_ms = (avg_duration_ms * total_attempts + ?) / (total_attempts + 1)
        """, (
            element_hash, selector, strategy,
            1 if success else 0,
            datetime.now().isoformat(),
            duration_ms,
            1 if success else 0,
            1 if success else 0,
            datetime.now().isoformat(),
            duration_ms
        ))

    def _save_correction_mapping(
        self,
        cursor,
        original_step: str,
        original_selector: str,
        corrected_selector: str,
        correction_text: str,
        element_hash: str,
        page_url: str
    ):
        """Save a correction for future learning"""
        # Extract URL pattern (domain + path without query params)
        from urllib.parse import urlparse
        parsed = urlparse(page_url)
        url_pattern = f"{parsed.netloc}{parsed.path}"

        cursor.execute("""
            INSERT INTO correction_mappings (
                original_step, original_selector, corrected_selector,
                correction_text, element_hash, page_url_pattern,
                times_applied, created_at, last_used
            ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
            ON CONFLICT DO UPDATE SET
                times_applied = times_applied + 1,
                last_used = ?
        """, (
            original_step, original_selector, corrected_selector,
            correction_text, element_hash, url_pattern,
            datetime.now().isoformat(), datetime.now().isoformat(),
            datetime.now().isoformat()
        ))

    # ==================== Learning Queries ====================

    def get_best_selector_for_element(self, element_hash: str) -> Optional[Tuple[str, float]]:
        """Get the best performing selector for an element hash"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        cursor.execute("""
            SELECT selector, success_rate
            FROM selector_stats
            WHERE element_hash = ? AND total_attempts >= 3
            ORDER BY success_rate DESC, total_attempts DESC
            LIMIT 1
        """, (element_hash,))

        result = cursor.fetchone()
        conn.close()

        return result if result else None

    def get_selector_history(self, element_hash: str) -> Dict[str, Dict]:
        """Get full selector history for an element"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        cursor.execute("""
            SELECT selector, strategy, total_attempts, successes, success_rate, avg_duration_ms
            FROM selector_stats
            WHERE element_hash = ?
            ORDER BY success_rate DESC
        """, (element_hash,))

        results = cursor.fetchall()
        conn.close()

        history = {}
        for row in results:
            history[row[0]] = {
                "strategy": row[1],
                "attempts": row[2],
                "successes": row[3],
                "success_rate": row[4],
                "avg_duration_ms": row[5]
            }

        return history

    def find_correction_for_step(self, step_text: str, page_url: str) -> Optional[Dict]:
        """Find a previously successful correction for a similar step"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        # Try exact match first
        cursor.execute("""
            SELECT corrected_selector, correction_text, times_applied
            FROM correction_mappings
            WHERE original_step = ?
            ORDER BY times_applied DESC, last_used DESC
            LIMIT 1
        """, (step_text,))

        result = cursor.fetchone()

        if not result:
            # Try fuzzy match with LIKE
            cursor.execute("""
                SELECT corrected_selector, correction_text, times_applied
                FROM correction_mappings
                WHERE original_step LIKE ?
                ORDER BY times_applied DESC
                LIMIT 1
            """, (f"%{step_text[:30]}%",))
            result = cursor.fetchone()

        conn.close()

        if result:
            return {
                "selector": result[0],
                "correction": result[1],
                "times_used": result[2]
            }
        return None

    def get_similar_interactions(
        self,
        text_content: str,
        tag_name: str,
        limit: int = 10
    ) -> List[Dict]:
        """Find similar past interactions by text and tag"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        cursor.execute("""
            SELECT DISTINCT i.selector_used, i.selector_strategy, i.text_content,
                   s.success_rate, s.total_attempts
            FROM interactions i
            JOIN selector_stats s ON i.element_hash = s.element_hash AND i.selector_used = s.selector
            WHERE i.tag_name = ? AND i.text_content LIKE ?
            AND i.outcome = 'success'
            ORDER BY s.success_rate DESC, s.total_attempts DESC
            LIMIT ?
        """, (tag_name, f"%{text_content[:20]}%", limit))

        results = cursor.fetchall()
        conn.close()

        return [
            {
                "selector": row[0],
                "strategy": row[1],
                "text": row[2],
                "success_rate": row[3],
                "attempts": row[4]
            }
            for row in results
        ]

    # ==================== Vero Generation ====================

    def get_successful_session_interactions(self, session_id: str) -> List[ElementInteraction]:
        """Get all successful interactions from a session for Vero generation"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM interactions
            WHERE session_id = ? AND outcome IN ('success', 'corrected')
            ORDER BY timestamp ASC
        """, (session_id,))

        rows = cursor.fetchall()
        conn.close()

        interactions = []
        for row in rows:
            # Convert row to ElementInteraction
            interaction = ElementInteraction(
                id=row[0],
                timestamp=datetime.fromisoformat(row[2]),
                element_hash=row[3],
                tag_name=row[4],
                text_content=row[5],
                attributes=json.loads(row[6]) if row[6] else {},
                bounding_box=json.loads(row[7]) if row[7] else {},
                selector_used=row[8],
                selector_strategy=row[9],
                all_selectors_tried=json.loads(row[10]) if row[10] else [],
                page_url=row[11],
                page_title=row[12],
                step_text=row[13],
                action_type=row[14],
                action_value=row[15],
                outcome=ExecutionOutcome(row[16]),
                error_message=row[17],
                duration_ms=row[18],
                retries=row[19],
                user_correction=row[20],
                corrected_selector=row[21],
                confidence_score=row[22]
            )
            interactions.append(interaction)

        return interactions

    # ==================== Analytics ====================

    def get_stats(self) -> Dict:
        """Get overall statistics"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        stats = {}

        # Session stats
        cursor.execute("SELECT COUNT(*), SUM(successful_steps), SUM(failed_steps) FROM sessions")
        row = cursor.fetchone()
        stats["total_sessions"] = row[0]
        stats["total_successful_steps"] = row[1] or 0
        stats["total_failed_steps"] = row[2] or 0

        # Interaction stats
        cursor.execute("SELECT COUNT(*) FROM interactions")
        stats["total_interactions"] = cursor.fetchone()[0]

        # Selector stats
        cursor.execute("SELECT COUNT(*), AVG(success_rate) FROM selector_stats")
        row = cursor.fetchone()
        stats["unique_selectors"] = row[0]
        stats["avg_selector_success_rate"] = row[1] or 0.5

        # Correction stats
        cursor.execute("SELECT COUNT(*), SUM(times_applied) FROM correction_mappings")
        row = cursor.fetchone()
        stats["corrections_recorded"] = row[0]
        stats["corrections_applied"] = row[1] or 0

        conn.close()
        return stats

    def cleanup_old_data(self, days: int = 30):
        """Remove data older than specified days"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        cutoff = (datetime.now() - timedelta(days=days)).isoformat()

        # Delete old interactions (keep selector_stats for learning)
        cursor.execute("DELETE FROM interactions WHERE timestamp < ?", (cutoff,))
        cursor.execute("DELETE FROM page_snapshots WHERE timestamp < ?", (cutoff,))
        cursor.execute("DELETE FROM sessions WHERE started_at < ?", (cutoff,))

        conn.commit()
        conn.close()


# Utility functions for element hashing
def compute_element_hash(element: Dict) -> str:
    """Compute a stable hash for element identification"""
    # Use multiple attributes for stability
    data = f"{element.get('tag_name', '')}:"
    data += f"{element.get('text', element.get('text_content', ''))[:50]}:"

    attrs = element.get('attributes', {})
    # Include stable attributes
    for attr in ['data-testid', 'data-test-id', 'data-test', 'id', 'name', 'aria-label']:
        if attr in attrs:
            data += f"{attr}={attrs[attr]}:"

    return hashlib.md5(data.encode()).hexdigest()[:12]


# Example usage
if __name__ == "__main__":
    store = ExecutionStore("test_execution.db")

    # Create a test session
    from uuid import uuid4

    session = ExecutionSession(
        id=str(uuid4()),
        started_at=datetime.now(),
        target_url="https://example.com",
        original_steps=["Click Login", "Fill username with admin"],
        total_steps=2
    )

    store.create_session(session)

    # Record an interaction
    interaction = ElementInteraction(
        id=str(uuid4()),
        timestamp=datetime.now(),
        element_hash="abc123",
        tag_name="button",
        text_content="Login",
        attributes={"data-testid": "login-btn"},
        bounding_box={"x": 100, "y": 200, "width": 80, "height": 40},
        selector_used='[data-testid="login-btn"]',
        selector_strategy="test_id",
        all_selectors_tried=['[data-testid="login-btn"]', 'button:has-text("Login")'],
        page_url="https://example.com/login",
        page_title="Login Page",
        step_text="Click Login",
        action_type="click",
        outcome=ExecutionOutcome.SUCCESS,
        duration_ms=150
    )

    store.record_interaction(interaction, session.id)

    # Get stats
    print("Stats:", store.get_stats())

    # Get best selector
    best = store.get_best_selector_for_element("abc123")
    print("Best selector:", best)
