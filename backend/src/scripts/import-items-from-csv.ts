import fs from 'fs';
import path from 'path';
import pool from '../db';

type CsvRow = Record<string, string>;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function stripBom(value: string): string {
  return value.replace(/^\uFEFF/, '');
}

function readTextFileAutoEncoding(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  if (buf.length >= 2) {
    // UTF-16 LE BOM
    if (buf[0] === 0xff && buf[1] === 0xfe) {
      return buf.toString('utf16le');
    }
    // UTF-16 BE BOM
    if (buf[0] === 0xfe && buf[1] === 0xff) {
      // Convert BE -> LE by swapping pairs
      const swapped = Buffer.allocUnsafe(buf.length - 2);
      for (let i = 2; i < buf.length; i += 2) {
        swapped[i - 2] = buf[i + 1] ?? 0;
        swapped[i - 1] = buf[i] ?? 0;
      }
      return swapped.toString('utf16le');
    }
  }
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    // UTF-8 BOM
    return buf.toString('utf8');
  }

  // Heuristic: many Excel Arabic CSV exports are UTF-16 without BOM
  const utf8 = buf.toString('utf8');
  if (utf8.includes('\u0000')) {
    return buf.toString('utf16le');
  }

  return utf8;
}

function normalizeArabic(value: string): string {
  // Normalize Arabic text for robust matching (tashkeel/tatweel/punctuation + common letter variants)
  const withoutDiacritics = value
    .replace(/[\u064B-\u065F\u0670]/g, '') // harakat + dagger alif
    .replace(/\u0640/g, '') // tatweel
    .replace(/[\u200E\u200F\u202A-\u202E]/g, '') // BiDi control marks
    .replace(/[\u061F\u060C\u061B،؛؟]/g, ' ') // punctuation
    .replace(/[()\[\]{}<>"'“”‘’]/g, ' ')
    .replace(/[.،,:;!؟\-_/\\]/g, ' ');

  const normalizedLetters = withoutDiacritics
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه');

  return normalizeWhitespace(normalizedLetters);
}

function tokenizeArabic(value: string): string[] {
  const norm = normalizeArabic(value);
  return norm
    .split(' ')
    .map(t => t.trim())
    .filter(t => t.length >= 2);
}

function guessUomCodeFromName(itemName: string): string {
  const n = normalizeArabic(itemName);

  // Prefer explicit packaging words
  if (/(كرتون|كرتونه|كرتن|ctn|carton)/i.test(n)) return 'CTN24';
  if (/(علبه|علبة|box)/i.test(n)) return 'BOX10';
  if (/(باك|pack|pk)/i.test(n)) return 'PK12';
  if (/(دسته|دستة|doz)/i.test(n)) return 'DOZ';
  if (/(كيس|bag)/i.test(n)) return 'BAG50';

  // Weight
  if (/(كيلو|كيلوجرام|كجم|kg)/i.test(n)) return 'KG';
  if (/(جرام|غم|g)/i.test(n)) return 'G';
  if (/(طن|ton)/i.test(n)) return 'TON';

  // Volume
  if (/(لتر|lt|liter|l\b)/i.test(n)) return 'L';
  if (/(مل|مليلتر|ml)/i.test(n)) return 'ML';
  if (/(جالون|gallon|gal)/i.test(n)) return 'GAL';

  // Default
  return 'PCS';
}

function normalizeUnitRawToUomCode(unitRaw: string): string {
  const raw = normalizeArabic(unitRaw);
  if (!raw) return '';

  // Sometimes sheets have stray values like "1"
  if (/^\d+$/.test(raw)) return 'PCS';

  // Weight/volume embedded formats (e.g., "500جم", "5ك", "10كغ", "LT10")
  if (/(جم)/.test(raw)) return 'G';
  if (/(كغ|كجم)/.test(raw)) return 'KG';
  if (/(\bك\b|\*\s*\d+\s*ك)/.test(raw)) return 'KG';
  if (/(lt\d+|lt)/.test(raw)) return 'L';
  if (/(مل)/.test(raw)) return 'ML';

  // Common Arabic unit names from Excel sheets
  if (/(حبه|حبة|قطعه|قطعة|وحده|وحدة)/.test(raw)) return 'PCS';
  if (/(كيلو|كيلوجرام|كجم)/.test(raw)) return 'KG';
  if (/(جرام|غم)/.test(raw)) return 'G';
  if (/(طن)/.test(raw)) return 'TON';
  if (/(لتر)/.test(raw)) return 'L';
  if (/(مل|مليلتر|ملليلتر)/.test(raw)) return 'ML';

  // Packaging words sometimes appear as a unit
  // Map to PCS by default (packaging is usually an item unit, not a weight unit)
  if (/(علبه|علبة|باكت|باك|صندوق|كرتون|كرتونه|كرتن|كيس|ضرف|ظرف|ربطة|درزان)/.test(raw)) return 'PCS';

  return '';
}

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {};
  for (let i = 2; i < argv.length; i += 1) {
    const part = argv[i];
    if (!part) continue;
    if (part === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    if (part === '--all-companies') {
      args.allCompanies = true;
      continue;
    }
    if (part.startsWith('--')) {
      const key = part.slice(2);
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) {
        args[key] = 'true';
      } else {
        args[key] = value;
        i += 1;
      }
    }
  }
  return args;
}

function detectDelimiter(headerLine: string): string {
  const comma = (headerLine.match(/,/g) || []).length;
  const semi = (headerLine.match(/;/g) || []).length;
  const tab = (headerLine.match(/\t/g) || []).length;
  if (tab >= comma && tab >= semi && tab > 0) return '\t';
  if (semi >= comma && semi > 0) return ';';
  return ',';
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && ch === delimiter) {
      out.push(current);
      current = '';
      continue;
    }

    current += ch;
  }

  out.push(current);
  return out;
}

function parseCsv(content: string): CsvRow[] {
  const lines = content
    .split(/\r?\n/)
    .map(l => l.trimEnd())
    .filter(l => l.length > 0);

  if (lines.length === 0) return [];

  // Excel exports sometimes start with empty delimiter-only lines like ",," or ";;".
  // Find the first line that looks like a real header.
  let headerLineIndex = 0;
  while (headerLineIndex < lines.length) {
    const candidate = stripBom(lines[headerLineIndex]);
    // If line is only delimiters/whitespace, skip
    if (/^[\s,;\t]+$/.test(candidate)) {
      headerLineIndex += 1;
      continue;
    }

    // If the line contains at least 2 fields and at least 1 non-empty header label, accept
    const d = detectDelimiter(candidate);
    const parts = splitCsvLine(candidate, d).map(p => normalizeWhitespace(p));
    const nonEmpty = parts.filter(p => p.length > 0);
    if (parts.length >= 2 && nonEmpty.length >= 1) break;

    headerLineIndex += 1;
  }

  if (headerLineIndex >= lines.length) return [];

  const headerLine = stripBom(lines[headerLineIndex]);
  const delimiter = detectDelimiter(headerLine);
  const rawHeaders = splitCsvLine(headerLine, delimiter).map(h => normalizeWhitespace(h));
  const headers = rawHeaders.map(h => stripBom(h));

  const rows: CsvRow[] = [];
  for (let i = headerLineIndex + 1; i < lines.length; i += 1) {
    const values = splitCsvLine(lines[i], delimiter);
    const row: CsvRow = {};
    for (let c = 0; c < headers.length; c += 1) {
      const key = headers[c] ?? `col_${c}`;
      row[key] = (values[c] ?? '').trim();
    }
    rows.push(row);
  }

  return rows;
}

function pickHeader(headers: string[], candidates: string[]): string | null {
  const normalized = new Map(headers.map(h => [normalizeWhitespace(h).toLowerCase(), h] as const));
  for (const c of candidates) {
    const found = normalized.get(c.toLowerCase());
    if (found) return found;
  }

  // Fuzzy contains match (Arabic headers vary)
  const lowerHeaders = headers.map(h => ({ raw: h, lower: normalizeWhitespace(h).toLowerCase() }));
  for (const c of candidates) {
    const needle = c.toLowerCase();
    const match = lowerHeaders.find(h => h.lower.includes(needle));
    if (match) return match.raw;
  }

  return null;
}

function pickOptionalHeader(headers: string[], candidates: string[]): string | null {
  return pickHeader(headers, candidates);
}

async function getExistingColumns(tableName: string): Promise<Set<string>> {
  const res = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return new Set(res.rows.map(r => String(r.column_name)));
}

async function tableExists(tableName: string): Promise<boolean> {
  const res = await pool.query(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1
     LIMIT 1`,
    [tableName]
  );
  return res.rowCount > 0;
}

type UomSource = {
  tableName: 'uom' | 'units_of_measure';
  idByCode: Map<string, number>;
  defaultId: number;
};

type ItemGroupRow = {
  id: number;
  code: string;
  groupType: string;
  nameAr: string;
  norm: string;
  tokens: string[];
};

type AutoGroup = {
  code: string;
  nameEn: string;
  nameAr: string;
  sortOrder: number;
};

function buildAutoGroups(): { root: AutoGroup; children: AutoGroup[] } {
  // Keep codes <= 20 chars (item_groups.code is commonly VARCHAR(20))
  const root: AutoGroup = { code: 'AUTO', nameEn: 'Auto Groups', nameAr: 'مجموعات تلقائية', sortOrder: 900 };
  const children: AutoGroup[] = [
    { code: 'AUTO-FOOD', nameEn: 'Food (General)', nameAr: 'مواد غذائية (عام)', sortOrder: 901 },
    { code: 'AUTO-NUTS', nameEn: 'Nuts & Seeds', nameAr: 'مكسرات وبذور', sortOrder: 902 },
    { code: 'AUTO-COF', nameEn: 'Coffee & Tea', nameAr: 'قهوة وشاي', sortOrder: 903 },
    { code: 'AUTO-SPICE', nameEn: 'Spices', nameAr: 'بهارات وتوابل', sortOrder: 904 },
    { code: 'AUTO-SWEET', nameEn: 'Sweets', nameAr: 'حلويات وشوكولاتة', sortOrder: 905 },
    { code: 'AUTO-DRY', nameEn: 'Dry Goods', nameAr: 'مواد جافة (رز/سكر/طحين)', sortOrder: 906 },
    { code: 'AUTO-DAIRY', nameEn: 'Dairy', nameAr: 'ألبان وأجبان', sortOrder: 907 },
    { code: 'AUTO-CAN', nameEn: 'Canned & Preserved', nameAr: 'معلبات ومحفوظات', sortOrder: 908 },
    { code: 'AUTO-BEV', nameEn: 'Beverages', nameAr: 'مشروبات', sortOrder: 909 },
    { code: 'AUTO-PACK', nameEn: 'Packaging & Disposables', nameAr: 'تعبئة وأدوات استخدام مرة', sortOrder: 910 },
    { code: 'AUTO-CLEAN', nameEn: 'Cleaning', nameAr: 'منظفات', sortOrder: 911 },
    { code: 'AUTO-PAPER', nameEn: 'Paper Products', nameAr: 'ورقيات', sortOrder: 912 },
    { code: 'AUTO-STAT', nameEn: 'Stationery', nameAr: 'قرطاسية', sortOrder: 913 },
    { code: 'AUTO-OTHER', nameEn: 'Other', nameAr: 'أخرى', sortOrder: 999 },
  ];
  return { root, children };
}

function pickAutoGroupCode(itemName: string): string {
  const n = normalizeArabic(itemName);

  // Nuts & seeds
  if (/(لوز|كاجو|فستق|صنوبر|عين\s*جمل|جوز|بندق|فول\s*سوداني|سمسم|بذر|بذور|قرع|دوار)/.test(n)) return 'AUTO-NUTS';

  // Coffee & tea
  if (/(قهوه|قهوة|بن|شاي|هيرري|هرري)/.test(n)) return 'AUTO-COF';

  // Spices
  if (/(هيل|زنجبيل|قرفه|قرفة|كمون|كركم|فلفل|بهار|بهارات|قرنفل|يانسون|حبه\s*سوداء|حبة\s*سوداء|سمّاق|سماق)/.test(n)) return 'AUTO-SPICE';

  // Sweets
  if (/(حلويات|كيك|بسكويت|شوكولات|شوكولاته|شكولاته|حلا|كوكيز|ويفر)/.test(n)) return 'AUTO-SWEET';

  // Dry goods
  if (/(رز|ارز|سكر|طحين|دقيق|معكرونه|مكرونه|مكرونة|شعيريه|شعيرية|عدس|فاصوليا|فول|حمص|برغل|قمح|شوفان)/.test(n)) return 'AUTO-DRY';

  // Dairy
  if (/(حليب|لبن|زبادي|زبادي|جبن|اجبان|أجبان|قشطه|قشطة|زبدة|سمن)/.test(n)) return 'AUTO-DAIRY';

  // Canned
  if (/(معلبات|علب|تونه|تونة|سردين|فاصوليا\s*معلبه|فول\s*معلب|صلصه|صلصة|مربى|مربي|مخلل|مخللات)/.test(n)) return 'AUTO-CAN';

  // Beverages
  if (/(ماء|موية|عصير|مشروب|مشروبات|شاي\s*مثلج|قهوه\s*بارده|قهوة\s*باردة)/.test(n)) return 'AUTO-BEV';

  // Cleaning
  if (/(منظف|منظفات|صابون|شامبو|مطهر|مطهرات|كلور|معقم|معقمات|سائل\s*جلي|جلي)/.test(n)) return 'AUTO-CLEAN';

  // Paper
  if (/(مناديل|منديل|ورق|محارم|كلينكس|مناديل\s*مطبخ|ورق\s*مطبخ)/.test(n)) return 'AUTO-PAPER';

  // Packaging & disposables
  if (/(كرتون|علبه|علبة|باك|باكت|صندوق|كيس|كاسات|كاس|اكواب|أكواب|ملاعق|شوكة|شوك|صحون|اطباق|أطباق|سكاكين|سكاكين|نايلون|اكياس|أكياس)/.test(n)) return 'AUTO-PACK';

  // Stationery
  if (/(دفتر|اقلام|أقلام|قلم|ممحاه|ممحاة|مسطره|مسطرة|شنطه\s*مدرسية|حقيبة|كراريس|كراس|قرطاسية)/.test(n)) return 'AUTO-STAT';

  // General food fallback
  if (/(بهارات|شاي|قهوة|رز|سكر|طحين|دقيق|زيت|سمن|جبن|حليب|معلبات|بسكويت|شوكولات)/.test(n)) return 'AUTO-FOOD';

  return 'AUTO-OTHER';
}

async function ensureAutoGroupsForCompany(companyId: number): Promise<Map<string, number>> {
  const cols = await getExistingColumns('item_groups');
  const hasNameAr = cols.has('name_ar');
  const hasNameEn = cols.has('name_en');
  const hasGroupType = cols.has('group_type');
  const hasParentGroupId = cols.has('parent_group_id');
  const hasSortOrder = cols.has('sort_order');
  const hasIsActive = cols.has('is_active');
  const hasDeletedAt = cols.has('deleted_at');

  const { root, children } = buildAutoGroups();

  const insertGroup = async (g: AutoGroup, parentId: number | null) => {
    const columns: string[] = ['company_id', 'code', 'name'];
    const values: unknown[] = [companyId, g.code, g.nameEn];
    const placeholders: string[] = ['$1', '$2', '$3'];
    let param = 4;

    if (hasNameEn) {
      columns.push('name_en');
      values.push(g.nameEn);
      placeholders.push(`$${param++}`);
    }
    if (hasNameAr) {
      columns.push('name_ar');
      values.push(g.nameAr);
      placeholders.push(`$${param++}`);
    }
    if (hasParentGroupId) {
      columns.push('parent_group_id');
      values.push(parentId);
      placeholders.push(`$${param++}`);
    }
    if (hasGroupType) {
      columns.push('group_type');
      values.push(parentId ? 'sub' : 'main');
      placeholders.push(`$${param++}`);
    }
    if (hasSortOrder) {
      columns.push('sort_order');
      values.push(g.sortOrder);
      placeholders.push(`$${param++}`);
    }
    if (hasIsActive) {
      columns.push('is_active');
      values.push(true);
      placeholders.push(`$${param++}`);
    }

    const updates: string[] = ['name = EXCLUDED.name'];
    if (hasNameEn) updates.push('name_en = EXCLUDED.name_en');
    if (hasNameAr) updates.push('name_ar = EXCLUDED.name_ar');
    if (hasParentGroupId) updates.push('parent_group_id = EXCLUDED.parent_group_id');
    if (hasGroupType) updates.push('group_type = EXCLUDED.group_type');
    if (hasSortOrder) updates.push('sort_order = EXCLUDED.sort_order');
    if (hasIsActive) updates.push('is_active = EXCLUDED.is_active');
    if (hasDeletedAt) updates.push('deleted_at = NULL');

    await pool.query(
      `INSERT INTO item_groups (${columns.join(', ')})
       VALUES (${placeholders.join(', ')})
       ON CONFLICT (company_id, code)
       DO UPDATE SET ${updates.join(', ')}`,
      values
    );
  };

  // Upsert root first
  await insertGroup(root, null);

  // Resolve root id
  const where = hasDeletedAt ? 'AND deleted_at IS NULL' : '';
  const rootIdRes = await pool.query(
    `SELECT id FROM item_groups WHERE company_id = $1 AND code = $2 ${where} LIMIT 1`,
    [companyId, root.code]
  );
  const rootId = Number(rootIdRes.rows[0]?.id);
  if (!Number.isFinite(rootId)) {
    throw new Error('Failed to resolve AUTO group id after upsert.');
  }

  for (const child of children) {
    await insertGroup(child, rootId);
  }

  const allCodes = [root.code, ...children.map(c => c.code)];
  const idsRes = await pool.query(
    `SELECT id, code FROM item_groups WHERE company_id = $1 AND code = ANY($2::text[]) ${where}`,
    [companyId, allCodes]
  );
  const idByCode = new Map<string, number>();
  for (const r of idsRes.rows) {
    idByCode.set(String(r.code), Number(r.id));
  }
  return idByCode;
}

async function ensureCoreUomsInUomTable() {
  // Minimal seeds needed for import (safe if already exists)
  await pool.query(
    `INSERT INTO uom (code, name, name_ar, uom_type, is_base, is_active)
     VALUES
       ('PCS', 'Piece', 'قطعة', 'unit', TRUE, TRUE),
       ('KG',  'Kilogram', 'كيلوجرام', 'weight', TRUE, TRUE),
       ('G',   'Gram', 'جرام', 'weight', FALSE, TRUE),
       ('L',   'Liter', 'لتر', 'volume', TRUE, TRUE),
       ('ML',  'Milliliter', 'ملليلتر', 'volume', FALSE, TRUE),
       ('TON', 'Metric Ton', 'طن', 'weight', FALSE, TRUE),
       ('BOX10', 'Box (10 pcs)', 'علبة (10 قطع)', 'unit', FALSE, TRUE),
       ('CTN24', 'Carton (24 pcs)', 'كرتون (24 قطعة)', 'unit', FALSE, TRUE)
     ON CONFLICT (code) DO NOTHING;`
  );
}

async function loadUomSourceFromTable(tableName: 'uom' | 'units_of_measure'): Promise<UomSource> {
  const cols = await getExistingColumns(tableName);
  const hasDeletedAt = cols.has('deleted_at');

  if (tableName === 'uom') {
    await ensureCoreUomsInUomTable();
  }

  const where = hasDeletedAt ? 'WHERE deleted_at IS NULL' : '';
  const res = await pool.query(`SELECT id, code FROM ${tableName} ${where}`);
  const idByCode = new Map<string, number>();
  for (const r of res.rows) {
    const code = String(r.code ?? '').toUpperCase();
    const id = Number(r.id);
    if (code && Number.isFinite(id)) idByCode.set(code, id);
  }

  const defaultId = idByCode.get('PCS');
  if (!defaultId) {
    throw new Error(`Could not find default unit 'PCS' in ${tableName}.`);
  }

  return { tableName, idByCode, defaultId };
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const fileArg = (args.file || args.path) as string | undefined;
  const dryRun = Boolean(args.dryRun);
  const allCompanies = Boolean(args.allCompanies);
  const companyIdArg = (args['company-id'] || args.companyId) as string | undefined;
  const reportFileArg = (args['report-file'] || args.reportFile) as string | undefined;
  const sampleUnmatchedArg = (args['sample-unmatched'] || args.sampleUnmatched) as string | undefined;
  const sampleUnmatched = Math.max(0, Math.min(50, Number(sampleUnmatchedArg ?? '20') || 20));

  if (!fileArg) {
    throw new Error(
      "Missing required argument. Usage: npm run items:import -- --file <path-to-csv> --company-id <id> [--dry-run]\n" +
        "Or: npm run items:import -- --file <path-to-csv> --all-companies [--dry-run]"
    );
  }

  const fullPath = path.resolve(process.cwd(), fileArg);
  if (!fs.existsSync(fullPath)) {
    const dataDir = path.resolve(process.cwd(), 'data');
    let hint = '';
    if (fs.existsSync(dataDir)) {
      const files = fs
        .readdirSync(dataDir)
        .filter(f => f.toLowerCase().endsWith('.csv'))
        .slice(0, 20);
      if (files.length > 0) {
        hint = `\nCSV files found in ./data: ${files.join(', ')}`;
      } else {
        hint = `\nNo CSV files found in ./data.`;
      }
    } else {
      hint = `\nData folder not found: ${dataDir}`;
    }
    throw new Error(`CSV file not found: ${fullPath}${hint}`);
  }

  const csvText = readTextFileAutoEncoding(fullPath);
  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    console.log('No rows found in CSV.');
    return;
  }

  const headers = Object.keys(rows[0]);

  const codeHeader = pickHeader(headers, [
    'رقم الصنف',
    'كود الصنف',
    'كود',
    'رمز الصنف',
    'code',
    'item code',
    'item_code',
    'sku',
  ]);

  const nameHeader = pickHeader(headers, [
    'اسم الصنف',
    'اسم الصف',
    'اسم',
    'الصنف',
    'name',
    'item name',
    'item_name',
    'description',
  ]);

  const unitHeader = pickOptionalHeader(headers, [
    'الوحدة',
    'وحدة',
    'unit',
    'uom',
    'uom_code',
    'unit code',
    'unit_code',
  ]);

  if (!codeHeader || !nameHeader) {
    throw new Error(
      `Could not detect required headers. Found headers: ${headers.join(' | ')}\n` +
        `Detected codeHeader=${codeHeader ?? 'null'} nameHeader=${nameHeader ?? 'null'}`
    );
  }

  const items = rows
    .map(r => ({
      code: normalizeWhitespace(String(r[codeHeader] ?? '')),
      name: normalizeWhitespace(String(r[nameHeader] ?? '')),
      unitRaw: unitHeader ? normalizeWhitespace(String(r[unitHeader] ?? '')) : '',
    }))
    .filter(r => r.code.length > 0 && r.name.length > 0);

  // De-duplicate by item code within the input file.
  // PostgreSQL cannot handle multiple rows with the same conflict key in a single INSERT .. ON CONFLICT statement.
  const byCode = new Map<string, { code: string; name: string; unitRaw: string }>();
  let duplicateCodes = 0;
  for (const it of items) {
    if (byCode.has(it.code)) duplicateCodes += 1;
    byCode.set(it.code, it); // keep last occurrence
  }
  const uniqueItems = Array.from(byCode.values());

  if (uniqueItems.length === 0) {
    throw new Error('No usable items after parsing (missing code/name).');
  }

  const existingColumns = await getExistingColumns('items');
  const hasDeletedAt = existingColumns.has('deleted_at');

  // Determine which UOM tables exist in this database.
  // Some environments have legacy `uom` (018) and not the renamed `units_of_measure` (032).
  const hasUomTable = await tableExists('uom');
  const hasUnitsOfMeasureTable = await tableExists('units_of_measure');

  // Load mappings independently so we can fill both sets of item unit columns if present.
  const legacyUom = hasUomTable ? await loadUomSourceFromTable('uom') : null;
  const modernUom = hasUnitsOfMeasureTable ? await loadUomSourceFromTable('units_of_measure') : null;

  if (!legacyUom && !modernUom) {
    throw new Error(
      'No unit table found. Expected `uom` or `units_of_measure` to exist. Please run migrations.'
    );
  }

  const companiesRes = await pool.query(`SELECT id FROM companies ORDER BY id`);
  const allCompanyIds = companiesRes.rows.map(r => Number(r.id)).filter(n => Number.isFinite(n));

  if (allCompanyIds.length === 0) {
    throw new Error('No companies found. Cannot import company-scoped items.');
  }

  let companyIds: number[] = [];
  if (allCompanies) {
    companyIds = allCompanyIds;
  } else if (companyIdArg) {
    const parsed = Number(companyIdArg);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Invalid --company-id value: ${companyIdArg}`);
    }
    if (!allCompanyIds.includes(parsed)) {
      throw new Error(
        `Company not found: ${parsed}. Existing company IDs: ${allCompanyIds.join(', ')}`
      );
    }
    companyIds = [parsed];
  } else {
    throw new Error(
      `Missing company target. Provide --company-id <id> or --all-companies. Existing company IDs: ${allCompanyIds.join(
        ', '
      )}`
    );
  }

  const columnOrder: string[] = [];
  const addCol = (name: string) => {
    if (existingColumns.has(name)) columnOrder.push(name);
  };

  addCol('company_id');
  addCol('code');
  addCol('name');
  addCol('name_ar');
  addCol('name_en');
  addCol('group_id');

  // Units: support both legacy and enhanced column names
  addCol('base_uom_id');
  addCol('purchase_uom_id');
  addCol('sales_uom_id');
  addCol('base_unit_id');
  addCol('purchase_unit_id');
  addCol('sales_unit_id');

  // Classification flags (support both spellings)
  addCol('item_type');
  addCol('track_inventory');
  addCol('is_purchasable');
  addCol('is_sellable');
  addCol('is_saleable');
  addCol('is_stockable');
  addCol('is_active');

  const updatableColumns = columnOrder
    .filter(c => c !== 'company_id' && c !== 'code')
    .filter(c => c !== '');

  const updateSet = updatableColumns
    .map(c => `${c} = EXCLUDED.${c}`)
    .concat(hasDeletedAt ? ['deleted_at = NULL'] : [])
    .join(', ');

  let totalInsertedOrUpdated = 0;
  let totalMatched = 0;
  const report: {
    sourceFile: string;
    companyIds: number[];
    parsedRows: number;
    dedupedRows: number;
    duplicateCodes: number;
    headers: string[];
    detected: { codeHeader: string; nameHeader: string; unitHeader: string | null };
    perCompany: Array<{
      companyId: number;
      rows: number;
      matchedGroups: number;
      unmatchedGroups: number;
      uomHistogram: Record<string, number>;
      sampleUnmatched: Array<{ code: string; name: string }>;
    }>;
  } = {
    sourceFile: fullPath,
    companyIds,
    parsedRows: items.length,
    dedupedRows: uniqueItems.length,
    duplicateCodes,
    headers,
    detected: {
      codeHeader,
      nameHeader,
      unitHeader: unitHeader ?? null,
    },
    perCompany: [],
  };

  for (const companyId of companyIds) {
    // Ensure a small, consistent set of fallback groups exists.
    const autoGroupIds = await ensureAutoGroupsForCompany(companyId);
    // Fetch groups for this company.
    // Schema varies across environments: `group_type`/`parent_group_id` may not exist.
    const itemGroupCols = await getExistingColumns('item_groups');
    const hasGroupType = itemGroupCols.has('group_type');
    const hasParentGroupId = itemGroupCols.has('parent_group_id');
    const hasItemGroupsDeletedAt = itemGroupCols.has('deleted_at');

    const groupsSql = `
      SELECT
        id,
        code,
        name,
        ${itemGroupCols.has('name_en') ? 'name_en' : 'NULL::text AS name_en'},
        name_ar,
        ${hasGroupType ? 'group_type' : 'NULL::text AS group_type'},
        ${hasParentGroupId ? 'parent_group_id' : 'NULL::int AS parent_group_id'}
      FROM item_groups
      WHERE company_id = $1 ${hasItemGroupsDeletedAt ? 'AND deleted_at IS NULL' : ''}
    `;

    const groupsRes = await pool.query(groupsSql, [companyId]);

    const groups = groupsRes.rows
      .map(r => {
        const nameAr = String(r.name_ar ?? '').trim();
        const name = String(r.name ?? '').trim();
        const nameEn = String(r.name_en ?? '').trim();

        const labels = [nameAr, name, nameEn].filter(Boolean);
        const primary = labels[0] ?? '';

        const norm = normalizeArabic(primary);
        const tokens = Array.from(new Set(labels.flatMap(tokenizeArabic)));

        const explicitType = String(r.group_type ?? '').trim();
        const inferredType = r.parent_group_id ? 'sub' : 'main';
        const groupType = explicitType || (hasParentGroupId ? inferredType : '');

        return {
          id: Number(r.id),
          code: String(r.code),
          groupType,
          nameAr: nameAr || name || nameEn,
          norm,
          tokens,
        } as ItemGroupRow;
      })
      .filter(g => g.norm.length >= 3)
      .sort((a, b) => b.norm.length - a.norm.length);

    const findGroupByHint = (hint: string, preferNonMain: boolean): number | null => {
      const h = normalizeArabic(hint);
      if (!h) return null;

      let best: { id: number; score: number } | null = null;
      for (const g of groups) {
        if (preferNonMain && g.groupType === 'main') continue;
        if (!g.norm.includes(h)) continue;
        // prefer more specific group names
        const s = g.norm.length;
        if (!best || s > best.score) best = { id: g.id, score: s };
      }
      if (best) return best.id;

      // fallback: allow main
      if (preferNonMain) return findGroupByHint(hint, false);
      return null;
    };

    const scoreGroupMatch = (itemName: string, g: (typeof groups)[number]): number => {
      const normItem = normalizeArabic(itemName);
      if (!normItem || g.tokens.length === 0) return 0;

      // Exact-ish phrase match (strong signal)
      const phraseHit = normItem.includes(g.norm) ? 1 : 0;

      // Token match ratio (robust against extra words like brand/size)
      let tokenHits = 0;
      for (const t of g.tokens) {
        if (t.length < 2) continue;
        if (normItem.includes(t)) tokenHits += 1;
      }
      const ratio = tokenHits / Math.max(1, g.tokens.length);

      // Prefer more specific groups
      const specificity = Math.min(1, g.norm.length / 30);
      const typeBoost = g.groupType === 'main' ? 0 : 0.15;

      return phraseHit * 0.8 + ratio * 0.7 + specificity * 0.2 + typeBoost;
    };

    const findGroupId = (itemName: string): number | null => {
      // 0) Domain keyword hints (cases where the item name doesn't contain the group label)
      const normItem = normalizeArabic(itemName);
      const hintRules: Array<{ test: RegExp; hints: string[] }> = [
        // Nuts & seeds
        { test: /(لوز|كاجو|فستق|صنوبر|عين\s*جمل|جوز|بندق|فول\s*سوداني|سمسم|بذر|بذور|قرع|دوار)/, hints: ['مكسرات', 'بذور'] },
        // Coffee / tea
        { test: /(قهوه|قهوة|بن|شاي)/, hints: ['قهوة', 'شاي'] },
        // Sweets
        { test: /(حلويات|كيك|بسكويت|شوكولات|شوكولاته|شكولاته|حلا)/, hints: ['حلويات', 'شوكولاتة'] },
        // Spices
        { test: /(هيل|زنجبيل|قرفه|قرفة|كمون|كركم|فلفل|بهار|بهارات|قرنفل)/, hints: ['بهارات'] },
      ];

      for (const rule of hintRules) {
        if (rule.test.test(normItem)) {
          for (const hint of rule.hints) {
            const hit = findGroupByHint(hint, true);
            if (hit) return hit;
          }
        }
      }

      let best: { id: number; score: number } | null = null;

      // 1) Prefer non-main groups first
      for (const g of groups) {
        if (g.groupType === 'main') continue;
        const s = scoreGroupMatch(itemName, g);
        if (!best || s > best.score) best = { id: g.id, score: s };
      }

      // If score is weak, try main groups
      if (!best || best.score < 0.65) {
        for (const g of groups) {
          if (g.groupType !== 'main') continue;
          const s = scoreGroupMatch(itemName, g);
          if (!best || s > best.score) best = { id: g.id, score: s };
        }
      }

      if (!best || best.score < 0.6) return null;
      return best.id;
    };

    const resolveUomIdFor = (preferred: 'legacy' | 'modern', itemName: string, unitRaw: string): number => {
      const raw = normalizeWhitespace(unitRaw).toUpperCase();
      const mappedFromArabic = normalizeUnitRawToUomCode(unitRaw).toUpperCase();
      const guessedCode = guessUomCodeFromName(itemName).toUpperCase();

      const resolveFrom = (src: UomSource | null): number | null => {
        if (!src) return null;
        if (raw) {
          const direct = src.idByCode.get(raw);
          if (direct) return direct;
        }
        if (mappedFromArabic) {
          const mapped = src.idByCode.get(mappedFromArabic);
          if (mapped) return mapped;
        }
        return src.idByCode.get(guessedCode) ?? src.defaultId;
      };

      if (preferred === 'legacy') {
        return resolveFrom(legacyUom) ?? resolveFrom(modernUom)!;
      }
      return resolveFrom(modernUom) ?? resolveFrom(legacyUom)!;
    };

    let matchedForCompany = 0;
    const unmatchedSamples: Array<{ code: string; name: string }> = [];
    const uomHistogram: Record<string, number> = {};

    const prepared = uniqueItems.map(it => {
      let groupId = findGroupId(it.name);
      if (groupId) {
        totalMatched += 1;
        matchedForCompany += 1;
      } else if (unmatchedSamples.length < sampleUnmatched) {
        unmatchedSamples.push({ code: it.code, name: it.name });
      }

      // If still unmatched, assign to a small, consistent auto group.
      if (!groupId) {
        const autoCode = pickAutoGroupCode(it.name);
        groupId = autoGroupIds.get(autoCode) ?? autoGroupIds.get('AUTO-OTHER') ?? null;
      }

      const uomIdLegacy = resolveUomIdFor('legacy', it.name, it.unitRaw);
      const uomIdModern = resolveUomIdFor('modern', it.name, it.unitRaw);
      // Best-effort uom code tracking
      const guessedCode = guessUomCodeFromName(it.name).toUpperCase();
      const histKey = it.unitRaw ? normalizeWhitespace(it.unitRaw).toUpperCase() : guessedCode;
      uomHistogram[histKey] = (uomHistogram[histKey] ?? 0) + 1;

      const record: Record<string, unknown> = {
        company_id: companyId,
        code: it.code,
        name: it.name,
        name_ar: it.name,
        name_en: it.name,
        group_id: groupId,
        // Fill both legacy + modern unit columns safely (many DBs have only one set)
        base_uom_id: uomIdLegacy,
        purchase_uom_id: uomIdLegacy,
        sales_uom_id: uomIdLegacy,
        base_unit_id: uomIdModern,
        purchase_unit_id: uomIdModern,
        sales_unit_id: uomIdModern,
        item_type: 'trading_goods',
        track_inventory: true,
        is_purchasable: true,
        is_sellable: true,
        is_saleable: true,
        is_stockable: true,
        is_active: true,
      };

      // Only keep columns that actually exist
      const filtered: Record<string, unknown> = {};
      for (const col of columnOrder) filtered[col] = record[col];
      return filtered;
    });

    if (dryRun) {
      const matchedFromPrepared = prepared.filter(p => p.group_id != null).length;
      console.log(
        `DRY RUN company=${companyId}: rows=${prepared.length}, matchedGroups=${matchedFromPrepared}`
      );

      report.perCompany.push({
        companyId,
        rows: prepared.length,
        matchedGroups: matchedFromPrepared,
        unmatchedGroups: prepared.length - matchedFromPrepared,
        uomHistogram,
        sampleUnmatched: unmatchedSamples,
      });
      continue;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const chunk of chunkArray(prepared, 400)) {
        const values: unknown[] = [];
        const rowsSql: string[] = [];
        let paramIndex = 1;

        for (const row of chunk) {
          const placeholders: string[] = [];
          for (const col of columnOrder) {
            values.push((row as any)[col]);
            placeholders.push(`$${paramIndex++}`);
          }
          rowsSql.push(`(${placeholders.join(', ')})`);
        }

        const sql = `
          INSERT INTO items (${columnOrder.join(', ')})
          VALUES ${rowsSql.join(',\n')}
          ON CONFLICT (company_id, code)
          DO UPDATE SET ${updateSet};
        `;

        const res = await client.query(sql, values);
        totalInsertedOrUpdated += res.rowCount;
      }

      await client.query('COMMIT');
      console.log(`Imported items for company ${companyId}: ${prepared.length} rows`);

      report.perCompany.push({
        companyId,
        rows: prepared.length,
        matchedGroups: matchedForCompany,
        unmatchedGroups: prepared.length - matchedForCompany,
        uomHistogram,
        sampleUnmatched: unmatchedSamples,
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  const reportPath = reportFileArg
    ? path.resolve(process.cwd(), reportFileArg)
    : path.resolve(process.cwd(), `data/import-items-report-company-${companyIds.join('-')}.json`);

  try {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`Report written: ${reportPath}`);
  } catch {
    // non-fatal
  }

  if (dryRun) {
    console.log(`DRY RUN done. Parsed items=${items.length}, deduped=${uniqueItems.length}, duplicateCodes=${duplicateCodes}`);
    return;
  }

  console.log(`Done. Total upserts (rowCount sum)=${totalInsertedOrUpdated}`);
  console.log(`Group matching hits (across all companies)=${totalMatched}`);
}

main().catch(err => {
  console.error('Import failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
