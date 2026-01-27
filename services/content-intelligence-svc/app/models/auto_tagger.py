"""
Auto Tagger

Automatically tag content with topics, skills, and concepts using NLP.
"""
import logging
import re
from collections import Counter
from dataclasses import dataclass
from typing import List, Dict, Set, Optional, Tuple

logger = logging.getLogger(__name__)


@dataclass
class Tag:
    name: str
    type: str  # topic, skill, concept, standard
    confidence: float


class AutoTagger:
    """
    Automatically tag educational content using NLP techniques.

    Tag types:
    - Topics (math, science, history)
    - Skills (reading, writing, problem-solving)
    - Concepts (photosynthesis, fractions)
    - Standards (CCSS.MATH.4.NF.A.1)

    Usage:
        tagger = AutoTagger()
        tags = tagger.tag("Plants convert sunlight to energy...")
    """

    # Stop words for filtering
    STOP_WORDS: Set[str] = {
        'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
        'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
        'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
        'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
        'we', 'they', 'what', 'which', 'who', 'whom', 'where', 'when', 'why',
        'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
        'some', 'such', 'no', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
        'very', 'just', 'also', 'now', 'here', 'there', 'then', 'once', 'if',
        'because', 'about', 'into', 'through', 'during', 'before', 'after',
        'above', 'below', 'between', 'under', 'again', 'further', 'while',
        'their', 'your', 'his', 'her', 'our', 'my', 'me', 'him', 'us', 'them',
        'being', 'having', 'doing', 'made', 'make', 'makes', 'making', 'get',
        'gets', 'got', 'getting', 'go', 'goes', 'went', 'going', 'come', 'comes',
        'came', 'coming', 'take', 'takes', 'took', 'taking', 'see', 'sees',
        'saw', 'seeing', 'know', 'knows', 'knew', 'knowing', 'think', 'thinks',
        'thought', 'thinking', 'want', 'wants', 'wanted', 'wanting', 'use',
        'uses', 'used', 'using', 'find', 'finds', 'found', 'finding', 'give',
        'gives', 'gave', 'giving', 'tell', 'tells', 'told', 'telling', 'ask',
        'asks', 'asked', 'asking', 'work', 'works', 'worked', 'working', 'seem',
        'seems', 'seemed', 'seeming', 'feel', 'feels', 'felt', 'feeling', 'try',
        'tries', 'tried', 'trying', 'leave', 'leaves', 'left', 'leaving', 'call',
        'calls', 'called', 'calling', 'need', 'needs', 'needed', 'needing',
        'become', 'becomes', 'became', 'becoming', 'begin', 'begins', 'began',
        'beginning', 'like', 'likes', 'liked', 'liking', 'help', 'helps', 'helped',
        'helping', 'show', 'shows', 'showed', 'showing', 'hear', 'hears', 'heard',
        'hearing', 'let', 'lets', 'play', 'plays', 'played', 'playing', 'run',
        'runs', 'ran', 'running', 'move', 'moves', 'moved', 'moving', 'live',
        'lives', 'lived', 'living', 'believe', 'believes', 'believed', 'hold',
        'holds', 'held', 'holding', 'bring', 'brings', 'brought', 'happen',
        'happens', 'happened', 'happening', 'write', 'writes', 'wrote', 'written',
        'provide', 'provides', 'provided', 'sit', 'sits', 'sat', 'sitting', 'stand',
        'stands', 'stood', 'standing', 'lose', 'loses', 'lost', 'losing', 'pay',
        'pays', 'paid', 'meet', 'meets', 'met', 'include', 'includes', 'included',
        'continue', 'continues', 'continued', 'set', 'sets', 'learn', 'learns',
        'learned', 'change', 'changes', 'changed', 'lead', 'leads', 'led',
        'understand', 'understands', 'understood', 'watch', 'watches', 'watched',
        'follow', 'follows', 'followed', 'stop', 'stops', 'stopped', 'create',
        'creates', 'created', 'speak', 'speaks', 'spoke', 'allow', 'allows',
        'allowed', 'add', 'adds', 'added', 'spend', 'spends', 'spent', 'grow',
        'grows', 'grew', 'open', 'opens', 'opened', 'walk', 'walks', 'walked',
        'win', 'wins', 'won', 'offer', 'offers', 'offered', 'remember', 'remembers',
        'remembered', 'consider', 'considers', 'considered', 'appear', 'appears',
        'appeared', 'buy', 'buys', 'bought', 'wait', 'waits', 'waited', 'serve',
        'serves', 'served', 'die', 'dies', 'died', 'send', 'sends', 'sent',
        'expect', 'expects', 'expected', 'build', 'builds', 'built', 'stay',
        'stays', 'stayed', 'fall', 'falls', 'fell', 'cut', 'cuts', 'reach',
        'reaches', 'reached', 'kill', 'kills', 'killed', 'remain', 'remains',
        'remained', 'suggest', 'suggests', 'suggested', 'raise', 'raises', 'raised',
        'pass', 'passes', 'passed', 'sell', 'sells', 'sold', 'require', 'requires',
        'required', 'report', 'reports', 'reported', 'decide', 'decides', 'decided',
        'pull', 'pulls', 'pulled'
    }

    # Topic keywords mapping
    TOPIC_KEYWORDS: Dict[str, List[str]] = {
        "mathematics": ["math", "equation", "number", "calculate", "algebra", "geometry",
                       "arithmetic", "fraction", "decimal", "percent", "graph", "function",
                       "variable", "formula", "theorem", "proof", "statistics", "probability"],
        "science": ["science", "experiment", "hypothesis", "theory", "observation",
                   "data", "research", "laboratory", "scientific", "method"],
        "biology": ["biology", "cell", "organism", "species", "evolution", "genetics",
                   "DNA", "ecosystem", "photosynthesis", "metabolism", "anatomy", "life"],
        "chemistry": ["chemistry", "atom", "molecule", "element", "compound", "reaction",
                     "bond", "periodic", "electron", "ion", "solution", "acid", "base"],
        "physics": ["physics", "force", "energy", "motion", "velocity", "acceleration",
                   "mass", "gravity", "momentum", "wave", "electricity", "magnetism"],
        "history": ["history", "historical", "century", "war", "revolution", "civilization",
                   "ancient", "medieval", "empire", "dynasty", "president", "independence"],
        "geography": ["geography", "map", "continent", "country", "region", "climate",
                     "landform", "population", "terrain", "ocean", "river", "mountain"],
        "english": ["english", "literature", "grammar", "writing", "reading", "vocabulary",
                   "essay", "paragraph", "sentence", "poetry", "novel", "story", "author"],
        "art": ["art", "painting", "drawing", "sculpture", "design", "color", "composition",
               "artistic", "creative", "canvas", "portrait", "landscape"],
        "music": ["music", "melody", "rhythm", "harmony", "instrument", "note", "chord",
                 "scale", "tempo", "composer", "symphony", "concert"],
        "technology": ["technology", "computer", "programming", "software", "hardware",
                      "internet", "digital", "code", "algorithm", "data", "network"],
        "social studies": ["social", "society", "culture", "community", "government",
                          "economics", "politics", "citizenship", "democracy", "rights"]
    }

    # Skill keywords mapping
    SKILL_KEYWORDS: Dict[str, List[str]] = {
        "reading comprehension": ["read", "comprehend", "understand", "interpret", "analyze",
                                  "passage", "text", "main idea", "inference", "context"],
        "writing": ["write", "compose", "draft", "revise", "edit", "essay", "paragraph",
                   "thesis", "argument", "narrative", "descriptive"],
        "critical thinking": ["analyze", "evaluate", "synthesize", "compare", "contrast",
                             "critique", "assess", "reason", "logic", "evidence"],
        "problem solving": ["solve", "solution", "problem", "strategy", "approach",
                           "method", "calculate", "determine", "figure out"],
        "communication": ["communicate", "express", "present", "explain", "describe",
                         "discuss", "articulate", "convey", "share"],
        "research": ["research", "investigate", "explore", "study", "examine",
                    "inquiry", "sources", "evidence", "bibliography"],
        "collaboration": ["collaborate", "cooperate", "teamwork", "group", "partner",
                         "share", "discuss", "contribute", "participate"],
        "creativity": ["create", "design", "invent", "imagine", "innovate",
                      "original", "unique", "artistic", "express"]
    }

    # Common Core State Standards patterns
    CCSS_PATTERNS: Dict[str, Dict] = {
        "CCSS.MATH": {
            "pattern": r"math|arithmetic|algebra|geometry|number|equation|fraction",
            "domains": {
                "OA": "Operations and Algebraic Thinking",
                "NBT": "Number and Operations in Base Ten",
                "NF": "Number and Operations - Fractions",
                "MD": "Measurement and Data",
                "G": "Geometry",
                "RP": "Ratios and Proportional Relationships",
                "NS": "The Number System",
                "EE": "Expressions and Equations",
                "F": "Functions",
                "SP": "Statistics and Probability"
            }
        },
        "CCSS.ELA": {
            "pattern": r"read|write|literature|language|speak|listen|vocabulary|grammar",
            "domains": {
                "RL": "Reading Literature",
                "RI": "Reading Informational Text",
                "RF": "Reading Foundational Skills",
                "W": "Writing",
                "SL": "Speaking and Listening",
                "L": "Language"
            }
        }
    }

    def __init__(self, model_name: str = None):
        """
        Initialize the AutoTagger.

        Args:
            model_name: Optional model name (for compatibility, not used in this implementation)
        """
        self.model_name = model_name
        self._build_reverse_index()
        logger.info("AutoTagger initialized")

    def _build_reverse_index(self) -> None:
        """Build reverse index from keywords to categories."""
        self._topic_index: Dict[str, str] = {}
        for topic, keywords in self.TOPIC_KEYWORDS.items():
            for keyword in keywords:
                self._topic_index[keyword.lower()] = topic

        self._skill_index: Dict[str, str] = {}
        for skill, keywords in self.SKILL_KEYWORDS.items():
            for keyword in keywords:
                self._skill_index[keyword.lower()] = skill

    def _tokenize(self, text: str) -> List[str]:
        """Extract words from text, removing stop words."""
        words = re.findall(r'\b[a-zA-Z]{2,}\b', text.lower())
        return [w for w in words if w not in self.STOP_WORDS]

    def _extract_ngrams(self, text: str, n: int = 2) -> List[str]:
        """Extract word n-grams from text."""
        words = re.findall(r'\b[a-zA-Z]{2,}\b', text.lower())
        ngrams = []
        for i in range(len(words) - n + 1):
            ngrams.append(' '.join(words[i:i+n]))
        return ngrams

    def _extract_noun_phrases(self, text: str) -> List[str]:
        """
        Extract potential noun phrases using simple patterns.

        This is a simplified approach without full NLP parsing.
        """
        # Common adjective + noun patterns
        patterns = [
            r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b',  # Capitalized phrases
            r'\b((?:the|a|an)\s+\w+(?:\s+\w+)?)\b',  # Article + words
        ]

        phrases = []
        for pattern in patterns:
            matches = re.findall(pattern, text)
            phrases.extend(matches)

        return phrases

    def _compute_term_importance(self, text: str) -> Dict[str, float]:
        """
        Compute term importance using TF-IDF-like scoring.

        Args:
            text: Text to analyze

        Returns:
            Dictionary mapping terms to importance scores
        """
        tokens = self._tokenize(text)
        if not tokens:
            return {}

        # Term frequency
        tf = Counter(tokens)
        max_freq = max(tf.values())

        # Normalized TF with position weighting (terms appearing early are more important)
        importance: Dict[str, float] = {}
        token_positions: Dict[str, List[int]] = {}

        for i, token in enumerate(tokens):
            if token not in token_positions:
                token_positions[token] = []
            token_positions[token].append(i)

        for token, count in tf.items():
            # Normalized frequency
            norm_tf = count / max_freq

            # Position weight (earlier = more important)
            first_pos = token_positions[token][0]
            pos_weight = 1.0 - (first_pos / len(tokens)) * 0.3

            # Length weight (longer terms often more specific)
            len_weight = min(len(token) / 10.0, 1.0)

            importance[token] = norm_tf * pos_weight * (0.7 + 0.3 * len_weight)

        return importance

    def tag(
        self,
        text: str,
        tag_types: List[str] = None,
        max_tags: int = 15
    ) -> List[Tag]:
        """
        Generate tags for content using NLP analysis.

        Args:
            text: Content text to tag
            tag_types: List of tag types to generate (topic, skill, concept, standard)
                       If None, generates all types
            max_tags: Maximum number of tags to return

        Returns:
            List of Tag objects ordered by confidence
        """
        if not text or not text.strip():
            return []

        if tag_types is None:
            tag_types = ["topic", "skill", "concept"]

        tags: List[Tag] = []

        # Generate topic tags
        if "topic" in tag_types:
            topic_tags = self._generate_topic_tags(text)
            tags.extend(topic_tags)

        # Generate skill tags
        if "skill" in tag_types:
            skill_tags = self._generate_skill_tags(text)
            tags.extend(skill_tags)

        # Generate concept tags
        if "concept" in tag_types:
            concept_tags = self._generate_concept_tags(text)
            tags.extend(concept_tags)

        # Generate standard tags
        if "standard" in tag_types:
            standard_tags = self._generate_standard_tags(text)
            tags.extend(standard_tags)

        # Sort by confidence and limit
        tags.sort(key=lambda t: t.confidence, reverse=True)

        # Deduplicate by name (case-insensitive)
        seen = set()
        unique_tags = []
        for tag in tags:
            name_lower = tag.name.lower()
            if name_lower not in seen:
                seen.add(name_lower)
                unique_tags.append(tag)

        return unique_tags[:max_tags]

    def _generate_topic_tags(self, text: str) -> List[Tag]:
        """Generate topic tags from text."""
        text_lower = text.lower()
        tokens = set(self._tokenize(text))
        tags = []

        topic_scores: Dict[str, float] = {}

        # Match keywords to topics
        for token in tokens:
            if token in self._topic_index:
                topic = self._topic_index[token]
                topic_scores[topic] = topic_scores.get(topic, 0) + 1

        # Also check for phrase matches
        for topic, keywords in self.TOPIC_KEYWORDS.items():
            for keyword in keywords:
                if ' ' in keyword and keyword in text_lower:
                    topic_scores[topic] = topic_scores.get(topic, 0) + 2

        # Convert scores to confidence
        if topic_scores:
            max_score = max(topic_scores.values())
            for topic, score in topic_scores.items():
                confidence = min(0.5 + (score / max_score) * 0.4, 0.95)
                tags.append(Tag(
                    name=topic.title(),
                    type="topic",
                    confidence=round(confidence, 3)
                ))

        return tags

    def _generate_skill_tags(self, text: str) -> List[Tag]:
        """Generate skill tags from text."""
        text_lower = text.lower()
        tokens = set(self._tokenize(text))
        tags = []

        skill_scores: Dict[str, float] = {}

        # Match keywords to skills
        for token in tokens:
            if token in self._skill_index:
                skill = self._skill_index[token]
                skill_scores[skill] = skill_scores.get(skill, 0) + 1

        # Check for phrase matches
        for skill, keywords in self.SKILL_KEYWORDS.items():
            for keyword in keywords:
                if ' ' in keyword and keyword in text_lower:
                    skill_scores[skill] = skill_scores.get(skill, 0) + 2

        # Convert scores to confidence
        if skill_scores:
            max_score = max(skill_scores.values())
            for skill, score in skill_scores.items():
                confidence = min(0.4 + (score / max_score) * 0.4, 0.9)
                tags.append(Tag(
                    name=skill.title(),
                    type="skill",
                    confidence=round(confidence, 3)
                ))

        return tags

    def _generate_concept_tags(self, text: str) -> List[Tag]:
        """
        Generate concept tags from text using term extraction.

        Concepts are specific terms or phrases that represent key ideas.
        """
        tags = []

        # Get term importance
        importance = self._compute_term_importance(text)

        # Filter for potential concept terms
        concept_candidates = []

        for term, score in importance.items():
            # Skip very short terms
            if len(term) < 4:
                continue

            # Prefer terms that look like concepts (not common words)
            if term in self.STOP_WORDS:
                continue

            # Check if term appears in known keyword lists (indicates educational relevance)
            is_known = (term in self._topic_index or term in self._skill_index)

            adjusted_score = score
            if is_known:
                adjusted_score *= 1.5

            concept_candidates.append((term, adjusted_score))

        # Sort by score
        concept_candidates.sort(key=lambda x: x[1], reverse=True)

        # Take top candidates
        for term, score in concept_candidates[:10]:
            confidence = min(0.3 + score * 0.5, 0.85)
            tags.append(Tag(
                name=term.title(),
                type="concept",
                confidence=round(confidence, 3)
            ))

        # Also extract bigrams as potential concept phrases
        bigrams = self._extract_ngrams(text, 2)
        bigram_counts = Counter(bigrams)

        for bigram, count in bigram_counts.most_common(5):
            # Skip if contains stop words at boundaries
            words = bigram.split()
            if words[0] in self.STOP_WORDS or words[-1] in self.STOP_WORDS:
                continue

            confidence = min(0.25 + count * 0.1, 0.7)
            tags.append(Tag(
                name=bigram.title(),
                type="concept",
                confidence=round(confidence, 3)
            ))

        return tags

    def _generate_standard_tags(self, text: str) -> List[Tag]:
        """
        Generate educational standard alignment tags.

        Attempts to identify relevant Common Core State Standards.
        """
        text_lower = text.lower()
        tags = []

        for standard_prefix, data in self.CCSS_PATTERNS.items():
            pattern = data["pattern"]
            if re.search(pattern, text_lower):
                # Determine which domains might apply
                for domain_code, domain_name in data["domains"].items():
                    # Check for domain-specific keywords
                    domain_keywords = domain_name.lower().split()
                    matches = sum(1 for kw in domain_keywords if kw in text_lower)

                    if matches > 0:
                        confidence = min(0.3 + matches * 0.15, 0.75)
                        standard_code = f"{standard_prefix}.{domain_code}"
                        tags.append(Tag(
                            name=standard_code,
                            type="standard",
                            confidence=round(confidence, 3)
                        ))

        return tags

    def tag_with_taxonomy(
        self,
        text: str,
        taxonomy: Dict,
    ) -> List[Tag]:
        """
        Tag content using a provided custom taxonomy.

        Args:
            text: Content text to tag
            taxonomy: Dictionary mapping tag names to keyword lists
                      Format: {"tag_name": ["keyword1", "keyword2", ...]}

        Returns:
            List of Tag objects matching the taxonomy
        """
        if not text or not taxonomy:
            return []

        text_lower = text.lower()
        tokens = set(self._tokenize(text))
        tags = []

        for tag_name, keywords in taxonomy.items():
            score = 0
            for keyword in keywords:
                keyword_lower = keyword.lower()
                if ' ' in keyword_lower:
                    # Phrase match
                    if keyword_lower in text_lower:
                        score += 2
                else:
                    # Single word match
                    if keyword_lower in tokens:
                        score += 1

            if score > 0:
                # Normalize confidence
                max_possible = len(keywords) * 2
                confidence = min(0.3 + (score / max_possible) * 0.6, 0.95)
                tags.append(Tag(
                    name=tag_name,
                    type="custom",
                    confidence=round(confidence, 3)
                ))

        tags.sort(key=lambda t: t.confidence, reverse=True)
        return tags

    def align_to_standards(
        self,
        text: str,
        standard_set: str = "common_core",
    ) -> List[Tag]:
        """
        Align content to educational standards.

        Args:
            text: Content text to analyze
            standard_set: Standard set to use ("common_core", "ngss", etc.)

        Returns:
            List of Tag objects representing standard alignments
        """
        if standard_set == "common_core":
            return self._generate_standard_tags(text)

        # For other standard sets, return empty (can be extended)
        logger.warning(f"Standard set '{standard_set}' not implemented, using common_core")
        return self._generate_standard_tags(text)

    def filter_tags(
        self,
        tags: List[Tag],
        min_confidence: float = 0.3,
        tag_types: List[str] = None,
        max_per_type: int = 5
    ) -> List[Tag]:
        """
        Filter and rank tags by relevance.

        Args:
            tags: List of tags to filter
            min_confidence: Minimum confidence threshold
            tag_types: List of tag types to include (None = all)
            max_per_type: Maximum tags per type

        Returns:
            Filtered and ranked list of tags
        """
        # Filter by confidence
        filtered = [t for t in tags if t.confidence >= min_confidence]

        # Filter by type if specified
        if tag_types:
            filtered = [t for t in filtered if t.type in tag_types]

        # Group by type
        by_type: Dict[str, List[Tag]] = {}
        for tag in filtered:
            if tag.type not in by_type:
                by_type[tag.type] = []
            by_type[tag.type].append(tag)

        # Take top N per type
        result = []
        for tag_type, type_tags in by_type.items():
            type_tags.sort(key=lambda t: t.confidence, reverse=True)
            result.extend(type_tags[:max_per_type])

        # Sort final result by confidence
        result.sort(key=lambda t: t.confidence, reverse=True)
        return result

    def validate_tags(
        self,
        tags: List[Tag],
        allowed_tags: Set[str] = None,
        blocked_tags: Set[str] = None
    ) -> List[Tag]:
        """
        Validate tag appropriateness.

        Args:
            tags: Tags to validate
            allowed_tags: Set of allowed tag names (if provided, only these are kept)
            blocked_tags: Set of blocked tag names to remove

        Returns:
            List of validated tags
        """
        validated = []

        for tag in tags:
            tag_name_lower = tag.name.lower()

            # Check blocked list
            if blocked_tags and tag_name_lower in {b.lower() for b in blocked_tags}:
                continue

            # Check allowed list
            if allowed_tags and tag_name_lower not in {a.lower() for a in allowed_tags}:
                continue

            validated.append(tag)

        return validated

    def suggest_tags(
        self,
        text: str,
        existing_tags: List[str] = None,
        max_suggestions: int = 5
    ) -> List[Tag]:
        """
        Suggest additional tags based on content and existing tags.

        Args:
            text: Content text
            existing_tags: List of already applied tag names
            max_suggestions: Maximum number of suggestions

        Returns:
            List of suggested Tag objects
        """
        # Generate all possible tags
        all_tags = self.tag(text)

        # Filter out existing tags
        if existing_tags:
            existing_lower = {t.lower() for t in existing_tags}
            all_tags = [t for t in all_tags if t.name.lower() not in existing_lower]

        # Return top suggestions
        return all_tags[:max_suggestions]

    def get_tag_statistics(self, tags: List[Tag]) -> Dict:
        """
        Get statistics about a set of tags.

        Args:
            tags: List of tags to analyze

        Returns:
            Dictionary with tag statistics
        """
        if not tags:
            return {
                "total_count": 0,
                "by_type": {},
                "avg_confidence": 0.0,
                "min_confidence": 0.0,
                "max_confidence": 0.0
            }

        by_type: Dict[str, int] = {}
        for tag in tags:
            by_type[tag.type] = by_type.get(tag.type, 0) + 1

        confidences = [t.confidence for t in tags]

        return {
            "total_count": len(tags),
            "by_type": by_type,
            "avg_confidence": round(sum(confidences) / len(confidences), 3),
            "min_confidence": round(min(confidences), 3),
            "max_confidence": round(max(confidences), 3)
        }
