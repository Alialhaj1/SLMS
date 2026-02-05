#!/bin/bash
echo "=== Finding nginx config files ==="
find /etc/nginx -name "*.conf" -type f 2>/dev/null

echo ""
echo "=== Listing sites-available ==="
ls -la /etc/nginx/sites-available/ 2>/dev/null || echo "No sites-available"

echo ""
echo "=== Listing conf.d ==="
ls -la /etc/nginx/conf.d/ 2>/dev/null || echo "No conf.d"

echo ""
echo "=== Main nginx.conf ==="
cat /etc/nginx/nginx.conf
