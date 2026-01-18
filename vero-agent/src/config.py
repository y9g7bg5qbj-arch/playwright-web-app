"""
Plug-and-play LLM configuration
Switch between Claude, Gemini, OpenAI, or Ollama with one env variable

Default: Claude Sonnet 4 (recommended for UI agents)
- Best consistency for multi-step browser workflows
- 72.7% on SWE-bench (code understanding)
- Superior tool use / function calling
"""
import os
from typing import Literal
from dotenv import load_dotenv

load_dotenv()

ModelProvider = Literal["claude", "gemini", "openai", "ollama"]

# Claude Sonnet 4 - Best for UI agents (consistency + tool use)
DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-20250514"


def get_llm(provider: ModelProvider | None = None):
    """
    Factory function for LLM instances.
    Supports: claude, gemini, openai, ollama

    Claude Sonnet 4 is recommended for UI agents:
    - Best consistency for automation workflows
    - Superior tool use and structured output
    - Excellent code generation

    Gemini 2.0 Flash is good for complex UIs (Salesforce, etc)
    """
    if provider is None:
        provider = os.getenv("LLM_PROVIDER", "claude")

    match provider:
        case "claude":
            from langchain_anthropic import ChatAnthropic
            model = os.getenv("CLAUDE_MODEL", DEFAULT_CLAUDE_MODEL)
            return ChatAnthropic(model=model)

        case "gemini":
            from langchain_google_genai import ChatGoogleGenerativeAI
            model = os.getenv("GEMINI_MODEL", "gemini-3-pro")
            return ChatGoogleGenerativeAI(model=model)

        case "openai":
            from langchain_openai import ChatOpenAI
            model = os.getenv("OPENAI_MODEL", "gpt-4o")
            return ChatOpenAI(model=model)

        case "ollama":
            from langchain_ollama import ChatOllama
            model = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
            return ChatOllama(model=model)

        case _:
            raise ValueError(f"Unknown LLM provider: {provider}")


# Default LLM instance - Claude Sonnet 4 for best UI agent performance
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "claude")
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", DEFAULT_CLAUDE_MODEL)
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "20"))
VERO_PROJECT_PATH = os.getenv("VERO_PROJECT_PATH", "../")

# API Security - set VERO_API_KEY env var to enable authentication
VERO_API_KEY = os.getenv("VERO_API_KEY")  # If None, authentication is disabled
REQUIRE_API_KEY = os.getenv("REQUIRE_API_KEY", "false").lower() == "true"

# Gemini Configuration (alternative for complex UIs)
GEMINI_THINKING_MODEL = os.getenv("GEMINI_THINKING_MODEL", "gemini-2.0-flash-thinking-exp-01-21")
GEMINI_STANDARD_MODEL = os.getenv("GEMINI_STANDARD_MODEL", "gemini-3-pro")
USE_GEMINI_HEALING = os.getenv("USE_GEMINI_HEALING", "false").lower() == "true"


def get_gemini_client():
    """Get Gemini client for computer use integration."""
    try:
        from .agent.gemini_computer_use import GeminiComputerUse
        return GeminiComputerUse()
    except Exception as e:
        print(f"Warning: Could not initialize Gemini client: {e}")
        return None
