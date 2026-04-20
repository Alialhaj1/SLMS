/**
 * ============================================================================
 * §17.4 — usePrint Hook
 * ============================================================================
 * Print-friendly utility per §17.4: "Print-friendly styles لجميع الجداول والتقارير"
 *
 * Usage:
 *   const { printRef, handlePrint } = usePrint('Shipments Report');
 *
 *   <div ref={printRef}>
 *     <DataTable ... />
 *   </div>
 *   <Button onClick={handlePrint}>Print</Button>
 * ============================================================================
 */

import { useRef, useCallback } from 'react';

interface PrintOptions {
  /** Document title for the print window */
  title?: string;
  /** Additional CSS to inject */
  extraStyles?: string;
  /** Orientation: portrait or landscape */
  orientation?: 'portrait' | 'landscape';
  /** Paper size */
  paperSize?: 'A4' | 'Letter' | 'Legal';
}

interface UsePrintReturn {
  /** Ref to attach to the printable container */
  printRef: React.RefObject<HTMLDivElement>;
  /** Trigger print */
  handlePrint: () => void;
}

const DEFAULT_PRINT_STYLES = `
  @media print {
    @page {
      margin: 1cm;
    }
    
    body {
      font-family: 'Inter', 'Segoe UI', sans-serif;
      font-size: 11pt;
      color: #000 !important;
      background: #fff !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    /* Clean table formatting */
    table {
      width: 100% !important;
      border-collapse: collapse !important;
      page-break-inside: auto;
    }
    
    thead {
      display: table-header-group;
    }
    
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    
    th, td {
      border: 1px solid #d1d5db !important;
      padding: 6px 8px !important;
      text-align: start !important;
      font-size: 10pt;
    }
    
    th {
      background-color: #f3f4f6 !important;
      font-weight: 600 !important;
    }
    
    /* Stripe rows */
    tbody tr:nth-child(even) {
      background-color: #f9fafb !important;
    }
    
    /* Hide non-printable elements */
    .no-print,
    .sidebar,
    .header-nav,
    nav,
    button:not(.print-include),
    .modal-backdrop,
    .toast-container,
    [data-no-print] {
      display: none !important;
    }
    
    /* Status badges */
    .badge, [class*="badge"] {
      border: 1px solid #000 !important;
      background: transparent !important;
      color: #000 !important;
      padding: 1px 4px !important;
      border-radius: 2px !important;
    }
    
    /* Numbers in tables */
    td[data-type="number"],
    td[data-type="currency"] {
      text-align: right !important;
      font-variant-numeric: tabular-nums;
    }
    
    /* Print header */
    .print-header {
      text-align: center;
      margin-bottom: 20px;
    }
    .print-header h1 {
      font-size: 16pt;
      margin: 0;
    }
    .print-header .date {
      font-size: 9pt;
      color: #666;
    }
    
    /* Footer with page numbers */
    .print-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 8pt;
      color: #999;
    }
  }
`;

export function usePrint(options: PrintOptions = {}): UsePrintReturn {
  const printRef = useRef<HTMLDivElement>(null!);

  const handlePrint = useCallback(() => {
    const el = printRef.current;
    if (!el) return;

    const {
      title = document.title,
      extraStyles = '',
      orientation = 'portrait',
      paperSize = 'A4',
    } = options;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      // Fallback: use window.print() on current page
      window.print();
      return;
    }

    const orientationCSS = `
      @page {
        size: ${paperSize} ${orientation};
        margin: 1cm;
      }
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="auto">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          ${DEFAULT_PRINT_STYLES}
          ${orientationCSS}
          ${extraStyles}
          body { margin: 0; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>${title}</h1>
          <div class="date">${new Date().toLocaleDateString('ar-SA')} — ${new Date().toLocaleDateString('en-US')}</div>
        </div>
        ${el.innerHTML}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    // Wait for styles to load then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }, [options]);

  return { printRef, handlePrint };
}

export default usePrint;
