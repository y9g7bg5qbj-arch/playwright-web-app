# Vero Agent

AI-powered test case generator that converts plain English test steps to Vero DSL scripts.

## Features

- **Plug-and-play LLM**: Switch between Gemini, Claude, OpenAI, or Ollama
- **Codebase awareness**: Reuses existing Page objects and selectors
- **Hybrid selector resolution**: Gemini visual AI → Playwright semantic selectors
- **Self-healing**: Retries failed tests up to 20 times with AI-powered fixes

## Quick Start

```bash
# 1. Setup Python environment
cd vero-agent
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -e .
playwright install chromium

# 3. Configure API key
cp .env.example .env
# Edit .env and set your API key

# 4. Start the agent
uvicorn src.main:app --port 5001
```

## Configuration

Set environment variables in `.env`:

```bash
# Model provider: gemini, claude, openai, ollama
LLM_PROVIDER=gemini

# API keys (set the one matching your provider)
GOOGLE_API_KEY=your-key
# ANTHROPIC_API_KEY=your-key
# OPENAI_API_KEY=your-key

# Project path for codebase context
VERO_PROJECT_PATH=../

# Max self-healing retries
MAX_RETRIES=20
```

## API Endpoints

### Generate Vero Code
```bash
curl -X POST http://localhost:5001/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "steps": "Navigate to login page\nFill email with test@example.com\nClick Submit",
    "url": "http://localhost:5173",
    "feature_name": "Login",
    "scenario_name": "Valid Login"
  }'
```

### Run with Self-Healing
```bash
curl -X POST http://localhost:5001/api/run \
  -H "Content-Type: application/json" \
  -d '{
    "vero_code": "feature Login { ... }",
    "max_retries": 20
  }'
```

### Generate and Run (Combined)
```bash
curl -X POST http://localhost:5001/api/generate-and-run \
  -H "Content-Type: application/json" \
  -d '{
    "steps": "Click Login, fill email with test@example.com",
    "url": "http://localhost:5173"
  }'
```

## Model Recommendations

| Model | Best For | Speed | Accuracy |
|:------|:---------|:-----:|:--------:|
| **Gemini 2.0 Flash** | Complex UI (Salesforce) | Fast | ⭐⭐⭐⭐⭐ |
| **Claude 3.5 Sonnet** | Code generation | Medium | ⭐⭐⭐⭐ |
| **GPT-4o** | General tasks | Medium | ⭐⭐⭐⭐ |
| **Ollama (local)** | Privacy/offline | Varies | ⭐⭐⭐ |
