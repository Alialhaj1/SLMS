#!/bin/bash
echo "=== Checking file permissions ==="
ls -la /opt/slms/uploads/
ls -la /opt/slms/uploads/logos/

echo ""
echo "=== Setting correct permissions ==="
chmod -R 755 /opt/slms/uploads
chown -R www-data:www-data /opt/slms/uploads

echo ""
echo "=== Checking nginx user ==="
ps aux | grep nginx

echo ""
echo "=== Check nginx config for uploads ==="
grep -A5 "uploads" /etc/nginx/sites-available/alhajco.com

echo ""
echo "=== Testing direct file access ==="
curl -v https://alhajco.com/uploads/logos/company_1_1770038592396.png 2>&1 | head -30
