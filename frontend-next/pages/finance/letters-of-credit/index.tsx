/**
 * 🏦 LETTERS OF CREDIT — الاعتمادات المستندية
 * =============================================
 * Full LC management: Dashboard, CRUD, Status Workflow, Documents, Payments
 * SWIFT MT700 compliant · UCP 600 fields
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../../components/layout/MainLayout';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import Tabs, { Tab } from '../../../components/ui/Tabs';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { useTranslation } from '../../../hooks/useTranslation';
import { useToast } from '../../../contexts/ToastContext';
import { usePermissions } from '../../../hooks/usePermissions';
import {
  DocumentCheckIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  BellAlertIcon,
  ClockIcon,
  BuildingLibraryIcon,
  ChartBarIcon,
  ArrowPathIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  DocumentTextIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import ExchangeRateField from '../../../components/ui/ExchangeRateField';

/* ─── Types ─────────────────────────────────────────── */
interface LcType { id: number; code: string; name: string; name_ar: string }
interface LcStatus { id: number; code: string; name: string; name_ar: string; color: string }
interface LetterOfCredit {
  id: number; lc_number: string; lc_type_id: number; status_id: number;
  type_name?: string; type_name_ar?: string; type_code?: string;
  status_name?: string; status_name_ar?: string; status_color?: string; status_code?: string;
  beneficiary_vendor_id?: number; beneficiary_name?: string; beneficiary_name_ar?: string;
  vendor_name?: string; vendor_name_ar?: string; vendor_code?: string;
  issuing_bank_id?: number; issuing_bank_name?: string; issuing_bank_name_display?: string;
  advising_bank_name?: string; confirming_bank_name?: string;
  currency_id: number; currency_code?: string;
  original_amount: number; current_amount: number; utilized_amount: number; available_amount?: number;
  exchange_rate?: number; tolerance_percent?: number; total_fees?: number;
  issue_date: string; expiry_date: string; latest_shipment_date?: string;
  presentation_period_days?: number; payment_terms?: string; tenor_days?: number;
  partial_shipments?: string; transhipment?: string;
  port_of_loading?: string; port_of_discharge?: string; incoterm?: string;
  goods_description?: string; required_documents?: any;
  special_conditions?: string; internal_notes?: string;
  project_id?: number; project_name?: string; project_code?: string;
  purchase_order_id?: number; shipment_id?: number;
  expense_account_id?: number; liability_account_id?: number; margin_account_id?: number;
  margin_percent?: number; margin_amount?: number;
  opening_commission?: number; amendment_fees?: number; swift_charges?: number; other_charges?: number;
  days_before_expiry_alert?: number; days_before_shipment_alert?: number;
  is_confirmed?: boolean;
  issuing_bank_swift?: string; issuing_bank_address?: string;
  advising_bank_swift?: string; confirming_bank_swift?: string;
  beneficiary_address?: string; beneficiary_country_id?: number;
  created_at: string;
}
interface DashboardData {
  summary?: { active_lcs: number; draft_lcs: number; issued_lcs: number; paid_lcs: number; expiring_soon: number; shipment_due_soon: number; total_active_amount: number; total_utilized: number; total_available: number };
  by_currency?: { currency_code: string; count: number; total_amount: number }[];
  recent_alerts?: { id: number; lc_id: number; lc_number: string; alert_type: string; title: string; title_ar: string; message?: string; priority: string; trigger_date: string; is_read: boolean }[];
}

const API = '/api';

/* ─── Status Visual Config ──────────────────────────── */
const SC: Record<string, { icon: string; bg: string; text: string }> = {
  DRAFT:               { icon: '📝', bg: 'bg-slate-100 dark:bg-slate-800',       text: 'text-slate-700 dark:text-slate-300' },
  REQUESTED:           { icon: '📤', bg: 'bg-blue-100 dark:bg-blue-900/30',      text: 'text-blue-700 dark:text-blue-300' },
  ISSUED:              { icon: '✅', bg: 'bg-teal-100 dark:bg-teal-900/30',      text: 'text-teal-700 dark:text-teal-300' },
  ADVISED:             { icon: '📨', bg: 'bg-cyan-100 dark:bg-cyan-900/30',      text: 'text-cyan-700 dark:text-cyan-300' },
  CONFIRMED:           { icon: '🔒', bg: 'bg-indigo-100 dark:bg-indigo-900/30',  text: 'text-indigo-700 dark:text-indigo-300' },
  AMENDED:             { icon: '✏️', bg: 'bg-purple-100 dark:bg-purple-900/30',  text: 'text-purple-700 dark:text-purple-300' },
  DOCUMENTS_PRESENTED: { icon: '📎', bg: 'bg-amber-100 dark:bg-amber-900/30',    text: 'text-amber-700 dark:text-amber-300' },
  DISCREPANT:          { icon: '⚠️', bg: 'bg-orange-100 dark:bg-orange-900/30',  text: 'text-orange-700 dark:text-orange-300' },
  PAID:                { icon: '💰', bg: 'bg-green-100 dark:bg-green-900/30',    text: 'text-green-700 dark:text-green-300' },
  CLOSED:              { icon: '✅', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
  CANCELLED:           { icon: '🚫', bg: 'bg-red-100 dark:bg-red-900/30',        text: 'text-red-700 dark:text-red-300' },
  EXPIRED:             { icon: '⏰', bg: 'bg-gray-100 dark:bg-gray-700',          text: 'text-gray-700 dark:text-gray-300' },
};

const TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['REQUESTED', 'CANCELLED'], REQUESTED: ['ISSUED', 'CANCELLED'],
  ISSUED: ['ADVISED', 'CONFIRMED', 'AMENDED', 'CANCELLED', 'EXPIRED'],
  ADVISED: ['DOCUMENTS_PRESENTED', 'AMENDED', 'CANCELLED', 'EXPIRED'],
  CONFIRMED: ['DOCUMENTS_PRESENTED', 'AMENDED', 'CANCELLED', 'EXPIRED'],
  AMENDED: ['DOCUMENTS_PRESENTED', 'CANCELLED', 'EXPIRED'],
  DOCUMENTS_PRESENTED: ['PAID', 'DISCREPANT'], DISCREPANT: ['PAID', 'CANCELLED'],
  PAID: ['CLOSED'], CLOSED: [], CANCELLED: [], EXPIRED: [],
};

/* ═══════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function LettersOfCreditPage() {
  const router = useRouter();
  const { locale, t } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const isRTL = locale === 'ar';

  /* ── data states ── */
  const [lcs, setLcs] = useState<LetterOfCredit[]>([]);
  const [lcTypes, setLcTypes] = useState<LcType[]>([]);
  const [lcStatuses, setLcStatuses] = useState<LcStatus[]>([]);
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [ports, setPorts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [vendorProjects, setVendorProjects] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  /* ── ui states ── */
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selStatuses, setSelStatuses] = useState<string[]>([]);
  const [selType, setSelType] = useState('');
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);

  /* ── modal states ── */
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LetterOfCredit | null>(null);
  const [selected, setSelected] = useState<LetterOfCredit | null>(null);
  const [formTab, setFormTab] = useState(0);
  const [statusNotes, setStatusNotes] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');
  const [showVendorDD, setShowVendorDD] = useState(false);
  const [vendorSearchLoading, setVendorSearchLoading] = useState(false);
  const [vendorSearchResults, setVendorSearchResults] = useState<any[]>([]);

  /* ── import source states ── */
  const [importSource, setImportSource] = useState<'none' | 'po' | 'quotation' | 'contract'>('none');
  const [importSearchTerm, setImportSearchTerm] = useState('');
  const [importResults, setImportResults] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importLinked, setImportLinked] = useState<{ type: string; number: string; id: number } | null>(null);

  /* ── bank search ── */
  const [bankSearch, setBankSearch] = useState('');
  const [showBankDD, setShowBankDD] = useState(false);
  /* ── port search ── */
  const [loadPortSearch, setLoadPortSearch] = useState('');
  const [showLoadPortDD, setShowLoadPortDD] = useState(false);
  const [dischPortSearch, setDischPortSearch] = useState('');
  const [showDischPortDD, setShowDischPortDD] = useState(false);
  /* ── account search ── */
  const [acctSearch, setAcctSearch] = useState({ expense: '', liability: '', margin: '' });
  /* ── sync confirmation ── */
  const [syncPreview, setSyncPreview] = useState<any>(null);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<any>(null);

  /* ── form ── */
  const blank = {
    lc_number: '', lc_type_id: '', status_id: '',
    beneficiary_vendor_id: '', beneficiary_name: '', beneficiary_name_ar: '', beneficiary_address: '', beneficiary_country_id: '',
    issuing_bank_id: '', issuing_bank_name: '', issuing_bank_swift: '', issuing_bank_address: '',
    advising_bank_name: '', advising_bank_swift: '', confirming_bank_name: '', confirming_bank_swift: '', is_confirmed: false,
    currency_id: '', original_amount: '', tolerance_percent: '0', exchange_rate: '1',
    issue_date: new Date().toISOString().split('T')[0], expiry_date: '', latest_shipment_date: '',
    presentation_period_days: '21', payment_terms: '', tenor_days: '',
    partial_shipments: 'allowed', transhipment: 'allowed',
    port_of_loading: '', port_of_loading_id: '', port_of_discharge: '', port_of_discharge_id: '', incoterm: '',
    goods_description: '', required_documents: '', special_conditions: '',
    project_id: '', purchase_order_id: '', shipment_id: '',
    expense_account_id: '', liability_account_id: '', margin_account_id: '',
    margin_percent: '0', margin_amount: '0',
    opening_commission: '0', amendment_fees: '0', swift_charges: '0', other_charges: '0',
    days_before_expiry_alert: '30', days_before_shipment_alert: '14', internal_notes: '',
  };
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const token = () => localStorage.getItem('accessToken');

  /* ── tabs ── */
  const tabFilters: Record<string, string[]> = {
    all: [], active: ['DRAFT', 'REQUESTED', 'ISSUED', 'ADVISED', 'CONFIRMED', 'AMENDED'],
    documents: ['DOCUMENTS_PRESENTED', 'DISCREPANT'], completed: ['PAID', 'CLOSED'], alerts: [],
  };

  /* ═══════════════════════════════════════════════════════
     FETCH
     ═══════════════════════════════════════════════════════ */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const h: Record<string, string> = { Authorization: `Bearer ${token()}` };
      const sf = (tabFilters[activeTab]?.length ? tabFilters[activeTab] : selStatuses).join(',');
      const p = new URLSearchParams();
      if (sf) p.append('status', sf);
      if (selType) p.append('type', selType);
      if (searchTerm) p.append('search', searchTerm);
      p.append('page', String(page)); p.append('limit', '50');

      const [r1, r2, r3, r4, r5, r6, r7, r8, r9] = await Promise.all([
        fetch(`${API}/letters-of-credit?${p}`, { headers: h }),
        fetch(`${API}/letters-of-credit/types`, { headers: h }),
        fetch(`${API}/letters-of-credit/statuses`, { headers: h }),
        fetch(`${API}/letters-of-credit/dashboard`, { headers: h }),
        fetch(`${API}/finance/currencies?is_active=true`, { headers: h }),
        fetch(`${API}/bank-accounts`, { headers: h }),
        fetch(`${API}/accounts?is_active=true`, { headers: h }),
        fetch(`${API}/banks?is_active=true`, { headers: h }),
        fetch(`${API}/ports?is_active=true`, { headers: h }),
      ]);
      if (r1.ok) { const d = await r1.json(); setLcs(d.data || []); setTotalCount(d.total || 0); }
      if (r2.ok) { const d = await r2.json(); setLcTypes(d.data || []); }
      if (r3.ok) { const d = await r3.json(); setLcStatuses(d.data || []); }
      if (r4.ok) { const d = await r4.json(); setDash(d.data || null); }
      if (r5.ok) { const d = await r5.json(); setCurrencies(d.data || []); }
      if (r6.ok) { const d = await r6.json(); setBankAccounts(d.data || []); }
      if (r7.ok) { const d = await r7.json(); setAccounts(d.data || []); }
      if (r8.ok) { const d = await r8.json(); setBanks(d.data || []); }
      if (r9.ok) { const d = await r9.json(); setPorts(d.data || []); }
    } catch (e) {
      console.error('LC fetch error:', e);
      showToast(isRTL ? 'فشل في جلب البيانات' : 'Failed to fetch data', 'error');
    } finally { setLoading(false); }
  }, [activeTab, selStatuses, selType, searchTerm, page]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (router.query.action === 'create') { setForm(blank); setErrors({}); setCreateOpen(true); } }, [router.query.action]);

  /* ─── Helpers ─────────────────────────────────────── */
  const fmt = (n: number, c = 'SAR') => { try { return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-SA', { style: 'currency', currency: c || 'SAR', minimumFractionDigits: 2 }).format(n || 0); } catch { return `${(n || 0).toFixed(2)} ${c}`; } };
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString(isRTL ? 'ar-SA' : 'en-GB') : '—';
  const daysUntil = (d: string) => d ? Math.ceil((new Date(d).getTime() - Date.now()) / 864e5) : null;

  const expiryColor = (d: string) => {
    const n = daysUntil(d); if (n === null) return '';
    if (n < 0) return 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
    if (n <= 7) return 'text-red-600 dark:text-red-400';
    if (n <= 30) return 'text-orange-600 dark:text-orange-400';
    if (n <= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const statusBadge = (code: string, name?: string, nameAr?: string) => {
    const c = SC[code] || SC.DRAFT;
    return <span className={clsx('inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full', c.bg, c.text)}>{c.icon} {isRTL ? (nameAr || code) : (name || code)}</span>;
  };

  const utilPct = (lc: LetterOfCredit) => lc.current_amount ? Math.min(100, Math.round((lc.utilized_amount / lc.current_amount) * 100)) : 0;

  /* ── Server-side vendor search ── */
  const searchVendors = useCallback(async (q: string) => {
    if (!q || q.length < 2) { setVendorSearchResults([]); return; }
    setVendorSearchLoading(true);
    try {
      const res = await fetch(`${API}/procurement/vendors?search=${encodeURIComponent(q)}&limit=30`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) { const d = await res.json(); setVendorSearchResults(d.data || []); }
    } catch { /* silent */ }
    finally { setVendorSearchLoading(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { if (vendorSearch.length >= 2 && showVendorDD) searchVendors(vendorSearch); }, 300);
    return () => clearTimeout(t);
  }, [vendorSearch, showVendorDD, searchVendors]);

  /* ── Fetch vendor projects when vendor changes ── */
  useEffect(() => {
    if (!form.beneficiary_vendor_id) { setVendorProjects([]); return; }
    (async () => {
      try {
        const res = await fetch(`${API}/letters-of-credit/available-projects/${form.beneficiary_vendor_id}`, { headers: { Authorization: `Bearer ${token()}` } });
        if (res.ok) { const d = await res.json(); setVendorProjects(d.data || []); }
      } catch { /* silent */ }
    })();
  }, [form.beneficiary_vendor_id]);

  /* ── Auto-fill bank SWIFT when bank selected ── */
  const onBankSelect = (bank: any) => {
    setForm(f => ({ ...f, issuing_bank_name: isRTL ? bank.name_ar || bank.name : bank.name, issuing_bank_swift: bank.swift_code || '' }));
    setBankSearch(isRTL ? bank.name_ar || bank.name : bank.name);
    setShowBankDD(false);
  };
  const filteredBanks = useMemo(() => {
    if (!bankSearch) return banks.slice(0, 20);
    const s = bankSearch.toLowerCase();
    return banks.filter((b: any) => b.name?.toLowerCase().includes(s) || b.name_ar?.toLowerCase().includes(s) || b.swift_code?.toLowerCase().includes(s) || b.code?.toLowerCase().includes(s)).slice(0, 20);
  }, [banks, bankSearch]);

  /* ── Port search (loading & discharge) ── */
  const filteredLoadPorts = useMemo(() => {
    if (!loadPortSearch) return ports.slice(0, 20);
    const s = loadPortSearch.toLowerCase();
    return ports.filter((p: any) => p.name_en?.toLowerCase().includes(s) || p.name_ar?.toLowerCase().includes(s) || p.port_code?.toLowerCase().includes(s) || p.country_name_en?.toLowerCase().includes(s)).slice(0, 20);
  }, [ports, loadPortSearch]);
  const filteredDischPorts = useMemo(() => {
    if (!dischPortSearch) return ports.slice(0, 20);
    const s = dischPortSearch.toLowerCase();
    return ports.filter((p: any) => p.name_en?.toLowerCase().includes(s) || p.name_ar?.toLowerCase().includes(s) || p.port_code?.toLowerCase().includes(s) || p.country_name_en?.toLowerCase().includes(s)).slice(0, 20);
  }, [ports, dischPortSearch]);

  /* ── Filtered accounts by classification ── */
  const expenseAccounts = useMemo(() => {
    const s = acctSearch.expense.toLowerCase();
    return accounts.filter((a: any) => !a.is_header && (a.classification === 'Expense' || a.classification === 'Asset')).filter((a: any) => !s || a.code?.toLowerCase().includes(s) || a.name?.toLowerCase().includes(s) || a.name_ar?.toLowerCase().includes(s)).slice(0, 30);
  }, [accounts, acctSearch.expense]);
  const liabilityAccounts = useMemo(() => {
    const s = acctSearch.liability.toLowerCase();
    return accounts.filter((a: any) => !a.is_header && (a.classification === 'Liability')).filter((a: any) => !s || a.code?.toLowerCase().includes(s) || a.name?.toLowerCase().includes(s) || a.name_ar?.toLowerCase().includes(s)).slice(0, 30);
  }, [accounts, acctSearch.liability]);
  const marginAccounts = useMemo(() => {
    const s = acctSearch.margin.toLowerCase();
    return accounts.filter((a: any) => !a.is_header && (a.classification === 'Asset')).filter((a: any) => !s || a.code?.toLowerCase().includes(s) || a.name?.toLowerCase().includes(s) || a.name_ar?.toLowerCase().includes(s)).slice(0, 30);
  }, [accounts, acctSearch.margin]);

  /* ── Import from PO / Quotation / Contract ── */
  const searchImportSource = useCallback(async (type: string, q: string) => {
    if (!q || q.length < 2) { setImportResults([]); return; }
    setImportLoading(true);
    try {
      const ep = type === 'po' ? `${API}/procurement/purchase-orders?search=${encodeURIComponent(q)}&limit=20`
        : type === 'quotation' ? `${API}/procurement/quotations?search=${encodeURIComponent(q)}&limit=20`
          : `${API}/procurement/contracts?search=${encodeURIComponent(q)}&limit=20`;
      const res = await fetch(ep, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) { const d = await res.json(); setImportResults(d.data || []); }
    } catch { /* silent */ }
    finally { setImportLoading(false); }
  }, []);

  const importFromSource = useCallback(async (type: string, id: number) => {
    setImportLoading(true);
    try {
      const ep = type === 'po' ? `${API}/procurement/purchase-orders/${id}`
        : type === 'quotation' ? `${API}/procurement/quotations/${id}`
          : `${API}/procurement/contracts/${id}`;
      const res = await fetch(ep, { headers: { Authorization: `Bearer ${token()}` } });
      if (!res.ok) { showToast('Failed to fetch', 'error'); return; }
      const d = await res.json();
      const src = d.data;
      if (!src) return;

      const vendorId = String(src.vendor_id || '');
      const vendorName = src.vendor_display_name || src.vendor_name || '';
      const vendorNameAr = src.vendor_display_name_ar || src.vendor_name_ar || '';
      const currId = String(src.currency_id || '');
      const amount = String(src.total_amount || src.contract_value || src.total_value || '');
      const projId = String(src.project_id || '');
      const exchangeRate = String(src.exchange_rate || '1');
      const goodsDesc = type === 'po'
        ? (src.items || []).map((i: any) => `${i.item_display_name || i.item_name || ''} x${i.ordered_qty || ''}`).join(', ')
        : type === 'quotation'
          ? (src.items || []).map((i: any) => `${i.item_display_name || i.item_name || ''} x${i.quantity || ''}`).join(', ')
          : (src.items || []).map((i: any) => `${i.item_display_name || i.item_name || ''} x${i.contracted_qty || ''}`).join(', ');
      const incoterm = src.incoterm || src.delivery_terms_name || '';
      const portOfLoading = src.origin_port_name || src.port_of_loading || '';
      const portOfDisch = src.destination_port_name || src.port_of_discharge || '';
      const sourceNum = type === 'po' ? src.order_number : type === 'quotation' ? src.quotation_number : src.contract_number;

      setForm(f => ({
        ...f,
        beneficiary_vendor_id: vendorId,
        beneficiary_name: vendorName,
        beneficiary_name_ar: vendorNameAr,
        currency_id: currId,
        original_amount: amount,
        exchange_rate: exchangeRate,
        project_id: projId,
        goods_description: goodsDesc || f.goods_description,
        incoterm: incoterm || f.incoterm,
        port_of_loading: portOfLoading || f.port_of_loading,
        port_of_discharge: portOfDisch || f.port_of_discharge,
        purchase_order_id: type === 'po' ? String(id) : f.purchase_order_id,
      }));
      setVendorSearch(isRTL ? vendorNameAr || vendorName : vendorName);
      setImportLinked({ type, number: sourceNum, id });

      showToast(isRTL ? `تم استيراد البيانات من ${sourceNum}` : `Data imported from ${sourceNum}`, 'success');
    } catch { showToast('Import failed', 'error'); }
    finally { setImportLoading(false); setImportResults([]); setImportSearchTerm(''); }
  }, [isRTL]);

  /* ─── Form Validate / Build ─────────────────────── */
  const validate = () => {
    const e: Record<string, string> = {};
    // LC Number: uppercase English + symbols only
    if (!form.lc_number) e.lc_number = isRTL ? 'رقم الاعتماد مطلوب' : 'LC number required';
    else if (!/^[A-Z0-9\-\/\.\#\_]+$/.test(form.lc_number)) e.lc_number = isRTL ? 'حروف إنجليزية كبيرة وأرقام ورموز فقط (A-Z, 0-9, -, /, ., #, _)' : 'Uppercase letters, numbers & symbols only (A-Z, 0-9, -, /, ., #, _)';
    if (!form.lc_type_id) e.lc_type_id = isRTL ? 'النوع مطلوب' : 'Type required';
    if (!form.beneficiary_vendor_id) e.beneficiary_vendor_id = isRTL ? 'المورد/المستفيد مطلوب' : 'Vendor/Beneficiary required';
    if (!form.currency_id) e.currency_id = isRTL ? 'العملة مطلوبة' : 'Currency required';
    // Amount: positive number
    if (!form.original_amount || Number(form.original_amount) <= 0) e.original_amount = isRTL ? 'المبلغ يجب أن يكون أكبر من صفر' : 'Amount must be greater than 0';
    else if (!/^\d+(\.\d{1,2})?$/.test(form.original_amount)) e.original_amount = isRTL ? 'أرقام وفاصلة عشرية فقط (حتى منزلتين)' : 'Numbers and decimal only (up to 2 places)';
    // PO amount validation
    if (importLinked?.type === 'po' && form.original_amount) {
      // We'll check at submit time against the PO total
    }
    if (!form.issue_date) e.issue_date = isRTL ? 'تاريخ الإصدار مطلوب' : 'Issue date required';
    if (!form.expiry_date) e.expiry_date = isRTL ? 'تاريخ الانتهاء مطلوب' : 'Expiry date required';
    else if (form.issue_date && new Date(form.expiry_date) <= new Date(form.issue_date))
      e.expiry_date = isRTL ? 'تاريخ الانتهاء يجب أن يكون بعد تاريخ الإصدار' : 'Expiry must be after issue date';
    if (form.latest_shipment_date && form.expiry_date && new Date(form.latest_shipment_date) > new Date(form.expiry_date))
      e.latest_shipment_date = isRTL ? 'موعد الشحن يجب أن يكون قبل الانتهاء' : 'Shipment date must be before expiry';
    if (!form.project_id) e.project_id = isRTL ? 'المشروع مطلوب' : 'Project required';
    if (!form.goods_description) e.goods_description = isRTL ? 'وصف البضائع مطلوب' : 'Goods description required';
    // SWIFT validation
    if (form.issuing_bank_swift && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(form.issuing_bank_swift.toUpperCase()))
      e.issuing_bank_swift = isRTL ? 'رمز SWIFT غير صحيح (8 أو 11 حرف)' : 'Invalid SWIFT code (8 or 11 chars)';
    if (form.advising_bank_swift && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(form.advising_bank_swift.toUpperCase()))
      e.advising_bank_swift = isRTL ? 'رمز SWIFT غير صحيح' : 'Invalid SWIFT code';
    // Tolerance 0-100
    if (form.tolerance_percent && (Number(form.tolerance_percent) < 0 || Number(form.tolerance_percent) > 100))
      e.tolerance_percent = isRTL ? 'النسبة بين 0-100' : 'Tolerance must be 0-100';
    // Exchange rate > 0
    if (form.exchange_rate && Number(form.exchange_rate) <= 0) e.exchange_rate = isRTL ? 'سعر الصرف > 0' : 'Rate must be > 0';
    // Margin 0-100
    if (form.margin_percent && (Number(form.margin_percent) < 0 || Number(form.margin_percent) > 100))
      e.margin_percent = isRTL ? 'نسبة الهامش بين 0-100' : 'Margin must be 0-100';
    // Presentation period
    if (form.presentation_period_days && (Number(form.presentation_period_days) < 1 || Number(form.presentation_period_days) > 365))
      e.presentation_period_days = isRTL ? 'بين 1-365 يوم' : '1-365 days';
    setErrors(e);
    // Focus first error tab
    if (Object.keys(e).length > 0) {
      const basicFields = ['lc_number', 'lc_type_id', 'beneficiary_vendor_id', 'goods_description', 'issuing_bank_swift', 'advising_bank_swift'];
      const amountFields = ['currency_id', 'original_amount', 'exchange_rate', 'tolerance_percent', 'issue_date', 'expiry_date', 'latest_shipment_date', 'presentation_period_days'];
      const linkFields = ['project_id'];
      const feeFields = ['margin_percent'];
      const firstErr = Object.keys(e)[0];
      if (basicFields.includes(firstErr)) setFormTab(1);
      else if (amountFields.includes(firstErr)) setFormTab(2);
      else if (firstErr.includes('port') || firstErr.includes('ship')) setFormTab(3);
      else if (linkFields.includes(firstErr)) setFormTab(4);
      else if (feeFields.includes(firstErr)) setFormTab(5);
    }
    return Object.keys(e).length === 0;
  };

  const payload = () => ({
    ...form,
    lc_number: form.lc_number.toUpperCase().trim(),
    lc_type_id: form.lc_type_id ? Number(form.lc_type_id) : null,
    status_id: form.status_id ? Number(form.status_id) : null,
    currency_id: form.currency_id ? Number(form.currency_id) : null,
    beneficiary_vendor_id: form.beneficiary_vendor_id ? Number(form.beneficiary_vendor_id) : null,
    issuing_bank_id: form.issuing_bank_id ? Number(form.issuing_bank_id) : null,
    issuing_bank_swift: form.issuing_bank_swift?.toUpperCase().trim() || null,
    advising_bank_swift: form.advising_bank_swift?.toUpperCase().trim() || null,
    confirming_bank_swift: form.confirming_bank_swift?.toUpperCase().trim() || null,
    project_id: form.project_id ? Number(form.project_id) : null,
    purchase_order_id: form.purchase_order_id ? Number(form.purchase_order_id) : null,
    shipment_id: form.shipment_id ? Number(form.shipment_id) : null,
    expense_account_id: form.expense_account_id ? Number(form.expense_account_id) : null,
    liability_account_id: form.liability_account_id ? Number(form.liability_account_id) : null,
    margin_account_id: form.margin_account_id ? Number(form.margin_account_id) : null,
    beneficiary_country_id: form.beneficiary_country_id ? Number(form.beneficiary_country_id) : null,
    port_of_loading_id: form.port_of_loading_id ? Number(form.port_of_loading_id) : null,
    port_of_discharge_id: form.port_of_discharge_id ? Number(form.port_of_discharge_id) : null,
    original_amount: Number(form.original_amount) || 0,
    tolerance_percent: Number(form.tolerance_percent) || 0,
    exchange_rate: Number(form.exchange_rate) || 1,
    presentation_period_days: Number(form.presentation_period_days) || 21,
    tenor_days: form.tenor_days ? Number(form.tenor_days) : null,
    margin_percent: Number(form.margin_percent) || 0, margin_amount: Number(form.margin_amount) || 0,
    opening_commission: Number(form.opening_commission) || 0, amendment_fees: Number(form.amendment_fees) || 0,
    swift_charges: Number(form.swift_charges) || 0, other_charges: Number(form.other_charges) || 0,
    days_before_expiry_alert: Number(form.days_before_expiry_alert) || 30,
    days_before_shipment_alert: Number(form.days_before_shipment_alert) || 14,
    is_confirmed: !!form.is_confirmed,
  });

  /* ─── CRUD ──────────────────────────────────────── */
  const handleCreate = async () => {
    if (!validate()) { setFormTab(0); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/letters-of-credit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(payload()),
      });
      if (res.ok) { showToast(isRTL ? 'تم إنشاء الاعتماد بنجاح' : 'LC created', 'success'); setCreateOpen(false); setForm(blank); setFormTab(0); setImportLinked(null); setImportSource('none'); fetchData(); }
      else { const e = await res.json(); showToast(e.error?.message || 'Failed', 'error'); }
    } catch { showToast('Create failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (syncLinked = false) => {
    if (!selected || !validate()) return;
    const data = payload();
    
    // If not yet checked for sync, check first
    if (!syncLinked && (selected.purchase_order_id || selected.shipment_id)) {
      try {
        const previewRes = await fetch(`${API}/letters-of-credit/${selected.id}/sync-preview`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
          body: JSON.stringify(data),
        });
        if (previewRes.ok) {
          const previewData = await previewRes.json();
          if (previewData.data?.has_changes) {
            setPendingPayload(data);
            setSyncPreview(previewData.data.preview);
            setSyncDialogOpen(true);
            return; // Wait for user confirmation
          }
        }
      } catch { /* proceed without sync */ }
    }
    
    setSaving(true);
    try {
      const res = await fetch(`${API}/letters-of-credit/${selected.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...data, sync_linked: syncLinked }),
      });
      if (res.ok) {
        const result = await res.json();
        const syncMsg = result.sync?.length > 0
          ? ` | ${isRTL ? 'تم مزامنة' : 'Synced'}: ${result.sync.map((s: any) => isRTL ? s.entity === 'purchase_order' ? 'أمر الشراء' : 'الشحنة' : s.entity).join(', ')}`
          : '';
        showToast((isRTL ? 'تم التحديث بنجاح' : 'LC updated') + syncMsg, 'success');
        setEditOpen(false); setSelected(null); setSyncDialogOpen(false); setSyncPreview(null); setPendingPayload(null); fetchData();
      } else { const e = await res.json(); showToast(e.error?.message || 'Failed', 'error'); }
    } catch { showToast('Update failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleSyncConfirm = () => {
    setSyncDialogOpen(false);
    handleUpdate(true);
  };

  const handleSyncSkip = async () => {
    setSyncDialogOpen(false);
    setSaving(true);
    try {
      const res = await fetch(`${API}/letters-of-credit/${selected!.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...pendingPayload, sync_linked: false }),
      });
      if (res.ok) { showToast(isRTL ? 'تم التحديث' : 'LC updated', 'success'); setEditOpen(false); setSelected(null); setSyncPreview(null); setPendingPayload(null); fetchData(); }
      else { const e = await res.json(); showToast(e.error?.message || 'Failed', 'error'); }
    } catch { showToast('Update failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/letters-of-credit/${deleteTarget.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) { showToast(isRTL ? 'تم الحذف' : 'Deleted', 'success'); setDeleteTarget(null); fetchData(); }
      else { const e = await res.json(); showToast(e.error?.message || 'Failed', 'error'); }
    } catch { showToast('Delete failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleStatus = async (newStatus: string) => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/letters-of-credit/${selected.id}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ new_status: newStatus, notes: statusNotes }),
      });
      if (res.ok) { showToast(isRTL ? 'تم تغيير الحالة' : 'Status changed', 'success'); setStatusOpen(false); setSelected(null); setStatusNotes(''); fetchData(); }
      else { const e = await res.json(); showToast(e.error?.message || 'Failed', 'error'); }
    } catch { showToast('Status change failed', 'error'); }
    finally { setSaving(false); }
  };

  const openEdit = (lc: LetterOfCredit) => {
    setSelected(lc);
    setForm({
      lc_number: lc.lc_number || '', lc_type_id: String(lc.lc_type_id || ''), status_id: String(lc.status_id || ''),
      beneficiary_vendor_id: String(lc.beneficiary_vendor_id || ''), beneficiary_name: lc.beneficiary_name || '',
      beneficiary_name_ar: lc.beneficiary_name_ar || '', beneficiary_address: lc.beneficiary_address || '',
      beneficiary_country_id: String(lc.beneficiary_country_id || ''),
      issuing_bank_id: String(lc.issuing_bank_id || ''), issuing_bank_name: lc.issuing_bank_name || '',
      issuing_bank_swift: lc.issuing_bank_swift || '', issuing_bank_address: lc.issuing_bank_address || '',
      advising_bank_name: lc.advising_bank_name || '', advising_bank_swift: lc.advising_bank_swift || '',
      confirming_bank_name: lc.confirming_bank_name || '', confirming_bank_swift: lc.confirming_bank_swift || '',
      is_confirmed: !!lc.is_confirmed,
      currency_id: String(lc.currency_id || ''), original_amount: String(lc.original_amount || ''),
      tolerance_percent: String(lc.tolerance_percent || '0'), exchange_rate: String(lc.exchange_rate || '1'),
      issue_date: lc.issue_date?.split('T')[0] || '', expiry_date: lc.expiry_date?.split('T')[0] || '',
      latest_shipment_date: lc.latest_shipment_date?.split('T')[0] || '',
      presentation_period_days: String(lc.presentation_period_days || '21'),
      payment_terms: lc.payment_terms || '', tenor_days: String(lc.tenor_days || ''),
      partial_shipments: lc.partial_shipments || 'allowed', transhipment: lc.transhipment || 'allowed',
      port_of_loading: lc.port_of_loading || '', port_of_discharge: lc.port_of_discharge || '',
      port_of_loading_id: String(lc.port_of_loading_id || ''), port_of_discharge_id: String(lc.port_of_discharge_id || ''),
      incoterm: lc.incoterm || '', goods_description: lc.goods_description || '',
      required_documents: lc.required_documents ? (typeof lc.required_documents === 'string' ? lc.required_documents : JSON.stringify(lc.required_documents)) : '',
      special_conditions: lc.special_conditions || '',
      project_id: String(lc.project_id || ''), purchase_order_id: String(lc.purchase_order_id || ''),
      shipment_id: String(lc.shipment_id || ''),
      expense_account_id: String(lc.expense_account_id || ''), liability_account_id: String(lc.liability_account_id || ''),
      margin_account_id: String(lc.margin_account_id || ''),
      margin_percent: String(lc.margin_percent || '0'), margin_amount: String(lc.margin_amount || '0'),
      opening_commission: String(lc.opening_commission || '0'), amendment_fees: String(lc.amendment_fees || '0'),
      swift_charges: String(lc.swift_charges || '0'), other_charges: String(lc.other_charges || '0'),
      days_before_expiry_alert: String(lc.days_before_expiry_alert || '30'),
      days_before_shipment_alert: String(lc.days_before_shipment_alert || '14'),
      internal_notes: lc.internal_notes || '',
    });
    setVendorSearch(isRTL ? (lc.vendor_name_ar || lc.beneficiary_name_ar || '') : (lc.vendor_name || lc.beneficiary_name || ''));
    setBankSearch(lc.issuing_bank_name || '');
    setLoadPortSearch(lc.port_of_loading || '');
    setDischPortSearch(lc.port_of_discharge || '');
    setImportLinked(lc.purchase_order_id ? { type: 'po', id: lc.purchase_order_id, number: '' } : null);
    setImportSource('none');
    setFormTab(0); setEditOpen(true);
  };

  const canCreate = hasPermission('letters_of_credit:create');
  const canEdit = hasPermission('letters_of_credit:edit');
  const canDelete = hasPermission('letters_of_credit:delete');

  const totalFees = Number(form.opening_commission || 0) + Number(form.amendment_fees || 0) + Number(form.swift_charges || 0) + Number(form.other_charges || 0);

  const summary = dash?.summary;
  const alerts = dash?.recent_alerts || [];
  const byCurrency = dash?.by_currency || [];

  /* ── page tabs ── */
  const pageTabs: Tab[] = [
    { id: 'all', label: 'All LCs', label_ar: 'جميع الاعتمادات', icon: <DocumentCheckIcon className="h-4 w-4" />, badge: totalCount },
    { id: 'active', label: 'In Progress', label_ar: 'قيد التنفيذ', icon: <ClockIcon className="h-4 w-4" />, badgeColor: 'primary' },
    { id: 'documents', label: 'Documents', label_ar: 'مستندات مقدمة', icon: <DocumentTextIcon className="h-4 w-4" />, badgeColor: 'warning' },
    { id: 'completed', label: 'Completed', label_ar: 'مكتملة', icon: <CheckCircleIcon className="h-4 w-4" />, badgeColor: 'success' },
    { id: 'alerts', label: 'Alerts', label_ar: 'التنبيهات', icon: <BellAlertIcon className="h-4 w-4" />, badge: alerts.filter(a => !a.is_read).length, badgeColor: 'danger' },
  ];

  /* ═══════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════ */
  return (
    <MainLayout>
      <Head><title>{isRTL ? 'الاعتمادات المستندية - SLMS' : 'Letters of Credit - SLMS'}</title></Head>

      <div className="space-y-6 animate-fade-in">
        {/* ──── Header ──── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
              <BuildingLibraryIcon className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                🏦 {isRTL ? 'الاعتمادات المستندية' : 'Letters of Credit'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{isRTL ? 'إدارة شاملة — SWIFT MT700 · UCP 600' : 'Full Management — SWIFT MT700 · UCP 600'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canCreate && (
              <Button onClick={() => { setForm(blank); setErrors({}); setFormTab(0); setVendorSearch(''); setBankSearch(''); setLoadPortSearch(''); setDischPortSearch(''); setImportLinked(null); setImportSource('none'); setImportSearchTerm(''); setImportResults([]); setCreateOpen(true); }}>
                <PlusIcon className="h-4 w-4" /> {isRTL ? 'اعتماد جديد' : 'New LC'}
              </Button>
            )}
            <Button variant="secondary" onClick={() => router.push('/finance/letters-of-credit/reports')}>
              <ChartBarIcon className="h-4 w-4" /> {isRTL ? 'التقارير' : 'Reports'}
            </Button>
          </div>
        </div>

        {/* ──── KPI Cards ──── */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { v: summary.active_lcs, l: isRTL ? 'نشطة' : 'Active', icon: <DocumentCheckIcon className="h-5 w-5" />, bg: 'bg-blue-500' },
              { v: summary.draft_lcs, l: isRTL ? 'مسودات' : 'Drafts', icon: <PencilIcon className="h-5 w-5" />, bg: 'bg-slate-500' },
              { v: summary.issued_lcs, l: isRTL ? 'صادرة' : 'Issued', icon: <CheckCircleIcon className="h-5 w-5" />, bg: 'bg-teal-500' },
              { v: summary.paid_lcs, l: isRTL ? 'مدفوعة' : 'Paid', icon: <BanknotesIcon className="h-5 w-5" />, bg: 'bg-green-500' },
              { v: summary.expiring_soon, l: isRTL ? 'تنتهي قريباً' : 'Expiring', icon: <ExclamationTriangleIcon className="h-5 w-5" />, bg: 'bg-red-500' },
              { v: summary.shipment_due_soon, l: isRTL ? 'الشحن قريب' : 'Ship Due', icon: <CalendarDaysIcon className="h-5 w-5" />, bg: 'bg-amber-500' },
            ].map((c, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className={clsx('p-1.5 rounded-lg text-white w-fit mb-2', c.bg)}>{c.icon}</div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{c.v}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{c.l}</p>
              </div>
            ))}
          </div>
        )}

        {/* ──── Amount Summary ──── */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl p-4 text-white">
              <p className="text-sm opacity-80">{isRTL ? 'إجمالي المبلغ النشط' : 'Total Active Amount'}</p>
              <p className="text-2xl font-bold mt-1">{fmt(summary.total_active_amount)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-500">{isRTL ? 'المستخدم' : 'Utilized'}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{fmt(summary.total_utilized)}</p>
              <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all duration-1000"
                  style={{ width: `${summary.total_active_amount > 0 ? Math.min(100, (summary.total_utilized / summary.total_active_amount) * 100) : 0}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">{summary.total_active_amount > 0 ? Math.round((summary.total_utilized / summary.total_active_amount) * 100) : 0}% {isRTL ? 'مستخدم' : 'utilized'}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-500">{isRTL ? 'المتاح' : 'Available'}</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{fmt(summary.total_available)}</p>
              {byCurrency.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {byCurrency.map((c, i) => <span key={i} className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{c.currency_code}: {c.count}</span>)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ──── Alerts Banner ──── */}
        {alerts.length > 0 && activeTab !== 'alerts' && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <BellAlertIcon className="h-5 w-5 text-amber-600" />
              <h3 className="font-medium text-amber-800 dark:text-amber-200">{alerts.length} {isRTL ? 'تنبيهات' : 'Alerts'}</h3>
            </div>
            {alerts.slice(0, 3).map(a => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span className="text-amber-700 dark:text-amber-300">{isRTL ? a.title_ar || a.title : a.title}</span>
                <span className="text-amber-500 text-xs font-mono">{a.lc_number}</span>
              </div>
            ))}
          </div>
        )}

        {/* ──── Tabs ──── */}
        <Tabs tabs={pageTabs} activeTab={activeTab} onTabChange={t => { setActiveTab(t); setPage(1); }} locale={locale as 'en' | 'ar'} variant="pills" />

        {/* ──── Filter / Table Card ──── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          {/* filter bar */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <Input placeholder={isRTL ? 'بحث برقم الاعتماد أو الوصف...' : 'Search LC number or description...'} value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <select value={selType} onChange={e => { setSelType(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
              <option value="">{isRTL ? 'كل الأنواع' : 'All Types'}</option>
              {lcTypes.map(t => <option key={t.id} value={t.code}>{isRTL ? t.name_ar : t.name}</option>)}
            </select>
            {activeTab === 'all' && (
              <div className="flex flex-wrap gap-1">
                {lcStatuses.map(s => {
                  const c = SC[s.code] || SC.DRAFT;
                  const on = selStatuses.includes(s.code);
                  return (
                    <button key={s.id} onClick={() => { setSelStatuses(p => on ? p.filter(x => x !== s.code) : [...p, s.code]); setPage(1); }}
                      className={clsx('px-2 py-1 text-xs rounded-full border transition-colors', on ? `${c.bg} ${c.text} border-current` : 'border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700')}>
                      {c.icon} {isRTL ? s.name_ar : s.name}
                    </button>
                  );
                })}
                {selStatuses.length > 0 && <button onClick={() => setSelStatuses([])} className="text-xs text-red-500 hover:underline px-2">{isRTL ? 'مسح' : 'Clear'}</button>}
              </div>
            )}
            <button onClick={() => fetchData()} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="Refresh">
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          </div>

          {/* table / alerts */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
            ) : activeTab === 'alerts' ? (
              <div className="p-4 space-y-3">
                {alerts.length === 0 ? <p className="text-center text-gray-500 py-8">{isRTL ? 'لا توجد تنبيهات' : 'No alerts'}</p>
                  : alerts.map(a => (
                    <div key={a.id} className={clsx('flex items-center justify-between p-3 rounded-lg border',
                      a.priority === 'critical' ? 'border-red-300 bg-red-50 dark:bg-red-900/20' :
                        a.priority === 'high' || a.priority === 'warning' ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20' :
                          'border-gray-200 bg-gray-50 dark:bg-gray-700/50')}>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{isRTL ? a.title_ar || a.title : a.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{a.lc_number} · {fmtDate(a.trigger_date)}</p>
                      </div>
                      <span className={clsx('px-2 py-0.5 text-xs rounded-full', a.priority === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>{a.priority}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    {[isRTL ? 'رقم الاعتماد' : 'LC Number', isRTL ? 'النوع' : 'Type', isRTL ? 'المستفيد' : 'Beneficiary',
                    isRTL ? 'البنك' : 'Bank', isRTL ? 'المبلغ' : 'Amount', isRTL ? 'مستخدم' : 'Used',
                    isRTL ? 'الانتهاء' : 'Expiry', isRTL ? 'المشروع' : 'Project', isRTL ? 'الحالة' : 'Status', isRTL ? 'إجراءات' : 'Actions'
                    ].map((h, i) => (
                      <th key={i} className={clsx('px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap', [4, 5].includes(i) ? 'text-end' : 'text-start')}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {lcs.length === 0 ? (
                    <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-500">{isRTL ? 'لا توجد اعتمادات' : 'No letters of credit found'}</td></tr>
                  ) : lcs.map(lc => {
                    const u = utilPct(lc);
                    const sc = lc.status_code || '';
                    return (
                      <tr key={lc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer" onClick={() => router.push(`/finance/letters-of-credit/${lc.id}`)}>
                        <td className="px-3 py-3"><span className="font-mono font-medium text-blue-600 dark:text-blue-400 hover:underline">{lc.lc_number}</span></td>
                        <td className="px-3 py-3"><span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">{isRTL ? lc.type_name_ar : lc.type_name}</span></td>
                        <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-[200px] truncate">{isRTL ? (lc.vendor_name_ar || lc.beneficiary_name_ar) : (lc.vendor_name || lc.beneficiary_name)}</td>
                        <td className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-[150px] truncate">{lc.issuing_bank_name_display || lc.issuing_bank_name || '—'}</td>
                        <td className="px-3 py-3 text-end">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">{fmt(lc.current_amount, lc.currency_code)}</p>
                          <p className="text-xs text-gray-400">{lc.currency_code}</p>
                        </td>
                        <td className="px-3 py-3 text-end">
                          <div className="flex items-center gap-2 justify-end">
                            <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div className={clsx('h-full rounded-full', u >= 80 ? 'bg-red-500' : u >= 50 ? 'bg-amber-500' : 'bg-blue-500')} style={{ width: `${u}%` }} />
                            </div>
                            <span className="text-xs text-gray-500">{u}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {lc.expiry_date && (
                            <div className={clsx('text-xs', expiryColor(lc.expiry_date))}>
                              <p>{fmtDate(lc.expiry_date)}</p>
                              {daysUntil(lc.expiry_date) !== null && (
                                <p className="text-[10px] opacity-75">{daysUntil(lc.expiry_date)! < 0 ? (isRTL ? 'منتهي' : 'Expired') : `${daysUntil(lc.expiry_date)} ${isRTL ? 'يوم' : 'days'}`}</p>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {lc.project_code && <span className="text-xs px-2 py-0.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded">{lc.project_code}</span>}
                        </td>
                        <td className="px-3 py-3">{statusBadge(sc, lc.status_name, lc.status_name_ar)}</td>
                        <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1">
                            {canEdit && TRANSITIONS[sc]?.length > 0 && (
                              <button onClick={() => { setSelected(lc); setStatusOpen(true); setStatusNotes(''); }} className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600" title={isRTL ? 'تغيير الحالة' : 'Change Status'}>
                                <ArrowPathIcon className="h-4 w-4" />
                              </button>
                            )}
                            {canEdit && !['CLOSED', 'CANCELLED', 'EXPIRED'].includes(sc) && (
                              <button onClick={() => openEdit(lc)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600" title={isRTL ? 'تعديل' : 'Edit'}>
                                <PencilIcon className="h-4 w-4" />
                              </button>
                            )}
                            {canDelete && sc === 'DRAFT' && (
                              <button onClick={() => setDeleteTarget(lc)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600" title={isRTL ? 'حذف' : 'Delete'}>
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* pagination */}
          {totalCount > 50 && activeTab !== 'alerts' && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <p className="text-sm text-gray-500">{isRTL ? `عرض ${lcs.length} من ${totalCount}` : `Showing ${lcs.length} of ${totalCount}`}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  {isRTL ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4" />}
                </Button>
                <span className="px-3 py-1 text-sm">{page}</span>
                <Button size="sm" variant="secondary" disabled={lcs.length < 50} onClick={() => setPage(p => p + 1)}>
                  {isRTL ? <ChevronLeftIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
         CREATE / EDIT MODAL — 6 TAB FORM
         ═══════════════════════════════════════════════════ */}
      <Modal isOpen={createOpen || editOpen} onClose={() => { setCreateOpen(false); setEditOpen(false); setSelected(null); setErrors({}); setVendorSearch(''); setBankSearch(''); setImportLinked(null); setImportSource('none'); }}
        title={createOpen ? (isRTL ? '🏦 اعتماد جديد' : '🏦 New Letter of Credit') : (isRTL ? '✏️ تعديل الاعتماد' : '✏️ Edit LC')} size="xl">
        <div className="space-y-4">
          {/* Import linked badge */}
          {importLinked && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700 dark:text-green-300">{isRTL ? 'مرتبط بـ' : 'Linked to'} <strong>{importLinked.number}</strong></span>
              <button onClick={() => setImportLinked(null)} className="ml-auto text-green-500 hover:text-green-700"><XMarkIcon className="h-4 w-4" /></button>
            </div>
          )}

          {/* tabs */}
          <div className="flex gap-1 overflow-x-auto pb-2 border-b dark:border-gray-700">
            {[isRTL ? '📥 استيراد' : '📥 Import', isRTL ? '📋 أساسية' : '📋 Basic', isRTL ? '💰 مبالغ' : '💰 Amounts', isRTL ? '🚢 شحن' : '🚢 Shipping',
              isRTL ? '🔗 ربط' : '🔗 Links', isRTL ? '💳 رسوم' : '💳 Fees', isRTL ? '📄 مراجعة' : '📄 Review'
            ].map((l, i) => (
              <button key={i} onClick={() => setFormTab(i)}
                className={clsx('px-3 py-2 text-sm rounded-t whitespace-nowrap transition-colors',
                  formTab === i ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-medium border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700')}>
                {l}
              </button>
            ))}
          </div>

          <div className="max-h-[60vh] overflow-y-auto px-1">

            {/* ── Tab 0: Import from Source ── */}
            {formTab === 0 && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">{isRTL ? '📥 استيراد بيانات من مستند' : '📥 Import Data from Document'}</h4>
                  <p className="text-sm text-blue-600 dark:text-blue-400">{isRTL ? 'يمكنك تعبئة البيانات تلقائياً من أمر شراء أو عرض سعر أو عقد' : 'Auto-fill LC data from a Purchase Order, Quotation, or Contract'}</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'po' as const, icon: '📦', label: isRTL ? 'أمر شراء' : 'Purchase Order' },
                    { key: 'quotation' as const, icon: '📋', label: isRTL ? 'عرض سعر' : 'Quotation' },
                    { key: 'contract' as const, icon: '📝', label: isRTL ? 'عقد' : 'Contract' },
                  ].map(s => (
                    <button key={s.key} onClick={() => { setImportSource(s.key); setImportSearchTerm(''); setImportResults([]); }}
                      className={clsx('p-4 rounded-xl border-2 text-center transition-all hover:scale-[1.02]',
                        importSource === s.key ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-gray-400')}>
                      <p className="text-2xl mb-1">{s.icon}</p>
                      <p className="text-sm font-medium">{s.label}</p>
                    </button>
                  ))}
                </div>
                {importSource !== 'none' && (
                  <div className="space-y-3">
                    <div className="relative">
                      <input type="text" placeholder={isRTL ? 'ابحث بالرقم أو المورد...' : 'Search by number or vendor...'}
                        value={importSearchTerm} onChange={e => { setImportSearchTerm(e.target.value); if (e.target.value.length >= 2) searchImportSource(importSource, e.target.value); }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                      {importLoading && <div className="absolute right-3 top-2.5"><div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" /></div>}
                    </div>
                    {importResults.length > 0 && (
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-60 overflow-auto divide-y divide-gray-100 dark:divide-gray-700">
                        {importResults.map((r: any) => {
                          const num = r.order_number || r.quotation_number || r.contract_number;
                          const vendor = isRTL ? (r.vendor_display_name_ar || r.vendor_name_ar || r.vendor_display_name || r.vendor_name) : (r.vendor_display_name || r.vendor_name);
                          const amt = r.total_amount || r.contract_value || r.total_value;
                          const curr = r.currency_code;
                          return (
                            <button key={r.id} onClick={() => importFromSource(importSource, r.id)}
                              className="w-full p-3 text-start hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                              <div className="flex justify-between items-center">
                                <div>
                                  <span className="font-mono font-medium text-blue-600">{num}</span>
                                  <span className="mx-2 text-gray-400">·</span>
                                  <span className="text-sm text-gray-700 dark:text-gray-300">{vendor}</span>
                                </div>
                                <p className="font-medium text-sm">{amt ? `${Number(amt).toLocaleString()} ${curr || ''}` : ''}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-400 text-center">{isRTL ? 'أو تخطى هذه الخطوة وابدأ من الصفر' : 'Or skip this step and start from scratch'}</p>
              </div>
            )}

            {/* ── Tab 1: Basic ── */}
            {formTab === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* LC Number - uppercase only */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isRTL ? 'رقم الاعتماد *' : 'LC Number *'}</label>
                  <input type="text" value={form.lc_number} placeholder="LC-2026-001"
                    onChange={e => setForm({ ...form, lc_number: e.target.value.toUpperCase().replace(/[^A-Z0-9\-\/\.#_]/g, '') })}
                    className={clsx('w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono tracking-wider', errors.lc_number ? 'border-red-500' : 'border-gray-300 dark:border-gray-600')} />
                  {errors.lc_number && <p className="text-red-500 text-xs mt-1">{errors.lc_number}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">{isRTL ? 'حروف إنجليزية كبيرة ورموز فقط' : 'Uppercase letters & symbols only'}</p>
                </div>
                {/* LC Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isRTL ? 'نوع الاعتماد *' : 'LC Type *'}</label>
                  <select value={form.lc_type_id} onChange={e => setForm({ ...form, lc_type_id: e.target.value })}
                    className={clsx('w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm', errors.lc_type_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600')}>
                    <option value="">{isRTL ? 'اختر النوع' : 'Select Type'}</option>
                    {lcTypes.map(t => <option key={t.id} value={t.id}>{isRTL ? t.name_ar : t.name}</option>)}
                  </select>
                  {errors.lc_type_id && <p className="text-red-500 text-xs mt-1">{errors.lc_type_id}</p>}
                </div>
                {/* Vendor (Beneficiary) with SERVER search */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isRTL ? 'المورد (المستفيد) *' : 'Vendor (Beneficiary) *'}</label>
                  <div className="relative">
                    <input type="text" placeholder={isRTL ? 'ابحث بالاسم أو الكود (اكتب حرفين على الأقل)...' : 'Search by name or code (min 2 chars)...'}
                      value={vendorSearch} onChange={e => { setVendorSearch(e.target.value); setShowVendorDD(true); }} onFocus={() => setShowVendorDD(true)}
                      className={clsx('w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm', errors.beneficiary_vendor_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600')} />
                    {vendorSearchLoading && <div className="absolute right-8 top-2.5"><div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" /></div>}
                    {showVendorDD && vendorSearchResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
                        {vendorSearchResults.map((v: any) => (
                          <div key={v.id} onClick={() => {
                            setForm({ ...form, beneficiary_vendor_id: String(v.id), beneficiary_name: v.name, beneficiary_name_ar: v.name_ar || '' });
                            setVendorSearch(isRTL ? v.name_ar || v.name : `${v.code} - ${v.name}`);
                            setShowVendorDD(false);
                          }}
                            className="px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-gray-600 cursor-pointer text-sm border-b border-gray-100 dark:border-gray-600 last:border-0">
                            <div className="flex items-center justify-between">
                              <div><span className="font-mono text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded mr-2">{v.code}</span>{isRTL ? v.name_ar || v.name : v.name}</div>
                              {v.currency_code && <span className="text-xs text-gray-400">{v.currency_code}</span>}
                            </div>
                            {v.name_ar && !isRTL && <p className="text-xs text-gray-400 mt-0.5">{v.name_ar}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                    {showVendorDD && vendorSearch.length >= 2 && !vendorSearchLoading && vendorSearchResults.length === 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 text-center text-sm text-gray-500">
                        {isRTL ? 'لا توجد نتائج' : 'No vendors found'}
                      </div>
                    )}
                    {form.beneficiary_vendor_id && (
                      <button type="button" onClick={() => { setForm({ ...form, beneficiary_vendor_id: '', beneficiary_name: '', beneficiary_name_ar: '', project_id: '' }); setVendorSearch(''); setVendorProjects([]); }}
                        className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"><XMarkIcon className="h-4 w-4" /></button>
                    )}
                  </div>
                  {errors.beneficiary_vendor_id && <p className="text-red-500 text-xs mt-1">{errors.beneficiary_vendor_id}</p>}
                </div>
                {/* Issuing Bank - searchable from banks reference */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isRTL ? 'البنك المُصدِر' : 'Issuing Bank'}</label>
                  <div className="relative">
                    <input type="text" placeholder={isRTL ? 'ابحث عن البنك بالاسم أو SWIFT...' : 'Search bank by name or SWIFT...'}
                      value={bankSearch} onChange={e => { setBankSearch(e.target.value); setShowBankDD(true); }} onFocus={() => setShowBankDD(true)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                    {showBankDD && filteredBanks.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-auto">
                        {filteredBanks.map((b: any) => (
                          <div key={b.id} onClick={() => onBankSelect(b)}
                            className="px-3 py-2 hover:bg-blue-50 dark:hover:bg-gray-600 cursor-pointer text-sm border-b border-gray-100 dark:border-gray-600 last:border-0">
                            <div className="flex justify-between">
                              <span>{isRTL ? b.name_ar || b.name : b.name}</span>
                              {b.swift_code && <span className="font-mono text-xs text-gray-500 bg-gray-100 dark:bg-gray-600 px-1.5 py-0.5 rounded">{b.swift_code}</span>}
                            </div>
                            {b.country_name && <p className="text-xs text-gray-400">{isRTL ? b.country_name_ar || b.country_name : b.country_name}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                    {form.issuing_bank_id && (
                      <button type="button" onClick={() => { setForm({ ...form, issuing_bank_id: '', issuing_bank_name: '', issuing_bank_swift: '' }); setBankSearch(''); }}
                        className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"><XMarkIcon className="h-4 w-4" /></button>
                    )}
                  </div>
                  {form.issuing_bank_swift && <p className="text-xs text-teal-600 mt-1">SWIFT: <span className="font-mono">{form.issuing_bank_swift}</span></p>}
                  {errors.issuing_bank_swift && <p className="text-red-500 text-xs mt-1">{errors.issuing_bank_swift}</p>}
                </div>
                <Input label={isRTL ? 'البنك المُبلِّغ' : 'Advising Bank'} value={form.advising_bank_name} onChange={e => setForm({ ...form, advising_bank_name: e.target.value })} />
                <div>
                  <Input label={isRTL ? 'SWIFT المُبلِّغ' : 'Advising SWIFT'} value={form.advising_bank_swift}
                    onChange={e => setForm({ ...form, advising_bank_swift: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11) })} placeholder="XXXXXXXX" />
                  {errors.advising_bank_swift && <p className="text-red-500 text-xs mt-1">{errors.advising_bank_swift}</p>}
                </div>
                <Input label={isRTL ? 'البنك المُؤكِّد' : 'Confirming Bank'} value={form.confirming_bank_name} onChange={e => setForm({ ...form, confirming_bank_name: e.target.value })} />
                <Input label={isRTL ? 'SWIFT المُؤكِّد' : 'Confirming SWIFT'} value={form.confirming_bank_swift}
                  onChange={e => setForm({ ...form, confirming_bank_swift: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11) })} placeholder="XXXXXXXX" />
                <div className="sm:col-span-2 flex items-center gap-2">
                  <input type="checkbox" id="is_confirmed" checked={!!form.is_confirmed} onChange={e => setForm({ ...form, is_confirmed: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <label htmlFor="is_confirmed" className="text-sm text-gray-700 dark:text-gray-300">{isRTL ? 'اعتماد مؤكد' : 'Confirmed LC'}</label>
                </div>
                {/* Goods description */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isRTL ? 'وصف البضائع * (SWIFT 45A)' : 'Goods Description * (SWIFT 45A)'}</label>
                  <textarea value={form.goods_description} onChange={e => setForm({ ...form, goods_description: e.target.value })} rows={3}
                    className={clsx('w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm', errors.goods_description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600')}
                    placeholder={isRTL ? 'وصف تفصيلي للبضائع والمواد...' : 'Detailed description of goods and materials...'} />
                  {errors.goods_description && <p className="text-red-500 text-xs mt-1">{errors.goods_description}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isRTL ? 'المستندات المطلوبة (46A)' : 'Required Documents (46A)'}</label>
                  <textarea value={form.required_documents} onChange={e => setForm({ ...form, required_documents: e.target.value })} rows={2}
                    placeholder="Bill of Lading, Commercial Invoice, Packing List, Certificate of Origin"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isRTL ? 'شروط إضافية (47A)' : 'Additional Conditions (47A)'}</label>
                  <textarea value={form.special_conditions} onChange={e => setForm({ ...form, special_conditions: e.target.value })} rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                </div>
              </div>
            )}

            {/* ── Tab 2: Amounts & Dates ── */}
            {formTab === 2 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Currency with base currency indicator */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isRTL ? 'العملة *' : 'Currency *'}</label>
                  <select value={form.currency_id} onChange={e => {
                    const c = currencies.find((c: any) => String(c.id) === e.target.value);
                    const isBase = c?.is_base || c?.is_default;
                    setForm({ ...form, currency_id: e.target.value, exchange_rate: isBase ? '1' : form.exchange_rate });
                  }}
                    className={clsx('w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm', errors.currency_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600')}>
                    <option value="">{isRTL ? 'اختر العملة' : 'Select Currency'}</option>
                    {currencies.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.code} - {isRTL ? c.name_ar || c.name_en || c.name : c.name_en || c.name} {(c.is_base || c.is_default) ? (isRTL ? '⭐ أساسية' : '⭐ Base') : ''}</option>
                    ))}
                  </select>
                  {errors.currency_id && <p className="text-red-500 text-xs mt-1">{errors.currency_id}</p>}
                  {form.currency_id && (() => { const c = currencies.find((c: any) => String(c.id) === form.currency_id); return c && (c.is_base || c.is_default) ? <p className="text-xs text-teal-600 mt-0.5">⭐ {isRTL ? 'العملة الأساسية' : 'Base currency'}</p> : null; })()}
                  {importLinked && form.currency_id && <p className="text-xs text-blue-600 mt-0.5">🔗 {isRTL ? 'مطابقة لعملة المصدر' : 'Matches source document currency'}</p>}
                </div>
                {/* Exchange Rate */}
                <ExchangeRateField
                  currencyCode={currencies.find((c: any) => String(c.id) === form.currency_id)?.code}
                  value={form.exchange_rate}
                  onChange={v => setForm({ ...form, exchange_rate: v })}
                  label={isRTL ? 'سعر الصرف' : 'Exchange Rate'}
                  hideWhenBaseCurrency
                  error={errors.exchange_rate}
                />
                {/* Amount - numbers only */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isRTL ? 'المبلغ الأصلي *' : 'Original Amount *'}</label>
                  <input type="text" inputMode="decimal" value={form.original_amount} placeholder="0.00"
                    onChange={e => { const v = e.target.value.replace(/[^0-9.]/g, ''); if ((v.match(/\./g) || []).length <= 1) setForm({ ...form, original_amount: v }); }}
                    className={clsx('w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono', errors.original_amount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600')} />
                  {errors.original_amount && <p className="text-red-500 text-xs mt-1">{errors.original_amount}</p>}
                  {form.original_amount && form.exchange_rate && Number(form.exchange_rate) !== 1 && (
                    <p className="text-xs text-gray-500 mt-0.5">{isRTL ? 'بالعملة الأساسية:' : 'In base currency:'} {(Number(form.original_amount) * Number(form.exchange_rate)).toLocaleString()}</p>
                  )}
                </div>
                {/* Tolerance */}
                <div>
                  <Input label={isRTL ? 'نسبة التسامح % (39A)' : 'Tolerance % (39A)'} type="number" value={form.tolerance_percent}
                    onChange={e => setForm({ ...form, tolerance_percent: e.target.value })} />
                  {errors.tolerance_percent && <p className="text-red-500 text-xs mt-1">{errors.tolerance_percent}</p>}
                  {form.original_amount && form.tolerance_percent && Number(form.tolerance_percent) > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">{isRTL ? 'المدى:' : 'Range:'} {(Number(form.original_amount) * (1 - Number(form.tolerance_percent) / 100)).toLocaleString()} — {(Number(form.original_amount) * (1 + Number(form.tolerance_percent) / 100)).toLocaleString()}</p>
                  )}
                </div>
                <Input label={isRTL ? 'تاريخ الإصدار *' : 'Issue Date *'} type="date" value={form.issue_date} onChange={e => setForm({ ...form, issue_date: e.target.value })} error={errors.issue_date} />
                <Input label={isRTL ? 'تاريخ الانتهاء *' : 'Expiry Date *'} type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} error={errors.expiry_date} />
                <div>
                  <Input label={isRTL ? 'آخر موعد شحن' : 'Latest Shipment Date'} type="date" value={form.latest_shipment_date} onChange={e => setForm({ ...form, latest_shipment_date: e.target.value })} />
                  {errors.latest_shipment_date && <p className="text-red-500 text-xs mt-1">{errors.latest_shipment_date}</p>}
                </div>
                <div>
                  <Input label={isRTL ? 'فترة تقديم المستندات (أيام) 48' : 'Presentation Period (days) 48'} type="number" value={form.presentation_period_days} onChange={e => setForm({ ...form, presentation_period_days: e.target.value })} />
                  {errors.presentation_period_days && <p className="text-red-500 text-xs mt-1">{errors.presentation_period_days}</p>}
                </div>
                <Input label={isRTL ? 'تنبيه قبل الانتهاء (أيام)' : 'Alert Before Expiry (days)'} type="number" value={form.days_before_expiry_alert} onChange={e => setForm({ ...form, days_before_expiry_alert: e.target.value })} />
                <Input label={isRTL ? 'تنبيه قبل الشحن (أيام)' : 'Alert Before Shipment (days)'} type="number" value={form.days_before_shipment_alert} onChange={e => setForm({ ...form, days_before_shipment_alert: e.target.value })} />
                {/* Date range info */}
                {form.issue_date && form.expiry_date && new Date(form.expiry_date) > new Date(form.issue_date) && (
                  <div className="sm:col-span-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm">
                    <p className="text-gray-600 dark:text-gray-400">{isRTL ? 'مدة الاعتماد:' : 'LC Duration:'} <strong>{Math.ceil((new Date(form.expiry_date).getTime() - new Date(form.issue_date).getTime()) / 864e5)} {isRTL ? 'يوم' : 'days'}</strong></p>
                  </div>
                )}
              </div>
            )}

            {/* ── Tab 3: Shipping ── */}
            {formTab === 3 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isRTL ? 'شروط التسليم (43B)' : 'Incoterms (43B)'}</label>
                  <select value={form.incoterm} onChange={e => setForm({ ...form, incoterm: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                    <option value="">{isRTL ? 'اختر' : 'Select'}</option>
                    {[
                      { code: 'EXW', desc: 'Ex Works' }, { code: 'FCA', desc: 'Free Carrier' }, { code: 'FAS', desc: 'Free Alongside Ship' },
                      { code: 'FOB', desc: 'Free On Board' }, { code: 'CFR', desc: 'Cost & Freight' }, { code: 'CIF', desc: 'Cost, Insurance & Freight' },
                      { code: 'CPT', desc: 'Carriage Paid To' }, { code: 'CIP', desc: 'Carriage & Insurance Paid' },
                      { code: 'DAP', desc: 'Delivered At Place' }, { code: 'DPU', desc: 'Delivered Place Unloaded' }, { code: 'DDP', desc: 'Delivered Duty Paid' },
                    ].map(v => <option key={v.code} value={v.code}>{v.code} — {v.desc}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isRTL ? 'شحنات جزئية (43P)' : 'Partial Shipments (43P)'}</label>
                  <select value={form.partial_shipments} onChange={e => setForm({ ...form, partial_shipments: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                    <option value="allowed">{isRTL ? 'مسموحة' : 'Allowed'}</option>
                    <option value="not_allowed">{isRTL ? 'غير مسموحة' : 'Not Allowed'}</option>
                    <option value="conditional">{isRTL ? 'مشروطة' : 'Conditional'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isRTL ? 'إعادة الشحن (43T)' : 'Transhipment (43T)'}</label>
                  <select value={form.transhipment} onChange={e => setForm({ ...form, transhipment: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                    <option value="allowed">{isRTL ? 'مسموح' : 'Allowed'}</option>
                    <option value="not_allowed">{isRTL ? 'ممنوع' : 'Not Allowed'}</option>
                  </select>
                </div>
                <div />
                {/* Port of Loading - searchable */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isRTL ? 'ميناء التحميل (44A)' : 'Port of Loading (44A)'}</label>
                  <div className="relative">
                    <input type="text" placeholder={isRTL ? 'ابحث عن الميناء...' : 'Search port...'}
                      value={loadPortSearch} onChange={e => { setLoadPortSearch(e.target.value); setShowLoadPortDD(true); }} onFocus={() => setShowLoadPortDD(true)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                    {showLoadPortDD && filteredLoadPorts.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-auto">
                        {filteredLoadPorts.map((p: any) => (
                          <div key={p.id} onClick={() => {
                            const name = isRTL ? p.name_ar || p.name_en : p.name_en;
                            setForm({ ...form, port_of_loading: name, port_of_loading_id: String(p.id) });
                            setLoadPortSearch(name); setShowLoadPortDD(false);
                          }}
                            className="px-3 py-2 hover:bg-blue-50 dark:hover:bg-gray-600 cursor-pointer text-sm border-b border-gray-100 dark:border-gray-600 last:border-0">
                            <div className="flex justify-between"><span>{isRTL ? p.name_ar || p.name_en : p.name_en}</span><span className="text-xs text-gray-400">{p.port_type?.toUpperCase()}</span></div>
                            <p className="text-xs text-gray-400">{isRTL ? p.country_name_ar || p.country_name_en : p.country_name_en}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {form.port_of_loading_id && <button type="button" onClick={() => { setForm({ ...form, port_of_loading: '', port_of_loading_id: '' }); setLoadPortSearch(''); }} className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"><XMarkIcon className="h-4 w-4" /></button>}
                  </div>
                </div>
                {/* Port of Discharge - searchable */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isRTL ? 'ميناء التفريغ (44B)' : 'Port of Discharge (44B)'}</label>
                  <div className="relative">
                    <input type="text" placeholder={isRTL ? 'ابحث عن الميناء...' : 'Search port...'}
                      value={dischPortSearch} onChange={e => { setDischPortSearch(e.target.value); setShowDischPortDD(true); }} onFocus={() => setShowDischPortDD(true)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                    {showDischPortDD && filteredDischPorts.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-auto">
                        {filteredDischPorts.map((p: any) => (
                          <div key={p.id} onClick={() => {
                            const name = isRTL ? p.name_ar || p.name_en : p.name_en;
                            setForm({ ...form, port_of_discharge: name, port_of_discharge_id: String(p.id) });
                            setDischPortSearch(name); setShowDischPortDD(false);
                          }}
                            className="px-3 py-2 hover:bg-blue-50 dark:hover:bg-gray-600 cursor-pointer text-sm border-b border-gray-100 dark:border-gray-600 last:border-0">
                            <div className="flex justify-between"><span>{isRTL ? p.name_ar || p.name_en : p.name_en}</span><span className="text-xs text-gray-400">{p.port_type?.toUpperCase()}</span></div>
                            <p className="text-xs text-gray-400">{isRTL ? p.country_name_ar || p.country_name_en : p.country_name_en}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {form.port_of_discharge_id && <button type="button" onClick={() => { setForm({ ...form, port_of_discharge: '', port_of_discharge_id: '' }); setDischPortSearch(''); }} className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"><XMarkIcon className="h-4 w-4" /></button>}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isRTL ? 'شروط الدفع (41A)' : 'Payment Terms (41A)'}</label>
                  <textarea value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })} rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                </div>
                <Input label={isRTL ? 'مدة الأجل (أيام)' : 'Tenor Days'} type="number" value={form.tenor_days} onChange={e => setForm({ ...form, tenor_days: e.target.value })} />
              </div>
            )}

            {/* ── Tab 4: Links ── */}
            {formTab === 4 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Project - filtered by vendor */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isRTL ? 'المشروع *' : 'Project *'}</label>
                  {form.beneficiary_vendor_id ? (
                    <>
                      <select value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}
                        className={clsx('w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm', errors.project_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600')}>
                        <option value="">{isRTL ? 'اختر المشروع' : 'Select Project'}</option>
                        {vendorProjects.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.code} - {isRTL ? p.name_ar || p.name : p.name} {p.total_po_amount ? `(${Number(p.total_po_amount).toLocaleString()})` : ''}</option>
                        ))}
                      </select>
                      {vendorProjects.length === 0 && <p className="text-xs text-amber-600 mt-1">⚠️ {isRTL ? 'لا توجد مشاريع متاحة لهذا المورد' : 'No available projects for this vendor'}</p>}
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">{isRTL ? 'اختر المورد أولاً لعرض المشاريع المرتبطة' : 'Select vendor first to show linked projects'}</p>
                  )}
                  {errors.project_id && <p className="text-red-500 text-xs mt-1">{errors.project_id}</p>}
                </div>
                {/* PO Link */}
                {importLinked?.type === 'po' && (
                  <div className="sm:col-span-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
                    <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <div><p className="text-sm font-medium text-green-800 dark:text-green-200">{isRTL ? 'مرتبط بأمر شراء' : 'Linked to Purchase Order'}: <strong>{importLinked.number}</strong></p></div>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isRTL ? 'ملاحظات داخلية' : 'Internal Notes'}</label>
                  <textarea value={form.internal_notes} onChange={e => setForm({ ...form, internal_notes: e.target.value })} rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                </div>
              </div>
            )}

            {/* ── Tab 5: Fees & Accounting ── */}
            {formTab === 5 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label={isRTL ? 'عمولة الفتح' : 'Opening Commission'} type="number" value={form.opening_commission} onChange={e => setForm({ ...form, opening_commission: e.target.value })} />
                <Input label={isRTL ? 'رسوم التعديل' : 'Amendment Fees'} type="number" value={form.amendment_fees} onChange={e => setForm({ ...form, amendment_fees: e.target.value })} />
                <Input label={isRTL ? 'رسوم SWIFT' : 'SWIFT Charges'} type="number" value={form.swift_charges} onChange={e => setForm({ ...form, swift_charges: e.target.value })} />
                <Input label={isRTL ? 'رسوم أخرى' : 'Other Charges'} type="number" value={form.other_charges} onChange={e => setForm({ ...form, other_charges: e.target.value })} />
                <div className="sm:col-span-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-between">
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">{isRTL ? 'إجمالي الرسوم' : 'Total Fees'}</span>
                  <span className="text-lg font-bold text-purple-700 dark:text-purple-300">{totalFees.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currencies.find((c: any) => String(c.id) === form.currency_id)?.code || ''}</span>
                </div>
                <div>
                  <Input label={isRTL ? 'نسبة الهامش %' : 'Margin %'} type="number" value={form.margin_percent}
                    onChange={e => {
                      const pct = e.target.value;
                      const amt = form.original_amount ? String(Math.round(Number(form.original_amount) * Number(pct) / 100)) : '0';
                      setForm({ ...form, margin_percent: pct, margin_amount: amt });
                    }} />
                  {errors.margin_percent && <p className="text-red-500 text-xs mt-1">{errors.margin_percent}</p>}
                </div>
                <Input label={isRTL ? 'مبلغ الهامش' : 'Margin Amount'} type="number" value={form.margin_amount} onChange={e => setForm({ ...form, margin_amount: e.target.value })} />
                {/* Expense Account - filtered */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isRTL ? 'حساب المصروفات' : 'Expense Account'}</label>
                  <input type="text" placeholder={isRTL ? 'ابحث بالكود أو الاسم...' : 'Search by code or name...'} value={acctSearch.expense}
                    onChange={e => setAcctSearch({ ...acctSearch, expense: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-t-lg bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white text-xs" />
                  <select value={form.expense_account_id} onChange={e => setForm({ ...form, expense_account_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 border-t-0 rounded-b-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" size={4}>
                    <option value="">{isRTL ? '— لا شيء —' : '— None —'}</option>
                    {expenseAccounts.map((a: any) => <option key={a.id} value={a.id}>{a.code} - {isRTL ? a.name_ar || a.name : a.name}</option>)}
                  </select>
                </div>
                {/* Liability Account */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isRTL ? 'حساب الالتزامات' : 'Liability Account'}</label>
                  <input type="text" placeholder={isRTL ? 'ابحث...' : 'Search...'} value={acctSearch.liability}
                    onChange={e => setAcctSearch({ ...acctSearch, liability: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-t-lg bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white text-xs" />
                  <select value={form.liability_account_id} onChange={e => setForm({ ...form, liability_account_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 border-t-0 rounded-b-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" size={4}>
                    <option value="">{isRTL ? '— لا شيء —' : '— None —'}</option>
                    {liabilityAccounts.map((a: any) => <option key={a.id} value={a.id}>{a.code} - {isRTL ? a.name_ar || a.name : a.name}</option>)}
                  </select>
                </div>
                {/* Margin Account */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isRTL ? 'حساب الهامش (أصول)' : 'Margin Account (Asset)'}</label>
                  <input type="text" placeholder={isRTL ? 'ابحث...' : 'Search...'} value={acctSearch.margin}
                    onChange={e => setAcctSearch({ ...acctSearch, margin: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-t-lg bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white text-xs" />
                  <select value={form.margin_account_id} onChange={e => setForm({ ...form, margin_account_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 border-t-0 rounded-b-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" size={3}>
                    <option value="">{isRTL ? '— لا شيء —' : '— None —'}</option>
                    {marginAccounts.map((a: any) => <option key={a.id} value={a.id}>{a.code} - {isRTL ? a.name_ar || a.name : a.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* ── Tab 6: Review ── */}
            {formTab === 6 && (
              <div className="space-y-4">
                {importLinked && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm">
                    <p className="font-medium text-green-800 dark:text-green-200">🔗 {isRTL ? 'مستورد من' : 'Imported from'}: <strong>{importLinked.type === 'po' ? (isRTL ? 'أمر شراء' : 'Purchase Order') : importLinked.type === 'quotation' ? (isRTL ? 'عرض سعر' : 'Quotation') : (isRTL ? 'عقد' : 'Contract')} {importLinked.number}</strong></p>
                  </div>
                )}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-3">{isRTL ? 'ملخص الاعتماد' : 'LC Summary'}</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <p><span className="text-gray-500">{isRTL ? 'الرقم:' : '#:'}</span> <strong className="font-mono">{form.lc_number || '—'}</strong></p>
                    <p><span className="text-gray-500">{isRTL ? 'النوع:' : 'Type:'}</span> <strong>{lcTypes.find(t => String(t.id) === form.lc_type_id)?.[isRTL ? 'name_ar' : 'name'] || '—'}</strong></p>
                    <p><span className="text-gray-500">{isRTL ? 'المورد:' : 'Vendor:'}</span> <strong>{vendorSearch || '—'}</strong></p>
                    <p><span className="text-gray-500">{isRTL ? 'المبلغ:' : 'Amount:'}</span> <strong className="font-mono">{form.original_amount ? Number(form.original_amount).toLocaleString() : '—'}</strong></p>
                    <p><span className="text-gray-500">{isRTL ? 'العملة:' : 'Currency:'}</span> <strong>{currencies.find((c: any) => String(c.id) === form.currency_id)?.code || '—'}</strong></p>
                    <p><span className="text-gray-500">{isRTL ? 'الانتهاء:' : 'Expiry:'}</span> <strong>{form.expiry_date || '—'}</strong></p>
                    <p><span className="text-gray-500">{isRTL ? 'المشروع:' : 'Project:'}</span> <strong>{vendorProjects.find((p: any) => String(p.id) === form.project_id)?.code || '—'}</strong></p>
                    <p><span className="text-gray-500">{isRTL ? 'البنك:' : 'Bank:'}</span> <strong>{form.issuing_bank_name || bankSearch || '—'}</strong></p>
                    <p><span className="text-gray-500">{isRTL ? 'الرسوم:' : 'Fees:'}</span> <strong className="text-purple-600">{totalFees.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></p>
                    <p><span className="text-gray-500">Incoterm:</span> <strong>{form.incoterm || '—'}</strong></p>
                  </div>
                </div>
                {/* Completion bar */}
                {(() => {
                  const req = ['lc_number', 'lc_type_id', 'beneficiary_vendor_id', 'currency_id', 'original_amount', 'issue_date', 'expiry_date', 'goods_description', 'project_id'];
                  const done = req.filter(f => !!(form as any)[f]).length;
                  const pct = Math.round((done / req.length) * 100);
                  return (
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className={clsx('h-full rounded-full transition-all', pct === 100 ? 'bg-green-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={clsx('text-sm font-bold', pct === 100 ? 'text-green-600' : pct >= 70 ? 'text-amber-600' : 'text-red-600')}>{pct}%</span>
                      </div>
                      {pct < 100 && (
                        <div className="mt-2 space-y-1">
                          {req.filter(f => !(form as any)[f]).map(f => (
                            <p key={f} className="text-xs text-red-500 flex items-center gap-1">
                              <XMarkIcon className="h-3 w-3" />
                              {f === 'lc_number' ? (isRTL ? 'رقم الاعتماد' : 'LC Number') :
                                f === 'lc_type_id' ? (isRTL ? 'النوع' : 'Type') :
                                  f === 'beneficiary_vendor_id' ? (isRTL ? 'المورد' : 'Vendor') :
                                    f === 'currency_id' ? (isRTL ? 'العملة' : 'Currency') :
                                      f === 'original_amount' ? (isRTL ? 'المبلغ' : 'Amount') :
                                        f === 'issue_date' ? (isRTL ? 'تاريخ الإصدار' : 'Issue Date') :
                                          f === 'expiry_date' ? (isRTL ? 'تاريخ الانتهاء' : 'Expiry Date') :
                                            f === 'goods_description' ? (isRTL ? 'وصف البضائع' : 'Goods Description') :
                                              f === 'project_id' ? (isRTL ? 'المشروع' : 'Project') : f}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
                {/* Warnings */}
                <div className="space-y-1">
                  {form.issuing_bank_swift && <p className="text-xs text-teal-600">✅ SWIFT: <span className="font-mono">{form.issuing_bank_swift}</span></p>}
                  {!form.issuing_bank_swift && form.issuing_bank_id && <p className="text-xs text-amber-600">⚠️ {isRTL ? 'رمز SWIFT غير محدد' : 'SWIFT code not set'}</p>}
                  <p className="text-xs text-amber-600">⚠️ {isRTL ? 'تأكد من صحة البيانات قبل الحفظ' : 'Verify all data before submitting'}</p>
                </div>
              </div>
            )}
          </div>

          {/* form actions */}
          <div className="flex items-center justify-between pt-4 border-t dark:border-gray-700">
            <div>{formTab > 0 && <Button variant="secondary" onClick={() => setFormTab(t => t - 1)}>{isRTL ? 'السابق' : 'Previous'}</Button>}</div>
            <div className="flex gap-2">
              {formTab < 6 && <Button variant="secondary" onClick={() => setFormTab(t => t + 1)}>{isRTL ? 'التالي' : 'Next'}</Button>}
              <Button onClick={createOpen ? handleCreate : handleUpdate} loading={saving}>
                {formTab === 6 ? (createOpen ? (isRTL ? '✅ إنشاء الاعتماد' : '✅ Create LC') : (isRTL ? '✅ حفظ' : '✅ Save')) : (createOpen ? (isRTL ? 'إنشاء' : 'Create') : (isRTL ? 'حفظ' : 'Save'))}
              </Button>
              <Button variant="secondary" onClick={() => { setCreateOpen(false); setEditOpen(false); setSelected(null); setErrors({}); setVendorSearch(''); setBankSearch(''); setImportLinked(null); setImportSource('none'); }}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════════
         STATUS CHANGE DIALOG
         ═══════════════════════════════════════════════════ */}
      <Modal isOpen={statusOpen} onClose={() => { setStatusOpen(false); setSelected(null); setStatusNotes(''); }}
        title={isRTL ? '🔄 تغيير الحالة' : '🔄 Change Status'} size="md">
        {selected && (() => {
          const cur = selected.status_code || '';
          const allowed = TRANSITIONS[cur] || [];
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{isRTL ? 'الحالية:' : 'Current:'}</span>
                {statusBadge(cur, selected.status_name, selected.status_name_ar)}
              </div>
              {allowed.length === 0 ? (
                <p className="text-sm text-gray-500">{isRTL ? 'حالة نهائية' : 'Final status — no transitions'}</p>
              ) : (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{isRTL ? 'اختر الحالة:' : 'Select new status:'}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {allowed.map(s => {
                      const c = SC[s] || SC.DRAFT;
                      const info = lcStatuses.find(st => st.code === s);
                      return (
                        <button key={s} onClick={() => handleStatus(s)} disabled={saving}
                          className={clsx('p-3 rounded-lg border-2 text-start transition-all hover:scale-[1.02]', c.bg, c.text, 'border-transparent hover:border-current')}>
                          <p className="font-medium">{c.icon} {isRTL ? (info?.name_ar || s) : (info?.name || s)}</p>
                        </button>
                      );
                    })}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isRTL ? 'ملاحظات' : 'Notes'}</label>
                    <textarea value={statusNotes} onChange={e => setStatusNotes(e.target.value)} rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      placeholder={isRTL ? 'اختياري...' : 'Optional...'} />
                  </div>
                  {allowed.includes('CANCELLED') && <p className="text-xs text-red-500">⚠️ {isRTL ? 'الإلغاء نهائي' : 'Cancellation is permanent'}</p>}
                </>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title={isRTL ? 'حذف الاعتماد' : 'Delete LC'}
        message={isRTL ? `حذف الاعتماد ${deleteTarget?.lc_number}؟` : `Delete LC ${deleteTarget?.lc_number}?`}
        confirmText={isRTL ? 'حذف' : 'Delete'} variant="danger" loading={saving} />

      {/* Sync Confirmation Dialog */}
      <Modal isOpen={syncDialogOpen} onClose={() => { setSyncDialogOpen(false); setSyncPreview(null); setPendingPayload(null); }} title={isRTL ? '🔄 مزامنة البيانات المرتبطة' : '🔄 Sync Linked Records'} size="md">
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {isRTL
                  ? 'لقد قمت بتعديل حقول مشتركة مع سجلات مرتبطة. هل ترغب في تحديث هذه السجلات تلقائياً؟'
                  : 'You have changed fields that are shared with linked records. Would you like to update them automatically?'}
              </p>
            </div>
          </div>

          {syncPreview && syncPreview.map((item: any, idx: number) => (
            <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{item.entity === 'purchase_order' ? '📋' : '🚢'}</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {isRTL ? item.entity_ar : item.entity === 'purchase_order' ? 'Purchase Order' : 'Shipment'}
                  {item.number && <span className="text-blue-600 ms-1">#{item.number}</span>}
                </span>
              </div>
              <div className="space-y-2">
                {item.fields.map((f: any, fi: number) => (
                  <div key={fi} className="flex items-center gap-3 text-sm">
                    <ArrowPathIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <span className="font-medium text-gray-700 dark:text-gray-300">{isRTL ? f.field_ar : f.field}</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-green-600 dark:text-green-400 font-medium">{isRTL ? 'سيتم التحديث' : 'will be updated'}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" onClick={() => { setSyncDialogOpen(false); setSyncPreview(null); setPendingPayload(null); }}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button variant="secondary" onClick={handleSyncSkip}>
              {isRTL ? 'حفظ بدون مزامنة' : 'Save Without Sync'}
            </Button>
            <Button onClick={handleSyncConfirm} loading={saving}>
              <ArrowPathIcon className="h-4 w-4" />
              {isRTL ? 'حفظ ومزامنة الكل' : 'Save & Sync All'}
            </Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
