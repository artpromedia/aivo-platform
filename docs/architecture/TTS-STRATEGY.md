# TTS Strategy — Open-Source + Cloud Provider Matrix

## Overview

AIVO uses a multi-tier TTS architecture optimised for K-12 education. Open-source
models handle the majority of student-facing synthesis (privacy, zero marginal cost,
offline capability), while cloud APIs serve specialised use-cases that demand their
unique features.

## Provider Matrix

| Provider | Model | Params | License | Hardware | Latency | Cost | Best For |
|---|---|---|---|---|---|---|---|
| **Dia** (Nari Labs) | Dia-1.6B | 1.6 B | Apache 2.0 | GPU ≥6 GB VRAM | ~1.5 s | $0 | Tutoring, dialogue, emotional narration |
| **Kokoro** (Hexgrad) | Kokoro-82M | 82 M | Apache 2.0 | CPU (real-time) | ~0.3 s | $0 | Mobile, Chromebook, offline, edge |
| **OpenAI** | gpt-4o-mini-tts | — | Proprietary | Cloud API | ~0.8 s | $15/1M chars | IEP read-aloud, steerable emotion |
| **Google Cloud** | WaveNet / Neural2 | — | Proprietary | Cloud API | ~0.5 s | $4-16/1M chars | Multilingual, SSML |
| **Azure** | Neural TTS | — | Proprietary | Cloud API | ~0.5 s | $4/1M chars | Accessibility, SSML, Immersive Reader |
| **ElevenLabs** | Multilingual v2 | — | Proprietary | Cloud API | ~1.0 s | $11-99/mo | Parent comms, premium voice cloning |
| **Amazon Polly** | Neural / Standard | — | Proprietary | Cloud API | ~0.4 s | $4-16/1M chars | AWS-native, bulk narration |
| **Coqui** | XTTS-v2 | ~500 M | MPL 2.0 | GPU / CPU | ~2.0 s | $0 | Legacy, voice-cloning experiments |

## Strategy Selector

`TTSStrategySelector.select_provider()` routes requests by use-case:

```
tutoring          → dia_local       (emotional, free, on-prem)
mobile/chromebook → kokoro_local    (CPU real-time, offline)
iep_read_aloud    → openai_api      (steerable emotion, highest quality)
accessibility     → azure           (SSML, screen-reader integration)
parent_comms      → elevenlabs      (professional, premium)
storytelling      → dia_local       (multi-speaker dialogue)
offline           → kokoro_local    (CPU, no network required)
budget_exhausted  → dia/kokoro      (zero cost fallback)
```

## Privacy & Compliance (K-12)

### COPPA / FERPA Alignment

| Concern | Open-Source (Dia / Kokoro) | Cloud APIs |
|---|---|---|
| Data leaves premises | **No** — all inference local | Yes — text sent to vendor |
| Student PII exposure | **None** | Governed by DPA / BAA |
| Vendor sub-processors | **None** | Per vendor policy |
| Audit trail | Local logs only | Vendor logs + local |
| Parental consent scope | Minimal | Must cover API vendor |

### Recommendation

Use **Dia** or **Kokoro** for all student-facing synthesis by default.
Reserve cloud APIs for:
- IEP accommodations requiring OpenAI's steerable voices
- Parent/guardian communications (ElevenLabs premium quality)
- Multilingual content where Google/Azure SSML is superior

## Default Priority Order

```
1. OpenAI gpt-4o-mini-tts   (highest quality, steerable)
2. Dia 1.6B                 (free, emotional, GPU)
3. Google Cloud TTS          (multilingual SSML)
4. Azure Speech              (accessibility features)
5. Kokoro 82M                (free, CPU, offline)
6. ElevenLabs                (premium voices)
7. Amazon Polly              (AWS integration)
8. Coqui XTTS-v2             (legacy)
```

This order applies to the **automatic failover chain**. The `TTSStrategySelector`
overrides this ordering when a specific `use_case` is provided.

## Installation

Open-source providers are **optional** dependencies:

```bash
# GPU environment (Dia + Kokoro)
pip install dia-tts kokoro soundfile

# CPU-only environment (Kokoro only)
pip install kokoro soundfile
```

Both providers use lazy loading — the model is only downloaded and initialised on
first synthesis call. If the package is not installed, the provider is silently
skipped and failover continues to the next provider in the chain.

## Architecture

```
MultiProviderTTS
├── _setup_providers()      ← registers all 8 providers
├── _synthesize_dia()       ← delegates to DiaTTSProvider
├── _synthesize_kokoro()    ← delegates to KokoroTTSProvider
├── _synthesize_coqui_local()
├── _synthesize_openai_api()
├── _synthesize_google_cloud()
├── _synthesize_azure()
├── _synthesize_elevenlabs()
└── _synthesize_amazon_polly()

TTSStrategySelector
└── select_provider(use_case, has_gpu, has_network, budget)
```
