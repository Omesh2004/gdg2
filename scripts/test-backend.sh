#!/bin/bash

# Backend Test Runner
# Usage: ./scripts/test-backend.sh [options]

set -e

echo "🧪 Running Backend Tests..."
echo "================================"

cd backend

# Check if pytest is installed
if ! command -v pytest &> /dev/null; then
    echo "❌ pytest not found. Installing test dependencies..."
    pip install -r requirements.txt pytest pytest-cov pytest-asyncio pytest-mock
fi

# Parse arguments
COVERAGE=false
VERBOSE=false
SPECIFIC_FILE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --coverage)
            COVERAGE=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --file)
            SPECIFIC_FILE=$2
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Build pytest command
PYTEST_CMD="pytest tests/"

if [ ! -z "$SPECIFIC_FILE" ]; then
    PYTEST_CMD="pytest tests/$SPECIFIC_FILE"
fi

if [ "$VERBOSE" = true ]; then
    PYTEST_CMD="$PYTEST_CMD -vv"
else
    PYTEST_CMD="$PYTEST_CMD -v"
fi

if [ "$COVERAGE" = true ]; then
    PYTEST_CMD="$PYTEST_CMD --cov=app.core --cov=app.api --cov-report=html --cov-report=term"
fi

echo "Running: $PYTEST_CMD"
$PYTEST_CMD

if [ "$COVERAGE" = true ]; then
    echo ""
    echo "✅ Coverage report generated in htmlcov/index.html"
fi

echo ""
echo "✅ Backend tests completed!"
