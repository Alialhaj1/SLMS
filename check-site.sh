#!/bin/bash
echo "=== Checking site ==="
curl -s https://alhajco.com/ | head -50
echo ""
echo "=== Checking for localhost:4000 in JS ==="
curl -s https://alhajco.com/ | grep -o 'localhost:4000' | head -5 || echo "No localhost:4000 found"
echo ""
echo "=== Checking API endpoint ==="
curl -s -I https://alhajco.com/api/health | head -5 || echo "API health check"
