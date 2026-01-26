"""
Adaptive Item Selection for Computer Adaptive Testing (CAT).

This module provides algorithms for selecting optimal items during
adaptive testing. The primary criterion is Maximum Fisher Information (MFI),
which selects items that provide the most information at the current
ability estimate.

Selection Criteria:
    - Maximum Information (MFI): Classic criterion, maximizes precision
    - Maximum Expected Information (MEI): Accounts for uncertainty in theta
    - a-Stratified: Balances information with item bank management
    - Content-Balanced: Ensures coverage of content areas

References:
    - Weiss, D. J. (1982). Improving measurement quality and efficiency
      with adaptive testing.
    - Chang, H. H., & Ying, Z. (1999). a-Stratified multistage CAT.
"""

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from typing import Sequence

import numpy as np
from numpy.typing import NDArray

from .models import AbilityEstimate, AdaptiveTestState, ItemParameters
from .three_pl import ThreePLModel

logger = logging.getLogger(__name__)


class SelectionCriterion(str, Enum):
    """Item selection criteria for adaptive testing."""

    MAXIMUM_INFORMATION = "maximum_information"
    MAXIMUM_EXPECTED_INFORMATION = "maximum_expected_information"
    A_STRATIFIED = "a_stratified"
    RANDOM = "random"


class StoppingRule(str, Enum):
    """Rules for terminating adaptive testing."""

    FIXED_LENGTH = "fixed_length"
    MINIMUM_INFORMATION = "minimum_information"
    STANDARD_ERROR = "standard_error"
    CLASSIFICATION = "classification"


@dataclass
class ContentConstraints:
    """
    Content balancing constraints for item selection.

    Ensures adequate coverage of content domains during adaptive testing.

    Attributes:
        domain_requirements: Minimum items required per domain
        domain_maximums: Maximum items allowed per domain
        skill_requirements: Minimum items per skill tag
        enemy_items: Sets of items that cannot appear together
    """

    domain_requirements: dict[str, int] = field(default_factory=dict)
    domain_maximums: dict[str, int] = field(default_factory=dict)
    skill_requirements: dict[str, int] = field(default_factory=dict)
    enemy_items: list[set[str]] = field(default_factory=list)


@dataclass
class StoppingConfig:
    """
    Configuration for adaptive test stopping rules.

    Attributes:
        rule: The stopping rule to use
        max_items: Maximum number of items to administer
        min_items: Minimum number of items before stopping
        target_se: Target standard error (for SE-based stopping)
        min_information: Minimum information threshold
        classification_cuts: Cut scores for classification
        classification_confidence: Required confidence for classification
    """

    rule: StoppingRule = StoppingRule.FIXED_LENGTH
    max_items: int = 30
    min_items: int = 10
    target_se: float = 0.3
    min_information: float = 0.1
    classification_cuts: list[float] = field(default_factory=list)
    classification_confidence: float = 0.9


class AdaptiveItemSelector:
    """
    Selects optimal items for Computer Adaptive Testing.

    This class implements various item selection algorithms for adaptive
    testing, with support for content balancing and exposure control.

    Example:
        >>> model = ThreePLModel()
        >>> selector = AdaptiveItemSelector(model, item_bank)
        >>> estimate = AbilityEstimate(learner_id="s1", domain="math", theta=0.5, ...)
        >>> next_item = selector.select_next_item(estimate, administered=["Q1", "Q2"])
        >>> print(f"Selected: {next_item.item_id}")

    Attributes:
        model: The 3PL IRT model
        item_bank: Available items for selection
        content_constraints: Optional content balancing constraints
        exposure_control: Whether to apply exposure control
    """

    def __init__(
        self,
        model: ThreePLModel,
        item_bank: Sequence[ItemParameters],
        content_constraints: ContentConstraints | None = None,
        exposure_control: bool = False,
        max_exposure_rate: float = 0.25,
    ):
        """
        Initialize the item selector.

        Args:
            model: ThreePLModel instance
            item_bank: Collection of available items
            content_constraints: Optional content balancing rules
            exposure_control: Whether to limit item exposure rates
            max_exposure_rate: Maximum proportion of tests using each item
        """
        self.model = model
        self.item_bank = list(item_bank)
        self.content_constraints = content_constraints
        self.exposure_control = exposure_control
        self.max_exposure_rate = max_exposure_rate

        # Index items for efficient lookup
        self._item_index = {item.item_id: item for item in self.item_bank}

        # Exposure tracking (simple count-based)
        self._exposure_counts: dict[str, int] = defaultdict(int)
        self._total_selections = 0

        logger.info(f"Initialized AdaptiveItemSelector with {len(item_bank)} items")

    def select_next_item(
        self,
        current_estimate: AbilityEstimate,
        administered_items: Sequence[str],
        criterion: SelectionCriterion = SelectionCriterion.MAXIMUM_INFORMATION,
        content_coverage: dict[str, int] | None = None,
    ) -> ItemParameters | None:
        """
        Select the optimal next item based on the selection criterion.

        This is the main entry point for item selection. It filters available
        items, applies constraints, and selects based on the specified criterion.

        Args:
            current_estimate: Current ability estimate
            administered_items: List of already-administered item IDs
            criterion: Selection criterion to use
            content_coverage: Current count of items per content domain

        Returns:
            Selected item parameters, or None if no suitable item available
        """
        # Get eligible items
        available_items = self._get_available_items(
            administered_items=administered_items,
            content_coverage=content_coverage or {},
        )

        if not available_items:
            logger.warning("No eligible items available for selection")
            return None

        # Apply selection criterion
        if criterion == SelectionCriterion.MAXIMUM_INFORMATION:
            selected = self._select_max_information(
                current_estimate.theta, available_items
            )
        elif criterion == SelectionCriterion.MAXIMUM_EXPECTED_INFORMATION:
            selected = self._select_max_expected_information(
                current_estimate, available_items
            )
        elif criterion == SelectionCriterion.A_STRATIFIED:
            selected = self._select_a_stratified(
                current_estimate.theta,
                available_items,
                len(administered_items),
            )
        elif criterion == SelectionCriterion.RANDOM:
            selected = self._select_random(available_items)
        else:
            raise ValueError(f"Unknown selection criterion: {criterion}")

        # Update exposure tracking
        if selected and self.exposure_control:
            self._exposure_counts[selected.item_id] += 1
            self._total_selections += 1

        return selected

    def _get_available_items(
        self,
        administered_items: Sequence[str],
        content_coverage: dict[str, int],
    ) -> list[ItemParameters]:
        """
        Get items eligible for selection after applying constraints.

        Args:
            administered_items: Already-administered item IDs
            content_coverage: Current content domain coverage

        Returns:
            List of eligible items
        """
        administered_set = set(administered_items)
        available = []

        for item in self.item_bank:
            # Skip already administered
            if item.item_id in administered_set:
                continue

            # Apply exposure control
            if self.exposure_control and self._total_selections > 0:
                exposure_rate = self._exposure_counts[item.item_id] / self._total_selections
                if exposure_rate >= self.max_exposure_rate:
                    continue

            # Apply content constraints
            if self.content_constraints:
                domain = item.content_domain.value
                max_allowed = self.content_constraints.domain_maximums.get(domain, float("inf"))
                current_count = content_coverage.get(domain, 0)
                if current_count >= max_allowed:
                    continue

                # Check enemy items
                for enemy_set in self.content_constraints.enemy_items:
                    if item.item_id in enemy_set:
                        if any(e in administered_set for e in enemy_set if e != item.item_id):
                            continue

            available.append(item)

        return available

    def _select_max_information(
        self,
        theta: float,
        items: Sequence[ItemParameters],
    ) -> ItemParameters:
        """
        Select item with maximum Fisher information at current theta.

        The Maximum Fisher Information (MFI) criterion selects the item
        that provides the most information about ability at the current
        point estimate.

        I(θ) = a²(P-c)² / ((1-c)²P(1-P))

        Args:
            theta: Current ability estimate
            items: Candidate items

        Returns:
            Item with maximum information
        """
        max_info = -float("inf")
        best_item = items[0]

        for item in items:
            info = self.model.item_information(theta, item)
            if info > max_info:
                max_info = info
                best_item = item

        logger.debug(
            f"MFI selected {best_item.item_id} with info={max_info:.4f} at θ={theta:.2f}"
        )
        return best_item

    def _select_max_expected_information(
        self,
        estimate: AbilityEstimate,
        items: Sequence[ItemParameters],
    ) -> ItemParameters:
        """
        Select item with maximum expected information.

        Unlike MFI, this criterion accounts for uncertainty in the ability
        estimate by integrating information over the posterior distribution.

        E[I(θ)] = ∫ I(θ) * p(θ|X) dθ

        This is more appropriate when SE is large.

        Args:
            estimate: Current ability estimate with uncertainty
            items: Candidate items

        Returns:
            Item with maximum expected information
        """
        # Use a few quadrature points around the estimate
        se = estimate.standard_error
        theta_points = np.array([
            estimate.theta - 2 * se,
            estimate.theta - se,
            estimate.theta,
            estimate.theta + se,
            estimate.theta + 2 * se,
        ])

        # Approximate normal posterior weights
        weights = np.array([0.1, 0.2, 0.4, 0.2, 0.1])

        max_expected_info = -float("inf")
        best_item = items[0]

        for item in items:
            # Expected information
            infos = np.array([self.model.item_information(t, item) for t in theta_points])
            expected_info = np.sum(infos * weights)

            if expected_info > max_expected_info:
                max_expected_info = expected_info
                best_item = item

        logger.debug(
            f"MEI selected {best_item.item_id} with E[I]={max_expected_info:.4f}"
        )
        return best_item

    def _select_a_stratified(
        self,
        theta: float,
        items: Sequence[ItemParameters],
        n_administered: int,
    ) -> ItemParameters:
        """
        Select item using a-stratified selection.

        a-Stratification divides item selection into stages, using less
        discriminating items early (to avoid wild estimates) and more
        discriminating items later (for precision).

        Stage 1 (early): Use low-a items near estimated ability
        Stage 2 (middle): Use medium-a items
        Stage 3 (late): Use high-a items for precision

        Args:
            theta: Current ability estimate
            items: Candidate items
            n_administered: Number of items already given

        Returns:
            Selected item
        """
        # Determine current stage based on test progress
        total_expected = 20  # Assume typical test length

        if n_administered < total_expected // 3:
            # Early stage: prefer lower discrimination
            target_a = 0.8
        elif n_administered < 2 * total_expected // 3:
            # Middle stage: medium discrimination
            target_a = 1.2
        else:
            # Late stage: higher discrimination for precision
            target_a = 1.8

        # Score items based on closeness to target discrimination
        # and information at current ability
        best_score = -float("inf")
        best_item = items[0]

        for item in items:
            # Information component
            info = self.model.item_information(theta, item)

            # Penalty for discrimination far from target
            a_penalty = -abs(item.discrimination - target_a)

            # Combined score (weighted)
            score = 0.7 * info + 0.3 * a_penalty

            if score > best_score:
                best_score = score
                best_item = item

        logger.debug(
            f"a-Stratified selected {best_item.item_id} (a={best_item.discrimination:.2f}) "
            f"at stage with target_a={target_a}"
        )
        return best_item

    def _select_random(
        self,
        items: Sequence[ItemParameters],
    ) -> ItemParameters:
        """
        Select a random item (baseline/control condition).

        Args:
            items: Candidate items

        Returns:
            Randomly selected item
        """
        idx = np.random.randint(len(items))
        return items[idx]

    def check_stopping_rule(
        self,
        state: AdaptiveTestState,
        config: StoppingConfig,
    ) -> tuple[bool, str | None]:
        """
        Check if the adaptive test should stop.

        Evaluates the current test state against the specified stopping
        rule to determine if testing should terminate.

        Args:
            state: Current adaptive test state
            config: Stopping rule configuration

        Returns:
            Tuple of (should_stop, reason)
        """
        n_items = len(state.administered_items)

        # Always stop at max items
        if n_items >= config.max_items:
            return True, "Maximum items reached"

        # Don't stop before minimum items
        if n_items < config.min_items:
            return False, None

        # Check specific stopping rule
        if config.rule == StoppingRule.FIXED_LENGTH:
            if n_items >= config.max_items:
                return True, "Fixed length reached"

        elif config.rule == StoppingRule.STANDARD_ERROR:
            if state.current_estimate is None:
                return False, None
            if state.current_estimate.standard_error <= config.target_se:
                return True, f"Target SE ({config.target_se}) achieved"

        elif config.rule == StoppingRule.MINIMUM_INFORMATION:
            if state.current_estimate is None:
                return False, None
            # Check if remaining items provide sufficient information
            available = self._get_available_items(
                state.administered_items,
                state.content_coverage,
            )
            if not available:
                return True, "No more items available"

            max_info = max(
                self.model.item_information(state.current_estimate.theta, item)
                for item in available
            )
            if max_info < config.min_information:
                return True, "Insufficient remaining information"

        elif config.rule == StoppingRule.CLASSIFICATION:
            if state.current_estimate is None:
                return False, None
            # Check if classification is sufficiently certain
            should_stop, reason = self._check_classification_stopping(
                state.current_estimate,
                config.classification_cuts,
                config.classification_confidence,
            )
            if should_stop:
                return True, reason

        return False, None

    def _check_classification_stopping(
        self,
        estimate: AbilityEstimate,
        cut_scores: Sequence[float],
        confidence: float,
    ) -> tuple[bool, str | None]:
        """
        Check if classification can be made with sufficient confidence.

        Uses the confidence interval to determine if the learner can be
        classified into a proficiency level with the required certainty.

        Args:
            estimate: Current ability estimate
            cut_scores: Proficiency level cut scores
            confidence: Required classification confidence

        Returns:
            Tuple of (can_classify, classification_result)
        """
        ci_lower, ci_upper = estimate.confidence_interval

        # Check if entire CI is above or below each cut score
        for i, cut in enumerate(sorted(cut_scores)):
            if ci_upper < cut:
                # Entire CI below this cut
                return True, f"Classified below level {i + 1}"
            if ci_lower > cut:
                # Check if above all cuts
                if i == len(cut_scores) - 1:
                    return True, f"Classified above level {i + 1}"

        return False, None

    def get_content_requirements_status(
        self,
        content_coverage: dict[str, int],
    ) -> dict[str, dict[str, int]]:
        """
        Check status of content requirements.

        Args:
            content_coverage: Current items per content domain

        Returns:
            Dictionary with status for each domain
        """
        if not self.content_constraints:
            return {}

        status = {}
        for domain, required in self.content_constraints.domain_requirements.items():
            current = content_coverage.get(domain, 0)
            status[domain] = {
                "required": required,
                "current": current,
                "remaining": max(0, required - current),
            }

        return status

    def items_needed_for_constraints(
        self,
        content_coverage: dict[str, int],
    ) -> int:
        """
        Calculate minimum additional items needed to satisfy content constraints.

        Args:
            content_coverage: Current content domain coverage

        Returns:
            Minimum number of additional items needed
        """
        if not self.content_constraints:
            return 0

        total_needed = 0
        for domain, required in self.content_constraints.domain_requirements.items():
            current = content_coverage.get(domain, 0)
            total_needed += max(0, required - current)

        return total_needed

    def get_item_bank_statistics(self) -> dict:
        """
        Compute statistics about the item bank.

        Returns:
            Dictionary of item bank statistics
        """
        if not self.item_bank:
            return {}

        difficulties = [item.difficulty for item in self.item_bank]
        discriminations = [item.discrimination for item in self.item_bank]
        guessings = [item.guessing for item in self.item_bank]

        # Domain coverage
        domain_counts: dict[str, int] = defaultdict(int)
        for item in self.item_bank:
            domain_counts[item.content_domain.value] += 1

        return {
            "total_items": len(self.item_bank),
            "difficulty": {
                "min": min(difficulties),
                "max": max(difficulties),
                "mean": np.mean(difficulties),
                "std": np.std(difficulties),
            },
            "discrimination": {
                "min": min(discriminations),
                "max": max(discriminations),
                "mean": np.mean(discriminations),
                "std": np.std(discriminations),
            },
            "guessing": {
                "min": min(guessings),
                "max": max(guessings),
                "mean": np.mean(guessings),
            },
            "domain_coverage": dict(domain_counts),
        }


class AdaptiveTestController:
    """
    High-level controller for managing adaptive test sessions.

    This class orchestrates the complete adaptive testing process,
    combining item selection, ability estimation, and stopping rules.

    Example:
        >>> controller = AdaptiveTestController(model, item_bank, estimator)
        >>> session = controller.start_session("student_1", "math")
        >>> while not controller.is_finished(session):
        ...     next_item = controller.get_next_item(session)
        ...     response = get_student_response(next_item)  # External
        ...     session = controller.record_response(session, next_item, response)
        >>> final_estimate = session.current_estimate

    Attributes:
        model: The 3PL IRT model
        selector: Item selector instance
        estimator: Ability estimator instance
        stopping_config: Stopping rule configuration
    """

    def __init__(
        self,
        model: ThreePLModel,
        item_bank: Sequence[ItemParameters],
        estimator: "AbilityEstimator",  # Forward reference
        stopping_config: StoppingConfig | None = None,
        content_constraints: ContentConstraints | None = None,
    ):
        """
        Initialize the adaptive test controller.

        Args:
            model: ThreePLModel instance
            item_bank: Available items
            estimator: AbilityEstimator instance
            stopping_config: Stopping rule configuration
            content_constraints: Content balancing constraints
        """
        self.model = model
        self.estimator = estimator
        self.stopping_config = stopping_config or StoppingConfig()
        self.selector = AdaptiveItemSelector(
            model=model,
            item_bank=item_bank,
            content_constraints=content_constraints,
        )

        # Session storage
        self._sessions: dict[str, AdaptiveTestState] = {}
        self._session_items: dict[str, list[ItemParameters]] = {}

    def start_session(
        self,
        learner_id: str,
        domain: str,
        session_id: str | None = None,
    ) -> AdaptiveTestState:
        """
        Start a new adaptive test session.

        Args:
            learner_id: Learner identifier
            domain: Content domain being assessed
            session_id: Optional session ID (generated if not provided)

        Returns:
            Initial AdaptiveTestState
        """
        import uuid

        session_id = session_id or str(uuid.uuid4())

        state = AdaptiveTestState(
            session_id=session_id,
            learner_id=learner_id,
            domain=domain,
            items_remaining=self.stopping_config.max_items,
        )

        self._sessions[session_id] = state
        self._session_items[session_id] = []

        logger.info(f"Started adaptive test session {session_id} for {learner_id}")
        return state

    def get_next_item(
        self,
        state: AdaptiveTestState,
        criterion: SelectionCriterion = SelectionCriterion.MAXIMUM_INFORMATION,
    ) -> ItemParameters | None:
        """
        Get the next item to administer.

        Args:
            state: Current test state
            criterion: Item selection criterion

        Returns:
            Next item to administer, or None if test should stop
        """
        # Check stopping rule
        should_stop, reason = self.selector.check_stopping_rule(
            state, self.stopping_config
        )
        if should_stop:
            logger.info(f"Test stopping: {reason}")
            return None

        # Select next item
        return self.selector.select_next_item(
            current_estimate=state.current_estimate or AbilityEstimate(
                learner_id=state.learner_id,
                domain=state.domain,
                theta=0.0,
                standard_error=1.0,
                confidence_interval=(-1.96, 1.96),
                n_items=0,
            ),
            administered_items=state.administered_items,
            criterion=criterion,
            content_coverage=state.content_coverage,
        )

    def record_response(
        self,
        state: AdaptiveTestState,
        item: ItemParameters,
        response: bool,
    ) -> AdaptiveTestState:
        """
        Record a response and update the test state.

        Args:
            state: Current test state
            item: The administered item
            response: Learner's response (True=correct)

        Returns:
            Updated AdaptiveTestState
        """
        # Update administered items and responses
        administered = list(state.administered_items) + [item.item_id]
        responses = list(state.responses) + [response]

        # Get all items for estimation
        session_items = self._session_items.get(state.session_id, [])
        session_items.append(item)
        self._session_items[state.session_id] = session_items

        # Update ability estimate
        new_estimate = self.estimator.eap_estimate(
            items=session_items,
            responses=responses,
            learner_id=state.learner_id,
            domain=state.domain,
        )

        # Update content coverage
        content_coverage = dict(state.content_coverage)
        domain = item.content_domain.value
        content_coverage[domain] = content_coverage.get(domain, 0) + 1

        # Check stopping rule
        new_state = AdaptiveTestState(
            session_id=state.session_id,
            learner_id=state.learner_id,
            domain=state.domain,
            administered_items=administered,
            responses=responses,
            current_estimate=new_estimate,
            items_remaining=self.stopping_config.max_items - len(administered),
            content_coverage=content_coverage,
            started_at=state.started_at,
        )

        should_stop, reason = self.selector.check_stopping_rule(
            new_state, self.stopping_config
        )
        if should_stop:
            new_state.stopping_rule_met = True
            new_state.stopping_reason = reason

        self._sessions[state.session_id] = new_state
        return new_state

    def is_finished(self, state: AdaptiveTestState) -> bool:
        """Check if the test has finished."""
        return state.stopping_rule_met

    def get_session(self, session_id: str) -> AdaptiveTestState | None:
        """Retrieve a session by ID."""
        return self._sessions.get(session_id)

    def get_final_results(
        self,
        state: AdaptiveTestState,
    ) -> dict:
        """
        Get comprehensive final results for a completed test.

        Args:
            state: Final test state

        Returns:
            Dictionary of test results and statistics
        """
        if state.current_estimate is None:
            return {"error": "No estimate available"}

        return {
            "session_id": state.session_id,
            "learner_id": state.learner_id,
            "domain": state.domain,
            "theta": state.current_estimate.theta,
            "standard_error": state.current_estimate.standard_error,
            "confidence_interval": state.current_estimate.confidence_interval,
            "n_items": len(state.administered_items),
            "n_correct": sum(state.responses),
            "accuracy": sum(state.responses) / len(state.responses) if state.responses else 0,
            "reliability": state.current_estimate.reliability,
            "stopping_reason": state.stopping_reason,
            "content_coverage": state.content_coverage,
        }
