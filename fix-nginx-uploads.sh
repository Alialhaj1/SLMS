#!/bin/bash
set -e

echo "=== Checking nginx config ==="
cat /etc/nginx/sites-available/slms

echo ""
echo "=== Adding uploads location ==="
# Check if uploads location already exists
if grep -q "location /uploads" /etc/nginx/sites-available/slms; then
    echo "Uploads location already exists"
else
    # Add uploads location before the closing brace
    sed -i '/location \/ {/i\
    location /uploads {\
        alias /opt/slms/uploads/;\
        expires 30d;\
        add_header Cache-Control "public, immutable";\
    }\
' /etc/nginx/sites-available/slms
fi

echo ""
echo "=== Testing nginx config ==="
nginx -t

echo ""
echo "=== Reloading nginx ==="
systemctl reload nginx

echo ""
echo "=== Testing logo again ==="
curl -s -o /dev/null -w "%{http_code}" https://alhajco.com/uploads/logos/company_1_1768821995140.png
