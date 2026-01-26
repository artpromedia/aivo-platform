# Speech Analysis Service

AI-powered speech analysis for educational assessment, specializing in phoneme recognition and articulation scoring for learners.

## Features

- **Phoneme Recognition** - Deep learning model (CNN + LSTM) for detecting phonemes in speech
- **Articulation Assessment** - Score pronunciation accuracy against targets
- **Error Pattern Detection** - Identify common speech patterns (fronting, stopping, gliding)
- **Age-Appropriate Norms** - Compare to developmental milestones
- **Therapy Recommendations** - Generate targeted intervention suggestions

## Architecture

```
speech-analysis-svc/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py        # REST API endpoints
│   └── models/
│       ├── __init__.py
│       ├── phoneme_model.py # Phoneme recognition & articulation
│       └── prosody_model.py # Prosody analysis (future)
├── requirements.txt
├── Dockerfile
└── README.md
```

## API Endpoints

### POST /api/v1/analyze/speech

Analyze speech audio for articulation accuracy.

**Request:**

- `file`: Audio file (WAV, MP3)
- `target_words`: Expected words (optional)
- `learner_age`: Age for developmental norms

**Response:**

```json
{
  "intelligibility": 0.85,
  "age_appropriate": true,
  "phonemes_detected": [...],
  "phoneme_accuracy": {"s": 0.9, "r": 0.6},
  "error_patterns": ["gliding"],
  "recommendations": [...]
}
```

### POST /api/v1/analyze/phonemes

Detect phonemes in audio without scoring.

### GET /api/v1/norms/{age}

Get age-appropriate phoneme norms.

## Models

### PhonemeRecognitionModel

- **Input**: MFCC features (40 coefficients)
- **Architecture**: CNN feature extractor + Bidirectional LSTM + Classification head
- **Output**: Phoneme probabilities for each time frame
- **Phonemes**: 44 English phonemes (IPA notation)

### SpeechAnalyzer

High-level analysis combining:

1. Audio preprocessing and MFCC extraction
2. Phoneme detection with temporal segmentation
3. Articulation scoring against targets
4. Error pattern identification
5. Age-norm comparison
6. Recommendation generation

## Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Download pre-trained model (if available)
python -m app.models.download_weights

# Run service
uvicorn app.main:app --host 0.0.0.0 --port 8080
```

## Docker

```bash
docker build -t speech-analysis-svc .
docker run -p 8080:8080 speech-analysis-svc
```

## Development

```bash
# Install dev dependencies
pip install -r requirements.txt pytest pytest-asyncio

# Run tests
pytest tests/

# Format code
black app/
```

## Phoneme Inventory

The model recognizes 44 English phonemes:

**Consonants:**

- Plosives: p, b, t, d, k, g
- Fricatives: f, v, θ, ð, s, z, ʃ, ʒ, h
- Nasals: m, n, ŋ
- Approximants: l, r, w, j

**Vowels:**

- Monophthongs: i, ɪ, e, ɛ, æ, ɑ, ɔ, o, ʊ, u, ʌ, ə
- Diphthongs: aɪ, aʊ, ɔɪ, eɪ, oʊ
- R-colored: ɪr, ɛr, ʊr, ɔr, ɑr

## Age Norms Reference

| Age | Expected Mastered Phonemes |
| --- | -------------------------- |
| 3   | m, n, p, b, h, w           |
| 4   | t, d, k, g, f, j           |
| 5   | s, z, l, v                 |
| 6   | ʃ, ʒ, r                    |
| 7   | θ, ð                       |
| 8   | ŋ (all mastered)           |

## Error Patterns

Common phonological processes detected:

- **Fronting**: Back sounds (/k/, /g/) replaced with front sounds (/t/, /d/)
- **Stopping**: Fricatives (/s/, /z/) replaced with stops (/t/, /d/)
- **Gliding**: Liquids (/r/, /l/) replaced with glides (/w/)

## License

Proprietary - AIVO Platform
