"""Gemini 2.0 Flash Thinking Computer Use Integration"""
import asyncio, base64, os
from dataclasses import dataclass
from typing import Optional, Tuple, List
from playwright.async_api import Page

@dataclass
class ElementCoordinates:
    x: int
    y: int
    confidence: float
    element_description: str
    bounding_box: Optional[dict] = None

@dataclass
class IdentificationResult:
    success: bool
    coordinates: Optional[ElementCoordinates] = None
    error: Optional[str] = None
    reasoning: Optional[str] = None

class GeminiComputerUse:
    MODEL_THINKING = "gemini-2.0-flash-thinking-exp-01-21"
    MODEL_STANDARD = "gemini-3-pro"

    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError("Google API key required")
        try:
            from google import genai
            self.client = genai.Client(api_key=self.api_key)
            self._available = True
        except ImportError:
            self._available, self.client = False, None

    @property
    def is_available(self): return self._available and self.client is not None

    async def identify_element(self, url, description, page=None, use_thinking=True):
        if not self.is_available:
            return IdentificationResult(success=False, error="Gemini not available")
        try:
            ss = await page.screenshot(full_page=False) if page else await self._capture_screenshot(url)
            if not ss: return IdentificationResult(success=False, error="Screenshot failed")
            b64 = base64.b64encode(ss).decode("utf-8")
            model = self.MODEL_THINKING if use_thinking else self.MODEL_STANDARD
            result = await self._call_gemini_vision(model, f"Find element: {description}", b64)
            if result.get("success"):
                coords = ElementCoordinates(x=result["x"], y=result["y"], confidence=result.get("confidence", 0.8), element_description=description)
                return IdentificationResult(success=True, coordinates=coords, reasoning=result.get("reasoning"))
            return IdentificationResult(success=False, error=result.get("error", "Not found"))
        except Exception as e:
            return IdentificationResult(success=False, error=str(e))

    async def get_coordinates(self, screenshot, element_description, use_thinking=True):
        if not self.is_available: return None, None, "Gemini not available"
        try:
            b64 = base64.b64encode(screenshot).decode("utf-8")
            model = self.MODEL_THINKING if use_thinking else self.MODEL_STANDARD
            result = await self._call_gemini_vision(model, f"Find: {element_description}", b64)
            if result.get("success"): return result["x"], result["y"], result.get("reasoning", "Found")
            return None, None, result.get("error", "Not found")
        except Exception as e: return None, None, str(e)

    async def _call_gemini_vision(self, model, prompt, image_b64):
        try:
            from google.genai.types import Content, Part
            contents = [Content(parts=[Part(inline_data={"mime_type": "image/png", "data": image_b64}), Part(text=prompt)])]
            response = await asyncio.to_thread(self.client.models.generate_content, model=model, contents=contents)
            text = response.text if hasattr(response, "text") else ""
            import json, re
            try: return json.loads(text.strip())
            except:
                m = re.search(r"\{[\s\S]*\}", text)
                return json.loads(m.group()) if m else {"success": False}
        except Exception as e: return {"success": False, "error": str(e)}

    async def _capture_screenshot(self, url):
        try:
            from playwright.async_api import async_playwright
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                await page.goto(url, wait_until="networkidle")
                ss = await page.screenshot(full_page=False)
                await browser.close()
                return ss
        except: return None

class GeminiHealingStrategy:
    def __init__(self, gemini): self.gemini = gemini
    async def heal_selector(self, page, element_description, failed_selector):
        ss = await page.screenshot(full_page=False)
        x, y, _ = await self.gemini.get_coordinates(ss, element_description)
        if x is None: return None
        from .selector_bridge import element_at_coordinates, generate_playwright_selector
        info = await element_at_coordinates(page, x, y)
        return generate_playwright_selector(info) if info else None
