"""
Vero Scenario Recorder

Generates Vero DSL code from execution sessions:
1. Records all interactions during live execution
2. Analyzes patterns and consolidates selectors
3. Generates clean, maintainable Vero scenarios
4. Creates reusable Page objects from repeated patterns

This enables "record and playback" style test creation
with AI-quality selector generation.
"""

import re
from datetime import datetime
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any
from enum import Enum

from .execution_store import (
    ExecutionStore,
    ElementInteraction,
    ExecutionOutcome,
    compute_element_hash
)
from .intelligent_selector import (
    IntelligentSelectorGenerator,
    SelectorCandidate,
    SelectorStrategy
)


class VeroActionType(Enum):
    """Vero DSL action types"""
    NAVIGATE = "navigate"
    CLICK = "click"
    FILL = "fill"
    SELECT = "select"
    CHECK = "check"
    UNCHECK = "uncheck"
    HOVER = "hover"
    PRESS = "press"
    WAIT = "wait"
    ASSERT = "assert"
    SCROLL = "scroll"
    SCREENSHOT = "screenshot"


@dataclass
class VeroStep:
    """A single Vero DSL step"""
    action: VeroActionType
    target: Optional[str] = None  # Element selector/description
    value: Optional[str] = None   # For fill, select, etc.
    vero_syntax: str = ""         # Final Vero DSL line
    comment: Optional[str] = None
    page_field: Optional[str] = None  # Reference to Page field if used


@dataclass
class PageField:
    """A field in a Vero Page object"""
    name: str
    selector_type: str  # testId, role, text, css, etc.
    selector_value: str
    tag_name: str
    usage_count: int = 1


@dataclass
class VeroPage:
    """A Vero Page object for reusable selectors"""
    name: str
    url_pattern: str
    fields: Dict[str, PageField] = field(default_factory=dict)


@dataclass
class VeroScenario:
    """Complete Vero test scenario"""
    feature_name: str
    scenario_name: str
    tags: List[str] = field(default_factory=list)
    steps: List[VeroStep] = field(default_factory=list)
    pages_used: List[str] = field(default_factory=list)


class VeroRecorder:
    """
    Records execution interactions and generates Vero DSL.

    Key features:
    1. Converts interactions to Vero steps
    2. Generates optimal selectors using IntelligentSelectorGenerator
    3. Creates Page objects for repeated element access
    4. Produces clean, readable Vero code
    """

    def __init__(
        self,
        store: ExecutionStore,
        selector_generator: Optional[IntelligentSelectorGenerator] = None
    ):
        self.store = store
        self.selector_generator = selector_generator or IntelligentSelectorGenerator()

        # Track pages and fields during recording
        self._pages: Dict[str, VeroPage] = {}
        self._field_counter: Dict[str, int] = {}

    def generate_from_session(
        self,
        session_id: str,
        feature_name: str = "RecordedFeature",
        scenario_name: str = "Recorded Scenario",
        create_pages: bool = True
    ) -> Tuple[str, Dict[str, str]]:
        """
        Generate Vero DSL from a completed execution session.

        Args:
            session_id: ID of the execution session
            feature_name: Name for the Feature block
            scenario_name: Name for the Scenario
            create_pages: Whether to create Page objects for selectors

        Returns:
            Tuple of (vero_code, pages_dict)
        """
        # Get all successful interactions from session
        interactions = self.store.get_successful_session_interactions(session_id)

        if not interactions:
            return "", {}

        # Convert interactions to Vero steps
        steps = []
        for interaction in interactions:
            step = self._interaction_to_step(interaction, create_pages)
            if step:
                steps.append(step)

        # Consolidate repeated patterns
        steps = self._consolidate_steps(steps)

        # Generate Vero code
        scenario = VeroScenario(
            feature_name=feature_name,
            scenario_name=scenario_name,
            steps=steps,
            pages_used=list(self._pages.keys())
        )

        vero_code = self._render_scenario(scenario)

        # Generate Page code
        pages_code = {}
        if create_pages:
            for page_name, page in self._pages.items():
                pages_code[page_name] = self._render_page(page)

        return vero_code, pages_code

    def generate_from_interactions(
        self,
        interactions: List[ElementInteraction],
        feature_name: str = "GeneratedFeature",
        scenario_name: str = "Generated Scenario"
    ) -> str:
        """
        Generate Vero DSL from a list of interactions.
        Useful for generating code from live execution.
        """
        steps = []
        for interaction in interactions:
            step = self._interaction_to_step(interaction, create_pages=False)
            if step:
                steps.append(step)

        scenario = VeroScenario(
            feature_name=feature_name,
            scenario_name=scenario_name,
            steps=steps
        )

        return self._render_scenario(scenario)

    def _interaction_to_step(
        self,
        interaction: ElementInteraction,
        create_pages: bool = True
    ) -> Optional[VeroStep]:
        """Convert an ElementInteraction to a VeroStep"""

        action_type = self._map_action_type(interaction.action_type)
        if not action_type:
            return None

        # Build element dict for selector generation
        element = {
            "tag_name": interaction.tag_name,
            "text": interaction.text_content,
            "attributes": interaction.attributes,
            "bounding_box": interaction.bounding_box
        }

        # Get best selector
        selector_candidates = self.selector_generator.generate_selectors(element)

        if not selector_candidates:
            # Fallback to recorded selector
            vero_selector = f'css "{interaction.selector_used}"'
        else:
            best = selector_candidates[0]
            vero_selector = best.vero_syntax

        # Create Page field if enabled
        page_field = None
        if create_pages and action_type in [
            VeroActionType.CLICK, VeroActionType.FILL,
            VeroActionType.SELECT, VeroActionType.CHECK
        ]:
            page_field = self._create_or_get_field(
                interaction, vero_selector, selector_candidates
            )

        # Build Vero syntax
        vero_syntax = self._build_vero_syntax(
            action_type,
            vero_selector if not page_field else f"${page_field}",
            interaction.action_value,
            interaction.text_content
        )

        return VeroStep(
            action=action_type,
            target=vero_selector,
            value=interaction.action_value,
            vero_syntax=vero_syntax,
            page_field=page_field,
            comment=f"# {interaction.step_text}" if interaction.step_text else None
        )

    def _map_action_type(self, action: str) -> Optional[VeroActionType]:
        """Map interaction action to Vero action type"""
        mapping = {
            "click": VeroActionType.CLICK,
            "fill": VeroActionType.FILL,
            "type": VeroActionType.FILL,
            "select": VeroActionType.SELECT,
            "check": VeroActionType.CHECK,
            "uncheck": VeroActionType.UNCHECK,
            "hover": VeroActionType.HOVER,
            "press": VeroActionType.PRESS,
            "navigate": VeroActionType.NAVIGATE,
            "goto": VeroActionType.NAVIGATE,
            "wait": VeroActionType.WAIT,
            "assert": VeroActionType.ASSERT,
            "verify": VeroActionType.ASSERT,
            "scroll": VeroActionType.SCROLL,
            "screenshot": VeroActionType.SCREENSHOT,
        }
        return mapping.get(action.lower())

    def _create_or_get_field(
        self,
        interaction: ElementInteraction,
        vero_selector: str,
        candidates: List[SelectorCandidate]
    ) -> str:
        """Create or get existing Page field for element"""

        # Determine page from URL
        page_name = self._get_page_name(interaction.page_url)

        if page_name not in self._pages:
            self._pages[page_name] = VeroPage(
                name=page_name,
                url_pattern=self._url_to_pattern(interaction.page_url)
            )

        page = self._pages[page_name]

        # Generate field name from element
        field_name = self._generate_field_name(interaction)

        # Check if field already exists with same selector
        for existing_name, existing_field in page.fields.items():
            if existing_field.selector_value == vero_selector:
                existing_field.usage_count += 1
                return f"{page_name}.{existing_name}"

        # Create new field
        if candidates:
            best = candidates[0]
            selector_type = best.strategy.name.lower()
            selector_value = best.vero_syntax
        else:
            selector_type = "css"
            selector_value = vero_selector

        page.fields[field_name] = PageField(
            name=field_name,
            selector_type=selector_type,
            selector_value=selector_value,
            tag_name=interaction.tag_name
        )

        return f"{page_name}.{field_name}"

    def _get_page_name(self, url: str) -> str:
        """Generate Page name from URL"""
        from urllib.parse import urlparse

        parsed = urlparse(url)
        path = parsed.path.strip("/")

        if not path:
            return "HomePage"

        # Convert path to PascalCase
        parts = path.split("/")
        name = "".join(p.title().replace("-", "").replace("_", "") for p in parts if p)

        return f"{name}Page" if not name.endswith("Page") else name

    def _url_to_pattern(self, url: str) -> str:
        """Convert URL to pattern for matching"""
        from urllib.parse import urlparse

        parsed = urlparse(url)
        # Replace dynamic segments with wildcards
        path = re.sub(r'/\d+', '/*', parsed.path)
        return f"{parsed.netloc}{path}"

    def _generate_field_name(self, interaction: ElementInteraction) -> str:
        """Generate meaningful field name from interaction"""

        base_name = ""

        # Try to use text content
        if interaction.text_content:
            base_name = self._to_camel_case(interaction.text_content[:20])

        # Try aria-label
        elif interaction.attributes.get("aria-label"):
            base_name = self._to_camel_case(interaction.attributes["aria-label"][:20])

        # Try placeholder
        elif interaction.attributes.get("placeholder"):
            base_name = self._to_camel_case(interaction.attributes["placeholder"][:20])

        # Try name
        elif interaction.attributes.get("name"):
            base_name = self._to_camel_case(interaction.attributes["name"])

        # Try test-id
        elif interaction.attributes.get("data-testid"):
            base_name = self._to_camel_case(interaction.attributes["data-testid"])

        # Fallback to tag + action
        else:
            base_name = f"{interaction.tag_name}{interaction.action_type.title()}"

        # Add suffix for element type
        suffix = self._get_element_suffix(interaction.tag_name, interaction.action_type)
        if suffix and not base_name.lower().endswith(suffix.lower()):
            base_name += suffix

        # Ensure unique name
        return self._make_unique_name(base_name)

    def _to_camel_case(self, text: str) -> str:
        """Convert text to camelCase"""
        # Remove special chars, keep alphanumeric
        clean = re.sub(r'[^a-zA-Z0-9\s]', '', text)
        words = clean.split()

        if not words:
            return "element"

        # First word lowercase, rest title case
        result = words[0].lower()
        for word in words[1:]:
            result += word.title()

        return result

    def _get_element_suffix(self, tag_name: str, action_type: str) -> str:
        """Get appropriate suffix for element type"""
        if tag_name == "button" or action_type == "click":
            return "Button"
        elif tag_name == "input":
            return "Input"
        elif tag_name == "select":
            return "Select"
        elif tag_name == "a":
            return "Link"
        elif tag_name == "textarea":
            return "TextArea"
        return ""

    def _make_unique_name(self, base_name: str) -> str:
        """Make field name unique within page"""
        if base_name not in self._field_counter:
            self._field_counter[base_name] = 0
            return base_name

        self._field_counter[base_name] += 1
        return f"{base_name}{self._field_counter[base_name]}"

    def _build_vero_syntax(
        self,
        action: VeroActionType,
        target: str,
        value: Optional[str],
        text_hint: str = ""
    ) -> str:
        """Build Vero DSL syntax for an action"""

        if action == VeroActionType.NAVIGATE:
            return f'navigate to "{value or target}"'

        elif action == VeroActionType.CLICK:
            # Use text hint if available
            if text_hint and len(text_hint) < 30:
                return f'click "{text_hint}" button'
            return f'click {target}'

        elif action == VeroActionType.FILL:
            if text_hint:
                return f'fill "{text_hint}" with "{value}"'
            return f'fill {target} with "{value}"'

        elif action == VeroActionType.SELECT:
            return f'select "{value}" from {target}'

        elif action == VeroActionType.CHECK:
            return f'check {target}'

        elif action == VeroActionType.UNCHECK:
            return f'uncheck {target}'

        elif action == VeroActionType.HOVER:
            return f'hover over {target}'

        elif action == VeroActionType.PRESS:
            return f'press "{value}"'

        elif action == VeroActionType.WAIT:
            if value and value.isdigit():
                return f'wait {value} seconds'
            return f'wait for {target} to be visible'

        elif action == VeroActionType.ASSERT:
            return f'assert {target} is visible'

        elif action == VeroActionType.SCROLL:
            return f'scroll {value or "down"}'

        elif action == VeroActionType.SCREENSHOT:
            return f'take screenshot as "{value or "screenshot"}"'

        return f'# Unknown action: {action.value} on {target}'

    def _consolidate_steps(self, steps: List[VeroStep]) -> List[VeroStep]:
        """Consolidate repeated patterns in steps"""

        # Remove consecutive duplicates
        consolidated = []
        prev_syntax = None

        for step in steps:
            if step.vero_syntax != prev_syntax:
                consolidated.append(step)
                prev_syntax = step.vero_syntax

        # TODO: Detect loops (e.g., clicking Next 5 times)
        # TODO: Detect data-driven patterns

        return consolidated

    def _render_scenario(self, scenario: VeroScenario) -> str:
        """Render complete Vero scenario code"""

        lines = []

        # Feature block
        lines.append(f'Feature "{scenario.feature_name}"')
        lines.append("")

        # Import pages if used
        if scenario.pages_used:
            for page in scenario.pages_used:
                lines.append(f'  use {page}')
            lines.append("")

        # Scenario
        lines.append(f'  Scenario "{scenario.scenario_name}"')

        # Steps
        for step in scenario.steps:
            if step.comment:
                lines.append(f"    {step.comment}")
            lines.append(f"    {step.vero_syntax}")

        lines.append("")

        return "\n".join(lines)

    def _render_page(self, page: VeroPage) -> str:
        """Render Vero Page object code"""

        lines = []

        lines.append(f'Page {page.name}')
        lines.append(f'  url pattern "{page.url_pattern}"')
        lines.append("")

        for field_name, field in page.fields.items():
            lines.append(f'  field {field_name} = {field.selector_value}')

        lines.append("")

        return "\n".join(lines)


class LiveVeroRecorder:
    """
    Real-time Vero recorder for live execution.

    Buffers interactions and generates Vero code on-demand.
    """

    def __init__(self):
        self.interactions: List[ElementInteraction] = []
        self.selector_generator = IntelligentSelectorGenerator()
        self._pages: Dict[str, VeroPage] = {}

    def record(self, interaction: ElementInteraction):
        """Record an interaction"""
        self.interactions.append(interaction)

    def get_current_vero(self) -> str:
        """Get current Vero code from recorded interactions"""
        store = ExecutionStore(":memory:")  # In-memory for live use
        recorder = VeroRecorder(store, self.selector_generator)
        return recorder.generate_from_interactions(
            self.interactions,
            feature_name="LiveRecording",
            scenario_name="Live Session"
        )

    def clear(self):
        """Clear recorded interactions"""
        self.interactions = []
        self._pages = {}


# Example usage
if __name__ == "__main__":
    from uuid import uuid4

    # Create store and recorder
    store = ExecutionStore(":memory:")
    recorder = VeroRecorder(store)

    # Simulate some interactions
    interactions = [
        ElementInteraction(
            id=str(uuid4()),
            timestamp=datetime.now(),
            element_hash="hash1",
            tag_name="input",
            text_content="",
            attributes={"placeholder": "Username", "name": "username"},
            bounding_box={},
            selector_used='input[name="username"]',
            selector_strategy="attribute",
            all_selectors_tried=[],
            page_url="https://example.com/login",
            page_title="Login",
            step_text="Fill username with admin",
            action_type="fill",
            action_value="admin",
            outcome=ExecutionOutcome.SUCCESS,
            duration_ms=100
        ),
        ElementInteraction(
            id=str(uuid4()),
            timestamp=datetime.now(),
            element_hash="hash2",
            tag_name="input",
            text_content="",
            attributes={"placeholder": "Password", "type": "password"},
            bounding_box={},
            selector_used='input[type="password"]',
            selector_strategy="attribute",
            all_selectors_tried=[],
            page_url="https://example.com/login",
            page_title="Login",
            step_text="Fill password with secret",
            action_type="fill",
            action_value="secret123",
            outcome=ExecutionOutcome.SUCCESS,
            duration_ms=80
        ),
        ElementInteraction(
            id=str(uuid4()),
            timestamp=datetime.now(),
            element_hash="hash3",
            tag_name="button",
            text_content="Sign In",
            attributes={"data-testid": "login-submit"},
            bounding_box={},
            selector_used='[data-testid="login-submit"]',
            selector_strategy="test_id",
            all_selectors_tried=[],
            page_url="https://example.com/login",
            page_title="Login",
            step_text="Click Sign In button",
            action_type="click",
            outcome=ExecutionOutcome.SUCCESS,
            duration_ms=150
        ),
    ]

    # Generate Vero from interactions
    vero_code = recorder.generate_from_interactions(
        interactions,
        feature_name="Login",
        scenario_name="User can login with valid credentials"
    )

    print("Generated Vero Code:")
    print("=" * 50)
    print(vero_code)
