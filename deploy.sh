#!/bin/bash
set -e

# FLOW Backend Deployment Script for EC2
# Run this on the EC2 instance after Jenkins copies files

DEPLOY_DIR="/home/ubuntu/flow-backend"
COMPOSE_FILE="${DEPLOY_DIR}/docker-compose.yml"
ENV_FILE="${DEPLOY_DIR}/.env"

echo "========================================="
echo "FLOW Backend Deployment"
echo "========================================="

# Change to deploy directory
cd "${DEPLOY_DIR}"

# CRITICAL: Check if .env exists
if [ ! -f "${ENV_FILE}" ]; then
    echo ""
    echo "ERROR: .env file not found at ${ENV_FILE}"
    echo ""
    echo "You must create this file manually with real secrets."
    echo "Copy from .env.example and fill in your values:"
    echo ""
    echo "  cp .env.example .env"
    echo "  nano .env"
    echo ""
    echo "Required variables:"
    echo "  - INTERNAL_API_KEY"
    echo "  - JWT_PRIVATE_KEY"
    echo "  - JWT_PUBLIC_KEY"
    echo "  - JWT_SECRET"
    echo "  - CLOUDINARY_URL"
    echo "  - CORS_ORIGINS"
    echo ""
    exit 1
fi

echo "Using environment file: ${ENV_FILE}"
echo ""

# Load Docker images from tar files (if Jenkins transferred them - no registry mode)
if [ -f "monolith.tar.gz" ]; then
    echo "Loading monolith image from tar..."
    gunzip -c monolith.tar.gz | docker load
    rm -f monolith.tar.gz
fi

if [ -f "gateway.tar.gz" ]; then
    echo "Loading gateway image from tar..."
    gunzip -c gateway.tar.gz | docker load
    rm -f gateway.tar.gz
fi

if [ -f "realtime.tar.gz" ]; then
    echo "Loading realtime image from tar..."
    gunzip -c realtime.tar.gz | docker load
    rm -f realtime.tar.gz
fi

# Stop existing containers gracefully
echo "Stopping existing containers..."
docker-compose -f "${COMPOSE_FILE}" -p flow-backend down --remove-orphans || true

# Start services
echo "Starting services..."
docker-compose -f "${COMPOSE_FILE}" -p flow-backend up -d

# Wait for MongoDB
echo "Waiting for MongoDB..."
sleep 5
until docker exec flow-mongodb mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; do
    echo "  MongoDB not ready yet, waiting..."
    sleep 3
done
echo "  MongoDB: READY"

# Wait for Redis
echo "Waiting for Redis..."
sleep 2
until docker exec flow-redis redis-cli ping >/dev/null 2>&1; do
    echo "  Redis not ready yet, waiting..."
    sleep 2
done
echo "  Redis: READY"

# Wait for services to initialize
echo "Waiting for Node.js services..."
sleep 10

# Health checks
echo ""
echo "Running health checks..."
MAX_RETRIES=12
RETRY_DELAY=5

check_service() {
    local name=$1
    local url=$2
    local retries=0

    while [ $retries -lt $MAX_RETRIES ]; do
        if curl -sf "${url}" >/dev/null 2>&1; then
            echo "  ${name}: HEALTHY"
            return 0
        fi
        retries=$((retries + 1))
        echo "  ${name}: check ${retries}/${MAX_RETRIES}..."
        sleep $RETRY_DELAY
    done

    echo "  ${name}: FAILED"
    return 1
}

# Check Gateway (public-facing)
check_service "Gateway" "http://localhost:3000/health" || EXIT_CODE=1

# Check Monolith (via gateway proxy)
check_service "Monolith" "http://localhost:3000/api/health" || EXIT_CODE=1

# Check Realtime
check_service "Realtime" "http://localhost:3005/health" || EXIT_CODE=1

if [ -n "$EXIT_CODE" ]; then
    echo ""
    echo "ERROR: One or more services failed health check"
    echo "Check logs: docker-compose -f ${COMPOSE_FILE} logs"
    exit 1
fi

# Clean up old images
echo ""
echo "Cleaning up old Docker images..."
docker image prune -af --filter "until=168h" || true

# Show running containers
echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
docker-compose -f "${COMPOSE_FILE}" -p flow-backend ps

echo ""
echo "Services:"
echo "  Gateway API:  http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000"
echo "  Realtime WS:  http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3005"
echo "  MongoDB:      localhost:27017 (internal only)"
echo "  Redis:        localhost:6379 (internal only)"
echo "  Monolith:     localhost:4000 (internal only)"
echo "========================================="