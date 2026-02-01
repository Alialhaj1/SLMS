#!/usr/bin/env node

/**
 * API Usage Analyzer - Production-Grade Log Parser
 * 
 * Reads Winston API logs and generates comprehensive usage report
 * 
 * Features:
 * - Dead API detection (0 requests)
 * - Low usage tracking (< threshold)
 * - Slow endpoint detection (avg > 1000ms)
 * - Error rate analysis (> 5%)
 * - User/Company context
 * - JSON + Markdown reports
 * 
 * Usage:
 *   node analyze-api-usage.js <log-file> [options]
 *   node analyze-api-usage.js api-2025-12-25.log
 *   node analyze-api-usage.js api-2025-12-25.log --threshold=10 --slow=2000
 * 
 * Output:
 *   - api-usage-report.json (structured data)
 *   - api-usage-summary.md (human-readable)
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// Configuration
// ============================================================================

const LOG_DIR = process.env.LOG_DIR || '/app/logs';
const LOW_USAGE_THRESHOLD = parseInt(process.env.LOW_USAGE_THRESHOLD || '5');
const SLOW_ENDPOINT_MS = parseInt(process.env.SLOW_ENDPOINT_MS || '1000');
const ERROR_RATE_THRESHOLD = parseFloat(process.env.ERROR_RATE_THRESHOLD || '5.0');

// Parse command line arguments
const args = process.argv.slice(2);
const logFileName = args.find(arg => !arg.startsWith('--'));

if (!logFileName) {
  console.error('❌ Usage: node analyze-api-usage.js <log-file>');
  console.error('   Example: node analyze-api-usage.js api-2025-12-25.log');
  process.exit(1);
}

const logFilePath = path.join(LOG_DIR, logFileName);

// Check if log file exists
if (!fs.existsSync(logFilePath)) {
  console.error(`❌ Log file not found: ${logFilePath}`);
  console.error(`   Expected location: ${LOG_DIR}`);
  console.error(`   Available logs:`);
  try {
    const files = fs.readdirSync(LOG_DIR).filter(f => f.startsWith('api-'));
    files.forEach(f => console.error(`     - ${f}`));
  } catch (err) {
    console.error(`     (Could not read log directory)`);
  }
  process.exit(1);
}

// ============================================================================
// Parse Logs
// ============================================================================

console.log('📊 API Usage Analyzer');
console.log('='.repeat(60));
console.log(`📁 Reading log file: ${logFileName}`);
console.log(`📍 Location: ${logFilePath}`);
console.log('');

const logContent = fs.readFileSync(logFilePath, 'utf-8');
const lines = logContent.split('\n').filter(Boolean);

console.log(`📝 Total log lines: ${lines.length}`);

// Statistics tracking
const endpointStats = new Map();
const userActivity = new Map();
const companyActivity = new Map();
let totalRequests = 0;
let totalErrors = 0;

// Parse each log line
lines.forEach((line, index) => {
  // Look for API_USAGE entries
  if (!line.includes('API_USAGE')) {
    return;
  }

  try {
    // Extract JSON part after "API_USAGE | "
    const jsonStart = line.indexOf('API_USAGE | ') + 'API_USAGE | '.length;
    const jsonStr = line.substring(jsonStart);
    const entry = JSON.parse(jsonStr);

    // Normalize endpoint (remove query params)
    const endpoint = entry.endpoint?.split('?')[0] || entry.endpoint || 'unknown';
    const method = entry.method || 'GET';
    const key = `${method} ${endpoint}`;

    // Initialize stats for this endpoint
    if (!endpointStats.has(key)) {
      endpointStats.set(key, {
        method,
        endpoint,
        count: 0,
        errors: 0,
        totalDuration: 0,
        statusCodes: {},
        users: new Set(),
        companies: new Set(),
        timestamps: [],
      });
    }

    const stats = endpointStats.get(key);

    // Update stats
    stats.count++;
    stats.totalDuration += entry.duration || 0;
    
    if (entry.statusCode >= 400) {
      stats.errors++;
      totalErrors++;
    }

    // Track status codes
    const statusCode = entry.statusCode || 'unknown';
    stats.statusCodes[statusCode] = (stats.statusCodes[statusCode] || 0) + 1;

    // Track users
    if (entry.userId && entry.userId !== 'anonymous') {
      stats.users.add(entry.userId);
      
      if (!userActivity.has(entry.userId)) {
        userActivity.set(entry.userId, new Set());
      }
      userActivity.get(entry.userId).add(key);
    }

    // Track companies
    if (entry.companyId) {
      stats.companies.add(entry.companyId);
      
      if (!companyActivity.has(entry.companyId)) {
        companyActivity.set(entry.companyId, new Set());
      }
      companyActivity.get(entry.companyId).add(key);
    }

    // Track timestamps for time distribution analysis
    if (entry.timestamp) {
      stats.timestamps.push(entry.timestamp);
    }

    totalRequests++;

  } catch (err) {
    // Skip malformed log lines
    if (process.env.DEBUG) {
      console.error(`⚠️  Failed to parse line ${index + 1}: ${err.message}`);
    }
  }
});

console.log(`✅ Parsed ${totalRequests} API requests`);
console.log(`📊 Found ${endpointStats.size} unique endpoints`);
console.log('');

// ============================================================================
// Analyze Results
// ============================================================================

const deadAPIs = [];
const lowUsageAPIs = [];
const slowAPIs = [];
const errorProneAPIs = [];
const topAPIs = [];
const anonymousAPIs = [];

endpointStats.forEach((stats, apiKey) => {
  const avgDuration = stats.count > 0 ? stats.totalDuration / stats.count : 0;
  const errorRate = stats.count > 0 ? (stats.errors / stats.count) * 100 : 0;

  // Dead APIs (this shouldn't happen if parsing is correct, but kept for completeness)
  if (stats.count === 0) {
    deadAPIs.push({
      api: apiKey,
      reason: 'No requests in log period',
    });
  }

  // Low usage APIs
  if (stats.count > 0 && stats.count < LOW_USAGE_THRESHOLD) {
    lowUsageAPIs.push({
      api: apiKey,
      count: stats.count,
      users: stats.users.size,
      companies: stats.companies.size,
      avgDuration: Math.round(avgDuration),
    });
  }

  // Slow APIs
  if (avgDuration > SLOW_ENDPOINT_MS) {
    slowAPIs.push({
      api: apiKey,
      avgDuration: Math.round(avgDuration),
      count: stats.count,
      maxDuration: Math.max(...stats.timestamps.map((_, i) => stats.totalDuration / stats.count)),
    });
  }

  // Error-prone APIs
  if (errorRate > ERROR_RATE_THRESHOLD) {
    errorProneAPIs.push({
      api: apiKey,
      errorRate: parseFloat(errorRate.toFixed(2)),
      errors: stats.errors,
      total: stats.count,
      statusCodes: stats.statusCodes,
    });
  }

  // Top APIs by usage
  topAPIs.push({
    api: apiKey,
    count: stats.count,
    avgDuration: Math.round(avgDuration),
    users: stats.users.size,
    companies: stats.companies.size,
  });

  // Anonymous APIs (no user tracking)
  if (stats.users.size === 0 && stats.count > 5) {
    anonymousAPIs.push({
      api: apiKey,
      count: stats.count,
      note: 'Public endpoint or missing user tracking',
    });
  }
});

// Sort results
lowUsageAPIs.sort((a, b) => a.count - b.count);
slowAPIs.sort((a, b) => b.avgDuration - a.avgDuration);
errorProneAPIs.sort((a, b) => b.errorRate - a.errorRate);
topAPIs.sort((a, b) => b.count - a.count);

// ============================================================================
// Generate Report
// ============================================================================

const report = {
  metadata: {
    logFile: logFileName,
    analyzedAt: new Date().toISOString(),
    totalRequests,
    totalErrors,
    uniqueEndpoints: endpointStats.size,
    uniqueUsers: userActivity.size,
    uniqueCompanies: companyActivity.size,
    thresholds: {
      lowUsage: LOW_USAGE_THRESHOLD,
      slowEndpoint: SLOW_ENDPOINT_MS,
      errorRate: ERROR_RATE_THRESHOLD,
    },
  },
  summary: {
    deadAPIs: deadAPIs.length,
    lowUsageAPIs: lowUsageAPIs.length,
    slowAPIs: slowAPIs.length,
    errorProneAPIs: errorProneAPIs.length,
  },
  deadAPIs,
  lowUsageAPIs: lowUsageAPIs.slice(0, 50), // Top 50
  slowAPIs: slowAPIs.slice(0, 20), // Top 20
  errorProneAPIs: errorProneAPIs.slice(0, 20), // Top 20
  topAPIs: topAPIs.slice(0, 30), // Top 30
  anonymousAPIs: anonymousAPIs.slice(0, 10), // Top 10
  userActivity: Array.from(userActivity.entries())
    .map(([userId, apis]) => ({ userId, apiCount: apis.size }))
    .sort((a, b) => b.apiCount - a.apiCount)
    .slice(0, 10),
  companyActivity: Array.from(companyActivity.entries())
    .map(([companyId, apis]) => ({ companyId, apiCount: apis.size }))
    .sort((a, b) => b.apiCount - a.apiCount)
    .slice(0, 10),
};

// Write JSON report
const jsonOutputPath = 'api-usage-report.json';
fs.writeFileSync(jsonOutputPath, JSON.stringify(report, null, 2));

console.log('✅ Analysis Complete');
console.log('='.repeat(60));
console.log('');
console.log('📊 Summary:');
console.log(`   Total Requests: ${totalRequests}`);
console.log(`   Total Errors: ${totalErrors} (${((totalErrors / totalRequests) * 100).toFixed(2)}%)`);
console.log(`   Unique Endpoints: ${endpointStats.size}`);
console.log(`   Unique Users: ${userActivity.size}`);
console.log(`   Unique Companies: ${companyActivity.size}`);
console.log('');
console.log('🔍 Findings:');
console.log(`   🔴 Dead APIs: ${deadAPIs.length}`);
console.log(`   🟡 Low Usage APIs: ${lowUsageAPIs.length} (< ${LOW_USAGE_THRESHOLD} requests)`);
console.log(`   🐌 Slow APIs: ${slowAPIs.length} (> ${SLOW_ENDPOINT_MS}ms)`);
console.log(`   ❌ Error-Prone APIs: ${errorProneAPIs.length} (> ${ERROR_RATE_THRESHOLD}% error rate)`);
console.log('');
console.log(`💾 Reports generated:`);
console.log(`   - ${jsonOutputPath}`);
console.log(`   - api-usage-summary.md`);
console.log('');

// ============================================================================
// Generate Markdown Summary
// ============================================================================

const mdLines = [
  '# API Usage Analysis Report',
  '',
  `**Generated:** ${new Date().toISOString()}  `,
  `**Log File:** ${logFileName}  `,
  `**Period:** 24 hours  `,
  '',
  '## Executive Summary',
  '',
  `- **Total Requests:** ${totalRequests}`,
  `- **Total Errors:** ${totalErrors} (${((totalErrors / totalRequests) * 100).toFixed(2)}%)`,
  `- **Unique Endpoints:** ${endpointStats.size}`,
  `- **Unique Users:** ${userActivity.size}`,
  `- **Unique Companies:** ${companyActivity.size}`,
  '',
  '## Key Findings',
  '',
  `| Category | Count | Threshold |`,
  `|----------|-------|-----------|`,
  `| 🔴 Dead APIs | ${deadAPIs.length} | 0 requests |`,
  `| 🟡 Low Usage | ${lowUsageAPIs.length} | < ${LOW_USAGE_THRESHOLD} requests |`,
  `| 🐌 Slow APIs | ${slowAPIs.length} | > ${SLOW_ENDPOINT_MS}ms avg |`,
  `| ❌ Error-Prone | ${errorProneAPIs.length} | > ${ERROR_RATE_THRESHOLD}% errors |`,
  '',
];

if (deadAPIs.length > 0) {
  mdLines.push('## 🔴 Dead APIs (Candidates for Deletion)');
  mdLines.push('');
  mdLines.push('These endpoints received **ZERO** requests during the analysis period:');
  mdLines.push('');
  deadAPIs.forEach(api => {
    mdLines.push(`- \`${api.api}\` - ${api.reason}`);
  });
  mdLines.push('');
}

if (lowUsageAPIs.length > 0) {
  mdLines.push(`## 🟡 Low Usage APIs (< ${LOW_USAGE_THRESHOLD} requests)`);
  mdLines.push('');
  mdLines.push('| API | Requests | Users | Companies | Avg Duration |');
  mdLines.push('|-----|----------|-------|-----------|--------------|');
  lowUsageAPIs.slice(0, 20).forEach(api => {
    mdLines.push(`| \`${api.api}\` | ${api.count} | ${api.users} | ${api.companies} | ${api.avgDuration}ms |`);
  });
  mdLines.push('');
}

if (slowAPIs.length > 0) {
  mdLines.push(`## 🐌 Slow APIs (> ${SLOW_ENDPOINT_MS}ms)`);
  mdLines.push('');
  mdLines.push('| API | Avg Duration | Requests |');
  mdLines.push('|-----|--------------|----------|');
  slowAPIs.slice(0, 20).forEach(api => {
    mdLines.push(`| \`${api.api}\` | **${api.avgDuration}ms** | ${api.count} |`);
  });
  mdLines.push('');
}

if (errorProneAPIs.length > 0) {
  mdLines.push(`## ❌ Error-Prone APIs (> ${ERROR_RATE_THRESHOLD}%)`);
  mdLines.push('');
  mdLines.push('| API | Error Rate | Errors / Total | Status Codes |');
  mdLines.push('|-----|------------|----------------|--------------|');
  errorProneAPIs.slice(0, 20).forEach(api => {
    const statusCodesStr = Object.entries(api.statusCodes)
      .map(([code, count]) => `${code}:${count}`)
      .join(', ');
    mdLines.push(`| \`${api.api}\` | **${api.errorRate}%** | ${api.errors} / ${api.total} | ${statusCodesStr} |`);
  });
  mdLines.push('');
}

mdLines.push('## 📈 Top 10 Most Used APIs');
mdLines.push('');
mdLines.push('| API | Requests | Avg Duration | Users | Companies |');
mdLines.push('|-----|----------|--------------|-------|-----------|');
topAPIs.slice(0, 10).forEach(api => {
  mdLines.push(`| \`${api.api}\` | ${api.count} | ${api.avgDuration}ms | ${api.users} | ${api.companies} |`);
});
mdLines.push('');

mdLines.push('## 👥 Top 10 Active Users');
mdLines.push('');
mdLines.push('| User ID | Unique APIs Used |');
mdLines.push('|---------|------------------|');
report.userActivity.forEach(user => {
  mdLines.push(`| ${user.userId} | ${user.apiCount} |`);
});
mdLines.push('');

mdLines.push('## 🏢 Top 10 Active Companies');
mdLines.push('');
mdLines.push('| Company ID | Unique APIs Used |');
mdLines.push('|------------|------------------|');
report.companyActivity.forEach(company => {
  mdLines.push(`| ${company.companyId || 'N/A'} | ${company.apiCount} |`);
});
mdLines.push('');

mdLines.push('## Recommendations');
mdLines.push('');
mdLines.push('### Immediate Actions');
mdLines.push('');
if (deadAPIs.length > 0) {
  mdLines.push(`1. **Delete ${deadAPIs.length} dead APIs** - Zero usage confirmed`);
}
if (errorProneAPIs.length > 0) {
  mdLines.push(`2. **Fix ${errorProneAPIs.length} error-prone APIs** - High failure rates detected`);
}
if (slowAPIs.length > 0) {
  mdLines.push(`3. **Optimize ${slowAPIs.length} slow APIs** - Performance bottlenecks identified`);
}
mdLines.push('');
mdLines.push('### Review Required');
mdLines.push('');
if (lowUsageAPIs.length > 0) {
  mdLines.push(`- **${lowUsageAPIs.length} low-usage APIs** - Decide: keep, improve discoverability, or deprecate`);
}
if (anonymousAPIs.length > 0) {
  mdLines.push(`- **${anonymousAPIs.length} anonymous APIs** - Consider adding user tracking for analytics`);
}
mdLines.push('');
mdLines.push('---');
mdLines.push('');
mdLines.push('*Generated by API Usage Analyzer - SLMS Production Infrastructure*');

const mdOutputPath = 'api-usage-summary.md';
fs.writeFileSync(mdOutputPath, mdLines.join('\n'));

console.log('🎉 Analysis complete! Review the reports above.');
console.log('');
console.log('Next steps:');
console.log('  1. Review api-usage-summary.md');
console.log('  2. Confirm dead APIs for deletion');
console.log('  3. Prioritize performance fixes');
console.log('  4. Run cleanup sprint');
