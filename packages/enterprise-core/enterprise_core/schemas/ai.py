"""
AI Inference Pydantic Schemas.

API validation schemas for AI text-generation and hint endpoints.
These schemas MUST stay in sync with the canonical OpenAPI spec at
packages/api-contracts/schemas/ai-inference.openapi.yaml.
"""

from enum import StrEnum
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


# ── Enums (match OpenAPI spec) ───────────────────────────────────


class ModelId(StrEnum):
    """Supported AI model identifiers (2026 generation)."""

    # OpenAI
    GPT_5_2_PRO = "gpt-5.2-pro"
    GPT_5_2_INSTANT = "gpt-5.2-instant"
    GPT_5_3_CODEX = "gpt-5.3-codex"
    # Anthropic
    CLAUDE_OPUS_4_6 = "claude-opus-4-6-20260201"
    CLAUDE_SONNET_4_6 = "claude-sonnet-4-6-20260201"
    # Google Gemini
    GEMINI_3_1_PRO = "gemini-3.1-pro"
    GEMINI_3_1_FLASH = "gemini-3.1-flash"


class ProviderId(StrEnum):
    """Supported AI provider identifiers."""

    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GEMINI = "gemini"


# ── Generate Endpoint ────────────────────────────────────────────


class GenerateRequestSchema(BaseModel):
    """
    AI text-generation request.

    Maps to OpenAPI GenerateRequest — all constraints match the spec.
    """

    prompt: str = Field(
        ..., min_length=1, max_length=32000, description="User prompt"
    )
    system_prompt: Optional[str] = Field(
        None, max_length=16000, description="System prompt for context"
    )
    model: Optional[ModelId] = Field(None, description="Model selection")
    max_tokens: int = Field(
        1000, ge=1, le=8192, description="Max tokens to generate"
    )
    temperature: float = Field(
        0.7, ge=0.0, le=2.0, description="Sampling temperature"
    )
    preferred_provider: Optional[ProviderId] = Field(
        None, description="Provider preference"
    )


class GenerateResponseSchema(BaseModel):
    """
    AI text-generation response.

    All five fields are required per the OpenAPI spec.
    """

    content: str = Field(..., description="Generated text")
    model: str = Field(..., description="Model that produced the response")
    provider: str = Field(..., description="Provider that fulfilled the request")
    tokens_used: int = Field(
        ..., ge=0, description="Total tokens consumed (input + output)"
    )
    latency_ms: int = Field(
        ..., ge=0, description="End-to-end latency in milliseconds"
    )


# ── Hint Endpoint ────────────────────────────────────────────────


class HintRequestSchema(BaseModel):
    """
    Pedagogical hint request.

    Maps to OpenAPI HintRequest — subject and question are required.
    """

    question: str = Field(
        ..., min_length=1, description="The question to generate a hint for"
    )
    subject: str = Field(..., description="Subject area (e.g. MATH, ELA)")
    difficulty: int = Field(
        3, ge=1, le=5, description="Difficulty level (1 easiest – 5 hardest)"
    )
    learner_context: Optional[Dict[str, Any]] = Field(
        None, description="Optional learner context (grade, history, prefs)"
    )


class HintResponseSchema(BaseModel):
    """
    Pedagogical hint response.

    hint, model, and provider are required; token/latency optional.
    """

    hint: str = Field(..., description="Generated pedagogical hint")
    model: str = Field(..., description="Model used")
    provider: str = Field(..., description="Provider used")
    tokens_used: Optional[int] = Field(None, ge=0)
    latency_ms: Optional[int] = Field(None, ge=0)


# ── Token Usage (supplementary) ──────────────────────────────────


class TokenUsageSchema(BaseModel):
    """Breakdown of token consumption for analytics / billing."""

    input_tokens: int = Field(..., ge=0, description="Prompt tokens")
    output_tokens: int = Field(..., ge=0, description="Completion tokens")
    total_tokens: int = Field(..., ge=0, description="Sum of input + output")
