"""
Vero Agent - FastAPI Server

REST API for generating Vero DSL from plain English test steps.
Includes WebSocket support for live execution with real-time feedback.
"""
import os
import uuid
from pathlib import Path
from contextlib import asynccontextmanager
from typing import List, Annotated

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Header, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from pydantic import BaseModel

from .config import get_llm, LLM_PROVIDER, VERO_PROJECT_PATH, MAX_RETRIES, VERO_API_KEY, REQUIRE_API_KEY
from .agent.selector_resolver import SelectorResolver
from .agent.vero_generator import VeroGenerator
from .agent.retry_executor import RetryExecutor
from .live_execution_server import handle_websocket, manager as ws_manager


# Global instances (initialized on startup)
llm = None
selector_resolver = None
vero_generator = None
retry_executor = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize components on startup"""
    global llm, selector_resolver, vero_generator, retry_executor
    
    print(f"🚀 Starting Vero Agent with {LLM_PROVIDER} model...")
    
    # Initialize LLM
    llm = get_llm(LLM_PROVIDER)
    
    # Initialize components
    project_path = Path(VERO_PROJECT_PATH).resolve()
    selector_resolver = SelectorResolver(str(project_path), llm)
    vero_generator = VeroGenerator(selector_resolver, llm)
    retry_executor = RetryExecutor(llm, str(project_path), MAX_RETRIES)
    
    print(f"✅ Vero Agent ready!")
    print(f"   Project path: {project_path}")
    print(f"   Existing pages found: {len(selector_resolver.existing_pages)}")
    if REQUIRE_API_KEY and VERO_API_KEY:
        print(f"   🔐 API Key authentication: ENABLED")
    else:
        print(f"   ⚠️  API Key authentication: DISABLED (set VERO_API_KEY and REQUIRE_API_KEY=true to enable)")
    
    yield
    
    print("👋 Vero Agent shutting down...")


app = FastAPI(
    title="Vero Agent",
    description="AI-powered test case generator for Vero DSL",
    version="0.1.0",
    lifespan=lifespan
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# API Key Security
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: Annotated[str | None, Depends(api_key_header)]):
    """
    Verify API key if authentication is enabled.

    To enable authentication:
    1. Set VERO_API_KEY env var to your secret key
    2. Set REQUIRE_API_KEY=true

    Clients must then include the header: X-API-Key: <your-key>
    """
    # If no API key configured or not required, allow all requests
    if not VERO_API_KEY or not REQUIRE_API_KEY:
        return None

    # API key is required but not provided
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key. Include 'X-API-Key' header.",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    # Verify the API key
    if api_key != VERO_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key",
        )

    return api_key


# Request/Response Models
class GenerateRequest(BaseModel):
    """Request to generate Vero code from English steps"""
    steps: str
    url: str | None = None
    feature_name: str = "GeneratedFeature"
    scenario_name: str = "Generated Scenario"
    use_ai: bool = True


class GenerateResponse(BaseModel):
    """Response with generated Vero code"""
    success: bool
    vero_code: str
    new_pages: dict[str, str] = {}
    message: str = ""


class RunRequest(BaseModel):
    """Request to run Vero code with self-healing"""
    vero_code: str
    max_retries: int | None = None


class RunResponse(BaseModel):
    """Response from running Vero code"""
    success: bool
    final_code: str
    attempts: int
    message: str


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    llm_provider: str
    project_path: str
    existing_pages: int


# API Routes
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check if the agent is running and configured"""
    return HealthResponse(
        status="healthy",
        llm_provider=LLM_PROVIDER,
        project_path=str(Path(VERO_PROJECT_PATH).resolve()),
        existing_pages=len(selector_resolver.existing_pages) if selector_resolver else 0
    )


@app.post("/api/generate", response_model=GenerateResponse, dependencies=[Depends(verify_api_key)])
async def generate_vero(request: GenerateRequest):
    """
    Generate Vero DSL code from plain English test steps.
    
    The agent will:
    1. Check existing Page objects for reusable selectors
    2. Use AI to understand the test intent
    3. Generate proper Vero DSL code
    """
    try:
        if request.use_ai:
            # Use AI-powered generation
            vero_code = await vero_generator.generate(
                english_steps=request.steps,
                target_url=request.url,
                feature_name=request.feature_name,
                scenario_name=request.scenario_name
            )
        else:
            # Use pattern-matching generation (faster, no API calls)
            steps = [s.strip() for s in request.steps.split('\n') if s.strip()]
            vero_code = vero_generator.generate_simple(
                steps=steps,
                feature_name=request.feature_name,
                scenario_name=request.scenario_name
            )
        
        # Get any new fields that were created
        new_pages = selector_resolver.get_new_fields_vero()
        
        return GenerateResponse(
            success=True,
            vero_code=vero_code,
            new_pages=new_pages,
            message="Vero code generated successfully"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/run", response_model=RunResponse, dependencies=[Depends(verify_api_key)])
async def run_vero(request: RunRequest):
    """
    Run Vero code with self-healing retry loop.
    
    Will attempt to run the test up to max_retries times,
    automatically fixing selectors and logic when tests fail.
    """
    try:
        max_retries = request.max_retries or MAX_RETRIES
        
        # Create executor with custom retry count if specified
        executor = RetryExecutor(llm, VERO_PROJECT_PATH, max_retries)
        
        success, final_code, attempts = await executor.run_until_pass(
            request.vero_code
        )
        
        return RunResponse(
            success=success,
            final_code=final_code,
            attempts=attempts,
            message="Test passed!" if success else f"Failed after {attempts} attempts"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-and-run", response_model=RunResponse, dependencies=[Depends(verify_api_key)])
async def generate_and_run(request: GenerateRequest):
    """
    Generate Vero code and run it with self-healing.
    
    Combines generation and execution in one call.
    """
    try:
        # First generate
        if request.use_ai:
            vero_code = await vero_generator.generate(
                english_steps=request.steps,
                target_url=request.url,
                feature_name=request.feature_name,
                scenario_name=request.scenario_name
            )
        else:
            steps = [s.strip() for s in request.steps.split('\n') if s.strip()]
            vero_code = vero_generator.generate_simple(
                steps=steps,
                feature_name=request.feature_name,
                scenario_name=request.scenario_name
            )
        
        # Then run with healing
        success, final_code, attempts = await retry_executor.run_until_pass(vero_code)
        
        return RunResponse(
            success=success,
            final_code=final_code,
            attempts=attempts,
            message="Test passed!" if success else f"Failed after {attempts} attempts"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/pages", dependencies=[Depends(verify_api_key)])
async def get_existing_pages():
    """Get all existing Page objects found in the project"""
    if not selector_resolver:
        return {"pages": {}}
    return {"pages": selector_resolver.existing_pages}


# ============= LIVE EXECUTION =============

class LiveExecutionRequest(BaseModel):
    """Request to start live execution"""
    steps: List[str]
    url: str | None = None
    headless: bool = False
    step_delay_ms: int = 500


class LiveExecutionResponse(BaseModel):
    """Response with session ID for WebSocket connection"""
    session_id: str
    websocket_url: str
    message: str


@app.post("/api/live/start", response_model=LiveExecutionResponse, dependencies=[Depends(verify_api_key)])
async def start_live_execution(request: LiveExecutionRequest):
    """
    Start a live execution session.

    Returns a session ID that should be used to connect via WebSocket
    for real-time updates and interactive control.

    WebSocket flow:
    1. Call this endpoint to get session_id
    2. Connect to /ws/live/{session_id}
    3. Send 'start' message with steps
    4. Receive real-time updates
    5. Use 'pause', 'resume', 'correct', 'stop' for control
    """
    session_id = str(uuid.uuid4())

    return LiveExecutionResponse(
        session_id=session_id,
        websocket_url=f"/ws/live/{session_id}",
        message="Session created. Connect via WebSocket and send 'start' message."
    )


@app.websocket("/ws/live/{session_id}")
async def websocket_live_execution(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for live execution with real-time feedback.

    Client Messages:
    - { "type": "start", "steps": [...], "url": "...", "headless": false }
    - { "type": "pause" }
    - { "type": "resume" }
    - { "type": "stop" }
    - { "type": "correct", "correction": "Click the BLUE button instead" }
    - { "type": "skip" }
    - { "type": "get_state" }

    Server Messages:
    - { "type": "state_change", "data": { "state": "running" } }
    - { "type": "step_complete", "data": { "step_index": 0, "success": true, ... } }
    - { "type": "screenshot", "data": { "image": "base64..." } }
    - { "type": "execution_complete", "data": { "success": true, "results": [...] } }
    - { "type": "error", "data": { "message": "..." } }
    """
    await handle_websocket(websocket, session_id)


@app.get("/api/live/sessions", dependencies=[Depends(verify_api_key)])
async def list_active_sessions():
    """List all active live execution sessions"""
    return {
        "sessions": list(ws_manager.active_connections.keys()),
        "count": len(ws_manager.active_connections)
    }


@app.delete("/api/live/sessions/{session_id}", dependencies=[Depends(verify_api_key)])
async def stop_session(session_id: str):
    """Stop a specific live execution session"""
    if session_id in ws_manager.active_connections:
        ws_manager.disconnect(session_id)
        return {"success": True, "message": f"Session {session_id} stopped"}
    raise HTTPException(status_code=404, detail="Session not found")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)
