"""
Pytest configuration and shared fixtures for backend tests
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.auth_service import AuthProfile
from app.core.rbac import Role


@pytest.fixture
def client():
    """FastAPI test client for all endpoints"""
    return TestClient(app)


@pytest.fixture
def auth_profiles():
    """Sample authentication profiles for all roles"""
    return {
        "admin": AuthProfile(
            id="admin-user-1",
            email="admin@example.com",
            fullName="Admin User",
            role=Role.ADMIN.value,
            avatarUrl="https://example.com/admin.png",
        ),
        "security": AuthProfile(
            id="security-user-1",
            email="security@example.com",
            fullName="Security Officer",
            role=Role.SECURITY.value,
            avatarUrl="https://example.com/security.png",
        ),
        "staff": AuthProfile(
            id="staff-user-1",
            email="staff@example.com",
            fullName="Staff Member",
            role=Role.STAFF.value,
            avatarUrl="https://example.com/staff.png",
        ),
        "maintenance": AuthProfile(
            id="maint-user-1",
            email="maintenance@example.com",
            fullName="Maintenance",
            role=Role.MAINTENANCE.value,
            avatarUrl=None,
        ),
        "guest": AuthProfile(
            id="guest-user-1",
            email="guest@example.com",
            fullName="Guest User",
            role=Role.GUEST.value,
            avatarUrl=None,
        ),
    }


@pytest.fixture
def sample_anomaly_event():
    """Sample anomaly event for testing"""
    return {
        "camera_id": "camera-001",
        "anomaly_type": "Fire",
        "confidence": 0.95,
        "timestamp": "2026-04-21T10:30:00Z",
    }


@pytest.fixture
def sample_sms_payload():
    """Sample SMS payload for testing"""
    return {
        "to_phone": "+15551234567",
        "message": "Test emergency alert message",
    }


@pytest.fixture
def sample_location_update():
    """Sample location update payload"""
    return {
        "device_mac": "aa:bb:cc:dd:ee:ff",
        "floor": 2,
        "x": 10.5,
        "y": 20.3,
    }


@pytest.fixture
def valid_jwt_token(auth_profiles):
    """Create a valid JWT token for testing"""
    from app.core.auth import encode_signed_token, create_session_claims
    
    profile = auth_profiles["admin"]
    claims = create_session_claims(profile)
    return encode_signed_token(claims)


@pytest.fixture
def expired_jwt_token():
    """Create an expired JWT token"""
    from app.core.auth import encode_signed_token
    import time
    
    payload = {
        "sub": "user-1",
        "email": "test@example.com",
        "role": "admin",
        "iat": int(time.time()) - 86400,  # 1 day ago
        "exp": int(time.time()) - 3600,   # Expired 1 hour ago
    }
    return encode_signed_token(payload)


@pytest.fixture
def invalid_jwt_token():
    """Create an invalid JWT token"""
    return "invalid.token.format"
