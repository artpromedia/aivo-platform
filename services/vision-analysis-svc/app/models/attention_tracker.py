"""
Attention Tracker

Webcam-based engagement detection with privacy-first design.

IMPORTANT: Privacy-first design
- All processing happens on-device
- No images stored or transmitted
- Only aggregate metrics sent to server
- Explicit consent required

Features to detect:
1. Gaze direction (looking at screen vs away)
2. Head pose (attention vs distraction)
3. Presence/absence (stepped away)
4. Basic emotion (engaged, confused, bored)

Based on:
- MediaPipe Face Mesh for landmarks
- Gaze estimation techniques
"""

import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np

logger = logging.getLogger(__name__)


class AttentionState(Enum):
    """Current attention state."""
    FOCUSED = "focused"
    DISTRACTED = "distracted"
    LOOKING_AWAY = "looking_away"
    DROWSY = "drowsy"
    UNKNOWN = "unknown"


class EngagementLevel(Enum):
    """Overall engagement level."""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    DISENGAGED = "disengaged"


class PrivacyMode(Enum):
    """Privacy modes for attention tracking."""
    STRICT = "strict"  # Only aggregate metrics, no detailed data
    MODERATE = "moderate"  # Some per-session data, no images
    LOCAL_ONLY = "local_only"  # All processing local, nothing transmitted


@dataclass
class HeadPose:
    """Head pose angles in degrees."""
    pitch: float  # Up/down tilt
    yaw: float  # Left/right rotation
    roll: float  # Tilt to side

    def is_looking_at_screen(
        self,
        pitch_threshold: float = 20.0,
        yaw_threshold: float = 30.0,
    ) -> bool:
        """Check if head pose indicates looking at screen."""
        return (abs(self.pitch) < pitch_threshold and
                abs(self.yaw) < yaw_threshold)


@dataclass
class AttentionTrackerConfig:
    """Configuration for attention tracker."""
    enable_gaze: bool = True
    enable_emotion: bool = False  # Opt-in only
    enable_drowsiness: bool = True
    processing_interval_ms: int = 1000
    privacy_mode: str = "strict"
    local_only: bool = True  # Don't send images anywhere
    min_face_confidence: float = 0.5
    device: str = "cpu"
    # Thresholds
    gaze_threshold_degrees: float = 15.0
    head_pitch_threshold: float = 20.0
    head_yaw_threshold: float = 30.0
    blink_threshold: float = 0.25
    drowsiness_blink_rate: float = 0.15  # Prolonged blink ratio threshold


@dataclass
class AttentionMetrics:
    """Attention metrics for a single frame or time point."""
    timestamp: datetime
    attention_score: float  # 0-1
    gaze_on_screen: bool
    face_detected: bool
    head_pose: Optional[HeadPose] = None
    engagement_state: str = "unknown"  # engaged, neutral, distracted
    blink_detected: bool = False
    eye_aspect_ratio: float = 0.0
    processing_time_ms: int = 0


@dataclass
class AttentionFrame:
    """Attention metrics for a single frame (internal use)."""
    timestamp: datetime
    attention_state: AttentionState
    gaze_on_screen: bool
    gaze_position: Optional[Tuple[float, float]] = None
    head_pose: Optional[HeadPose] = None
    blink_detected: bool = False
    face_detected: bool = True
    confidence: float = 0.0
    eye_aspect_ratio: float = 0.0


@dataclass
class SessionSummary:
    """Aggregated attention metrics for a session."""
    total_duration_seconds: int
    attention_percentage: float
    distraction_events: int
    average_engagement: float
    engagement_over_time: List[float]  # Time series (sampled)
    focus_periods: int  # Number of sustained focus periods
    average_focus_duration_seconds: float
    drowsiness_events: int = 0
    face_not_detected_seconds: int = 0
    recommendations: List[str] = field(default_factory=list)


@dataclass
class AttentionSession:
    """Attention tracking session data."""
    session_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    total_frames: int = 0
    focused_frames: int = 0
    distracted_frames: int = 0
    looking_away_frames: int = 0
    drowsy_frames: int = 0
    no_face_frames: int = 0
    average_engagement: float = 0.0
    attention_spans: List[Dict[str, Any]] = field(default_factory=list)
    distraction_events: List[Dict[str, Any]] = field(default_factory=list)
    engagement_samples: List[float] = field(default_factory=list)


class AttentionTracker:
    """
    Privacy-first attention and engagement tracking.

    Capabilities:
    - Gaze direction estimation
    - Head pose tracking
    - Blink detection (for drowsiness)
    - Attention span measurement
    - Engagement level estimation

    Privacy guarantees:
    - No raw face images stored
    - Only numerical metrics retained
    - Can run fully on-device
    - Configurable data retention

    Usage:
        config = AttentionTrackerConfig(privacy_mode="strict")
        tracker = AttentionTracker(config)
        tracker.start_session(session_id="lesson_123")

        for frame in video_frames:
            metrics = tracker.process_frame(frame)
            if metrics.engagement_state == "distracted":
                trigger_intervention()

        summary = tracker.end_session()
        print(f"Attention: {summary.attention_percentage}%")
    """

    # Facial landmark indices for MediaPipe Face Mesh
    # These are used for eye aspect ratio calculation
    LEFT_EYE_INDICES = [362, 385, 387, 263, 373, 380]
    RIGHT_EYE_INDICES = [33, 160, 158, 133, 153, 144]

    # Iris landmarks for gaze estimation
    LEFT_IRIS_CENTER = 468
    RIGHT_IRIS_CENTER = 473

    def __init__(
        self,
        config: Optional[AttentionTrackerConfig] = None,
        privacy_mode: bool = True,
        device: str = "cpu",
        min_face_confidence: float = 0.5,
    ) -> None:
        """
        Initialize attention tracker.

        Args:
            config: Tracker configuration
            privacy_mode: If True, no images are stored (legacy)
            device: Inference device (legacy)
            min_face_confidence: Minimum confidence for face detection (legacy)
        """
        if config:
            self.config = config
        else:
            self.config = AttentionTrackerConfig(
                local_only=privacy_mode,
                device=device,
                min_face_confidence=min_face_confidence,
            )

        self.face_mesh = None
        self.current_session: Optional[AttentionSession] = None
        self._models_loaded = False
        self._blink_history: List[bool] = []
        self._recent_frames: List[AttentionFrame] = []
        self._current_focus_start: Optional[datetime] = None
        self._focus_durations: List[float] = []

        logger.info(
            f"AttentionTracker initialized "
            f"(privacy_mode={self.config.privacy_mode}, device={self.config.device})"
        )

    def _load_models(self) -> None:
        """Load MediaPipe Face Mesh model."""
        if self._models_loaded:
            return

        try:
            import mediapipe as mp
            self.mp_face_mesh = mp.solutions.face_mesh
            self.face_mesh = self.mp_face_mesh.FaceMesh(
                max_num_faces=1,
                refine_landmarks=True,  # Includes iris landmarks
                min_detection_confidence=self.config.min_face_confidence,
                min_tracking_confidence=0.5,
            )
            logger.info("MediaPipe Face Mesh loaded successfully")
        except ImportError:
            logger.warning(
                "MediaPipe not available. Install with: pip install mediapipe"
            )
            self.face_mesh = None
        except Exception as e:
            logger.warning(f"Failed to load Face Mesh: {e}")
            self.face_mesh = None

        self._models_loaded = True

    def start_session(
        self,
        session_id: str,
        learner_id: Optional[str] = None,
    ) -> AttentionSession:
        """
        Start a new attention tracking session.

        Args:
            session_id: Unique session identifier
            learner_id: Optional learner identifier (not stored in strict mode)

        Returns:
            New AttentionSession
        """
        self._load_models()

        self.current_session = AttentionSession(
            session_id=session_id,
            start_time=datetime.now(timezone.utc),
        )
        self._blink_history = []
        self._recent_frames = []
        self._current_focus_start = None
        self._focus_durations = []

        logger.info(f"Started attention session: {session_id}")
        return self.current_session

    def process_frame(
        self,
        image: np.ndarray,
        timestamp: Optional[datetime] = None,
    ) -> AttentionMetrics:
        """
        Process a single video frame for attention metrics.

        Args:
            image: Video frame (BGR or RGB)
            timestamp: Frame timestamp

        Returns:
            AttentionMetrics with all computed values (no image data stored)
        """
        start_time = time.time()
        self._load_models()

        if timestamp is None:
            timestamp = datetime.now(timezone.utc)

        # Default values for when face is not detected
        metrics = AttentionMetrics(
            timestamp=timestamp,
            attention_score=0.0,
            gaze_on_screen=False,
            face_detected=False,
            head_pose=None,
            engagement_state="unknown",
            blink_detected=False,
            eye_aspect_ratio=0.0,
            processing_time_ms=0,
        )

        if self.face_mesh is None:
            # Fallback: use basic face detection if MediaPipe not available
            metrics = self._fallback_detection(image, timestamp)
        else:
            # Convert BGR to RGB if needed
            if len(image.shape) == 3 and image.shape[2] == 3:
                rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            else:
                rgb_image = image

            # Process with MediaPipe
            results = self.face_mesh.process(rgb_image)

            if results.multi_face_landmarks:
                landmarks = results.multi_face_landmarks[0]
                h, w = image.shape[:2]

                # Extract metrics from landmarks
                metrics = self._extract_metrics(landmarks, w, h, timestamp)

        # Update session metrics
        self._update_session(metrics)

        # Calculate processing time
        metrics.processing_time_ms = int((time.time() - start_time) * 1000)

        return metrics

    def _extract_metrics(
        self,
        landmarks,
        width: int,
        height: int,
        timestamp: datetime,
    ) -> AttentionMetrics:
        """Extract attention metrics from face landmarks."""
        # Get landmark positions
        def get_point(idx):
            lm = landmarks.landmark[idx]
            return (lm.x * width, lm.y * height, lm.z)

        # Calculate head pose
        head_pose = self._estimate_head_pose(landmarks, width, height)

        # Calculate eye aspect ratio for blink detection
        left_ear = self._calculate_eye_aspect_ratio(landmarks, self.LEFT_EYE_INDICES)
        right_ear = self._calculate_eye_aspect_ratio(landmarks, self.RIGHT_EYE_INDICES)
        avg_ear = (left_ear + right_ear) / 2

        # Detect blink
        blink_detected = avg_ear < self.config.blink_threshold
        self._blink_history.append(blink_detected)
        if len(self._blink_history) > 30:  # Keep last 30 frames
            self._blink_history.pop(0)

        # Check if gaze is on screen
        gaze_on_screen = self._estimate_gaze_direction(landmarks, width, height)

        # Combine head pose and gaze for final determination
        if head_pose:
            looking_at_screen = (
                head_pose.is_looking_at_screen(
                    self.config.head_pitch_threshold,
                    self.config.head_yaw_threshold
                ) and gaze_on_screen
            )
        else:
            looking_at_screen = gaze_on_screen

        # Calculate attention score
        attention_score = self._calculate_attention_score(
            looking_at_screen=looking_at_screen,
            blink_detected=blink_detected,
            head_pose=head_pose,
        )

        # Determine engagement state
        engagement_state = self._determine_engagement_state(
            attention_score=attention_score,
            looking_at_screen=looking_at_screen,
            blink_pattern=self._blink_history,
        )

        return AttentionMetrics(
            timestamp=timestamp,
            attention_score=attention_score,
            gaze_on_screen=looking_at_screen,
            face_detected=True,
            head_pose=head_pose,
            engagement_state=engagement_state,
            blink_detected=blink_detected,
            eye_aspect_ratio=avg_ear,
            processing_time_ms=0,
        )

    def _estimate_head_pose(
        self,
        landmarks,
        width: int,
        height: int,
    ) -> Optional[HeadPose]:
        """Estimate head pose from facial landmarks."""
        try:
            # Key facial landmarks for pose estimation
            # Nose tip, chin, left eye corner, right eye corner, left mouth, right mouth
            landmark_indices = [1, 152, 33, 263, 61, 291]

            # 3D model points (generic face model)
            model_points = np.array([
                (0.0, 0.0, 0.0),  # Nose tip
                (0.0, -330.0, -65.0),  # Chin
                (-225.0, 170.0, -135.0),  # Left eye corner
                (225.0, 170.0, -135.0),  # Right eye corner
                (-150.0, -150.0, -125.0),  # Left mouth corner
                (150.0, -150.0, -125.0),  # Right mouth corner
            ], dtype=np.float64)

            # Get 2D image points
            image_points = np.array([
                (landmarks.landmark[i].x * width,
                 landmarks.landmark[i].y * height)
                for i in landmark_indices
            ], dtype=np.float64)

            # Camera matrix (approximate)
            focal_length = width
            center = (width / 2, height / 2)
            camera_matrix = np.array([
                [focal_length, 0, center[0]],
                [0, focal_length, center[1]],
                [0, 0, 1]
            ], dtype=np.float64)

            # Assume no lens distortion
            dist_coeffs = np.zeros((4, 1))

            # Solve PnP
            success, rotation_vec, translation_vec = cv2.solvePnP(
                model_points,
                image_points,
                camera_matrix,
                dist_coeffs,
                flags=cv2.SOLVEPNP_ITERATIVE
            )

            if success:
                # Convert rotation vector to Euler angles
                rotation_mat, _ = cv2.Rodrigues(rotation_vec)
                angles = self._rotation_matrix_to_euler(rotation_mat)

                return HeadPose(
                    pitch=float(angles[0]),
                    yaw=float(angles[1]),
                    roll=float(angles[2]),
                )

        except Exception as e:
            logger.debug(f"Head pose estimation failed: {e}")

        return None

    def _rotation_matrix_to_euler(self, R: np.ndarray) -> np.ndarray:
        """Convert rotation matrix to Euler angles (in degrees)."""
        sy = np.sqrt(R[0, 0] ** 2 + R[1, 0] ** 2)
        singular = sy < 1e-6

        if not singular:
            x = np.arctan2(R[2, 1], R[2, 2])
            y = np.arctan2(-R[2, 0], sy)
            z = np.arctan2(R[1, 0], R[0, 0])
        else:
            x = np.arctan2(-R[1, 2], R[1, 1])
            y = np.arctan2(-R[2, 0], sy)
            z = 0

        return np.degrees(np.array([x, y, z]))

    def _calculate_eye_aspect_ratio(
        self,
        landmarks,
        eye_indices: List[int],
    ) -> float:
        """Calculate eye aspect ratio for blink detection."""
        try:
            # Get eye landmark positions
            points = [
                (landmarks.landmark[i].x, landmarks.landmark[i].y)
                for i in eye_indices
            ]

            # EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
            # Vertical distances
            v1 = np.sqrt(
                (points[1][0] - points[5][0]) ** 2 +
                (points[1][1] - points[5][1]) ** 2
            )
            v2 = np.sqrt(
                (points[2][0] - points[4][0]) ** 2 +
                (points[2][1] - points[4][1]) ** 2
            )
            # Horizontal distance
            h = np.sqrt(
                (points[0][0] - points[3][0]) ** 2 +
                (points[0][1] - points[3][1]) ** 2
            )

            if h > 0:
                return (v1 + v2) / (2.0 * h)

        except Exception as e:
            logger.debug(f"EAR calculation failed: {e}")

        return 0.3  # Default open eye value

    def _estimate_gaze_direction(
        self,
        landmarks,
        width: int,
        height: int,
    ) -> bool:
        """Estimate if gaze is directed at screen."""
        try:
            # Get iris center positions
            left_iris = landmarks.landmark[self.LEFT_IRIS_CENTER]
            right_iris = landmarks.landmark[self.RIGHT_IRIS_CENTER]

            # Get eye corner positions for reference
            left_inner = landmarks.landmark[362]
            left_outer = landmarks.landmark[263]
            right_inner = landmarks.landmark[133]
            right_outer = landmarks.landmark[33]

            # Calculate relative iris position within eye
            def iris_ratio(iris, inner, outer):
                eye_width = abs(outer.x - inner.x)
                if eye_width > 0:
                    return (iris.x - inner.x) / eye_width
                return 0.5

            left_ratio = iris_ratio(left_iris, left_inner, left_outer)
            right_ratio = iris_ratio(right_iris, right_inner, right_outer)

            # Average ratio (0.5 = center, looking straight)
            avg_ratio = (left_ratio + right_ratio) / 2

            # Check if looking approximately forward (within threshold)
            threshold = self.config.gaze_threshold_degrees / 100  # Normalize
            is_looking_forward = 0.3 < avg_ratio < 0.7

            return is_looking_forward

        except Exception as e:
            logger.debug(f"Gaze estimation failed: {e}")

        return True  # Assume looking at screen if estimation fails

    def _calculate_attention_score(
        self,
        looking_at_screen: bool,
        blink_detected: bool,
        head_pose: Optional[HeadPose],
    ) -> float:
        """Calculate overall attention score (0-1)."""
        score = 0.0

        # Base score for looking at screen
        if looking_at_screen:
            score = 0.7

        # Bonus for stable head pose
        if head_pose:
            pose_stability = 1.0 - (
                abs(head_pose.pitch) / 45 +
                abs(head_pose.yaw) / 45 +
                abs(head_pose.roll) / 45
            ) / 3
            score += 0.2 * max(0, pose_stability)

        # Slight penalty for blink (could indicate drowsiness if prolonged)
        if blink_detected:
            score -= 0.1

        return max(0.0, min(1.0, score))

    def _determine_engagement_state(
        self,
        attention_score: float,
        looking_at_screen: bool,
        blink_pattern: List[bool],
    ) -> str:
        """Determine engagement state from metrics."""
        # Check for drowsiness (high blink rate or prolonged blinks)
        if len(blink_pattern) >= 10:
            blink_rate = sum(blink_pattern) / len(blink_pattern)
            if blink_rate > self.config.drowsiness_blink_rate:
                return "drowsy"

        # Determine based on attention score
        if attention_score >= 0.7:
            return "engaged"
        elif attention_score >= 0.4:
            return "neutral"
        elif looking_at_screen:
            return "neutral"
        else:
            return "distracted"

    def _fallback_detection(
        self,
        image: np.ndarray,
        timestamp: datetime,
    ) -> AttentionMetrics:
        """Fallback face detection when MediaPipe is not available."""
        try:
            # Use OpenCV's Haar cascade for basic face detection
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image

            # Load cascade classifier
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            face_cascade = cv2.CascadeClassifier(cascade_path)

            faces = face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(30, 30)
            )

            face_detected = len(faces) > 0

            return AttentionMetrics(
                timestamp=timestamp,
                attention_score=0.5 if face_detected else 0.0,
                gaze_on_screen=face_detected,  # Assume if face detected, looking at screen
                face_detected=face_detected,
                head_pose=None,
                engagement_state="neutral" if face_detected else "distracted",
                blink_detected=False,
                eye_aspect_ratio=0.3,
                processing_time_ms=0,
            )

        except Exception as e:
            logger.warning(f"Fallback detection failed: {e}")
            return AttentionMetrics(
                timestamp=timestamp,
                attention_score=0.0,
                gaze_on_screen=False,
                face_detected=False,
                head_pose=None,
                engagement_state="unknown",
                blink_detected=False,
                eye_aspect_ratio=0.0,
                processing_time_ms=0,
            )

    def _update_session(self, metrics: AttentionMetrics) -> None:
        """Update current session with new metrics."""
        if self.current_session is None:
            return

        self.current_session.total_frames += 1

        if not metrics.face_detected:
            self.current_session.no_face_frames += 1
            return

        # Update frame counts based on engagement state
        if metrics.engagement_state == "engaged":
            self.current_session.focused_frames += 1
            if self._current_focus_start is None:
                self._current_focus_start = metrics.timestamp
        elif metrics.engagement_state == "distracted":
            self.current_session.distracted_frames += 1
            self._end_focus_period(metrics.timestamp)
            self.current_session.distraction_events.append({
                "timestamp": metrics.timestamp.isoformat(),
                "duration_ms": 0,
            })
        elif metrics.engagement_state == "drowsy":
            self.current_session.drowsy_frames += 1
        else:
            self.current_session.looking_away_frames += 1
            self._end_focus_period(metrics.timestamp)

        # Sample engagement for time series (every 10 frames)
        if self.current_session.total_frames % 10 == 0:
            self.current_session.engagement_samples.append(metrics.attention_score)

        # Update rolling average
        valid_frames = (
            self.current_session.total_frames -
            self.current_session.no_face_frames
        )
        if valid_frames > 0:
            self.current_session.average_engagement = (
                self.current_session.focused_frames / valid_frames
            )

    def _end_focus_period(self, end_time: datetime) -> None:
        """End current focus period and record duration."""
        if self._current_focus_start is not None:
            duration = (end_time - self._current_focus_start).total_seconds()
            self._focus_durations.append(duration)
            self._current_focus_start = None

    def end_session(self) -> AttentionSession:
        """
        End current session and return completed session data.

        Returns:
            Completed AttentionSession with all metrics
        """
        if self.current_session is None:
            raise ValueError("No active session")

        self.current_session.end_time = datetime.now(timezone.utc)

        # End any ongoing focus period
        if self._current_focus_start:
            self._end_focus_period(self.current_session.end_time)

        session = self.current_session
        self.current_session = None

        logger.info(f"Ended attention session: {session.session_id}")
        return session

    def aggregate_session(
        self,
        metrics: List[AttentionMetrics],
    ) -> SessionSummary:
        """
        Aggregate a list of metrics into a session summary.

        This is used when processing batched metrics from client-side code.

        Args:
            metrics: List of AttentionMetrics from a session

        Returns:
            SessionSummary with aggregated data
        """
        if not metrics:
            return SessionSummary(
                total_duration_seconds=0,
                attention_percentage=0.0,
                distraction_events=0,
                average_engagement=0.0,
                engagement_over_time=[],
                focus_periods=0,
                average_focus_duration_seconds=0.0,
            )

        # Calculate duration
        first_timestamp = metrics[0].timestamp
        last_timestamp = metrics[-1].timestamp
        duration = (last_timestamp - first_timestamp).total_seconds()

        # Count states
        focused_count = sum(1 for m in metrics if m.engagement_state == "engaged")
        distracted_count = sum(1 for m in metrics if m.engagement_state == "distracted")
        drowsy_count = sum(1 for m in metrics if m.engagement_state == "drowsy")
        face_detected_count = sum(1 for m in metrics if m.face_detected)
        no_face_count = len(metrics) - face_detected_count

        # Calculate attention percentage
        if face_detected_count > 0:
            attention_percentage = (focused_count / face_detected_count) * 100
        else:
            attention_percentage = 0.0

        # Calculate average engagement
        valid_scores = [m.attention_score for m in metrics if m.face_detected]
        average_engagement = np.mean(valid_scores) if valid_scores else 0.0

        # Build engagement time series (sample every 10 points)
        sample_rate = max(1, len(metrics) // 50)
        engagement_over_time = [
            metrics[i].attention_score
            for i in range(0, len(metrics), sample_rate)
        ]

        # Count focus periods and calculate average duration
        focus_periods = 0
        focus_durations = []
        in_focus = False
        focus_start_idx = 0

        for i, m in enumerate(metrics):
            if m.engagement_state == "engaged" and not in_focus:
                in_focus = True
                focus_start_idx = i
            elif m.engagement_state != "engaged" and in_focus:
                in_focus = False
                focus_periods += 1
                if i > focus_start_idx:
                    period_duration = (
                        metrics[i].timestamp - metrics[focus_start_idx].timestamp
                    ).total_seconds()
                    focus_durations.append(period_duration)

        # Handle ongoing focus period
        if in_focus:
            focus_periods += 1
            period_duration = (
                metrics[-1].timestamp - metrics[focus_start_idx].timestamp
            ).total_seconds()
            focus_durations.append(period_duration)

        avg_focus_duration = np.mean(focus_durations) if focus_durations else 0.0

        # Generate recommendations
        recommendations = self._generate_recommendations(
            attention_percentage=attention_percentage,
            distraction_events=distracted_count,
            drowsy_count=drowsy_count,
            average_engagement=float(average_engagement),
            average_focus_duration=avg_focus_duration,
        )

        return SessionSummary(
            total_duration_seconds=int(duration),
            attention_percentage=float(attention_percentage),
            distraction_events=distracted_count,
            average_engagement=float(average_engagement),
            engagement_over_time=engagement_over_time,
            focus_periods=focus_periods,
            average_focus_duration_seconds=float(avg_focus_duration),
            drowsiness_events=drowsy_count,
            face_not_detected_seconds=int(no_face_count),
            recommendations=recommendations,
        )

    def _generate_recommendations(
        self,
        attention_percentage: float,
        distraction_events: int,
        drowsy_count: int,
        average_engagement: float,
        average_focus_duration: float,
    ) -> List[str]:
        """Generate recommendations based on attention data."""
        recommendations = []

        if attention_percentage < 50:
            recommendations.append(
                "Consider taking short breaks to help maintain focus."
            )

        if distraction_events > 10:
            recommendations.append(
                "Try minimizing external distractions - consider using "
                "do-not-disturb mode."
            )

        if drowsy_count > 5:
            recommendations.append(
                "Signs of drowsiness detected. Consider a short break or "
                "some physical activity."
            )

        if average_focus_duration < 300 and average_focus_duration > 0:  # Less than 5 minutes
            recommendations.append(
                "Try the Pomodoro technique: 25 minutes of focused work "
                "followed by a 5-minute break."
            )

        if average_engagement < 0.4:
            recommendations.append(
                "Engagement levels are low. Try breaking content into "
                "smaller, more interactive segments."
            )

        if not recommendations:
            recommendations.append("Great job maintaining focus!")

        return recommendations

    def estimate_gaze(
        self,
        image: np.ndarray,
    ) -> Optional[Tuple[float, float]]:
        """
        Estimate gaze position on screen.

        Returns normalized (x, y) coordinates or None if face not detected.
        """
        self._load_models()

        if self.face_mesh is None:
            return None

        # Convert to RGB
        if len(image.shape) == 3:
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        else:
            rgb_image = image

        results = self.face_mesh.process(rgb_image)

        if not results.multi_face_landmarks:
            return None

        try:
            landmarks = results.multi_face_landmarks[0]

            # Get iris positions
            left_iris = landmarks.landmark[self.LEFT_IRIS_CENTER]
            right_iris = landmarks.landmark[self.RIGHT_IRIS_CENTER]

            # Average position as gaze estimate
            gaze_x = (left_iris.x + right_iris.x) / 2
            gaze_y = (left_iris.y + right_iris.y) / 2

            return (gaze_x, gaze_y)

        except Exception as e:
            logger.debug(f"Gaze estimation failed: {e}")

        return None

    def estimate_head_pose(
        self,
        image: np.ndarray,
    ) -> Optional[HeadPose]:
        """
        Estimate head pose (pitch, yaw, roll).

        Returns HeadPose with angles in degrees or None.
        """
        self._load_models()

        if self.face_mesh is None:
            return None

        # Convert to RGB
        if len(image.shape) == 3:
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        else:
            rgb_image = image

        h, w = image.shape[:2]
        results = self.face_mesh.process(rgb_image)

        if not results.multi_face_landmarks:
            return None

        landmarks = results.multi_face_landmarks[0]
        return self._estimate_head_pose(landmarks, w, h)

    def detect_drowsiness(
        self,
        blink_history: List[bool],
        window_seconds: float = 30.0,
    ) -> Tuple[bool, float]:
        """
        Detect drowsiness from blink patterns.

        Args:
            blink_history: Recent blink detections
            window_seconds: Analysis window

        Returns:
            (is_drowsy, drowsiness_score)
        """
        if not blink_history:
            return False, 0.0

        # Calculate blink rate
        blink_rate = sum(blink_history) / len(blink_history)

        # Calculate consecutive blinks (prolonged eye closure)
        max_consecutive = 0
        current_consecutive = 0
        for blink in blink_history:
            if blink:
                current_consecutive += 1
                max_consecutive = max(max_consecutive, current_consecutive)
            else:
                current_consecutive = 0

        # Drowsiness score based on blink rate and consecutive blinks
        drowsiness_score = (
            blink_rate * 0.5 +
            min(max_consecutive / 10, 0.5)  # Normalize consecutive to 0-0.5
        )

        is_drowsy = drowsiness_score > 0.3

        return is_drowsy, float(drowsiness_score)

    def get_engagement_level(
        self,
        recent_frames: int = 30,
    ) -> EngagementLevel:
        """
        Get current engagement level based on recent frames.

        Args:
            recent_frames: Number of recent frames to consider

        Returns:
            EngagementLevel enum
        """
        if self.current_session is None:
            return EngagementLevel.DISENGAGED

        # Use recent engagement samples
        samples = self.current_session.engagement_samples[-recent_frames:]
        if not samples:
            return EngagementLevel.DISENGAGED

        avg_engagement = np.mean(samples)

        if avg_engagement >= 0.7:
            return EngagementLevel.HIGH
        elif avg_engagement >= 0.5:
            return EngagementLevel.MEDIUM
        elif avg_engagement >= 0.3:
            return EngagementLevel.LOW
        else:
            return EngagementLevel.DISENGAGED

    def get_attention_report(
        self,
        session: AttentionSession,
    ) -> Dict[str, Any]:
        """
        Generate detailed attention report for a session.

        Returns report with:
        - Overall engagement score
        - Attention span analysis
        - Distraction patterns
        - Recommendations
        """
        valid_frames = session.total_frames - session.no_face_frames
        if valid_frames == 0:
            return {
                "status": "no_data",
                "message": "No face detected during session",
            }

        # Calculate metrics
        focus_percentage = (session.focused_frames / valid_frames) * 100
        distraction_percentage = (session.distracted_frames / valid_frames) * 100
        drowsy_percentage = (session.drowsy_frames / valid_frames) * 100

        # Calculate duration
        if session.end_time and session.start_time:
            duration = (session.end_time - session.start_time).total_seconds()
        else:
            duration = 0

        # Build engagement time series
        engagement_series = session.engagement_samples

        # Generate recommendations
        recommendations = self._generate_recommendations(
            attention_percentage=focus_percentage,
            distraction_events=len(session.distraction_events),
            drowsy_count=session.drowsy_frames,
            average_engagement=session.average_engagement,
            average_focus_duration=np.mean(self._focus_durations) if self._focus_durations else 0,
        )

        return {
            "session_id": session.session_id,
            "duration_seconds": int(duration),
            "total_frames": session.total_frames,
            "valid_frames": valid_frames,
            "metrics": {
                "focus_percentage": round(focus_percentage, 1),
                "distraction_percentage": round(distraction_percentage, 1),
                "drowsy_percentage": round(drowsy_percentage, 1),
                "average_engagement": round(session.average_engagement, 3),
            },
            "distraction_events": len(session.distraction_events),
            "engagement_over_time": engagement_series,
            "recommendations": recommendations,
        }

    def is_loaded(self) -> bool:
        """Check if models are loaded."""
        return self._models_loaded

    def get_model_info(self) -> Dict[str, Any]:
        """Get information about loaded models."""
        return {
            "models_loaded": self._models_loaded,
            "face_mesh_available": self.face_mesh is not None,
            "privacy_mode": self.config.privacy_mode,
            "device": self.config.device,
            "gaze_enabled": self.config.enable_gaze,
            "emotion_enabled": self.config.enable_emotion,
        }
