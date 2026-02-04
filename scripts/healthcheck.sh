#!/bin/bash
# Health check script for RouteTracker application
# Usage: ./scripts/healthcheck.sh [URL]

set -e

URL="${1:-http://localhost:8080}"
TIMEOUT=10
MAX_RETRIES=3

echo "🏥 Running health check for RouteTracker at $URL"
echo "================================================"

# Function to check HTTP response
check_http() {
    local endpoint=$1
    local expected_status=$2
    local description=$3
    
    echo -n "Checking $description... "
    
    for i in $(seq 1 $MAX_RETRIES); do
        status=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$URL$endpoint" || echo "000")
        
        if [ "$status" = "$expected_status" ]; then
            echo "✅ OK (HTTP $status)"
            return 0
        fi
        
        if [ $i -lt $MAX_RETRIES ]; then
            echo -n "Retry $i/$MAX_RETRIES... "
            sleep 2
        fi
    done
    
    echo "❌ FAILED (HTTP $status, expected $expected_status)"
    return 1
}

# Function to check if page contains expected content
check_content() {
    local endpoint=$1
    local expected_text=$2
    local description=$3
    
    echo -n "Checking $description... "
    
    content=$(curl -s --max-time $TIMEOUT "$URL$endpoint" || echo "")
    
    if echo "$content" | grep -q "$expected_text"; then
        echo "✅ OK (found expected content)"
        return 0
    else
        echo "❌ FAILED (expected content not found)"
        return 1
    fi
}

# Track failures
FAILURES=0

# Check 1: Main page loads
check_http "/" "200" "Main page" || ((FAILURES++))

# Check 2: Static assets (index.html should contain app)
check_content "/" "RouteTracker\|Vite\|React" "Page content" || ((FAILURES++))

# Check 3: Check if app mounts (look for root div)
check_content "/" "id=\"root\"" "App mount point" || ((FAILURES++))

# Summary
echo ""
echo "================================================"
if [ $FAILURES -eq 0 ]; then
    echo "✅ All health checks passed!"
    exit 0
else
    echo "❌ $FAILURES health check(s) failed"
    exit 1
fi
