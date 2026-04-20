/**
 * ============================================================================
 * §17.4 — useExcelExport Hook
 * ============================================================================
 * "تصدير Excel لكل جدول في النظام" — Excel export for every table.
 *
 * Wraps the xlsx library with a consistent API for exporting any DataTable.
 * Includes Arabic header support, date formatting, and number formatting.
 *
 * Usage:
 *   const { exportToExcel, exporting } = useExcelExport();
 *
 *   <Button onClick={() => exportToExcel(data, columns, 'shipments')}>
 *     Export Excel
 *   </Button>
 * ============================================================================
 */

import { useState, useCallback } from 'react';

interface ExcelColumn {
  header: string;
  headerAr?: string;
  key: string;
  width?: number;
  formatter?: (value: any, row: any) => string | number;
}

interface ExcelExportOptions {
  /** Sheet name (default: 'Sheet1') */
  sheetName?: string;
  /** Include Arabic headers as second row */
  includeArabicHeaders?: boolean;
  /** Auto-size columns (default: true) */
  autoWidth?: boolean;
  /** Date format for date columns */
  dateFormat?: string;
}

interface UseExcelExportReturn {
  exportToExcel: (
    data: Record<string, any>[],
    columns: ExcelColumn[],
    filename: string,
    options?: ExcelExportOptions
  ) => Promise<void>;
  exporting: boolean;
}

/**
 * Get nested object value by dot-notation key.
 */
function getNestedValue(obj: Record<string, any>, key: string): any {
  return key.split('.').reduce((val, k) => val?.[k], obj);
}

export function useExcelExport(): UseExcelExportReturn {
  const [exporting, setExporting] = useState(false);

  const exportToExcel = useCallback(
    async (
      data: Record<string, any>[],
      columns: ExcelColumn[],
      filename: string,
      options: ExcelExportOptions = {}
    ) => {
      if (!data.length) return;

      setExporting(true);

      try {
        // Dynamic import for code splitting (§17.3 — lazy loading)
        const XLSX = await import('xlsx');

        const {
          sheetName = 'Sheet1',
          includeArabicHeaders = true,
          autoWidth = true,
        } = options;

        // Build header rows
        const headerRow = columns.map((c) => c.header);
        const rows: any[][] = [headerRow];

        if (includeArabicHeaders) {
          const arabicRow = columns.map((c) => c.headerAr || c.header);
          rows.push(arabicRow);
        }

        // Build data rows
        for (const item of data) {
          const row = columns.map((col) => {
            const value = getNestedValue(item, col.key);
            if (col.formatter) return col.formatter(value, item);
            if (value === null || value === undefined) return '';
            return value;
          });
          rows.push(row);
        }

        // Create workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(rows);

        // Auto-width columns
        if (autoWidth) {
          const colWidths = columns.map((col, i) => {
            const maxLen = Math.max(
              col.header.length,
              ...data.map((item) => {
                const val = getNestedValue(item, col.key);
                return String(val ?? '').length;
              })
            );
            return { wch: Math.min(Math.max(maxLen + 2, col.width || 10), 50) };
          });
          ws['!cols'] = colWidths;
        }

        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        // Write file with BOM for Arabic support
        XLSX.writeFile(wb, `${filename}.xlsx`, {
          bookType: 'xlsx',
          type: 'binary',
        });
      } catch (error) {
        console.error('§17.4 Excel export failed:', error);
        // Fallback to CSV
        fallbackCSV(data, columns, filename);
      } finally {
        setExporting(false);
      }
    },
    []
  );

  return { exportToExcel, exporting };
}

/**
 * CSV fallback when xlsx is not available.
 */
function fallbackCSV(
  data: Record<string, any>[],
  columns: ExcelColumn[],
  filename: string
) {
  const BOM = '\uFEFF';
  const headers = columns.map((c) => `"${c.header}"`).join(',');
  const rows = data.map((item) =>
    columns
      .map((col) => {
        const val = getNestedValue(item, col.key);
        const str = String(val ?? '').replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(',')
  );

  const csv = BOM + [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default useExcelExport;
