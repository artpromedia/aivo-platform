"""
Discussion Facilitator

AI-assisted discussion facilitation for peer learning groups.
"""
import logging
import re
from dataclasses import dataclass
from typing import List, Dict, Optional, Set
from collections import defaultdict

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class FacilitationAction:
    """A facilitation action to take."""
    action_type: str  # prompt, redirect, summarize, encourage, clarify, mediate
    target: Optional[str]  # learner_id or None for group
    message: str
    priority: int = 1  # 1 = high, 2 = medium, 3 = low


@dataclass
class ConflictInfo:
    """Information about a detected conflict."""
    conflict_type: str
    involved_members: List[str]
    description: str
    severity: str  # "low", "medium", "high"


@dataclass
class RedirectSuggestion:
    """A conversation redirect suggestion."""
    reason: str
    redirect_message: str
    target_topic: str


class DiscussionFacilitator:
    """
    AI-assisted discussion facilitation.

    Actions:
    - Generate discussion prompts
    - Redirect off-topic discussions
    - Summarize key points
    - Encourage quiet participants

    Usage:
        facilitator = DiscussionFacilitator()
        actions = facilitator.suggest_actions(messages, topic)
    """

    # Prompt templates for different situations
    PROMPT_TEMPLATES = {
        "start": [
            "Let's begin by sharing what we already know about {topic}. Who would like to start?",
            "To kick off our discussion on {topic}, what are the key concepts we should explore?",
            "What aspects of {topic} are you most curious about?",
        ],
        "deepen": [
            "That's an interesting point. Can anyone explain why this is important?",
            "How does this connect to what we discussed earlier?",
            "What evidence supports this view?",
            "Can someone give an example of this in practice?",
        ],
        "broaden": [
            "Are there other perspectives we should consider?",
            "How might this apply to different contexts?",
            "What are the potential counterarguments?",
            "Let's explore how this relates to {related_topic}.",
        ],
        "clarify": [
            "Could you elaborate on that point?",
            "What do you mean by {term}?",
            "Can you provide a concrete example?",
            "Let me make sure I understand - are you saying that...?",
        ],
        "encourage": [
            "{name}, we haven't heard from you yet. What are your thoughts?",
            "{name}, do you have any experience with this topic you could share?",
            "I'd love to hear more voices on this. Anyone else?",
            "{name}, what's your take on what {other_name} just said?",
        ],
        "redirect": [
            "That's interesting, but let's get back to {topic}.",
            "We can discuss that later. For now, let's focus on {topic}.",
            "Good point! How does that relate to our main topic of {topic}?",
        ],
        "summarize": [
            "Let me summarize what we've discussed so far: {summary}",
            "Key points raised: {summary}. What else should we cover?",
            "Before we move on, here's what we've agreed on: {summary}",
        ],
        "conclude": [
            "To wrap up, what are the main takeaways from our discussion?",
            "What have we learned about {topic} today?",
            "How might we apply these insights going forward?",
        ],
    }

    # Keywords indicating different types of content
    AGREEMENT_KEYWORDS = ["agree", "exactly", "right", "yes", "absolutely", "true", "correct"]
    DISAGREEMENT_KEYWORDS = ["disagree", "wrong", "no", "but", "however", "actually", "instead"]
    CONFUSION_KEYWORDS = ["confused", "don't understand", "what do you mean", "unclear", "lost"]
    OFF_TOPIC_KEYWORDS = ["anyway", "random", "off topic", "speaking of", "unrelated"]

    def __init__(self):
        """Initialize DiscussionFacilitator."""
        logger.info("DiscussionFacilitator initialized")

    def suggest_actions(
        self,
        messages: List[Dict],
        topic: str,
    ) -> List[FacilitationAction]:
        """
        Suggest facilitation actions based on discussion state.

        Args:
            messages: List of message dictionaries with sender_id, content, timestamp
            topic: The discussion topic

        Returns:
            List of FacilitationAction objects ordered by priority
        """
        if not messages:
            # Start of discussion
            return [
                FacilitationAction(
                    action_type="prompt",
                    target=None,
                    message=np.random.choice(self.PROMPT_TEMPLATES["start"]).format(topic=topic),
                    priority=1,
                )
            ]

        actions = []

        # Analyze current discussion state
        participation = self._analyze_participation(messages)
        content_analysis = self._analyze_content(messages, topic)
        flow = self._analyze_flow(messages)

        # Check for quiet participants
        quiet_members = self._identify_quiet_members(participation)
        for member in quiet_members[:2]:  # Limit to 2 encouragements
            actions.append(FacilitationAction(
                action_type="encourage",
                target=member,
                message=self._generate_encouragement(member, messages),
                priority=2,
            ))

        # Check for off-topic drift
        if content_analysis["off_topic_ratio"] > 0.3:
            actions.append(FacilitationAction(
                action_type="redirect",
                target=None,
                message=np.random.choice(self.PROMPT_TEMPLATES["redirect"]).format(topic=topic),
                priority=1,
            ))

        # Check for confusion
        if content_analysis["confusion_detected"]:
            actions.append(FacilitationAction(
                action_type="clarify",
                target=None,
                message=np.random.choice(self.PROMPT_TEMPLATES["clarify"]),
                priority=1,
            ))

        # Check for stalled discussion
        if flow["stalled"]:
            actions.append(FacilitationAction(
                action_type="prompt",
                target=None,
                message=np.random.choice(self.PROMPT_TEMPLATES["deepen"]),
                priority=1,
            ))

        # Check if discussion is too agreeable (echo chamber)
        if content_analysis["agreement_ratio"] > 0.7 and len(messages) > 5:
            actions.append(FacilitationAction(
                action_type="prompt",
                target=None,
                message=np.random.choice(self.PROMPT_TEMPLATES["broaden"]),
                priority=2,
            ))

        # Periodic summarization
        if len(messages) >= 10 and len(messages) % 10 == 0:
            summary = self._generate_summary(messages, topic)
            actions.append(FacilitationAction(
                action_type="summarize",
                target=None,
                message=self.PROMPT_TEMPLATES["summarize"][0].format(summary=summary),
                priority=3,
            ))

        # Sort by priority
        actions.sort(key=lambda a: a.priority)

        logger.info("Generated %d facilitation actions for topic '%s'", len(actions), topic)
        return actions

    def generate_prompt(
        self,
        topic: str,
        discussion_history: List[Dict],
        prompt_type: str = "deepen",
    ) -> str:
        """
        Generate a discussion prompt.

        Args:
            topic: The discussion topic
            discussion_history: Previous messages
            prompt_type: Type of prompt (start, deepen, broaden, clarify, conclude)

        Returns:
            Generated prompt string
        """
        if prompt_type not in self.PROMPT_TEMPLATES:
            prompt_type = "deepen"

        templates = self.PROMPT_TEMPLATES[prompt_type]
        template = np.random.choice(templates)

        # Fill in placeholders
        prompt = template.format(
            topic=topic,
            related_topic=self._suggest_related_topic(topic, discussion_history),
            term=self._extract_unclear_term(discussion_history),
            summary=self._generate_summary(discussion_history, topic) if "{summary}" in template else "",
        )

        return prompt

    def summarize_discussion(
        self,
        messages: List[Dict],
        topic: Optional[str] = None,
    ) -> str:
        """
        Summarize the discussion so far.

        Args:
            messages: List of message dictionaries
            topic: Optional topic for context

        Returns:
            Summary string
        """
        if not messages:
            return "No discussion to summarize yet."

        return self._generate_summary(messages, topic or "the topic")

    def generate_suggestions(
        self,
        messages: List[Dict],
        topic: str,
        suggestion_count: int = 3,
    ) -> List[str]:
        """
        Generate discussion facilitation suggestions.

        Args:
            messages: List of message dictionaries
            topic: Discussion topic
            suggestion_count: Number of suggestions to generate

        Returns:
            List of suggestion strings
        """
        suggestions = []

        # Analyze current state
        participation = self._analyze_participation(messages)
        content_analysis = self._analyze_content(messages, topic)

        # Participation suggestions
        quiet = self._identify_quiet_members(participation)
        if quiet:
            suggestions.append(
                f"Consider engaging {', '.join(quiet[:2])} who have been quiet"
            )

        # Content suggestions
        if content_analysis["off_topic_ratio"] > 0.2:
            suggestions.append(f"Redirect conversation back to {topic}")

        if content_analysis["agreement_ratio"] > 0.6:
            suggestions.append("Introduce a contrasting viewpoint to stimulate discussion")

        if content_analysis["question_ratio"] < 0.1:
            suggestions.append("Ask probing questions to deepen understanding")

        # Generic suggestions based on message count
        if len(messages) < 5:
            suggestions.append("Give participants time to warm up to the discussion")
        elif len(messages) > 20:
            suggestions.append("Consider summarizing key points discussed so far")

        # Fill remaining slots with general suggestions
        general_suggestions = [
            "Encourage participants to provide examples",
            "Ask how concepts apply to real-world scenarios",
            "Highlight connections between different points raised",
            "Acknowledge good contributions to encourage participation",
        ]

        while len(suggestions) < suggestion_count:
            for s in general_suggestions:
                if s not in suggestions:
                    suggestions.append(s)
                    break
            else:
                break

        return suggestions[:suggestion_count]

    def identify_conflicts(
        self,
        messages: List[Dict],
    ) -> List[ConflictInfo]:
        """
        Identify conflicts in the discussion.

        Args:
            messages: List of message dictionaries

        Returns:
            List of ConflictInfo objects
        """
        conflicts = []

        # Track disagreements between specific members
        disagreement_pairs = defaultdict(int)

        for i, msg in enumerate(messages):
            sender = msg.get("sender_id", "unknown")
            content = msg.get("content", "").lower()

            # Check for disagreement
            if any(kw in content for kw in self.DISAGREEMENT_KEYWORDS):
                # Find who they're responding to
                if i > 0:
                    prev_sender = messages[i - 1].get("sender_id", "unknown")
                    if prev_sender != sender:
                        pair = tuple(sorted([sender, prev_sender]))
                        disagreement_pairs[pair] += 1

        # Identify repeated disagreements (potential conflict)
        for pair, count in disagreement_pairs.items():
            if count >= 2:
                severity = "high" if count >= 4 else "medium" if count >= 3 else "low"
                conflicts.append(ConflictInfo(
                    conflict_type="repeated_disagreement",
                    involved_members=list(pair),
                    description=f"Members {pair[0]} and {pair[1]} have disagreed {count} times",
                    severity=severity,
                ))

        # Check for aggressive language
        aggressive_keywords = ["ridiculous", "stupid", "wrong", "nonsense", "absurd"]
        aggressive_senders = set()

        for msg in messages:
            content = msg.get("content", "").lower()
            if any(kw in content for kw in aggressive_keywords):
                aggressive_senders.add(msg.get("sender_id", "unknown"))

        if aggressive_senders:
            conflicts.append(ConflictInfo(
                conflict_type="aggressive_tone",
                involved_members=list(aggressive_senders),
                description="Aggressive language detected from some participants",
                severity="medium" if len(aggressive_senders) == 1 else "high",
            ))

        logger.info("Identified %d potential conflicts", len(conflicts))
        return conflicts

    def propose_redirects(
        self,
        messages: List[Dict],
        topic: str,
    ) -> List[RedirectSuggestion]:
        """
        Propose conversation redirects when discussion goes off-topic.

        Args:
            messages: List of message dictionaries
            topic: The intended discussion topic

        Returns:
            List of RedirectSuggestion objects
        """
        redirects = []
        topic_words = set(topic.lower().split())

        # Analyze recent messages for off-topic content
        recent_messages = messages[-5:] if len(messages) > 5 else messages

        off_topic_detected = False
        for msg in recent_messages:
            content = msg.get("content", "").lower()
            content_words = set(content.split())

            # Check if off-topic
            if any(kw in content for kw in self.OFF_TOPIC_KEYWORDS):
                off_topic_detected = True
            elif topic_words and not (topic_words & content_words):
                off_topic_detected = True

        if off_topic_detected:
            redirects.append(RedirectSuggestion(
                reason="Discussion has drifted from the main topic",
                redirect_message=f"Let's refocus on {topic}. What aspects haven't we explored yet?",
                target_topic=topic,
            ))

            redirects.append(RedirectSuggestion(
                reason="Participants may have covered the basics",
                redirect_message=f"Building on what we've discussed, how can we apply this to {topic}?",
                target_topic=topic,
            ))

        # Check for repeated themes (discussion might be stuck)
        word_counts = defaultdict(int)
        for msg in messages:
            words = msg.get("content", "").lower().split()
            for word in words:
                if len(word) > 4:  # Skip short words
                    word_counts[word] += 1

        common_words = [w for w, c in word_counts.items() if c > len(messages) * 0.3]
        if len(common_words) > 3 and not off_topic_detected:
            redirects.append(RedirectSuggestion(
                reason="Discussion may be circling around the same points",
                redirect_message="We've covered this well. What related aspects should we explore?",
                target_topic=self._suggest_related_topic(topic, messages),
            ))

        return redirects

    def _analyze_participation(self, messages: List[Dict]) -> Dict[str, int]:
        """Analyze participation by member."""
        counts = defaultdict(int)
        for msg in messages:
            sender = msg.get("sender_id", "unknown")
            counts[sender] += 1
        return dict(counts)

    def _analyze_content(self, messages: List[Dict], topic: str) -> Dict:
        """Analyze content of messages."""
        if not messages:
            return {
                "off_topic_ratio": 0.0,
                "agreement_ratio": 0.0,
                "question_ratio": 0.0,
                "confusion_detected": False,
            }

        topic_words = set(topic.lower().split())

        off_topic_count = 0
        agreement_count = 0
        question_count = 0
        confusion_detected = False

        for msg in messages:
            content = msg.get("content", "").lower()

            # Off-topic check
            if any(kw in content for kw in self.OFF_TOPIC_KEYWORDS):
                off_topic_count += 1
            elif topic_words:
                content_words = set(content.split())
                if not (topic_words & content_words):
                    off_topic_count += 1

            # Agreement check
            if any(kw in content for kw in self.AGREEMENT_KEYWORDS):
                agreement_count += 1

            # Question check
            if "?" in content:
                question_count += 1

            # Confusion check
            if any(kw in content for kw in self.CONFUSION_KEYWORDS):
                confusion_detected = True

        total = len(messages)
        return {
            "off_topic_ratio": off_topic_count / total,
            "agreement_ratio": agreement_count / total,
            "question_ratio": question_count / total,
            "confusion_detected": confusion_detected,
        }

    def _analyze_flow(self, messages: List[Dict]) -> Dict:
        """Analyze conversation flow."""
        if len(messages) < 3:
            return {"stalled": False, "rapid": False}

        # Check if discussion has stalled (same person posting multiple times)
        recent = messages[-3:]
        senders = [m.get("sender_id") for m in recent]

        stalled = len(set(senders)) == 1  # All from same person

        # Check message frequency (if timestamps available)
        rapid = False
        if all("timestamp" in m for m in messages[-3:]):
            try:
                # Implementation would check time intervals
                pass
            except Exception:
                pass

        return {"stalled": stalled, "rapid": rapid}

    def _identify_quiet_members(
        self,
        participation: Dict[str, int],
    ) -> List[str]:
        """Identify members who have been quiet."""
        if not participation:
            return []

        total = sum(participation.values())
        if total == 0:
            return []

        avg = total / len(participation)

        # Members with less than 30% of average participation
        quiet = [
            member for member, count in participation.items()
            if count < avg * 0.3
        ]

        return quiet

    def _generate_encouragement(
        self,
        member_id: str,
        messages: List[Dict],
    ) -> str:
        """Generate an encouragement message for a quiet member."""
        # Find the last active member for context
        active_members = [m.get("sender_id") for m in messages[-3:] if m.get("sender_id") != member_id]
        other_name = active_members[-1] if active_members else "others"

        templates = [
            f"{member_id}, we'd love to hear your perspective on this.",
            f"{member_id}, what do you think about what {other_name} mentioned?",
            f"{member_id}, do you have any thoughts to add?",
        ]

        return np.random.choice(templates)

    def _generate_summary(self, messages: List[Dict], topic: str) -> str:
        """Generate a summary of the discussion."""
        if not messages:
            return "No points discussed yet."

        # Extract key points (simple extraction based on message length)
        significant_messages = [
            msg for msg in messages
            if len(msg.get("content", "")) > 50
        ]

        if not significant_messages:
            significant_messages = messages[:3]

        # Create summary from key points
        points = []
        seen_content = set()

        for msg in significant_messages[:5]:
            content = msg.get("content", "")[:100]
            # Simple deduplication
            content_key = content[:30].lower()
            if content_key not in seen_content:
                seen_content.add(content_key)
                points.append(content)

        if not points:
            return f"The group has been discussing {topic}."

        summary_parts = []
        for i, point in enumerate(points[:3], 1):
            # Truncate and clean
            clean_point = point.replace("\n", " ").strip()
            if len(clean_point) > 80:
                clean_point = clean_point[:77] + "..."
            summary_parts.append(f"({i}) {clean_point}")

        return "; ".join(summary_parts)

    def _suggest_related_topic(
        self,
        topic: str,
        messages: List[Dict],
    ) -> str:
        """Suggest a related topic based on discussion."""
        # Extract frequently mentioned terms not in the main topic
        topic_words = set(topic.lower().split())

        word_counts = defaultdict(int)
        for msg in messages:
            words = msg.get("content", "").lower().split()
            for word in words:
                if len(word) > 4 and word not in topic_words:
                    # Remove punctuation
                    clean_word = re.sub(r'[^\w]', '', word)
                    if clean_word:
                        word_counts[clean_word] += 1

        if word_counts:
            # Get most common related term
            related = max(word_counts.items(), key=lambda x: x[1])[0]
            return related

        return "related concepts"

    def _extract_unclear_term(self, messages: List[Dict]) -> str:
        """Extract a term that might need clarification."""
        # Look for terms mentioned after confusion indicators
        for msg in reversed(messages):
            content = msg.get("content", "").lower()
            if any(kw in content for kw in self.CONFUSION_KEYWORDS):
                # Extract potential unclear term (words after confusion keyword)
                words = content.split()
                for i, word in enumerate(words):
                    if any(kw in word for kw in ["mean", "understand", "confused"]):
                        if i + 1 < len(words):
                            return words[i + 1]

        return "that concept"

    # -----------------------------------------------------------------
    # S13: Neurodivergent-inclusive turn-taking
    # -----------------------------------------------------------------

    # Strategy presets per neurodivergent profile
    NEURODIVERGENT_STRATEGIES: Dict[str, Dict] = {
        "adhd": {
            "turn_style": "structured_timer",
            "turn_duration_sec": 60,
            "allow_written_response": True,
            "visual_timer": True,
            "break_interval_messages": 8,
            "prompts": [
                "Take a moment to collect your thoughts — you'll have {duration}s to share.",
                "Before we move on, jot down one key idea you'd like to contribute.",
                "Let's do a quick round-robin so everyone gets a turn.",
            ],
        },
        "asd": {
            "turn_style": "round_robin",
            "turn_duration_sec": 90,
            "allow_written_response": True,
            "visual_timer": True,
            "break_interval_messages": 10,
            "prompts": [
                "We'll go in order — {name}, you're next.",
                "You can type your response if you'd prefer.",
                "Here's the specific question for this round: {question}",
            ],
        },
        "dyslexia": {
            "turn_style": "flexible",
            "turn_duration_sec": 120,
            "allow_written_response": True,
            "visual_timer": False,
            "break_interval_messages": 12,
            "prompts": [
                "Take your time — there's no rush.",
                "You can use voice or text, whichever is easier.",
                "Would a summary of the key points so far be helpful?",
            ],
        },
        "default": {
            "turn_style": "flexible",
            "turn_duration_sec": 90,
            "allow_written_response": True,
            "visual_timer": False,
            "break_interval_messages": 15,
            "prompts": [
                "Let's make sure everyone has a chance to share.",
                "Feel free to type or speak — whatever works best for you.",
            ],
        },
    }

    def suggest_inclusive_actions(
        self,
        messages: List[Dict],
        topic: str,
        member_profiles: Optional[Dict[str, Dict]] = None,
    ) -> List[FacilitationAction]:
        """Suggest facilitation actions with neurodivergent-aware turn-taking.

        Args:
            messages:        conversation messages so far
            topic:           the discussion topic
            member_profiles: optional {member_id: {"neurodivergent_needs": ["adhd", ...]}}

        Returns:
            List of FacilitationActions that layer inclusive strategies
            on top of the standard facilitation logic.
        """
        # Start with standard actions
        actions = self.suggest_actions(messages, topic)

        if not member_profiles:
            return actions

        # Determine the most accommodating strategy needed
        strategy = self._resolve_inclusive_strategy(member_profiles)

        # Insert structured-turn prompt when turn count crosses break interval
        if messages and len(messages) % strategy["break_interval_messages"] == 0:
            prompt = np.random.choice(strategy["prompts"]).format(
                duration=strategy["turn_duration_sec"],
                name="everyone",
                question=f"What's one thing about {topic} you'd like to explore further?",
            )
            actions.insert(0, FacilitationAction(
                action_type="inclusive_turn",
                target=None,
                message=prompt,
                priority=1,
            ))

        # Offer written-response alternative for any member who needs it
        if strategy["allow_written_response"]:
            participation = self._analyze_participation(messages)
            quiet = self._identify_quiet_members(participation)
            needs_written = [
                m for m in quiet
                if self._member_needs(member_profiles.get(m, {}), "allow_written_response")
            ]
            for member in needs_written[:2]:
                actions.append(FacilitationAction(
                    action_type="written_option",
                    target=member,
                    message=(
                        f"{member}, feel free to type your thoughts in the chat "
                        "if that's more comfortable."
                    ),
                    priority=2,
                ))

        # Visual-timer hint (UI layer should respond to this)
        if strategy["visual_timer"]:
            actions.append(FacilitationAction(
                action_type="visual_timer",
                target=None,
                message=f"timer:{strategy['turn_duration_sec']}",
                priority=3,
            ))

        actions.sort(key=lambda a: a.priority)
        return actions

    def _resolve_inclusive_strategy(
        self,
        member_profiles: Dict[str, Dict],
    ) -> Dict:
        """Pick the most accommodating strategy across all members."""
        needs: Set[str] = set()
        for profile in member_profiles.values():
            for need in profile.get("neurodivergent_needs", []):
                needs.add(need.lower())

        if not needs:
            return self.NEURODIVERGENT_STRATEGIES["default"]

        # Priority order: asd > adhd > dyslexia > default
        for key in ("asd", "adhd", "dyslexia"):
            if key in needs:
                strategy = dict(self.NEURODIVERGENT_STRATEGIES[key])
                # Merge: use longest duration, shortest break interval
                for other_key in needs:
                    other = self.NEURODIVERGENT_STRATEGIES.get(other_key, {})
                    strategy["turn_duration_sec"] = max(
                        strategy.get("turn_duration_sec", 90),
                        other.get("turn_duration_sec", 90),
                    )
                    strategy["break_interval_messages"] = min(
                        strategy.get("break_interval_messages", 15),
                        other.get("break_interval_messages", 15),
                    )
                return strategy

        return self.NEURODIVERGENT_STRATEGIES["default"]

    @staticmethod
    def _member_needs(profile: Dict, capability: str) -> bool:
        """Check whether a member's neurodivergent profile requires *capability*."""
        needs = profile.get("neurodivergent_needs", [])
        if not needs:
            return False
        # Any listed need implies the capability is helpful
        return True
