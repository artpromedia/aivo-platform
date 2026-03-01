"""
Contract tests – validate that generated Pydantic models conform to the
OpenAPI spec and that round-trip (dict → model → dict) preserves shape.
"""
import importlib.util
import sys
from pathlib import Path

import pytest
import yaml

# Ensure the generated models are importable
# __tests__ -> src -> api-contracts  (3 levels up)
ROOT = Path(__file__).resolve().parent.parent.parent
_mod_path = ROOT / "generated" / "ai_inference.py"
_spec = importlib.util.spec_from_file_location("ai_inference", str(_mod_path))
_mod = importlib.util.module_from_spec(_spec)  # type: ignore[arg-type]
sys.modules["ai_inference"] = _mod
_spec.loader.exec_module(_mod)  # type: ignore[union-attr]

from ai_inference import (  # noqa: E402
    GenerateRequest,
    GenerateResponse,
    HintRequest,
    HintResponse,
    ModelId,
    ProviderId,
    ErrorResponse,
    HealthResponse,
    Status,
)


@pytest.fixture(scope="module")
def spec():
    spec_path = ROOT / "schemas" / "ai-inference.openapi.yaml"
    with open(spec_path, "r") as f:
        return yaml.safe_load(f)


# ── GenerateRequest ──────────────────────────────────────────────────


class TestGenerateRequest:
    def test_minimal_valid(self):
        req = GenerateRequest(prompt="Explain photosynthesis for a 5th grader")
        assert req.prompt == "Explain photosynthesis for a 5th grader"
        assert req.max_tokens == 1000
        assert req.temperature == 0.7

    def test_fully_populated(self):
        req = GenerateRequest(
            prompt="Solve 2x + 3 = 7",
            system_prompt="You are a math tutor.",
            model=ModelId.gpt_5_2_pro,
            max_tokens=2048,
            temperature=0.5,
            preferred_provider=ProviderId.openai,
        )
        d = req.model_dump()
        assert d["model"] == "gpt-5.2-pro"
        assert d["preferred_provider"] == "openai"

    def test_rejects_missing_prompt(self):
        with pytest.raises(Exception):
            GenerateRequest()  # type: ignore[call-arg]

    def test_rejects_prompt_too_long(self):
        with pytest.raises(Exception):
            GenerateRequest(prompt="x" * 33000)

    def test_rejects_temperature_too_high(self):
        with pytest.raises(Exception):
            GenerateRequest(prompt="hi", temperature=3.0)

    def test_defaults_match_spec(self, spec):
        schema = spec["components"]["schemas"]["GenerateRequest"]["properties"]
        req = GenerateRequest(prompt="test")
        assert req.max_tokens == schema["max_tokens"]["default"]
        assert req.temperature == schema["temperature"]["default"]


# ── GenerateResponse ─────────────────────────────────────────────────


class TestGenerateResponse:
    def test_valid(self):
        res = GenerateResponse(
            content="Photosynthesis is…",
            model="gpt-5.2-pro",
            provider="openai",
            tokens_used=127,
            latency_ms=340,
        )
        assert res.content == "Photosynthesis is…"

    def test_rejects_missing_required(self):
        with pytest.raises(Exception):
            GenerateResponse(content="hello")  # type: ignore[call-arg]

    def test_rejects_negative_tokens(self):
        with pytest.raises(Exception):
            GenerateResponse(
                content="x",
                model="m",
                provider="p",
                tokens_used=-1,
                latency_ms=10,
            )

    def test_roundtrip_dict(self):
        data = {
            "content": "answer",
            "model": "gemini-3.1-flash",
            "provider": "gemini",
            "tokens_used": 50,
            "latency_ms": 180,
        }
        res = GenerateResponse(**data)
        out = res.model_dump()
        for key in data:
            assert out[key] == data[key]


# ── HintRequest ──────────────────────────────────────────────────────


class TestHintRequest:
    def test_valid(self):
        req = HintRequest(question="What is 7 × 8?", subject="MATH", difficulty=2)
        assert req.difficulty == 2

    def test_rejects_missing_subject(self):
        with pytest.raises(Exception):
            HintRequest(question="What is gravity?")  # type: ignore[call-arg]

    def test_rejects_difficulty_out_of_range(self):
        with pytest.raises(Exception):
            HintRequest(question="Q", subject="SCIENCE", difficulty=6)

    def test_default_difficulty(self, spec):
        schema = spec["components"]["schemas"]["HintRequest"]["properties"]
        req = HintRequest(question="Q", subject="MATH")
        assert req.difficulty == schema["difficulty"]["default"]


# ── HintResponse ─────────────────────────────────────────────────────


class TestHintResponse:
    def test_valid(self):
        res = HintResponse(
            hint="Try breaking the problem into…",
            model="gemini-3.1-flash",
            provider="gemini",
            tokens_used=42,
            latency_ms=200,
        )
        assert res.hint.startswith("Try")

    def test_rejects_missing_hint(self):
        with pytest.raises(Exception):
            HintResponse(model="m", provider="p")  # type: ignore[call-arg]


# ── Enum Contracts ───────────────────────────────────────────────────


class TestModelIdEnum:
    def test_all_models_present(self, spec):
        spec_models = spec["components"]["schemas"]["ModelId"]["enum"]
        py_models = [m.value for m in ModelId]
        assert sorted(py_models) == sorted(spec_models)

    def test_count(self):
        assert len(ModelId) == 7


class TestProviderIdEnum:
    def test_all_providers_present(self, spec):
        spec_providers = spec["components"]["schemas"]["ProviderId"]["enum"]
        py_providers = [p.value for p in ProviderId]
        assert sorted(py_providers) == sorted(spec_providers)

    def test_count(self):
        assert len(ProviderId) == 3


# ── ErrorResponse & HealthResponse ───────────────────────────────────


class TestErrorResponse:
    def test_valid(self):
        err = ErrorResponse(error="RATE_LIMIT", message="Too many requests")
        assert err.error == "RATE_LIMIT"

    def test_with_details(self):
        err = ErrorResponse(
            error="VALIDATION",
            message="Bad input",
            details={"field": "prompt", "reason": "too_short"},
        )
        assert err.details["field"] == "prompt"


class TestHealthResponse:
    def test_valid(self):
        h = HealthResponse(status=Status.healthy, service="ai-inference-svc")
        assert h.status == "healthy"

    def test_with_providers(self):
        h = HealthResponse(
            status=Status.degraded,
            service="ai-inference-svc",
            version="2.0.0",
            providers={"openai": "healthy", "anthropic": "degraded"},
        )
        assert h.providers["anthropic"] == "degraded"
