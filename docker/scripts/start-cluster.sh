#!/bin/bash
#
# Vero Test Cluster - Start Script
#
# Usage:
#   ./start-cluster.sh              # Start with default 2 workers
#   ./start-cluster.sh 4            # Start with 4 workers
#   ./start-cluster.sh 4 --vnc      # Start with 4 workers and VNC access
#
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$(dirname "$SCRIPT_DIR")"

# Default values
WORKER_COUNT=${1:-2}
VNC_MODE=${2:-""}

cd "$DOCKER_DIR"

echo "========================================"
echo "  Vero Test Automation Cluster"
echo "========================================"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed or not in PATH"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "Error: Docker daemon is not running"
    exit 1
fi

# Clean up any existing containers
echo "Cleaning up existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true

if [ "$VNC_MODE" = "--vnc" ] || [ "$VNC_MODE" = "-v" ]; then
    echo ""
    echo "Starting cluster with VNC-enabled shards..."
    echo "Worker count: $WORKER_COUNT (max 4 with VNC)"
    echo ""

    # Use shard overlay for VNC support
    docker-compose -f docker-compose.yml -f docker-compose.shard.yml up -d --build

    echo ""
    echo "VNC Access Points:"
    echo "  - Shard 1: http://localhost:6081/vnc.html"
    echo "  - Shard 2: http://localhost:6082/vnc.html"
    echo "  - Shard 3: http://localhost:6083/vnc.html"
    echo "  - Shard 4: http://localhost:6084/vnc.html"
else
    echo ""
    echo "Starting cluster with $WORKER_COUNT workers..."
    echo ""

    # Use base compose with scaling
    docker-compose up -d --build --scale worker=$WORKER_COUNT
fi

# Wait for coordinator to be healthy
echo ""
echo "Waiting for coordinator to be ready..."
for i in {1..30}; do
    if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
        echo "Coordinator is ready!"
        break
    fi
    echo -n "."
    sleep 2
done

# Show status
echo ""
echo "========================================"
echo "  Cluster Status"
echo "========================================"
docker-compose ps

echo ""
echo "API Endpoints:"
echo "  - Coordinator: http://localhost:3001"
echo "  - Health Check: http://localhost:3001/health"
echo "  - Workers: http://localhost:3001/api/workers"
echo ""
echo "Logs:"
echo "  docker-compose logs -f coordinator"
echo "  docker-compose logs -f worker"
echo ""
echo "Scale workers:"
echo "  docker-compose up -d --scale worker=N"
echo ""
