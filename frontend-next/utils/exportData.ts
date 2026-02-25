/**
 * Export Data Utility
 * Exports table data to CSV file for download
 */

interface ExportColumn {
  header: string;
  key: string;
  formatter?: (value: any) => string;
}

/**
 * Export data array to CSV and trigger browser download
 * 
 * @param data - Array of objects to export
 * @param columns - Column definitions with header labels and data keys
 * @param filename - Name of the downloaded file (without .csv extension)
 */
export function exportToCSV(
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string = 'export'
): void {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Build CSV header row
  const headers = columns.map(col => escapeCSVField(col.header));
  
  // Build CSV data rows
  const rows = data.map(item =>
    columns.map(col => {
      const value = getNestedValue(item, col.key);
      const formatted = col.formatter ? col.formatter(value) : String(value ?? '');
      return escapeCSVField(formatted);
    })
  );

  // Combine into CSV string with BOM for Excel Arabic support
  const BOM = '\uFEFF';
  const csvContent = BOM + [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Escape a field for CSV format
 */
function escapeCSVField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Get nested value from object using dot notation
 * e.g., getNestedValue({ a: { b: 1 } }, 'a.b') => 1
 */
function getNestedValue(obj: Record<string, any>, key: string): any {
  return key.split('.').reduce((value, k) => value?.[k], obj);
}
