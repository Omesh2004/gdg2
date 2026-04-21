/**
 * Production-Grade Protected Routes & Components
 *
 * Provides:
 * - ProtectedRoute component for pages
 * - PermissionGate component for content
 * - RoleGate component for role-based rendering
 */

"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  useIsAuthenticated,
  useRole,
  useHasPermission,
  useHasAnyPermission,
  useHasAllPermissions,
  useHasAnyRole,
} from "@/hooks/useRBAC";
import { Permission } from "@/lib/rbac";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
  requiredRoles?: string[];
  requiredPermission?: Permission;
  requiredPermissions?: Permission[];
  fallback?: ReactNode;
  onUnauthorized?: () => void;
}

/**
 * ProtectedRoute Component
 * Wraps pages to ensure user has proper authorization
 *
 * Usage:
 * <ProtectedRoute requiredRoles={[Role.ADMIN, Role.SECURITY]}>
 *   <AdminPage />
 * </ProtectedRoute>
 */
export function ProtectedRoute({
  children,
  requiredRole,
  requiredRoles,
  requiredPermission,
  requiredPermissions,
  fallback = <UnauthorizedFallback />,
  onUnauthorized,
}: ProtectedRouteProps) {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const role = useRole();
  const currentRole = role ?? "guest";

  // Check authentication
  if (!isAuthenticated) {
    onUnauthorized?.();
    router.push("/login");
    return fallback;
  }

  // Check role requirement (single)
  if (requiredRole && currentRole !== requiredRole) {
    onUnauthorized?.();
    return fallback;
  }

  // Check role requirement (multiple)
  if (requiredRoles && !requiredRoles.includes(currentRole)) {
    onUnauthorized?.();
    return fallback;
  }

  // Check permission requirement (single)
  if (requiredPermission && !useHasPermission(requiredPermission)) {
    onUnauthorized?.();
    return fallback;
  }

  // Check permission requirement (multiple)
  if (requiredPermissions && !useHasAllPermissions(requiredPermissions)) {
    onUnauthorized?.();
    return fallback;
  }

  return <>{children}</>;
}

interface PermissionGateProps {
  children: ReactNode;
  permission: Permission;
  fallback?: ReactNode;
}

/**
 * PermissionGate Component
 * Conditionally renders content based on permission
 *
 * Usage:
 * <PermissionGate permission={Permission.ANOMALY_DELETE}>
 *   <DeleteButton />
 * </PermissionGate>
 */
export function PermissionGate({
  children,
  permission,
  fallback = null,
}: PermissionGateProps) {
  const hasPermission = useHasPermission(permission);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface AnyPermissionGateProps {
  children: ReactNode;
  permissions: Permission[];
  fallback?: ReactNode;
}

/**
 * AnyPermissionGate Component
 * Renders content if user has ANY of the given permissions
 */
export function AnyPermissionGate({
  children,
  permissions,
  fallback = null,
}: AnyPermissionGateProps) {
  const hasAnyPerm = useHasAnyPermission(permissions);

  if (!hasAnyPerm) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface AllPermissionsGateProps {
  children: ReactNode;
  permissions: Permission[];
  fallback?: ReactNode;
}

/**
 * AllPermissionsGate Component
 * Renders content if user has ALL of the given permissions
 */
export function AllPermissionsGate({
  children,
  permissions,
  fallback = null,
}: AllPermissionsGateProps) {
  const hasAllPerms = useHasAllPermissions(permissions);

  if (!hasAllPerms) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface RoleGateProps {
  children: ReactNode;
  roles: string[];
  fallback?: ReactNode;
}

/**
 * RoleGate Component
 * Renders content if user has one of the specified roles
 *
 * Usage:
 * <RoleGate roles={[Role.ADMIN, Role.SECURITY]}>
 *   <SensitiveData />
 * </RoleGate>
 */
export function RoleGate({
  children,
  roles,
  fallback = null,
}: RoleGateProps) {
  const hasAnyRole = useHasAnyRole(roles);

  if (!hasAnyRole) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface AdminOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * AdminOnly Component
 * Quick wrapper for admin-only content
 */
export function AdminOnly({ children, fallback = null }: AdminOnlyProps) {
  return (
    <RoleGate roles={["admin"]} fallback={fallback}>
      {children}
    </RoleGate>
  );
}

interface SecurityOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * SecurityOnly Component
 * Quick wrapper for security-level+ content
 */
export function SecurityOnly({ children, fallback = null }: SecurityOnlyProps) {
  return (
    <RoleGate roles={["admin", "security"]} fallback={fallback}>
      {children}
    </RoleGate>
  );
}

/**
 * Default Unauthorized Fallback Component
 */
function UnauthorizedFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-red-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-red-900 mb-2">Access Denied</h1>
        <p className="text-red-700 mb-6">
          You do not have permission to access this page.
        </p>
        <a
          href="/"
          className="inline-block px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
}

/**
 * Forbidden Component
 * Show when accessing restricted content
 */
export function Forbidden({ message = "This feature is not available for your role." }) {
  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
      <div className="flex gap-3">
        <div className="text-yellow-800">
          <p className="font-semibold">Access Restricted</p>
          <p className="text-sm">{message}</p>
        </div>
      </div>
    </div>
  );
}
