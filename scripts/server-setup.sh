#!/bin/bash
# =============================================================================
# SLMS Server Initial Setup Script
# For: alhajco.com (68.183.221.112)
# OS: Ubuntu 24.04 LTS
# =============================================================================

set -e

echo ""
echo "========================================"
echo "  SLMS Server Setup - alhajco.com"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root${NC}"
    exit 1
fi

echo -e "${YELLOW}[1/8] Updating system...${NC}"
apt update && apt upgrade -y

echo -e "${YELLOW}[2/8] Installing required packages...${NC}"
apt install -y \
    curl \
    git \
    ufw \
    nginx \
    certbot \
    python3-certbot-nginx \
    htop \
    ncdu

echo -e "${YELLOW}[3/8] Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
else
    echo "Docker already installed"
fi

echo -e "${YELLOW}[4/8] Installing Docker Compose...${NC}"
apt install -y docker-compose-plugin

echo -e "${YELLOW}[5/8] Configuring firewall...${NC}"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status

echo -e "${YELLOW}[6/8] Creating swap space (for 1GB RAM server)...${NC}"
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "Swap created: 2GB"
else
    echo "Swap already exists"
fi
free -h

echo -e "${YELLOW}[7/8] Creating application directory...${NC}"
mkdir -p /opt/slms
mkdir -p /opt/slms/backups
mkdir -p /var/www/certbot

echo -e "${YELLOW}[8/8] Setting up Nginx...${NC}"
# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Copy our config (will be done after git clone)
echo "Nginx ready. Config will be linked after deployment."

echo ""
echo -e "${GREEN}========================================"
echo "  ✅ Server Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Clone your repository:"
echo "   cd /opt/slms"
echo "   git clone https://github.com/YOUR_USERNAME/slms.git ."
echo ""
echo "2. Link nginx config:"
echo "   ln -sf /opt/slms/config/nginx/alhajco.com.conf /etc/nginx/sites-enabled/"
echo "   nginx -t && systemctl reload nginx"
echo ""
echo "3. Get SSL certificate:"
echo "   certbot --nginx -d alhajco.com -d www.alhajco.com"
echo ""
echo "4. Deploy the application:"
echo "   chmod +x scripts/*.sh"
echo "   ./scripts/deploy.sh"
echo ""
echo -e "${NC}"
