"""
Collaboration Scorer

Score quality of peer collaboration based on interaction metrics
and detect collaboration issues.
"""
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from collections import defaultdict
from datetime import datetime

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class CollaborationScore:
    """Comprehensive collaboration quality score."""
    overall: float
    participation_balance: float
    knowledge_sharing: float
    supportiveness: float
    task_focus: float
    outcome_improvement: float = 0.0
    recommendations: List[str] = field(default_factory=list)


@dataclass
class EngagementMetrics:
    """Engagement metrics for a group member."""
    member_id: str
    message_count: int
    avg_message_length: float
    response_rate: float
    question_count: int
    answer_count: int
    engagement_level: str  # "high", "medium", "low", "disengaged"


@dataclass
class CollaborationIssue:
    """Detected collaboration issue."""
    issue_type: str
    severity: str  # "critical", "warning", "info"
    affected_members: List[str]
    description: str
    suggestions: List[str]


class CollaborationScorer:
    """
    Score quality of peer collaboration.

    Dimensions:
    - Participation balance
    - Knowledge sharing
    - Supportiveness
    - Task focus

    Usage:
        scorer = CollaborationScorer()
        score = scorer.score(interaction_data)
    """

    # Keywords indicating different types of interactions
    SUPPORTIVE_KEYWORDS = [
        "help", "thanks", "great", "good point", "agree", "nice",
        "well done", "excellent", "appreciate", "support", "encourage"
    ]

    QUESTION_INDICATORS = ["?", "how", "what", "why", "when", "where", "could you", "can you"]

    KNOWLEDGE_SHARING_KEYWORDS = [
        "because", "example", "explain", "means", "works", "understand",
        "concept", "theory", "practice", "learned", "discovered", "found"
    ]

    OFF_TOPIC_KEYWORDS = [
        "lol", "haha", "btw", "anyway", "random", "off topic",
        "unrelated", "lunch", "weekend", "movie", "game"
    ]

    def __init__(self):
        """Initialize CollaborationScorer."""
        logger.info("CollaborationScorer initialized")

    def score(
        self,
        interaction_data: Dict,
    ) -> CollaborationScore:
        """
        Score collaboration quality from interaction data.

        Args:
            interaction_data: Dictionary containing:
                - messages: List of message dicts with sender_id, content, timestamp
                - topic: Optional discussion topic
                - duration_minutes: Optional session duration

        Returns:
            CollaborationScore with overall and dimension scores
        """
        messages = interaction_data.get("messages", [])

        if not messages:
            logger.warning("No messages provided for scoring")
            return CollaborationScore(
                overall=0.5,
                participation_balance=0.5,
                knowledge_sharing=0.5,
                supportiveness=0.5,
                task_focus=0.5,
            )

        # Compute individual dimension scores
        participation_balance = self._compute_participation_balance(messages)
        knowledge_sharing = self._compute_knowledge_sharing(messages)
        supportiveness = self._compute_supportiveness(messages)
        task_focus = self._compute_task_focus(messages, interaction_data.get("topic", ""))

        # Weighted overall score
        overall = (
            0.25 * participation_balance +
            0.30 * knowledge_sharing +
            0.25 * supportiveness +
            0.20 * task_focus
        )

        logger.info(
            "Collaboration score computed: overall=%.2f (balance=%.2f, sharing=%.2f, support=%.2f, focus=%.2f)",
            overall, participation_balance, knowledge_sharing, supportiveness, task_focus
        )

        return CollaborationScore(
            overall=overall,
            participation_balance=participation_balance,
            knowledge_sharing=knowledge_sharing,
            supportiveness=supportiveness,
            task_focus=task_focus,
        )

    def analyze_dynamics(
        self,
        messages: List[Dict],
    ) -> Dict:
        """
        Analyze group dynamics from messages.

        Args:
            messages: List of message dictionaries

        Returns:
            Dictionary with dynamics analysis
        """
        if not messages:
            return {
                "total_messages": 0,
                "unique_participants": 0,
                "dynamics": "unknown",
                "patterns": [],
            }

        # Extract participants
        participants = set(m.get("sender_id", "unknown") for m in messages)

        # Message distribution
        message_counts = defaultdict(int)
        for m in messages:
            sender = m.get("sender_id", "unknown")
            message_counts[sender] += 1

        counts = list(message_counts.values())
        total = sum(counts)

        # Detect patterns
        patterns = []

        # Check for dominant speaker
        if counts:
            max_share = max(counts) / total if total > 0 else 0
            if max_share > 0.5:
                dominant = max(message_counts.keys(), key=lambda k: message_counts[k])
                patterns.append(f"Dominant speaker: {dominant}")

        # Check for silent participants
        if len(participants) > 1:
            min_share = min(counts) / total if total > 0 else 0
            if min_share < 0.1:
                quiet = min(message_counts.keys(), key=lambda k: message_counts[k])
                patterns.append(f"Low participation: {quiet}")

        # Check conversation flow
        response_times = self._compute_response_times(messages)
        if response_times:
            avg_response = np.mean(response_times)
            if avg_response > 300:  # 5 minutes
                patterns.append("Slow response times")
            elif avg_response < 30:
                patterns.append("Active real-time discussion")

        # Determine overall dynamics
        if len(patterns) == 0:
            dynamics = "healthy"
        elif any("Dominant" in p for p in patterns):
            dynamics = "imbalanced"
        elif any("Low participation" in p for p in patterns):
            dynamics = "uneven"
        else:
            dynamics = "moderate"

        return {
            "total_messages": total,
            "unique_participants": len(participants),
            "message_distribution": dict(message_counts),
            "dynamics": dynamics,
            "patterns": patterns,
            "avg_response_time_seconds": np.mean(response_times) if response_times else None,
        }

    def identify_issues(
        self,
        score: CollaborationScore,
        messages: Optional[List[Dict]] = None,
    ) -> List[str]:
        """
        Identify collaboration issues based on score.

        Args:
            score: CollaborationScore from scoring
            messages: Optional messages for deeper analysis

        Returns:
            List of identified issue descriptions
        """
        issues = []

        if score.participation_balance < 0.4:
            issues.append("Uneven participation among group members")

        if score.knowledge_sharing < 0.4:
            issues.append("Limited knowledge sharing in discussions")

        if score.supportiveness < 0.4:
            issues.append("Low supportiveness in interactions")

        if score.task_focus < 0.4:
            issues.append("Discussion frequently goes off-topic")

        if score.overall < 0.5:
            issues.append("Overall collaboration quality below expectations")

        # Deeper analysis with messages
        if messages:
            dynamics = self.analyze_dynamics(messages)
            if dynamics["dynamics"] == "imbalanced":
                issues.append("One or more members dominating the discussion")
            elif dynamics["dynamics"] == "uneven":
                issues.append("Some members not actively participating")

        return issues

    def compute_engagement(
        self,
        messages: List[Dict],
        member_ids: Optional[List[str]] = None,
    ) -> List[EngagementMetrics]:
        """
        Compute engagement metrics for each group member.

        Args:
            messages: List of message dictionaries
            member_ids: Optional list of all member IDs (to include inactive members)

        Returns:
            List of EngagementMetrics for each member
        """
        if not messages:
            return []

        # Get all members
        active_members = set(m.get("sender_id", "unknown") for m in messages)
        all_members = set(member_ids) if member_ids else active_members

        # Group messages by sender
        messages_by_sender = defaultdict(list)
        for m in messages:
            sender = m.get("sender_id", "unknown")
            messages_by_sender[sender].append(m)

        # Compute response rates (who responds to whom)
        response_counts = defaultdict(int)
        for i, m in enumerate(messages[1:], 1):
            sender = m.get("sender_id", "unknown")
            prev_sender = messages[i - 1].get("sender_id", "unknown")
            if sender != prev_sender:
                response_counts[sender] += 1

        total_potential_responses = max(1, len(messages) - 1)

        metrics = []
        for member_id in all_members:
            member_messages = messages_by_sender.get(member_id, [])

            message_count = len(member_messages)

            # Average message length
            if member_messages:
                lengths = [len(m.get("content", "")) for m in member_messages]
                avg_length = np.mean(lengths)
            else:
                avg_length = 0.0

            # Response rate
            responses = response_counts.get(member_id, 0)
            response_rate = responses / total_potential_responses if total_potential_responses > 0 else 0.0

            # Count questions and answers
            question_count = 0
            answer_count = 0
            for m in member_messages:
                content = m.get("content", "").lower()
                if any(ind in content for ind in self.QUESTION_INDICATORS):
                    question_count += 1
                if any(kw in content for kw in self.KNOWLEDGE_SHARING_KEYWORDS):
                    answer_count += 1

            # Determine engagement level
            if message_count == 0:
                engagement_level = "disengaged"
            elif message_count < 2 or avg_length < 20:
                engagement_level = "low"
            elif message_count < 5 or avg_length < 50:
                engagement_level = "medium"
            else:
                engagement_level = "high"

            metrics.append(EngagementMetrics(
                member_id=member_id,
                message_count=message_count,
                avg_message_length=avg_length,
                response_rate=response_rate,
                question_count=question_count,
                answer_count=answer_count,
                engagement_level=engagement_level,
            ))

        return metrics

    def detect_issues(
        self,
        interaction_data: Dict,
    ) -> List[CollaborationIssue]:
        """
        Detect specific collaboration issues.

        Args:
            interaction_data: Dictionary with messages and metadata

        Returns:
            List of CollaborationIssue objects
        """
        messages = interaction_data.get("messages", [])
        member_ids = interaction_data.get("member_ids", [])

        if not messages:
            return []

        issues = []

        # Get engagement metrics
        engagement = self.compute_engagement(messages, member_ids)

        # Detect dominance
        dominance_issue = self._detect_dominance(messages, engagement)
        if dominance_issue:
            issues.append(dominance_issue)

        # Detect disengagement
        disengagement_issue = self._detect_disengagement(engagement)
        if disengagement_issue:
            issues.append(disengagement_issue)

        # Detect off-topic drift
        off_topic_issue = self._detect_off_topic(messages, interaction_data.get("topic", ""))
        if off_topic_issue:
            issues.append(off_topic_issue)

        # Detect conflict
        conflict_issue = self._detect_conflict(messages)
        if conflict_issue:
            issues.append(conflict_issue)

        # Detect low knowledge sharing
        score = self.score(interaction_data)
        if score.knowledge_sharing < 0.3:
            issues.append(CollaborationIssue(
                issue_type="low_knowledge_sharing",
                severity="warning",
                affected_members=[],
                description="Limited knowledge sharing detected in the discussion",
                suggestions=[
                    "Encourage members to share examples and explanations",
                    "Ask probing questions to elicit deeper understanding",
                    "Assign specific topics for each member to explain",
                ],
            ))

        logger.info("Detected %d collaboration issues", len(issues))
        return issues

    def _compute_participation_balance(self, messages: List[Dict]) -> float:
        """Compute participation balance score."""
        if not messages:
            return 0.5

        # Count messages per participant
        counts = defaultdict(int)
        for m in messages:
            sender = m.get("sender_id", "unknown")
            counts[sender] += 1

        if len(counts) <= 1:
            return 0.5  # Single participant or no variation

        # Compute Gini coefficient (0 = perfect equality, 1 = perfect inequality)
        values = np.array(list(counts.values()))
        values = np.sort(values)
        n = len(values)

        if n == 0 or values.sum() == 0:
            return 0.5

        cumulative = np.cumsum(values)
        gini = (n + 1 - 2 * np.sum(cumulative) / cumulative[-1]) / n

        # Convert Gini to balance score (higher = more balanced)
        balance = 1.0 - gini
        return max(0.0, min(1.0, balance))

    def _compute_knowledge_sharing(self, messages: List[Dict]) -> float:
        """Compute knowledge sharing score."""
        if not messages:
            return 0.5

        sharing_count = 0
        for m in messages:
            content = m.get("content", "").lower()
            if any(kw in content for kw in self.KNOWLEDGE_SHARING_KEYWORDS):
                sharing_count += 1

        # Normalize by message count
        sharing_ratio = sharing_count / len(messages)

        # Expected: at least 30% of messages should contain knowledge sharing
        score = min(1.0, sharing_ratio / 0.3)
        return score

    def _compute_supportiveness(self, messages: List[Dict]) -> float:
        """Compute supportiveness score."""
        if not messages:
            return 0.5

        supportive_count = 0
        for m in messages:
            content = m.get("content", "").lower()
            if any(kw in content for kw in self.SUPPORTIVE_KEYWORDS):
                supportive_count += 1

        # Normalize
        support_ratio = supportive_count / len(messages)

        # Expected: at least 20% of messages should be supportive
        score = min(1.0, support_ratio / 0.2)
        return score

    def _compute_task_focus(self, messages: List[Dict], topic: str) -> float:
        """Compute task focus score."""
        if not messages:
            return 0.5

        off_topic_count = 0
        on_topic_count = 0

        topic_words = set(topic.lower().split()) if topic else set()

        for m in messages:
            content = m.get("content", "").lower()

            # Check off-topic indicators
            if any(kw in content for kw in self.OFF_TOPIC_KEYWORDS):
                off_topic_count += 1
                continue

            # Check topic relevance if topic provided
            if topic_words:
                content_words = set(content.split())
                if topic_words & content_words:
                    on_topic_count += 1

        # Compute focus score
        if not topic:
            # No topic provided, just penalize off-topic
            focus = 1.0 - (off_topic_count / len(messages))
        else:
            total_assessed = on_topic_count + off_topic_count
            if total_assessed > 0:
                focus = on_topic_count / total_assessed
            else:
                focus = 0.7  # Default if unclear

        return max(0.0, min(1.0, focus))

    def _compute_response_times(self, messages: List[Dict]) -> List[float]:
        """Compute response times between messages in seconds."""
        response_times = []

        for i in range(1, len(messages)):
            prev_time = messages[i - 1].get("timestamp")
            curr_time = messages[i].get("timestamp")

            if prev_time and curr_time:
                try:
                    if isinstance(prev_time, str):
                        prev_dt = datetime.fromisoformat(prev_time.replace("Z", "+00:00"))
                    else:
                        prev_dt = prev_time

                    if isinstance(curr_time, str):
                        curr_dt = datetime.fromisoformat(curr_time.replace("Z", "+00:00"))
                    else:
                        curr_dt = curr_time

                    diff = (curr_dt - prev_dt).total_seconds()
                    if diff >= 0:
                        response_times.append(diff)
                except (ValueError, TypeError):
                    continue

        return response_times

    def _detect_dominance(
        self,
        messages: List[Dict],
        engagement: List[EngagementMetrics],
    ) -> Optional[CollaborationIssue]:
        """Detect if one member is dominating the discussion."""
        if not engagement or len(engagement) < 2:
            return None

        total_messages = sum(e.message_count for e in engagement)
        if total_messages == 0:
            return None

        # Check for dominant speaker (>50% of messages)
        dominant = None
        for e in engagement:
            share = e.message_count / total_messages
            if share > 0.5:
                dominant = e.member_id
                break

        if dominant:
            return CollaborationIssue(
                issue_type="dominance",
                severity="warning",
                affected_members=[dominant],
                description=f"Member {dominant} is contributing over 50% of messages",
                suggestions=[
                    "Encourage other members to share their thoughts",
                    "Ask direct questions to quieter participants",
                    "Implement round-robin speaking turns",
                ],
            )

        return None

    def _detect_disengagement(
        self,
        engagement: List[EngagementMetrics],
    ) -> Optional[CollaborationIssue]:
        """Detect disengaged members."""
        disengaged = [e.member_id for e in engagement if e.engagement_level == "disengaged"]

        if disengaged:
            return CollaborationIssue(
                issue_type="disengagement",
                severity="warning" if len(disengaged) == 1 else "critical",
                affected_members=disengaged,
                description=f"Members {', '.join(disengaged)} appear disengaged",
                suggestions=[
                    "Directly address disengaged members with questions",
                    "Check if there are barriers to participation",
                    "Assign specific roles or tasks to each member",
                    "Consider smaller breakout discussions",
                ],
            )

        # Also check for low engagement
        low_engagement = [e.member_id for e in engagement if e.engagement_level == "low"]
        if len(low_engagement) >= 2:
            return CollaborationIssue(
                issue_type="low_engagement",
                severity="info",
                affected_members=low_engagement,
                description=f"Multiple members showing low engagement",
                suggestions=[
                    "Use icebreaker activities to increase comfort",
                    "Ask open-ended questions to encourage participation",
                ],
            )

        return None

    def _detect_off_topic(
        self,
        messages: List[Dict],
        topic: str,
    ) -> Optional[CollaborationIssue]:
        """Detect if discussion has gone off-topic."""
        if not messages:
            return None

        off_topic_count = 0
        for m in messages:
            content = m.get("content", "").lower()
            if any(kw in content for kw in self.OFF_TOPIC_KEYWORDS):
                off_topic_count += 1

        off_topic_ratio = off_topic_count / len(messages)

        if off_topic_ratio > 0.3:
            return CollaborationIssue(
                issue_type="off_topic",
                severity="warning",
                affected_members=[],
                description="Discussion appears to be frequently going off-topic",
                suggestions=[
                    f"Redirect conversation back to: {topic}" if topic else "Refocus on the main topic",
                    "Set clear discussion objectives",
                    "Use a parking lot for off-topic items",
                ],
            )

        return None

    def _detect_conflict(
        self,
        messages: List[Dict],
    ) -> Optional[CollaborationIssue]:
        """Detect potential conflict in messages."""
        conflict_indicators = [
            "disagree", "wrong", "no way", "that's not", "you're mistaken",
            "actually", "but", "however", "I don't think", "not true"
        ]

        negative_tone = [
            "frustrated", "annoyed", "angry", "upset", "ridiculous",
            "stupid", "waste", "pointless"
        ]

        conflict_count = 0
        negative_count = 0
        involved_members = set()

        for m in messages:
            content = m.get("content", "").lower()
            sender = m.get("sender_id", "unknown")

            has_conflict = any(ind in content for ind in conflict_indicators)
            has_negative = any(neg in content for neg in negative_tone)

            if has_conflict:
                conflict_count += 1
                involved_members.add(sender)
            if has_negative:
                negative_count += 1
                involved_members.add(sender)

        # Check thresholds
        if negative_count >= 3 or (conflict_count >= 5 and len(messages) < 20):
            return CollaborationIssue(
                issue_type="conflict",
                severity="critical" if negative_count >= 3 else "warning",
                affected_members=list(involved_members),
                description="Potential conflict or tension detected in the discussion",
                suggestions=[
                    "Acknowledge different viewpoints constructively",
                    "Focus on facts and evidence rather than opinions",
                    "Take a short break if tensions are high",
                    "Mediate by finding common ground",
                ],
            )

        return None

    # -----------------------------------------------------------------
    # S13: Outcome-improvement scoring
    # -----------------------------------------------------------------

    def score_with_outcomes(
        self,
        interaction_data: Dict,
        pre_mastery: Optional[Dict[str, float]] = None,
        post_mastery: Optional[Dict[str, float]] = None,
    ) -> CollaborationScore:
        """Score collaboration quality including pre/post mastery gains.

        Args:
            interaction_data: messages, topic, member_ids
            pre_mastery:  {member_id: mastery_0_to_1} before the session
            post_mastery: {member_id: mastery_0_to_1} after the session

        Returns:
            CollaborationScore with outcome_improvement populated.
        """
        base = self.score(interaction_data)
        outcome = self._compute_outcome_improvement(pre_mastery, post_mastery)

        # Re-weight overall to include outcome dimension
        overall = (
            0.20 * base.participation_balance
            + 0.25 * base.knowledge_sharing
            + 0.20 * base.supportiveness
            + 0.15 * base.task_focus
            + 0.20 * outcome
        )

        recommendations = self._generate_recommendations(base, outcome)

        return CollaborationScore(
            overall=overall,
            participation_balance=base.participation_balance,
            knowledge_sharing=base.knowledge_sharing,
            supportiveness=base.supportiveness,
            task_focus=base.task_focus,
            outcome_improvement=outcome,
            recommendations=recommendations,
        )

    def _compute_outcome_improvement(
        self,
        pre_mastery: Optional[Dict[str, float]],
        post_mastery: Optional[Dict[str, float]],
    ) -> float:
        """Compute normalised outcome improvement from mastery deltas."""
        if not pre_mastery or not post_mastery:
            return 0.5  # neutral when data unavailable

        gains: List[float] = []
        for member in pre_mastery:
            pre = pre_mastery.get(member, 0.0)
            post = post_mastery.get(member, pre)
            gains.append(max(0.0, post - pre))

        if not gains:
            return 0.5

        avg_gain = float(np.mean(gains))
        # Ceiling-effect aware: a 0.15 avg gain ≈ 1.0 score
        score = min(1.0, avg_gain / 0.15)

        logger.info("Outcome improvement: avg_gain=%.3f score=%.2f", avg_gain, score)
        return score

    @staticmethod
    def _generate_recommendations(
        base: 'CollaborationScore',
        outcome: float,
    ) -> List[str]:
        """Return actionable suggestions based on dimension scores."""
        recs: List[str] = []
        if base.participation_balance < 0.4:
            recs.append("Assign rotating speaker roles to balance participation.")
        if base.knowledge_sharing < 0.4:
            recs.append("Use think-pair-share to encourage knowledge exchange.")
        if base.supportiveness < 0.4:
            recs.append("Model supportive language and recognise peer contributions.")
        if base.task_focus < 0.4:
            recs.append("Set a visible timer and agenda to keep discussion on track.")
        if outcome < 0.3:
            recs.append("Review learning objectives — mastery gains were low.")
        if not recs:
            recs.append("Collaboration is strong across all dimensions — keep it up!")
        return recs
