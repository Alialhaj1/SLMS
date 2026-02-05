#!/bin/bash
set -e

CONFIG_FILE="/etc/nginx/sites-available/alhajco.com"

echo "=== Current config ==="
cat $CONFIG_FILE

echo ""
echo "=== Adding uploads location ==="

# Check if uploads location already exists
if grep -q "location /uploads" $CONFIG_FILE; then
    echo "Uploads location already exists"
else
    # Add uploads location before the first location block
    sed -i '/location \/ {/i\
    # Serve uploaded files\
    location /uploads {\
        alias /opt/slms/uploads/;\
        expires 30d;\
        add_header Cache-Control "public, immutable";\
        try_files $uri =404;\
    }\
' $CONFIG_FILE
    echo "Added uploads location"
fi

echo ""
echo "=== New config ==="
cat $CONFIG_FILE

echo ""
echo "=== Testing nginx config ==="
nginx -t

echo ""
echo "=== Reloading nginx ==="
systemctl reload nginx

echo ""
echo "=== Testing logo ==="
curl -s -o /dev/null -w "%{http_code}" https://alhajco.com/uploads/logos/company_1_1770038592396.png
