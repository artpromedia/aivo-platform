# Tutor Voice Expansion Checklist

Current Piper TTS voice inventory and procedure for adding new voices.

## Current Voice Inventory

### Tier 1 — Voice Available (Production)

| Locale    | Language              | Piper Voice ID                | Quality |
|-----------|-----------------------|-------------------------------|---------|
| en-US     | English (US)          | en_US-amy-medium              | Medium  |
| en-GB     | English (UK)          | en_GB-alan-medium             | Medium  |
| es-MX     | Spanish (Mexico)      | es_MX-claude-high             | High    |
| es-ES     | Spanish (Spain)       | es_ES-sharvard-medium         | Medium  |
| fr        | French                | fr_FR-siwis-medium            | Medium  |
| de        | German                | de_DE-thorsten-medium         | Medium  |
| pt-BR     | Portuguese (Brazil)   | pt_BR-edresson-low            | Low     |
| zh-CN     | Chinese (Simplified)  | zh_CN-huayan-medium           | Medium  |
| ar        | Arabic                | ar_JO-kareem-medium           | Medium  |
| ru        | Russian               | ru_RU-irina-medium            | Medium  |
| tr        | Turkish               | tr_TR-dfki-medium             | Medium  |
| nl        | Dutch                 | nl_NL-mls-medium              | Medium  |
| it        | Italian               | it_IT-riccardo-x_low          | X-Low   |
| sw        | Swahili               | sw_CD-lanfrica-medium         | Medium  |

### Tier 2 — Text-Only (No Piper Voice Yet)

| Locale | Language   | Priority | Notes                              |
|--------|------------|----------|------------------------------------|
| ja     | Japanese   | P1       | Piper community model in progress  |
| ko     | Korean     | P1       | Investigate espeak-ng fallback     |
| hi     | Hindi      | P2       | COQUI-TTS has Hindi models         |
| id     | Indonesian | P3       | Low user demand currently          |

### Tier 3 — Future Expansion

| Locale | Language    | Priority | Notes                                    |
|--------|-------------|----------|------------------------------------------|
| vi     | Vietnamese  | P3       | Growing user base in SE Asia             |
| th     | Thai        | P3       | No known open-source TTS                 |
| pl     | Polish      | P3       | Piper has pl_PL models available         |
| he     | Hebrew      | P3       | RTL locale, no known Piper voice yet     |

## Adding a New Piper Voice (Ops-Only Procedure)

No code changes required. The system discovers new voices from the database.

### Step 1: Download the Piper model

```bash
# Example: adding Japanese voice
cd /opt/piper/models
wget https://huggingface.co/rhasspy/piper-voices/resolve/main/ja/ja_JP/takumi/medium/ja_JP-takumi-medium.onnx
wget https://huggingface.co/rhasspy/piper-voices/resolve/main/ja/ja_JP/takumi/medium/ja_JP-takumi-medium.onnx.json
```

### Step 2: Register the voice in the database

```sql
INSERT INTO tutor_voice_config (persona_id, locale, tts_voice_id, tts_engine, is_active)
SELECT p.id, 'ja', 'ja_JP-takumi-medium', 'piper', true
FROM tutor_persona p;
```

### Step 3: Update locale config

In `services/tutor-svc/src/services/locale.service.ts` and
`services/ai-orchestrator/src/generation/tutor-locale-adapter.ts`:

```typescript
// Change:
'ja': { ..., piperVoiceAvailable: false, piperVoiceId: null },

// To:
'ja': { ..., piperVoiceAvailable: true, piperVoiceId: 'ja_JP-takumi-medium' },
```

### Step 4: Verify

```bash
# Test the voice directly
curl -X POST http://localhost:5000/api/tts \
  -H 'Content-Type: application/json' \
  -d '{"text": "こんにちは、テストです。", "voice": "ja_JP-takumi-medium"}' \
  --output test.wav

# Test via tutor session
curl -X POST http://localhost:4010/api/v1/tutor/sessions \
  -H 'Content-Type: application/json' \
  -d '{"learnerId": "...", "personaSlug": "nova-math", "subject": "MATH", "locale": "ja"}'
```

### Step 5: Restart Piper service

```bash
docker restart piper-tts
```

The tutor-svc stream endpoint will automatically detect the new voice through the
`voice_config` table lookup and the updated `piperVoiceAvailable` flag in locale config.

## Quality Guidelines

- **Minimum quality**: `low` for production use
- **Recommended quality**: `medium` for best latency/quality balance
- **High quality**: Only use when latency budget allows (>500ms first-byte)
- Always test with child-appropriate sample text before deploying
- Verify prosody with question sentences and exclamations
