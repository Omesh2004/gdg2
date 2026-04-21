import asyncio
import re
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

from app.core.rbac_middleware import require_roles, require_permission
from app.core.rbac import Role, Permission
from app.core.auth import get_current_user
from app.services.auth_service import AuthProfile

from app.services.twilio_service import twilio_service

router = APIRouter()

E164_PATTERN = re.compile(r"^\+[1-9]\d{7,14}$")


def _normalize_phone(value: str) -> str:
    normalized = re.sub(r"[\s\-().]", "", value)
    if not E164_PATTERN.match(normalized):
        raise ValueError("Phone number must be valid E.164 format (example: +15551234567)")
    return normalized


class SMSRequest(BaseModel):
    to_phone: str = Field(..., description="Recipient phone number in E.164 format")
    message: str = Field(..., min_length=1, max_length=1000)

    @field_validator("to_phone")
    @classmethod
    def validate_to_phone(cls, value: str) -> str:
        return _normalize_phone(value)

    @field_validator("message")
    @classmethod
    def validate_message(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Message cannot be empty")
        return cleaned


class BroadcastSMSRequest(BaseModel):
    users: List[str] = Field(..., min_length=1, max_length=1000)
    message: str = Field(..., min_length=1, max_length=1000)
    max_concurrency: int = Field(default=10, ge=1, le=50)

    @field_validator("message")
    @classmethod
    def validate_broadcast_message(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Message cannot be empty")
        return cleaned


@router.post("/send", dependencies=[Depends(require_roles(Role.ADMIN, Role.SECURITY))])
async def send_sms(payload: SMSRequest, user: AuthProfile = Depends(get_current_user)):
    if not twilio_service.is_configured():
        raise HTTPException(status_code=500, detail="Twilio configuration is missing in backend environment")

    try:
        sid = await twilio_service.send_sms(to_phone=payload.to_phone, message=payload.message)
        return {"status": "sent", "sid": sid}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to send SMS: {exc}")


@router.post("/broadcast", dependencies=[Depends(require_roles(Role.ADMIN, Role.SECURITY))])
async def broadcast_sms(payload: BroadcastSMSRequest, user: AuthProfile = Depends(get_current_user)):
    if not twilio_service.is_configured():
        raise HTTPException(status_code=500, detail="Twilio configuration is missing in backend environment")

    unique_numbers: List[str] = []
    invalid_numbers: List[str] = []
    duplicate_numbers: List[str] = []
    seen = set()

    for number in payload.users:
        try:
            normalized = _normalize_phone(number)
        except ValueError:
            invalid_numbers.append(number)
            continue

        if normalized in seen:
            duplicate_numbers.append(normalized)
            continue

        seen.add(normalized)
        unique_numbers.append(normalized)

    if not unique_numbers:
        return {
            "status": "no_valid_numbers",
            "summary": {
                "requested": len(payload.users),
                "deduplicated_valid": 0,
                "invalid": len(invalid_numbers),
                "duplicates": len(duplicate_numbers),
                "sent": 0,
                "failed": 0,
            },
            "invalid_numbers": invalid_numbers,
            "duplicate_numbers": duplicate_numbers,
            "results": [],
        }

    semaphore = asyncio.Semaphore(payload.max_concurrency)

    async def _send_one(phone: str) -> dict:
        async with semaphore:
            try:
                sid = await twilio_service.send_sms(to_phone=phone, message=payload.message)
                return {"phone": phone, "status": "sent", "sid": sid}
            except Exception as exc:
                return {"phone": phone, "status": "failed", "error": str(exc)}

    results = await asyncio.gather(*[_send_one(phone) for phone in unique_numbers])

    sent_count = sum(1 for item in results if item["status"] == "sent")
    failed_count = len(results) - sent_count

    status = "completed" if failed_count == 0 else "completed_with_errors"

    return {
        "status": status,
        "summary": {
            "requested": len(payload.users),
            "deduplicated_valid": len(unique_numbers),
            "invalid": len(invalid_numbers),
            "duplicates": len(duplicate_numbers),
            "sent": sent_count,
            "failed": failed_count,
        },
        "invalid_numbers": invalid_numbers,
        "duplicate_numbers": duplicate_numbers,
        "results": results,
    }