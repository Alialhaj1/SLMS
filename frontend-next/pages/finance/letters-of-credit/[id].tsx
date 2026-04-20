/**
 * 🏦 LC DETAIL PAGE — صفحة تفاصيل الاعتماد المستندي
 * ====================================================
 * 9-tab detail view: Overview, Amendments, Documents, Payments,
 * Shipping, Banking, Accounting, Alerts, Activity
 */

import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../../components/layout/MainLayout';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import Tabs, { Tab } from '../../../components/ui/Tabs';
import { useTranslation } from '../../../hooks/useTranslation';
import { useToast } from '../../../contexts/ToastContext';
import { usePermissions } from '../../../hooks/usePermissions';
import {
  ArrowLeftIcon, ArrowRightIcon, PencilIcon, DocumentPlusIcon,
  BanknotesIcon, ArrowPathIcon, ExclamationTriangleIcon,
  CheckCircleIcon, ClockIcon, DocumentTextIcon, BuildingLibraryIcon,
  CurrencyDollarIcon, BellAlertIcon, ChartBarIcon, PlusIcon,
  TrashIcon, ArrowDownTrayIcon, EyeIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

const API = '/api';

const SC: Record<string, { icon: string; bg: string; text: string }> = {
  DRAFT: { icon: '📝', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300' },
  REQUESTED: { icon: '📤', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  ISSUED: { icon: '✅', bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300' },
  ADVISED: { icon: '📨', bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300' },
  CONFIRMED: { icon: '🔒', bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300' },
  AMENDED: { icon: '✏️', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
  DOCUMENTS_PRESENTED: { icon: '📎', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
  DISCREPANT: { icon: '⚠️', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
  PAID: { icon: '💰', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  CLOSED: { icon: '✅', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
  CANCELLED: { icon: '🚫', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
  EXPIRED: { icon: '⏰', bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300' },
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

const STATUS_ORDER = ['DRAFT', 'REQUESTED', 'ISSUED', 'ADVISED', 'CONFIRMED', 'AMENDED', 'DOCUMENTS_PRESENTED', 'DISCREPANT', 'PAID', 'CLOSED'];

export default function LCDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const isRTL = locale === 'ar';
  const canEdit = hasPermission('letters_of_credit:edit');
  const canAmend = hasPermission('letters_of_credit:amend');

  const [lc, setLc] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [saving, setSaving] = useState(false);

  // Modals
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusNotes, setStatusNotes] = useState('');
  const [amendOpen, setAmendOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [lcStatuses, setLcStatuses] = useState<any[]>([]);

  // Amendment form
  const [amendForm, setAmendForm] = useState({ amendment_type: 'amount_change', description: '', new_amount: '', new_expiry_date: '' });
  // Document form
  const [docForm, setDocForm] = useState({ document_type: 'bill_of_lading', document_name: '', document_number: '', document_date: '', presentation_date: '', original_copies: '1', copy_copies: '0', notes: '' });
  // Payment form
  const [payForm, setPayForm] = useState({ payment_type: 'sight_payment', amount: '', payment_date: new Date().toISOString().split('T')[0], bank_reference: '', value_date: '', notes: '' });

  const token = () => localStorage.getItem('accessToken');
  const h = () => ({ Authorization: `Bearer ${token()}` });

  const fetchLC = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [lcRes, docRes, payRes, stRes] = await Promise.all([
        fetch(`${API}/letters-of-credit/${id}`, { headers: h() }),
        fetch(`${API}/letters-of-credit/${id}/documents`, { headers: h() }),
        fetch(`${API}/letters-of-credit/${id}/payments`, { headers: h() }),
        fetch(`${API}/letters-of-credit/statuses`, { headers: h() }),
      ]);
      if (lcRes.ok) { const d = await lcRes.json(); setLc(d.data); }
      else { showToast('LC not found', 'error'); router.push('/finance/letters-of-credit'); return; }
      if (docRes.ok) { const d = await docRes.json(); setDocuments(d.data || []); }
      if (payRes.ok) { const d = await payRes.json(); setPayments(d.data || []); }
      if (stRes.ok) { const d = await stRes.json(); setLcStatuses(d.data || []); }
    } catch { showToast('Failed to load', 'error'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchLC(); }, [fetchLC]);

  const fmt = (n: number, c = 'SAR') => { try { return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-SA', { style: 'currency', currency: c || 'SAR', minimumFractionDigits: 2 }).format(n || 0); } catch { return `${(n || 0).toFixed(2)} ${c}`; } };
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString(isRTL ? 'ar-SA' : 'en-GB') : '—';
  const daysUntil = (d: string) => d ? Math.ceil((new Date(d).getTime() - Date.now()) / 864e5) : null;
  const utilPct = () => lc?.current_amount ? Math.min(100, Math.round((lc.utilized_amount / lc.current_amount) * 100)) : 0;

  const statusBadge = (code: string, name?: string, nameAr?: string) => {
    const c = SC[code] || SC.DRAFT;
    return <span className={clsx('inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-full', c.bg, c.text)}>{c.icon} {isRTL ? (nameAr || code) : (name || code)}</span>;
  };

  /* ── Actions ── */
  const handleStatus = async (newStatus: string) => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/letters-of-credit/${id}/status`, {
        method: 'PUT', headers: { ...h(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_status: newStatus, notes: statusNotes }),
      });
      if (res.ok) { showToast(isRTL ? 'تم تغيير الحالة' : 'Status changed', 'success'); setStatusOpen(false); setStatusNotes(''); fetchLC(); }
      else { const e = await res.json(); showToast(e.error?.message || 'Failed', 'error'); }
    } catch { showToast('Failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleAmendment = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/letters-of-credit/${id}/amend`, {
        method: 'POST', headers: { ...h(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          change_type: amendForm.amendment_type,
          change_description: amendForm.description,
          amendment_date: new Date().toISOString().split('T')[0],
          new_amount: amendForm.new_amount ? Number(amendForm.new_amount) : null,
          new_expiry_date: amendForm.new_expiry_date || null,
        }),
      });
      if (res.ok) { showToast(isRTL ? 'تم التعديل' : 'Amendment added', 'success'); setAmendOpen(false); setAmendForm({ amendment_type: 'amount_change', description: '', new_amount: '', new_expiry_date: '' }); fetchLC(); }
      else { const e = await res.json(); showToast(e.error?.message || 'Failed', 'error'); }
    } catch { showToast('Failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleDocument = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/letters-of-credit/${id}/documents`, {
        method: 'POST', headers: { ...h(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...docForm, original_copies: Number(docForm.original_copies), copy_copies: Number(docForm.copy_copies) }),
      });
      if (res.ok) { showToast(isRTL ? 'تم إضافة المستند' : 'Document added', 'success'); setDocOpen(false); setDocForm({ document_type: 'bill_of_lading', document_name: '', document_number: '', document_date: '', presentation_date: '', original_copies: '1', copy_copies: '0', notes: '' }); fetchLC(); }
      else { const e = await res.json(); showToast(e.error?.message || 'Failed', 'error'); }
    } catch { showToast('Failed', 'error'); }
    finally { setSaving(false); }
  };

  const handlePayment = async () => {
    if (!payForm.amount || Number(payForm.amount) <= 0) { showToast('Amount required', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/letters-of-credit/${id}/payments`, {
        method: 'POST', headers: { ...h(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payForm, amount: Number(payForm.amount) }),
      });
      if (res.ok) { showToast(isRTL ? 'تم تسجيل الدفعة' : 'Payment recorded', 'success'); setPayOpen(false); setPayForm({ payment_type: 'sight_payment', amount: '', payment_date: new Date().toISOString().split('T')[0], bank_reference: '', value_date: '', notes: '' }); fetchLC(); }
      else { const e = await res.json(); showToast(e.error?.message || 'Failed', 'error'); }
    } catch { showToast('Failed', 'error'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <MainLayout>
      <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
    </MainLayout>
  );

  if (!lc) return (
    <MainLayout>
      <div className="text-center py-20"><p className="text-gray-500">{isRTL ? 'الاعتماد غير موجود' : 'LC not found'}</p></div>
    </MainLayout>
  );

  const sc = lc.status_code || '';
  const allowed = TRANSITIONS[sc] || [];
  const u = utilPct();

  const tabs: Tab[] = [
    { id: 'overview', label: 'Overview', label_ar: 'نظرة عامة', icon: <EyeIcon className="h-4 w-4" /> },
    { id: 'amendments', label: 'Amendments', label_ar: 'التعديلات', icon: <PencilIcon className="h-4 w-4" />, badge: lc.amendments?.length || 0 },
    { id: 'documents', label: 'Documents', label_ar: 'المستندات', icon: <DocumentTextIcon className="h-4 w-4" />, badge: documents.length },
    { id: 'payments', label: 'Payments', label_ar: 'المدفوعات', icon: <BanknotesIcon className="h-4 w-4" />, badge: payments.length },
    { id: 'shipping', label: 'Shipping', label_ar: 'الشحن', icon: <ChartBarIcon className="h-4 w-4" /> },
    { id: 'banking', label: 'Banking', label_ar: 'البنوك', icon: <BuildingLibraryIcon className="h-4 w-4" /> },
    { id: 'accounting', label: 'Accounting', label_ar: 'المحاسبة', icon: <CurrencyDollarIcon className="h-4 w-4" /> },
    { id: 'alerts', label: 'Alerts', label_ar: 'التنبيهات', icon: <BellAlertIcon className="h-4 w-4" /> },
  ];

  const InfoRow = ({ label, value, valueClass }: { label: string; value: any; valueClass?: string }) => (
    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700/50">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={clsx('text-sm font-medium text-gray-900 dark:text-white', valueClass)}>{value || '—'}</span>
    </div>
  );

  return (
    <MainLayout>
      <Head><title>{lc.lc_number} - {isRTL ? 'تفاصيل الاعتماد' : 'LC Detail'} - SLMS</title></Head>

      <div className="space-y-6 animate-fade-in">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/finance/letters-of-credit')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              {isRTL ? <ArrowRightIcon className="h-5 w-5" /> : <ArrowLeftIcon className="h-5 w-5" />}
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-mono">{lc.lc_number}</h1>
                {statusBadge(sc, lc.status_name, lc.status_name_ar)}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {isRTL ? lc.type_name_ar || lc.type_name : lc.type_name} · {isRTL ? (lc.vendor_name_ar || lc.beneficiary_name_ar || lc.beneficiary_name) : (lc.vendor_name || lc.beneficiary_name)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && allowed.length > 0 && (
              <Button onClick={() => { setStatusOpen(true); setStatusNotes(''); }}>
                <ArrowPathIcon className="h-4 w-4" /> {isRTL ? 'تغيير الحالة' : 'Change Status'}
              </Button>
            )}
            {canAmend && (
              <Button variant="secondary" onClick={() => setAmendOpen(true)}>
                <PencilIcon className="h-4 w-4" /> {isRTL ? 'تعديل' : 'Amend'}
              </Button>
            )}
            {canEdit && (
              <>
                <Button variant="secondary" onClick={() => setDocOpen(true)}>
                  <DocumentPlusIcon className="h-4 w-4" /> {isRTL ? 'مستند' : 'Document'}
                </Button>
                <Button variant="secondary" onClick={() => setPayOpen(true)}>
                  <BanknotesIcon className="h-4 w-4" /> {isRTL ? 'دفعة' : 'Payment'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── Progress Timeline ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between overflow-x-auto gap-1">
            {STATUS_ORDER.map((s, i) => {
              const current = STATUS_ORDER.indexOf(sc);
              const isPast = i < current;
              const isCurrent = s === sc;
              const c = SC[s] || SC.DRAFT;
              return (
                <div key={s} className="flex items-center flex-shrink-0">
                  <div className={clsx('flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all',
                    isCurrent ? `${c.bg} ${c.text} ring-2 ring-offset-1 ring-current` :
                      isPast ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-400')}>
                    <span>{c.icon}</span>
                    <span className="hidden sm:inline">{s.replace('_', ' ').split(' ').map(w => w[0]).join('')}</span>
                  </div>
                  {i < STATUS_ORDER.length - 1 && <div className={clsx('w-4 h-0.5 mx-0.5', isPast ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-600')} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Amount Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-4">
            <p className="text-xs text-gray-500">{isRTL ? 'المبلغ الحالي' : 'Current Amount'}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{fmt(lc.current_amount, lc.currency_code)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-4">
            <p className="text-xs text-gray-500">{isRTL ? 'المستخدم' : 'Utilized'}</p>
            <p className="text-xl font-bold text-amber-600 mt-1">{fmt(lc.utilized_amount, lc.currency_code)}</p>
            <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className={clsx('h-full rounded-full', u >= 80 ? 'bg-red-500' : u >= 50 ? 'bg-amber-500' : 'bg-blue-500')} style={{ width: `${u}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{u}%</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-4">
            <p className="text-xs text-gray-500">{isRTL ? 'المتاح' : 'Available'}</p>
            <p className="text-xl font-bold text-green-600 mt-1">{fmt(lc.available_amount || (lc.current_amount - lc.utilized_amount), lc.currency_code)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-4">
            <p className="text-xs text-gray-500">{isRTL ? 'الرسوم' : 'Total Fees'}</p>
            <p className="text-xl font-bold text-purple-600 mt-1">{fmt(lc.total_fees || 0, lc.currency_code)}</p>
          </div>
        </div>

        {/* ── Tabs ── */}
        <Tabs tabs={tabs} activeTab={tab} onTabChange={setTab} locale={locale as 'en' | 'ar'} variant="underline" />

        {/* ── Tab Content ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">

          {/* Overview */}
          {tab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{isRTL ? 'بيانات أساسية' : 'Basic Information'}</h3>
                <InfoRow label={isRTL ? 'رقم الاعتماد' : 'LC Number'} value={lc.lc_number} />
                <InfoRow label={isRTL ? 'النوع' : 'Type'} value={isRTL ? lc.type_name_ar : lc.type_name} />
                <InfoRow label={isRTL ? 'المستفيد' : 'Beneficiary'} value={isRTL ? (lc.vendor_name_ar || lc.beneficiary_name_ar) : (lc.vendor_name || lc.beneficiary_name)} />
                <InfoRow label={isRTL ? 'العملة' : 'Currency'} value={lc.currency_code} />
                <InfoRow label={isRTL ? 'المبلغ الأصلي' : 'Original Amount'} value={fmt(lc.original_amount, lc.currency_code)} />
                <InfoRow label={isRTL ? 'التسامح %' : 'Tolerance %'} value={lc.tolerance_percent ? `±${lc.tolerance_percent}%` : '—'} />
                <InfoRow label={isRTL ? 'سعر الصرف' : 'Exchange Rate'} value={lc.exchange_rate} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{isRTL ? 'تواريخ' : 'Dates'}</h3>
                <InfoRow label={isRTL ? 'تاريخ الإصدار' : 'Issue Date'} value={fmtDate(lc.issue_date)} />
                <InfoRow label={isRTL ? 'تاريخ الانتهاء' : 'Expiry Date'} value={fmtDate(lc.expiry_date)} valueClass={daysUntil(lc.expiry_date) !== null && daysUntil(lc.expiry_date)! <= 30 ? 'text-red-600' : ''} />
                <InfoRow label={isRTL ? 'آخر موعد شحن' : 'Latest Shipment'} value={fmtDate(lc.latest_shipment_date)} />
                <InfoRow label={isRTL ? 'فترة التقديم' : 'Presentation Period'} value={lc.presentation_period_days ? `${lc.presentation_period_days} ${isRTL ? 'يوم' : 'days'}` : '—'} />
                {daysUntil(lc.expiry_date) !== null && (
                  <div className={clsx('mt-3 p-3 rounded-lg text-sm font-medium', daysUntil(lc.expiry_date)! < 0 ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' : daysUntil(lc.expiry_date)! <= 30 ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400')}>
                    {daysUntil(lc.expiry_date)! < 0 ? `⏰ ${isRTL ? 'منتهي' : 'EXPIRED'}` : `${daysUntil(lc.expiry_date)} ${isRTL ? 'يوم متبقي' : 'days remaining'}`}
                  </div>
                )}
                {lc.goods_description && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{isRTL ? 'وصف البضائع' : 'Goods Description'}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">{lc.goods_description}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Amendments */}
          {tab === 'amendments' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{isRTL ? 'التعديلات' : 'Amendments'}</h3>
                {canAmend && <Button size="sm" onClick={() => setAmendOpen(true)}><PlusIcon className="h-4 w-4" /> {isRTL ? 'تعديل جديد' : 'New Amendment'}</Button>}
              </div>
              {(!lc.amendments || lc.amendments.length === 0) ? (
                <p className="text-center text-gray-500 py-8">{isRTL ? 'لا توجد تعديلات' : 'No amendments'}</p>
              ) : (
                <div className="space-y-3">
                  {lc.amendments.map((a: any, i: number) => (
                    <div key={a.id || i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">{a.amendment_type}</span>
                          <p className="text-sm text-gray-900 dark:text-white mt-2">{a.description}</p>
                        </div>
                        <span className="text-xs text-gray-500">{fmtDate(a.created_at)}</span>
                      </div>
                      {a.new_amount && <p className="text-sm mt-2">{isRTL ? 'المبلغ الجديد:' : 'New Amount:'} <strong>{fmt(a.new_amount, lc.currency_code)}</strong></p>}
                      {a.new_expiry_date && <p className="text-sm mt-1">{isRTL ? 'تاريخ الانتهاء الجديد:' : 'New Expiry:'} <strong>{fmtDate(a.new_expiry_date)}</strong></p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Documents */}
          {tab === 'documents' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{isRTL ? 'المستندات' : 'Documents'}</h3>
                {canEdit && <Button size="sm" onClick={() => setDocOpen(true)}><PlusIcon className="h-4 w-4" /> {isRTL ? 'مستند جديد' : 'Add Document'}</Button>}
              </div>
              {documents.length === 0 ? (
                <p className="text-center text-gray-500 py-8">{isRTL ? 'لا توجد مستندات' : 'No documents'}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      {[isRTL ? 'النوع' : 'Type', isRTL ? 'الاسم' : 'Name', isRTL ? 'الرقم' : 'Number', isRTL ? 'التاريخ' : 'Date', isRTL ? 'الحالة' : 'Status', isRTL ? 'نسخ' : 'Copies'].map((h, i) => (
                        <th key={i} className="px-3 py-2 text-start text-xs font-medium text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {documents.map((d: any) => (
                      <tr key={d.id}>
                        <td className="px-3 py-2"><span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">{d.document_type}</span></td>
                        <td className="px-3 py-2 text-gray-900 dark:text-white">{d.document_name}</td>
                        <td className="px-3 py-2 text-gray-500 font-mono">{d.document_number || '—'}</td>
                        <td className="px-3 py-2 text-gray-500">{fmtDate(d.document_date)}</td>
                        <td className="px-3 py-2">
                          <span className={clsx('px-2 py-0.5 rounded text-xs', d.status === 'accepted' ? 'bg-green-100 text-green-700' : d.status === 'discrepant' || d.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>{d.status}</span>
                        </td>
                        <td className="px-3 py-2 text-gray-500">{d.original_copies}/{d.copy_copies}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Payments */}
          {tab === 'payments' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{isRTL ? 'المدفوعات' : 'Payments'}</h3>
                {canEdit && <Button size="sm" onClick={() => setPayOpen(true)}><PlusIcon className="h-4 w-4" /> {isRTL ? 'دفعة جديدة' : 'Record Payment'}</Button>}
              </div>
              {payments.length === 0 ? (
                <p className="text-center text-gray-500 py-8">{isRTL ? 'لا توجد مدفوعات' : 'No payments'}</p>
              ) : (
                <>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        {[isRTL ? 'الرقم' : '#', isRTL ? 'النوع' : 'Type', isRTL ? 'المبلغ' : 'Amount', isRTL ? 'التاريخ' : 'Date', isRTL ? 'مرجع البنك' : 'Bank Ref'].map((h, i) => (
                          <th key={i} className={clsx('px-3 py-2 text-xs font-medium text-gray-500 uppercase', i === 2 ? 'text-end' : 'text-start')}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {payments.map((p: any) => (
                        <tr key={p.id}>
                          <td className="px-3 py-2 font-mono text-gray-500">{p.payment_number}</td>
                          <td className="px-3 py-2"><span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded text-xs">{p.payment_type}</span></td>
                          <td className="px-3 py-2 text-end font-medium text-gray-900 dark:text-white">{fmt(p.amount, p.currency_code || lc.currency_code)}</td>
                          <td className="px-3 py-2 text-gray-500">{fmtDate(p.payment_date)}</td>
                          <td className="px-3 py-2 text-gray-500 font-mono">{p.bank_reference || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm">
                    {isRTL ? 'إجمالي المدفوعات:' : 'Total Payments:'} <strong>{fmt(payments.reduce((s: number, p: any) => s + (p.amount || 0), 0), lc.currency_code)}</strong>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Shipping */}
          {tab === 'shipping' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">{isRTL ? 'شروط الشحن' : 'Shipping Terms'}</h3>
                <InfoRow label="Incoterms" value={lc.incoterm} />
                <InfoRow label={isRTL ? 'شحنات جزئية' : 'Partial Shipments'} value={lc.partial_shipments} />
                <InfoRow label={isRTL ? 'إعادة الشحن' : 'Transhipment'} value={lc.transhipment} />
                <InfoRow label={isRTL ? 'ميناء التحميل' : 'Port of Loading'} value={lc.port_of_loading} />
                <InfoRow label={isRTL ? 'ميناء التفريغ' : 'Port of Discharge'} value={lc.port_of_discharge} />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">{isRTL ? 'شروط الدفع' : 'Payment Terms'}</h3>
                <InfoRow label={isRTL ? 'شروط الدفع' : 'Terms'} value={lc.payment_terms} />
                <InfoRow label={isRTL ? 'مدة الأجل' : 'Tenor'} value={lc.tenor_days ? `${lc.tenor_days} ${isRTL ? 'يوم' : 'days'}` : '—'} />
              </div>
            </div>
          )}

          {/* Banking */}
          {tab === 'banking' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">{isRTL ? 'البنك المُصدِر' : 'Issuing Bank'}</h3>
                <InfoRow label={isRTL ? 'الاسم' : 'Name'} value={lc.issuing_bank_name_display || lc.issuing_bank_name} />
                <InfoRow label="SWIFT" value={lc.issuing_bank_swift} />
                <InfoRow label={isRTL ? 'العنوان' : 'Address'} value={lc.issuing_bank_address} />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">{isRTL ? 'البنوك الأخرى' : 'Other Banks'}</h3>
                <InfoRow label={isRTL ? 'البنك المُبلِّغ' : 'Advising Bank'} value={lc.advising_bank_name} />
                <InfoRow label="Advising SWIFT" value={lc.advising_bank_swift} />
                <InfoRow label={isRTL ? 'البنك المُؤكِّد' : 'Confirming Bank'} value={lc.confirming_bank_name} />
                <InfoRow label="Confirming SWIFT" value={lc.confirming_bank_swift} />
                <InfoRow label={isRTL ? 'مُؤكَّد' : 'Confirmed'} value={lc.is_confirmed ? '✅' : '❌'} />
              </div>
            </div>
          )}

          {/* Accounting */}
          {tab === 'accounting' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">{isRTL ? 'الحسابات' : 'Accounts'}</h3>
                  <InfoRow label={isRTL ? 'حساب المصروفات' : 'Expense'} value={lc.expense_account_code ? `${lc.expense_account_code} - ${lc.expense_account_name}` : '—'} />
                  <InfoRow label={isRTL ? 'حساب الالتزامات' : 'Liability'} value={lc.liability_account_code ? `${lc.liability_account_code} - ${lc.liability_account_name}` : '—'} />
                  <InfoRow label={isRTL ? 'حساب الهامش' : 'Margin'} value={lc.margin_account_code ? `${lc.margin_account_code} - ${lc.margin_account_name}` : '—'} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">{isRTL ? 'الرسوم والهامش' : 'Fees & Margin'}</h3>
                  <InfoRow label={isRTL ? 'عمولة الفتح' : 'Opening Commission'} value={fmt(lc.opening_commission || 0, lc.currency_code)} />
                  <InfoRow label={isRTL ? 'رسوم التعديل' : 'Amendment Fees'} value={fmt(lc.amendment_fees || 0, lc.currency_code)} />
                  <InfoRow label={isRTL ? 'رسوم SWIFT' : 'SWIFT Charges'} value={fmt(lc.swift_charges || 0, lc.currency_code)} />
                  <InfoRow label={isRTL ? 'رسوم أخرى' : 'Other'} value={fmt(lc.other_charges || 0, lc.currency_code)} />
                  <InfoRow label={isRTL ? 'إجمالي الرسوم' : 'Total Fees'} value={fmt(lc.total_fees || 0, lc.currency_code)} valueClass="text-purple-600 font-bold" />
                  <InfoRow label={isRTL ? 'نسبة الهامش' : 'Margin %'} value={lc.margin_percent ? `${lc.margin_percent}%` : '—'} />
                  <InfoRow label={isRTL ? 'مبلغ الهامش' : 'Margin Amount'} value={fmt(lc.margin_amount || 0, lc.currency_code)} />
                </div>
              </div>
            </div>
          )}

          {/* Alerts */}
          {tab === 'alerts' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{isRTL ? 'التنبيهات' : 'Alerts & Notifications'}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={clsx('p-4 rounded-lg border', daysUntil(lc.expiry_date) !== null && daysUntil(lc.expiry_date)! <= (lc.days_before_expiry_alert || 30) ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 bg-gray-50 dark:bg-gray-700/50')}>
                  <p className="font-medium text-sm">{isRTL ? 'انتهاء الاعتماد' : 'LC Expiry'}</p>
                  <p className="text-2xl font-bold mt-1">{daysUntil(lc.expiry_date) ?? '—'} <span className="text-sm font-normal">{isRTL ? 'يوم' : 'days'}</span></p>
                  <p className="text-xs text-gray-500 mt-1">{isRTL ? 'تنبيه قبل' : 'Alert before'}: {lc.days_before_expiry_alert || 30} {isRTL ? 'يوم' : 'days'}</p>
                </div>
                <div className={clsx('p-4 rounded-lg border', lc.latest_shipment_date && daysUntil(lc.latest_shipment_date) !== null && daysUntil(lc.latest_shipment_date)! <= (lc.days_before_shipment_alert || 14) ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20' : 'border-gray-200 bg-gray-50 dark:bg-gray-700/50')}>
                  <p className="font-medium text-sm">{isRTL ? 'موعد الشحن' : 'Shipment Due'}</p>
                  <p className="text-2xl font-bold mt-1">{daysUntil(lc.latest_shipment_date) ?? '—'} <span className="text-sm font-normal">{isRTL ? 'يوم' : 'days'}</span></p>
                  <p className="text-xs text-gray-500 mt-1">{isRTL ? 'تنبيه قبل' : 'Alert before'}: {lc.days_before_shipment_alert || 14} {isRTL ? 'يوم' : 'days'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Status Change Modal ═══ */}
      <Modal isOpen={statusOpen} onClose={() => { setStatusOpen(false); setStatusNotes(''); }} title={isRTL ? '🔄 تغيير الحالة' : '🔄 Change Status'} size="md">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{isRTL ? 'الحالية:' : 'Current:'}</span>
            {statusBadge(sc, lc.status_name, lc.status_name_ar)}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {allowed.map(s => {
              const c = SC[s] || SC.DRAFT;
              const info = lcStatuses.find((st: any) => st.code === s);
              return (
                <button key={s} onClick={() => handleStatus(s)} disabled={saving}
                  className={clsx('p-3 rounded-lg border-2 text-start transition-all hover:scale-[1.02]', c.bg, c.text, 'border-transparent hover:border-current')}>
                  <p className="font-medium">{c.icon} {isRTL ? (info?.name_ar || s) : (info?.name || s)}</p>
                </button>
              );
            })}
          </div>
          <textarea value={statusNotes} onChange={e => setStatusNotes(e.target.value)} rows={2} placeholder={isRTL ? 'ملاحظات...' : 'Notes...'}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
        </div>
      </Modal>

      {/* ═══ Amendment Modal ═══ */}
      <Modal isOpen={amendOpen} onClose={() => setAmendOpen(false)} title={isRTL ? '✏️ تعديل الاعتماد' : '✏️ New Amendment'} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{isRTL ? 'نوع التعديل' : 'Amendment Type'}</label>
            <select value={amendForm.amendment_type} onChange={e => setAmendForm({ ...amendForm, amendment_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
              {['amount_change', 'expiry_extension', 'terms_change', 'beneficiary_change', 'other'].map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{isRTL ? 'الوصف' : 'Description'}</label>
            <textarea value={amendForm.description} onChange={e => setAmendForm({ ...amendForm, description: e.target.value })} rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>
          {(amendForm.amendment_type === 'amount_change') && (
            <Input label={isRTL ? 'المبلغ الجديد' : 'New Amount'} type="number" value={amendForm.new_amount} onChange={e => setAmendForm({ ...amendForm, new_amount: e.target.value })} />
          )}
          {(amendForm.amendment_type === 'expiry_extension') && (
            <Input label={isRTL ? 'تاريخ الانتهاء الجديد' : 'New Expiry Date'} type="date" value={amendForm.new_expiry_date} onChange={e => setAmendForm({ ...amendForm, new_expiry_date: e.target.value })} />
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAmendOpen(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleAmendment} loading={saving}>{isRTL ? 'إضافة التعديل' : 'Add Amendment'}</Button>
          </div>
        </div>
      </Modal>

      {/* ═══ Document Modal ═══ */}
      <Modal isOpen={docOpen} onClose={() => setDocOpen(false)} title={isRTL ? '📎 إضافة مستند' : '📎 Add Document'} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{isRTL ? 'نوع المستند' : 'Document Type'}</label>
            <select value={docForm.document_type} onChange={e => setDocForm({ ...docForm, document_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
              {['bill_of_lading', 'commercial_invoice', 'packing_list', 'certificate_of_origin', 'insurance_certificate', 'inspection_certificate', 'draft_bill_of_exchange', 'other'].map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <Input label={isRTL ? 'اسم المستند' : 'Document Name'} value={docForm.document_name} onChange={e => setDocForm({ ...docForm, document_name: e.target.value })} />
          <Input label={isRTL ? 'رقم المستند' : 'Document Number'} value={docForm.document_number} onChange={e => setDocForm({ ...docForm, document_number: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label={isRTL ? 'تاريخ المستند' : 'Document Date'} type="date" value={docForm.document_date} onChange={e => setDocForm({ ...docForm, document_date: e.target.value })} />
            <Input label={isRTL ? 'تاريخ التقديم' : 'Presentation Date'} type="date" value={docForm.presentation_date} onChange={e => setDocForm({ ...docForm, presentation_date: e.target.value })} />
            <Input label={isRTL ? 'نسخ أصلية' : 'Originals'} type="number" value={docForm.original_copies} onChange={e => setDocForm({ ...docForm, original_copies: e.target.value })} />
            <Input label={isRTL ? 'صور' : 'Copies'} type="number" value={docForm.copy_copies} onChange={e => setDocForm({ ...docForm, copy_copies: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDocOpen(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleDocument} loading={saving}>{isRTL ? 'إضافة' : 'Add Document'}</Button>
          </div>
        </div>
      </Modal>

      {/* ═══ Payment Modal ═══ */}
      <Modal isOpen={payOpen} onClose={() => setPayOpen(false)} title={isRTL ? '💰 تسجيل دفعة' : '💰 Record Payment'} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{isRTL ? 'نوع الدفع' : 'Payment Type'}</label>
            <select value={payForm.payment_type} onChange={e => setPayForm({ ...payForm, payment_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
              {['sight_payment', 'deferred_payment', 'acceptance', 'negotiation'].map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <Input label={isRTL ? 'المبلغ *' : 'Amount *'} type="number" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} />
          <p className="text-xs text-gray-500">{isRTL ? 'المتاح:' : 'Available:'} {fmt(lc.available_amount || (lc.current_amount - lc.utilized_amount), lc.currency_code)}</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label={isRTL ? 'تاريخ الدفع' : 'Payment Date'} type="date" value={payForm.payment_date} onChange={e => setPayForm({ ...payForm, payment_date: e.target.value })} />
            <Input label={isRTL ? 'تاريخ القيمة' : 'Value Date'} type="date" value={payForm.value_date} onChange={e => setPayForm({ ...payForm, value_date: e.target.value })} />
          </div>
          <Input label={isRTL ? 'مرجع البنك' : 'Bank Reference'} value={payForm.bank_reference} onChange={e => setPayForm({ ...payForm, bank_reference: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPayOpen(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handlePayment} loading={saving}>{isRTL ? 'تسجيل' : 'Record Payment'}</Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
