"""
Advanced RBAC Middleware & Dependency Injectors for FastAPI

Provides:
- Role-based access control dependencies
- Permission-based access control dependencies
- Admin-only guards
- Audit logging integration
- Hierarchy-aware authorization
"""

from typing import Callable, Optional, Set, List
from functools import wraps
import logging
from datetime import datetime

from fastapi import Depends, HTTPException, Request, status

from app.core.auth import get_current_user
from app.core.rbac import Role, Permission, has_permission, has_any_permission, require_admin
from app.services.auth_service import AuthProfile

logger = logging.getLogger(__name__)


# ============================================================================
# AUDIT LOGGING (For compliance & security)
# ============================================================================

async def log_access_attempt(
    user_id: str,
    role: str,
    endpoint: str,
    method: str,
    status_code: int,
    required_permission: Optional[str] = None,
    granted: bool = True,
) -> None:
    """
    Log role-based access attempts for audit trail.
    
    In production, this would write to:
    - PostgreSQL audit_log table
    - Elasticsearch for analytics
    - Cloudwatch/Datadog for monitoring
    """
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "user_id": user_id,
        "role": role,
        "endpoint": endpoint,
        "method": method,
        "required_permission": required_permission,
        "granted": granted,
        "status_code": status_code,
    }
    
    if granted:
        logger.info(f"Access GRANTED: {log_entry}")
    else:
        logger.warning(f"Access DENIED: {log_entry}")
    
    # TODO: Persist to audit_log table
    # await db["audit_logs"].insert_one(log_entry)


# ============================================================================
# ROLE-BASED DEPENDENCY INJECTORS
# ============================================================================

def require_role(required_role: Role) -> Callable:
    """
    Dependency: Require a specific role.
    
    Usage:
        @router.get("/admin-only")
        async def admin_endpoint(user = Depends(require_role(Role.ADMIN))):
            return {"message": "Admin only"}
    """
    async def role_dependency(user: AuthProfile = Depends(get_current_user)) -> AuthProfile:
        try:
            user_role = Role(user.role)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Invalid role: {user.role}"
            )
        
        # Admin bypass
        if user_role == Role.ADMIN:
            return user
        
        # Check exact role match
        if user_role != required_role:
            await log_access_attempt(
                user_id=user.id,
                role=user.role,
                endpoint="[unknown]",
                method="[unknown]",
                status_code=403,
                required_permission=f"role:{required_role.value}",
                granted=False,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This endpoint requires role '{required_role.value}'. You have role '{user.role}'."
            )
        
        return user
    
    return role_dependency


def require_roles(*roles: Role) -> Callable:
    """
    Dependency: Require one of multiple roles.
    
    Usage:
        @router.post("/sms")
        async def send_sms(user = Depends(require_roles(Role.ADMIN, Role.SECURITY))):
            return {"sent": True}
    """
    allowed_roles = set(roles)
    
    async def roles_dependency(user: AuthProfile = Depends(get_current_user)) -> AuthProfile:
        try:
            user_role = Role(user.role)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Invalid role: {user.role}"
            )
        
        # Admin bypass
        if user_role == Role.ADMIN:
            return user
        
        # Check if user role is in allowed roles
        if user_role not in allowed_roles:
            role_names = ", ".join([r.value for r in allowed_roles])
            await log_access_attempt(
                user_id=user.id,
                role=user.role,
                endpoint="[unknown]",
                method="[unknown]",
                status_code=403,
                required_permission=f"roles:{role_names}",
                granted=False,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This endpoint requires one of these roles: {role_names}. You have role '{user.role}'."
            )
        
        return user
    
    return roles_dependency


def require_at_least_role(min_role: Role) -> Callable:
    """
    Dependency: Require a role with given hierarchy level or higher.
    Admin > Security > Staff > Maintenance > Guest
    
    Usage:
        @router.get("/sensitive-data")
        async def sensitive(user = Depends(require_at_least_role(Role.SECURITY))):
            return {"data": "sensitive"}
    """
    hierarchy = {
        Role.ADMIN: 5,
        Role.SECURITY: 4,
        Role.STAFF: 3,
        Role.MAINTENANCE: 2,
        Role.GUEST: 1,
    }
    min_level = hierarchy.get(min_role, 0)
    
    async def hierarchy_dependency(user: AuthProfile = Depends(get_current_user)) -> AuthProfile:
        try:
            user_role = Role(user.role)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Invalid role: {user.role}"
            )
        
        user_level = hierarchy.get(user_role, 0)
        
        if user_level < min_level:
            await log_access_attempt(
                user_id=user.id,
                role=user.role,
                endpoint="[unknown]",
                method="[unknown]",
                status_code=403,
                required_permission=f"hierarchy:{min_role.value}",
                granted=False,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This endpoint requires role '{min_role.value}' or higher in hierarchy."
            )
        
        return user
    
    return hierarchy_dependency


# ============================================================================
# PERMISSION-BASED DEPENDENCY INJECTORS
# ============================================================================

def require_permission(permission: Permission) -> Callable:
    """
    Dependency: Require a specific permission.
    
    Usage:
        @router.post("/anomalies/delete/{id}")
        async def delete_anomaly(id: str, user = Depends(require_permission(Permission.ANOMALY_DELETE))):
            return {"deleted": True}
    """
    async def permission_dependency(user: AuthProfile = Depends(get_current_user)) -> AuthProfile:
        try:
            user_role = Role(user.role)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Invalid role: {user.role}"
            )
        
        if not has_permission(user_role, permission):
            await log_access_attempt(
                user_id=user.id,
                role=user.role,
                endpoint="[unknown]",
                method="[unknown]",
                status_code=403,
                required_permission=permission.value,
                granted=False,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permission: {permission.value}"
            )
        
        return user
    
    return permission_dependency


def require_permissions(*permissions: Permission) -> Callable:
    """
    Dependency: Require all of multiple permissions.
    
    Usage:
        @router.post("/sensitive")
        async def sensitive_op(user = Depends(require_permissions(Permission.USER_EDIT, Permission.AUDIT_VIEW))):
            return {"ok": True}
    """
    required_perms = set(permissions)
    
    async def permissions_dependency(user: AuthProfile = Depends(get_current_user)) -> AuthProfile:
        try:
            user_role = Role(user.role)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Invalid role: {user.role}"
            )
        
        for perm in required_perms:
            if not has_permission(user_role, perm):
                await log_access_attempt(
                    user_id=user.id,
                    role=user.role,
                    endpoint="[unknown]",
                    method="[unknown]",
                    status_code=403,
                    required_permission=",".join([p.value for p in required_perms]),
                    granted=False,
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Missing required permissions: {', '.join([p.value for p in required_perms])}"
                )
        
        return user
    
    return permissions_dependency


def require_any_permission(*permissions: Permission) -> Callable:
    """
    Dependency: Require any of multiple permissions.
    
    Usage:
        @router.post("/broadcast")
        async def broadcast(user = Depends(require_any_permission(Permission.SMS_SEND, Permission.ALERT_BROADCAST))):
            return {"ok": True}
    """
    allowed_perms = set(permissions)
    
    async def any_permission_dependency(user: AuthProfile = Depends(get_current_user)) -> AuthProfile:
        try:
            user_role = Role(user.role)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Invalid role: {user.role}"
            )
        
        if not has_any_permission(user_role, list(allowed_perms)):
            await log_access_attempt(
                user_id=user.id,
                role=user.role,
                endpoint="[unknown]",
                method="[unknown]",
                status_code=403,
                required_permission=",".join([p.value for p in allowed_perms]),
                granted=False,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing one of required permissions: {', '.join([p.value for p in allowed_perms])}"
            )
        
        return user
    
    return any_permission_dependency


def require_admin() -> Callable:
    """
    Dependency: Require admin role (highest privilege).
    
    Usage:
        @router.delete("/users/{id}")
        async def delete_user(id: str, user = Depends(require_admin())):
            return {"deleted": True}
    """
    async def admin_dependency(user: AuthProfile = Depends(get_current_user)) -> AuthProfile:
        try:
            user_role = Role(user.role)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Invalid role: {user.role}"
            )
        
        if user_role != Role.ADMIN:
            await log_access_attempt(
                user_id=user.id,
                role=user.role,
                endpoint="[unknown]",
                method="[unknown]",
                status_code=403,
                required_permission="admin",
                granted=False,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This endpoint requires admin role."
            )
        
        return user
    
    return admin_dependency


# ============================================================================
# CONTEXT-AWARE DEPENDENCY (Returns role for use in endpoint logic)
# ============================================================================

async def get_user_role(user: AuthProfile = Depends(get_current_user)) -> Role:
    """
    Dependency: Get current user's role as an enum.
    
    Usage:
        @router.get("/my-dashboard")
        async def dashboard(role = Depends(get_user_role)):
            if role == Role.ADMIN:
                return {"message": "Admin dashboard"}
            return {"message": "User dashboard"}
    """
    try:
        return Role(user.role)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Invalid role: {user.role}"
        )
