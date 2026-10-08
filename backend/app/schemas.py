from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, Field, field_validator


class MeetingCreate(BaseModel):
    title: str = Field(default="My Meeting", min_length=1, max_length=200)
    description: str = Field(default="", max_length=5000)
    scheduled_start: datetime | None = None
    timezone: str = "Asia/Kolkata"
    duration_minutes: int = Field(default=40, ge=5, le=480)
    video_on: bool = True

    @field_validator("title")
    @classmethod
    def clean_title(cls, value):
        if not value.strip():
            raise ValueError("Topic is required")
        return value.strip()

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, value):
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError:
            raise ValueError("Invalid timezone")
        return value

    @field_validator("scheduled_start")
    @classmethod
    def aware_time(cls, value):
        if value and value.tzinfo is None:
            raise ValueError("Scheduled time must include a timezone offset")
        return value


class JoinRequest(BaseModel):
    display_name: str = Field(min_length=1, max_length=100)
    host_token: str | None = None

    @field_validator("display_name")
    @classmethod
    def clean_name(cls, value):
        if not value.strip():
            raise ValueError("Display name is required")
        return value.strip()


class ProfileUpdate(BaseModel):
    display_name: str = Field(min_length=1, max_length=100)
    timezone: str = "Asia/Kolkata"

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, value):
        return MeetingCreate.valid_timezone(value)

    @field_validator("display_name")
    @classmethod
    def clean_name(cls, value):
        return JoinRequest.clean_name(value)
