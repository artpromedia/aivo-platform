"""
Performance Benchmarks for Sprint 4 Advanced Writing Features.

Measures execution time and throughput for:
- ArgumentationDetector
- PlagiarismDetector
- DevelopmentalNorms
- FeedbackGenerator
- Full assessment pipeline

Run with: python -m pytest tests/benchmarks/benchmark_sprint4.py -v --benchmark
"""

import statistics
import time
from typing import Callable, Dict, List

import pytest


# =============================================================================
# Sample Data
# =============================================================================

SAMPLE_SHORT_ESSAY = """
I think dogs are the best pets. Dogs are loyal and friendly. They love to play
with their owners. My dog likes to fetch balls and go for walks. Dogs make
people happy. That is why I believe dogs are the best pets to have.
"""

SAMPLE_MEDIUM_ESSAY = """
Schools should implement later start times for middle and high school students.
Research has consistently shown that teenagers have different sleep patterns
than younger children and adults.

First, adolescents naturally experience a shift in their circadian rhythms
during puberty. According to the American Academy of Pediatrics, teens are
biologically programmed to fall asleep later and wake up later. This makes
early morning classes especially difficult for them.

Second, sleep deprivation has serious negative effects on academic performance.
Studies from the National Sleep Foundation show that students who get adequate
sleep have better memory retention, improved focus, and higher test scores.
When schools start too early, students cannot get the recommended 8-10 hours
of sleep.

Some argue that later start times would disrupt after-school activities and
parents' work schedules. However, many schools that have implemented later
start times have found creative solutions, such as adjusting activity schedules
and providing transportation options.

In conclusion, the scientific evidence strongly supports later school start
times for adolescent students. Schools should prioritize student health and
learning by making this important change.
"""

SAMPLE_LONG_ESSAY = SAMPLE_MEDIUM_ESSAY * 3  # ~1500 words


# =============================================================================
# Benchmark Utilities
# =============================================================================


def run_benchmark(
    func: Callable,
    args: tuple = (),
    kwargs: dict = None,
    iterations: int = 10,
    warmup: int = 2,
) -> Dict[str, float]:
    """
    Run a function multiple times and collect timing statistics.

    Args:
        func: Function to benchmark
        args: Positional arguments
        kwargs: Keyword arguments
        iterations: Number of timed iterations
        warmup: Number of warmup iterations

    Returns:
        Dictionary with timing statistics
    """
    kwargs = kwargs or {}

    # Warmup runs
    for _ in range(warmup):
        func(*args, **kwargs)

    # Timed runs
    times = []
    for _ in range(iterations):
        start = time.perf_counter()
        func(*args, **kwargs)
        elapsed = time.perf_counter() - start
        times.append(elapsed)

    return {
        "iterations": iterations,
        "mean": statistics.mean(times),
        "median": statistics.median(times),
        "std_dev": statistics.stdev(times) if len(times) > 1 else 0,
        "min": min(times),
        "max": max(times),
        "total": sum(times),
    }


def format_benchmark_result(name: str, result: Dict[str, float]) -> str:
    """Format benchmark result for display."""
    return (
        f"{name}:\n"
        f"  Mean:   {result['mean']*1000:.2f} ms\n"
        f"  Median: {result['median']*1000:.2f} ms\n"
        f"  StdDev: {result['std_dev']*1000:.2f} ms\n"
        f"  Min:    {result['min']*1000:.2f} ms\n"
        f"  Max:    {result['max']*1000:.2f} ms\n"
    )


# =============================================================================
# ArgumentationDetector Benchmarks
# =============================================================================


class TestArgumentationBenchmarks:
    """Benchmarks for ArgumentationDetector."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup detector for benchmarks."""
        from app.models.argumentation_detector import ArgumentationDetector
        self.detector = ArgumentationDetector()

    def test_benchmark_short_essay(self):
        """Benchmark argumentation detection on short essay."""
        result = run_benchmark(
            self.detector.detect_arguments,
            args=(SAMPLE_SHORT_ESSAY,),
            iterations=20,
        )

        print(format_benchmark_result("Argumentation (Short)", result))
        assert result["mean"] < 0.5  # Under 500ms

    def test_benchmark_medium_essay(self):
        """Benchmark argumentation detection on medium essay."""
        result = run_benchmark(
            self.detector.detect_arguments,
            args=(SAMPLE_MEDIUM_ESSAY,),
            iterations=10,
        )

        print(format_benchmark_result("Argumentation (Medium)", result))
        assert result["mean"] < 1.0  # Under 1 second

    def test_benchmark_long_essay(self):
        """Benchmark argumentation detection on long essay."""
        result = run_benchmark(
            self.detector.detect_arguments,
            args=(SAMPLE_LONG_ESSAY,),
            iterations=5,
        )

        print(format_benchmark_result("Argumentation (Long)", result))
        assert result["mean"] < 3.0  # Under 3 seconds

    def test_benchmark_quality_evaluation(self):
        """Benchmark argument quality evaluation."""
        structure = self.detector.detect_arguments(SAMPLE_MEDIUM_ESSAY)

        result = run_benchmark(
            self.detector.evaluate_argument_quality,
            args=(structure,),
            iterations=50,
        )

        print(format_benchmark_result("Quality Evaluation", result))
        assert result["mean"] < 0.1  # Under 100ms


# =============================================================================
# PlagiarismDetector Benchmarks
# =============================================================================


class TestPlagiarismBenchmarks:
    """Benchmarks for PlagiarismDetector."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup detector for benchmarks."""
        from app.models.plagiarism_detector import PlagiarismDetector
        self.detector = PlagiarismDetector(use_embeddings=False)

    def test_benchmark_fingerprint(self):
        """Benchmark document fingerprinting."""
        result = run_benchmark(
            self.detector.compute_fingerprint,
            args=(SAMPLE_MEDIUM_ESSAY,),
            iterations=50,
        )

        print(format_benchmark_result("Fingerprinting", result))
        assert result["mean"] < 0.1  # Under 100ms

    def test_benchmark_originality_check(self):
        """Benchmark originality check without embeddings."""
        result = run_benchmark(
            self.detector.check_originality,
            args=(SAMPLE_MEDIUM_ESSAY,),
            kwargs={"check_internal_consistency": True},
            iterations=10,
        )

        print(format_benchmark_result("Originality Check", result))
        assert result["mean"] < 2.0  # Under 2 seconds

    def test_benchmark_compare_texts(self):
        """Benchmark text comparison."""
        result = run_benchmark(
            self.detector.compare_texts,
            args=(SAMPLE_SHORT_ESSAY, SAMPLE_MEDIUM_ESSAY),
            iterations=20,
        )

        print(format_benchmark_result("Text Comparison", result))
        assert result["mean"] < 0.5  # Under 500ms

    def test_benchmark_style_analysis(self):
        """Benchmark style consistency analysis."""
        result = run_benchmark(
            self.detector._analyze_style_consistency,
            args=(SAMPLE_MEDIUM_ESSAY,),
            iterations=20,
        )

        print(format_benchmark_result("Style Analysis", result))
        assert result["mean"] < 0.2  # Under 200ms


# =============================================================================
# DevelopmentalNorms Benchmarks
# =============================================================================


class TestDevelopmentalNormsBenchmarks:
    """Benchmarks for DevelopmentalNorms."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup norms analyzer for benchmarks."""
        from app.models.developmental_norms import DevelopmentalNorms
        self.norms = DevelopmentalNorms()

    def test_benchmark_short_assessment(self):
        """Benchmark assessment of short essay."""
        result = run_benchmark(
            self.norms.assess_against_norms,
            args=(SAMPLE_SHORT_ESSAY, 3),
            iterations=20,
        )

        print(format_benchmark_result("Developmental (Short)", result))
        assert result["mean"] < 0.2  # Under 200ms

    def test_benchmark_medium_assessment(self):
        """Benchmark assessment of medium essay."""
        result = run_benchmark(
            self.norms.assess_against_norms,
            args=(SAMPLE_MEDIUM_ESSAY, 8),
            iterations=20,
        )

        print(format_benchmark_result("Developmental (Medium)", result))
        assert result["mean"] < 0.5  # Under 500ms

    def test_benchmark_different_grades(self):
        """Benchmark assessment across different grade levels."""
        times = []
        for grade in [3, 5, 8, 11]:
            result = run_benchmark(
                self.norms.assess_against_norms,
                args=(SAMPLE_MEDIUM_ESSAY, grade),
                iterations=5,
            )
            times.append(result["mean"])

        avg_time = statistics.mean(times)
        print(f"Average across grades: {avg_time*1000:.2f} ms")
        assert avg_time < 0.5  # Under 500ms average


# =============================================================================
# FeedbackGenerator Benchmarks
# =============================================================================


class TestFeedbackBenchmarks:
    """Benchmarks for FeedbackGenerator."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup generator for benchmarks."""
        from app.services.feedback_generator import FeedbackGenerator
        self.generator = FeedbackGenerator()

        self.sample_assessment = {
            "scores": {
                "overall": 75,
                "holistic": {"score": 4},
                "traits": {
                    "ideas": {"score": 3.5, "max_score": 4},
                    "organization": {"score": 3.0, "max_score": 4},
                    "voice": {"score": 3.0, "max_score": 4},
                    "word_choice": {"score": 3.5, "max_score": 4},
                    "sentence_fluency": {"score": 3.0, "max_score": 4},
                    "conventions": {"score": 2.5, "max_score": 4},
                },
            },
            "grammar_report": {
                "errors": [],
                "error_density": 2.5,
                "by_category": {"spelling": 2, "punctuation": 3},
            },
            "coherence_analysis": {
                "overall_score": 0.75,
                "local_coherence": {"weak_transitions": []},
                "global_coherence": {
                    "has_clear_intro": True,
                    "has_clear_conclusion": True,
                },
            },
            "style_report": {
                "word_variety_score": 0.65,
                "tone": "academic",
                "overused_words": [],
            },
        }

    def test_benchmark_feedback_generation(self):
        """Benchmark basic feedback generation."""
        result = run_benchmark(
            self.generator.generate,
            args=(self.sample_assessment,),
            iterations=20,
        )

        print(format_benchmark_result("Feedback Generation", result))
        assert result["mean"] < 0.1  # Under 100ms

    def test_benchmark_feedback_styles(self):
        """Benchmark different feedback styles."""
        styles = ["encouraging", "neutral", "challenging"]
        times = {}

        for style in styles:
            result = run_benchmark(
                self.generator.generate,
                args=(self.sample_assessment,),
                kwargs={"feedback_style": style},
                iterations=10,
            )
            times[style] = result["mean"]
            print(format_benchmark_result(f"Feedback ({style})", result))

        # All styles should be similarly fast
        assert max(times.values()) < 0.2  # Under 200ms


# =============================================================================
# Full Pipeline Benchmarks
# =============================================================================


class TestFullPipelineBenchmarks:
    """Benchmarks for full assessment pipelines."""

    def test_benchmark_full_argumentative_pipeline(self):
        """Benchmark full argumentative assessment pipeline."""
        from app.models.argumentation_detector import ArgumentationDetector
        from app.services.feedback_generator import FeedbackGenerator

        detector = ArgumentationDetector()
        generator = FeedbackGenerator()

        def full_pipeline(text):
            structure = detector.detect_arguments(text)
            quality = detector.evaluate_argument_quality(structure)
            assessment = {
                "scores": {"overall": quality["overall_strength"] * 100},
                "argumentation": {"suggestions": structure.suggestions},
            }
            return generator.generate(assessment)

        result = run_benchmark(
            full_pipeline,
            args=(SAMPLE_MEDIUM_ESSAY,),
            iterations=5,
        )

        print(format_benchmark_result("Full Argumentative Pipeline", result))
        assert result["mean"] < 2.0  # Under 2 seconds

    def test_benchmark_full_originality_pipeline(self):
        """Benchmark full originality check pipeline."""
        from app.models.plagiarism_detector import PlagiarismDetector

        detector = PlagiarismDetector(use_embeddings=False)

        def full_pipeline(text):
            report = detector.check_originality(text, check_internal_consistency=True)
            return detector.get_detailed_analysis(report)

        result = run_benchmark(
            full_pipeline,
            args=(SAMPLE_MEDIUM_ESSAY,),
            iterations=5,
        )

        print(format_benchmark_result("Full Originality Pipeline", result))
        assert result["mean"] < 3.0  # Under 3 seconds

    def test_benchmark_full_developmental_pipeline(self):
        """Benchmark full developmental assessment pipeline."""
        from app.models.developmental_norms import DevelopmentalNorms
        from app.services.feedback_generator import FeedbackGenerator

        norms = DevelopmentalNorms()
        generator = FeedbackGenerator()

        def full_pipeline(text, grade):
            report = norms.assess_against_norms(text, grade)
            assessment = {
                "scores": {"overall": report.percentile_estimate},
            }
            return generator.generate(assessment, grade_level=grade)

        result = run_benchmark(
            full_pipeline,
            args=(SAMPLE_MEDIUM_ESSAY, 8),
            iterations=10,
        )

        print(format_benchmark_result("Full Developmental Pipeline", result))
        assert result["mean"] < 1.0  # Under 1 second


# =============================================================================
# Memory Benchmarks
# =============================================================================


class TestMemoryBenchmarks:
    """Memory usage benchmarks."""

    def test_argumentation_memory(self):
        """Test memory usage of argumentation detection."""
        import sys

        from app.models.argumentation_detector import ArgumentationDetector

        detector = ArgumentationDetector()

        # Get initial size
        initial_size = sys.getsizeof(detector)

        # Run detection
        structure = detector.detect_arguments(SAMPLE_MEDIUM_ESSAY)

        # Check structure size
        structure_size = sys.getsizeof(structure)

        print(f"Detector size: {initial_size} bytes")
        print(f"Structure size: {structure_size} bytes")

        # Structure should be reasonable size
        assert structure_size < 100000  # Under 100KB

    def test_plagiarism_corpus_memory(self):
        """Test memory usage with growing corpus."""
        import sys

        from app.models.plagiarism_detector import PlagiarismDetector

        detector = PlagiarismDetector()

        # Add many documents
        for i in range(100):
            detector.add_to_corpus(
                f"Sample document {i} with some text content. " * 10,
                source_id=f"doc_{i}",
            )

        corpus_size = sys.getsizeof(detector._corpus_fingerprints)

        print(f"Corpus size (100 docs): {corpus_size} bytes")

        # Should be reasonable even with 100 documents
        assert corpus_size < 1000000  # Under 1MB


# =============================================================================
# Throughput Benchmarks
# =============================================================================


class TestThroughputBenchmarks:
    """Throughput benchmarks."""

    def test_argumentation_throughput(self):
        """Test argumentation detection throughput."""
        from app.models.argumentation_detector import ArgumentationDetector

        detector = ArgumentationDetector()

        # Process multiple essays
        start = time.perf_counter()
        count = 0
        while time.perf_counter() - start < 5.0:  # 5 second test
            detector.detect_arguments(SAMPLE_SHORT_ESSAY)
            count += 1

        throughput = count / 5.0

        print(f"Argumentation throughput: {throughput:.1f} essays/second")

        # Should handle at least 5 short essays per second
        assert throughput > 5

    def test_plagiarism_throughput(self):
        """Test plagiarism detection throughput."""
        from app.models.plagiarism_detector import PlagiarismDetector

        detector = PlagiarismDetector(use_embeddings=False)

        start = time.perf_counter()
        count = 0
        while time.perf_counter() - start < 5.0:
            detector.check_originality(SAMPLE_SHORT_ESSAY, check_internal_consistency=False)
            count += 1

        throughput = count / 5.0

        print(f"Plagiarism throughput: {throughput:.1f} checks/second")

        # Should handle at least 2 checks per second
        assert throughput > 2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
