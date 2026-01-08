"""
Semantic Search for Element Matching

Uses vector embeddings to find similar elements across pages:
1. Embed element descriptions (text, attributes, context)
2. Store embeddings in vector database
3. Query for similar elements when selectors fail
4. Learn from successful matches

Supports multiple embedding providers:
- OpenAI text-embedding-ada-002 / text-embedding-3-small
- Anthropic (via Claude)
- Sentence Transformers (local, offline)
- Custom fine-tuned models
"""

import json
import hashlib
import sqlite3
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any, Callable
from abc import ABC, abstractmethod
import numpy as np
from datetime import datetime


@dataclass
class ElementEmbedding:
    """Embedded representation of a page element"""
    element_hash: str
    text_content: str
    tag_name: str
    attributes: Dict[str, str]
    context: str  # Surrounding text, parent info, page title
    embedding: np.ndarray
    page_url: str
    selector: str
    success_count: int = 0
    last_used: Optional[datetime] = None


@dataclass
class SimilarElement:
    """A similar element found via semantic search"""
    element_hash: str
    similarity_score: float
    selector: str
    text_content: str
    tag_name: str
    page_url: str
    success_rate: float


class EmbeddingProvider(ABC):
    """Abstract base for embedding providers"""

    @abstractmethod
    def embed(self, text: str) -> np.ndarray:
        """Generate embedding for text"""
        pass

    @abstractmethod
    def embed_batch(self, texts: List[str]) -> List[np.ndarray]:
        """Generate embeddings for multiple texts"""
        pass

    @property
    @abstractmethod
    def dimension(self) -> int:
        """Return embedding dimension"""
        pass


class SentenceTransformerProvider(EmbeddingProvider):
    """
    Local embedding using Sentence Transformers.
    Good for offline use, no API costs.
    """

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        try:
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer(model_name)
            self._dimension = self.model.get_sentence_embedding_dimension()
        except ImportError:
            raise ImportError("sentence-transformers not installed. Run: pip install sentence-transformers")

    def embed(self, text: str) -> np.ndarray:
        return self.model.encode(text, convert_to_numpy=True)

    def embed_batch(self, texts: List[str]) -> List[np.ndarray]:
        return self.model.encode(texts, convert_to_numpy=True)

    @property
    def dimension(self) -> int:
        return self._dimension


class OpenAIProvider(EmbeddingProvider):
    """
    OpenAI embedding provider.
    High quality but requires API key and costs money.
    """

    def __init__(self, api_key: str, model: str = "text-embedding-3-small"):
        try:
            import openai
            self.client = openai.OpenAI(api_key=api_key)
            self.model = model
            # Dimensions: text-embedding-ada-002 = 1536, text-embedding-3-small = 1536
            self._dimension = 1536
        except ImportError:
            raise ImportError("openai not installed. Run: pip install openai")

    def embed(self, text: str) -> np.ndarray:
        response = self.client.embeddings.create(
            input=text,
            model=self.model
        )
        return np.array(response.data[0].embedding)

    def embed_batch(self, texts: List[str]) -> List[np.ndarray]:
        response = self.client.embeddings.create(
            input=texts,
            model=self.model
        )
        return [np.array(d.embedding) for d in response.data]

    @property
    def dimension(self) -> int:
        return self._dimension


class MockEmbeddingProvider(EmbeddingProvider):
    """
    Mock provider for testing without external dependencies.
    Uses simple hash-based pseudo-embeddings.
    """

    def __init__(self, dimension: int = 384):
        self._dimension = dimension

    def embed(self, text: str) -> np.ndarray:
        # Create deterministic pseudo-embedding from text hash
        hash_bytes = hashlib.sha256(text.encode()).digest()
        # Repeat hash to fill dimension
        repeated = (hash_bytes * (self._dimension // len(hash_bytes) + 1))[:self._dimension]
        arr = np.frombuffer(repeated, dtype=np.uint8).astype(np.float32)
        # Normalize
        return arr / np.linalg.norm(arr)

    def embed_batch(self, texts: List[str]) -> List[np.ndarray]:
        return [self.embed(t) for t in texts]

    @property
    def dimension(self) -> int:
        return self._dimension


class SemanticElementSearch:
    """
    Semantic search engine for finding similar page elements.

    Key features:
    1. Build rich text descriptions of elements
    2. Store embeddings efficiently
    3. Query for similar elements using cosine similarity
    4. Learn from feedback (successful matches boost similarity)
    """

    def __init__(
        self,
        provider: EmbeddingProvider,
        db_path: str = "element_embeddings.db"
    ):
        self.provider = provider
        self.db_path = Path(db_path)
        self._init_database()

        # In-memory cache for frequent queries
        self._embedding_cache: Dict[str, np.ndarray] = {}
        self._max_cache_size = 1000

    def _init_database(self):
        """Initialize SQLite database for embeddings"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS element_embeddings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                element_hash TEXT UNIQUE,
                text_content TEXT,
                tag_name TEXT,
                attributes TEXT,
                context TEXT,
                page_url TEXT,
                selector TEXT,
                embedding BLOB,
                dimension INTEGER,
                success_count INTEGER DEFAULT 0,
                failure_count INTEGER DEFAULT 0,
                last_used TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Full-text search index for fast text matching
        cursor.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS element_fts USING fts5(
                element_hash,
                text_content,
                tag_name,
                context
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tag_name ON element_embeddings(tag_name)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_page_url ON element_embeddings(page_url)")

        conn.commit()
        conn.close()

    def _build_element_description(self, element: Dict) -> str:
        """
        Build a rich text description for embedding.

        Includes:
        - Tag name and role
        - Text content
        - Key attributes (aria-label, placeholder, name, id)
        - Context (parent chain, page title)
        """
        parts = []

        # Tag and role
        tag = element.get('tag_name', element.get('tagName', 'element'))
        role = element.get('role') or element.get('attributes', {}).get('role', '')
        if role:
            parts.append(f"{role} {tag}")
        else:
            parts.append(tag)

        # Text content
        text = element.get('text', element.get('text_content', element.get('textContent', '')))
        if text:
            parts.append(f"with text '{text[:100]}'")

        # Key attributes
        attrs = element.get('attributes', {})
        for attr in ['aria-label', 'placeholder', 'name', 'title', 'alt']:
            if attrs.get(attr):
                parts.append(f"{attr}='{attrs[attr]}'")

        # Data test IDs
        for attr in ['data-testid', 'data-test-id', 'data-test', 'data-cy']:
            if attrs.get(attr):
                parts.append(f"test-id '{attrs[attr]}'")

        # Class names (filtered for semantic ones)
        class_name = attrs.get('class', '')
        if class_name:
            semantic_classes = self._extract_semantic_classes(class_name)
            if semantic_classes:
                parts.append(f"class '{' '.join(semantic_classes)}'")

        # Context
        context = element.get('context', '')
        if context:
            parts.append(f"in {context}")

        page_title = element.get('page_title', '')
        if page_title:
            parts.append(f"on page '{page_title}'")

        return ' '.join(parts)

    def _extract_semantic_classes(self, class_string: str) -> List[str]:
        """Extract meaningful (non-generated) class names"""
        if not class_string:
            return []

        import re

        semantic_keywords = [
            'btn', 'button', 'input', 'form', 'nav', 'header', 'footer',
            'menu', 'card', 'modal', 'dialog', 'list', 'item', 'link',
            'title', 'content', 'container', 'wrapper', 'panel', 'section',
            'login', 'submit', 'cancel', 'save', 'delete', 'edit', 'add',
            'search', 'filter', 'sort', 'table', 'row', 'cell', 'grid'
        ]

        exclude_patterns = [
            r'^[a-z]{1,2}\d+',  # Minified
            r'^_',              # Private
            r'^\d',             # Starts with number
            r'^css-',           # CSS-in-JS
            r'^sc-',            # Styled components
        ]

        meaningful = []
        for cls in class_string.split():
            if len(cls) < 3 or len(cls) > 30:
                continue
            if any(re.match(p, cls) for p in exclude_patterns):
                continue
            if any(kw in cls.lower() for kw in semantic_keywords):
                meaningful.append(cls)

        return meaningful[:3]

    def index_element(
        self,
        element: Dict,
        selector: str,
        page_url: str = ""
    ) -> str:
        """
        Index an element for future similarity search.

        Returns the element hash.
        """
        # Compute stable hash
        element_hash = self._compute_element_hash(element)

        # Check if already indexed
        if element_hash in self._embedding_cache:
            return element_hash

        # Build description and embed
        description = self._build_element_description(element)
        embedding = self.provider.embed(description)

        # Store in database
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        text_content = element.get('text', element.get('text_content', ''))
        tag_name = element.get('tag_name', element.get('tagName', ''))
        attributes = json.dumps(element.get('attributes', {}))
        context = element.get('context', '')

        try:
            cursor.execute("""
                INSERT INTO element_embeddings (
                    element_hash, text_content, tag_name, attributes, context,
                    page_url, selector, embedding, dimension, last_used
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(element_hash) DO UPDATE SET
                    selector = ?,
                    last_used = ?
            """, (
                element_hash, text_content, tag_name, attributes, context,
                page_url, selector, embedding.tobytes(), len(embedding),
                datetime.now().isoformat(),
                selector, datetime.now().isoformat()
            ))

            # Update FTS index
            cursor.execute("""
                INSERT INTO element_fts (element_hash, text_content, tag_name, context)
                VALUES (?, ?, ?, ?)
                ON CONFLICT DO NOTHING
            """, (element_hash, text_content, tag_name, context))

            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

        # Cache embedding
        self._cache_embedding(element_hash, embedding)

        return element_hash

    def find_similar(
        self,
        element: Dict,
        top_k: int = 5,
        min_similarity: float = 0.7,
        same_tag_only: bool = False
    ) -> List[SimilarElement]:
        """
        Find similar elements in the index.

        Args:
            element: Element to match
            top_k: Number of results to return
            min_similarity: Minimum cosine similarity threshold
            same_tag_only: Only return elements with same tag name

        Returns:
            List of similar elements sorted by similarity
        """
        # Embed query element
        description = self._build_element_description(element)
        query_embedding = self.provider.embed(description)

        # Get all embeddings from database
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        tag_filter = ""
        params = []
        if same_tag_only:
            tag_name = element.get('tag_name', element.get('tagName', ''))
            tag_filter = "WHERE tag_name = ?"
            params.append(tag_name)

        cursor.execute(f"""
            SELECT element_hash, embedding, dimension, selector, text_content,
                   tag_name, page_url, success_count, failure_count
            FROM element_embeddings
            {tag_filter}
        """, params)

        results = []
        for row in cursor.fetchall():
            element_hash, emb_bytes, dim, selector, text, tag, url, successes, failures = row

            # Reconstruct embedding
            stored_embedding = np.frombuffer(emb_bytes, dtype=np.float32)

            # Compute cosine similarity
            similarity = self._cosine_similarity(query_embedding, stored_embedding)

            if similarity >= min_similarity:
                # Compute success rate
                total = successes + failures
                success_rate = successes / total if total > 0 else 0.5

                results.append(SimilarElement(
                    element_hash=element_hash,
                    similarity_score=float(similarity),
                    selector=selector,
                    text_content=text,
                    tag_name=tag,
                    page_url=url,
                    success_rate=success_rate
                ))

        conn.close()

        # Sort by weighted score (similarity + success rate)
        results.sort(key=lambda x: x.similarity_score * 0.7 + x.success_rate * 0.3, reverse=True)

        return results[:top_k]

    def find_by_text(
        self,
        text: str,
        tag_name: Optional[str] = None,
        limit: int = 10
    ) -> List[SimilarElement]:
        """
        Find elements by text using full-text search.
        Faster than embedding search for exact/partial matches.
        """
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        # FTS query
        cursor.execute("""
            SELECT e.element_hash, e.selector, e.text_content, e.tag_name,
                   e.page_url, e.success_count, e.failure_count
            FROM element_fts f
            JOIN element_embeddings e ON f.element_hash = e.element_hash
            WHERE element_fts MATCH ?
            LIMIT ?
        """, (f'"{text}"', limit))

        results = []
        for row in cursor.fetchall():
            hash_, selector, text_content, tag, url, successes, failures = row

            if tag_name and tag != tag_name:
                continue

            total = successes + failures
            success_rate = successes / total if total > 0 else 0.5

            results.append(SimilarElement(
                element_hash=hash_,
                similarity_score=1.0,  # Exact text match
                selector=selector,
                text_content=text_content,
                tag_name=tag,
                page_url=url,
                success_rate=success_rate
            ))

        conn.close()
        return results

    def record_outcome(self, element_hash: str, success: bool):
        """Record success/failure for an element to improve future rankings"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        if success:
            cursor.execute("""
                UPDATE element_embeddings
                SET success_count = success_count + 1, last_used = ?
                WHERE element_hash = ?
            """, (datetime.now().isoformat(), element_hash))
        else:
            cursor.execute("""
                UPDATE element_embeddings
                SET failure_count = failure_count + 1, last_used = ?
                WHERE element_hash = ?
            """, (datetime.now().isoformat(), element_hash))

        conn.commit()
        conn.close()

    def _compute_element_hash(self, element: Dict) -> str:
        """Compute stable hash for element"""
        data = f"{element.get('tag_name', element.get('tagName', ''))}:"
        data += f"{element.get('text', element.get('text_content', ''))[:50]}:"

        attrs = element.get('attributes', {})
        for attr in ['data-testid', 'data-test-id', 'id', 'name', 'aria-label']:
            if attrs.get(attr):
                data += f"{attr}={attrs[attr]}:"

        return hashlib.md5(data.encode()).hexdigest()[:12]

    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """Compute cosine similarity between two vectors"""
        dot = np.dot(a, b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    def _cache_embedding(self, element_hash: str, embedding: np.ndarray):
        """Cache embedding in memory"""
        if len(self._embedding_cache) >= self._max_cache_size:
            # Remove oldest entry (FIFO)
            oldest_key = next(iter(self._embedding_cache))
            del self._embedding_cache[oldest_key]

        self._embedding_cache[element_hash] = embedding

    def get_stats(self) -> Dict:
        """Get index statistics"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM element_embeddings")
        total_elements = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(DISTINCT tag_name) FROM element_embeddings")
        unique_tags = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(DISTINCT page_url) FROM element_embeddings")
        unique_pages = cursor.fetchone()[0]

        cursor.execute("SELECT SUM(success_count), SUM(failure_count) FROM element_embeddings")
        row = cursor.fetchone()
        total_successes = row[0] or 0
        total_failures = row[1] or 0

        conn.close()

        return {
            "total_elements": total_elements,
            "unique_tags": unique_tags,
            "unique_pages": unique_pages,
            "total_interactions": total_successes + total_failures,
            "overall_success_rate": total_successes / (total_successes + total_failures) if (total_successes + total_failures) > 0 else 0,
            "cache_size": len(self._embedding_cache)
        }


class AdaptiveElementMatcher:
    """
    Combines multiple matching strategies with adaptive weighting.

    Strategies:
    1. Exact selector match (from history)
    2. Semantic embedding similarity
    3. Text/attribute fuzzy matching
    4. DOM position heuristics

    Learns optimal weights from success/failure feedback.
    """

    def __init__(
        self,
        semantic_search: SemanticElementSearch,
        selector_history: Dict[str, Dict] = None
    ):
        self.semantic_search = semantic_search
        self.selector_history = selector_history or {}

        # Adaptive weights (updated via feedback)
        self.weights = {
            "history_match": 0.4,
            "semantic_similarity": 0.3,
            "text_match": 0.2,
            "position_heuristic": 0.1
        }

    def find_best_selector(
        self,
        element: Dict,
        page_elements: List[Dict] = None
    ) -> Tuple[Optional[str], float]:
        """
        Find the best selector using all strategies.

        Returns:
            Tuple of (selector, confidence)
        """
        candidates = []

        # Strategy 1: Check history
        element_hash = self.semantic_search._compute_element_hash(element)
        if element_hash in self.selector_history:
            history = self.selector_history[element_hash]
            best_selector = max(history.items(), key=lambda x: x[1].get('success_rate', 0))
            candidates.append({
                "selector": best_selector[0],
                "confidence": best_selector[1].get('success_rate', 0.5) * self.weights["history_match"],
                "strategy": "history"
            })

        # Strategy 2: Semantic search
        similar = self.semantic_search.find_similar(element, top_k=3)
        for match in similar:
            candidates.append({
                "selector": match.selector,
                "confidence": match.similarity_score * match.success_rate * self.weights["semantic_similarity"],
                "strategy": "semantic"
            })

        # Strategy 3: Text-based search
        text = element.get('text', element.get('text_content', ''))
        if text:
            text_matches = self.semantic_search.find_by_text(
                text,
                tag_name=element.get('tag_name')
            )
            for match in text_matches[:3]:
                candidates.append({
                    "selector": match.selector,
                    "confidence": match.success_rate * self.weights["text_match"],
                    "strategy": "text"
                })

        if not candidates:
            return None, 0.0

        # Select best candidate
        best = max(candidates, key=lambda x: x["confidence"])
        return best["selector"], best["confidence"]

    def record_feedback(
        self,
        element_hash: str,
        selector: str,
        success: bool,
        strategy: str
    ):
        """Record feedback to improve future matching"""
        # Update selector history
        if element_hash not in self.selector_history:
            self.selector_history[element_hash] = {}

        if selector not in self.selector_history[element_hash]:
            self.selector_history[element_hash][selector] = {
                "attempts": 0,
                "successes": 0,
                "success_rate": 0.5
            }

        history = self.selector_history[element_hash][selector]
        history["attempts"] += 1
        if success:
            history["successes"] += 1
        history["success_rate"] = history["successes"] / history["attempts"]

        # Update semantic search
        self.semantic_search.record_outcome(element_hash, success)

        # Adaptive weight adjustment
        self._adjust_weights(strategy, success)

    def _adjust_weights(self, strategy: str, success: bool):
        """Slightly adjust weights based on strategy success"""
        learning_rate = 0.01

        strategy_key = {
            "history": "history_match",
            "semantic": "semantic_similarity",
            "text": "text_match"
        }.get(strategy)

        if not strategy_key:
            return

        if success:
            # Increase weight for successful strategy
            self.weights[strategy_key] = min(0.5, self.weights[strategy_key] + learning_rate)
        else:
            # Decrease weight for failed strategy
            self.weights[strategy_key] = max(0.1, self.weights[strategy_key] - learning_rate)

        # Normalize weights
        total = sum(self.weights.values())
        for key in self.weights:
            self.weights[key] /= total


# Example usage
if __name__ == "__main__":
    # Use mock provider for testing
    provider = MockEmbeddingProvider(dimension=384)
    search = SemanticElementSearch(provider, "test_embeddings.db")

    # Index some elements
    elements = [
        {
            "tag_name": "button",
            "text_content": "Login",
            "attributes": {"data-testid": "login-btn", "class": "btn-primary"}
        },
        {
            "tag_name": "button",
            "text_content": "Sign In",
            "attributes": {"class": "login-button"}
        },
        {
            "tag_name": "input",
            "text_content": "",
            "attributes": {"placeholder": "Enter username", "name": "username"}
        }
    ]

    for el in elements:
        element_hash = search.index_element(el, f"[data-testid='{el.get('attributes', {}).get('data-testid', '')}']")
        print(f"Indexed: {element_hash}")

    # Search for similar
    query = {
        "tag_name": "button",
        "text_content": "Log In"
    }

    similar = search.find_similar(query, top_k=5, min_similarity=0.5)
    print("\nSimilar elements:")
    for match in similar:
        print(f"  - {match.text_content} ({match.similarity_score:.2f}): {match.selector}")

    # Stats
    print("\nStats:", search.get_stats())
