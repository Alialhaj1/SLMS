#!/bin/bash
# Export local database and prepare for production import

echo "=== Exporting local database ==="

# Export from local docker postgres
docker exec slms-postgres pg_dump -U slms_user -d slms --clean --if-exists > c:/projects/slms/slms_backup.sql

echo "Export complete: slms_backup.sql"
echo "Size: $(wc -c < c:/projects/slms/slms_backup.sql) bytes"
