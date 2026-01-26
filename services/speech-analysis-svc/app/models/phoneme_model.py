"""
Phoneme Recognition for Speech Assessment
Uses deep learning to detect and score phoneme production

This module implements:
1. PhonemeRecognitionModel - CNN+LSTM neural network for phoneme detection
2. SpeechAnalyzer - High-level analysis combining detection with scoring
3. Articulation assessment with error pattern identification
4. Age-appropriate developmental norm comparison
"""

import torch
import torch.nn as nn
import torchaudio
import numpy as np
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass, field
from pathlib import Path
from datetime import datetime
import logging
import json

logger = logging.getLogger(__name__)


@dataclass
class PhonemeSegment:
    """A detected phoneme in audio"""
    symbol: str  # IPA symbol
    start_time: float  # seconds
    end_time: float
    confidence: float
    accuracy_score: float  # 0-1, compared to target
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "symbol": self.symbol,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "confidence": self.confidence,
            "accuracy_score": self.accuracy_score,
        }


@dataclass
class ArticulationAssessment:
    """Speech articulation assessment results"""
    phonemes_detected: List[PhonemeSegment]
    overall_intelligibility: float  # 0-1
    phoneme_accuracy: Dict[str, float]  # phoneme -> accuracy
    error_patterns: List[str]  # e.g., "fronting", "stopping"
    age_appropriate: bool
    recommendations: List[str]
    duration_seconds: float = 0.0
    words_per_minute: float = 0.0
    timestamp: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "phonemes_detected": [p.to_dict() for p in self.phonemes_detected],
            "overall_intelligibility": self.overall_intelligibility,
            "phoneme_accuracy": self.phoneme_accuracy,
            "error_patterns": self.error_patterns,
            "age_appropriate": self.age_appropriate,
            "recommendations": self.recommendations,
            "duration_seconds": self.duration_seconds,
            "words_per_minute": self.words_per_minute,
            "timestamp": self.timestamp.isoformat(),
        }
    
    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent)


# Common phoneme substitution patterns (speech errors)
SUBSTITUTION_PATTERNS = {
    'fronting': {
        '/k/': '/t/', 
        '/g/': '/d/',
        'k': 't',
        'g': 'd',
        'ŋ': 'n',
    },
    'stopping': {
        '/s/': '/t/', 
        '/z/': '/d/',
        's': 't',
        'z': 'd',
        'f': 'p',
        'v': 'b',
        'θ': 't',
        'ð': 'd',
    },
    'gliding': {
        '/r/': '/w/', 
        '/l/': '/w/',
        'r': 'w',
        'l': 'w',
    },
    'cluster_reduction': {
        'st': 't',
        'sp': 'p',
        'sk': 'k',
        'bl': 'b',
        'gl': 'g',
        'fl': 'f',
    },
    'final_consonant_deletion': {
        # Systematic deletion of final consonants
    },
    'weak_syllable_deletion': {
        # Deletion of unstressed syllables
    },
}


# Phoneme similarity groups for partial credit scoring
PHONEME_SIMILARITY = {
    'voicing_pairs': [
        ('p', 'b'), ('t', 'd'), ('k', 'g'),
        ('f', 'v'), ('s', 'z'), ('θ', 'ð'),
        ('ʃ', 'ʒ'),
    ],
    'place_groups': {
        'bilabial': ['p', 'b', 'm', 'w'],
        'labiodental': ['f', 'v'],
        'dental': ['θ', 'ð'],
        'alveolar': ['t', 'd', 'n', 's', 'z', 'l', 'r'],
        'postalveolar': ['ʃ', 'ʒ'],
        'velar': ['k', 'g', 'ŋ'],
        'glottal': ['h'],
    },
    'manner_groups': {
        'plosive': ['p', 'b', 't', 'd', 'k', 'g'],
        'fricative': ['f', 'v', 'θ', 'ð', 's', 'z', 'ʃ', 'ʒ', 'h'],
        'nasal': ['m', 'n', 'ŋ'],
        'approximant': ['l', 'r', 'w', 'j'],
    },
}


class PhonemeRecognitionModel(nn.Module):
    """
    Deep learning model for phoneme recognition
    
    Architecture: CNN + Bidirectional LSTM for audio sequence modeling
    
    The CNN extracts local acoustic features from MFCCs,
    while the LSTM captures temporal dependencies for
    accurate phoneme boundary detection.
    """
    
    def __init__(
        self,
        num_phonemes: int = 44,  # English phonemes
        num_mfcc: int = 40,
        hidden_dim: int = 256,
        num_layers: int = 3,
        dropout_rate: float = 0.2,
    ):
        super().__init__()
        
        self.num_phonemes = num_phonemes
        self.num_mfcc = num_mfcc
        self.hidden_dim = hidden_dim
        
        # CNN for feature extraction from MFCCs
        self.cnn = nn.Sequential(
            # First conv block
            nn.Conv1d(num_mfcc, 64, kernel_size=3, padding=1),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.MaxPool1d(2),
            nn.Dropout(dropout_rate),
            
            # Second conv block
            nn.Conv1d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.MaxPool1d(2),
            nn.Dropout(dropout_rate),
            
            # Third conv block
            nn.Conv1d(128, 256, kernel_size=3, padding=1),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(dropout_rate),
        )
        
        # LSTM for temporal modeling
        self.lstm = nn.LSTM(
            input_size=256,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=True,
            dropout=dropout_rate if num_layers > 1 else 0
        )
        
        # Attention mechanism for focusing on relevant frames
        self.attention = nn.Sequential(
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.Tanh(),
            nn.Linear(hidden_dim, 1),
        )
        
        # Classification head
        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout_rate),
            nn.Linear(hidden_dim, num_phonemes)
        )
        
        # CTC loss for sequence labeling
        self.ctc_loss = nn.CTCLoss(blank=0, reduction='mean')
        
        # Initialize weights
        self._init_weights()
    
    def _init_weights(self):
        """Initialize model weights"""
        for module in self.modules():
            if isinstance(module, nn.Linear):
                nn.init.xavier_uniform_(module.weight)
                if module.bias is not None:
                    nn.init.zeros_(module.bias)
            elif isinstance(module, nn.Conv1d):
                nn.init.kaiming_normal_(module.weight, mode='fan_out', nonlinearity='relu')
            elif isinstance(module, nn.LSTM):
                for name, param in module.named_parameters():
                    if 'weight' in name:
                        nn.init.orthogonal_(param)
                    elif 'bias' in name:
                        nn.init.zeros_(param)
    
    def forward(
        self, 
        mfcc_features: torch.Tensor,
        return_attention: bool = False
    ) -> torch.Tensor:
        """
        Forward pass
        
        Args:
            mfcc_features: [batch, num_mfcc, time_steps]
            return_attention: Whether to return attention weights
        
        Returns:
            Phoneme logits: [batch, time_steps/4, num_phonemes]
            (optionally) attention weights
        """
        batch_size = mfcc_features.shape[0]
        
        # CNN feature extraction
        x = self.cnn(mfcc_features)  # [batch, 256, time_steps/4]
        
        # Transpose for LSTM: [batch, time_steps/4, 256]
        x = x.transpose(1, 2)
        
        # LSTM temporal modeling
        lstm_out, _ = self.lstm(x)  # [batch, time_steps/4, hidden_dim*2]
        
        # Compute attention weights
        attn_weights = self.attention(lstm_out)  # [batch, time_steps/4, 1]
        attn_weights = torch.softmax(attn_weights, dim=1)
        
        # Classification at each time step
        logits = self.classifier(lstm_out)  # [batch, time_steps/4, num_phonemes]
        
        if return_attention:
            return logits, attn_weights
        
        return logits
    
    def compute_loss(
        self,
        logits: torch.Tensor,
        targets: torch.Tensor,
        input_lengths: torch.Tensor,
        target_lengths: torch.Tensor
    ) -> torch.Tensor:
        """Compute CTC loss for training"""
        # Log softmax for CTC
        log_probs = torch.log_softmax(logits, dim=-1)
        
        # Transpose for CTC: [time, batch, num_phonemes]
        log_probs = log_probs.transpose(0, 1)
        
        return self.ctc_loss(log_probs, targets, input_lengths, target_lengths)


class SpeechAnalyzer:
    """
    High-level speech analysis system
    Combines phoneme recognition with articulation scoring
    
    Features:
    - Audio preprocessing (resampling, normalization)
    - MFCC feature extraction
    - Phoneme detection with segmentation
    - Articulation scoring against targets
    - Error pattern identification
    - Developmental norm comparison
    - Therapy recommendations
    """
    
    def __init__(
        self,
        model_path: Optional[str] = None,
        device: str = "cpu"
    ):
        self.device = torch.device(device)
        
        # Load phoneme recognition model
        self.model = PhonemeRecognitionModel()
        if model_path and Path(model_path).exists():
            checkpoint = torch.load(model_path, map_location=self.device)
            self.model.load_state_dict(checkpoint['model_state_dict'])
            logger.info(f"Loaded phoneme model from {model_path}")
        
        self.model.to(self.device)
        self.model.eval()
        
        # Phoneme inventory (IPA)
        self.phonemes = [
            '<blank>',  # CTC blank token
            'p', 'b', 't', 'd', 'k', 'g',  # Plosives
            'f', 'v', 'θ', 'ð', 's', 'z', 'ʃ', 'ʒ', 'h',  # Fricatives
            'm', 'n', 'ŋ',  # Nasals
            'l', 'r', 'w', 'j',  # Approximants
            'i', 'ɪ', 'e', 'ɛ', 'æ',  # Front vowels
            'ɑ', 'ɔ', 'o', 'ʊ', 'u',  # Back vowels
            'ʌ', 'ə',  # Central vowels
            'aɪ', 'aʊ', 'ɔɪ', 'eɪ', 'oʊ',  # Diphthongs
            'ɪr', 'ɛr', 'ʊr', 'ɔr', 'ɑr',  # R-colored vowels
        ]
        
        self.phoneme_to_idx = {p: i for i, p in enumerate(self.phonemes)}
        self.idx_to_phoneme = {i: p for i, p in enumerate(self.phonemes)}
        
        # Age-appropriate phoneme norms (by age 8, all should be mastered)
        self.age_norms = {
            3: ['m', 'n', 'p', 'b', 'h', 'w'],
            4: ['t', 'd', 'k', 'g', 'f', 'j'],
            5: ['s', 'z', 'l', 'v'],
            6: ['ʃ', 'ʒ', 'r'],
            7: ['θ', 'ð'],
            8: ['ŋ'],  # All phonemes mastered by 8
        }
        
        # Word to phoneme dictionary (simplified CMUDict subset)
        self.word_phonemes = self._load_phoneme_dictionary()
        
        logger.info(f"SpeechAnalyzer initialized with {len(self.phonemes)} phonemes")
    
    def _load_phoneme_dictionary(self) -> Dict[str, List[str]]:
        """Load word-to-phoneme dictionary"""
        # Simplified dictionary - production should use full CMUDict
        return {
            'cat': ['k', 'æ', 't'],
            'dog': ['d', 'ɔ', 'g'],
            'house': ['h', 'aʊ', 's'],
            'ball': ['b', 'ɔ', 'l'],
            'tree': ['t', 'r', 'i'],
            'fish': ['f', 'ɪ', 'ʃ'],
            'shoe': ['ʃ', 'u'],
            'sun': ['s', 'ʌ', 'n'],
            'moon': ['m', 'u', 'n'],
            'book': ['b', 'ʊ', 'k'],
            'red': ['r', 'ɛ', 'd'],
            'blue': ['b', 'l', 'u'],
            'green': ['g', 'r', 'i', 'n'],
            'yellow': ['j', 'ɛ', 'l', 'oʊ'],
            'apple': ['æ', 'p', 'l'],
            'banana': ['b', 'ə', 'n', 'æ', 'n', 'ə'],
            'water': ['w', 'ɔ', 't', 'ɛr'],
            'mother': ['m', 'ʌ', 'ð', 'ɛr'],
            'father': ['f', 'ɑ', 'ð', 'ɛr'],
            'brother': ['b', 'r', 'ʌ', 'ð', 'ɛr'],
            'sister': ['s', 'ɪ', 's', 't', 'ɛr'],
            'school': ['s', 'k', 'u', 'l'],
            'teacher': ['t', 'i', 'tʃ', 'ɛr'],
            'friend': ['f', 'r', 'ɛ', 'n', 'd'],
            'play': ['p', 'l', 'eɪ'],
            'run': ['r', 'ʌ', 'n'],
            'jump': ['dʒ', 'ʌ', 'm', 'p'],
            'sleep': ['s', 'l', 'i', 'p'],
            'eat': ['i', 't'],
            'drink': ['d', 'r', 'ɪ', 'ŋ', 'k'],
        }
    
    def analyze_audio(
        self,
        audio_path: str,
        target_words: Optional[List[str]] = None,
        learner_age: int = 6
    ) -> ArticulationAssessment:
        """
        Analyze speech audio for articulation accuracy
        
        Args:
            audio_path: Path to audio file (wav, mp3)
            target_words: Expected words (for comparison)
            learner_age: Age for developmental norms
        
        Returns:
            Articulation assessment results
        """
        # Load audio
        waveform, sample_rate = torchaudio.load(audio_path)
        
        return self.analyze_waveform(
            waveform, 
            sample_rate, 
            target_words, 
            learner_age
        )
    
    def analyze_bytes(
        self,
        audio_bytes: bytes,
        target_words: Optional[List[str]] = None,
        learner_age: int = 6
    ) -> ArticulationAssessment:
        """Analyze speech from audio bytes"""
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        
        try:
            return self.analyze_audio(tmp_path, target_words, learner_age)
        finally:
            os.unlink(tmp_path)
    
    def analyze_waveform(
        self,
        waveform: torch.Tensor,
        sample_rate: int,
        target_words: Optional[List[str]] = None,
        learner_age: int = 6
    ) -> ArticulationAssessment:
        """
        Analyze speech from waveform tensor
        
        Args:
            waveform: Audio tensor [channels, samples]
            sample_rate: Sample rate in Hz
            target_words: Expected words
            learner_age: Age for norms
        
        Returns:
            ArticulationAssessment
        """
        # Calculate duration
        duration = waveform.shape[1] / sample_rate
        
        # Preprocess audio
        waveform = self._preprocess_audio(waveform, sample_rate)
        
        # Extract MFCC features
        mfcc = self._extract_mfcc(waveform, 16000)
        
        # Detect phonemes
        phoneme_segments = self._detect_phonemes(mfcc)
        
        # Score articulation
        phoneme_accuracy = self._score_articulation(phoneme_segments, target_words)
        
        # Identify error patterns
        error_patterns = self._identify_error_patterns(phoneme_segments, target_words)
        
        # Calculate intelligibility
        if phoneme_accuracy:
            intelligibility = np.mean(list(phoneme_accuracy.values()))
        else:
            intelligibility = self._estimate_intelligibility(phoneme_segments)
        
        # Check age-appropriateness
        age_appropriate = self._check_age_norms(phoneme_accuracy, learner_age)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            phoneme_accuracy,
            error_patterns,
            learner_age
        )
        
        # Estimate speaking rate
        words_per_minute = 0.0
        if target_words and duration > 0:
            words_per_minute = (len(target_words) / duration) * 60
        
        return ArticulationAssessment(
            phonemes_detected=phoneme_segments,
            overall_intelligibility=intelligibility,
            phoneme_accuracy=phoneme_accuracy,
            error_patterns=error_patterns,
            age_appropriate=age_appropriate,
            recommendations=recommendations,
            duration_seconds=duration,
            words_per_minute=words_per_minute,
        )
    
    def _preprocess_audio(
        self,
        waveform: torch.Tensor,
        sample_rate: int
    ) -> torch.Tensor:
        """Preprocess audio: mono, resample, normalize"""
        # Convert to mono if stereo
        if waveform.shape[0] > 1:
            waveform = torch.mean(waveform, dim=0, keepdim=True)
        
        # Resample to 16kHz if needed
        if sample_rate != 16000:
            resampler = torchaudio.transforms.Resample(sample_rate, 16000)
            waveform = resampler(waveform)
        
        # Normalize amplitude
        max_val = torch.max(torch.abs(waveform))
        if max_val > 0:
            waveform = waveform / max_val
        
        return waveform
    
    def _extract_mfcc(
        self,
        waveform: torch.Tensor,
        sample_rate: int,
        num_mfcc: int = 40
    ) -> torch.Tensor:
        """Extract MFCC features from audio"""
        # Compute MFCC
        mfcc_transform = torchaudio.transforms.MFCC(
            sample_rate=sample_rate,
            n_mfcc=num_mfcc,
            melkwargs={
                'n_fft': 512,
                'hop_length': 160,  # 10ms at 16kHz
                'n_mels': 80,
            }
        )
        mfcc = mfcc_transform(waveform)
        
        # Add delta and delta-delta features for better recognition
        # (simplified - just use base MFCCs)
        
        return mfcc
    
    def _detect_phonemes(self, mfcc: torch.Tensor) -> List[PhonemeSegment]:
        """Detect phonemes in MFCC features"""
        mfcc = mfcc.to(self.device)
        
        with torch.no_grad():
            logits = self.model(mfcc)  # [1, time_steps, num_phonemes]
        
        # Convert to probabilities
        probs = torch.softmax(logits, dim=-1)
        predicted_indices = torch.argmax(probs, dim=-1)
        
        # Extract phoneme segments with CTC decoding
        segments = self._decode_ctc(predicted_indices[0], probs[0])
        
        return segments
    
    def _decode_ctc(
        self,
        predicted_indices: torch.Tensor,
        probs: torch.Tensor
    ) -> List[PhonemeSegment]:
        """Decode CTC output to phoneme segments"""
        segments = []
        current_phoneme_idx = None
        start_frame = 0
        frame_confidences = []
        
        # Frame duration in seconds (based on MFCC settings)
        frame_duration = 0.01 * 4  # 10ms * 4 (due to CNN pooling)
        
        for frame_idx in range(predicted_indices.shape[0]):
            phoneme_idx = predicted_indices[frame_idx].item()
            confidence = probs[frame_idx, phoneme_idx].item()
            
            # Skip blank tokens
            if phoneme_idx == 0:
                if current_phoneme_idx is not None and current_phoneme_idx != 0:
                    # End current segment
                    avg_confidence = np.mean(frame_confidences) if frame_confidences else 0.5
                    segments.append(PhonemeSegment(
                        symbol=self.idx_to_phoneme.get(current_phoneme_idx, '?'),
                        start_time=start_frame * frame_duration,
                        end_time=frame_idx * frame_duration,
                        confidence=avg_confidence,
                        accuracy_score=1.0
                    ))
                    frame_confidences = []
                current_phoneme_idx = 0
                start_frame = frame_idx
                continue
            
            # New phoneme detected
            if phoneme_idx != current_phoneme_idx:
                # Save previous segment
                if current_phoneme_idx is not None and current_phoneme_idx != 0:
                    avg_confidence = np.mean(frame_confidences) if frame_confidences else 0.5
                    segments.append(PhonemeSegment(
                        symbol=self.idx_to_phoneme.get(current_phoneme_idx, '?'),
                        start_time=start_frame * frame_duration,
                        end_time=frame_idx * frame_duration,
                        confidence=avg_confidence,
                        accuracy_score=1.0
                    ))
                
                current_phoneme_idx = phoneme_idx
                start_frame = frame_idx
                frame_confidences = [confidence]
            else:
                frame_confidences.append(confidence)
        
        # Don't forget last segment
        if current_phoneme_idx is not None and current_phoneme_idx != 0:
            avg_confidence = np.mean(frame_confidences) if frame_confidences else 0.5
            segments.append(PhonemeSegment(
                symbol=self.idx_to_phoneme.get(current_phoneme_idx, '?'),
                start_time=start_frame * frame_duration,
                end_time=predicted_indices.shape[0] * frame_duration,
                confidence=avg_confidence,
                accuracy_score=1.0
            ))
        
        return segments
    
    def _score_articulation(
        self,
        detected: List[PhonemeSegment],
        target_words: Optional[List[str]]
    ) -> Dict[str, float]:
        """Score articulation accuracy by phoneme"""
        if not target_words:
            # No target - return detected phoneme confidence as proxy
            accuracy = {}
            for segment in detected:
                if segment.symbol not in accuracy:
                    accuracy[segment.symbol] = []
                accuracy[segment.symbol].append(segment.confidence)
            
            return {p: float(np.mean(scores)) for p, scores in accuracy.items()}
        
        # Convert target words to phonemes
        target_phonemes = self._words_to_phonemes(target_words)
        
        if not target_phonemes:
            return {}
        
        # Align detected with target using dynamic time warping
        detected_symbols = [seg.symbol for seg in detected]
        aligned = self._align_phonemes(detected_symbols, target_phonemes)
        
        # Score each phoneme
        accuracy = {}
        for detected_ph, target_ph in aligned:
            if target_ph not in accuracy:
                accuracy[target_ph] = []
            
            # Score based on match
            if detected_ph == target_ph:
                score = 1.0
            elif self._is_similar_phoneme(detected_ph, target_ph):
                score = 0.7  # Partial credit for similar phonemes
            elif self._is_voicing_error(detected_ph, target_ph):
                score = 0.5  # Voicing errors are less severe
            else:
                score = 0.2  # Different phoneme
            
            accuracy[target_ph].append(score)
        
        return {p: float(np.mean(scores)) for p, scores in accuracy.items() if scores}
    
    def _words_to_phonemes(self, words: List[str]) -> List[str]:
        """Convert words to phoneme sequences"""
        phonemes = []
        for word in words:
            word_lower = word.lower().strip()
            if word_lower in self.word_phonemes:
                phonemes.extend(self.word_phonemes[word_lower])
            else:
                # Fallback: use simplified letter-to-sound rules
                phonemes.extend(self._grapheme_to_phoneme(word_lower))
        return phonemes
    
    def _grapheme_to_phoneme(self, word: str) -> List[str]:
        """Simple grapheme-to-phoneme conversion (fallback)"""
        # Very simplified - production should use proper G2P
        g2p_map = {
            'a': 'æ', 'e': 'ɛ', 'i': 'ɪ', 'o': 'ɔ', 'u': 'ʌ',
            'b': 'b', 'c': 'k', 'd': 'd', 'f': 'f', 'g': 'g',
            'h': 'h', 'j': 'dʒ', 'k': 'k', 'l': 'l', 'm': 'm',
            'n': 'n', 'p': 'p', 'r': 'r', 's': 's', 't': 't',
            'v': 'v', 'w': 'w', 'x': 'ks', 'y': 'j', 'z': 'z',
        }
        
        phonemes = []
        for char in word:
            if char in g2p_map:
                phonemes.append(g2p_map[char])
        return phonemes
    
    def _align_phonemes(
        self,
        detected: List[str],
        target: List[str]
    ) -> List[Tuple[str, str]]:
        """Align detected phonemes with target using edit distance"""
        # Dynamic programming alignment (simplified Needleman-Wunsch)
        n, m = len(detected), len(target)
        
        if n == 0 or m == 0:
            return []
        
        # Build alignment matrix
        dp = [[0] * (m + 1) for _ in range(n + 1)]
        
        for i in range(n + 1):
            dp[i][0] = i
        for j in range(m + 1):
            dp[0][j] = j
        
        for i in range(1, n + 1):
            for j in range(1, m + 1):
                if detected[i-1] == target[j-1]:
                    dp[i][j] = dp[i-1][j-1]
                else:
                    dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
        
        # Traceback to get alignment
        aligned = []
        i, j = n, m
        while i > 0 and j > 0:
            if detected[i-1] == target[j-1] or dp[i][j] == dp[i-1][j-1] + 1:
                aligned.append((detected[i-1], target[j-1]))
                i -= 1
                j -= 1
            elif dp[i][j] == dp[i-1][j] + 1:
                aligned.append((detected[i-1], ''))  # Insertion
                i -= 1
            else:
                aligned.append(('', target[j-1]))  # Deletion
                j -= 1
        
        aligned.reverse()
        return [(d, t) for d, t in aligned if t]  # Filter out empty targets
    
    def _is_similar_phoneme(self, ph1: str, ph2: str) -> bool:
        """Check if two phonemes are phonetically similar"""
        if not ph1 or not ph2:
            return False
        
        # Check substitution patterns
        for pattern, substitutions in SUBSTITUTION_PATTERNS.items():
            if ph2 in substitutions and substitutions[ph2] == ph1:
                return True
            if f'/{ph2}/' in substitutions and substitutions[f'/{ph2}/'] == f'/{ph1}/':
                return True
        
        # Check same place of articulation
        for place, phonemes in PHONEME_SIMILARITY['place_groups'].items():
            if ph1 in phonemes and ph2 in phonemes:
                return True
        
        # Check same manner of articulation
        for manner, phonemes in PHONEME_SIMILARITY['manner_groups'].items():
            if ph1 in phonemes and ph2 in phonemes:
                return True
        
        return False
    
    def _is_voicing_error(self, ph1: str, ph2: str) -> bool:
        """Check if error is just voicing"""
        for voiced, voiceless in PHONEME_SIMILARITY['voicing_pairs']:
            if (ph1 == voiced and ph2 == voiceless) or (ph1 == voiceless and ph2 == voiced):
                return True
        return False
    
    def _identify_error_patterns(
        self,
        segments: List[PhonemeSegment],
        target_words: Optional[List[str]]
    ) -> List[str]:
        """Identify systematic error patterns"""
        detected_errors = []
        
        if not target_words:
            return detected_errors
        
        target_phonemes = self._words_to_phonemes(target_words)
        detected_symbols = [seg.symbol for seg in segments]
        
        # Check for each error pattern
        for pattern_name, substitutions in SUBSTITUTION_PATTERNS.items():
            pattern_count = 0
            
            for target_ph in target_phonemes:
                # Check if this phoneme should have been produced
                if target_ph in substitutions:
                    expected_error = substitutions[target_ph]
                    # Check if the substitution was made
                    if expected_error in detected_symbols:
                        pattern_count += 1
            
            # Pattern detected if occurs 2+ times
            if pattern_count >= 2:
                detected_errors.append(pattern_name)
        
        return detected_errors
    
    def _estimate_intelligibility(
        self,
        segments: List[PhonemeSegment]
    ) -> float:
        """Estimate intelligibility from phoneme confidence"""
        if not segments:
            return 0.5
        
        # Use weighted average of confidence scores
        total_duration = sum(seg.end_time - seg.start_time for seg in segments)
        if total_duration == 0:
            return np.mean([seg.confidence for seg in segments])
        
        weighted_score = sum(
            seg.confidence * (seg.end_time - seg.start_time)
            for seg in segments
        ) / total_duration
        
        return float(weighted_score)
    
    def _check_age_norms(
        self,
        phoneme_accuracy: Dict[str, float],
        age: int
    ) -> bool:
        """Check if articulation is age-appropriate"""
        # Collect expected phonemes for this age
        expected_phonemes = []
        for norm_age, phonemes in self.age_norms.items():
            if age >= norm_age:
                expected_phonemes.extend(phonemes)
        
        # Check if expected phonemes are mastered (>0.8 accuracy)
        for phoneme in expected_phonemes:
            if phoneme in phoneme_accuracy and phoneme_accuracy[phoneme] < 0.8:
                return False
        
        return True
    
    def _generate_recommendations(
        self,
        phoneme_accuracy: Dict[str, float],
        error_patterns: List[str],
        age: int
    ) -> List[str]:
        """Generate therapy recommendations"""
        recommendations = []
        
        # Identify target phonemes (accuracy < 0.7)
        target_phonemes = [
            p for p, acc in phoneme_accuracy.items() 
            if acc < 0.7 and p in self.phonemes
        ]
        
        if target_phonemes:
            # Prioritize by developmental norms
            priority_targets = self._prioritize_targets(target_phonemes, age)
            if priority_targets:
                recommendations.append(
                    f"Priority target phonemes: {', '.join(priority_targets[:3])}"
                )
        
        # Recommendations based on error patterns
        pattern_recommendations = {
            'fronting': "Practice back sounds /k, g/ using visual cues (tongue position), tactile feedback, and minimal pair words (key-tea, go-doe)",
            'stopping': "Practice continuous airflow for fricatives /s, z, f, v/ using visual feedback (fogging mirror) and exaggerated production",
            'gliding': "Practice lateral tongue positioning for /l/ and retroflex tongue for /r/ using oral motor exercises",
            'cluster_reduction': "Practice consonant clusters starting with easier combinations (s-blends) using slow, segmented production",
            'final_consonant_deletion': "Practice final consonant production using minimal pairs and word-final position emphasis",
        }
        
        for pattern in error_patterns:
            if pattern in pattern_recommendations:
                recommendations.append(pattern_recommendations[pattern])
        
        # Age-based recommendations
        if age >= 4 and error_patterns:
            recommendations.append(
                "Consider consultation with a speech-language pathologist for comprehensive evaluation"
            )
        
        # Skill-building recommendations
        if 'r' in target_phonemes:
            recommendations.append(
                "For /r/: Practice vocalic r (er, ar, or) before consonantal r, use visual models"
            )
        
        if 's' in target_phonemes or 'z' in target_phonemes:
            recommendations.append(
                "For /s, z/: Practice tongue-tip placement behind teeth, use straw drinking for oral motor"
            )
        
        return recommendations
    
    def _prioritize_targets(
        self,
        target_phonemes: List[str],
        age: int
    ) -> List[str]:
        """Prioritize phonemes by developmental order"""
        # Get developmentally-expected phonemes for age
        expected = []
        for norm_age, phonemes in sorted(self.age_norms.items()):
            if norm_age <= age:
                expected.extend(phonemes)
        
        # Prioritize: expected but not mastered > later developing
        priority = []
        later = []
        
        for phoneme in target_phonemes:
            if phoneme in expected:
                priority.append(phoneme)
            else:
                later.append(phoneme)
        
        return priority + later
    
    def get_phoneme_norms(self, age: int) -> Dict[str, List[str]]:
        """Get phoneme norms for a specific age"""
        expected = []
        developing = []
        later = []
        
        for norm_age, phonemes in sorted(self.age_norms.items()):
            if norm_age < age:
                expected.extend(phonemes)
            elif norm_age == age:
                developing.extend(phonemes)
            else:
                later.extend(phonemes)
        
        return {
            "expected_mastered": expected,
            "currently_developing": developing,
            "later_developing": later,
        }


# Example usage
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    analyzer = SpeechAnalyzer()
    
    print("Speech Analyzer initialized")
    print(f"Phoneme inventory: {len(analyzer.phonemes)} phonemes")
    
    # Show age norms
    for age in [3, 5, 7]:
        norms = analyzer.get_phoneme_norms(age)
        print(f"\nAge {age} norms:")
        print(f"  Expected: {norms['expected_mastered']}")
        print(f"  Developing: {norms['currently_developing']}")
    
    # Test word-to-phoneme conversion
    test_words = ["cat", "dog", "house", "fish"]
    phonemes = analyzer._words_to_phonemes(test_words)
    print(f"\nWords: {test_words}")
    print(f"Phonemes: {phonemes}")
