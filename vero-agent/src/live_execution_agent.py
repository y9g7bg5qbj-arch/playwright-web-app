"""
Live Execution Agent - Browser Use inspired real-time test execution

This agent:
1. Takes English test steps as input
2. Launches a real browser (Playwright)
3. Uses AI vision to find elements on screen
4. Executes each step in real-time with visual feedback
5. Supports interactive corrections mid-execution
6. Handles Shadow DOM (Salesforce/LWC support)
7. Learns from executions to improve over time
8. Generates Vero scenarios from successful runs
"""

import asyncio
import base64
import json
import re
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Tuple
from playwright.async_api import async_playwright, Browser, Page, BrowserContext, Locator

from .config import get_llm
from .intelligent_selector import IntelligentSelectorGenerator, SelectorCandidate
from .execution_store import compute_element_hash


class ExecutionState(Enum):
    """Current state of the execution agent"""
    IDLE = "idle"
    RUNNING = "running"
    PAUSED = "paused"
    WAITING_FOR_CORRECTION = "waiting_for_correction"
    COMPLETED = "completed"
    FAILED = "failed"


class ActionType(Enum):
    """Types of browser actions"""
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
    SCREENSHOT = "screenshot"
    SCROLL = "scroll"
    UNKNOWN = "unknown"


@dataclass
class ParsedAction:
    """Represents a parsed action from natural language"""
    action_type: ActionType
    target: Optional[str] = None  # Element description or selector
    value: Optional[str] = None   # Value for fill, select, etc.
    raw_step: str = ""            # Original step text
    confidence: float = 1.0


@dataclass
class ElementMatch:
    """Represents a matched element on the page"""
    selector: str
    text: Optional[str] = None
    tag_name: str = ""
    attributes: Dict[str, str] = field(default_factory=dict)
    bounding_box: Optional[Dict[str, float]] = None
    confidence: float = 1.0
    in_shadow_dom: bool = False
    _locator: Any = None  # Store the actual Playwright locator for direct use


@dataclass
class StepResult:
    """Result of executing a single step"""
    step_index: int
    step_text: str
    success: bool
    action: Optional[ParsedAction] = None
    element: Optional[ElementMatch] = None
    error: Optional[str] = None
    screenshot_base64: Optional[str] = None
    duration_ms: int = 0
    retries: int = 0
    user_correction: Optional[str] = None


@dataclass
class ExecutionContext:
    """Current execution context"""
    state: ExecutionState = ExecutionState.IDLE
    current_step_index: int = 0
    total_steps: int = 0
    steps: List[str] = field(default_factory=list)
    results: List[StepResult] = field(default_factory=list)
    start_time: Optional[float] = None
    variables: Dict[str, Any] = field(default_factory=dict)


class LiveExecutionAgent:
    """
    Real-time browser execution agent with AI-powered element finding
    and interactive correction support.

    Inspired by:
    - Anthropic's Computer Use (screenshot-based, pixel coordinates)
    - Browser-Use (vision + DOM extraction, automation loop)

    Features:
    - Real-time browser execution
    - Vision AI for element detection
    - Interactive pause/correct/resume
    - Shadow DOM support for Salesforce/LWC
    - Self-healing with automatic retries
    """

    def __init__(
        self,
        headless: bool = False,
        max_retries: int = 3,
        step_delay_ms: int = 500,
        screenshot_on_each_step: bool = True,
        on_step_complete: Optional[Callable[[StepResult], None]] = None,
        on_state_change: Optional[Callable[[ExecutionState], None]] = None,
        on_screenshot: Optional[Callable[[str], None]] = None,
        on_vero_generated: Optional[Callable[[str], None]] = None,
        enable_learning: bool = True,
    ):
        self.headless = headless
        self.max_retries = max_retries
        self.step_delay_ms = step_delay_ms
        self.screenshot_on_each_step = screenshot_on_each_step
        self.enable_learning = enable_learning

        # Callbacks for real-time updates
        self.on_step_complete = on_step_complete
        self.on_state_change = on_state_change
        self.on_screenshot = on_screenshot
        self.on_vero_generated = on_vero_generated

        # Playwright instances
        self._playwright = None
        self._browser: Optional[Browser] = None
        self._context: Optional[BrowserContext] = None
        self._page: Optional[Page] = None

        # Execution state
        self.context = ExecutionContext()
        self._pause_event = asyncio.Event()
        self._pause_event.set()  # Start unpaused
        self._correction_response: Optional[str] = None
        self._stop_requested = False

        # LLM for vision and planning
        self._llm = None

        # Learning system integration
        self._learning_loop = None
        self._selector_generator = IntelligentSelectorGenerator()
        self._session_id: Optional[str] = None
        self._current_page_url: str = ""
        self._current_page_title: str = ""

    async def start(self, target_url: Optional[str] = None) -> None:
        """Start the browser and navigate to target URL"""
        self._playwright = await async_playwright().start()

        self._browser = await self._playwright.chromium.launch(
            headless=self.headless,
            args=[
                '--disable-web-security',  # For cross-origin iframes
                '--disable-features=IsolateOrigins,site-per-process',  # Shadow DOM access
            ]
        )

        self._context = await self._browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )

        self._page = await self._context.new_page()

        # Enable console logging for debugging
        self._page.on('console', lambda msg: print(f'[Browser Console] {msg.text}'))

        if target_url:
            await self._page.goto(target_url, wait_until='networkidle')
            self._current_page_url = target_url

        self._set_state(ExecutionState.IDLE)
        self._llm = get_llm()

        # Initialize learning loop if enabled
        if self.enable_learning:
            try:
                from .learning_loop import LearningLoop, LearningConfig
                self._learning_loop = LearningLoop(LearningConfig())
            except ImportError:
                print("[Warning] Learning loop not available, continuing without learning")
                self._learning_loop = None

    async def stop(self) -> None:
        """Stop the browser and cleanup"""
        self._stop_requested = True

        if self._page:
            await self._page.close()
        if self._context:
            await self._context.close()
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()

        self._set_state(ExecutionState.IDLE)

    async def execute_steps(
        self,
        steps: List[str],
        target_url: Optional[str] = None,
        feature_name: str = "LiveExecution",
        scenario_name: str = "Live Session"
    ) -> List[StepResult]:
        """
        Execute a list of English test steps in real-time.

        Args:
            steps: List of natural language test steps
            target_url: Optional URL to navigate to first
            feature_name: Name for generated Vero feature
            scenario_name: Name for generated Vero scenario

        Returns:
            List of StepResult for each step
        """
        if not self._page:
            await self.start(target_url)
        elif target_url:
            await self._page.goto(target_url, wait_until='networkidle')
            self._current_page_url = target_url

        # Start learning session
        if self._learning_loop and self.enable_learning:
            self._session_id = self._learning_loop.start_session(
                target_url or self._current_page_url,
                steps
            )

        self.context = ExecutionContext(
            state=ExecutionState.RUNNING,
            steps=steps,
            total_steps=len(steps),
            start_time=time.time()
        )
        self._set_state(ExecutionState.RUNNING)
        self._stop_requested = False

        for i, step in enumerate(steps):
            if self._stop_requested:
                break

            # Wait if paused
            await self._pause_event.wait()

            # Update page context
            self._current_page_url = self._page.url
            self._current_page_title = await self._page.title()

            self.context.current_step_index = i
            result = await self._execute_single_step(i, step)
            self.context.results.append(result)

            if self.on_step_complete:
                self.on_step_complete(result)

            # Delay between steps for visibility
            if self.step_delay_ms > 0:
                await asyncio.sleep(self.step_delay_ms / 1000)

        final_state = ExecutionState.COMPLETED if all(r.success for r in self.context.results) else ExecutionState.FAILED
        self._set_state(final_state)

        # End learning session and generate Vero code
        generated_vero = None
        if self._learning_loop and self._session_id:
            generated_vero = self._learning_loop.get_live_vero()
            self._learning_loop.end_session(generated_vero)
            self._session_id = None

            if self.on_vero_generated and generated_vero:
                self.on_vero_generated(generated_vero)

        return self.context.results

    def get_generated_vero(self) -> str:
        """Get the Vero code generated from the current/last session"""
        if self._learning_loop:
            return self._learning_loop.get_live_vero()
        return ""

    def get_learning_stats(self) -> Dict[str, Any]:
        """Get learning system statistics"""
        if self._learning_loop:
            return self._learning_loop.get_learning_stats()
        return {}

    async def _execute_single_step(self, index: int, step: str) -> StepResult:
        """Execute a single step with retry logic and learning"""
        start_time = time.time()

        for attempt in range(self.max_retries):
            try:
                # 1. Parse the natural language step
                action = await self._parse_step(step)

                # 2. Take screenshot for context
                screenshot = await self._take_screenshot()

                # 3. Find the target element using vision + DOM
                element = None
                if action.target:
                    element = await self._find_element(action, screenshot)

                # 4. Execute the action
                await self._execute_action(action, element)

                # 5. Take post-action screenshot
                post_screenshot = await self._take_screenshot() if self.screenshot_on_each_step else None

                duration_ms = int((time.time() - start_time) * 1000)

                # Record success to learning loop
                if self._learning_loop and element:
                    self._record_to_learning_loop(
                        element=element,
                        step_text=step,
                        action_type=action.action_type.value,
                        action_value=action.value,
                        success=True,
                        duration_ms=duration_ms
                    )

                return StepResult(
                    step_index=index,
                    step_text=step,
                    success=True,
                    action=action,
                    element=element,
                    screenshot_base64=post_screenshot,
                    duration_ms=duration_ms,
                    retries=attempt
                )

            except Exception as e:
                error_msg = str(e)
                print(f"[Step {index}] Attempt {attempt + 1} failed: {error_msg}")

                # On failure, ask user for correction if interactive
                if attempt == self.max_retries - 1:
                    correction = await self._request_correction(step, error_msg)
                    if correction:
                        # Record correction to learning loop
                        if self._learning_loop:
                            self._record_correction_to_learning_loop(
                                step_text=step,
                                correction=correction,
                                error=error_msg
                            )
                        # Retry with user correction
                        return await self._execute_single_step(index, correction)

                    # Record failure to learning loop
                    if self._learning_loop:
                        self._record_to_learning_loop(
                            element=None,
                            step_text=step,
                            action_type="unknown",
                            success=False,
                            error=error_msg,
                            duration_ms=int((time.time() - start_time) * 1000)
                        )

                    return StepResult(
                        step_index=index,
                        step_text=step,
                        success=False,
                        error=error_msg,
                        screenshot_base64=await self._take_screenshot(),
                        duration_ms=int((time.time() - start_time) * 1000),
                        retries=attempt + 1
                    )

                # Brief delay before retry
                await asyncio.sleep(0.5)

        return StepResult(
            step_index=index,
            step_text=step,
            success=False,
            error="Max retries exceeded",
            duration_ms=int((time.time() - start_time) * 1000),
            retries=self.max_retries
        )

    def _record_to_learning_loop(
        self,
        element: Optional[ElementMatch],
        step_text: str,
        action_type: str,
        action_value: Optional[str] = None,
        success: bool = True,
        duration_ms: int = 0,
        error: Optional[str] = None
    ):
        """Record interaction to learning loop"""
        if not self._learning_loop:
            return

        from .learning_loop import ElementContext

        element_dict = {}
        selector = ""
        strategy = "unknown"

        if element:
            element_dict = {
                "tag_name": element.tag_name,
                "text": element.text or "",
                "attributes": element.attributes,
                "bounding_box": element.bounding_box or {}
            }
            selector = element.selector
            strategy = "common"  # Could be improved to track actual strategy

        context = ElementContext(
            element=element_dict,
            page_url=self._current_page_url,
            page_title=self._current_page_title
        )

        if success:
            self._learning_loop.record_success(
                element_context=context,
                selector_used=selector,
                strategy=strategy,
                step_text=step_text,
                action_type=action_type,
                action_value=action_value,
                duration_ms=duration_ms
            )
        else:
            self._learning_loop.record_failure(
                element_context=context,
                selector_used=selector,
                strategy=strategy,
                step_text=step_text,
                action_type=action_type,
                error_message=error or "Unknown error"
            )

    def _record_correction_to_learning_loop(
        self,
        step_text: str,
        correction: str,
        error: str
    ):
        """Record user correction to learning loop"""
        if not self._learning_loop:
            return

        from .learning_loop import ElementContext

        context = ElementContext(
            element={},
            page_url=self._current_page_url,
            page_title=self._current_page_title
        )

        # Record as correction - the corrected step will be recorded on success
        self._learning_loop.record_correction(
            element_context=context,
            original_selector="",
            corrected_selector="",
            user_correction=correction,
            step_text=step_text,
            action_type="correction"
        )

    async def _parse_step(self, step: str) -> ParsedAction:
        """Parse a natural language step into an action"""
        step_lower = step.lower().strip()

        # Pattern matching for common actions
        patterns = [
            # Navigation
            (r'^(?:navigate|go|open|visit)\s+(?:to\s+)?["\']?(.+?)["\']?$', ActionType.NAVIGATE, 'url'),
            (r'^(?:go\s+)?back$', ActionType.NAVIGATE, 'back'),
            (r'^(?:go\s+)?forward$', ActionType.NAVIGATE, 'forward'),
            (r'^reload|refresh$', ActionType.NAVIGATE, 'reload'),

            # Click
            (r'^click\s+(?:on\s+)?(?:the\s+)?["\']?(.+?)["\']?(?:\s+button)?$', ActionType.CLICK, 'target'),
            (r'^(?:tap|press)\s+(?:on\s+)?(?:the\s+)?["\']?(.+?)["\']?$', ActionType.CLICK, 'target'),

            # Fill/Type
            (r'^(?:fill|type|enter|input)\s+(?:the\s+)?["\']?(.+?)["\']?\s+(?:with|as)\s+["\']?(.+?)["\']?$', ActionType.FILL, 'target_value'),
            (r'^(?:fill|type|enter|input)\s+["\']?(.+?)["\']?\s+(?:in|into)\s+(?:the\s+)?["\']?(.+?)["\']?$', ActionType.FILL, 'value_target'),

            # Select
            (r'^select\s+["\']?(.+?)["\']?\s+(?:from|in)\s+(?:the\s+)?["\']?(.+?)["\']?(?:\s+dropdown)?$', ActionType.SELECT, 'value_target'),
            (r'^(?:choose|pick)\s+["\']?(.+?)["\']?\s+(?:option|from)\s+["\']?(.+?)["\']?$', ActionType.SELECT, 'value_target'),

            # Check/Uncheck
            (r'^check\s+(?:the\s+)?["\']?(.+?)["\']?(?:\s+checkbox)?$', ActionType.CHECK, 'target'),
            (r'^uncheck\s+(?:the\s+)?["\']?(.+?)["\']?(?:\s+checkbox)?$', ActionType.UNCHECK, 'target'),

            # Hover
            (r'^hover\s+(?:over\s+)?(?:the\s+)?["\']?(.+?)["\']?$', ActionType.HOVER, 'target'),

            # Wait
            (r'^wait\s+(?:for\s+)?(\d+)\s+(?:seconds?|s)$', ActionType.WAIT, 'seconds'),
            (r'^wait\s+(?:for\s+)?(?:the\s+)?["\']?(.+?)["\']?\s+(?:to\s+)?(?:be\s+)?visible$', ActionType.WAIT, 'target'),

            # Assert/Verify
            (r'^(?:assert|verify|check\s+that|ensure)\s+(?:the\s+)?["\']?(.+?)["\']?\s+(?:is\s+)?visible$', ActionType.ASSERT, 'visible'),
            (r'^(?:assert|verify|check\s+that|ensure)\s+(?:the\s+)?(?:text\s+)?["\']?(.+?)["\']?\s+(?:is\s+)?(?:displayed|shown|exists)$', ActionType.ASSERT, 'text'),

            # Press key
            (r'^press\s+(?:the\s+)?["\']?(\w+)["\']?(?:\s+key)?$', ActionType.PRESS, 'key'),

            # Scroll
            (r'^scroll\s+(up|down|to\s+top|to\s+bottom)$', ActionType.SCROLL, 'direction'),
        ]

        for pattern, action_type, param_type in patterns:
            match = re.match(pattern, step_lower, re.IGNORECASE)
            if match:
                # Re-match against original step to preserve case
                original_match = re.match(pattern, step, re.IGNORECASE)
                groups = original_match.groups() if original_match else match.groups()

                if param_type == 'url':
                    return ParsedAction(action_type=action_type, value=groups[0] if groups else None, raw_step=step)
                elif param_type == 'target':
                    return ParsedAction(action_type=action_type, target=groups[0] if groups else None, raw_step=step)
                elif param_type == 'target_value':
                    return ParsedAction(action_type=action_type, target=groups[0], value=groups[1], raw_step=step)
                elif param_type == 'value_target':
                    return ParsedAction(action_type=action_type, target=groups[1], value=groups[0], raw_step=step)
                elif param_type == 'key':
                    return ParsedAction(action_type=action_type, value=groups[0], raw_step=step)
                elif param_type == 'seconds':
                    return ParsedAction(action_type=action_type, value=groups[0], raw_step=step)
                elif param_type in ('visible', 'text', 'direction', 'back', 'forward', 'reload'):
                    return ParsedAction(action_type=action_type, target=groups[0] if groups else param_type, raw_step=step)

        # If no pattern matches, use AI to parse
        return await self._ai_parse_step(step)

    async def _ai_parse_step(self, step: str) -> ParsedAction:
        """Use AI to parse a complex step"""
        prompt = f"""Parse this test step into a structured action.

Step: "{step}"

Return a JSON object with:
- action_type: one of [navigate, click, fill, select, check, uncheck, hover, press, wait, assert, scroll]
- target: the element description (if applicable)
- value: the value to enter/select (if applicable)

Example outputs:
- {{"action_type": "click", "target": "Login button"}}
- {{"action_type": "fill", "target": "Email field", "value": "test@example.com"}}
- {{"action_type": "navigate", "value": "https://example.com"}}

JSON only, no explanation:"""

        try:
            response = await self._llm.generate(prompt)
            data = json.loads(response.strip())

            return ParsedAction(
                action_type=ActionType(data.get('action_type', 'unknown')),
                target=data.get('target'),
                value=data.get('value'),
                raw_step=step
            )
        except Exception as e:
            print(f"AI parse failed: {e}")
            return ParsedAction(action_type=ActionType.UNKNOWN, raw_step=step)

    async def _find_element(self, action: ParsedAction, screenshot: Optional[str] = None) -> ElementMatch:
        """
        Find an element using combined vision + DOM analysis.
        Handles Shadow DOM automatically via Playwright.
        """
        if not action.target:
            raise ValueError("No target specified for action")

        target = action.target

        # Strategy 1: Try common selectors first (fast path)
        element = await self._try_common_selectors(target)
        if element:
            return element

        # Strategy 2: Use AI vision to locate element
        if screenshot:
            element = await self._vision_find_element(target, screenshot)
            if element:
                return element

        # Strategy 3: Extract DOM and use AI to find best selector
        element = await self._dom_find_element(target)
        if element:
            return element

        raise Exception(f"Could not find element: {target}")

    async def _try_common_selectors(self, target: str) -> Optional[ElementMatch]:
        """Try common selector strategies, using intelligent selector if available"""

        # Strategy 0: Check learning loop for known good selector
        if self._learning_loop:
            from .learning_loop import ElementContext
            # Create minimal element context for lookup
            context = ElementContext(
                element={"text": target, "tag_name": ""},
                page_url=self._current_page_url,
                page_title=self._current_page_title
            )
            decision = self._learning_loop.decide_selector(context, target)
            if decision.confidence >= 0.8:
                try:
                    locator = self._page.locator(decision.selector)
                    if await locator.count() > 0 and await locator.first.is_visible():
                        box = await locator.first.bounding_box()
                        return ElementMatch(
                            selector=decision.selector,
                            text=await locator.first.text_content(),
                            bounding_box=box,
                            confidence=decision.confidence
                        )
                except Exception:
                    pass  # Fall through to other strategies

        # Strategies with (locator_fn, selector_description_fn)
        strategies = [
            # Role-based (most reliable)
            (lambda t: self._page.get_by_role("button", name=t), lambda t: f'role=button[name="{t}"]'),
            (lambda t: self._page.get_by_role("link", name=t), lambda t: f'role=link[name="{t}"]'),
            (lambda t: self._page.get_by_role("textbox", name=t), lambda t: f'role=textbox[name="{t}"]'),
            (lambda t: self._page.get_by_role("checkbox", name=t), lambda t: f'role=checkbox[name="{t}"]'),
            (lambda t: self._page.get_by_role("combobox", name=t), lambda t: f'role=combobox[name="{t}"]'),

            # Label-based
            (lambda t: self._page.get_by_label(t), lambda t: f'label="{t}"'),

            # Text-based (exact=False for partial match)
            (lambda t: self._page.get_by_text(t, exact=False), lambda t: f'text="{t}"'),

            # Placeholder-based
            (lambda t: self._page.get_by_placeholder(t), lambda t: f'placeholder="{t}"'),

            # Test ID (for apps that use data-testid)
            (lambda t: self._page.get_by_test_id(t.lower().replace(' ', '-')), lambda t: f'data-testid="{t.lower().replace(" ", "-")}"'),

            # CSS with text content - pierces shadow DOM
            (lambda t: self._page.locator(f'button:has-text("{t}")'), lambda t: f'button:has-text("{t}")'),
            (lambda t: self._page.locator(f'a:has-text("{t}")'), lambda t: f'a:has-text("{t}")'),
            (lambda t: self._page.locator(f'input[placeholder*="{t}" i]'), lambda t: f'input[placeholder*="{t}" i]'),
            (lambda t: self._page.locator(f'[aria-label*="{t}" i]'), lambda t: f'[aria-label*="{t}" i]'),

            # Generic text content with :has-text (case-insensitive search)
            (lambda t: self._page.locator(f':has-text("{t}")').first, lambda t: f':has-text("{t}")'),

            # Partial text in any element
            (lambda t: self._page.locator(f'text=/{t}/i'), lambda t: f'text=/{t}/i'),
        ]

        for locator_fn, selector_fn in strategies:
            try:
                locator = locator_fn(target)
                # Check if element exists and is visible
                if await locator.count() > 0:
                    first = locator.first
                    if await first.is_visible():
                        box = await first.bounding_box()
                        return ElementMatch(
                            selector=selector_fn(target),
                            text=await first.text_content(),
                            bounding_box=box,
                            confidence=0.9,
                            _locator=first  # Store actual locator for direct use
                        )
            except Exception:
                continue

        return None

    async def _vision_find_element(self, target: str, screenshot: str) -> Optional[ElementMatch]:
        """Use AI vision to locate an element by description"""
        prompt = f"""Analyze this screenshot and find the element: "{target}"

Return a JSON object with:
- found: boolean
- description: what you see
- approximate_location: {{"x": percentage from left, "y": percentage from top}}
- suggested_selector: CSS selector to try

If not found, explain why in description.

JSON only:"""

        try:
            # Send screenshot to vision model
            response = await self._llm.generate_with_image(prompt, screenshot)
            data = json.loads(response.strip())

            if data.get('found'):
                # Convert percentage to pixels
                viewport = self._page.viewport_size
                x = int(data['approximate_location']['x'] * viewport['width'] / 100)
                y = int(data['approximate_location']['y'] * viewport['height'] / 100)

                # Try to find element at coordinates
                element = await self._page.evaluate(f'''() => {{
                    const el = document.elementFromPoint({x}, {y});
                    if (!el) return null;
                    return {{
                        tagName: el.tagName.toLowerCase(),
                        text: el.textContent?.trim().substring(0, 100),
                        id: el.id,
                        className: el.className,
                        ariaLabel: el.getAttribute('aria-label'),
                    }};
                }}''')

                if element:
                    # Build selector from element info
                    selector = self._build_selector_from_element(element)
                    return ElementMatch(
                        selector=selector,
                        text=element.get('text'),
                        tag_name=element.get('tagName'),
                        bounding_box={'x': x, 'y': y},
                        confidence=0.7
                    )
        except Exception as e:
            print(f"Vision find failed: {e}")

        return None

    async def _dom_find_element(self, target: str) -> Optional[ElementMatch]:
        """Extract DOM and use AI to find the best matching element"""
        # Extract interactive elements from the page (including shadow DOM)
        elements = await self._page.evaluate('''() => {
            const results = [];

            function extractElements(root, inShadow = false) {
                const interactiveSelectors = 'a, button, input, select, textarea, [role="button"], [role="link"], [role="checkbox"], [role="textbox"], [onclick], [tabindex]';
                const elements = root.querySelectorAll(interactiveSelectors);

                elements.forEach((el, index) => {
                    const rect = el.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        results.push({
                            index,
                            tagName: el.tagName.toLowerCase(),
                            text: (el.textContent || '').trim().substring(0, 100),
                            value: el.value || '',
                            placeholder: el.placeholder || '',
                            ariaLabel: el.getAttribute('aria-label') || '',
                            id: el.id || '',
                            className: el.className || '',
                            name: el.name || '',
                            type: el.type || '',
                            role: el.getAttribute('role') || '',
                            href: el.href || '',
                            inShadowDom: inShadow,
                            rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
                        });
                    }
                });

                // Recursively check shadow roots
                root.querySelectorAll('*').forEach(el => {
                    if (el.shadowRoot) {
                        extractElements(el.shadowRoot, true);
                    }
                });
            }

            extractElements(document);
            return results;
        }''')

        if not elements:
            return None

        # Use AI to find best match
        prompt = f"""Find the best matching element for: "{target}"

Available elements (JSON):
{json.dumps(elements[:50], indent=2)}

Return the index of the best match and a confidence score (0-1).
JSON format: {{"index": number, "confidence": number, "reason": "why this matches"}}

JSON only:"""

        try:
            response = await self._llm.generate(prompt)
            data = json.loads(response.strip())

            if data.get('index') is not None and data['index'] < len(elements):
                matched = elements[data['index']]
                selector = self._build_selector_from_element(matched)

                return ElementMatch(
                    selector=selector,
                    text=matched.get('text'),
                    tag_name=matched.get('tagName'),
                    attributes={
                        'id': matched.get('id'),
                        'class': matched.get('className'),
                        'aria-label': matched.get('ariaLabel'),
                    },
                    bounding_box=matched.get('rect'),
                    confidence=data.get('confidence', 0.5),
                    in_shadow_dom=matched.get('inShadowDom', False)
                )
        except Exception as e:
            print(f"DOM find failed: {e}")

        return None

    def _build_selector_from_element(self, element: dict) -> str:
        """Build a CSS selector from element attributes"""
        tag = element.get('tagName', '*')

        # Prefer ID
        if element.get('id'):
            return f'#{element["id"]}'

        # Use aria-label
        if element.get('ariaLabel'):
            return f'[aria-label="{element["ariaLabel"]}"]'

        # Use data-testid or name
        if element.get('name'):
            return f'{tag}[name="{element["name"]}"]'

        # Use text content with :has-text
        if element.get('text'):
            text = element['text'][:30].replace('"', '\\"')
            return f'{tag}:has-text("{text}")'

        # Fallback to class
        if element.get('className'):
            first_class = element['className'].split()[0]
            return f'{tag}.{first_class}'

        return tag

    def _get_locator(self, element: ElementMatch) -> Locator:
        """Get the Playwright locator for an element - use stored locator if available"""
        if element._locator is not None:
            return element._locator
        # Fallback to creating locator from selector string
        return self._page.locator(element.selector).first

    async def _execute_action(self, action: ParsedAction, element: Optional[ElementMatch]) -> None:
        """Execute the parsed action"""

        if action.action_type == ActionType.NAVIGATE:
            if action.value == 'back':
                await self._page.go_back()
            elif action.value == 'forward':
                await self._page.go_forward()
            elif action.value == 'reload':
                await self._page.reload()
            else:
                url = action.value
                if not url.startswith('http'):
                    url = 'https://' + url
                await self._page.goto(url, wait_until='networkidle')

        elif action.action_type == ActionType.CLICK:
            locator = self._get_locator(element)
            await locator.click()

        elif action.action_type == ActionType.FILL:
            locator = self._get_locator(element)
            await locator.fill(action.value or '')

        elif action.action_type == ActionType.SELECT:
            locator = self._get_locator(element)
            await locator.select_option(label=action.value)

        elif action.action_type == ActionType.CHECK:
            locator = self._get_locator(element)
            await locator.check()

        elif action.action_type == ActionType.UNCHECK:
            locator = self._get_locator(element)
            await locator.uncheck()

        elif action.action_type == ActionType.HOVER:
            locator = self._get_locator(element)
            await locator.hover()

        elif action.action_type == ActionType.PRESS:
            await self._page.keyboard.press(action.value or 'Enter')

        elif action.action_type == ActionType.WAIT:
            if action.value and action.value.isdigit():
                await asyncio.sleep(int(action.value))
            elif element:
                locator = self._get_locator(element)
                await locator.wait_for(state='visible', timeout=10000)

        elif action.action_type == ActionType.ASSERT:
            if element:
                locator = self._get_locator(element)
                await locator.wait_for(state='visible', timeout=5000)

        elif action.action_type == ActionType.SCROLL:
            if action.target == 'up':
                await self._page.mouse.wheel(0, -500)
            elif action.target == 'down':
                await self._page.mouse.wheel(0, 500)
            elif action.target == 'to top':
                await self._page.evaluate('window.scrollTo(0, 0)')
            elif action.target == 'to bottom':
                await self._page.evaluate('window.scrollTo(0, document.body.scrollHeight)')

        # Small delay for UI to update
        await asyncio.sleep(0.3)

    async def _take_screenshot(self) -> str:
        """Take a screenshot and return as base64"""
        screenshot_bytes = await self._page.screenshot(type='png')
        base64_str = base64.b64encode(screenshot_bytes).decode('utf-8')

        if self.on_screenshot:
            self.on_screenshot(base64_str)

        return base64_str

    async def _request_correction(self, step: str, error: str) -> Optional[str]:
        """Request user correction for a failed step"""
        self._set_state(ExecutionState.WAITING_FOR_CORRECTION)
        self._correction_response = None

        # In real implementation, this would wait for WebSocket message
        # For now, return None (no correction)

        # Wait up to 30 seconds for correction
        for _ in range(60):
            if self._correction_response:
                corrected = self._correction_response
                self._correction_response = None
                self._set_state(ExecutionState.RUNNING)
                return corrected
            await asyncio.sleep(0.5)

        self._set_state(ExecutionState.RUNNING)
        return None

    def provide_correction(self, correction: str) -> None:
        """Provide a correction for the current step (called externally)"""
        self._correction_response = correction

    def pause(self) -> None:
        """Pause execution"""
        self._pause_event.clear()
        self._set_state(ExecutionState.PAUSED)

    def resume(self) -> None:
        """Resume execution"""
        self._pause_event.set()
        self._set_state(ExecutionState.RUNNING)

    def request_stop(self) -> None:
        """Request execution to stop"""
        self._stop_requested = True
        self._pause_event.set()  # Unpause to allow loop to exit

    def _set_state(self, state: ExecutionState) -> None:
        """Update state and notify callback"""
        self.context.state = state
        if self.on_state_change:
            self.on_state_change(state)

    @property
    def current_state(self) -> ExecutionState:
        return self.context.state

    @property
    def page(self) -> Optional[Page]:
        return self._page
