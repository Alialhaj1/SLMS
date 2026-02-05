# SLMS Production Deployment Guide
> **Server**: alhajco.com (68.183.221.112)  
> **Last Updated**: February 5, 2026

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet                              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Nginx (Port 80/443)                       │
│              alhajco.com → SSL Termination                   │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
          ▼                               ▼
┌─────────────────────┐     ┌─────────────────────┐
│   Frontend (3001)   │     │   Backend (4000)    │
│   Next.js 13.5      │     │   Express + TS      │
│   slms-frontend     │     │   slms-backend      │
└─────────────────────┘     └──────────┬──────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
          ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
          │  PostgreSQL │    │    Redis    │    │   Volumes   │
          │    (5432)   │    │   (6379)    │    │  /backups   │
          │             │    │             │    │  /uploads   │
          └─────────────┘    └─────────────┘    └─────────────┘
```

---

## 📁 Directory Structure

```
/opt/slms/
├── docker-compose.prod.yml    # Main compose file
├── .env                       # Environment variables (SENSITIVE!)
├── backend/                   # Backend source
├── frontend-next/             # Frontend source
├── backups/                   # Database backups
├── uploads/                   # User uploads
└── scripts/                   # Utility scripts
```

---

## 🔑 Environment Variables

Located at `/opt/slms/.env`:

```bash
# Database
POSTGRES_USER=slms_prod
POSTGRES_PASSWORD=<REDACTED>
POSTGRES_DB=slms_production

# Redis
REDIS_PASSWORD=<REDACTED>

# JWT
JWT_SECRET=<REDACTED>

# API
NEXT_PUBLIC_API_URL=https://alhajco.com/api
```

---

## 🚀 Deployment Commands

### Start All Services
```bash
cd /opt/slms
docker compose -f docker-compose.prod.yml up -d
```

### Stop All Services
```bash
cd /opt/slms
docker compose -f docker-compose.prod.yml down
```

### Restart Specific Service
```bash
# Frontend
docker compose -f docker-compose.prod.yml restart frontend

# Backend
docker compose -f docker-compose.prod.yml restart backend
```

### Rebuild & Deploy (Full)
```bash
cd /opt/slms
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

### Deploy Pre-built Image (From Local Machine)

**On Local Machine (Windows):**
```powershell
# Build image
cd c:\projects\slms\frontend-next
docker build -f Dockerfile.prod -t slms-frontend-next:latest .

# Save image
docker save slms-frontend-next:latest -o frontend.tar

# Split if needed (for slow connections)
$file = [System.IO.File]::ReadAllBytes("frontend.tar")
$size = 10MB
$parts = [Math]::Ceiling($file.Length / $size)
for($i=0; $i -lt $parts; $i++) {
    $start = $i * $size
    $len = [Math]::Min($size, $file.Length - $start)
    $chunk = New-Object byte[] $len
    [Array]::Copy($file, $start, $chunk, 0, $len)
    [System.IO.File]::WriteAllBytes("frontend-part$i.tar", $chunk)
}

# Upload parts
scp -i ~/.ssh/id_ed25519 frontend-part*.tar root@68.183.221.112:/tmp/
```

**On Server:**
```bash
# Merge parts
cat /tmp/frontend-part*.tar > /tmp/frontend.tar

# Load image
docker load < /tmp/frontend.tar

# Tag and deploy
docker tag slms-frontend-next:latest slms-frontend:latest
cd /opt/slms
docker compose -f docker-compose.prod.yml stop frontend
docker compose -f docker-compose.prod.yml rm -f frontend
docker compose -f docker-compose.prod.yml up -d frontend

# Cleanup
rm -f /tmp/frontend*.tar
```

---

## 🏥 Health Endpoints

| Service   | Endpoint                  | Expected Response |
|-----------|---------------------------|-------------------|
| Backend   | `http://localhost:4000/api/health` | `200 OK` + JSON |
| Frontend  | `http://localhost:3001/api/health` | `200 OK` + JSON |
| Frontend  | `http://localhost:3001/health`     | `200 OK` page   |

### Quick Health Check
```bash
# Backend
curl -s http://localhost:4000/api/health | jq

# Frontend
curl -s http://localhost:3001/api/health | jq

# All services
docker ps --format "table {{.Names}}\t{{.Status}}"
```

---

## 📋 Logs

### View Logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker logs -f slms-backend-prod
docker logs -f slms-frontend-prod

# Last 100 lines
docker logs --tail 100 slms-backend-prod
```

### Log Files Location
- Docker logs: `/var/lib/docker/containers/<id>/<id>-json.log`
- Nginx logs: `/var/log/nginx/access.log`, `/var/log/nginx/error.log`

---

## 🗄️ Database Operations

### Backup (Manual)
```bash
docker exec slms-postgres-prod pg_dump -U slms_prod slms_production > /opt/slms/backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore
```bash
docker exec -i slms-postgres-prod psql -U slms_prod slms_production < /opt/slms/backups/backup_YYYYMMDD.sql
```

### Connect to Database
```bash
docker exec -it slms-postgres-prod psql -U slms_prod -d slms_production
```

### Run Migration
```bash
# Migrations run automatically on backend startup
# To force re-run:
docker compose -f docker-compose.prod.yml restart backend
```

---

## 🔒 Security Notes

1. **Ports are internal only** (127.0.0.1):
   - Frontend: 3001
   - Backend: 4000
   - PostgreSQL: 5432
   - Redis: 6379

2. **Nginx handles SSL** termination and proxies to internal services

3. **JWT Tokens**:
   - Access Token: 15 minutes
   - Refresh Token: 7 days

4. **Request Tracking**:
   - All requests get `X-Request-ID` header
   - Logged in audit_logs table

---

## 🐛 Troubleshooting

### Container Won't Start
```bash
# Check logs
docker logs slms-frontend-prod

# Check health
docker inspect slms-frontend-prod --format '{{json .State.Health.Log}}' | jq '.[-1]'

# Recreate container
docker compose -f docker-compose.prod.yml up -d --force-recreate frontend
```

### Out of Memory (Build Fails)
Server has 2GB RAM. Build locally and transfer image:
```bash
# See "Deploy Pre-built Image" section above
```

### Database Connection Issues
```bash
# Check if PostgreSQL is healthy
docker exec slms-postgres-prod pg_isready -U slms_prod

# Check backend can reach database
docker logs slms-backend-prod | grep -i "database\|postgres"
```

### Frontend Shows Old Version
```bash
# Clear Docker build cache
docker builder prune -f

# Rebuild without cache
docker compose -f docker-compose.prod.yml build --no-cache frontend
docker compose -f docker-compose.prod.yml up -d frontend
```

---

## 📊 Monitoring Commands

### Resource Usage
```bash
docker stats --no-stream
```

### Disk Usage
```bash
df -h
docker system df
```

### Clean Up Docker
```bash
# Remove unused images
docker image prune -f

# Remove all unused data (CAREFUL!)
docker system prune -a
```

---

## 🔄 Rollback Procedure

1. **Keep Previous Image**:
   ```bash
   docker tag slms-frontend:latest slms-frontend:backup
   ```

2. **If Deployment Fails**:
   ```bash
   docker tag slms-frontend:backup slms-frontend:latest
   docker compose -f docker-compose.prod.yml up -d frontend
   ```

---

## 📞 Support Contacts

- **Server Provider**: DigitalOcean
- **Domain**: alhajco.com
- **SSH Access**: `ssh -i ~/.ssh/id_ed25519 root@68.183.221.112`

---

## 📝 Change Log

| Date | Change | By |
|------|--------|-----|
| 2026-02-05 | Added Framer Motion animations, Security middleware | AI Agent |
| 2026-02-04 | Initial production deployment | AI Agent |
