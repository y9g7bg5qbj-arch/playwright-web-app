"""
Vero DSL Generator

Converts plain English test steps to Vero DSL code.
Uses AI to understand intent and selector resolver for element references.
"""
import re
from .selector_resolver import SelectorResolver


class VeroGenerator:
    """
    Converts plain English test case steps to Vero DSL.
    
    Features:
    - Project codebase awareness (reuses existing Page objects)
    - Smart selector resolution
    - Generates both Page definitions and Scenarios
    """
    
    def __init__(self, selector_resolver: SelectorResolver, llm):
        self.resolver = selector_resolver
        self.llm = llm
    
    async def generate(
        self, 
        english_steps: str, 
        target_url: str | None = None,
        feature_name: str = "GeneratedFeature",
        scenario_name: str = "Generated Scenario"
    ) -> str:
        """
        Convert plain English steps to Vero DSL.
        
        Args:
            english_steps: Natural language test steps
            target_url: URL of the application under test
            feature_name: Name for the generated feature
            scenario_name: Name for the generated scenario
        
        Returns:
            Generated Vero DSL code
        """
        # Get codebase context
        context = self.resolver.get_context_for_llm()
        
        # Build prompt for the LLM
        prompt = self._build_prompt(
            english_steps, 
            context, 
            target_url,
            feature_name,
            scenario_name
        )
        
        # Generate Vero code with AI
        response = await self.llm.ainvoke(prompt)
        vero_code = self._extract_vero_code(response.content)
        
        return vero_code
    
    def _build_prompt(
        self, 
        steps: str, 
        context: str,
        url: str | None,
        feature_name: str,
        scenario_name: str
    ) -> str:
        """Build the LLM prompt for Vero generation"""
        return f"""You are an expert in Vero DSL, a domain-specific language for test automation.

{context}

VERO DSL SYNTAX REFERENCE:
```
page PageName {{
    field elementName = "selector or visible text"
    text variableName = "value"
}}

feature FeatureName {{
    use PageName
    
    scenario "Scenario Name" {{
        open "/path"
        fill PageName.fieldName with "value"
        click PageName.buttonField
        verify "expected text" is visible
    }}
}}
```

SMART SELECTORS (Vero automatically infers Playwright locators):
- "Submit" -> getByText("Submit")
- "#login-btn" -> locator("#login-btn")
- "[data-testid=foo]" -> getByTestId("foo")

RULES:
1. ALWAYS check if an element exists in existing Pages before creating new fields
2. Use Page.field syntax for all element references
3. Create new Page definitions only for new elements not in existing Pages
4. Use descriptive camelCase for field names (loginBtn, emailInput, submitBtn)
5. Generate clean, readable Vero DSL code

{"TARGET URL: " + url if url else ""}

CONVERT THESE STEPS TO VERO DSL:
{steps}

FEATURE NAME: {feature_name}
SCENARIO NAME: {scenario_name}

Generate the complete Vero DSL code including any new Page definitions needed:"""
    
    def _extract_vero_code(self, response: str) -> str:
        """Extract Vero DSL code from LLM response"""
        # Look for code blocks
        code_block = re.search(r'```(?:vero)?\s*([\s\S]*?)```', response)
        if code_block:
            return code_block.group(1).strip()
        
        # Look for page/feature definitions directly
        if 'page ' in response or 'feature ' in response:
            # Find the start of the actual code
            lines = response.split('\n')
            code_lines = []
            in_code = False
            
            for line in lines:
                if line.strip().startswith(('page ', 'feature ')):
                    in_code = True
                if in_code:
                    code_lines.append(line)
            
            return '\n'.join(code_lines).strip()
        
        return response.strip()
    
    def generate_simple(
        self,
        steps: list[str],
        page_name: str = "Page",
        feature_name: str = "Feature",
        scenario_name: str = "Test Scenario"
    ) -> str:
        """
        Generate Vero DSL without AI, using pattern matching.
        Useful for simpler cases or as a fallback.
        """
        page_fields = []
        scenario_steps = []
        field_counter = {}
        
        for step in steps:
            parsed = self._parse_step(step, page_name, field_counter)
            if parsed.get("field"):
                page_fields.append(parsed["field"])
            if parsed.get("action"):
                scenario_steps.append(parsed["action"])
        
        # Build the Vero code
        lines = []
        
        # Page definition if we have new fields
        if page_fields:
            lines.append(f"page {page_name} {{")
            for field in page_fields:
                lines.append(f"    {field}")
            lines.append("}")
            lines.append("")
        
        # Feature and scenario
        lines.append(f"feature {feature_name} {{")
        lines.append(f"    use {page_name}")
        lines.append("")
        lines.append(f'    scenario "{scenario_name}" {{')
        for action in scenario_steps:
            lines.append(f"        {action}")
        lines.append("    }")
        lines.append("}")
        
        return "\n".join(lines)
    
    def _parse_step(
        self, 
        step: str, 
        page_name: str,
        field_counter: dict
    ) -> dict:
        """Parse a single English step into Vero components"""
        step_lower = step.lower().strip()
        result = {"field": None, "action": None}
        
        # Navigate / Open
        if step_lower.startswith(("navigate to", "go to", "open")):
            url_match = re.search(r'(?:navigate to|go to|open)\s+["\']?([^"\']+)["\']?', step, re.I)
            if url_match:
                url = url_match.group(1).strip()
                if not url.startswith(('http', '/')):
                    url = '/' + url
                result["action"] = f'open "{url}"'
        
        # Click
        elif step_lower.startswith("click"):
            element = re.sub(r'^click(?:\s+on|\s+the)?\s+', '', step, flags=re.I).strip()
            field_name = self._make_field_name(element, "Btn", field_counter)
            result["field"] = f'field {field_name} = "{element}"'
            result["action"] = f"click {page_name}.{field_name}"
        
        # Fill / Type / Enter
        elif any(step_lower.startswith(w) for w in ["fill", "type", "enter"]):
            match = re.search(
                r'(?:fill|type|enter)\s+(?:in\s+)?["\']?(.+?)["\']?\s+with\s+["\']?(.+?)["\']?$',
                step, re.I
            )
            if match:
                element = match.group(1).strip()
                value = match.group(2).strip()
                field_name = self._make_field_name(element, "Input", field_counter)
                result["field"] = f'field {field_name} = "{element}"'
                result["action"] = f'fill {page_name}.{field_name} with "{value}"'
        
        # Verify / Assert / Check
        elif any(step_lower.startswith(w) for w in ["verify", "assert", "check", "expect"]):
            text_match = re.search(r'["\']([^"\']+)["\']', step)
            if text_match:
                text = text_match.group(1)
                result["action"] = f'verify "{text}" is visible'
        
        # Wait
        elif step_lower.startswith("wait"):
            seconds_match = re.search(r'(\d+)\s*(?:second|sec|s)', step, re.I)
            if seconds_match:
                seconds = seconds_match.group(1)
                result["action"] = f"wait {seconds} seconds"
        
        return result
    
    def _make_field_name(self, element: str, suffix: str, counter: dict) -> str:
        """Generate a unique field name"""
        # Clean up the element description
        words = re.findall(r'\w+', element.lower())
        stop_words = {'the', 'a', 'an', 'to', 'for', 'on', 'in', 'at', 'button', 'field', 'input'}
        words = [w for w in words if w not in stop_words][:3]
        
        if not words:
            words = ['element']
        
        # Build camelCase name
        name = words[0]
        for word in words[1:]:
            name += word.capitalize()
        
        # Add suffix if not already present
        if not name.lower().endswith(suffix.lower()):
            name += suffix
        
        # Ensure uniqueness
        if name in counter:
            counter[name] += 1
            name = f"{name}{counter[name]}"
        else:
            counter[name] = 1
        
        return name
