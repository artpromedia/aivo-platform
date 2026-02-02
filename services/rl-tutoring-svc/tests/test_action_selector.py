"""
Tests for Action Selector Model
"""
import pytest

from app.models.action_selector import ActionSelector, TutoringAction


class TestActionSelector:
    """Test suite for ActionSelector."""

    def test_init(self):
        """Test initialization."""
        selector = ActionSelector()
        assert selector.num_actions == 10
        assert len(selector.ACTION_TYPES) == 10
        assert "hint" in selector.ACTION_TYPES
        assert "explanation" in selector.ACTION_TYPES

    def test_action_types(self):
        """Test action types are defined correctly."""
        selector = ActionSelector()
        expected_types = [
            "hint", "question", "explanation", "practice",
            "review", "skip", "encourage", "challenge",
            "simplify", "elaborate",
        ]
        assert selector.ACTION_TYPES == expected_types

    def test_select_basic(self):
        """Test basic action selection."""
        selector = ActionSelector()
        context = {"engagement_level": 0.5}
        action = selector.select(policy_output=0, context=context)
        assert isinstance(action, TutoringAction)
        assert action.action_type == "hint"
        assert action.action_id == 0

    def test_select_all_actions(self):
        """Test selecting all action types."""
        selector = ActionSelector()
        context = {"engagement_level": 0.5}
        for i, expected_type in enumerate(selector.ACTION_TYPES):
            action = selector.select(policy_output=i, context=context)
            assert action.action_type == expected_type
            assert action.action_id == i

    def test_select_with_modulo(self):
        """Test action selection wraps with modulo."""
        selector = ActionSelector()
        context = {}
        action = selector.select(policy_output=15, context=context)
        # 15 % 10 = 5 -> "skip"
        assert action.action_type == "skip"

    def test_customize_parameters_low_engagement(self):
        """Test parameter customization for low engagement."""
        selector = ActionSelector()
        base_params = {"tone": "standard"}
        context = {"engagement_level": 0.2}
        params = selector._customize_parameters("encourage", base_params, context)
        assert params["tone"] == "highly_supportive"

    def test_customize_parameters_low_performance(self):
        """Test parameter customization for low performance."""
        selector = ActionSelector()
        base_params = {"detail_level": "standard"}
        context = {
            "engagement_level": 0.5,
            "recent_performance": [0.2, 0.3, 0.2],
        }
        params = selector._customize_parameters("explanation", base_params, context)
        assert params["detail_level"] == "detailed"

    def test_customize_parameters_high_performance(self):
        """Test parameter customization for high performance."""
        selector = ActionSelector()
        base_params = {"difficulty_modifier": 0.2}
        context = {
            "engagement_level": 0.5,
            "recent_performance": [0.9, 0.85, 0.9],
        }
        params = selector._customize_parameters("challenge", base_params, context)
        assert params["difficulty_modifier"] > 0.2

    def test_customize_parameters_high_mastery(self):
        """Test parameter customization for high mastery."""
        selector = ActionSelector()
        base_params = {"advance_by": 1}
        context = {
            "engagement_level": 0.5,
            "current_mastery": 0.8,
        }
        params = selector._customize_parameters("skip", base_params, context)
        assert params["advance_by"] == 2

    def test_select_content_skip(self):
        """Test content selection for skip action."""
        selector = ActionSelector()
        context = {
            "current_content_id": "content_1",
            "available_content": ["content_2", "content_3"],
        }
        content_id = selector._select_content("skip", context)
        assert content_id == "content_2"

    def test_select_content_review(self):
        """Test content selection for review action."""
        selector = ActionSelector()
        context = {
            "current_content_id": "content_3",
            "previous_content_ids": ["content_1", "content_2"],
        }
        content_id = selector._select_content("review", context)
        assert content_id == "content_2"

    def test_select_content_default(self):
        """Test content selection default behavior."""
        selector = ActionSelector()
        context = {"current_content_id": "content_5"}
        content_id = selector._select_content("explanation", context)
        assert content_id == "content_5"

    def test_get_available_actions(self):
        """Test getting available actions."""
        selector = ActionSelector()
        context = {
            "is_last_item": False,
            "previous_content_ids": ["content_1"],
            "hints_given": 0,
        }
        actions = selector.get_available_actions(context)
        assert len(actions) > 0
        assert all(isinstance(a, TutoringAction) for a in actions)

    def test_mask_invalid_actions_last_item(self):
        """Test action masking for last item."""
        selector = ActionSelector()
        context = {"is_last_item": True}
        mask = selector.mask_invalid_actions(context)
        skip_idx = selector.ACTION_TYPES.index("skip")
        assert mask[skip_idx] is False

    def test_mask_invalid_actions_no_previous(self):
        """Test action masking with no previous content."""
        selector = ActionSelector()
        context = {"previous_content_ids": []}
        mask = selector.mask_invalid_actions(context)
        review_idx = selector.ACTION_TYPES.index("review")
        assert mask[review_idx] is False

    def test_mask_invalid_actions_max_hints(self):
        """Test action masking when max hints reached."""
        selector = ActionSelector()
        context = {"hints_given": 5, "max_hints": 3}
        mask = selector.mask_invalid_actions(context)
        hint_idx = selector.ACTION_TYPES.index("hint")
        assert mask[hint_idx] is False

    def test_mask_invalid_actions_struggling(self):
        """Test action masking for struggling learners."""
        selector = ActionSelector()
        context = {"recent_performance": [0.1, 0.2, 0.1]}
        mask = selector.mask_invalid_actions(context)
        challenge_idx = selector.ACTION_TYPES.index("challenge")
        assert mask[challenge_idx] is False

    def test_get_action_index(self):
        """Test getting action index."""
        selector = ActionSelector()
        assert selector.get_action_index("hint") == 0
        assert selector.get_action_index("explanation") == 2
        assert selector.get_action_index("challenge") == 7

    def test_get_action_type(self):
        """Test getting action type."""
        selector = ActionSelector()
        assert selector.get_action_type(0) == "hint"
        assert selector.get_action_type(2) == "explanation"
        assert selector.get_action_type(10) == "hint"  # Wraps around

    def test_action_configs(self):
        """Test action configurations exist."""
        selector = ActionSelector()
        for action_type in selector.ACTION_TYPES:
            assert action_type in selector.ACTION_CONFIGS
            config = selector.ACTION_CONFIGS[action_type]
            assert "difficulty_modifier" in config

    def test_tutoring_action_dataclass(self):
        """Test TutoringAction dataclass."""
        action = TutoringAction(
            action_id=1,
            action_type="hint",
            content_id="content_1",
            parameters={"level": "basic"},
        )
        assert action.action_id == 1
        assert action.action_type == "hint"
        assert action.content_id == "content_1"
        assert action.parameters["level"] == "basic"
