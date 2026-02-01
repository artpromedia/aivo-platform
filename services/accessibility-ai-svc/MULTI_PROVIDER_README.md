# Accessibility AI Service - Multi-Provider Resilience

## Overview

The Accessibility AI Service now supports **multi-provider resilience**, ensuring the service remains functional even when individual AI providers (like OpenAI, Google Cloud, or Azure) experience outages. If any provider fails, the service automatically falls back to alternative providers without interrupting the user experience.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Multi-Provider Architecture                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐    ┌──────────────────────────────────────────┐   │
│  │  API v2     │───▶│  MultiProviderManager                    │   │
│  │  Endpoints  │    │  - Health Tracking                       │   │
│  └─────────────┘    │  - Circuit Breaker                       │   │
│                      │  - Automatic Failover                    │   │
│                      └──────────────────────────────────────────┘   │
│                                      │                               │
│         ┌────────────────────────────┼────────────────────────┐     │
│         ▼                            ▼                        ▼     │
│  ┌─────────────┐            ┌─────────────┐          ┌─────────────┐│
│  │   STT       │            │    TTS      │          │   Vision    ││
│  │  Providers  │            │  Providers  │          │  Providers  ││
│  └─────────────┘            └─────────────┘          └─────────────┘│
│         │                          │                        │       │
│    ┌────┴────┐              ┌──────┴──────┐          ┌──────┴─────┐ │
│    ▼         ▼              ▼             ▼          ▼            ▼ │
│ ┌──────┐ ┌──────┐      ┌──────┐     ┌──────┐   ┌──────┐    ┌──────┐│
│ │Local │ │Cloud │      │Local │     │Cloud │   │Local │    │Cloud ││
│ │Whisper│ │APIs  │      │Coqui │     │APIs  │   │BLIP  │    │APIs  ││
│ └──────┘ └──────┘      └──────┘     └──────┘   └──────┘    └──────┘│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Supported Providers

### Speech-to-Text (STT)

| Provider        | Type  | API Key Env Var                           | Notes                          |
| --------------- | ----- | ----------------------------------------- | ------------------------------ |
| `whisper_local` | Local | None                                      | Default, no network dependency |
| `openai_api`    | Cloud | `OPENAI_API_KEY`                          | High accuracy                  |
| `google_cloud`  | Cloud | `GOOGLE_CLOUD_API_KEY`                    | Enterprise-grade               |
| `azure`         | Cloud | `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | Azure Speech Services          |
| `deepgram`      | Cloud | `DEEPGRAM_API_KEY`                        | Real-time optimized            |
| `assembly_ai`   | Cloud | `ASSEMBLY_AI_API_KEY`                     | Feature-rich                   |

### Text-to-Speech (TTS)

| Provider       | Type  | API Key Env Var                              | Notes                          |
| -------------- | ----- | -------------------------------------------- | ------------------------------ |
| `coqui_local`  | Local | None                                         | Default, no network dependency |
| `openai_api`   | Cloud | `OPENAI_API_KEY`                             | Natural voices                 |
| `google_cloud` | Cloud | `GOOGLE_CLOUD_API_KEY`                       | WaveNet voices                 |
| `azure`        | Cloud | `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`    | Neural voices                  |
| `elevenlabs`   | Cloud | `ELEVENLABS_API_KEY`                         | Premium quality                |
| `amazon_polly` | Cloud | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | AWS integration                |

### Vision (Image Captioning)

| Provider       | Type  | API Key Env Var                           | Notes                          |
| -------------- | ----- | ----------------------------------------- | ------------------------------ |
| `blip_local`   | Local | None                                      | Default, no network dependency |
| `openai_api`   | Cloud | `OPENAI_API_KEY`                          | GPT-4 Vision                   |
| `google_cloud` | Cloud | `GOOGLE_CLOUD_API_KEY`                    | Cloud Vision AI                |
| `azure`        | Cloud | `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | Computer Vision                |
| `anthropic`    | Cloud | `ANTHROPIC_API_KEY`                       | Claude Vision                  |

### OCR (Text Extraction)

| Provider          | Type  | API Key Env Var                              | Notes                          |
| ----------------- | ----- | -------------------------------------------- | ------------------------------ |
| `tesseract_local` | Local | None                                         | Default, no network dependency |
| `google_cloud`    | Cloud | `GOOGLE_CLOUD_API_KEY`                       | High accuracy                  |
| `azure`           | Cloud | `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`    | Document AI                    |
| `aws_textract`    | Cloud | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Document analysis              |

## Configuration

### Environment Variables

```bash
# Enable/Disable failover (default: true)
ENABLE_PROVIDER_FAILOVER=true
MAX_FAILOVER_ATTEMPTS=3

# OpenAI
OPENAI_API_KEY=sk-...

# Google Cloud
GOOGLE_CLOUD_API_KEY=AIza...

# Azure
AZURE_SPEECH_KEY=...
AZURE_SPEECH_REGION=eastus

# ElevenLabs
ELEVENLABS_API_KEY=...

# Deepgram
DEEPGRAM_API_KEY=...

# AssemblyAI
ASSEMBLY_AI_API_KEY=...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# AWS
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# Local Models
WHISPER_MODEL_SIZE=base
BLIP_MODEL_NAME=Salesforce/blip-image-captioning-base
COQUI_MODEL_NAME=tts_models/en/ljspeech/tacotron2-DDC
```

## API Endpoints

### V2 Endpoints (Multi-Provider)

#### STT - Transcribe with Failover

```http
POST /api/v2/stt/transcribe
Content-Type: multipart/form-data

- audio: Audio file (WAV, MP3, OGG, FLAC, WEBM)
- language: (optional) Language code
- preferred_provider: (optional) Provider to try first
```

**Response:**

```json
{
  "text": "Hello, this is a test.",
  "confidence": 0.95,
  "language": "en",
  "duration": 2.5,
  "provider": "whisper_local",
  "words": [...]
}
```

#### TTS - Synthesize with Failover

```http
POST /api/v2/tts/synthesize
Content-Type: application/json

{
  "text": "Hello world",
  "voice": "default",
  "speed": 1.0,
  "language": "en"
}
```

**Response:** Audio file (WAV) with headers:

- `X-Provider`: Provider used
- `X-Duration`: Audio duration
- `X-Sample-Rate`: Sample rate

#### Vision - Alt-Text with Failover

```http
POST /api/v2/alt-text/generate
Content-Type: multipart/form-data

- image: Image file (PNG, JPEG, GIF, WEBP)
- context: (optional) Context for captioning
- preferred_provider: (optional) Provider to try first
```

**Response:**

```json
{
  "short_description": "A dog playing in a park",
  "long_description": "A golden retriever playing fetch...",
  "confidence": 0.92,
  "provider": "blip_local",
  "detected_objects": ["dog", "ball", "grass"],
  "detected_labels": ["outdoor", "animal", "pet"]
}
```

#### OCR - Text Extraction with Failover

```http
POST /api/v2/alt-text/extract-text
Content-Type: multipart/form-data

- image: Image file (PNG, JPEG)
- language: Expected language (default: en)
- preferred_provider: (optional) Provider to try first
```

**Response:**

```json
{
  "text": "Extracted text from image...",
  "confidence": 0.88,
  "provider": "tesseract_local",
  "language": "en",
  "regions": [...]
}
```

### Health & Monitoring

#### Provider Health Status

```http
GET /health/providers
```

**Response:**

```json
{
  "multi_provider_enabled": true,
  "providers": {
    "stt": {
      "whisper_local": {
        "status": "healthy",
        "consecutive_failures": 0,
        "avg_latency_ms": 250
      },
      "openai_api": {
        "status": "healthy",
        "consecutive_failures": 0,
        "avg_latency_ms": 450
      }
    },
    "tts": {...},
    "vision": {...}
  }
}
```

#### List Available Providers

```http
GET /api/v2/providers
```

**Response:**

```json
{
  "stt": {
    "available": ["whisper_local", "openai_api"],
    "health": {...}
  },
  "tts": {
    "available": ["coqui_local", "openai_api"],
    "health": {...}
  },
  "vision": {
    "available": ["blip_local", "openai_api"],
    "health": {...}
  },
  "ocr": {
    "available": ["tesseract_local", "google_cloud"],
    "health": {...}
  }
}
```

## Failover Behavior

### Circuit Breaker Pattern

Each provider has health tracking with a circuit breaker:

1. **Healthy**: Provider is working normally
2. **Degraded**: 1-4 consecutive failures, still attempted
3. **Unhealthy**: 5+ consecutive failures, enters 60-second cooldown

### Failover Order

Providers are tried in priority order (configurable):

1. **Local models first** (no network dependency)
2. **Primary cloud provider** (fastest/most accurate)
3. **Secondary cloud providers** (fallbacks)

### Recovery

- After successful request, failure count resets
- After cooldown period, unhealthy providers are retried
- Health status is tracked per-provider

## Example Usage

### Python Client

```python
import httpx

# Transcribe with automatic failover
with open("audio.wav", "rb") as f:
    response = httpx.post(
        "http://localhost:8000/api/v2/stt/transcribe",
        files={"audio": f},
        params={"language": "en"}
    )
    result = response.json()
    print(f"Transcription: {result['text']}")
    print(f"Provider used: {result['provider']}")

# Check provider health
health = httpx.get("http://localhost:8000/health/providers").json()
for service, providers in health["providers"].items():
    print(f"\n{service}:")
    for name, status in providers.items():
        print(f"  {name}: {status['status']}")
```

### JavaScript Client

```javascript
// Generate alt-text with failover
const formData = new FormData();
formData.append('image', imageFile);

const response = await fetch('/api/v2/alt-text/generate', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
console.log(`Caption: ${result.short_description}`);
console.log(`Provider: ${result.provider}`);
```

## Best Practices

1. **Always configure at least 2 providers per service** for true resilience
2. **Local models are recommended as primary** for lowest latency
3. **Monitor `/health/providers` endpoint** to detect degraded providers
4. **Set appropriate timeouts** for cloud providers (default: 30s)
5. **Use `preferred_provider` parameter** only for testing/debugging

## Troubleshooting

### All providers failing

- Check environment variables are set correctly
- Verify network connectivity to cloud services
- Check `/health/providers` for specific error messages

### High latency

- Local models may be loading on first request
- Consider pre-warming models on startup
- Check cloud provider status pages

### Provider not appearing in available list

- Verify API key environment variable is set
- Check for typos in environment variable names
- Restart service after adding new keys
