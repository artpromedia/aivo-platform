"""
Pytest configuration and fixtures for Knowledge Graph Service tests.
"""

import sys
from pathlib import Path

# Add the service root to Python path for app imports
service_root = Path(__file__).parent.parent
sys.path.insert(0, str(service_root))

import pytest
from typing import Dict, List
import numpy as np


@pytest.fixture
def sample_text():
    """Sample educational text for concept extraction."""
    return """
    Photosynthesis is the process by which plants convert sunlight into energy.
    Chlorophyll, the green pigment in leaves, absorbs light energy.
    This energy is used to convert carbon dioxide and water into glucose and oxygen.
    The glucose provides energy for plant growth and development.
    """


@pytest.fixture
def sample_concepts():
    """Sample extracted concepts for testing."""
    return [
        {"id": "c1", "name": "photosynthesis", "type": "process"},
        {"id": "c2", "name": "chlorophyll", "type": "substance"},
        {"id": "c3", "name": "glucose", "type": "substance"},
        {"id": "c4", "name": "oxygen", "type": "substance"},
    ]


@pytest.fixture
def sample_relations():
    """Sample relations between concepts."""
    return [
        {"source": "c1", "target": "c2", "relation": "involves"},
        {"source": "c1", "target": "c3", "relation": "produces"},
        {"source": "c1", "target": "c4", "relation": "produces"},
    ]


@pytest.fixture
def sample_graph():
    """Sample knowledge graph structure."""
    return {
        "nodes": [
            {"id": "c1", "name": "photosynthesis", "embedding": [0.1] * 64},
            {"id": "c2", "name": "chlorophyll", "embedding": [0.2] * 64},
            {"id": "c3", "name": "glucose", "embedding": [0.3] * 64},
        ],
        "edges": [
            {"source": "c1", "target": "c2", "relation": "involves"},
            {"source": "c1", "target": "c3", "relation": "produces"},
        ],
    }


@pytest.fixture
def learner_knowledge_state():
    """Sample learner knowledge state for testing."""
    return {
        "learner_id": "test-learner-123",
        "mastered_concepts": ["c1", "c2"],
        "learning_concepts": ["c3"],
        "unknown_concepts": ["c4", "c5"],
    }


# Pytest configuration
def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "unit: marks tests as unit tests"
    )
