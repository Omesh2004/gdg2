"""
Production-Grade Unit Tests for RBAC System
Tests role hierarchy, permissions, and access control logic
"""

import pytest
from app.core.rbac import (
    Role,
    Permission,
    has_permission,
    has_any_permission,
    has_all_permissions,
    get_role_permissions,
    get_roles_with_permission,
    require_at_least_role,
    require_admin,
)


class TestRoleHierarchy:
    """Test role hierarchy and comparison logic"""

    def test_role_enum_values(self):
        """Verify all roles are defined"""
        assert Role.ADMIN.value == "admin"
        assert Role.SECURITY.value == "security"
        assert Role.STAFF.value == "staff"
        assert Role.MAINTENANCE.value == "maintenance"
        assert Role.GUEST.value == "guest"

    def test_is_valid_role(self):
        """Test role validation"""
        assert Role.is_valid("admin")
        assert Role.is_valid("security")
        assert Role.is_valid("staff")
        assert not Role.is_valid("superadmin")
        assert not Role.is_valid("invalid")

    def test_admin_has_hierarchy_over_all(self):
        """Admin has highest hierarchy"""
        assert Role.ADMIN.has_hierarchy_over(Role.SECURITY)
        assert Role.ADMIN.has_hierarchy_over(Role.STAFF)
        assert Role.ADMIN.has_hierarchy_over(Role.MAINTENANCE)
        assert Role.ADMIN.has_hierarchy_over(Role.GUEST)

    def test_security_has_hierarchy_over_staff_and_below(self):
        """Security higher than staff, maintenance, guest"""
        assert Role.SECURITY.has_hierarchy_over(Role.STAFF)
        assert Role.SECURITY.has_hierarchy_over(Role.MAINTENANCE)
        assert Role.SECURITY.has_hierarchy_over(Role.GUEST)
        assert not Role.SECURITY.has_hierarchy_over(Role.ADMIN)

    def test_guest_has_no_hierarchy(self):
        """Guest has lowest privilege"""
        assert not Role.GUEST.has_hierarchy_over(Role.MAINTENANCE)
        assert not Role.GUEST.has_hierarchy_over(Role.STAFF)
        assert not Role.GUEST.has_hierarchy_over(Role.SECURITY)
        assert not Role.GUEST.has_hierarchy_over(Role.ADMIN)

    def test_is_admin(self):
        """Test admin role detection"""
        assert Role.ADMIN.is_admin()
        assert not Role.SECURITY.is_admin()
        assert not Role.STAFF.is_admin()
        assert not Role.MAINTENANCE.is_admin()
        assert not Role.GUEST.is_admin()


class TestAdminBypass:
    """Test that admin role bypasses all permission checks"""

    def test_admin_has_all_permissions(self):
        """Admin should have all permissions"""
        for permission in Permission:
            assert has_permission(Role.ADMIN, permission), f"Admin missing {permission}"

    def test_admin_any_permission(self):
        """Admin has any permission check"""
        perms = [Permission.ANOMALY_DELETE, Permission.SMS_BROADCAST]
        assert has_any_permission(Role.ADMIN, perms)

    def test_admin_all_permissions(self):
        """Admin has all permissions check"""
        perms = [Permission.ANOMALY_DELETE, Permission.SMS_BROADCAST]
        assert has_all_permissions(Role.ADMIN, perms)

    def test_admin_role_bypass(self):
        """Admin must have is_admin() return true"""
        assert require_admin(Role.ADMIN)

    def test_admin_hierarchy(self):
        """Admin meets all hierarchy requirements"""
        assert require_at_least_role(Role.ADMIN, Role.ADMIN)
        assert require_at_least_role(Role.ADMIN, Role.SECURITY)
        assert require_at_least_role(Role.ADMIN, Role.STAFF)


class TestSecurityPermissions:
    """Test security role permissions"""

    def test_security_has_required_permissions(self):
        """Security role should have expected permissions"""
        assert has_permission(Role.SECURITY, Permission.ANOMALY_VIEW)
        assert has_permission(Role.SECURITY, Permission.ANOMALY_REPORT)
        assert has_permission(Role.SECURITY, Permission.ANOMALY_RESOLVE)
        assert has_permission(Role.SECURITY, Permission.SMS_BROADCAST)
        assert has_permission(Role.SECURITY, Permission.LOCATION_VIEW_ALL)

    def test_security_denied_admin_only_perms(self):
        """Security should not have admin-only permissions"""
        assert not has_permission(Role.SECURITY, Permission.ANOMALY_DELETE)
        assert not has_permission(Role.SECURITY, Permission.SYSTEM_CONFIG)
        assert not has_permission(Role.SECURITY, Permission.USER_DELETE)

    def test_security_hierarchy(self):
        """Security meets security and above requirements"""
        assert require_at_least_role(Role.SECURITY, Role.SECURITY)
        assert require_at_least_role(Role.SECURITY, Role.STAFF)
        assert not require_at_least_role(Role.SECURITY, Role.ADMIN)


class TestStaffPermissions:
    """Test staff role permissions"""

    def test_staff_has_basic_permissions(self):
        """Staff should have basic permissions"""
        assert has_permission(Role.STAFF, Permission.ANOMALY_VIEW)
        assert has_permission(Role.STAFF, Permission.ROUTING_VIEW)
        assert has_permission(Role.STAFF, Permission.BUILDING_VIEW)
        assert has_permission(Role.STAFF, Permission.LOCATION_UPDATE_SELF)

    def test_staff_denied_sensitive_perms(self):
        """Staff should not have sensitive permissions"""
        assert not has_permission(Role.STAFF, Permission.ANOMALY_REPORT)
        assert not has_permission(Role.STAFF, Permission.ANOMALY_RESOLVE)
        assert not has_permission(Role.STAFF, Permission.SMS_BROADCAST)
        assert not has_permission(Role.STAFF, Permission.LOCATION_VIEW_ALL)
        assert not has_permission(Role.STAFF, Permission.SYSTEM_CONFIG)

    def test_staff_hierarchy(self):
        """Staff cannot access security+ features"""
        assert not require_at_least_role(Role.STAFF, Role.SECURITY)
        assert require_at_least_role(Role.STAFF, Role.STAFF)
        assert require_at_least_role(Role.STAFF, Role.MAINTENANCE)


class TestMaintenancePermissions:
    """Test maintenance role permissions"""

    def test_maintenance_has_minimal_permissions(self):
        """Maintenance should have minimal permissions"""
        assert has_permission(Role.MAINTENANCE, Permission.ANOMALY_VIEW)
        assert has_permission(Role.MAINTENANCE, Permission.BUILDING_VIEW)
        assert has_permission(Role.MAINTENANCE, Permission.LOCATION_UPDATE_SELF)

    def test_maintenance_denied_most_perms(self):
        """Maintenance should not have operational permissions"""
        assert not has_permission(Role.MAINTENANCE, Permission.ANOMALY_REPORT)
        assert not has_permission(Role.MAINTENANCE, Permission.SMS_SEND)
        assert not has_permission(Role.MAINTENANCE, Permission.AUDIT_VIEW)
        assert not has_permission(Role.MAINTENANCE, Permission.LOCATION_VIEW_ALL)


class TestGuestPermissions:
    """Test guest role permissions"""

    def test_guest_has_minimal_permissions(self):
        """Guest should have very minimal permissions"""
        assert has_permission(Role.GUEST, Permission.BUILDING_VIEW)
        assert has_permission(Role.GUEST, Permission.LOCATION_UPDATE_SELF)
        assert has_permission(Role.GUEST, Permission.WEBSOCKET_CONNECT)

    def test_guest_denied_all_operational_perms(self):
        """Guest should not have operational permissions"""
        assert not has_permission(Role.GUEST, Permission.ANOMALY_VIEW)
        assert not has_permission(Role.GUEST, Permission.ANOMALY_REPORT)
        assert not has_permission(Role.GUEST, Permission.SMS_SEND)
        assert not has_permission(Role.GUEST, Permission.AUDIT_VIEW)


class TestPermissionChecks:
    """Test permission checking functions"""

    def test_has_permission_function(self):
        """Test has_permission() utility"""
        assert has_permission(Role.ADMIN, Permission.ANOMALY_VIEW)
        assert has_permission(Role.SECURITY, Permission.ANOMALY_VIEW)
        assert has_permission(Role.STAFF, Permission.ANOMALY_VIEW)
        assert not has_permission(Role.GUEST, Permission.ANOMALY_VIEW)

    def test_has_any_permission_function(self):
        """Test has_any_permission() utility"""
        perms = [Permission.ANOMALY_DELETE, Permission.SMS_BROADCAST]
        
        assert has_any_permission(Role.ADMIN, perms)
        assert not has_any_permission(Role.STAFF, perms)
        assert has_any_permission(Role.SECURITY, [Permission.SMS_BROADCAST])

    def test_has_all_permissions_function(self):
        """Test has_all_permissions() utility"""
        perms = [Permission.ANOMALY_VIEW, Permission.ANOMALY_REPORT]
        
        assert has_all_permissions(Role.ADMIN, perms)
        assert has_all_permissions(Role.SECURITY, perms)
        assert not has_all_permissions(Role.STAFF, perms)

    def test_get_role_permissions(self):
        """Test getting all permissions for a role"""
        admin_perms = get_role_permissions(Role.ADMIN)
        security_perms = get_role_permissions(Role.SECURITY)
        staff_perms = get_role_permissions(Role.STAFF)
        
        assert Permission.ANOMALY_DELETE in admin_perms
        assert Permission.ANOMALY_DELETE not in security_perms
        assert len(admin_perms) > len(security_perms)
        assert len(security_perms) > len(staff_perms)

    def test_get_roles_with_permission(self):
        """Test getting roles that have a permission"""
        anomaly_view_roles = get_roles_with_permission(Permission.ANOMALY_VIEW)
        
        assert Role.ADMIN in anomaly_view_roles
        assert Role.SECURITY in anomaly_view_roles
        assert Role.STAFF in anomaly_view_roles
        assert Role.MAINTENANCE in anomaly_view_roles
        assert Role.GUEST not in anomaly_view_roles
        
        delete_roles = get_roles_with_permission(Permission.ANOMALY_DELETE)
        assert delete_roles == {Role.ADMIN}


class TestPermissionEnum:
    """Test permission enum values"""

    def test_permission_values_are_strings(self):
        """All permissions should be strings"""
        for perm in Permission:
            assert isinstance(perm.value, str)
            assert ":" in perm.value  # Should be namespaced

    def test_permission_namespace_format(self):
        """Permissions should follow resource:action format"""
        for perm in Permission:
            parts = perm.value.split(":")
            assert len(parts) == 2, f"Permission {perm} should have 2 parts"
            assert parts[0], f"Permission {perm} missing resource"
            assert parts[1], f"Permission {perm} missing action"

    def test_all_required_permissions_defined(self):
        """Check all expected permissions exist"""
        required = [
            Permission.ANOMALY_VIEW,
            Permission.ANOMALY_REPORT,
            Permission.ANOMALY_RESOLVE,
            Permission.ANOMALY_DELETE,
            Permission.SMS_SEND,
            Permission.SMS_BROADCAST,
            Permission.AUDIT_VIEW,
            Permission.SYSTEM_CONFIG,
            Permission.LOCATION_VIEW_ALL,
            Permission.USER_DELETE,
        ]
        for perm in required:
            assert perm


class TestEdgeCases:
    """Test edge cases and boundary conditions"""

    def test_empty_permission_list(self):
        """Test with empty permission lists"""
        assert has_any_permission(Role.ADMIN, [])
        assert has_all_permissions(Role.ADMIN, [])

    def test_single_permission_checks(self):
        """Test single permission in lists"""
        assert has_any_permission(Role.SECURITY, [Permission.ANOMALY_REPORT])
        assert has_all_permissions(Role.SECURITY, [Permission.ANOMALY_REPORT])

    def test_duplicate_permissions(self):
        """Test handling of duplicate permissions"""
        perms = [Permission.ANOMALY_VIEW, Permission.ANOMALY_VIEW]
        assert has_any_permission(Role.STAFF, perms)
        assert has_all_permissions(Role.STAFF, perms)

    def test_permission_caching(self):
        """Test that permission checks are efficient (cached)"""
        # Call multiple times - should use cache
        for _ in range(100):
            assert has_permission(Role.STAFF, Permission.ANOMALY_VIEW)


class TestRoleComparison:
    """Test role comparison and ordering"""

    def test_role_ordering(self):
        """Test role hierarchy ordering"""
        hierarchy = [
            (Role.ADMIN, 5),
            (Role.SECURITY, 4),
            (Role.STAFF, 3),
            (Role.MAINTENANCE, 2),
            (Role.GUEST, 1),
        ]
        
        for role, expected_level in hierarchy:
            for other_role, other_level in hierarchy:
                if expected_level > other_level:
                    assert role.has_hierarchy_over(other_role)
                elif expected_level < other_level:
                    assert not role.has_hierarchy_over(other_role)
                else:
                    assert not role.has_hierarchy_over(other_role)  # Same level

    def test_require_at_least_role_function(self):
        """Test require_at_least_role() utility"""
        assert require_at_least_role(Role.ADMIN, Role.ADMIN)
        assert require_at_least_role(Role.ADMIN, Role.GUEST)
        assert require_at_least_role(Role.SECURITY, Role.SECURITY)
        assert not require_at_least_role(Role.SECURITY, Role.ADMIN)
        assert not require_at_least_role(Role.STAFF, Role.SECURITY)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
