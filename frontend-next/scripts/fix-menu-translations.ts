/**
 * 🛠️ Fix Menu Translations
 * =====================================================
 * Adds missing `menu.*` translation keys used by `MENU_REGISTRY`
 * into `locales/en.json` and `locales/ar.json`.
 *
 * Strategy:
 * - Keep existing translation files untouched except for adding missing keys.
 * - Store menu translations inside the `menu` object using the existing flattened-key style:
 *   - `menu.generalAdmin` => translations.menu["generalAdmin"]
 *   - `menu.generalAdmin.chartOfAccounts` => translations.menu["generalAdmin.chartOfAccounts"]
 * - Best-effort labels from `erpTranslations` (search by last segment), else humanize.
 */

import * as fs from 'fs';
import * as path from 'path';

import { MENU_REGISTRY } from '../config/menu.registry';
import { erpTranslations } from '../locales/erpTranslations';

type Locale = 'en' | 'ar';

type AnyObject = Record<string, any>;

function readJson(filePath: string): AnyObject {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function writeJson(filePath: string, obj: AnyObject): void {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + '
', 'utf-8');
}

function extractLabelKeys(items: any[]): string[] {
  const keys: string[] = [];
  for (const item of items) {
    if (item?.labelKey) keys.push(item.labelKey);
    if (Array.isArray(item?.children)) {
      keys.push(...extractLabelKeys(item.children));
    }
  }
  return keys;
}

/**
 * Same lookup behavior as `frontend-next/hooks/useTranslation.ts`:
 * - supports flattened keys (with dots) at any level
 * - supports nested traversal
 */
function getNestedValue(obj: any, fullPath: string): string | undefined {
  if (!obj) return undefined;

  if (Object.prototype.hasOwnProperty.call(obj, fullPath)) {
    return obj[fullPath];
  }

  const parts = fullPath.split('.');
  let current: any = obj;

  for (let i = 0; i < parts.length; i++) {
    if (!current) return undefined;

    const remainingPath = parts.slice(i).join('.');
    if (Object.prototype.hasOwnProperty.call(current, remainingPath)) {
      return current[remainingPath];
    }

    const key = parts[i];
    if (Object.prototype.hasOwnProperty.call(current, key)) {
      current = current[key];
    } else {
      return undefined;
    }
  }

  return typeof current === 'string' ? current : undefined;
}

function hasKey(obj: any, key: string): boolean {
  return typeof getNestedValue(obj, key) === 'string';
}

function humanizeIdentifier(input: string): string {
  // turn camelCase / PascalCase / snake_case into Title Case
  const spaced = input
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();

  if (!spaced) return input;

  return spaced
    .split(' ')
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function findValueByLeafKey(obj: any, leafKey: string): string | undefined {
  if (!obj || typeof obj !== 'object') return undefined;

  if (Object.prototype.hasOwnProperty.call(obj, leafKey) && typeof obj[leafKey] === 'string') {
    return obj[leafKey];
  }

  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') {
      const found = findValueByLeafKey(value, leafKey);
      if (found) return found;
    }
  }

  return undefined;
}

const GROUP_LABELS: Record<string, { en: string; ar: string }> = {
  dashboard: { en: 'Dashboard', ar: 'لوحة التحكم' },
  generalAdmin: { en: 'General Administration', ar: 'الإدارة العامة' },
  generalLedger: { en: 'General Ledger', ar: 'نظام الأستاذ العام' },
  financeAccounting: { en: 'Finance & Accounting', ar: 'المالية والمحاسبة' },
  sales: { en: 'Sales', ar: 'المبيعات' },
  purchasing: { en: 'Purchasing', ar: 'المشتريات' },
  inventory: { en: 'Inventory', ar: 'المخزون' },
  importExport: { en: 'Import & Export', ar: 'الاستيراد والتصدير' },
  referenceData: { en: 'Reference Data', ar: 'البيانات المرجعية' },
  taxes: { en: 'Taxes & Zakat', ar: 'الضرائب والزكاة' },
  logistics: { en: 'Logistics', ar: 'اللوجستيات' },
  documents: { en: 'Documents & Workflows', ar: 'المستندات وسير العمل' },
  fixedAssets: { en: 'Fixed Assets', ar: 'الأصول الثابتة' },
  hr: { en: 'Human Resources', ar: 'الموارد البشرية' },
  crm: { en: 'CRM', ar: 'العملاء والموردون' },
  advancedPurchasing: { en: 'Advanced Purchasing', ar: 'مشتريات متقدمة' },
  advancedCustoms: { en: 'Advanced Customs', ar: 'جمارك متقدمة' },
  costsPricing: { en: 'Costs & Pricing', ar: 'التكاليف والتسعير' },
  compliance: { en: 'Compliance', ar: 'الامتثال' },
  hrLinked: { en: 'HR (Linked)', ar: 'الموارد البشرية (مرتبط)' },
  security: { en: 'Security & Permissions', ar: 'الأمان والصلاحيات' },
  systemSettings: { en: 'System Settings', ar: 'إعدادات النظام' },
  notifications: { en: 'Notifications', ar: 'الإشعارات' },
  advancedWarehouses: { en: 'Advanced Warehouses', ar: 'مستودعات متقدمة' },
  projects: { en: 'Projects', ar: 'المشاريع' },
  quality: { en: 'Quality', ar: 'الجودة' },
  risks: { en: 'Risks', ar: 'المخاطر' },
  reportsAnalytics: { en: 'Reports & Analytics', ar: 'التقارير والتحليلات' },
  integrations: { en: 'Integrations', ar: 'التكاملات' },
};

const SPECIAL_LABELS: Record<string, { en: string; ar: string }> = {
  rolesPermissions: { en: 'Roles & Permissions', ar: 'الأدوار والصلاحيات' },
  permissionMatrix: { en: 'Permission Matrix', ar: 'مصفوفة الصلاحيات' },
  smsWhatsappSettings: { en: 'SMS & WhatsApp Settings', ar: 'إعدادات الرسائل وواتساب' },
  zatcaIntegration: { en: 'ZATCA Integration', ar: 'تكامل هيئة الزكاة والضريبة والجمارك' },
};

function computeLabel(locale: Locale, labelKey: string): string {
  // labelKey is like: menu.generalAdmin.chartOfAccounts
  const afterMenu = labelKey.startsWith('menu.') ? labelKey.slice('menu.'.length) : labelKey;
  const parts = afterMenu.split('.');

  if (parts.length === 1) {
    const group = GROUP_LABELS[parts[0]];
    if (group) return group[locale];
  }

  const leaf = parts[parts.length - 1];

  const special = SPECIAL_LABELS[leaf];
  if (special) return special[locale];

  const fromErp = findValueByLeafKey((erpTranslations as any)[locale], leaf);
  if (fromErp) return fromErp;

  // Best-effort fallback: English label, Arabic falls back to English if not found.
  const englishFallback = humanizeIdentifier(leaf);
  if (locale === 'ar') {
    return englishFallback;
  }
  return englishFallback;
}

function ensureMenuObject(root: AnyObject): AnyObject {
  if (!root.menu || typeof root.menu !== 'object') {
    root.menu = {};
  }
  return root.menu as AnyObject;
}

function setMenuFlattenedTranslation(root: AnyObject, labelKey: string, value: string): void {
  const menu = ensureMenuObject(root);

  if (!labelKey.startsWith('menu.')) return;

  const afterMenu = labelKey.slice('menu.'.length);
  const parts = afterMenu.split('.');

  if (parts.length === 1) {
    menu[parts[0]] = value;
    return;
  }

  // flattened style under `menu`
  menu[afterMenu] = value;
}

function run(): void {
  const repoRoot = path.join(__dirname, '..');
  const enPath = path.join(repoRoot, 'locales', 'en.json');
  const arPath = path.join(repoRoot, 'locales', 'ar.json');

  const en = readJson(enPath);
  const ar = readJson(arPath);

  const labelKeys = extractLabelKeys(MENU_REGISTRY);

  const missingEn = labelKeys.filter((k) => !hasKey(en, k));
  const missingAr = labelKeys.filter((k) => !hasKey(ar, k));

  for (const key of missingEn) {
    setMenuFlattenedTranslation(en, key, computeLabel('en', key));
  }

  for (const key of missingAr) {
    setMenuFlattenedTranslation(ar, key, computeLabel('ar', key));
  }

  writeJson(enPath, en);
  writeJson(arPath, ar);

  console.log(`✅ Added missing menu translations:`);
  console.log(`   - en: ${missingEn.length}`);
  console.log(`   - ar: ${missingAr.length}`);
}

run();
