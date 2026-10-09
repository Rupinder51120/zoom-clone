"""Single-process room registry. SQLite stores history; sockets live in memory."""

import asyncio
from dataclasses import dataclass

from fastapi import WebSocket


@dataclass
class RoomPolicy:
    waiting_room: bool = False
    locked: bool = False
    unmute: bool = True
    video: bool = True
    chat: bool = True
    rename: bool = True
    share: bool = True
    hide_avatars: bool = False


@dataclass
class Connection:
    socket: WebSocket
    participant: dict
    waiting: bool = False
    last_chat: float = 0
    last_reaction: float = 0


class RoomRegistry:
    def __init__(self):
        self.rooms: dict[str, dict[str, Connection]] = {}
        self.policies: dict[str, RoomPolicy] = {}
        self.chat: dict[str, list[dict]] = {}
        # Serializes admission and control commands, avoiding two hosts/racing end events.
        self.lock = asyncio.Lock()

    async def broadcast(self, code: str, message: dict, exclude: str | None = None):
        for participant_id, connection in list(self.rooms.get(code, {}).items()):
            if participant_id != exclude and (
                not connection.waiting or message["type"] in ("policy", "ended")
            ):
                try:
                    await connection.socket.send_json(message)
                except (RuntimeError, OSError):
                    pass  # The receiver loop performs disconnect cleanup.

    def peers(self, code: str):
        return [
            c.participant for c in self.rooms.get(code, {}).values() if not c.waiting
        ]

    def policy(self, code: str):
        return self.policies.setdefault(code, RoomPolicy())

    async def waiting_list(self, code: str):
        waiting = [
            c.participant for c in self.rooms.get(code, {}).values() if c.waiting
        ]
        for c in self.rooms.get(code, {}).values():
            if c.participant["role"] == "host":
                await c.socket.send_json({"type": "waiting_list", "peers": waiting})


registry = RoomRegistry()
