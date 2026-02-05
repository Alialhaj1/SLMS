@echo off
docker exec slms-postgres-1 pg_dump -U slms -d slms_db --clean --if-exists > c:\projects\slms\slms_backup.sql
echo Done!
