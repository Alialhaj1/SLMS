# Database Backup & Restore Guide

## Automated Backups

### Configuration
- **Schedule**: Daily at 2:00 AM
- **Retention**: 30 days
- **Compression**: gzip (level 9)
- **Location**: Docker volume `backup-data` → `/backups`

### Files Created
```
/backups/
  ├── slms_2025-12-25_02-00-00.sql.gz (120 KB)
  ├── slms_2025-12-26_02-00-00.sql.gz
  └── ...
```

### Check Backup Status
```bash
# List all backups
docker exec slms-backup-1 ls -lh /backups/

# View backup logs
docker logs slms-backup-1

# Check cron schedule
docker exec slms-backup-1 crontab -l
```

### Manual Backup
```bash
# Run backup manually (without waiting for cron)
docker exec slms-backup-1 /scripts/backup.sh
```

## Restore Database

### ⚠️ WARNING
Restore will **DROP** the existing database and recreate it from backup.  
**ALL CURRENT DATA WILL BE LOST!**

### Restore Steps

#### 1. List Available Backups
```bash
docker exec slms-backup-1 ls -lh /backups/
```

#### 2. Stop Backend (Recommended)
```bash
docker-compose stop backend
```

#### 3. Restore from Backup
```bash
# Restore from specific backup file
docker exec -it slms-backup-1 /scripts/restore.sh slms_2025-12-25_02-00-00.sql.gz

# Follow prompts and type 'YES' to confirm
```

#### 4. Restart Backend
```bash
docker-compose start backend
```

### Restore Script Details
The restore script will:
1. Terminate all active connections
2. Drop existing database
3. Create new database
4. Decompress backup
5. Restore data
6. Cleanup

### Verification After Restore
```bash
# Check database tables
docker exec slms-postgres-1 psql -U slms -d slms_db -c "\dt"

# Count records in critical tables
docker exec slms-postgres-1 psql -U slms -d slms_db -c "SELECT 'users' AS table, COUNT(*) FROM users UNION ALL SELECT 'companies', COUNT(*) FROM companies;"
```

## Backup Volume Management

### Copy Backup to Host
```bash
# Copy specific backup to local machine
docker cp slms-backup-1:/backups/slms_2025-12-25_02-00-00.sql.gz ./

# Copy all backups
docker cp slms-backup-1:/backups/. ./backups-local/
```

### Upload Backup to Cloud Storage
```bash
# Example: AWS S3
docker exec slms-backup-1 sh -c "apt-get install -y awscli && aws s3 cp /backups/ s3://my-bucket/slms-backups/ --recursive"

# Example: Google Cloud Storage
docker exec slms-backup-1 sh -c "apt-get install -y google-cloud-sdk && gsutil cp /backups/*.sql.gz gs://my-bucket/slms-backups/"
```

### Restore from External Backup
```bash
# Copy backup from host to container
docker cp ./slms_2025-12-20_02-00-00.sql.gz slms-backup-1:/backups/

# Then restore as usual
docker exec -it slms-backup-1 /scripts/restore.sh slms_2025-12-20_02-00-00.sql.gz
```

## Monitoring & Alerts

### Check Last Backup Time
```bash
docker exec slms-backup-1 sh -c "ls -lt /backups/ | head -2"
```

### View Backup Logs
```bash
docker exec slms-backup-1 tail -50 /var/log/backup.log
```

### Setup Alerts (Production)
```bash
# Example: Send email if backup fails
# Add to backup.sh:
if [ $? -ne 0 ]; then
  echo "Backup failed!" | mail -s "SLMS Backup Failed" admin@example.com
fi
```

## Production Best Practices

### 1. Off-site Backups
- **Upload to S3/GCS daily**
- Keep 90 days in cloud
- Use lifecycle policies

### 2. Backup Testing
- **Test restore monthly**
- Verify data integrity
- Time the restore process

### 3. Encryption
```bash
# Encrypt backups (add to backup.sh)
gpg --encrypt --recipient admin@example.com slms_backup.sql.gz
```

### 4. Monitoring
- Alert if backup > 24h old
- Alert if backup size changes > 50%
- Track backup duration

### 5. Retention Strategy
- **Daily**: 30 days (current)
- **Weekly**: 12 weeks (recommended)
- **Monthly**: 12 months (recommended)
- **Yearly**: 7 years (regulatory)

## Troubleshooting

### Backup Container Not Starting
```bash
# Check logs
docker logs slms-backup-1

# Verify scripts exist
docker exec slms-backup-1 ls -la /scripts/

# Check permissions
docker exec slms-backup-1 chmod +x /scripts/*.sh
```

### Backup Fails with "Connection Refused"
```bash
# Check postgres is running
docker ps | grep postgres

# Test connection
docker exec slms-backup-1 pg_dump --help

# Verify credentials
docker exec slms-backup-1 env | grep DB_
```

### Restore Fails
```bash
# Check backup file integrity
docker exec slms-backup-1 gzip -t /backups/slms_*.sql.gz

# Check disk space
docker exec slms-backup-1 df -h

# Verify postgres user has permissions
docker exec slms-postgres-1 psql -U slms -d postgres -c "\du"
```

### Disk Space Full
```bash
# Check backup volume size
docker exec slms-backup-1 du -sh /backups/

# Manually cleanup old backups
docker exec slms-backup-1 find /backups/ -name "*.sql.gz" -mtime +30 -delete

# Reduce retention days (edit docker-compose.yml)
RETENTION_DAYS=7
```

## Quick Reference

| Action | Command |
|--------|---------|
| **List backups** | `docker exec slms-backup-1 ls -lh /backups/` |
| **Manual backup** | `docker exec slms-backup-1 /scripts/backup.sh` |
| **Restore** | `docker exec -it slms-backup-1 /scripts/restore.sh <file>` |
| **Check cron** | `docker exec slms-backup-1 crontab -l` |
| **View logs** | `docker logs slms-backup-1` |
| **Copy to host** | `docker cp slms-backup-1:/backups/. ./backups-local/` |
| **Test backup** | `docker exec slms-backup-1 gzip -t /backups/*.gz` |
