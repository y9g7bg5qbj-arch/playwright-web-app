"""
Self-Healing Retry Executor

Runs generated Vero tests and retries with AI-powered fixes
until they pass (max 20 attempts).

Enhanced with Gemini 2.0 Flash Thinking for visual element detection
and smart selector healing.
"""
import asyncio
import subprocess
import tempfile
import re
from pathlib import Path
from typing import Callable, Optional

from ..config import MAX_RETRIES, USE_GEMINI_HEALING, get_gemini_client


class RetryExecutor:
    """
    Self-healing test executor with automatic retry and fix.
    
    1. Runs the generated Vero test
    2. If it fails, analyzes the error
    3. Uses AI to fix selectors/logic
    4. Retries up to MAX_RETRIES times
    """
    
    def __init__(self, llm, project_path: str, max_retries: int | None = None):
        self.llm = llm
        self.project_path = Path(project_path)
        self.max_retries = max_retries or MAX_RETRIES
        self.gemini_client = get_gemini_client() if USE_GEMINI_HEALING else None
        self._page = None  # Playwright page for visual healing
    
    async def run_until_pass(
        self, 
        vero_code: str,
        on_attempt: Callable[[int, bool, str], None] | None = None
    ) -> tuple[bool, str, int]:
        """
        Run test with self-healing retry loop.
        
        Args:
            vero_code: The Vero DSL code to run
            on_attempt: Optional callback (attempt, success, message)
        
        Returns:
            Tuple of (success, final_code, attempt_count)
        """
        current_code = vero_code
        
        for attempt in range(1, self.max_retries + 1):
            success, error = await self._run_test(current_code)
            
            if on_attempt:
                on_attempt(attempt, success, error if not success else "Passed!")
            
            if success:
                return True, current_code, attempt
            
            if attempt < self.max_retries:
                # Try to heal the test
                current_code = await self._heal(current_code, error)
        
        return False, current_code, self.max_retries
    
    async def _run_test(self, vero_code: str) -> tuple[bool, str]:
        """
        Run a Vero test and return (success, error_message).
        
        This calls the existing Vero transpiler and Playwright executor.
        """
        try:
            # Write Vero code to a temp file
            with tempfile.NamedTemporaryFile(
                mode='w', 
                suffix='.vero', 
                delete=False
            ) as f:
                f.write(vero_code)
                vero_file = f.name
            
            # Run via the backend's vero runner
            # This assumes the backend server is running
            result = await self._execute_via_backend(vero_file)
            
            # Clean up
            Path(vero_file).unlink(missing_ok=True)
            
            return result
            
        except Exception as e:
            return False, str(e)
    
    async def _execute_via_backend(self, vero_file: str) -> tuple[bool, str]:
        """
        Execute Vero file via the backend transpiler and Playwright.
        
        This can be done either:
        1. Via HTTP API call to the running backend
        2. Directly calling the transpiler if available
        """
        try:
            # Option 1: Call backend API
            import aiohttp
            async with aiohttp.ClientSession() as session:
                with open(vero_file, 'r') as f:
                    vero_code = f.read()
                
                async with session.post(
                    'http://localhost:3000/api/execution/run-vero',
                    json={'code': vero_code}
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get('success'):
                            return True, ""
                        return False, data.get('error', 'Test failed')
                    else:
                        error_text = await response.text()
                        return False, f"Backend error: {error_text}"
                        
        except ImportError:
            # aiohttp not installed, try subprocess approach
            return await self._execute_via_subprocess(vero_file)
        except Exception as e:
            return False, f"Execution error: {str(e)}"
    
    async def _execute_via_subprocess(self, vero_file: str) -> tuple[bool, str]:
        """Fallback: Run via subprocess command"""
        try:
            # Assuming there's a CLI command to run Vero files
            process = await asyncio.create_subprocess_exec(
                'npx', 'playwright', 'test', vero_file,
                cwd=str(self.project_path),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                return True, ""
            else:
                error = stderr.decode() if stderr else stdout.decode()
                return False, error
                
        except Exception as e:
            return False, f"Subprocess error: {str(e)}"
    
    async def _heal(self, vero_code: str, error: str) -> str:
        """
        Use AI to fix failing Vero code based on the error.

        Enhanced healing strategy:
        1. Parse error to identify the failing selector
        2. If Gemini is available, use visual element detection
        3. Fall back to LLM-based healing
        """
        # Try Gemini visual healing first for selector errors
        if self.gemini_client and self._is_selector_error(error):
            healed = await self._gemini_heal(vero_code, error)
            if healed:
                return healed

        # Fall back to LLM-based healing
        return await self._llm_heal(vero_code, error)

    def _is_selector_error(self, error: str) -> bool:
        """Check if error is related to selector/element not found."""
        selector_error_patterns = [
            r'locator.*not found',
            r'element.*not found',
            r'selector.*not found',
            r'waiting for.*timed out',
            r'no element.*matches',
            r'could not find',
            r'TimeoutError',
        ]
        error_lower = error.lower()
        return any(re.search(p, error_lower) for p in selector_error_patterns)

    def _extract_failed_selector(self, error: str) -> Optional[str]:
        """Extract the failed selector from error message."""
        patterns = [
            r'locator\("([^"]+)"\)',
            r'selector\s*[=:]\s*["\']([^"\']+)["\']',
            r'waiting for\s+([^\s]+)',
        ]
        for pattern in patterns:
            match = re.search(pattern, error)
            if match:
                return match.group(1)
        return None

    def _extract_element_description(self, vero_code: str, selector: str) -> Optional[str]:
        """Find element description from Vero code for a given selector."""
        # Look for field definitions with this selector
        pattern = rf'field\s+(\w+)\s*=\s*"{re.escape(selector)}"'
        match = re.search(pattern, vero_code)
        if match:
            return match.group(1).replace('_', ' ')
        return None

    async def _gemini_heal(self, vero_code: str, error: str) -> Optional[str]:
        """Use Gemini visual AI to find and fix broken selectors."""
        try:
            failed_selector = self._extract_failed_selector(error)
            if not failed_selector:
                return None

            element_desc = self._extract_element_description(vero_code, failed_selector)
            if not element_desc:
                # Use a generic description based on the error
                element_desc = f"element matching {failed_selector}"

            if not self._page:
                return None

            from .gemini_computer_use import GeminiHealingStrategy
            healer = GeminiHealingStrategy(self.gemini_client)
            new_selector = await healer.heal_selector(
                self._page,
                element_desc,
                failed_selector
            )

            if new_selector and new_selector != failed_selector:
                # Replace the old selector with the new one
                return vero_code.replace(
                    f'"{failed_selector}"',
                    f'"{new_selector}"'
                )

            return None
        except Exception as e:
            print(f"Gemini healing failed: {e}")
            return None

    async def _llm_heal(self, vero_code: str, error: str) -> str:
        """Use LLM to fix failing Vero code based on the error."""
        prompt = f"""You are a test automation expert. A Vero DSL test is failing.

CURRENT VERO CODE:
```vero
{vero_code}
```

ERROR MESSAGE:
```
{error}
```

COMMON FIXES:
1. Selector not found → Update the field selector to match the actual element
2. Element not visible → Add a wait or check if element exists first
3. Timeout → Increase wait time or check if page loaded
4. Wrong text → Update the text content being verified

Analyze the error and provide the FIXED Vero code.
Only output the corrected Vero code, no explanations.
"""

        try:
            response = await self.llm.ainvoke(prompt)
            fixed_code = self._extract_code(response.content)
            return fixed_code if fixed_code else vero_code
        except Exception as e:
            print(f"Warning: LLM healing failed: {e}")
            return vero_code

    def set_page(self, page):
        """Set the Playwright page for visual healing."""
        self._page = page
    
    def _extract_code(self, response: str) -> str:
        """Extract Vero code from LLM response"""
        import re
        
        # Look for code blocks
        code_block = re.search(r'```(?:vero)?\s*([\s\S]*?)```', response)
        if code_block:
            return code_block.group(1).strip()
        
        # If response starts with page/feature, use it directly
        if response.strip().startswith(('page ', 'feature ')):
            return response.strip()
        
        return ""
