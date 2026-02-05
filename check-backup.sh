#!/bin/bash
set -e

echo "=== Checking backup file ==="
head -100 /tmp/slms_backup.sql

echo ""
echo "=== Checking for data in backup ==="
grep -c "INSERT INTO" /tmp/slms_backup.sql || echo "No INSERT statements found"

echo ""
echo "=== Checking table count in backup ==="
grep -c "CREATE TABLE" /tmp/slms_backup.sql || echo "No CREATE TABLE found"
