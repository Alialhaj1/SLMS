#!/usr/bin/env ts-node
/**
 * 🔒 PERMISSION SYNC VALIDATOR
 * =====================================================
 * 
 * Critical Security Script - DO NOT SKIP
 * 
 * Purpose:
 * - Extract all Backend requirePermission() calls
 * - Compare with Frontend MenuPermissions constants
 * - Report mismatches (Missing/Extra/Format issues)
 * 
 * Usage:
 *   npm run validate:permissions
 * 
 * Exit Codes:
 *   0 = Perfect sync (100%)
 *   1 = Mismatches found (MUST FIX)
 *   2 = Script error
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

// ESM equivalents for __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================
// Types & Interfaces
// =============================================

interface BackendPermission {
  file: string;
  line: number;
  method: string;
  endpoint: string;
  permission: string;
}

interface ValidationResult {
  backendOnly: BackendPermission[];
  frontendOnly: string[];
  formatMismatches: Array<{
    backend: string;
    frontend: string;
    suggestion: string;
  }>;
  perfectMatches: string[];
}

// =============================================
// Configuration
// =============================================

const BACKEND_ROUTES_DIR = path.join(__dirname, '../../backend/src/routes');
const FRONTEND_PERMISSIONS_FILE = path.join(__dirname, '../config/menu.permissions.ts');

// Debug: Print resolved paths
console.log('Script location:', __dirname);
console.log('Backend Routes Dir:', BACKEND_ROUTES_DIR);
console.log('Frontend Permissions File:', FRONTEND_PERMISSIONS_FILE);
console.log('Backend Dir Exists:', fs.existsSync(BACKEND_ROUTES_DIR));

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// =============================================
// Step 1: Extract Backend Permissions
// =============================================

function extractBackendPermissions(): BackendPermission[] {
  const permissions: BackendPermission[] = [];
  
  // Pattern: requirePermission('permission:name')
  const permissionRegex = /requirePermission\(['"]([^'"]+)['"]\)/g;
  
  // Pattern: router.METHOD('/endpoint',
  const routeRegex = /router\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g;

  try {
    const routeFiles = glob.sync(`${BACKEND_ROUTES_DIR}/*.ts`);
    
    for (const file of routeFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check if line contains requirePermission
        const permMatch = permissionRegex.exec(line);
        if (permMatch) {
          const permission = permMatch[1];
          
          // Search backward for router method (within 10 lines)
          let method = 'UNKNOWN';
          let endpoint = 'UNKNOWN';
          
          for (let j = i; j >= Math.max(0, i - 10); j--) {
            const routeMatch = routeRegex.exec(lines[j]);
            if (routeMatch) {
              method = routeMatch[1].toUpperCase();
              endpoint = routeMatch[2];
              break;
            }
            // Reset regex index
            routeRegex.lastIndex = 0;
          }
          
          permissions.push({
            file: path.basename(file),
            line: i + 1,
            method,
            endpoint,
            permission,
          });
        }
        
        // Reset regex indices
        permissionRegex.lastIndex = 0;
      }
    }
    
    return permissions;
  } catch (error) {
    console.error(`${COLORS.red}Error reading backend routes:${COLORS.reset}`, error);
    process.exit(2);
  }
}

// =============================================
// Step 2: Extract Frontend Permissions
// =============================================

function extractFrontendPermissions(): string[] {
  try {
    const content = fs.readFileSync(FRONTEND_PERMISSIONS_FILE, 'utf-8');
    
    // Extract permission strings from MenuPermissions object
    // Pattern: Property: 'permission:string:here' as const|Permission
    const permissionRegex = /:\s*['"]([^'"]+)['"]\s+as\s+(const|Permission)/g;
    
    const permissions: string[] = [];
    let match;
    
    while ((match = permissionRegex.exec(content)) !== null) {
      permissions.push(match[1]);
    }
    
    return [...new Set(permissions)]; // Deduplicate
  } catch (error) {
    console.error(`${COLORS.red}Error reading frontend permissions:${COLORS.reset}`, error);
    process.exit(2);
  }
}

// =============================================
// Step 3: Normalize Permissions
// =============================================

function normalizePermission(perm: string): string {
  // Convert 'accounting.journal.view' to 'accounting:journal:view'
  // Or 'journal_view' to 'journal:view'
  return perm
    .toLowerCase()
    .replace(/\./g, ':')
    .replace(/_/g, ':')
    .replace(/:{2,}/g, ':') // Remove duplicate colons
    .trim();
}

// =============================================
// Step 4: Compare & Validate
// =============================================

function validateSync(): ValidationResult {
  console.log(`\n${COLORS.cyan}${COLORS.bold}🔍 Scanning Backend Routes...${COLORS.reset}`);
  const backendPerms = extractBackendPermissions();
  console.log(`   Found ${backendPerms.length} permission checks`);
  
  console.log(`\n${COLORS.cyan}${COLORS.bold}🔍 Scanning Frontend Permissions...${COLORS.reset}`);
  const frontendPerms = extractFrontendPermissions();
  console.log(`   Found ${frontendPerms.length} defined permissions`);
  
  const backendSet = new Set(backendPerms.map(p => normalizePermission(p.permission)));
  const frontendSet = new Set(frontendPerms.map(p => normalizePermission(p)));
  
  const result: ValidationResult = {
    backendOnly: [],
    frontendOnly: [],
    formatMismatches: [],
    perfectMatches: [],
  };
  
  // Backend permissions without Frontend definition
  for (const bp of backendPerms) {
    const normalized = normalizePermission(bp.permission);
    if (!frontendSet.has(normalized)) {
      result.backendOnly.push(bp);
    } else {
      result.perfectMatches.push(bp.permission);
    }
  }
  
  // Frontend permissions not used in Backend
  for (const fp of frontendPerms) {
    const normalized = normalizePermission(fp);
    if (!backendSet.has(normalized)) {
      result.frontendOnly.push(fp);
    }
  }
  
  return result;
}

// =============================================
// Step 5: Report Results
// =============================================

function printReport(result: ValidationResult): void {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${COLORS.bold}🔐 PERMISSION SYNC VALIDATION REPORT${COLORS.reset}`);
  console.log(`${'='.repeat(80)}\n`);
  
  // Perfect Matches
  console.log(`${COLORS.green}✅ Perfect Matches: ${result.perfectMatches.length}${COLORS.reset}`);
  
  // Backend-Only (CRITICAL)
  if (result.backendOnly.length > 0) {
    console.log(`\n${COLORS.red}${COLORS.bold}❌ Backend Permissions WITHOUT Frontend Definition: ${result.backendOnly.length}${COLORS.reset}`);
    console.log(`${COLORS.yellow}   ⚠️  CRITICAL: These APIs are protected but Frontend doesn't know!${COLORS.reset}\n`);
    
    for (const perm of result.backendOnly) {
      console.log(`   ${COLORS.red}•${COLORS.reset} ${perm.permission}`);
      console.log(`     ${COLORS.cyan}File:${COLORS.reset} ${perm.file}:${perm.line}`);
      console.log(`     ${COLORS.cyan}Endpoint:${COLORS.reset} ${perm.method} ${perm.endpoint}`);
      console.log(`     ${COLORS.yellow}Action:${COLORS.reset} Add to MenuPermissions in menu.permissions.ts\n`);
    }
  }
  
  // Frontend-Only (Warning)
  if (result.frontendOnly.length > 0) {
    console.log(`\n${COLORS.yellow}⚠️  Frontend Permissions WITHOUT Backend Usage: ${result.frontendOnly.length}${COLORS.reset}`);
    console.log(`${COLORS.yellow}   May be OK if planned for future or used in UI-only checks${COLORS.reset}\n`);
    
    for (const perm of result.frontendOnly.slice(0, 10)) { // Show first 10
      console.log(`   ${COLORS.yellow}•${COLORS.reset} ${perm}`);
    }
    
    if (result.frontendOnly.length > 10) {
      console.log(`   ${COLORS.yellow}... and ${result.frontendOnly.length - 10} more${COLORS.reset}`);
    }
  }
  
  // Summary
  console.log(`\n${'='.repeat(80)}`);
  
  const totalIssues = result.backendOnly.length;
  
  if (totalIssues === 0) {
    console.log(`${COLORS.green}${COLORS.bold}✅ SYNC STATUS: PERFECT (100%)${COLORS.reset}`);
    console.log(`   All Backend permissions have Frontend definitions.`);
    console.log(`   ${result.perfectMatches.length} permissions validated.`);
  } else {
    console.log(`${COLORS.red}${COLORS.bold}❌ SYNC STATUS: FAILED${COLORS.reset}`);
    console.log(`   ${result.backendOnly.length} Backend permissions missing from Frontend`);
    console.log(`   ${result.frontendOnly.length} Frontend permissions not used in Backend (warning only)`);
  }
  
  console.log(`${'='.repeat(80)}\n`);
}

// =============================================
// Main Execution
// =============================================

function main(): void {
  console.log(`${COLORS.bold}Backend ↔ Frontend Permission Sync Validator${COLORS.reset}`);
  console.log(`Backend Dir: ${BACKEND_ROUTES_DIR}`);
  console.log(`Frontend File: ${FRONTEND_PERMISSIONS_FILE}`);
  
  const result = validateSync();
  printReport(result);
  
  // Exit with error if critical issues found
  if (result.backendOnly.length > 0) {
    console.log(`${COLORS.red}❌ Build Failed: Fix permission mismatches before proceeding.${COLORS.reset}\n`);
    process.exit(1);
  }
  
  console.log(`${COLORS.green}✅ Validation Passed!${COLORS.reset}\n`);
  process.exit(0);
}

// Run if executed directly
const scriptPath = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === scriptPath;

if (isMainModule) {
  main();
}

export { extractBackendPermissions, extractFrontendPermissions, validateSync };
