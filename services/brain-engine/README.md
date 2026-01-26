# Brain Engine

Personalized AI brain engine for adaptive learning recommendations and learner modeling.

## Features

- **Learner State Tracking**: Real-time cognitive and engagement state
- **Adaptive Recommendations**: Personalized content and activity suggestions
- **Knowledge Modeling**: Skill mastery and knowledge graph integration
- **Real-time Adaptation**: Dynamic difficulty and pacing adjustment

## Architecture

```
brain-engine/
├── src/
│   ├── main.py          # FastAPI application
│   ├── settings.py      # Configuration
│   ├── models/          # Data models
│   ├── services/        # Business logic
│   └── api/             # API routes
└── tests/
```

## Development

```bash
# Install dependencies
pip install -e ".[dev]"

# Run development server
uvicorn src.main:app --reload
```

## Environment Variables

| Variable     | Description                  |
| ------------ | ---------------------------- |
| DATABASE_URL | PostgreSQL connection string |
| REDIS_URL    | Redis connection string      |
| SUPABASE_URL | Supabase project URL         |
