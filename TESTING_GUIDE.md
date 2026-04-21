# Production-Grade Testing Documentation

## Overview

This document provides complete testing setup and guidelines for the Smart Building Safety Platform, covering backend (Python/FastAPI) and frontend (React/Next.js) testing.

---

## Backend Testing

### Setup

#### 1. Install Test Dependencies
```bash
cd backend
pip install pytest pytest-cov pytest-asyncio pytest-mock httpx
```

#### 2. Backend Test Structure
```
backend/
├── tests/
│   ├── __init__.py
│   ├── test_rbac.py              # RBAC unit tests
│   ├── test_endpoints.py         # Endpoint integration tests
│   ├── test_security.py          # Security & validation tests
│   ├── test_performance.py       # Load & performance tests
│   └── conftest.py               # Shared fixtures
├── app/
│   ├── core/rbac.py
│   ├── core/rbac_middleware.py
│   ├── api/v1/routers/
│   └── services/
└── pytest.ini
```

### Backend Test Categories

#### A. RBAC Unit Tests (`test_rbac.py`)

**Coverage:**
- Role hierarchy validation
- Admin privilege bypass
- Permission assignment by role
- Permission checking functions
- Role comparison logic

**Running Tests:**
```bash
# Run all RBAC tests
pytest backend/tests/test_rbac.py -v

# Run specific test class
pytest backend/tests/test_rbac.py::TestRoleHierarchy -v

# Run with coverage
pytest backend/tests/test_rbac.py --cov=app.core.rbac --cov-report=html
```

**Example Test:**
```python
def test_admin_has_all_permissions(self):
    """Admin should have all permissions"""
    for permission in Permission:
        assert has_permission(Role.ADMIN, permission)
```

**Test Classes:**
1. `TestRoleHierarchy` - Role ordering and comparison
2. `TestAdminBypass` - Admin privilege escalation
3. `TestSecurityPermissions` - Security role limits
4. `TestStaffPermissions` - Staff role limits
5. `TestMaintenancePermissions` - Maintenance role limits
6. `TestGuestPermissions` - Guest role limits
7. `TestPermissionChecks` - Permission utility functions
8. `TestPermissionEnum` - Permission enum validation
9. `TestEdgeCases` - Boundary conditions
10. `TestRoleComparison` - Role ordering logic

**Coverage Goal:** 100% for RBAC core logic

---

#### B. Endpoint Integration Tests (`test_endpoints.py`)

**Coverage:**
- RBAC enforcement on actual endpoints
- Request/response validation
- Error handling
- Authorization levels
- Audit logging

**Running Tests:**
```bash
# Run endpoint tests with fixtures
pytest backend/tests/test_endpoints.py -v

# Run specific endpoint test
pytest backend/tests/test_endpoints.py::TestAnomaliesEndpoints::test_receive_anomaly_requires_permission -v

# Run with live server
pytest backend/tests/test_endpoints.py -v --setup-show
```

**Test Classes:**
1. `TestAnomaliesEndpoints` - Anomaly operations
2. `TestSMSEndpoints` - SMS operations
3. `TestPositioningEndpoints` - Location operations
4. `TestRoutingEndpoints` - Route operations
5. `TestAuthEndpoints` - Authentication
6. `TestErrorHandling` - Error responses
7. `TestRBACAuditLogging` - Access logging
8. `TestConcurrentRequests` - Concurrency handling
9. `TestInputValidation` - Input validation
10. `TestResponseFormats` - Response structure
11. `TestRateLimit` - Rate limiting

**Key Test Scenarios:**
```python
def test_send_sms_requires_admin_or_security():
    # Staff cannot send
    # Guest cannot send
    # Security can send
    # Admin can send
    pass
```

---

### Backend Pytest Configuration

**File: `backend/pytest.ini`**
```ini
[pytest]
pythonpath = .
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = -v --strict-markers --tb=short
asyncio_mode = auto

markers =
    unit: Unit tests
    integration: Integration tests
    security: Security tests
    performance: Performance tests
```

### Backend Test Fixtures

**File: `backend/tests/conftest.py`**
```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    """FastAPI test client"""
    return TestClient(app)

@pytest.fixture
def auth_profiles():
    """Sample profiles for all roles"""
    return {
        "admin": AuthProfile(...),
        "security": AuthProfile(...),
        "staff": AuthProfile(...),
    }

@pytest.fixture
async def mongo_db():
    """MongoDB test client"""
    # Setup test database
    yield db
    # Cleanup
    pass
```

---

## Frontend Testing

### Setup

#### 1. Install Test Dependencies
```bash
cd frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom jest jest-environment-jsdom @types/jest
```

#### 2. Frontend Test Structure
```
frontend/
├── jest.config.js                # Jest configuration
├── jest.setup.js                 # Test setup
├── src/
│   ├── hooks/
│   │   ├── useRBAC.ts
│   │   └── __tests__/
│   │       └── useRBAC.test.ts   # Hook tests
│   ├── lib/
│   │   └── __tests__/
│   │       └── rbac.test.ts      # RBAC utility tests
│   ├── components/
│   │   └── rbac/
│   │       └── __tests__/
│   │           └── ProtectedRoute.test.tsx  # Component tests
│   └── __tests__/
│       └── integration.test.tsx  # Integration tests
└── tests/
    ├── setup.ts
    └── mocks/
```

### Frontend Test Categories

#### A. RBAC Hooks Tests (`src/hooks/__tests__/useRBAC.test.ts`)

**Coverage:**
- `useRole()` - Get current user role
- `useIsAdmin()` - Check admin privilege
- `useHasPermission()` - Check single permission
- `useHasAnyPermission()` - Check any permission
- `useHasAllPermissions()` - Check all permissions
- `useHasRoleHierarchy()` - Check hierarchy
- `useRBACChecks()` - Memoized checks

**Running Tests:**
```bash
# Run all hook tests
npm test src/hooks/__tests__/useRBAC.test.ts

# Run in watch mode
npm run test:watch src/hooks/__tests__/useRBAC.test.ts

# Run with coverage
npm run test:coverage src/hooks/__tests__/useRBAC.test.ts
```

**Test Suites:**
1. `useRole` - Role retrieval
2. `useIsAdmin` - Admin detection
3. `useHasPermission` - Single permission checks
4. `useHasAnyPermission` - Multiple permission (OR) logic
5. `useHasAllPermissions` - Multiple permission (AND) logic
6. `useHasRoleHierarchy` - Hierarchy checking
7. `useHasRole` - Exact role matching
8. `useHasAnyRole` - Any role matching
9. `useAuth` - Full auth state
10. `useIsAuthenticated` - Authentication status
11. `useProfile` - User profile retrieval
12. `useRBACChecks` - Memoized optimization
13. `RBAC Hooks Performance` - Performance benchmarks
14. `RBAC Edge Cases` - Boundary conditions

**Example Test:**
```typescript
describe("useHasPermission", () => {
  it("admin should have all permissions", () => {
    const profile = createMockProfile(Role.ADMIN);
    const { result } = renderRBACHook(
      () => useHasPermission(Permission.ANOMALY_DELETE),
      { preloadedState: { auth: { status: "authenticated", profile } } }
    );
    expect(result.current).toBe(true);
  });
});
```

**Coverage Goal:** 100% for all hooks

---

#### B. RBAC Utility Tests (`src/lib/__tests__/rbac.test.ts`)

**Coverage:**
- Role enum validation
- Permission enum validation
- Role-permission mapping
- Utility function behavior
- Type safety

---

#### C. Component Tests (`src/components/rbac/__tests__/ProtectedRoute.test.tsx`)

**Coverage:**
- `<ProtectedRoute>` authorization
- `<PermissionGate>` conditional rendering
- `<RoleGate>` role-based rendering
- `<AdminOnly>` shortcut
- `<SecurityOnly>` shortcut
- Error fallback rendering

**Example Test:**
```typescript
describe("<ProtectedRoute>", () => {
  it("should redirect unauthenticated users", () => {
    render(
      <ProtectedRoute requiredRole={Role.ADMIN}>
        <div>Admin Content</div>
      </ProtectedRoute>
    );
    expect(router.push).toHaveBeenCalledWith("/login");
  });

  it("should show forbidden for unauthorized users", () => {
    const profile = createMockProfile(Role.STAFF);
    render(
      <ProtectedRoute requiredRole={Role.ADMIN}>
        <div>Admin Content</div>
      </ProtectedRoute>
    );
    expect(screen.getByText(/Access Denied/i)).toBeInTheDocument();
  });
});
```

---

### Frontend Test Configuration

**File: `frontend/jest.config.js`**
```javascript
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
  ],
};

module.exports = createJestConfig(customJestConfig);
```

**File: `frontend/jest.setup.js`**
```javascript
import "@testing-library/jest-dom";

jest.mock("next/navigation", () => ({
  useRouter() {
    return { push: jest.fn(), replace: jest.fn() };
  },
}));
```

---

### Frontend Test Helpers

**File: `frontend/src/hooks/__tests__/helpers.ts`**
```typescript
import { renderHook, RenderHookOptions } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/store/slices/authSlice";
import { Role } from "@/lib/rbac";
import type { AuthProfile } from "@/lib/auth";

export const createMockProfile = (
  role: Role,
  overrides?: Partial<AuthProfile>
): AuthProfile => ({
  id: "user-1",
  email: "test@example.com",
  fullName: "Test User",
  role,
  avatarUrl: null,
  ...overrides,
});

export const renderRBACHook = <T,>(
  hook: () => T,
  options?: RenderHookOptions
) => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: options?.initialProps,
  });

  return renderHook(hook, {
    wrapper: ({ children }) => (
      <Provider store={store}>{children}</Provider>
    ),
  });
};
```

---

## Running Tests

### Backend Tests

```bash
# Run all tests
pytest backend/tests/ -v

# Run specific category
pytest backend/tests/test_rbac.py -v --tb=short

# Run with coverage report
pytest backend/tests/ --cov=app.core --cov-report=html

# Run in watch mode (requires pytest-watch)
ptw backend/tests/ -c

# Run only unit tests
pytest backend/tests/ -m unit -v

# Run only integration tests
pytest backend/tests/ -m integration -v
```

### Frontend Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- useRBAC.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="admin should have"

# Update snapshots
npm test -- --updateSnapshot
```

### Combined Testing

```bash
# Run all tests (backend + frontend)
./scripts/test-all.sh

# Run only RBAC tests
./scripts/test-rbac.sh

# Generate all coverage reports
./scripts/test-coverage.sh
```

---

## Test Naming Conventions

### Backend
```
test_<functionality>.py                # Test file
Test<Feature>                          # Test class
test_<specific_scenario>               # Test method
test_<action>_<subject>_<expectation> # Descriptive name
```

Example:
```python
# File: test_rbac.py
class TestRoleHierarchy:
    def test_admin_has_hierarchy_over_all(self):
        """Admin should have highest privilege"""
        assert Role.ADMIN.has_hierarchy_over(Role.SECURITY)
```

### Frontend
```
<Component>.test.tsx                   # Test file
describe("<Component>")                # Test suite
it("should <action> when <condition>") # Test case
```

Example:
```typescript
// File: ProtectedRoute.test.tsx
describe("<ProtectedRoute>", () => {
  it("should redirect unauthenticated users to login", () => {
    // Test implementation
  });
});
```

---

## Coverage Goals

### Backend
- **RBAC Core:** 100%
- **Endpoints:** 90%+
- **Services:** 85%+
- **Overall:** 80%+

### Frontend
- **RBAC Hooks:** 100%
- **Components:** 85%+
- **Utilities:** 95%+
- **Overall:** 85%+

---

## CI/CD Integration

### GitHub Actions (Example)

**File: `.github/workflows/test.yml`**
```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: 3.11
      - run: pip install -r backend/requirements.txt pytest pytest-cov
      - run: pytest backend/tests/ --cov=app.core --cov-report=xml

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: 20
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v2
```

---

## Debugging Tests

### Backend

```bash
# Run with detailed output
pytest -vv --tb=long backend/tests/test_rbac.py

# Stop on first failure
pytest -x backend/tests/

# Show print statements
pytest -s backend/tests/

# Debug with pdb
pytest --pdb backend/tests/test_rbac.py

# Profile test execution
pytest --durations=10 backend/tests/
```

### Frontend

```bash
# Run with detailed output
npm test -- --verbose

# Debug in Chrome
node --inspect-brk node_modules/.bin/jest --runInBand

# Show full error messages
npm test -- --no-coverage --verbose

# Watch specific file
npm test -- --watch useRBAC
```

---

## Test Maintenance

### Best Practices

1. **Keep tests independent** - No shared state between tests
2. **Use descriptive names** - Test names should describe expected behavior
3. **One assertion per test** - Or group related assertions
4. **Mock external dependencies** - Don't call real APIs/databases
5. **Test happy path and error cases** - Both success and failure scenarios
6. **Use fixtures for reusable setup** - DRY principle
7. **Update tests with code** - Tests are documentation
8. **Keep tests fast** - Aim for <100ms per test

### Updating Tests

When adding new features:
1. Write test first (TDD approach)
2. Implement feature to pass test
3. Refactor while tests pass
4. Update test documentation

When fixing bugs:
1. Write test that reproduces bug
2. Fix the bug
3. Verify test now passes
4. Keep test to prevent regression

---

## Production Checklist

- ✅ All RBAC tests passing (100% coverage)
- ✅ Endpoint integration tests passing (90%+ coverage)
- ✅ Frontend hook tests passing (100% coverage)
- ✅ Component tests passing (85%+ coverage)
- ✅ No console errors/warnings in tests
- ✅ Coverage reports generated
- ✅ CI/CD pipeline configured
- ✅ Security tests passing
- ✅ Performance benchmarks documented
- ✅ Test documentation complete

---

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [Testing Library Docs](https://testing-library.com/)
- [Jest Documentation](https://jestjs.io/)
- [FastAPI Testing Guide](https://fastapi.tiangolo.com/advanced/testing/)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

