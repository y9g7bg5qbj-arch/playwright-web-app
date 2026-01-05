"""
Plug-and-play LLM configuration
Switch between Gemini, Claude, OpenAI, or Ollama with one env variable
"""
import os
from typing import Literal
from dotenv import load_dotenv

load_dotenv()

ModelProvider = Literal["gemini", "claude", "openai", "ollama"]


def get_llm(provider: ModelProvider | None = None):
    """
    Factory function for LLM instances.
    Supports: gemini, claude, openai, ollama
    
    Gemini 2.0 Flash is recommended for complex UIs (Salesforce, etc)
    Claude is excellent for code generation
    """
    if provider is None:
        provider = os.getenv("LLM_PROVIDER", "gemini")
    
    match provider:
        case "gemini":
            from browser_use import ChatGoogle
            model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
            return ChatGoogle(model=model)
        
        case "claude":
            from browser_use import ChatAnthropic
            model = os.getenv("CLAUDE_MODEL", "claude-3-5-sonnet-20241022")
            return ChatAnthropic(model=model)
        
        case "openai":
            from browser_use import ChatOpenAI
            model = os.getenv("OPENAI_MODEL", "gpt-4o")
            return ChatOpenAI(model=model)
        
        case "ollama":
            from browser_use import ChatOllama
            model = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
            return ChatOllama(model=model)
        
        case _:
            raise ValueError(f"Unknown LLM provider: {provider}")


# Default LLM instance
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini")
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "20"))
VERO_PROJECT_PATH = os.getenv("VERO_PROJECT_PATH", "../")

# Gemini 2.0 Flash Thinking Configuration
GEMINI_THINKING_MODEL = os.getenv("GEMINI_THINKING_MODEL", "gemini-2.0-flash-thinking-exp-01-21")
GEMINI_STANDARD_MODEL = os.getenv("GEMINI_STANDARD_MODEL", "gemini-2.0-flash")
USE_GEMINI_HEALING = os.getenv("USE_GEMINI_HEALING", "true").lower() == "true"


def get_gemini_client():
    """Get Gemini client for computer use integration."""
    try:
        from .agent.gemini_computer_use import GeminiComputerUse
        return GeminiComputerUse()
    except Exception as e:
        print(f"Warning: Could not initialize Gemini client: {e}")
        return None
