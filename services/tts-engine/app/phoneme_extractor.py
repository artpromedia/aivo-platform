"""
Phoneme Extractor with Timing

Uses piper-phonemize (espeak-ng backend) to extract IPA phonemes
from text and estimates timing based on audio duration.

The timing is distributed proportionally across phonemes since
Piper doesn't natively expose per-phoneme timestamps. This produces
smooth enough lip-sync for animated 2D characters.
"""

import logging
from typing import Any

logger = logging.getLogger(__name__)

# Average relative duration weights for phoneme classes.
# Vowels are longer than consonants, stops are shortest.
PHONEME_DURATION_WEIGHTS: dict[str, float] = {
    # Vowels (longer)
    "a": 1.4, "e": 1.3, "i": 1.2, "o": 1.4, "u": 1.3,
    "\u0251": 1.5, "\u00e6": 1.4, "\u025b": 1.3, "\u026a": 1.1,
    "\u0254": 1.4, "\u028a": 1.2, "\u028c": 1.3, "\u0259": 0.9,
    "\u025d": 1.3, "\u025a": 1.0,
    # Diphthongs (longest)
    "a\u026a": 1.8, "a\u028a": 1.8, "\u0254\u026a": 1.8,
    "e\u026a": 1.7, "o\u028a": 1.7,
    # Fricatives (medium)
    "f": 1.0, "v": 0.9, "\u03b8": 1.0, "\u00f0": 0.8, "s": 1.1,
    "z": 1.0, "\u0283": 1.1, "\u0292": 1.0, "h": 0.7,
    # Stops (short)
    "p": 0.5, "b": 0.5, "t": 0.5, "d": 0.5, "k": 0.5, "g": 0.5,
    # Nasals
    "m": 0.8, "n": 0.8, "\u014b": 0.8,
    # Liquids/Glides
    "l": 0.8, "\u0279": 0.9, "w": 0.7, "j": 0.7,
    # Affricates
    "t\u0283": 0.8, "d\u0292": 0.8,
    # Silence/pause
    " ": 0.3, "": 0.1,
}

# Locale → espeak language code mapping
_LOCALE_TO_ESPEAK: dict[str, str] = {
    "en-US": "en-us",
    "en-GB": "en-gb",
    "es-MX": "es-419",
    "es-ES": "es",
    "fr-FR": "fr-fr",
    "de-DE": "de",
    "pt-BR": "pt-br",
    "it-IT": "it",
    "nl-NL": "nl",
    "ru-RU": "ru",
    "zh-CN": "cmn",
    "ja-JP": "ja",
    "ko-KR": "ko",
    "hi-IN": "hi",
    "ar-SA": "ar",
    "sw-KE": "sw",
    "tr-TR": "tr",
    "id-ID": "id",
}


def extract_phonemes_with_timing(
    text: str,
    locale: str = "en-US",
    audio_duration_ms: float = 1000.0,
) -> list[dict[str, Any]]:
    """
    Extract phonemes from text and estimate timing.

    Uses espeak-ng via piper_phonemize for IPA phoneme extraction,
    then distributes timing proportionally based on phoneme duration
    weights.

    Args:
        text: Input text to phonemize
        locale: Locale for phonemization rules
        audio_duration_ms: Total audio duration to distribute across
                          phonemes

    Returns:
        List of dicts with offset_ms, phoneme, duration_ms
    """
    try:
        from piper_phonemize import phonemize_espeak

        # Get espeak language code from locale
        espeak_lang = _locale_to_espeak(locale)

        # Phonemize the text
        phoneme_result = phonemize_espeak(text, espeak_lang)

        # Flatten phoneme list
        phonemes: list[str] = []
        for sentence_phonemes in phoneme_result:
            for phoneme_group in sentence_phonemes:
                for phoneme in phoneme_group:
                    if phoneme.strip():
                        phonemes.append(phoneme.strip())
                # Add pause between words
                phonemes.append(" ")

        if not phonemes:
            return []

        # Remove trailing pause
        if phonemes and phonemes[-1] == " ":
            phonemes.pop()

        # Calculate weighted durations
        total_weight = sum(
            PHONEME_DURATION_WEIGHTS.get(p, 0.8) for p in phonemes
        )

        if total_weight == 0:
            return []

        # Distribute audio duration proportionally
        events: list[dict[str, Any]] = []
        current_offset_ms = 0.0

        for phoneme in phonemes:
            weight = PHONEME_DURATION_WEIGHTS.get(phoneme, 0.8)
            duration_ms = (weight / total_weight) * audio_duration_ms

            events.append({
                "offset_ms": round(current_offset_ms, 1),
                "phoneme": phoneme,
                "duration_ms": round(duration_ms, 1),
            })

            current_offset_ms += duration_ms

        logger.debug(
            "Extracted %d phonemes from %d chars, total %.0fms",
            len(events),
            len(text),
            audio_duration_ms,
        )

        return events

    except ImportError:
        logger.warning(
            "piper_phonemize not available, using fallback estimator"
        )
        return _fallback_phoneme_estimate(text, audio_duration_ms)
    except Exception as e:
        logger.error("Phoneme extraction failed: %s", str(e))
        return _fallback_phoneme_estimate(text, audio_duration_ms)


def _fallback_phoneme_estimate(
    text: str, audio_duration_ms: float
) -> list[dict[str, Any]]:
    """
    Fallback: estimate mouth movements from text characters.
    Less accurate but works without espeak-ng.
    """
    chars = [c for c in text.lower() if c.isalpha() or c == " "]
    if not chars:
        return []

    duration_per_char = audio_duration_ms / len(chars)
    events: list[dict[str, Any]] = []

    for i, char in enumerate(chars):
        events.append({
            "offset_ms": round(i * duration_per_char, 1),
            "phoneme": char,
            "duration_ms": round(duration_per_char, 1),
        })

    return events


def _locale_to_espeak(locale: str) -> str:
    """Map locale code to espeak-ng language identifier."""
    return _LOCALE_TO_ESPEAK.get(locale, locale.split("-")[0])
