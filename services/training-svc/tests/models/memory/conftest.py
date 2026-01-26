"""
Pytest fixtures for memory system tests.
"""

import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import numpy as np
import pytest


class MockRedisClient:
    """Mock Redis client for testing."""

    def __init__(self):
        self._data: Dict[str, str] = {}
        self._expiry: Dict[str, datetime] = {}

    async def set(
        self, key: str, value: str, ex: Optional[int] = None
    ) -> bool:
        self._data[key] = value
        if ex:
            self._expiry[key] = datetime.utcnow() + timedelta(seconds=ex)
        return True

    async def get(self, key: str) -> Optional[str]:
        if key in self._expiry:
            if datetime.utcnow() > self._expiry[key]:
                del self._data[key]
                del self._expiry[key]
                return None
        return self._data.get(key)

    async def delete(self, key: str) -> int:
        if key in self._data:
            del self._data[key]
            if key in self._expiry:
                del self._expiry[key]
            return 1
        return 0

    async def keys(self, pattern: str) -> List[str]:
        import fnmatch
        return [k for k in self._data.keys() if fnmatch.fnmatch(k, pattern)]

    async def expire(self, key: str, seconds: int) -> bool:
        if key in self._data:
            self._expiry[key] = datetime.utcnow() + timedelta(seconds=seconds)
            return True
        return False

    async def scan_iter(self, match: str) -> List[str]:
        return await self.keys(match)

    def clear(self):
        """Clear all data."""
        self._data.clear()
        self._expiry.clear()


class MockEmbeddingService:
    """Mock embedding service for testing."""

    def __init__(self, embedding_dim: int = 384):
        self.embedding_dim = embedding_dim
        self._cache: Dict[str, np.ndarray] = {}

    def encode(self, texts: List[str]) -> np.ndarray:
        """Generate deterministic mock embeddings for texts."""
        embeddings = []
        for text in texts:
            if text in self._cache:
                embeddings.append(self._cache[text])
            else:
                # Generate deterministic embedding based on text hash
                np.random.seed(hash(text) % (2**32))
                embedding = np.random.randn(self.embedding_dim)
                # Normalize
                embedding = embedding / (np.linalg.norm(embedding) + 1e-9)
                self._cache[text] = embedding
                embeddings.append(embedding)
        return np.array(embeddings)


class MockDatabaseSession:
    """Mock database session for testing."""

    def __init__(self):
        self._data: Dict[str, Any] = {}

    async def execute(self, query: Any) -> Any:
        return None

    async def commit(self) -> None:
        pass

    async def rollback(self) -> None:
        pass


class MockLLMClient:
    """Mock LLM client for testing."""

    async def complete(self, prompt: str, max_tokens: int = 500) -> str:
        """Return mock LLM response."""
        return json.dumps([
            {
                "concept": "mock_pattern_1",
                "type": "strength",
                "confidence": 0.8,
                "description": "Mock strength pattern"
            },
            {
                "concept": "mock_pattern_2",
                "type": "weakness",
                "confidence": 0.6,
                "description": "Mock weakness pattern"
            }
        ])


@pytest.fixture
def mock_redis():
    """Create a mock Redis client."""
    return MockRedisClient()


@pytest.fixture
def mock_embedding_service():
    """Create a mock embedding service."""
    return MockEmbeddingService()


@pytest.fixture
def mock_db_session():
    """Create a mock database session factory."""
    return lambda: MockDatabaseSession()


@pytest.fixture
def mock_llm_client():
    """Create a mock LLM client."""
    return MockLLMClient()


@pytest.fixture
def learner_id():
    """Standard learner ID for tests."""
    return "test-learner-001"


@pytest.fixture
def tenant_id():
    """Standard tenant ID for tests."""
    return "test-tenant-001"
