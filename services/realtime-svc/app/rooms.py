"""
Room Management

Manages WebSocket rooms with Redis-backed state for distributed deployments.
Supports session rooms, class rooms, broadcast rooms, and analytics rooms.
"""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional, Set

import redis.asyncio as redis
import structlog

from app.config import Settings, get_settings
from app.models import RoomInfo, RoomMember, RoomMessage, RoomType

logger = structlog.get_logger()


class RoomManager:
    """
    Manages WebSocket rooms with Redis-backed distributed state.

    Features:
    - Room creation and cleanup
    - Member management
    - Message history
    - Room metadata
    - Access control
    """

    def __init__(
        self,
        redis_client: redis.Redis,
        settings: Optional[Settings] = None,
    ):
        """
        Initialize the room manager.

        Args:
            redis_client: Async Redis client
            settings: Application settings
        """
        self.redis = redis_client
        self.settings = settings or get_settings()
        self._key_prefix = f"{self.settings.redis_key_prefix}room:"

        logger.info("RoomManager initialized")

    # =========================================================================
    # ROOM OPERATIONS
    # =========================================================================

    async def create_room(
        self,
        room_id: str,
        room_type: RoomType,
        max_members: Optional[int] = None,
        persistent: bool = False,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> RoomInfo:
        """
        Create a new room.

        Args:
            room_id: Unique room identifier
            room_type: Type of room
            max_members: Maximum allowed members
            persistent: Whether to persist messages
            metadata: Additional room metadata

        Returns:
            RoomInfo for the created room
        """
        now = datetime.utcnow()

        room_info = RoomInfo(
            room_id=room_id,
            room_type=room_type,
            created_at=now,
            last_activity=now,
            max_members=max_members or self.settings.room_max_members,
            persistent=persistent,
            metadata=metadata or {},
        )

        # Store room info in Redis
        key = f"{self._key_prefix}{room_id}:info"
        await self.redis.setex(
            key,
            self.settings.room_ttl,
            room_info.model_dump_json(),
        )

        logger.info(
            "Room created",
            room_id=room_id,
            room_type=room_type.value,
        )

        return room_info

    async def get_room_info(self, room_id: str) -> Optional[RoomInfo]:
        """
        Get room information.

        Args:
            room_id: Room identifier

        Returns:
            RoomInfo or None if not found
        """
        key = f"{self._key_prefix}{room_id}:info"
        data = await self.redis.get(key)

        if data:
            return RoomInfo.model_validate_json(data)

        return None

    async def get_or_create_room(
        self,
        room_id: str,
        room_type: RoomType,
        **kwargs,
    ) -> RoomInfo:
        """
        Get existing room or create a new one.

        Args:
            room_id: Room identifier
            room_type: Type of room
            **kwargs: Additional arguments for room creation

        Returns:
            RoomInfo for the room
        """
        room_info = await self.get_room_info(room_id)

        if not room_info:
            room_info = await self.create_room(room_id, room_type, **kwargs)

        return room_info

    async def delete_room(self, room_id: str) -> bool:
        """
        Delete a room and all associated data.

        Args:
            room_id: Room to delete

        Returns:
            True if deleted
        """
        keys = [
            f"{self._key_prefix}{room_id}:info",
            f"{self._key_prefix}{room_id}:members",
            f"{self._key_prefix}{room_id}:messages",
            f"{self._key_prefix}{room_id}:metadata",
            f"{self.settings.redis_key_prefix}room:{room_id}:connections",
        ]

        await self.redis.delete(*keys)

        logger.info("Room deleted", room_id=room_id)

        return True

    async def update_room_metadata(
        self,
        room_id: str,
        metadata: Dict[str, Any],
    ) -> bool:
        """
        Update room metadata.

        Args:
            room_id: Room to update
            metadata: New metadata to merge

        Returns:
            True if updated
        """
        room_info = await self.get_room_info(room_id)
        if not room_info:
            return False

        room_info.metadata.update(metadata)
        room_info.last_activity = datetime.utcnow()

        key = f"{self._key_prefix}{room_id}:info"
        await self.redis.setex(
            key,
            self.settings.room_ttl,
            room_info.model_dump_json(),
        )

        return True

    # =========================================================================
    # MEMBER OPERATIONS
    # =========================================================================

    async def add_member(
        self,
        room_id: str,
        connection_id: str,
        learner_id: str,
        display_name: Optional[str] = None,
        role: Optional[str] = None,
    ) -> bool:
        """
        Add a member to a room.

        Args:
            room_id: Room to join
            connection_id: Connection ID
            learner_id: Learner ID
            display_name: Optional display name
            role: Optional role in room

        Returns:
            True if added successfully
        """
        # Check room exists and has capacity
        room_info = await self.get_room_info(room_id)
        if not room_info:
            # Auto-create session rooms
            if room_id.startswith("session:"):
                room_info = await self.create_room(room_id, RoomType.SESSION)
            else:
                return False

        if room_info.max_members and room_info.member_count >= room_info.max_members:
            logger.warning(
                "Room at capacity",
                room_id=room_id,
                max_members=room_info.max_members,
            )
            return False

        # Create member record
        member = RoomMember(
            connection_id=connection_id,
            learner_id=learner_id,
            display_name=display_name,
            joined_at=datetime.utcnow(),
            role=role,
        )

        # Add to members hash
        key = f"{self._key_prefix}{room_id}:members"
        await self.redis.hset(key, connection_id, member.model_dump_json())
        await self.redis.expire(key, self.settings.room_ttl)

        # Update room info
        room_info.member_count = await self.get_member_count(room_id)
        room_info.last_activity = datetime.utcnow()
        if connection_id not in room_info.connections:
            room_info.connections.append(connection_id)

        info_key = f"{self._key_prefix}{room_id}:info"
        await self.redis.setex(
            info_key,
            self.settings.room_ttl,
            room_info.model_dump_json(),
        )

        logger.debug(
            "Member added to room",
            room_id=room_id,
            connection_id=connection_id,
            learner_id=learner_id,
        )

        return True

    async def remove_member(
        self,
        room_id: str,
        connection_id: str,
    ) -> bool:
        """
        Remove a member from a room.

        Args:
            room_id: Room to leave
            connection_id: Connection to remove

        Returns:
            True if removed
        """
        key = f"{self._key_prefix}{room_id}:members"
        await self.redis.hdel(key, connection_id)

        # Update room info
        room_info = await self.get_room_info(room_id)
        if room_info:
            room_info.member_count = await self.get_member_count(room_id)
            room_info.last_activity = datetime.utcnow()
            if connection_id in room_info.connections:
                room_info.connections.remove(connection_id)

            info_key = f"{self._key_prefix}{room_id}:info"
            await self.redis.setex(
                info_key,
                self.settings.room_ttl,
                room_info.model_dump_json(),
            )

            # Cleanup empty rooms (except persistent ones)
            if room_info.member_count == 0 and not room_info.persistent:
                await self.delete_room(room_id)

        logger.debug(
            "Member removed from room",
            room_id=room_id,
            connection_id=connection_id,
        )

        return True

    async def get_members(self, room_id: str) -> List[RoomMember]:
        """
        Get all members in a room.

        Args:
            room_id: Room identifier

        Returns:
            List of RoomMember objects
        """
        key = f"{self._key_prefix}{room_id}:members"
        members_data = await self.redis.hgetall(key)

        members = []
        for data in members_data.values():
            if isinstance(data, bytes):
                data = data.decode()
            members.append(RoomMember.model_validate_json(data))

        return members

    async def get_member(
        self,
        room_id: str,
        connection_id: str,
    ) -> Optional[RoomMember]:
        """
        Get a specific member from a room.

        Args:
            room_id: Room identifier
            connection_id: Connection ID

        Returns:
            RoomMember or None
        """
        key = f"{self._key_prefix}{room_id}:members"
        data = await self.redis.hget(key, connection_id)

        if data:
            if isinstance(data, bytes):
                data = data.decode()
            return RoomMember.model_validate_json(data)

        return None

    async def get_member_count(self, room_id: str) -> int:
        """
        Get the number of members in a room.

        Args:
            room_id: Room identifier

        Returns:
            Number of members
        """
        key = f"{self._key_prefix}{room_id}:members"
        return await self.redis.hlen(key)

    async def is_member(
        self,
        room_id: str,
        connection_id: str,
    ) -> bool:
        """
        Check if a connection is a member of a room.

        Args:
            room_id: Room identifier
            connection_id: Connection to check

        Returns:
            True if member
        """
        key = f"{self._key_prefix}{room_id}:members"
        return await self.redis.hexists(key, connection_id)

    # =========================================================================
    # MESSAGE OPERATIONS
    # =========================================================================

    async def add_message(
        self,
        room_id: str,
        sender_id: str,
        content: Dict[str, Any],
        sender_name: Optional[str] = None,
    ) -> RoomMessage:
        """
        Add a message to room history.

        Args:
            room_id: Room identifier
            sender_id: Sender's ID
            content: Message content
            sender_name: Optional sender name

        Returns:
            The created RoomMessage
        """
        message = RoomMessage(
            room_id=room_id,
            sender_id=sender_id,
            sender_name=sender_name,
            content=content,
        )

        # Add to message list
        key = f"{self._key_prefix}{room_id}:messages"
        await self.redis.lpush(key, message.model_dump_json())

        # Trim to limit
        await self.redis.ltrim(key, 0, self.settings.room_message_history_limit - 1)
        await self.redis.expire(key, self.settings.room_ttl)

        return message

    async def get_messages(
        self,
        room_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> List[RoomMessage]:
        """
        Get message history for a room.

        Args:
            room_id: Room identifier
            limit: Maximum messages to return
            offset: Offset from newest message

        Returns:
            List of RoomMessage objects (newest first)
        """
        key = f"{self._key_prefix}{room_id}:messages"
        messages_data = await self.redis.lrange(key, offset, offset + limit - 1)

        messages = []
        for data in messages_data:
            if isinstance(data, bytes):
                data = data.decode()
            messages.append(RoomMessage.model_validate_json(data))

        return messages

    # =========================================================================
    # ROOM QUERIES
    # =========================================================================

    async def get_rooms_for_learner(self, learner_id: str) -> List[str]:
        """
        Get all rooms a learner is in.

        Args:
            learner_id: Learner identifier

        Returns:
            List of room IDs
        """
        # This would require scanning or maintaining a separate index
        # For now, we'll use a pattern scan (not ideal for production)
        rooms = []
        pattern = f"{self._key_prefix}*:members"

        async for key in self.redis.scan_iter(match=pattern):
            key_str = key.decode() if isinstance(key, bytes) else key
            room_id = key_str.replace(self._key_prefix, "").replace(":members", "")

            members_data = await self.redis.hgetall(key)
            for data in members_data.values():
                if isinstance(data, bytes):
                    data = data.decode()
                member = RoomMember.model_validate_json(data)
                if member.learner_id == learner_id:
                    rooms.append(room_id)
                    break

        return rooms

    async def get_active_rooms(
        self,
        room_type: Optional[RoomType] = None,
        min_members: int = 1,
    ) -> List[RoomInfo]:
        """
        Get active rooms, optionally filtered by type.

        Args:
            room_type: Optional room type filter
            min_members: Minimum number of members

        Returns:
            List of RoomInfo objects
        """
        rooms = []
        pattern = f"{self._key_prefix}*:info"

        async for key in self.redis.scan_iter(match=pattern):
            data = await self.redis.get(key)
            if data:
                if isinstance(data, bytes):
                    data = data.decode()
                room_info = RoomInfo.model_validate_json(data)

                # Apply filters
                if room_type and room_info.room_type != room_type:
                    continue
                if room_info.member_count < min_members:
                    continue

                rooms.append(room_info)

        return rooms

    # =========================================================================
    # CLEANUP
    # =========================================================================

    async def cleanup_stale_rooms(
        self,
        max_idle_seconds: int = 3600,
    ) -> int:
        """
        Clean up rooms that have been idle for too long.

        Args:
            max_idle_seconds: Maximum idle time before cleanup

        Returns:
            Number of rooms cleaned up
        """
        cleaned = 0
        now = datetime.utcnow()
        pattern = f"{self._key_prefix}*:info"

        async for key in self.redis.scan_iter(match=pattern):
            data = await self.redis.get(key)
            if data:
                if isinstance(data, bytes):
                    data = data.decode()
                room_info = RoomInfo.model_validate_json(data)

                # Skip persistent rooms
                if room_info.persistent:
                    continue

                # Check idle time
                idle_seconds = (now - room_info.last_activity).total_seconds()
                if idle_seconds > max_idle_seconds:
                    await self.delete_room(room_info.room_id)
                    cleaned += 1

        if cleaned > 0:
            logger.info("Stale rooms cleaned up", count=cleaned)

        return cleaned
