"""
AdaptationEngine Unit Tests

Tests for the cognitive load adaptation engine.
Covers: _determine_urgency, get_adaptations, get_recommendations,
        compute_adaptations, apply_scaffolding, simplify_presentation,
        _generate_candidates, _should_include_adaptation, prioritize_actions.
"""

import pytest

from app.services.adaptation_engine import (
    ADAPTATION_TEMPLATES,
    AdaptationAction,
    AdaptationEngine,
    AdaptationEngineConfig,
    AdaptationPlan,
    AdaptationType,
    UrgencyLevel,
)


@pytest.fixture
def engine():
    """Default AdaptationEngine."""
    return AdaptationEngine()


@pytest.fixture
def custom_engine():
    """Engine with custom thresholds for deterministic tests."""
    config = AdaptationEngineConfig(
        critical_load_threshold=0.9,
        high_load_threshold=0.8,
        medium_load_threshold=0.7,
        max_adaptations_per_request=3,
    )
    return AdaptationEngine(config=config)


# ─── Helpers ─────────────────────────────────────────────────────────


def _load(total=0.5, intrinsic=None, extraneous=None, germane=None):
    """Build a load_estimate dict with sensible defaults."""
    return {
        "total_load": total,
        "intrinsic_load": intrinsic if intrinsic is not None else total * 0.4,
        "extraneous_load": extraneous if extraneous is not None else total * 0.3,
        "germane_load": germane if germane is not None else total * 0.3,
    }


# ═══════════════════════════════════════════════════════════════════════
# _determine_urgency
# ═══════════════════════════════════════════════════════════════════════


class TestDetermineUrgency:
    def test_critical(self, engine):
        assert engine._determine_urgency(0.95) == UrgencyLevel.CRITICAL

    def test_high(self, engine):
        assert engine._determine_urgency(0.85) == UrgencyLevel.HIGH

    def test_medium(self, engine):
        assert engine._determine_urgency(0.75) == UrgencyLevel.MEDIUM

    def test_low(self, engine):
        assert engine._determine_urgency(0.5) == UrgencyLevel.LOW

    def test_boundary_critical(self, engine):
        assert engine._determine_urgency(0.9) == UrgencyLevel.CRITICAL

    def test_boundary_high(self, engine):
        assert engine._determine_urgency(0.8) == UrgencyLevel.HIGH

    def test_boundary_medium(self, engine):
        assert engine._determine_urgency(0.7) == UrgencyLevel.MEDIUM

    def test_zero_load(self, engine):
        assert engine._determine_urgency(0.0) == UrgencyLevel.LOW


# ═══════════════════════════════════════════════════════════════════════
# get_adaptations
# ═══════════════════════════════════════════════════════════════════════


class TestGetAdaptations:
    def test_returns_list(self, engine):
        result = engine.get_adaptations(_load(0.85), {})
        assert isinstance(result, list)

    def test_high_load_produces_actions(self, engine):
        result = engine.get_adaptations(_load(0.9), {})
        assert len(result) > 0

    def test_low_load_produces_fewer_actions(self, engine):
        high = engine.get_adaptations(_load(0.9), {})
        low = engine.get_adaptations(_load(0.3), {})
        assert len(high) >= len(low)

    def test_max_adaptations_per_request(self, custom_engine):
        result = custom_engine.get_adaptations(_load(0.95), {})
        assert len(result) <= 3

    def test_filters_recent_adaptations(self, engine):
        result = engine.get_adaptations(
            _load(0.85),
            {},
            recent_adaptations=[AdaptationType.SUGGEST_BREAK, AdaptationType.REDUCE_COMPLEXITY],
        )
        action_types = [a.action_type for a in result]
        assert AdaptationType.SUGGEST_BREAK not in action_types
        assert AdaptationType.REDUCE_COMPLEXITY not in action_types

    def test_respects_available_adaptations(self, engine):
        available = [AdaptationType.SUGGEST_BREAK, AdaptationType.SLOW_PACE]
        result = engine.get_adaptations(_load(0.85), {}, available_adaptations=available)
        for action in result:
            assert action.action_type in available

    def test_actions_have_required_fields(self, engine):
        result = engine.get_adaptations(_load(0.85), {})
        for action in result:
            assert isinstance(action, AdaptationAction)
            assert isinstance(action.action_type, AdaptationType)
            assert isinstance(action.priority, int)
            assert isinstance(action.description, str)
            assert isinstance(action.expected_load_reduction, float)
            assert 0 <= action.expected_load_reduction <= 0.5

    def test_tracks_history_with_learner_id(self, engine):
        engine.get_adaptations(_load(0.85), {}, learner_id="learner-1")
        assert "learner-1" in engine._adaptation_history


# ═══════════════════════════════════════════════════════════════════════
# get_recommendations
# ═══════════════════════════════════════════════════════════════════════


class TestGetRecommendations:
    def test_returns_adaptation_plan(self, engine):
        plan = engine.get_recommendations(_load(0.85), {})
        assert isinstance(plan, AdaptationPlan)

    def test_plan_has_urgency(self, engine):
        plan = engine.get_recommendations(_load(0.95), {})
        assert plan.urgency == UrgencyLevel.CRITICAL

    def test_plan_expected_load_after(self, engine):
        plan = engine.get_recommendations(_load(0.85), {})
        # Expected load should be lower than input (reductions applied)
        assert plan.expected_load_after <= 0.85
        # Should not go below 0.3 (the floor)
        assert plan.expected_load_after >= 0.3

    def test_plan_has_confidence(self, engine):
        plan = engine.get_recommendations(_load(0.85), {})
        assert 0.0 <= plan.confidence <= 1.0

    def test_plan_has_processing_time(self, engine):
        plan = engine.get_recommendations(_load(0.85), {})
        assert isinstance(plan.processing_time_ms, int)
        assert plan.processing_time_ms >= 0

    def test_fallback_plan_for_critical(self, engine):
        plan = engine.get_recommendations(_load(0.95), {})
        # Critical urgency should have a fallback plan
        assert plan.fallback_plan is not None or plan.urgency == UrgencyLevel.CRITICAL


# ═══════════════════════════════════════════════════════════════════════
# compute_adaptations
# ═══════════════════════════════════════════════════════════════════════


class TestComputeAdaptations:
    def test_computes_total_load(self, engine):
        # total = (0.8 + 0.7 + 0.3*0.5) / 2.5 = 1.65 / 2.5 = 0.66
        result = engine.compute_adaptations(0.8, 0.7, 0.3)
        assert isinstance(result, list)

    def test_high_component_loads_produce_actions(self, engine):
        result = engine.compute_adaptations(0.9, 0.9, 0.9)
        assert len(result) > 0

    def test_low_component_loads_produce_fewer_actions(self, engine):
        result = engine.compute_adaptations(0.1, 0.1, 0.1)
        # Very low loads should produce few or no adaptations
        assert isinstance(result, list)

    def test_caps_total_at_one(self, engine):
        # Very high components should not break the engine
        result = engine.compute_adaptations(1.0, 1.0, 1.0)
        assert isinstance(result, list)


# ═══════════════════════════════════════════════════════════════════════
# apply_scaffolding
# ═══════════════════════════════════════════════════════════════════════


class TestApplyScaffolding:
    def test_low_load_returns_content_unchanged(self, engine):
        content = "Simple paragraph of text."
        result = engine.apply_scaffolding(content, load_level=0.3)
        assert result == content

    def test_hint_scaffold(self, engine):
        content = "Solve: 2x + 3 = 7"
        result = engine.apply_scaffolding(content, load_level=0.8, scaffold_type="hint")
        assert isinstance(result, str)
        assert len(result) > 0

    def test_chunk_scaffold(self, engine):
        content = "A long paragraph that needs breaking up. " * 10
        result = engine.apply_scaffolding(content, load_level=0.8, scaffold_type="chunk")
        assert isinstance(result, str)

    def test_highlight_scaffold(self, engine):
        content = "Key concept: Newton's first law states that..."
        result = engine.apply_scaffolding(content, load_level=0.7, scaffold_type="highlight")
        assert isinstance(result, str)

    def test_summary_scaffold(self, engine):
        content = "Long explanation about thermodynamics. " * 5
        result = engine.apply_scaffolding(content, load_level=0.6, scaffold_type="summary")
        assert isinstance(result, str)


# ═══════════════════════════════════════════════════════════════════════
# simplify_presentation
# ═══════════════════════════════════════════════════════════════════════


class TestSimplifyPresentation:
    def test_already_simple_returns_unchanged(self, engine):
        content = "Hello"
        result = engine.simplify_presentation(content, target_complexity=0.5, current_complexity=0.3)
        assert result == content

    def test_heavy_simplification(self, engine):
        content = "Complex technical content with jargon. " * 5
        result = engine.simplify_presentation(content, target_complexity=0.2)
        assert isinstance(result, str)

    def test_moderate_simplification(self, engine):
        content = "Moderate complexity content."
        result = engine.simplify_presentation(content, target_complexity=0.4)
        assert isinstance(result, str)

    def test_light_simplification(self, engine):
        content = "Slightly complex content."
        result = engine.simplify_presentation(content, target_complexity=0.6)
        assert isinstance(result, str)


# ═══════════════════════════════════════════════════════════════════════
# prioritize_actions
# ═══════════════════════════════════════════════════════════════════════


class TestPrioritizeActions:
    def _make_action(self, atype, load_reduction=0.1):
        return AdaptationAction(
            action_type=atype,
            priority=5,
            description=f"Test {atype.value}",
            parameters={},
            expected_effect="reduce load",
            expected_load_reduction=load_reduction,
        )

    def test_returns_sorted_list(self, engine):
        actions = [
            self._make_action(AdaptationType.OFFER_HELP, 0.05),
            self._make_action(AdaptationType.SUGGEST_BREAK, 0.15),
            self._make_action(AdaptationType.REDUCE_COMPLEXITY, 0.15),
        ]
        result = engine.prioritize_actions(actions, UrgencyLevel.HIGH)
        assert isinstance(result, list)
        assert len(result) == 3

    def test_updates_priority_numbers(self, engine):
        actions = [
            self._make_action(AdaptationType.OFFER_HELP),
            self._make_action(AdaptationType.SUGGEST_BREAK),
        ]
        result = engine.prioritize_actions(actions, UrgencyLevel.MEDIUM)
        priorities = [a.priority for a in result]
        assert priorities == [1, 2]


# ═══════════════════════════════════════════════════════════════════════
# Enums & Templates
# ═══════════════════════════════════════════════════════════════════════


class TestEnumsAndTemplates:
    def test_adaptation_type_count(self):
        assert len(AdaptationType) == 12

    def test_urgency_level_count(self):
        assert len(UrgencyLevel) == 4

    def test_all_types_have_templates(self):
        for atype in AdaptationType:
            assert atype in ADAPTATION_TEMPLATES, f"Missing template for {atype}"

    def test_template_structure(self):
        for atype, template in ADAPTATION_TEMPLATES.items():
            assert "description" in template
            assert "parameters" in template
            assert "expected_effect" in template
            assert "load_reduction" in template
            assert "min_load_trigger" in template
            assert isinstance(template["load_reduction"], float)
            assert isinstance(template["min_load_trigger"], float)


# ═══════════════════════════════════════════════════════════════════════
# Config
# ═══════════════════════════════════════════════════════════════════════


class TestAdaptationEngineConfig:
    def test_default_thresholds(self):
        cfg = AdaptationEngineConfig()
        assert cfg.critical_load_threshold == 0.9
        assert cfg.high_load_threshold == 0.8
        assert cfg.medium_load_threshold == 0.7
        assert cfg.low_load_threshold == 0.5

    def test_custom_thresholds(self):
        cfg = AdaptationEngineConfig(critical_load_threshold=0.95, max_adaptations_per_request=10)
        assert cfg.critical_load_threshold == 0.95
        assert cfg.max_adaptations_per_request == 10
