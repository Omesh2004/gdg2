/**
 * Production-Grade RBAC Types & Utilities (Frontend)
 *
 * Provides type-safe role and permission handling with:
 * - Role enums matching backend
 * - Permission enums
 * - Role-permission mapping
 * - Utility functions for access checks
 */

/**
 * Role definition with hierarchy
 * ADMIN > SECURITY > STAFF > MAINTENANCE > GUEST
 */
export enum Role {
  ADMIN = "admin",
  SECURITY = "security",
  STAFF = "staff",
  MAINTENANCE = "maintenance",
  GUEST = "guest",
}

/**
 * Permission definition for fine-grained access control
 */
export enum Permission {
  // Anomaly & Alert Permissions
  ANOMALY_VIEW = "anomaly:view",
  ANOMALY_REPORT = "anomaly:report",
  ANOMALY_RESOLVE = "anomaly:resolve",
  ANOMALY_DELETE = "anomaly:delete",
  ALERT_BROADCAST = "alert:broadcast",

  // Routing Permissions
  ROUTING_VIEW = "routing:view",
  ROUTING_CALCULATE = "routing:calculate",

  // User Management Permissions
  USER_VIEW = "user:view",
  USER_EDIT = "user:edit",
  USER_CREATE = "user:create",
  USER_DELETE = "user:delete",
  USER_ASSIGN_ROLE = "user:assign_role",

  // Building & Zone Permissions
  BUILDING_VIEW = "building:view",
  BUILDING_EDIT = "building:edit",
  ZONE_VIEW = "zone:view",
  ZONE_EDIT = "zone:edit",
  ZONE_ACTIVATE = "zone:activate",

  // Positioning & Tracking Permissions
  LOCATION_VIEW = "location:view",
  LOCATION_VIEW_ALL = "location:view_all",
  LOCATION_UPDATE_SELF = "location:update_self",

  // SMS & Messaging Permissions
  SMS_SEND = "sms:send",
  SMS_BROADCAST = "sms:broadcast",

  // Audit & Compliance Permissions
  AUDIT_VIEW = "audit:view",
  AUDIT_EXPORT = "audit:export",

  // WebSocket & Real-time Permissions
  WEBSOCKET_CONNECT = "websocket:connect",
  WEBSOCKET_ADMIN_VIEW = "websocket:admin_view",

  // System Permissions
  SYSTEM_SETTINGS = "system:settings",
  SYSTEM_CONFIG = "system:config",
}

/**
 * Role-Permission mapping (must match backend)
 */
const ROLE_PERMISSIONS_MAP: Record<Role, Set<Permission>> = {
  [Role.ADMIN]: new Set([
    // Admin has ALL permissions
    Permission.ANOMALY_VIEW,
    Permission.ANOMALY_REPORT,
    Permission.ANOMALY_RESOLVE,
    Permission.ANOMALY_DELETE,
    Permission.ALERT_BROADCAST,
    Permission.ROUTING_VIEW,
    Permission.ROUTING_CALCULATE,
    Permission.USER_VIEW,
    Permission.USER_EDIT,
    Permission.USER_CREATE,
    Permission.USER_DELETE,
    Permission.USER_ASSIGN_ROLE,
    Permission.BUILDING_VIEW,
    Permission.BUILDING_EDIT,
    Permission.ZONE_VIEW,
    Permission.ZONE_EDIT,
    Permission.ZONE_ACTIVATE,
    Permission.LOCATION_VIEW,
    Permission.LOCATION_VIEW_ALL,
    Permission.LOCATION_UPDATE_SELF,
    Permission.SMS_SEND,
    Permission.SMS_BROADCAST,
    Permission.AUDIT_VIEW,
    Permission.AUDIT_EXPORT,
    Permission.WEBSOCKET_CONNECT,
    Permission.WEBSOCKET_ADMIN_VIEW,
    Permission.SYSTEM_SETTINGS,
    Permission.SYSTEM_CONFIG,
  ]),

  [Role.SECURITY]: new Set([
    Permission.ANOMALY_VIEW,
    Permission.ANOMALY_REPORT,
    Permission.ANOMALY_RESOLVE,
    Permission.ALERT_BROADCAST,
    Permission.ROUTING_VIEW,
    Permission.ROUTING_CALCULATE,
    Permission.USER_VIEW,
    Permission.BUILDING_VIEW,
    Permission.ZONE_VIEW,
    Permission.ZONE_ACTIVATE,
    Permission.LOCATION_VIEW,
    Permission.LOCATION_VIEW_ALL,
    Permission.SMS_SEND,
    Permission.SMS_BROADCAST,
    Permission.AUDIT_VIEW,
    Permission.WEBSOCKET_CONNECT,
    Permission.WEBSOCKET_ADMIN_VIEW,
  ]),

  [Role.STAFF]: new Set([
    Permission.ANOMALY_VIEW,
    Permission.ROUTING_VIEW,
    Permission.ROUTING_CALCULATE,
    Permission.BUILDING_VIEW,
    Permission.ZONE_VIEW,
    Permission.LOCATION_VIEW,
    Permission.LOCATION_UPDATE_SELF,
    Permission.WEBSOCKET_CONNECT,
  ]),

  [Role.MAINTENANCE]: new Set([
    Permission.ANOMALY_VIEW,
    Permission.BUILDING_VIEW,
    Permission.ZONE_VIEW,
    Permission.LOCATION_VIEW,
    Permission.LOCATION_UPDATE_SELF,
    Permission.WEBSOCKET_CONNECT,
  ]),

  [Role.GUEST]: new Set([
    Permission.BUILDING_VIEW,
    Permission.LOCATION_UPDATE_SELF,
    Permission.WEBSOCKET_CONNECT,
  ]),
};

/**
 * Role hierarchy levels for comparison
 */
const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.ADMIN]: 5,
  [Role.SECURITY]: 4,
  [Role.STAFF]: 3,
  [Role.MAINTENANCE]: 2,
  [Role.GUEST]: 1,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a role string is valid
 */
export function isValidRole(role: string): role is Role {
  return Object.values(Role).includes(role as Role);
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: string): Set<Permission> {
  return ROLE_PERMISSIONS_MAP[role as Role] || new Set();
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: string, permission: Permission): boolean {
  // Admin bypass - has all permissions
  if (role === "admin") {
    return true;
  }

  const permissions = getRolePermissions(role);
  return permissions.has(permission);
}

/**
 * Check if a role has any of the given permissions
 */
export function hasAnyPermission(
  role: string,
  permissions: Permission[]
): boolean {
  if (role === "admin") {
    return true;
  }

  const rolePerms = getRolePermissions(role);
  return permissions.some((perm) => rolePerms.has(perm));
}

/**
 * Check if a role has all of the given permissions
 */
export function hasAllPermissions(
  role: string,
  permissions: Permission[]
): boolean {
  if (role === "admin") {
    return true;
  }

  const rolePerms = getRolePermissions(role);
  return permissions.every((perm) => rolePerms.has(perm));
}

/**
 * Check if a role meets or exceeds the required role in hierarchy
 * Example: SECURITY (4) >= STAFF (3) = true
 */
export function hasRoleHierarchy(role: string, requiredRole: string): boolean {
  return ROLE_HIERARCHY[role as Role] >= ROLE_HIERARCHY[requiredRole as Role];
}

/**
 * Check if role is admin
 */
export function isAdmin(role: string): boolean {
  return role === "admin";
}

/**
 * Get roles that have a specific permission
 */
export function getRolesWithPermission(permission: Permission): Role[] {
  return Object.entries(ROLE_PERMISSIONS_MAP)
    .filter(([_, perms]) => perms.has(permission) || false)
    .map(([role]) => role as Role);
}

/**
 * Get human-readable role name
 */
export function getRoleDisplayName(role: Role): string {
  const names: Record<Role, string> = {
    [Role.ADMIN]: "Administrator",
    [Role.SECURITY]: "Security Officer",
    [Role.STAFF]: "Staff Member",
    [Role.MAINTENANCE]: "Maintenance",
    [Role.GUEST]: "Guest",
  };
  return names[role] || role;
}

/**
 * Get human-readable permission name
 */
export function getPermissionDisplayName(permission: Permission): string {
  const names: Record<Permission, string> = {
    [Permission.ANOMALY_VIEW]: "View Anomalies",
    [Permission.ANOMALY_REPORT]: "Report Anomalies",
    [Permission.ANOMALY_RESOLVE]: "Resolve Anomalies",
    [Permission.ANOMALY_DELETE]: "Delete Anomalies",
    [Permission.ALERT_BROADCAST]: "Broadcast Alerts",
    [Permission.ROUTING_VIEW]: "View Routes",
    [Permission.ROUTING_CALCULATE]: "Calculate Routes",
    [Permission.USER_VIEW]: "View Users",
    [Permission.USER_EDIT]: "Edit Users",
    [Permission.USER_CREATE]: "Create Users",
    [Permission.USER_DELETE]: "Delete Users",
    [Permission.USER_ASSIGN_ROLE]: "Assign Roles",
    [Permission.BUILDING_VIEW]: "View Building",
    [Permission.BUILDING_EDIT]: "Edit Building",
    [Permission.ZONE_VIEW]: "View Zones",
    [Permission.ZONE_EDIT]: "Edit Zones",
    [Permission.ZONE_ACTIVATE]: "Activate Zones",
    [Permission.LOCATION_VIEW]: "View Location",
    [Permission.LOCATION_VIEW_ALL]: "View All Locations",
    [Permission.LOCATION_UPDATE_SELF]: "Update Own Location",
    [Permission.SMS_SEND]: "Send SMS",
    [Permission.SMS_BROADCAST]: "Broadcast SMS",
    [Permission.AUDIT_VIEW]: "View Audit Logs",
    [Permission.AUDIT_EXPORT]: "Export Audit Logs",
    [Permission.WEBSOCKET_CONNECT]: "Connect to WebSocket",
    [Permission.WEBSOCKET_ADMIN_VIEW]: "Admin WebSocket View",
    [Permission.SYSTEM_SETTINGS]: "View System Settings",
    [Permission.SYSTEM_CONFIG]: "Configure System",
  };
  return names[permission] || permission;
}

// ============================================================================
// PAGE PERMISSION REQUIREMENTS (Reference)
// ============================================================================

export const PAGE_PERMISSIONS: Record<string, Permission[]> = {
  "/": [Permission.ANOMALY_VIEW],
  "/alerts": [Permission.ANOMALY_VIEW],
  "/people": [Permission.LOCATION_VIEW_ALL],
  "/sms": [Permission.SMS_BROADCAST],
  "/reports": [Permission.AUDIT_VIEW],
  "/settings": [Permission.SYSTEM_SETTINGS],
  "/security": [Permission.AUDIT_VIEW],
  "/maintenance": [Permission.ZONE_EDIT],
};
