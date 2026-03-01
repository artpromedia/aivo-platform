"""
Bayesian Knowledge Tracing (BKT) Engine

Implements knowledge tracing using Hidden Markov Models with Bayesian updates.
Based on research from Google DeepMind Education and foundational papers.

Ported from: aivo-pro/services/learning-session-svc/src/ml/knowledge_tracing.py

BKT uses four parameters to model student knowledge:
- p_init: Initial probability student knows the skill
- p_learn: Probability of learning from an opportunity
- p_guess: Probability of guessing correctly when not knowing
- p_slip: Probability of slip (error) when knowing

References:
- Corbett & Anderson (1995) - Original BKT paper
- Pardos & Heffernan (2010) - Contextual BKT
- Google DeepMind Education research (2019-2024)

Author: AIVO Platform Team (ported from ex-Google DeepMind Education engineer)
"""

import numpy as np
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional
from datetime import datetime


@dataclass
class BKTParameters:
    """
    BKT model parameters for a skill.

    These four parameters define the knowledge tracing model:
    - p_init (P(L0)): Initial knowledge probability
    - p_learn (P(T)): Learning/transition probability
    - p_guess (P(G)): Guessing probability (max 0.5)
    - p_slip (P(S)): Slip probability (max 0.5)

    The constraint p_guess + p_slip < 1 ensures identifiability.

    Attributes:
        p_init: Probability student knew skill before any practice
        p_learn: Probability of learning after each opportunity
        p_guess: Probability of correct answer without knowing
        p_slip: Probability of wrong answer while knowing

    Example:
        params = BKTParameters(
            p_init=0.2,   # 20% start knowing
            p_learn=0.1,  # 10% learn per attempt
            p_guess=0.2,  # 20% guess correctly
            p_slip=0.1    # 10% slip rate
        )
    """

    p_init: float = 0.2
    p_learn: float = 0.1
    p_guess: float = 0.2
    p_slip: float = 0.1

    def validate(self) -> bool:
        """
        Validate parameters are in valid ranges.

        Enforces:
        - All parameters in [0, 1]
        - p_guess and p_slip at most 0.5 (identifiability)

        Returns:
            True if parameters are valid
        """
        return (
            0.0 <= self.p_init <= 1.0
            and 0.0 <= self.p_learn <= 1.0
            and 0.0 <= self.p_guess <= 0.5
            and 0.0 <= self.p_slip <= 0.5
        )

    def to_dict(self) -> dict:
        """Convert to dictionary for serialization."""
        return {
            "p_init": self.p_init,
            "p_learn": self.p_learn,
            "p_guess": self.p_guess,
            "p_slip": self.p_slip,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "BKTParameters":
        """Create from dictionary."""
        return cls(
            p_init=data.get("p_init", 0.2),
            p_learn=data.get("p_learn", 0.1),
            p_guess=data.get("p_guess", 0.2),
            p_slip=data.get("p_slip", 0.1),
        )


@dataclass
class Response:
    """
    Student response to a learning item.

    Captures all relevant information about a student's attempt
    at a learning item for knowledge tracing.

    Attributes:
        correct: Whether the response was correct
        time_spent: Time spent on the item in seconds
        attempt_number: Which attempt this is (1 = first)
        timestamp: When the response was submitted
        hint_used: Whether hints were used
        confidence: Student's self-reported confidence (0-1)
    """

    correct: bool
    time_spent: float
    attempt_number: int
    timestamp: datetime
    hint_used: bool = False
    confidence: Optional[float] = None


class BayesianKnowledgeTracer:
    """
    Bayesian Knowledge Tracing engine.

    Tracks student mastery using Hidden Markov Models with Bayesian updates.
    Supports personalized parameter estimation and contextual adjustments.

    The engine maintains:
    - Skill states: Current mastery probability for each student-skill pair
    - Parameters: BKT parameters (can be personalized per student-skill)
    - Response history: All responses for parameter estimation

    Example:
        tracer = BayesianKnowledgeTracer()

        # Update knowledge after a response
        response = Response(
            correct=True,
            time_spent=15.5,
            attempt_number=1,
            timestamp=datetime.utcnow()
        )
        prior, posterior = tracer.update_knowledge(
            student_id="student-123",
            skill="algebra-linear-equations",
            response=response
        )

        # Check mastery
        mastery = tracer.get_mastery_probability("student-123", "algebra-linear-equations")
        if mastery > 0.95:
            print("Skill mastered!")
    """

    # Default BKT parameters (research-based values)
    DEFAULT_P_INIT = 0.2
    DEFAULT_P_LEARN = 0.1
    DEFAULT_P_GUESS = 0.2
    DEFAULT_P_SLIP = 0.1

    def __init__(
        self,
        default_p_init: float = DEFAULT_P_INIT,
        default_p_learn: float = DEFAULT_P_LEARN,
        default_p_guess: float = DEFAULT_P_GUESS,
        default_p_slip: float = DEFAULT_P_SLIP,
    ):
        """
        Initialize the BKT engine.

        Args:
            default_p_init: Default initial knowledge probability
            default_p_learn: Default learning probability
            default_p_guess: Default guess probability
            default_p_slip: Default slip probability
        """
        # Student skill states: {student_id: {skill: p_mastery}}
        self.skill_states: Dict[str, Dict[str, float]] = defaultdict(
            lambda: defaultdict(float)
        )

        # Personalized parameters: {student_id_skill: BKTParameters}
        self.parameters: Dict[str, BKTParameters] = {}

        # Response history for parameter estimation
        self.response_history: Dict[str, List[Response]] = defaultdict(list)

        # Default parameters
        self.default_params = BKTParameters(
            p_init=default_p_init,
            p_learn=default_p_learn,
            p_guess=default_p_guess,
            p_slip=default_p_slip,
        )

    def get_parameters(self, student_id: str, skill: str) -> BKTParameters:
        """
        Get parameters for a student-skill pair.

        Returns personalized parameters if available, otherwise defaults.

        Args:
            student_id: Student identifier
            skill: Skill identifier

        Returns:
            BKTParameters for this student-skill pair
        """
        key = f"{student_id}_{skill}"
        return self.parameters.get(key, self.default_params)

    def set_parameters(
        self, student_id: str, skill: str, params: BKTParameters
    ) -> None:
        """
        Set personalized parameters for a student-skill pair.

        Args:
            student_id: Student identifier
            skill: Skill identifier
            params: BKT parameters to use
        """
        if not params.validate():
            raise ValueError("Invalid BKT parameters")
        key = f"{student_id}_{skill}"
        self.parameters[key] = params

    def get_mastery_probability(self, student_id: str, skill: str) -> float:
        """
        Get current mastery probability P(L_n).

        If the skill hasn't been practiced, returns p_init.

        Args:
            student_id: Student identifier
            skill: Skill identifier

        Returns:
            Current mastery probability (0-1)
        """
        if skill not in self.skill_states[student_id]:
            params = self.get_parameters(student_id, skill)
            self.skill_states[student_id][skill] = params.p_init

        return self.skill_states[student_id][skill]

    def update_knowledge(
        self, student_id: str, skill: str, response: Response
    ) -> Tuple[float, float]:
        """
        Update knowledge state using Bayesian inference.

        Implements the core BKT algorithm:
        1. Get prior P(L_n-1)
        2. Calculate likelihood P(obs|knows) and P(obs|doesn't know)
        3. Apply Bayes rule to get P(knows|observation)
        4. Apply learning opportunity: P(L_n) = P(L_n|obs) + (1-P(L_n|obs)) * p_learn

        Args:
            student_id: Student identifier
            skill: Skill being practiced
            response: Student's response

        Returns:
            Tuple of (prior_mastery, posterior_mastery)
        """
        params = self.get_parameters(student_id, skill)
        prior = self.get_mastery_probability(student_id, skill)

        # Store response for parameter estimation
        key = f"{student_id}_{skill}"
        self.response_history[key].append(response)

        # Step 1: Calculate likelihood of observation
        if response.correct:
            # P(correct) = P(correct|L)*P(L) + P(correct|~L)*P(~L)
            #            = (1-p_slip)*P(L) + p_guess*(1-P(L))
            p_correct = (1 - params.p_slip) * prior + params.p_guess * (1 - prior)

            # Apply Bayes rule: P(L|correct) = P(correct|L)*P(L) / P(correct)
            if p_correct > 0:
                posterior_knows = (1 - params.p_slip) * prior / p_correct
            else:
                posterior_knows = prior
        else:
            # P(incorrect) = P(incorrect|L)*P(L) + P(incorrect|~L)*P(~L)
            #              = p_slip*P(L) + (1-p_guess)*(1-P(L))
            p_incorrect = params.p_slip * prior + (1 - params.p_guess) * (1 - prior)

            # Apply Bayes rule: P(L|incorrect) = P(incorrect|L)*P(L) / P(incorrect)
            if p_incorrect > 0:
                posterior_knows = params.p_slip * prior / p_incorrect
            else:
                posterior_knows = prior * 0.9  # Penalize slightly

        # Step 2: Apply learning opportunity
        # P(L_n) = P(L_n-1|obs) + (1 - P(L_n-1|obs)) * p_learn
        posterior_with_learning = (
            posterior_knows + (1 - posterior_knows) * params.p_learn
        )

        # Step 3: Apply contextual adjustments
        posterior_adjusted = self._apply_contextual_adjustments(
            posterior=posterior_with_learning,
            response=response,
            params=params,
        )

        # Ensure bounds [0, 1]
        posterior_final = float(np.clip(posterior_adjusted, 0.0, 1.0))

        # Update state
        self.skill_states[student_id][skill] = posterior_final

        return prior, posterior_final

    def _apply_contextual_adjustments(
        self,
        posterior: float,
        response: Response,
        params: BKTParameters,
    ) -> float:
        """
        Apply contextual adjustments based on research.

        Factors considered:
        - Response time (faster = more confident)
        - Attempt number (multiple attempts = less confident)
        - Hint usage (hints = lower mastery)
        - Student confidence (if available)

        Args:
            posterior: Base posterior probability
            response: Student's response
            params: BKT parameters

        Returns:
            Adjusted posterior probability
        """
        adjusted = posterior

        # Response time adjustment
        if response.correct and response.time_spent < 10:
            # Quick correct = high confidence in knowledge
            adjusted = min(1.0, adjusted * 1.1)
        elif not response.correct and response.time_spent > 60:
            # Slow incorrect = struggling
            adjusted = max(0.0, adjusted * 0.9)

        # Attempt number adjustment
        if response.attempt_number > 1:
            # Multiple attempts indicate uncertainty
            penalty = 0.05 * (response.attempt_number - 1)
            adjusted = max(0.0, adjusted - penalty)

        # Hint usage adjustment
        if response.hint_used:
            # Used hints = didn't know independently
            adjusted = max(0.0, adjusted * 0.85)

        # Student confidence adjustment (if available)
        if response.confidence is not None:
            if response.correct and response.confidence > 0.8:
                # High confidence + correct = boost
                adjusted = min(1.0, adjusted * 1.05)
            elif not response.correct and response.confidence > 0.8:
                # High confidence but wrong = slip, don't penalize as much
                adjusted = min(1.0, adjusted * 1.02)

        return adjusted

    def predict_performance(self, student_id: str, skill: str) -> float:
        """
        Predict probability of correct response on next item.

        P(correct) = P(L) * (1 - p_slip) + (1 - P(L)) * p_guess

        Args:
            student_id: Student identifier
            skill: Skill identifier

        Returns:
            Probability of correct response (0-1)
        """
        params = self.get_parameters(student_id, skill)
        p_knows = self.get_mastery_probability(student_id, skill)

        p_correct = p_knows * (1 - params.p_slip) + (1 - p_knows) * params.p_guess

        return p_correct

    def estimate_learning_rate(
        self,
        student_id: str,
        skill: str,
        min_observations: int = 5,
    ) -> Optional[float]:
        """
        Estimate personalized learning rate from history.

        Uses maximum likelihood estimation over observed transitions
        from not-knowing to knowing states.

        Args:
            student_id: Student identifier
            skill: Skill identifier
            min_observations: Minimum responses required

        Returns:
            Estimated learning rate or None if insufficient data
        """
        key = f"{student_id}_{skill}"
        history = self.response_history[key]

        if len(history) < min_observations:
            return None

        # Count transitions (wrong -> right patterns)
        transitions = 0
        opportunities = 0

        for i in range(1, len(history)):
            prev_correct = history[i - 1].correct
            curr_correct = history[i].correct

            # If previous was wrong, this is a learning opportunity
            if not prev_correct:
                opportunities += 1
                if curr_correct:
                    transitions += 1

        if opportunities == 0:
            return None

        # Maximum likelihood estimate with Bayesian smoothing
        alpha = 2  # Prior strength
        beta = 18  # Prior strength (favoring lower learning rates)
        smoothed_p_learn = (transitions + alpha) / (opportunities + alpha + beta)

        return smoothed_p_learn

    def personalize_parameters(
        self,
        student_id: str,
        skill: str,
        min_observations: int = 10,
    ) -> bool:
        """
        Estimate personalized BKT parameters from history.

        Uses expectation-maximization (EM) algorithm to fit
        parameters to the observed response pattern.

        Args:
            student_id: Student identifier
            skill: Skill identifier
            min_observations: Minimum responses required

        Returns:
            True if parameters were updated, False if insufficient data
        """
        key = f"{student_id}_{skill}"
        history = self.response_history[key]

        if len(history) < min_observations:
            return False

        # Get current parameters as starting point
        current_params = self.get_parameters(student_id, skill)

        # Run simplified EM for parameter estimation
        new_params = self._em_parameter_estimation(
            history=history,
            initial_params=current_params,
            max_iterations=20,
        )

        if new_params.validate():
            self.parameters[key] = new_params
            return True

        return False

    def _em_parameter_estimation(
        self,
        history: List[Response],
        initial_params: BKTParameters,
        max_iterations: int = 20,
        tolerance: float = 0.001,
    ) -> BKTParameters:
        """
        EM algorithm for BKT parameter estimation.

        Alternates between:
        - E-step: Estimate latent knowledge states given parameters
        - M-step: Update parameters given knowledge estimates

        Args:
            history: Response history
            initial_params: Starting parameters
            max_iterations: Maximum EM iterations
            tolerance: Convergence threshold

        Returns:
            Estimated BKT parameters
        """
        params = initial_params
        prev_likelihood = float("-inf")

        for _ in range(max_iterations):
            # E-step: Estimate latent knowledge states
            knowledge_estimates = []
            current_p = params.p_init

            for response in history:
                # Forward pass
                if response.correct:
                    p_correct = (1 - params.p_slip) * current_p + params.p_guess * (
                        1 - current_p
                    )
                    if p_correct > 0:
                        posterior = (1 - params.p_slip) * current_p / p_correct
                    else:
                        posterior = current_p
                else:
                    p_incorrect = params.p_slip * current_p + (1 - params.p_guess) * (
                        1 - current_p
                    )
                    if p_incorrect > 0:
                        posterior = params.p_slip * current_p / p_incorrect
                    else:
                        posterior = current_p * 0.9

                knowledge_estimates.append(posterior)
                current_p = posterior + (1 - posterior) * params.p_learn

            # M-step: Update parameters
            new_p_init = knowledge_estimates[0]

            # Estimate p_learn from transitions
            learn_count = 0
            learn_opportunities = 0
            for i in range(1, len(knowledge_estimates)):
                if knowledge_estimates[i - 1] < 0.5:
                    learn_opportunities += 1
                    if knowledge_estimates[i] > knowledge_estimates[i - 1]:
                        learn_count += 1

            new_p_learn = (
                learn_count / learn_opportunities
                if learn_opportunities > 0
                else params.p_learn
            )

            # Estimate p_guess and p_slip
            guess_count = 0
            slip_count = 0
            guess_opportunities = 0
            slip_opportunities = 0

            for i, response in enumerate(history):
                p_know = knowledge_estimates[i]
                if p_know < 0.5:
                    guess_opportunities += 1
                    if response.correct:
                        guess_count += 1
                else:
                    slip_opportunities += 1
                    if not response.correct:
                        slip_count += 1

            new_p_guess = (
                guess_count / guess_opportunities
                if guess_opportunities > 0
                else params.p_guess
            )
            new_p_slip = (
                slip_count / slip_opportunities
                if slip_opportunities > 0
                else params.p_slip
            )

            # Create new parameters with constraints
            new_params = BKTParameters(
                p_init=float(np.clip(new_p_init, 0.0, 1.0)),
                p_learn=float(np.clip(new_p_learn, 0.0, 1.0)),
                p_guess=float(np.clip(new_p_guess, 0.0, 0.5)),
                p_slip=float(np.clip(new_p_slip, 0.0, 0.5)),
            )

            # Calculate log-likelihood
            likelihood = self._calculate_log_likelihood(history, new_params)

            # Check convergence
            if abs(likelihood - prev_likelihood) < tolerance:
                break

            params = new_params
            prev_likelihood = likelihood

        return params

    # ── Multi-sequence Baum-Welch EM ────────────────────────────────

    def fit_parameters_em(
        self,
        response_sequences: List[List[Response]],
        max_iterations: int = 100,
        convergence_threshold: float = 1e-4,
        initial_params: Optional[BKTParameters] = None,
    ) -> BKTParameters:
        """
        Fit BKT parameters using multi-sequence Baum-Welch EM.

        Implements a full forward-backward (Baum-Welch) algorithm over
        multiple independent response sequences.  This is the standard
        approach for learning HMM parameters from data and produces
        better estimates than the simplified single-sequence EM in
        ``_em_parameter_estimation``.

        States:
            0 = Not-Known (~K),  1 = Known (K)

        Transition matrix (BKT assumption: knowledge is absorbing):
            P(K→K)   = 1
            P(~K→K)  = p_learn
            P(~K→~K) = 1 - p_learn

        Emission matrix:
            P(Correct | K)  = 1 - p_slip
            P(Correct | ~K) = p_guess

        Args:
            response_sequences: List of independent response sequences.
                Each inner list is one student's ordered responses for
                a single skill.
            max_iterations: Maximum EM iterations (default 100).
            convergence_threshold: Stop when log-likelihood improvement
                is smaller than this value.
            initial_params: Starting parameters (uses default_params
                when *None*).

        Returns:
            Fitted ``BKTParameters`` with the highest-likelihood
            parameter set found during optimisation.

        Raises:
            ValueError: If *response_sequences* is empty or contains
                only empty sub-sequences.
        """
        # Validate input
        sequences = [s for s in response_sequences if len(s) > 0]
        if not sequences:
            raise ValueError("At least one non-empty response sequence is required")

        params = initial_params or BKTParameters(
            p_init=self.default_params.p_init,
            p_learn=self.default_params.p_learn,
            p_guess=self.default_params.p_guess,
            p_slip=self.default_params.p_slip,
        )

        prev_ll = float("-inf")

        for _iteration in range(max_iterations):
            # Accumulators for sufficient statistics
            gamma_init_know = 0.0  # Σ γ_1(K)
            gamma_init_total = 0.0  # number of sequences

            trans_from_not_know = 0.0  # Σ expected transitions from ~K
            trans_not_know_to_know = 0.0  # Σ expected ~K→K transitions

            emit_know_correct = 0.0  # Σ γ(K) when correct
            emit_know_total = 0.0  # Σ γ(K)
            emit_not_know_correct = 0.0  # Σ γ(~K) when correct
            emit_not_know_total = 0.0  # Σ γ(~K)

            total_ll = 0.0

            for seq in sequences:
                observations = [r.correct for r in seq]
                T = len(observations)

                alpha = self._forward(observations, params)  # (T, 2)
                beta = self._backward(observations, params)  # (T, 2)

                # Per-timestep log-likelihood (for convergence check)
                seq_ll = float(np.sum(np.log(np.maximum(
                    alpha.sum(axis=1), 1e-300
                ))))
                # More precise: use alpha at last step
                seq_ll = float(np.log(max(alpha[-1].sum(), 1e-300)))

                # Compute γ(t, s) = P(state_t = s | O, λ)
                gamma = alpha * beta  # (T, 2)
                gamma_sums = gamma.sum(axis=1, keepdims=True)
                gamma_sums = np.maximum(gamma_sums, 1e-300)
                gamma = gamma / gamma_sums  # normalise

                # Initial state
                gamma_init_know += gamma[0, 1]
                gamma_init_total += 1.0

                # Emission statistics
                for t in range(T):
                    emit_know_total += gamma[t, 1]
                    emit_not_know_total += gamma[t, 0]
                    if observations[t]:
                        emit_know_correct += gamma[t, 1]
                        emit_not_know_correct += gamma[t, 0]

                # Transition statistics:  ξ(t, i, j)
                # Build transition matrix
                A = np.array([
                    [1.0 - params.p_learn, params.p_learn],  # from ~K
                    [0.0, 1.0],                              # from K (absorbing)
                ])

                for t in range(T - 1):
                    obs_next = observations[t + 1]
                    # Emission prob for next observation
                    b_next = np.array([
                        params.p_guess if obs_next else (1.0 - params.p_guess),
                        (1.0 - params.p_slip) if obs_next else params.p_slip,
                    ])
                    # ξ(t, i, j) = α(t,i) * A(i,j) * b(j, o_{t+1}) * β(t+1,j)
                    xi_numerator = np.outer(alpha[t], b_next * beta[t + 1]) * A
                    xi_denom = max(xi_numerator.sum(), 1e-300)
                    xi = xi_numerator / xi_denom

                    # Accumulate ~K → K transitions
                    trans_from_not_know += xi[0, 0] + xi[0, 1]
                    trans_not_know_to_know += xi[0, 1]

                total_ll += seq_ll

            # ── M-step: re-estimate parameters ──
            new_p_init = gamma_init_know / max(gamma_init_total, 1e-300)
            new_p_learn = trans_not_know_to_know / max(trans_from_not_know, 1e-300)

            # Emission re-estimation
            new_p_guess = emit_not_know_correct / max(emit_not_know_total, 1e-300)
            new_p_slip = 1.0 - (emit_know_correct / max(emit_know_total, 1e-300))

            # Clamp to valid ranges
            params = BKTParameters(
                p_init=float(np.clip(new_p_init, 0.01, 0.99)),
                p_learn=float(np.clip(new_p_learn, 0.001, 0.99)),
                p_guess=float(np.clip(new_p_guess, 0.0, 0.5)),
                p_slip=float(np.clip(new_p_slip, 0.0, 0.5)),
            )

            # Convergence check
            if abs(total_ll - prev_ll) < convergence_threshold:
                break
            prev_ll = total_ll

        return params

    def _forward(
        self,
        observations: List[bool],
        params: BKTParameters,
    ) -> np.ndarray:
        """
        Forward pass of the forward-backward algorithm.

        Computes α(t, s) = P(o_1, …, o_t, state_t = s | λ) for the
        two-state BKT HMM.

        States: 0 = ~K (not-known), 1 = K (known).

        Args:
            observations: List of boolean correct/incorrect observations.
            params: Current BKT parameters.

        Returns:
            numpy array of shape ``(T, 2)`` with forward probabilities.
        """
        T = len(observations)
        alpha = np.zeros((T, 2))

        # Transition matrix
        A = np.array([
            [1.0 - params.p_learn, params.p_learn],  # from ~K
            [0.0, 1.0],                               # from K
        ])

        # Initial state + first emission
        pi = np.array([1.0 - params.p_init, params.p_init])
        b0 = self._emission_prob(observations[0], params)
        alpha[0] = pi * b0

        for t in range(1, T):
            b_t = self._emission_prob(observations[t], params)
            alpha[t] = (alpha[t - 1] @ A) * b_t

        return alpha

    def _backward(
        self,
        observations: List[bool],
        params: BKTParameters,
    ) -> np.ndarray:
        """
        Backward pass of the forward-backward algorithm.

        Computes β(t, s) = P(o_{t+1}, …, o_T | state_t = s, λ) for
        the two-state BKT HMM.

        Args:
            observations: List of boolean correct/incorrect observations.
            params: Current BKT parameters.

        Returns:
            numpy array of shape ``(T, 2)`` with backward probabilities.
        """
        T = len(observations)
        beta = np.zeros((T, 2))

        # Transition matrix
        A = np.array([
            [1.0 - params.p_learn, params.p_learn],  # from ~K
            [0.0, 1.0],                               # from K
        ])

        # Initialise: β(T) = 1
        beta[T - 1] = 1.0

        for t in range(T - 2, -1, -1):
            b_next = self._emission_prob(observations[t + 1], params)
            beta[t] = A @ (b_next * beta[t + 1])

        return beta

    @staticmethod
    def _emission_prob(correct: bool, params: BKTParameters) -> np.ndarray:
        """
        Emission probability vector for a single observation.

        Returns:
            Array ``[P(obs | ~K), P(obs | K)]``.
        """
        if correct:
            return np.array([params.p_guess, 1.0 - params.p_slip])
        else:
            return np.array([1.0 - params.p_guess, params.p_slip])

    def _calculate_log_likelihood(
        self, history: List[Response], params: BKTParameters
    ) -> float:
        """Calculate log-likelihood of observed data given parameters."""
        log_likelihood = 0.0
        current_p = params.p_init

        for response in history:
            if response.correct:
                p_obs = (1 - params.p_slip) * current_p + params.p_guess * (
                    1 - current_p
                )
            else:
                p_obs = params.p_slip * current_p + (1 - params.p_guess) * (
                    1 - current_p
                )

            # Avoid log(0)
            p_obs = max(p_obs, 1e-10)
            log_likelihood += np.log(p_obs)

            # Update for next observation
            if response.correct:
                current_p = (1 - params.p_slip) * current_p / p_obs
            else:
                p_incorrect = params.p_slip * current_p + (1 - params.p_guess) * (
                    1 - current_p
                )
                current_p = params.p_slip * current_p / max(p_incorrect, 1e-10)

            current_p = current_p + (1 - current_p) * params.p_learn

        return log_likelihood

    def get_skill_summary(self, student_id: str, skill: str) -> Dict:
        """
        Get comprehensive skill state summary.

        Args:
            student_id: Student identifier
            skill: Skill identifier

        Returns:
            Dictionary with mastery, parameters, and practice stats
        """
        params = self.get_parameters(student_id, skill)
        mastery = self.get_mastery_probability(student_id, skill)
        predicted_performance = self.predict_performance(student_id, skill)

        key = f"{student_id}_{skill}"
        history = self.response_history[key]

        # Calculate statistics from history
        if history:
            total_attempts = len(history)
            correct_attempts = sum(1 for r in history if r.correct)
            accuracy = correct_attempts / total_attempts
            avg_time = float(np.mean([r.time_spent for r in history]))
        else:
            total_attempts = 0
            accuracy = 0.0
            avg_time = 0.0

        return {
            "skill": skill,
            "mastery_probability": round(mastery, 3),
            "predicted_performance": round(predicted_performance, 3),
            "parameters": {
                "p_init": round(params.p_init, 3),
                "p_learn": round(params.p_learn, 3),
                "p_guess": round(params.p_guess, 3),
                "p_slip": round(params.p_slip, 3),
            },
            "practice_stats": {
                "total_attempts": total_attempts,
                "accuracy": round(accuracy, 3),
                "average_time": round(avg_time, 1),
            },
        }

    def reset_skill(self, student_id: str, skill: str) -> None:
        """Reset a skill to initial state."""
        key = f"{student_id}_{skill}"
        if skill in self.skill_states[student_id]:
            del self.skill_states[student_id][skill]
        if key in self.response_history:
            del self.response_history[key]
        if key in self.parameters:
            del self.parameters[key]
