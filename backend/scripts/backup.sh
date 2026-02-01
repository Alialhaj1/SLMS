#!/bin/bash

###############################################################################
# PostgreSQL Automated Backup Script
# 
# Features:
# - Daily full backup with compression
# - Automatic cleanup (30-day retention)
# - Timestamped filenames
# - Error handling and logging
# - Production-ready
#
# Usage:
#   ./backup.sh
#
# Cron (daily at 2 AM):
#   0 2 * * * /app/backup.sh >> /var/log/backup.log 2>&1
###############################################################################

set -e  # Exit on error

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-slms_db}"
DB_USER="${DB_USER:-slms}"
PGPASSWORD="${DB_PASSWORD:-slms_pass}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Export password for pg_dump
export PGPASSWORD

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/slms_${TIMESTAMP}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

echo "=========================================="
echo "Starting backup: $(date)"
echo "Database: ${DB_NAME}@${DB_HOST}:${DB_PORT}"
echo "Backup file: ${COMPRESSED_FILE}"
echo "=========================================="

# Create backup
echo "Creating database dump..."
if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --verbose \
    --no-owner \
    --no-acl \
    --format=plain \
    > "$BACKUP_FILE"; then
    echo "✓ Database dump created successfully"
else
    echo "✗ Database dump failed!"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Compress backup
echo "Compressing backup..."
if gzip -9 "$BACKUP_FILE"; then
    echo "✓ Backup compressed successfully"
    BACKUP_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
    echo "  Size: $BACKUP_SIZE"
else
    echo "✗ Compression failed!"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Cleanup old backups
echo "Cleaning up old backups (retention: ${RETENTION_DAYS} days)..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "slms_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete -print | wc -l)
echo "✓ Deleted $DELETED_COUNT old backup(s)"

# List current backups
echo ""
echo "Current backups:"
ls -lh "$BACKUP_DIR"/slms_*.sql.gz 2>/dev/null || echo "  No backups found"

# Calculate total backup size
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo ""
echo "Total backup size: $TOTAL_SIZE"

echo "=========================================="
echo "Backup completed: $(date)"
echo "=========================================="

exit 0
