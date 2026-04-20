/**
 * ============================================================================
 * ACCOUNT REQUESTS - Review & Approve Tenant Registration Requests
 * ============================================================================
 * Card-based layout with filter tabs, detail modal, approve/reject with notes,
 * and create-account-from-approved flow.
 *
 * @module pages/admin/account-requests
 * @version 2.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/hooks/useToast';
import {
  InboxStackIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  XMarkIcon,
  ClockIcon,
  UserPlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

/* ── Types ── */
interface AccountRequest {
  id: number;
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  country?: string;
  plan?: string;
  message?: string;
  status: 'pending' | 'reviewing' | 'approved' | 'rejected';
  review_note?: string;
  reviewed_by?: string;
  submitted_at: string;
  created_at: string;
}

/* ── Status Config ── */
const STATUS_CONFIG: Record<string, { label: string; labelAr: string; color: string; icon: string }> = {
  pending: { label: 'Pending', labelAr: 'معلّق', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: '⏳' },
  reviewing: { label: 'Reviewing', labelAr: 'قيد المراجعة', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: '🔍' },
  approved: { label: 'Approved', labelAr: 'مقبول', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: '✅' },
  rejected: { label: 'Rejected', labelAr: 'مرفوض', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: '🚫' },
};

const TABS = ['all', 'pending', 'reviewing', 'approved', 'rejected'] as const;

/* ── Country Flags (common) ── */
const FLAGS: Record<string, string> = {
  SAU: '🇸🇦', ARE: '🇦🇪', KWT: '🇰🇼', BHR: '🇧🇭', OMN: '🇴🇲', QAT: '🇶🇦',
  EGY: '🇪🇬', JOR: '🇯🇴', IRQ: '🇮🇶', LBN: '🇱🇧', USA: '🇺🇸', GBR: '🇬🇧',
};

export default function AccountRequestsPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const isRTL = locale === 'ar';

  const [requests, setRequests] = useState<AccountRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [viewItem, setViewItem] = useState<AccountRequest | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<AccountRequest | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) { setLoading(false); return; }
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (search) params.set('search', search);
      const res = await fetch(`http://localhost:4000/api/account-requests?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setRequests(Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [filterStatus, search]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleAction = async (req: AccountRequest, action: 'approve' | 'reject', note?: string) => {
    setActionLoading(req.id);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/account-requests/${req.id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error('Failed');
      showToast('success', action === 'approve'
        ? (isRTL ? '✅ تمت الموافقة على الطلب' : '✅ Request approved')
        : (isRTL ? '🚫 تم رفض الطلب' : '🚫 Request rejected'));
      setShowRejectModal(null);
      fetchRequests();
    } catch {
      showToast('error', isRTL ? 'فشل في تنفيذ الإجراء' : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const filtered = filterStatus === 'all' ? requests : requests.filter(r => r.status === filterStatus);
  const searchFiltered = search ? filtered.filter(r =>
    r.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.email?.toLowerCase().includes(search.toLowerCase())
  ) : filtered;

  return (
    <MainLayout>
      <Head>
        <title>{isRTL ? 'طلبات الحسابات' : 'Account Requests'} - SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {isRTL ? '📬 طلبات الحسابات' : '📬 Account Requests'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isRTL ? 'طلبات العملاء الراغبين بالاشتراك في المنصة' : 'Review customer registration requests'}
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-full font-semibold">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                {pendingCount} {isRTL ? 'معلّق' : 'pending'}
              </span>
            )}
          </div>
        </div>

        {/* Filter Tabs + Search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-1">
            {TABS.map(s => {
              const cfg = STATUS_CONFIG[s];
              const count = s === 'all' ? requests.length : requests.filter(r => r.status === s).length;
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${filterStatus === s ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                >
                  {s === 'all' ? (isRTL ? 'الكل' : 'All') : (isRTL ? cfg?.labelAr : cfg?.label)}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filterStatus === s ? 'bg-white/20' : 'bg-gray-100 dark:bg-slate-700'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={isRTL ? 'بحث...' : 'Search...'}
              className="w-full pl-9 rtl:pr-9 rtl:pl-3 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Request Cards */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-slate-600 rounded-xl" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-32 mb-2" />
                    <div className="h-3 bg-gray-200 dark:bg-slate-600 rounded w-48" />
                  </div>
                  <div className="h-6 bg-gray-200 dark:bg-slate-600 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : searchFiltered.length === 0 ? (
          <div className="text-center py-16">
            <InboxStackIcon className="h-14 w-14 mx-auto text-gray-300 dark:text-slate-600 mb-3" />
            <p className="text-lg font-semibold text-gray-500 dark:text-gray-400">
              {isRTL ? 'لا توجد طلبات' : 'No requests found'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {searchFiltered.map(req => {
              const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
              return (
                <div key={req.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 transition-all hover:shadow-md">
                  <div className="flex items-center gap-4">
                    {/* Flag/Icon */}
                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-2xl shrink-0">
                      {FLAGS[req.country || ''] || '🌍'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{req.company_name}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {req.contact_name} — <span className="ltr:inline" dir="ltr">{req.email}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {req.plan && <><strong className="text-blue-600">{req.plan}</strong> · </>}
                        {new Date(req.submitted_at || req.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                      </p>
                    </div>

                    {/* Status + Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
                        {cfg.icon} {isRTL ? cfg.labelAr : cfg.label}
                      </span>
                      <button
                        onClick={() => setViewItem(req)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title={isRTL ? 'تفاصيل' : 'Details'}
                      >
                        <EyeIcon className="h-4.5 w-4.5" />
                      </button>
                      {req.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleAction(req, 'approve')}
                            disabled={actionLoading === req.id}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === req.id ? '...' : (isRTL ? '✅ موافقة' : '✅ Approve')}
                          </button>
                          <button
                            onClick={() => { setShowRejectModal(req); setRejectNote(''); }}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors"
                          >
                            {isRTL ? '🚫 رفض' : '🚫 Reject'}
                          </button>
                        </>
                      )}
                      {req.status === 'approved' && (
                        <button
                          onClick={() => showToast('info', isRTL ? 'جاري الانتقال لإنشاء الحساب...' : 'Creating account...')}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                        >
                          {isRTL ? '➕ إنشاء حساب' : '➕ Create Account'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── View Details Modal ── */}
      {viewItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewItem(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">📋 {viewItem.company_name}</h3>
              <button onClick={() => setViewItem(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-3">
              {[
                [isRTL ? 'الشركة' : 'Company', viewItem.company_name],
                [isRTL ? 'المسؤول' : 'Contact', viewItem.contact_name],
                [isRTL ? 'البريد' : 'Email', viewItem.email],
                [isRTL ? 'الهاتف' : 'Phone', viewItem.phone || '—'],
                [isRTL ? 'الدولة' : 'Country', `${FLAGS[viewItem.country || ''] || '🌍'} ${viewItem.country || '—'}`],
                [isRTL ? 'الخطة' : 'Plan', viewItem.plan || '—'],
                [isRTL ? 'تاريخ التقديم' : 'Submitted', new Date(viewItem.submitted_at || viewItem.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')],
                [isRTL ? 'الحالة' : 'Status', `${STATUS_CONFIG[viewItem.status]?.icon || ''} ${isRTL ? STATUS_CONFIG[viewItem.status]?.labelAr : STATUS_CONFIG[viewItem.status]?.label}`],
              ].map(([label, val], i) => (
                <div key={i} className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">{label}</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{val}</p>
                </div>
              ))}
              {viewItem.message && (
                <div className="col-span-2 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">{isRTL ? 'رسالة العميل' : 'Customer Message'}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{viewItem.message}</p>
                </div>
              )}
              {viewItem.review_note && (
                <div className="col-span-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-xs text-amber-700 dark:text-amber-400 mb-1">{isRTL ? 'ملاحظة المراجعة' : 'Review Note'}</p>
                  <p className="text-sm text-amber-800 dark:text-amber-300">{viewItem.review_note}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal with Note ── */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowRejectModal(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {isRTL ? '🚫 رفض الطلب' : '🚫 Reject Request'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {isRTL ? `رفض طلب "${showRejectModal.company_name}"` : `Reject "${showRejectModal.company_name}" request`}
            </p>
            <textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              placeholder={isRTL ? 'ملاحظة الرفض (اختياري)...' : 'Rejection note (optional)...'}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowRejectModal(null)} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => handleAction(showRejectModal, 'reject', rejectNote)}
                disabled={actionLoading === showRejectModal.id}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isRTL ? 'تأكيد الرفض' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
