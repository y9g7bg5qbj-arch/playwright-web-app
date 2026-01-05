#!/bin/bash
#
# Vero Test Cluster - Dynamic Worker Scaling
#
# Usage:
#   ./scale-workers.sh 4     # Scale to 4 workers
#   ./scale-workers.sh +2    # Add 2 more workers
#   ./scale-workers.sh -1    # Remove 1 worker
#
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$(dirname "$SCRIPT_DIR")"

cd "$DOCKER_DIR"

if [ -z "$1" ]; then
    echo "Usage: $0 <count|+N|-N>"
    echo ""
    echo "Examples:"
    echo "  $0 4     # Scale to 4 workers"
    echo "  $0 +2    # Add 2 more workers"
    echo "  $0 -1    # Remove 1 worker"
    exit 1
fi

SCALE_ARG=$1

# Get current worker count
CURRENT_COUNT=$(docker-compose ps -q worker 2>/dev/null | wc -l | tr -d ' ')

# Calculate new count
if [[ "$SCALE_ARG" == +* ]]; then
    # Add workers
    ADD_COUNT=${SCALE_ARG:1}
    NEW_COUNT=$((CURRENT_COUNT + ADD_COUNT))
elif [[ "$SCALE_ARG" == -* ]]; then
    # Remove workers
    REMOVE_COUNT=${SCALE_ARG:1}
    NEW_COUNT=$((CURRENT_COUNT - REMOVE_COUNT))
    if [ $NEW_COUNT -lt 1 ]; then
        echo "Error: Cannot scale below 1 worker"
        exit 1
    fi
else
    # Absolute count
    NEW_COUNT=$SCALE_ARG
fi

echo "========================================"
echo "  Worker Scaling"
echo "========================================"
echo ""
echo "Current workers: $CURRENT_COUNT"
echo "Target workers:  $NEW_COUNT"
echo ""

if [ "$NEW_COUNT" -eq "$CURRENT_COUNT" ]; then
    echo "No change needed."
    exit 0
fi

# Scale workers
echo "Scaling workers..."
docker-compose up -d --scale worker=$NEW_COUNT --no-recreate

# Wait for new workers to register
if [ "$NEW_COUNT" -gt "$CURRENT_COUNT" ]; then
    echo ""
    echo "Waiting for new workers to register..."
    sleep 5
fi

# Notify coordinator of scale change
echo ""
echo "Notifying coordinator of worker changes..."
curl -sf -X POST "http://localhost:3001/api/workers/rebalance" \
    -H "Content-Type: application/json" \
    -d '{"reason": "manual_scale"}' 2>/dev/null || true

# Show updated status
echo ""
echo "========================================"
echo "  Updated Status"
echo "========================================"
docker-compose ps worker

# Show registered workers
echo ""
echo "Registered workers:"
curl -sf "http://localhost:3001/api/workers" 2>/dev/null | jq -r '.workers[] | "  - \(.id): \(.status)"' || echo "  (Unable to fetch worker list)"

echo ""
echo "Scaling complete!"
