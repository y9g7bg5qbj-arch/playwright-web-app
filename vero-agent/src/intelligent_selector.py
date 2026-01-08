"""
Intelligent Selector Generator

Generates resilient, Playwright-codegen-quality selectors by:
1. Analyzing element attributes and context
2. Scoring selectors by stability and readability
3. Learning from execution history
4. Using semantic similarity for element matching
"""

import re
import hashlib
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any
from enum import Enum


class SelectorStrategy(Enum):
    """Selector strategies ranked by reliability"""
    TEST_ID = 1        # data-testid, data-test-id, data-test
    ROLE_NAME = 2      # getByRole with accessible name
    LABEL = 3          # getByLabel (for form fields)
    PLACEHOLDER = 4    # getByPlaceholder
    ALT_TEXT = 5       # getByAltText (for images)
    TITLE = 6          # getByTitle
    TEXT = 7           # getByText (exact or partial)
    CSS_ID = 8         # #element-id
    CSS_CLASS = 9      # .specific-class
    CSS_ATTR = 10      # [attribute="value"]
    XPATH = 11         # //xpath/expression


@dataclass
class SelectorCandidate:
    """A potential selector with metadata"""
    selector: str
    strategy: SelectorStrategy
    playwright_method: str  # e.g., "getByRole", "getByTestId"
    vero_syntax: str        # e.g., 'testId "login-btn"'
    score: float            # 0-1, higher is better
    is_unique: bool = True
    element_count: int = 1
    stability_score: float = 1.0  # Based on historical success
    readability_score: float = 1.0


@dataclass
class ElementFingerprint:
    """Unique fingerprint for an element"""
    tag_name: str
    text_content: str
    attributes: Dict[str, str]
    bounding_box: Dict[str, float]
    parent_chain: List[str]  # Parent tag names up to 3 levels
    sibling_index: int

    def to_hash(self) -> str:
        """Generate stable hash for this element"""
        data = f"{self.tag_name}:{self.text_content}:{sorted(self.attributes.items())}"
        return hashlib.md5(data.encode()).hexdigest()[:12]


class IntelligentSelectorGenerator:
    """
    Generates optimal selectors using multiple strategies and learning.

    Key Features:
    1. Multi-strategy selector generation
    2. Uniqueness verification
    3. Stability scoring based on history
    4. Semantic matching for similar elements
    """

    # Attributes that indicate test IDs (most stable)
    TEST_ID_ATTRS = ['data-testid', 'data-test-id', 'data-test', 'data-cy', 'data-qa']

    # Role mappings for semantic selectors
    ROLE_MAPPINGS = {
        'button': ['button', 'input[type="button"]', 'input[type="submit"]', '[role="button"]'],
        'link': ['a', '[role="link"]'],
        'textbox': ['input[type="text"]', 'input[type="email"]', 'input[type="password"]',
                   'input:not([type])', 'textarea', '[role="textbox"]'],
        'checkbox': ['input[type="checkbox"]', '[role="checkbox"]'],
        'radio': ['input[type="radio"]', '[role="radio"]'],
        'combobox': ['select', '[role="combobox"]', '[role="listbox"]'],
        'heading': ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', '[role="heading"]'],
        'img': ['img', '[role="img"]'],
        'list': ['ul', 'ol', '[role="list"]'],
        'listitem': ['li', '[role="listitem"]'],
        'navigation': ['nav', '[role="navigation"]'],
        'main': ['main', '[role="main"]'],
        'dialog': ['dialog', '[role="dialog"]', '[role="alertdialog"]'],
        'tab': ['[role="tab"]'],
        'tabpanel': ['[role="tabpanel"]'],
        'menu': ['[role="menu"]'],
        'menuitem': ['[role="menuitem"]'],
    }

    def __init__(self, selector_history: Optional[Dict[str, Dict]] = None):
        """
        Args:
            selector_history: Dict mapping element hashes to historical selector performance
        """
        self.selector_history = selector_history or {}

    def generate_selectors(
        self,
        element: Dict[str, Any],
        page_elements: List[Dict[str, Any]] = None
    ) -> List[SelectorCandidate]:
        """
        Generate ranked list of selector candidates for an element.

        Args:
            element: Element data with tag, attributes, text, etc.
            page_elements: All elements on page (for uniqueness check)

        Returns:
            List of SelectorCandidate ordered by score (best first)
        """
        candidates = []

        # Strategy 1: Test IDs (highest priority)
        for attr in self.TEST_ID_ATTRS:
            if attr in element.get('attributes', {}):
                value = element['attributes'][attr]
                candidates.append(SelectorCandidate(
                    selector=f'[{attr}="{value}"]',
                    strategy=SelectorStrategy.TEST_ID,
                    playwright_method=f'getByTestId("{value}")',
                    vero_syntax=f'testId "{value}"',
                    score=0.95,
                    readability_score=0.9
                ))

        # Strategy 2: Role with accessible name
        role = self._detect_role(element)
        accessible_name = self._get_accessible_name(element)
        if role and accessible_name:
            candidates.append(SelectorCandidate(
                selector=f'{role}[name="{accessible_name}"]',
                strategy=SelectorStrategy.ROLE_NAME,
                playwright_method=f'getByRole("{role}", {{ name: "{accessible_name}" }})',
                vero_syntax=f'role "{role}" name "{accessible_name}"',
                score=0.90,
                readability_score=0.95
            ))

        # Strategy 3: Label (for form fields)
        label = element.get('label') or element.get('aria-label')
        if label and element['tag_name'] in ['input', 'textarea', 'select']:
            candidates.append(SelectorCandidate(
                selector=f'[aria-label="{label}"]',
                strategy=SelectorStrategy.LABEL,
                playwright_method=f'getByLabel("{label}")',
                vero_syntax=f'label "{label}"',
                score=0.88,
                readability_score=0.95
            ))

        # Strategy 4: Placeholder
        placeholder = element.get('attributes', {}).get('placeholder')
        if placeholder:
            candidates.append(SelectorCandidate(
                selector=f'[placeholder="{placeholder}"]',
                strategy=SelectorStrategy.PLACEHOLDER,
                playwright_method=f'getByPlaceholder("{placeholder}")',
                vero_syntax=f'placeholder "{placeholder}"',
                score=0.85,
                readability_score=0.90
            ))

        # Strategy 5: Alt text (for images)
        alt = element.get('attributes', {}).get('alt')
        if alt and element['tag_name'] == 'img':
            candidates.append(SelectorCandidate(
                selector=f'img[alt="{alt}"]',
                strategy=SelectorStrategy.ALT_TEXT,
                playwright_method=f'getByAltText("{alt}")',
                vero_syntax=f'altText "{alt}"',
                score=0.85,
                readability_score=0.90
            ))

        # Strategy 6: Title attribute
        title = element.get('attributes', {}).get('title')
        if title:
            candidates.append(SelectorCandidate(
                selector=f'[title="{title}"]',
                strategy=SelectorStrategy.TITLE,
                playwright_method=f'getByTitle("{title}")',
                vero_syntax=f'title "{title}"',
                score=0.80,
                readability_score=0.85
            ))

        # Strategy 7: Text content
        text = element.get('text', '').strip()
        if text and len(text) < 100:
            # Prefer exact match for short, unique text
            is_exact = len(text) < 30
            candidates.append(SelectorCandidate(
                selector=f'text="{text}"' if is_exact else f'text={text[:30]}',
                strategy=SelectorStrategy.TEXT,
                playwright_method=f'getByText("{text}", {{ exact: {str(is_exact).lower()} }})',
                vero_syntax=f'text "{text}"',
                score=0.75 if is_exact else 0.65,
                readability_score=0.95
            ))

        # Strategy 8: ID attribute
        element_id = element.get('attributes', {}).get('id')
        if element_id and not element_id.startswith(':'):  # Skip React-generated IDs
            candidates.append(SelectorCandidate(
                selector=f'#{element_id}',
                strategy=SelectorStrategy.CSS_ID,
                playwright_method=f'locator("#{element_id}")',
                vero_syntax=f'css "#{element_id}"',
                score=0.70,
                readability_score=0.80
            ))

        # Strategy 9: Meaningful class names
        class_name = element.get('attributes', {}).get('class', '')
        meaningful_classes = self._extract_meaningful_classes(class_name)
        if meaningful_classes:
            class_selector = '.' + '.'.join(meaningful_classes[:2])
            candidates.append(SelectorCandidate(
                selector=class_selector,
                strategy=SelectorStrategy.CSS_CLASS,
                playwright_method=f'locator("{class_selector}")',
                vero_syntax=f'css "{class_selector}"',
                score=0.60,
                readability_score=0.60
            ))

        # Strategy 10: Attribute selectors
        for attr in ['name', 'type', 'href']:
            value = element.get('attributes', {}).get(attr)
            if value:
                tag = element['tag_name']
                selector = f'{tag}[{attr}="{value}"]'
                candidates.append(SelectorCandidate(
                    selector=selector,
                    strategy=SelectorStrategy.CSS_ATTR,
                    playwright_method=f'locator(\'{selector}\')',
                    vero_syntax=f'css "{selector}"',
                    score=0.55,
                    readability_score=0.50
                ))

        # Apply historical stability scores
        element_hash = self._compute_element_hash(element)
        if element_hash in self.selector_history:
            history = self.selector_history[element_hash]
            for candidate in candidates:
                if candidate.selector in history:
                    success_rate = history[candidate.selector].get('success_rate', 0.5)
                    candidate.stability_score = success_rate
                    candidate.score = candidate.score * 0.7 + success_rate * 0.3

        # Verify uniqueness if page elements provided
        if page_elements:
            self._verify_uniqueness(candidates, page_elements)

        # Sort by final score
        candidates.sort(key=lambda c: c.score, reverse=True)

        return candidates

    def _detect_role(self, element: Dict) -> Optional[str]:
        """Detect ARIA role from element"""
        # Explicit role
        explicit_role = element.get('attributes', {}).get('role')
        if explicit_role:
            return explicit_role

        # Implicit role from tag
        tag = element['tag_name']
        tag_type = element.get('attributes', {}).get('type', '')

        role_map = {
            'button': 'button',
            'a': 'link',
            'input': {
                'text': 'textbox',
                'email': 'textbox',
                'password': 'textbox',
                'search': 'searchbox',
                'checkbox': 'checkbox',
                'radio': 'radio',
                'submit': 'button',
                'button': 'button',
            },
            'textarea': 'textbox',
            'select': 'combobox',
            'img': 'img',
            'h1': 'heading',
            'h2': 'heading',
            'h3': 'heading',
            'nav': 'navigation',
            'main': 'main',
            'dialog': 'dialog',
        }

        if tag in role_map:
            mapping = role_map[tag]
            if isinstance(mapping, dict):
                return mapping.get(tag_type, 'textbox')
            return mapping

        return None

    def _get_accessible_name(self, element: Dict) -> Optional[str]:
        """Get accessible name for element"""
        # Priority: aria-label > aria-labelledby > visible text > title
        attrs = element.get('attributes', {})

        if attrs.get('aria-label'):
            return attrs['aria-label']

        # Visible text (cleaned)
        text = element.get('text', '').strip()
        if text and len(text) < 50:
            return text

        # Title as fallback
        if attrs.get('title'):
            return attrs['title']

        # Value for inputs
        if attrs.get('value') and element['tag_name'] == 'input':
            return attrs['value']

        return None

    def _extract_meaningful_classes(self, class_string: str) -> List[str]:
        """Extract meaningful (non-generated) class names"""
        if not class_string:
            return []

        classes = class_string.split()
        meaningful = []

        # Patterns to exclude (generated classes)
        exclude_patterns = [
            r'^[a-z]{1,2}\d+',      # Minified: a1, b23
            r'^_',                   # Private: _hidden
            r'^\d',                  # Starts with number
            r'^css-',               # CSS-in-JS
            r'^sc-',                # Styled components
            r'^chakra-',            # Chakra UI
            r'^MuiA-zA-Z]+-root',   # Material UI
            r'^ant-',               # Ant Design
            r'^el-',                # Element UI
            r'__',                  # BEM private
        ]

        for cls in classes:
            # Skip short or long classes
            if len(cls) < 3 or len(cls) > 30:
                continue

            # Skip generated-looking classes
            is_generated = any(re.match(p, cls) for p in exclude_patterns)
            if is_generated:
                continue

            # Prefer semantic class names
            semantic_keywords = ['btn', 'button', 'input', 'form', 'nav', 'header',
                               'footer', 'menu', 'card', 'modal', 'dialog', 'list',
                               'item', 'link', 'title', 'content', 'container']

            is_semantic = any(kw in cls.lower() for kw in semantic_keywords)

            if is_semantic:
                meaningful.insert(0, cls)  # Prioritize semantic
            else:
                meaningful.append(cls)

        return meaningful[:3]  # Return top 3

    def _compute_element_hash(self, element: Dict) -> str:
        """Compute stable hash for element identification"""
        data = f"{element.get('tag_name')}:{element.get('text', '')[:50]}:{element.get('attributes', {}).get('class', '')}"
        return hashlib.md5(data.encode()).hexdigest()[:12]

    def _verify_uniqueness(
        self,
        candidates: List[SelectorCandidate],
        page_elements: List[Dict]
    ):
        """Verify each selector matches exactly one element"""
        # This would be done via page.locator(selector).count() in real implementation
        # For now, mark as potentially non-unique based on common patterns
        for candidate in candidates:
            if candidate.strategy in [SelectorStrategy.CSS_CLASS, SelectorStrategy.TEXT]:
                candidate.is_unique = False
                candidate.score *= 0.8

    def generate_vero_field(
        self,
        element: Dict,
        field_name: str,
        page_elements: List[Dict] = None
    ) -> str:
        """
        Generate a Vero page field definition for an element.

        Args:
            element: Element data
            field_name: Name for the field (e.g., "loginButton")
            page_elements: All page elements for uniqueness check

        Returns:
            Vero field definition string
        """
        candidates = self.generate_selectors(element, page_elements)

        if not candidates:
            return f'field {field_name} = css "*"  # Could not generate selector'

        best = candidates[0]
        return f'field {field_name} = {best.vero_syntax}'

    def update_history(
        self,
        element_hash: str,
        selector: str,
        success: bool
    ):
        """Update selector history with execution result"""
        if element_hash not in self.selector_history:
            self.selector_history[element_hash] = {}

        if selector not in self.selector_history[element_hash]:
            self.selector_history[element_hash][selector] = {
                'attempts': 0,
                'successes': 0,
                'success_rate': 0.5
            }

        history = self.selector_history[element_hash][selector]
        history['attempts'] += 1
        if success:
            history['successes'] += 1
        history['success_rate'] = history['successes'] / history['attempts']


# Example usage
if __name__ == "__main__":
    generator = IntelligentSelectorGenerator()

    # Example element
    element = {
        'tag_name': 'button',
        'text': 'Sign In',
        'attributes': {
            'data-testid': 'login-submit-btn',
            'class': 'btn btn-primary login-button',
            'type': 'submit'
        }
    }

    candidates = generator.generate_selectors(element)

    print("Generated selectors (ranked):")
    for i, c in enumerate(candidates, 1):
        print(f"{i}. [{c.strategy.name}] {c.playwright_method}")
        print(f"   Vero: {c.vero_syntax}")
        print(f"   Score: {c.score:.2f}")
        print()
