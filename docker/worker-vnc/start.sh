#!/bin/bash
set -e

echo "🖥️  Starting virtual display (Xvfb)..."
Xvfb :99 -screen 0 ${SCREEN_WIDTH:-1280}x${SCREEN_HEIGHT:-720}x${SCREEN_DEPTH:-24} &
sleep 1

echo "🪟 Starting window manager (Fluxbox)..."
fluxbox -display :99 &
sleep 1

echo "📺 Starting VNC server (x11vnc)..."
x11vnc -display :99 -forever -shared -rfbport ${VNC_PORT:-5900} -nopw -xkb &
sleep 1

echo "🌐 Starting noVNC WebSocket bridge..."
websockify --web=/usr/share/novnc/ ${NOVNC_PORT:-6080} localhost:${VNC_PORT:-5900} &
sleep 1

echo "✅ VNC ready! Access browser at: http://localhost:${NOVNC_PORT:-6080}/vnc.html"
echo ""
echo "🎭 Running Playwright tests (shard: ${SHARD:-1/1})..."

# Run tests in headed mode (visible in VNC)
# The SHARD variable is set by docker-compose
CI=true npx playwright test \
    --shard=${SHARD:-1/1} \
    --reporter=blob \
    --headed

echo "✅ Tests complete!"

# Keep container running for VNC viewing of final state
echo "📺 Container staying alive for VNC viewing. Press Ctrl+C to exit."
tail -f /dev/null
