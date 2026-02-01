# API Usage Analysis Guide

## Overview

Automated API usage analyzer that reads Winston logs and generates comprehensive reports about endpoint usage, performance, and errors.

## When to Run

**After 24-48 hours** of log collection with Winston enabled.

## Quick Start

### From Host (Recommended)

```bash
# Run analysis for yesterday's logs
docker exec slms-backend-1 /app/scripts/run-api-analysis.sh

# Run analysis for specific date
docker exec slms-backend-1 /app/scripts/run-api-analysis.sh 2025-12-25

# Copy reports to host
docker cp slms-backend-1:/app/api-usage-report.json ./
docker cp slms-backend-1:/app/api-usage-summary.md ./
```

### From Inside Container

```bash
# Enter container
docker exec -it slms-backend-1 sh

# Run analysis
cd /app
node scripts/analyze-api-usage.js api-2025-12-25.log

# View summary
cat api-usage-summary.md
```

## What It Analyzes

### 1. Dead APIs (🔴 Critical)
- **Definition**: Endpoints with **0 requests** during analysis period
- **Action**: Safe to delete
- **Risk**: None (zero usage confirmed)

### 2. Low Usage APIs (🟡 Review)
- **Definition**: Endpoints with **< 5 requests/day** (configurable)
- **Action**: Review, improve discoverability, or deprecate
- **Risk**: Low (minimal impact if removed)

### 3. Slow APIs (🐌 Performance)
- **Definition**: Endpoints with **avg response time > 1000ms**
- **Action**: Optimize queries, add indexes, cache
- **Risk**: Medium (affects user experience)

### 4. Error-Prone APIs (❌ Bugs)
- **Definition**: Endpoints with **error rate > 5%**
- **Action**: Debug, fix, test
- **Risk**: High (broken functionality)

## Configuration

Environment variables (optional):

```bash
# Set thresholds
export LOW_USAGE_THRESHOLD=10    # Default: 5
export SLOW_ENDPOINT_MS=2000     # Default: 1000
export ERROR_RATE_THRESHOLD=10   # Default: 5.0

# Run with custom thresholds
docker exec -e LOW_USAGE_THRESHOLD=10 -e SLOW_ENDPOINT_MS=2000 slms-backend-1 /app/scripts/run-api-analysis.sh
```

## Output Reports

### 1. `api-usage-report.json`
Structured JSON data for programmatic processing:

```json
{
  "metadata": {
    "logFile": "api-2025-12-25.log",
    "analyzedAt": "2025-12-26T08:00:00Z",
    "totalRequests": 5420,
    "uniqueEndpoints": 87
  },
  "deadAPIs": [
    { "api": "GET /api/legacy-feature", "reason": "No requests" }
  ],
  "lowUsageAPIs": [
    { "api": "POST /api/rare-action", "count": 2 }
  ],
  "slowAPIs": [
    { "api": "GET /api/reports/heavy", "avgDuration": 3240 }
  ],
  "errorProneAPIs": [
    { "api": "POST /api/broken", "errorRate": 12.5 }
  ]
}
```

### 2. `api-usage-summary.md`
Human-readable Markdown report with:
- Executive summary
- Tables for each category
- Top 10 most-used APIs
- Top 10 active users
- Recommendations

## Decision Matrix

| Finding | Usage | Error Rate | Action |
|---------|-------|------------|--------|
| **Dead API** | 0 | - | ✅ DELETE immediately |
| **Low usage + high errors** | < 5 | > 5% | ✅ DELETE or fix |
| **Low usage + no errors** | < 5 | < 5% | ⚠️ REVIEW (keep or deprecate) |
| **High usage + high errors** | > 100 | > 5% | 🔴 FIX urgently |
| **High usage + slow** | > 100 | - | 🟡 OPTIMIZE |
| **Healthy** | > 10 | < 1% | ✅ KEEP |

## Workflow

### Day 1: Deploy Monitoring
```bash
# Already done! ✅
# Winston + Sentry + Health Check deployed
```

### Day 2: Collect Data (24-48h)
```bash
# No action required - logs collect automatically
# Check log size periodically:
docker exec slms-backend-1 ls -lh /app/logs/api-*.log
```

### Day 3: Analyze
```bash
# Run analysis
docker exec slms-backend-1 /app/scripts/run-api-analysis.sh

# Copy reports
docker cp slms-backend-1:/app/api-usage-summary.md ./

# Review summary
cat api-usage-summary.md
```

### Day 4: Execute Cleanup
Based on analysis results:

#### 1. Delete Dead APIs
```bash
# Example: Remove dead endpoint
# In backend/src/app.ts:
- app.use('/api/old-feature', oldFeatureRouter);

# Remove route file
rm backend/src/routes/oldFeature.ts
```

#### 2. Fix Error-Prone APIs
```bash
# Debug endpoint with high error rate
# Check Sentry for stack traces
# Fix bugs, add validation, handle edge cases
```

#### 3. Optimize Slow APIs
```bash
# Identify slow queries
# Add database indexes
# Implement caching
# Paginate results
```

#### 4. Review Low-Usage APIs
```bash
# Decision tree:
# - Internal tool? Keep
# - Feature not promoted? Improve discoverability
# - Legacy/unused? Deprecate and delete
```

## Safety Checks

### Before Deleting Any API

1. **Verify zero usage across multiple days**
   ```bash
   # Analyze 3 consecutive days
   docker exec slms-backend-1 /app/scripts/run-api-analysis.sh 2025-12-23
   docker exec slms-backend-1 /app/scripts/run-api-analysis.sh 2025-12-24
   docker exec slms-backend-1 /app/scripts/run-api-analysis.sh 2025-12-25
   ```

2. **Check frontend for hardcoded calls**
   ```bash
   # Search frontend code
   cd frontend-next
   grep -r "/api/endpoint-to-delete" .
   ```

3. **Search backend for internal usage**
   ```bash
   # Search backend code
   cd backend
   grep -r "api/endpoint-to-delete" .
   ```

4. **Document deletion in git commit**
   ```bash
   git commit -m "Remove dead API: /api/old-feature (0 usage over 3 days)"
   ```

## Troubleshooting

### No API_USAGE entries in logs

**Problem**: Analyzer finds 0 requests

**Solution**: 
```bash
# Verify requestLogger middleware is active
docker logs slms-backend-1 | grep "API_USAGE"

# Check if logs exist
docker exec slms-backend-1 cat /app/logs/api-2025-12-25.log | grep "API_USAGE" | head -5
```

### Log file not found

**Problem**: `api-YYYY-MM-DD.log` doesn't exist

**Solution**:
```bash
# List available logs
docker exec slms-backend-1 ls -lh /app/logs/

# Use correct date
docker exec slms-backend-1 /app/scripts/run-api-analysis.sh 2025-12-25
```

### Reports show unexpected results

**Problem**: Dead APIs that should have usage

**Solution**:
1. Check log parsing (DEBUG mode):
   ```bash
   docker exec -e DEBUG=true slms-backend-1 node /app/scripts/analyze-api-usage.js api-2025-12-25.log
   ```

2. Verify log format:
   ```bash
   docker exec slms-backend-1 head -100 /app/logs/api-2025-12-25.log
   ```

3. Ensure analysis period includes production traffic (not just dev testing)

## Production Best Practices

1. **Run analysis weekly** (automated with cron):
   ```bash
   # Add to backup service cron
   0 3 * * 1 /app/scripts/run-api-analysis.sh >> /var/log/api-analysis.log 2>&1
   ```

2. **Track trends over time**:
   ```bash
   # Keep historical reports
   mkdir -p /backups/api-reports
   cp api-usage-*.json /backups/api-reports/
   ```

3. **Alert on anomalies**:
   - New endpoints with high error rates
   - Sudden drop in usage
   - Performance degradation

4. **Integrate with CI/CD**:
   - Fail build if error rate > 10%
   - Alert if slow endpoints increase
   - Block deployment if critical APIs are broken

## Example Session

```bash
# Day 1: Deploy (Done ✅)
docker-compose up -d

# Day 2-3: Monitor (24-48h)
# ... wait for real traffic ...

# Day 4: Analyze
$ docker exec slms-backend-1 /app/scripts/run-api-analysis.sh 2025-12-25

📊 API Usage Analyzer
==========================================
Total Requests: 5420
Unique Endpoints: 87

🔍 Findings:
   🔴 Dead APIs: 12
   🟡 Low Usage APIs: 23
   🐌 Slow APIs: 5
   ❌ Error-Prone APIs: 3

💾 Reports generated:
   - api-usage-report.json
   - api-usage-summary.md

# Copy reports
$ docker cp slms-backend-1:/app/api-usage-summary.md ./

# Review
$ cat api-usage-summary.md

# Decision: Delete 12 dead APIs
$ vim backend/src/app.ts
# Remove dead routes

# Commit
$ git add -A
$ git commit -m "Cleanup: Remove 12 dead APIs (0 usage confirmed)"
$ git push

# Redeploy
$ docker-compose restart backend
```

## API Deletion Checklist

Before deleting any API:

- [ ] Verified 0 usage across 3+ days
- [ ] Searched frontend code (no hardcoded calls)
- [ ] Searched backend code (no internal usage)
- [ ] Checked documentation (mark as deprecated)
- [ ] Updated API documentation
- [ ] Committed with descriptive message
- [ ] Tested remaining endpoints
- [ ] Monitored errors after deployment

## Summary

| Phase | Duration | Action | Tool |
|-------|----------|--------|------|
| **Deploy** | Day 1 (5h) | Setup Winston + Sentry + Health Check | Done ✅ |
| **Monitor** | Day 2-3 (24-48h) | Collect real usage data | Passive |
| **Analyze** | Day 4 (2h) | Run analyzer, generate reports | `run-api-analysis.sh` |
| **Execute** | Day 5-6 (8h) | Delete dead APIs, fix bugs, optimize | Manual |
| **Verify** | Day 7 (2h) | Test, monitor, validate | Health check |

**Total time:** 7 days  
**Outcome:** Clean, optimized, production-ready API surface
