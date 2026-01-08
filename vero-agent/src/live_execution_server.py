"""
WebSocket server for Live Execution Agent

Provides real-time streaming of:
- Screenshots
- Step progress
- Execution state
- Interactive corrections
"""

import asyncio
import json
from typing import Dict, Optional, Set
from fastapi import WebSocket, WebSocketDisconnect
from dataclasses import asdict

from .live_execution_agent import (
    LiveExecutionAgent,
    ExecutionState,
    StepResult,
    ExecutionContext
)


class ConnectionManager:
    """Manage WebSocket connections for live execution sessions"""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.agents: Dict[str, LiveExecutionAgent] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[session_id] = websocket

    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        if session_id in self.agents:
            # Stop the agent
            agent = self.agents[session_id]
            agent.request_stop()
            del self.agents[session_id]

    async def send_message(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            websocket = self.active_connections[session_id]
            await websocket.send_json(message)

    async def broadcast(self, message: dict):
        for websocket in self.active_connections.values():
            await websocket.send_json(message)

    def get_agent(self, session_id: str) -> Optional[LiveExecutionAgent]:
        return self.agents.get(session_id)

    def create_agent(self, session_id: str, **kwargs) -> LiveExecutionAgent:
        """Create a new agent with callbacks wired to WebSocket"""

        async def on_step_complete(result: StepResult):
            await self.send_message(session_id, {
                'type': 'step_complete',
                'data': {
                    'step_index': result.step_index,
                    'step_text': result.step_text,
                    'success': result.success,
                    'error': result.error,
                    'duration_ms': result.duration_ms,
                    'retries': result.retries,
                    'screenshot': result.screenshot_base64,
                }
            })

        def on_state_change(state: ExecutionState):
            asyncio.create_task(self.send_message(session_id, {
                'type': 'state_change',
                'data': {
                    'state': state.value
                }
            }))

        async def on_screenshot(screenshot_base64: str):
            await self.send_message(session_id, {
                'type': 'screenshot',
                'data': {
                    'image': screenshot_base64
                }
            })

        agent = LiveExecutionAgent(
            on_step_complete=lambda r: asyncio.create_task(on_step_complete(r)),
            on_state_change=on_state_change,
            on_screenshot=lambda s: asyncio.create_task(on_screenshot(s)),
            **kwargs
        )

        self.agents[session_id] = agent
        return agent


# Global connection manager
manager = ConnectionManager()


async def handle_websocket(websocket: WebSocket, session_id: str):
    """
    Handle WebSocket connection for live execution.

    Message types from client:
    - start: { steps: [...], url: "..." }
    - pause: {}
    - resume: {}
    - stop: {}
    - correct: { correction: "..." }
    - skip: {}

    Message types to client:
    - state_change: { state: "running" | "paused" | ... }
    - step_complete: { step_index, success, error, screenshot }
    - screenshot: { image: base64 }
    - error: { message: "..." }
    - execution_complete: { results: [...] }
    """
    await manager.connect(session_id, websocket)

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            message_type = data.get('type')

            if message_type == 'start':
                await handle_start(session_id, data)

            elif message_type == 'pause':
                await handle_pause(session_id)

            elif message_type == 'resume':
                await handle_resume(session_id)

            elif message_type == 'stop':
                await handle_stop(session_id)

            elif message_type == 'correct':
                await handle_correct(session_id, data)

            elif message_type == 'skip':
                await handle_skip(session_id)

            elif message_type == 'get_state':
                await handle_get_state(session_id)

            else:
                await manager.send_message(session_id, {
                    'type': 'error',
                    'data': {'message': f'Unknown message type: {message_type}'}
                })

    except WebSocketDisconnect:
        manager.disconnect(session_id)
    except Exception as e:
        await manager.send_message(session_id, {
            'type': 'error',
            'data': {'message': str(e)}
        })
        manager.disconnect(session_id)


async def handle_start(session_id: str, data: dict):
    """Start execution with provided steps"""
    steps = data.get('steps', [])
    url = data.get('url')
    headless = data.get('headless', False)
    step_delay = data.get('step_delay_ms', 500)

    if not steps:
        await manager.send_message(session_id, {
            'type': 'error',
            'data': {'message': 'No steps provided'}
        })
        return

    # Create agent
    agent = manager.create_agent(
        session_id,
        headless=headless,
        step_delay_ms=step_delay,
        screenshot_on_each_step=True
    )

    # Send initial state
    await manager.send_message(session_id, {
        'type': 'state_change',
        'data': {'state': 'starting'}
    })

    # Execute steps in background task
    async def execute():
        try:
            results = await agent.execute_steps(steps, url)

            # Send completion message
            await manager.send_message(session_id, {
                'type': 'execution_complete',
                'data': {
                    'success': all(r.success for r in results),
                    'total_steps': len(results),
                    'passed_steps': sum(1 for r in results if r.success),
                    'failed_steps': sum(1 for r in results if not r.success),
                    'results': [
                        {
                            'step_index': r.step_index,
                            'step_text': r.step_text,
                            'success': r.success,
                            'error': r.error,
                            'duration_ms': r.duration_ms,
                        }
                        for r in results
                    ]
                }
            })
        except Exception as e:
            await manager.send_message(session_id, {
                'type': 'error',
                'data': {'message': str(e)}
            })
        finally:
            await agent.stop()

    asyncio.create_task(execute())


async def handle_pause(session_id: str):
    """Pause execution"""
    agent = manager.get_agent(session_id)
    if agent:
        agent.pause()
        await manager.send_message(session_id, {
            'type': 'state_change',
            'data': {'state': 'paused'}
        })


async def handle_resume(session_id: str):
    """Resume execution"""
    agent = manager.get_agent(session_id)
    if agent:
        agent.resume()
        await manager.send_message(session_id, {
            'type': 'state_change',
            'data': {'state': 'running'}
        })


async def handle_stop(session_id: str):
    """Stop execution"""
    agent = manager.get_agent(session_id)
    if agent:
        agent.request_stop()
        await agent.stop()
        await manager.send_message(session_id, {
            'type': 'state_change',
            'data': {'state': 'stopped'}
        })


async def handle_correct(session_id: str, data: dict):
    """Provide correction for current step"""
    correction = data.get('correction', '')
    agent = manager.get_agent(session_id)
    if agent and correction:
        agent.provide_correction(correction)
        await manager.send_message(session_id, {
            'type': 'correction_received',
            'data': {'correction': correction}
        })


async def handle_skip(session_id: str):
    """Skip current step (provide empty correction to continue)"""
    agent = manager.get_agent(session_id)
    if agent:
        agent.provide_correction('')  # Empty correction = skip
        await manager.send_message(session_id, {
            'type': 'step_skipped',
            'data': {}
        })


async def handle_get_state(session_id: str):
    """Get current execution state"""
    agent = manager.get_agent(session_id)
    if agent:
        ctx = agent.context
        await manager.send_message(session_id, {
            'type': 'current_state',
            'data': {
                'state': ctx.state.value,
                'current_step_index': ctx.current_step_index,
                'total_steps': ctx.total_steps,
                'completed_steps': len(ctx.results),
            }
        })
    else:
        await manager.send_message(session_id, {
            'type': 'current_state',
            'data': {
                'state': 'idle',
                'current_step_index': 0,
                'total_steps': 0,
                'completed_steps': 0,
            }
        })
