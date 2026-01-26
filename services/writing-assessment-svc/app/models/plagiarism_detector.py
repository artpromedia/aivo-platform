"""
Plagiarism Detector

Detects potential plagiarism and assesses originality using:
1. N-gram fingerprinting for exact matches
2. Semantic similarity using embeddings
3. Style anomaly detection for internal consistency

For MVP, focuses on internal consistency and self-plagiarism detection.
Full web search requires external API integration.
"""

import hashlib
import logging
import re
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple

import numpy as np

logger = logging.getLogger(__name__)


class MatchType(Enum):
    """Type of plagiarism match."""

    EXACT = "exact"
    NEAR_EXACT = "near_exact"
    PARAPHRASE = "paraphrase"
    SEMANTIC = "semantic"
    SELF_PLAGIARISM = "self_plagiarism"


@dataclass
class MatchedSource:
    """Single matched source in plagiarism check."""

    source_id: str
    source_title: Optional[str]
    matched_text: str
    original_text: str
    similarity: float
    match_type: MatchType
    start_pos: int
    end_pos: int
    source_url: Optional[str] = None


@dataclass
class SuspiciousPassage:
    """Passage flagged as potentially plagiarized or inconsistent."""

    passage_text: str
    start_pos: int
    end_pos: int
    reason: str
    confidence: float
    style_deviation_score: float = 0.0


@dataclass
class StyleFeatures:
    """Style features for a text segment."""

    avg_sentence_length: float
    avg_word_length: float
    vocabulary_richness: float
    punctuation_density: float
    paragraph_id: int
    text_preview: str


@dataclass
class OriginalityReport:
    """Complete originality/plagiarism check result."""

    originality_score: float  # 0-1, 1 = fully original
    matched_sources: List[MatchedSource] = field(default_factory=list)
    style_consistency_score: float = 1.0
    suspicious_passages: List[SuspiciousPassage] = field(default_factory=list)
    self_similarity_matrix: Optional[List[List[float]]] = None
    total_matched_words: int = 0
    total_words: int = 0
    fingerprint_hash: str = ""
    analysis_details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SimilarityReport:
    """Report comparing two texts."""

    text1_preview: str
    text2_preview: str
    overall_similarity: float
    exact_match_ratio: float
    semantic_similarity: float
    shared_ngrams: List[str] = field(default_factory=list)
    matching_passages: List[Dict[str, Any]] = field(default_factory=list)


class PlagiarismDetector:
    """
    Detect plagiarism using multiple techniques.

    Methods:
    - N-gram fingerprinting for exact/near-exact matches
    - Semantic similarity using sentence embeddings
    - Style consistency analysis for detecting copy-paste
    - Self-plagiarism detection against provided corpus

    Usage:
        detector = PlagiarismDetector()
        result = detector.check_originality(text)
        print(f"Originality: {result.originality_score*100:.1f}%")
    """

    # Common words to exclude from fingerprinting
    STOPWORDS = {
        'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'can', 'to', 'of', 'in', 'for', 'on', 'with',
        'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after',
        'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once',
        'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither',
        'not', 'only', 'own', 'same', 'than', 'too', 'very', 'just', 'also',
        'that', 'this', 'these', 'those', 'what', 'which', 'who', 'whom',
        'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his',
        'she', 'her', 'it', 'its', 'they', 'them', 'their',
    }

    def __init__(
        self,
        corpus_path: Optional[str] = None,
        ngram_size: int = 5,
        similarity_threshold: float = 0.8,
        use_embeddings: bool = True,
        device: str = "cpu",
    ):
        """
        Initialize the PlagiarismDetector.

        Args:
            corpus_path: Path to reference corpus for comparison
            ngram_size: Size of n-grams for fingerprinting (default 5)
            similarity_threshold: Threshold for flagging similarity (0-1)
            use_embeddings: Whether to use semantic embeddings
            device: Device for embedding model (cpu/cuda)
        """
        self.corpus_path = corpus_path
        self.ngram_size = ngram_size
        self.similarity_threshold = similarity_threshold
        self.use_embeddings = use_embeddings
        self.device = device

        # Reference corpus storage
        self._corpus_fingerprints: Dict[str, Set[int]] = {}
        self._corpus_metadata: Dict[str, Dict[str, Any]] = {}

        # Embedding model (lazy loaded)
        self._embedding_model = None
        self._embedding_model_loaded = False

        logger.info("PlagiarismDetector initialized")

    def _lazy_load_embedding_model(self) -> None:
        """Lazy load the sentence embedding model."""
        if self._embedding_model_loaded:
            return

        try:
            from sentence_transformers import SentenceTransformer
            self._embedding_model = SentenceTransformer(
                'all-MiniLM-L6-v2',
                device=self.device
            )
            self._embedding_model_loaded = True
            logger.info("Loaded sentence embedding model")
        except ImportError:
            logger.warning("sentence-transformers not available, using fallback")
            self._embedding_model_loaded = True

    def _normalize_text(self, text: str) -> str:
        """Normalize text for comparison."""
        # Lowercase
        text = text.lower()
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove special characters but keep basic punctuation
        text = re.sub(r'[^\w\s.,!?;:\'-]', '', text)
        return text.strip()

    def _tokenize(self, text: str) -> List[str]:
        """Tokenize text into words."""
        words = re.findall(r'\b\w+\b', text.lower())
        return words

    def _get_ngrams(
        self,
        text: str,
        n: int,
        remove_stopwords: bool = True,
    ) -> List[Tuple[str, ...]]:
        """Extract n-grams from text."""
        words = self._tokenize(text)

        if remove_stopwords:
            words = [w for w in words if w not in self.STOPWORDS]

        if len(words) < n:
            return []

        ngrams = []
        for i in range(len(words) - n + 1):
            ngram = tuple(words[i:i + n])
            ngrams.append(ngram)

        return ngrams

    def _hash_ngram(self, ngram: Tuple[str, ...]) -> int:
        """Hash an n-gram to integer."""
        ngram_str = ' '.join(ngram)
        return int(hashlib.md5(ngram_str.encode()).hexdigest()[:8], 16)

    def compute_fingerprint(self, text: str) -> Set[int]:
        """
        Compute document fingerprint using n-gram hashing.

        Uses Winnowing algorithm variant for robust fingerprinting.

        Args:
            text: Text to fingerprint

        Returns:
            Set of hash values representing the document
        """
        ngrams = self._get_ngrams(text, self.ngram_size)

        if not ngrams:
            return set()

        # Hash all n-grams
        hashes = [self._hash_ngram(ng) for ng in ngrams]

        # Use Winnowing: select minimum hash in each window
        window_size = 4
        fingerprint = set()

        if len(hashes) <= window_size:
            fingerprint.add(min(hashes))
        else:
            for i in range(len(hashes) - window_size + 1):
                window = hashes[i:i + window_size]
                fingerprint.add(min(window))

        return fingerprint

    def compute_fingerprint_string(self, text: str) -> str:
        """
        Compute a string representation of document fingerprint.

        Args:
            text: Text to fingerprint

        Returns:
            Hex string fingerprint
        """
        fingerprint = self.compute_fingerprint(text)
        # Create deterministic hash from sorted fingerprint values
        sorted_fps = sorted(fingerprint)
        combined = '-'.join(str(h) for h in sorted_fps[:20])  # Limit size
        return hashlib.sha256(combined.encode()).hexdigest()[:32]

    def _compute_jaccard_similarity(
        self,
        fingerprint1: Set[int],
        fingerprint2: Set[int],
    ) -> float:
        """Compute Jaccard similarity between fingerprints."""
        if not fingerprint1 or not fingerprint2:
            return 0.0

        intersection = len(fingerprint1 & fingerprint2)
        union = len(fingerprint1 | fingerprint2)

        return intersection / union if union > 0 else 0.0

    def _get_embedding(self, text: str) -> Optional[np.ndarray]:
        """Get sentence embedding for text."""
        if not self.use_embeddings:
            return None

        self._lazy_load_embedding_model()

        if self._embedding_model is None:
            return None

        try:
            embedding = self._embedding_model.encode(text, convert_to_numpy=True)
            return embedding
        except Exception as e:
            logger.warning(f"Failed to compute embedding: {e}")
            return None

    def _cosine_similarity(
        self,
        vec1: np.ndarray,
        vec2: np.ndarray,
    ) -> float:
        """Compute cosine similarity between vectors."""
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        return float(np.dot(vec1, vec2) / (norm1 * norm2))

    def semantic_similarity(self, text1: str, text2: str) -> float:
        """
        Compute semantic similarity between two texts.

        Args:
            text1: First text
            text2: Second text

        Returns:
            Similarity score (0-1)
        """
        emb1 = self._get_embedding(text1)
        emb2 = self._get_embedding(text2)

        if emb1 is None or emb2 is None:
            # Fallback to n-gram similarity
            fp1 = self.compute_fingerprint(text1)
            fp2 = self.compute_fingerprint(text2)
            return self._compute_jaccard_similarity(fp1, fp2)

        return max(0.0, self._cosine_similarity(emb1, emb2))

    def _split_into_paragraphs(self, text: str) -> List[Tuple[str, int, int]]:
        """Split text into paragraphs with positions."""
        paragraphs = []
        current_pos = 0

        # Split on double newlines or multiple newlines
        parts = re.split(r'\n\s*\n', text)

        for part in parts:
            part = part.strip()
            if part:
                start = text.find(part, current_pos)
                end = start + len(part)
                paragraphs.append((part, start, end))
                current_pos = end

        return paragraphs

    def _extract_style_features(
        self,
        text: str,
        paragraph_id: int = 0,
    ) -> StyleFeatures:
        """Extract style features from a text segment."""
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]

        words = self._tokenize(text)
        word_count = len(words)

        # Average sentence length
        if sentences:
            avg_sent_len = sum(len(s.split()) for s in sentences) / len(sentences)
        else:
            avg_sent_len = 0.0

        # Average word length
        if words:
            avg_word_len = sum(len(w) for w in words) / len(words)
        else:
            avg_word_len = 0.0

        # Vocabulary richness (type-token ratio)
        if words:
            vocab_richness = len(set(words)) / len(words)
        else:
            vocab_richness = 0.0

        # Punctuation density
        punct_count = sum(1 for c in text if c in '.,!?;:"\'-')
        punct_density = punct_count / max(1, word_count)

        return StyleFeatures(
            avg_sentence_length=avg_sent_len,
            avg_word_length=avg_word_len,
            vocabulary_richness=vocab_richness,
            punctuation_density=punct_density,
            paragraph_id=paragraph_id,
            text_preview=text[:100] + "..." if len(text) > 100 else text,
        )

    def _compute_style_deviation(
        self,
        features: StyleFeatures,
        baseline_features: List[StyleFeatures],
    ) -> float:
        """Compute how much a paragraph's style deviates from baseline."""
        if not baseline_features:
            return 0.0

        # Compute average baseline
        avg_sent_len = sum(f.avg_sentence_length for f in baseline_features) / len(baseline_features)
        avg_word_len = sum(f.avg_word_length for f in baseline_features) / len(baseline_features)
        avg_vocab = sum(f.vocabulary_richness for f in baseline_features) / len(baseline_features)
        avg_punct = sum(f.punctuation_density for f in baseline_features) / len(baseline_features)

        # Compute standard deviations
        std_sent_len = np.std([f.avg_sentence_length for f in baseline_features]) or 1.0
        std_word_len = np.std([f.avg_word_length for f in baseline_features]) or 1.0
        std_vocab = np.std([f.vocabulary_richness for f in baseline_features]) or 1.0
        std_punct = np.std([f.punctuation_density for f in baseline_features]) or 1.0

        # Compute z-scores for each feature
        z_sent = abs(features.avg_sentence_length - avg_sent_len) / std_sent_len
        z_word = abs(features.avg_word_length - avg_word_len) / std_word_len
        z_vocab = abs(features.vocabulary_richness - avg_vocab) / std_vocab
        z_punct = abs(features.punctuation_density - avg_punct) / std_punct

        # Combined deviation score (average of z-scores, normalized)
        deviation = (z_sent + z_word + z_vocab + z_punct) / 4

        # Normalize to 0-1 range (z > 2 is suspicious)
        return min(1.0, deviation / 3)

    def _analyze_style_consistency(
        self,
        text: str,
    ) -> Tuple[float, List[SuspiciousPassage]]:
        """
        Analyze internal style consistency.

        Detects paragraphs with significantly different writing style,
        which may indicate copy-paste from external sources.

        Returns:
            Tuple of (consistency_score, suspicious_passages)
        """
        paragraphs = self._split_into_paragraphs(text)

        if len(paragraphs) < 3:
            # Not enough paragraphs for meaningful analysis
            return 1.0, []

        # Extract features for each paragraph
        features = []
        for i, (para_text, start, end) in enumerate(paragraphs):
            if len(para_text.split()) >= 10:  # Minimum paragraph length
                feat = self._extract_style_features(para_text, i)
                features.append((feat, para_text, start, end))

        if len(features) < 3:
            return 1.0, []

        suspicious = []
        deviations = []

        for feat, para_text, start, end in features:
            # Compare against other paragraphs
            other_features = [f[0] for f in features if f[0].paragraph_id != feat.paragraph_id]
            deviation = self._compute_style_deviation(feat, other_features)
            deviations.append(deviation)

            # Flag if deviation is high
            if deviation > 0.6:
                suspicious.append(SuspiciousPassage(
                    passage_text=para_text[:200] + "..." if len(para_text) > 200 else para_text,
                    start_pos=start,
                    end_pos=end,
                    reason="Writing style differs significantly from the rest of the document",
                    confidence=deviation,
                    style_deviation_score=deviation,
                ))

        # Overall consistency is 1 - average deviation
        avg_deviation = sum(deviations) / len(deviations) if deviations else 0
        consistency_score = max(0.0, 1.0 - avg_deviation)

        return consistency_score, suspicious

    def _compute_self_similarity_matrix(
        self,
        text: str,
    ) -> Optional[List[List[float]]]:
        """
        Compute paragraph-to-paragraph similarity matrix.

        Useful for detecting internally repeated content.
        """
        paragraphs = self._split_into_paragraphs(text)

        if len(paragraphs) < 2:
            return None

        # Get embeddings or fingerprints for each paragraph
        representations = []
        for para_text, _, _ in paragraphs:
            if len(para_text.split()) >= 5:
                if self.use_embeddings:
                    emb = self._get_embedding(para_text)
                    if emb is not None:
                        representations.append(emb)
                    else:
                        fp = self.compute_fingerprint(para_text)
                        representations.append(fp)
                else:
                    fp = self.compute_fingerprint(para_text)
                    representations.append(fp)

        if len(representations) < 2:
            return None

        # Build similarity matrix
        n = len(representations)
        matrix = [[0.0] * n for _ in range(n)]

        for i in range(n):
            for j in range(n):
                if i == j:
                    matrix[i][j] = 1.0
                elif j > i:
                    # Compute similarity
                    if isinstance(representations[i], np.ndarray):
                        sim = self._cosine_similarity(representations[i], representations[j])
                    else:
                        sim = self._compute_jaccard_similarity(
                            representations[i], representations[j]
                        )
                    matrix[i][j] = sim
                    matrix[j][i] = sim

        return matrix

    def _find_matching_passages(
        self,
        text: str,
        reference_text: str,
        source_id: str,
        source_title: Optional[str] = None,
    ) -> List[MatchedSource]:
        """Find matching passages between text and reference."""
        matches = []

        # Split into sentences for finer-grained matching
        sentences = re.split(r'(?<=[.!?])\s+', text)

        for sentence in sentences:
            if len(sentence.split()) < 5:
                continue

            # Check fingerprint overlap
            sent_fp = self.compute_fingerprint(sentence)
            ref_fp = self.compute_fingerprint(reference_text)

            jaccard_sim = self._compute_jaccard_similarity(sent_fp, ref_fp)

            # Check semantic similarity
            semantic_sim = self.semantic_similarity(sentence, reference_text)

            # Determine match type and whether to flag
            if jaccard_sim > 0.9:
                match_type = MatchType.EXACT
                similarity = jaccard_sim
            elif jaccard_sim > 0.7:
                match_type = MatchType.NEAR_EXACT
                similarity = jaccard_sim
            elif semantic_sim > 0.85:
                match_type = MatchType.SEMANTIC
                similarity = semantic_sim
            elif semantic_sim > 0.75:
                match_type = MatchType.PARAPHRASE
                similarity = semantic_sim
            else:
                continue  # No significant match

            start_pos = text.find(sentence)

            matches.append(MatchedSource(
                source_id=source_id,
                source_title=source_title,
                matched_text=sentence,
                original_text=reference_text[:200] + "..." if len(reference_text) > 200 else reference_text,
                similarity=similarity,
                match_type=match_type,
                start_pos=start_pos,
                end_pos=start_pos + len(sentence),
            ))

        return matches

    def add_to_corpus(
        self,
        text: str,
        source_id: str,
        title: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Add a document to the reference corpus.

        Args:
            text: Document text
            source_id: Unique identifier for the document
            title: Document title
            metadata: Additional metadata
        """
        fingerprint = self.compute_fingerprint(text)
        self._corpus_fingerprints[source_id] = fingerprint
        self._corpus_metadata[source_id] = {
            "title": title,
            "text_preview": text[:500],
            "word_count": len(text.split()),
            **(metadata or {}),
        }
        logger.debug(f"Added document to corpus: {source_id}")

    def check_originality(
        self,
        text: str,
        reference_corpus: Optional[List[str]] = None,
        check_internal_consistency: bool = True,
    ) -> OriginalityReport:
        """
        Check text for originality/plagiarism.

        Args:
            text: Text to check
            reference_corpus: Optional list of texts to compare against
            check_internal_consistency: Whether to analyze style consistency

        Returns:
            OriginalityReport with detailed analysis
        """
        total_words = len(text.split())
        matched_words = 0
        all_matches: List[MatchedSource] = []

        # Compute document fingerprint
        doc_fingerprint = self.compute_fingerprint_string(text)

        # Check against provided reference corpus
        if reference_corpus:
            for i, ref_text in enumerate(reference_corpus):
                source_id = f"reference_{i}"
                matches = self._find_matching_passages(
                    text, ref_text, source_id,
                    source_title=f"Reference Document {i + 1}"
                )
                all_matches.extend(matches)
                matched_words += sum(len(m.matched_text.split()) for m in matches)

        # Check against internal corpus
        for source_id, fingerprint in self._corpus_fingerprints.items():
            doc_fp = self.compute_fingerprint(text)
            similarity = self._compute_jaccard_similarity(doc_fp, fingerprint)

            if similarity > self.similarity_threshold:
                metadata = self._corpus_metadata.get(source_id, {})
                all_matches.append(MatchedSource(
                    source_id=source_id,
                    source_title=metadata.get("title"),
                    matched_text=text[:200] + "...",
                    original_text=metadata.get("text_preview", ""),
                    similarity=similarity,
                    match_type=MatchType.SELF_PLAGIARISM,
                    start_pos=0,
                    end_pos=len(text),
                ))
                matched_words += int(total_words * similarity)

        # Analyze style consistency
        style_consistency = 1.0
        suspicious_passages: List[SuspiciousPassage] = []

        if check_internal_consistency:
            style_consistency, suspicious_passages = self._analyze_style_consistency(text)

        # Compute self-similarity matrix
        self_similarity = self._compute_self_similarity_matrix(text)

        # Calculate originality score
        # Base on: percentage unmatched + style consistency
        match_ratio = matched_words / max(1, total_words)
        base_originality = 1.0 - min(1.0, match_ratio)

        # Adjust for style inconsistency
        originality_score = (base_originality * 0.7) + (style_consistency * 0.3)

        # Penalize for suspicious passages
        if suspicious_passages:
            penalty = len(suspicious_passages) * 0.05
            originality_score = max(0.0, originality_score - penalty)

        return OriginalityReport(
            originality_score=round(originality_score, 3),
            matched_sources=all_matches,
            style_consistency_score=round(style_consistency, 3),
            suspicious_passages=suspicious_passages,
            self_similarity_matrix=self_similarity,
            total_matched_words=matched_words,
            total_words=total_words,
            fingerprint_hash=doc_fingerprint,
            analysis_details={
                "ngram_size": self.ngram_size,
                "similarity_threshold": self.similarity_threshold,
                "corpus_size": len(self._corpus_fingerprints),
                "reference_docs_checked": len(reference_corpus) if reference_corpus else 0,
            },
        )

    def compare_texts(self, text1: str, text2: str) -> SimilarityReport:
        """
        Compare two texts for similarity.

        Args:
            text1: First text
            text2: Second text

        Returns:
            SimilarityReport with detailed comparison
        """
        # Compute fingerprints
        fp1 = self.compute_fingerprint(text1)
        fp2 = self.compute_fingerprint(text2)

        # Exact match ratio (Jaccard)
        exact_match_ratio = self._compute_jaccard_similarity(fp1, fp2)

        # Semantic similarity
        semantic_sim = self.semantic_similarity(text1, text2)

        # Overall similarity (weighted combination)
        overall_similarity = (exact_match_ratio * 0.4) + (semantic_sim * 0.6)

        # Find shared n-grams
        ngrams1 = set(self._get_ngrams(text1, self.ngram_size))
        ngrams2 = set(self._get_ngrams(text2, self.ngram_size))
        shared = ngrams1 & ngrams2
        shared_ngrams = [' '.join(ng) for ng in list(shared)[:10]]

        # Find matching passages
        matching_passages = []
        sentences1 = re.split(r'(?<=[.!?])\s+', text1)

        for sent in sentences1:
            if len(sent.split()) < 5:
                continue

            sent_sim = self.semantic_similarity(sent, text2)
            if sent_sim > 0.8:
                matching_passages.append({
                    "text1_passage": sent,
                    "similarity": sent_sim,
                })

        return SimilarityReport(
            text1_preview=text1[:200] + "..." if len(text1) > 200 else text1,
            text2_preview=text2[:200] + "..." if len(text2) > 200 else text2,
            overall_similarity=round(overall_similarity, 3),
            exact_match_ratio=round(exact_match_ratio, 3),
            semantic_similarity=round(semantic_sim, 3),
            shared_ngrams=shared_ngrams,
            matching_passages=matching_passages,
        )

    def check_citations(
        self,
        text: str,
        expected_sources: List[str],
    ) -> Dict[str, Any]:
        """
        Verify that sources are properly cited.

        Args:
            text: Text to check
            expected_sources: List of source titles/authors that should be cited

        Returns:
            Dictionary with citation analysis
        """
        # Find citation patterns
        citation_patterns = [
            r'\(([A-Z][a-z]+(?:\s+(?:et al\.?|and|&)\s+[A-Z][a-z]+)?,?\s*\d{4})\)',  # (Author, 2020)
            r'\[(\d+)\]',  # [1]
            r'\((?:p\.|pp\.)\s*\d+(?:-\d+)?\)',  # (p. 123)
            r'"([^"]{10,})"',  # Quoted text
        ]

        found_citations = []
        for pattern in citation_patterns:
            matches = re.findall(pattern, text)
            found_citations.extend(matches)

        # Check which expected sources are mentioned
        mentioned_sources = []
        missing_sources = []

        text_lower = text.lower()
        for source in expected_sources:
            source_lower = source.lower()
            # Check if source name appears in text
            if source_lower in text_lower:
                mentioned_sources.append(source)
            else:
                # Check partial match (author last name)
                parts = source.split()
                if any(part.lower() in text_lower for part in parts if len(part) > 3):
                    mentioned_sources.append(source)
                else:
                    missing_sources.append(source)

        # Calculate citation score
        if expected_sources:
            citation_score = len(mentioned_sources) / len(expected_sources)
        else:
            citation_score = 1.0 if found_citations else 0.5

        return {
            "citation_score": round(citation_score, 2),
            "citations_found": len(found_citations),
            "citation_examples": found_citations[:5],
            "mentioned_sources": mentioned_sources,
            "missing_sources": missing_sources,
            "properly_cited": citation_score >= 0.8,
        }

    def get_detailed_analysis(
        self,
        report: OriginalityReport,
    ) -> Dict[str, Any]:
        """
        Get detailed analysis from an originality report.

        Args:
            report: Previously generated OriginalityReport

        Returns:
            Dictionary with detailed breakdown
        """
        # Group matches by type
        matches_by_type = defaultdict(list)
        for match in report.matched_sources:
            matches_by_type[match.match_type.value].append({
                "source": match.source_title or match.source_id,
                "similarity": match.similarity,
                "text_preview": match.matched_text[:100],
            })

        # Analyze suspicious passages
        high_confidence_suspicious = [
            sp for sp in report.suspicious_passages
            if sp.confidence > 0.7
        ]

        return {
            "summary": {
                "originality_score": report.originality_score,
                "originality_percentage": f"{report.originality_score * 100:.1f}%",
                "verdict": self._get_verdict(report.originality_score),
                "style_consistency": f"{report.style_consistency_score * 100:.1f}%",
            },
            "match_breakdown": {
                match_type: len(matches)
                for match_type, matches in matches_by_type.items()
            },
            "matches_by_type": dict(matches_by_type),
            "suspicious_passages_count": len(report.suspicious_passages),
            "high_confidence_issues": len(high_confidence_suspicious),
            "word_statistics": {
                "total_words": report.total_words,
                "matched_words": report.total_matched_words,
                "original_words": report.total_words - report.total_matched_words,
            },
            "document_fingerprint": report.fingerprint_hash,
        }

    def _get_verdict(self, originality_score: float) -> str:
        """Get human-readable verdict from originality score."""
        if originality_score >= 0.9:
            return "Highly Original"
        elif originality_score >= 0.75:
            return "Mostly Original"
        elif originality_score >= 0.6:
            return "Some Concerns"
        elif originality_score >= 0.4:
            return "Significant Overlap"
        else:
            return "Requires Review"
