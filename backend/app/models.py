from datetime import datetime, timezone

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def utc_now():
    return datetime.now(timezone.utc).isoformat()


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    display_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str | None] = mapped_column(Text)
    timezone: Mapped[str] = mapped_column(String(80), default="Asia/Kolkata")
    availability: Mapped[str] = mapped_column(String(20), default="Available")
    status_message: Mapped[str] = mapped_column(String(200), default="")
    work_location: Mapped[str] = mapped_column(String(20), default="Off")
    created_at: Mapped[str] = mapped_column(default=utc_now)
    meetings: Mapped[list["Meeting"]] = relationship(back_populates="host")


class Meeting(Base):
    __tablename__ = "meetings"
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(11), unique=True, index=True)
    host_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    scheduled_start: Mapped[str | None]
    timezone: Mapped[str] = mapped_column(String(80), default="Asia/Kolkata")
    duration_minutes: Mapped[int] = mapped_column(Integer, default=40)
    status: Mapped[str] = mapped_column(String(20), default="scheduled")
    host_token_hash: Mapped[str] = mapped_column(String(64))
    video_on: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[str] = mapped_column(default=utc_now)
    started_at: Mapped[str | None]
    ended_at: Mapped[str | None]
    host: Mapped[User] = relationship(back_populates="meetings")
    participants: Mapped[list["Participant"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan"
    )


class Participant(Base):
    __tablename__ = "participants"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id"), index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    display_name: Mapped[str] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(10), default="guest")
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    joined_at: Mapped[str | None]
    left_at: Mapped[str | None]
    removed_at: Mapped[str | None]
    meeting: Mapped[Meeting] = relationship(back_populates="participants")


class AuthSession(Base):
    __tablename__ = "auth_sessions"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[str]
