#!/bin/bash
echo "=== Full nginx config ==="
cat /etc/nginx/sites-available/alhajco.com

echo ""
echo "=== Sites enabled symlink ==="
ls -la /etc/nginx/sites-enabled/
