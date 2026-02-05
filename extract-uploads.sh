#!/bin/bash
set -e

echo "=== Extracting uploads ==="
cd /tmp
unzip -o uploads.zip

echo ""
echo "=== Creating uploads directory on server ==="
mkdir -p /opt/slms/uploads

echo ""
echo "=== Copying files ==="
cp -r /tmp/uploads/* /opt/slms/uploads/

echo ""
echo "=== Setting permissions ==="
chmod -R 755 /opt/slms/uploads
chown -R 1001:1001 /opt/slms/uploads

echo ""
echo "=== Listing uploaded files ==="
find /opt/slms/uploads -type f | head -20

echo ""
echo "=== Testing logo file ==="
ls -la /opt/slms/uploads/logos/ 2>/dev/null || echo "No logos folder"
