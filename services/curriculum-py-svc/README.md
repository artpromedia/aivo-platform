# Curriculum Python Service

Curriculum management and standards alignment service.

## Features

- **Curriculum Management**: Create and manage curriculum structures
- **Standards Alignment**: Map content to educational standards (CCSS, state standards)
- **Learning Progressions**: Define skill progressions and prerequisites
- **Content Mapping**: Associate learning objects with curriculum units

## API Endpoints

### Health

- `GET /health` - Health check

### Curriculum

- `GET /api/v1/curriculum` - List curricula
- `GET /api/v1/curriculum/{id}` - Get curriculum details
- `POST /api/v1/curriculum` - Create curriculum
- `PUT /api/v1/curriculum/{id}` - Update curriculum

### Standards

- `GET /api/v1/standards` - List standards
- `GET /api/v1/standards/search` - Search standards

## Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload
```

## Environment Variables

| Variable     | Description                  |
| ------------ | ---------------------------- |
| DATABASE_URL | PostgreSQL connection string |
| REDIS_URL    | Redis connection string      |
