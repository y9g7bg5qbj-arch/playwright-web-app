"""
Smart Selector Resolver

Checks existing .vero files for page objects and selectors.
Reuses existing selectors when possible, creates new ones when needed.
"""
import re
from pathlib import Path
from typing import TypedDict
from browser_use import Agent, Browser
from playwright.async_api import Page

from .selector_bridge import (
    element_at_coordinates,
    generate_playwright_selector,
    selector_to_vero,
)


class FieldDefinition(TypedDict):
    """A field from a Vero Page object"""
    name: str
    selector: str


class PageDefinition(TypedDict):
    """A Page object from a .vero file"""
    name: str
    fields: dict[str, str]  # field_name -> selector
    source_file: str


class SelectorResolver:
    """
    Smart selector resolution with project codebase awareness.
    
    1. Parses existing .vero files to find Page objects
    2. When asked to find an element, checks if a matching selector exists
    3. If not, uses AI + coordinates to create a new selector
    4. Tracks new selectors to be added to Page objects
    """
    
    def __init__(self, project_path: str, llm):
        self.project_path = Path(project_path)
        self.llm = llm
        self.existing_pages: dict[str, PageDefinition] = {}
        self.new_fields: dict[str, dict[str, str]] = {}  # page_name -> {field: selector}
        self._load_existing_pages()
    
    def _load_existing_pages(self) -> None:
        """Parse all .vero files and extract Page definitions"""
        vero_pattern = self.project_path / "**" / "*.vero"
        
        for vero_file in self.project_path.glob("**/*.vero"):
            try:
                content = vero_file.read_text()
                self._parse_pages_from_content(content, str(vero_file))
            except Exception as e:
                print(f"Warning: Could not parse {vero_file}: {e}")
    
    def _parse_pages_from_content(self, content: str, source_file: str) -> None:
        """Extract page definitions from Vero DSL content"""
        # Match: page PageName { ... }
        page_pattern = r'page\s+(\w+)\s*\{([^}]*)\}'
        
        for match in re.finditer(page_pattern, content, re.DOTALL):
            page_name = match.group(1)
            page_body = match.group(2)
            
            fields = self._parse_fields(page_body)
            
            self.existing_pages[page_name] = {
                "name": page_name,
                "fields": fields,
                "source_file": source_file,
            }
    
    def _parse_fields(self, page_body: str) -> dict[str, str]:
        """Extract field definitions from a page body"""
        fields = {}
        
        # Match: field fieldName = "selector"
        field_pattern = r'field\s+(\w+)\s*=\s*"([^"]*)"'
        
        for match in re.finditer(field_pattern, page_body):
            field_name = match.group(1)
            selector = match.group(2)
            fields[field_name] = selector
        
        return fields
    
    def find_existing_selector(self, element_description: str) -> tuple[str, str] | None:
        """
        Search existing Pages for a selector matching the element description.
        
        Returns:
            Tuple of (PageName.fieldName, selector) if found, None otherwise
        """
        description_lower = element_description.lower()
        
        for page_name, page_def in self.existing_pages.items():
            for field_name, selector in page_def["fields"].items():
                # Check if selector text matches the description
                selector_lower = selector.lower()
                field_lower = field_name.lower()
                
                # Match by selector content or field name
                if (description_lower in selector_lower or 
                    selector_lower in description_lower or
                    description_lower in field_lower or
                    field_lower in description_lower):
                    return f"{page_name}.{field_name}", selector
        
        return None
    
    async def resolve(
        self, 
        element_description: str, 
        page: Page | None = None,
        url: str | None = None,
        page_name: str = "Page"
    ) -> tuple[str, bool]:
        """
        Resolve an element description to a selector reference.
        
        Args:
            element_description: Human description like "Login button"
            page: Optional Playwright page for coordinate-based resolution
            url: Optional URL to navigate to for AI-based resolution
            page_name: Name of the Page object for new fields
        
        Returns:
            Tuple of (reference, is_new) where reference is "PageName.fieldName"
        """
        # 1. Check existing selectors
        existing = self.find_existing_selector(element_description)
        if existing:
            return existing[0], False
        
        # 2. If we have a page, try coordinate-based resolution
        if page is not None:
            return await self._resolve_with_browser(
                element_description, page, page_name
            )
        
        # 3. If we have a URL but no page, use AI browsing
        if url:
            return await self._resolve_with_ai(
                element_description, url, page_name
            )
        
        # 4. Generate a field name from description (fallback)
        field_name = self._generate_field_name(element_description)
        return f"{page_name}.{field_name}", True
    
    async def _resolve_with_browser(
        self, 
        description: str, 
        page: Page, 
        page_name: str
    ) -> tuple[str, bool]:
        """Use AI to find element coordinates, then get Playwright selector"""
        # Use browser-use to find the element
        browser = Browser()
        agent = Agent(
            task=f"Find and point to the element: {description}",
            llm=self.llm,
            browser=browser
        )
        
        try:
            result = await agent.run()
            
            # Get coordinates from the last action
            if hasattr(result, 'last_action') and hasattr(result.last_action, 'coordinates'):
                x, y = result.last_action.coordinates
                
                # Use coordinate bridge to get proper selector
                element_info = await element_at_coordinates(page, x, y)
                if element_info:
                    playwright_selector = generate_playwright_selector(element_info)
                    field_name = self._generate_field_name(description)
                    vero_field = selector_to_vero(playwright_selector, field_name)
                    
                    # Track the new field
                    self._add_new_field(page_name, field_name, playwright_selector)
                    
                    return f"{page_name}.{field_name}", True
        except Exception as e:
            print(f"Warning: AI resolution failed: {e}")
        
        # Fallback
        field_name = self._generate_field_name(description)
        return f"{page_name}.{field_name}", True
    
    async def _resolve_with_ai(
        self, 
        description: str, 
        url: str, 
        page_name: str
    ) -> tuple[str, bool]:
        """Use AI to navigate and find the element"""
        browser = Browser()
        agent = Agent(
            task=f"Go to {url} and find the element: {description}. Return its selector.",
            llm=self.llm,
            browser=browser
        )
        
        try:
            result = await agent.run()
            field_name = self._generate_field_name(description)
            # The AI should return info we can use
            return f"{page_name}.{field_name}", True
        except Exception as e:
            print(f"Warning: AI navigation failed: {e}")
            field_name = self._generate_field_name(description)
            return f"{page_name}.{field_name}", True
    
    def _generate_field_name(self, description: str) -> str:
        """Generate a camelCase field name from a description"""
        # Remove common words and punctuation
        words = re.findall(r'\w+', description.lower())
        stop_words = {'the', 'a', 'an', 'to', 'for', 'on', 'in', 'at', 'is', 'it'}
        words = [w for w in words if w not in stop_words]
        
        if not words:
            return "element"
        
        # CamelCase
        result = words[0]
        for word in words[1:]:
            result += word.capitalize()
        
        # Add common suffixes based on apparent type
        if any(w in description.lower() for w in ['button', 'btn', 'submit', 'click']):
            if not result.endswith('Btn') and not result.endswith('Button'):
                result += 'Btn'
        elif any(w in description.lower() for w in ['input', 'field', 'text', 'email', 'password']):
            if not result.endswith('Input') and not result.endswith('Field'):
                result += 'Input'
        elif any(w in description.lower() for w in ['link', 'href', 'nav']):
            if not result.endswith('Link'):
                result += 'Link'
        
        return result
    
    def _add_new_field(self, page_name: str, field_name: str, selector: str) -> None:
        """Track a new field to be added to a Page object"""
        if page_name not in self.new_fields:
            self.new_fields[page_name] = {}
        self.new_fields[page_name][field_name] = selector
    
    def get_context_for_llm(self) -> str:
        """Build context string about existing Pages for the LLM"""
        if not self.existing_pages:
            return "No existing Page objects found in the project."
        
        lines = ["Existing Page Objects in this project:"]
        for page_name, page_def in self.existing_pages.items():
            lines.append(f"\npage {page_name} {{")
            for field_name, selector in page_def["fields"].items():
                lines.append(f'    field {field_name} = "{selector}"')
            lines.append("}")
        
        lines.append("\nWhen generating Vero code, reuse these Page.field references when applicable.")
        return "\n".join(lines)
    
    def get_new_fields_vero(self) -> dict[str, str]:
        """Get new fields formatted as Vero DSL, grouped by Page"""
        result = {}
        for page_name, fields in self.new_fields.items():
            lines = []
            for field_name, selector in fields.items():
                lines.append(f'    field {field_name} = "{selector}"')
            result[page_name] = "\n".join(lines)
        return result
