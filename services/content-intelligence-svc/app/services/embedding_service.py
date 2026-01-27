"""
Embedding Service

Generate and manage content embeddings using TF-IDF and hashing techniques.
"""
import logging
import re
import hashlib
from typing import List, Dict, Optional, Set
import numpy as np

logger = logging.getLogger(__name__)


class EmbeddingService:
    """
    Generate and manage content embeddings using TF-IDF vectorization.

    This implementation uses a hash-based approach for vocabulary-free
    embedding generation, making it suitable for production environments
    without requiring pre-trained models.

    Usage:
        service = EmbeddingService()
        embeddings = service.embed(["text1", "text2"])
    """

    # Common English stop words
    STOP_WORDS: Set[str] = {
        'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
        'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
        'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
        'dare', 'ought', 'used', 'it', 'its', 'this', 'that', 'these', 'those',
        'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which', 'who', 'whom',
        'where', 'when', 'why', 'how', 'all', 'each', 'every', 'both', 'few',
        'more', 'most', 'other', 'some', 'such', 'no', 'not', 'only', 'own',
        'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here',
        'there', 'then', 'once', 'if', 'because', 'about', 'into', 'through',
        'during', 'before', 'after', 'above', 'below', 'between', 'under',
        'again', 'further', 'while', 'being', 'having', 'doing', 'their',
        'your', 'his', 'her', 'our', 'my', 'me', 'him', 'us', 'them'
    }

    def __init__(self, model_name: str = "tfidf-hash-256", embedding_dim: int = 256):
        """
        Initialize the embedding service.

        Args:
            model_name: Name identifier for the embedding model
            embedding_dim: Dimension of the output embeddings (default: 256)
        """
        self.model_name = model_name
        self.embedding_dim = embedding_dim
        self._idf_cache: Dict[str, float] = {}
        self._document_count = 0
        logger.info(f"EmbeddingService initialized with {model_name}, dim={embedding_dim}")

    def _tokenize(self, text: str) -> List[str]:
        """
        Tokenize text into words, removing stop words and non-alphabetic tokens.

        Args:
            text: Input text to tokenize

        Returns:
            List of cleaned tokens
        """
        # Convert to lowercase and extract words
        words = re.findall(r'\b[a-zA-Z]{2,}\b', text.lower())
        # Remove stop words
        return [w for w in words if w not in self.STOP_WORDS]

    def _hash_token(self, token: str, seed: int = 0) -> int:
        """
        Hash a token to a bucket index using MD5.

        Args:
            token: Token to hash
            seed: Random seed for different hash functions

        Returns:
            Bucket index in range [0, embedding_dim)
        """
        hash_input = f"{token}_{seed}".encode('utf-8')
        hash_value = int(hashlib.md5(hash_input).hexdigest(), 16)
        return hash_value % self.embedding_dim

    def _compute_term_frequencies(self, tokens: List[str]) -> Dict[str, float]:
        """
        Compute normalized term frequencies.

        Args:
            tokens: List of tokens

        Returns:
            Dictionary mapping tokens to their TF values
        """
        if not tokens:
            return {}

        tf: Dict[str, int] = {}
        for token in tokens:
            tf[token] = tf.get(token, 0) + 1

        # Normalize by document length (augmented frequency)
        max_freq = max(tf.values()) if tf else 1
        return {token: 0.5 + 0.5 * (count / max_freq) for token, count in tf.items()}

    def _compute_idf(self, token: str) -> float:
        """
        Compute IDF for a token using cached document frequencies.

        For tokens not in cache, uses a default IDF based on word rarity heuristics.

        Args:
            token: Token to compute IDF for

        Returns:
            IDF value
        """
        if token in self._idf_cache:
            return self._idf_cache[token]

        # Heuristic: longer and less common words have higher IDF
        # Base IDF of 2.0, increased by word length
        base_idf = 2.0
        length_bonus = min(len(token) / 10.0, 0.5)

        # Uncommon letter patterns suggest technical/rare words
        uncommon_patterns = ['ph', 'th', 'ch', 'qu', 'xy', 'zy']
        pattern_bonus = 0.2 * sum(1 for p in uncommon_patterns if p in token)

        return base_idf + length_bonus + pattern_bonus

    def embed(self, texts: List[str]) -> np.ndarray:
        """
        Generate embeddings for a list of texts using hash-based TF-IDF.

        Each text is converted to a fixed-dimension vector using feature hashing.

        Args:
            texts: List of text strings to embed

        Returns:
            numpy array of shape (len(texts), embedding_dim)
        """
        if not texts:
            return np.zeros((0, self.embedding_dim), dtype=np.float32)

        embeddings = np.zeros((len(texts), self.embedding_dim), dtype=np.float32)

        for i, text in enumerate(texts):
            tokens = self._tokenize(text)
            if not tokens:
                continue

            tf = self._compute_term_frequencies(tokens)

            # Hash each token to embedding dimensions with TF-IDF weights
            for token, tf_value in tf.items():
                idf = self._compute_idf(token)
                tfidf_weight = tf_value * idf

                # Use multiple hash functions for better distribution
                for seed in range(3):
                    bucket = self._hash_token(token, seed)
                    # Alternate sign based on hash to reduce collisions
                    sign = 1 if self._hash_token(token, seed + 100) % 2 == 0 else -1
                    embeddings[i, bucket] += sign * tfidf_weight / 3

            # L2 normalize
            norm = np.linalg.norm(embeddings[i])
            if norm > 0:
                embeddings[i] /= norm

        return embeddings

    def embed_single(self, text: str) -> np.ndarray:
        """
        Generate embedding for a single text.

        Args:
            text: Text string to embed

        Returns:
            numpy array of shape (embedding_dim,)
        """
        return self.embed([text])[0]

    def similarity(self, text_a: str, text_b: str) -> float:
        """
        Compute cosine similarity between two texts.

        Args:
            text_a: First text
            text_b: Second text

        Returns:
            Cosine similarity score in range [-1, 1]
        """
        embeddings = self.embed([text_a, text_b])
        return float(np.dot(embeddings[0], embeddings[1]))

    def batch_similarity(self, query: str, candidates: List[str]) -> List[float]:
        """
        Compute similarity between a query and multiple candidate texts.

        Args:
            query: Query text
            candidates: List of candidate texts

        Returns:
            List of similarity scores
        """
        if not candidates:
            return []

        query_embedding = self.embed_single(query)
        candidate_embeddings = self.embed(candidates)

        # Compute cosine similarities via dot product (embeddings are normalized)
        similarities = candidate_embeddings @ query_embedding
        return similarities.tolist()

    def compute_similarity_matrix(self, texts: List[str]) -> np.ndarray:
        """
        Compute pairwise similarity matrix for a list of texts.

        Args:
            texts: List of texts

        Returns:
            Symmetric similarity matrix of shape (len(texts), len(texts))
        """
        embeddings = self.embed(texts)
        return embeddings @ embeddings.T

    def update_idf_cache(self, documents: List[str]) -> None:
        """
        Update IDF cache with document frequency statistics from a corpus.

        Args:
            documents: List of document texts to analyze
        """
        if not documents:
            return

        # Count document frequencies
        df: Dict[str, int] = {}
        for doc in documents:
            tokens = set(self._tokenize(doc))
            for token in tokens:
                df[token] = df.get(token, 0) + 1

        # Compute IDF values
        n_docs = len(documents)
        for token, doc_freq in df.items():
            self._idf_cache[token] = np.log((n_docs + 1) / (doc_freq + 1)) + 1

        self._document_count = n_docs
        logger.info(f"Updated IDF cache with {len(df)} terms from {n_docs} documents")
