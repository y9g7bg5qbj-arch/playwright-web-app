#!/usr/bin/env python3
"""
Simple test runner - avoids import issues
"""
import asyncio
import sys
import os

# Set up environment
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Simple test using subprocess to run as module
if __name__ == "__main__":
    import subprocess
    result = subprocess.run(
        [sys.executable, "-m", "src.test_runner"],
        cwd=os.path.dirname(os.path.abspath(__file__))
    )
    sys.exit(result.returncode)
