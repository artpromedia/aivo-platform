"""
Graph Embeddings

Compute embeddings for knowledge graph nodes using
Node2Vec, TransE, and graph neural network methods.
"""
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any, Tuple, Set
import random

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class GraphEmbeddingsConfig:
    """Configuration for graph embeddings."""
    # General settings
    embedding_dim: int = 128
    method: str = "node2vec"  # node2vec, transe, random_walk, text

    # Node2Vec settings
    walk_length: int = 30
    num_walks: int = 10
    p: float = 1.0  # Return parameter
    q: float = 1.0  # In-out parameter
    window_size: int = 5

    # TransE settings
    margin: float = 1.0
    learning_rate: float = 0.01
    negative_samples: int = 5
    epochs: int = 100

    # Text embedding settings
    text_embedding_model: str = "all-MiniLM-L6-v2"

    # Cache settings
    use_cache: bool = True


@dataclass
class EmbeddingResult:
    """Result of embedding computation."""
    concept_id: str
    embedding: np.ndarray
    method: str
    metadata: Dict[str, Any] = field(default_factory=dict)


class GraphEmbeddings:
    """
    Compute graph embeddings for concepts in a knowledge graph.

    Methods:
    - Node2Vec: Random walk-based embeddings
    - TransE: Translation-based knowledge graph embeddings
    - Text-based: Using sentence transformers on concept names

    Usage:
        embeddings = GraphEmbeddings()
        vectors = embeddings.compute(["algebra", "calculus", "physics"])
    """

    def __init__(
        self,
        config: Optional[GraphEmbeddingsConfig] = None,
        embedding_dim: int = 128,
        method: str = "node2vec",
    ):
        self.config = config or GraphEmbeddingsConfig(
            embedding_dim=embedding_dim,
            method=method,
        )
        self.embedding_dim = self.config.embedding_dim
        self.method = self.config.method

        # Internal storage
        self._embeddings: Dict[str, np.ndarray] = {}
        self._graph: Dict[str, Set[str]] = {}  # Adjacency list
        self._edge_types: Dict[Tuple[str, str], str] = {}  # Edge type mapping
        self._text_model = None
        self._initialized = False

        logger.info(f"GraphEmbeddings initialized with {method}")

    def _ensure_initialized(self):
        """Lazy initialization of models."""
        if self._initialized:
            return

        if self.method == "text":
            try:
                from sentence_transformers import SentenceTransformer
                self._text_model = SentenceTransformer(self.config.text_embedding_model)
            except ImportError:
                logger.warning("sentence-transformers not available, falling back to random embeddings")
            except Exception as e:
                logger.warning(f"Failed to load text model: {e}")

        self._initialized = True

    def add_node(self, concept_id: str, metadata: Optional[Dict] = None):
        """Add a node to the graph."""
        if concept_id not in self._graph:
            self._graph[concept_id] = set()
        # Clear cached embedding if exists
        if concept_id in self._embeddings:
            del self._embeddings[concept_id]

    def add_edge(
        self,
        source: str,
        target: str,
        edge_type: str = "related",
        bidirectional: bool = True,
    ):
        """Add an edge to the graph."""
        # Ensure nodes exist
        self.add_node(source)
        self.add_node(target)

        # Add edges
        self._graph[source].add(target)
        self._edge_types[(source, target)] = edge_type

        if bidirectional:
            self._graph[target].add(source)
            self._edge_types[(target, source)] = edge_type

        # Clear cached embeddings
        if source in self._embeddings:
            del self._embeddings[source]
        if target in self._embeddings:
            del self._embeddings[target]

    def load_graph(
        self,
        nodes: List[str],
        edges: List[Tuple[str, str, str]],  # (source, target, edge_type)
    ):
        """Load a complete graph structure."""
        self._graph.clear()
        self._edge_types.clear()
        self._embeddings.clear()

        for node in nodes:
            self.add_node(node)

        for source, target, edge_type in edges:
            self.add_edge(source, target, edge_type, bidirectional=True)

    def compute(
        self,
        concept_ids: List[str],
        force_recompute: bool = False,
    ) -> Dict[str, np.ndarray]:
        """
        Compute embeddings for specified concepts.

        Args:
            concept_ids: List of concept IDs to compute embeddings for
            force_recompute: If True, recompute even if cached

        Returns:
            Dictionary mapping concept IDs to embedding vectors
        """
        self._ensure_initialized()

        # Check which concepts need computation
        to_compute = []
        results = {}

        for cid in concept_ids:
            if not force_recompute and cid in self._embeddings:
                results[cid] = self._embeddings[cid]
            else:
                to_compute.append(cid)

        if not to_compute:
            return results

        # Compute embeddings based on method
        if self.method == "node2vec":
            new_embeddings = self._compute_node2vec(to_compute)
        elif self.method == "transe":
            new_embeddings = self._compute_transe(to_compute)
        elif self.method == "text":
            new_embeddings = self._compute_text_embeddings(to_compute)
        else:  # random_walk or fallback
            new_embeddings = self._compute_random_walk(to_compute)

        # Cache and merge results
        for cid, emb in new_embeddings.items():
            if self.config.use_cache:
                self._embeddings[cid] = emb
            results[cid] = emb

        return results

    def _compute_node2vec(self, concept_ids: List[str]) -> Dict[str, np.ndarray]:
        """Compute Node2Vec embeddings using random walks."""
        embeddings = {}

        # Generate random walks for each concept
        all_walks = []
        for concept in concept_ids:
            if concept in self._graph:
                walks = self._generate_walks(concept)
                all_walks.extend(walks)

        if not all_walks:
            # No graph structure, fall back to random embeddings
            return self._generate_random_embeddings(concept_ids)

        # Build vocabulary
        vocab = set()
        for walk in all_walks:
            vocab.update(walk)

        # Simple Skip-gram-like approach
        # Build co-occurrence matrix
        cooccurrence = {}
        for walk in all_walks:
            for i, word in enumerate(walk):
                window = walk[max(0, i - self.config.window_size):i + self.config.window_size + 1]
                for context in window:
                    if context != word:
                        key = (word, context)
                        cooccurrence[key] = cooccurrence.get(key, 0) + 1

        # Initialize embeddings randomly
        vocab_list = list(vocab)
        vocab_embeddings = {
            v: np.random.randn(self.embedding_dim).astype(np.float32) * 0.1
            for v in vocab_list
        }

        # Simple gradient descent
        learning_rate = 0.025
        for _ in range(50):  # iterations
            for (word, context), count in cooccurrence.items():
                if word in vocab_embeddings and context in vocab_embeddings:
                    # Simplified skip-gram update
                    word_vec = vocab_embeddings[word]
                    ctx_vec = vocab_embeddings[context]

                    # Positive sample update
                    score = np.dot(word_vec, ctx_vec)
                    grad = (1 - self._sigmoid(score)) * count

                    vocab_embeddings[word] += learning_rate * grad * ctx_vec
                    vocab_embeddings[context] += learning_rate * grad * word_vec

        # Normalize embeddings
        for v in vocab_list:
            norm = np.linalg.norm(vocab_embeddings[v])
            if norm > 0:
                vocab_embeddings[v] /= norm

        # Extract embeddings for requested concepts
        for cid in concept_ids:
            if cid in vocab_embeddings:
                embeddings[cid] = vocab_embeddings[cid]
            else:
                embeddings[cid] = np.random.randn(self.embedding_dim).astype(np.float32)
                embeddings[cid] /= np.linalg.norm(embeddings[cid])

        return embeddings

    def _generate_walks(self, start_node: str) -> List[List[str]]:
        """Generate random walks starting from a node."""
        walks = []

        for _ in range(self.config.num_walks):
            walk = [start_node]
            current = start_node

            for _ in range(self.config.walk_length - 1):
                neighbors = list(self._graph.get(current, set()))
                if not neighbors:
                    break

                # Biased random walk (simplified Node2Vec)
                if len(walk) == 1:
                    next_node = random.choice(neighbors)
                else:
                    prev_node = walk[-2]
                    weights = []
                    for neighbor in neighbors:
                        if neighbor == prev_node:
                            # Return to previous
                            weights.append(1.0 / self.config.p)
                        elif neighbor in self._graph.get(prev_node, set()):
                            # Common neighbor
                            weights.append(1.0)
                        else:
                            # Move away
                            weights.append(1.0 / self.config.q)

                    # Normalize weights
                    total = sum(weights)
                    weights = [w / total for w in weights]

                    # Weighted random choice
                    r = random.random()
                    cumsum = 0
                    next_node = neighbors[0]
                    for neighbor, weight in zip(neighbors, weights):
                        cumsum += weight
                        if r < cumsum:
                            next_node = neighbor
                            break

                walk.append(next_node)
                current = next_node

            walks.append(walk)

        return walks

    def _compute_transe(self, concept_ids: List[str]) -> Dict[str, np.ndarray]:
        """Compute TransE embeddings."""
        embeddings = {}

        # Get all entities and relations
        entities = set(self._graph.keys())
        for neighbors in self._graph.values():
            entities.update(neighbors)

        if not entities:
            return self._generate_random_embeddings(concept_ids)

        entities = list(entities)
        relations = list(set(self._edge_types.values()))

        # Initialize embeddings
        entity_emb = {
            e: np.random.randn(self.embedding_dim).astype(np.float32) * 0.1
            for e in entities
        }
        relation_emb = {
            r: np.random.randn(self.embedding_dim).astype(np.float32) * 0.1
            for r in relations
        }

        # Normalize entity embeddings
        for e in entities:
            entity_emb[e] /= np.linalg.norm(entity_emb[e])

        # Training
        triples = [
            (h, t, self._edge_types.get((h, t), "related"))
            for h, neighbors in self._graph.items()
            for t in neighbors
        ]

        if not triples:
            return self._generate_random_embeddings(concept_ids)

        for _ in range(self.config.epochs):
            for h, t, r in triples:
                # Positive triple
                h_emb = entity_emb[h]
                t_emb = entity_emb[t]
                r_emb = relation_emb[r]

                # TransE score: ||h + r - t||
                pos_score = np.linalg.norm(h_emb + r_emb - t_emb)

                # Negative sample
                if random.random() < 0.5:
                    # Corrupt head
                    neg_h = random.choice(entities)
                    neg_score = np.linalg.norm(entity_emb[neg_h] + r_emb - t_emb)
                else:
                    # Corrupt tail
                    neg_t = random.choice(entities)
                    neg_score = np.linalg.norm(h_emb + r_emb - entity_emb[neg_t])

                # Margin-based loss
                loss = max(0, self.config.margin + pos_score - neg_score)

                if loss > 0:
                    # Update embeddings
                    grad = h_emb + r_emb - t_emb
                    grad_norm = np.linalg.norm(grad)
                    if grad_norm > 0:
                        grad /= grad_norm

                    entity_emb[h] -= self.config.learning_rate * grad
                    entity_emb[t] += self.config.learning_rate * grad
                    relation_emb[r] -= self.config.learning_rate * grad

                    # Re-normalize
                    entity_emb[h] /= np.linalg.norm(entity_emb[h])
                    entity_emb[t] /= np.linalg.norm(entity_emb[t])

        # Extract embeddings for requested concepts
        for cid in concept_ids:
            if cid in entity_emb:
                embeddings[cid] = entity_emb[cid]
            else:
                embeddings[cid] = np.random.randn(self.embedding_dim).astype(np.float32)
                embeddings[cid] /= np.linalg.norm(embeddings[cid])

        return embeddings

    def _compute_text_embeddings(self, concept_ids: List[str]) -> Dict[str, np.ndarray]:
        """Compute embeddings using text representations."""
        embeddings = {}

        if self._text_model:
            try:
                vectors = self._text_model.encode(concept_ids)
                for cid, vec in zip(concept_ids, vectors):
                    # Resize if needed
                    if len(vec) != self.embedding_dim:
                        if len(vec) > self.embedding_dim:
                            vec = vec[:self.embedding_dim]
                        else:
                            vec = np.pad(vec, (0, self.embedding_dim - len(vec)))
                    embeddings[cid] = vec.astype(np.float32)
                return embeddings
            except Exception as e:
                logger.warning(f"Text embedding failed: {e}")

        return self._generate_random_embeddings(concept_ids)

    def _compute_random_walk(self, concept_ids: List[str]) -> Dict[str, np.ndarray]:
        """Compute embeddings using simple random walks."""
        embeddings = {}

        for concept in concept_ids:
            if concept in self._graph:
                # Aggregate neighbor information
                neighbors = list(self._graph[concept])
                if neighbors:
                    # Simple aggregation: average of neighbor feature hashes
                    features = []
                    for n in neighbors:
                        # Simple hash-based features
                        h = hash(n) % 1000
                        features.append(h)

                    # Create embedding from features
                    np.random.seed(hash(concept) % 2**32)
                    base_emb = np.random.randn(self.embedding_dim).astype(np.float32)

                    # Perturb based on neighbors
                    for f in features:
                        np.random.seed(f)
                        base_emb += np.random.randn(self.embedding_dim) * 0.1

                    # Normalize
                    base_emb /= np.linalg.norm(base_emb)
                    embeddings[concept] = base_emb
                else:
                    embeddings[concept] = self._hash_embedding(concept)
            else:
                embeddings[concept] = self._hash_embedding(concept)

        return embeddings

    def _generate_random_embeddings(self, concept_ids: List[str]) -> Dict[str, np.ndarray]:
        """Generate random but deterministic embeddings."""
        return {cid: self._hash_embedding(cid) for cid in concept_ids}

    def _hash_embedding(self, concept: str) -> np.ndarray:
        """Generate deterministic embedding from concept name."""
        np.random.seed(hash(concept) % 2**32)
        emb = np.random.randn(self.embedding_dim).astype(np.float32)
        emb /= np.linalg.norm(emb)
        return emb

    def _sigmoid(self, x: float) -> float:
        """Sigmoid activation function."""
        return 1.0 / (1.0 + np.exp(-np.clip(x, -500, 500)))

    def similarity(
        self,
        concept_a: str,
        concept_b: str,
    ) -> float:
        """
        Compute similarity between two concepts using embeddings.

        Args:
            concept_a: First concept
            concept_b: Second concept

        Returns:
            Cosine similarity score
        """
        embeddings = self.compute([concept_a, concept_b])

        emb_a = embeddings.get(concept_a)
        emb_b = embeddings.get(concept_b)

        if emb_a is None or emb_b is None:
            return 0.0

        # Cosine similarity
        dot = np.dot(emb_a, emb_b)
        norm_a = np.linalg.norm(emb_a)
        norm_b = np.linalg.norm(emb_b)

        if norm_a == 0 or norm_b == 0:
            return 0.0

        return float(dot / (norm_a * norm_b))

    def find_similar(
        self,
        concept_id: str,
        top_k: int = 10,
        candidates: Optional[List[str]] = None,
    ) -> List[Tuple[str, float]]:
        """
        Find concepts most similar to the given concept.

        Args:
            concept_id: Source concept
            top_k: Number of results to return
            candidates: Optional list of candidates to search

        Returns:
            List of (concept_id, similarity) tuples sorted by similarity
        """
        # Determine candidates
        if candidates is None:
            candidates = list(self._graph.keys())

        # Remove source from candidates
        candidates = [c for c in candidates if c != concept_id]

        if not candidates:
            return []

        # Compute embeddings
        all_concepts = [concept_id] + candidates
        embeddings = self.compute(all_concepts)

        source_emb = embeddings.get(concept_id)
        if source_emb is None:
            return []

        # Compute similarities
        similarities = []
        for candidate in candidates:
            cand_emb = embeddings.get(candidate)
            if cand_emb is not None:
                sim = float(np.dot(source_emb, cand_emb) / (
                    np.linalg.norm(source_emb) * np.linalg.norm(cand_emb) + 1e-8
                ))
                similarities.append((candidate, sim))

        # Sort by similarity
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:top_k]

    def train(
        self,
        graph_data: Dict[str, Any],
    ):
        """
        Train embeddings on graph data.

        Args:
            graph_data: Dictionary with 'nodes' and 'edges' keys
        """
        nodes = graph_data.get("nodes", [])
        edges = graph_data.get("edges", [])

        # Load graph
        self.load_graph(nodes, edges)

        # Clear cached embeddings
        self._embeddings.clear()

        # Compute embeddings for all nodes
        self.compute(nodes, force_recompute=True)

        logger.info(f"Trained embeddings for {len(nodes)} nodes")

    def get_embedding(self, concept_id: str) -> Optional[np.ndarray]:
        """Get cached embedding for a concept."""
        return self._embeddings.get(concept_id)

    def save(self, path: str):
        """Save embeddings to file."""
        data = {
            "embeddings": {k: v.tolist() for k, v in self._embeddings.items()},
            "config": {
                "embedding_dim": self.config.embedding_dim,
                "method": self.config.method,
            }
        }
        import json
        with open(path, "w") as f:
            json.dump(data, f)

    def load(self, path: str):
        """Load embeddings from file."""
        import json
        with open(path, "r") as f:
            data = json.load(f)

        self._embeddings = {
            k: np.array(v, dtype=np.float32)
            for k, v in data["embeddings"].items()
        }

    def cluster_concepts(
        self,
        concept_ids: List[str],
        n_clusters: int = 5,
    ) -> Dict[int, List[str]]:
        """
        Cluster concepts based on their embeddings.

        Args:
            concept_ids: Concepts to cluster
            n_clusters: Number of clusters

        Returns:
            Dictionary mapping cluster ID to list of concepts
        """
        embeddings = self.compute(concept_ids)

        # Create embedding matrix
        emb_list = [embeddings.get(cid, np.zeros(self.embedding_dim)) for cid in concept_ids]
        X = np.array(emb_list)

        # Simple K-means clustering
        try:
            from sklearn.cluster import KMeans
            kmeans = KMeans(n_clusters=min(n_clusters, len(concept_ids)), random_state=42)
            labels = kmeans.fit_predict(X)
        except ImportError:
            # Fallback: random clustering
            labels = [i % n_clusters for i in range(len(concept_ids))]

        # Group by cluster
        clusters: Dict[int, List[str]] = {}
        for cid, label in zip(concept_ids, labels):
            if label not in clusters:
                clusters[label] = []
            clusters[label].append(cid)

        return clusters
