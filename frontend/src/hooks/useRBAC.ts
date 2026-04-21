/**
 * Production-Grade RBAC Custom Hooks
 *
 * Provides React hooks for:
 * - Role-based checks
 * - Permission-based checks
 * - Protected component rendering
 * - Access control in logic
 */

"use client";

import { useSelector } from "react-redux";
import { useMemo } from "react";
import type { RootState } from "@/store/store";
import type { AuthRole } from "@/lib/auth";
import {
  Permission,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRoleHierarchy,
  isAdmin,
} from "@/lib/rbac";

/**
 * Hook: Get current user's role
 */
export function useRole(): AuthRole | null {
  const profile = useSelector((state: RootState) => state.auth.profile);
  return profile?.role || null;
}

/**
 * Hook: Check if current user is admin
 */
export function useIsAdmin(): boolean {
  const role = useRole();
  return role ? isAdmin(role) : false;
}

/**
 * Hook: Check if current user has a specific permission
 */
export function useHasPermission(permission: Permission): boolean {
  const role = useRole();
  if (!role) return false;
  return hasPermission(role, permission);
}

/**
 * Hook: Check if current user has any of the given permissions
 */
export function useHasAnyPermission(permissions: Permission[]): boolean {
  const role = useRole();
  if (!role) return false;
  return hasAnyPermission(role, permissions);
}

/**
 * Hook: Check if current user has all of the given permissions
 */
export function useHasAllPermissions(permissions: Permission[]): boolean {
  const role = useRole();
  if (!role) return false;
  return hasAllPermissions(role, permissions);
}

/**
 * Hook: Check if current user's role meets or exceeds required role
 * Example: Check if user is at least SECURITY level
 */
export function useHasRoleHierarchy(requiredRole: string | AuthRole): boolean {
  const role = useRole();
  if (!role) return false;
  return hasRoleHierarchy(role, requiredRole);
}

/**
 * Hook: Check if current user has a specific role
 */
export function useHasRole(checkRole: string | AuthRole): boolean {
  const role = useRole();
  return role === checkRole;
}

/**
 * Hook: Check if current user has any of the given roles
 */
export function useHasAnyRole(roles: (string | AuthRole)[]): boolean {
  const role = useRole();
  if (!role) return false;
  return roles.includes(role);
}

/**
 * Hook: Get current user's full profile
 */
export function useAuth() {
  return useSelector((state: RootState) => state.auth);
}

/**
 * Hook: Check if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const auth = useAuth();
  return auth.status === "authenticated" && !!auth.profile;
}

/**
 * Hook: Get current user profile
 */
export function useProfile() {
  return useSelector((state: RootState) => state.auth.profile);
}

/**
 * Memoized hook: Get permission check functions (for optimization)
 * Useful when doing multiple checks in a component
 */
export function useRBACChecks() {
  const role = useRole();

  return useMemo(() => ({
    role,
    isAdmin: role ? isAdmin(role) : false,
    hasPermission: (perm: Permission) => role ? hasPermission(role, perm) : false,
    hasAnyPermission: (perms: Permission[]) => role ? hasAnyPermission(role, perms) : false,
    hasAllPermissions: (perms: Permission[]) => role ? hasAllPermissions(role, perms) : false,
    hasRoleHierarchy: (reqRole: string | AuthRole) => role ? hasRoleHierarchy(role, reqRole) : false,
    hasRole: (checkRole: string | AuthRole) => role === checkRole,
    hasAnyRole: (roles: (string | AuthRole)[]) => role ? roles.includes(role) : false,
  }), [role]);
}
