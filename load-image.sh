#!/bin/bash
set -e

# First, kill any stuck build processes
echo "Stopping any running builds..."
docker stop $(docker ps -q --filter "ancestor=node:18-alpine") 2>/dev/null || true
killall npm node 2>/dev/null || true

# Check if tar file exists
echo "Checking for image file..."
if [ -f /tmp/slms-frontend.tar ]; then
    echo "Found: $(ls -lh /tmp/slms-frontend.tar)"
    
    # Load the image
    echo "Loading Docker image..."
    docker load -i /tmp/slms-frontend.tar
    
    # Tag it properly for docker-compose
    docker tag slms-frontend:latest slms-frontend-next:latest
    
    # Show images
    echo "Docker images:"
    docker images | grep -E 'REPOSITORY|frontend'
    
    # Clean up
    rm -f /tmp/slms-frontend.tar
    echo "Cleaned up tar file"
else
    echo "ERROR: /tmp/slms-frontend.tar not found!"
    ls -la /tmp/*.tar 2>/dev/null || echo "No tar files in /tmp"
    exit 1
fi
