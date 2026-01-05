"""
Hybrid Coordinate → Selector Bridge

Uses Gemini Computer Use to visually identify elements,
then converts coordinates to robust Playwright selectors.
"""
from playwright.async_api import Page
from typing import TypedDict


class ElementInfo(TypedDict):
    """Information extracted from a DOM element at coordinates"""
    role: str | None
    text: str | None
    label: str | None
    testId: str | None
    id: str | None
    className: str | None
    tagName: str
    placeholder: str | None
    name: str | None


async def element_at_coordinates(page: Page, x: int, y: int) -> ElementInfo | None:
    """
    Get DOM element information at specific coordinates.
    This bridges Gemini's visual output to Playwright's selector system.
    
    Args:
        page: Playwright page instance
        x: X coordinate from Gemini Computer Use
        y: Y coordinate from Gemini Computer Use
    
    Returns:
        ElementInfo with attributes for building selectors, or None if no element
    """
    return await page.evaluate("""
        (coords) => {
            const el = document.elementFromPoint(coords.x, coords.y);
            if (!el) return null;
            
            // Get text content, prioritizing direct text
            let text = null;
            if (el.childNodes.length > 0) {
                for (const child of el.childNodes) {
                    if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
                        text = child.textContent.trim().slice(0, 50);
                        break;
                    }
                }
            }
            if (!text && el.innerText) {
                text = el.innerText.trim().slice(0, 50);
            }
            
            return {
                role: el.getAttribute('role') || el.tagName.toLowerCase(),
                text: text,
                label: el.getAttribute('aria-label'),
                testId: el.getAttribute('data-testid') || el.getAttribute('data-test-id'),
                id: el.id || null,
                className: el.className || null,
                tagName: el.tagName.toLowerCase(),
                placeholder: el.getAttribute('placeholder'),
                name: el.getAttribute('name')
            };
        }
    """, {"x": x, "y": y})


def generate_playwright_selector(info: ElementInfo) -> str:
    """
    Generate the best Playwright-style selector from element info.
    Uses Playwright's recommended priority order.
    
    Priority:
    1. data-testid (most stable)
    2. getByRole with accessible name
    3. getByLabel (form elements)
    4. getByPlaceholder
    5. getByText
    6. CSS selector (fallback)
    """
    if not info:
        return ""
    
    # 1. Test ID is most stable
    if info.get("testId"):
        return f'getByTestId("{info["testId"]}")'
    
    # 2. Role with accessible name (semantic and stable)
    role = info.get("role", "").lower()
    text = info.get("text")
    label = info.get("label")
    
    # Map HTML tags to ARIA roles
    role_map = {
        "button": "button",
        "a": "link",
        "input": "textbox",
        "select": "combobox",
        "textarea": "textbox",
        "img": "img",
        "h1": "heading",
        "h2": "heading",
        "h3": "heading",
    }
    semantic_role = role_map.get(info.get("tagName", ""), role)
    
    if semantic_role and (text or label):
        name = label or text
        return f'getByRole("{semantic_role}", {{ name: "{name}" }})'
    
    # 3. Label (great for form elements)
    if label:
        return f'getByLabel("{label}")'
    
    # 4. Placeholder
    if info.get("placeholder"):
        return f'getByPlaceholder("{info["placeholder"]}")'
    
    # 5. Text content
    if text and len(text) < 30:
        return f'getByText("{text}")'
    
    # 6. Fallback to CSS selectors
    if info.get("id"):
        return f'locator("#{info["id"]}")'
    if info.get("name"):
        return f'locator("[name=\\"{info["name"]}\\"]")'
    if info.get("className"):
        # Use first class only
        first_class = info["className"].split()[0] if isinstance(info["className"], str) else ""
        if first_class:
            return f'locator(".{first_class}")'
    
    # Last resort: tag name
    return f'locator("{info["tagName"]}")'


def selector_to_vero(selector: str, field_name: str) -> str:
    """
    Convert a Playwright selector to Vero DSL field syntax.
    
    Examples:
        getByRole("button", { name: "Login" }) -> field loginBtn = "Login"
        getByTestId("submit-btn") -> field submitBtn = "#submit-btn"
    """
    # Extract the human-readable part for Vero's smart selector
    if selector.startswith('getByRole'):
        # Extract name from getByRole("button", { name: "Login" })
        import re
        match = re.search(r'name:\s*"([^"]+)"', selector)
        if match:
            return f'field {field_name} = "{match.group(1)}"'
    
    if selector.startswith('getByText') or selector.startswith('getByLabel'):
        # Extract text from getByText("Submit")
        import re
        match = re.search(r'"([^"]+)"', selector)
        if match:
            return f'field {field_name} = "{match.group(1)}"'
    
    if selector.startswith('getByTestId'):
        import re
        match = re.search(r'"([^"]+)"', selector)
        if match:
            return f'field {field_name} = "[data-testid={match.group(1)}]"'
    
    if selector.startswith('getByPlaceholder'):
        import re
        match = re.search(r'"([^"]+)"', selector)
        if match:
            return f'field {field_name} = "[placeholder=\\"{match.group(1)}\\"]"'
    
    if selector.startswith('locator'):
        import re
        match = re.search(r'"([^"]+)"', selector)
        if match:
            return f'field {field_name} = "{match.group(1)}"'
    
    return f'field {field_name} = "{selector}"'
