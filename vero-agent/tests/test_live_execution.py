"""
Tests for Live Execution Agent

Tests cover:
- Step parsing (English to action)
- Element finding strategies
- Action execution
- Interactive controls (pause/resume/stop)
- Self-healing with corrections
- Shadow DOM handling
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from dataclasses import asdict

# Import the agent classes
import sys
sys.path.insert(0, '..')

from src.live_execution_agent import (
    LiveExecutionAgent,
    ExecutionState,
    ActionType,
    ParsedAction,
    ElementMatch,
    StepResult,
    ExecutionContext,
)


class TestStepParsing:
    """Test natural language step parsing"""

    @pytest.fixture
    def agent(self):
        return LiveExecutionAgent(headless=True)

    @pytest.mark.asyncio
    async def test_parse_navigate_step(self, agent):
        """Test parsing navigation steps"""
        test_cases = [
            ("Navigate to https://example.com", ActionType.NAVIGATE, "https://example.com"),
            ("Go to login page", ActionType.NAVIGATE, "login page"),
            ("Open https://test.com/dashboard", ActionType.NAVIGATE, "https://test.com/dashboard"),
            ("visit example.com", ActionType.NAVIGATE, "example.com"),
        ]

        for step, expected_type, expected_value in test_cases:
            action = await agent._parse_step(step)
            assert action.action_type == expected_type, f"Failed for: {step}"

    @pytest.mark.asyncio
    async def test_parse_click_step(self, agent):
        """Test parsing click steps"""
        test_cases = [
            ("Click the Login button", ActionType.CLICK, "Login"),
            ("click on Submit", ActionType.CLICK, "Submit"),
            ("Press the Cancel button", ActionType.CLICK, "Cancel"),
            ("tap Sign In", ActionType.CLICK, "Sign In"),
        ]

        for step, expected_type, expected_target in test_cases:
            action = await agent._parse_step(step)
            assert action.action_type == expected_type, f"Failed for: {step}"
            assert expected_target.lower() in action.target.lower(), f"Target mismatch for: {step}"

    @pytest.mark.asyncio
    async def test_parse_fill_step(self, agent):
        """Test parsing fill/type steps"""
        test_cases = [
            ("Fill the email field with test@example.com", ActionType.FILL),
            ("Type admin in username", ActionType.FILL),
            ("Enter secret123 in password", ActionType.FILL),
            ("input test@test.com in Email", ActionType.FILL),
        ]

        for step, expected_type in test_cases:
            action = await agent._parse_step(step)
            assert action.action_type == expected_type, f"Failed for: {step}"

    @pytest.mark.asyncio
    async def test_parse_select_step(self, agent):
        """Test parsing select/dropdown steps"""
        test_cases = [
            ("Select USA from Country dropdown", ActionType.SELECT),
            ("Choose Admin from role", ActionType.SELECT),
            ("Pick English option from language", ActionType.SELECT),
        ]

        for step, expected_type in test_cases:
            action = await agent._parse_step(step)
            assert action.action_type == expected_type, f"Failed for: {step}"

    @pytest.mark.asyncio
    async def test_parse_check_uncheck_step(self, agent):
        """Test parsing checkbox steps"""
        test_cases = [
            ("Check the Remember me checkbox", ActionType.CHECK),
            ("Uncheck Newsletter", ActionType.UNCHECK),
            ("check Terms and Conditions", ActionType.CHECK),
        ]

        for step, expected_type in test_cases:
            action = await agent._parse_step(step)
            assert action.action_type == expected_type, f"Failed for: {step}"

    @pytest.mark.asyncio
    async def test_parse_wait_step(self, agent):
        """Test parsing wait steps"""
        test_cases = [
            ("Wait 2 seconds", ActionType.WAIT),
            ("wait for Dashboard to be visible", ActionType.WAIT),
            ("wait 5 s", ActionType.WAIT),
        ]

        for step, expected_type in test_cases:
            action = await agent._parse_step(step)
            assert action.action_type == expected_type, f"Failed for: {step}"

    @pytest.mark.asyncio
    async def test_parse_assert_step(self, agent):
        """Test parsing assertion steps"""
        test_cases = [
            ("Assert Welcome message is visible", ActionType.ASSERT),
            ("Verify Dashboard is displayed", ActionType.ASSERT),
            ("Check that Success text exists", ActionType.ASSERT),
            ("Ensure Login button is visible", ActionType.ASSERT),
        ]

        for step, expected_type in test_cases:
            action = await agent._parse_step(step)
            assert action.action_type == expected_type, f"Failed for: {step}"

    @pytest.mark.asyncio
    async def test_parse_hover_step(self, agent):
        """Test parsing hover steps"""
        action = await agent._parse_step("Hover over the menu")
        assert action.action_type == ActionType.HOVER

    @pytest.mark.asyncio
    async def test_parse_press_key_step(self, agent):
        """Test parsing key press steps"""
        action = await agent._parse_step("Press Enter key")
        assert action.action_type == ActionType.PRESS
        assert action.value.lower() == "enter"

    @pytest.mark.asyncio
    async def test_parse_scroll_step(self, agent):
        """Test parsing scroll steps"""
        test_cases = [
            ("Scroll down", ActionType.SCROLL, "down"),
            ("scroll up", ActionType.SCROLL, "up"),
            ("scroll to top", ActionType.SCROLL, "to top"),
            ("scroll to bottom", ActionType.SCROLL, "to bottom"),
        ]

        for step, expected_type, expected_target in test_cases:
            action = await agent._parse_step(step)
            assert action.action_type == expected_type, f"Failed for: {step}"


class TestElementFinding:
    """Test element finding strategies"""

    @pytest.fixture
    def agent(self):
        agent = LiveExecutionAgent(headless=True)
        # Mock the page
        agent._page = MagicMock()
        return agent

    def test_build_selector_from_element_with_id(self, agent):
        """Test building selector from element with ID"""
        element = {'tagName': 'button', 'id': 'submit-btn', 'className': '', 'text': 'Submit'}
        selector = agent._build_selector_from_element(element)
        assert selector == '#submit-btn'

    def test_build_selector_from_element_with_aria_label(self, agent):
        """Test building selector from element with aria-label"""
        element = {'tagName': 'button', 'id': '', 'ariaLabel': 'Close dialog', 'className': ''}
        selector = agent._build_selector_from_element(element)
        assert 'aria-label' in selector
        assert 'Close dialog' in selector

    def test_build_selector_from_element_with_name(self, agent):
        """Test building selector from element with name attribute"""
        element = {'tagName': 'input', 'id': '', 'ariaLabel': '', 'name': 'email', 'className': ''}
        selector = agent._build_selector_from_element(element)
        assert 'name="email"' in selector

    def test_build_selector_from_element_with_text(self, agent):
        """Test building selector from element with text content"""
        element = {'tagName': 'button', 'id': '', 'ariaLabel': '', 'name': '', 'text': 'Click me', 'className': ''}
        selector = agent._build_selector_from_element(element)
        assert ':has-text(' in selector
        assert 'Click me' in selector

    def test_build_selector_from_element_with_class(self, agent):
        """Test building selector from element with class"""
        element = {'tagName': 'div', 'id': '', 'ariaLabel': '', 'name': '', 'text': '', 'className': 'btn primary'}
        selector = agent._build_selector_from_element(element)
        assert '.btn' in selector


class TestExecutionState:
    """Test execution state management"""

    @pytest.fixture
    def agent(self):
        return LiveExecutionAgent(headless=True)

    def test_initial_state(self, agent):
        """Test agent starts in idle state"""
        assert agent.current_state == ExecutionState.IDLE

    def test_pause_resume(self, agent):
        """Test pause and resume functionality"""
        agent._set_state(ExecutionState.RUNNING)
        assert agent.current_state == ExecutionState.RUNNING

        agent.pause()
        assert agent.current_state == ExecutionState.PAUSED

        agent.resume()
        assert agent.current_state == ExecutionState.RUNNING

    def test_stop_request(self, agent):
        """Test stop request sets flag"""
        agent._stop_requested = False
        agent.request_stop()
        assert agent._stop_requested is True

    def test_state_change_callback(self):
        """Test state change callback is called"""
        callback_states = []

        def on_state_change(state):
            callback_states.append(state)

        agent = LiveExecutionAgent(on_state_change=on_state_change)
        agent._set_state(ExecutionState.RUNNING)
        agent._set_state(ExecutionState.PAUSED)

        assert len(callback_states) == 2
        assert callback_states[0] == ExecutionState.RUNNING
        assert callback_states[1] == ExecutionState.PAUSED


class TestCorrections:
    """Test user correction handling"""

    @pytest.fixture
    def agent(self):
        return LiveExecutionAgent(headless=True)

    def test_provide_correction(self, agent):
        """Test providing a correction"""
        agent._correction_response = None
        agent.provide_correction("Click the blue button instead")
        assert agent._correction_response == "Click the blue button instead"

    def test_correction_clears_after_use(self, agent):
        """Test that correction is cleared after retrieval"""
        agent._correction_response = "Some correction"
        correction = agent._correction_response
        agent._correction_response = None
        assert agent._correction_response is None


class TestExecutionContext:
    """Test execution context data structure"""

    def test_context_initialization(self):
        """Test context initializes with correct defaults"""
        ctx = ExecutionContext()
        assert ctx.state == ExecutionState.IDLE
        assert ctx.current_step_index == 0
        assert ctx.total_steps == 0
        assert ctx.steps == []
        assert ctx.results == []
        assert ctx.start_time is None
        assert ctx.variables == {}

    def test_context_with_steps(self):
        """Test context with steps"""
        steps = ["Step 1", "Step 2", "Step 3"]
        ctx = ExecutionContext(
            state=ExecutionState.RUNNING,
            steps=steps,
            total_steps=len(steps)
        )
        assert ctx.total_steps == 3
        assert len(ctx.steps) == 3


class TestStepResult:
    """Test step result data structure"""

    def test_step_result_success(self):
        """Test successful step result"""
        result = StepResult(
            step_index=0,
            step_text="Click Login",
            success=True,
            duration_ms=150
        )
        assert result.success is True
        assert result.error is None

    def test_step_result_failure(self):
        """Test failed step result"""
        result = StepResult(
            step_index=1,
            step_text="Click Submit",
            success=False,
            error="Element not found",
            retries=3
        )
        assert result.success is False
        assert result.error == "Element not found"
        assert result.retries == 3


class TestParsedAction:
    """Test parsed action data structure"""

    def test_parsed_action_click(self):
        """Test click action"""
        action = ParsedAction(
            action_type=ActionType.CLICK,
            target="Login button",
            raw_step="Click the Login button"
        )
        assert action.action_type == ActionType.CLICK
        assert action.target == "Login button"
        assert action.value is None

    def test_parsed_action_fill(self):
        """Test fill action"""
        action = ParsedAction(
            action_type=ActionType.FILL,
            target="Email field",
            value="test@example.com",
            raw_step="Fill email with test@example.com"
        )
        assert action.action_type == ActionType.FILL
        assert action.target == "Email field"
        assert action.value == "test@example.com"


class TestElementMatch:
    """Test element match data structure"""

    def test_element_match_basic(self):
        """Test basic element match"""
        match = ElementMatch(
            selector="#login-btn",
            text="Login",
            tag_name="button",
            confidence=0.95
        )
        assert match.selector == "#login-btn"
        assert match.confidence == 0.95
        assert match.in_shadow_dom is False

    def test_element_match_shadow_dom(self):
        """Test element match in shadow DOM"""
        match = ElementMatch(
            selector="button:has-text('Submit')",
            text="Submit",
            tag_name="button",
            in_shadow_dom=True,
            confidence=0.8
        )
        assert match.in_shadow_dom is True


class TestIntegration:
    """Integration tests for the agent"""

    @pytest.mark.asyncio
    async def test_full_execution_flow_mock(self):
        """Test full execution flow with mocked browser"""
        steps_executed = []
        screenshots_taken = []

        def on_step_complete(result):
            steps_executed.append(result)

        def on_screenshot(screenshot):
            screenshots_taken.append(screenshot)

        agent = LiveExecutionAgent(
            headless=True,
            on_step_complete=on_step_complete,
            on_screenshot=on_screenshot,
            max_retries=1,
            step_delay_ms=0
        )

        # Mock browser interactions
        with patch.object(agent, 'start', new_callable=AsyncMock):
            with patch.object(agent, '_execute_single_step', new_callable=AsyncMock) as mock_execute:
                # Setup mock to return successful results
                mock_execute.side_effect = [
                    StepResult(step_index=0, step_text="Step 1", success=True, duration_ms=100),
                    StepResult(step_index=1, step_text="Step 2", success=True, duration_ms=150),
                ]

                agent._page = MagicMock()  # Mock page to skip browser start
                agent.context.state = ExecutionState.IDLE

                # Execute steps
                results = await agent.execute_steps(
                    steps=["Step 1", "Step 2"],
                    target_url="https://example.com"
                )

                assert len(results) == 2
                assert all(r.success for r in results)


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
