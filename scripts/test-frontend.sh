#!/bin/bash

# Frontend Test Runner
# Usage: ./scripts/test-frontend.sh [options]

set -e

echo "🧪 Running Frontend Tests..."
echo "================================"

cd frontend

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
fi

# Parse arguments
COVERAGE=false
VERBOSE=false
WATCH=false
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
        --watch)
            WATCH=true
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

# Build test command
if [ "$WATCH" = true ]; then
    npm run test:watch
elif [ "$COVERAGE" = true ]; then
    npm run test:coverage
else
    if [ ! -z "$SPECIFIC_FILE" ]; then
        npm test -- "$SPECIFIC_FILE"
    else
        npm test
    fi
fi

echo ""
echo "✅ Frontend tests completed!"

if [ "$COVERAGE" = true ]; then
    echo ""
    echo "📊 Coverage report generated in coverage/"
fi
