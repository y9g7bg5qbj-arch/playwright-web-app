#!/bin/bash
#
# Vero Coordinator Entrypoint
#
set -e

echo "========================================"
echo "  Vero Test Coordinator Starting"
echo "========================================"
echo ""

# Environment info
echo "Port: ${PORT:-3001}"
echo "Redis: ${REDIS_URL:-redis://redis:6379}"
echo "Log Level: ${LOG_LEVEL:-info}"
echo ""

# Wait for Redis if configured
if [ ! -z "$REDIS_URL" ]; then
    echo "Waiting for Redis..."
    for i in {1..30}; do
        if redis-cli -u "$REDIS_URL" ping > /dev/null 2>&1; then
            echo "Redis is ready!"
            break
        fi
        echo -n "."
        sleep 1
    done
    echo ""
fi

echo "Starting coordinator..."
exec node dist/index.js
