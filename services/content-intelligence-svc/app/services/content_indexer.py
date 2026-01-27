"""
Content Indexer

Index content for search and recommendation using in-memory vector store.
"""
import logging
import re
import json
import os
from datetime import datetime
from typing import Dict, Any, List, Optional, Set
import numpy as np

logger = logging.getLogger(__name__)


class ContentIndexer:
    """
    Index content for efficient retrieval using vector similarity search.

    Operations:
    - Add content to index
    - Update content metadata
    - Search by vector similarity
    - Filter by attributes
    """

    def __init__(self, index_path: Optional[str] = None, embedding_dim: int = 256):
        """
        Initialize the ContentIndexer.

        Args:
            index_path: Optional path to persist the index
            embedding_dim: Dimension of content embeddings
        """
        self.index_path = index_path
        self.embedding_dim = embedding_dim

        # In-memory index storage
        self._content_store: Dict[str, Dict[str, Any]] = {}
        self._embeddings: Dict[str, np.ndarray] = {}
        self._metadata_index: Dict[str, Dict[str, Set[str]]] = {}  # field -> value -> content_ids

        # Load existing index if path provided
        if index_path and os.path.exists(index_path):
            self._load_index()

        logger.info(f"ContentIndexer initialized with dim={embedding_dim}")

    def _tokenize(self, text: str) -> List[str]:
        """Extract words from text for indexing."""
        return re.findall(r'\b[a-zA-Z]{2,}\b', text.lower())

    def _compute_embedding(self, text: str) -> np.ndarray:
        """
        Compute a simple TF-based embedding for text.

        This is a lightweight alternative when EmbeddingService is not available.
        """
        import hashlib

        tokens = self._tokenize(text)
        if not tokens:
            return np.zeros(self.embedding_dim, dtype=np.float32)

        embedding = np.zeros(self.embedding_dim, dtype=np.float32)

        # Simple hash-based embedding
        for token in tokens:
            # Hash token to bucket
            hash_val = int(hashlib.md5(token.encode()).hexdigest(), 16)
            bucket = hash_val % self.embedding_dim
            sign = 1 if (hash_val // self.embedding_dim) % 2 == 0 else -1
            embedding[bucket] += sign

        # L2 normalize
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding /= norm

        return embedding

    def _index_metadata(self, content_id: str, metadata: Dict[str, Any]) -> None:
        """
        Index metadata fields for filtering.

        Args:
            content_id: Content identifier
            metadata: Metadata dictionary
        """
        for field, value in metadata.items():
            if field not in self._metadata_index:
                self._metadata_index[field] = {}

            # Handle different value types
            if isinstance(value, (list, tuple)):
                for v in value:
                    v_str = str(v).lower()
                    if v_str not in self._metadata_index[field]:
                        self._metadata_index[field][v_str] = set()
                    self._metadata_index[field][v_str].add(content_id)
            else:
                v_str = str(value).lower()
                if v_str not in self._metadata_index[field]:
                    self._metadata_index[field][v_str] = set()
                self._metadata_index[field][v_str].add(content_id)

    def _unindex_metadata(self, content_id: str, metadata: Dict[str, Any]) -> None:
        """
        Remove content from metadata index.

        Args:
            content_id: Content identifier
            metadata: Metadata dictionary
        """
        for field, value in metadata.items():
            if field not in self._metadata_index:
                continue

            if isinstance(value, (list, tuple)):
                for v in value:
                    v_str = str(v).lower()
                    if v_str in self._metadata_index[field]:
                        self._metadata_index[field][v_str].discard(content_id)
            else:
                v_str = str(value).lower()
                if v_str in self._metadata_index[field]:
                    self._metadata_index[field][v_str].discard(content_id)

    def index(
        self,
        content_id: str,
        text: str,
        metadata: Dict[str, Any],
        embedding: Optional[np.ndarray] = None
    ) -> None:
        """
        Add content to the index.

        Args:
            content_id: Unique identifier for the content
            text: Content text to index
            metadata: Associated metadata
            embedding: Optional pre-computed embedding
        """
        # Remove existing if updating
        if content_id in self._content_store:
            old_metadata = self._content_store[content_id].get("metadata", {})
            self._unindex_metadata(content_id, old_metadata)

        # Compute embedding if not provided
        if embedding is None:
            embedding = self._compute_embedding(text)

        # Store content
        self._content_store[content_id] = {
            "text": text,
            "metadata": metadata,
            "indexed_at": datetime.utcnow().isoformat()
        }

        # Store embedding
        self._embeddings[content_id] = embedding

        # Index metadata
        self._index_metadata(content_id, metadata)

        logger.debug(f"Indexed content: {content_id}")

    def update_metadata(
        self,
        content_id: str,
        metadata: Dict[str, Any],
    ) -> bool:
        """
        Update content metadata.

        Args:
            content_id: Content identifier
            metadata: New metadata (merged with existing)

        Returns:
            True if update successful
        """
        if content_id not in self._content_store:
            logger.warning(f"Content not found for update: {content_id}")
            return False

        # Get existing metadata
        old_metadata = self._content_store[content_id].get("metadata", {})

        # Unindex old values for changed fields
        for field in metadata:
            if field in old_metadata:
                self._unindex_metadata(content_id, {field: old_metadata[field]})

        # Merge metadata
        new_metadata = {**old_metadata, **metadata}
        self._content_store[content_id]["metadata"] = new_metadata
        self._content_store[content_id]["updated_at"] = datetime.utcnow().isoformat()

        # Index new values
        self._index_metadata(content_id, metadata)

        return True

    def delete(self, content_id: str) -> bool:
        """
        Remove content from the index.

        Args:
            content_id: Content identifier

        Returns:
            True if deletion successful
        """
        if content_id not in self._content_store:
            return False

        # Unindex metadata
        metadata = self._content_store[content_id].get("metadata", {})
        self._unindex_metadata(content_id, metadata)

        # Remove from stores
        del self._content_store[content_id]
        if content_id in self._embeddings:
            del self._embeddings[content_id]

        return True

    def get(self, content_id: str) -> Optional[Dict[str, Any]]:
        """
        Get content by ID.

        Args:
            content_id: Content identifier

        Returns:
            Content data or None if not found
        """
        if content_id not in self._content_store:
            return None

        return {
            "content_id": content_id,
            **self._content_store[content_id]
        }

    def search(
        self,
        query: str,
        filters: Dict[str, Any] = None,
        top_k: int = 10,
        min_score: float = 0.0
    ) -> List[Dict]:
        """
        Search indexed content by query similarity.

        Args:
            query: Search query text
            filters: Optional metadata filters
            top_k: Maximum number of results
            min_score: Minimum similarity score threshold

        Returns:
            List of search results with scores
        """
        if not self._content_store:
            return []

        # Compute query embedding
        query_embedding = self._compute_embedding(query)

        # Get candidate content IDs (apply filters first)
        if filters:
            candidates = self._apply_filters(filters)
        else:
            candidates = set(self._content_store.keys())

        if not candidates:
            return []

        # Compute similarities
        results = []
        for content_id in candidates:
            if content_id not in self._embeddings:
                continue

            content_embedding = self._embeddings[content_id]
            similarity = float(np.dot(query_embedding, content_embedding))

            if similarity >= min_score:
                results.append({
                    "content_id": content_id,
                    "score": round(similarity, 4),
                    "text": self._content_store[content_id].get("text", "")[:500],
                    "metadata": self._content_store[content_id].get("metadata", {})
                })

        # Sort by score
        results.sort(key=lambda x: x["score"], reverse=True)

        return results[:top_k]

    def search_similar(
        self,
        content_id: str,
        top_k: int = 10,
        exclude_self: bool = True
    ) -> List[Dict]:
        """
        Find content similar to a given item.

        Args:
            content_id: Content ID to find similar items for
            top_k: Maximum number of results
            exclude_self: Whether to exclude the query item from results

        Returns:
            List of similar content with scores
        """
        if content_id not in self._embeddings:
            return []

        query_embedding = self._embeddings[content_id]

        results = []
        for other_id, other_embedding in self._embeddings.items():
            if exclude_self and other_id == content_id:
                continue

            similarity = float(np.dot(query_embedding, other_embedding))

            results.append({
                "content_id": other_id,
                "score": round(similarity, 4),
                "text": self._content_store[other_id].get("text", "")[:500],
                "metadata": self._content_store[other_id].get("metadata", {})
            })

        # Sort by score
        results.sort(key=lambda x: x["score"], reverse=True)

        return results[:top_k]

    def _apply_filters(self, filters: Dict[str, Any]) -> Set[str]:
        """
        Apply metadata filters to get matching content IDs.

        Args:
            filters: Dictionary of field -> value filters

        Returns:
            Set of matching content IDs
        """
        if not filters:
            return set(self._content_store.keys())

        matching_ids = None

        for field, value in filters.items():
            field_matches = set()

            if field not in self._metadata_index:
                # No content has this field - return empty
                return set()

            if isinstance(value, (list, tuple)):
                # OR condition for multiple values
                for v in value:
                    v_str = str(v).lower()
                    if v_str in self._metadata_index[field]:
                        field_matches.update(self._metadata_index[field][v_str])
            else:
                v_str = str(value).lower()
                if v_str in self._metadata_index[field]:
                    field_matches = self._metadata_index[field][v_str].copy()

            # AND condition across fields
            if matching_ids is None:
                matching_ids = field_matches
            else:
                matching_ids &= field_matches

            if not matching_ids:
                return set()

        return matching_ids or set()

    def filter_by_metadata(
        self,
        filters: Dict[str, Any],
        limit: int = 100
    ) -> List[Dict]:
        """
        Get content matching metadata filters.

        Args:
            filters: Metadata filters to apply
            limit: Maximum number of results

        Returns:
            List of matching content
        """
        matching_ids = self._apply_filters(filters)

        results = []
        for content_id in list(matching_ids)[:limit]:
            results.append({
                "content_id": content_id,
                **self._content_store[content_id]
            })

        return results

    def get_all_values(self, field: str) -> List[str]:
        """
        Get all unique values for a metadata field.

        Args:
            field: Metadata field name

        Returns:
            List of unique values
        """
        if field not in self._metadata_index:
            return []
        return list(self._metadata_index[field].keys())

    def count(self, filters: Dict[str, Any] = None) -> int:
        """
        Count content matching filters.

        Args:
            filters: Optional metadata filters

        Returns:
            Count of matching content
        """
        if filters:
            return len(self._apply_filters(filters))
        return len(self._content_store)

    def _save_index(self) -> None:
        """Save index to disk."""
        if not self.index_path:
            return

        # Prepare data for serialization
        data = {
            "content_store": self._content_store,
            "embeddings": {k: v.tolist() for k, v in self._embeddings.items()},
            "saved_at": datetime.utcnow().isoformat()
        }

        # Create directory if needed
        os.makedirs(os.path.dirname(self.index_path), exist_ok=True)

        with open(self.index_path, 'w') as f:
            json.dump(data, f)

        logger.info(f"Saved index to {self.index_path}")

    def _load_index(self) -> None:
        """Load index from disk."""
        if not self.index_path or not os.path.exists(self.index_path):
            return

        try:
            with open(self.index_path, 'r') as f:
                data = json.load(f)

            self._content_store = data.get("content_store", {})
            self._embeddings = {
                k: np.array(v, dtype=np.float32)
                for k, v in data.get("embeddings", {}).items()
            }

            # Rebuild metadata index
            for content_id, content in self._content_store.items():
                metadata = content.get("metadata", {})
                self._index_metadata(content_id, metadata)

            logger.info(f"Loaded {len(self._content_store)} items from index")

        except Exception as e:
            logger.error(f"Failed to load index: {e}")

    def save(self) -> None:
        """Explicitly save the index to disk."""
        self._save_index()

    def clear(self) -> None:
        """Clear all indexed content."""
        self._content_store.clear()
        self._embeddings.clear()
        self._metadata_index.clear()
        logger.info("Index cleared")

    def get_statistics(self) -> Dict[str, Any]:
        """
        Get index statistics.

        Returns:
            Dictionary with index statistics
        """
        return {
            "total_documents": len(self._content_store),
            "indexed_fields": list(self._metadata_index.keys()),
            "field_cardinalities": {
                field: len(values)
                for field, values in self._metadata_index.items()
            },
            "embedding_dim": self.embedding_dim,
            "index_path": self.index_path
        }

    def bulk_index(
        self,
        items: List[Dict[str, Any]],
        text_field: str = "text",
        id_field: str = "id"
    ) -> int:
        """
        Bulk index multiple content items.

        Args:
            items: List of content items
            text_field: Field name containing text
            id_field: Field name containing ID

        Returns:
            Number of items indexed
        """
        count = 0
        for item in items:
            content_id = item.get(id_field)
            text = item.get(text_field, "")

            if not content_id or not text:
                continue

            # Extract metadata (all fields except text and id)
            metadata = {k: v for k, v in item.items()
                       if k not in [text_field, id_field]}

            self.index(content_id, text, metadata)
            count += 1

        logger.info(f"Bulk indexed {count} items")
        return count

    def reindex_all(self) -> None:
        """
        Recompute embeddings for all content.

        Useful after changing embedding parameters.
        """
        for content_id, content in self._content_store.items():
            text = content.get("text", "")
            self._embeddings[content_id] = self._compute_embedding(text)

        logger.info(f"Reindexed {len(self._content_store)} items")
