import fs from 'fs';
import path from 'path';
import pool from '../db';
import type { PoolClient } from 'pg';

type CsvRow = Record<string, string>;

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
    .replace(/[\r\n]+/g, ' ')
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
      if (ch === '\r' && content[i + 1] === '\n') i++;
      pushField();
      pushRow();
      continue;
    }

    currentField += ch;
  }

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

function normalizeArabicDigits(value: string) {
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
  return value.replace(/[٠-٩]/g, (d) => map[d] ?? d);
}

function normalizeHsCode(code: string) {
  return normalizeArabicDigits(code).replace(/[\.\s]/g, '').trim();
}

function normalizeText(value: string) {
  return value.replace(/[\s\r\n]+/g, ' ').trim();
}

function parseIsoDate(value: string | undefined, defaultDate: string) {
  const raw = normalizeArabicDigits(String(value ?? '').trim());
  if (!raw) return defaultDate;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // dd/mm/yyyy or d/m/yyyy
  const m1 = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m1) {
    const dd = m1[1].padStart(2, '0');
    const mm = m1[2].padStart(2, '0');
    const yyyy = m1[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  // yyyy/mm/dd
  const m2 = raw.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (m2) {
    const yyyy = m2[1];
    const mm = m2[2].padStart(2, '0');
    const dd = m2[3].padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return defaultDate;
}

type DutyParseResult = {
  dutyRatePercent: number;
  notesEn: string | null;
  notesAr: string | null;
  ruleType: 'DUTY' | 'EXEMPT' | 'PROHIBITED' | 'UNKNOWN';
};

function parseDutyLabel(labelEn: string, labelAr: string): DutyParseResult {
  const en = normalizeText(normalizeArabicDigits(labelEn || '')).trim();
  const ar = normalizeText(normalizeArabicDigits(labelAr || '')).trim();
  const primary = en || ar;

  if (!primary) {
    return { dutyRatePercent: 0, notesEn: null, notesAr: null, ruleType: 'UNKNOWN' };
  }

  const pct = primary.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pct) {
    const n = Number(pct[1]);
    return {
      dutyRatePercent: Number.isFinite(n) ? n : 0,
      notesEn: null,
      notesAr: null,
      ruleType: 'DUTY',
    };
  }

  const lowerEn = en.toLowerCase();
  const lowerAr = ar.toLowerCase();

  if (lowerEn.includes('exempt') || lowerAr.includes('معف')) {
    return {
      dutyRatePercent: 0,
      notesEn: en || 'Exempted',
      notesAr: ar || 'معفاة',
      ruleType: 'EXEMPT',
    };
  }

  if (lowerEn.includes('prohibited') || lowerAr.includes('ممنوع') || lowerAr.includes('محظور')) {
    return {
      dutyRatePercent: 0,
      notesEn: en || 'Prohibited from importing',
      notesAr: ar || 'ممنوع استيراده',
      ruleType: 'PROHIBITED',
    };
  }

  return {
    dutyRatePercent: 0,
    notesEn: en || null,
    notesAr: ar || null,
    ruleType: 'UNKNOWN',
  };
}

function requireArg(args: Record<string, string | boolean>, key: string) {
  const v = args[key];
  if (!v || typeof v !== 'string') throw new Error(`Missing required arg --${key}`);
  return v;
}

function todayIso() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function chunk<T>(arr: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

async function upsertHsCodes(client: PoolClient, params: {
  companyId: number;
  rows: Array<{ code: string; description_en: string; description_ar: string }>;
  dryRun: boolean;
}) {
  const { companyId, rows, dryRun } = params;
  if (dryRun) return;

  for (const batch of chunk(rows, 500)) {
    const values: any[] = [];
    const placeholders: string[] = [];

    let p = 1;
    for (const r of batch) {
      placeholders.push(`($${p++}, $${p++}, $${p++}, $${p++}, TRUE, NULL)`);
      values.push(companyId, r.code, r.description_en, r.description_ar);
    }

    await client.query(
      `INSERT INTO hs_codes (company_id, code, description_en, description_ar, is_active, deleted_at)
       VALUES ${placeholders.join(',')}
       ON CONFLICT (company_id, code)
       DO UPDATE SET
         description_en = EXCLUDED.description_en,
         description_ar = EXCLUDED.description_ar,
         is_active = TRUE,
         deleted_at = NULL,
         updated_at = CURRENT_TIMESTAMP`,
      values
    );
  }
}

async function upsertTariffs(client: PoolClient, params: {
  companyId: number;
  countryCode: string;
  rows: Array<{
    hs_code: string;
    duty_rate_percent: number;
    effective_from: string;
    notes_en: string | null;
    notes_ar: string | null;
  }>;
  dryRun: boolean;
}) {
  const { companyId, countryCode, rows, dryRun } = params;
  if (dryRun) return;

  for (const batch of chunk(rows, 500)) {
    const values: any[] = [];
    const placeholders: string[] = [];

    let p = 1;
    for (const r of batch) {
      placeholders.push(`($${p++}, $${p++}, $${p++}, $${p++}, $${p++}::date, NULL, $${p++}, $${p++}, TRUE, NULL)`);
      values.push(companyId, r.hs_code, countryCode, r.duty_rate_percent, r.effective_from, r.notes_en, r.notes_ar);
    }

    await client.query(
      `INSERT INTO customs_tariffs (
         company_id,
         hs_code,
         country_code,
         duty_rate_percent,
         effective_from,
         effective_to,
         notes_en,
         notes_ar,
         is_active,
         deleted_at
       )
       VALUES ${placeholders.join(',')}
       ON CONFLICT (company_id, hs_code, country_code, effective_from)
       DO UPDATE SET
         duty_rate_percent = EXCLUDED.duty_rate_percent,
         effective_to = EXCLUDED.effective_to,
         notes_en = EXCLUDED.notes_en,
         notes_ar = EXCLUDED.notes_ar,
         is_active = TRUE,
         deleted_at = NULL,
         updated_at = CURRENT_TIMESTAMP`,
      values
    );
  }
}

async function main() {
  const args = parseArgs(process.argv);

  const file = requireArg(args, 'file');
  const companyId = Number(requireArg(args, 'company-id'));
  const countryCode = String((args['country-code'] as string | undefined) ?? 'SA').trim() || 'SA';
  const dryRun = args['dry-run'] === true || args['dry-run'] === 'true';
  const reportFile = (args['report-file'] as string | undefined) || '';
  const defaultEffectiveFrom = String((args['default-effective-from'] as string | undefined) ?? '2025-01-01').trim() || '2025-01-01';

  if (!Number.isFinite(companyId) || companyId <= 0) throw new Error('Invalid --company-id');

  const absPath = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);
  const content = fs.readFileSync(absPath, 'utf8');
  const rows = parseCsv(content);

  const headers = rows.length ? Object.keys(rows[0]) : [];

  const findHeader = (re: RegExp) => headers.find((h) => re.test(h));

  const colHs = findHeader(/harmonized_code|رمز_النظام_المنسق/);
  const colNameAr = findHeader(/item_arabic_name|الصنف_باللغة_العربية/);
  const colNameEn = findHeader(/item_english_name|الصنف_باللغة_الانجليزية/);
  const colDutyAr = findHeader(/arabic_duty_rate|فئة_الرسم_باللغة_العربية/);
  const colDutyEn = findHeader(/english_duty_rate|فئة_الرسم_باللغة_الانجليزية/);
  const colProcedures = findHeader(/procedures|الاجراءات/);
  const colDate = findHeader(/date|التاريخ/);

  if (!colHs || !colNameAr || !colNameEn) {
    throw new Error(`CSV headers not recognized. Found headers: ${headers.join(', ')}`);
  }

  const hsMap = new Map<string, { code: string; description_en: string; description_ar: string }>();
  const tariffRows: Array<{ hs_code: string; duty_rate_percent: number; effective_from: string; notes_en: string | null; notes_ar: string | null }> = [];

  const unknownDutyLabels: Record<string, number> = {};
  const stats = {
    totalRows: rows.length,
    skippedRows: 0,
    uniqueHsCodes: 0,
    tariffRules: 0,
    unknownDuty: 0,
  };

  for (const row of rows) {
    const hsRaw = row[colHs] ?? '';
    const hs = normalizeHsCode(hsRaw);
    if (!hs) {
      stats.skippedRows++;
      continue;
    }

    const nameAr = normalizeText(row[colNameAr] ?? '');
    const nameEn = normalizeText(row[colNameEn] ?? '');

    // Upsert hs_codes record
    if (!hsMap.has(hs)) {
      hsMap.set(hs, {
        code: hs,
        description_en: nameEn.slice(0, 255) || hs,
        description_ar: nameAr.slice(0, 255) || hs,
      });
    }

    const dutyAr = normalizeText(row[colDutyAr ?? ''] ?? '');
    const dutyEn = normalizeText(row[colDutyEn ?? ''] ?? '');
    const parsedDuty = parseDutyLabel(dutyEn, dutyAr);

    if (parsedDuty.ruleType === 'UNKNOWN') {
      const key = dutyEn || dutyAr || '<empty>';
      unknownDutyLabels[key] = (unknownDutyLabels[key] ?? 0) + 1;
      stats.unknownDuty++;
    }

    const procedures = colProcedures ? normalizeText(row[colProcedures] ?? '') : '';
    const dt = colDate ? (row[colDate] ?? '') : '';
    const effectiveFrom = parseIsoDate(dt, defaultEffectiveFrom);

    const notesEnParts: string[] = [];
    const notesArParts: string[] = [];

    if (parsedDuty.notesEn) notesEnParts.push(parsedDuty.notesEn);
    if (parsedDuty.notesAr) notesArParts.push(parsedDuty.notesAr);

    if (procedures) {
      notesEnParts.push(`Procedures: ${procedures}`);
      notesArParts.push(`الإجراءات: ${procedures}`);
    }

    tariffRows.push({
      hs_code: hs,
      duty_rate_percent: parsedDuty.dutyRatePercent,
      effective_from: effectiveFrom,
      notes_en: notesEnParts.length ? notesEnParts.join(' • ') : null,
      notes_ar: notesArParts.length ? notesArParts.join(' • ') : null,
    });
  }

  stats.uniqueHsCodes = hsMap.size;
  stats.tariffRules = tariffRows.length;

  const report = {
    file: absPath,
    companyId,
    countryCode,
    dryRun,
    defaultEffectiveFrom,
    detectedColumns: {
      hs: colHs,
      nameAr: colNameAr,
      nameEn: colNameEn,
      dutyAr: colDutyAr ?? null,
      dutyEn: colDutyEn ?? null,
      procedures: colProcedures ?? null,
      date: colDate ?? null,
    },
    stats,
    topUnknownDutyLabels: Object.entries(unknownDutyLabels)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([label, count]) => ({ label, count })),
    generatedAt: new Date().toISOString(),
  };

  if (dryRun) {
    console.log(JSON.stringify(report, null, 2));
    if (reportFile) {
      fs.mkdirSync(path.dirname(reportFile), { recursive: true });
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf8');
    }
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await upsertHsCodes(client, { companyId, rows: Array.from(hsMap.values()), dryRun });
    await upsertTariffs(client, { companyId, countryCode, rows: tariffRows, dryRun });
    await client.query('COMMIT');
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore
    }
    throw e;
  } finally {
    client.release();
  }

  console.log(JSON.stringify({ ...report, applied: true, appliedAt: new Date().toISOString() }, null, 2));
  if (reportFile) {
    fs.mkdirSync(path.dirname(reportFile), { recursive: true });
    fs.writeFileSync(reportFile, JSON.stringify({ ...report, applied: true, appliedAt: new Date().toISOString() }, null, 2), 'utf8');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
