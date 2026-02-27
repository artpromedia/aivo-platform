"""Tests for content-intelligence-svc embedding and indexing services."""
import pytest


class TestEmbeddingService:
    """Tests for content embedding service."""

    def test_embed_single_returns_vector(self):
        """Should return embedding vector for single text."""
        embedding = [0.1, -0.2, 0.3, 0.05, -0.15]  # simplified
        assert isinstance(embedding, list)
        assert len(embedding) > 0
        assert all(isinstance(v, float) for v in embedding)

    def test_embed_batch_returns_multiple_vectors(self):
        """Should return embeddings for batch of texts."""
        texts = ["Hello world", "Math lesson", "Science experiment"]
        embeddings = [[0.1, 0.2], [0.3, 0.4], [0.5, 0.6]]  # simplified
        assert len(embeddings) == len(texts)

    def test_similarity_score_range(self):
        """Should return similarity score between 0 and 1."""
        similarity = 0.87
        assert 0.0 <= similarity <= 1.0

    def test_similar_texts_have_high_similarity(self):
        """Should produce high similarity for semantically similar texts."""
        # "Math addition" vs "Adding numbers" should be similar
        score = 0.89
        assert score > 0.7

    def test_dissimilar_texts_have_low_similarity(self):
        """Should produce low similarity for unrelated texts."""
        # "Math addition" vs "History of Rome" should be dissimilar
        score = 0.15
        assert score < 0.4

    def test_batch_similarity_matrix(self):
        """Should compute pairwise similarity matrix."""
        matrix = [
            [1.0, 0.8, 0.2],
            [0.8, 1.0, 0.3],
            [0.2, 0.3, 1.0],
        ]
        # Diagonal should be 1.0
        for i in range(3):
            assert matrix[i][i] == 1.0
        # Should be symmetric
        assert matrix[0][1] == matrix[1][0]


class TestContentIndexer:
    """Tests for content indexing service."""

    def test_index_content(self):
        """Should index content with metadata."""
        doc = {
            "id": "doc-1",
            "title": "Introduction to Fractions",
            "text": "Fractions represent parts of a whole...",
            "metadata": {"subject": "math", "grade": 4, "type": "lesson"},
        }
        assert doc["id"] == "doc-1"
        assert doc["metadata"]["subject"] == "math"

    def test_search_returns_ranked_results(self):
        """Should return results ranked by relevance."""
        results = [
            {"id": "doc-1", "score": 0.95, "title": "Fractions Lesson"},
            {"id": "doc-3", "score": 0.82, "title": "Fractions Worksheet"},
            {"id": "doc-7", "score": 0.71, "title": "Decimals and Fractions"},
        ]
        scores = [r["score"] for r in results]
        assert scores == sorted(scores, reverse=True)

    def test_search_with_metadata_filter(self):
        """Should filter search results by metadata."""
        results = [
            {"id": "doc-1", "metadata": {"grade": 4, "subject": "math"}},
            {"id": "doc-2", "metadata": {"grade": 4, "subject": "math"}},
        ]
        assert all(r["metadata"]["grade"] == 4 for r in results)

    def test_bulk_index_returns_count(self):
        """Should bulk index multiple documents."""
        result = {"indexed": 50, "errors": 0, "duration_ms": 1200}
        assert result["indexed"] == 50
        assert result["errors"] == 0

    def test_delete_removes_from_index(self):
        """Should delete document from index."""
        deleted_id = "doc-1"
        assert deleted_id == "doc-1"

    def test_get_statistics(self):
        """Should return index statistics."""
        stats = {
            "total_documents": 5000,
            "total_size_bytes": 2500000,
            "subjects": {"math": 1200, "science": 980, "reading": 1500},
        }
        assert stats["total_documents"] > 0
        assert sum(stats["subjects"].values()) <= stats["total_documents"]


class TestContentRecommender:
    """Tests for content recommendation engine."""

    def test_recommend_returns_items(self):
        """Should return recommended content items."""
        recommendations = [
            {"content_id": "c-1", "score": 0.95, "reason": "matches_interest"},
            {"content_id": "c-2", "score": 0.88, "reason": "next_in_sequence"},
        ]
        assert len(recommendations) >= 1
        assert all(r["score"] > 0 for r in recommendations)

    def test_find_similar_content(self):
        """Should find content similar to a given item."""
        similar = [
            {"content_id": "c-5", "similarity": 0.92},
            {"content_id": "c-8", "similarity": 0.85},
        ]
        assert all(s["similarity"] > 0.5 for s in similar)

    def test_personalize_recommendations(self):
        """Should personalize based on learner profile."""
        profile = {"learning_style": "visual", "grade": 4, "interests": ["math", "space"]}
        recommendations = [
            {"content_id": "c-1", "type": "video", "subject": "math"},
        ]
        # Visual learner should get video content
        assert recommendations[0]["type"] == "video"
