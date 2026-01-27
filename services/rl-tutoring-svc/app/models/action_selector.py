"""
Action Selector

Select and execute tutoring actions.
"""
import logging
from dataclasses import dataclass
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class TutoringAction:
    action_id: int
    action_type: str  # hint, question, explanation, practice, review, skip
    content_id: Optional[str]
    parameters: Dict[str, Any]


class ActionSelector:
    """
    Select and configure tutoring actions.

    Actions:
    - Give hint
    - Ask question
    - Provide explanation
    - Assign practice
    - Review material
    - Skip to next topic

    Usage:
        selector = ActionSelector()
        action = selector.select(policy_output=3, context={...})
    """

    ACTION_TYPES = [
        "hint",
        "question",
        "explanation",
        "practice",
        "review",
        "skip",
        "encourage",
        "challenge",
        "simplify",
        "elaborate",
    ]

    # Action configurations with default parameters
    ACTION_CONFIGS = {
        "hint": {"difficulty_modifier": -0.1, "support_level": "medium"},
        "question": {"difficulty_modifier": 0.0, "interaction_type": "probe"},
        "explanation": {"difficulty_modifier": -0.2, "detail_level": "standard"},
        "practice": {"difficulty_modifier": 0.0, "repetitions": 3},
        "review": {"difficulty_modifier": -0.3, "scope": "recent"},
        "skip": {"difficulty_modifier": 0.1, "advance_by": 1},
        "encourage": {"difficulty_modifier": 0.0, "tone": "supportive"},
        "challenge": {"difficulty_modifier": 0.2, "bonus_points": True},
        "simplify": {"difficulty_modifier": -0.3, "complexity_reduction": 0.5},
        "elaborate": {"difficulty_modifier": 0.1, "detail_level": "extended"},
    }

    def __init__(self):
        self.num_actions = len(self.ACTION_TYPES)
        logger.info(f"ActionSelector initialized with {self.num_actions} action types")

    def select(
        self,
        policy_output: int,
        context: Dict[str, Any],
    ) -> TutoringAction:
        """Convert policy output to tutoring action."""
        # Ensure valid action index
        action_idx = policy_output % self.num_actions
        action_type = self.ACTION_TYPES[action_idx]

        # Get base parameters for this action type
        base_params = self.ACTION_CONFIGS.get(action_type, {}).copy()

        # Customize parameters based on context
        params = self._customize_parameters(action_type, base_params, context)

        # Determine content_id if applicable
        content_id = self._select_content(action_type, context)

        return TutoringAction(
            action_id=action_idx,
            action_type=action_type,
            content_id=content_id,
            parameters=params
        )

    def _customize_parameters(
        self,
        action_type: str,
        base_params: Dict[str, Any],
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Customize action parameters based on learner context."""
        params = base_params.copy()

        # Get learner state info
        engagement = context.get("engagement_level", 0.5)
        mastery = context.get("current_mastery", 0.5)
        recent_performance = context.get("recent_performance", [])
        avg_performance = sum(recent_performance) / len(recent_performance) if recent_performance else 0.5

        # Adjust based on engagement
        if engagement < 0.3:
            if action_type == "encourage":
                params["tone"] = "highly_supportive"
            elif action_type == "practice":
                params["repetitions"] = max(1, params.get("repetitions", 3) - 1)

        # Adjust based on performance
        if avg_performance < 0.4:
            params["difficulty_modifier"] = params.get("difficulty_modifier", 0) - 0.1
            if action_type == "explanation":
                params["detail_level"] = "detailed"
        elif avg_performance > 0.8:
            params["difficulty_modifier"] = params.get("difficulty_modifier", 0) + 0.1
            if action_type == "challenge":
                params["difficulty_modifier"] += 0.1

        # Adjust based on mastery
        if mastery > 0.7:
            if action_type == "skip":
                params["advance_by"] = 2
            elif action_type == "review":
                params["scope"] = "broader"

        return params

    def _select_content(
        self,
        action_type: str,
        context: Dict[str, Any],
    ) -> Optional[str]:
        """Select appropriate content for the action."""
        current_content = context.get("current_content_id")
        available_content = context.get("available_content", [])

        if action_type in ["skip", "challenge"]:
            # Select next/harder content
            if available_content:
                return available_content[0] if available_content else None
        elif action_type == "review":
            # Select previous content for review
            previous_content = context.get("previous_content_ids", [])
            return previous_content[-1] if previous_content else current_content
        else:
            return current_content

        return current_content

    def get_available_actions(
        self,
        context: Dict[str, Any],
    ) -> List[TutoringAction]:
        """Get available actions for current context."""
        available = []
        mask = self.mask_invalid_actions(context)

        for idx, (action_type, is_valid) in enumerate(zip(self.ACTION_TYPES, mask)):
            if is_valid:
                action = self.select(idx, context)
                available.append(action)

        return available

    def mask_invalid_actions(
        self,
        context: Dict[str, Any],
    ) -> List[bool]:
        """Get action mask for invalid actions (True = valid, False = invalid)."""
        mask = [True] * self.num_actions

        # Get context information
        is_first_item = context.get("is_first_item", False)
        is_last_item = context.get("is_last_item", False)
        hints_given = context.get("hints_given", 0)
        max_hints = context.get("max_hints", 3)
        has_previous_content = bool(context.get("previous_content_ids", []))

        # Skip is invalid for last item
        if is_last_item:
            skip_idx = self.ACTION_TYPES.index("skip")
            mask[skip_idx] = False

        # Review is invalid if no previous content
        if not has_previous_content:
            review_idx = self.ACTION_TYPES.index("review")
            mask[review_idx] = False

        # Limit hints
        if hints_given >= max_hints:
            hint_idx = self.ACTION_TYPES.index("hint")
            mask[hint_idx] = False

        # Challenge is invalid for struggling learners
        recent_performance = context.get("recent_performance", [])
        if recent_performance and sum(recent_performance) / len(recent_performance) < 0.3:
            challenge_idx = self.ACTION_TYPES.index("challenge")
            mask[challenge_idx] = False

        return mask

    def get_action_index(self, action_type: str) -> int:
        """Get the index of an action type."""
        return self.ACTION_TYPES.index(action_type)

    def get_action_type(self, action_index: int) -> str:
        """Get the action type for an index."""
        return self.ACTION_TYPES[action_index % self.num_actions]
