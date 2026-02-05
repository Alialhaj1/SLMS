#!/bin/bash
echo "=== Sites enabled ==="
ls -la /etc/nginx/sites-enabled/ 2>/dev/null || echo "No sites-enabled"

echo ""
echo "=== SLMS config in sites-enabled ==="
cat /etc/nginx/sites-enabled/slms 2>/dev/null || cat /etc/nginx/sites-enabled/default 2>/dev/null || echo "Check conf.d"

echo ""
echo "=== Check alhajco config ==="
grep -r "alhajco" /etc/nginx/ 2>/dev/null || echo "Not found"
