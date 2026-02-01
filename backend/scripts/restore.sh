#!/bin/bash

###############################################################################
# PostgreSQL Backup Restore Script
# 
# Usage:
#   ./restore.sh <backup_file>
#   ./restore.sh slms_2025-12-25_02-00-00.sql.gz
#
# WARNING: This will DROP and recreate the database!
###############################################################################

set -e  # Exit on error

# Check arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_file>"
    echo ""
    echo "Available backups:"
    ls -lh /backups/slms_*.sql.gz 2>/dev/null || echo "  No backups found"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    # Try with /backups prefix
    if [ -f "/backups/$BACKUP_FILE" ]; then
        BACKUP_FILE="/backups/$BACKUP_FILE"
    else
        echo "Error: Backup file not found: $BACKUP_FILE"
        exit 1
    fi
fi

# Configuration
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-slms_db}"
DB_USER="${DB_USER:-slms}"
PGPASSWORD="${DB_PASSWORD:-slms_pass}"

# Export password for psql
export PGPASSWORD

echo "=========================================="
echo "⚠️  WARNING: DATABASE RESTORE"
echo "=========================================="
echo "This will:"
echo "  1. DROP database: $DB_NAME"
echo "  2. CREATE new database: $DB_NAME"
echo "  3. RESTORE from: $BACKUP_FILE"
echo ""
echo "All existing data will be LOST!"
echo ""
read -p "Are you sure? Type 'YES' to continue: " CONFIRM

if [ "$CONFIRM" != "YES" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo ""
echo "Starting restore: $(date)"
echo "=========================================="

# Decompress backup if needed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "Decompressing backup..."
    SQL_FILE="/tmp/restore_$(date +%s).sql"
    gunzip -c "$BACKUP_FILE" > "$SQL_FILE"
else
    SQL_FILE="$BACKUP_FILE"
fi

# Terminate existing connections
echo "Terminating existing connections..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres <<EOF
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '$DB_NAME'
  AND pid <> pg_backend_pid();
EOF

# Drop database
echo "Dropping database..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"

# Create database
echo "Creating database..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"

# Restore backup
echo "Restoring backup..."
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < "$SQL_FILE"; then
    echo "✓ Database restored successfully"
else
    echo "✗ Restore failed!"
    exit 1
fi

# Cleanup temp file
if [[ "$BACKUP_FILE" == *.gz ]]; then
    rm -f "$SQL_FILE"
fi

echo "=========================================="
echo "Restore completed: $(date)"
echo "=========================================="

exit 0
