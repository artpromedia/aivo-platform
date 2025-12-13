# AIVO NATS JetStream Infrastructure

This directory contains the NATS JetStream cluster configuration for AIVO's event streaming infrastructure.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NATS JetStream Cluster                            │
│                                                                             │
│  ┌───────────┐     ┌───────────┐     ┌───────────┐                         │
│  │  nats1    │◄───►│  nats2    │◄───►│  nats3    │                         │
│  │  :4222    │     │  :4223    │     │  :4224    │                         │
│  └───────────┘     └───────────┘     └───────────┘                         │
│        │                                                                    │
│        ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         JetStream Streams                            │   │
│  │                                                                      │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐        │   │
│  │  │ LEARNING │  │  FOCUS   │  │ HOMEWORK │  │ RECOMMENDATION │        │   │
│  │  │ 30d/10GB │  │ 7d/20GB  │  │ 90d/5GB  │  │    90d/5GB    │        │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └───────────────┘        │   │
│  │                                                                      │   │
│  │  ┌──────────┐                                                        │   │
│  │  │   DLQ    │  Dead Letter Queue                                     │   │
│  │  │ 30d/2GB  │                                                        │   │
│  │  └──────────┘                                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Start the NATS Cluster

```bash
cd infra/nats
docker-compose up -d
```

### 2. Verify Cluster Health

```bash
# Check all nodes are running
docker-compose ps

# Check cluster status via HTTP monitoring
curl http://localhost:8222/healthz

# View JetStream status
curl http://localhost:8222/jsz
```

### 3. Initialize Streams

```bash
# Option 1: Using nats-box container
docker-compose --profile tools up -d nats-box
docker exec -it aivo-nats-box /bin/bash -c "
  cd /scripts && ./init-streams.sh
"

# Option 2: Using local NATS CLI (if installed)
NATS_URL=nats://localhost:4222 ./scripts/init-streams.sh
```

## Streams

| Stream | Subjects | Retention | Max Age | Max Size | Use Case |
|--------|----------|-----------|---------|----------|----------|
| LEARNING | `learning.>` | Limits | 30 days | 10 GB | Session, activity, skill events |
| FOCUS | `focus.>` | Limits | 7 days | 20 GB | High-volume telemetry pings |
| HOMEWORK | `homework.>` | Limits | 90 days | 5 GB | Homework helper events |
| RECOMMENDATION | `recommendation.>` | Limits | 90 days | 5 GB | Personalization events |
| DLQ | `dlq.>` | Limits | 30 days | 2 GB | Failed/unprocessable events |

## Subject Naming Convention

```
<domain>.<entity>.<action>

Examples:
  learning.session.started
  learning.activity.completed
  focus.ping
  focus.loss.idle
  homework.question.asked
  recommendation.created
```

## Consumers

### Indexer Consumer
- **Purpose**: Writes all events to Postgres `events` table
- **Streams**: All streams
- **Ack Policy**: Explicit
- **Max Deliveries**: 5

### Analytics Consumer
- **Purpose**: Aggregates events for analytics dashboards
- **Streams**: LEARNING, FOCUS
- **Ack Policy**: Explicit
- **Max Deliveries**: 3

## Development Commands

```bash
# View stream info
docker exec aivo-nats-box nats stream info LEARNING -s nats://nats1:4222

# View consumer info
docker exec aivo-nats-box nats consumer info LEARNING indexer -s nats://nats1:4222

# Publish a test message
docker exec aivo-nats-box nats pub learning.test "hello" -s nats://nats1:4222

# Subscribe to events (live tail)
docker exec aivo-nats-box nats sub "learning.>" -s nats://nats1:4222

# View stream messages
docker exec aivo-nats-box nats stream view LEARNING -s nats://nats1:4222

# Purge stream (development only!)
docker exec aivo-nats-box nats stream purge LEARNING -s nats://nats1:4222 --force
```

## Monitoring

- **Node 1**: http://localhost:8222
- **Node 2**: http://localhost:8223
- **Node 3**: http://localhost:8224

### Useful Endpoints

| Endpoint | Description |
|----------|-------------|
| `/healthz` | Health check |
| `/varz` | Server variables |
| `/jsz` | JetStream info |
| `/connz` | Connections |
| `/routez` | Cluster routes |

## Production Considerations

1. **Authentication**: Enable accounts and remove `no_auth_user`
2. **TLS**: Configure certificates for all connections
3. **Resources**: Increase `max_memory_store` and `max_file_store`
4. **Monitoring**: Deploy NATS Surveyor and Prometheus exporter
5. **Backup**: Enable snapshots and offsite backup of `/data`

## Troubleshooting

### Cluster Won't Form
```bash
# Check logs for connection errors
docker-compose logs nats1 | grep -i "error\|route"

# Verify network connectivity
docker exec aivo-nats-1 ping nats2
```

### JetStream Unavailable
```bash
# Check JetStream status
curl http://localhost:8222/jsz | jq .

# Check storage
docker exec aivo-nats-1 df -h /data
```

### Consumer Falling Behind
```bash
# Check consumer lag
docker exec aivo-nats-box nats consumer info LEARNING indexer -s nats://nats1:4222

# Check pending count and increase max_pending if needed
```
