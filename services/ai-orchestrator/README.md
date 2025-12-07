# AI Orchestrator

Fastify-based internal service that fronts LLM providers (starting with a deterministic mock) for other Aivo services.

## Setup

- `pnpm install --filter @aivo/ai-orchestrator...`
- Copy `.env.example` to `.env` and set `INTERNAL_API_KEY` (and `DATABASE_URL` if using Postgres).
- Run dev: `pnpm --filter @aivo/ai-orchestrator dev`
- Tests: `pnpm --filter @aivo/ai-orchestrator test`
- Seed configs (requires `DATABASE_URL`): `pnpm --filter @aivo/ai-orchestrator seed:agent-configs`

## Endpoints

- `POST /internal/ai/echo` body `{ "message": "hi" }`
- `POST /internal/ai/test-agent` body `{ "tenantId": "t-1", "agentType": "BASELINE", "payload": {"foo": "bar"} }` (agentType must match the registry)
- Admin (internal):
  - `GET /internal/ai/configs` (filters: `agent_type`, `is_active`)
  - `POST /internal/ai/configs`
  - `PATCH /internal/ai/configs/:id`

All endpoints require header `X-Internal-Api-Key: <your key>`.

## cURL examples

```bash
curl -X POST http://localhost:4010/internal/ai/echo \
	-H "Content-Type: application/json" \
	-H "X-Internal-Api-Key: dev-internal-key" \
	-d '{"message":"hello"}'

curl -X POST http://localhost:4010/internal/ai/test-agent \
	-H "Content-Type: application/json" \
	-H "X-Internal-Api-Key: dev-internal-key" \
	-d '{"tenantId":"tenant-1","agentType":"BASELINE","payload":{"question":"hi"}}'
```
