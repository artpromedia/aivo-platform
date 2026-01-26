"""
Brain Memory System for Persistent Learner Context

This module implements an episodic and semantic memory system that allows
the AI to maintain long-term context about each learner, enabling personalized
learning experiences that build on previous interactions.

Components:
- EpisodicMemory: Stores specific learning events with importance scoring
- SemanticMemory: Stores generalized knowledge extracted from episodes
- MemoryConsolidation: Moves important episodic memories to semantic
- BeliefSystem: Bayesian updating of learner beliefs/knowledge state
- MemoryRetrieval: Vector similarity search for relevant memories
"""

from .episodic import (
    EpisodicMemory,
    EpisodicMemoryStore,
    EventType,
)
from .semantic import (
    SemanticKnowledge,
    SemanticMemoryStore,
    KnowledgeType,
)
from .consolidation import (
    MemoryConsolidator,
    ConsolidationResult,
    ConsolidationConfig,
)
from .retrieval import (
    MemoryRetriever,
    RetrievalResult,
    RetrievalConfig,
)
from .beliefs import (
    LearnerBelief,
    BayesianBeliefSystem,
    BeliefUpdate,
)

__all__ = [
    # Episodic Memory
    "EpisodicMemory",
    "EpisodicMemoryStore",
    "EventType",
    # Semantic Memory
    "SemanticKnowledge",
    "SemanticMemoryStore",
    "KnowledgeType",
    # Consolidation
    "MemoryConsolidator",
    "ConsolidationResult",
    "ConsolidationConfig",
    # Retrieval
    "MemoryRetriever",
    "RetrievalResult",
    "RetrievalConfig",
    # Beliefs
    "LearnerBelief",
    "BayesianBeliefSystem",
    "BeliefUpdate",
]
