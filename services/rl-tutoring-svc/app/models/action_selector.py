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
    
    def __init__(self):
        logger.info("ActionSelector initialized")
    
    def select(
        self,
        policy_output: int,
        context: Dict[str, Any],
    ) -> TutoringAction:
        """Convert policy output to tutoring action."""
        raise NotImplementedError()
    
    def get_available_actions(
        self,
        context: Dict[str, Any],
    ) -> List[TutoringAction]:
        """Get available actions for current context."""
        raise NotImplementedError()
    
    def mask_invalid_actions(
        self,
        context: Dict[str, Any],
    ) -> List[bool]:
        """Get action mask for invalid actions."""
        raise NotImplementedError()
