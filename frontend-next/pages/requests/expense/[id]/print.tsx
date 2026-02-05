/**
 * Expense Request Print Page
 * Uses window.open with document.write for reliable printing
 * Supports RTL/LTR based on user language
 * A4 optimized layout
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useLocale } from '../../../../contexts/LocaleContext';

interface ExpenseRequest {
  id: number;
  request_number: string;
  request_date: string;
  project_name: string;
  project_code: string;
  shipment_number: string;
  shipment_bl_number: string;
  vendor_po_number: string;
  shipment_vendor_name: string;
  shipment_vendor_name_ar: string;
  expense_type_name: string;
  expense_type_name_ar: string;
  vendor_name: string;
  vendor_name_ar: string;
  total_amount: number;
  currency_code: string;
  currency_symbol: string;
  status_name: string;
  status_name_ar: string;
  notes: string;
  bl_number: string;
  requested_by_name: string;
  approved_by_name: string;
  source_type?: string;
  source_invoice_number?: string;
  source_invoice_date?: string;
  source_entity_name?: string;
  source_description?: string;
  source_bl_number?: string;
  source_bank_name?: string;
  source_lc_number?: string;
  source_receipt_number?: string;
  source_payment_reference?: string;
  source_insurance_company?: string;
  source_insurance_company_ar?: string;
  source_shipping_agent?: string;
  source_shipping_agent_ar?: string;
  source_shipping_company?: string;
  source_shipping_company_ar?: string;
  source_clearance_office?: string;
  source_clearance_office_ar?: string;
  shipment_items?: Array<{
    id: number;
    item_code: string;
    item_name: string;
    item_name_ar: string;
    quantity: number;
    unit_cost: number;
    uom_code: string;
    uom_name: string;
  }>;
}

interface CompanyInfo {
  name: string;
  name_ar: string;
  tax_number: string;
  registration_number: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo: string;
}

// Currency names for amount in words
const currencyNames: { [key: string]: { ar: string; arPlural: string; arSubunit: string; en: string; enPlural: string; enSubunit: string } } = {
  SAR: { ar: 'ريال سعودي', arPlural: 'ريال سعودي', arSubunit: 'هللة', en: 'Saudi Riyal', enPlural: 'Saudi Riyals', enSubunit: 'Halala' },
  USD: { ar: 'دولار أمريكي', arPlural: 'دولار أمريكي', arSubunit: 'سنت', en: 'US Dollar', enPlural: 'US Dollars', enSubunit: 'Cent' },
  EUR: { ar: 'يورو', arPlural: 'يورو', arSubunit: 'سنت', en: 'Euro', enPlural: 'Euros', enSubunit: 'Cent' },
  GBP: { ar: 'جنيه إسترليني', arPlural: 'جنيه إسترليني', arSubunit: 'بنس', en: 'British Pound', enPlural: 'British Pounds', enSubunit: 'Pence' },
  AED: { ar: 'درهم إماراتي', arPlural: 'درهم إماراتي', arSubunit: 'فلس', en: 'UAE Dirham', enPlural: 'UAE Dirhams', enSubunit: 'Fils' },
  CNY: { ar: 'يوان صيني', arPlural: 'يوان صيني', arSubunit: 'فن', en: 'Chinese Yuan', enPlural: 'Chinese Yuan', enSubunit: 'Fen' },
  INR: { ar: 'روبية هندية', arPlural: 'روبية هندية', arSubunit: 'بيسة', en: 'Indian Rupee', enPlural: 'Indian Rupees', enSubunit: 'Paisa' },
};

function convertNumberToArabic(num: number): string {
  if (num === 0) return '';
  
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  
  let result = '';
  
  // Handle millions (1,000,000 - 999,999,999)
  if (num >= 1000000) {
    const millions = Math.floor(num / 1000000);
    if (millions === 1) {
      result += 'مليون';
    } else if (millions === 2) {
      result += 'مليونان';
    } else if (millions >= 3 && millions <= 10) {
      result += convertNumberToArabic(millions) + ' ملايين';
    } else {
      result += convertNumberToArabic(millions) + ' مليون';
    }
    num = num % 1000000;
    if (num > 0) result += ' و';
  }
  
  // Handle thousands (1,000 - 999,999)
  if (num >= 1000) {
    const th = Math.floor(num / 1000);
    if (th === 1) {
      result += 'ألف';
    } else if (th === 2) {
      result += 'ألفان';
    } else if (th >= 3 && th <= 10) {
      result += convertNumberToArabic(th) + ' آلاف';
    } else if (th >= 11) {
      result += convertNumberToArabic(th) + ' ألف';
    }
    num = num % 1000;
    if (num > 0) result += ' و';
  }
  
  // Handle hundreds (100 - 999)
  if (num >= 100) {
    result += hundreds[Math.floor(num / 100)];
    num = num % 100;
    if (num > 0) result += ' و';
  }
  
  // Handle tens and ones (1 - 99)
  if (num >= 10 && num < 20) {
    result += teens[num - 10];
  } else if (num >= 20) {
    const onesDigit = num % 10;
    const tensDigit = Math.floor(num / 10);
    if (onesDigit > 0) {
      result += ones[onesDigit] + ' و';
    }
    result += tens[tensDigit];
  } else if (num > 0) {
    result += ones[num];
  }
  
  return result.trim();
}

function numberToArabicWords(num: number, currencyCode: string = 'SAR'): string {
  const currency = currencyNames[currencyCode] || currencyNames['SAR'];

  if (num === 0) return 'صفر ' + currency.ar + ' فقط لا غير';
  if (num < 0) return 'سالب ' + numberToArabicWords(Math.abs(num), currencyCode);

  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);
  
  let result = convertNumberToArabic(intPart);
  
  if (result) {
    result += ' ' + currency.ar;
    if (decPart > 0) {
      result += ' و' + decPart + ' ' + currency.arSubunit;
    }
    result += ' فقط لا غير';
  }
  
  return result;
}

function numberToEnglishWords(num: number, currencyCode: string = 'SAR'): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  const currency = currencyNames[currencyCode] || currencyNames['SAR'];

  if (num === 0) return 'Zero';
  if (num < 0) return 'Negative ' + numberToEnglishWords(Math.abs(num), currencyCode);

  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);

  const convert = (n: number): string => {
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
    if (n < 1000000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    return convert(Math.floor(n / 1000000)) + ' Million' + (n % 1000000 ? ' ' + convert(n % 1000000) : '');
  };

  let result = convert(intPart) + ' ' + (intPart === 1 ? currency.en : currency.enPlural);
  if (decPart > 0) result += ' and ' + decPart + ' ' + currency.enSubunit + (decPart > 1 ? 's' : '');
  return result + ' Only';
}

export default function ExpenseRequestPrintPage() {
  const router = useRouter();
  const { id } = router.query;
  const { locale } = useLocale();
  const isRTL = locale === 'ar';
  
  const [request, setRequest] = useState<ExpenseRequest | null>(null);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUser(user.full_name || user.email || 'Unknown');
      } catch { setCurrentUser('Unknown'); }
    }
  }, []);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch('/api/master/companies', {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.data?.length > 0) setCompany(data.data[0]);
        }
      } catch (err) { console.error('Failed to fetch company:', err); }
    };
    fetchCompany();
  }, []);

  useEffect(() => {
    if (!id) return;
    const fetchRequest = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`/api/expense-requests/${id}`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to fetch expense request');
        const data = await response.json();
        setRequest(data);
      } catch (err: any) { setError(err.message); }
      finally { setLoading(false); }
    };
    fetchRequest();
  }, [id]);

  const formatDate = (date: string) => date ? new Date(date).toLocaleDateString('en-GB') : '-';
  const formatAmount = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return isNaN(num) ? '0.00' : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Get entity name dynamically based on expense type
  const getEntityInfo = () => {
    if (!request) return null;
    if (request.source_bank_name) return { name: request.source_bank_name, extra: request.source_lc_number ? `LC: ${request.source_lc_number}` : '' };
    if (request.source_insurance_company) return { name: isRTL ? (request.source_insurance_company_ar || request.source_insurance_company) : request.source_insurance_company, extra: '' };
    if (request.source_shipping_agent) return { name: isRTL ? (request.source_shipping_agent_ar || request.source_shipping_agent) : request.source_shipping_agent, extra: '' };
    if (request.source_shipping_company) return { name: isRTL ? (request.source_shipping_company_ar || request.source_shipping_company) : request.source_shipping_company, extra: '' };
    if (request.source_clearance_office) return { name: isRTL ? (request.source_clearance_office_ar || request.source_clearance_office) : request.source_clearance_office, extra: '' };
    if (request.source_entity_name) return { name: request.source_entity_name, extra: '' };
    return null;
  };

  const handlePrint = () => {
    if (!request) return;

    const now = new Date();
    const printDate = now.toLocaleDateString('en-GB');
    const printTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const amountNum = typeof request.total_amount === 'string' ? parseFloat(request.total_amount) : request.total_amount;
    const blNumber = request.source_bl_number || request.bl_number || request.shipment_bl_number;
    const entity = getEntityInfo();
    const logoUrl = company?.logo || '';
    const shipmentItems = request.shipment_items || [];
    const currencyCode = request.currency_code || 'SAR';
    
    // Get receipt/payment reference
    const receiptNumber = request.source_receipt_number || request.source_payment_reference;

    // Direction based on locale
    const dir = isRTL ? 'rtl' : 'ltr';
    const textAlign = isRTL ? 'right' : 'left';
    const textAlignOpposite = isRTL ? 'left' : 'right';

    // Build items HTML
    let itemsHtml = '';
    if (shipmentItems.length > 0) {
      const headerCells = isRTL ? `
        <th style="padding:5px;border:1px solid #ccc;font-size:11px;">الإجمالي</th>
        <th style="padding:5px;border:1px solid #ccc;font-size:11px;">السعر</th>
        <th style="padding:5px;border:1px solid #ccc;font-size:11px;">الوحدة</th>
        <th style="padding:5px;border:1px solid #ccc;font-size:11px;">الكمية</th>
        <th style="padding:5px;border:1px solid #ccc;font-size:11px;">الصنف / Item</th>
        <th style="padding:5px;border:1px solid #ccc;font-size:11px;">الكود</th>
        <th style="padding:5px;border:1px solid #ccc;font-size:11px;">#</th>
      ` : `
        <th style="padding:5px;border:1px solid #ccc;font-size:11px;">#</th>
        <th style="padding:5px;border:1px solid #ccc;font-size:11px;">Code</th>
        <th style="padding:5px;border:1px solid #ccc;font-size:11px;">Item</th>
        <th style="padding:5px;border:1px solid #ccc;font-size:11px;">Qty</th>
        <th style="padding:5px;border:1px solid #ccc;font-size:11px;">Unit</th>
        <th style="padding:5px;border:1px solid #ccc;font-size:11px;">Price</th>
        <th style="padding:5px;border:1px solid #ccc;font-size:11px;">Total</th>
      `;

      const itemRows = shipmentItems.map((item, idx) => {
        const cells = isRTL ? `
          <td style="padding:4px;border:1px solid #ccc;text-align:center;font-size:11px;font-weight:500;">${formatAmount((item.quantity || 0) * (item.unit_cost || 0))}</td>
          <td style="padding:4px;border:1px solid #ccc;text-align:center;font-size:11px;">${formatAmount(item.unit_cost || 0)}</td>
          <td style="padding:4px;border:1px solid #ccc;text-align:center;font-size:11px;">${item.uom_code || item.uom_name || '-'}</td>
          <td style="padding:4px;border:1px solid #ccc;text-align:center;font-size:11px;">${item.quantity}</td>
          <td style="padding:4px;border:1px solid #ccc;font-size:11px;text-align:right;">${item.item_name_ar || item.item_name}</td>
          <td style="padding:4px;border:1px solid #ccc;text-align:center;font-size:11px;">${item.item_code || '-'}</td>
          <td style="padding:4px;border:1px solid #ccc;text-align:center;font-size:11px;">${idx + 1}</td>
        ` : `
          <td style="padding:4px;border:1px solid #ccc;text-align:center;font-size:11px;">${idx + 1}</td>
          <td style="padding:4px;border:1px solid #ccc;text-align:center;font-size:11px;">${item.item_code || '-'}</td>
          <td style="padding:4px;border:1px solid #ccc;font-size:11px;text-align:left;">${item.item_name}</td>
          <td style="padding:4px;border:1px solid #ccc;text-align:center;font-size:11px;">${item.quantity}</td>
          <td style="padding:4px;border:1px solid #ccc;text-align:center;font-size:11px;">${item.uom_code || item.uom_name || '-'}</td>
          <td style="padding:4px;border:1px solid #ccc;text-align:center;font-size:11px;">${formatAmount(item.unit_cost || 0)}</td>
          <td style="padding:4px;border:1px solid #ccc;text-align:center;font-size:11px;font-weight:500;">${formatAmount((item.quantity || 0) * (item.unit_cost || 0))}</td>
        `;
        return `<tr>${cells}</tr>`;
      }).join('');

      itemsHtml = `
        <tr>
          <td colspan="2" style="padding:0;">
            <div style="background:#e3f2fd;padding:5px 10px;border-bottom:1px solid #ccc;text-align:${textAlign};">
              <strong style="color:#1565c0;">${isRTL ? 'أصناف الشحنة / Shipment Items' : 'Shipment Items / أصناف الشحنة'}</strong>
            </div>
            <table style="width:100%;border-collapse:collapse;" dir="${dir}">
              <thead>
                <tr style="background:#e3f2fd;">${headerCells}</tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>
          </td>
        </tr>
      `;
    }

    // Build the complete HTML document
    const html = `
<!DOCTYPE html>
<html dir="${dir}">
<head>
  <meta charset="UTF-8">
  <title>${isRTL ? 'طلب مصروف' : 'Expense Request'} - ${request.request_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Tahoma, sans-serif; font-size: 13px; background: white; }
    @page { size: A4 portrait; margin: 10mm; }
    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .container { border: 2px solid #000 !important; }
      .no-print { display: none !important; }
    }
    table { border-collapse: collapse; width: 100%; }
    .container { 
      width: 190mm; 
      min-height: 277mm;
      margin: 0 auto; 
      border: 2px solid #000;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .content { flex: 1; }
    .header-cell { padding: 10px; vertical-align: top; }
    .title-bar { background: #1e3a5f; color: white; padding: 10px; text-align: center; }
    .row td { padding: 8px 10px; border-bottom: 1px solid #ccc; }
    .label { background: #f0f0f0; font-weight: bold; width: 35%; border-${isRTL ? 'left' : 'right'}: 1px solid #ccc; text-align: ${textAlign}; }
    .value { text-align: center; }
    .amount-row { background: #fffde7; }
    .amount-label { background: #fff59d; font-weight: bold; font-size: 14px; }
    .amount-value { font-size: 18px; font-weight: bold; color: #2e7d32; }
    .sig-cell { padding: 15px; text-align: center; vertical-align: top; width: 33.33%; }
    .footer-wrapper {
      border-top: 2px solid #000;
      background: #f5f5f5;
    }
    .footer-company { padding: 8px 10px; text-align: center; border-bottom: 1px solid #ddd; }
    .footer-print-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 15px;
      font-size: 10px;
      color: #666;
    }
    .footer-left { text-align: ${textAlignOpposite}; }
    .footer-center { text-align: center; flex: 1; }
    .footer-right { text-align: ${textAlign}; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <!-- Header -->
      <table style="border-bottom:2px solid #000;">
        <tr>
          <td class="header-cell" style="width:35%;text-align:${isRTL ? 'right' : 'left'};" dir="${isRTL ? 'rtl' : 'ltr'}">
            <div style="font-size:15px;font-weight:bold;">${isRTL ? (company?.name_ar || 'اسم الشركة') : (company?.name || 'Company Name')}</div>
            <div style="font-size:11px;color:#555;margin-top:3px;">${isRTL ? 'سجل تجاري:' : 'C.R. No:'} ${company?.registration_number || '-'}</div>
            <div style="font-size:11px;color:#555;">${isRTL ? 'الرقم الضريبي:' : 'VAT No:'} ${company?.tax_number || '-'}</div>
          </td>
          <td class="header-cell" style="width:30%;text-align:center;">
            <div style="width:80px;height:80px;margin:0 auto;border:1px solid #ccc;border-radius:5px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#fafafa;">
              ${logoUrl ? `<img src="${logoUrl}" style="max-width:100%;max-height:100%;" onerror="this.style.display='none'">` : '<span style="color:#999;font-weight:bold;">LOGO</span>'}
            </div>
          </td>
          <td class="header-cell" style="width:35%;text-align:${isRTL ? 'left' : 'right'};" dir="${isRTL ? 'ltr' : 'rtl'}">
            <div style="font-size:15px;font-weight:bold;">${isRTL ? (company?.name || 'Company Name') : (company?.name_ar || 'اسم الشركة')}</div>
            <div style="font-size:11px;color:#555;margin-top:3px;">${isRTL ? 'C.R. No:' : 'سجل تجاري:'} ${company?.registration_number || '-'}</div>
            <div style="font-size:11px;color:#555;">${isRTL ? 'VAT No:' : 'الرقم الضريبي:'} ${company?.tax_number || '-'}</div>
          </td>
        </tr>
      </table>

      <!-- Title -->
      <div class="title-bar">
        <div style="font-size:15px;font-weight:bold;">
          ${isRTL 
            ? `طلب سداد / تحويل – ${request.expense_type_name_ar || request.expense_type_name}` 
            : `Payment / Transfer Request – ${request.expense_type_name}`}
        </div>
        <div style="font-size:13px;margin-top:2px;">
          ${isRTL 
            ? `Payment / Transfer Request – ${request.expense_type_name}` 
            : `طلب سداد / تحويل – ${request.expense_type_name_ar || request.expense_type_name}`}
        </div>
      </div>

      <!-- Request Info -->
      <table style="border-bottom:1px solid #999;">
        <tr>
          <td style="width:50%;padding:8px 10px;border-${isRTL ? 'left' : 'right'}:1px solid #999;background:#f9f9f9;">
            <strong>${isRTL ? 'رقم الطلب / Request No:' : 'Request No / رقم الطلب:'}</strong> 
            <span style="color:#1565c0;font-weight:bold;">${request.request_number}</span>
          </td>
          <td style="width:50%;padding:8px 10px;background:#f9f9f9;">
            <strong>${isRTL ? 'التاريخ / Date:' : 'Date / التاريخ:'}</strong> ${formatDate(request.request_date)}
          </td>
        </tr>
      </table>

      <!-- Details -->
      <table dir="${dir}">
        <tr class="row">
          <td class="label">${isRTL ? 'رقم المشروع / Project' : 'Project / رقم المشروع'}</td>
          <td class="value">${request.project_name || '-'} ${request.project_code ? `(${request.project_code})` : ''}</td>
        </tr>
        <tr class="row">
          <td class="label">${isRTL ? 'رقم الشحنة / Shipment' : 'Shipment / رقم الشحنة'}</td>
          <td class="value">${request.shipment_number || '-'}</td>
        </tr>
        ${request.vendor_po_number ? `
        <tr class="row">
          <td class="label">${isRTL ? 'رقم أمر شراء المورد / Vendor PO' : 'Vendor PO / رقم أمر شراء المورد'}</td>
          <td class="value" style="color:#1565c0;font-weight:500;">${request.vendor_po_number}</td>
        </tr>` : ''}
        ${request.source_invoice_number ? `
        <tr class="row">
          <td class="label">${isRTL ? 'رقم الفاتورة وتاريخها / Invoice' : 'Invoice / رقم الفاتورة وتاريخها'}</td>
          <td class="value">
            <strong>${request.source_invoice_number}</strong> 
            ${request.source_invoice_date ? `<span style="color:#666;margin-${isRTL ? 'right' : 'left'}:10px;">(${formatDate(request.source_invoice_date)})</span>` : ''}
          </td>
        </tr>` : ''}
        ${receiptNumber ? `
        <tr class="row">
          <td class="label">${isRTL ? 'رقم السداد / الإيصال / Receipt No' : 'Receipt No / رقم السداد'}</td>
          <td class="value" style="color:#2e7d32;font-weight:500;">${receiptNumber}</td>
        </tr>` : ''}
        ${entity ? `
        <tr class="row">
          <td class="label">${isRTL ? 'الجهة / Entity' : 'Entity / الجهة'}</td>
          <td class="value">${entity.name} ${entity.extra ? `<span style="color:#666;margin-${isRTL ? 'right' : 'left'}:10px;">${entity.extra}</span>` : ''}</td>
        </tr>` : ''}
        ${request.source_description ? `
        <tr class="row">
          <td class="label">${isRTL ? 'البيان / Description' : 'Description / البيان'}</td>
          <td style="padding:8px 10px;text-align:${textAlign};">${request.source_description}</td>
        </tr>` : ''}
        ${blNumber ? `
        <tr class="row">
          <td class="label">${isRTL ? 'رقم البوليصة / BL No' : 'BL No / رقم البوليصة'}</td>
          <td class="value">${blNumber}</td>
        </tr>` : ''}
        ${(request.shipment_vendor_name || request.shipment_vendor_name_ar) ? `
        <tr class="row">
          <td class="label">${isRTL ? 'مورد الشحنة / Supplier' : 'Supplier / مورد الشحنة'}</td>
          <td class="value">${isRTL ? (request.shipment_vendor_name_ar || request.shipment_vendor_name) : (request.shipment_vendor_name || request.shipment_vendor_name_ar)}</td>
        </tr>` : ''}
        <tr class="row">
          <td class="label">${isRTL ? 'نوع المصروف / Expense Type' : 'Expense Type / نوع المصروف'}</td>
          <td class="value">${isRTL ? (request.expense_type_name_ar || request.expense_type_name) : (request.expense_type_name || request.expense_type_name_ar)}</td>
        </tr>
        ${itemsHtml}
        <tr class="row">
          <td class="label">${isRTL ? 'العملة / Currency' : 'Currency / العملة'}</td>
          <td class="value">${currencyCode} ${request.currency_symbol ? `(${request.currency_symbol})` : ''}</td>
        </tr>
        <tr class="row amount-row">
          <td class="label amount-label">${isRTL ? 'إجمالي المبلغ / Total' : 'Total / إجمالي المبلغ'}</td>
          <td class="value amount-value">${formatAmount(request.total_amount)} ${currencyCode}</td>
        </tr>
        <tr class="row">
          <td class="label">${isRTL ? 'المبلغ كتابةً (عربي)' : 'Amount in Words (AR)'}</td>
          <td style="padding:8px 10px;text-align:right;font-size:12px;" dir="rtl">${numberToArabicWords(amountNum, currencyCode)}</td>
        </tr>
        <tr class="row">
          <td class="label">${isRTL ? 'Amount in Words (EN)' : 'Amount in Words (EN)'}</td>
          <td style="padding:8px 10px;text-align:left;font-size:12px;" dir="ltr">${numberToEnglishWords(amountNum, currencyCode)}</td>
        </tr>
        ${request.notes ? `
        <tr class="row">
          <td class="label">${isRTL ? 'ملاحظات / Notes' : 'Notes / ملاحظات'}</td>
          <td style="padding:8px 10px;font-size:12px;text-align:${textAlign};">${request.notes}</td>
        </tr>` : ''}
      </table>

      <!-- Signatures -->
      <table style="border-top:2px solid #000;margin-top:10px;" dir="${dir}">
        <tr>
          <td class="sig-cell" style="border-${isRTL ? 'left' : 'right'}:1px solid #999;">
            <div style="font-weight:bold;font-size:12px;">${isRTL ? 'مقدم الطلب' : 'Requested By'}</div>
            <div style="font-size:10px;color:#666;margin-bottom:15px;">${isRTL ? 'Requested By' : 'مقدم الطلب'}</div>
            <div style="font-size:12px;">${request.requested_by_name || '-'}</div>
            <div style="border-top:1px solid #999;margin-top:30px;padding-top:5px;font-size:10px;color:#666;">${isRTL ? 'التوقيع / Signature' : 'Signature / التوقيع'}</div>
          </td>
          <td class="sig-cell" style="border-${isRTL ? 'left' : 'right'}:1px solid #999;">
            <div style="font-weight:bold;font-size:12px;">${isRTL ? 'مراجعة المدير' : 'Manager Review'}</div>
            <div style="font-size:10px;color:#666;margin-bottom:15px;">${isRTL ? 'Manager Review' : 'مراجعة المدير'}</div>
            <div style="font-size:12px;">${request.approved_by_name || '-'}</div>
            <div style="border-top:1px solid #999;margin-top:30px;padding-top:5px;font-size:10px;color:#666;">${isRTL ? 'التوقيع / Signature' : 'Signature / التوقيع'}</div>
          </td>
          <td class="sig-cell">
            <div style="font-weight:bold;font-size:12px;">${isRTL ? 'الاعتماد' : 'Approval'}</div>
            <div style="font-size:10px;color:#666;margin-bottom:15px;">${isRTL ? 'Approval' : 'الاعتماد'}</div>
            <div style="font-size:12px;">-</div>
            <div style="border-top:1px solid #999;margin-top:30px;padding-top:5px;font-size:10px;color:#666;">${isRTL ? 'التوقيع / Signature' : 'Signature / التوقيع'}</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Footer - Fixed at bottom -->
    <div class="footer-wrapper">
      ${company?.address || company?.email || company?.website || company?.phone ? `
      <div class="footer-company">
        ${company?.address ? `<div style="font-size:10px;color:#444;">${company.address.replace(/\n/g, ' | ')}</div>` : ''}
        <div style="font-size:10px;color:#1565c0;margin-top:3px;">
          ${[company?.email, company?.website, company?.phone ? `Tel: ${company.phone}` : ''].filter(Boolean).join(' | ')}
        </div>
      </div>` : ''}
      <div class="footer-print-info">
        <div class="footer-right">
          ${isRTL ? `طُبع بواسطة: ${currentUser}` : `Printed by: ${currentUser}`}
        </div>
        <div class="footer-center">
          ${isRTL ? 'صفحة 1 من 1' : 'Page 1 of 1'}
        </div>
        <div class="footer-left">
          ${isRTL ? `تاريخ الطباعة: ${printDate} - ${printTime}` : `Print Date: ${printDate} - ${printTime}`}
        </div>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 300);
    };
  </script>
</body>
</html>
`;

    // Open new window and write HTML
    const printWindow = window.open('', '_blank', 'width=850,height=1100');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>جاري التحميل... / Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial' }}>
        <div style={{ textAlign: 'center', color: 'red' }}>
          <div style={{ fontSize: '18px' }}>{error || 'لم يتم العثور على الطلب / Request not found'}</div>
          <button onClick={() => router.back()} style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}>رجوع / Back</button>
        </div>
      </div>
    );
  }

  // Preview data
  const entity = getEntityInfo();
  const blNumber = request.source_bl_number || request.bl_number || request.shipment_bl_number;
  const receiptNumber = request.source_receipt_number || request.source_payment_reference;

  return (
    <>
      <Head>
        <title>{isRTL ? 'طلب مصروف' : 'Expense Request'} - {request.request_number}</title>
      </Head>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }} dir={isRTL ? 'rtl' : 'ltr'}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>{isRTL ? 'معاينة طلب المصروف' : 'Expense Request Preview'}</h1>
          <p style={{ color: '#666' }}>{isRTL ? 'Expense Request Preview' : 'معاينة طلب المصروف'}</p>
        </div>

        <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px', fontWeight: 'bold' }}>{isRTL ? 'رقم الطلب:' : 'Request No:'}</td>
                <td style={{ padding: '8px' }}>{request.request_number}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', fontWeight: 'bold' }}>{isRTL ? 'نوع المصروف:' : 'Expense Type:'}</td>
                <td style={{ padding: '8px' }}>{isRTL ? (request.expense_type_name_ar || request.expense_type_name) : (request.expense_type_name || request.expense_type_name_ar)}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', fontWeight: 'bold' }}>{isRTL ? 'المبلغ:' : 'Amount:'}</td>
                <td style={{ padding: '8px', fontSize: '18px', color: 'green', fontWeight: 'bold' }}>{formatAmount(request.total_amount)} {request.currency_code}</td>
              </tr>
              {request.source_invoice_number && (
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>{isRTL ? 'رقم الفاتورة:' : 'Invoice No:'}</td>
                  <td style={{ padding: '8px' }}>{request.source_invoice_number}</td>
                </tr>
              )}
              {receiptNumber && (
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>{isRTL ? 'رقم السداد/الإيصال:' : 'Receipt No:'}</td>
                  <td style={{ padding: '8px', color: '#2e7d32' }}>{receiptNumber}</td>
                </tr>
              )}
              {entity && (
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>{isRTL ? 'الجهة:' : 'Entity:'}</td>
                  <td style={{ padding: '8px' }}>{entity.name}</td>
                </tr>
              )}
              {blNumber && (
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>{isRTL ? 'رقم البوليصة:' : 'BL No:'}</td>
                  <td style={{ padding: '8px' }}>{blNumber}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handlePrint}
            style={{
              padding: '15px 40px',
              fontSize: '18px',
              background: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginLeft: isRTL ? '0' : '10px',
              marginRight: isRTL ? '10px' : '0'
            }}
          >
            🖨️ {isRTL ? 'طباعة / Print' : 'Print / طباعة'}
          </button>
          <button
            onClick={() => router.back()}
            style={{
              padding: '15px 40px',
              fontSize: '18px',
              background: '#e0e0e0',
              color: '#333',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            {isRTL ? '← رجوع / Back' : 'Back / رجوع →'}
          </button>
        </div>
      </div>
    </>
  );
}
