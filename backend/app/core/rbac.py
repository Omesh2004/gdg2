"""
Production-Grade Role-Based Access Control (RBAC) System

Implements:
- Role Enumeration with hierarchy
- Permission Enumeration
- Role-Permission Mapping
- Permission Checking with hierarchy support
- Audit logging integration
"""

from enum import Enum, auto
from functools import lru_cache
from typing import Set


# ============================================================================
# ROLE DEFINITION WITH HIERARCHY
# ============================================================================

class Role(str, Enum):
    """
    System roles with hierarchical structure:
    ADMIN > SECURITY > STAFF > MAINTENANCE > GUEST
    
    Admin has all permissions by default.
    """
    ADMIN = "admin"
    SECURITY = "security"
    STAFF = "staff"
    MAINTENANCE = "maintenance"
    GUEST = "guest"

    @classmethod
    def is_valid(cls, role: str) -> bool:
        """Check if a role string is valid."""
        try:
            cls(role)
            return True
        except ValueError:
            return False

    def is_admin(self) -> bool:
        """Check if this role has admin privileges."""
        return self == Role.ADMIN

    def has_hierarchy_over(self, other: "Role") -> bool:
        """Check if this role has higher hierarchy than another."""
        hierarchy = {
            Role.ADMIN: 5,
            Role.SECURITY: 4,
            Role.STAFF: 3,
            Role.MAINTENANCE: 2,
            Role.GUEST: 1,
        }
        return hierarchy.get(self, 0) > hierarchy.get(other, 0)


# ============================================================================
# PERMISSION DEFINITION
# ============================================================================

class Permission(str, Enum):
    """
    System permissions - granular access control.
    Used for future extension and fine-grained authorization.
    """
    # Anomaly & Alert Permissions
    ANOMALY_VIEW = "anomaly:view"
    ANOMALY_REPORT = "anomaly:report"
    ANOMALY_RESOLVE = "anomaly:resolve"
    ANOMALY_DELETE = "anomaly:delete"
    ALERT_BROADCAST = "alert:broadcast"

    # Routing Permissions
    ROUTING_VIEW = "routing:view"
    ROUTING_CALCULATE = "routing:calculate"

    # User Management Permissions
    USER_VIEW = "user:view"
    USER_EDIT = "user:edit"
    USER_CREATE = "user:create"
    USER_DELETE = "user:delete"
    USER_ASSIGN_ROLE = "user:assign_role"

    # Building & Zone Permissions
    BUILDING_VIEW = "building:view"
    BUILDING_EDIT = "building:edit"
    ZONE_VIEW = "zone:view"
    ZONE_EDIT = "zone:edit"
    ZONE_ACTIVATE = "zone:activate"

    # Positioning & Tracking Permissions
    LOCATION_VIEW = "location:view"
    LOCATION_VIEW_ALL = "location:view_all"
    LOCATION_UPDATE_SELF = "location:update_self"

    # SMS & Messaging Permissions
    SMS_SEND = "sms:send"
    SMS_BROADCAST = "sms:broadcast"

    # Audit & Compliance Permissions
    AUDIT_VIEW = "audit:view"
    AUDIT_EXPORT = "audit:export"

    # WebSocket & Real-time Permissions
    WEBSOCKET_CONNECT = "websocket:connect"
    WEBSOCKET_ADMIN_VIEW = "websocket:admin_view"

    # System Permissions
    SYSTEM_SETTINGS = "system:settings"
    SYSTEM_CONFIG = "system:config"


# ============================================================================
# ROLE-PERMISSION MAPPING (PRODUCTION MAPPING)
# ============================================================================

ROLE_PERMISSIONS_MAP: dict[Role, Set[Permission]] = {
    Role.ADMIN: {
        # Admin has ALL permissions
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
    },
    Role.SECURITY: {
        # Security: Can view & manage anomalies, broadcast alerts, manage zones & locations
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
    },
    Role.STAFF: {
        # Staff: Can view anomalies, see routing, update own location, receive broadcasts
        Permission.ANOMALY_VIEW,
        Permission.ROUTING_VIEW,
        Permission.ROUTING_CALCULATE,
        Permission.BUILDING_VIEW,
        Permission.ZONE_VIEW,
        Permission.LOCATION_VIEW,
        Permission.LOCATION_UPDATE_SELF,
        Permission.WEBSOCKET_CONNECT,
    },
    Role.MAINTENANCE: {
        # Maintenance: Can view anomalies, see building/zones, update location
        Permission.ANOMALY_VIEW,
        Permission.BUILDING_VIEW,
        Permission.ZONE_VIEW,
        Permission.LOCATION_VIEW,
        Permission.LOCATION_UPDATE_SELF,
        Permission.WEBSOCKET_CONNECT,
    },
    Role.GUEST: {
        # Guest: Minimal permissions - view building layout, update own location
        Permission.BUILDING_VIEW,
        Permission.LOCATION_UPDATE_SELF,
        Permission.WEBSOCKET_CONNECT,
    },
}


# ============================================================================
# RBAC UTILITY FUNCTIONS
# ============================================================================

@lru_cache(maxsize=128)
def get_role_permissions(role: Role) -> Set[Permission]:
    """Get all permissions for a given role (cached)."""
    return ROLE_PERMISSIONS_MAP.get(role, set())


def has_permission(role: Role, permission: Permission) -> bool:
    """Check if a role has a specific permission."""
    # Admin bypass - all permissions
    if role == Role.ADMIN:
        return True
    
    permissions = get_role_permissions(role)
    return permission in permissions


def has_any_permission(role: Role, permissions: list[Permission]) -> bool:
    """Check if a role has any of the given permissions."""
    if role == Role.ADMIN:
        return True
    
    role_perms = get_role_permissions(role)
    return any(perm in role_perms for perm in permissions)


def has_all_permissions(role: Role, permissions: list[Permission]) -> bool:
    """Check if a role has all of the given permissions."""
    if role == Role.ADMIN:
        return True
    
    role_perms = get_role_permissions(role)
    return all(perm in role_perms for perm in permissions)


def get_roles_with_permission(permission: Permission) -> Set[Role]:
    """Get all roles that have a specific permission."""
    return {
        role for role, perms in ROLE_PERMISSIONS_MAP.items()
        if permission in perms or role == Role.ADMIN
    }


def require_admin(role: Role) -> bool:
    """Check if role is admin."""
    return role == Role.ADMIN


def require_at_least_role(role: Role, required_role: Role) -> bool:
    """Check if role meets or exceeds required role in hierarchy."""
    hierarchy = {
        Role.ADMIN: 5,
        Role.SECURITY: 4,
        Role.STAFF: 3,
        Role.MAINTENANCE: 2,
        Role.GUEST: 1,
    }
    return hierarchy.get(role, 0) >= hierarchy.get(required_role, 0)


# ============================================================================
# PERMISSION REQUIREMENTS BY ENDPOINT (REFERENCE)
# ============================================================================

ENDPOINT_PERMISSIONS = {
    # Anomaly endpoints
    "GET /api/v1/anomalies/": [Permission.ANOMALY_VIEW],
    "POST /api/v1/anomalies/report": [Permission.ANOMALY_REPORT],
    "PATCH /api/v1/anomalies/{id}/resolve": [Permission.ANOMALY_RESOLVE],
    "DELETE /api/v1/anomalies/{id}": [Permission.ANOMALY_DELETE],

    # Routing endpoints
    "GET /api/v1/routing/evacuate/{zone_id}": [Permission.ROUTING_CALCULATE],

    # Location endpoints
    "GET /api/v1/location/heatmap": [Permission.LOCATION_VIEW_ALL],
    "POST /api/v1/location/update": [Permission.LOCATION_UPDATE_SELF],

    # SMS endpoints
    "POST /api/v1/sms/send": [Permission.SMS_SEND],
    "POST /api/v1/sms/broadcast": [Permission.SMS_BROADCAST],

    # User management endpoints
    "GET /api/v1/users/": [Permission.USER_VIEW],
    "PUT /api/v1/users/{id}": [Permission.USER_EDIT],
    "POST /api/v1/users/": [Permission.USER_CREATE],
    "DELETE /api/v1/users/{id}": [Permission.USER_DELETE],

    # Audit endpoints
    "GET /api/v1/audit/logs": [Permission.AUDIT_VIEW],
    "POST /api/v1/audit/export": [Permission.AUDIT_EXPORT],

    # System endpoints
    "GET /api/v1/system/settings": [Permission.SYSTEM_SETTINGS],
    "PUT /api/v1/system/settings": [Permission.SYSTEM_CONFIG],

    # WebSocket
    "WS /ws/": [Permission.WEBSOCKET_CONNECT],
    "WS /ws/admin": [Permission.WEBSOCKET_ADMIN_VIEW],
}
