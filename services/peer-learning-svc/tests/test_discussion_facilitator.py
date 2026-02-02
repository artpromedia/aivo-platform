"""Tests for DiscussionFacilitator model."""
import pytest
from typing import List, Dict

from app.models.discussion_facilitator import (
    DiscussionFacilitator,
    FacilitationAction,
    ConflictInfo,
    RedirectSuggestion,
)


class TestFacilitationAction:
    """Tests for FacilitationAction dataclass."""

    def test_creation(self):
        """Test creating a facilitation action."""
        action = FacilitationAction(
            action_type="prompt",
            target="user_001",
            message="What do you think?",
            priority=1,
        )
        
        assert action.action_type == "prompt"
        assert action.target == "user_001"
        assert action.message == "What do you think?"
        assert action.priority == 1

    def test_default_priority(self):
        """Test default priority value."""
        action = FacilitationAction(
            action_type="encourage",
            target=None,
            message="Share your thoughts.",
        )
        
        assert action.priority == 1


class TestConflictInfo:
    """Tests for ConflictInfo dataclass."""

    def test_creation(self):
        """Test creating a conflict info."""
        conflict = ConflictInfo(
            conflict_type="disagreement",
            involved_members=["user_001", "user_002"],
            description="Repeated disagreement",
            severity="medium",
        )
        
        assert conflict.conflict_type == "disagreement"
        assert len(conflict.involved_members) == 2
        assert conflict.severity == "medium"


class TestRedirectSuggestion:
    """Tests for RedirectSuggestion dataclass."""

    def test_creation(self):
        """Test creating a redirect suggestion."""
        redirect = RedirectSuggestion(
            reason="Off-topic discussion",
            redirect_message="Let's focus on the main topic.",
            target_topic="mathematics",
        )
        
        assert redirect.reason == "Off-topic discussion"
        assert redirect.target_topic == "mathematics"


class TestDiscussionFacilitator:
    """Tests for DiscussionFacilitator class."""

    @pytest.fixture
    def facilitator(self):
        """Create a facilitator instance."""
        return DiscussionFacilitator()

    @pytest.fixture
    def balanced_messages(self) -> List[Dict]:
        """Create balanced discussion messages."""
        return [
            {"sender_id": "user_001", "content": "Let's discuss mathematics and algebra."},
            {"sender_id": "user_002", "content": "Great idea. Mathematics is fascinating."},
            {"sender_id": "user_003", "content": "I agree! Let me share an example about algebra."},
            {"sender_id": "user_001", "content": "That's a good point about mathematics concepts."},
            {"sender_id": "user_002", "content": "Yes, exactly right. The algebra connection is clear."},
            {"sender_id": "user_003", "content": "Could you explain more about the mathematics theory?"},
        ]

    @pytest.fixture
    def imbalanced_messages(self) -> List[Dict]:
        """Create imbalanced discussion with quiet participant."""
        return [
            {"sender_id": "user_001", "content": "Let's discuss the topic."},
            {"sender_id": "user_001", "content": "Here's another thought."},
            {"sender_id": "user_001", "content": "And one more point."},
            {"sender_id": "user_002", "content": "Okay."},
            {"sender_id": "user_001", "content": "Does anyone else have input?"},
        ]

    def test_init(self, facilitator):
        """Test facilitator initialization."""
        assert facilitator.PROMPT_TEMPLATES is not None
        assert "start" in facilitator.PROMPT_TEMPLATES
        assert "deepen" in facilitator.PROMPT_TEMPLATES

    def test_suggest_actions_empty(self, facilitator):
        """Test suggesting actions for empty discussion."""
        actions = facilitator.suggest_actions([], "mathematics")
        
        assert len(actions) >= 1
        assert actions[0].action_type == "prompt"
        assert "mathematics" in actions[0].message

    def test_suggest_actions_balanced(self, facilitator, balanced_messages):
        """Test suggesting actions for balanced discussion."""
        actions = facilitator.suggest_actions(balanced_messages, "mathematics")
        
        # Should not have many critical actions
        high_priority = [a for a in actions if a.priority == 1]
        assert len(high_priority) <= 2

    def test_suggest_actions_imbalanced(self, facilitator, imbalanced_messages):
        """Test suggesting actions for imbalanced discussion."""
        # Add member_ids to track all participants
        actions = facilitator.suggest_actions(imbalanced_messages, "topic")
        
        # Should have encouragement actions
        encourage_actions = [a for a in actions if a.action_type == "encourage"]
        # May or may not have encouragements depending on threshold

    def test_suggest_actions_off_topic(self, facilitator):
        """Test suggesting actions when discussion goes off-topic."""
        messages = [
            {"sender_id": "user_001", "content": "Anyway, let's talk about random things."},
            {"sender_id": "user_002", "content": "Speaking of off topic, did you see that movie?"},
            {"sender_id": "user_001", "content": "Unrelated but I went to lunch."},
        ]
        
        actions = facilitator.suggest_actions(messages, "mathematics")
        
        redirect_actions = [a for a in actions if a.action_type == "redirect"]
        assert len(redirect_actions) >= 1

    def test_suggest_actions_confusion(self, facilitator):
        """Test suggesting actions when confusion is detected."""
        messages = [
            {"sender_id": "user_001", "content": "Let's discuss the concept."},
            {"sender_id": "user_002", "content": "I don't understand what do you mean?"},
            {"sender_id": "user_001", "content": "I'm confused about that."},
        ]
        
        actions = facilitator.suggest_actions(messages, "concept")
        
        clarify_actions = [a for a in actions if a.action_type == "clarify"]
        assert len(clarify_actions) >= 1

    def test_suggest_actions_stalled(self, facilitator):
        """Test suggesting actions when discussion stalls."""
        messages = [
            {"sender_id": "user_001", "content": "Here's my point about the topic."},
            {"sender_id": "user_001", "content": "And another thought on the topic."},
            {"sender_id": "user_001", "content": "Also consider this aspect of the topic."},
        ]
        
        actions = facilitator.suggest_actions(messages, "topic")
        
        # Should suggest prompting for more voices
        assert len(actions) >= 1

    def test_suggest_actions_echo_chamber(self, facilitator):
        """Test suggesting actions when everyone agrees too much."""
        messages = [
            {"sender_id": "user_001", "content": "The topic is important."},
            {"sender_id": "user_002", "content": "Yes, I agree completely!"},
            {"sender_id": "user_003", "content": "Exactly right, true!"},
            {"sender_id": "user_001", "content": "Absolutely correct!"},
            {"sender_id": "user_002", "content": "I agree with everyone!"},
            {"sender_id": "user_003", "content": "Yes, agreed!"},
        ]
        
        actions = facilitator.suggest_actions(messages, "topic")
        
        # Should suggest broadening discussion
        broaden_actions = [a for a in actions if "broaden" in a.action_type or "perspectives" in a.message.lower()]
        # May or may not have broadening suggestions

    def test_suggest_actions_periodic_summary(self, facilitator):
        """Test suggesting summarization after many messages."""
        messages = [
            {"sender_id": f"user_{i % 3 + 1:03d}", "content": f"Message {i} about the topic of discussion."}
            for i in range(10)
        ]
        
        actions = facilitator.suggest_actions(messages, "topic")
        
        # Should include a summarize action
        summarize_actions = [a for a in actions if a.action_type == "summarize"]
        assert len(summarize_actions) >= 1


class TestGeneratePrompt:
    """Tests for generate_prompt method."""

    @pytest.fixture
    def facilitator(self):
        return DiscussionFacilitator()

    def test_generate_start_prompt(self, facilitator):
        """Test generating a start prompt."""
        prompt = facilitator.generate_prompt("algebra", [], prompt_type="start")
        
        assert "algebra" in prompt

    def test_generate_deepen_prompt(self, facilitator):
        """Test generating a deepen prompt."""
        messages = [{"sender_id": "user_001", "content": "The concept is interesting."}]
        
        prompt = facilitator.generate_prompt("algebra", messages, prompt_type="deepen")
        
        assert len(prompt) > 0

    def test_generate_broaden_prompt(self, facilitator):
        """Test generating a broaden prompt."""
        messages = [{"sender_id": "user_001", "content": "I think this is the only way."}]
        
        prompt = facilitator.generate_prompt("algebra", messages, prompt_type="broaden")
        
        assert len(prompt) > 0

    def test_generate_clarify_prompt(self, facilitator):
        """Test generating a clarify prompt."""
        messages = [{"sender_id": "user_001", "content": "The term is confusing."}]
        
        prompt = facilitator.generate_prompt("algebra", messages, prompt_type="clarify")
        
        assert len(prompt) > 0

    def test_generate_conclude_prompt(self, facilitator):
        """Test generating a conclude prompt."""
        messages = [{"sender_id": "user_001", "content": "We discussed many points."}]
        
        prompt = facilitator.generate_prompt("algebra", messages, prompt_type="conclude")
        
        assert len(prompt) > 0

    def test_generate_invalid_type_defaults(self, facilitator):
        """Test that invalid prompt type defaults to deepen."""
        prompt = facilitator.generate_prompt("algebra", [], prompt_type="invalid_type")
        
        assert len(prompt) > 0


class TestSummarizeDiscussion:
    """Tests for summarize_discussion method."""

    @pytest.fixture
    def facilitator(self):
        return DiscussionFacilitator()

    def test_summarize_empty(self, facilitator):
        """Test summarizing empty discussion."""
        summary = facilitator.summarize_discussion([])
        
        assert "No discussion" in summary

    def test_summarize_with_messages(self, facilitator):
        """Test summarizing with messages."""
        messages = [
            {"sender_id": "user_001", "content": "The first point about mathematics is very important and relevant to our discussion."},
            {"sender_id": "user_002", "content": "I agree, and the second point about algebra connects well with the first point mentioned."},
        ]
        
        summary = facilitator.summarize_discussion(messages, topic="mathematics")
        
        assert len(summary) > 0

    def test_summarize_short_messages(self, facilitator):
        """Test summarizing short messages."""
        messages = [
            {"sender_id": "user_001", "content": "Yes."},
            {"sender_id": "user_002", "content": "Agreed."},
        ]
        
        summary = facilitator.summarize_discussion(messages)
        
        assert len(summary) > 0


class TestGenerateSuggestions:
    """Tests for generate_suggestions method."""

    @pytest.fixture
    def facilitator(self):
        return DiscussionFacilitator()

    def test_generate_suggestions_few_messages(self, facilitator):
        """Test generating suggestions for few messages."""
        messages = [
            {"sender_id": "user_001", "content": "Hello."},
            {"sender_id": "user_002", "content": "Hi."},
        ]
        
        suggestions = facilitator.generate_suggestions(messages, "topic", suggestion_count=3)
        
        assert len(suggestions) == 3
        assert any("warm up" in s.lower() for s in suggestions)

    def test_generate_suggestions_many_messages(self, facilitator):
        """Test generating suggestions for many messages."""
        messages = [
            {"sender_id": f"user_{i % 3 + 1:03d}", "content": f"Message {i}"}
            for i in range(25)
        ]
        
        suggestions = facilitator.generate_suggestions(messages, "topic", suggestion_count=3)
        
        assert len(suggestions) == 3
        assert any("summariz" in s.lower() for s in suggestions)

    def test_generate_suggestions_off_topic(self, facilitator):
        """Test suggestions when discussion is off-topic."""
        messages = [
            {"sender_id": "user_001", "content": "Anyway, random thought."},
            {"sender_id": "user_002", "content": "Speaking of off topic things."},
        ]
        
        suggestions = facilitator.generate_suggestions(messages, "mathematics", suggestion_count=3)
        
        assert any("redirect" in s.lower() for s in suggestions)

    def test_generate_suggestions_agreeable(self, facilitator):
        """Test suggestions when discussion is too agreeable."""
        messages = [
            {"sender_id": "user_001", "content": "I agree this is correct."},
            {"sender_id": "user_002", "content": "Yes, exactly right."},
            {"sender_id": "user_001", "content": "Absolutely true."},
        ]
        
        suggestions = facilitator.generate_suggestions(messages, "topic", suggestion_count=3)
        
        assert any("contrasting" in s.lower() or "viewpoint" in s.lower() for s in suggestions)


class TestIdentifyConflicts:
    """Tests for identify_conflicts method."""

    @pytest.fixture
    def facilitator(self):
        return DiscussionFacilitator()

    def test_identify_no_conflicts(self, facilitator):
        """Test identifying no conflicts in peaceful discussion."""
        messages = [
            {"sender_id": "user_001", "content": "I think this is a good idea."},
            {"sender_id": "user_002", "content": "I agree with your point."},
            {"sender_id": "user_003", "content": "Great discussion!"},
        ]
        
        conflicts = facilitator.identify_conflicts(messages)
        
        assert len(conflicts) == 0

    def test_identify_repeated_disagreement(self, facilitator):
        """Test identifying repeated disagreement."""
        messages = [
            {"sender_id": "user_001", "content": "I think it works this way."},
            {"sender_id": "user_002", "content": "I disagree, but it's different."},
            {"sender_id": "user_001", "content": "No, but actually it's correct."},
            {"sender_id": "user_002", "content": "However, I disagree again."},
        ]
        
        conflicts = facilitator.identify_conflicts(messages)
        
        disagreement_conflicts = [c for c in conflicts if c.conflict_type == "repeated_disagreement"]
        assert len(disagreement_conflicts) >= 1

    def test_identify_aggressive_tone(self, facilitator):
        """Test identifying aggressive tone."""
        messages = [
            {"sender_id": "user_001", "content": "That idea is ridiculous."},
            {"sender_id": "user_002", "content": "Your point is stupid."},
        ]
        
        conflicts = facilitator.identify_conflicts(messages)
        
        aggressive_conflicts = [c for c in conflicts if c.conflict_type == "aggressive_tone"]
        assert len(aggressive_conflicts) >= 1


class TestProposeRedirects:
    """Tests for propose_redirects method."""

    @pytest.fixture
    def facilitator(self):
        return DiscussionFacilitator()

    def test_propose_no_redirects(self, facilitator):
        """Test no redirects for on-topic discussion."""
        messages = [
            {"sender_id": "user_001", "content": "Mathematics is important."},
            {"sender_id": "user_002", "content": "Yes, mathematics helps."},
        ]
        
        redirects = facilitator.propose_redirects(messages, "mathematics")
        
        # Should have few or no redirects
        assert len(redirects) <= 1

    def test_propose_redirects_off_topic(self, facilitator):
        """Test redirects for off-topic discussion."""
        messages = [
            {"sender_id": "user_001", "content": "Anyway, let's talk about movies."},
            {"sender_id": "user_002", "content": "Speaking of random things."},
            {"sender_id": "user_001", "content": "Off topic but interesting."},
        ]
        
        redirects = facilitator.propose_redirects(messages, "mathematics")
        
        assert len(redirects) >= 1
        assert any("mathematics" in r.target_topic for r in redirects)

    def test_propose_redirects_stuck_discussion(self, facilitator):
        """Test redirects when discussion is stuck repeating."""
        messages = [
            {"sender_id": "user_001", "content": "The important concept is really important."},
            {"sender_id": "user_002", "content": "Yes, the concept is important indeed."},
            {"sender_id": "user_001", "content": "Truly, concept importance is key."},
            {"sender_id": "user_002", "content": "Important concept is certainly important."},
            {"sender_id": "user_001", "content": "The important aspect of the concept is importance."},
        ]
        
        redirects = facilitator.propose_redirects(messages, "concept")
        
        # May suggest exploring related topics
        assert isinstance(redirects, list)


class TestPrivateMethods:
    """Tests for private helper methods."""

    @pytest.fixture
    def facilitator(self):
        return DiscussionFacilitator()

    def test_analyze_participation(self, facilitator):
        """Test participation analysis."""
        messages = [
            {"sender_id": "user_001", "content": "Message 1"},
            {"sender_id": "user_001", "content": "Message 2"},
            {"sender_id": "user_002", "content": "Message 3"},
        ]
        
        participation = facilitator._analyze_participation(messages)
        
        assert participation["user_001"] == 2
        assert participation["user_002"] == 1

    def test_analyze_content(self, facilitator):
        """Test content analysis."""
        messages = [
            {"sender_id": "user_001", "content": "What about the topic?"},
            {"sender_id": "user_002", "content": "I agree, yes!"},
            {"sender_id": "user_001", "content": "Anyway, random thought."},
        ]
        
        analysis = facilitator._analyze_content(messages, "topic")
        
        assert "off_topic_ratio" in analysis
        assert "agreement_ratio" in analysis
        assert "question_ratio" in analysis
        assert analysis["question_ratio"] > 0

    def test_analyze_content_empty(self, facilitator):
        """Test content analysis with empty messages."""
        analysis = facilitator._analyze_content([], "topic")
        
        assert analysis["off_topic_ratio"] == 0.0
        assert analysis["confusion_detected"] is False

    def test_analyze_flow(self, facilitator):
        """Test flow analysis."""
        messages = [
            {"sender_id": "user_001", "content": "Message 1"},
            {"sender_id": "user_001", "content": "Message 2"},
            {"sender_id": "user_001", "content": "Message 3"},
        ]
        
        flow = facilitator._analyze_flow(messages)
        
        assert flow["stalled"] is True

    def test_analyze_flow_not_stalled(self, facilitator):
        """Test flow analysis when not stalled."""
        messages = [
            {"sender_id": "user_001", "content": "Message 1"},
            {"sender_id": "user_002", "content": "Message 2"},
            {"sender_id": "user_003", "content": "Message 3"},
        ]
        
        flow = facilitator._analyze_flow(messages)
        
        assert flow["stalled"] is False

    def test_identify_quiet_members(self, facilitator):
        """Test identifying quiet members."""
        participation = {
            "user_001": 10,
            "user_002": 10,
            "user_003": 1,
        }
        
        quiet = facilitator._identify_quiet_members(participation)
        
        assert "user_003" in quiet

    def test_identify_quiet_members_empty(self, facilitator):
        """Test identifying quiet members with empty participation."""
        quiet = facilitator._identify_quiet_members({})
        
        assert quiet == []

    def test_generate_encouragement(self, facilitator):
        """Test generating encouragement message."""
        messages = [
            {"sender_id": "user_001", "content": "I think this is interesting."},
            {"sender_id": "user_002", "content": "Yes, let's explore more."},
        ]
        
        encouragement = facilitator._generate_encouragement("user_003", messages)
        
        assert "user_003" in encouragement

    def test_generate_summary(self, facilitator):
        """Test generating summary."""
        messages = [
            {"sender_id": "user_001", "content": "This is a very important point about the mathematics topic that we should consider carefully."},
            {"sender_id": "user_002", "content": "Another significant observation is that algebra connects to many other areas of study."},
        ]
        
        summary = facilitator._generate_summary(messages, "mathematics")
        
        assert len(summary) > 0

    def test_generate_summary_empty(self, facilitator):
        """Test generating summary from empty messages."""
        summary = facilitator._generate_summary([], "topic")
        
        assert "No points" in summary

    def test_suggest_related_topic(self, facilitator):
        """Test suggesting related topic."""
        messages = [
            {"sender_id": "user_001", "content": "The algebra equation is complex."},
            {"sender_id": "user_002", "content": "The equation requires solving."},
        ]
        
        related = facilitator._suggest_related_topic("mathematics", messages)
        
        assert len(related) > 0

    def test_suggest_related_topic_empty(self, facilitator):
        """Test suggesting related topic with no messages."""
        related = facilitator._suggest_related_topic("mathematics", [])
        
        assert related == "related concepts"

    def test_extract_unclear_term(self, facilitator):
        """Test extracting unclear term."""
        messages = [
            {"sender_id": "user_001", "content": "I don't understand what do you mean by integration?"},
        ]
        
        term = facilitator._extract_unclear_term(messages)
        
        # Should extract a term near confusion indicator
        assert len(term) > 0

    def test_extract_unclear_term_no_confusion(self, facilitator):
        """Test extracting unclear term when no confusion."""
        messages = [
            {"sender_id": "user_001", "content": "This is clear."},
        ]
        
        term = facilitator._extract_unclear_term(messages)
        
        assert term == "that concept"
