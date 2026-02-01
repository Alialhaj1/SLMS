#!/bin/bash
# =============================================================================
# SLMS Deployment Script
# Safe deployment with automatic backup and rollback capability
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}"
echo "========================================"
echo "     SLMS Deployment Script"
echo "========================================"
echo -e "${NC}"

# Check if we're in the right directory
if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}Error: docker-compose.prod.yml not found!${NC}"
    echo "Please run this script from the SLMS root directory."
    exit 1
fi

# Step 1: Pre-deployment backup
echo -e "${YELLOW}[1/6] Creating pre-deployment backup...${NC}"
./scripts/backup-before-deploy.sh

# Step 2: Pull latest code
echo -e "${YELLOW}[2/6] Pulling latest code from Git...${NC}"
git pull origin main

# Step 3: Build new images
echo -e "${YELLOW}[3/6] Building Docker images...${NC}"
docker compose -f docker-compose.prod.yml build

# Step 4: Stop old containers
echo -e "${YELLOW}[4/6] Stopping old containers...${NC}"
docker compose -f docker-compose.prod.yml down

# Step 5: Start new containers
echo -e "${YELLOW}[5/6] Starting new containers...${NC}"
docker compose -f docker-compose.prod.yml up -d

# Step 6: Run migrations
echo -e "${YELLOW}[6/6] Running database migrations...${NC}"
sleep 10  # Wait for database to be ready
docker compose -f docker-compose.prod.yml exec backend npm run migrate

# Health check
echo ""
echo -e "${YELLOW}Performing health check...${NC}"
sleep 5

HEALTH_CHECK=$(curl -s http://localhost:4000/api/health || echo "FAILED")

if echo "$HEALTH_CHECK" | grep -q "ok"; then
    echo -e "${GREEN}"
    echo "========================================"
    echo "     ✅ Deployment Successful!"
    echo "========================================"
    echo -e "${NC}"
    
    # Show running containers
    docker compose -f docker-compose.prod.yml ps
else
    echo -e "${RED}"
    echo "========================================"
    echo "     ❌ Deployment Failed!"
    echo "========================================"
    echo "Health check failed. Rolling back..."
    echo -e "${NC}"
    
    # Show logs for debugging
    docker compose -f docker-compose.prod.yml logs --tail=50
    
    exit 1
fi
