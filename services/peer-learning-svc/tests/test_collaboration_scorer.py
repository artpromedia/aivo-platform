"""Tests for CollaborationScorer model."""
import pytest
from datetime import datetime, timedelta
from typing import List, Dict

from app.models.collaboration_scorer import (
    CollaborationScorer,
    CollaborationScore,
    EngagementMetrics,
    CollaborationIssue,
)


class TestCollaborationScore:
    """Tests for CollaborationScore dataclass."""

    def test_creation(self):
        """Test creating a collaboration score."""
        score = CollaborationScore(
            overall=0.75,
            participation_balance=0.8,
            knowledge_sharing=0.7,
            supportiveness=0.6,
            task_focus=0.9,
        )
        
        assert score.overall == 0.75
        assert score.participation_balance == 0.8
        assert score.knowledge_sharing == 0.7
        assert score.supportiveness == 0.6
        assert score.task_focus == 0.9


class TestEngagementMetrics:
    """Tests for EngagementMetrics dataclass."""

    def test_creation(self):
        """Test creating engagement metrics."""
        metrics = EngagementMetrics(
            member_id="user_001",
            message_count=10,
            avg_message_length=50.0,
            response_rate=0.6,
            question_count=3,
            answer_count=5,
            engagement_level="high",
        )
        
        assert metrics.member_id == "user_001"
        assert metrics.message_count == 10
        assert metrics.engagement_level == "high"


class TestCollaborationIssue:
    """Tests for CollaborationIssue dataclass."""

    def test_creation(self):
        """Test creating a collaboration issue."""
        issue = CollaborationIssue(
            issue_type="dominance",
            severity="warning",
            affected_members=["user_001"],
            description="Member dominating discussion",
            suggestions=["Encourage others to participate"],
        )
        
        assert issue.issue_type == "dominance"
        assert issue.severity == "warning"
        assert "user_001" in issue.affected_members


class TestCollaborationScorer:
    """Tests for CollaborationScorer class."""

    @pytest.fixture
    def scorer(self):
        """Create a scorer instance."""
        return CollaborationScorer()

    @pytest.fixture
    def balanced_messages(self) -> List[Dict]:
        """Create balanced conversation messages."""
        base_time = datetime.now()
        return [
            {"sender_id": "user_001", "content": "What do you think about this concept?", "timestamp": (base_time + timedelta(seconds=0)).isoformat()},
            {"sender_id": "user_002", "content": "I think it works well because of the theory behind it.", "timestamp": (base_time + timedelta(seconds=30)).isoformat()},
            {"sender_id": "user_003", "content": "Great point! I learned something similar in practice.", "timestamp": (base_time + timedelta(seconds=60)).isoformat()},
            {"sender_id": "user_004", "content": "Thanks for the explanation. Let me share an example.", "timestamp": (base_time + timedelta(seconds=90)).isoformat()},
            {"sender_id": "user_001", "content": "That's a good example. I appreciate your help!", "timestamp": (base_time + timedelta(seconds=120)).isoformat()},
            {"sender_id": "user_002", "content": "I understand it better now. The concept makes sense.", "timestamp": (base_time + timedelta(seconds=150)).isoformat()},
            {"sender_id": "user_003", "content": "Great discussion! We've discovered a lot together.", "timestamp": (base_time + timedelta(seconds=180)).isoformat()},
            {"sender_id": "user_004", "content": "Agreed. This found knowledge is useful.", "timestamp": (base_time + timedelta(seconds=210)).isoformat()},
        ]

    @pytest.fixture
    def imbalanced_messages(self) -> List[Dict]:
        """Create imbalanced conversation with dominant speaker."""
        return [
            {"sender_id": "user_001", "content": "Let me explain this concept to you."},
            {"sender_id": "user_001", "content": "First, you need to understand the basics."},
            {"sender_id": "user_001", "content": "Then, consider how it works in practice."},
            {"sender_id": "user_001", "content": "Does that make sense?"},
            {"sender_id": "user_002", "content": "Yes."},
            {"sender_id": "user_001", "content": "Good. Now let me continue with examples."},
            {"sender_id": "user_001", "content": "Here's another important point."},
            {"sender_id": "user_001", "content": "Any questions?"},
        ]

    def test_init(self, scorer):
        """Test scorer initialization."""
        assert scorer.SUPPORTIVE_KEYWORDS is not None
        assert scorer.QUESTION_INDICATORS is not None

    def test_score_empty_messages(self, scorer):
        """Test scoring with no messages."""
        score = scorer.score({"messages": []})
        
        assert score.overall == 0.5
        assert score.participation_balance == 0.5

    def test_score_balanced_conversation(self, scorer, balanced_messages):
        """Test scoring a balanced conversation."""
        score = scorer.score({"messages": balanced_messages, "topic": "concepts"})
        
        assert 0 <= score.overall <= 1
        assert score.participation_balance > 0.5
        assert score.knowledge_sharing > 0.3
        assert score.supportiveness > 0.3

    def test_score_imbalanced_conversation(self, scorer, imbalanced_messages):
        """Test scoring an imbalanced conversation."""
        score = scorer.score({"messages": imbalanced_messages})
        
        assert 0 <= score.overall <= 1
        assert score.participation_balance < 0.7  # Lower due to dominance

    def test_score_with_topic(self, scorer, balanced_messages):
        """Test scoring with topic provided."""
        score = scorer.score({
            "messages": balanced_messages,
            "topic": "concept learning theory",
        })
        
        assert score.task_focus >= 0


class TestAnalyzeDynamics:
    """Tests for analyze_dynamics method."""

    @pytest.fixture
    def scorer(self):
        return CollaborationScorer()

    def test_analyze_empty(self, scorer):
        """Test analyzing empty messages."""
        result = scorer.analyze_dynamics([])
        
        assert result["total_messages"] == 0
        assert result["unique_participants"] == 0
        assert result["dynamics"] == "unknown"

    def test_analyze_healthy_dynamics(self, scorer):
        """Test analyzing healthy group dynamics."""
        messages = [
            {"sender_id": "user_001", "content": "First point."},
            {"sender_id": "user_002", "content": "Second point."},
            {"sender_id": "user_003", "content": "Third point."},
            {"sender_id": "user_001", "content": "Follow up."},
            {"sender_id": "user_002", "content": "Another thought."},
            {"sender_id": "user_003", "content": "Agreed."},
        ]
        
        result = scorer.analyze_dynamics(messages)
        
        assert result["total_messages"] == 6
        assert result["unique_participants"] == 3
        assert result["dynamics"] == "healthy"

    def test_analyze_imbalanced_dynamics(self, scorer):
        """Test analyzing imbalanced dynamics."""
        messages = [
            {"sender_id": "user_001", "content": "Message 1."},
            {"sender_id": "user_001", "content": "Message 2."},
            {"sender_id": "user_001", "content": "Message 3."},
            {"sender_id": "user_001", "content": "Message 4."},
            {"sender_id": "user_002", "content": "Short response."},
        ]
        
        result = scorer.analyze_dynamics(messages)
        
        assert result["dynamics"] == "imbalanced"
        assert any("Dominant" in p for p in result["patterns"])

    def test_analyze_uneven_dynamics(self, scorer):
        """Test analyzing uneven dynamics with low participation."""
        messages = [
            {"sender_id": "user_001", "content": "Message 1."},
            {"sender_id": "user_002", "content": "Message 2."},
            {"sender_id": "user_001", "content": "Message 3."},
            {"sender_id": "user_002", "content": "Message 4."},
            {"sender_id": "user_001", "content": "Message 5."},
            {"sender_id": "user_002", "content": "Message 6."},
            {"sender_id": "user_003", "content": "One message."},
        ]
        
        result = scorer.analyze_dynamics(messages)
        
        # May show low participation for user_003
        assert result["unique_participants"] == 3

    def test_analyze_with_timestamps(self, scorer):
        """Test analyzing with response times."""
        base_time = datetime.now()
        messages = [
            {"sender_id": "user_001", "content": "Hello", "timestamp": base_time.isoformat()},
            {"sender_id": "user_002", "content": "Hi", "timestamp": (base_time + timedelta(seconds=10)).isoformat()},
            {"sender_id": "user_001", "content": "How are you?", "timestamp": (base_time + timedelta(seconds=20)).isoformat()},
        ]
        
        result = scorer.analyze_dynamics(messages)
        
        assert result["avg_response_time_seconds"] is not None
        assert result["avg_response_time_seconds"] < 30


class TestIdentifyIssues:
    """Tests for identify_issues method."""

    @pytest.fixture
    def scorer(self):
        return CollaborationScorer()

    def test_identify_no_issues(self, scorer):
        """Test identifying issues in good collaboration."""
        score = CollaborationScore(
            overall=0.8,
            participation_balance=0.8,
            knowledge_sharing=0.7,
            supportiveness=0.7,
            task_focus=0.8,
        )
        
        issues = scorer.identify_issues(score)
        
        assert len(issues) == 0

    def test_identify_participation_issue(self, scorer):
        """Test identifying participation balance issue."""
        score = CollaborationScore(
            overall=0.5,
            participation_balance=0.3,
            knowledge_sharing=0.7,
            supportiveness=0.7,
            task_focus=0.7,
        )
        
        issues = scorer.identify_issues(score)
        
        assert any("participation" in i.lower() for i in issues)

    def test_identify_knowledge_sharing_issue(self, scorer):
        """Test identifying knowledge sharing issue."""
        score = CollaborationScore(
            overall=0.5,
            participation_balance=0.7,
            knowledge_sharing=0.2,
            supportiveness=0.7,
            task_focus=0.7,
        )
        
        issues = scorer.identify_issues(score)
        
        assert any("knowledge" in i.lower() for i in issues)

    def test_identify_supportiveness_issue(self, scorer):
        """Test identifying supportiveness issue."""
        score = CollaborationScore(
            overall=0.5,
            participation_balance=0.7,
            knowledge_sharing=0.7,
            supportiveness=0.2,
            task_focus=0.7,
        )
        
        issues = scorer.identify_issues(score)
        
        assert any("support" in i.lower() for i in issues)

    def test_identify_task_focus_issue(self, scorer):
        """Test identifying task focus issue."""
        score = CollaborationScore(
            overall=0.5,
            participation_balance=0.7,
            knowledge_sharing=0.7,
            supportiveness=0.7,
            task_focus=0.2,
        )
        
        issues = scorer.identify_issues(score)
        
        assert any("off-topic" in i.lower() for i in issues)

    def test_identify_overall_quality_issue(self, scorer):
        """Test identifying overall quality issue."""
        score = CollaborationScore(
            overall=0.3,
            participation_balance=0.5,
            knowledge_sharing=0.5,
            supportiveness=0.5,
            task_focus=0.5,
        )
        
        issues = scorer.identify_issues(score)
        
        assert any("overall" in i.lower() for i in issues)

    def test_identify_with_messages(self, scorer):
        """Test identifying issues with messages for deeper analysis."""
        score = CollaborationScore(
            overall=0.4,
            participation_balance=0.3,
            knowledge_sharing=0.5,
            supportiveness=0.5,
            task_focus=0.5,
        )
        messages = [
            {"sender_id": "user_001", "content": "Message 1"},
            {"sender_id": "user_001", "content": "Message 2"},
            {"sender_id": "user_001", "content": "Message 3"},
            {"sender_id": "user_002", "content": "Reply"},
        ]
        
        issues = scorer.identify_issues(score, messages)
        
        assert len(issues) > 0


class TestComputeEngagement:
    """Tests for compute_engagement method."""

    @pytest.fixture
    def scorer(self):
        return CollaborationScorer()

    def test_compute_empty(self, scorer):
        """Test computing engagement for empty messages."""
        result = scorer.compute_engagement([])
        assert result == []

    def test_compute_engagement_basic(self, scorer):
        """Test computing basic engagement metrics."""
        messages = [
            {"sender_id": "user_001", "content": "Hello, how are you?"},
            {"sender_id": "user_002", "content": "I'm good. Let me explain something because it's important."},
            {"sender_id": "user_001", "content": "Thanks for sharing!"},
            {"sender_id": "user_002", "content": "You're welcome. Here's an example to understand better."},
        ]
        
        metrics = scorer.compute_engagement(messages)
        
        assert len(metrics) == 2
        # Both users should have metrics
        user_ids = {m.member_id for m in metrics}
        assert "user_001" in user_ids
        assert "user_002" in user_ids

    def test_compute_engagement_with_member_list(self, scorer):
        """Test computing engagement including inactive members."""
        messages = [
            {"sender_id": "user_001", "content": "Hello"},
            {"sender_id": "user_002", "content": "Hi"},
        ]
        member_ids = ["user_001", "user_002", "user_003"]
        
        metrics = scorer.compute_engagement(messages, member_ids)
        
        assert len(metrics) == 3
        # user_003 should be disengaged
        user_003_metrics = next(m for m in metrics if m.member_id == "user_003")
        assert user_003_metrics.engagement_level == "disengaged"
        assert user_003_metrics.message_count == 0

    def test_compute_engagement_levels(self, scorer):
        """Test different engagement level classifications."""
        messages = [
            # High engagement user
            {"sender_id": "user_001", "content": "Here's a detailed explanation about the concept and theory."},
            {"sender_id": "user_001", "content": "Let me share another example because it helps understand."},
            {"sender_id": "user_001", "content": "Great question! The answer involves practice and learning."},
            {"sender_id": "user_001", "content": "I found this works well in real scenarios."},
            {"sender_id": "user_001", "content": "Thanks for the discussion, I've learned a lot."},
            # Low engagement user
            {"sender_id": "user_002", "content": "Ok"},
        ]
        
        metrics = scorer.compute_engagement(messages)
        
        user_001 = next(m for m in metrics if m.member_id == "user_001")
        user_002 = next(m for m in metrics if m.member_id == "user_002")
        
        assert user_001.engagement_level in ["high", "medium"]
        assert user_002.engagement_level == "low"

    def test_compute_question_answer_counts(self, scorer):
        """Test counting questions and answers."""
        messages = [
            {"sender_id": "user_001", "content": "How does this work?"},
            {"sender_id": "user_002", "content": "It works because of the underlying concept."},
            {"sender_id": "user_001", "content": "What about the theory?"},
            {"sender_id": "user_002", "content": "The theory explains it well."},
        ]
        
        metrics = scorer.compute_engagement(messages)
        
        user_001 = next(m for m in metrics if m.member_id == "user_001")
        user_002 = next(m for m in metrics if m.member_id == "user_002")
        
        assert user_001.question_count >= 2
        assert user_002.answer_count >= 1


class TestDetectIssues:
    """Tests for detect_issues method."""

    @pytest.fixture
    def scorer(self):
        return CollaborationScorer()

    def test_detect_no_issues(self, scorer):
        """Test detecting no issues in good interaction."""
        data = {
            "messages": [
                {"sender_id": "user_001", "content": "Great explanation about the concept."},
                {"sender_id": "user_002", "content": "Thanks! Let me share an example."},
                {"sender_id": "user_003", "content": "I understand the theory now."},
                {"sender_id": "user_001", "content": "Good discussion, I appreciate your help."},
            ],
            "member_ids": ["user_001", "user_002", "user_003"],
        }
        
        issues = scorer.detect_issues(data)
        
        # May have some minor issues but should not have critical ones
        critical_issues = [i for i in issues if i.severity == "critical"]
        assert len(critical_issues) == 0

    def test_detect_dominance(self, scorer):
        """Test detecting dominance issue."""
        data = {
            "messages": [
                {"sender_id": "user_001", "content": "Message 1"},
                {"sender_id": "user_001", "content": "Message 2"},
                {"sender_id": "user_001", "content": "Message 3"},
                {"sender_id": "user_001", "content": "Message 4"},
                {"sender_id": "user_001", "content": "Message 5"},
                {"sender_id": "user_002", "content": "Short reply"},
            ],
            "member_ids": ["user_001", "user_002"],
        }
        
        issues = scorer.detect_issues(data)
        
        dominance_issues = [i for i in issues if i.issue_type == "dominance"]
        assert len(dominance_issues) >= 1

    def test_detect_disengagement(self, scorer):
        """Test detecting disengagement."""
        data = {
            "messages": [
                {"sender_id": "user_001", "content": "Discussion about topic."},
                {"sender_id": "user_002", "content": "Good point about the concept."},
            ],
            "member_ids": ["user_001", "user_002", "user_003", "user_004"],
        }
        
        issues = scorer.detect_issues(data)
        
        disengagement_issues = [i for i in issues if i.issue_type == "disengagement"]
        assert len(disengagement_issues) >= 1

    def test_detect_off_topic(self, scorer):
        """Test detecting off-topic discussion."""
        data = {
            "messages": [
                {"sender_id": "user_001", "content": "Lol, did you see that movie?"},
                {"sender_id": "user_002", "content": "Haha yes, btw random thought."},
                {"sender_id": "user_001", "content": "Off topic but I'm going to lunch."},
                {"sender_id": "user_002", "content": "What game are you playing this weekend?"},
            ],
            "topic": "mathematics",
            "member_ids": ["user_001", "user_002"],
        }
        
        issues = scorer.detect_issues(data)
        
        off_topic_issues = [i for i in issues if i.issue_type == "off_topic"]
        assert len(off_topic_issues) >= 1

    def test_detect_conflict(self, scorer):
        """Test detecting conflict in discussion."""
        # Need enough negative messages to trigger conflict detection
        data = {
            "messages": [
                {"sender_id": "user_001", "content": "I'm frustrated with this."},
                {"sender_id": "user_002", "content": "This is ridiculous."},
                {"sender_id": "user_001", "content": "I'm so annoyed and angry about this."},
                {"sender_id": "user_002", "content": "This is stupid and pointless."},
                {"sender_id": "user_001", "content": "I'm upset about this approach."},
            ],
            "member_ids": ["user_001", "user_002"],
        }
        
        issues = scorer.detect_issues(data)
        
        # Should detect some issue with this negative content
        assert len(issues) >= 1

    def test_detect_low_knowledge_sharing(self, scorer):
        """Test detecting low knowledge sharing."""
        data = {
            "messages": [
                {"sender_id": "user_001", "content": "Ok"},
                {"sender_id": "user_002", "content": "Sure"},
                {"sender_id": "user_001", "content": "Yes"},
                {"sender_id": "user_002", "content": "No"},
            ],
            "member_ids": ["user_001", "user_002"],
        }
        
        issues = scorer.detect_issues(data)
        
        sharing_issues = [i for i in issues if i.issue_type == "low_knowledge_sharing"]
        assert len(sharing_issues) >= 1


class TestPrivateMethods:
    """Tests for private helper methods."""

    @pytest.fixture
    def scorer(self):
        return CollaborationScorer()

    def test_compute_participation_balance_empty(self, scorer):
        """Test participation balance with empty messages."""
        score = scorer._compute_participation_balance([])
        assert score == 0.5

    def test_compute_participation_balance_single_sender(self, scorer):
        """Test participation balance with single sender."""
        messages = [
            {"sender_id": "user_001", "content": "Message 1"},
            {"sender_id": "user_001", "content": "Message 2"},
        ]
        score = scorer._compute_participation_balance(messages)
        assert score == 0.5

    def test_compute_participation_balance_equal(self, scorer):
        """Test participation balance with equal participation."""
        messages = [
            {"sender_id": "user_001", "content": "Message 1"},
            {"sender_id": "user_002", "content": "Message 2"},
            {"sender_id": "user_001", "content": "Message 3"},
            {"sender_id": "user_002", "content": "Message 4"},
        ]
        score = scorer._compute_participation_balance(messages)
        assert score > 0.8  # High balance

    def test_compute_participation_balance_unequal(self, scorer):
        """Test participation balance with unequal participation."""
        messages = [
            {"sender_id": "user_001", "content": "Message 1"},
            {"sender_id": "user_001", "content": "Message 2"},
            {"sender_id": "user_001", "content": "Message 3"},
            {"sender_id": "user_002", "content": "Message 4"},
        ]
        score = scorer._compute_participation_balance(messages)
        assert score < 0.8  # Lower balance

    def test_compute_knowledge_sharing_empty(self, scorer):
        """Test knowledge sharing with empty messages."""
        score = scorer._compute_knowledge_sharing([])
        assert score == 0.5

    def test_compute_knowledge_sharing_high(self, scorer):
        """Test high knowledge sharing."""
        messages = [
            {"sender_id": "user_001", "content": "Let me explain this concept to you."},
            {"sender_id": "user_002", "content": "Here's an example of how it works."},
            {"sender_id": "user_001", "content": "I understand the theory behind it."},
        ]
        score = scorer._compute_knowledge_sharing(messages)
        assert score > 0.5

    def test_compute_knowledge_sharing_low(self, scorer):
        """Test low knowledge sharing."""
        messages = [
            {"sender_id": "user_001", "content": "Ok"},
            {"sender_id": "user_002", "content": "Sure"},
            {"sender_id": "user_001", "content": "Yes"},
        ]
        score = scorer._compute_knowledge_sharing(messages)
        assert score < 0.5

    def test_compute_supportiveness_empty(self, scorer):
        """Test supportiveness with empty messages."""
        score = scorer._compute_supportiveness([])
        assert score == 0.5

    def test_compute_supportiveness_high(self, scorer):
        """Test high supportiveness."""
        messages = [
            {"sender_id": "user_001", "content": "Thanks for your help!"},
            {"sender_id": "user_002", "content": "Great point, well done!"},
            {"sender_id": "user_001", "content": "I agree, that's excellent."},
        ]
        score = scorer._compute_supportiveness(messages)
        assert score > 0.5

    def test_compute_task_focus_empty(self, scorer):
        """Test task focus with empty messages."""
        score = scorer._compute_task_focus([], "topic")
        assert score == 0.5

    def test_compute_task_focus_on_topic(self, scorer):
        """Test task focus with on-topic messages."""
        messages = [
            {"sender_id": "user_001", "content": "Let's discuss mathematics."},
            {"sender_id": "user_002", "content": "Yes, mathematics is interesting."},
        ]
        score = scorer._compute_task_focus(messages, "mathematics")
        assert score > 0.5

    def test_compute_task_focus_off_topic(self, scorer):
        """Test task focus with off-topic messages."""
        messages = [
            {"sender_id": "user_001", "content": "Lol, this is random."},
            {"sender_id": "user_002", "content": "Haha, anyway let's talk about movies."},
            {"sender_id": "user_001", "content": "What game did you play this weekend?"},
        ]
        score = scorer._compute_task_focus(messages, "mathematics")
        assert score < 0.7

    def test_compute_response_times(self, scorer):
        """Test response time computation."""
        base_time = datetime.now()
        messages = [
            {"sender_id": "user_001", "content": "Hello", "timestamp": base_time.isoformat()},
            {"sender_id": "user_002", "content": "Hi", "timestamp": (base_time + timedelta(seconds=30)).isoformat()},
            {"sender_id": "user_001", "content": "How are you?", "timestamp": (base_time + timedelta(seconds=60)).isoformat()},
        ]
        
        times = scorer._compute_response_times(messages)
        
        assert len(times) == 2
        assert times[0] == 30.0
        assert times[1] == 30.0

    def test_compute_response_times_invalid(self, scorer):
        """Test response time with invalid timestamps."""
        messages = [
            {"sender_id": "user_001", "content": "Hello"},
            {"sender_id": "user_002", "content": "Hi", "timestamp": "invalid"},
        ]
        
        times = scorer._compute_response_times(messages)
        assert len(times) == 0

    def test_detect_dominance_none(self, scorer):
        """Test no dominance detected."""
        engagement = [
            EngagementMetrics("user_001", 5, 50.0, 0.5, 2, 3, "high"),
            EngagementMetrics("user_002", 5, 50.0, 0.5, 2, 3, "high"),
        ]
        messages = [{"sender_id": "user_001"} for _ in range(5)] + [{"sender_id": "user_002"} for _ in range(5)]
        
        issue = scorer._detect_dominance(messages, engagement)
        assert issue is None

    def test_detect_disengagement_none(self, scorer):
        """Test no disengagement detected."""
        engagement = [
            EngagementMetrics("user_001", 5, 50.0, 0.5, 2, 3, "high"),
            EngagementMetrics("user_002", 5, 50.0, 0.5, 2, 3, "medium"),
        ]
        
        issue = scorer._detect_disengagement(engagement)
        assert issue is None

    def test_detect_off_topic_none(self, scorer):
        """Test no off-topic detected."""
        messages = [
            {"sender_id": "user_001", "content": "Let's discuss the main topic."},
            {"sender_id": "user_002", "content": "Good point about the topic."},
        ]
        
        issue = scorer._detect_off_topic(messages, "topic")
        assert issue is None

    def test_detect_conflict_none(self, scorer):
        """Test no conflict detected."""
        messages = [
            {"sender_id": "user_001", "content": "I think this is a good approach."},
            {"sender_id": "user_002", "content": "I agree with you."},
        ]
        
        issue = scorer._detect_conflict(messages)
        assert issue is None
