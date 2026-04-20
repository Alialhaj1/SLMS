import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { withPermission, withPlatformGuard } from '../../utils/withPermission';

interface UsageMeter {
  name: string;
  used: number;
  limit: number;
  unit: string;
}

interface BillingEntry {
  id: number;
  date: string;
  description: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
}

interface SubscriptionPlan {
  name: string;
  tier: 'starter' | 'professional' | 'enterprise';
  price_monthly: number;
  currency: string;
  billing_cycle: string;
  next_billing_date: string;
  started_at: string;
}

const MOCK_PLAN: SubscriptionPlan = {
  name: 'Professional Plan',
  tier: 'professional',
  price_monthly: 499,
  currency: 'SAR',
  billing_cycle: 'Monthly',
  next_billing_date: '2026-03-01',
  started_at: '2025-06-01',
};

const MOCK_USAGE: UsageMeter[] = [
  { name: 'Users', used: 67, limit: 100, unit: 'users' },
  { name: 'Storage', used: 42, limit: 100, unit: 'GB' },
  { name: 'API Calls', used: 245000, limit: 500000, unit: 'calls/mo' },
  { name: 'Shipments', used: 1280, limit: 5000, unit: 'per month' },
];

const MOCK_BILLING: BillingEntry[] = [
  { id: 1, date: '2026-02-01', description: 'Professional Plan - February 2026', amount: 499, status: 'paid' },
  { id: 2, date: '2026-01-01', description: 'Professional Plan - January 2026', amount: 499, status: 'paid' },
  { id: 3, date: '2025-12-01', description: 'Professional Plan - December 2025', amount: 499, status: 'paid' },
  { id: 4, date: '2025-11-01', description: 'Professional Plan - November 2025', amount: 499, status: 'paid' },
];

const PLAN_TIERS = [
  { tier: 'starter', name: 'Starter', price: 199, features: ['Up to 25 users', '25 GB storage', '100K API calls', 'Basic support'] },
  { tier: 'professional', name: 'Professional', price: 499, features: ['Up to 100 users', '100 GB storage', '500K API calls', 'Priority support', 'Advanced analytics'] },
  { tier: 'enterprise', name: 'Enterprise', price: 0, features: ['Unlimited users', 'Unlimited storage', 'Unlimited API calls', 'Dedicated support', 'SLA guarantee', 'Custom integrations'] },
];

function SubscriptionSettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<SubscriptionPlan>(MOCK_PLAN);
  const [usage, setUsage] = useState<UsageMeter[]>([]);
  const [billing, setBilling] = useState<BillingEntry[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => { setUsage(MOCK_USAGE); setBilling(MOCK_BILLING); setLoading(false); }, 600);
    return () => clearTimeout(timer);
  }, []);

  const usagePct = (u: UsageMeter) => Math.round((u.used / u.limit) * 100);
  const usageColor = (pct: number) => pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-blue-500';

  const statusBadge = (status: BillingEntry['status']) => {
    const styles = { paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
  };

  return (
    <MainLayout>
      <Head><title>{t('settings.subscription') || 'Subscription'} - SLMS</title></Head>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.subscription') || 'Subscription Details'}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('settings.subscriptionDesc') || 'Manage your plan, monitor usage, and view billing history.'}</p>
        </div>

        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />)}</div>
        ) : (
          <>
            {/* Current Plan */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">{t('settings.currentPlan') || 'Current Plan'}</p>
                  <h2 className="text-2xl font-bold mt-1">{plan.name}</h2>
                  <p className="text-sm opacity-80 mt-1">{plan.billing_cycle} · {t('settings.since') || 'Since'} {plan.started_at}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">{plan.currency} {plan.price_monthly}</p>
                  <p className="text-sm opacity-80">/ {t('settings.month') || 'month'}</p>
                  <p className="text-xs opacity-70 mt-1">{t('settings.nextBilling') || 'Next billing'}: {plan.next_billing_date}</p>
                </div>
              </div>
            </div>

            {/* Usage Meters */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.usage') || 'Usage'}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {usage.map(u => {
                  const pct = usagePct(u);
                  return (
                    <div key={u.name} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium text-gray-900 dark:text-white">{u.name}</span>
                        <span className="text-gray-500 dark:text-gray-400">{u.used.toLocaleString()} / {u.limit.toLocaleString()} {u.unit}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div className={`h-2.5 rounded-full ${usageColor(pct)}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-1 text-right">{pct}%</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Plan Comparison */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.plans') || 'Available Plans'}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PLAN_TIERS.map(p => (
                  <div key={p.tier} className={`border rounded-lg p-4 ${plan.tier === p.tier ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800' : 'border-gray-200 dark:border-gray-700'}`}>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{p.name}</h3>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{p.price ? `SAR ${p.price}` : (t('settings.contactUs') || 'Contact Us')}<span className="text-sm font-normal text-gray-400">{p.price ? '/mo' : ''}</span></p>
                    <ul className="mt-3 space-y-1.5">
                      {p.features.map(f => <li key={f} className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><span className="text-green-500">✓</span>{f}</li>)}
                    </ul>
                    <button disabled={plan.tier === p.tier} className={`mt-4 w-full py-2 rounded text-sm font-medium ${plan.tier === p.tier ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 cursor-default' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                      {plan.tier === p.tier ? (t('settings.currentPlan') || 'Current') : (t('settings.upgrade') || 'Upgrade')}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Billing History */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.billingHistory') || 'Billing History'}</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{t('common.date') || 'Date'}</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{t('common.description') || 'Description'}</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">{t('settings.amount') || 'Amount'}</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-300">{t('common.status') || 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {billing.map(b => (
                    <tr key={b.id}>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{b.date}</td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">{b.description}</td>
                      <td className="px-4 py-3 text-right text-gray-900 dark:text-white font-medium">SAR {b.amount}</td>
                      <td className="px-4 py-3 text-center">{statusBadge(b.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}

export default withPlatformGuard(withPermission('system_policies:view', SubscriptionSettingsPage));
