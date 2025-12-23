# ML Recommendation Microservice

Machine learning-based recommendation service for the AIVO learning platform.

## Features

- **Collaborative Filtering**: User-based and item-based recommendations
- **Content-Based Filtering**: Skill and topic similarity scoring
- **Knowledge Tracing Integration**: BKT-enhanced recommendations
- **Multi-Armed Bandit**: Exploration vs exploitation optimization
- **Real-time Scoring**: Low-latency recommendation APIs

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ML Recommendation Service                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ FastAPI     │  │ ML Models   │  │ Feature Store           │ │
│  │ Endpoints   │  │             │  │ (Redis)                 │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│         │               │                    │                  │
│  ┌──────┴───────────────┴────────────────────┴───────────────┐ │
│  │              Recommendation Engine                         │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐ │ │
│  │  │ Collaborative│ │ Content-Based│ │ Knowledge Tracing  │ │ │
│  │  │ Filtering    │ │ Filtering    │ │ Integration        │ │ │
│  │  └──────────────┘ └──────────────┘ └────────────────────┘ │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐ │ │
│  │  │ Multi-Armed  │ │ Contextual   │ │ Ensemble           │ │ │
│  │  │ Bandit       │ │ Bandits      │ │ Combiner           │ │ │
│  │  └──────────────┘ └──────────────┘ └────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Install dependencies
pip install -e ".[dev]"

# Run the service
uvicorn src.main:app --reload --port 4020

# Run tests
pytest
```

## API Endpoints

- `POST /recommendations/activities` - Get activity recommendations
- `POST /recommendations/skills` - Get skill practice recommendations
- `POST /recommendations/content` - Get content recommendations
- `POST /feedback` - Submit recommendation feedback for learning
- `GET /health` - Health check endpoint

## Environment Variables

| Variable       | Description               | Default                |
| -------------- | ------------------------- | ---------------------- |
| `PORT`         | Service port              | 4020                   |
| `REDIS_URL`    | Redis connection URL      | redis://localhost:6379 |
| `DATABASE_URL` | PostgreSQL connection URL | -                      |
| `RABBITMQ_URL` | RabbitMQ connection URL   | amqp://localhost:5672  |
| `LOG_LEVEL`    | Logging level             | info                   |
