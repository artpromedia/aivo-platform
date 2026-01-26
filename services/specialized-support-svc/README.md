# Specialized Support Service

AI-powered support modules for learners with specific needs including ADHD, ASD, Dyslexia, and Anxiety.

## Features

### ADHD Executive Function Support

- **Executive Function Strategies**: Personalized strategies for organization, time management, planning, task initiation, working memory, and more
- **Project Breakdown**: AI-assisted decomposition of complex projects into manageable chunks
- **Daily Planner**: Personalized daily schedules with energy-level awareness and break optimization

### Planned Modules

- Autism Spectrum Accommodations
- Dyslexia Reading Support
- Anxiety Management Strategies
- Dyscalculia Math Support

## API Endpoints

### Health

- `GET /health` - Health check
- `GET /health/ready` - Readiness check

### ADHD Support

- `POST /api/v1/adhd/executive-function/strategies` - Get EF strategies
- `POST /api/v1/adhd/project-breakdown` - Break down a project
- `POST /api/v1/adhd/daily-plan` - Create a daily plan
- `POST /api/v1/adhd/support` - Get comprehensive support

## Development

### Setup

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload
```

### Testing

```bash
pytest tests/ -v
```

### Docker

```bash
# Build
docker build -t specialized-support-svc .

# Run
docker run -p 8000:8000 specialized-support-svc
```

## Environment Variables

| Variable          | Default                 | Description                  |
| ----------------- | ----------------------- | ---------------------------- |
| SERVICE_NAME      | specialized-support-svc | Service identifier           |
| DEBUG             | false                   | Enable debug mode            |
| HOST              | 0.0.0.0                 | Server host                  |
| PORT              | 8000                    | Server port                  |
| DATABASE_URL      | -                       | PostgreSQL connection string |
| REDIS_URL         | redis://localhost:6379  | Redis connection string      |
| OPENAI_API_KEY    | -                       | OpenAI API key               |
| ANTHROPIC_API_KEY | -                       | Anthropic API key            |
| LOG_LEVEL         | INFO                    | Logging level                |

## Architecture

```
specialized-support-svc/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI application
│   ├── config.py        # Configuration settings
│   └── adhd/            # ADHD support module
│       ├── __init__.py
│       ├── models.py    # Pydantic models
│       ├── service.py   # Main ADHD service
│       ├── ef_strategies.py    # Executive function strategies
│       ├── project_breakdown.py # Project decomposition
│       └── daily_planner.py    # Daily planning
├── tests/
├── Dockerfile
├── requirements.txt
└── README.md
```
