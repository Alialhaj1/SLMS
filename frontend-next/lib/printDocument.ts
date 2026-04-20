/**
 * ============================================================================
 * Print Document Utility
 * ============================================================================
 * Generates professional bilingual (AR/EN) print-ready HTML documents
 * with repeating headers and footers on every printed page.
 * 
 * Uses CSS table-header-group / table-footer-group for cross-browser
 * header/footer repetition on multi-page prints.
 * ============================================================================
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CompanyInfo {
  name: string;
  name_ar: string;
  legal_name?: string;
  tax_number?: string;
  registration_number?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  logo_url?: string;
  currency?: string;
}

export interface KeyValueRow {
  label: string;
  labelAr: string;
  value: string;
  highlight?: boolean;
  bold?: boolean;
  color?: string;
}

export interface TableColumn {
  key: string;
  header: string;
  headerAr: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
  format?: 'number' | 'currency' | 'date' | 'text';
}

export interface SignatureBlock {
  title: string;
  titleAr: string;
  name?: string;
  signatureImageUrl?: string;
  date?: string;
}

export interface PrintSection {
  type: 'key-value' | 'table' | 'amount' | 'text' | 'signatures' | 'spacer' | 'divider';
  title?: string;
  titleAr?: string;
  /** For key-value sections */
  rows?: KeyValueRow[];
  /** For table sections */
  columns?: TableColumn[];
  tableData?: Record<string, any>[];
  /** For amount sections */
  amount?: number;
  currency?: string;
  currencySymbol?: string;
  /** For text sections */
  text?: string;
  /** For signature sections */
  signatures?: SignatureBlock[];
}

export interface PrintDocumentOptions {
  /** Document title in English */
  title: string;
  /** Document title in Arabic */
  titleAr: string;
  /** Document number (displayed prominently) */
  documentNumber?: string;
  /** Document date */
  documentDate?: string;
  /** Company info for header */
  company: CompanyInfo;
  /** Content sections */
  sections: PrintSection[];
  /** Text direction */
  direction?: 'rtl' | 'ltr';
  /** Paper size */
  paperSize?: 'A4' | 'A5' | 'Letter' | 'Legal';
  /** Orientation */
  orientation?: 'portrait' | 'landscape';
  /** Who printed this document */
  printedBy?: string;
  /** Who created the record */
  createdBy?: string;
  /** Creation date */
  createdAt?: string;
  /** Primary color for title bar */
  primaryColor?: string;
  /** Custom header HTML (overrides default) */
  customHeaderHtml?: string;
  /** Custom footer HTML (overrides default) */
  customFooterHtml?: string;
  /** Additional CSS */
  customCss?: string;
  /** Whether to show watermark for drafts */
  watermark?: string;
}

// ─── Currency Names ─────────────────────────────────────────────────────────

const CURRENCY_NAMES: Record<string, { ar: string; arSub: string; en: string; enPlural: string; enSub: string }> = {
  SAR: { ar: 'ريال سعودي', arSub: 'هللة', en: 'Saudi Riyal', enPlural: 'Saudi Riyals', enSub: 'Halala' },
  USD: { ar: 'دولار أمريكي', arSub: 'سنت', en: 'US Dollar', enPlural: 'US Dollars', enSub: 'Cent' },
  EUR: { ar: 'يورو', arSub: 'سنت', en: 'Euro', enPlural: 'Euros', enSub: 'Cent' },
  GBP: { ar: 'جنيه إسترليني', arSub: 'بنس', en: 'British Pound', enPlural: 'British Pounds', enSub: 'Pence' },
  AED: { ar: 'درهم إماراتي', arSub: 'فلس', en: 'UAE Dirham', enPlural: 'UAE Dirhams', enSub: 'Fils' },
  CNY: { ar: 'يوان صيني', arSub: 'فن', en: 'Chinese Yuan', enPlural: 'Chinese Yuan', enSub: 'Fen' },
  INR: { ar: 'روبية هندية', arSub: 'بيسة', en: 'Indian Rupee', enPlural: 'Indian Rupees', enSub: 'Paisa' },
  YER: { ar: 'ريال يمني', arSub: 'فلس', en: 'Yemeni Rial', enPlural: 'Yemeni Rials', enSub: 'Fils' },
};

// ─── Number to Words ────────────────────────────────────────────────────────

function convertNumberToArabicParts(num: number): string {
  if (num === 0) return '';
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const hunds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  let result = '';
  if (num >= 1000000) {
    const m = Math.floor(num / 1000000);
    result += (m === 1 ? 'مليون' : m === 2 ? 'مليونان' : (m >= 3 && m <= 10) ? convertNumberToArabicParts(m) + ' ملايين' : convertNumberToArabicParts(m) + ' مليون');
    num %= 1000000;
    if (num > 0) result += ' و';
  }
  if (num >= 1000) {
    const t = Math.floor(num / 1000);
    result += (t === 1 ? 'ألف' : t === 2 ? 'ألفان' : (t >= 3 && t <= 10) ? convertNumberToArabicParts(t) + ' آلاف' : convertNumberToArabicParts(t) + ' ألف');
    num %= 1000;
    if (num > 0) result += ' و';
  }
  if (num >= 100) {
    result += hunds[Math.floor(num / 100)];
    num %= 100;
    if (num > 0) result += ' و';
  }
  if (num >= 10 && num < 20) {
    result += teens[num - 10];
  } else if (num >= 20) {
    const o = num % 10;
    if (o > 0) result += ones[o] + ' و';
    result += tens[Math.floor(num / 10)];
  } else if (num > 0) {
    result += ones[num];
  }
  return result.trim();
}

export function numberToArabicWords(num: number, currencyCode: string = 'SAR'): string {
  const cur = CURRENCY_NAMES[currencyCode] || CURRENCY_NAMES['SAR'];
  if (num === 0) return 'صفر ' + cur.ar + ' فقط لا غير';
  const intPart = Math.floor(Math.abs(num));
  const decPart = Math.round((Math.abs(num) - intPart) * 100);
  let result = convertNumberToArabicParts(intPart) + ' ' + cur.ar;
  if (decPart > 0) result += ' و' + decPart + ' ' + cur.arSub;
  return result + ' فقط لا غير';
}

export function numberToEnglishWords(num: number, currencyCode: string = 'SAR'): string {
  const cur = CURRENCY_NAMES[currencyCode] || CURRENCY_NAMES['SAR'];
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const convert = (n: number): string => {
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
    if (n < 1000000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    return convert(Math.floor(n / 1000000)) + ' Million' + (n % 1000000 ? ' ' + convert(n % 1000000) : '');
  };
  const intPart = Math.floor(Math.abs(num));
  const decPart = Math.round((Math.abs(num) - intPart) * 100);
  let result = convert(intPart) + ' ' + (intPart === 1 ? cur.en : cur.enPlural);
  if (decPart > 0) result += ' and ' + decPart + ' ' + cur.enSub + (decPart > 1 ? 's' : '');
  return result + ' Only';
}

// ─── Formatting Helpers ─────────────────────────────────────────────────────

export function formatAmount(amount: number | string): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  return isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-GB');
}

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── CSS Styles ─────────────────────────────────────────────────────────────

function buildCss(opts: PrintDocumentOptions): string {
  const isRTL = opts.direction === 'rtl';
  const primaryColor = opts.primaryColor || '#1e3a5f';

  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, Tahoma, sans-serif;
      font-size: 12px;
      color: #333;
      background: #fff;
      direction: ${isRTL ? 'rtl' : 'ltr'};
    }

    @page {
      size: ${opts.paperSize || 'A4'} ${opts.orientation || 'portrait'};
      margin: 8mm 10mm;
    }

    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
    }

    /* ── Repeating Header via table-header-group ────────────── */
    .print-page { display: table; width: 100%; }
    .print-page > thead { display: table-header-group; }
    .print-page > tfoot { display: table-footer-group; }
    .print-page > tbody { display: table-row-group; }

    /* ── Header ─────────────────────────────────────────────── */
    .header-content {
      border-bottom: 2px solid ${primaryColor};
      padding-bottom: 8px;
      margin-bottom: 0;
    }
    .header-table { width: 100%; border-collapse: collapse; }
    .header-table td { vertical-align: top; padding: 6px 10px; }
    .company-name { font-size: 15px; font-weight: bold; color: ${primaryColor}; }
    .company-detail { font-size: 10px; color: #555; margin-top: 2px; }
    .logo-cell { text-align: center; width: 100px; }
    .logo-cell img { max-width: 80px; max-height: 80px; object-fit: contain; }
    .logo-placeholder {
      width: 70px; height: 70px; margin: 0 auto;
      border: 1px solid #ddd; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      background: #fafafa; color: #999; font-weight: bold; font-size: 10px;
    }

    /* ── Title Bar ──────────────────────────────────────────── */
    .title-bar {
      background: ${primaryColor};
      color: white;
      padding: 8px 12px;
      text-align: center;
      margin: 8px 0;
    }
    .title-bar .main-title { font-size: 14px; font-weight: bold; }
    .title-bar .sub-title { font-size: 11px; margin-top: 2px; opacity: 0.9; }

    /* ── Document Info ──────────────────────────────────────── */
    .doc-info {
      display: flex;
      justify-content: space-between;
      padding: 6px 12px;
      background: #f0f4f8;
      border-bottom: 1px solid #ddd;
      font-size: 11px;
    }
    .doc-info strong { color: ${primaryColor}; }

    /* ── Section Title ─────────────────────────────────────── */
    .section-title {
      background: #e3f2fd;
      padding: 5px 12px;
      font-size: 12px;
      font-weight: bold;
      color: #1565c0;
      border-bottom: 1px solid #bbdefb;
      margin-top: 6px;
    }

    /* ── Key-Value Table ───────────────────────────────────── */
    .kv-table { width: 100%; border-collapse: collapse; }
    .kv-table td { padding: 6px 10px; border-bottom: 1px solid #e0e0e0; font-size: 11px; }
    .kv-label {
      background: #f5f5f5;
      font-weight: 600;
      width: 35%;
      border-${isRTL ? 'left' : 'right'}: 1px solid #e0e0e0;
      text-align: ${isRTL ? 'right' : 'left'};
    }
    .kv-value { text-align: center; }
    .kv-highlight { background: #fffde7; }
    .kv-highlight .kv-label { background: #fff59d; font-size: 13px; }

    /* ── Data Table ────────────────────────────────────────── */
    .data-table { width: 100%; border-collapse: collapse; margin: 4px 0; }
    .data-table th {
      background: #f0f4f8;
      border: 1px solid #ccc;
      padding: 5px 8px;
      font-size: 10px;
      font-weight: 600;
      text-align: center;
    }
    .data-table td {
      border: 1px solid #ccc;
      padding: 4px 8px;
      font-size: 10px;
    }
    .data-table tbody tr:nth-child(even) { background: #fafafa; }
    .data-table .num { text-align: right; font-variant-numeric: tabular-nums; }
    .data-table .center { text-align: center; }

    /* ── Amount Section ────────────────────────────────────── */
    .amount-section {
      border: 2px solid #2e7d32;
      margin: 8px 0;
      border-radius: 4px;
      overflow: hidden;
    }
    .amount-main {
      background: #e8f5e9;
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .amount-label { font-weight: bold; font-size: 13px; color: #1b5e20; }
    .amount-value { font-size: 20px; font-weight: bold; color: #2e7d32; }
    .amount-words {
      padding: 6px 16px;
      font-size: 10px;
      border-top: 1px solid #c8e6c9;
      background: #f1f8e9;
    }
    .amount-words-ar { text-align: right; direction: rtl; color: #33691e; }
    .amount-words-en { text-align: left; direction: ltr; color: #558b2f; margin-top: 2px; }

    /* ── Signatures ────────────────────────────────────────── */
    .signatures-table { width: 100%; border-collapse: collapse; margin-top: 12px; border-top: 2px solid #333; }
    .sig-cell {
      padding: 12px;
      text-align: center;
      vertical-align: top;
      width: auto;
      border-${isRTL ? 'left' : 'right'}: 1px solid #999;
    }
    .sig-cell:last-child { border: none; }
    .sig-title { font-weight: bold; font-size: 11px; }
    .sig-subtitle { font-size: 9px; color: #666; margin-bottom: 10px; }
    .sig-name { font-size: 11px; margin-top: 5px; }
    .sig-line { border-top: 1px solid #999; margin-top: 28px; padding-top: 5px; font-size: 9px; color: #666; }

    /* ── Footer ─────────────────────────────────────────────── */
    .footer-content {
      border-top: 2px solid ${primaryColor};
      margin-top: 8px;
    }
    .footer-company {
      padding: 6px 10px;
      text-align: center;
      background: #f5f5f5;
      border-bottom: 1px solid #ddd;
    }
    .footer-company-address { font-size: 9px; color: #444; }
    .footer-company-contacts { font-size: 9px; color: ${primaryColor}; margin-top: 2px; }
    .footer-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 12px;
      font-size: 9px;
      color: #888;
      background: #fafafa;
    }

    /* ── Watermark ──────────────────────────────────────────── */
    .watermark {
      position: fixed;
      top: 40%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 80px;
      font-weight: bold;
      color: rgba(200, 200, 200, 0.2);
      z-index: 0;
      pointer-events: none;
    }

    /* ── Divider ────────────────────────────────────────────── */
    .section-divider { border-top: 1px dashed #ccc; margin: 8px 0; }

    /* ── Preview Bar ────────────────────────────────────────── */
    .preview-bar {
      padding: 10px 20px;
      background: #fffde7;
      border-bottom: 2px solid #f9a825;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }
    .preview-bar button {
      padding: 8px 24px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      border-radius: 6px;
      transition: background 0.2s;
    }
    .btn-print { background: #1565c0; color: white; }
    .btn-print:hover { background: #0d47a1; }
    .btn-close { background: #e0e0e0; color: #333; }
    .btn-close:hover { background: #bdbdbd; }

    ${opts.customCss || ''}
  `;
}

// ─── Section Builders ───────────────────────────────────────────────────────

function buildKeyValueSection(section: PrintSection, isRTL: boolean): string {
  if (!section.rows?.length) return '';
  const title = section.title || section.titleAr
    ? `<div class="section-title">${isRTL ? (section.titleAr || section.title) : (section.title || section.titleAr)} ${section.title && section.titleAr ? `/ ${isRTL ? section.title : section.titleAr}` : ''}</div>`
    : '';
  const rows = section.rows.map(row => {
    const cls = row.highlight ? ' kv-highlight' : '';
    const valStyle = [
      row.bold ? 'font-weight:bold;' : '',
      row.color ? `color:${esc(row.color)};` : '',
    ].filter(Boolean).join('');
    return `<tr class="${cls}">
      <td class="kv-label">${isRTL ? esc(row.labelAr || row.label) : esc(row.label)} / ${isRTL ? esc(row.label) : esc(row.labelAr || row.label)}</td>
      <td class="kv-value"${valStyle ? ` style="${valStyle}"` : ''}>${esc(row.value)}</td>
    </tr>`;
  }).join('');
  return `${title}<table class="kv-table">${rows}</table>`;
}

function buildDataTableSection(section: PrintSection, isRTL: boolean): string {
  if (!section.columns?.length || !section.tableData?.length) return '';
  const title = section.title || section.titleAr
    ? `<div class="section-title">${isRTL ? (section.titleAr || section.title) : (section.title || section.titleAr)} ${section.title && section.titleAr ? `/ ${isRTL ? section.title : section.titleAr}` : ''}</div>`
    : '';
  const cols = section.columns;
  const headerCells = cols.map(c => {
    const label = isRTL ? (c.headerAr || c.header) : (c.header || c.headerAr);
    return `<th style="${c.width ? `width:${c.width};` : ''}text-align:${c.align || 'center'};">${esc(label)}</th>`;
  });
  // Add row number column
  const headerRow = `<tr><th style="width:30px;text-align:center;">#</th>${headerCells.join('')}</tr>`;

  const bodyRows = section.tableData.map((row, idx) => {
    const cells = cols.map(c => {
      let val = row[c.key] ?? '';
      const cls = (c.format === 'number' || c.format === 'currency') ? ' class="num"' : c.align === 'center' ? ' class="center"' : '';
      if (c.format === 'currency') val = formatAmount(val);
      else if (c.format === 'date') val = formatDate(val as string);
      else val = String(val);
      return `<td${cls}>${esc(val)}</td>`;
    }).join('');
    return `<tr><td class="center">${idx + 1}</td>${cells}</tr>`;
  }).join('');

  return `${title}<table class="data-table"><thead>${headerRow}</thead><tbody>${bodyRows}</tbody></table>`;
}

function buildAmountSection(section: PrintSection, isRTL: boolean): string {
  const amount = section.amount ?? 0;
  const currency = section.currency || 'SAR';
  const symbol = section.currencySymbol || currency;
  return `
    <div class="amount-section">
      <div class="amount-main">
        <span class="amount-label">${isRTL ? 'إجمالي المبلغ / Total Amount' : 'Total Amount / إجمالي المبلغ'}</span>
        <span class="amount-value">${formatAmount(amount)} ${esc(symbol)}</span>
      </div>
      <div class="amount-words">
        <div class="amount-words-ar">${numberToArabicWords(amount, currency)}</div>
        <div class="amount-words-en">${numberToEnglishWords(amount, currency)}</div>
      </div>
    </div>`;
}

function buildSignaturesSection(section: PrintSection, isRTL: boolean): string {
  if (!section.signatures?.length) return '';
  const cells = section.signatures.map(s => `
    <td class="sig-cell">
      <div class="sig-title">${isRTL ? esc(s.titleAr || s.title) : esc(s.title)}</div>
      <div class="sig-subtitle">${isRTL ? esc(s.title) : esc(s.titleAr || s.title)}</div>
      ${s.name ? `<div class="sig-name" style="font-weight:600;margin-bottom:4px;">${esc(s.name)}</div>` : ''}
      ${s.signatureImageUrl ? `<div style="margin:6px auto;min-height:40px;"><img src="${esc(s.signatureImageUrl)}" style="max-width:120px;max-height:50px;display:block;margin:0 auto;" onerror="this.style.display='none'" /></div>` : '<div style="min-height:40px;"></div>'}
      <div class="sig-line">${isRTL ? 'التوقيع / Signature' : 'Signature / التوقيع'}</div>
      ${s.date ? `<div style="font-size:9px;color:#555;margin-top:3px;text-align:center;">${esc(s.date)}</div>` : ''}
    </td>`).join('');
  return `<table class="signatures-table"><tr>${cells}</tr></table>`;
}

function buildSections(sections: PrintSection[], isRTL: boolean): string {
  return sections.map(s => {
    switch (s.type) {
      case 'key-value': return buildKeyValueSection(s, isRTL);
      case 'table': return buildDataTableSection(s, isRTL);
      case 'amount': return buildAmountSection(s, isRTL);
      case 'signatures': return buildSignaturesSection(s, isRTL);
      case 'text': return s.text ? `<div style="padding:8px 12px;font-size:11px;">${esc(s.text)}</div>` : '';
      case 'spacer': return '<div style="height:12px;"></div>';
      case 'divider': return '<div class="section-divider"></div>';
      default: return '';
    }
  }).join('\n');
}

// ─── Main Builder ───────────────────────────────────────────────────────────

export function buildPrintHtml(opts: PrintDocumentOptions): string {
  const isRTL = opts.direction === 'rtl';
  const dir = isRTL ? 'rtl' : 'ltr';
  const now = new Date();
  const printDate = now.toLocaleDateString('en-GB');
  const printTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const rawLogo = opts.company.logo_url || opts.company.logo || '';
  const logoUrl = rawLogo && rawLogo.startsWith('/') && typeof window !== 'undefined' ? `${window.location.origin}${rawLogo}` : rawLogo;
  const css = buildCss(opts);

  // ── Header HTML ──
  const headerHtml = opts.customHeaderHtml || `
    <div class="header-content">
      <table class="header-table">
        <tr>
          <td style="width:38%;text-align:${isRTL ? 'right' : 'left'};" dir="${dir}">
            <div class="company-name">${isRTL ? esc(opts.company.name_ar || opts.company.name) : esc(opts.company.name || opts.company.name_ar)}</div>
            ${opts.company.registration_number ? `<div class="company-detail">${isRTL ? 'سجل تجاري:' : 'C.R. No:'} ${esc(opts.company.registration_number)}</div>` : ''}
            ${opts.company.tax_number ? `<div class="company-detail">${isRTL ? 'الرقم الضريبي:' : 'VAT No:'} ${esc(opts.company.tax_number)}</div>` : ''}
          </td>
          <td class="logo-cell">
            ${logoUrl
              ? `<img src="${esc(logoUrl)}" alt="Logo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="logo-placeholder" style="display:none;">LOGO</div>`
              : '<div class="logo-placeholder">LOGO</div>'}
          </td>
          <td style="width:38%;text-align:${isRTL ? 'left' : 'right'};" dir="${isRTL ? 'ltr' : 'rtl'}">
            <div class="company-name">${isRTL ? esc(opts.company.name || opts.company.name_ar) : esc(opts.company.name_ar || opts.company.name)}</div>
            ${opts.company.registration_number ? `<div class="company-detail">${isRTL ? 'C.R. No:' : 'سجل تجاري:'} ${esc(opts.company.registration_number)}</div>` : ''}
            ${opts.company.tax_number ? `<div class="company-detail">${isRTL ? 'VAT No:' : 'الرقم الضريبي:'} ${esc(opts.company.tax_number)}</div>` : ''}
          </td>
        </tr>
      </table>
    </div>`;

  // ── Footer HTML ──
  const companyContacts = [
    opts.company.phone ? `Tel: ${opts.company.phone}` : '',
    opts.company.email || '',
    opts.company.website || '',
  ].filter(Boolean).join(' | ');

  const footerHtml = opts.customFooterHtml || `
    <div class="footer-content">
      ${opts.company.address || companyContacts ? `
      <div class="footer-company">
        ${opts.company.address ? `<div class="footer-company-address">${esc(opts.company.address)}</div>` : ''}
        ${companyContacts ? `<div class="footer-company-contacts">${esc(companyContacts)}</div>` : ''}
      </div>` : ''}
      <div class="footer-meta">
        <div>${isRTL ? `طُبع بواسطة: ${esc(opts.printedBy || '-')}` : `Printed by: ${esc(opts.printedBy || '-')}`}</div>
        <div>${isRTL ? `مُدخل السجل: ${esc(opts.createdBy || '-')}` : `Created by: ${esc(opts.createdBy || '-')}`}</div>
        <div>${isRTL ? `تاريخ الطباعة: ${printDate} - ${printTime}` : `Print Date: ${printDate} - ${printTime}`}</div>
      </div>
    </div>`;

  // ── Title Bar ──
  const titleBarHtml = `
    <div class="title-bar">
      <div class="main-title">${isRTL ? esc(opts.titleAr) : esc(opts.title)}</div>
      <div class="sub-title">${isRTL ? esc(opts.title) : esc(opts.titleAr)}</div>
    </div>`;

  // ── Document Info ──
  const docInfoHtml = (opts.documentNumber || opts.documentDate) ? `
    <div class="doc-info">
      ${opts.documentNumber ? `<div><strong>${isRTL ? 'رقم المستند:' : 'Document No:'}</strong> ${esc(opts.documentNumber)}</div>` : ''}
      ${opts.documentDate ? `<div><strong>${isRTL ? 'التاريخ:' : 'Date:'}</strong> ${formatDate(opts.documentDate)}</div>` : ''}
    </div>` : '';

  // ── Body Content ──
  const bodyContent = buildSections(opts.sections, isRTL);

  // ── Assemble the document ──
  return `<!DOCTYPE html>
<html dir="${dir}" lang="${isRTL ? 'ar' : 'en'}">
<head>
  <meta charset="UTF-8">
  <title>${esc(opts.title)} ${opts.documentNumber ? '- ' + esc(opts.documentNumber) : ''}</title>
  <style>${css}</style>
</head>
<body>
  ${opts.watermark ? `<div class="watermark">${esc(opts.watermark)}</div>` : ''}

  <div class="no-print preview-bar">
    <button class="btn-print" onclick="window.print()">🖨️ ${isRTL ? 'طباعة' : 'Print'} / ${isRTL ? 'Print' : 'طباعة'}</button>
    <button class="btn-close" onclick="window.close()">✕ ${isRTL ? 'إغلاق' : 'Close'} / ${isRTL ? 'Close' : 'إغلاق'}</button>
  </div>

  <table class="print-page">
    <thead><tr><td>${headerHtml}</td></tr></thead>
    <tfoot><tr><td>${footerHtml}</td></tr></tfoot>
    <tbody><tr><td>
      ${titleBarHtml}
      ${docInfoHtml}
      ${bodyContent}
    </td></tr></tbody>
  </table>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 500);
    };
  </script>
</body>
</html>`;
}

// ─── Open Print Window ──────────────────────────────────────────────────────

export function openPrintWindow(html: string): Window | null {
  const w = window.open('', '_blank', 'width=900,height=1100');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
  return w;
}

// ─── Convenience: Build & Open ──────────────────────────────────────────────

export function printDocument(opts: PrintDocumentOptions): void {
  const html = buildPrintHtml(opts);
  openPrintWindow(html);
}

// ─── Fetch Company Info Helper ──────────────────────────────────────────────

export async function fetchCompanyInfo(): Promise<CompanyInfo | null> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return null;
    const res = await fetch('/api/master/companies', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0] || null;
  } catch {
    return null;
  }
}

// ─── Fetch Current User Helper ──────────────────────────────────────────────

export function getCurrentUser(): { fullName: string; email: string } {
  try {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (!userStr) return { fullName: 'Unknown', email: '' };
    const user = JSON.parse(userStr);
    return { fullName: user.full_name || user.email || 'Unknown', email: user.email || '' };
  } catch {
    return { fullName: 'Unknown', email: '' };
  }
}
