/**
 * Transfer Request Print Page
 * صفحة طباعة طلب التحويل
 * Uses window.open with document.write for reliable printing
 * Supports RTL/LTR based on user language
 * A4 optimized layout
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useLocale } from '../../../../contexts/LocaleContext';

interface TransferRequest {
  id: number;
  request_number: string;
  request_date: string;
  project_name: string;
  project_code: string;
  shipment_number: string;
  expense_type_name: string;
  expense_type_name_ar: string;
  vendor_name: string;
  vendor_name_ar: string;
  vendor_code: string;
  transfer_amount: number;
  currency_code: string;
  currency_symbol: string;
  status_name: string;
  status_name_ar: string;
  notes: string;
  bank_name: string;
  bank_account_number: string;
  iban: string;
  swift_code: string;
  beneficiary_name: string;
  transaction_reference: string;
  requested_by_name: string;
  approved_by_name: string;
  expense_request_number: string;
  vendor_payment_number?: string;
  vendor_payment_amount?: number;
  transfer_type?: string;
  source_type?: string;
  payment_source_type?: string;
  // PO related fields
  po_number?: string;
  po_vendor_reference?: string;
  po_total_amount?: number;
  po_paid_before?: number;
  effective_po_id?: number;
  calculated_total?: number;
  // Vendor bank info (fallback if no bank_account_id on request)
  vendor_bank_name?: string;
  vendor_bank_account?: string;
  vendor_iban?: string;
  vendor_swift?: string;
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

// Improved Arabic number to words function
function numberToArabicWords(num: number, currencyCode: string = 'SAR'): string {
  const currency = currencyNames[currencyCode] || currencyNames['SAR'];
  
  if (num === 0) return 'صفر ' + currency.ar + ' فقط لا غير';
  if (num < 0) return 'سالب ' + numberToArabicWords(Math.abs(num), currencyCode);

  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);

  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return '';
    
    let result = '';
    
    // Hundreds
    if (n >= 100) {
      result += hundreds[Math.floor(n / 100)] + ' ';
      n = n % 100;
    }
    
    // Tens and ones
    if (n >= 10 && n < 20) {
      result += teens[n - 10] + ' ';
    } else {
      const onesDigit = n % 10;
      const tensDigit = Math.floor(n / 10);
      
      if (onesDigit > 0) {
        result += ones[onesDigit] + ' ';
      }
      if (tensDigit >= 2) {
        result += (onesDigit > 0 ? 'و' : '') + tens[tensDigit] + ' ';
      }
    }
    
    return result.trim();
  };

  let result = '';
  let remaining = intPart;

  // Millions
  if (remaining >= 1000000) {
    const millions = Math.floor(remaining / 1000000);
    if (millions === 1) {
      result += 'مليون ';
    } else if (millions === 2) {
      result += 'مليونان ';
    } else if (millions >= 3 && millions <= 10) {
      result += convertLessThanThousand(millions) + ' ملايين ';
    } else {
      result += convertLessThanThousand(millions) + ' مليون ';
    }
    remaining = remaining % 1000000;
  }

  // Thousands
  if (remaining >= 1000) {
    const thousands = Math.floor(remaining / 1000);
    if (thousands === 1) {
      result += 'ألف ';
    } else if (thousands === 2) {
      result += 'ألفان ';
    } else if (thousands >= 3 && thousands <= 10) {
      result += convertLessThanThousand(thousands) + ' آلاف ';
    } else {
      result += convertLessThanThousand(thousands) + ' ألف ';
    }
    remaining = remaining % 1000;
  }

  // Remainder (less than 1000)
  if (remaining > 0) {
    if (result) result += 'و';
    result += convertLessThanThousand(remaining) + ' ';
  }

  result = result.trim();
  result += ' ' + currency.ar;
  
  if (decPart > 0) {
    result += ' و ' + decPart + ' ' + currency.arSubunit;
  }
  
  result += ' فقط لا غير';
  
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

export default function TransferRequestPrintPage() {
  const router = useRouter();
  const { id } = router.query;
  const { locale } = useLocale();
  const isRTL = locale === 'ar';
  
  const [request, setRequest] = useState<TransferRequest | null>(null);
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
        const response = await fetch(`/api/transfer-requests/${id}`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to fetch transfer request');
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

  const handlePrint = () => {
    if (!request) return;

    const now = new Date();
    const printDate = now.toLocaleDateString('en-GB');
    const printTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const amountNum = typeof request.transfer_amount === 'string' ? parseFloat(request.transfer_amount) : request.transfer_amount;
    const logoUrl = company?.logo || '';
    const currencyCode = request.currency_code || 'SAR';
    
    // Transfer type label
    const transferTypeLabel = request.vendor_payment_number 
      ? (isRTL ? 'دفعة مورد' : 'Vendor Payment')
      : (isRTL ? 'طلب مصروفات' : 'Expense Request');
    
    // Calculate balances - use PO total if available, otherwise calculated_total
    const totalCommitment = parseFloat(String(request.po_total_amount || request.calculated_total || 0));
    const paidBefore = parseFloat(String(request.po_paid_before || 0));
    const thisPayment = parseFloat(String(request.vendor_payment_amount || request.transfer_amount || 0));
    const balanceBefore = totalCommitment - paidBefore;
    const balanceAfter = balanceBefore - thisPayment;
    const hasPO = !!request.po_total_amount || !!request.effective_po_id;
    
    // Build balance table HTML (show if we have payment data)
    const showBalanceTable = request.vendor_payment_number || totalCommitment > 0;
    const balanceTableHtml = showBalanceTable ? `
      <table class="balance-table" style="margin-top:8px;">
        <tr class="header-row">
          <td>${hasPO ? (isRTL ? 'إجمالي أمر الشراء' : 'PO Total') : (isRTL ? 'إجمالي الالتزام' : 'Total Commitment')}</td>
          <td>${isRTL ? 'المدفوع سابقاً' : 'Paid Before'}</td>
          <td>${isRTL ? 'مبلغ هذا التحويل' : 'This Transfer'}</td>
          <td>${isRTL ? 'الرصيد قبل' : 'Balance Before'}</td>
          <td>${isRTL ? 'الرصيد بعد' : 'Balance After'}</td>
        </tr>
        <tr>
          <td><strong>${formatAmount(totalCommitment)} ${currencyCode}</strong></td>
          <td>${formatAmount(paidBefore)} ${currencyCode}</td>
          <td style="background:#fff3e0;"><strong>${formatAmount(thisPayment)} ${currencyCode}</strong></td>
          <td>${formatAmount(balanceBefore)} ${currencyCode}</td>
          <td style="background:${balanceAfter <= 0 ? '#e8f5e9' : '#fff'};">${formatAmount(balanceAfter)} ${currencyCode}</td>
        </tr>
      </table>
    ` : '';

    // Direction based on locale
    const dir = isRTL ? 'rtl' : 'ltr';
    const textAlign = isRTL ? 'right' : 'left';
    const textAlignOpposite = isRTL ? 'left' : 'right';

    const printHtml = `
      <!DOCTYPE html>
      <html dir="${dir}">
      <head>
        <meta charset="UTF-8">
        <title>${isRTL ? 'طلب تحويل' : 'Transfer Request'} - ${request.request_number}</title>
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
          .bank-section { background: #fff8e1; border: 1px solid #ffc107; margin: 10px; border-radius: 4px; }
          .bank-section td { padding: 6px 10px; border-bottom: 1px solid #ffe082; }
          .po-section { background: #f3e5f5; border: 1px solid #ce93d8; margin: 10px; border-radius: 4px; }
          .po-section td { padding: 6px 10px; border-bottom: 1px solid #e1bee7; }
          .balance-table { width: 100%; margin: 0; }
          .balance-table td { border: 1px solid #ddd; padding: 6px; text-align: center; font-size: 11px; }
          .balance-table .header-row { background: #e1bee7; font-weight: bold; }
          .print-btn { 
            position: fixed; 
            top: 20px; 
            ${isRTL ? 'left' : 'right'}: 20px; 
            padding: 10px 25px; 
            background: #1976d2; 
            color: white; 
            border: none; 
            border-radius: 5px; 
            cursor: pointer; 
            font-size: 14px;
            z-index: 1000;
          }
          .print-btn:hover { background: #1565c0; }
        </style>
      </head>
      <body>
        <button class="print-btn no-print" onclick="window.print()">${isRTL ? '🖨️ طباعة' : '🖨️ Print'}</button>
        
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
                ${isRTL ? 'طلب تحويل بنكي' : 'Bank Transfer Request'}
              </div>
              <div style="font-size:13px;margin-top:2px;">
                ${isRTL ? 'Bank Transfer Request' : 'طلب تحويل بنكي'}
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
                <td class="label">${isRTL ? 'المشروع / Project' : 'Project / المشروع'}</td>
                <td class="value">${request.project_name || '-'} ${request.project_code ? `(${request.project_code})` : ''}</td>
              </tr>
              <tr class="row">
                <td class="label">${isRTL ? 'رقم الشحنة / Shipment' : 'Shipment / رقم الشحنة'}</td>
                <td class="value">${request.shipment_number || '-'}</td>
              </tr>
              <tr class="row">
                <td class="label">${isRTL ? 'نوع المصروف / Expense Type' : 'Expense Type / نوع المصروف'}</td>
                <td class="value">${isRTL ? (request.expense_type_name_ar || request.expense_type_name) : request.expense_type_name}</td>
              </tr>
              ${request.expense_request_number ? `
              <tr class="row">
                <td class="label">${isRTL ? 'رقم طلب المصروف / Expense Req' : 'Expense Req / رقم طلب المصروف'}</td>
                <td class="value" style="color:#1565c0;font-weight:500;">${request.expense_request_number}</td>
              </tr>` : ''}
              ${request.vendor_payment_number ? `
              <tr class="row">
                <td class="label">${isRTL ? 'رقم دفعة المورد / Payment No' : 'Payment No / رقم دفعة المورد'}</td>
                <td class="value" style="color:#e65100;font-weight:500;">${request.vendor_payment_number}</td>
              </tr>` : ''}
            </table>

            <!-- Vendor & PO Section -->
            <div class="po-section">
              <table dir="${dir}" style="margin:0;">
                <tr>
                  <td colspan="2" style="background:#ce93d8;color:#4a148c;font-weight:bold;padding:8px 10px;text-align:${textAlign};border-bottom:1px solid #9c27b0;">
                    ${isRTL ? 'بيانات المورد وأمر الشراء / Vendor & PO Details' : 'Vendor & PO Details / بيانات المورد وأمر الشراء'}
                  </td>
                </tr>
                <tr>
                  <td style="width:50%;padding:8px 10px;border-${isRTL ? 'left' : 'right'}:1px solid #e1bee7;">
                    <div style="font-size:11px;color:#666;margin-bottom:2px;">${isRTL ? 'رقم المورد / Vendor Code' : 'Vendor Code / رقم المورد'}</div>
                    <div style="font-weight:bold;color:#4a148c;">${request.vendor_code || '-'}</div>
                  </td>
                  <td style="width:50%;padding:8px 10px;">
                    <div style="font-size:11px;color:#666;margin-bottom:2px;">${isRTL ? 'اسم المورد / Vendor Name' : 'Vendor Name / اسم المورد'}</div>
                    <div style="font-weight:bold;">${isRTL ? (request.vendor_name_ar || request.vendor_name) : request.vendor_name}</div>
                  </td>
                </tr>
                <tr>
                  <td style="width:50%;padding:8px 10px;border-${isRTL ? 'left' : 'right'}:1px solid #e1bee7;">
                    <div style="font-size:11px;color:#666;margin-bottom:2px;">${isRTL ? 'رقم أمر الشراء / PO Number' : 'PO Number / رقم أمر الشراء'}</div>
                    <div style="font-weight:bold;color:#1565c0;">${request.po_number || '-'}</div>
                  </td>
                  <td style="width:50%;padding:8px 10px;">
                    <div style="font-size:11px;color:#666;margin-bottom:2px;">${isRTL ? 'مرجع الدفعة / Payment Ref' : 'Payment Ref / مرجع الدفعة'}</div>
                    <div style="font-weight:bold;color:#e65100;">${request.po_vendor_reference || '-'}</div>
                  </td>
                </tr>
                ${request.po_total_amount ? `
                <tr>
                  <td colspan="2" style="padding:8px 10px;">
                    <table class="balance-table">
                      <tr class="header-row">
                        <td>${hasPO ? (isRTL ? 'إجمالي أمر الشراء' : 'PO Total') : (isRTL ? 'إجمالي الالتزام' : 'Total')}</td>
                        <td>${isRTL ? 'المدفوع سابقاً' : 'Paid Before'}</td>
                        <td>${isRTL ? 'هذا التحويل' : 'This Transfer'}</td>
                        <td>${isRTL ? 'الرصيد قبل' : 'Balance Before'}</td>
                        <td>${isRTL ? 'الرصيد بعد' : 'Balance After'}</td>
                      </tr>
                      <tr>
                        <td><strong>${formatAmount(totalCommitment)} ${currencyCode}</strong></td>
                        <td>${formatAmount(paidBefore)} ${currencyCode}</td>
                        <td style="background:#fff3e0;"><strong>${formatAmount(thisPayment)} ${currencyCode}</strong></td>
                        <td>${formatAmount(balanceBefore)} ${currencyCode}</td>
                        <td style="background:${balanceAfter <= 0 ? '#c8e6c9' : '#fff'};">${formatAmount(balanceAfter)} ${currencyCode}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ` : ''}
              </table>
            </div>

            <!-- Amount -->
            <table dir="${dir}">
              <tr class="row amount-row">
                <td class="label amount-label">${isRTL ? 'مبلغ التحويل / Amount' : 'Amount / مبلغ التحويل'}</td>
                <td class="value amount-value">${formatAmount(amountNum)} ${currencyCode}</td>
              </tr>
              <tr class="row">
                <td class="label">${isRTL ? 'المبلغ كتابة / Amount in Words' : 'Amount in Words / المبلغ كتابة'}</td>
                <td class="value" style="font-size:12px;font-style:italic;direction:rtl;text-align:center;">
                  ${numberToArabicWords(amountNum, currencyCode)}
                </td>
              </tr>
            </table>

            <!-- Bank Information -->
            <div class="bank-section">
              <table dir="${dir}" style="margin:0;">
                <tr>
                  <td colspan="2" style="background:#ffc107;color:#5d4037;font-weight:bold;padding:8px 10px;text-align:${textAlign};">
                    ${isRTL ? 'معلومات البنك / Bank Information' : 'Bank Information / معلومات البنك'}
                  </td>
                </tr>
                <tr>
                  <td style="width:50%;padding:8px 10px;border-${isRTL ? 'left' : 'right'}:1px solid #ffe082;">
                    <div style="font-size:11px;color:#666;margin-bottom:2px;">${isRTL ? 'اسم البنك / Bank Name' : 'Bank Name / اسم البنك'}</div>
                    <div style="font-weight:bold;">${request.bank_name || request.vendor_bank_name || '-'}</div>
                  </td>
                  <td style="width:50%;padding:8px 10px;">
                    <div style="font-size:11px;color:#666;margin-bottom:2px;">${isRTL ? 'اسم المستفيد / Beneficiary' : 'Beneficiary / اسم المستفيد'}</div>
                    <div style="font-weight:bold;">${request.beneficiary_name || request.vendor_name || '-'}</div>
                  </td>
                </tr>
                <tr>
                  <td style="width:50%;padding:8px 10px;border-${isRTL ? 'left' : 'right'}:1px solid #ffe082;">
                    <div style="font-size:11px;color:#666;margin-bottom:2px;">${isRTL ? 'رقم الحساب / Account No' : 'Account No / رقم الحساب'}</div>
                    <div style="font-family:monospace;">${request.bank_account_number || request.vendor_bank_account || '-'}</div>
                  </td>
                  <td style="width:50%;padding:8px 10px;">
                    <div style="font-size:11px;color:#666;margin-bottom:2px;">${isRTL ? 'رمز السويفت / SWIFT' : 'SWIFT / رمز السويفت'}</div>
                    <div style="font-family:monospace;">${request.swift_code || request.vendor_swift || '-'}</div>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:8px 10px;">
                    <div style="font-size:11px;color:#666;margin-bottom:2px;">${isRTL ? 'رقم الآيبان / IBAN' : 'IBAN / رقم الآيبان'}</div>
                    <div style="font-family:monospace;font-size:14px;letter-spacing:2px;font-weight:bold;color:#5d4037;">${request.iban || request.vendor_iban || '-'}</div>
                  </td>
                </tr>
              </table>
            </div>

            ${request.notes ? `
            <!-- Notes -->
            <table dir="${dir}">
              <tr class="row">
                <td class="label">${isRTL ? 'ملاحظات / Notes' : 'Notes / ملاحظات'}</td>
                <td class="value" style="text-align:${textAlign};">${request.notes}</td>
              </tr>
            </table>
            ` : ''}

            <!-- Signatures -->
            <table style="margin-top:20px;border-top:1px solid #ccc;">
              <tr>
                <td class="sig-cell">
                  <div style="height:40px;"></div>
                  <div style="border-top:1px solid #333;padding-top:5px;font-size:11px;">
                    ${isRTL ? 'مقدم الطلب / Requested By' : 'Requested By / مقدم الطلب'}<br/>
                    <strong>${request.requested_by_name || '_____________'}</strong>
                  </div>
                </td>
                <td class="sig-cell">
                  <div style="height:40px;"></div>
                  <div style="border-top:1px solid #333;padding-top:5px;font-size:11px;">
                    ${isRTL ? 'المراجع / Reviewer' : 'Reviewer / المراجع'}<br/>
                    <strong>_____________</strong>
                  </div>
                </td>
                <td class="sig-cell">
                  <div style="height:40px;"></div>
                  <div style="border-top:1px solid #333;padding-top:5px;font-size:11px;">
                    ${isRTL ? 'المدير المالي / Finance Manager' : 'Finance Manager / المدير المالي'}<br/>
                    <strong>${request.approved_by_name || '_____________'}</strong>
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <!-- Footer -->
          <div class="footer-wrapper">
            <div class="footer-company">
              ${company?.phone ? `${isRTL ? 'هاتف:' : 'Tel:'} ${company.phone}` : ''}
              ${company?.email ? ` | ${company.email}` : ''}
              ${company?.website ? ` | ${company.website}` : ''}
            </div>
            <div class="footer-print-info">
              <div class="footer-left">${isRTL ? 'طبع بواسطة:' : 'Printed by:'} ${currentUser}</div>
              <div class="footer-center">${isRTL ? 'الحالة:' : 'Status:'} ${isRTL ? request.status_name_ar : request.status_name}</div>
              <div class="footer-right">${printDate} ${printTime}</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();
      // Auto print after load
      printWindow.onload = () => {
        printWindow.focus();
      };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            {isRTL ? 'خطأ في تحميل الطلب' : 'Error Loading Request'}
          </h2>
          <p className="text-gray-600 mb-4">{error || (isRTL ? 'لم يتم العثور على الطلب' : 'Request not found')}</p>
          <button
            onClick={() => router.push('/requests')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {isRTL ? 'العودة للقائمة' : 'Back to List'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{isRTL ? 'طباعة طلب التحويل' : 'Print Transfer Request'} - {request.request_number}</title>
      </Head>
      
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Action buttons */}
          <div className="bg-white rounded-lg shadow p-4 mb-6 flex justify-between items-center">
            <button
              onClick={() => router.push('/requests')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-2"
            >
              <span>{isRTL ? '→' : '←'}</span>
              {isRTL ? 'العودة' : 'Back'}
            </button>
            
            <div className="flex gap-3">
              <button
                onClick={handlePrint}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"
              >
                <span>🖨️</span>
                {isRTL ? 'طباعة' : 'Print'}
              </button>
            </div>
          </div>

          {/* Preview Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-blue-600">
                {isRTL ? 'طلب تحويل بنكي' : 'Bank Transfer Request'}
              </h1>
              <p className="text-gray-500">{request.request_number}</p>
              {request.vendor_payment_number && (
                <span className="inline-block mt-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                  {isRTL ? 'مرتبط بدفعة مورد:' : 'Linked to Vendor Payment:'} {request.vendor_payment_number}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500">{isRTL ? 'المشروع' : 'Project'}</p>
                <p className="font-medium">{request.project_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{isRTL ? 'المورد' : 'Vendor'}</p>
                <p className="font-medium">{isRTL ? (request.vendor_name_ar || request.vendor_name) : request.vendor_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{isRTL ? 'البنك' : 'Bank'}</p>
                <p className="font-medium">{request.bank_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{isRTL ? 'الآيبان' : 'IBAN'}</p>
                <p className="font-medium font-mono text-sm">{request.iban || '-'}</p>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">{isRTL ? 'مبلغ التحويل' : 'Transfer Amount'}</p>
              <p className="text-3xl font-bold text-green-600">
                {formatAmount(request.transfer_amount)} {request.currency_code}
              </p>
              <p className="text-sm text-gray-500 mt-2 italic">
                {isRTL 
                  ? numberToArabicWords(typeof request.transfer_amount === 'string' ? parseFloat(request.transfer_amount) : request.transfer_amount, request.currency_code)
                  : numberToEnglishWords(typeof request.transfer_amount === 'string' ? parseFloat(request.transfer_amount) : request.transfer_amount, request.currency_code)
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
