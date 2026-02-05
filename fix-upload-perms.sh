#!/bin/bash
set -e

echo "=== Fixing upload permissions ==="

# The backend runs as user 1001 (nextjs user in container)
# We need to ensure the uploads directory is writable

echo "Current permissions:"
ls -la /opt/slms/uploads/

echo ""
echo "Setting ownership to 1001:1001 (container user)"
chown -R 1001:1001 /opt/slms/uploads/

echo ""
echo "Setting directory permissions to 775"
chmod -R 775 /opt/slms/uploads/

echo ""
echo "New permissions:"
ls -la /opt/slms/uploads/

echo ""
echo "Checking subdirectories:"
ls -la /opt/slms/uploads/profiles/
ls -la /opt/slms/uploads/logos/

echo ""
echo "Restarting backend to apply changes"
docker restart slms-backend-prod

echo ""
echo "Done!"
