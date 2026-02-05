#!/bin/bash
set -e

echo "=== Testing nginx config ==="
nginx -t

echo ""
echo "=== Reloading nginx ==="
systemctl reload nginx

echo ""
echo "=== Setting permissions ==="
chmod -R 755 /opt/slms/uploads
chown -R www-data:www-data /opt/slms/uploads

echo ""
echo "=== Testing logo ==="
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" https://alhajco.com/uploads/logos/company_1_1770038592396.png

echo ""
echo "=== Testing another logo ==="
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" https://alhajco.com/uploads/logos/company_1_1768821995140.png
