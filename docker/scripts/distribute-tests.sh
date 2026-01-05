#!/bin/bash
#
# Vero Test Cluster - Test Distribution Script
#
# Usage:
#   ./distribute-tests.sh <test-pattern>
#   ./distribute-tests.sh "tests/**/*.spec.ts"
#   ./distribute-tests.sh "tests/**/*.spec.ts" --strategy duration
#
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$(dirname "$SCRIPT_DIR")"

cd "$DOCKER_DIR"

TEST_PATTERN=${1:-"tests/**/*.spec.ts"}
STRATEGY=${3:-"round-robin"}

if [ "$2" = "--strategy" ]; then
    STRATEGY=$3
fi

echo "========================================"
echo "  Test Distribution"
echo "========================================"
echo ""
echo "Pattern: $TEST_PATTERN"
echo "Strategy: $STRATEGY"
echo ""

# Check coordinator is running
if ! curl -sf http://localhost:3001/health > /dev/null 2>&1; then
    echo "Error: Coordinator is not running"
    echo "Start the cluster first: ./start-cluster.sh"
    exit 1
fi

# Get available workers
echo "Fetching available workers..."
WORKERS=$(curl -sf "http://localhost:3001/api/workers" | jq -r '.workers | length')

if [ "$WORKERS" = "0" ] || [ -z "$WORKERS" ]; then
    echo "Error: No workers available"
    exit 1
fi

echo "Available workers: $WORKERS"
echo ""

# Start parallel execution
echo "Starting test distribution..."
RESPONSE=$(curl -sf -X POST "http://localhost:3001/api/execution/parallel" \
    -H "Content-Type: application/json" \
    -d "{
        \"testPattern\": \"$TEST_PATTERN\",
        \"config\": {
            \"mode\": \"docker\",
            \"sharding\": {
                \"strategy\": \"$STRATEGY\",
                \"rebalance\": true,
                \"retryOnWorkerFailure\": true
            },
            \"artifacts\": {
                \"collectTraces\": true,
                \"collectVideos\": false,
                \"collectScreenshots\": true,
                \"storageType\": \"local\"
            }
        }
    }")

SESSION_ID=$(echo "$RESPONSE" | jq -r '.sessionId')

if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" = "null" ]; then
    echo "Error: Failed to start execution"
    echo "$RESPONSE"
    exit 1
fi

echo ""
echo "Execution started!"
echo "Session ID: $SESSION_ID"
echo ""

# Monitor progress
echo "Monitoring progress..."
echo ""

while true; do
    STATUS=$(curl -sf "http://localhost:3001/api/execution/parallel/$SESSION_ID/status" 2>/dev/null)

    if [ -z "$STATUS" ]; then
        echo "Error: Failed to fetch status"
        break
    fi

    STATE=$(echo "$STATUS" | jq -r '.status')
    PROGRESS=$(echo "$STATUS" | jq -r '.progress')

    # Clear line and print progress
    echo -ne "\r\033[K"

    PASSED=$(echo "$PROGRESS" | jq -r '.passed // 0')
    FAILED=$(echo "$PROGRESS" | jq -r '.failed // 0')
    TOTAL=$(echo "$PROGRESS" | jq -r '.total // 0')

    echo -ne "Progress: $PASSED passed, $FAILED failed ($(( PASSED + FAILED ))/$TOTAL)"

    if [ "$STATE" = "completed" ]; then
        echo ""
        break
    fi

    sleep 2
done

# Show final results
echo ""
echo "========================================"
echo "  Execution Results"
echo "========================================"

RESULTS=$(curl -sf "http://localhost:3001/api/execution/parallel/$SESSION_ID/status")
echo "$RESULTS" | jq '{
    status: .status,
    duration: .duration,
    summary: {
        total: .progress.total,
        passed: .progress.passed,
        failed: .progress.failed,
        skipped: .progress.skipped
    },
    workers: [.shards[].workerId] | unique
}'

# Check if there were failures
FAILED=$(echo "$RESULTS" | jq -r '.progress.failed // 0')
if [ "$FAILED" -gt 0 ]; then
    echo ""
    echo "Failed tests:"
    echo "$RESULTS" | jq -r '.shards[].results[]? | select(.status == "failed") | "  - \(.testId): \(.error)"'
fi

echo ""
echo "View detailed report at: http://localhost:3001/api/execution/parallel/$SESSION_ID/report"
