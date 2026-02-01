#!/bin/bash
# =============================================================================
# SLMS Pre-Deployment Backup Script
# Run this BEFORE every deployment!
# =============================================================================

set -e

BACKUP_DIR="/home/slms/backups/pre-deploy"
DATETIME=$(date +%Y-%m-%d_%H-%M-%S)

echo "========================================"
echo "Pre-Deployment Backup - $DATETIME"
echo "========================================"

# Create directory
mkdir -p "$BACKUP_DIR"

# Backup database
echo "[1/3] Backing up database..."
docker compose exec -T postgres pg_dump -U slms_prod slms_production | gzip > "$BACKUP_DIR/pre_deploy_$DATETIME.sql.gz"

# Backup current code state
echo "[2/3] Recording git state..."
git log -1 --format="%H %s" > "$BACKUP_DIR/git_state_$DATETIME.txt"
git status >> "$BACKUP_DIR/git_state_$DATETIME.txt"

# Verify backup
echo "[3/3] Verifying backup..."
if [ -f "$BACKUP_DIR/pre_deploy_$DATETIME.sql.gz" ]; then
    SIZE=$(ls -lh "$BACKUP_DIR/pre_deploy_$DATETIME.sql.gz" | awk '{print $5}')
    echo "✅ Backup created: pre_deploy_$DATETIME.sql.gz ($SIZE)"
    echo ""
    echo "========================================"
    echo "Safe to proceed with deployment!"
    echo "========================================"
else
    echo "❌ BACKUP FAILED! DO NOT PROCEED!"
    exit 1
fi
