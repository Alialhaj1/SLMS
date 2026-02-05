#!/bin/bash
set -e

echo "=== Extracting uploads ==="
cd /opt/slms
tar -xvzf /tmp/uploads.tar.gz

echo ""
echo "=== Setting permissions ==="
chmod -R 755 /opt/slms/uploads
chown -R 1001:1001 /opt/slms/uploads

echo ""
echo "=== Listing uploaded files ==="
find /opt/slms/uploads -type f

echo ""
echo "=== Testing via curl ==="
curl -s -o /dev/null -w "%{http_code}" https://alhajco.com/uploads/logos/company_1_1768821995140.png || echo "Not found"
