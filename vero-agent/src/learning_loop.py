"""
Learning Loop - Continuous Improvement System

Integrates all intelligence components:
1. ExecutionStore - Records all interactions and outcomes
2. SemanticSearch - Finds similar elements across pages
3. IntelligentSelector - Generates optimal selectors
4. VeroRecorder - Produces Vero code from executions

The learning loop enables:
- Self-healing selectors that improve over time
- Pattern recognition across test sessions
- Automatic selector optimization
- Proactive failure prevention
"""

import asyncio
from datetime import datetime
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any, Callable
from uuid import uuid4
import json

from .execution_store import (
    ExecutionStore,
    ExecutionSession,
    ElementInteraction,
    ExecutionOutcome,
    compute_element_hash
)
from .semantic_search import (
    SemanticElementSearch,
    AdaptiveElementMatcher,
    MockEmbeddingProvider,
    SimilarElement
)
from .intelligent_selector import (
    IntelligentSelectorGenerator,
    SelectorCandidate,
    SelectorStrategy
)
from .vero_recorder import (
    VeroRecorder,
    LiveVeroRecorder,
    VeroStep
)


@dataclass
class LearningConfig:
    """Configuration for the learning system"""
    # Database paths
    execution_db_path: str = "execution_history.db"
    embedding_db_path: str = "element_embeddings.db"

    # Learning parameters
    min_interactions_for_learning: int = 3  # Min interactions before using learned selectors
    similarity_threshold: float = 0.7        # Min similarity for semantic matching
    success_rate_threshold: float = 0.8      # Min success rate for auto-selection

    # Selector preferences
    prefer_test_ids: bool = True             # Always prefer data-testid if available
    prefer_semantic_selectors: bool = True   # Prefer role/label over CSS

    # Cleanup
    history_retention_days: int = 30         # Days to keep execution history

    # Fine-tuning
    enable_weight_adaptation: bool = True    # Adapt matching weights over time
    enable_pattern_learning: bool = True     # Learn common patterns


@dataclass
class SelectorDecision:
    """Result of selector decision-making"""
    selector: str
    strategy: str
    confidence: float
    source: str  # "generated", "history", "semantic", "fallback"
    alternatives: List[Tuple[str, float]] = field(default_factory=list)


@dataclass
class ElementContext:
    """Rich context for an element"""
    element: Dict[str, Any]
    page_url: str
    page_title: str
    surrounding_text: str = ""
    parent_info: Dict[str, Any] = field(default_factory=dict)
    sibling_count: int = 0


class LearningLoop:
    """
    Main learning loop that coordinates all intelligence components.

    Key responsibilities:
    1. Make selector decisions using all available information
    2. Record execution outcomes for learning
    3. Generate optimized Vero code
    4. Proactively suggest improvements
    """

    def __init__(self, config: Optional[LearningConfig] = None):
        self.config = config or LearningConfig()

        # Initialize components
        self.store = ExecutionStore(self.config.execution_db_path)

        # Initialize semantic search with mock provider (can swap for OpenAI/local)
        embedding_provider = MockEmbeddingProvider(dimension=384)
        self.semantic_search = SemanticElementSearch(
            embedding_provider,
            self.config.embedding_db_path
        )

        self.selector_generator = IntelligentSelectorGenerator(
            selector_history=self._load_selector_history()
        )

        self.matcher = AdaptiveElementMatcher(
            self.semantic_search,
            selector_history=self.selector_generator.selector_history
        )

        self.vero_recorder = VeroRecorder(self.store, self.selector_generator)
        self.live_recorder = LiveVeroRecorder()

        # Current session tracking
        self._current_session: Optional[ExecutionSession] = None
        self._session_interactions: List[ElementInteraction] = []

    def _load_selector_history(self) -> Dict[str, Dict]:
        """Load selector history from store for generator"""
        # This would query the store's selector_stats table
        # For now, return empty dict (populated during usage)
        return {}

    # ==================== Session Management ====================

    def start_session(
        self,
        target_url: str,
        steps: List[str],
        headless: bool = False,
        browser_type: str = "chromium"
    ) -> str:
        """Start a new execution session"""
        session_id = str(uuid4())

        self._current_session = ExecutionSession(
            id=session_id,
            started_at=datetime.now(),
            target_url=target_url,
            headless=headless,
            browser_type=browser_type,
            original_steps=steps,
            total_steps=len(steps)
        )

        self.store.create_session(self._current_session)
        self._session_interactions = []
        self.live_recorder.clear()

        return session_id

    def end_session(self, generated_vero: Optional[str] = None) -> ExecutionSession:
        """End current session and finalize stats"""
        if not self._current_session:
            raise ValueError("No active session")

        self._current_session.ended_at = datetime.now()
        self._current_session.generated_vero = generated_vero

        # Calculate stats
        successes = sum(1 for i in self._session_interactions
                       if i.outcome == ExecutionOutcome.SUCCESS)
        failures = sum(1 for i in self._session_interactions
                      if i.outcome == ExecutionOutcome.FAILURE)
        corrected = sum(1 for i in self._session_interactions
                       if i.outcome == ExecutionOutcome.CORRECTED)

        self._current_session.successful_steps = successes
        self._current_session.failed_steps = failures
        self._current_session.corrected_steps = corrected

        self.store.update_session(self._current_session)

        session = self._current_session
        self._current_session = None

        return session

    # ==================== Selector Decision Making ====================

    def decide_selector(
        self,
        element_context: ElementContext,
        step_text: str
    ) -> SelectorDecision:
        """
        Make intelligent selector decision using all available information.

        Decision process:
        1. Check for known corrections for this step
        2. Look up historical best selector for this element
        3. Query semantic search for similar elements
        4. Generate fresh selectors and rank them
        5. Combine all signals to pick best selector
        """
        element = element_context.element
        element_hash = compute_element_hash(element)

        alternatives = []

        # 1. Check for previous corrections
        correction = self.store.find_correction_for_step(
            step_text, element_context.page_url
        )
        if correction and correction.get("times_used", 0) >= 2:
            return SelectorDecision(
                selector=correction["selector"],
                strategy="correction",
                confidence=0.95,
                source="learned_correction",
                alternatives=[]
            )

        # 2. Check historical best for this element
        historical_best = self.store.get_best_selector_for_element(element_hash)
        if historical_best:
            selector, success_rate = historical_best
            if success_rate >= self.config.success_rate_threshold:
                return SelectorDecision(
                    selector=selector,
                    strategy="historical",
                    confidence=success_rate,
                    source="history",
                    alternatives=[]
                )
            alternatives.append((selector, success_rate))

        # 3. Try semantic search for similar elements
        similar_elements = self.semantic_search.find_similar(
            element,
            top_k=3,
            min_similarity=self.config.similarity_threshold
        )

        for similar in similar_elements:
            if similar.success_rate >= self.config.success_rate_threshold:
                alternatives.append((similar.selector, similar.similarity_score * similar.success_rate))

        # 4. Generate fresh selectors
        generated_candidates = self.selector_generator.generate_selectors(element)

        # 5. Combine signals
        if generated_candidates:
            best_generated = generated_candidates[0]

            # Compare with semantic matches
            best_semantic = None
            best_semantic_score = 0

            for similar in similar_elements:
                # Weighted score: similarity * success_rate
                score = similar.similarity_score * 0.6 + similar.success_rate * 0.4
                if score > best_semantic_score:
                    best_semantic = similar
                    best_semantic_score = score

            # Decision: prefer high-confidence semantic match over fresh generation
            if best_semantic and best_semantic_score > best_generated.score:
                return SelectorDecision(
                    selector=best_semantic.selector,
                    strategy="semantic",
                    confidence=best_semantic_score,
                    source="semantic_match",
                    alternatives=[(c.selector, c.score) for c in generated_candidates[:3]]
                )

            # Use generated selector
            return SelectorDecision(
                selector=best_generated.selector,
                strategy=best_generated.strategy.name.lower(),
                confidence=best_generated.score,
                source="generated",
                alternatives=[(c.selector, c.score) for c in generated_candidates[1:4]]
            )

        # Fallback: use first alternative or generic selector
        if alternatives:
            best_alt = max(alternatives, key=lambda x: x[1])
            return SelectorDecision(
                selector=best_alt[0],
                strategy="fallback",
                confidence=best_alt[1],
                source="alternative",
                alternatives=alternatives
            )

        # Ultimate fallback
        tag = element.get("tag_name", element.get("tagName", "element"))
        text = element.get("text", element.get("text_content", ""))[:30]
        fallback = f'{tag}:has-text("{text}")' if text else tag

        return SelectorDecision(
            selector=fallback,
            strategy="text_fallback",
            confidence=0.3,
            source="fallback",
            alternatives=[]
        )

    # ==================== Outcome Recording ====================

    def record_success(
        self,
        element_context: ElementContext,
        selector_used: str,
        strategy: str,
        step_text: str,
        action_type: str,
        action_value: Optional[str] = None,
        duration_ms: int = 0
    ):
        """Record a successful interaction"""
        self._record_interaction(
            element_context=element_context,
            selector_used=selector_used,
            strategy=strategy,
            step_text=step_text,
            action_type=action_type,
            action_value=action_value,
            outcome=ExecutionOutcome.SUCCESS,
            duration_ms=duration_ms
        )

    def record_failure(
        self,
        element_context: ElementContext,
        selector_used: str,
        strategy: str,
        step_text: str,
        action_type: str,
        error_message: str,
        retries: int = 0
    ):
        """Record a failed interaction"""
        self._record_interaction(
            element_context=element_context,
            selector_used=selector_used,
            strategy=strategy,
            step_text=step_text,
            action_type=action_type,
            outcome=ExecutionOutcome.FAILURE,
            error_message=error_message,
            retries=retries
        )

    def record_correction(
        self,
        element_context: ElementContext,
        original_selector: str,
        corrected_selector: str,
        user_correction: str,
        step_text: str,
        action_type: str
    ):
        """Record a user correction"""
        self._record_interaction(
            element_context=element_context,
            selector_used=corrected_selector,
            strategy="user_correction",
            step_text=step_text,
            action_type=action_type,
            outcome=ExecutionOutcome.CORRECTED,
            user_correction=user_correction,
            original_selector=original_selector
        )

    def _record_interaction(
        self,
        element_context: ElementContext,
        selector_used: str,
        strategy: str,
        step_text: str,
        action_type: str,
        outcome: ExecutionOutcome,
        action_value: Optional[str] = None,
        duration_ms: int = 0,
        error_message: Optional[str] = None,
        retries: int = 0,
        user_correction: Optional[str] = None,
        original_selector: Optional[str] = None
    ):
        """Internal method to record an interaction"""
        element = element_context.element
        element_hash = compute_element_hash(element)

        interaction = ElementInteraction(
            id=str(uuid4()),
            timestamp=datetime.now(),
            element_hash=element_hash,
            tag_name=element.get("tag_name", element.get("tagName", "")),
            text_content=element.get("text", element.get("text_content", "")),
            attributes=element.get("attributes", {}),
            bounding_box=element.get("bounding_box", element.get("boundingBox", {})),
            selector_used=selector_used,
            selector_strategy=strategy,
            all_selectors_tried=[],
            page_url=element_context.page_url,
            page_title=element_context.page_title,
            step_text=step_text,
            action_type=action_type,
            action_value=action_value,
            outcome=outcome,
            error_message=error_message,
            duration_ms=duration_ms,
            retries=retries,
            user_correction=user_correction,
            corrected_selector=selector_used if outcome == ExecutionOutcome.CORRECTED else None
        )

        # Store in database
        if self._current_session:
            self.store.record_interaction(interaction, self._current_session.id)
            self._session_interactions.append(interaction)

        # Update semantic search index
        self.semantic_search.index_element(
            element,
            selector_used,
            element_context.page_url
        )
        self.semantic_search.record_outcome(
            element_hash,
            outcome == ExecutionOutcome.SUCCESS or outcome == ExecutionOutcome.CORRECTED
        )

        # Update selector generator history
        self.selector_generator.update_history(
            element_hash,
            selector_used,
            outcome == ExecutionOutcome.SUCCESS or outcome == ExecutionOutcome.CORRECTED
        )

        # Record for live Vero generation
        self.live_recorder.record(interaction)

    # ==================== Vero Generation ====================

    def get_live_vero(self) -> str:
        """Get current Vero code from live recording"""
        return self.live_recorder.get_current_vero()

    def generate_vero_from_session(
        self,
        session_id: Optional[str] = None,
        feature_name: str = "RecordedFeature",
        scenario_name: str = "Recorded Scenario"
    ) -> Tuple[str, Dict[str, str]]:
        """Generate complete Vero code from a session"""
        sid = session_id or (self._current_session.id if self._current_session else None)
        if not sid:
            raise ValueError("No session specified and no active session")

        return self.vero_recorder.generate_from_session(
            sid, feature_name, scenario_name
        )

    # ==================== Analytics & Insights ====================

    def get_learning_stats(self) -> Dict[str, Any]:
        """Get learning system statistics"""
        store_stats = self.store.get_stats()
        search_stats = self.semantic_search.get_stats()

        return {
            "store": store_stats,
            "semantic_search": search_stats,
            "selector_history_size": len(self.selector_generator.selector_history),
            "matcher_weights": self.matcher.weights,
            "config": {
                "similarity_threshold": self.config.similarity_threshold,
                "success_rate_threshold": self.config.success_rate_threshold
            }
        }

    def get_selector_recommendations(
        self,
        element_context: ElementContext,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Get selector recommendations for an element.
        Useful for debugging or manual selection.
        """
        element = element_context.element
        recommendations = []

        # Generated selectors
        candidates = self.selector_generator.generate_selectors(element)
        for c in candidates[:top_k]:
            recommendations.append({
                "selector": c.selector,
                "strategy": c.strategy.name,
                "score": c.score,
                "source": "generated",
                "vero_syntax": c.vero_syntax
            })

        # Similar elements
        similar = self.semantic_search.find_similar(element, top_k=3)
        for s in similar:
            recommendations.append({
                "selector": s.selector,
                "strategy": "semantic_match",
                "score": s.similarity_score * s.success_rate,
                "source": "semantic",
                "similar_text": s.text_content
            })

        # Sort by score
        recommendations.sort(key=lambda x: x["score"], reverse=True)
        return recommendations[:top_k]

    def suggest_improvements(self) -> List[Dict[str, Any]]:
        """
        Analyze history and suggest improvements.
        Returns list of actionable suggestions.
        """
        suggestions = []

        # Find low success rate selectors
        # (Would query store for selectors with high usage but low success)

        # Find elements without stable selectors
        # (Would identify elements that frequently need corrections)

        # Suggest adding test-ids
        # (Would identify high-value elements that lack data-testid)

        return suggestions

    # ==================== Cleanup ====================

    def cleanup_old_data(self):
        """Remove data older than retention period"""
        self.store.cleanup_old_data(self.config.history_retention_days)


# ==================== Integration Helper ====================

class IntelligentExecutionAgent:
    """
    High-level agent that uses the learning loop for intelligent execution.
    This wraps the learning loop to provide a simple interface for the
    LiveExecutionAgent.
    """

    def __init__(self, config: Optional[LearningConfig] = None):
        self.learning = LearningLoop(config)
        self._page = None  # Set by LiveExecutionAgent

    async def find_element_intelligently(
        self,
        target: str,
        page_url: str,
        page_title: str,
        step_text: str,
        page_elements: List[Dict] = None
    ) -> Tuple[Optional[str], float]:
        """
        Find the best selector for a target element.

        Args:
            target: Natural language description (e.g., "Login button")
            page_url: Current page URL
            page_title: Current page title
            step_text: Original step text
            page_elements: List of elements on page (for matching)

        Returns:
            Tuple of (selector, confidence)
        """
        # Find matching element from page_elements
        best_match = None
        best_match_score = 0

        target_lower = target.lower()

        for element in (page_elements or []):
            text = element.get("text", element.get("textContent", "")).lower()
            aria_label = element.get("attributes", {}).get("aria-label", "").lower()

            # Simple text matching (would use semantic matching in production)
            score = 0
            if target_lower in text:
                score = 0.9
            elif target_lower in aria_label:
                score = 0.85
            elif any(word in text for word in target_lower.split()):
                score = 0.6

            if score > best_match_score:
                best_match = element
                best_match_score = score

        if not best_match:
            return None, 0.0

        # Create context
        context = ElementContext(
            element=best_match,
            page_url=page_url,
            page_title=page_title
        )

        # Get intelligent selector decision
        decision = self.learning.decide_selector(context, step_text)

        return decision.selector, decision.confidence

    def start_session(self, url: str, steps: List[str]) -> str:
        """Start execution session"""
        return self.learning.start_session(url, steps)

    def end_session(self) -> str:
        """End session and return generated Vero code"""
        vero = self.learning.get_live_vero()
        session = self.learning.end_session(vero)
        return vero

    def record_step_outcome(
        self,
        element: Dict,
        selector: str,
        strategy: str,
        step_text: str,
        action_type: str,
        success: bool,
        page_url: str,
        page_title: str,
        action_value: Optional[str] = None,
        error: Optional[str] = None,
        duration_ms: int = 0
    ):
        """Record outcome of a step execution"""
        context = ElementContext(
            element=element,
            page_url=page_url,
            page_title=page_title
        )

        if success:
            self.learning.record_success(
                context, selector, strategy, step_text,
                action_type, action_value, duration_ms
            )
        else:
            self.learning.record_failure(
                context, selector, strategy, step_text,
                action_type, error or "Unknown error"
            )


# Example usage
if __name__ == "__main__":
    # Initialize learning loop
    config = LearningConfig(
        execution_db_path="test_learning.db",
        embedding_db_path="test_embeddings.db"
    )
    learning = LearningLoop(config)

    # Start a session
    session_id = learning.start_session(
        target_url="https://example.com/login",
        steps=["Click Login", "Fill username", "Fill password", "Click Submit"]
    )

    # Simulate finding and interacting with elements
    login_button = ElementContext(
        element={
            "tag_name": "button",
            "text": "Login",
            "attributes": {"data-testid": "login-btn"}
        },
        page_url="https://example.com",
        page_title="Home"
    )

    # Get selector decision
    decision = learning.decide_selector(login_button, "Click Login")
    print(f"Selector decision: {decision.selector} (confidence: {decision.confidence:.2f})")

    # Record success
    learning.record_success(
        login_button,
        decision.selector,
        decision.strategy,
        "Click Login",
        "click",
        duration_ms=150
    )

    # Get live Vero code
    vero = learning.get_live_vero()
    print("\nGenerated Vero:")
    print(vero)

    # End session
    session = learning.end_session(vero)
    print(f"\nSession stats: {session.successful_steps} successes, {session.failed_steps} failures")

    # Get learning stats
    stats = learning.get_learning_stats()
    print(f"\nLearning stats: {json.dumps(stats, indent=2)}")
