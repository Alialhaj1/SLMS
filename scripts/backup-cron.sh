#!/bin/bash
# =============================================================================
# SLMS Automated Backup Script
# Runs via cron inside backup container
# =============================================================================

set -e

# Configuration
BACKUP_DIR="/backups"
RETENTION_DAILY=7
RETENTION_WEEKLY=4
RETENTION_MONTHLY=12

DATE=$(date +%Y-%m-%d)
DATETIME=$(date +%Y-%m-%d_%H-%M-%S)
DAY_OF_WEEK=$(date +%u)  # 1=Monday, 7=Sunday
DAY_OF_MONTH=$(date +%d)

echo "========================================"
echo "SLMS Backup - $DATETIME"
echo "========================================"

# Create directories if not exist
mkdir -p "$BACKUP_DIR/daily"
mkdir -p "$BACKUP_DIR/weekly"
mkdir -p "$BACKUP_DIR/monthly"

# =============================================================================
# Daily Backup
# =============================================================================
echo "[1/4] Creating daily backup..."

DAILY_FILE="$BACKUP_DIR/daily/slms_daily_$DATETIME.sql.gz"
pg_dump -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" | gzip > "$DAILY_FILE"

if [ -f "$DAILY_FILE" ]; then
    SIZE=$(ls -lh "$DAILY_FILE" | awk '{print $5}')
    echo "✅ Daily backup created: $DAILY_FILE ($SIZE)"
else
    echo "❌ Daily backup FAILED!"
    exit 1
fi

# =============================================================================
# Weekly Backup (Every Sunday)
# =============================================================================
if [ "$DAY_OF_WEEK" -eq 7 ]; then
    echo "[2/4] Creating weekly backup..."
    
    WEEKLY_FILE="$BACKUP_DIR/weekly/slms_weekly_$DATE.sql.gz"
    cp "$DAILY_FILE" "$WEEKLY_FILE"
    echo "✅ Weekly backup created: $WEEKLY_FILE"
else
    echo "[2/4] Skipping weekly backup (not Sunday)"
fi

# =============================================================================
# Monthly Backup (First day of month)
# =============================================================================
if [ "$DAY_OF_MONTH" -eq "01" ]; then
    echo "[3/4] Creating monthly backup..."
    
    MONTHLY_FILE="$BACKUP_DIR/monthly/slms_monthly_$DATE.sql.gz"
    cp "$DAILY_FILE" "$MONTHLY_FILE"
    echo "✅ Monthly backup created: $MONTHLY_FILE"
else
    echo "[3/4] Skipping monthly backup (not first of month)"
fi

# =============================================================================
# Cleanup Old Backups
# =============================================================================
echo "[4/4] Cleaning up old backups..."

# Delete daily backups older than 7 days
find "$BACKUP_DIR/daily" -type f -name "*.sql.gz" -mtime +$RETENTION_DAILY -delete
echo "   - Cleaned daily backups (older than $RETENTION_DAILY days)"

# Delete weekly backups older than 4 weeks
find "$BACKUP_DIR/weekly" -type f -name "*.sql.gz" -mtime +$((RETENTION_WEEKLY * 7)) -delete
echo "   - Cleaned weekly backups (older than $RETENTION_WEEKLY weeks)"

# Delete monthly backups older than 12 months
find "$BACKUP_DIR/monthly" -type f -name "*.sql.gz" -mtime +$((RETENTION_MONTHLY * 30)) -delete
echo "   - Cleaned monthly backups (older than $RETENTION_MONTHLY months)"

# =============================================================================
# Summary
# =============================================================================
echo ""
echo "========================================"
echo "Backup Summary"
echo "========================================"
echo "Daily backups:   $(ls -1 $BACKUP_DIR/daily/*.sql.gz 2>/dev/null | wc -l) files"
echo "Weekly backups:  $(ls -1 $BACKUP_DIR/weekly/*.sql.gz 2>/dev/null | wc -l) files"
echo "Monthly backups: $(ls -1 $BACKUP_DIR/monthly/*.sql.gz 2>/dev/null | wc -l) files"
echo ""
echo "Total size: $(du -sh $BACKUP_DIR | cut -f1)"
echo "========================================"
echo "✅ Backup completed successfully!"
echo "========================================"
