import fs from 'fs';
import path from 'path';

type CsvRow = Record<string, string>;

type CoaRow = {
  code: string;
  name: string;
  nameAr?: string;
  parentCode?: string;
  level?: number;
  isGroup: boolean;
  allowPosting: boolean;
  accountTypeCode: string;
  currency?: string;
  reportType?: string;
};

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {};
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const [key, maybeValue] = token.split('=');
    if (maybeValue !== undefined) {
      args[key.slice(2)] = maybeValue;
      continue;
    }
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key.slice(2)] = true;
    } else {
      args[key.slice(2)] = next;
      i++;
    }
  }
  return args;
}

function normalizeHeader(header: string) {
  return header
    .trim()
    .toLowerCase()
    .replace(/\ufeff/g, '')
    .replace(/[\s\-]+/g, '_');
}

function parseCsv(content: string, delimiter = ','): CsvRow[] {
  const rows: string[][] = [];
  let currentField = '';
  let currentRow: string[] = [];
  let inQuotes = false;

  const pushField = () => {
    currentRow.push(currentField);
    currentField = '';
  };

  const pushRow = () => {
    // ignore empty trailing row
    if (currentRow.length === 1 && currentRow[0].trim() === '') {
      currentRow = [];
      return;
    }
    rows.push(currentRow);
    currentRow = [];
  };

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];

    if (ch === '"') {
      const next = content[i + 1];
      if (inQuotes && next === '"') {
        currentField += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && ch === delimiter) {
      pushField();
      continue;
    }

    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      // handle CRLF
      if (ch === '\r' && content[i + 1] === '\n') i++;
      pushField();
      pushRow();
      continue;
    }

    currentField += ch;
  }

  // last field/row
  pushField();
  if (currentRow.length > 0) pushRow();

  if (rows.length === 0) return [];

  const headersRaw = rows[0];
  const headers = headersRaw.map(normalizeHeader);

  const dataRows = rows.slice(1);
  return dataRows
    .filter((r) => r.some((c) => c.trim() !== ''))
    .map((r) => {
      const obj: CsvRow = {};
      for (let j = 0; j < headers.length; j++) {
        obj[headers[j]] = (r[j] ?? '').trim();
      }
      return obj;
    });
}

function normalizeArabicNumber(value: string) {
  // Convert Arabic-Indic digits to Western digits if present
  const map: Record<string, string> = {
    '٠': '0',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9',
  };
  return value.replace(/[٠-٩]/g, (d) => map[d] ?? d).trim();
}

function parseBool(value: string | undefined, defaultValue: boolean) {
  if (value === undefined || value === '') return defaultValue;
  const v = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y'].includes(v)) return true;
  if (['0', 'false', 'no', 'n'].includes(v)) return false;
  return defaultValue;
}

function parseIntSafe(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(normalizeArabicNumber(value));
  return Number.isFinite(n) ? n : undefined;
}

function pick(row: CsvRow, keys: string[]) {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function isIncomeStatement(reportType: string) {
  const t = reportType.trim();
  return /الدخل|الارباح|الأرباح|الخسائر|نتائج|قائمة\s*الدخل/.test(t);
}

function inferAccountTypeCode(input: {
  code: string;
  nameAr: string;
  reportType: string;
}) {
  const code = normalizeArabicNumber(input.code);
  const nameAr = (input.nameAr || '').trim();
  const rpt = (input.reportType || '').trim();

  const isIS = isIncomeStatement(rpt);

  // Keyword-driven first (more reliable than numeric ranges)
  if (/نقد|صندوق|بنك|شيك/.test(nameAr) || /^11/.test(code)) return 'CASH';
  if (/مخزون|بضائع|مواد خام|إنتاج تحت التشغيل|منتجات تامة|مستودع/.test(nameAr) || /^13/.test(code)) return 'INVENTORY';
  if (/ذمم\s*العملاء|عملاء|مدينون|أوراق\s*قبض|قبض/.test(nameAr) || /^12/.test(code)) return 'RECEIVABLE';
  if (/ذمم\s*الموردين|موردين|دائنون|أوراق\s*دفع/.test(nameAr) || /^21/.test(code)) return 'PAYABLE';

  if (/زكاة|ضريبة|القيمة\s*المضافة|VAT/.test(nameAr)) {
    // Prefer balance-sheet classification
    if (!isIS) {
      if (/مخرجات|مستحقة/.test(nameAr) || /^22/.test(code) || /^2/.test(code)) return 'TAX_PAYABLE';
      return 'TAX_RECEIVABLE';
    }
    return 'OTHER_EXP';
  }

  if (/إهلاك\s*متراكم/.test(nameAr)) return 'ACCUM_DEPR';
  if (/مصروف\s*إهلاك|إهلاك/.test(nameAr) && isIS) return 'DEPRECIATION';

  if (/أصل\s*ثابت|أصول\s*ثابتة|مباني|أراضي|سيارات|أثاث|معدات|آلات/.test(nameAr) || /^15/.test(code)) return 'FIXED_ASSET';
  if (/مدفوعة\s*مقدماً|مقدم/.test(nameAr)) return 'PREPAID';

  if (/رأس\s*المال/.test(nameAr) || /^31/.test(code)) return 'CAPITAL';
  if (/أرباح\s*محتجزة|محتجزة|مرحلة/.test(nameAr) || /^32/.test(code)) return 'RETAINED';
  if (/احتياطي|احتياطيات/.test(nameAr)) return 'RESERVE';

  if (/مبيعات|إيراد|ايراد/.test(nameAr) || /^4/.test(code)) return 'REVENUE';
  if (/خصم|خصومات/.test(nameAr)) return 'DISCOUNT';
  if (/مردودات|مرتجعات/.test(nameAr)) return 'RETURNS';

  if (/تكلفة|تكاليف|بضاعة\s*مباعة|مجمل/.test(nameAr) || /^5/.test(code)) return 'COGS';
  if (/مصاريف\s*بيع|تسويق|عمولات|دعاية/.test(nameAr)) return 'SELLING';
  if (/مصروفات\s*إدارية|إدارية|ادارية/.test(nameAr)) return 'ADMIN';
  if (/فوائد|تمويل|تمويلية|بنكية/.test(nameAr)) return 'FINANCIAL';

  // Numeric fallback
  if (/^1/.test(code)) return 'OTHER_ASSET';
  if (/^2/.test(code)) return 'OTHER_LIAB';
  if (/^3/.test(code)) return 'CAPITAL';
  if (/^4/.test(code)) return 'REVENUE';
  if (isIS) return 'OPERATING';
  return 'OTHER_ASSET';
}

function mapRow(row: CsvRow): Omit<CoaRow, 'isGroup' | 'allowPosting'> & {
  rawType?: string;
} {
  // Arabic headers in the provided file normalize to: رقم_الحساب, اسم_الحساب, المستوى, النوع, الحساب_الرئيسي, نوع_التقرير, العملة
  const codeRaw = pick(row, ['code', 'account_code', 'رقم_الحساب']);
  const code = normalizeArabicNumber(codeRaw);

  const nameAr = pick(row, ['name_ar', 'account_name_ar', 'arabic_name', 'اسم_الحساب']);
  const nameEn = pick(row, ['name', 'name_en', 'account_name', 'اسم_الحساب_بالانجليزية', 'اسم_الحساب_انجليزي']);

  const level = parseIntSafe(pick(row, ['level', 'المستوى']));
  const parentCodeRaw = pick(row, ['parent_code', 'parent', 'parentaccount', 'الحساب_الرئيسي']);
  const parentCodeNorm = normalizeArabicNumber(parentCodeRaw);
  const parentCode = parentCodeNorm && parentCodeNorm !== '0' ? parentCodeNorm : undefined;

  const reportType = pick(row, ['report_type', 'نوع_التقرير']);
  const currency = pick(row, ['currency', 'العملة']);
  const rawType = pick(row, ['type', 'النوع']);

  const accountTypeCodeExplicit = pick(row, ['account_type_code', 'account_type', 'type_code']);
  const accountTypeCode = accountTypeCodeExplicit || inferAccountTypeCode({ code, nameAr, reportType });

  const name = nameEn || nameAr;

  if (!code) throw new Error('CSV row missing required column: code / رقم الحساب');
  if (!name) throw new Error(`CSV row for code ${code} missing required column: name (or اسم الحساب)`);
  if (!accountTypeCode) throw new Error(`CSV row for code ${code} missing account_type_code and could not infer it`);

  return {
    code,
    name,
    nameAr: nameAr || undefined,
    parentCode,
    level,
    accountTypeCode,
    currency: currency || undefined,
    reportType: reportType || undefined,
    rawType: rawType || undefined,
  };
}

function sqlEscapeLiteral(value: string) {
  return value.replace(/'/g, "''");
}

function pickBestDefaultAccountCodes(rows: CoaRow[]) {
  const keys = [
    'AR_TRADE',
    'AP_TRADE',
    'SALES',
    'PURCHASES',
    'INVENTORY',
    'VAT_INPUT',
    'VAT_OUTPUT',
    'CASH',
    'BANK',
    'FREIGHT_IN',
    'FREIGHT_OUT',
    'CUSTOMS',
    'COGS',
    'RETAINED_EARNINGS',
  ] as const;

  const scoreRow = (key: (typeof keys)[number], r: CoaRow) => {
    const name = (r.nameAr || r.name || '').trim();
    const code = r.code;
    const isLeaf = !r.isGroup;
    let score = 0;

    const isCashLike = /صندوق|نقد|نقدية|بنك|البنوك|حسابات\s*بنكية/.test(name) || r.accountTypeCode === 'CASH';
    const isVatLike = /ضريبة|القيمة\s*المضافة|vat/i.test(name);
    const isCustomsLike = /جمارك|جمرك/.test(name);
    const isFreightLike = /شحن|نقل|تنزيل/.test(name);

    if (isLeaf) score += 2;

    const add = (re: RegExp, pts: number) => {
      if (re.test(name)) score += pts;
    };

    switch (key) {
      case 'AR_TRADE':
        add(/ذمم\s*العملاء|عملاء/, 10);
        add(/مدينون|أوراق\s*قبض|قبض/, 5);
        if (/^12/.test(code)) score += 2;
        break;
      case 'AP_TRADE':
        add(/ذمم\s*الموردين|موردين/, 10);
        add(/دائنون|أوراق\s*دفع/, 5);
        if (/^21/.test(code)) score += 2;
        break;
      case 'SALES':
        add(/مبيعات|إيراد|ايراد/, 10);
        if (/^4/.test(code)) score += 2;
        break;
      case 'PURCHASES':
        add(/مشتريات/, 10);
        break;
      case 'INVENTORY':
        // Prefer actual inventory/warehouse leaf accounts (e.g. 1141010001 "المخزن الرئيسي")
        if (/^1141010001$/.test(code)) score += 80;
        add(/المخزن\s*الرئيسي/, 40);
        add(/مخزن|مخازن/, 15);
        add(/مخزون|بضائع/, 10);
        // Avoid mapping to inventory clearing/adjustment intermediates
        if (/وسيط|تسوية/.test(name)) score -= 30;
        break;
      case 'VAT_INPUT':
        // Strongly prefer explicit VAT purchases/input accounts from the provided Arabic COA
        if (/^1161020001$/.test(code)) score += 100;
        add(/ضريبة\s*القيمة\s*المضافة\s*[-–—]?\s*(مشتريات|مدخلات|مدينة)/, 40);
        add(/القيمة\s*المضافة\s*[-–—]?\s*(مشتريات|مدخلات|مدينة)/, 30);
        add(/مشتريات/, 8);
        add(/ضريبة|القيمة\s*المضافة|vat/i, 6);
        // Avoid accidentally mapping VAT to cash/bank accounts
        if (isCashLike && isVatLike) score -= 50;
        break;
      case 'VAT_OUTPUT':
        // Strongly prefer explicit VAT sales/output accounts from the provided Arabic COA
        if (/^2142010001$/.test(code)) score += 100;
        add(/ضريبة\s*القيمة\s*المضافة\s*[-–—]?\s*(مبيعات|مخرجات|مستحقة)/, 40);
        add(/القيمة\s*المضافة\s*[-–—]?\s*(مبيعات|مخرجات|مستحقة)/, 30);
        add(/مبيعات/, 8);
        add(/ضريبة|القيمة\s*المضافة|vat/i, 6);
        if (isCashLike && isVatLike) score -= 50;
        break;
      case 'CASH':
        add(/صندوق|نقدية\s*في\s*الصناديق|نقدية/, 10);
        break;
      case 'BANK':
        add(/بنك|البنوك|حسابات\s*بنكية/, 10);
        break;
      case 'FREIGHT_IN':
        // In the provided COA there is a balance-sheet account: 1151010005 "مصروفات الشحن"
        if (/^1151010005$/.test(code)) score += 80;
        add(/مصروفات\s*الشحن/, 40);
        add(/شحن/, 12);
        // Prefer balance-sheet freight-in style accounts if present
        if (r.reportType && !isIncomeStatement(r.reportType) && isFreightLike) score += 6;
        if (isCashLike && isFreightLike) score -= 25;
        break;
      case 'FREIGHT_OUT':
        // Prefer P&L freight/shipping expense accounts (e.g. "مصاريف نقل وشحن وتنزيل البضائع")
        add(/مصاريف\s*نقل\s*وشحن|نقل\s*وشحن|تنزيل\s*البضائع/, 25);
        add(/شحن|نقل|تنزيل/, 10);
        if (r.reportType && isIncomeStatement(r.reportType) && isFreightLike) score += 8;
        if (isCashLike && isFreightLike) score -= 25;
        break;
      case 'CUSTOMS':
        // In the provided COA there is a balance-sheet account: 1151010002 "الجمارك"
        if (/^1151010002$/.test(code)) score += 80;
        add(/الجمارك/, 30);
        add(/جمرك|رسوم\s*جمركية|جمارك/, 12);
        if (r.reportType && !isIncomeStatement(r.reportType) && isCustomsLike) score += 6;
        if (isCashLike && isCustomsLike) score -= 25;
        break;
      case 'COGS':
        add(/تكلفة|بضاعة\s*مباعة/, 10);
        if (/^5/.test(code)) score += 2;
        break;
      case 'RETAINED_EARNINGS':
        add(/أرباح\s*محتجزة|محتجزة|مرحلة/, 10);
        if (/^32/.test(code)) score += 2;
        break;
    }

    return score;
  };

  const best: Partial<Record<(typeof keys)[number], { code: string; score: number }>> = {};
  for (const key of keys) {
    for (const r of rows) {
      const score = scoreRow(key, r);
      if (score <= 0) continue;
      const current = best[key];
      if (!current || score > current.score) best[key] = { code: r.code, score };
    }
  }

  const result = new Map<string, string>();
  for (const key of keys) {
    const item = best[key];
    if (item?.code) result.set(key, item.code);
  }
  return result;
}

function generateSql(companyId: number, createdBy: number, rows: CoaRow[]) {
  const sorted = [...rows].sort((a, b) => {
    const la = a.level ?? 999;
    const lb = b.level ?? 999;
    if (la !== lb) return la - lb;
    return a.code.localeCompare(b.code);
  });

  const defaultCodeByKey = pickBestDefaultAccountCodes(rows);

  const sql: string[] = [];
  sql.push('-- Generated by backend/scripts/import-coa-from-csv.ts');
  sql.push(`-- company_id=${companyId}, created_by=${createdBy}`);
  sql.push('');
  sql.push('DO $$');
  sql.push('DECLARE');
  sql.push('  v_company_id INTEGER := ' + companyId + ';');
  sql.push('  v_created_by INTEGER := ' + createdBy + ';');
  sql.push('BEGIN');

  for (const r of sorted) {
    const code = sqlEscapeLiteral(r.code);
    const name = sqlEscapeLiteral(r.name);
    const nameAr = r.nameAr ? sqlEscapeLiteral(r.nameAr) : null;
    const typeCode = sqlEscapeLiteral(r.accountTypeCode);
    const isGroup = r.isGroup ? 'TRUE' : 'FALSE';
    const allowPosting = r.allowPosting ? 'TRUE' : 'FALSE';
    const level = r.level ?? 'NULL';

    const parentSelect = r.parentCode
      ? `(SELECT id FROM accounts WHERE company_id = v_company_id AND code = '${sqlEscapeLiteral(r.parentCode)}' AND deleted_at IS NULL)`
      : 'NULL';

    sql.push('  -- ' + r.code + ' ' + r.name);
    sql.push(
      '  INSERT INTO accounts (company_id, parent_id, account_type_id, code, name, name_ar, level, is_group, allow_posting, is_active, created_by)'
    );
    sql.push('  VALUES (');
    sql.push(`    v_company_id,`);
    sql.push(`    ${parentSelect},`);
    sql.push(`    (SELECT id FROM account_types WHERE code = '${typeCode}'),`);
    sql.push(`    '${code}',`);
    sql.push(`    '${name}',`);
    sql.push(`    ${nameAr === null ? 'NULL' : `'${nameAr}'`},`);
    sql.push(`    ${level},`);
    sql.push(`    ${isGroup},`);
    sql.push(`    ${allowPosting},`);
    sql.push('    TRUE,');
    sql.push('    v_created_by');
    sql.push('  )');
    sql.push('  ON CONFLICT (company_id, code) DO UPDATE SET');
    sql.push('    name = EXCLUDED.name,');
    sql.push('    name_ar = COALESCE(EXCLUDED.name_ar, accounts.name_ar),');
    sql.push('    account_type_id = COALESCE(EXCLUDED.account_type_id, accounts.account_type_id),');
    sql.push('    parent_id = COALESCE(EXCLUDED.parent_id, accounts.parent_id),');
    sql.push('    level = COALESCE(EXCLUDED.level, accounts.level),');
    sql.push('    is_group = EXCLUDED.is_group,');
    sql.push('    allow_posting = EXCLUDED.allow_posting,');
    sql.push('    updated_at = NOW();');
    sql.push('');

  }

  // Apply best-effort default account mappings based on the imported COA
  if (defaultCodeByKey.size > 0) {
    sql.push('  -- Default account mappings (auto-inferred from Arabic names/codes)');
    for (const [key, codeVal] of defaultCodeByKey.entries()) {
      const keyEsc = sqlEscapeLiteral(key);
      const codeEsc = sqlEscapeLiteral(codeVal);
      sql.push(`  INSERT INTO default_accounts (company_id, account_key, account_id, description)`);
      sql.push(
        `  SELECT v_company_id, '${keyEsc}', a.id, 'Auto-mapped from imported COA' FROM accounts a WHERE a.company_id = v_company_id AND a.code = '${codeEsc}' AND a.deleted_at IS NULL`
      );
      sql.push('  ON CONFLICT (company_id, account_key) DO UPDATE SET');
      sql.push('    account_id = EXCLUDED.account_id,');
      sql.push('    is_active = TRUE,');
      sql.push('    updated_at = NOW();');
      sql.push('');
    }
  }

  sql.push('END $$;');
  sql.push('');

  return sql.join('\n');
}

function buildTree(rows: CoaRow[]) {
  const byCode = new Map<string, any>();
  const roots: any[] = [];

  for (const r of rows) {
    byCode.set(r.code, {
      code: r.code,
      name: r.name,
      name_ar: r.nameAr ?? null,
      account_type_code: r.accountTypeCode,
      level: r.level ?? null,
      is_group: r.isGroup,
      allow_posting: r.allowPosting,
      parent_code: r.parentCode ?? null,
      children: [],
    });
  }

  for (const r of rows) {
    const node = byCode.get(r.code);
    if (r.parentCode && byCode.has(r.parentCode)) {
      byCode.get(r.parentCode).children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function toMarkdownList(tree: any[], indent = 0, lines: string[] = []) {
  for (const node of tree) {
    const pad = '  '.repeat(indent);
    const label = node.name_ar ? `${node.code} - ${node.name_ar}` : `${node.code} - ${node.name}`;
    lines.push(`${pad}- ${label}`);
    if (node.children && node.children.length > 0) {
      toMarkdownList(node.children, indent + 1, lines);
    }
  }
  return lines;
}

function main() {
  const args = parseArgs(process.argv);
  const file = String(args.file || args.path || '');
  const companyId = Number(args['company-id'] || args.companyId || args.company || 1);
  const createdBy = Number(args['created-by'] || args.createdBy || args.user || 1);
  const delimiter = String(args.delimiter || ',');

  if (!file) {
    console.error('Usage: ts-node scripts/import-coa-from-csv.ts --file <path.csv> --company-id 1 --created-by 1');
    console.error('Required columns: code, name (or name_en), account_type_code');
    console.error('Optional columns: name_ar, parent_code, level, is_group, allow_posting, default_key');
    process.exit(1);
  }

  const abs = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  const content = fs.readFileSync(abs, 'utf8');

  const csvRows = parseCsv(content, delimiter);
  const mapped = csvRows.map(mapRow);

  // Build children map so we can set is_group/allow_posting consistently
  const childrenByParent = new Map<string, string[]>();
  for (const r of mapped) {
    if (!r.parentCode) continue;
    const list = childrenByParent.get(r.parentCode) ?? [];
    list.push(r.code);
    childrenByParent.set(r.parentCode, list);
  }

  const coaRows: CoaRow[] = mapped.map((r) => {
    const hasChildren = (childrenByParent.get(r.code)?.length ?? 0) > 0;
    const rawType = (r.rawType || '').trim();
    const isGroup = hasChildren || rawType === 'رئيسي' || rawType.toLowerCase() === 'main';
    return {
      code: r.code,
      name: r.name,
      nameAr: r.nameAr,
      parentCode: r.parentCode,
      level: r.level,
      isGroup,
      allowPosting: !isGroup,
      accountTypeCode: r.accountTypeCode,
      currency: r.currency,
      reportType: r.reportType,
    };
  });

  const outDir = path.join(process.cwd(), 'scripts', 'output');
  fs.mkdirSync(outDir, { recursive: true });

  const tree = buildTree(coaRows);
  const treePath = path.join(outDir, 'coa-tree.json');
  fs.writeFileSync(treePath, JSON.stringify(tree, null, 2), 'utf8');

  const mdLines = ['# Chart of Accounts (Imported)', '', ...toMarkdownList(tree)];
  const mdPath = path.join(outDir, 'coa-list.md');
  fs.writeFileSync(mdPath, mdLines.join('\n') + '\n', 'utf8');

  const sql = generateSql(companyId, createdBy, coaRows);
  const sqlPath = path.join(outDir, 'coa-import.sql');
  fs.writeFileSync(sqlPath, sql, 'utf8');

  console.log(`✅ Generated:`);
  console.log(`- ${treePath}`);
  console.log(`- ${mdPath}`);
  console.log(`- ${sqlPath}`);
}

main();
