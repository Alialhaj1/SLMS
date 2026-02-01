import fs from 'fs';
import path from 'path';
import pool from '../db';

type CsvRow = Record<string, string>;

type ImportReport = {
  file: string;
  companyId: number;
  dryRun: boolean;
  totalRows: number;
  processedRows: number;
  insertedVendors: number;
  updatedVendors: number;
  createdAccounts: number;
  updatedAccounts: number;
  skippedRows: number;
  warnings: string[];
  errors: Array<{ row: number; code?: string; message: string }>;
};

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
      const swapped = Buffer.allocUnsafe(buf.length - 2);
      for (let i = 2; i < buf.length; i += 2) {
        swapped[i - 2] = buf[i + 1] ?? 0;
        swapped[i - 1] = buf[i] ?? 0;
      }
      return swapped.toString('utf16le');
    }
  }
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.toString('utf8');
  }

  // Heuristic: many Excel Arabic CSV exports are UTF-16 without BOM
  const utf8 = buf.toString('utf8');
  if (utf8.includes('\u0000')) {
    return buf.toString('utf16le');
  }

  return utf8;
}

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/\ufeff/g, '')
    .replace(/[\s\-]+/g, '_');
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
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  let headerLineIndex = 0;
  while (headerLineIndex < lines.length) {
    const candidate = stripBom(lines[headerLineIndex]);
    if (/^[\s,;\t]+$/.test(candidate)) {
      headerLineIndex += 1;
      continue;
    }
    break;
  }

  const headerLine = stripBom(lines[headerLineIndex] ?? '');
  const delimiter = detectDelimiter(headerLine);
  const headers = splitCsvLine(headerLine, delimiter).map((h) => normalizeHeader(h));

  const out: CsvRow[] = [];
  for (let i = headerLineIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) continue;
    const parts = splitCsvLine(line, delimiter);
    const row: CsvRow = {};
    for (let j = 0; j < headers.length; j += 1) {
      row[headers[j]] = normalizeWhitespace((parts[j] ?? '').replace(/^"|"$/g, ''));
    }
    if (Object.values(row).some((v) => v.trim() !== '')) out.push(row);
  }

  return out;
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

function normalizeArabicIndicDigits(value: string): string {
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

function normalizeNumericCode(raw: string): string {
  const v = normalizeArabicIndicDigits(String(raw ?? ''))
    .replace(/\uFEFF/g, '')
    .replace(/[\u200E\u200F\u202A-\u202E]/g, '')
    .trim();
  // For supplier/vendor/account codes coming from Excel/CSV, keep digits only.
  return v.replace(/[^0-9]/g, '');
}

function pick(row: CsvRow, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function looksEnglishName(name: string): boolean {
  return /[A-Za-z]/.test(name);
}

function normalizeScientificId(raw: string): string {
  const v = normalizeArabicIndicDigits(raw).trim();
  if (!v) return '';
  if (!/[eE]/.test(v)) return v;

  const n = Number(v);
  if (!Number.isFinite(n)) return v;

  // keep as integer string when possible
  return n.toFixed(0);
}

function parseDecimal(raw: string): number | null {
  const v = normalizeArabicIndicDigits(raw).replace(/,/g, '').trim();
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

async function main() {
  const args = parseArgs(process.argv);
  const fileArg = String(args.file || '');
  const companyIdArg = String(args['company-id'] || '');
  const dryRun = Boolean(args.dryRun);
  const reportFileArg = String(args['report-file'] || '');

  if (!fileArg || !companyIdArg) {
    console.error(
      'Missing required argument. Usage: npm run suppliers:import -- --file <path-to-csv> --company-id <id> [--dry-run] [--report-file <path>]'
    );
    process.exit(1);
  }

  const companyId = Number(companyIdArg);
  if (!Number.isFinite(companyId) || companyId <= 0) {
    throw new Error(`Invalid --company-id value: ${companyIdArg}`);
  }

  const absPath = path.isAbsolute(fileArg) ? fileArg : path.resolve(process.cwd(), fileArg);
  const content = readTextFileAutoEncoding(absPath);
  const rows = parseCsv(content);

  const indexedRows = rows.map((row, i) => ({ row, rowNo: i + 2 }));

  const report: ImportReport = {
    file: absPath,
    companyId,
    dryRun,
    totalRows: rows.length,
    processedRows: 0,
    insertedVendors: 0,
    updatedVendors: 0,
    createdAccounts: 0,
    updatedAccounts: 0,
    skippedRows: 0,
    warnings: [],
    errors: [],
  };

  // Dedupe file-level supplier codes: keep last occurrence.
  // This keeps the system invariant (unique vendor code) while allowing messy source files.
  const lastIndexByCode = new Map<string, number>();
  for (let i = 0; i < indexedRows.length; i += 1) {
    const { row } = indexedRows[i];
    const vendorCode = normalizeNumericCode(
      pick(row, ['رقم_المورد', 'vendor_code', 'code', 'supplier_code'])
    );
    if (!vendorCode) continue;
    lastIndexByCode.set(vendorCode, i);
  }

  const rowsToProcess = indexedRows.filter(({ row }, i) => {
    const vendorCode = normalizeNumericCode(
      pick(row, ['رقم_المورد', 'vendor_code', 'code', 'supplier_code'])
    );
    if (!vendorCode) return true;
    return lastIndexByCode.get(vendorCode) === i;
  });

  const uniqueCodes = Array.from(lastIndexByCode.keys()).length;
  const duplicatesRemoved = Math.max(0, rows.length - uniqueCodes);
  if (duplicatesRemoved > 0) {
    report.warnings.push(
      `CSV contains duplicate supplier codes; keeping last occurrence per code. Duplicates skipped: ${duplicatesRemoved}`
    );
    report.skippedRows += duplicatesRemoved;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const dbDiag = await client.query(
      `SELECT
         current_database() AS db,
         inet_server_addr()::text AS server_addr,
         inet_server_port() AS server_port,
         current_schema() AS schema`
    );
    if (dbDiag.rows?.[0]) {
      const d = dbDiag.rows[0];
      report.warnings.push(
        `DB connection: db=${d.db} schema=${d.schema} server=${d.server_addr ?? 'unknown'}:${d.server_port ?? 'unknown'}`
      );
    }

    // Preload parent accounts referenced by CSV
    const parentAccountCodes = Array.from(
      new Set(
        rowsToProcess
          .map(({ row }) =>
            normalizeNumericCode(pick(row, ['رقم_حساب_المورد', 'supplier_account_parent', 'account_parent']))
          )
          .map((v) => v.trim())
          .filter((v) => v.length > 0)
      )
    );

    const parentAccountsByCode = new Map<
      string,
      { id: number; account_type_id: number; level: number; full_code: string | null }
    >();

    if (parentAccountCodes.length === 0) {
      report.warnings.push('No parent account codes found in CSV (رقم حساب المورد). Accounts will not be linked.');
    } else {
      const parentRows = await client.query(
        `SELECT id, code, account_type_id, level, full_code
         FROM accounts
         WHERE company_id = $1 AND deleted_at IS NULL AND code::text = ANY($2::text[])`,
        [companyId, parentAccountCodes]
      );
      for (const r of parentRows.rows) {
        parentAccountsByCode.set(String(r.code), {
          id: Number(r.id),
          account_type_id: Number(r.account_type_id),
          level: Number(r.level ?? 1),
          full_code: r.full_code ?? null,
        });
      }

      for (const c of parentAccountCodes) {
        if (!parentAccountsByCode.has(c)) {
          report.errors.push({ row: 0, code: c, message: `Parent account code not found in COA: ${c}` });
        }
      }
      if (report.errors.length > 0) throw new Error('Missing parent accounts in chart of accounts');
    }

    for (let i = 0; i < rowsToProcess.length; i += 1) {
      const { row, rowNo } = rowsToProcess[i];

      const vendorCode = normalizeNumericCode(
        pick(row, ['رقم_المورد', 'vendor_code', 'code', 'supplier_code'])
      );
      const rawName = pick(row, ['اسم_المورد', 'vendor_name', 'name', 'supplier_name']).trim();
      const parentAccountCode = normalizeNumericCode(
        pick(row, ['رقم_حساب_المورد', 'supplier_account_parent', 'account_parent'])
      );

      if (!vendorCode || !rawName) {
        report.skippedRows += 1;
        report.errors.push({ row: rowNo, code: vendorCode || undefined, message: 'Missing required fields (رقم المورد / اسم المورد)' });
        continue;
      }

      const isExternal = looksEnglishName(rawName);
      const vendorName = rawName;
      const vendorNameAr = isExternal ? null : rawName;

      const city = pick(row, ['المدينه', 'city']).trim();
      const phone = normalizeScientificId(pick(row, ['الهاتف', 'phone']).trim());
      const mobile = normalizeScientificId(pick(row, ['الجوال', 'mobile']).trim());
      const taxNumber = normalizeScientificId(pick(row, ['الرقم_الضريبي', 'tax_number']).trim());
      const commercialRegister = normalizeScientificId(pick(row, ['السجل_التجاري', 'commercial_register']).trim());
      const balance = parseDecimal(pick(row, ['الرصيد', 'balance']).trim());

      const stopped = pick(row, ['التوقيف', 'stopped']).trim();
      const isStopped = /نعم|موقوف|موقفة|ايقاف|إيقاف|stop/i.test(stopped);
      const status = isStopped ? 'blocked' : 'active';
      const blockedReason = isStopped ? 'Imported as stopped from CSV' : null;

      // Create/ensure payable sub-account under provided parent account
      let payableAccountId: number | null = null;
      if (parentAccountCode) {
        const parent = parentAccountsByCode.get(parentAccountCode);
        if (!parent) {
          report.errors.push({ row: rowNo, code: vendorCode, message: `Unknown parent account code: ${parentAccountCode}` });
        } else {
          const childCode = `${parentAccountCode}-${vendorCode}`;

          if (!dryRun) {
            const upsertAccount = await client.query(
              `INSERT INTO accounts (
                 company_id, parent_id, account_type_id, code, name, name_ar,
                 level, is_group, is_active, allow_posting,
                 is_control_account, control_type,
                 created_by
               ) VALUES (
                 $1, $2, $3, $4, $5, $6,
                 $7, false, true, true,
                 false, null,
                 null
               )
               ON CONFLICT (company_id, code)
               DO UPDATE SET
                 parent_id = EXCLUDED.parent_id,
                 name = EXCLUDED.name,
                 name_ar = EXCLUDED.name_ar,
                 is_active = true,
                 updated_at = CURRENT_TIMESTAMP
               RETURNING id, (xmax = 0) as inserted`,
              [companyId, parent.id, parent.account_type_id, childCode, vendorName, vendorNameAr, parent.level + 1]
            );

            const accRow = upsertAccount.rows[0];
            payableAccountId = Number(accRow.id);
            if (accRow.inserted) report.createdAccounts += 1;
            else report.updatedAccounts += 1;
          } else {
            // dry-run: resolve existing account id if present
            const existingAcc = await client.query(
              'SELECT id FROM accounts WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL',
              [companyId, childCode]
            );
            payableAccountId = existingAcc.rows.length ? Number(existingAcc.rows[0].id) : null;
          }
        }
      }

      if (report.errors.length > 0 && report.errors.some((e) => e.row === rowNo)) {
        report.skippedRows += 1;
        continue;
      }

      // Upsert vendor by (company_id, code)
      if (!dryRun) {
        const existingVendor = await client.query(
          'SELECT id FROM vendors WHERE company_id = $1 AND code = $2 LIMIT 1',
          [companyId, vendorCode]
        );

        const address = city ? `City: ${city}` : null;

        if (existingVendor.rows.length === 0) {
          const inserted = await client.query(
            `INSERT INTO vendors (
               company_id, code, name, name_ar,
               phone, mobile,
               tax_number, commercial_register,
               current_balance,
               payable_account_id,
               status, blocked_reason,
               is_external,
               created_by,
               deleted_at
             ) VALUES (
               $1, $2, $3, $4,
               $5, $6,
               $7, $8,
               $9,
               $10,
               $11, $12,
               $13,
               null,
               null
             )
             RETURNING id`,
            [
              companyId,
              vendorCode,
              vendorName,
              vendorNameAr,
              phone || null,
              mobile || null,
              taxNumber || null,
              commercialRegister || null,
              balance ?? 0,
              payableAccountId,
              status,
              blockedReason,
              isExternal,
            ]
          );
          void inserted;
          report.insertedVendors += 1;
        } else {
          await client.query(
            `UPDATE vendors
             SET
               name = $3,
               name_ar = $4,
               phone = $5,
               mobile = $6,
               tax_number = $7,
               commercial_register = $8,
               current_balance = $9,
               payable_account_id = COALESCE($10, payable_account_id),
               status = $11,
               blocked_reason = $12,
               is_external = $13,
               deleted_at = NULL,
               updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND company_id = $2`,
            [
              Number(existingVendor.rows[0].id),
              companyId,
              vendorName,
              vendorNameAr,
              phone || null,
              mobile || null,
              taxNumber || null,
              commercialRegister || null,
              balance ?? 0,
              payableAccountId,
              status,
              blockedReason,
              isExternal,
            ]
          );
          report.updatedVendors += 1;
        }

        // Optional address update only if empty
        if (address) {
          await client.query(
            `UPDATE vendors
             SET address = COALESCE(NULLIF(address, ''), $3)
             WHERE company_id = $1 AND code = $2`,
            [companyId, vendorCode, address]
          );
        }
      }

      report.processedRows += 1;
    }

    if (dryRun) {
      await client.query('ROLLBACK');
    } else {
      await client.query('COMMIT');
    }

    if (reportFileArg) {
      const reportPath = path.isAbsolute(reportFileArg)
        ? reportFileArg
        : path.resolve(process.cwd(), reportFileArg);
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    }

    console.log(JSON.stringify(report, null, 2));
  } catch (err) {
    await client.query('ROLLBACK');

    if (reportFileArg) {
      const reportPath = path.isAbsolute(reportFileArg)
        ? reportFileArg
        : path.resolve(process.cwd(), reportFileArg);
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    }

    if (err instanceof Error) {
      console.error(err.message);
    }
    throw err;
  } finally {
    client.release();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
