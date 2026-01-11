#!/bin/sh
# ==============================================================================
# Auth Service - Docker Entrypoint Script
# ==============================================================================

set -e

# Log startup
echo "Starting Auth Service..."
echo "NODE_ENV: ${NODE_ENV}"
echo "PORT: ${PORT}"

# Wait for database if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
    echo "Waiting for database..."
    # Extract host and port from DATABASE_URL
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    
    if [ -n "$DB_HOST" ] && [ -n "$DB_PORT" ]; then
        timeout=60
        while ! nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
            timeout=$((timeout - 1))
            if [ $timeout -le 0 ]; then
                echo "Timeout waiting for database"
                exit 1
            fi
            sleep 1
        done
        echo "Database is ready"
    fi
fi

# Wait for Redis if REDIS_URL is set
if [ -n "$REDIS_URL" ]; then
    echo "Waiting for Redis..."
    REDIS_HOST=$(echo $REDIS_URL | sed -n 's/redis:\/\/\([^:]*\):.*/\1/p')
    REDIS_PORT=$(echo $REDIS_URL | sed -n 's/.*:\([0-9]*\)$/\1/p')
    
    if [ -n "$REDIS_HOST" ] && [ -n "$REDIS_PORT" ]; then
        timeout=30
        while ! nc -z "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; do
            timeout=$((timeout - 1))
            if [ $timeout -le 0 ]; then
                echo "Timeout waiting for Redis"
                exit 1
            fi
            sleep 1
        done
        echo "Redis is ready"
    fi
fi

# Start the application
echo "Starting application..."
exec node dist/index.js
