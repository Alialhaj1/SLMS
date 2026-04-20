/**
 * 📝 VENDOR QUOTATIONS PAGE — Complete Rebuild
 * =============================================
 * SAP MM / Oracle Purchasing level quality
 * 
 * Features:
 * ✅ KPI strip (4 cards): Total / Pending / Accepted / Rejected
 * ✅ Enhanced table with all columns
 * ✅ Server-side pagination, search, status filter
 * ✅ Create/Edit modal with Items Picker + inline items table
 * ✅ View detail modal with items table
 * ✅ Accept/Reject workflow with reason dialog
 * ✅ Convert accepted → Contract or PO
 * ✅ AR/EN bilingual, RTL support
 * ✅ RBAC integration
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import SearchableSelect from '../../components/ui/SearchableSelect';
import type { SelectOption } from '../../components/ui/SearchableSelect';
import CurrencySelector from '../../components/shared/CurrencySelector';
import ItemsPickerDialog from '../../components/purchasing/ItemsPickerDialog';
import type { SelectedPickerItem } from '../../components/purchasing/ItemsPickerDialog';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { companyStore } from '../../lib/companyStore';
import {
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  DocumentMagnifyingGlassIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  ShoppingCartIcon,
  CubeIcon,
  CalendarDaysIcon,
  DocumentCheckIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import ExchangeRateField from '../../components/ui/ExchangeRateField';

/* ─── Types ────────────────────────────────────────────────────── */

interface QuotationItem {
  id?: number;
  temp_id?: string;
  item_id?: number;
  item_code: string;
  item_name: string;
  item_name_ar?: string;
  uom_id?: number;
  uom_code?: string;
  quantity: number;
  unit_price: number;
  discount_pct: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
  specifications?: string;
  brand?: string;
  model_number?: string;
  country_of_origin?: string;
  warranty_months?: number;
  delivery_days?: number;
  uoms?: Array<{ uom_id: number; uom_code: string; uom_name: string; conversion_factor?: number; is_base_uom?: boolean; is_active?: boolean; }>;
}

interface VendorQuotation {
  id: number;
  quotation_number: string;
  vendor_id: number;
  vendor_name?: string;
  vendor_name_ar?: string;
  vendor_code?: string;
  quotation_date: string;
  validity_date?: string;
  currency_id?: number;
  currency_code?: string;
  currency_symbol?: string;
  exchange_rate?: number;
  supply_terms_id?: number;
  delivery_terms_id?: number;
  payment_terms_id?: number;
  project_id?: number;
  project_code?: string;
  project_name?: string;
  project_name_ar?: string;
  subtotal: number;
  discount_amount?: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  rejected_reason?: string;
  converted_to_contract_id?: number;
  converted_to_po_id?: number;
  notes?: string;
  technical_notes?: string;
  items?: QuotationItem[];
  items_count?: number;
}

interface Vendor {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
}

interface Project { id: number; code: string; name: string; name_ar?: string; status?: string; }
interface UOM { id: number; code: string; name: string; name_ar?: string; }

/* ─── Constants ────────────────────────────────────────────────── */

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '') + '/api';

const STATUS_CONFIG: Record<string, { en: string; ar: string; color: string; bg: string }> = {
  pending:  { en: 'Pending',  ar: 'قيد الانتظار',    color: 'text-amber-700 dark:text-amber-300',  bg: 'bg-amber-100 dark:bg-amber-900/30' },
  accepted: { en: 'Accepted', ar: 'مقبول',           color: 'text-green-700 dark:text-green-300',  bg: 'bg-green-100 dark:bg-green-900/30' },
  rejected: { en: 'Rejected', ar: 'مرفوض',           color: 'text-red-700 dark:text-red-300',      bg: 'bg-red-100 dark:bg-red-900/30' },
  expired:  { en: 'Expired',  ar: 'منتهي الصلاحية', color: 'text-gray-700 dark:text-gray-300',    bg: 'bg-gray-100 dark:bg-gray-700' },
};

/* ─── Helpers ──────────────────────────────────────────────────── */

function calcLineTotal(item: QuotationItem): QuotationItem {
  const subtotal = item.quantity * item.unit_price;
  const discAmt = item.discount_pct > 0 ? subtotal * item.discount_pct / 100 : item.discount_amount;
  const afterDisc = subtotal - discAmt;
  const taxAmt = afterDisc * item.tax_rate / 100;
  return { ...item, discount_amount: discAmt, tax_amount: taxAmt, line_total: afterDisc + taxAmt };
}

function emptyForm() {
  return {
    vendor_id: '',
    quotation_date: new Date().toISOString().split('T')[0],
    validity_date: '',
    currency_id: '',
    exchange_rate: 1,
    supply_terms_id: '',
    delivery_terms_id: '',
    payment_terms_id: '',
    project_id: '',
    notes: '',
    technical_notes: '',
    items: [] as QuotationItem[],
  };
}

/* ─── Page Component ───────────────────────────────────────────── */

function VendorQuotationsPage() {
  const { hasPermission } = usePermissions();
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [quotations, setQuotations] = useState<VendorQuotation[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [uoms, setUoms] = useState<UOM[]>([]);
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>('');
  const [companyCurrencyCode, setCompanyCurrencyCode] = useState<string>('SAR');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, accepted: 0, rejected: 0 });

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewing, setViewing] = useState<VendorQuotation | null>(null);
  const [itemsPickerOpen, setItemsPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Delete
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState<VendorQuotation | null>(null);

  // Accept/Reject
  const [acceptConfirmOpen, setAcceptConfirmOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState<VendorQuotation | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionProcessing, setActionProcessing] = useState(false);

  // Convert
  const [convertMenuOpen, setConvertMenuOpen] = useState<number | null>(null);

  // Form
  const [formData, setFormData] = useState(emptyForm());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  /* ─── API Helpers ──────────────────────────────────────────── */

  const getHeaders = useCallback(() => ({
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    'Content-Type': 'application/json',
    'X-Company-Id': String(companyStore.getActiveCompanyId() || ''),
  }), []);

  /* ─── Fetch Data ───────────────────────────────────────────── */

  const fetchRefData = useCallback(async () => {
    try {
      const headers = getHeaders();
      const [vRes, pRes, uRes] = await Promise.all([
        fetch(`${API_BASE}/procurement/vendors?limit=1000`, { headers }),
        fetch(`${API_BASE}/projects?is_active=true&limit=500`, { headers }),
        fetch(`${API_BASE}/master/units?is_active=true&limit=500`, { headers }),
      ]);
      if (vRes.ok) { const r = await vRes.json(); setVendors(r.data || []); }
      if (pRes.ok) { const r = await pRes.json(); setProjects(r.data || []); }
      if (uRes.ok) { const r = await uRes.json(); setUoms(r.data || []); }
    } catch (e) { console.error('Failed to fetch ref data:', e); }
  }, [getHeaders]);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`${API_BASE}/procurement/quotations?${params}`, { headers: getHeaders() });
      if (res.ok) {
        const r = await res.json();
        const data: VendorQuotation[] = r.data || [];
        setQuotations(data);
        setTotal(r.total || 0);
        setTotalPages(r.totalPages || Math.ceil((r.total || 0) / pageSize) || 1);

        const s = { total: r.total || 0, pending: 0, accepted: 0, rejected: 0 };
        data.forEach(q => {
          if (q.status === 'pending') s.pending++;
          else if (q.status === 'accepted') s.accepted++;
          else if (q.status === 'rejected') s.rejected++;
        });
        setStats(s);
      }
    } catch (e) {
      showToast({ message: isAr ? 'فشل في تحميل عروض الأسعار' : 'Failed to load quotations', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchTerm, statusFilter, getHeaders, showToast, isAr]);

  const fetchQuotationDetail = async (id: number): Promise<VendorQuotation | null> => {
    try {
      const res = await fetch(`${API_BASE}/procurement/quotations/${id}`, { headers: getHeaders() });
      if (res.ok) { const r = await res.json(); return r.data; }
    } catch (e) { console.error('Fetch detail error:', e); }
    return null;
  };

  useEffect(() => { fetchRefData(); }, [fetchRefData]);
  useEffect(() => { fetchQuotations(); }, [fetchQuotations]);

  /* ─── Form Helpers ─────────────────────────────────────────── */

  const vendorOptions: SelectOption[] = useMemo(() =>
    vendors.map(v => ({
      value: v.id,
      label: isAr ? (v.name_ar || v.name) : v.name,
      labelAr: v.name_ar,
      code: v.code,
      searchText: `${v.code} ${v.name} ${v.name_ar || ''}`,
    })), [vendors, isAr]);

  const projectOptions: SelectOption[] = useMemo(() =>
    projects.map(p => ({ value: p.id, label: `${p.code} — ${isAr ? (p.name_ar || p.name) : p.name}`, code: p.code, searchText: `${p.code} ${p.name} ${p.name_ar || ''}` })),
    [projects, isAr]);

  const uomOptions = useMemo(() =>
    uoms.map(u => ({ value: u.id, label: isAr ? (u.name_ar || u.name) : u.name, code: u.code })),
    [uoms, isAr]);

  const showExchangeRate = selectedCurrencyCode && selectedCurrencyCode !== companyCurrencyCode;

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.vendor_id) errors.vendor_id = isAr ? 'المورد مطلوب' : 'Vendor is required';
    if (!formData.quotation_date) errors.quotation_date = isAr ? 'التاريخ مطلوب' : 'Date is required';
    if (formData.items.length === 0) errors.items = isAr ? 'أضف صنف واحد على الأقل' : 'Add at least one item';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const formTotals = useMemo(() => {
    const subtotal = formData.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const discount = formData.items.reduce((s, i) => s + i.discount_amount, 0);
    const tax = formData.items.reduce((s, i) => s + i.tax_amount, 0);
    const total = formData.items.reduce((s, i) => s + i.line_total, 0);
    return { subtotal, discount, tax, total };
  }, [formData.items]);

  /* ─── Item Management ──────────────────────────────────────── */

  const handleItemsFromPicker = (selectedItems: SelectedPickerItem[]) => {
    const newItems: QuotationItem[] = selectedItems.map((si, idx) => calcLineTotal({
      temp_id: `new-${Date.now()}-${idx}`,
      item_id: si.id,
      item_code: si.code,
      item_name: si.name,
      item_name_ar: si.name_ar,
      uom_id: si.uom_id,
      uom_code: si.uom_code,
      uoms: si.uoms,
      quantity: 1,
      unit_price: si.unit_price,
      discount_pct: 0,
      discount_amount: 0,
      tax_rate: si.default_tax_rate || 0,
      tax_amount: 0,
      line_total: 0,
    }));
    setFormData(prev => ({ ...prev, items: [...prev.items, ...newItems] }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const items = [...prev.items];
      items[index] = calcLineTotal({ ...items[index], [field]: value });
      return { ...prev, items };
    });
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  /* ─── CRUD Operations ──────────────────────────────────────── */

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm());
    setFormErrors({});
    setFormModalOpen(true);
  };

  const openEdit = async (quot: VendorQuotation) => {
    const detail = await fetchQuotationDetail(quot.id);
    if (!detail) return;
    setEditingId(detail.id);
    setFormData({
      vendor_id: String(detail.vendor_id),
      quotation_date: detail.quotation_date?.split('T')[0] || '',
      validity_date: detail.validity_date?.split('T')[0] || '',
      currency_id: String(detail.currency_id || ''),
      exchange_rate: detail.exchange_rate || 1,
      supply_terms_id: String(detail.supply_terms_id || ''),
      delivery_terms_id: String(detail.delivery_terms_id || ''),
      payment_terms_id: String(detail.payment_terms_id || ''),
      project_id: String(detail.project_id || ''),
      notes: detail.notes || '',
      technical_notes: detail.technical_notes || '',
      items: (detail.items || []).map(i => ({
        id: i.id,
        item_id: i.item_id,
        item_code: i.item_code,
        item_name: i.item_name,
        item_name_ar: i.item_name_ar,
        uom_id: i.uom_id,
        uom_code: i.uom_code,
        quantity: Number(i.quantity) || 0,
        unit_price: Number(i.unit_price) || 0,
        discount_pct: Number(i.discount_pct) || 0,
        discount_amount: Number(i.discount_amount) || 0,
        tax_rate: Number(i.tax_rate) || 0,
        tax_amount: Number(i.tax_amount) || 0,
        line_total: Number(i.line_total) || 0,
        specifications: i.specifications,
        brand: i.brand,
        model_number: i.model_number,
        country_of_origin: i.country_of_origin,
        warranty_months: i.warranty_months,
        delivery_days: i.delivery_days,
      })),
    });
    setFormErrors({});
    setFormModalOpen(true);
  };

  const openView = async (quot: VendorQuotation) => {
    const detail = await fetchQuotationDetail(quot.id);
    if (detail) { setViewing(detail); setViewModalOpen(true); }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const body = {
        vendor_id: parseInt(formData.vendor_id),
        quotation_date: formData.quotation_date,
        validity_date: formData.validity_date || null,
        currency_id: formData.currency_id ? parseInt(formData.currency_id) : null,
        exchange_rate: formData.exchange_rate || 1,
        supply_terms_id: formData.supply_terms_id ? parseInt(formData.supply_terms_id) : null,
        delivery_terms_id: formData.delivery_terms_id ? parseInt(formData.delivery_terms_id) : null,
        payment_terms_id: formData.payment_terms_id ? parseInt(formData.payment_terms_id) : null,
        project_id: formData.project_id ? parseInt(formData.project_id) : null,
        notes: formData.notes,
        technical_notes: formData.technical_notes,
        subtotal: formTotals.subtotal,
        discount_amount: formTotals.discount,
        tax_amount: formTotals.tax,
        total_amount: formTotals.total,
        items: formData.items.map(item => ({
          item_id: item.item_id,
          item_code: item.item_code,
          item_name: item.item_name,
          item_name_ar: item.item_name_ar,
          uom_id: item.uom_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_pct: item.discount_pct,
          discount_amount: item.discount_amount,
          tax_rate: item.tax_rate,
          tax_amount: item.tax_amount,
          line_total: item.line_total,
          specifications: item.specifications,
          brand: item.brand,
          model_number: item.model_number,
          country_of_origin: item.country_of_origin,
          warranty_months: item.warranty_months,
          delivery_days: item.delivery_days,
        })),
      };

      const url = editingId
        ? `${API_BASE}/procurement/quotations/${editingId}`
        : `${API_BASE}/procurement/quotations`;

      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });

      if (res.ok) {
        showToast({
          message: isAr ? (editingId ? 'تم تحديث عرض السعر' : 'تم إنشاء عرض السعر')
               : (editingId ? 'Quotation updated' : 'Quotation created'),
          type: 'success'
        });
        setFormModalOpen(false);
        fetchQuotations();
      } else {
        const err = await res.json();
        showToast({ message: err.error?.message || 'Operation failed', type: 'error' });
      }
    } catch (e) {
      showToast({ message: 'Operation failed', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      const res = await fetch(`${API_BASE}/procurement/quotations/${toDelete.id}`, {
        method: 'DELETE', headers: getHeaders(),
      });
      if (res.ok) {
        showToast({ message: isAr ? 'تم حذف عرض السعر' : 'Quotation deleted', type: 'success' });
        setDeleteConfirmOpen(false); setToDelete(null); fetchQuotations();
      } else {
        const err = await res.json();
        showToast({ message: err.error?.message || 'Delete failed', type: 'error' });
      }
    } catch (e) { showToast({ message: 'Delete failed', type: 'error' }); }
  };

  const handleAccept = async () => {
    if (!actionTarget) return;
    setActionProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/procurement/quotations/${actionTarget.id}/accept`, {
        method: 'PUT', headers: getHeaders(),
      });
      if (res.ok) {
        showToast({ message: isAr ? 'تم قبول عرض السعر' : 'Quotation accepted', type: 'success' });
        setAcceptConfirmOpen(false); setActionTarget(null); fetchQuotations();
      } else {
        const err = await res.json(); showToast({ message: err.error?.message || 'Accept failed', type: 'error' });
      }
    } catch (e) { showToast({ message: 'Accept failed', type: 'error' }); }
    finally { setActionProcessing(false); }
  };

  const handleReject = async () => {
    if (!actionTarget) return;
    setActionProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/procurement/quotations/${actionTarget.id}/reject`, {
        method: 'PUT', headers: getHeaders(), body: JSON.stringify({ reason: rejectReason }),
      });
      if (res.ok) {
        showToast({ message: isAr ? 'تم رفض عرض السعر' : 'Quotation rejected', type: 'success' });
        setRejectModalOpen(false); setActionTarget(null); setRejectReason(''); fetchQuotations();
      } else {
        const err = await res.json(); showToast({ message: err.error?.message || 'Reject failed', type: 'error' });
      }
    } catch (e) { showToast({ message: 'Reject failed', type: 'error' }); }
    finally { setActionProcessing(false); }
  };

  const handleConvert = async (quotId: number, target: 'contract' | 'po') => {
    setConvertMenuOpen(null);
    try {
      const res = await fetch(`${API_BASE}/procurement/quotations/${quotId}/convert-to-${target}`, {
        method: 'POST', headers: getHeaders(),
      });
      if (res.ok) {
        const result = await res.json();
        showToast({
          message: isAr ? (target === 'contract' ? 'تم التحويل إلى عقد' : 'تم التحويل إلى أمر شراء')
               : (target === 'contract' ? `Converted to contract ${result.data?.contract_number || ''}` : `Converted to PO ${result.data?.po_number || ''}`),
          type: 'success'
        });
        fetchQuotations();
      } else {
        const err = await res.json(); showToast({ message: err.error?.message || 'Conversion failed', type: 'error' });
      }
    } catch (e) { showToast({ message: 'Conversion failed', type: 'error' }); }
  };

  /* ─── Format Helpers ───────────────────────────────────────── */

  const fmtCurrency = (amt: number, sym?: string) =>
    `${sym || 'SAR'} ${Number(amt || 0).toLocaleString(isAr ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  const getStatusBadge = (status: string) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return (
      <span className={clsx('px-2.5 py-1 text-xs font-semibold rounded-full', cfg.bg, cfg.color)}>
        {isAr ? cfg.ar : cfg.en}
      </span>
    );
  };

  /* ─── Render ───────────────────────────────────────────────── */

  return (
    <MainLayout>
      <Head>
        <title>{isAr ? 'عروض أسعار الموردين' : 'Vendor Quotations'} - SLMS</title>
      </Head>

      <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <DocumentMagnifyingGlassIcon className="h-7 w-7 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isAr ? 'عروض أسعار الموردين' : 'Vendor Quotations'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isAr ? `${total} عرض سعر` : `${total} quotations`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={fetchQuotations} title={isAr ? 'تحديث' : 'Refresh'}>
              <ArrowPathIcon className="h-5 w-5" />
            </Button>
            {hasPermission('vendor_quotations:create') && (
              <Button onClick={openCreate}>
                <PlusIcon className="h-5 w-5 ltr:mr-1 rtl:ml-1" />
                {isAr ? 'عرض سعر جديد' : 'New Quotation'}
              </Button>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: isAr ? 'الإجمالي' : 'Total', value: stats.total, icon: DocumentMagnifyingGlassIcon, color: 'blue' },
            { label: isAr ? 'قيد الانتظار' : 'Pending', value: stats.pending, icon: ClipboardDocumentListIcon, color: 'amber' },
            { label: isAr ? 'مقبول' : 'Accepted', value: stats.accepted, icon: CheckCircleIcon, color: 'green' },
            { label: isAr ? 'مرفوض' : 'Rejected', value: stats.rejected, icon: XCircleIcon, color: 'red' },
          ].map((kpi, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{kpi.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{kpi.value}</p>
                </div>
                <div className={clsx('p-2 rounded-lg',
                  kpi.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30' :
                  kpi.color === 'amber' ? 'bg-amber-100 dark:bg-amber-900/30' :
                  kpi.color === 'green' ? 'bg-green-100 dark:bg-green-900/30' :
                  'bg-red-100 dark:bg-red-900/30'
                )}>
                  <kpi.icon className={clsx('h-6 w-6',
                    kpi.color === 'blue' ? 'text-blue-600' :
                    kpi.color === 'amber' ? 'text-amber-600' :
                    kpi.color === 'green' ? 'text-green-600' : 'text-red-600'
                  )} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2 relative">
              <MagnifyingGlassIcon className={clsx("absolute top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400", isAr ? 'right-3' : 'left-3')} />
              <input
                type="text"
                placeholder={isAr ? 'بحث بالرقم أو المورد...' : 'Search by number or vendor...'}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className={clsx("w-full py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white", isAr ? 'pr-10 pl-4' : 'pl-10 pr-4')}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            >
              <option value="">{isAr ? 'كل الحالات' : 'All Statuses'}</option>
              <option value="pending">{isAr ? 'قيد الانتظار' : 'Pending'}</option>
              <option value="accepted">{isAr ? 'مقبول' : 'Accepted'}</option>
              <option value="rejected">{isAr ? 'مرفوض' : 'Rejected'}</option>
            </select>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            >
              <option value={25}>25 {isAr ? 'لكل صفحة' : 'per page'}</option>
              <option value={50}>50 {isAr ? 'لكل صفحة' : 'per page'}</option>
              <option value={100}>100 {isAr ? 'لكل صفحة' : 'per page'}</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
            </div>
          ) : quotations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <DocumentMagnifyingGlassIcon className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-lg font-medium">{isAr ? 'لا توجد عروض أسعار' : 'No quotations found'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 dark:bg-slate-900/50">
                  <tr>
                    {[isAr ? 'الرقم' : 'Number', isAr ? 'المورد' : 'Vendor', isAr ? 'المشروع' : 'Project', isAr ? 'التاريخ' : 'Date',
                      isAr ? 'الصلاحية' : 'Valid Until', isAr ? 'البنود' : 'Items', isAr ? 'المبلغ' : 'Amount',
                      isAr ? 'الحالة' : 'Status', isAr ? 'الإجراءات' : 'Actions'
                    ].map((h, i) => (
                      <th key={i} className={clsx('px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider', i === 8 ? 'text-center' : 'text-start')}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                  {quotations.map(q => (
                    <tr key={q.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <button onClick={() => openView(q)} className="text-sm font-semibold text-purple-600 dark:text-purple-400 hover:underline">
                          {q.quotation_number}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {isAr ? q.vendor_name_ar || q.vendor_name : q.vendor_name}
                        </div>
                        {q.vendor_code && <div className="text-xs text-gray-500">{q.vendor_code}</div>}
                      </td>
                      <td className="px-4 py-3">
                        {q.project_code ? (
                          <>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{q.project_code}</div>
                            <div className="text-xs text-gray-500">{isAr ? q.project_name_ar || q.project_name : q.project_name}</div>
                          </>
                        ) : <span className="text-xs text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{fmtDate(q.quotation_date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{fmtDate(q.validity_date)}</td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600 dark:text-gray-300">{q.items_count || q.items?.length || 0}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{fmtCurrency(q.total_amount, q.currency_symbol)}</td>
                      <td className="px-4 py-3">{getStatusBadge(q.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openView(q)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20" title={isAr ? 'عرض' : 'View'}>
                            <EyeIcon className="h-4 w-4" />
                          </button>

                          {q.status === 'pending' && hasPermission('vendor_quotations:edit') && (
                            <button onClick={() => openEdit(q)} className="p-1.5 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20" title={isAr ? 'تعديل' : 'Edit'}>
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
                          )}

                          {q.status === 'pending' && hasPermission('vendor_quotations:approve') && (
                            <>
                              <button onClick={() => { setActionTarget(q); setAcceptConfirmOpen(true); }} className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20" title={isAr ? 'قبول' : 'Accept'}>
                                <CheckCircleIcon className="h-4 w-4" />
                              </button>
                              <button onClick={() => { setActionTarget(q); setRejectReason(''); setRejectModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20" title={isAr ? 'رفض' : 'Reject'}>
                                <XCircleIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}

                          {q.status === 'accepted' && !q.converted_to_contract_id && !q.converted_to_po_id && (
                            <div className="relative">
                              <button
                                onClick={() => setConvertMenuOpen(convertMenuOpen === q.id ? null : q.id)}
                                className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                title={isAr ? 'تحويل' : 'Convert'}
                              >
                                <ArrowPathIcon className="h-4 w-4" />
                              </button>
                              {convertMenuOpen === q.id && (
                                <div className="absolute z-20 top-full mt-1 ltr:right-0 rtl:left-0 bg-white dark:bg-slate-700 rounded-lg shadow-lg border border-gray-200 dark:border-slate-600 min-w-[180px]">
                                  <button onClick={() => handleConvert(q.id, 'contract')} className="w-full px-4 py-2.5 text-sm text-start hover:bg-gray-50 dark:hover:bg-slate-600 flex items-center gap-2 rounded-t-lg">
                                    <ClipboardDocumentListIcon className="h-4 w-4 text-blue-500" />
                                    {isAr ? 'تحويل إلى عقد' : 'Convert to Contract'}
                                  </button>
                                  <button onClick={() => handleConvert(q.id, 'po')} className="w-full px-4 py-2.5 text-sm text-start hover:bg-gray-50 dark:hover:bg-slate-600 flex items-center gap-2 rounded-b-lg">
                                    <ShoppingCartIcon className="h-4 w-4 text-green-500" />
                                    {isAr ? 'تحويل إلى أمر شراء' : 'Convert to PO'}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {q.status === 'pending' && hasPermission('vendor_quotations:delete') && (
                            <button onClick={() => { setToDelete(q); setDeleteConfirmOpen(true); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20" title={isAr ? 'حذف' : 'Delete'}>
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-slate-700">
              <span className="text-sm text-gray-500">{isAr ? `صفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`}</span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  {isAr ? 'السابق' : 'Previous'}
                </Button>
                <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  {isAr ? 'التالي' : 'Next'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title={isAr ? (editingId ? 'تعديل عرض السعر' : 'عرض سعر جديد') : (editingId ? 'Edit Quotation' : 'New Quotation')}
        size="xl"
      >
        <div className="space-y-5 max-h-[70vh] overflow-y-auto px-1" dir={isAr ? 'rtl' : 'ltr'}>
          {/* Section: Quotation Info */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-5 border border-blue-100 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-4 flex items-center gap-2">
              <DocumentCheckIcon className="h-4 w-4" />
              {isAr ? 'معلومات عرض السعر' : 'Quotation Information'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isAr ? 'المورد' : 'Vendor'} <span className="text-red-500">*</span>
                </label>
                <SearchableSelect options={vendorOptions} value={formData.vendor_id} onChange={(val) => setFormData(prev => ({ ...prev, vendor_id: val }))} placeholder={isAr ? 'اختر المورد' : 'Select Vendor'} error={formErrors.vendor_id} locale={locale} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isAr ? 'المشروع' : 'Project'}
                </label>
                <SearchableSelect options={projectOptions} value={formData.project_id} onChange={(val) => setFormData(prev => ({ ...prev, project_id: val }))} placeholder={isAr ? 'اختر المشروع' : 'Select Project'} locale={locale} />
                <p className="text-xs text-gray-400 mt-1">{isAr ? 'ربط عرض السعر بمشروع' : 'Link quotation to a project'}</p>
              </div>
            </div>
          </div>

          {/* Section: Dates & Currency */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-5 border border-emerald-100 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-4 flex items-center gap-2">
              <CalendarDaysIcon className="h-4 w-4" />
              {isAr ? 'التواريخ والعملة' : 'Dates & Currency'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isAr ? 'تاريخ العرض' : 'Quotation Date'} <span className="text-red-500">*</span>
                </label>
                <input type="date" value={formData.quotation_date} onChange={(e) => setFormData(prev => ({ ...prev, quotation_date: e.target.value }))} className={clsx("w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white", formErrors.quotation_date ? 'border-red-500' : 'border-gray-300 dark:border-slate-600')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isAr ? 'تاريخ الصلاحية' : 'Validity Date'}</label>
                <input type="date" value={formData.validity_date} onChange={(e) => setFormData(prev => ({ ...prev, validity_date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isAr ? 'العملة' : 'Currency'}</label>
                <CurrencySelector value={formData.currency_id} onChange={(id, code) => {
                  setFormData(prev => ({ ...prev, currency_id: String(id), exchange_rate: code === companyCurrencyCode ? 1 : prev.exchange_rate }));
                  if (code) setSelectedCurrencyCode(code);
                }} />
              </div>
              {showExchangeRate && (
                <ExchangeRateField
                  currencyCode={selectedCurrencyCode || undefined}
                  value={String(formData.exchange_rate)}
                  onChange={(v) => setFormData(prev => ({ ...prev, exchange_rate: parseFloat(v) || 1 }))}
                  label={isAr ? 'سعر الصرف' : 'Exchange Rate'}
                  hideWhenBaseCurrency
                />
              )}
            </div>
          </div>

          {/* Section: Line Items */}
          <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-5 border border-purple-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-purple-800 dark:text-purple-300 flex items-center gap-2">
                <CubeIcon className="h-4 w-4" />
                {isAr ? 'البنود' : 'Line Items'}
                {formErrors.items && <span className="text-red-500 text-xs font-normal ms-2">({formErrors.items})</span>}
              </h3>
              <Button size="sm" variant="secondary" onClick={() => setItemsPickerOpen(true)}>
                <PlusIcon className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                {isAr ? 'إضافة أصناف' : 'Add Items'}
              </Button>
            </div>

            {formData.items.length === 0 ? (
              <div className="border-2 border-dashed border-purple-200 dark:border-slate-600 rounded-lg p-8 text-center bg-white/50 dark:bg-slate-900/20">
                <CubeIcon className="h-10 w-10 text-purple-200 mx-auto mb-2" />
                <p className="text-sm text-gray-500">{isAr ? 'اضغط "إضافة أصناف" لاختيار البنود' : 'Click "Add Items" to select line items'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-900/50">
                    <tr>
                      <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">#</th>
                      <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">{isAr ? 'الصنف' : 'Item'}</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">{isAr ? 'الوحدة' : 'UOM'}</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">{isAr ? 'الكمية' : 'Qty'}</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">{isAr ? 'السعر' : 'Price'}</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500" title={isAr ? 'نسبة الخصم' : 'Discount %}'}>{isAr ? 'خصم%' : 'Disc%'}</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500" title={isAr ? 'نسبة الضريبة' : 'Tax %'}>{isAr ? 'ضريبة%' : 'Tax%'}</th>
                      <th className="px-3 py-2 text-end text-xs font-medium text-gray-500">{isAr ? 'الإجمالي' : 'Total'}</th>
                      <th className="px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                    {formData.items.map((item, idx) => (
                      <tr key={item.id || item.temp_id || idx} className="hover:bg-blue-50/30 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-900 dark:text-white text-xs">{item.item_code}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[150px]">{isAr ? item.item_name_ar || item.item_name : item.item_name}</div>
                        </td>
                        <td className="px-3 py-2">
                          <select value={item.uom_id || ''} onChange={(e) => updateItem(idx, 'uom_id', parseInt(e.target.value) || null)}
                            className="w-24 px-1 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                            <option value="">{isAr ? 'اختر' : 'Select'}</option>
                            {(item.uoms && item.uoms.length > 0
                              ? item.uoms.filter(u => (u.is_active ?? true) !== false).map(u => ({ value: u.uom_id, label: isAr ? (u.uom_name || u.uom_code) : u.uom_name, code: u.uom_code }))
                              : uomOptions
                            ).map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} className="w-20 px-2 py-1 text-center border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min="0" step="0.01" value={item.unit_price} onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} className="w-24 px-2 py-1 text-center border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min="0" max="100" step="0.5" value={item.discount_pct} onChange={(e) => updateItem(idx, 'discount_pct', parseFloat(e.target.value) || 0)} className="w-16 px-1 py-1 text-center border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min="0" max="100" step="0.5" value={item.tax_rate} onChange={(e) => updateItem(idx, 'tax_rate', parseFloat(e.target.value) || 0)} className="w-16 px-1 py-1 text-center border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm" />
                        </td>
                        <td className="px-3 py-2 text-end font-medium text-gray-900 dark:text-white">{item.line_total.toFixed(2)}</td>
                        <td className="px-3 py-2">
                          <button onClick={() => removeItem(idx)} className="p-1 text-gray-400 hover:text-red-500 transition-colors" title={isAr ? 'حذف' : 'Remove'}><TrashIcon className="h-4 w-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-slate-900/50 border-t-2 border-gray-300 dark:border-slate-600">
                    <tr>
                      <td colSpan={3}></td>
                      <td colSpan={4} className="px-3 py-1.5 text-end text-sm text-gray-600">{isAr ? 'المجموع الفرعي' : 'Subtotal'}</td>
                      <td className="px-3 py-1.5 text-end text-sm font-medium">{formTotals.subtotal.toFixed(2)}</td>
                      <td></td>
                    </tr>
                    {formTotals.discount > 0 && (
                      <tr>
                        <td colSpan={3}></td>
                        <td colSpan={4} className="px-3 py-1 text-end text-sm text-red-600">{isAr ? 'الخصم' : 'Discount'}</td>
                        <td className="px-3 py-1 text-end text-sm text-red-600">-{formTotals.discount.toFixed(2)}</td>
                        <td></td>
                      </tr>
                    )}
                    {formTotals.tax > 0 && (
                      <tr>
                        <td colSpan={3}></td>
                        <td colSpan={4} className="px-3 py-1 text-end text-sm text-gray-600">{isAr ? 'الضريبة' : 'Tax'}</td>
                        <td className="px-3 py-1 text-end text-sm font-medium text-amber-600">{formTotals.tax.toFixed(2)}</td>
                        <td></td>
                      </tr>
                    )}
                    <tr className="border-t border-gray-200 dark:border-slate-600">
                      <td colSpan={3}></td>
                      <td colSpan={4} className="px-3 py-2 text-end font-bold text-base">{isAr ? 'الإجمالي' : 'Grand Total'}</td>
                      <td className="px-3 py-2 text-end text-base font-bold text-purple-600">{formTotals.total.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isAr ? 'ملاحظات' : 'Notes'}</label>
              <textarea value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isAr ? 'ملاحظات فنية' : 'Technical Notes'}</label>
              <textarea value={formData.technical_notes} onChange={(e) => setFormData(prev => ({ ...prev, technical_notes: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white" />
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setFormModalOpen(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {isAr ? (editingId ? 'تحديث' : 'إنشاء') : (editingId ? 'Update' : 'Create')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Detail Modal */}
      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title={isAr ? 'تفاصيل عرض السعر' : 'Quotation Details'} size="xl">
        {viewing && (
          <div className="space-y-5" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: isAr ? 'الرقم' : 'Number', value: viewing.quotation_number, bold: true },
                { label: isAr ? 'المورد' : 'Vendor', value: isAr ? viewing.vendor_name_ar || viewing.vendor_name : viewing.vendor_name },
                { label: isAr ? 'المشروع' : 'Project', value: viewing.project_code ? `${viewing.project_code} — ${isAr ? viewing.project_name_ar || viewing.project_name : viewing.project_name}` : null },
                { label: isAr ? 'التاريخ' : 'Date', value: fmtDate(viewing.quotation_date) },
                { label: isAr ? 'الصلاحية' : 'Valid Until', value: fmtDate(viewing.validity_date) },
                { label: isAr ? 'العملة' : 'Currency', value: viewing.currency_code || 'SAR' },
                { label: isAr ? 'سعر الصرف' : 'Exchange Rate', value: viewing.exchange_rate && viewing.exchange_rate !== 1 ? String(viewing.exchange_rate) : null },
                { label: isAr ? 'الحالة' : 'Status', value: null, badge: viewing.status },
                { label: isAr ? 'الإجمالي' : 'Total', value: fmtCurrency(viewing.total_amount, viewing.currency_symbol), bold: true },
              ].map((f, i) => (
                <div key={i}>
                  <p className="text-xs text-gray-500">{f.label}</p>
                  {f.badge ? getStatusBadge(f.badge) : (
                    <p className={clsx('mt-0.5', f.bold ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300')}>{f.value || '-'}</p>
                  )}
                </div>
              ))}
            </div>

            {viewing.rejected_reason && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                <p className="text-sm font-medium text-red-700">{isAr ? 'سبب الرفض' : 'Rejection Reason'}</p>
                <p className="text-sm text-red-600 mt-1">{viewing.rejected_reason}</p>
              </div>
            )}

            {viewing.items && viewing.items.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="font-semibold text-sm mb-3">{isAr ? 'البنود' : 'Line Items'} ({viewing.items.length})</h3>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-900/50">
                      <tr>
                        <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">#</th>
                        <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">{isAr ? 'الكود' : 'Code'}</th>
                        <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">{isAr ? 'الصنف' : 'Item'}</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">{isAr ? 'الوحدة' : 'UOM'}</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">{isAr ? 'الكمية' : 'Qty'}</th>
                        <th className="px-3 py-2 text-end text-xs font-medium text-gray-500">{isAr ? 'السعر' : 'Price'}</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">{isAr ? 'خصم%' : 'Disc%'}</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">{isAr ? 'ضريبة%' : 'Tax%'}</th>
                        <th className="px-3 py-2 text-end text-xs font-medium text-gray-500">{isAr ? 'الإجمالي' : 'Total'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                      {viewing.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                          <td className="px-3 py-2 font-mono text-gray-600">{item.item_code}</td>
                          <td className="px-3 py-2 font-medium">{isAr ? item.item_name_ar || item.item_name : item.item_name}</td>
                          <td className="px-3 py-2 text-center text-xs text-gray-500">{item.uom_code || '-'}</td>
                          <td className="px-3 py-2 text-center">{item.quantity}</td>
                          <td className="px-3 py-2 text-end">{Number(item.unit_price).toFixed(2)}</td>
                          <td className="px-3 py-2 text-center text-xs">{Number(item.discount_pct || 0) > 0 ? `${item.discount_pct}%` : '-'}</td>
                          <td className="px-3 py-2 text-center text-xs">{Number(item.tax_rate || 0) > 0 ? `${item.tax_rate}%` : '-'}</td>
                          <td className="px-3 py-2 text-end font-semibold">{Number(item.line_total).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 dark:bg-slate-900/50 border-t-2">
                      <tr>
                        <td colSpan={8} className="px-3 py-2 text-end font-bold">{isAr ? 'الإجمالي' : 'Total'}</td>
                        <td className="px-3 py-2 text-end font-bold text-purple-600">{fmtCurrency(viewing.total_amount, viewing.currency_symbol)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {viewing.notes && (
              <div>
                <p className="text-xs text-gray-500 mb-1">{isAr ? 'ملاحظات' : 'Notes'}</p>
                <p className="text-sm">{viewing.notes}</p>
              </div>
            )}

            {viewing.converted_to_contract_id && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm">
                <span className="font-medium text-blue-700">{isAr ? 'تم التحويل إلى عقد' : 'Converted to Contract'}</span>
              </div>
            )}
            {viewing.converted_to_po_id && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-sm">
                <span className="font-medium text-green-700">{isAr ? 'تم التحويل إلى أمر شراء' : 'Converted to Purchase Order'}</span>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Items Picker */}
      <ItemsPickerDialog isOpen={itemsPickerOpen} onClose={() => setItemsPickerOpen(false)} onAdd={handleItemsFromPicker} excludeItemIds={formData.items.map(i => i.item_id).filter(Boolean) as number[]} locale={locale} />

      {/* Accept Confirm */}
      <ConfirmDialog isOpen={acceptConfirmOpen} onClose={() => { setAcceptConfirmOpen(false); setActionTarget(null); }} onConfirm={handleAccept}
        title={isAr ? 'قبول عرض السعر' : 'Accept Quotation'}
        message={isAr ? `هل أنت متأكد من قبول عرض السعر ${actionTarget?.quotation_number}؟` : `Accept quotation ${actionTarget?.quotation_number}?`}
        confirmText={isAr ? 'قبول' : 'Accept'}
        variant="primary" loading={actionProcessing}
      />

      {/* Reject Dialog */}
      <Modal isOpen={rejectModalOpen} onClose={() => { setRejectModalOpen(false); setActionTarget(null); }} title={isAr ? 'رفض عرض السعر' : 'Reject Quotation'} size="md">
        <div className="space-y-4" dir={isAr ? 'rtl' : 'ltr'}>
          <p className="text-sm text-gray-600">
            {isAr ? `هل أنت متأكد من رفض عرض السعر ${actionTarget?.quotation_number}؟` : `Reject quotation ${actionTarget?.quotation_number}?`}
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isAr ? 'سبب الرفض' : 'Rejection Reason'}</label>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder={isAr ? 'أدخل سبب الرفض...' : 'Enter rejection reason...'} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white" />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setRejectModalOpen(false); setActionTarget(null); }}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button variant="danger" onClick={handleReject} loading={actionProcessing}>{isAr ? 'رفض' : 'Reject'}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog isOpen={deleteConfirmOpen} onClose={() => { setDeleteConfirmOpen(false); setToDelete(null); }} onConfirm={handleDelete}
        title={isAr ? 'حذف عرض السعر' : 'Delete Quotation'}
        message={isAr ? `هل أنت متأكد من حذف عرض السعر ${toDelete?.quotation_number}؟` : `Delete quotation ${toDelete?.quotation_number}?`}
        confirmText={isAr ? 'حذف' : 'Delete'} variant="danger"
      />
    </MainLayout>
  );
}

export default withPermission('vendor_quotations:view', VendorQuotationsPage);
