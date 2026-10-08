"""Single-process room registry. SQLite stores history; sockets live in memory."""

import asyncio
from dataclasses import dataclass

from fastapi import WebSocket


@dataclass
class Connection:
    socket: WebSocket
    participant: dict


class RoomRegistry:
    def __init__(self):
        self.rooms: dict[str, dict[str, Connection]] = {}
        # Serializes admission and control commands, avoiding two hosts/racing end events.
        self.lock = asyncio.Lock()

    async def broadcast(self, code: str, message: dict, exclude: str | None = None):
        for participant_id, connection in list(self.rooms.get(code, {}).items()):
            if participant_id != exclude:
                try:
                    await connection.socket.send_json(message)
                except (RuntimeError, OSError):
                    pass  # The receiver loop performs disconnect cleanup.

    def peers(self, code: str):
        return [c.participant for c in self.rooms.get(code, {}).values()]


registry = RoomRegistry()
