# AI Inference Service

Multi-provider AI inference service with automatic failover, content adaptation, and safety guardrails.

## Features

- **Multi-Provider Support**: OpenAI, Anthropic, Google AI, with automatic failover
- **Content Adaptation Engine**: Multi-strategy content personalization
- **Safety Guardrails**: Content filtering and safety checks
- **Provider Routing**: Intelligent request routing based on model capabilities

## API Endpoints

### Health

- `GET /health` - Health check
- `GET /health/ready` - Readiness check

### Inference

- `POST /api/v1/inference/complete` - Text completion
- `POST /api/v1/inference/chat` - Chat completion
- `POST /api/v1/inference/embed` - Generate embeddings

### Adaptation

- `POST /api/v1/adapt/content` - Adapt content for learner

## Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload
```

## Environment Variables

| Variable          | Description             |
| ----------------- | ----------------------- |
| OPENAI_API_KEY    | OpenAI API key          |
| ANTHROPIC_API_KEY | Anthropic API key       |
| DEFAULT_PROVIDER  | Default AI provider     |
| REDIS_URL         | Redis connection string |
