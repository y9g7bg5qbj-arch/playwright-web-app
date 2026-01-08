#!/usr/bin/env python3
"""
Test script for the Live Execution Agent
Runs a simple test scenario against a demo website
"""
import asyncio
import sys
import os

# Add src to path and set up for relative imports
os.chdir(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, 'src')

# Import with absolute paths
import config
import importlib.util

# Load the module properly
spec = importlib.util.spec_from_file_location("live_execution_agent", "src/live_execution_agent.py")
live_execution_agent = importlib.util.module_from_spec(spec)

# We need to handle the relative imports - let's just run as a module instead
