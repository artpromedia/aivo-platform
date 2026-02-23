"""
AIVO Content Safety Filter

Reusable Python module for AI content safety validation.
Equivalent to the TypeScript ContentSafetyService — 4-layer pipeline:
  1. Local Pattern Matching (PII, crisis, profanity)
  2. Age-Appropriateness Scoring (Flesch-Kincaid)
  3. FERPA/COPPA Compliance Check
  4. Toxicity Scoring (TF-IDF weighted dictionary)

Usage:
    from safety_filter import AivoSafetyFilter

    sf = AivoSafetyFilter()
    result = sf.validate(content, student_age=10, context="homework")
    if not result["safe"]:
        content = result["sanitized"]
"""

from __future__ import annotations

import hashlib
import math
import re
import time
from typing import Any

# ══════════════════════════════════════════════════════════════════════════════
# PII PATTERNS
# ══════════════════════════════════════════════════════════════════════════════

_PII_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("ssn", re.compile(r"\b\d{3}-\d{2}-\d{4}\b")),
    ("credit_card", re.compile(r"\b\d{4}[- ]\d{4}[- ]\d{4}[- ]\d{4}\b")),
    ("phone", re.compile(r"\b(\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")),
    ("email", re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")),
]

# ══════════════════════════════════════════════════════════════════════════════
# CRISIS KEYWORDS  (50+)
# ══════════════════════════════════════════════════════════════════════════════

CRISIS_TERMS: list[str] = [
    "suicide", "suicidal", "kill myself", "kill yourself", "end my life",
    "end your life", "self-harm", "self harm", "cut myself", "cutting myself",
    "hurt myself", "hurt yourself", "want to die", "wanna die", "rather be dead",
    "take my life", "take my own life", "overdose", "hang myself",
    "jump off", "slit my wrists", "pills to die", "no reason to live",
    "nobody would miss me", "better off dead", "not worth living",
    "child abuse", "child molest", "sexual abuse", "molested", "trafficking",
    "domestic violence", "being beaten", "hits me", "hurts me at home",
    "touches me", "inappropriate touching", "forced me", "rape", "raped",
    "school shooting", "shoot up", "bomb threat", "bring a gun",
    "bring a knife", "stab", "kill everyone", "murder", "mass shooting",
    "white supremacy", "ethnic cleansing", "genocide",
    "anorexia", "bulimia", "starving myself", "purging",
    "sell drugs", "buy drugs", "get high",
    "run away from home", "nobody loves me", "i am worthless",
]

_crisis_regex = re.compile(
    "|".join(re.escape(k) for k in CRISIS_TERMS),
    re.IGNORECASE,
)

# ══════════════════════════════════════════════════════════════════════════════
# PROFANITY  (60+)
# ══════════════════════════════════════════════════════════════════════════════

PROFANITY_TERMS: list[str] = [
    "fuck", "fucking", "fucker", "fucked", "motherfucker",
    "shit", "shitty", "bullshit", "horseshit",
    "ass", "asshole", "arsehole", "dumbass", "jackass", "badass",
    "bitch", "bitches", "bitching", "son of a bitch",
    "damn", "goddamn", "dammit",
    "dick", "dickhead", "cock", "cocksucker",
    "cunt", "twat", "pussy",
    "bastard", "prick", "wanker", "tosser",
    "slut", "whore", "skank", "hoe",
    "nigger", "nigga", "faggot", "fag", "dyke", "retard", "retarded",
    "spic", "chink", "kike", "gook", "wetback", "beaner",
    "crap", "piss", "pissed",
    "boobs", "tits", "titties",
    "jerk off", "jack off", "blow job", "handjob",
    "porn", "pornography", "xxx",
]

_profanity_regex = re.compile(
    r"\b(?:" + "|".join(re.escape(t) for t in PROFANITY_TERMS) + r")\b",
    re.IGNORECASE,
)

# ══════════════════════════════════════════════════════════════════════════════
# ADULT THEMES
# ══════════════════════════════════════════════════════════════════════════════

_ADULT_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"\b(boyfriend|girlfriend|dating|hookup|hook up|make out|making out)\b", re.I),
    re.compile(r"\b(sexy|seductive|aroused|orgasm|erotic)\b", re.I),
    re.compile(r"\b(beer|wine|vodka|whiskey|marijuana|cocaine|heroin|meth)\b", re.I),
    re.compile(r"\b(gambling|casino|bet money|wager)\b", re.I),
]

# ══════════════════════════════════════════════════════════════════════════════
# TOXICITY DICTIONARY  (200-term weighted)
# ══════════════════════════════════════════════════════════════════════════════

TOXICITY_DICT: dict[str, float] = {
    # Hate / identity attacks
    "hate": 0.9, "hatred": 0.9, "racist": 1.0, "racism": 1.0,
    "sexist": 0.95, "sexism": 0.95, "bigot": 0.9, "bigotry": 0.9,
    "homophobic": 0.95, "transphobic": 0.95, "xenophobic": 0.95,
    "misogyny": 0.95, "misogynist": 0.95,
    "supremacist": 1.0, "supremacy": 1.0, "inferior": 0.8, "subhuman": 1.0,
    # Threats / violence
    "kill": 0.85, "murder": 0.95, "attack": 0.7, "assault": 0.8,
    "destroy": 0.6, "threaten": 0.8, "threat": 0.8,
    "strangle": 0.9, "stab": 0.9, "shoot": 0.85, "execute": 0.8,
    "torture": 0.95, "maim": 0.9, "slaughter": 0.95,
    "beat": 0.5, "punch": 0.6, "kick": 0.5, "fight": 0.4,
    "weapon": 0.7, "bomb": 0.85, "explosive": 0.85, "gun": 0.7, "knife": 0.6,
    # Insults
    "stupid": 0.5, "idiot": 0.6, "moron": 0.65, "dumb": 0.5,
    "loser": 0.5, "pathetic": 0.55, "worthless": 0.65,
    "ugly": 0.5, "disgusting": 0.55, "revolting": 0.5,
    "trash": 0.5, "garbage": 0.45, "useless": 0.5,
    "incompetent": 0.5, "failure": 0.45, "weak": 0.4,
    "lame": 0.4, "annoying": 0.35, "irritating": 0.35,
    "creep": 0.5, "creepy": 0.5, "freak": 0.5, "weirdo": 0.5,
    # Profanity / vulgarity
    "fuck": 0.8, "shit": 0.7, "ass": 0.5, "bitch": 0.75,
    "damn": 0.4, "hell": 0.35, "crap": 0.35,
    "dick": 0.65, "cock": 0.7, "pussy": 0.7, "cunt": 0.9,
    "slut": 0.8, "whore": 0.8, "bastard": 0.6,
    # Harassment
    "bully": 0.7, "bullying": 0.7, "harass": 0.8, "harassment": 0.8,
    "stalk": 0.8, "stalking": 0.8, "intimidate": 0.7, "intimidation": 0.7,
    "humiliate": 0.7, "humiliation": 0.7, "shame": 0.5, "shaming": 0.55,
    "mock": 0.5, "mocking": 0.5, "ridicule": 0.55,
    "tease": 0.4, "taunt": 0.5, "belittle": 0.55,
    "exclude": 0.45, "ostracize": 0.5, "isolate": 0.4,
    # Self-harm / mental health crisis
    "suicide": 1.0, "suicidal": 1.0, "selfharm": 1.0,
    "overdose": 0.9, "cutting": 0.6, "depressed": 0.4,
    "hopeless": 0.5, "worthlessness": 0.6,
    # Sexual content
    "porn": 0.95, "pornography": 0.95, "nude": 0.7, "naked": 0.6,
    "erotic": 0.8, "orgasm": 0.9, "fetish": 0.85,
    "sexy": 0.5, "seductive": 0.6, "aroused": 0.7,
    # Substance abuse
    "cocaine": 0.8, "heroin": 0.8, "meth": 0.8, "marijuana": 0.5,
    "weed": 0.45, "drugs": 0.5, "drunk": 0.5, "alcohol": 0.4,
    "overdosed": 0.9, "intoxicated": 0.5, "stoned": 0.5,
    # Manipulation / deception
    "manipulate": 0.5, "deceive": 0.5, "exploit": 0.55,
    "cheat": 0.5, "fraud": 0.55, "scam": 0.55,
    "lie": 0.35, "lying": 0.4, "dishonest": 0.4,
    # Negative emotional intensifiers
    "terrible": 0.3, "horrible": 0.35, "awful": 0.3,
    "dreadful": 0.3, "abysmal": 0.3, "miserable": 0.35,
    "atrocious": 0.35, "vile": 0.45, "wretched": 0.35,
    # Dangerous / illegal behaviour
    "steal": 0.6, "stealing": 0.6, "robbery": 0.65, "arson": 0.75,
    "vandalism": 0.6, "trafficking": 0.8, "smuggle": 0.7,
    "kidnap": 0.85, "ransom": 0.7, "blackmail": 0.7, "extortion": 0.7,
    # Extremism
    "terrorist": 0.95, "terrorism": 0.95, "extremist": 0.85,
    "radicalize": 0.9, "jihad": 0.85, "militia": 0.6,
    "propaganda": 0.55, "indoctrinate": 0.7,
    # Misc negative
    "suck": 0.35, "sucks": 0.35, "stink": 0.3, "stinks": 0.3,
    "boring": 0.2, "liar": 0.45, "coward": 0.4, "jerk": 0.45,
    "nerd": 0.3, "dork": 0.3, "geek": 0.25,
    "shut": 0.25, "shutup": 0.4,
}

# ══════════════════════════════════════════════════════════════════════════════
# FERPA PATTERNS
# ══════════════════════════════════════════════════════════════════════════════

_OTHER_STUDENT_PATTERNS = [
    re.compile(
        r"\b(another student|other student|classmate|peer)\b.*\b(score|grade|IEP|disability|diagnosis)\b",
        re.I,
    ),
    re.compile(
        r"\b(score|grade|IEP|disability|diagnosis)\b.*\b(another student|other student|classmate|peer)\b",
        re.I,
    ),
    re.compile(r"\bstudent\s+(?:named|called)\s+[A-Z][a-z]+"),
]

_TEACHER_INFO_PATTERNS = [
    re.compile(r"\b(teacher|instructor|professor)\b.*\b(home|address|phone|salary|ssn)\b", re.I),
    re.compile(r"\b(home|address|phone|salary|ssn)\b.*\b(teacher|instructor|professor)\b", re.I),
]

_IEP_PATTERNS = [
    re.compile(
        r"\b(IEP|individualized education|accommodation|504 plan)\b.*\b(for|about|regarding)\s+[A-Z][a-z]+",
        re.I,
    ),
    re.compile(
        r"\b[A-Z][a-z]+('s)?\s+(IEP|individualized education|accommodation|504 plan)\b",
        re.I,
    ),
]

_IDENTIFYING_FIELDS = [
    re.compile(r"\bage\s*:?\s*\d+", re.I),
    re.compile(r"\bgrade\s*:?\s*\d+", re.I),
    re.compile(r"\bschool\s*:?\s*[A-Z]", re.I),
    re.compile(r"\bclass\s*:?\s*\d", re.I),
]


# ══════════════════════════════════════════════════════════════════════════════
# FLESCH-KINCAID HELPERS
# ══════════════════════════════════════════════════════════════════════════════


def _count_syllables(word: str) -> int:
    w = re.sub(r"[^a-z]", "", word.lower())
    if len(w) <= 2:
        return 1
    count = 0
    prev_vowel = False
    vowels = "aeiouy"
    for ch in w:
        is_vowel = ch in vowels
        if is_vowel and not prev_vowel:
            count += 1
        prev_vowel = is_vowel
    if w.endswith("e") and count > 1:
        count -= 1
    return max(count, 1)


def _flesch_kincaid_grade(text: str) -> float:
    sentences = [s.strip() for s in re.split(r"[.!?]+", text) if s.strip()]
    words = [re.sub(r"[^a-zA-Z0-9']", "", w) for w in text.split()]
    words = [w for w in words if w]
    if not sentences or not words:
        return 0.0
    total_syllables = sum(_count_syllables(w) for w in words)
    avg_wps = len(words) / len(sentences)
    avg_spw = total_syllables / len(words)
    grade = 0.39 * avg_wps + 11.8 * avg_spw - 15.59
    return max(0.0, round(grade, 1))


# ══════════════════════════════════════════════════════════════════════════════
# MAIN CLASS
# ══════════════════════════════════════════════════════════════════════════════


class AivoSafetyFilter:
    """
    Content safety filter for AI-generated educational content.

    Runs a 4-layer pipeline equivalent to the TypeScript ContentSafetyService.
    """

    # ── Layer 1: Pattern Matching ────────────────────────────────────────────

    @staticmethod
    def _run_pattern_matching(content: str) -> list[dict[str, Any]]:
        flags: list[dict[str, Any]] = []

        # PII
        for name, pattern in _PII_PATTERNS:
            if pattern.search(content):
                flags.append({
                    "layer": "pattern",
                    "type": f"pii_{name}",
                    "severity": "critical",
                    "detail": f"Detected PII pattern: {name}",
                })

        # Crisis
        m = _crisis_regex.search(content)
        if m:
            flags.append({
                "layer": "pattern",
                "type": "crisis_content",
                "severity": "critical",
                "detail": f'Crisis keyword detected: "{m.group()}"',
            })

        # Profanity
        m = _profanity_regex.search(content)
        if m:
            flags.append({
                "layer": "pattern",
                "type": "profanity",
                "severity": "high",
                "detail": f'Profanity detected: "{m.group()}"',
            })

        return flags

    # ── Layer 2: Age-Appropriateness ─────────────────────────────────────────

    @staticmethod
    def _run_age_check(
        content: str, student_age: int | None = None
    ) -> list[dict[str, Any]]:
        flags: list[dict[str, Any]] = []
        grade_level = _flesch_kincaid_grade(content)

        if student_age is not None:
            if student_age < 8 and grade_level > 5:
                flags.append({
                    "layer": "age",
                    "type": "too_complex",
                    "severity": "medium",
                    "detail": f"Grade level {grade_level} too complex for age {student_age}",
                })
            elif student_age < 13 and grade_level > 9:
                flags.append({
                    "layer": "age",
                    "type": "too_complex",
                    "severity": "low",
                    "detail": f"Grade level {grade_level} may be too complex for age {student_age}",
                })

        # Adult themes
        for pat in _ADULT_PATTERNS:
            if pat.search(content):
                flags.append({
                    "layer": "age",
                    "type": "adult_theme",
                    "severity": "high",
                    "detail": "Adult theme detected in content",
                })
                break

        return flags

    # ── Layer 3: FERPA / COPPA ───────────────────────────────────────────────

    @staticmethod
    def _run_ferpa_check(content: str) -> list[dict[str, Any]]:
        flags: list[dict[str, Any]] = []

        for pat in _OTHER_STUDENT_PATTERNS:
            if pat.search(content):
                flags.append({
                    "layer": "ferpa",
                    "type": "other_student_data",
                    "severity": "critical",
                    "detail": "Content may contain information about another student (FERPA violation)",
                })
                break

        for pat in _TEACHER_INFO_PATTERNS:
            if pat.search(content):
                flags.append({
                    "layer": "ferpa",
                    "type": "teacher_personal_info",
                    "severity": "high",
                    "detail": "Content may contain teacher personal information",
                })
                break

        for pat in _IEP_PATTERNS:
            if pat.search(content):
                flags.append({
                    "layer": "ferpa",
                    "type": "iep_disclosure",
                    "severity": "critical",
                    "detail": "Content may disclose IEP/504 plan information",
                })
                break

        match_count = sum(1 for p in _IDENTIFYING_FIELDS if p.search(content))
        if match_count >= 3:
            flags.append({
                "layer": "ferpa",
                "type": "data_aggregation_risk",
                "severity": "medium",
                "detail": f"Content contains {match_count} student-identifying fields",
            })

        return flags

    # ── Layer 4: Toxicity Scoring ────────────────────────────────────────────

    @staticmethod
    def _run_toxicity(content: str) -> tuple[list[dict[str, Any]], float]:
        flags: list[dict[str, Any]] = []
        lower = content.lower()
        words = lower.split()
        if not words:
            return flags, 0.0

        weighted_sum = 0.0
        match_count = 0
        terms = list(TOXICITY_DICT.keys())

        for i, term in enumerate(terms):
            weight = TOXICITY_DICT[term]
            pat = re.compile(r"\b" + re.escape(term) + r"\b", re.I)
            matches = pat.findall(lower)
            if matches:
                tf = len(matches) / len(words)
                idf = 1 + math.log(200 / (1 + i * 0.1))
                weighted_sum += tf * idf * weight
                match_count += len(matches)

        toxicity_score = min(1.0, weighted_sum * 10)

        if toxicity_score > 0.4:
            if toxicity_score > 0.8:
                severity = "critical"
            elif toxicity_score > 0.6:
                severity = "high"
            else:
                severity = "medium"

            flags.append({
                "layer": "toxicity",
                "type": "toxic_content",
                "severity": severity,
                "detail": f"Toxicity score {toxicity_score:.2f} exceeds 0.4 threshold ({match_count} toxic terms)",
            })

        return flags, toxicity_score

    # ── Sanitization ─────────────────────────────────────────────────────────

    def sanitize(self, content: str) -> str:
        """Replace PII and crisis content with safe placeholders."""
        sanitized = content
        for _, pattern in _PII_PATTERNS:
            sanitized = pattern.sub("[REDACTED]", sanitized)
        sanitized = _crisis_regex.sub("[CONTENT REMOVED]", sanitized)
        sanitized = _profanity_regex.sub("[CONTENT REMOVED]", sanitized)
        return sanitized

    # ── Main Validator ───────────────────────────────────────────────────────

    def validate(
        self,
        content: str,
        student_age: int | None = None,
        context: str = "general",
    ) -> dict[str, Any]:
        """
        Validate AI-generated content through the 4-layer pipeline.

        Returns:
            dict with keys: safe, score, flags, sanitized, processing_ms
        """
        start = time.perf_counter()

        pattern_flags = self._run_pattern_matching(content)
        age_flags = self._run_age_check(content, student_age)
        ferpa_flags = self._run_ferpa_check(content)
        toxicity_flags, toxicity_score = self._run_toxicity(content)

        all_flags = pattern_flags + age_flags + ferpa_flags + toxicity_flags

        # Compute aggregate score
        score = 1.0
        for flag in all_flags:
            sev = flag["severity"]
            if sev == "critical":
                score -= 0.4
            elif sev == "high":
                score -= 0.25
            elif sev == "medium":
                score -= 0.15
            else:
                score -= 0.05

        if toxicity_score > 0:
            score -= toxicity_score * 0.3

        score = max(0.0, min(1.0, round(score, 2)))

        has_critical = any(f["severity"] == "critical" for f in all_flags)
        has_high = any(f["severity"] == "high" for f in all_flags)

        blocked = has_critical or has_high or score < 0.6

        sanitized = self.sanitize(content)
        processing_ms = round((time.perf_counter() - start) * 1000, 2)

        return {
            "safe": not blocked,
            "score": score,
            "flags": all_flags,
            "sanitized": sanitized,
            "blocked_reason": (
                "; ".join(
                    f["detail"]
                    for f in all_flags
                    if f["severity"] in ("critical", "high")
                )
                if blocked
                else None
            ),
            "processing_ms": processing_ms,
            "content_hash": hashlib.sha256(content.encode()).hexdigest()[:16],
        }
