#!/bin/bash

###############################################################################
# API Usage Analysis Runner
# 
# Wrapper script to run API usage analyzer with proper date detection
# 
# Usage:
#   ./run-api-analysis.sh [date]
#   ./run-api-analysis.sh              # Analyzes yesterday's logs
#   ./run-api-analysis.sh 2025-12-25   # Analyzes specific date
###############################################################################

set -e

# Configuration
SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
LOGS_DIR="/app/logs"

# Determine date
if [ $# -eq 0 ]; then
  # No argument - use yesterday's date
  LOG_DATE=$(date -d "yesterday" +%Y-%m-%d 2>/dev/null || date -v-1d +%Y-%m-%d)
else
  LOG_DATE="$1"
fi

LOG_FILE="api-${LOG_DATE}.log"
LOG_PATH="${LOGS_DIR}/${LOG_FILE}"

echo "=========================================="
echo "API Usage Analyzer"
echo "=========================================="
echo "Date: ${LOG_DATE}"
echo "Log file: ${LOG_FILE}"
echo ""

# Check if log file exists
if [ ! -f "${LOG_PATH}" ]; then
  echo "❌ Error: Log file not found: ${LOG_PATH}"
  echo ""
  echo "Available log files:"
  ls -lh "${LOGS_DIR}"/api-*.log 2>/dev/null || echo "  No API logs found"
  exit 1
fi

# Get log file size
LOG_SIZE=$(du -h "${LOG_PATH}" | cut -f1)
echo "📁 Log file size: ${LOG_SIZE}"

# Count lines
LINE_COUNT=$(wc -l < "${LOG_PATH}")
echo "📝 Log lines: ${LINE_COUNT}"
echo ""

# Run analyzer
echo "🔍 Running analysis..."
echo ""

cd /app
node "${SCRIPTS_DIR}/analyze-api-usage.js" "${LOG_FILE}"

# Check if reports were generated
if [ -f "api-usage-report.json" ] && [ -f "api-usage-summary.md" ]; then
  echo ""
  echo "=========================================="
  echo "✅ Analysis Complete!"
  echo "=========================================="
  echo ""
  echo "📊 Reports generated in: $(pwd)"
  echo ""
  echo "  - api-usage-report.json (structured data)"
  echo "  - api-usage-summary.md (human-readable)"
  echo ""
  echo "To view summary:"
  echo "  cat api-usage-summary.md"
  echo ""
  echo "To copy reports to host:"
  echo "  docker cp slms-backend-1:/app/api-usage-report.json ./"
  echo "  docker cp slms-backend-1:/app/api-usage-summary.md ./"
  echo ""
else
  echo ""
  echo "⚠️  Warning: Reports not generated. Check errors above."
  exit 1
fi

exit 0
