"""
IRT Data Models - Pydantic models for Item Response Theory.

These models define the data structures for 3-Parameter Logistic (3PL) IRT,
including item parameters, ability estimates, and response data.
"""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator


class ContentDomain(str, Enum):
    """Content domain categories for items."""

    MATHEMATICS = "mathematics"
    READING = "reading"
    SCIENCE = "science"
    WRITING = "writing"
    SOCIAL_STUDIES = "social_studies"
    LANGUAGE = "language"
    CRITICAL_THINKING = "critical_thinking"
    OTHER = "other"


class ItemParameters(BaseModel):
    """
    3-Parameter Logistic (3PL) Item Response Theory parameters.

    The 3PL model is defined as:
    P(X=1|θ) = c + (1-c) / (1 + exp(-a(θ-b)))

    Where:
        - θ (theta): Learner ability level
        - a: Discrimination parameter (how well item differentiates abilities)
        - b: Difficulty parameter (ability level for 50% correct, excluding guessing)
        - c: Pseudo-guessing parameter (lower asymptote)

    Attributes:
        item_id: Unique identifier for the item
        difficulty: b parameter, typically ranges from -3 to 3 on logit scale
        discrimination: a parameter, typically ranges from 0.5 to 2.5
        guessing: c parameter, probability of correct guess (0 to 1)
        content_domain: Subject area of the item
        skill_tags: List of skill identifiers this item assesses
        calibration_n: Number of responses used to calibrate parameters
        calibration_date: When parameters were last calibrated
        metadata: Additional item metadata
    """

    item_id: str = Field(..., description="Unique item identifier")
    difficulty: float = Field(
        ...,
        alias="b",
        ge=-4.0,
        le=4.0,
        description="Difficulty parameter (b), typical range [-3, 3]"
    )
    discrimination: float = Field(
        ...,
        alias="a",
        ge=0.0,
        le=4.0,
        description="Discrimination parameter (a), typical range [0.5, 2.5]"
    )
    guessing: float = Field(
        default=0.25,
        alias="c",
        ge=0.0,
        le=1.0,
        description="Pseudo-guessing parameter (c), typical range [0.0, 0.35]"
    )

    # Metadata
    content_domain: ContentDomain = Field(
        default=ContentDomain.OTHER,
        description="Content area of the item"
    )
    skill_tags: list[str] = Field(
        default_factory=list,
        description="Skills assessed by this item"
    )
    calibration_n: int = Field(
        default=0,
        ge=0,
        description="Number of responses used for parameter calibration"
    )
    calibration_date: datetime | None = Field(
        default=None,
        description="Date of last parameter calibration"
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Additional item metadata"
    )

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "item_id": "MATH_001",
                "b": 0.5,
                "a": 1.2,
                "c": 0.25,
                "content_domain": "mathematics",
                "skill_tags": ["algebra", "linear_equations"],
                "calibration_n": 500,
            }
        }
    }

    @field_validator("discrimination")
    @classmethod
    def validate_discrimination(cls, v: float) -> float:
        """Ensure discrimination is positive and reasonable."""
        if v < 0.1:
            raise ValueError(
                f"Discrimination must be >= 0.1 for meaningful differentiation, got {v}"
            )
        return v

    @model_validator(mode="after")
    def validate_parameters(self) -> "ItemParameters":
        """Validate overall parameter consistency."""
        # Warn if guessing seems too high for the item type
        if self.guessing > 0.5:
            # This is technically valid but unusual
            pass
        return self


class AbilityEstimate(BaseModel):
    """
    Learner ability estimate from IRT model.

    The ability parameter θ (theta) represents a learner's latent trait level
    on a standardized scale, typically ranging from -3 to +3 where:
        - θ = 0 represents average ability
        - θ = -3 represents very low ability (bottom ~0.1%)
        - θ = +3 represents very high ability (top ~0.1%)

    Attributes:
        learner_id: Unique identifier for the learner
        domain: Content domain for this ability estimate
        theta: Point estimate of ability
        standard_error: Standard error of the estimate
        confidence_interval: 95% confidence interval bounds
        n_items: Number of items used in estimation
        response_pattern: History of correct (True) / incorrect (False) responses
        estimation_method: Method used for estimation (EAP, MLE, MAP)
        posterior_variance: Variance of the posterior distribution
        information: Total test information at theta estimate
        timestamp: When estimate was calculated
    """

    learner_id: str = Field(..., description="Unique learner identifier")
    domain: str = Field(..., description="Content domain for this estimate")
    theta: float = Field(
        ...,
        ge=-6.0,
        le=6.0,
        description="Ability estimate on logit scale"
    )
    standard_error: float = Field(
        ...,
        ge=0.0,
        description="Standard error of the ability estimate"
    )
    confidence_interval: tuple[float, float] = Field(
        ...,
        description="95% confidence interval (lower, upper)"
    )
    n_items: int = Field(
        ...,
        ge=0,
        description="Number of items used in estimation"
    )
    response_pattern: list[bool] = Field(
        default_factory=list,
        description="Sequence of correct/incorrect responses"
    )
    estimation_method: str = Field(
        default="EAP",
        description="Estimation method used (EAP, MLE, MAP)"
    )
    posterior_variance: float | None = Field(
        default=None,
        ge=0.0,
        description="Variance of posterior distribution"
    )
    information: float | None = Field(
        default=None,
        ge=0.0,
        description="Total test information at theta"
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="When estimate was calculated"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "learner_id": "student_123",
                "domain": "mathematics",
                "theta": 0.85,
                "standard_error": 0.32,
                "confidence_interval": (0.22, 1.48),
                "n_items": 15,
                "response_pattern": [True, True, False, True, True],
                "estimation_method": "EAP",
            }
        }
    }

    @model_validator(mode="after")
    def validate_confidence_interval(self) -> "AbilityEstimate":
        """Ensure confidence interval is valid."""
        lower, upper = self.confidence_interval
        if lower > upper:
            raise ValueError(
                f"Lower bound ({lower}) must be <= upper bound ({upper})"
            )
        if self.theta < lower or self.theta > upper:
            raise ValueError(
                f"Theta ({self.theta}) must be within CI ({lower}, {upper})"
            )
        return self

    @property
    def reliability(self) -> float:
        """
        Calculate reliability as 1 - SE²/variance.

        Assumes population variance of 1 (standard normal prior).
        """
        return max(0.0, 1.0 - self.standard_error ** 2)

    @property
    def precision(self) -> float:
        """Precision as inverse of variance (1/SE²)."""
        if self.standard_error == 0:
            return float("inf")
        return 1.0 / (self.standard_error ** 2)


class ItemResponse(BaseModel):
    """
    Single item response record.

    Captures a learner's response to a single assessment item along with
    timing information for potential use in response time IRT models.

    Attributes:
        item_id: Identifier of the item responded to
        learner_id: Identifier of the responding learner
        response: True if correct, False if incorrect
        response_time_ms: Time taken to respond in milliseconds
        timestamp: When the response was recorded
        session_id: Optional session identifier for grouping responses
        metadata: Additional response metadata
    """

    item_id: str = Field(..., description="Item identifier")
    learner_id: str = Field(..., description="Learner identifier")
    response: bool = Field(..., description="True = correct, False = incorrect")
    response_time_ms: int = Field(
        ...,
        ge=0,
        description="Response time in milliseconds"
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="Response timestamp"
    )
    session_id: str | None = Field(
        default=None,
        description="Assessment session identifier"
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Additional response metadata"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "item_id": "MATH_001",
                "learner_id": "student_123",
                "response": True,
                "response_time_ms": 15000,
                "session_id": "session_abc",
            }
        }
    }


class AdaptiveTestState(BaseModel):
    """
    State of an adaptive test in progress.

    Tracks the current state of a Computer Adaptive Test (CAT) session,
    including administered items, current ability estimate, and stopping
    rule status.

    Attributes:
        session_id: Unique session identifier
        learner_id: Learner taking the test
        domain: Content domain being assessed
        administered_items: List of item IDs already presented
        responses: List of responses (aligned with administered_items)
        current_estimate: Current ability estimate
        items_remaining: Number of items still to be administered
        stopping_rule_met: Whether a stopping rule has been satisfied
        stopping_reason: Reason for stopping if applicable
        started_at: When the test session began
        content_coverage: Tracking of content area coverage
    """

    session_id: str = Field(..., description="Adaptive test session ID")
    learner_id: str = Field(..., description="Learner ID")
    domain: str = Field(..., description="Content domain being assessed")
    administered_items: list[str] = Field(
        default_factory=list,
        description="Items already administered"
    )
    responses: list[bool] = Field(
        default_factory=list,
        description="Responses to administered items"
    )
    current_estimate: AbilityEstimate | None = Field(
        default=None,
        description="Current ability estimate"
    )
    items_remaining: int = Field(
        default=0,
        ge=0,
        description="Items remaining in test"
    )
    stopping_rule_met: bool = Field(
        default=False,
        description="Whether stopping criteria satisfied"
    )
    stopping_reason: str | None = Field(
        default=None,
        description="Reason for test termination"
    )
    started_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Test start time"
    )
    content_coverage: dict[str, int] = Field(
        default_factory=dict,
        description="Count of items per content area"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "session_id": "cat_session_001",
                "learner_id": "student_123",
                "domain": "mathematics",
                "administered_items": ["MATH_001", "MATH_015"],
                "responses": [True, False],
                "items_remaining": 18,
            }
        }
    }


class ItemBankStatistics(BaseModel):
    """
    Statistics about an item bank for IRT analysis.

    Provides summary statistics about a collection of calibrated items
    for assessment planning and quality assurance.

    Attributes:
        domain: Content domain of the item bank
        total_items: Total number of items in bank
        difficulty_range: (min, max) of difficulty parameters
        difficulty_mean: Mean difficulty
        difficulty_std: Standard deviation of difficulty
        discrimination_range: (min, max) of discrimination parameters
        discrimination_mean: Mean discrimination
        guessing_range: (min, max) of guessing parameters
        skill_coverage: Number of items per skill tag
        calibration_quality: Statistics about calibration sample sizes
    """

    domain: str = Field(..., description="Content domain")
    total_items: int = Field(..., ge=0, description="Total items in bank")
    difficulty_range: tuple[float, float] = Field(
        ...,
        description="Range of difficulty parameters"
    )
    difficulty_mean: float = Field(..., description="Mean difficulty")
    difficulty_std: float = Field(..., ge=0, description="Difficulty std dev")
    discrimination_range: tuple[float, float] = Field(
        ...,
        description="Range of discrimination parameters"
    )
    discrimination_mean: float = Field(..., description="Mean discrimination")
    guessing_range: tuple[float, float] = Field(
        ...,
        description="Range of guessing parameters"
    )
    skill_coverage: dict[str, int] = Field(
        default_factory=dict,
        description="Items per skill tag"
    )
    calibration_quality: dict[str, Any] = Field(
        default_factory=dict,
        description="Calibration sample size statistics"
    )
