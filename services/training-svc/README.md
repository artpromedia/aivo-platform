# Training Service

ML model training and brain memory system for personalized learning.

## Features

### Brain Memory System

- **Episodic Memory**: Store and retrieve specific learning events
- **Semantic Knowledge**: Generalized knowledge from learning patterns
- **Learner Beliefs**: Track learner's beliefs and misconceptions
- **Memory Consolidation**: Automatic memory optimization

### Cognitive State Detection

- **State Detection**: Real-time cognitive load and engagement detection
- **State Triggers**: Automatic intervention triggers
- **State Models**: Comprehensive cognitive state modeling

### SMART Goal Planning

- **Goal Generation**: AI-assisted SMART goal creation
- **Milestone Tracking**: Break goals into achievable milestones
- **Weekly Action Plans**: Personalized weekly activities
- **Diagnosis Adaptations**: Goals adapted for specific learning needs

## Architecture

```
training-svc/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── models/
│   │   ├── memory/      # Brain memory system
│   │   ├── cognitive/   # Cognitive state detection
│   │   └── planning/    # SMART goal planning
│   └── services/
├── migrations/          # SQL migrations
├── prisma/             # Prisma schema
└── tests/
```

## Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload
```

## Environment Variables

| Variable       | Description              |
| -------------- | ------------------------ |
| DATABASE_URL   | PostgreSQL with pgvector |
| REDIS_URL      | Redis for caching        |
| OPENAI_API_KEY | OpenAI for embeddings    |
