"""
Concept Extractor

Extract educational concepts from text using NER, keyword extraction,
and domain-specific methods.
"""
import logging
import re
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Set, Tuple
from collections import Counter

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class ExtractedConcept:
    """Represents an extracted educational concept."""
    name: str
    domain: str
    importance: float
    span: Tuple[int, int]  # (start, end) in text
    definition: Optional[str] = None
    concept_type: str = "general"  # general, named_entity, keyword, technical
    confidence: float = 1.0
    aliases: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ConceptExtractorConfig:
    """Configuration for concept extraction."""
    # NER settings
    use_ner: bool = True
    ner_model: str = "en_core_web_sm"
    ner_labels: List[str] = field(default_factory=lambda: [
        "ORG", "PERSON", "GPE", "LOC", "PRODUCT", "EVENT", "WORK_OF_ART", "LAW"
    ])

    # Keyword extraction settings
    use_keywords: bool = True
    keyword_method: str = "tfidf"  # tfidf, textrank, both
    min_keyword_length: int = 3
    max_keyword_ngram: int = 3

    # Domain-specific settings
    domain_vocabularies: Dict[str, Set[str]] = field(default_factory=dict)

    # General settings
    min_confidence: float = 0.3
    deduplicate: bool = True
    lowercase_matching: bool = True


# Domain-specific vocabularies for educational concepts
DOMAIN_VOCABULARIES = {
    "mathematics": {
        "algebra", "calculus", "geometry", "trigonometry", "statistics",
        "probability", "linear algebra", "differential equations", "vectors",
        "matrices", "polynomials", "functions", "derivatives", "integrals",
        "limits", "series", "sequences", "logarithms", "exponents", "fractions",
        "equations", "inequalities", "graphs", "coordinates", "theorems",
        "proofs", "sets", "numbers", "ratios", "proportions", "percentages",
        "arithmetic", "multiplication", "division", "addition", "subtraction"
    },
    "science": {
        "physics", "chemistry", "biology", "astronomy", "geology", "ecology",
        "atoms", "molecules", "cells", "organisms", "energy", "force", "motion",
        "gravity", "electricity", "magnetism", "waves", "light", "sound",
        "temperature", "heat", "matter", "elements", "compounds", "reactions",
        "photosynthesis", "respiration", "evolution", "genetics", "dna", "rna",
        "ecosystem", "habitat", "species", "adaptation", "natural selection",
        "periodic table", "electrons", "protons", "neutrons", "nucleus"
    },
    "history": {
        "civilization", "empire", "revolution", "war", "treaty", "democracy",
        "monarchy", "republic", "colonization", "independence", "constitution",
        "renaissance", "enlightenment", "industrial revolution", "world war",
        "ancient", "medieval", "modern", "contemporary", "archaeology"
    },
    "language_arts": {
        "grammar", "vocabulary", "syntax", "semantics", "punctuation",
        "paragraph", "essay", "narrative", "exposition", "persuasion",
        "poetry", "prose", "fiction", "nonfiction", "metaphor", "simile",
        "alliteration", "personification", "irony", "symbolism", "theme",
        "plot", "character", "setting", "conflict", "resolution"
    },
    "computer_science": {
        "algorithm", "data structure", "programming", "variable", "function",
        "class", "object", "inheritance", "polymorphism", "encapsulation",
        "recursion", "iteration", "array", "list", "stack", "queue", "tree",
        "graph", "sorting", "searching", "complexity", "database", "network",
        "protocol", "encryption", "api", "interface", "abstraction"
    }
}

# Definition patterns for extracting concept definitions
DEFINITION_PATTERNS = [
    r"(?P<term>[A-Z][a-z]+(?:\s+[a-z]+)*)\s+is\s+(?:defined\s+as\s+)?(?:a|an|the)?\s*(?P<definition>[^.]+)\.",
    r"(?P<term>[A-Z][a-z]+(?:\s+[a-z]+)*)\s+refers?\s+to\s+(?P<definition>[^.]+)\.",
    r"(?P<term>[A-Z][a-z]+(?:\s+[a-z]+)*),?\s+which\s+(?:is|means|refers\s+to)\s+(?P<definition>[^.]+)\.",
    r"(?:The\s+)?(?P<term>[a-z]+(?:\s+[a-z]+)*)\s+is\s+(?:a|an)\s+(?P<definition>[^.]+(?:that|which)[^.]+)\.",
]


class ConceptExtractor:
    """
    Extract concepts from educational content.

    Methods:
    - NER-based extraction using spaCy
    - Keyword extraction (TF-IDF, TextRank)
    - Domain-specific vocabulary matching
    - Definition extraction

    Usage:
        extractor = ConceptExtractor()
        concepts = extractor.extract("Photosynthesis converts light energy...")
    """

    def __init__(
        self,
        config: Optional[ConceptExtractorConfig] = None,
        domain: Optional[str] = None,
    ):
        self.config = config or ConceptExtractorConfig()
        self.domain = domain
        self._nlp = None
        self._tfidf_vectorizer = None
        self._initialized = False

        # Merge domain vocabularies
        self._vocabularies = {**DOMAIN_VOCABULARIES}
        if self.config.domain_vocabularies:
            for domain_name, vocab in self.config.domain_vocabularies.items():
                if domain_name in self._vocabularies:
                    self._vocabularies[domain_name].update(vocab)
                else:
                    self._vocabularies[domain_name] = vocab

        logger.info(f"ConceptExtractor initialized for domain: {domain or 'general'}")

    def _ensure_initialized(self):
        """Lazy initialization of NLP models."""
        if self._initialized:
            return

        if self.config.use_ner:
            try:
                import spacy
                try:
                    self._nlp = spacy.load(self.config.ner_model)
                except OSError:
                    logger.warning(f"SpaCy model {self.config.ner_model} not found, using blank")
                    self._nlp = spacy.blank("en")
            except ImportError:
                logger.warning("SpaCy not available, NER disabled")
                self._nlp = None

        if self.config.use_keywords and self.config.keyword_method in ("tfidf", "both"):
            try:
                from sklearn.feature_extraction.text import TfidfVectorizer
                self._tfidf_vectorizer = TfidfVectorizer(
                    ngram_range=(1, self.config.max_keyword_ngram),
                    stop_words="english",
                    max_features=1000,
                )
            except ImportError:
                logger.warning("sklearn not available, TF-IDF disabled")

        self._initialized = True

    def extract(
        self,
        text: str,
        max_concepts: int = 20,
        domain: Optional[str] = None,
    ) -> List[ExtractedConcept]:
        """
        Extract concepts from text.

        Args:
            text: Input text to extract concepts from
            max_concepts: Maximum number of concepts to return
            domain: Optional domain filter (math, science, etc.)

        Returns:
            List of extracted concepts sorted by importance
        """
        self._ensure_initialized()

        target_domain = domain or self.domain or "general"
        concepts: List[ExtractedConcept] = []

        # 1. NER-based extraction
        if self.config.use_ner and self._nlp:
            ner_concepts = self._extract_ner(text, target_domain)
            concepts.extend(ner_concepts)

        # 2. Keyword extraction
        if self.config.use_keywords:
            keyword_concepts = self._extract_keywords(text, target_domain)
            concepts.extend(keyword_concepts)

        # 3. Domain vocabulary matching
        vocab_concepts = self._extract_domain_vocabulary(text, target_domain)
        concepts.extend(vocab_concepts)

        # 4. Deduplicate and merge
        if self.config.deduplicate:
            concepts = self._deduplicate_concepts(concepts)

        # 5. Filter by confidence
        concepts = [c for c in concepts if c.confidence >= self.config.min_confidence]

        # 6. Sort by importance and limit
        concepts.sort(key=lambda x: x.importance, reverse=True)
        return concepts[:max_concepts]

    def _extract_ner(self, text: str, domain: str) -> List[ExtractedConcept]:
        """Extract concepts using Named Entity Recognition."""
        concepts = []
        doc = self._nlp(text)

        for ent in doc.ents:
            if ent.label_ in self.config.ner_labels:
                # Calculate importance based on frequency and position
                importance = self._calculate_importance(ent.text, text, ent.start_char)

                concepts.append(ExtractedConcept(
                    name=ent.text,
                    domain=domain,
                    importance=importance,
                    span=(ent.start_char, ent.end_char),
                    concept_type="named_entity",
                    confidence=0.8,
                    metadata={"ner_label": ent.label_}
                ))

        return concepts

    def _extract_keywords(self, text: str, domain: str) -> List[ExtractedConcept]:
        """Extract keywords using TF-IDF or TextRank."""
        concepts = []

        # TF-IDF extraction
        if self.config.keyword_method in ("tfidf", "both") and self._tfidf_vectorizer:
            try:
                tfidf_concepts = self._extract_tfidf_keywords(text, domain)
                concepts.extend(tfidf_concepts)
            except Exception as e:
                logger.warning(f"TF-IDF extraction failed: {e}")

        # TextRank extraction
        if self.config.keyword_method in ("textrank", "both"):
            textrank_concepts = self._extract_textrank_keywords(text, domain)
            concepts.extend(textrank_concepts)

        return concepts

    def _extract_tfidf_keywords(self, text: str, domain: str) -> List[ExtractedConcept]:
        """Extract keywords using TF-IDF scores."""
        concepts = []

        # Fit and transform
        try:
            tfidf_matrix = self._tfidf_vectorizer.fit_transform([text])
        except ValueError:
            return concepts

        feature_names = self._tfidf_vectorizer.get_feature_names_out()
        scores = tfidf_matrix.toarray()[0]

        # Get top keywords
        top_indices = np.argsort(scores)[::-1][:50]

        for idx in top_indices:
            if scores[idx] > 0:
                keyword = feature_names[idx]
                if len(keyword) >= self.config.min_keyword_length:
                    # Find span in text
                    match = re.search(re.escape(keyword), text, re.IGNORECASE)
                    span = (match.start(), match.end()) if match else (0, 0)

                    concepts.append(ExtractedConcept(
                        name=keyword,
                        domain=domain,
                        importance=float(scores[idx]),
                        span=span,
                        concept_type="keyword",
                        confidence=min(0.9, float(scores[idx]) * 2),
                    ))

        return concepts

    def _extract_textrank_keywords(self, text: str, domain: str) -> List[ExtractedConcept]:
        """Extract keywords using TextRank algorithm."""
        concepts = []

        # Simple TextRank-like approach using co-occurrence
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        word_freq = Counter(words)

        # Build co-occurrence graph
        window_size = 5
        cooccurrence = Counter()
        for i, word in enumerate(words):
            window = words[max(0, i - window_size):i + window_size + 1]
            for other in window:
                if other != word:
                    cooccurrence[(word, other)] += 1

        # Calculate scores (simplified PageRank)
        scores = {word: freq for word, freq in word_freq.items()}

        # Damping factor iterations
        damping = 0.85
        for _ in range(10):
            new_scores = {}
            for word in scores:
                incoming = sum(
                    scores.get(other, 0) * cooccurrence.get((other, word), 0)
                    for other in scores if other != word
                )
                new_scores[word] = (1 - damping) + damping * incoming / (sum(scores.values()) or 1)
            scores = new_scores

        # Filter stopwords and get top keywords
        stopwords = {
            "the", "a", "an", "and", "or", "but", "is", "are", "was", "were",
            "be", "been", "being", "have", "has", "had", "do", "does", "did",
            "will", "would", "could", "should", "may", "might", "must", "shall",
            "can", "this", "that", "these", "those", "it", "its", "they", "them",
            "their", "we", "our", "you", "your", "which", "who", "whom", "what",
            "where", "when", "why", "how", "all", "each", "every", "both", "few",
            "more", "most", "other", "some", "such", "no", "nor", "not", "only",
            "own", "same", "than", "too", "very", "just", "also", "into", "from"
        }

        for word, score in sorted(scores.items(), key=lambda x: x[1], reverse=True)[:30]:
            if word not in stopwords and len(word) >= self.config.min_keyword_length:
                match = re.search(r'\b' + re.escape(word) + r'\b', text, re.IGNORECASE)
                span = (match.start(), match.end()) if match else (0, 0)

                concepts.append(ExtractedConcept(
                    name=word,
                    domain=domain,
                    importance=score,
                    span=span,
                    concept_type="keyword",
                    confidence=min(0.7, score),
                ))

        return concepts

    def _extract_domain_vocabulary(self, text: str, domain: str) -> List[ExtractedConcept]:
        """Extract concepts matching domain vocabulary."""
        concepts = []
        text_lower = text.lower()

        # Get relevant vocabularies
        vocabularies_to_check = []
        if domain in self._vocabularies:
            vocabularies_to_check.append((domain, self._vocabularies[domain]))
        else:
            # Check all vocabularies
            vocabularies_to_check = list(self._vocabularies.items())

        for vocab_domain, vocabulary in vocabularies_to_check:
            for term in vocabulary:
                # Check for term in text
                pattern = r'\b' + re.escape(term) + r'\b'
                matches = list(re.finditer(pattern, text_lower))

                if matches:
                    # Calculate importance based on frequency
                    importance = len(matches) / len(text.split())

                    concepts.append(ExtractedConcept(
                        name=term,
                        domain=vocab_domain,
                        importance=importance * 10,  # Boost domain terms
                        span=(matches[0].start(), matches[0].end()),
                        concept_type="technical",
                        confidence=0.95,  # High confidence for vocabulary matches
                        metadata={"frequency": len(matches)}
                    ))

        return concepts

    def _calculate_importance(self, term: str, text: str, position: int) -> float:
        """Calculate importance score for a term."""
        # Frequency component
        frequency = text.lower().count(term.lower())
        freq_score = min(1.0, frequency / 5)

        # Position component (earlier = more important)
        position_score = 1.0 - (position / len(text))

        # Length component (longer terms often more specific)
        length_score = min(1.0, len(term) / 20)

        return (freq_score * 0.5 + position_score * 0.3 + length_score * 0.2)

    def _deduplicate_concepts(self, concepts: List[ExtractedConcept]) -> List[ExtractedConcept]:
        """Remove duplicate concepts, keeping highest importance."""
        seen: Dict[str, ExtractedConcept] = {}

        for concept in concepts:
            key = concept.name.lower() if self.config.lowercase_matching else concept.name

            if key not in seen or concept.importance > seen[key].importance:
                seen[key] = concept

        return list(seen.values())

    def extract_definitions(
        self,
        text: str,
        domain: Optional[str] = None,
    ) -> List[ExtractedConcept]:
        """
        Extract concepts along with their definitions from text.

        Args:
            text: Input text containing definitions
            domain: Optional domain filter

        Returns:
            List of concepts with definitions
        """
        self._ensure_initialized()

        target_domain = domain or self.domain or "general"
        concepts = []

        for pattern in DEFINITION_PATTERNS:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                term = match.group("term").strip()
                definition = match.group("definition").strip()

                concepts.append(ExtractedConcept(
                    name=term,
                    domain=target_domain,
                    importance=0.9,  # Definitions are high value
                    span=(match.start(), match.end()),
                    definition=definition,
                    concept_type="defined",
                    confidence=0.85,
                ))

        return self._deduplicate_concepts(concepts)

    def link_to_ontology(
        self,
        concept: ExtractedConcept,
        ontology_name: str = "wikidata",
    ) -> Optional[str]:
        """
        Link concept to external ontology (Wikidata, DBpedia, etc.).

        Args:
            concept: Concept to link
            ontology_name: Target ontology

        Returns:
            Ontology ID if found, None otherwise
        """
        # This would typically call an external API
        # For now, return a placeholder based on concept name
        concept_id = concept.name.lower().replace(" ", "_")

        if ontology_name == "wikidata":
            # In production, this would query the Wikidata API
            return f"Q_{concept_id}"
        elif ontology_name == "dbpedia":
            return f"dbpedia:{concept_id}"

        return None

    def extract_concept_hierarchy(
        self,
        text: str,
        domain: Optional[str] = None,
    ) -> Dict[str, List[str]]:
        """
        Extract hierarchical relationships between concepts.

        Returns a dictionary mapping parent concepts to their children.
        """
        self._ensure_initialized()

        # Extract all concepts first
        concepts = self.extract(text, max_concepts=50, domain=domain)
        concept_names = {c.name.lower() for c in concepts}

        hierarchy: Dict[str, List[str]] = {}

        # Patterns for hierarchical relationships
        patterns = [
            r"(?P<parent>[A-Za-z\s]+)\s+(?:includes?|contains?|comprises?)\s+(?P<children>[^.]+)\.",
            r"(?P<children>[A-Za-z\s,]+(?:,\s*and\s+[A-Za-z\s]+)?)\s+are\s+(?:types?|kinds?|forms?)\s+of\s+(?P<parent>[A-Za-z\s]+)\.",
            r"(?P<parent>[A-Za-z\s]+)\s+(?:is|are)\s+divided\s+into\s+(?P<children>[^.]+)\.",
        ]

        for pattern in patterns:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                parent = match.group("parent").strip().lower()
                children_text = match.group("children")

                # Parse children (comma and 'and' separated)
                children = re.split(r',\s*|\s+and\s+', children_text)
                children = [c.strip().lower() for c in children if c.strip()]

                # Only include concepts we've identified
                if parent in concept_names:
                    valid_children = [c for c in children if c in concept_names]
                    if valid_children:
                        if parent not in hierarchy:
                            hierarchy[parent] = []
                        hierarchy[parent].extend(valid_children)

        return hierarchy

    def batch_extract(
        self,
        texts: List[str],
        max_concepts_per_text: int = 10,
        domain: Optional[str] = None,
    ) -> List[List[ExtractedConcept]]:
        """
        Extract concepts from multiple texts efficiently.

        Args:
            texts: List of texts to process
            max_concepts_per_text: Max concepts per text
            domain: Optional domain filter

        Returns:
            List of concept lists, one per input text
        """
        return [
            self.extract(text, max_concepts=max_concepts_per_text, domain=domain)
            for text in texts
        ]
