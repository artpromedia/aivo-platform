"""
WebSocket Metrics

Prometheus metrics for WebSocket connections, messages, and performance.
"""

import asyncio
from datetime import datetime
from typing import Optional

import structlog
from prometheus_client import Counter, Gauge, Histogram, Info

from app.config import Settings, get_settings

logger = structlog.get_logger()


class WebSocketMetrics:
    """
    Prometheus metrics for WebSocket service.

    Tracks:
    - Connection counts and lifecycle
    - Message throughput and latency
    - Room statistics
    - Intervention delivery
    - Error rates
    """

    def __init__(self, settings: Optional[Settings] = None):
        """
        Initialize metrics with Prometheus collectors.

        Args:
            settings: Application settings
        """
        self.settings = settings or get_settings()
        prefix = self.settings.metrics_prefix

        # Service info
        self.service_info = Info(
            f"{prefix}_service",
            "WebSocket service information",
        )
        self.service_info.info({
            "service": self.settings.service_name,
            "version": self.settings.service_version,
            "environment": self.settings.environment,
        })

        # Connection metrics
        self.connections_total = Counter(
            f"{prefix}_connections_total",
            "Total WebSocket connections",
            ["status"],  # connected, disconnected, rejected
        )

        self.active_connections = Gauge(
            f"{prefix}_active_connections",
            "Current active WebSocket connections",
        )

        self.connections_by_device = Gauge(
            f"{prefix}_connections_by_device",
            "Active connections by device type",
            ["device"],  # web, mobile, tablet
        )

        self.connections_by_tenant = Gauge(
            f"{prefix}_connections_by_tenant",
            "Active connections by tenant",
            ["tenant_id"],
        )

        self.connection_duration = Histogram(
            f"{prefix}_connection_duration_seconds",
            "WebSocket connection duration",
            buckets=[10, 30, 60, 120, 300, 600, 1800, 3600, 7200],
        )

        # Message metrics
        self.messages_total = Counter(
            f"{prefix}_messages_total",
            "Total WebSocket messages",
            ["direction", "type"],  # direction: inbound/outbound
        )

        self.message_latency = Histogram(
            f"{prefix}_message_latency_seconds",
            "WebSocket message processing latency",
            ["type"],
            buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0],
        )

        self.message_size_bytes = Histogram(
            f"{prefix}_message_size_bytes",
            "WebSocket message size in bytes",
            ["direction"],
            buckets=[100, 500, 1000, 5000, 10000, 50000, 100000],
        )

        # Room metrics
        self.rooms_active = Gauge(
            f"{prefix}_rooms_active",
            "Current active rooms",
        )

        self.rooms_by_type = Gauge(
            f"{prefix}_rooms_by_type",
            "Active rooms by type",
            ["room_type"],
        )

        self.room_members = Histogram(
            f"{prefix}_room_members",
            "Number of members per room",
            buckets=[1, 2, 5, 10, 25, 50, 100, 250, 500, 1000],
        )

        # Heartbeat metrics
        self.heartbeat_success = Counter(
            f"{prefix}_heartbeat_success_total",
            "Successful heartbeats",
        )

        self.heartbeat_timeout = Counter(
            f"{prefix}_heartbeat_timeout_total",
            "Heartbeat timeouts (stale connections)",
        )

        self.heartbeat_latency = Histogram(
            f"{prefix}_heartbeat_latency_seconds",
            "Heartbeat response latency",
            buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5],
        )

        # Cognitive state metrics
        self.cognitive_updates = Counter(
            f"{prefix}_cognitive_updates_total",
            "Cognitive state updates processed",
            ["cognitive_load"],  # low, optimal, high, overload
        )

        self.cognitive_load_distribution = Gauge(
            f"{prefix}_cognitive_load_distribution",
            "Distribution of learners by cognitive load level",
            ["level"],
        )

        # Intervention metrics
        self.interventions_total = Counter(
            f"{prefix}_interventions_total",
            "Total interventions triggered",
            ["type", "trigger"],  # type: intervention type, trigger: trigger reason
        )

        self.interventions_delivered = Counter(
            f"{prefix}_interventions_delivered_total",
            "Interventions successfully delivered",
            ["type"],
        )

        self.interventions_acknowledged = Counter(
            f"{prefix}_interventions_acknowledged_total",
            "Interventions acknowledged by learners",
            ["type"],
        )

        self.intervention_delivery_latency = Histogram(
            f"{prefix}_intervention_delivery_latency_seconds",
            "Time from trigger to delivery",
            buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0],
        )

        # Error metrics
        self.errors_total = Counter(
            f"{prefix}_errors_total",
            "Total errors",
            ["type"],  # connection_error, message_error, handler_error
        )

        self.reconnection_attempts = Counter(
            f"{prefix}_reconnection_attempts_total",
            "Client reconnection attempts",
            ["success"],  # true/false
        )

        # Performance metrics
        self.broadcast_latency = Histogram(
            f"{prefix}_broadcast_latency_seconds",
            "Room broadcast latency",
            buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5],
        )

        self.redis_operation_latency = Histogram(
            f"{prefix}_redis_operation_latency_seconds",
            "Redis operation latency",
            ["operation"],  # get, set, publish, etc.
            buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1],
        )

        logger.info("WebSocketMetrics initialized")

    # =========================================================================
    # CONNECTION METRICS
    # =========================================================================

    def record_connect(self, device: str = "web", tenant_id: Optional[str] = None):
        """Record a new connection."""
        self.connections_total.labels(status="connected").inc()
        self.active_connections.inc()
        self.connections_by_device.labels(device=device).inc()
        if tenant_id:
            self.connections_by_tenant.labels(tenant_id=tenant_id).inc()

    def record_disconnect(
        self,
        device: str = "web",
        tenant_id: Optional[str] = None,
        duration_seconds: float = 0,
    ):
        """Record a disconnection."""
        self.connections_total.labels(status="disconnected").inc()
        self.active_connections.dec()
        self.connections_by_device.labels(device=device).dec()
        if tenant_id:
            self.connections_by_tenant.labels(tenant_id=tenant_id).dec()
        if duration_seconds > 0:
            self.connection_duration.observe(duration_seconds)

    def record_connection_rejected(self, reason: str = "unknown"):
        """Record a rejected connection."""
        self.connections_total.labels(status="rejected").inc()
        self.errors_total.labels(type=f"connection_rejected_{reason}").inc()

    # =========================================================================
    # MESSAGE METRICS
    # =========================================================================

    def record_message_received(
        self,
        msg_type: str,
        size_bytes: int = 0,
        latency_seconds: float = 0,
    ):
        """Record an inbound message."""
        self.messages_total.labels(direction="inbound", type=msg_type).inc()
        if size_bytes > 0:
            self.message_size_bytes.labels(direction="inbound").observe(size_bytes)
        if latency_seconds > 0:
            self.message_latency.labels(type=msg_type).observe(latency_seconds)

    def record_message_sent(
        self,
        msg_type: str,
        size_bytes: int = 0,
    ):
        """Record an outbound message."""
        self.messages_total.labels(direction="outbound", type=msg_type).inc()
        if size_bytes > 0:
            self.message_size_bytes.labels(direction="outbound").observe(size_bytes)

    # =========================================================================
    # ROOM METRICS
    # =========================================================================

    def record_room_created(self, room_type: str):
        """Record a new room."""
        self.rooms_active.inc()
        self.rooms_by_type.labels(room_type=room_type).inc()

    def record_room_deleted(self, room_type: str):
        """Record a room deletion."""
        self.rooms_active.dec()
        self.rooms_by_type.labels(room_type=room_type).dec()

    def record_room_members(self, member_count: int):
        """Record room member count."""
        self.room_members.observe(member_count)

    # =========================================================================
    # HEARTBEAT METRICS
    # =========================================================================

    def record_heartbeat(self, latency_seconds: float = 0):
        """Record a successful heartbeat."""
        self.heartbeat_success.inc()
        if latency_seconds > 0:
            self.heartbeat_latency.observe(latency_seconds)

    def record_heartbeat_timeout(self):
        """Record a heartbeat timeout."""
        self.heartbeat_timeout.inc()

    # =========================================================================
    # COGNITIVE STATE METRICS
    # =========================================================================

    def record_cognitive_update(self, cognitive_load: str):
        """Record a cognitive state update."""
        self.cognitive_updates.labels(cognitive_load=cognitive_load).inc()

    def set_cognitive_load_distribution(self, distribution: dict):
        """Set the current distribution of cognitive load levels."""
        for level, count in distribution.items():
            self.cognitive_load_distribution.labels(level=level).set(count)

    # =========================================================================
    # INTERVENTION METRICS
    # =========================================================================

    def record_intervention_triggered(
        self,
        intervention_type: str,
        trigger_reason: str,
    ):
        """Record an intervention being triggered."""
        self.interventions_total.labels(
            type=intervention_type,
            trigger=trigger_reason,
        ).inc()

    def record_intervention_delivered(
        self,
        intervention_type: str,
        latency_seconds: float = 0,
    ):
        """Record an intervention being delivered."""
        self.interventions_delivered.labels(type=intervention_type).inc()
        if latency_seconds > 0:
            self.intervention_delivery_latency.observe(latency_seconds)

    def record_intervention_acknowledged(self, intervention_type: str):
        """Record an intervention being acknowledged."""
        self.interventions_acknowledged.labels(type=intervention_type).inc()

    # =========================================================================
    # ERROR METRICS
    # =========================================================================

    def record_error(self, error_type: str):
        """Record an error."""
        self.errors_total.labels(type=error_type).inc()

    def record_reconnection(self, success: bool):
        """Record a reconnection attempt."""
        self.reconnection_attempts.labels(success=str(success).lower()).inc()

    # =========================================================================
    # PERFORMANCE METRICS
    # =========================================================================

    def record_broadcast_latency(self, latency_seconds: float):
        """Record broadcast latency."""
        self.broadcast_latency.observe(latency_seconds)

    def record_redis_operation(
        self,
        operation: str,
        latency_seconds: float,
    ):
        """Record Redis operation latency."""
        self.redis_operation_latency.labels(operation=operation).observe(latency_seconds)


# Global metrics instance
_metrics: Optional[WebSocketMetrics] = None


def get_metrics() -> WebSocketMetrics:
    """Get the global metrics instance."""
    global _metrics
    if _metrics is None:
        _metrics = WebSocketMetrics()
    return _metrics


def init_metrics(settings: Optional[Settings] = None) -> WebSocketMetrics:
    """Initialize the global metrics instance."""
    global _metrics
    _metrics = WebSocketMetrics(settings)
    return _metrics
