# Grading Engine

AI-powered automated grading service for essays, math problems, and other assessments.

## Features

- **Essay Grading**: AI-assisted essay evaluation with rubric support
- **Math Grading**: Automated math problem grading with partial credit
- **Rubric-Based Scoring**: Configurable rubrics and criteria
- **Feedback Generation**: Constructive feedback for learners

## Architecture

```
grading-engine/
├── src/
│   ├── main.py          # FastAPI application
│   ├── config.py        # Configuration
│   ├── models/          # Data models
│   ├── services/        # Grading logic
│   └── api/             # API routes
└── tests/
```

## API Endpoints

### Health

- `GET /health` - Health check

### Grading

- `POST /api/v1/grade/essay` - Grade an essay
- `POST /api/v1/grade/math` - Grade math problems
- `POST /api/v1/grade/batch` - Batch grading

### Rubrics

- `GET /api/v1/rubrics` - List rubrics
- `POST /api/v1/rubrics` - Create rubric

## Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn src.main:app --reload
```

## Environment Variables

| Variable             | Description                         |
| -------------------- | ----------------------------------- |
| OPENAI_API_KEY       | OpenAI API key for AI grading       |
| DATABASE_URL         | PostgreSQL connection string        |
| CONFIDENCE_THRESHOLD | Minimum confidence for auto-grading |
