"""
Dyslexia Support Module.

Provides AI-powered support for learners with dyslexia,
including reading accommodations, text formatting, phonological support,
and writing assistance.
"""

from .models import (
    DyslexiaProfile,
    ReadingPreferences,
    WritingSupport,
    TextFormat,
    DecodingStrategy,
)
from .service import (
    DyslexiaSupportService,
    InMemoryDyslexiaProfileRepository,
)
from .reading_support import ReadingSupportService
from .writing_support import WritingSupportService

__all__ = [
    # Main service
    "DyslexiaSupportService",
    "InMemoryDyslexiaProfileRepository",
    # Component services
    "ReadingSupportService",
    "WritingSupportService",
    # Models
    "DyslexiaProfile",
    "ReadingPreferences",
    "WritingSupport",
    "TextFormat",
    "DecodingStrategy",
]
