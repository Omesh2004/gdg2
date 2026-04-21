#!/bin/bash

# Master Test Runner
# Runs all tests for the entire project

set -e

echo "🚀 Starting Comprehensive Test Suite..."
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
BACKEND_PASSED=true
FRONTEND_PASSED=true

# Parse arguments
COVERAGE=false
VERBOSE=false

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
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Function to run tests
run_test() {
    local test_name=$1
    local test_cmd=$2
    
    echo -e "${YELLOW}▶ Running $test_name...${NC}"
    
    if eval "$test_cmd"; then
        echo -e "${GREEN}✓ $test_name passed${NC}"
    else
        echo -e "${RED}✗ $test_name failed${NC}"
        return 1
    fi
}

# Run backend tests
echo -e "${YELLOW}📦 Backend Tests${NC}"
echo "-------------------"

BACKEND_CMD="bash scripts/test-backend.sh"
if [ "$COVERAGE" = true ]; then
    BACKEND_CMD="$BACKEND_CMD --coverage"
fi
if [ "$VERBOSE" = true ]; then
    BACKEND_CMD="$BACKEND_CMD -v"
fi

if ! run_test "Backend Tests" "$BACKEND_CMD"; then
    BACKEND_PASSED=false
fi
echo ""

# Run frontend tests
echo -e "${YELLOW}🎨 Frontend Tests${NC}"
echo "-------------------"

FRONTEND_CMD="bash scripts/test-frontend.sh"
if [ "$COVERAGE" = true ]; then
    FRONTEND_CMD="$FRONTEND_CMD --coverage"
fi

if ! run_test "Frontend Tests" "$FRONTEND_CMD"; then
    FRONTEND_PASSED=false
fi
echo ""

# Summary
echo "========================================"
echo -e "${YELLOW}📊 Test Summary${NC}"
echo "========================================"

if [ "$BACKEND_PASSED" = true ]; then
    echo -e "${GREEN}✓ Backend Tests: PASSED${NC}"
else
    echo -e "${RED}✗ Backend Tests: FAILED${NC}"
fi

if [ "$FRONTEND_PASSED" = true ]; then
    echo -e "${GREEN}✓ Frontend Tests: PASSED${NC}"
else
    echo -e "${RED}✗ Frontend Tests: FAILED${NC}"
fi

echo ""

if [ "$BACKEND_PASSED" = true ] && [ "$FRONTEND_PASSED" = true ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    
    if [ "$COVERAGE" = true ]; then
        echo ""
        echo -e "${YELLOW}📊 Coverage Reports:${NC}"
        echo "  Backend: backend/htmlcov/index.html"
        echo "  Frontend: frontend/coverage/lcov-report/index.html"
    fi
    
    exit 0
else
    echo -e "${RED}❌ Some tests failed!${NC}"
    exit 1
fi
