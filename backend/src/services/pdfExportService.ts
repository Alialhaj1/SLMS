/**
 * §13.2.5 — PDF Export Service
 *
 * Generates PDF documents from data (reports, invoices, shipment summaries).
 * Uses a lightweight HTML-to-PDF approach without heavy dependencies.
 * In production, this would integrate with puppeteer or wkhtmltopdf.
 * For now, generates a structured text/plain fallback or leverages
 * the existing printed_templates system with a PDF wrapper.
 */

import { Response } from 'express';
import { logger } from '../utils/logger';

interface PdfColumn {
  key: string;
  header: string;
  width?: number;
  align?: 'left' | 'right' | 'center';
}

interface PdfExportOptions {
  title: string;
  subtitle?: string;
  columns: PdfColumn[];
  rows: Record<string, unknown>[];
  orientation?: 'portrait' | 'landscape';
  locale?: 'en' | 'ar';
  companyName?: string;
  generatedBy?: string;
  /** Additional metadata shown in footer */
  footer?: string;
}

/**
 * Generate a simple HTML document suitable for browser Print-to-PDF.
 * This is the "zero-dependency" approach — the frontend opens this HTML
 * in a new tab and the user can Ctrl+P to get a real PDF.
 *
 * For server-side PDF generation we'd integrate puppeteer or pdfkit.
 */
export function generatePrintableHtml(options: PdfExportOptions): string {
  const {
    title,
    subtitle,
    columns,
    rows,
    orientation = 'portrait',
    locale = 'en',
    companyName,
    generatedBy,
    footer,
  } = options;

  const isRtl = locale === 'ar';
  const dir = isRtl ? 'rtl' : 'ltr';

  const headerRow = columns
    .map(c => `<th style="text-align:${c.align || 'left'}">${escapeHtml(c.header)}</th>`)
    .join('');

  const bodyRows = rows
    .map(row => {
      const cells = columns
        .map(c => `<td style="text-align:${c.align || 'left'}">${escapeHtml(String(row[c.key] ?? ''))}</td>`)
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${locale}">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<style>
  @page { size: ${orientation}; margin: 15mm; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 11px; color: #333; direction: ${dir}; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .subtitle { font-size: 12px; color: #666; margin-bottom: 12px; }
  .meta { font-size: 10px; color: #999; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #f0f4f8; border: 1px solid #ddd; padding: 6px 8px; font-weight: 600; }
  td { border: 1px solid #ddd; padding: 5px 8px; }
  tr:nth-child(even) td { background: #fafafa; }
  .footer { margin-top: 16px; font-size: 9px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 6px; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  <div class="no-print" style="padding:8px;background:#ffe;border-bottom:1px solid #cc9;margin-bottom:12px;">
    <button onclick="window.print()" style="padding:6px 16px;cursor:pointer;">🖨️ ${isRtl ? 'طباعة / تنزيل PDF' : 'Print / Download PDF'}</button>
  </div>
  ${companyName ? `<div class="meta">${escapeHtml(companyName)}</div>` : ''}
  <h1>${escapeHtml(title)}</h1>
  ${subtitle ? `<div class="subtitle">${escapeHtml(subtitle)}</div>` : ''}
  <div class="meta">${isRtl ? 'تاريخ التقرير' : 'Generated'}: ${new Date().toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')}${generatedBy ? ` | ${isRtl ? 'بواسطة' : 'By'}: ${escapeHtml(generatedBy)}` : ''}</div>
  <div class="meta">${isRtl ? 'عدد السجلات' : 'Total records'}: ${rows.length}</div>
  <table>
    <thead><tr>${headerRow}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  ${footer ? `<div class="footer">${escapeHtml(footer)}</div>` : ''}
</body>
</html>`;
}

/**
 * Send printable HTML response (the user prints to PDF from browser).
 */
export function sendPrintableHtml(res: Response, options: PdfExportOptions): void {
  const html = generatePrintableHtml(options);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}

/**
 * Generate a CSV string (lightweight alternative to PDF for data export).
 */
export function generateCsv(columns: PdfColumn[], rows: Record<string, unknown>[]): string {
  const header = columns.map(c => `"${c.header.replace(/"/g, '""')}"`).join(',');
  const body = rows
    .map(row =>
      columns
        .map(c => {
          const val = String(row[c.key] ?? '').replace(/"/g, '""');
          return `"${val}"`;
        })
        .join(',')
    )
    .join('\n');
  return `${header}\n${body}`;
}

/**
 * Send CSV as a downloadable file.
 */
export function sendCsvDownload(res: Response, filename: string, columns: PdfColumn[], rows: Record<string, unknown>[]): void {
  const csv = generateCsv(columns, rows);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  // UTF-8 BOM for Excel compatibility
  res.send('\uFEFF' + csv);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

logger.debug('PDF/CSV export service loaded');
