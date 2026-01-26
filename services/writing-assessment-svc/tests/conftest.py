"""
Pytest configuration and fixtures for Writing Assessment Service tests.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    """Create a test client for the FastAPI application."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def sample_essay():
    """Sample essay text for testing."""
    return """
    In this essay, I will discuss the importance of education in modern society.
    Education is fundamental to personal and societal development.

    First, education provides individuals with knowledge and skills necessary
    for success in the workforce. Students learn critical thinking, problem-solving,
    and communication skills that are valuable in any career.

    Furthermore, education promotes social mobility. It gives people from
    disadvantaged backgrounds the opportunity to improve their circumstances.
    Studies have shown that higher education levels correlate with better
    employment outcomes and higher incomes.

    Additionally, education fosters civic engagement. Educated citizens are
    more likely to participate in democratic processes, volunteer in their
    communities, and contribute to public discourse.

    In conclusion, education is essential for individual success and societal
    progress. Investing in education benefits everyone and creates a more
    prosperous and equitable society.
    """


@pytest.fixture
def short_text():
    """Short text sample for testing."""
    return "This is a short text sample for testing purposes."


@pytest.fixture
def text_with_errors():
    """Text with grammar and spelling errors."""
    return """
    Their are many reasons why education is importent.
    First of all, it help people get good jobs. Second, it makes
    people smarter.  Also it is good for socety.
    In conclussion, education is very importent for evryone.
    """


@pytest.fixture
def academic_text():
    """Academic-style text for testing."""
    return """
    The phenomenon of climate change represents one of the most significant
    challenges facing contemporary society. Anthropogenic greenhouse gas
    emissions have accelerated global warming, resulting in observable
    environmental transformations including rising sea levels, increased
    frequency of extreme weather events, and biodiversity loss.

    Research indicates that immediate mitigation strategies are essential
    to prevent catastrophic consequences. Policy interventions must address
    both industrial emissions and individual consumption patterns.
    Furthermore, international cooperation is paramount, as climate change
    transcends national boundaries.

    Consequently, a multifaceted approach combining technological innovation,
    regulatory frameworks, and behavioral modification is necessary to
    achieve meaningful reductions in carbon emissions. The scientific
    consensus emphasizes the urgency of implementing these measures within
    the current decade.
    """


@pytest.fixture
def informal_text():
    """Informal text for testing."""
    return """
    Hey, so I wanna talk about why school is kinda important, you know?
    Like, tons of people think it's boring but it's actually pretty cool
    when you think about it.

    First off, you get to learn stuff that helps you get a job later.
    That's awesome! And you make friends too which is super important.

    Anyway, that's why I think education is really great and everyone
    should try to do good in school!
    """


@pytest.fixture
def essay_scorer():
    """Create an EssayScorer instance."""
    from app.models.essay_scorer import EssayScorer
    return EssayScorer()


@pytest.fixture
def coherence_analyzer():
    """Create a CoherenceAnalyzer instance."""
    from app.models.coherence_analyzer import CoherenceAnalyzer
    return CoherenceAnalyzer()


@pytest.fixture
def grammar_checker():
    """Create a GrammarChecker instance."""
    from app.models.grammar_checker import GrammarChecker
    return GrammarChecker(use_language_tool=False)  # Use fallback for testing


@pytest.fixture
def style_analyzer():
    """Create a StyleAnalyzer instance."""
    from app.models.style_analyzer import StyleAnalyzer
    return StyleAnalyzer()


@pytest.fixture
def readability_profiler():
    """Create a ReadabilityProfiler instance."""
    from app.models.readability_profiler import ReadabilityProfiler
    return ReadabilityProfiler(use_textstat=False)  # Use manual calculations


@pytest.fixture
def feedback_generator():
    """Create a FeedbackGenerator instance."""
    from app.services.feedback_generator import FeedbackGenerator
    return FeedbackGenerator()


@pytest.fixture
def rubric_mapper():
    """Create a RubricMapper instance."""
    from app.services.rubric_mapper import RubricMapper
    return RubricMapper()
