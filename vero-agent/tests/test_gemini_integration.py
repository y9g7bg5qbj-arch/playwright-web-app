"""
Tests for Gemini 2.0 Flash Thinking integration
"""
import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
import base64


class TestGeminiComputerUse:
    """Tests for GeminiComputerUse class"""

    def test_init_without_api_key_raises(self):
        """Should raise error when no API key provided"""
        with patch.dict('os.environ', {}, clear=True):
            from src.agent.gemini_computer_use import GeminiComputerUse
            with pytest.raises(ValueError, match="Google API key required"):
                GeminiComputerUse()

    def test_init_with_api_key(self):
        """Should initialize with provided API key"""
        with patch('google.genai.Client') as mock_client:
            from src.agent.gemini_computer_use import GeminiComputerUse
            client = GeminiComputerUse(api_key="test-key")
            assert client.api_key == "test-key"
            assert client.is_available

    def test_init_without_genai_installed(self):
        """Should handle missing google-genai package"""
        with patch.dict('sys.modules', {'google': None, 'google.genai': None}):
            # Force reimport
            import importlib
            import src.agent.gemini_computer_use as module
            importlib.reload(module)

    @pytest.mark.asyncio
    async def test_get_coordinates_success(self):
        """Should return coordinates when element found"""
        with patch('google.genai.Client') as mock_client_class:
            mock_client = Mock()
            mock_response = Mock()
            mock_response.text = '{"success": true, "x": 100, "y": 200}'
            mock_client.models.generate_content.return_value = mock_response
            mock_client_class.return_value = mock_client

            from src.agent.gemini_computer_use import GeminiComputerUse
            client = GeminiComputerUse(api_key="test-key")

            # Create fake screenshot
            screenshot = b"fake-png-data"
            x, y, reasoning = await client.get_coordinates(
                screenshot,
                "login button"
            )

            assert x == 100
            assert y == 200

    @pytest.mark.asyncio
    async def test_get_coordinates_not_found(self):
        """Should return None when element not found"""
        with patch('google.genai.Client') as mock_client_class:
            mock_client = Mock()
            mock_response = Mock()
            mock_response.text = '{"success": false, "error": "Element not found"}'
            mock_client.models.generate_content.return_value = mock_response
            mock_client_class.return_value = mock_client

            from src.agent.gemini_computer_use import GeminiComputerUse
            client = GeminiComputerUse(api_key="test-key")

            x, y, error = await client.get_coordinates(
                b"fake-screenshot",
                "nonexistent element"
            )

            assert x is None
            assert y is None
            assert "not found" in error.lower()


class TestGeminiHealingStrategy:
    """Tests for GeminiHealingStrategy class"""

    @pytest.mark.asyncio
    async def test_heal_selector_success(self):
        """Should heal broken selector using visual detection"""
        mock_gemini = Mock()
        mock_gemini.get_coordinates = AsyncMock(return_value=(150, 250, "Found button"))

        mock_page = Mock()
        mock_page.screenshot = AsyncMock(return_value=b"screenshot")

        with patch('src.agent.gemini_computer_use.element_at_coordinates') as mock_elem:
            with patch('src.agent.gemini_computer_use.generate_playwright_selector') as mock_sel:
                mock_elem.return_value = {"tag": "button", "id": "new-btn"}
                mock_sel.return_value = "button#new-btn"

                from src.agent.gemini_computer_use import GeminiHealingStrategy
                healer = GeminiHealingStrategy(mock_gemini)

                new_selector = await healer.heal_selector(
                    mock_page,
                    "submit button",
                    "button#old-btn"
                )

                assert new_selector == "button#new-btn"

    @pytest.mark.asyncio
    async def test_heal_selector_not_found(self):
        """Should return None when element cannot be found"""
        mock_gemini = Mock()
        mock_gemini.get_coordinates = AsyncMock(return_value=(None, None, "Not found"))

        mock_page = Mock()
        mock_page.screenshot = AsyncMock(return_value=b"screenshot")

        from src.agent.gemini_computer_use import GeminiHealingStrategy
        healer = GeminiHealingStrategy(mock_gemini)

        result = await healer.heal_selector(
            mock_page,
            "missing element",
            "button#gone"
        )

        assert result is None


class TestRetryExecutorWithGemini:
    """Tests for RetryExecutor Gemini integration"""

    def test_is_selector_error_detection(self):
        """Should correctly identify selector errors"""
        from src.agent.retry_executor import RetryExecutor

        mock_llm = Mock()
        executor = RetryExecutor(mock_llm, "/tmp")

        # Should detect as selector error
        assert executor._is_selector_error("locator('#btn') not found")
        assert executor._is_selector_error("Element not found on page")
        assert executor._is_selector_error("waiting for selector timed out")
        assert executor._is_selector_error("TimeoutError: locator.click")

        # Should NOT detect as selector error
        assert not executor._is_selector_error("Assertion failed: expected true")
        assert not executor._is_selector_error("Network error occurred")

    def test_extract_failed_selector(self):
        """Should extract selector from error message"""
        from src.agent.retry_executor import RetryExecutor

        mock_llm = Mock()
        executor = RetryExecutor(mock_llm, "/tmp")

        # Playwright-style error
        error = 'locator("#username") not found'
        assert executor._extract_failed_selector(error) == "#username"

        # Selector assignment error
        error = 'selector = ".login-btn" failed'
        assert executor._extract_failed_selector(error) == ".login-btn"

    def test_extract_element_description(self):
        """Should find element description from Vero code"""
        from src.agent.retry_executor import RetryExecutor

        mock_llm = Mock()
        executor = RetryExecutor(mock_llm, "/tmp")

        vero_code = '''
        page LoginPage {
            field username_input = "#username"
            field login_button = ".btn-login"
        }
        '''

        desc = executor._extract_element_description(vero_code, "#username")
        assert desc == "username input"

        desc = executor._extract_element_description(vero_code, ".btn-login")
        assert desc == "login button"


class TestPageUpdater:
    """Tests for PageUpdater class"""

    def test_parse_page(self):
        """Should parse page definition from content"""
        from src.agent.page_updater import PageUpdater

        updater = PageUpdater("/tmp")
        content = '''
        page LoginPage {
            field username = "#user"
            field password = "#pass"
        }
        '''

        result = updater.parse_page(content, "LoginPage")

        assert result is not None
        assert result["name"] == "LoginPage"
        assert result["fields"]["username"] == "#user"
        assert result["fields"]["password"] == "#pass"

    def test_add_field_to_page(self):
        """Should add new field to existing page"""
        from src.agent.page_updater import PageUpdater

        updater = PageUpdater("/tmp")
        content = '''page LoginPage {
    field username = "#user"
}'''

        result = updater.add_field_to_page(
            content,
            "LoginPage",
            "submit_btn",
            "#submit"
        )

        assert 'field submit_btn = "#submit"' in result
        assert 'field username = "#user"' in result

    def test_create_page(self):
        """Should generate new page definition"""
        from src.agent.page_updater import PageUpdater

        updater = PageUpdater("/tmp")
        result = updater.create_page("HomePage", {
            "search": "#search-input",
            "nav": ".main-nav"
        })

        assert "page HomePage {" in result
        assert 'field search = "#search-input"' in result
        assert 'field nav = ".main-nav"' in result


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
