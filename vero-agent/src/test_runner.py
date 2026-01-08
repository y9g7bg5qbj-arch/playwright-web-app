#!/usr/bin/env python3
"""
Test runner for the Live Execution Agent
"""
import asyncio
from .live_execution_agent import LiveExecutionAgent, ExecutionState


async def main():
    print("=" * 60)
    print("Vero Live Execution Agent - Test Run")
    print("=" * 60)
    
    # Test steps - simple login scenario on a demo site
    test_steps = [
        "Navigate to https://the-internet.herokuapp.com/login",
        "Fill username with tomsmith",
        "Fill password with SuperSecretPassword!",
        "Click Login button",
        "Assert You logged into a secure area is visible"
    ]
    
    print("\nTest Steps:")
    for i, step in enumerate(test_steps, 1):
        print(f"  {i}. {step}")
    print()
    
    # Callbacks
    def on_state_change(state: ExecutionState):
        print(f"[State] {state.value}")
    
    def on_step_complete(result):
        status = "✓" if result.success else "✗"
        print(f"[Step {result.step_index + 1}] {status} {result.step_text[:50]}...")
        if result.error:
            print(f"         Error: {result.error}")
    
    def on_vero_generated(vero_code):
        print("\n" + "=" * 60)
        print("Generated Vero Code:")
        print("=" * 60)
        print(vero_code)
    
    # Create agent (disable learning for simpler test)
    agent = LiveExecutionAgent(
        headless=False,
        max_retries=2,
        step_delay_ms=1000,
        screenshot_on_each_step=True,
        on_state_change=on_state_change,
        on_step_complete=on_step_complete,
        on_vero_generated=on_vero_generated,
        enable_learning=False  # Disable for now to avoid extra dependencies
    )
    
    try:
        print("\nStarting browser...")
        results = await agent.execute_steps(
            steps=test_steps,
            feature_name="Login Test",
            scenario_name="User can login with valid credentials"
        )
        
        # Summary
        print("\n" + "=" * 60)
        print("Execution Summary")
        print("=" * 60)
        
        passed = sum(1 for r in results if r.success)
        failed = len(results) - passed
        
        print(f"Total Steps: {len(results)}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        
        if failed > 0:
            print("\nFailed Steps:")
            for r in results:
                if not r.success:
                    print(f"  - Step {r.step_index + 1}: {r.step_text}")
                    print(f"    Error: {r.error}")
        
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        print("\nStopping browser...")
        await agent.stop()
        print("Done!")


if __name__ == "__main__":
    asyncio.run(main())
