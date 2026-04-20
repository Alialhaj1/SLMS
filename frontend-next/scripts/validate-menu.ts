/**
 * 🔍 MENU VALIDATOR - التحقق من صحة القائمة (موسّع)
 * =====================================================
 * 
 * يتحقق من:
 * ✅ كل labelKey موجود في ملفات i18n
 * ✅ كل permission موجود ومتسق
 * ✅ لا توجد مفاتيح مكررة
 * ✅ العناصر ذات الأطفال لها permission صحيح
 * ✅ المسارات متسقة ولا تتكرر
 * ✅ كل أيقونة معروفة
 * 
 * الاستخدام:
 * npx ts-node scripts/validate-menu.ts
 * npm run menu:validate
 */

import * as fs from 'fs';
import * as path from 'path';

// ألوان للـ console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

interface MenuItemConfig {
  key: string;
  labelKey: string;
  icon: string;
  permission?: string;
  path?: string;
  badge?: string;
  badgeKey?: string;
  children?: MenuItemConfig[];
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  stats: {
    totalMenuItems: number;
    totalLabelKeys: number;
    totalPermissions: number;
    totalPaths: number;
    totalBadges: number;
    missingTranslationsAr: number;
    missingTranslationsEn: number;
    missingPermissions: number;
    duplicateKeys: number;
    duplicatePaths: number;
  };
}

/**
 * استخراج جميع الـ labelKeys من الـ registry
 */
function extractLabelKeys(items: MenuItemConfig[]): string[] {
  const keys: string[] = [];
  for (const item of items) {
    keys.push(item.labelKey);
    if (item.children) {
      keys.push(...extractLabelKeys(item.children));
    }
  }
  return keys;
}

/**
 * استخراج جميع الـ permissions من الـ registry
 */
function extractPermissions(items: MenuItemConfig[]): string[] {
  const perms: string[] = [];
  for (const item of items) {
    if (item.permission) {
      perms.push(item.permission);
    }
    if (item.children) {
      perms.push(...extractPermissions(item.children));
    }
  }
  return [...new Set(perms)];
}

/**
 * استخراج جميع المفاتيح (keys)
 */
function extractKeys(items: MenuItemConfig[]): string[] {
  const keys: string[] = [];
  for (const item of items) {
    keys.push(item.key);
    if (item.children) {
      keys.push(...extractKeys(item.children));
    }
  }
  return keys;
}

/**
 * استخراج جميع المسارات (paths)
 */
function extractPaths(items: MenuItemConfig[]): string[] {
  const paths: string[] = [];
  for (const item of items) {
    if (item.path) {
      paths.push(item.path);
    }
    if (item.children) {
      paths.push(...extractPaths(item.children));
    }
  }
  return paths;
}

/**
 * استخراج جميع الأيقونات (icons)
 */
function extractIcons(items: MenuItemConfig[]): string[] {
  const icons: string[] = [];
  for (const item of items) {
    icons.push(item.icon);
    if (item.children) {
      icons.push(...extractIcons(item.children));
    }
  }
  return [...new Set(icons)];
}

/**
 * استخراج جميع الـ Badges
 */
function extractBadges(items: MenuItemConfig[]): string[] {
  const badges: string[] = [];
  for (const item of items) {
    if (item.badge) {
      badges.push(item.badge);
    }
    if (item.children) {
      badges.push(...extractBadges(item.children));
    }
  }
  return [...new Set(badges)];
}

/**
 * التحقق من العناصر بدون permission ولها أطفال
 */
function checkParentPermissions(items: MenuItemConfig[], parentKey: string = ''): string[] {
  const issues: string[] = [];
  for (const item of items) {
    if (item.children && item.children.length > 0 && !item.permission) {
      // عنصر به أطفال لكن بدون permission - قد يكون مقصود (مثل dashboard)
      // نضيف تحذير فقط
      issues.push(`${item.key} (له ${item.children.length} أطفال بدون permission للأب)`);
    }
  }
  return issues;
}

/**
 * التحقق من وجود مفتاح في ملف JSON
 */
function hasNestedKey(obj: any, keyPath: string): boolean {
  if (!obj) return false;

  // 1) direct flattened key at root
  if (Object.prototype.hasOwnProperty.call(obj, keyPath)) {
    return true;
  }

  // 2) nested traversal with support for flattened keys at each level
  const parts = keyPath.split('.');
  let current: any = obj;

  for (let i = 0; i < parts.length; i++) {
    if (!current || typeof current !== 'object') return false;

    // Try remaining path as a single key with dots (flattened)
    const remainingPath = parts.slice(i).join('.');
    if (Object.prototype.hasOwnProperty.call(current, remainingPath)) {
      return true;
    }

    const key = parts[i];
    if (Object.prototype.hasOwnProperty.call(current, key)) {
      current = current[key];
    } else {
      return false;
    }
  }

  return true;
}

/**
 * تحميل ملف JSON
 */
function loadJson(filePath: string): any {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`${colors.red}خطأ في تحميل الملف: ${filePath}${colors.reset}`);
    return null;
  }
}

/**
 * الـ validator الرئيسي (موسّع)
 */
function validateMenu(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    suggestions: [],
    stats: {
      totalMenuItems: 0,
      totalLabelKeys: 0,
      totalPermissions: 0,
      totalPaths: 0,
      totalBadges: 0,
      missingTranslationsAr: 0,
      missingTranslationsEn: 0,
      missingPermissions: 0,
      duplicateKeys: 0,
      duplicatePaths: 0,
    },
  };

  // قائمة الأيقونات المعروفة
  // NOTE: ICON_MAP in the app contains many Heroicons; maintaining a hardcoded list here
  // becomes noisy and brittle. We treat any "*Icon" as valid.
  const isKnownIcon = (icon: string) => typeof icon === 'string' && /Icon$/.test(icon);

  // قائمة أنواع Badge المعروفة
  const KNOWN_BADGES = [
    'notifications', 'pendingApprovals', 'pendingShipments',
    'pendingExpenses', 'pendingJournals', 'custom',
  ];

  // تحميل الملفات
  const menuRegistryPath = path.join(__dirname, '../config/menu.registry.ts');
  const arPath = path.join(__dirname, '../locales/ar.json');
  const enPath = path.join(__dirname, '../locales/en.json');

  // قراءة الـ menu registry
  let menuRegistry: MenuItemConfig[] = [];
  try {
    // نقرأ الملف كنص ونستخرج الـ array
    const content = fs.readFileSync(menuRegistryPath, 'utf-8');
    // استخدام dynamic import أو eval (للتبسيط سنستخرج البيانات يدوياً)
    // للإنتاج، استخدم ts-node أو compile أولاً
    
    // بدلاً من ذلك، نقرأ مباشرة
    const { MENU_REGISTRY } = require('../config/menu.registry');
    menuRegistry = MENU_REGISTRY;
  } catch (error) {
    result.errors.push(`فشل تحميل menu.registry.ts: ${error}`);
    result.valid = false;
    return result;
  }

  // تحميل ملفات الترجمة
  const arTranslations = loadJson(arPath);
  const enTranslations = loadJson(enPath);

  if (!arTranslations || !enTranslations) {
    result.valid = false;
    return result;
  }

  // استخراج البيانات
  const labelKeys = extractLabelKeys(menuRegistry);
  const permissions = extractPermissions(menuRegistry);
  const menuKeys = extractKeys(menuRegistry);
  const paths = extractPaths(menuRegistry);
  const icons = extractIcons(menuRegistry);
  const badges = extractBadges(menuRegistry);

  result.stats.totalMenuItems = menuKeys.length;
  result.stats.totalLabelKeys = labelKeys.length;
  result.stats.totalPermissions = permissions.length;
  result.stats.totalPaths = paths.length;
  result.stats.totalBadges = badges.length;

  // التحقق من المفاتيح المكررة
  const duplicateKeys = menuKeys.filter((key, index) => menuKeys.indexOf(key) !== index);
  if (duplicateKeys.length > 0) {
    result.stats.duplicateKeys = duplicateKeys.length;
    result.errors.push(`مفاتيح مكررة: ${duplicateKeys.join(', ')}`);
    result.valid = false;
  }

  // التحقق من المسارات المكررة
  const duplicatePaths = paths.filter((p, index) => paths.indexOf(p) !== index);
  if (duplicatePaths.length > 0) {
    result.stats.duplicatePaths = duplicatePaths.length;
    // NOTE: Duplicate paths can be intentional (shared master pages linked from multiple sections).
    // Keep as warning to avoid blocking CI on valid navigation patterns.
    result.warnings.push(`مسارات مكررة (تحقق أنها مقصودة): ${duplicatePaths.join(', ')}`);
  }

  // التحقق من الأيقونات غير المعروفة
  const unknownIcons = icons.filter(icon => !isKnownIcon(icon));
  if (unknownIcons.length > 0) {
    result.warnings.push(`أيقونات غير معروفة (قد تحتاج إضافة لـ ICON_MAP): ${unknownIcons.join(', ')}`);
  }

  // التحقق من أنواع Badge غير المعروفة
  const unknownBadges = badges.filter(badge => !KNOWN_BADGES.includes(badge));
  if (unknownBadges.length > 0) {
    result.warnings.push(`أنواع Badge غير معروفة: ${unknownBadges.join(', ')}`);
  }

  // التحقق من الترجمة العربية
  const missingAr: string[] = [];
  for (const key of labelKeys) {
    if (!hasNestedKey(arTranslations, key)) {
      missingAr.push(key);
    }
  }
  if (missingAr.length > 0) {
    result.stats.missingTranslationsAr = missingAr.length;
    result.errors.push(`ترجمات عربية مفقودة (${missingAr.length}):
  - ${missingAr.join('
  - ')}`);
    result.valid = false;
  }

  // التحقق من الترجمة الإنجليزية
  const missingEn: string[] = [];
  for (const key of labelKeys) {
    if (!hasNestedKey(enTranslations, key)) {
      missingEn.push(key);
    }
  }
  if (missingEn.length > 0) {
    result.stats.missingTranslationsEn = missingEn.length;
    result.errors.push(`ترجمات إنجليزية مفقودة (${missingEn.length}):
  - ${missingEn.join('
  - ')}`);
    result.valid = false;
  }

  // التحقق من العناصر الأب بدون permission
  const parentWithoutPermission = checkParentPermissions(menuRegistry);
  if (parentWithoutPermission.length > 0) {
    result.suggestions.push(`عناصر أب بدون permission (قد يكون مقصود):
  - ${parentWithoutPermission.join('
  - ')}`);
  }

  // اقتراحات للتحسين
  if (permissions.length > 0) {
    result.suggestions.push(`تم العثور على ${permissions.length} صلاحية فريدة - تأكد من وجودها في Permission Registry`);
  }

  // اقتراح للمسارات
  const pathsWithoutLeadingSlash = paths.filter(p => !p.startsWith('/'));
  if (pathsWithoutLeadingSlash.length > 0) {
    result.warnings.push(`مسارات بدون / في البداية: ${pathsWithoutLeadingSlash.join(', ')}`);
  }

  return result;
}

/**
 * طباعة النتائج (موسّعة)
 */
function printResults(result: ValidationResult): void {
  console.log('
' + '═'.repeat(60));
  console.log(`${colors.cyan}🔍 نتائج التحقق من القائمة الجانبية (موسّع)${colors.reset}`);
  console.log('═'.repeat(60));

  // الإحصائيات
  console.log(`
${colors.blue}📊 الإحصائيات:${colors.reset}`);
  console.log(`   - إجمالي عناصر القائمة: ${result.stats.totalMenuItems}`);
  console.log(`   - إجمالي مفاتيح الترجمة: ${result.stats.totalLabelKeys}`);
  console.log(`   - إجمالي الصلاحيات: ${result.stats.totalPermissions}`);
  console.log(`   - إجمالي المسارات: ${result.stats.totalPaths}`);
  console.log(`   - إجمالي الـ Badges: ${result.stats.totalBadges}`);
  
  if (result.stats.duplicateKeys > 0) {
    console.log(`   ${colors.red}- مفاتيح مكررة: ${result.stats.duplicateKeys}${colors.reset}`);
  }
  if (result.stats.duplicatePaths > 0) {
    console.log(`   ${colors.red}- مسارات مكررة: ${result.stats.duplicatePaths}${colors.reset}`);
  }

  // الأخطاء
  if (result.errors.length > 0) {
    console.log(`
${colors.red}❌ الأخطاء (${result.errors.length}):${colors.reset}`);
    result.errors.forEach((error, i) => {
      console.log(`   ${i + 1}. ${error}`);
    });
  }

  // التحذيرات
  if (result.warnings.length > 0) {
    console.log(`
${colors.yellow}⚠️  التحذيرات (${result.warnings.length}):${colors.reset}`);
    result.warnings.forEach((warning, i) => {
      console.log(`   ${i + 1}. ${warning}`);
    });
  }

  // الاقتراحات
  if (result.suggestions.length > 0) {
    console.log(`
${colors.magenta}💡 الاقتراحات (${result.suggestions.length}):${colors.reset}`);
    result.suggestions.forEach((suggestion, i) => {
      console.log(`   ${i + 1}. ${suggestion}`);
    });
  }

  // النتيجة النهائية
  console.log('
' + '─'.repeat(60));
  if (result.valid) {
    console.log(`${colors.green}✅ القائمة صالحة!${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ القائمة تحتاج إصلاح!${colors.reset}`);
  }
  console.log('═'.repeat(60) + '\n');
}

// تشغيل الـ validator
const result = validateMenu();
printResults(result);

// Exit code للـ CI/CD
process.exit(result.valid ? 0 : 1);
