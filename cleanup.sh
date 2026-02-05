#!/bin/bash
echo "=== Docker Build Processes ==="
pgrep -a docker

echo ""
echo "=== Kill any stuck docker build processes ==="
# Kill any buildkit/docker build processes that may be stuck
pkill -f "docker build" 2>/dev/null || echo "No docker build processes found"

echo ""
echo "=== Clean up Docker ==="
docker system prune -f

echo ""
echo "=== Current load ==="
uptime

echo ""
echo "=== Docker Images ==="
docker images
