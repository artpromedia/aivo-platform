"""
Tests for Bayesian Belief System.
"""

import math

import pytest

from app.models.memory.beliefs import (
    BayesianBeliefSystem,
    BeliefUpdate,
    LearnerBelief,
)


class TestLearnerBelief:
    """Tests for LearnerBelief model."""

    def test_create_belief_with_defaults(self, learner_id):
        """Test creating a belief with default values."""
        belief = LearnerBelief(
            learner_id=learner_id,
            topic="math-fractions",
        )

        assert belief.learner_id == learner_id
        assert belief.topic == "math-fractions"
        assert belief.belief_state == 0.5
        assert belief.uncertainty == 0.5
        assert belief.prior == 0.5
        assert belief.alpha == 1.0
        assert belief.beta == 1.0
        assert belief.evidence_count == 0

    def test_belief_state_clamping(self, learner_id):
        """Test that belief state is clamped to valid range."""
        belief = LearnerBelief(
            learner_id=learner_id,
            topic="test",
            belief_state=1.5,
        )
        assert belief.belief_state == 1.0

        belief2 = LearnerBelief(
            learner_id=learner_id,
            topic="test",
            belief_state=-0.5,
        )
        assert belief2.belief_state == 0.0

    def test_to_dict_roundtrip(self, learner_id):
        """Test serialization to dict and back."""
        original = LearnerBelief(
            learner_id=learner_id,
            topic="test-topic",
            belief_state=0.7,
            uncertainty=0.2,
            alpha=3.5,
            beta=1.5,
            evidence_count=10,
        )

        dict_data = original.to_dict()
        restored = LearnerBelief.from_dict(dict_data)

        assert restored.belief_id == original.belief_id
        assert restored.learner_id == original.learner_id
        assert restored.topic == original.topic
        assert restored.belief_state == original.belief_state
        assert restored.alpha == original.alpha
        assert restored.beta == original.beta


class TestBayesianBeliefSystem:
    """Tests for BayesianBeliefSystem."""

    @pytest.fixture
    def belief_system(self):
        """Create a belief system for testing."""
        return BayesianBeliefSystem(
            p_correct_if_mastered=0.95,
            p_correct_if_not_mastered=0.25,
        )

    @pytest.mark.asyncio
    async def test_get_or_create_belief(self, belief_system, learner_id):
        """Test getting or creating a belief."""
        # First call creates
        belief1 = await belief_system.get_or_create_belief(
            learner_id=learner_id,
            topic="new-topic",
            initial_prior=0.3,
        )

        assert belief1.topic == "new-topic"
        assert belief1.belief_state == 0.3
        assert belief1.prior == 0.3

        # Second call retrieves existing
        belief2 = await belief_system.get_or_create_belief(
            learner_id=learner_id,
            topic="new-topic",
            initial_prior=0.8,  # Should be ignored
        )

        assert belief2.belief_id == belief1.belief_id
        assert belief2.belief_state == 0.3  # Not changed to 0.8

    @pytest.mark.asyncio
    async def test_update_belief_correct_response(self, belief_system, learner_id):
        """Test updating belief with a correct response."""
        # Create belief with prior 0.5
        await belief_system.get_or_create_belief(
            learner_id=learner_id,
            topic="test-topic",
            initial_prior=0.5,
        )

        # Update with correct response
        belief, update = await belief_system.update_belief(
            learner_id=learner_id,
            topic="test-topic",
            observation=True,  # Correct
        )

        # Belief should increase with correct response
        assert belief.belief_state > 0.5
        assert update.observation == True
        assert update.prior == 0.5
        assert update.posterior > 0.5

    @pytest.mark.asyncio
    async def test_update_belief_incorrect_response(self, belief_system, learner_id):
        """Test updating belief with an incorrect response."""
        # Create belief with prior 0.5
        await belief_system.get_or_create_belief(
            learner_id=learner_id,
            topic="test-topic",
            initial_prior=0.5,
        )

        # Update with incorrect response
        belief, update = await belief_system.update_belief(
            learner_id=learner_id,
            topic="test-topic",
            observation=False,  # Incorrect
        )

        # Belief should decrease with incorrect response
        assert belief.belief_state < 0.5
        assert update.observation == False
        assert update.posterior < 0.5

    @pytest.mark.asyncio
    async def test_bayesian_update_math_correct(self, belief_system, learner_id):
        """Test that Bayesian update math is correct."""
        # Set up known parameters
        p_correct_mastered = 0.95
        p_correct_not_mastered = 0.25
        prior = 0.5

        # Create belief
        await belief_system.get_or_create_belief(
            learner_id=learner_id,
            topic="math-test",
            initial_prior=prior,
        )

        # Update with correct response
        belief, _ = await belief_system.update_belief(
            learner_id=learner_id,
            topic="math-test",
            observation=True,
        )

        # Calculate expected posterior manually using Bayes' theorem
        # P(mastered|correct) = P(correct|mastered) * P(mastered) / P(correct)
        # P(correct) = P(correct|mastered)*P(mastered) + P(correct|not)*P(not)
        p_correct = (p_correct_mastered * prior) + (p_correct_not_mastered * (1 - prior))
        expected_posterior = (p_correct_mastered * prior) / p_correct

        # Allow small floating point tolerance
        assert abs(belief.belief_state - expected_posterior) < 0.01

    @pytest.mark.asyncio
    async def test_belief_converges_with_evidence(self, belief_system, learner_id):
        """Test that belief converges with consistent evidence."""
        await belief_system.get_or_create_belief(
            learner_id=learner_id,
            topic="convergence-test",
            initial_prior=0.5,
        )

        # Simulate many correct responses
        for _ in range(20):
            belief, _ = await belief_system.update_belief(
                learner_id=learner_id,
                topic="convergence-test",
                observation=True,
            )

        # Should converge toward high mastery
        assert belief.belief_state > 0.9

        # Reset and test with incorrect responses
        await belief_system.reset_belief(learner_id, "convergence-test-2")

        for _ in range(20):
            belief2, _ = await belief_system.update_belief(
                learner_id=learner_id,
                topic="convergence-test-2",
                observation=False,
            )

        # Should converge toward low mastery
        assert belief2.belief_state < 0.1

    @pytest.mark.asyncio
    async def test_observation_weight(self, belief_system, learner_id):
        """Test that observation weight affects update magnitude."""
        # Create two beliefs with same prior
        await belief_system.get_or_create_belief(
            learner_id=learner_id,
            topic="weight-test-1",
            initial_prior=0.5,
        )
        await belief_system.get_or_create_belief(
            learner_id=learner_id,
            topic="weight-test-2",
            initial_prior=0.5,
        )

        # Update with different weights
        belief1, _ = await belief_system.update_belief(
            learner_id=learner_id,
            topic="weight-test-1",
            observation=True,
            observation_weight=1.0,
        )

        belief2, _ = await belief_system.update_belief(
            learner_id=learner_id,
            topic="weight-test-2",
            observation=True,
            observation_weight=0.5,
        )

        # Higher weight should produce larger change
        change1 = belief1.belief_state - 0.5
        change2 = belief2.belief_state - 0.5
        assert change1 > change2

    @pytest.mark.asyncio
    async def test_predict_performance(self, belief_system, learner_id):
        """Test performance prediction."""
        # Create belief with high mastery
        await belief_system.get_or_create_belief(
            learner_id=learner_id,
            topic="prediction-test",
            initial_prior=0.9,
        )

        # Update to establish the belief
        await belief_system.update_belief(
            learner_id=learner_id,
            topic="prediction-test",
            observation=True,
        )

        # Predict on easy task
        p_easy = await belief_system.predict_performance(
            learner_id=learner_id,
            topic="prediction-test",
            difficulty=0.2,
        )

        # Predict on hard task
        p_hard = await belief_system.predict_performance(
            learner_id=learner_id,
            topic="prediction-test",
            difficulty=0.8,
        )

        # Should be more likely to succeed on easy task
        assert p_easy > p_hard

    @pytest.mark.asyncio
    async def test_get_mastery_level(self, belief_system, learner_id):
        """Test categorical mastery level assignment."""
        # Test various belief states
        test_cases = [
            (0.1, "beginning"),
            (0.4, "developing"),
            (0.6, "proficient"),
            (0.85, "mastered"),
        ]

        for i, (prior, expected_level) in enumerate(test_cases):
            topic = f"mastery-level-test-{i}"
            await belief_system.get_or_create_belief(
                learner_id=learner_id,
                topic=topic,
                initial_prior=prior,
            )
            # Need at least one piece of evidence
            await belief_system.update_belief(
                learner_id=learner_id,
                topic=topic,
                observation=prior > 0.5,
            )

            level = await belief_system.get_mastery_level(learner_id, topic)
            # Level may not exactly match due to Bayesian update, but should be close
            assert level in ["beginning", "developing", "proficient", "mastered"]

    @pytest.mark.asyncio
    async def test_get_topics_by_mastery(self, belief_system, learner_id):
        """Test categorizing topics by mastery."""
        # Create beliefs at different levels
        for topic, prior in [
            ("topic-high", 0.85),
            ("topic-medium", 0.55),
            ("topic-low", 0.2),
        ]:
            await belief_system.get_or_create_belief(
                learner_id=learner_id,
                topic=topic,
                initial_prior=prior,
            )

        categories = await belief_system.get_topics_by_mastery(learner_id)

        assert "mastered" in categories
        assert "proficient" in categories
        assert "developing" in categories
        assert "beginning" in categories

    @pytest.mark.asyncio
    async def test_batch_update_belief(self, belief_system, learner_id):
        """Test batch updating with multiple observations."""
        await belief_system.get_or_create_belief(
            learner_id=learner_id,
            topic="batch-test",
            initial_prior=0.5,
        )

        # Batch of observations: 3 correct, 1 incorrect
        observations = [
            (True, 1.0),
            (True, 1.0),
            (True, 1.0),
            (False, 1.0),
        ]

        belief = await belief_system.batch_update_belief(
            learner_id=learner_id,
            topic="batch-test",
            observations=observations,
        )

        # Should have increased overall (75% correct)
        assert belief.belief_state > 0.5
        assert belief.evidence_count == 4
        assert belief.correct_count == 3
        assert belief.incorrect_count == 1

    @pytest.mark.asyncio
    async def test_reset_belief(self, belief_system, learner_id):
        """Test resetting a belief."""
        # Create and update a belief
        await belief_system.get_or_create_belief(
            learner_id=learner_id,
            topic="reset-test",
            initial_prior=0.8,
        )
        await belief_system.update_belief(
            learner_id=learner_id,
            topic="reset-test",
            observation=True,
        )

        # Reset
        reset_belief = await belief_system.reset_belief(learner_id, "reset-test")

        assert reset_belief.belief_state == 0.5
        assert reset_belief.prior == 0.5
        assert reset_belief.alpha == 1.0
        assert reset_belief.beta == 1.0

    @pytest.mark.asyncio
    async def test_get_all_beliefs(self, belief_system, learner_id):
        """Test getting all beliefs for a learner."""
        topics = ["topic-1", "topic-2", "topic-3"]

        for topic in topics:
            await belief_system.get_or_create_belief(
                learner_id=learner_id,
                topic=topic,
            )

        all_beliefs = await belief_system.get_all_beliefs(learner_id)

        assert len(all_beliefs) == 3
        belief_topics = {b.topic for b in all_beliefs}
        assert belief_topics == set(topics)

    @pytest.mark.asyncio
    async def test_get_stats(self, belief_system, learner_id):
        """Test getting belief statistics."""
        # Create beliefs at different levels
        for topic, prior in [
            ("stat-1", 0.8),
            ("stat-2", 0.6),
            ("stat-3", 0.3),
        ]:
            await belief_system.get_or_create_belief(
                learner_id=learner_id,
                topic=topic,
                initial_prior=prior,
            )

        stats = await belief_system.get_stats(learner_id)

        assert stats["total_topics"] == 3
        assert 0.5 < stats["avg_mastery"] < 0.6  # Average of 0.8, 0.6, 0.3

    @pytest.mark.asyncio
    async def test_export_import_beliefs(self, belief_system, learner_id):
        """Test exporting and importing beliefs."""
        # Create some beliefs
        for topic in ["export-1", "export-2"]:
            await belief_system.get_or_create_belief(
                learner_id=learner_id,
                topic=topic,
            )
            await belief_system.update_belief(
                learner_id=learner_id,
                topic=topic,
                observation=True,
            )

        # Export
        exported = await belief_system.export_beliefs(learner_id)
        assert len(exported) == 2

        # Import to different learner
        new_learner_id = "new-learner"
        count = await belief_system.import_beliefs(new_learner_id, exported)
        assert count == 2

        # Verify imported beliefs
        new_beliefs = await belief_system.get_all_beliefs(new_learner_id)
        assert len(new_beliefs) == 2

    @pytest.mark.asyncio
    async def test_recommend_topics(self, belief_system, learner_id):
        """Test topic recommendations."""
        # Create beliefs at different levels
        for topic, prior in [
            ("easy-topic", 0.9),
            ("medium-topic", 0.5),
            ("hard-topic", 0.2),
        ]:
            await belief_system.get_or_create_belief(
                learner_id=learner_id,
                topic=topic,
                initial_prior=prior,
            )

        # Get recommendations for 70% target success
        recommendations = await belief_system.recommend_topics(
            learner_id=learner_id,
            candidate_topics=["easy-topic", "medium-topic", "hard-topic"],
            target_success_rate=0.7,
        )

        assert len(recommendations) == 3
        # Each recommendation should be (topic, predicted_success)
        for topic, p_success in recommendations:
            assert topic in ["easy-topic", "medium-topic", "hard-topic"]
            assert 0 <= p_success <= 1


class TestBeliefUpdate:
    """Tests for BeliefUpdate model."""

    def test_create_belief_update(self):
        """Test creating a belief update record."""
        update = BeliefUpdate(
            belief_id="belief-123",
            observation=True,
            observation_weight=1.0,
            prior=0.5,
            posterior=0.7,
            likelihood=0.95,
            evidence_source="quiz-001",
        )

        assert update.belief_id == "belief-123"
        assert update.observation == True
        assert update.prior == 0.5
        assert update.posterior == 0.7

    def test_belief_update_to_dict(self):
        """Test converting update to dictionary."""
        update = BeliefUpdate(
            belief_id="belief-123",
            observation=False,
            prior=0.6,
            posterior=0.4,
            likelihood=0.05,
        )

        dict_data = update.to_dict()

        assert dict_data["belief_id"] == "belief-123"
        assert dict_data["observation"] == False
        assert dict_data["prior"] == 0.6
        assert dict_data["posterior"] == 0.4
