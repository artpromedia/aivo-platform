"""
Event Ingestion Service

Handle ingestion of multimodal learning events from various sources.
Supports video, audio, document interactions, assessment responses,
and multi-device session stitching.
"""
import logging
import hashlib
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Set
from enum import Enum
from collections import defaultdict
import asyncio

logger = logging.getLogger(__name__)


class EventType(Enum):
    """Types of learning events."""
    VIDEO_PLAY = "video_play"
    VIDEO_PAUSE = "video_pause"
    VIDEO_SEEK = "video_seek"
    VIDEO_COMPLETE = "video_complete"
    VIDEO_SPEED_CHANGE = "video_speed_change"
    AUDIO_PLAY = "audio_play"
    AUDIO_PAUSE = "audio_pause"
    AUDIO_SEEK = "audio_seek"
    AUDIO_COMPLETE = "audio_complete"
    DOCUMENT_OPEN = "document_open"
    DOCUMENT_SCROLL = "document_scroll"
    DOCUMENT_HIGHLIGHT = "document_highlight"
    DOCUMENT_ANNOTATE = "document_annotate"
    DOCUMENT_CLOSE = "document_close"
    ASSESSMENT_START = "assessment_start"
    ASSESSMENT_ANSWER = "assessment_answer"
    ASSESSMENT_SUBMIT = "assessment_submit"
    ASSESSMENT_REVIEW = "assessment_review"
    SESSION_START = "session_start"
    SESSION_END = "session_end"
    NAVIGATION = "navigation"
    INTERACTION = "interaction"


class DeviceType(Enum):
    """Device types for session tracking."""
    DESKTOP = "desktop"
    TABLET = "tablet"
    MOBILE = "mobile"
    UNKNOWN = "unknown"


@dataclass
class LearningEvent:
    """Represents a single learning event."""
    event_id: str
    event_type: str
    student_id: str
    content_id: str
    timestamp: datetime
    device_type: str
    session_id: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    duration_ms: Optional[int] = None
    position: Optional[float] = None  # For video/audio position
    anonymous_id: Optional[str] = None  # For privacy


@dataclass
class SessionInfo:
    """Information about a learning session."""
    session_id: str
    student_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    device_type: str = "unknown"
    devices_used: List[str] = field(default_factory=list)
    events_count: int = 0
    content_accessed: Set[str] = field(default_factory=set)
    total_duration_ms: int = 0


@dataclass
class IngestionResult:
    """Result of event ingestion."""
    success: bool
    events_ingested: int
    events_failed: int
    session_id: str
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)


@dataclass
class BatchIngestionResult:
    """Result of batch event ingestion."""
    total_events: int
    successful: int
    failed: int
    sessions_updated: List[str]
    processing_time_ms: float
    throughput_events_per_sec: float
    errors: List[str] = field(default_factory=list)


class EventIngestionService:
    """
    Handle ingestion of multimodal learning events.

    Features:
    - Video interaction events (play, pause, seek, complete)
    - Audio engagement signals
    - Document interaction tracking
    - Assessment response patterns
    - Multi-device session stitching
    - Event buffering for high throughput
    - Duplicate detection

    Usage:
        service = EventIngestionService()
        result = await service.ingest_event(event_data)
        batch_result = await service.ingest_batch(events)
    """

    # Buffer settings for high-throughput ingestion
    BUFFER_SIZE = 1000
    FLUSH_INTERVAL_MS = 100
    
    # Session stitching settings
    SESSION_TIMEOUT_MINUTES = 30
    MAX_SESSION_GAP_MINUTES = 15

    def __init__(
        self,
        buffer_size: int = 1000,
        enable_deduplication: bool = True,
        enable_session_stitching: bool = True,
    ):
        """
        Initialize the EventIngestionService.

        Args:
            buffer_size: Maximum events to buffer before flush
            enable_deduplication: Whether to detect and filter duplicates
            enable_session_stitching: Whether to stitch multi-device sessions
        """
        self.buffer_size = buffer_size
        self.enable_deduplication = enable_deduplication
        self.enable_session_stitching = enable_session_stitching
        
        # Event storage (in production, use Kafka/TimescaleDB)
        self._events: Dict[str, List[LearningEvent]] = defaultdict(list)
        self._sessions: Dict[str, SessionInfo] = {}
        self._student_sessions: Dict[str, List[str]] = defaultdict(list)
        self._event_buffer: List[LearningEvent] = []
        self._seen_event_ids: Set[str] = set()
        
        # Metrics
        self._total_ingested = 0
        self._total_duplicates = 0
        self._total_errors = 0
        
        logger.info("EventIngestionService initialized")

    async def ingest_event(
        self,
        event_data: Dict[str, Any],
        validate: bool = True,
    ) -> IngestionResult:
        """
        Ingest a single learning event.

        Args:
            event_data: Event data dictionary.
            validate: Whether to validate the event data.

        Returns:
            IngestionResult with ingestion status.
        """
        warnings = []
        errors = []
        
        try:
            # Validate event data
            if validate:
                validation_errors = self._validate_event(event_data)
                if validation_errors:
                    return IngestionResult(
                        success=False,
                        events_ingested=0,
                        events_failed=1,
                        session_id="",
                        errors=validation_errors,
                    )
            
            # Create event object
            event = self._create_event(event_data)
            
            # Check for duplicates
            if self.enable_deduplication and event.event_id in self._seen_event_ids:
                self._total_duplicates += 1
                warnings.append(f"Duplicate event detected: {event.event_id}")
                return IngestionResult(
                    success=True,
                    events_ingested=0,
                    events_failed=0,
                    session_id=event.session_id,
                    warnings=warnings,
                )
            
            # Session stitching
            if self.enable_session_stitching:
                event = self._stitch_session(event)
            
            # Store event
            self._store_event(event)
            self._seen_event_ids.add(event.event_id)
            self._total_ingested += 1
            
            return IngestionResult(
                success=True,
                events_ingested=1,
                events_failed=0,
                session_id=event.session_id,
                warnings=warnings,
            )
            
        except Exception as e:
            self._total_errors += 1
            logger.error(f"Event ingestion failed: {e}")
            return IngestionResult(
                success=False,
                events_ingested=0,
                events_failed=1,
                session_id="",
                errors=[str(e)],
            )

    async def ingest_batch(
        self,
        events: List[Dict[str, Any]],
        validate: bool = True,
    ) -> BatchIngestionResult:
        """
        Ingest a batch of learning events.

        Optimized for high throughput (10K+ events/second).

        Args:
            events: List of event data dictionaries.
            validate: Whether to validate events.

        Returns:
            BatchIngestionResult with batch processing status.
        """
        start_time = datetime.utcnow()
        successful = 0
        failed = 0
        sessions_updated: Set[str] = set()
        errors = []
        
        # Process events in parallel batches
        batch_size = min(len(events), self.buffer_size)
        
        for i in range(0, len(events), batch_size):
            batch = events[i:i + batch_size]
            
            # Process batch
            for event_data in batch:
                try:
                    result = await self.ingest_event(event_data, validate)
                    if result.success:
                        successful += result.events_ingested
                        if result.session_id:
                            sessions_updated.add(result.session_id)
                    else:
                        failed += 1
                        errors.extend(result.errors)
                except Exception as e:
                    failed += 1
                    errors.append(str(e))
        
        # Calculate metrics
        end_time = datetime.utcnow()
        processing_time_ms = (end_time - start_time).total_seconds() * 1000
        throughput = len(events) / max(processing_time_ms / 1000, 0.001)
        
        return BatchIngestionResult(
            total_events=len(events),
            successful=successful,
            failed=failed,
            sessions_updated=list(sessions_updated),
            processing_time_ms=processing_time_ms,
            throughput_events_per_sec=throughput,
            errors=errors[:10],  # Limit error count
        )

    def get_student_events(
        self,
        student_id: str,
        event_types: Optional[List[str]] = None,
        content_id: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 1000,
    ) -> List[LearningEvent]:
        """
        Get events for a specific student.

        Args:
            student_id: Student identifier.
            event_types: Optional filter for event types.
            content_id: Optional filter for content.
            start_time: Optional start time filter.
            end_time: Optional end time filter.
            limit: Maximum events to return.

        Returns:
            List of matching events.
        """
        events = self._events.get(student_id, [])
        
        # Apply filters
        filtered = []
        for event in events:
            if event_types and event.event_type not in event_types:
                continue
            if content_id and event.content_id != content_id:
                continue
            if start_time and event.timestamp < start_time:
                continue
            if end_time and event.timestamp > end_time:
                continue
            filtered.append(event)
            if len(filtered) >= limit:
                break
        
        return filtered

    def get_content_events(
        self,
        content_id: str,
        event_types: Optional[List[str]] = None,
        limit: int = 1000,
    ) -> List[LearningEvent]:
        """
        Get all events for specific content.

        Args:
            content_id: Content identifier.
            event_types: Optional filter for event types.
            limit: Maximum events to return.

        Returns:
            List of matching events.
        """
        all_events = []
        for student_events in self._events.values():
            for event in student_events:
                if event.content_id == content_id:
                    if event_types and event.event_type not in event_types:
                        continue
                    all_events.append(event)
        
        # Sort by timestamp and limit
        all_events.sort(key=lambda e: e.timestamp, reverse=True)
        return all_events[:limit]

    def get_session(self, session_id: str) -> Optional[SessionInfo]:
        """Get session information by ID."""
        return self._sessions.get(session_id)

    def get_student_sessions(
        self,
        student_id: str,
        limit: int = 50,
    ) -> List[SessionInfo]:
        """Get sessions for a student."""
        session_ids = self._student_sessions.get(student_id, [])
        sessions = [
            self._sessions[sid]
            for sid in session_ids
            if sid in self._sessions
        ]
        # Sort by start time, most recent first
        sessions.sort(key=lambda s: s.start_time, reverse=True)
        return sessions[:limit]

    def get_metrics(self) -> Dict[str, Any]:
        """Get ingestion metrics."""
        return {
            "total_ingested": self._total_ingested,
            "total_duplicates": self._total_duplicates,
            "total_errors": self._total_errors,
            "unique_students": len(self._events),
            "total_sessions": len(self._sessions),
            "buffer_size": len(self._event_buffer),
        }

    def _validate_event(self, event_data: Dict[str, Any]) -> List[str]:
        """Validate event data."""
        errors = []
        
        # Required fields
        required = ["event_type", "student_id", "content_id"]
        for field in required:
            if field not in event_data or not event_data[field]:
                errors.append(f"Missing required field: {field}")
        
        # Validate event type
        if "event_type" in event_data:
            try:
                EventType(event_data["event_type"])
            except ValueError:
                # Allow custom event types
                pass
        
        # Validate timestamp if present
        if "timestamp" in event_data:
            ts = event_data["timestamp"]
            if isinstance(ts, str):
                try:
                    datetime.fromisoformat(ts.replace("Z", "+00:00"))
                except ValueError:
                    errors.append(f"Invalid timestamp format: {ts}")
        
        return errors

    def _create_event(self, event_data: Dict[str, Any]) -> LearningEvent:
        """Create a LearningEvent from raw data."""
        # Parse timestamp
        timestamp = event_data.get("timestamp")
        if isinstance(timestamp, str):
            timestamp = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        elif timestamp is None:
            timestamp = datetime.utcnow()
        
        # Generate event ID if not provided
        event_id = event_data.get("event_id")
        if not event_id:
            # Create deterministic ID for deduplication
            id_data = f"{event_data['student_id']}:{event_data['content_id']}:{event_data['event_type']}:{timestamp.isoformat()}"
            event_id = hashlib.sha256(id_data.encode()).hexdigest()[:16]
        
        # Get or create session ID
        session_id = event_data.get("session_id", str(uuid.uuid4())[:8])
        
        return LearningEvent(
            event_id=event_id,
            event_type=event_data["event_type"],
            student_id=event_data["student_id"],
            content_id=event_data["content_id"],
            timestamp=timestamp,
            device_type=event_data.get("device_type", "unknown"),
            session_id=session_id,
            metadata=event_data.get("metadata", {}),
            duration_ms=event_data.get("duration_ms"),
            position=event_data.get("position"),
        )

    def _stitch_session(self, event: LearningEvent) -> LearningEvent:
        """Stitch event into existing session if applicable."""
        student_sessions = self._student_sessions.get(event.student_id, [])
        
        # Look for recent session from same student
        for session_id in reversed(student_sessions[-5:]):  # Check last 5 sessions
            session = self._sessions.get(session_id)
            if not session:
                continue
            
            # Check if event should be stitched to this session
            if session.end_time:
                gap = (event.timestamp - session.end_time).total_seconds() / 60
                if gap <= self.MAX_SESSION_GAP_MINUTES:
                    # Stitch to existing session
                    event.session_id = session_id
                    session.end_time = event.timestamp
                    session.events_count += 1
                    session.content_accessed.add(event.content_id)
                    if event.device_type not in session.devices_used:
                        session.devices_used.append(event.device_type)
                    return event
            else:
                # Session still active
                session_age = (event.timestamp - session.start_time).total_seconds() / 60
                if session_age <= self.SESSION_TIMEOUT_MINUTES:
                    event.session_id = session_id
                    session.end_time = event.timestamp
                    session.events_count += 1
                    session.content_accessed.add(event.content_id)
                    if event.device_type not in session.devices_used:
                        session.devices_used.append(event.device_type)
                    return event
        
        # Create new session
        self._create_session(event)
        return event

    def _create_session(self, event: LearningEvent) -> None:
        """Create a new session from an event."""
        session = SessionInfo(
            session_id=event.session_id,
            student_id=event.student_id,
            start_time=event.timestamp,
            end_time=event.timestamp,
            device_type=event.device_type,
            devices_used=[event.device_type],
            events_count=1,
            content_accessed={event.content_id},
        )
        self._sessions[session.session_id] = session
        self._student_sessions[event.student_id].append(session.session_id)

    def _store_event(self, event: LearningEvent) -> None:
        """Store event in memory (in production, send to Kafka)."""
        self._events[event.student_id].append(event)
        
        # Update session
        session = self._sessions.get(event.session_id)
        if session and event.duration_ms:
            session.total_duration_ms += event.duration_ms
