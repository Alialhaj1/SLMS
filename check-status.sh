#!/bin/bash
echo "=== Docker Images ==="
docker images

echo ""
echo "=== Container Status ==="
docker ps -a

echo ""
echo "=== Server Load ==="
uptime
