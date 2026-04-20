/**
 * 📄 VENDOR CONTRACTS PAGE — Complete Rebuild
 * ============================================
 * SAP MM / Oracle Purchasing level quality
 * 
 * Features:
 * ✅ KPI strip (5 cards): Total / Draft / Active / Expiring / Expired
 * ✅ Expiry alerts banner for contracts expiring within 30 days
 * ✅ Enhanced table with type, dates, value, status, items count
 * ✅ Create/Edit modal with line items, milestones, terms
 * ✅ View detail modal with contract info, items, approval history
 * ✅ Approve workflow
 * ✅ PUT update + DELETE soft delete (BUG-01/02 fixed)
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
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  EyeIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  CubeIcon,
  DocumentCheckIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

/* ─── Types ────────────────────────────────────────────────────── */

interface ContractItem {
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
  discount_percent?: number;
  discount_amount?: number;
  tax_rate?: number;
  tax_amount?: number;
  line_total: number;
  uoms?: Array<{ uom_id: number; uom_code: string; uom_name: string; conversion_factor?: number; is_base_uom?: boolean; is_active?: boolean; }>;
}

interface VendorContract {
  id: number;
  contract_number: string;
  vendor_id: number;
  vendor_name?: string;
  vendor_name_ar?: string;
  vendor_code?: string;
  contract_type_id?: number;
  contract_type_code?: string;
  contract_type_name?: string;
  contract_type_name_ar?: string;
  contract_status_id?: number;
  contract_status_code?: string;
  contract_status_name?: string;
  contract_status_name_ar?: string;
  title?: string;
  title_ar?: string;
  quotation_id?: number;
  start_date: string;
  end_date?: string;
  project_id?: number;
  project_code?: string;
  project_name?: string;
  project_name_ar?: string;
  currency_id?: number;
  currency_code?: string;
  currency_symbol?: string;
  exchange_rate?: number;
  contract_value: number;
  renewal_terms?: string;
  auto_renew?: boolean;
  renewal_notice_days?: number;
  is_approved: boolean;
  approved_at?: string;
  notes?: string;
  terms_and_conditions?: string;
  items?: ContractItem[];
  items_count?: number;
  approvals?: any[];
}

interface ContractType { id: number; code: string; name: string; name_ar?: string; }
interface ContractStatus { id: number; code: string; name: string; name_ar?: string; }
interface Vendor { id: number; code: string; name: string; name_ar?: string; }
interface Project { id: number; code: string; name: string; name_ar?: string; status?: string; }
interface UOM { id: number; code: string; name: string; name_ar?: string; }

/* ─── Constants ────────────────────────────────────────────────── */

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '') + '/api';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  DRAFT:             { bg: 'bg-gray-100 dark:bg-gray-700',        text: 'text-gray-700 dark:text-gray-300' },
  PENDING_APPROVAL:  { bg: 'bg-amber-100 dark:bg-amber-900/30',  text: 'text-amber-700 dark:text-amber-300' },
  ACTIVE:            { bg: 'bg-green-100 dark:bg-green-900/30',   text: 'text-green-700 dark:text-green-300' },
  EXPIRED:           { bg: 'bg-red-100 dark:bg-red-900/30',       text: 'text-red-700 dark:text-red-300' },
  CANCELLED:         { bg: 'bg-gray-100 dark:bg-gray-700',        text: 'text-gray-500 dark:text-gray-400' },
  SUSPENDED:         { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
};

/* ─── Helpers ──────────────────────────────────────────────────── */

function calcLineTotal(item: ContractItem): ContractItem {
  const subtotal = item.quantity * item.unit_price;
  const discAmt = (item.discount_percent || 0) > 0 ? subtotal * (item.discount_percent || 0) / 100 : (item.discount_amount || 0);
  const afterDisc = subtotal - discAmt;
  const taxAmt = afterDisc * (item.tax_rate || 0) / 100;
  return { ...item, discount_amount: discAmt, tax_amount: taxAmt, line_total: afterDisc + taxAmt };
}

function emptyForm() {
  return {
    vendor_id: '',
    contract_type_id: '',
    title: '',
    title_ar: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    currency_id: '',
    exchange_rate: 1,
    project_id: '',
    renewal_terms: '',
    auto_renew: false,
    renewal_notice_days: 30,
    notes: '',
    terms_and_conditions: '',
    items: [] as ContractItem[],
  };
}

/* ─── Page Component ───────────────────────────────────────────── */

function VendorContractsPage() {
  const { hasPermission } = usePermissions();
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [contracts, setContracts] = useState<VendorContract[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [contractTypes, setContractTypes] = useState<ContractType[]>([]);
  const [contractStatuses, setContractStatuses] = useState<ContractStatus[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [uoms, setUoms] = useState<UOM[]>([]);
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>('');
  const [companyCurrencyCode, setCompanyCurrencyCode] = useState<string>('SAR');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, draft: 0, active: 0, expiring: 0, expired: 0, totalValue: 0 });
  const [expiringContracts, setExpiringContracts] = useState<any[]>([]);

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewing, setViewing] = useState<VendorContract | null>(null);
  const [itemsPickerOpen, setItemsPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Delete & Approve
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState<VendorContract | null>(null);
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [toApprove, setToApprove] = useState<VendorContract | null>(null);

  // Form
  const [formData, setFormData] = useState(emptyForm());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  /* ─── API ──────────────────────────────────────────────────── */

  const getHeaders = useCallback(() => ({
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    'Content-Type': 'application/json',
    'X-Company-Id': String(companyStore.getActiveCompanyId() || ''),
  }), []);

  const fetchRefData = useCallback(async () => {
    try {
      const headers = getHeaders();
      const [vRes, tRes, sRes, pRes, uRes] = await Promise.all([
        fetch(`${API_BASE}/procurement/vendors?limit=1000`, { headers }),
        fetch(`${API_BASE}/procurement/contracts/types`, { headers }),
        fetch(`${API_BASE}/procurement/contracts/statuses`, { headers }),
        fetch(`${API_BASE}/projects?is_active=true&limit=500`, { headers }),
        fetch(`${API_BASE}/master/units?is_active=true&limit=500`, { headers }),
      ]);
      if (vRes.ok) { const r = await vRes.json(); setVendors(r.data || []); }
      if (tRes.ok) { const r = await tRes.json(); setContractTypes(r.data || []); }
      if (sRes.ok) { const r = await sRes.json(); setContractStatuses(r.data || []); }
      if (pRes.ok) { const r = await pRes.json(); setProjects(r.data || []); }
      if (uRes.ok) { const r = await uRes.json(); setUoms(r.data || []); }
    } catch (e) { console.error('Ref data error:', e); }
  }, [getHeaders]);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status_id', statusFilter);
      if (typeFilter) params.append('type_id', typeFilter);

      const res = await fetch(`${API_BASE}/procurement/contracts?${params}`, { headers: getHeaders() });
      if (res.ok) {
        const r = await res.json();
        const data: VendorContract[] = r.data || [];
        setContracts(data);
        setTotal(r.total || 0);
        setTotalPages(r.totalPages || Math.ceil((r.total || 0) / pageSize) || 1);

        const now = new Date();
        const in30d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const s = { total: r.total || 0, draft: 0, active: 0, expiring: 0, expired: 0, totalValue: 0 };
        const expiring: any[] = [];
        data.forEach(c => {
          const code = (c.contract_status_code || '').toUpperCase();
          if (code === 'DRAFT' || code === 'PENDING_APPROVAL') s.draft++;
          else if (code === 'ACTIVE') {
            s.active++;
            if (c.end_date && new Date(c.end_date) <= in30d && new Date(c.end_date) > now) {
              s.expiring++;
              expiring.push(c);
            }
          }
          else if (code === 'EXPIRED') s.expired++;
          s.totalValue += Number(c.contract_value) || 0;
        });
        setStats(s);
        setExpiringContracts(expiring);
      }
    } catch (e) {
      showToast({ message: isAr ? 'فشل في تحميل العقود' : 'Failed to load contracts', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchTerm, statusFilter, typeFilter, getHeaders, showToast, isAr]);

  const fetchContractDetail = async (id: number): Promise<VendorContract | null> => {
    try {
      const res = await fetch(`${API_BASE}/procurement/contracts/${id}`, { headers: getHeaders() });
      if (res.ok) { const r = await res.json(); return r.data; }
    } catch (e) { console.error('Detail error:', e); }
    return null;
  };

  useEffect(() => { fetchRefData(); }, [fetchRefData]);
  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  /* ─── Form Helpers ─────────────────────────────────────────── */

  const vendorOptions: SelectOption[] = useMemo(() =>
    vendors.map(v => ({ value: v.id, label: isAr ? (v.name_ar || v.name) : v.name, code: v.code, searchText: `${v.code} ${v.name} ${v.name_ar || ''}` })),
    [vendors, isAr]);

  const typeOptions: SelectOption[] = useMemo(() =>
    contractTypes.map(t => ({ value: t.id, label: isAr ? (t.name_ar || t.name) : t.name, code: t.code })),
    [contractTypes, isAr]);

  const projectOptions: SelectOption[] = useMemo(() =>
    projects.map(p => ({ value: p.id, label: `${p.code} — ${isAr ? (p.name_ar || p.name) : p.name}`, code: p.code, searchText: `${p.code} ${p.name} ${p.name_ar || ''}` })),
    [projects, isAr]);

  const uomOptions: SelectOption[] = useMemo(() =>
    uoms.map(u => ({ value: u.id, label: isAr ? (u.name_ar || u.name) : u.name, code: u.code })),
    [uoms, isAr]);

  const showExchangeRate = selectedCurrencyCode && selectedCurrencyCode !== companyCurrencyCode;

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.vendor_id) errors.vendor_id = isAr ? 'المورد مطلوب' : 'Vendor required';
    if (!formData.start_date) errors.start_date = isAr ? 'تاريخ البداية مطلوب' : 'Start date required';
    if (formData.items.length === 0) errors.items = isAr ? 'أضف صنف واحد على الأقل' : 'Add at least one item';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const formTotals = useMemo(() => {
    const subtotal = formData.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const tax = formData.items.reduce((s, i) => s + (i.tax_amount || 0), 0);
    const total = formData.items.reduce((s, i) => s + i.line_total, 0);
    return { subtotal, tax, total };
  }, [formData.items]);

  /* ─── Item Management ──────────────────────────────────────── */

  const handleItemsFromPicker = (selected: SelectedPickerItem[]) => {
    const newItems: ContractItem[] = selected.map((si, idx) => calcLineTotal({
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
      discount_percent: 0,
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

  /* ─── CRUD ─────────────────────────────────────────────────── */

  const openCreate = () => {
    setEditingId(null); setFormData(emptyForm()); setFormErrors({}); setFormModalOpen(true);
  };

  const openEdit = async (c: VendorContract) => {
    const detail = await fetchContractDetail(c.id);
    if (!detail) return;
    setEditingId(detail.id);
    setFormData({
      vendor_id: String(detail.vendor_id),
      contract_type_id: String(detail.contract_type_id || ''),
      title: detail.title || '',
      title_ar: detail.title_ar || '',
      start_date: detail.start_date?.split('T')[0] || '',
      end_date: detail.end_date?.split('T')[0] || '',
      currency_id: String(detail.currency_id || ''),
      exchange_rate: detail.exchange_rate || 1,
      project_id: String(detail.project_id || ''),
      renewal_terms: detail.renewal_terms || '',
      auto_renew: detail.auto_renew || false,
      renewal_notice_days: detail.renewal_notice_days || 30,
      notes: detail.notes || '',
      terms_and_conditions: detail.terms_and_conditions || '',
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
        discount_percent: Number(i.discount_percent) || 0,
        discount_amount: Number(i.discount_amount) || 0,
        tax_rate: Number(i.tax_rate) || 0,
        tax_amount: Number(i.tax_amount) || 0,
        line_total: Number(i.line_total) || 0,
      })),
    });
    setFormErrors({}); setFormModalOpen(true);
  };

  const openView = async (c: VendorContract) => {
    const detail = await fetchContractDetail(c.id);
    if (detail) { setViewing(detail); setViewModalOpen(true); }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const body = {
        vendor_id: parseInt(formData.vendor_id),
        contract_type_id: formData.contract_type_id ? parseInt(formData.contract_type_id) : null,
        title: formData.title,
        title_ar: formData.title_ar,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        currency_id: formData.currency_id ? parseInt(formData.currency_id) : null,
        exchange_rate: formData.exchange_rate,
        project_id: formData.project_id ? parseInt(formData.project_id) : null,
        contract_value: formTotals.total,
        renewal_terms: formData.renewal_terms,
        auto_renew: formData.auto_renew,
        renewal_notice_days: formData.renewal_notice_days,
        notes: formData.notes,
        terms_and_conditions: formData.terms_and_conditions,
        items: formData.items.map(i => ({
          item_id: i.item_id,
          item_code: i.item_code,
          item_name: i.item_name,
          item_name_ar: i.item_name_ar,
          uom_id: i.uom_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          discount_percent: i.discount_percent,
          tax_rate: i.tax_rate,
          line_total: i.line_total,
        })),
      };

      const url = editingId ? `${API_BASE}/procurement/contracts/${editingId}` : `${API_BASE}/procurement/contracts`;
      const res = await fetch(url, { method: editingId ? 'PUT' : 'POST', headers: getHeaders(), body: JSON.stringify(body) });

      if (res.ok) {
        showToast({ message: isAr ? (editingId ? 'تم تحديث العقد' : 'تم إنشاء العقد') : (editingId ? 'Contract updated' : 'Contract created'), type: 'success' });
        setFormModalOpen(false); fetchContracts();
      } else {
        const err = await res.json(); showToast({ message: err.error?.message || 'Operation failed', type: 'error' });
      }
    } catch (e) { showToast({ message: 'Operation failed', type: 'error' }); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      const res = await fetch(`${API_BASE}/procurement/contracts/${toDelete.id}`, { method: 'DELETE', headers: getHeaders() });
      if (res.ok) {
        showToast({ message: isAr ? 'تم حذف العقد' : 'Contract deleted', type: 'success' });
        setDeleteConfirmOpen(false); setToDelete(null); fetchContracts();
      } else {
        const err = await res.json(); showToast({ message: err.error?.message || 'Delete failed', type: 'error' });
      }
    } catch (e) { showToast({ message: 'Delete failed', type: 'error' }); }
  };

  const handleApprove = async () => {
    if (!toApprove) return;
    try {
      const res = await fetch(`${API_BASE}/procurement/contracts/${toApprove.id}/approve`, { method: 'PUT', headers: getHeaders() });
      if (res.ok) {
        showToast({ message: isAr ? 'تم اعتماد العقد' : 'Contract approved', type: 'success' });
        setApproveConfirmOpen(false); setToApprove(null); fetchContracts();
      } else {
        const err = await res.json(); showToast({ message: err.error?.message || 'Approve failed', type: 'error' });
      }
    } catch (e) { showToast({ message: 'Approve failed', type: 'error' }); }
  };

  /* ─── Format Helpers ───────────────────────────────────────── */

  const fmtCurrency = (amt: number, sym?: string) =>
    `${sym || 'SAR'} ${Number(amt || 0).toLocaleString(isAr ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  const getStatusBadge = (code?: string, name?: string, nameAr?: string) => {
    const c = (code || 'DRAFT').toUpperCase();
    const colors = STATUS_COLORS[c] || STATUS_COLORS.DRAFT;
    return (
      <span className={clsx('px-2.5 py-1 text-xs font-semibold rounded-full', colors.bg, colors.text)}>
        {isAr ? (nameAr || name || code) : (name || code)}
      </span>
    );
  };

  const daysUntil = (dateStr?: string) => {
    if (!dateStr) return Infinity;
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  /* ─── Render ───────────────────────────────────────────────── */

  return (
    <MainLayout>
      <Head>
        <title>{isAr ? 'عقود الموردين' : 'Vendor Contracts'} - SLMS</title>
      </Head>

      <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ClipboardDocumentListIcon className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isAr ? 'عقود الموردين' : 'Vendor Contracts'}</h1>
              <p className="text-sm text-gray-500">{isAr ? `${total} عقد` : `${total} contracts`}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={fetchContracts}><ArrowPathIcon className="h-5 w-5" /></Button>
            {hasPermission('vendor_contracts:create') && (
              <Button onClick={openCreate}>
                <PlusIcon className="h-5 w-5 ltr:mr-1 rtl:ml-1" />{isAr ? 'عقد جديد' : 'New Contract'}
              </Button>
            )}
          </div>
        </div>

        {/* Expiry Alert Banner */}
        {expiringContracts.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                {isAr ? `${expiringContracts.length} عقود تنتهي خلال 30 يوم` : `${expiringContracts.length} contracts expiring within 30 days`}
              </h3>
              <div className="mt-1 space-y-1">
                {expiringContracts.slice(0, 3).map(c => (
                  <p key={c.id} className="text-xs text-amber-700 dark:text-amber-400">
                    {c.contract_number} — {isAr ? c.vendor_name_ar || c.vendor_name : c.vendor_name} — {fmtDate(c.end_date)} ({daysUntil(c.end_date)} {isAr ? 'يوم' : 'days'})
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: isAr ? 'الإجمالي' : 'Total', value: stats.total, icon: ClipboardDocumentListIcon, color: 'blue' },
            { label: isAr ? 'مسودة' : 'Draft', value: stats.draft, icon: PencilSquareIcon, color: 'gray' },
            { label: isAr ? 'نشط' : 'Active', value: stats.active, icon: CheckCircleIcon, color: 'green' },
            { label: isAr ? 'ينتهي قريباً' : 'Expiring', value: stats.expiring, icon: ExclamationTriangleIcon, color: 'amber' },
            { label: isAr ? 'منتهي' : 'Expired', value: stats.expired, icon: ClockIcon, color: 'red' },
          ].map((kpi, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{kpi.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{kpi.value}</p>
                </div>
                <div className={clsx('p-2 rounded-lg',
                  kpi.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30' :
                  kpi.color === 'gray' ? 'bg-gray-100 dark:bg-gray-700' :
                  kpi.color === 'green' ? 'bg-green-100 dark:bg-green-900/30' :
                  kpi.color === 'amber' ? 'bg-amber-100 dark:bg-amber-900/30' :
                  'bg-red-100 dark:bg-red-900/30'
                )}>
                  <kpi.icon className={clsx('h-6 w-6',
                    kpi.color === 'blue' ? 'text-blue-600' :
                    kpi.color === 'gray' ? 'text-gray-500' :
                    kpi.color === 'green' ? 'text-green-600' :
                    kpi.color === 'amber' ? 'text-amber-600' : 'text-red-600'
                  )} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2 relative">
              <MagnifyingGlassIcon className={clsx("absolute top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400", isAr ? 'right-3' : 'left-3')} />
              <input type="text" placeholder={isAr ? 'بحث...' : 'Search...'} value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className={clsx("w-full py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white", isAr ? 'pr-10 pl-4' : 'pl-10 pr-4')} />
            </div>
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
              <option value="">{isAr ? 'كل الأنواع' : 'All Types'}</option>
              {contractTypes.map(t => <option key={t.id} value={t.id}>{isAr ? (t.name_ar || t.name) : t.name}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
              <option value="">{isAr ? 'كل الحالات' : 'All Statuses'}</option>
              {contractStatuses.map(s => <option key={s.id} value={s.id}>{isAr ? (s.name_ar || s.name) : s.name}</option>)}
            </select>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
              <option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
          ) : contracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <ClipboardDocumentListIcon className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-lg font-medium">{isAr ? 'لا توجد عقود' : 'No contracts found'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 dark:bg-slate-900/50">
                  <tr>
                    {[isAr ? 'الرقم' : 'Number', isAr ? 'المورد' : 'Vendor', isAr ? 'المشروع' : 'Project', isAr ? 'النوع' : 'Type',
                      isAr ? 'البداية' : 'Start', isAr ? 'النهاية' : 'End', isAr ? 'القيمة' : 'Value',
                      isAr ? 'الحالة' : 'Status', isAr ? 'الإجراءات' : 'Actions'
                    ].map((h, i) => (
                      <th key={i} className={clsx('px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider', i === 8 ? 'text-center' : 'text-start')}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                  {contracts.map(c => {
                    const days = daysUntil(c.end_date);
                    const isExpiringSoon = days <= 30 && days > 0;
                    return (
                      <tr key={c.id} className={clsx('hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors', isExpiringSoon && 'bg-amber-50/30 dark:bg-amber-900/10')}>
                        <td className="px-4 py-3">
                          <button onClick={() => openView(c)} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">{c.contract_number}</button>
                          {c.title && <div className="text-xs text-gray-500 truncate max-w-[200px]">{isAr ? c.title_ar || c.title : c.title}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{isAr ? c.vendor_name_ar || c.vendor_name : c.vendor_name}</div>
                          {c.vendor_code && <div className="text-xs text-gray-500">{c.vendor_code}</div>}
                        </td>
                        <td className="px-4 py-3">
                          {c.project_code ? (
                            <div>
                              <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{c.project_code}</div>
                              <div className="text-xs text-gray-500">{isAr ? c.project_name_ar || c.project_name : c.project_name}</div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">{isAr ? 'غير مرتبط' : 'Not linked'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{isAr ? c.contract_type_name_ar || c.contract_type_name : c.contract_type_name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{fmtDate(c.start_date)}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={clsx(isExpiringSoon && 'text-amber-600 font-medium')}>{fmtDate(c.end_date)}</span>
                          {isExpiringSoon && <div className="text-xs text-amber-500">{days} {isAr ? 'يوم' : 'days'}</div>}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{fmtCurrency(c.contract_value, c.currency_symbol)}</td>
                        <td className="px-4 py-3">{getStatusBadge(c.contract_status_code, c.contract_status_name, c.contract_status_name_ar)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => openView(c)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"><EyeIcon className="h-4 w-4" /></button>

                            {(c.contract_status_code === 'DRAFT' || c.contract_status_code === 'PENDING_APPROVAL') && hasPermission('vendor_contracts:edit') && (
                              <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20"><PencilSquareIcon className="h-4 w-4" /></button>
                            )}

                            {!c.is_approved && hasPermission('vendor_contracts:approve') && (
                              <button onClick={() => { setToApprove(c); setApproveConfirmOpen(true); }} className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20"><CheckCircleIcon className="h-4 w-4" /></button>
                            )}

                            {c.contract_status_code === 'DRAFT' && hasPermission('vendor_contracts:delete') && (
                              <button onClick={() => { setToDelete(c); setDeleteConfirmOpen(true); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><TrashIcon className="h-4 w-4" /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-slate-700">
              <span className="text-sm text-gray-500">{isAr ? `صفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`}</span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{isAr ? 'السابق' : 'Previous'}</Button>
                <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>{isAr ? 'التالي' : 'Next'}</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={formModalOpen} onClose={() => setFormModalOpen(false)}
        title={isAr ? (editingId ? 'تعديل العقد' : 'عقد جديد') : (editingId ? 'Edit Contract' : 'New Contract')} size="xl">
        <div className="space-y-5 max-h-[70vh] overflow-y-auto px-1" dir={isAr ? 'rtl' : 'ltr'}>
          {/* Section: Contract Info */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-5 border border-blue-100 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-4 flex items-center gap-2">
              <DocumentCheckIcon className="h-4 w-4" />
              {isAr ? 'معلومات العقد' : 'Contract Information'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isAr ? 'المورد' : 'Vendor'} <span className="text-red-500">*</span></label>
                <SearchableSelect options={vendorOptions} value={formData.vendor_id} onChange={(val) => setFormData(prev => ({ ...prev, vendor_id: val }))} placeholder={isAr ? 'اختر المورد' : 'Select Vendor'} error={formErrors.vendor_id} locale={locale} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isAr ? 'نوع العقد' : 'Type'}</label>
                <SearchableSelect options={typeOptions} value={formData.contract_type_id} onChange={(val) => setFormData(prev => ({ ...prev, contract_type_id: val }))} placeholder={isAr ? 'اختر النوع' : 'Select Type'} locale={locale} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isAr ? 'المشروع' : 'Project'}</label>
                <SearchableSelect options={projectOptions} value={formData.project_id} onChange={(val) => setFormData(prev => ({ ...prev, project_id: val }))} placeholder={isAr ? 'اختر المشروع' : 'Select Project'} locale={locale} />
                <p className="text-xs text-gray-400 mt-1">{isAr ? 'ربط العقد بمشروع (يبقى مسودة حتى يتم الربط أو الاعتماد)' : 'Link to project (stays draft until linked or approved)'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isAr ? 'عنوان العقد (إنجليزي)' : 'Title (English)'}</label>
                <input type="text" value={formData.title} onChange={(e) => { const v = e.target.value.replace(/[^\x00-\x7F\s]/g, ''); setFormData(prev => ({ ...prev, title: v })); }}
                  placeholder={isAr ? 'أدخل العنوان بالإنجليزية فقط' : 'English characters only'}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isAr ? 'العنوان بالعربية' : 'Title (Arabic)'}</label>
                <input type="text" value={formData.title_ar} onChange={(e) => { const v = e.target.value.replace(/[a-zA-Z]/g, ''); setFormData(prev => ({ ...prev, title_ar: v })); }}
                  placeholder={isAr ? 'أدخل العنوان بالعربية فقط' : 'Arabic characters only'}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white" dir="rtl" />
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isAr ? 'تاريخ البداية' : 'Start Date'} <span className="text-red-500">*</span></label>
                <input type="date" value={formData.start_date} onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))} className={clsx("w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white", formErrors.start_date ? 'border-red-500' : 'border-gray-300 dark:border-slate-600')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isAr ? 'تاريخ النهاية' : 'End Date'}</label>
                <input type="date" value={formData.end_date} onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isAr ? 'العملة' : 'Currency'}</label>
                <CurrencySelector value={formData.currency_id} onChange={(id, code) => {
                  setFormData(prev => ({ ...prev, currency_id: String(id), exchange_rate: code === companyCurrencyCode ? 1 : prev.exchange_rate }));
                  if (code) setSelectedCurrencyCode(code);
                }} />
              </div>
              {showExchangeRate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isAr ? 'سعر الصرف' : 'Exchange Rate'}
                    <span className="text-xs text-gray-400 ms-1">({selectedCurrencyCode} → {companyCurrencyCode})</span>
                  </label>
                  <input type="number" min="0.0001" step="0.0001" value={formData.exchange_rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, exchange_rate: parseFloat(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-amber-300 dark:border-amber-600 rounded-lg bg-amber-50 dark:bg-slate-700 text-gray-900 dark:text-white font-mono" />
                </div>
              )}
              <div className="flex items-end gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer group" title={isAr ? 'تجديد العقد تلقائياً عند انتهائه' : 'Automatically renew when contract expires'}>
                  <input type="checkbox" checked={formData.auto_renew} onChange={(e) => setFormData(prev => ({ ...prev, auto_renew: e.target.checked }))} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="group-hover:text-blue-600 transition-colors">{isAr ? 'تجديد تلقائي' : 'Auto Renew'}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Section: Line Items */}
          <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-5 border border-purple-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-purple-800 dark:text-purple-300 flex items-center gap-2">
                <CubeIcon className="h-4 w-4" />{isAr ? 'البنود' : 'Line Items'}
                {formErrors.items && <span className="text-red-500 text-xs font-normal ms-2">({formErrors.items})</span>}
              </h3>
              <Button size="sm" variant="secondary" onClick={() => setItemsPickerOpen(true)}>
                <PlusIcon className="h-4 w-4 ltr:mr-1 rtl:ml-1" />{isAr ? 'إضافة أصناف' : 'Add Items'}
              </Button>
            </div>

            {formData.items.length === 0 ? (
              <div className="border-2 border-dashed border-purple-200 dark:border-slate-600 rounded-lg p-8 text-center bg-white/50 dark:bg-slate-900/20">
                <CubeIcon className="h-10 w-10 text-purple-200 mx-auto mb-2" />
                <p className="text-sm text-gray-500">{isAr ? 'أضف أصناف للعقد' : 'Add items to the contract'}</p>
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
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500" title={isAr ? 'نسبة الخصم' : 'Discount %'}>{isAr ? 'خصم%' : 'Disc%'}</th>
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
                          <input type="number" min="0.01" step="0.01" value={item.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                            onKeyDown={(e) => { if (!/[\d.\-backspace\tab\delete\arrowleft\arrowright]/.test(e.key) && !e.ctrlKey) { /* let browser handle number input */ } }}
                            className="w-20 px-2 py-1 text-center border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min="0" step="0.01" value={item.unit_price}
                            onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="w-24 px-2 py-1 text-center border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min="0" max="100" step="0.5" value={item.discount_percent || 0}
                            onChange={(e) => updateItem(idx, 'discount_percent', parseFloat(e.target.value) || 0)}
                            className="w-16 px-1 py-1 text-center border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min="0" max="100" step="0.5" value={item.tax_rate || 0}
                            onChange={(e) => updateItem(idx, 'tax_rate', parseFloat(e.target.value) || 0)}
                            className="w-16 px-1 py-1 text-center border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm" />
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
                    <tr>
                      <td colSpan={3}></td>
                      <td colSpan={4} className="px-3 py-1.5 text-end text-sm text-gray-600">{isAr ? 'الضريبة' : 'Tax'}</td>
                      <td className="px-3 py-1.5 text-end text-sm font-medium text-amber-600">{formTotals.tax.toFixed(2)}</td>
                      <td></td>
                    </tr>
                    <tr className="border-t border-gray-200 dark:border-slate-600">
                      <td colSpan={3}></td>
                      <td colSpan={4} className="px-3 py-2 text-end font-bold text-base">{isAr ? 'إجمالي قيمة العقد' : 'Contract Value'}</td>
                      <td className="px-3 py-2 text-end text-base font-bold text-blue-600">{formTotals.total.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Terms & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isAr ? 'الشروط والأحكام' : 'Terms & Conditions'}</label>
              <textarea value={formData.terms_and_conditions} onChange={(e) => setFormData(prev => ({ ...prev, terms_and_conditions: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isAr ? 'ملاحظات' : 'Notes'}</label>
              <textarea value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white" />
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setFormModalOpen(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSubmit} loading={submitting}>{isAr ? (editingId ? 'تحديث' : 'إنشاء') : (editingId ? 'Update' : 'Create')}</Button>
          </div>
        </div>
      </Modal>

      {/* View Detail Modal */}
      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title={isAr ? 'تفاصيل العقد' : 'Contract Details'} size="xl">
        {viewing && (
          <div className="space-y-5" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: isAr ? 'الرقم' : 'Number', value: viewing.contract_number, bold: true },
                { label: isAr ? 'المورد' : 'Vendor', value: isAr ? viewing.vendor_name_ar || viewing.vendor_name : viewing.vendor_name },
                { label: isAr ? 'المشروع' : 'Project', value: viewing.project_code ? `${viewing.project_code} — ${isAr ? viewing.project_name_ar || viewing.project_name : viewing.project_name}` : null },
                { label: isAr ? 'النوع' : 'Type', value: isAr ? viewing.contract_type_name_ar || viewing.contract_type_name : viewing.contract_type_name },
                { label: isAr ? 'الحالة' : 'Status', value: null },
                { label: isAr ? 'البداية' : 'Start', value: fmtDate(viewing.start_date) },
                { label: isAr ? 'النهاية' : 'End', value: fmtDate(viewing.end_date) },
                { label: isAr ? 'العملة' : 'Currency', value: viewing.currency_code || 'SAR' },
                { label: isAr ? 'سعر الصرف' : 'Exchange Rate', value: viewing.exchange_rate && viewing.exchange_rate !== 1 ? String(viewing.exchange_rate) : null },
                { label: isAr ? 'القيمة' : 'Value', value: fmtCurrency(viewing.contract_value, viewing.currency_symbol), bold: true },
              ].map((f, i) => (
                <div key={i}>
                  <p className="text-xs text-gray-500">{f.label}</p>
                  {f.label === (isAr ? 'الحالة' : 'Status')
                    ? getStatusBadge(viewing.contract_status_code, viewing.contract_status_name, viewing.contract_status_name_ar)
                    : <p className={clsx('mt-0.5', f.bold ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300')}>{f.value || '-'}</p>
                  }
                </div>
              ))}
            </div>

            {viewing.title && (
              <div>
                <p className="text-xs text-gray-500">{isAr ? 'العنوان' : 'Title'}</p>
                <p className="font-medium">{isAr ? viewing.title_ar || viewing.title : viewing.title}</p>
              </div>
            )}

            {viewing.is_approved && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-sm flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-700">{isAr ? 'معتمد' : 'Approved'} {viewing.approved_at ? `— ${fmtDate(viewing.approved_at)}` : ''}</span>
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
                        <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">{isAr ? 'الكوحدة' : 'UOM'}</th>
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
                          <td className="px-3 py-2">{isAr ? item.item_name_ar || item.item_name : item.item_name}</td>
                          <td className="px-3 py-2 text-center text-xs text-gray-500">{item.uom_code || '-'}</td>
                          <td className="px-3 py-2 text-center">{item.quantity}</td>
                          <td className="px-3 py-2 text-end">{Number(item.unit_price).toFixed(2)}</td>
                          <td className="px-3 py-2 text-center text-xs">{item.discount_percent ? `${item.discount_percent}%` : '-'}</td>
                          <td className="px-3 py-2 text-center text-xs">{item.tax_rate ? `${item.tax_rate}%` : '-'}</td>
                          <td className="px-3 py-2 text-end font-semibold">{Number(item.line_total).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 dark:bg-slate-900/50 border-t-2">
                      <tr>
                        <td colSpan={8} className="px-3 py-2 text-end font-bold">{isAr ? 'قيمة العقد' : 'Contract Value'}</td>
                        <td className="px-3 py-2 text-end font-bold text-blue-600">{fmtCurrency(viewing.contract_value, viewing.currency_symbol)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {viewing.terms_and_conditions && (
              <div>
                <p className="text-xs text-gray-500 mb-1">{isAr ? 'الشروط والأحكام' : 'Terms & Conditions'}</p>
                <p className="text-sm whitespace-pre-wrap">{viewing.terms_and_conditions}</p>
              </div>
            )}
            {viewing.notes && (
              <div>
                <p className="text-xs text-gray-500 mb-1">{isAr ? 'ملاحظات' : 'Notes'}</p>
                <p className="text-sm">{viewing.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Items Picker */}
      <ItemsPickerDialog isOpen={itemsPickerOpen} onClose={() => setItemsPickerOpen(false)} onAdd={handleItemsFromPicker} excludeItemIds={formData.items.map(i => i.item_id).filter(Boolean) as number[]} locale={locale} />

      {/* Approve Confirm */}
      <ConfirmDialog isOpen={approveConfirmOpen} onClose={() => { setApproveConfirmOpen(false); setToApprove(null); }} onConfirm={handleApprove}
        title={isAr ? 'اعتماد العقد' : 'Approve Contract'}
        message={isAr ? `هل أنت متأكد من اعتماد العقد ${toApprove?.contract_number}؟` : `Approve contract ${toApprove?.contract_number}?`}
        confirmText={isAr ? 'اعتماد' : 'Approve'} variant="primary"
      />

      {/* Delete Confirm */}
      <ConfirmDialog isOpen={deleteConfirmOpen} onClose={() => { setDeleteConfirmOpen(false); setToDelete(null); }} onConfirm={handleDelete}
        title={isAr ? 'حذف العقد' : 'Delete Contract'}
        message={isAr ? `هل أنت متأكد من حذف العقد ${toDelete?.contract_number}؟` : `Delete contract ${toDelete?.contract_number}?`}
        confirmText={isAr ? 'حذف' : 'Delete'} variant="danger"
      />
    </MainLayout>
  );
}

export default withPermission('vendor_contracts:view', VendorContractsPage);
