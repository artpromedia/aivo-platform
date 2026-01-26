"""
Reading Fluency Assessment
Analyzes reading fluency: rate, accuracy, prosody, expression

Components:
- Words per minute (WPM)
- Accuracy (% words correct)
- Prosody (expression, phrasing, pacing)
- Self-corrections tracking

Based on:
- NAEP Oral Reading Fluency Scale
- Hasbrouck & Tindal Fluency Norms
- DIBELS fluency assessment framework
"""

import torch
import numpy as np
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import logging
import json
from pathlib import Path

logger = logging.getLogger(__name__)

# Lazy imports for heavy dependencies
librosa = None
scipy_signal = None


def _load_librosa():
    """Lazy load librosa library"""
    global librosa
    if librosa is None:
        import librosa as _librosa
        librosa = _librosa
    return librosa


def _load_scipy_signal():
    """Lazy load scipy.signal"""
    global scipy_signal
    if scipy_signal is None:
        from scipy import signal as _signal
        scipy_signal = _signal
    return scipy_signal


@dataclass
class FluencySegment:
    """A segment of read text with timing and accuracy info"""
    word: str
    start_time: float
    end_time: float
    correct: bool
    confidence: float = 1.0
    self_corrected: bool = False
    hesitation: bool = False
    substitution: Optional[str] = None  # What was said instead
    omission: bool = False
    insertion: bool = False
    
    @property
    def duration(self) -> float:
        """Duration in seconds"""
        return self.end_time - self.start_time
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "word": self.word,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration": self.duration,
            "correct": self.correct,
            "confidence": self.confidence,
            "self_corrected": self.self_corrected,
            "hesitation": self.hesitation,
            "substitution": self.substitution,
            "omission": self.omission,
            "insertion": self.insertion
        }


@dataclass
class ProsodyFeatures:
    """Prosody (expression) features extracted from audio"""
    pitch_mean: float
    pitch_range: float
    pitch_variance: float
    pitch_contour_slope: float  # Rising/falling intonation
    tempo_mean: float  # Syllables per second
    tempo_variance: float
    pause_count: int
    pause_duration_mean: float
    pause_duration_total: float
    energy_mean: float
    energy_variance: float
    speaking_rate: float  # Words per second (excluding pauses)
    articulation_rate: float  # Syllables per second (excluding pauses)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "pitch_mean": self.pitch_mean,
            "pitch_range": self.pitch_range,
            "pitch_variance": self.pitch_variance,
            "pitch_contour_slope": self.pitch_contour_slope,
            "tempo_mean": self.tempo_mean,
            "tempo_variance": self.tempo_variance,
            "pause_count": self.pause_count,
            "pause_duration_mean": self.pause_duration_mean,
            "pause_duration_total": self.pause_duration_total,
            "energy_mean": self.energy_mean,
            "energy_variance": self.energy_variance,
            "speaking_rate": self.speaking_rate,
            "articulation_rate": self.articulation_rate
        }


@dataclass
class ErrorAnalysis:
    """Analysis of reading errors"""
    substitutions: List[Tuple[str, str]]  # (expected, actual)
    omissions: List[str]  # Words skipped
    insertions: List[str]  # Words added
    mispronunciations: List[str]
    self_corrections: int
    repetitions: int
    hesitations: int
    
    @property
    def total_errors(self) -> int:
        """Total error count"""
        return (
            len(self.substitutions) + 
            len(self.omissions) + 
            len(self.insertions) + 
            len(self.mispronunciations)
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "substitutions": self.substitutions,
            "omissions": self.omissions,
            "insertions": self.insertions,
            "mispronunciations": self.mispronunciations,
            "self_corrections": self.self_corrections,
            "repetitions": self.repetitions,
            "hesitations": self.hesitations,
            "total_errors": self.total_errors
        }


@dataclass
class FluencyAssessment:
    """Complete fluency assessment result"""
    # Rate metrics
    words_per_minute: float
    words_correct_per_minute: float  # WCPM - key metric
    total_words_read: int
    total_words_correct: int
    reading_time_seconds: float
    
    # Accuracy metrics
    accuracy_percentage: float
    error_analysis: ErrorAnalysis
    
    # Prosody metrics
    prosody_score: float  # 0-4 scale (NAEP rubric)
    prosody_features: ProsodyFeatures
    expression_level: str  # "monotone", "some_expression", "expressive"
    phrasing_quality: str  # "word_by_word", "choppy", "mixed", "fluent"
    pace_consistency: str  # "inconsistent", "somewhat_consistent", "consistent"
    
    # Interpretations
    grade_level_equivalent: Optional[float]
    percentile_rank: Optional[int]  # Based on grade norms
    fluency_level: str  # "frustrational", "instructional", "independent"
    
    # Word-level details
    segments: List[FluencySegment] = field(default_factory=list)
    
    # Recommendations
    recommendations: List[str] = field(default_factory=list)
    strengths: List[str] = field(default_factory=list)
    areas_for_growth: List[str] = field(default_factory=list)
    
    # Metadata
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "words_per_minute": self.words_per_minute,
            "words_correct_per_minute": self.words_correct_per_minute,
            "total_words_read": self.total_words_read,
            "total_words_correct": self.total_words_correct,
            "reading_time_seconds": self.reading_time_seconds,
            "accuracy_percentage": self.accuracy_percentage,
            "error_analysis": self.error_analysis.to_dict(),
            "prosody_score": self.prosody_score,
            "prosody_features": self.prosody_features.to_dict(),
            "expression_level": self.expression_level,
            "phrasing_quality": self.phrasing_quality,
            "pace_consistency": self.pace_consistency,
            "grade_level_equivalent": self.grade_level_equivalent,
            "percentile_rank": self.percentile_rank,
            "fluency_level": self.fluency_level,
            "segments": [s.to_dict() for s in self.segments],
            "recommendations": self.recommendations,
            "strengths": self.strengths,
            "areas_for_growth": self.areas_for_growth,
            "timestamp": self.timestamp
        }


class FluencyAnalyzer:
    """
    Reading Fluency Analysis System
    
    Assesses fluency using:
    - Speech-to-text alignment with expected text
    - Acoustic feature analysis (prosody)
    - Temporal analysis (rate, pauses)
    - Error pattern detection
    
    Based on:
    - NAEP Oral Reading Fluency Scale (1-4)
    - Hasbrouck & Tindal fluency norms
    - DIBELS ORF assessment framework
    """
    
    def __init__(self, sample_rate: int = 16000):
        self.sample_rate = sample_rate
        
        # Hasbrouck & Tindal Oral Reading Fluency Norms (50th percentile, WCPM)
        # Format: grade -> {fall, winter, spring}
        self.wpm_norms = {
            1: {"fall": 0, "winter": 23, "spring": 53},
            2: {"fall": 50, "winter": 72, "spring": 89},
            3: {"fall": 71, "winter": 92, "spring": 107},
            4: {"fall": 94, "winter": 112, "spring": 123},
            5: {"fall": 110, "winter": 127, "spring": 139},
            6: {"fall": 127, "winter": 140, "spring": 150},
            7: {"fall": 128, "winter": 136, "spring": 150},
            8: {"fall": 133, "winter": 146, "spring": 151},
        }
        
        # Percentile lookup tables (simplified)
        self.percentile_tables = {
            # Grade 3 as example: WCPM -> percentile
            3: {
                50: 10, 70: 25, 90: 50, 110: 75, 130: 90
            }
        }
        
        # Fluency level thresholds (accuracy-based)
        self.fluency_levels = {
            "frustrational": 0.89,  # <90% accuracy
            "instructional": 0.94,  # 90-95% accuracy
            "independent": 1.0      # >95% accuracy
        }
        
        # Prosody rubric thresholds
        self.prosody_criteria = {
            "pitch_variance_low": 200,
            "pitch_variance_high": 1000,
            "pause_appropriate_min": 3,
            "pause_appropriate_max": 20,
            "energy_variance_low": 0.003,
            "energy_variance_high": 0.015
        }
        
        logger.info("FluencyAnalyzer initialized")
    
    def analyze_fluency(
        self,
        audio_path: str,
        expected_text: str,
        grade_level: int,
        season: str = "spring",
        reading_time_seconds: Optional[float] = None,
        transcription: Optional[str] = None
    ) -> FluencyAssessment:
        """
        Analyze reading fluency from audio
        
        Args:
            audio_path: Path to audio recording
            expected_text: Text that should have been read
            grade_level: Student's grade level (1-8)
            season: Time of year for norm comparison ("fall", "winter", "spring")
            reading_time_seconds: Optional override for reading duration
            transcription: Optional pre-computed transcription
        
        Returns:
            Complete fluency assessment
        """
        lib = _load_librosa()
        
        # Load audio
        audio, sr = lib.load(audio_path, sr=self.sample_rate)
        
        # Get reading time
        if reading_time_seconds is None:
            reading_time_seconds = len(audio) / sr
        
        # Align transcription with expected text
        segments = self._align_with_expected(
            audio, expected_text, sr, transcription
        )
        
        # Calculate rate metrics
        total_words = len(segments)
        words_correct = sum(1 for s in segments if s.correct)
        
        wpm = (total_words / reading_time_seconds) * 60
        wcpm = (words_correct / reading_time_seconds) * 60
        
        # Calculate accuracy
        accuracy = (words_correct / total_words) * 100 if total_words > 0 else 0
        
        # Analyze errors
        error_analysis = self._analyze_errors(segments)
        
        # Analyze prosody
        prosody_features = self._analyze_prosody(audio, sr, segments)
        prosody_score = self._score_prosody(prosody_features)
        
        # Classify expression, phrasing, and pace
        expression = self._classify_expression(prosody_features)
        phrasing = self._classify_phrasing(prosody_features, segments)
        pace = self._classify_pace_consistency(prosody_features)
        
        # Determine fluency level
        fluency_level = self._determine_fluency_level(accuracy / 100)
        
        # Estimate grade level equivalent
        grade_equivalent = self._estimate_grade_level(wcpm, accuracy)
        
        # Calculate percentile
        percentile = self._calculate_percentile(wcpm, grade_level, season)
        
        # Generate feedback
        recommendations = self._generate_recommendations(
            wpm, wcpm, accuracy, prosody_score, grade_level, season
        )
        strengths = self._identify_strengths(
            wpm, accuracy, prosody_score, error_analysis, grade_level, season
        )
        areas_for_growth = self._identify_areas_for_growth(
            wpm, accuracy, prosody_score, error_analysis, grade_level, season
        )
        
        return FluencyAssessment(
            words_per_minute=round(wpm, 1),
            words_correct_per_minute=round(wcpm, 1),
            total_words_read=total_words,
            total_words_correct=words_correct,
            reading_time_seconds=round(reading_time_seconds, 1),
            accuracy_percentage=round(accuracy, 1),
            error_analysis=error_analysis,
            prosody_score=round(prosody_score, 1),
            prosody_features=prosody_features,
            expression_level=expression,
            phrasing_quality=phrasing,
            pace_consistency=pace,
            grade_level_equivalent=grade_equivalent,
            percentile_rank=percentile,
            fluency_level=fluency_level,
            segments=segments,
            recommendations=recommendations,
            strengths=strengths,
            areas_for_growth=areas_for_growth
        )
    
    def analyze_fluency_from_array(
        self,
        audio: np.ndarray,
        expected_text: str,
        grade_level: int,
        sample_rate: int = 16000,
        season: str = "spring",
        transcription: Optional[str] = None
    ) -> FluencyAssessment:
        """
        Analyze fluency from audio array (no file required)
        
        Args:
            audio: Audio samples as numpy array
            expected_text: Expected text
            grade_level: Student's grade level
            sample_rate: Audio sample rate
            season: Time of year
            transcription: Optional transcription
            
        Returns:
            Complete fluency assessment
        """
        reading_time_seconds = len(audio) / sample_rate
        
        # Align transcription with expected text
        segments = self._align_with_expected(
            audio, expected_text, sample_rate, transcription
        )
        
        # Calculate rate metrics
        total_words = len(segments)
        words_correct = sum(1 for s in segments if s.correct)
        
        wpm = (total_words / reading_time_seconds) * 60
        wcpm = (words_correct / reading_time_seconds) * 60
        accuracy = (words_correct / total_words) * 100 if total_words > 0 else 0
        
        # Analyze errors
        error_analysis = self._analyze_errors(segments)
        
        # Analyze prosody
        prosody_features = self._analyze_prosody(audio, sample_rate, segments)
        prosody_score = self._score_prosody(prosody_features)
        
        # Classifications
        expression = self._classify_expression(prosody_features)
        phrasing = self._classify_phrasing(prosody_features, segments)
        pace = self._classify_pace_consistency(prosody_features)
        fluency_level = self._determine_fluency_level(accuracy / 100)
        
        # Interpretations
        grade_equivalent = self._estimate_grade_level(wcpm, accuracy)
        percentile = self._calculate_percentile(wcpm, grade_level, season)
        
        # Feedback
        recommendations = self._generate_recommendations(
            wpm, wcpm, accuracy, prosody_score, grade_level, season
        )
        strengths = self._identify_strengths(
            wpm, accuracy, prosody_score, error_analysis, grade_level, season
        )
        areas_for_growth = self._identify_areas_for_growth(
            wpm, accuracy, prosody_score, error_analysis, grade_level, season
        )
        
        return FluencyAssessment(
            words_per_minute=round(wpm, 1),
            words_correct_per_minute=round(wcpm, 1),
            total_words_read=total_words,
            total_words_correct=words_correct,
            reading_time_seconds=round(reading_time_seconds, 1),
            accuracy_percentage=round(accuracy, 1),
            error_analysis=error_analysis,
            prosody_score=round(prosody_score, 1),
            prosody_features=prosody_features,
            expression_level=expression,
            phrasing_quality=phrasing,
            pace_consistency=pace,
            grade_level_equivalent=grade_equivalent,
            percentile_rank=percentile,
            fluency_level=fluency_level,
            segments=segments,
            recommendations=recommendations,
            strengths=strengths,
            areas_for_growth=areas_for_growth
        )
    
    def _align_with_expected(
        self,
        audio: np.ndarray,
        expected_text: str,
        sr: int,
        transcription: Optional[str] = None
    ) -> List[FluencySegment]:
        """
        Align audio with expected text using speech recognition
        
        In production, use forced alignment (e.g., Montreal Forced Aligner, Wav2Vec2)
        This simplified version simulates alignment for demonstration.
        """
        lib = _load_librosa()
        
        # Clean and split expected text
        expected_words = self._clean_text(expected_text).split()
        
        # If transcription provided, compare it
        if transcription:
            transcribed_words = self._clean_text(transcription).split()
        else:
            # Simulate transcription (in production, use ASR like Whisper)
            transcribed_words = expected_words.copy()
        
        # Calculate timing based on audio duration and word count
        total_duration = len(audio) / sr
        
        # Detect pauses to help with timing
        pauses = self._detect_pauses(audio, sr)
        
        # Distribute time across words (accounting for pauses)
        speaking_time = total_duration - sum(p[1] - p[0] for p in pauses)
        if len(expected_words) > 0:
            avg_word_duration = speaking_time / len(expected_words)
        else:
            avg_word_duration = 0.5
        
        # Create segments with timing and accuracy
        segments = []
        current_time = 0.0
        
        for i, expected_word in enumerate(expected_words):
            # Add some timing variation
            word_duration = avg_word_duration * (0.8 + 0.4 * np.random.random())
            
            # Check for pause before this word
            is_hesitation = False
            for pause_start, pause_end in pauses:
                if pause_start >= current_time and pause_start < current_time + word_duration:
                    if (pause_end - pause_start) > 0.3:  # Long pause = hesitation
                        is_hesitation = True
                    current_time = pause_end
                    break
            
            start_time = current_time
            end_time = start_time + word_duration
            current_time = end_time
            
            # Determine correctness (compare with transcription if available)
            correct = True
            substitution = None
            
            if i < len(transcribed_words):
                if transcribed_words[i].lower() != expected_word.lower():
                    correct = False
                    substitution = transcribed_words[i]
            
            # Simulate some reading errors for demonstration
            # In production, this comes from actual ASR comparison
            if transcription is None:
                error_prob = 0.08  # ~92% accuracy simulation
                if np.random.random() < error_prob:
                    correct = False
                    if np.random.random() < 0.5:
                        substitution = self._generate_similar_word(expected_word)
            
            segments.append(FluencySegment(
                word=expected_word,
                start_time=start_time,
                end_time=end_time,
                correct=correct,
                confidence=0.9 + 0.1 * np.random.random(),
                self_corrected=np.random.random() < 0.02,  # 2% self-correction rate
                hesitation=is_hesitation,
                substitution=substitution
            ))
        
        return segments
    
    def _detect_pauses(
        self,
        audio: np.ndarray,
        sr: int,
        min_pause_duration: float = 0.2
    ) -> List[Tuple[float, float]]:
        """Detect pauses (silence) in audio"""
        lib = _load_librosa()
        
        # Calculate RMS energy
        hop_length = int(sr * 0.01)  # 10ms frames
        rms = lib.feature.rms(y=audio, hop_length=hop_length)[0]
        
        # Threshold for silence detection
        threshold = np.mean(rms) * 0.25
        
        # Find silent frames
        silent = rms < threshold
        
        # Convert to time segments
        pauses = []
        in_pause = False
        pause_start = 0
        
        for i, is_silent in enumerate(silent):
            time = i * hop_length / sr
            
            if is_silent and not in_pause:
                pause_start = time
                in_pause = True
            elif not is_silent and in_pause:
                pause_duration = time - pause_start
                if pause_duration >= min_pause_duration:
                    pauses.append((pause_start, time))
                in_pause = False
        
        return pauses
    
    def _analyze_errors(self, segments: List[FluencySegment]) -> ErrorAnalysis:
        """Analyze reading errors from segments"""
        substitutions = []
        omissions = []
        insertions = []
        mispronunciations = []
        self_corrections = 0
        repetitions = 0
        hesitations = 0
        
        for segment in segments:
            if segment.self_corrected:
                self_corrections += 1
            
            if segment.hesitation:
                hesitations += 1
            
            if not segment.correct:
                if segment.substitution:
                    substitutions.append((segment.word, segment.substitution))
                elif segment.omission:
                    omissions.append(segment.word)
                elif segment.insertion:
                    insertions.append(segment.word)
                else:
                    mispronunciations.append(segment.word)
        
        return ErrorAnalysis(
            substitutions=substitutions,
            omissions=omissions,
            insertions=insertions,
            mispronunciations=mispronunciations,
            self_corrections=self_corrections,
            repetitions=repetitions,
            hesitations=hesitations
        )
    
    def _analyze_prosody(
        self,
        audio: np.ndarray,
        sr: int,
        segments: List[FluencySegment]
    ) -> ProsodyFeatures:
        """
        Analyze prosody features from audio
        
        Prosody includes:
        - Pitch variation (expression/intonation)
        - Tempo variation (pacing)
        - Pauses (phrasing)
        - Energy variation (emphasis/stress)
        """
        lib = _load_librosa()
        
        # Extract pitch using librosa
        pitches, magnitudes = lib.piptrack(y=audio, sr=sr)
        
        # Get pitch track (select strongest pitch at each time)
        pitch_track = []
        for t in range(pitches.shape[1]):
            index = magnitudes[:, t].argmax()
            pitch = pitches[index, t]
            if pitch > 50 and pitch < 500:  # Human voice range
                pitch_track.append(pitch)
        
        pitch_track = np.array(pitch_track) if pitch_track else np.array([0.0])
        
        # Pitch statistics
        pitch_mean = float(np.mean(pitch_track)) if len(pitch_track) > 0 else 0.0
        pitch_range = float(np.ptp(pitch_track)) if len(pitch_track) > 0 else 0.0
        pitch_variance = float(np.var(pitch_track)) if len(pitch_track) > 0 else 0.0
        
        # Pitch contour slope (rising/falling intonation)
        if len(pitch_track) > 1:
            slope = np.polyfit(np.arange(len(pitch_track)), pitch_track, 1)[0]
            pitch_contour_slope = float(slope)
        else:
            pitch_contour_slope = 0.0
        
        # Tempo analysis
        onset_env = lib.onset.onset_strength(y=audio, sr=sr)
        tempo = lib.beat.tempo(onset_envelope=onset_env, sr=sr)
        tempo_mean = float(tempo[0]) if len(tempo) > 0 else 120.0
        tempo_variance = float(np.var(onset_env))
        
        # Detect pauses
        pauses = self._detect_pauses(audio, sr)
        pause_count = len(pauses)
        
        if pauses:
            pause_durations = [end - start for start, end in pauses]
            pause_duration_mean = float(np.mean(pause_durations))
            pause_duration_total = float(sum(pause_durations))
        else:
            pause_duration_mean = 0.0
            pause_duration_total = 0.0
        
        # Energy analysis
        rms = lib.feature.rms(y=audio)[0]
        energy_mean = float(np.mean(rms))
        energy_variance = float(np.var(rms))
        
        # Speaking and articulation rates
        total_duration = len(audio) / sr
        speaking_time = total_duration - pause_duration_total
        
        word_count = len([s for s in segments if not s.hesitation])
        speaking_rate = word_count / speaking_time if speaking_time > 0 else 0.0
        
        # Estimate syllable count (rough approximation)
        syllable_count = sum(self._estimate_syllables(s.word) for s in segments)
        articulation_rate = syllable_count / speaking_time if speaking_time > 0 else 0.0
        
        return ProsodyFeatures(
            pitch_mean=round(pitch_mean, 2),
            pitch_range=round(pitch_range, 2),
            pitch_variance=round(pitch_variance, 2),
            pitch_contour_slope=round(pitch_contour_slope, 4),
            tempo_mean=round(tempo_mean, 2),
            tempo_variance=round(tempo_variance, 4),
            pause_count=pause_count,
            pause_duration_mean=round(pause_duration_mean, 3),
            pause_duration_total=round(pause_duration_total, 2),
            energy_mean=round(energy_mean, 4),
            energy_variance=round(energy_variance, 6),
            speaking_rate=round(speaking_rate, 2),
            articulation_rate=round(articulation_rate, 2)
        )
    
    def _estimate_syllables(self, word: str) -> int:
        """Estimate syllable count for a word"""
        word = word.lower()
        count = 0
        vowels = "aeiouy"
        prev_is_vowel = False
        
        for char in word:
            is_vowel = char in vowels
            if is_vowel and not prev_is_vowel:
                count += 1
            prev_is_vowel = is_vowel
        
        # Handle silent e
        if word.endswith('e') and count > 1:
            count -= 1
        
        return max(1, count)
    
    def _score_prosody(self, features: ProsodyFeatures) -> float:
        """
        Score prosody on 0-4 scale based on NAEP Oral Reading Fluency Scale
        
        Level 1: Monotone with little sense of phrase boundaries
        Level 2: Some appropriate phrasing, mostly flat intonation
        Level 3: Generally appropriate phrasing and expression
        Level 4: Consistent, appropriate phrasing and expression
        """
        score = 0.0
        
        # Pitch variation (expression) - up to 1.5 points
        if features.pitch_variance > self.prosody_criteria["pitch_variance_high"]:
            score += 1.5
        elif features.pitch_variance > self.prosody_criteria["pitch_variance_low"]:
            score += 0.75
        elif features.pitch_variance > 100:
            score += 0.3
        
        # Appropriate pausing (phrasing) - up to 1.0 point
        min_pauses = self.prosody_criteria["pause_appropriate_min"]
        max_pauses = self.prosody_criteria["pause_appropriate_max"]
        
        if min_pauses <= features.pause_count <= max_pauses:
            score += 1.0
        elif features.pause_count > 0:
            score += 0.5
        
        # Energy variation (emphasis) - up to 1.0 point
        if features.energy_variance > self.prosody_criteria["energy_variance_high"]:
            score += 1.0
        elif features.energy_variance > self.prosody_criteria["energy_variance_low"]:
            score += 0.5
        
        # Tempo consistency - up to 0.5 points
        if 0.3 < features.tempo_variance < 2.0:
            score += 0.5
        elif 0.1 < features.tempo_variance < 3.0:
            score += 0.25
        
        return min(4.0, score)
    
    def _classify_expression(self, features: ProsodyFeatures) -> str:
        """Classify expression level"""
        if (features.pitch_variance < self.prosody_criteria["pitch_variance_low"] and 
            features.energy_variance < self.prosody_criteria["energy_variance_low"]):
            return "monotone"
        elif features.pitch_variance < self.prosody_criteria["pitch_variance_high"]:
            return "some_expression"
        else:
            return "expressive"
    
    def _classify_phrasing(
        self,
        features: ProsodyFeatures,
        segments: List[FluencySegment]
    ) -> str:
        """Classify phrasing quality"""
        if features.pause_count == 0:
            return "word_by_word"
        
        # Estimate phrase length from pauses
        avg_words_per_phrase = len(segments) / (features.pause_count + 1)
        
        if avg_words_per_phrase < 2:
            return "word_by_word"
        elif avg_words_per_phrase < 3:
            return "choppy"
        elif avg_words_per_phrase < 5:
            return "mixed"
        else:
            return "fluent"
    
    def _classify_pace_consistency(self, features: ProsodyFeatures) -> str:
        """Classify pace consistency"""
        if features.tempo_variance > 2.5:
            return "inconsistent"
        elif features.tempo_variance > 1.0:
            return "somewhat_consistent"
        else:
            return "consistent"
    
    def _determine_fluency_level(self, accuracy_ratio: float) -> str:
        """Determine reading level based on accuracy"""
        if accuracy_ratio < self.fluency_levels["frustrational"]:
            return "frustrational"
        elif accuracy_ratio < self.fluency_levels["instructional"]:
            return "instructional"
        else:
            return "independent"
    
    def _estimate_grade_level(self, wcpm: float, accuracy: float) -> Optional[float]:
        """Estimate grade level equivalent based on WCPM"""
        # Only estimate if accuracy is reasonable
        if accuracy < 70:
            return None
        
        # Find closest grade level based on spring norms
        best_grade = None
        min_diff = float('inf')
        
        for grade, norms in self.wpm_norms.items():
            spring_norm = norms["spring"]
            diff = abs(wcpm - spring_norm)
            if diff < min_diff:
                min_diff = diff
                best_grade = grade
        
        if best_grade is None:
            return None
        
        # Interpolate for more precise estimate
        norms = self.wpm_norms[best_grade]
        if wcpm > norms["spring"]:
            # Above grade level
            if best_grade < 8 and best_grade + 1 in self.wpm_norms:
                next_norm = self.wpm_norms[best_grade + 1]["spring"]
                interpolation = (wcpm - norms["spring"]) / (next_norm - norms["spring"])
                return best_grade + interpolation
        elif wcpm < norms["spring"]:
            # Below grade level
            if best_grade > 1 and best_grade - 1 in self.wpm_norms:
                prev_norm = self.wpm_norms[best_grade - 1]["spring"]
                interpolation = (wcpm - prev_norm) / (norms["spring"] - prev_norm)
                return best_grade - 1 + interpolation
        
        return float(best_grade)
    
    def _calculate_percentile(
        self,
        wcpm: float,
        grade_level: int,
        season: str
    ) -> Optional[int]:
        """Calculate percentile rank compared to grade norms"""
        if grade_level not in self.wpm_norms:
            return None
        
        norm = self.wpm_norms[grade_level].get(season)
        if norm is None:
            norm = self.wpm_norms[grade_level]["spring"]
        
        # Simple percentile estimation based on norm (50th percentile)
        # In production, use full percentile tables
        ratio = wcpm / norm if norm > 0 else 1.0
        
        if ratio < 0.5:
            return 10
        elif ratio < 0.7:
            return 25
        elif ratio < 0.9:
            return 40
        elif ratio < 1.1:
            return 50
        elif ratio < 1.3:
            return 75
        elif ratio < 1.5:
            return 90
        else:
            return 95
    
    def _generate_recommendations(
        self,
        wpm: float,
        wcpm: float,
        accuracy: float,
        prosody_score: float,
        grade_level: int,
        season: str
    ) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []
        
        # Get norm for comparison
        norm = self.wpm_norms.get(grade_level, {}).get(season, 100)
        
        # Rate recommendations
        if wcpm < norm * 0.7:
            recommendations.append(
                "Focus on building reading speed through repeated readings of familiar texts. "
                "Try reading the same passage 3-4 times to build automaticity."
            )
        elif wcpm < norm * 0.85:
            recommendations.append(
                "Reading rate is developing. Continue practicing with texts at current level "
                "and gradually introduce slightly more challenging material."
            )
        elif wcpm > norm * 1.3:
            recommendations.append(
                "Strong reading speed! Ensure comprehension keeps pace with rate by "
                "asking comprehension questions after reading."
            )
        
        # Accuracy recommendations
        if accuracy < 90:
            recommendations.append(
                "Work on accuracy before speed. Choose texts at an easier level where "
                "the reader can achieve 95%+ accuracy to build confidence and word recognition."
            )
        elif accuracy < 95:
            recommendations.append(
                "Good accuracy! Focus on automatic word recognition for commonly "
                "miscued words through targeted practice."
            )
        
        # Prosody recommendations
        if prosody_score < 2.0:
            recommendations.append(
                "Work on reading with expression: practice reading dialogue with "
                "different character voices, and use punctuation as cues for pausing and intonation."
            )
        elif prosody_score < 3.0:
            recommendations.append(
                "Developing expression! Practice chunking text into meaningful phrases "
                "and reading with appropriate pauses at punctuation marks."
            )
        
        # If no issues, give encouragement
        if not recommendations:
            recommendations.append(
                "Excellent fluency! Continue reading widely across different genres "
                "to maintain and extend these strong skills."
            )
        
        return recommendations
    
    def _identify_strengths(
        self,
        wpm: float,
        accuracy: float,
        prosody_score: float,
        error_analysis: ErrorAnalysis,
        grade_level: int,
        season: str
    ) -> List[str]:
        """Identify reading strengths"""
        strengths = []
        norm = self.wpm_norms.get(grade_level, {}).get(season, 100)
        
        if wpm >= norm:
            strengths.append("Reading rate at or above grade level")
        
        if accuracy >= 95:
            strengths.append("High accuracy with few word recognition errors")
        
        if prosody_score >= 3.0:
            strengths.append("Good expression and phrasing")
        
        if error_analysis.self_corrections > 0:
            strengths.append("Monitors own reading and self-corrects errors")
        
        if error_analysis.hesitations < 3:
            strengths.append("Confident approach to challenging words")
        
        return strengths
    
    def _identify_areas_for_growth(
        self,
        wpm: float,
        accuracy: float,
        prosody_score: float,
        error_analysis: ErrorAnalysis,
        grade_level: int,
        season: str
    ) -> List[str]:
        """Identify areas for growth"""
        areas = []
        norm = self.wpm_norms.get(grade_level, {}).get(season, 100)
        
        if wpm < norm * 0.85:
            areas.append("Increase reading rate through repeated practice")
        
        if accuracy < 95:
            areas.append("Improve word recognition accuracy")
        
        if prosody_score < 3.0:
            areas.append("Develop expression and phrasing")
        
        if len(error_analysis.substitutions) > 2:
            areas.append("Work on similar-looking word discrimination")
        
        if error_analysis.hesitations > 5:
            areas.append("Build confidence with challenging vocabulary")
        
        return areas
    
    def _clean_text(self, text: str) -> str:
        """Clean text for comparison"""
        import re
        # Remove punctuation and extra whitespace
        text = re.sub(r'[^\w\s]', '', text)
        text = re.sub(r'\s+', ' ', text)
        return text.strip().lower()
    
    def _generate_similar_word(self, word: str) -> str:
        """Generate a similar-sounding word for error simulation"""
        # Simple simulation - in production this would be phonetically-based
        substitutions = {
            "the": "a",
            "was": "were",
            "said": "says",
            "have": "has",
            "they": "there",
            "were": "was",
            "there": "their",
        }
        return substitutions.get(word.lower(), word + "s")
    
    def get_norms(self, grade_level: int) -> Dict[str, int]:
        """Get fluency norms for a grade level"""
        return self.wpm_norms.get(grade_level, {
            "fall": 0, "winter": 0, "spring": 0
        })
    
    def compare_to_norms(
        self,
        wcpm: float,
        grade_level: int,
        season: str = "spring"
    ) -> Dict[str, Any]:
        """Compare WCPM to grade-level norms"""
        norms = self.get_norms(grade_level)
        norm_value = norms.get(season, norms.get("spring", 100))
        
        difference = wcpm - norm_value
        percent_of_norm = (wcpm / norm_value * 100) if norm_value > 0 else 0
        
        if percent_of_norm >= 90:
            status = "at_or_above_grade_level"
        elif percent_of_norm >= 70:
            status = "approaching_grade_level"
        else:
            status = "below_grade_level"
        
        return {
            "wcpm": wcpm,
            "grade_level": grade_level,
            "season": season,
            "norm_50th_percentile": norm_value,
            "difference_from_norm": round(difference, 1),
            "percent_of_norm": round(percent_of_norm, 1),
            "status": status
        }


# Example usage
if __name__ == "__main__":
    analyzer = FluencyAnalyzer()
    
    print("FluencyAnalyzer initialized successfully!")
    print(f"Supported grades: {list(analyzer.wpm_norms.keys())}")
    
    # Show norms for grade 3
    norms = analyzer.get_norms(3)
    print(f"\nGrade 3 norms (WCPM):")
    print(f"  Fall: {norms['fall']}")
    print(f"  Winter: {norms['winter']}")
    print(f"  Spring: {norms['spring']}")
    
    # Example comparison
    comparison = analyzer.compare_to_norms(wcpm=85, grade_level=3, season="spring")
    print(f"\nExample comparison (85 WCPM, Grade 3, Spring):")
    print(f"  Status: {comparison['status']}")
    print(f"  Percent of norm: {comparison['percent_of_norm']}%")
