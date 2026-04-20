/**
 * ============================================================================
 * Universal Print Page
 * ============================================================================
 * Renders a printable document for any entity type with company header/footer
 * repeating on every page. Supports multiple templates per document type.
 *
 * URL: /print/[type]/[id]?template=X
 * Supported types: expense-request, shipment-expense, shipment
 * ============================================================================
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  buildPrintHtml,
  openPrintWindow,
  fetchCompanyInfo,
  getCurrentUser,
  formatAmount,
  formatDate,
  numberToArabicWords,
  numberToEnglishWords,
  type PrintDocumentOptions,
  type PrintSection,
  type CompanyInfo,
} from '../../../lib/printDocument';

// ─── Entity Config ──────────────────────────────────────────────────────────

const ENTITY_CONFIG: Record<string, {
  title: string;
  titleAr: string;
  templateType: string;
  apiPath: (id: string) => string;
}> = {
  'expense-request': {
    title: 'Expense / Payment Request',
    titleAr: 'طلب سداد / تحويل',
    templateType: 'expense_request',
    apiPath: (id) => `/api/print/data/expense-request/${id}`,
  },
  'shipment-expense': {
    title: 'Shipment Expense',
    titleAr: 'مصروف شحنة',
    templateType: 'invoice',
    apiPath: (id) => `/api/print/data/shipment-expense/${id}`,
  },
  'shipment': {
    title: 'Shipment',
    titleAr: 'شحنة',
    templateType: 'shipment',
    apiPath: (id) => `/api/print/data/shipment/${id}`,
  },
};

// ─── Section Builders per Entity Type ───────────────────────────────────────

function buildExpenseRequestSections(doc: any, locale: string): { sections: PrintSection[]; docNumber: string; docDate: string; createdBy: string } {
  const isRTL = locale === 'ar';
  const sections: PrintSection[] = [];

  // Key-value details
  const kvRows: any[] = [];

  if (doc.project_name) {
    kvRows.push({ label: 'Project', labelAr: 'المشروع', value: `${doc.project_name} ${doc.project_code ? `(${doc.project_code})` : ''}` });
  }
  if (doc.shipment_number) {
    kvRows.push({ label: 'Shipment', labelAr: 'رقم الشحنة', value: doc.shipment_number });
  }
  if (doc.vendor_po_number) {
    kvRows.push({ label: 'Vendor PO', labelAr: 'أمر شراء المورد', value: doc.vendor_po_number });
  }
  if (doc.source_invoice_number) {
    kvRows.push({ label: 'Invoice', labelAr: 'رقم الفاتورة', value: `${doc.source_invoice_number}${doc.source_invoice_date ? ` (${formatDate(doc.source_invoice_date)})` : ''}` });
  }

  const entity = doc.source_entity_name || doc.vendor_name || doc.shipment_vendor_name;
  if (entity) {
    kvRows.push({ label: 'Entity / Vendor', labelAr: 'الجهة / المورد', value: entity });
  }
  if (doc.source_description) {
    kvRows.push({ label: 'Description', labelAr: 'البيان', value: doc.source_description });
  }
  if (doc.source_bl_number || doc.shipment_bl_number) {
    kvRows.push({ label: 'BL Number', labelAr: 'رقم البوليصة', value: doc.source_bl_number || doc.shipment_bl_number });
  }

  const expTypeName = isRTL
    ? (doc.expense_type_name_ar || doc.expense_type_name)
    : (doc.expense_type_name || doc.expense_type_name_ar);
  kvRows.push({ label: 'Expense Type', labelAr: 'نوع المصروف', value: expTypeName || '-' });
  kvRows.push({ label: 'Currency', labelAr: 'العملة', value: `${doc.currency_code || 'SAR'} ${doc.currency_symbol ? `(${doc.currency_symbol})` : ''}` });
  kvRows.push({ label: 'Status', labelAr: 'الحالة', value: isRTL ? (doc.status_name_ar || doc.status_name || '-') : (doc.status_name || '-'), bold: true });

  sections.push({ type: 'key-value', rows: kvRows });

  // Items table (if shipment has items)
  if (doc.items?.length) {
    sections.push({
      type: 'table',
      title: 'Shipment Items',
      titleAr: 'أصناف الشحنة',
      columns: [
        { key: 'item_code', header: 'Code', headerAr: 'الكود', align: 'center' },
        { key: isRTL ? 'item_name_ar' : 'item_name', header: 'Item', headerAr: 'الصنف', align: 'left' },
        { key: 'quantity', header: 'Qty', headerAr: 'الكمية', align: 'center', format: 'number' },
        { key: 'uom_code', header: 'Unit', headerAr: 'الوحدة', align: 'center' },
        { key: 'unit_cost', header: 'Price', headerAr: 'السعر', align: 'right', format: 'currency' },
      ],
      tableData: doc.items.map((item: any) => ({
        ...item,
        item_name_ar: item.item_name_ar || item.item_name,
      })),
    });
  }

  // Amount section
  const amount = typeof doc.total_amount === 'string' ? parseFloat(doc.total_amount) : (doc.total_amount || 0);
  sections.push({
    type: 'amount',
    amount,
    currency: doc.currency_code || 'SAR',
    currencySymbol: doc.currency_symbol || doc.currency_code || 'SAR',
  });

  // Notes
  if (doc.notes) {
    sections.push({ type: 'key-value', rows: [{ label: 'Notes', labelAr: 'ملاحظات', value: doc.notes }] });
  }

  // Signatures: use actual approval actions if available
  const approvalActions: any[] = doc.approval_actions || [];
  const reviewActions = approvalActions.filter((a: any) => a.step_type === 'review' || a.action === 'reviewed');
  const approveActions = approvalActions.filter((a: any) => a.step_type === 'approve' || (a.action === 'approved' && a.step_type !== 'review'));

  const sigs: any[] = [
    { title: 'Requested By', titleAr: 'مقدم الطلب', name: doc.requested_by_name || doc.created_by_name },
  ];
  if (reviewActions.length > 0) {
    reviewActions.forEach((a: any) => sigs.push({
      title: a.step_name || 'Manager Review',
      titleAr: a.step_name_ar || 'مراجعة المدير',
      name: isRTL ? (a.display_name_ar || a.display_name) : a.display_name,
      signatureImageUrl: a.signature_image_url || undefined,
      date: a.acted_at ? formatDate(a.acted_at) : undefined,
    }));
  } else {
    sigs.push({ title: 'Manager Review', titleAr: 'مراجعة المدير', name: doc.approved_by_name });
  }
  if (approveActions.length > 0) {
    approveActions.forEach((a: any) => sigs.push({
      title: a.step_name || 'Approval',
      titleAr: a.step_name_ar || 'الاعتماد',
      name: isRTL ? (a.display_name_ar || a.display_name) : a.display_name,
      signatureImageUrl: a.signature_image_url || undefined,
      date: a.acted_at ? formatDate(a.acted_at) : undefined,
    }));
  } else {
    sigs.push({ title: 'Approval', titleAr: 'الاعتماد' });
  }

  sections.push({ type: 'signatures', signatures: sigs });

  return {
    sections,
    docNumber: doc.request_number || '',
    docDate: doc.request_date || doc.created_at || '',
    createdBy: doc.created_by_name || doc.requested_by_name || '',
  };
}

function buildShipmentExpenseSections(doc: any, locale: string): { sections: PrintSection[]; docNumber: string; docDate: string; createdBy: string } {
  const isRTL = locale === 'ar';
  const sections: PrintSection[] = [];

  const kvRows: any[] = [];
  if (doc.shipment_number) kvRows.push({ label: 'Shipment', labelAr: 'رقم الشحنة', value: doc.shipment_number });
  if (doc.expense_type_name) {
    kvRows.push({ label: 'Expense Type', labelAr: 'نوع المصروف', value: isRTL ? (doc.expense_type_name_ar || doc.expense_type_name) : doc.expense_type_name });
  }
  if (doc.category) kvRows.push({ label: 'Category', labelAr: 'التصنيف', value: doc.category });
  if (doc.entity_name) kvRows.push({ label: 'Entity / Vendor', labelAr: 'الجهة / المورد', value: doc.entity_name });
  if (doc.invoice_number) kvRows.push({ label: 'Invoice Number', labelAr: 'رقم الفاتورة', value: doc.invoice_number });
  if (doc.bl_number || doc.shipment_bl_number) kvRows.push({ label: 'BL Number', labelAr: 'رقم البوليصة', value: doc.bl_number || doc.shipment_bl_number });
  if (doc.project_name) kvRows.push({ label: 'Project', labelAr: 'المشروع', value: `${doc.project_name} ${doc.project_code ? `(${doc.project_code})` : ''}` });
  kvRows.push({ label: 'Currency', labelAr: 'العملة', value: `${doc.currency_code || 'SAR'} ${doc.currency_symbol || ''}` });
  if (doc.exchange_rate && parseFloat(doc.exchange_rate) !== 1) {
    kvRows.push({ label: 'Exchange Rate', labelAr: 'سعر الصرف', value: String(doc.exchange_rate) });
  }
  kvRows.push({ label: 'Approval Status', labelAr: 'حالة الاعتماد', value: doc.approval_status || 'pending', bold: true });
  kvRows.push({ label: 'Posted', labelAr: 'مُرحّل', value: doc.is_posted ? (isRTL ? 'نعم' : 'Yes') : (isRTL ? 'لا' : 'No'), bold: true, color: doc.is_posted ? '#2e7d32' : '#c62828' });

  sections.push({ type: 'key-value', rows: kvRows });

  // Amounts
  const totalAmount = parseFloat(doc.total_amount || '0');
  const vatAmount = parseFloat(doc.vat_amount || '0');
  const totalBase = parseFloat(doc.total_in_base_currency || '0');

  sections.push({ type: 'spacer' });
  sections.push({
    type: 'key-value',
    title: 'Amount Details',
    titleAr: 'تفاصيل المبلغ',
    rows: [
      { label: 'Amount (excl. VAT)', labelAr: 'المبلغ (قبل الضريبة)', value: `${formatAmount(totalAmount - vatAmount)} ${doc.currency_code || 'SAR'}` },
      { label: 'VAT Amount', labelAr: 'مبلغ الضريبة', value: `${formatAmount(vatAmount)} ${doc.currency_code || 'SAR'}` },
      { label: 'Total Amount', labelAr: 'إجمالي المبلغ', value: `${formatAmount(totalAmount)} ${doc.currency_code || 'SAR'}`, highlight: true, bold: true, color: '#2e7d32' },
      ...(totalBase !== totalAmount ? [{ label: 'Total (Base Currency)', labelAr: 'الإجمالي (العملة الأساسية)', value: formatAmount(totalBase) }] : []),
    ],
  });

  sections.push({
    type: 'amount',
    amount: totalAmount,
    currency: doc.currency_code || 'SAR',
    currencySymbol: doc.currency_symbol || doc.currency_code || 'SAR',
  });

  // Description & Notes
  if (doc.description) {
    sections.push({ type: 'key-value', rows: [{ label: 'Description', labelAr: 'الوصف', value: doc.description }] });
  }
  if (doc.notes) {
    sections.push({ type: 'key-value', rows: [{ label: 'Notes', labelAr: 'ملاحظات', value: doc.notes }] });
  }

  // Signatures: use actual approval actions if available
  const expApprovalActions: any[] = doc.approval_actions || [];
  const expReviewActions = expApprovalActions.filter((a: any) => a.step_type === 'review' || a.action === 'reviewed');
  const expApproveActions = expApprovalActions.filter((a: any) => a.step_type === 'approve' || (a.action === 'approved' && a.step_type !== 'review'));

  const expSigs: any[] = [
    { title: 'Prepared By', titleAr: 'أعد بواسطة', name: doc.created_by_name },
  ];
  if (expReviewActions.length > 0) {
    expReviewActions.forEach((a: any) => expSigs.push({
      title: a.step_name || 'Reviewed By',
      titleAr: a.step_name_ar || 'راجع بواسطة',
      name: isRTL ? (a.display_name_ar || a.display_name) : a.display_name,
      signatureImageUrl: a.signature_image_url || undefined,
      date: a.acted_at ? formatDate(a.acted_at) : undefined,
    }));
  } else {
    expSigs.push({ title: 'Reviewed By', titleAr: 'راجع بواسطة' });
  }
  if (expApproveActions.length > 0) {
    expApproveActions.forEach((a: any) => expSigs.push({
      title: a.step_name || 'Approved By',
      titleAr: a.step_name_ar || 'اعتمد بواسطة',
      name: isRTL ? (a.display_name_ar || a.display_name) : a.display_name,
      signatureImageUrl: a.signature_image_url || undefined,
      date: a.acted_at ? formatDate(a.acted_at) : undefined,
    }));
  } else {
    expSigs.push({ title: 'Approved By', titleAr: 'اعتمد بواسطة' });
  }

  sections.push({ type: 'signatures', signatures: expSigs });

  return {
    sections,
    docNumber: doc.invoice_number || `EXP-${doc.id}`,
    docDate: doc.expense_date || doc.created_at || '',
    createdBy: doc.created_by_name || '',
  };
}

function buildShipmentSections(doc: any, locale: string): { sections: PrintSection[]; docNumber: string; docDate: string; createdBy: string } {
  const isRTL = locale === 'ar';
  const sections: PrintSection[] = [];

  const kvRows: any[] = [];
  if (doc.shipment_type_name) kvRows.push({ label: 'Type', labelAr: 'النوع', value: isRTL ? (doc.shipment_type_name_ar || doc.shipment_type_name) : doc.shipment_type_name });
  kvRows.push({ label: 'Status', labelAr: 'الحالة', value: doc.status_code || '-', bold: true });
  if (doc.bl_no) kvRows.push({ label: 'BL Number', labelAr: 'رقم البوليصة', value: doc.bl_no });
  if (doc.vendor_name) kvRows.push({ label: 'Vendor', labelAr: 'المورد', value: isRTL ? (doc.vendor_name_ar || doc.vendor_name) : doc.vendor_name });
  if (doc.purchase_order_number) kvRows.push({ label: 'Purchase Order', labelAr: 'أمر الشراء', value: doc.purchase_order_number });
  if (doc.project_name) kvRows.push({ label: 'Project', labelAr: 'المشروع', value: `${doc.project_name} ${doc.project_code ? `(${doc.project_code})` : ''}` });
  if (doc.port_of_loading_name) kvRows.push({ label: 'Port of Loading', labelAr: 'ميناء التحميل', value: doc.port_of_loading_name });
  if (doc.port_of_discharge_name) kvRows.push({ label: 'Port of Discharge', labelAr: 'ميناء التفريغ', value: doc.port_of_discharge_name });
  if (doc.origin_city_name) kvRows.push({ label: 'Origin', labelAr: 'المنشأ', value: doc.origin_city_name });
  if (doc.destination_city_name) kvRows.push({ label: 'Destination', labelAr: 'الوجهة', value: doc.destination_city_name });
  if (doc.departure_date) kvRows.push({ label: 'Departure', labelAr: 'تاريخ المغادرة', value: formatDate(doc.departure_date) });
  if (doc.arrival_date) kvRows.push({ label: 'Arrival', labelAr: 'تاريخ الوصول', value: formatDate(doc.arrival_date) });

  sections.push({ type: 'key-value', title: 'Shipment Details', titleAr: 'بيانات الشحنة', rows: kvRows });

  // Items table
  if (doc.items?.length) {
    sections.push({
      type: 'table',
      title: 'Shipment Items',
      titleAr: 'أصناف الشحنة',
      columns: [
        { key: 'item_code', header: 'Code', headerAr: 'الكود', align: 'center', width: '12%' },
        { key: isRTL ? 'item_name_ar' : 'item_name', header: 'Item', headerAr: 'الصنف', align: 'left', width: '30%' },
        { key: 'quantity', header: 'Qty', headerAr: 'الكمية', align: 'center', format: 'number', width: '10%' },
        { key: 'uom_code', header: 'Unit', headerAr: 'الوحدة', align: 'center', width: '10%' },
        { key: 'unit_cost', header: 'Unit Cost', headerAr: 'تكلفة الوحدة', align: 'right', format: 'currency', width: '15%' },
        { key: 'total_cost', header: 'Total', headerAr: 'الإجمالي', align: 'right', format: 'currency', width: '15%' },
      ],
      tableData: doc.items.map((i: any) => ({
        ...i,
        item_name_ar: i.item_name_ar || i.item_name,
        total_cost: i.total_cost || ((i.quantity || 0) * (i.unit_cost || 0)),
      })),
    });
  }

  // Expenses table
  if (doc.expenses?.length) {
    sections.push({
      type: 'table',
      title: 'Shipment Expenses',
      titleAr: 'مصاريف الشحنة',
      columns: [
        { key: isRTL ? 'expense_type_name_ar' : 'expense_type_name', header: 'Expense Type', headerAr: 'نوع المصروف', align: 'left', width: '25%' },
        { key: 'entity_name', header: 'Entity', headerAr: 'الجهة', align: 'left', width: '20%' },
        { key: 'invoice_number', header: 'Invoice', headerAr: 'الفاتورة', align: 'center', width: '15%' },
        { key: 'total_amount', header: 'Amount', headerAr: 'المبلغ', align: 'right', format: 'currency', width: '15%' },
        { key: 'vat_amount', header: 'VAT', headerAr: 'الضريبة', align: 'right', format: 'currency', width: '12%' },
        { key: 'total_in_base_currency', header: 'Total (Base)', headerAr: 'الإجمالي', align: 'right', format: 'currency', width: '13%' },
      ],
      tableData: doc.expenses.map((e: any) => ({
        ...e,
        expense_type_name_ar: e.expense_type_name_ar || e.expense_type_name,
      })),
    });
  }

  // Total amount
  const total = parseFloat(doc.total_amount || '0');
  if (total > 0) {
    sections.push({
      type: 'amount',
      amount: total,
      currency: doc.po_currency_code || 'SAR',
    });
  }

  if (doc.notes) {
    sections.push({ type: 'key-value', rows: [{ label: 'Notes', labelAr: 'ملاحظات', value: doc.notes }] });
  }

  // Signatures: use actual approval actions if available
  const shipApprovalActions: any[] = doc.approval_actions || [];
  const shipReviewActions = shipApprovalActions.filter((a: any) => a.step_type === 'review' || a.action === 'reviewed');
  const shipApproveActions = shipApprovalActions.filter((a: any) => a.step_type === 'approve' || (a.action === 'approved' && a.step_type !== 'review'));

  const shipSigs: any[] = [
    { title: 'Prepared By', titleAr: 'أعد بواسطة', name: doc.created_by_name },
  ];
  if (shipReviewActions.length > 0) {
    shipReviewActions.forEach((a: any) => shipSigs.push({
      title: a.step_name || 'Logistics Manager',
      titleAr: a.step_name_ar || 'مدير اللوجستيات',
      name: isRTL ? (a.display_name_ar || a.display_name) : a.display_name,
      signatureImageUrl: a.signature_image_url || undefined,
      date: a.acted_at ? formatDate(a.acted_at) : undefined,
    }));
  } else {
    shipSigs.push({ title: 'Logistics Manager', titleAr: 'مدير اللوجستيات' });
  }
  if (shipApproveActions.length > 0) {
    shipApproveActions.forEach((a: any) => shipSigs.push({
      title: a.step_name || 'Approved By',
      titleAr: a.step_name_ar || 'اعتمد بواسطة',
      name: isRTL ? (a.display_name_ar || a.display_name) : a.display_name,
      signatureImageUrl: a.signature_image_url || undefined,
      date: a.acted_at ? formatDate(a.acted_at) : undefined,
    }));
  } else {
    shipSigs.push({ title: 'Approved By', titleAr: 'اعتمد بواسطة' });
  }

  sections.push({ type: 'signatures', signatures: shipSigs });

  return {
    sections,
    docNumber: doc.shipment_number || '',
    docDate: doc.departure_date || doc.created_at || '',
    createdBy: doc.created_by_name || '',
  };
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function UniversalPrintPage() {
  const router = useRouter();
  const { type, id } = router.query;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentData, setDocumentData] = useState<any>(null);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [locale, setLocale] = useState('ar');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('locale') || localStorage.getItem('language') || 'ar';
      setLocale(stored);
    } catch { /* default: ar */ }
  }, []);

  useEffect(() => {
    if (!type || !id) return;

    const entityType = String(type);
    const entityId = String(id);
    const config = ENTITY_CONFIG[entityType];

    if (!config) {
      setError(`Unsupported document type: ${entityType}`);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('accessToken');
        if (!token) throw new Error('Not authenticated');

        const companyId = localStorage.getItem('selectedCompanyId') || localStorage.getItem('companyId') || '';
        const baseHeaders: Record<string, string> = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(companyId ? { 'X-Company-Id': companyId } : {}),
        };

        // Fetch company info
        const companyRes = await fetch('/api/master/companies', {
          headers: baseHeaders,
        });
        if (companyRes.ok) {
          const companyData = await companyRes.json();
          if (companyData.data?.length > 0) setCompany(companyData.data[0]);
        }

        // Fetch document data from the print API
        const docRes = await fetch(`/api/print/data/${entityType}/${entityId}`, {
          headers: baseHeaders,
        });
        if (!docRes.ok) throw new Error(`Failed to fetch ${entityType} data`);
        const docData = await docRes.json();
        setDocumentData(docData.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [type, id]);

  const handlePrint = useCallback(() => {
    if (!documentData || !company) return;

    const entityType = String(type);
    const config = ENTITY_CONFIG[entityType];
    if (!config) return;

    const doc = documentData.document || documentData;
    const printedBy = documentData.printedBy || getCurrentUser().fullName;
    const isRTL = locale === 'ar';

    // Build sections based on entity type
    let sections: PrintSection[] = [];
    let docNumber = '';
    let docDate = '';
    let createdBy = '';

    switch (entityType) {
      case 'expense-request': {
        const result = buildExpenseRequestSections(doc, locale);
        sections = result.sections;
        docNumber = result.docNumber;
        docDate = result.docDate;
        createdBy = result.createdBy;
        break;
      }
      case 'shipment-expense': {
        const result = buildShipmentExpenseSections(doc, locale);
        sections = result.sections;
        docNumber = result.docNumber;
        docDate = result.docDate;
        createdBy = result.createdBy;
        break;
      }
      case 'shipment': {
        const result = buildShipmentSections(doc, locale);
        sections = result.sections;
        docNumber = result.docNumber;
        docDate = result.docDate;
        createdBy = result.createdBy;
        break;
      }
    }

    // Construct title with expense type for expense requests
    let title = config.title;
    let titleAr = config.titleAr;
    if (entityType === 'expense-request' && doc.expense_type_name) {
      title += ` – ${doc.expense_type_name}`;
      titleAr += ` – ${doc.expense_type_name_ar || doc.expense_type_name}`;
    }

    const opts: PrintDocumentOptions = {
      title,
      titleAr,
      documentNumber: docNumber,
      documentDate: docDate,
      company: documentData.company || company,
      sections,
      direction: isRTL ? 'rtl' : 'ltr',
      paperSize: 'A4',
      orientation: 'portrait',
      printedBy,
      createdBy,
      createdAt: doc.created_at,
    };

    const html = buildPrintHtml(opts);
    openPrintWindow(html);
  }, [documentData, company, type, locale]);

  const isRTL = locale === 'ar';

  // Loading state
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🖨️</div>
          <div style={{ fontSize: '18px', color: '#555' }}>{isRTL ? 'جاري تحميل المستند...' : 'Loading document...'}</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !documentData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚠️</div>
          <div style={{ fontSize: '18px', color: '#c62828', marginBottom: '16px' }}>{error || (isRTL ? 'لم يتم العثور على المستند' : 'Document not found')}</div>
          <button
            onClick={() => router.back()}
            style={{ padding: '10px 24px', cursor: 'pointer', borderRadius: '6px', border: '1px solid #ccc', background: '#f5f5f5', fontSize: '14px' }}
          >
            {isRTL ? 'رجوع' : 'Back'}
          </button>
        </div>
      </div>
    );
  }

  // Ready state - show preview info and print button
  const doc = documentData.document || documentData;
  const config = ENTITY_CONFIG[String(type)] || { title: '', titleAr: '', templateType: '', apiPath: () => '' };

  return (
    <>
      <Head>
        <title>{isRTL ? config.titleAr : config.title} - {doc.request_number || doc.shipment_number || doc.invoice_number || id}</title>
      </Head>

      <div style={{ maxWidth: '600px', margin: '60px auto', padding: '24px', fontFamily: 'Segoe UI, Arial, sans-serif' }} dir={isRTL ? 'rtl' : 'ltr'}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🖨️</div>
          <h1 style={{ fontSize: '22px', color: '#1e3a5f', marginBottom: '4px' }}>
            {isRTL ? 'طباعة مستند' : 'Print Document'}
          </h1>
          <p style={{ color: '#666', fontSize: '14px' }}>
            {isRTL ? config.titleAr : config.title}
          </p>
        </div>

        <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '1px solid #e0e0e0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '6px 0', fontWeight: 600, color: '#555', width: '40%' }}>{isRTL ? 'رقم المستند:' : 'Document No:'}</td>
                <td style={{ padding: '6px 0', color: '#1565c0', fontWeight: 600 }}>
                  {doc.request_number || doc.shipment_number || doc.invoice_number || `#${id}`}
                </td>
              </tr>
              {doc.expense_type_name && (
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 600, color: '#555' }}>{isRTL ? 'النوع:' : 'Type:'}</td>
                  <td style={{ padding: '6px 0' }}>{isRTL ? (doc.expense_type_name_ar || doc.expense_type_name) : doc.expense_type_name}</td>
                </tr>
              )}
              {doc.total_amount && (
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 600, color: '#555' }}>{isRTL ? 'المبلغ:' : 'Amount:'}</td>
                  <td style={{ padding: '6px 0', color: '#2e7d32', fontWeight: 700, fontSize: '16px' }}>
                    {formatAmount(doc.total_amount)} {doc.currency_code || doc.po_currency_code || 'SAR'}
                  </td>
                </tr>
              )}
              {company?.name && (
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 600, color: '#555' }}>{isRTL ? 'الشركة:' : 'Company:'}</td>
                  <td style={{ padding: '6px 0' }}>{isRTL ? (company.name_ar || company.name) : company.name}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={handlePrint}
            style={{
              padding: '12px 36px', fontSize: '16px', fontWeight: 600, cursor: 'pointer',
              background: '#1565c0', color: 'white', border: 'none', borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(21,101,192,0.3)', transition: 'background 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#0d47a1')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#1565c0')}
          >
            🖨️ {isRTL ? 'طباعة' : 'Print'}
          </button>
          <button
            onClick={() => router.back()}
            style={{
              padding: '12px 24px', fontSize: '16px', cursor: 'pointer',
              background: '#f5f5f5', color: '#333', border: '1px solid #ccc', borderRadius: '8px',
            }}
          >
            {isRTL ? 'رجوع' : 'Back'}
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#999' }}>
          {isRTL
            ? 'سيتم فتح نافذة جديدة تحتوي على المستند مع ترويسة الشركة في كل صفحة'
            : 'A new window will open with the document including company header on every page'}
        </p>
      </div>
    </>
  );
}
