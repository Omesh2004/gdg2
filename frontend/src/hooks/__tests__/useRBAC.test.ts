/**
 * Production-Grade Unit Tests for Frontend RBAC Hooks
 * Tests role-based access control on React layer
 */

import { renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore, PreloadedState } from "@reduxjs/toolkit";
import { ReactNode } from "react";

import {
  useRole,
  useIsAdmin,
  useHasPermission,
  useHasAnyPermission,
  useHasAllPermissions,
  useHasRoleHierarchy,
  useHasRole,
  useHasAnyRole,
  useAuth,
  useIsAuthenticated,
  useProfile,
  useRBACChecks,
} from "@/hooks/useRBAC";

import authReducer from "@/store/slices/authSlice";
import systemReducer from "@/store/slices/systemSlice";
import { Role, Permission } from "@/lib/rbac";
import type { AuthProfile } from "@/lib/auth";
import type { RootState } from "@/store/store";

// ============================================================================
// TEST SETUP
// ============================================================================

interface StoreConfig {
  preloadedState?: PreloadedState<RootState>;
}

const createMockStore = (config?: StoreConfig) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      system: systemReducer,
    },
    preloadedState: config?.preloadedState,
  });
};

const createMockProfile = (
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

interface RenderHookOptions {
  preloadedState?: PreloadedState<any>;
}

const renderRBACHook = <T,>(
  hook: () => T,
  options?: RenderHookOptions
) => {
  const store = createMockStore({
    preloadedState: options?.preloadedState,
  });

  return renderHook(hook, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    ),
  });
};

// ============================================================================
// TESTS FOR useRole
// ============================================================================

describe("useRole", () => {
  it("should return user role when authenticated", () => {
    const profile = createMockProfile(Role.ADMIN);
    const { result } = renderRBACHook(() => useRole(), {
      preloadedState: {
        auth: {
          status: "authenticated",
          profile,
        },
      },
    });

    expect(result.current).toBe(Role.ADMIN);
  });

  it("should return null when unauthenticated", () => {
    const { result } = renderRBACHook(() => useRole(), {
      preloadedState: {
        auth: {
          status: "unauthenticated",
          profile: null,
        },
      },
    });

    expect(result.current).toBeNull();
  });

  it("should return different roles correctly", () => {
    const roles = [
      Role.ADMIN,
      Role.SECURITY,
      Role.STAFF,
      Role.MAINTENANCE,
      Role.GUEST,
    ];

    for (const role of roles) {
      const profile = createMockProfile(role);
      const { result } = renderRBACHook(() => useRole(), {
        preloadedState: {
          auth: {
            status: "authenticated",
            profile,
          },
        },
      });

      expect(result.current).toBe(role);
    }
  });
});

// ============================================================================
// TESTS FOR useIsAdmin
// ============================================================================

describe("useIsAdmin", () => {
  it("should return true for admin role", () => {
    const profile = createMockProfile(Role.ADMIN);
    const { result } = renderRBACHook(() => useIsAdmin(), {
      preloadedState: {
        auth: { status: "authenticated", profile },
      },
    });

    expect(result.current).toBe(true);
  });

  it("should return false for non-admin roles", () => {
    const nonAdminRoles = [
      Role.SECURITY,
      Role.STAFF,
      Role.MAINTENANCE,
      Role.GUEST,
    ];

    for (const role of nonAdminRoles) {
      const profile = createMockProfile(role);
      const { result } = renderRBACHook(() => useIsAdmin(), {
        preloadedState: {
          auth: { status: "authenticated", profile },
        },
      });

      expect(result.current).toBe(false);
    }
  });

  it("should return false when unauthenticated", () => {
    const { result } = renderRBACHook(() => useIsAdmin(), {
      preloadedState: {
        auth: { status: "unauthenticated", profile: null },
      },
    });

    expect(result.current).toBe(false);
  });
});

// ============================================================================
// TESTS FOR useHasPermission
// ============================================================================

describe("useHasPermission", () => {
  it("admin should have all permissions", () => {
    const profile = createMockProfile(Role.ADMIN);

    const permissions = [
      Permission.ANOMALY_VIEW,
      Permission.ANOMALY_DELETE,
      Permission.SMS_BROADCAST,
      Permission.SYSTEM_CONFIG,
    ];

    for (const permission of permissions) {
      const { result } = renderRBACHook(
        () => useHasPermission(permission),
        {
          preloadedState: {
            auth: { status: "authenticated", profile },
          },
        }
      );

      expect(result.current).toBe(true);
    }
  });

  it("security should have specific permissions", () => {
    const profile = createMockProfile(Role.SECURITY);

    const hasPermissions = [
      Permission.ANOMALY_VIEW,
      Permission.ANOMALY_RESOLVE,
      Permission.SMS_BROADCAST,
    ];

    for (const permission of hasPermissions) {
      const { result } = renderRBACHook(
        () => useHasPermission(permission),
        {
          preloadedState: {
            auth: { status: "authenticated", profile },
          },
        }
      );

      expect(result.current).toBe(true);
    }
  });

  it("security should not have admin-only permissions", () => {
    const profile = createMockProfile(Role.SECURITY);

    const deniedPermissions = [
      Permission.ANOMALY_DELETE,
      Permission.SYSTEM_CONFIG,
      Permission.USER_DELETE,
    ];

    for (const permission of deniedPermissions) {
      const { result } = renderRBACHook(
        () => useHasPermission(permission),
        {
          preloadedState: {
            auth: { status: "authenticated", profile },
          },
        }
      );

      expect(result.current).toBe(false);
    }
  });

  it("staff should have limited permissions", () => {
    const profile = createMockProfile(Role.STAFF);

    expect(
      renderRBACHook(() => useHasPermission(Permission.ANOMALY_VIEW), {
        preloadedState: { auth: { status: "authenticated", profile } },
      }).result.current
    ).toBe(true);

    expect(
      renderRBACHook(() => useHasPermission(Permission.SMS_BROADCAST), {
        preloadedState: { auth: { status: "authenticated", profile } },
      }).result.current
    ).toBe(false);
  });

  it("guest should have minimal permissions", () => {
    const profile = createMockProfile(Role.GUEST);

    expect(
      renderRBACHook(() => useHasPermission(Permission.BUILDING_VIEW), {
        preloadedState: { auth: { status: "authenticated", profile } },
      }).result.current
    ).toBe(true);

    expect(
      renderRBACHook(() => useHasPermission(Permission.ANOMALY_VIEW), {
        preloadedState: { auth: { status: "authenticated", profile } },
      }).result.current
    ).toBe(false);
  });

  it("should return false when unauthenticated", () => {
    const { result } = renderRBACHook(
      () => useHasPermission(Permission.ANOMALY_VIEW),
      {
        preloadedState: {
          auth: { status: "unauthenticated", profile: null },
        },
      }
    );

    expect(result.current).toBe(false);
  });
});

// ============================================================================
// TESTS FOR useHasAnyPermission
// ============================================================================

describe("useHasAnyPermission", () => {
  it("should return true if user has any permission", () => {
    const profile = createMockProfile(Role.STAFF);
    const permissions = [
      Permission.ANOMALY_DELETE, // Staff doesn't have
      Permission.ANOMALY_VIEW, // Staff has
    ];

    const { result } = renderRBACHook(
      () => useHasAnyPermission(permissions),
      {
        preloadedState: {
          auth: { status: "authenticated", profile },
        },
      }
    );

    expect(result.current).toBe(true);
  });

  it("should return false if user has no permissions", () => {
    const profile = createMockProfile(Role.GUEST);
    const permissions = [
      Permission.ANOMALY_VIEW,
      Permission.ANOMALY_REPORT,
      Permission.SMS_BROADCAST,
    ];

    const { result } = renderRBACHook(
      () => useHasAnyPermission(permissions),
      {
        preloadedState: {
          auth: { status: "authenticated", profile },
        },
      }
    );

    expect(result.current).toBe(false);
  });

  it("admin should have any of multiple permissions", () => {
    const profile = createMockProfile(Role.ADMIN);
    const permissions = [
      Permission.ANOMALY_DELETE,
      Permission.SYSTEM_CONFIG,
    ];

    const { result } = renderRBACHook(
      () => useHasAnyPermission(permissions),
      {
        preloadedState: {
          auth: { status: "authenticated", profile },
        },
      }
    );

    expect(result.current).toBe(true);
  });
});

// ============================================================================
// TESTS FOR useHasAllPermissions
// ============================================================================

describe("useHasAllPermissions", () => {
  it("admin should have all permissions", () => {
    const profile = createMockProfile(Role.ADMIN);
    const permissions = [
      Permission.ANOMALY_DELETE,
      Permission.SYSTEM_CONFIG,
      Permission.SMS_BROADCAST,
    ];

    const { result } = renderRBACHook(
      () => useHasAllPermissions(permissions),
      {
        preloadedState: {
          auth: { status: "authenticated", profile },
        },
      }
    );

    expect(result.current).toBe(true);
  });

  it("security should have ANOMALY permissions but not SYSTEM", () => {
    const profile = createMockProfile(Role.SECURITY);
    const permissions = [
      Permission.ANOMALY_VIEW,
      Permission.ANOMALY_RESOLVE,
      Permission.SYSTEM_CONFIG,
    ];

    const { result } = renderRBACHook(
      () => useHasAllPermissions(permissions),
      {
        preloadedState: {
          auth: { status: "authenticated", profile },
        },
      }
    );

    expect(result.current).toBe(false);
  });

  it("should return true for subset of user permissions", () => {
    const profile = createMockProfile(Role.SECURITY);
    const permissions = [
      Permission.ANOMALY_VIEW,
      Permission.ANOMALY_RESOLVE,
    ];

    const { result } = renderRBACHook(
      () => useHasAllPermissions(permissions),
      {
        preloadedState: {
          auth: { status: "authenticated", profile },
        },
      }
    );

    expect(result.current).toBe(true);
  });
});

// ============================================================================
// TESTS FOR useHasRoleHierarchy
// ============================================================================

describe("useHasRoleHierarchy", () => {
  it("admin should meet all hierarchy requirements", () => {
    const profile = createMockProfile(Role.ADMIN);

    const roles = [
      Role.ADMIN,
      Role.SECURITY,
      Role.STAFF,
      Role.MAINTENANCE,
      Role.GUEST,
    ];

    for (const role of roles) {
      const { result } = renderRBACHook(
        () => useHasRoleHierarchy(role),
        {
          preloadedState: {
            auth: { status: "authenticated", profile },
          },
        }
      );

      expect(result.current).toBe(true);
    }
  });

  it("security should meet security+ requirements", () => {
    const profile = createMockProfile(Role.SECURITY);

    expect(
      renderRBACHook(() => useHasRoleHierarchy(Role.SECURITY), {
        preloadedState: { auth: { status: "authenticated", profile } },
      }).result.current
    ).toBe(true);

    expect(
      renderRBACHook(() => useHasRoleHierarchy(Role.STAFF), {
        preloadedState: { auth: { status: "authenticated", profile } },
      }).result.current
    ).toBe(true);

    expect(
      renderRBACHook(() => useHasRoleHierarchy(Role.ADMIN), {
        preloadedState: { auth: { status: "authenticated", profile } },
      }).result.current
    ).toBe(false);
  });

  it("staff should not meet security requirement", () => {
    const profile = createMockProfile(Role.STAFF);

    const { result } = renderRBACHook(
      () => useHasRoleHierarchy(Role.SECURITY),
      {
        preloadedState: {
          auth: { status: "authenticated", profile },
        },
      }
    );

    expect(result.current).toBe(false);
  });
});

// ============================================================================
// TESTS FOR useHasRole
// ============================================================================

describe("useHasRole", () => {
  it("should return true for matching role", () => {
    const profile = createMockProfile(Role.ADMIN);

    const { result } = renderRBACHook(() => useHasRole(Role.ADMIN), {
      preloadedState: {
        auth: { status: "authenticated", profile },
      },
    });

    expect(result.current).toBe(true);
  });

  it("should return false for non-matching role", () => {
    const profile = createMockProfile(Role.STAFF);

    const { result } = renderRBACHook(() => useHasRole(Role.ADMIN), {
      preloadedState: {
        auth: { status: "authenticated", profile },
      },
    });

    expect(result.current).toBe(false);
  });
});

// ============================================================================
// TESTS FOR useHasAnyRole
// ============================================================================

describe("useHasAnyRole", () => {
  it("should return true if user has any matching role", () => {
    const profile = createMockProfile(Role.STAFF);
    const roles = [Role.ADMIN, Role.SECURITY, Role.STAFF];

    const { result } = renderRBACHook(() => useHasAnyRole(roles), {
      preloadedState: {
        auth: { status: "authenticated", profile },
      },
    });

    expect(result.current).toBe(true);
  });

  it("should return false if user has no matching roles", () => {
    const profile = createMockProfile(Role.GUEST);
    const roles = [Role.ADMIN, Role.SECURITY];

    const { result } = renderRBACHook(() => useHasAnyRole(roles), {
      preloadedState: {
        auth: { status: "authenticated", profile },
      },
    });

    expect(result.current).toBe(false);
  });
});

// ============================================================================
// TESTS FOR useAuth
// ============================================================================

describe("useAuth", () => {
  it("should return full auth state", () => {
    const profile = createMockProfile(Role.ADMIN);
    const { result } = renderRBACHook(() => useAuth(), {
      preloadedState: {
        auth: {
          status: "authenticated",
          profile,
        },
      },
    });

    expect(result.current.status).toBe("authenticated");
    expect(result.current.profile).toEqual(profile);
  });
});

// ============================================================================
// TESTS FOR useIsAuthenticated
// ============================================================================

describe("useIsAuthenticated", () => {
  it("should return true when authenticated with profile", () => {
    const profile = createMockProfile(Role.STAFF);
    const { result } = renderRBACHook(() => useIsAuthenticated(), {
      preloadedState: {
        auth: { status: "authenticated", profile },
      },
    });

    expect(result.current).toBe(true);
  });

  it("should return false when unauthenticated", () => {
    const { result } = renderRBACHook(() => useIsAuthenticated(), {
      preloadedState: {
        auth: { status: "unauthenticated", profile: null },
      },
    });

    expect(result.current).toBe(false);
  });

  it("should return false when loading", () => {
    const { result } = renderRBACHook(() => useIsAuthenticated(), {
      preloadedState: {
        auth: { status: "loading", profile: null },
      },
    });

    expect(result.current).toBe(false);
  });
});

// ============================================================================
// TESTS FOR useProfile
// ============================================================================

describe("useProfile", () => {
  it("should return user profile when authenticated", () => {
    const profile = createMockProfile(Role.SECURITY);
    const { result } = renderRBACHook(() => useProfile(), {
      preloadedState: {
        auth: { status: "authenticated", profile },
      },
    });

    expect(result.current).toEqual(profile);
  });

  it("should return null when unauthenticated", () => {
    const { result } = renderRBACHook(() => useProfile(), {
      preloadedState: {
        auth: { status: "unauthenticated", profile: null },
      },
    });

    expect(result.current).toBeNull();
  });
});

// ============================================================================
// TESTS FOR useRBACChecks (Memoized)
// ============================================================================

describe("useRBACChecks", () => {
  it("should return all checks memoized", () => {
    const profile = createMockProfile(Role.SECURITY);
    const { result } = renderRBACHook(() => useRBACChecks(), {
      preloadedState: {
        auth: { status: "authenticated", profile },
      },
    });

    expect(result.current.role).toBe(Role.SECURITY);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.hasPermission(Permission.ANOMALY_VIEW)).toBe(true);
    expect(result.current.hasPermission(Permission.ANOMALY_DELETE)).toBe(
      false
    );
  });

  it("admin checks should all be true", () => {
    const profile = createMockProfile(Role.ADMIN);
    const { result } = renderRBACHook(() => useRBACChecks(), {
      preloadedState: {
        auth: { status: "authenticated", profile },
      },
    });

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.hasPermission(Permission.ANOMALY_DELETE)).toBe(true);
    expect(result.current.hasRole(Role.ADMIN)).toBe(true);
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe("RBAC Hooks Performance", () => {
  it("should memoize permission checks", () => {
    const profile = createMockProfile(Role.STAFF);
    const { result, rerender } = renderRBACHook(
      () => useRBACChecks(),
      {
        preloadedState: {
          auth: { status: "authenticated", profile },
        },
      }
    );

    const firstResult = result.current;

    rerender();

    const secondResult = result.current;

    // Should be same object due to memoization
    expect(secondResult).toEqual(firstResult);
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("RBAC Edge Cases", () => {
  it("should handle null profile gracefully", () => {
    const { result } = renderRBACHook(() => useRole(), {
      preloadedState: {
        auth: { status: "unauthenticated", profile: null },
      },
    });

    expect(result.current).toBeNull();
  });

  it("should handle empty permission array", () => {
    const profile = createMockProfile(Role.ADMIN);
    const { result } = renderRBACHook(
      () => useHasAnyPermission([]),
      {
        preloadedState: {
          auth: { status: "authenticated", profile },
        },
      }
    );

    expect(result.current).toBe(true);
  });

  it("should handle empty role array", () => {
    const profile = createMockProfile(Role.STAFF);
    const { result } = renderRBACHook(
      () => useHasAnyRole([]),
      {
        preloadedState: {
          auth: { status: "authenticated", profile },
        },
      }
    );

    expect(result.current).toBe(false);
  });
});
