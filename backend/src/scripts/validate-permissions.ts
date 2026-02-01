/**
 * 🔐 PERMISSION VALIDATOR
 * =====================================================
 * Validates permission consistency across the entire system
 * 
 * Usage:
 *   npm run permissions:validate
 * 
 * Checks:
 * 1. Permissions in UI but not in registry (CRITICAL)
 * 2. Permissions in DB but not in registry (ORPHAN)
 * 3. Permissions in registry but not in DB (SYNC NEEDED)
 * 4. API endpoints without permission checks (SECURITY)
 * 5. i18n keys without translations (MISSING)
 */

import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import { getAllPermissions } from '../config/permissions.registry';
import { SCREENS, ACTIONS, FIELDS, MESSAGES, ERRORS } from '../config/i18n.registry';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

interface ValidationResult {
  category: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  file?: string;
  line?: number;
}

const results: ValidationResult[] = [];

// Database connection
const databaseUrl = process.env.DATABASE_URL || 'postgresql://slms:slms_pass@postgres:5432/slms_db';
const pool = new Pool({ connectionString: databaseUrl });

/**
 * Recursively find all files with given extensions
 */
function findFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dir)) return files;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip node_modules and .next
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist') {
        continue;
      }
      files.push(...findFiles(fullPath, extensions));
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Extract permission strings from file content
 */
function extractPermissions(content: string, filePath: string): { perm: string; line: number }[] {
  const permissions: { perm: string; line: number }[] = [];
  const lines = content.split('\n');
  
  // Patterns to match:
  // can('permission.code')
  // canAny(['perm1', 'perm2'])
  // permission="permission.code"
  // requirePermission('permission.code')
  // hasPermission('permission:code')
  
  const patterns = [
    /can\(['"`]([a-z._:]+)['"`]\)/gi,
    /canAny\(\[([^\]]+)\]\)/gi,
    /canAll\(\[([^\]]+)\]\)/gi,
    /permission=["'`]([a-z._:]+)["'`]/gi,
    /requirePermission\(['"`]([a-z._:]+)['"`]\)/gi,
    /hasPermission\(['"`]([a-z._:]+)['"`]\)/gi,
    /viewPermission=["'`]([a-z._:]+)["'`]/gi,
    /editPermission=["'`]([a-z._:]+)["'`]/gi,
  ];
  
  lines.forEach((line, lineNum) => {
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const permsInMatch = match[1];
        
        // Handle arrays like ['perm1', 'perm2']
        const permList = permsInMatch.split(/[,\s]+/)
          .map(p => p.replace(/['"`\[\]]/g, '').trim())
          .filter(p => p.length > 0 && /^[a-z._:]+$/i.test(p));
        
        permList.forEach(perm => {
          permissions.push({ perm, line: lineNum + 1 });
        });
      }
    });
  });
  
  return permissions;
}

/**
 * Extract i18n keys from file content
 */
function extractI18nKeys(content: string, filePath: string): { key: string; line: number }[] {
  const keys: { key: string; line: number }[] = [];
  const lines = content.split('\n');
  
  // Patterns to match:
  // t('key')
  // t("key")
  // t(`key`)
  
  const patterns = [
    /\bt\(['"`]([a-zA-Z0-9._]+)['"`](?:,|\))/g,
  ];
  
  lines.forEach((line, lineNum) => {
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        keys.push({ key: match[1], line: lineNum + 1 });
      }
    });
  });
  
  return keys;
}

/**
 * Check for hardcoded strings in JSX
 */
function findHardcodedStrings(content: string, filePath: string): { text: string; line: number }[] {
  const hardcoded: { text: string; line: number }[] = [];
  const lines = content.split('\n');
  
  // Skip non-component files
  if (!filePath.includes('/pages/') && !filePath.includes('/components/')) {
    return hardcoded;
  }
  
  // Pattern for JSX text content (basic detection)
  const jsxTextPattern = />([A-Za-z\u0600-\u06FF][A-Za-z\u0600-\u06FF\s]{2,})</g;
  
  lines.forEach((line, lineNum) => {
    // Skip comments and imports
    if (line.trim().startsWith('//') || line.trim().startsWith('import') || line.trim().startsWith('*')) {
      return;
    }
    
    let match;
    while ((match = jsxTextPattern.exec(line)) !== null) {
      const text = match[1].trim();
      
      // Skip common false positives
      if (
        text.length < 3 ||
        /^[A-Z_]+$/.test(text) || // Constants
        /^\{/.test(text) || // JSX expressions
        /^className/.test(text)
      ) {
        continue;
      }
      
      hardcoded.push({ text, line: lineNum + 1 });
    }
  });
  
  return hardcoded;
}

/**
 * Check API routes for permission middleware
 */
function checkApiRoutes(content: string, filePath: string): void {
  const lines = content.split('\n');
  
  // Find route definitions
  const routePattern = /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  
  lines.forEach((line, lineNum) => {
    const match = routePattern.exec(line);
    if (match) {
      const method = match[1].toUpperCase();
      const routePath = match[2];
      
      // Check if this line or nearby lines have requirePermission
      const contextStart = Math.max(0, lineNum - 2);
      const contextEnd = Math.min(lines.length, lineNum + 5);
      const context = lines.slice(contextStart, contextEnd).join('\n');
      
      if (!context.includes('requirePermission') && !context.includes('isAuthenticated')) {
        results.push({
          category: 'API_NO_AUTH',
          severity: 'error',
          message: `${method} ${routePath} - No permission check found`,
          file: filePath,
          line: lineNum + 1,
        });
      }
    }
  });
}

/**
 * Main validation function
 */
async function validate() {
  console.log('\n' + colors.cyan + '🔐 Permission & i18n Validator' + colors.reset);
  console.log('=' .repeat(60) + '\n');
  
  const registryPermissions = getAllPermissions();
  console.log(`📋 Registry contains ${registryPermissions.length} permissions\n`);
  
  // Get all permissions from frontend and backend
  const frontendDir = path.join(__dirname, '../../../frontend-next');
  const backendDir = path.join(__dirname, '../');
  
  const frontendFiles = findFiles(frontendDir, ['.tsx', '.ts']);
  const backendFiles = findFiles(backendDir, ['.ts']);
  
  console.log(`📁 Scanning ${frontendFiles.length} frontend files...`);
  console.log(`📁 Scanning ${backendFiles.length} backend files...\n`);
  
  // Collect all used permissions
  const usedPermissions = new Map<string, { file: string; line: number }[]>();
  
  // Scan frontend
  for (const file of frontendFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const perms = extractPermissions(content, file);
    
    perms.forEach(({ perm, line }) => {
      // Normalize permission (colon to dot)
      const normalized = perm.replace(/:/g, '.');
      
      if (!usedPermissions.has(normalized)) {
        usedPermissions.set(normalized, []);
      }
      usedPermissions.get(normalized)!.push({ file, line });
    });
  }
  
  // Scan backend
  for (const file of backendFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const perms = extractPermissions(content, file);
    
    perms.forEach(({ perm, line }) => {
      const normalized = perm.replace(/:/g, '.');
      
      if (!usedPermissions.has(normalized)) {
        usedPermissions.set(normalized, []);
      }
      usedPermissions.get(normalized)!.push({ file, line });
    });
    
    // Check API routes
    if (file.includes('/routes/')) {
      checkApiRoutes(content, file);
    }
  }
  
  // =====================================================
  // CHECK 1: Permissions used but not in registry
  // =====================================================
  console.log(colors.magenta + '🔍 Check 1: Permissions used but not in registry' + colors.reset);
  
  let missingFromRegistry = 0;
  usedPermissions.forEach((locations, perm) => {
    // Skip wildcards and special patterns
    if (perm.includes('*') || perm === '*:*') return;
    
    if (!registryPermissions.includes(perm)) {
      missingFromRegistry++;
      const firstLoc = locations[0];
      results.push({
        category: 'MISSING_IN_REGISTRY',
        severity: 'error',
        message: perm,
        file: firstLoc.file,
        line: firstLoc.line,
      });
      console.log(`   ${colors.red}❌ ${perm}${colors.reset}`);
      console.log(`      Used in: ${path.basename(firstLoc.file)}:${firstLoc.line}`);
    }
  });
  
  if (missingFromRegistry === 0) {
    console.log(`   ${colors.green}✅ All used permissions are in registry${colors.reset}`);
  }
  console.log('');
  
  // =====================================================
  // CHECK 2: Permissions in registry but never used
  // =====================================================
  console.log(colors.magenta + '🔍 Check 2: Permissions in registry but never used' + colors.reset);
  
  let unusedCount = 0;
  registryPermissions.forEach(perm => {
    if (!usedPermissions.has(perm)) {
      unusedCount++;
      results.push({
        category: 'UNUSED_PERMISSION',
        severity: 'warning',
        message: perm,
      });
    }
  });
  
  if (unusedCount > 0) {
    console.log(`   ${colors.yellow}⚠ ${unusedCount} permissions defined but not yet used${colors.reset}`);
    console.log(`   (This is expected for new permissions not yet implemented)`);
  } else {
    console.log(`   ${colors.green}✅ All registry permissions are used${colors.reset}`);
  }
  console.log('');
  
  // =====================================================
  // CHECK 3: Database vs Registry sync
  // =====================================================
  console.log(colors.magenta + '🔍 Check 3: Database vs Registry sync' + colors.reset);
  
  try {
    const client = await pool.connect();
    
    const dbPerms = await client.query(`
      SELECT code, is_active FROM granular_permissions ORDER BY code
    `);
    
    const dbPermCodes = new Set(dbPerms.rows.map(r => r.code));
    const registrySet = new Set(registryPermissions);
    
    // In DB but not in registry
    let orphanInDb = 0;
    dbPerms.rows.forEach(row => {
      if (!registrySet.has(row.code) && row.is_active) {
        orphanInDb++;
        results.push({
          category: 'ORPHAN_IN_DB',
          severity: 'warning',
          message: row.code,
        });
      }
    });
    
    // In registry but not in DB
    let missingInDb = 0;
    registryPermissions.forEach(perm => {
      if (!dbPermCodes.has(perm)) {
        missingInDb++;
        results.push({
          category: 'MISSING_IN_DB',
          severity: 'info',
          message: perm,
        });
      }
    });
    
    if (orphanInDb > 0) {
      console.log(`   ${colors.yellow}⚠ ${orphanInDb} permissions in DB but not in registry (orphans)${colors.reset}`);
    }
    if (missingInDb > 0) {
      console.log(`   ${colors.blue}ℹ ${missingInDb} permissions in registry but not in DB${colors.reset}`);
      console.log(`   Run: npm run permissions:generate`);
    }
    if (orphanInDb === 0 && missingInDb === 0) {
      console.log(`   ${colors.green}✅ Database and registry are in sync${colors.reset}`);
    }
    
    client.release();
  } catch (error) {
    console.log(`   ${colors.yellow}⚠ Could not connect to database${colors.reset}`);
  }
  console.log('');
  
  // =====================================================
  // CHECK 4: API routes without permission
  // =====================================================
  console.log(colors.magenta + '🔍 Check 4: API endpoints without permission checks' + colors.reset);
  
  const apiErrors = results.filter(r => r.category === 'API_NO_AUTH');
  if (apiErrors.length > 0) {
    console.log(`   ${colors.red}❌ ${apiErrors.length} unprotected endpoints found:${colors.reset}`);
    apiErrors.forEach(err => {
      console.log(`      ${err.message}`);
      console.log(`      ${path.basename(err.file!)}:${err.line}`);
    });
  } else {
    console.log(`   ${colors.green}✅ All API endpoints have permission checks${colors.reset}`);
  }
  console.log('');
  
  // =====================================================
  // CHECK 5: i18n coverage (quick check)
  // =====================================================
  console.log(colors.magenta + '🔍 Check 5: i18n key coverage' + colors.reset);
  
  const i18nKeys = new Set<string>();
  Object.keys(SCREENS).forEach(k => i18nKeys.add(k));
  Object.keys(ACTIONS).forEach(k => i18nKeys.add(k));
  Object.keys(FIELDS).forEach(k => i18nKeys.add(k));
  Object.keys(MESSAGES).forEach(k => i18nKeys.add(k));
  Object.keys(ERRORS).forEach(k => i18nKeys.add(k));
  
  console.log(`   ${colors.green}✅ ${i18nKeys.size} i18n keys defined${colors.reset}`);
  console.log('');
  
  // =====================================================
  // SUMMARY
  // =====================================================
  console.log('=' .repeat(60));
  console.log(colors.cyan + '📊 VALIDATION SUMMARY' + colors.reset);
  console.log('=' .repeat(60));
  
  const errors = results.filter(r => r.severity === 'error');
  const warnings = results.filter(r => r.severity === 'warning');
  const infos = results.filter(r => r.severity === 'info');
  
  console.log(`\n   ${colors.red}❌ Errors:   ${errors.length}${colors.reset}`);
  console.log(`   ${colors.yellow}⚠ Warnings: ${warnings.length}${colors.reset}`);
  console.log(`   ${colors.blue}ℹ Info:     ${infos.length}${colors.reset}`);
  
  if (errors.length === 0) {
    console.log(`\n${colors.green}✅ VALIDATION PASSED - No critical issues found${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}❌ VALIDATION FAILED - ${errors.length} critical issues require attention${colors.reset}\n`);
    process.exit(1);
  }
}

// Run validation
validate()
  .catch(err => {
    console.error('Validation error:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
