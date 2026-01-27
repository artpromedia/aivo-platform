"""
Readability Analyzer

Analyze text readability and complexity using multiple metrics.
"""
import logging
import re
import math
from dataclasses import dataclass
from typing import Dict, List, Set, Tuple

logger = logging.getLogger(__name__)


@dataclass
class ReadabilityAnalysis:
    flesch_kincaid_grade: float
    flesch_reading_ease: float
    gunning_fog: float
    smog_index: float
    dale_chall: float
    average_grade_level: float
    vocabulary_difficulty: float


class ReadabilityAnalyzer:
    """
    Analyze text readability using multiple metrics.

    Metrics:
    - Flesch-Kincaid Grade Level
    - Flesch Reading Ease
    - Gunning Fog Index
    - SMOG Index
    - Dale-Chall Readability Score

    Usage:
        analyzer = ReadabilityAnalyzer()
        result = analyzer.analyze("The mitochondria is...")
    """

    # Dale-Chall list of simple words (common words understood by 4th graders)
    # This is a subset of the full 3000-word list
    SIMPLE_WORDS: Set[str] = {
        'a', 'able', 'about', 'above', 'act', 'add', 'afraid', 'after', 'again',
        'against', 'age', 'ago', 'agree', 'air', 'all', 'allow', 'almost', 'alone',
        'along', 'already', 'also', 'always', 'am', 'among', 'an', 'and', 'angry',
        'animal', 'another', 'answer', 'any', 'appear', 'apple', 'are', 'area',
        'arm', 'around', 'arrive', 'art', 'as', 'ask', 'at', 'away', 'baby', 'back',
        'bad', 'bag', 'ball', 'bank', 'base', 'be', 'bear', 'beat', 'beautiful',
        'became', 'because', 'become', 'bed', 'been', 'before', 'began', 'begin',
        'behind', 'believe', 'bell', 'belong', 'below', 'beside', 'best', 'better',
        'between', 'big', 'bird', 'bit', 'black', 'block', 'blood', 'blow', 'blue',
        'board', 'boat', 'body', 'bone', 'book', 'born', 'both', 'bottom', 'box',
        'boy', 'branch', 'bread', 'break', 'bridge', 'bright', 'bring', 'brother',
        'brought', 'brown', 'build', 'burn', 'busy', 'but', 'buy', 'by', 'call',
        'came', 'can', 'car', 'card', 'care', 'carry', 'case', 'cat', 'catch',
        'caught', 'cause', 'center', 'certain', 'chair', 'chance', 'change', 'check',
        'child', 'children', 'church', 'circle', 'city', 'class', 'clean', 'clear',
        'climb', 'close', 'clothes', 'cloud', 'coat', 'cold', 'color', 'come',
        'common', 'company', 'complete', 'contain', 'continue', 'cook', 'cool',
        'copy', 'corn', 'corner', 'correct', 'cost', 'could', 'count', 'country',
        'course', 'cover', 'cow', 'cross', 'crowd', 'cry', 'cup', 'cut', 'dance',
        'danger', 'dark', 'day', 'dead', 'deal', 'dear', 'death', 'decide', 'deep',
        'did', 'die', 'different', 'dinner', 'direct', 'discover', 'do', 'doctor',
        'does', 'dog', 'dollar', 'done', 'door', 'double', 'down', 'draw', 'dream',
        'dress', 'drink', 'drive', 'drop', 'dry', 'during', 'each', 'ear', 'early',
        'earth', 'east', 'easy', 'eat', 'edge', 'effect', 'egg', 'eight', 'either',
        'else', 'end', 'enemy', 'enjoy', 'enough', 'enter', 'equal', 'even',
        'evening', 'ever', 'every', 'exact', 'example', 'except', 'excite', 'expect',
        'experience', 'explain', 'eye', 'face', 'fact', 'fail', 'fair', 'fall',
        'family', 'famous', 'far', 'farm', 'fast', 'father', 'fear', 'feed', 'feel',
        'feet', 'fell', 'felt', 'few', 'field', 'fight', 'fill', 'final', 'find',
        'fine', 'finger', 'finish', 'fire', 'first', 'fish', 'fit', 'five', 'floor',
        'flow', 'flower', 'fly', 'follow', 'food', 'foot', 'for', 'force', 'forest',
        'forget', 'form', 'forward', 'found', 'four', 'free', 'fresh', 'friend',
        'from', 'front', 'fruit', 'full', 'fun', 'game', 'garden', 'gas', 'gate',
        'gather', 'gave', 'general', 'gentle', 'get', 'girl', 'give', 'glad',
        'glass', 'go', 'god', 'gold', 'gone', 'good', 'got', 'govern', 'grass',
        'gray', 'great', 'green', 'grew', 'ground', 'group', 'grow', 'guess',
        'gun', 'had', 'hair', 'half', 'hall', 'hand', 'hang', 'happen', 'happy',
        'hard', 'has', 'hat', 'have', 'he', 'head', 'hear', 'heard', 'heart',
        'heat', 'heavy', 'held', 'help', 'her', 'here', 'herself', 'high', 'hill',
        'him', 'himself', 'his', 'hit', 'hold', 'hole', 'home', 'hope', 'horse',
        'hot', 'hotel', 'hour', 'house', 'how', 'however', 'huge', 'human',
        'hundred', 'hung', 'hunt', 'hurry', 'hurt', 'i', 'ice', 'idea', 'if', 'ill',
        'important', 'in', 'inch', 'include', 'increase', 'indeed', 'inside',
        'instead', 'interest', 'into', 'iron', 'is', 'island', 'it', 'its',
        'itself', 'job', 'join', 'joy', 'jump', 'just', 'keep', 'kept', 'key',
        'kill', 'kind', 'king', 'knew', 'knife', 'knock', 'know', 'known', 'lady',
        'laid', 'lake', 'land', 'language', 'large', 'last', 'late', 'later',
        'laugh', 'law', 'lay', 'lead', 'learn', 'least', 'leave', 'led', 'left',
        'leg', 'less', 'let', 'letter', 'lie', 'life', 'lift', 'light', 'like',
        'line', 'lion', 'list', 'listen', 'little', 'live', 'long', 'look', 'lose',
        'lost', 'lot', 'loud', 'love', 'low', 'machine', 'made', 'main', 'major',
        'make', 'man', 'many', 'map', 'mark', 'market', 'master', 'matter', 'may',
        'maybe', 'me', 'mean', 'measure', 'meat', 'meet', 'member', 'men', 'mention',
        'middle', 'might', 'mile', 'milk', 'million', 'mind', 'mine', 'minute',
        'miss', 'moment', 'money', 'month', 'moon', 'more', 'morning', 'most',
        'mother', 'mountain', 'mouth', 'move', 'much', 'music', 'must', 'my',
        'myself', 'name', 'nation', 'nature', 'near', 'necessary', 'neck', 'need',
        'never', 'new', 'news', 'next', 'nice', 'night', 'nine', 'no', 'noise',
        'none', 'noon', 'nor', 'north', 'nose', 'not', 'note', 'nothing', 'notice',
        'now', 'number', 'object', 'observe', 'ocean', 'of', 'off', 'offer',
        'office', 'often', 'oil', 'old', 'on', 'once', 'one', 'only', 'open', 'or',
        'order', 'other', 'our', 'out', 'outside', 'over', 'own', 'page', 'paid',
        'paint', 'pair', 'paper', 'parent', 'park', 'part', 'party', 'pass', 'past',
        'pay', 'peace', 'people', 'perhaps', 'period', 'person', 'pick', 'picture',
        'piece', 'place', 'plain', 'plan', 'plane', 'plant', 'play', 'please',
        'plural', 'poem', 'point', 'poor', 'popular', 'position', 'possible',
        'pound', 'power', 'prepare', 'present', 'president', 'pretty', 'price',
        'print', 'probably', 'problem', 'produce', 'promise', 'proper', 'protect',
        'proud', 'provide', 'public', 'pull', 'purpose', 'push', 'put', 'question',
        'quick', 'quiet', 'quite', 'race', 'radio', 'rain', 'raise', 'ran', 'range',
        'rather', 'reach', 'read', 'ready', 'real', 'really', 'reason', 'receive',
        'record', 'red', 'remain', 'remember', 'report', 'represent', 'rest',
        'result', 'return', 'rich', 'ride', 'right', 'ring', 'rise', 'river',
        'road', 'rock', 'roll', 'room', 'rope', 'rose', 'round', 'row', 'rule',
        'run', 'safe', 'said', 'sail', 'salt', 'same', 'sand', 'sat', 'save', 'saw',
        'say', 'scene', 'school', 'science', 'sea', 'season', 'seat', 'second',
        'see', 'seem', 'seen', 'self', 'sell', 'send', 'sense', 'sent', 'sentence',
        'separate', 'serve', 'set', 'settle', 'seven', 'several', 'shake', 'shall',
        'shape', 'share', 'she', 'ship', 'shoe', 'shop', 'shore', 'short', 'should',
        'shoulder', 'shout', 'show', 'shut', 'sick', 'side', 'sight', 'sign',
        'silent', 'silver', 'similar', 'simple', 'since', 'sing', 'single', 'sir',
        'sister', 'sit', 'six', 'size', 'skin', 'sky', 'sleep', 'slow', 'small',
        'smell', 'smile', 'smoke', 'snow', 'so', 'soft', 'soil', 'soldier', 'some',
        'son', 'song', 'soon', 'sort', 'sound', 'south', 'space', 'speak',
        'special', 'speed', 'spell', 'spend', 'spoke', 'spot', 'spread', 'spring',
        'square', 'stage', 'stand', 'star', 'start', 'state', 'station', 'stay',
        'step', 'stick', 'still', 'stock', 'stone', 'stood', 'stop', 'store',
        'storm', 'story', 'straight', 'strange', 'stream', 'street', 'stretch',
        'string', 'strong', 'student', 'study', 'subject', 'such', 'sudden',
        'suffer', 'sugar', 'suggest', 'suit', 'summer', 'sun', 'supply', 'support',
        'suppose', 'sure', 'surface', 'surprise', 'sweet', 'swim', 'system',
        'table', 'tail', 'take', 'talk', 'tall', 'taste', 'teach', 'teacher',
        'team', 'tell', 'ten', 'term', 'test', 'than', 'thank', 'that', 'the',
        'their', 'them', 'themselves', 'then', 'there', 'these', 'they', 'thick',
        'thin', 'thing', 'think', 'third', 'this', 'those', 'though', 'thought',
        'thousand', 'three', 'through', 'throw', 'thus', 'tie', 'time', 'tiny',
        'to', 'today', 'together', 'told', 'tomorrow', 'tone', 'too', 'took',
        'tool', 'top', 'total', 'touch', 'toward', 'town', 'trade', 'train',
        'travel', 'tree', 'trip', 'trouble', 'true', 'trust', 'try', 'turn',
        'twelve', 'twenty', 'two', 'type', 'under', 'understand', 'unit', 'until',
        'up', 'upon', 'us', 'use', 'usual', 'valley', 'value', 'various', 'very',
        'view', 'village', 'visit', 'voice', 'wait', 'walk', 'wall', 'want', 'war',
        'warm', 'was', 'wash', 'watch', 'water', 'wave', 'way', 'we', 'wear',
        'weather', 'week', 'weight', 'well', 'went', 'were', 'west', 'what',
        'wheel', 'when', 'where', 'whether', 'which', 'while', 'white', 'who',
        'whole', 'whose', 'why', 'wide', 'wife', 'wild', 'will', 'win', 'wind',
        'window', 'winter', 'wire', 'wise', 'wish', 'with', 'within', 'without',
        'woman', 'women', 'wonder', 'wood', 'word', 'work', 'world', 'worry',
        'worth', 'would', 'write', 'wrong', 'wrote', 'yard', 'year', 'yellow',
        'yes', 'yesterday', 'yet', 'you', 'young', 'your', 'yourself', 'zero'
    }

    # Common suffixes that add syllables
    SYLLABLE_SUFFIXES: List[str] = ['es', 'ed', 'ing', 'tion', 'sion', 'ous', 'ious']

    def __init__(self):
        """Initialize the ReadabilityAnalyzer."""
        logger.info("ReadabilityAnalyzer initialized")

    def _count_syllables(self, word: str) -> int:
        """
        Count syllables in a word using vowel patterns.

        Args:
            word: Word to count syllables for

        Returns:
            Number of syllables (minimum 1)
        """
        word = word.lower().strip()
        if not word:
            return 0

        # Special cases
        if len(word) <= 3:
            return 1

        # Count vowel groups
        vowels = 'aeiouy'
        count = 0
        prev_is_vowel = False

        for i, char in enumerate(word):
            is_vowel = char in vowels
            if is_vowel and not prev_is_vowel:
                count += 1
            prev_is_vowel = is_vowel

        # Adjust for silent e
        if word.endswith('e') and count > 1:
            count -= 1

        # Adjust for common endings
        if word.endswith('le') and len(word) > 2 and word[-3] not in vowels:
            count += 1

        # Handle -ed endings
        if word.endswith('ed') and len(word) > 2:
            if word[-3] not in 'dt':
                count = max(count - 1, 1)

        # Minimum 1 syllable
        return max(count, 1)

    def _tokenize(self, text: str) -> List[str]:
        """Extract words from text."""
        return re.findall(r'\b[a-zA-Z]+\b', text.lower())

    def _count_sentences(self, text: str) -> int:
        """Count sentences in text."""
        # Split on sentence terminators
        sentences = re.split(r'[.!?]+', text)
        # Filter empty strings
        sentences = [s.strip() for s in sentences if s.strip()]
        return max(len(sentences), 1)

    def _is_complex_word(self, word: str) -> bool:
        """
        Check if word is complex (3+ syllables, not proper noun or compound).

        Args:
            word: Word to check

        Returns:
            True if word is complex
        """
        syllables = self._count_syllables(word)
        if syllables < 3:
            return False

        # Don't count common suffixes that artificially inflate syllable count
        word_lower = word.lower()
        for suffix in ['ed', 'es', 'ing', 'ly']:
            if word_lower.endswith(suffix):
                base_syllables = self._count_syllables(word_lower[:-len(suffix)])
                if base_syllables < 3:
                    return False

        return True

    def _compute_flesch_kincaid_grade(
        self, words: int, sentences: int, syllables: int
    ) -> float:
        """
        Compute Flesch-Kincaid Grade Level.

        Formula: 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
        """
        if words == 0 or sentences == 0:
            return 0.0

        return (
            0.39 * (words / sentences) +
            11.8 * (syllables / words) -
            15.59
        )

    def _compute_flesch_reading_ease(
        self, words: int, sentences: int, syllables: int
    ) -> float:
        """
        Compute Flesch Reading Ease score.

        Formula: 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
        Score interpretation:
        - 90-100: Very easy (5th grade)
        - 80-90: Easy (6th grade)
        - 70-80: Fairly easy (7th grade)
        - 60-70: Standard (8th-9th grade)
        - 50-60: Fairly difficult (10th-12th grade)
        - 30-50: Difficult (college)
        - 0-30: Very difficult (college graduate)
        """
        if words == 0 or sentences == 0:
            return 100.0

        return (
            206.835 -
            1.015 * (words / sentences) -
            84.6 * (syllables / words)
        )

    def _compute_gunning_fog(
        self, words: int, sentences: int, complex_words: int
    ) -> float:
        """
        Compute Gunning Fog Index.

        Formula: 0.4 * ((words/sentences) + 100 * (complex_words/words))
        """
        if words == 0 or sentences == 0:
            return 0.0

        return 0.4 * ((words / sentences) + 100 * (complex_words / words))

    def _compute_smog_index(self, complex_words: int, sentences: int) -> float:
        """
        Compute SMOG Index.

        Formula: 1.0430 * sqrt(complex_words * (30/sentences)) + 3.1291
        Best for texts with 30+ sentences.
        """
        if sentences == 0:
            return 0.0

        return 1.0430 * math.sqrt(complex_words * (30 / sentences)) + 3.1291

    def _compute_dale_chall(
        self, words: int, sentences: int, difficult_words: int
    ) -> float:
        """
        Compute Dale-Chall Readability Score.

        Formula: 0.1579 * (difficult_words/words * 100) + 0.0496 * (words/sentences)
        Add 3.6365 if difficult_words > 5%
        """
        if words == 0 or sentences == 0:
            return 0.0

        difficult_percent = (difficult_words / words) * 100
        score = 0.1579 * difficult_percent + 0.0496 * (words / sentences)

        if difficult_percent > 5:
            score += 3.6365

        return score

    def analyze(self, text: str) -> ReadabilityAnalysis:
        """
        Analyze readability of text using multiple metrics.

        Args:
            text: Text to analyze

        Returns:
            ReadabilityAnalysis with all metrics
        """
        if not text or not text.strip():
            return ReadabilityAnalysis(
                flesch_kincaid_grade=0.0,
                flesch_reading_ease=100.0,
                gunning_fog=0.0,
                smog_index=0.0,
                dale_chall=0.0,
                average_grade_level=0.0,
                vocabulary_difficulty=0.0
            )

        words = self._tokenize(text)
        word_count = len(words)
        sentence_count = self._count_sentences(text)

        # Count syllables
        total_syllables = sum(self._count_syllables(w) for w in words)

        # Count complex words (3+ syllables)
        complex_word_count = sum(1 for w in words if self._is_complex_word(w))

        # Count difficult words (not in Dale-Chall list)
        difficult_word_count = sum(
            1 for w in words if w.lower() not in self.SIMPLE_WORDS
        )

        # Compute metrics
        fk_grade = self._compute_flesch_kincaid_grade(
            word_count, sentence_count, total_syllables
        )
        fre = self._compute_flesch_reading_ease(
            word_count, sentence_count, total_syllables
        )
        fog = self._compute_gunning_fog(
            word_count, sentence_count, complex_word_count
        )
        smog = self._compute_smog_index(complex_word_count, sentence_count)
        dale_chall = self._compute_dale_chall(
            word_count, sentence_count, difficult_word_count
        )

        # Compute average grade level from metrics
        # Exclude SMOG if fewer than 30 sentences
        grades = [fk_grade, fog]
        if sentence_count >= 30:
            grades.append(smog)
        # Dale-Chall needs conversion to grade level
        dale_chall_grade = self._dale_chall_to_grade(dale_chall)
        grades.append(dale_chall_grade)

        avg_grade = sum(grades) / len(grades)

        # Vocabulary difficulty (0-1 scale)
        vocab_difficulty = difficult_word_count / max(word_count, 1)

        return ReadabilityAnalysis(
            flesch_kincaid_grade=round(max(fk_grade, 0), 2),
            flesch_reading_ease=round(max(min(fre, 100), 0), 2),
            gunning_fog=round(max(fog, 0), 2),
            smog_index=round(max(smog, 0), 2),
            dale_chall=round(dale_chall, 2),
            average_grade_level=round(max(avg_grade, 0), 2),
            vocabulary_difficulty=round(vocab_difficulty, 3)
        )

    def _dale_chall_to_grade(self, score: float) -> float:
        """Convert Dale-Chall score to approximate grade level."""
        if score <= 4.9:
            return 4.0
        elif score <= 5.9:
            return 6.0
        elif score <= 6.9:
            return 8.0
        elif score <= 7.9:
            return 10.0
        elif score <= 8.9:
            return 12.0
        else:
            return 14.0  # College level

    def estimate_grade_level(self, text: str) -> int:
        """
        Estimate reading grade level for text.

        Args:
            text: Text to analyze

        Returns:
            Estimated grade level (1-12+)
        """
        analysis = self.analyze(text)
        grade = round(analysis.average_grade_level)
        return max(1, min(grade, 16))  # Cap at 16 (college graduate)

    def suggest_simplifications(
        self, text: str, target_grade: int
    ) -> Dict[str, str]:
        """
        Suggest text simplifications for target grade level.

        Args:
            text: Text to simplify
            target_grade: Target grade level (1-12)

        Returns:
            Dictionary with 'current_grade', 'target_grade', 'suggestions',
            'difficult_words', and 'long_sentences'
        """
        analysis = self.analyze(text)
        current_grade = analysis.average_grade_level

        suggestions = []
        difficult_words = []
        long_sentences = []

        if current_grade <= target_grade:
            return {
                "current_grade": str(round(current_grade, 1)),
                "target_grade": str(target_grade),
                "suggestions": "Text is already at or below target grade level.",
                "difficult_words": "",
                "long_sentences": ""
            }

        words = self._tokenize(text)

        # Find difficult words
        for word in set(words):
            if word.lower() not in self.SIMPLE_WORDS and self._count_syllables(word) >= 3:
                difficult_words.append(word)

        # Find long sentences
        sentences = re.split(r'[.!?]+', text)
        for sentence in sentences:
            sentence = sentence.strip()
            if sentence:
                word_count = len(self._tokenize(sentence))
                # Long sentences vary by grade level
                max_words = target_grade * 2 + 5  # e.g., grade 5 = 15 words max
                if word_count > max_words:
                    long_sentences.append(f"({word_count} words) {sentence[:100]}...")

        # Generate suggestions
        if difficult_words:
            suggestions.append(
                f"Replace complex words with simpler alternatives. "
                f"Found {len(difficult_words)} difficult words."
            )

        if long_sentences:
            suggestions.append(
                f"Break up long sentences. "
                f"Found {len(long_sentences)} sentences that may be too long."
            )

        avg_syllables = sum(self._count_syllables(w) for w in words) / max(len(words), 1)
        if avg_syllables > 1.5:
            suggestions.append(
                "Use shorter words where possible. "
                f"Average syllables per word: {avg_syllables:.1f}"
            )

        if analysis.vocabulary_difficulty > 0.3:
            suggestions.append(
                "Vocabulary may be too advanced. Consider defining technical terms "
                "or using more common words."
            )

        return {
            "current_grade": str(round(current_grade, 1)),
            "target_grade": str(target_grade),
            "suggestions": " ".join(suggestions) if suggestions else "Consider shorter sentences and simpler vocabulary.",
            "difficult_words": ", ".join(difficult_words[:20]),  # Limit to 20
            "long_sentences": " | ".join(long_sentences[:5])  # Limit to 5
        }

    def identify_difficult_words(
        self, text: str, grade_level: int
    ) -> List[str]:
        """
        Identify words that may be difficult for a given grade level.

        Args:
            text: Text to analyze
            grade_level: Target grade level

        Returns:
            List of potentially difficult words
        """
        words = self._tokenize(text)
        difficult = []

        # Syllable threshold based on grade
        syllable_threshold = min(2 + (grade_level // 3), 4)

        for word in set(words):
            word_lower = word.lower()

            # Check if in simple words list
            is_simple = word_lower in self.SIMPLE_WORDS

            # Check syllable count
            syllables = self._count_syllables(word)

            # Check word length
            is_long = len(word) > 6 + grade_level

            # Determine if difficult
            if not is_simple and (syllables >= syllable_threshold or is_long):
                difficult.append(word)

        # Sort by difficulty (syllables * length)
        difficult.sort(key=lambda w: self._count_syllables(w) * len(w), reverse=True)

        return difficult

    def get_reading_time(self, text: str, wpm: int = 200) -> Dict[str, float]:
        """
        Estimate reading time for text.

        Args:
            text: Text to analyze
            wpm: Words per minute (default 200 for average adult)

        Returns:
            Dictionary with reading time estimates
        """
        words = self._tokenize(text)
        word_count = len(words)

        # Adjust WPM based on complexity
        analysis = self.analyze(text)
        complexity_factor = 1.0 + (analysis.vocabulary_difficulty * 0.3)

        adjusted_wpm = wpm / complexity_factor

        minutes = word_count / adjusted_wpm
        seconds = (minutes % 1) * 60

        return {
            "word_count": word_count,
            "estimated_minutes": round(minutes),
            "estimated_seconds": round(seconds),
            "adjusted_wpm": round(adjusted_wpm, 1)
        }
