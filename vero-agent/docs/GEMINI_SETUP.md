# Gemini 2.0 Flash Thinking Setup Guide

This guide explains how to set up and use Gemini 2.0 Flash Thinking for enhanced visual element detection and self-healing selectors.

## Overview

Gemini 2.0 Flash Thinking provides "computer use" capabilities that allow the agent to:
- Visually identify UI elements on screenshots
- Find elements even when selectors break
- Auto-heal broken selectors using visual AI
- Understand page structure through vision

## Prerequisites

1. **Google Cloud API Key** - Get one from [Google AI Studio](https://aistudio.google.com/)
2. **Python 3.10+**
3. **google-genai package** - `pip install google-genai`

## Configuration

### 1. Set Environment Variables

Add to your `.env` file:

```bash
# Required: Your Google API key
GOOGLE_API_KEY=your-google-api-key

# Optional: Model configuration
GEMINI_THINKING_MODEL=gemini-2.0-flash-thinking-exp-01-21
GEMINI_STANDARD_MODEL=gemini-2.0-flash

# Enable/disable visual healing
USE_GEMINI_HEALING=true
```

### 2. Install Dependencies

```bash
cd vero-agent
pip install google-genai playwright
npx playwright install chromium
```

## Usage

### Direct Usage

```python
from src.agent.gemini_computer_use import GeminiComputerUse, GeminiHealingStrategy

# Initialize
gemini = GeminiComputerUse()

# Get coordinates of an element by description
screenshot = await page.screenshot()
x, y, reasoning = await gemini.get_coordinates(
    screenshot,
    "blue login button"
)

# Or with a Playwright page
result = await gemini.identify_element(
    url="https://example.com",
    description="email input field",
    page=page
)
if result.success:
    print(f"Found at ({result.coordinates.x}, {result.coordinates.y})")
```

### Self-Healing Selectors

```python
from src.agent.gemini_computer_use import GeminiHealingStrategy

healer = GeminiHealingStrategy(gemini)

# When a selector fails, heal it
new_selector = await healer.heal_selector(
    page,
    element_description="submit button",
    failed_selector="button#old-submit"
)
```

### With RetryExecutor

The `RetryExecutor` automatically uses Gemini for visual healing when:
1. `USE_GEMINI_HEALING=true` in environment
2. A selector error is detected
3. A Playwright page is available

```python
from src.agent.retry_executor import RetryExecutor

executor = RetryExecutor(llm, project_path)
executor.set_page(playwright_page)  # Enable visual healing

success, final_code, attempts = await executor.run_until_pass(vero_code)
```

## How It Works

1. **Error Detection**: When a test fails with a selector error, the executor parses the error to find the broken selector

2. **Visual Search**: Gemini takes a screenshot and uses vision AI to locate the element by its description

3. **Coordinate Mapping**: The AI returns (x, y) coordinates where the element was found

4. **Selector Generation**: A new CSS/XPath selector is generated from the element at those coordinates

5. **Code Update**: The Vero code is updated with the new selector and retried

## Models

| Model | Use Case |
|-------|----------|
| `gemini-2.0-flash-thinking-exp-01-21` | Complex UIs, reasoning required |
| `gemini-2.0-flash` | Fast, simple element detection |

The thinking model is recommended for:
- Complex enterprise UIs (Salesforce, SAP)
- Elements that require context to identify
- Pages with similar-looking elements

## Troubleshooting

### "Google API key required"
Ensure `GOOGLE_API_KEY` is set in your environment or `.env` file.

### "Gemini not available"
Install the google-genai package: `pip install google-genai`

### Visual healing not working
1. Check `USE_GEMINI_HEALING=true`
2. Ensure `executor.set_page(page)` is called
3. Verify the page is loaded before screenshots

### Low confidence results
Try using more descriptive element descriptions:
- Bad: "button"
- Good: "blue Submit button in the login form"
