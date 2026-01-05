#!/bin/bash
#
# Vero Worker Entrypoint
#
# Starts VNC services and the worker process
#
set -e

echo "========================================"
echo "  Vero Test Worker Starting"
echo "========================================"
echo ""

# Environment info
echo "Worker ID: ${WORKER_ID:-auto}"
echo "Coordinator: ${COORDINATOR_URL:-http://coordinator:3001}"
echo "Max Concurrent: ${WORKER_MAX_CONCURRENT:-2}"
echo "Browsers: ${WORKER_BROWSERS:-chromium,firefox,webkit}"
echo ""

# Start Xvfb (virtual framebuffer)
echo "Starting Xvfb..."
Xvfb $DISPLAY -screen 0 ${SCREEN_WIDTH}x${SCREEN_HEIGHT}x${SCREEN_DEPTH} &
XVFB_PID=$!
sleep 2

# Start fluxbox window manager (minimal)
echo "Starting Fluxbox..."
fluxbox &
FLUXBOX_PID=$!
sleep 1

if [ "${VNC_ENABLED:-true}" = "true" ]; then
    # Start x11vnc (VNC server)
    echo "Starting x11vnc..."
    x11vnc -display $DISPLAY -forever -shared -rfbport ${VNC_PORT:-5900} -bg -o /var/log/x11vnc.log

    # Start websockify (WebSocket bridge for noVNC)
    echo "Starting noVNC..."
    websockify --web=/usr/share/novnc ${NOVNC_PORT:-6080} localhost:${VNC_PORT:-5900} &
    WEBSOCKIFY_PID=$!

    echo ""
    echo "VNC Access: http://localhost:${NOVNC_PORT:-6080}/vnc.html"
fi

echo ""
echo "Starting worker process..."

# Start worker with proper signal handling
exec node dist/index.js &
WORKER_PID=$!

# Signal handler for graceful shutdown
cleanup() {
    echo ""
    echo "Shutting down worker..."

    # Kill worker process
    if [ ! -z "$WORKER_PID" ]; then
        kill -TERM $WORKER_PID 2>/dev/null || true
        wait $WORKER_PID 2>/dev/null || true
    fi

    # Kill VNC services
    if [ ! -z "$WEBSOCKIFY_PID" ]; then
        kill -TERM $WEBSOCKIFY_PID 2>/dev/null || true
    fi

    # Kill window manager
    if [ ! -z "$FLUXBOX_PID" ]; then
        kill -TERM $FLUXBOX_PID 2>/dev/null || true
    fi

    # Kill Xvfb
    if [ ! -z "$XVFB_PID" ]; then
        kill -TERM $XVFB_PID 2>/dev/null || true
    fi

    echo "Shutdown complete."
    exit 0
}

trap cleanup SIGTERM SIGINT

# Wait for worker process
wait $WORKER_PID
