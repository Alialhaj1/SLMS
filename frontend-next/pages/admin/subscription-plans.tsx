import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';

interface Plan {
  id: number;
  name: string;
  price: number;
  billing_cycle: string;
  features: string[];
  tenant_count: number;
  max_users: number;
  is_active: boolean;
}

const planIcons: Record<string, string> = {
  Free: '🆓', Basic: '⚡', Pro: '🚀', Enterprise: '🏢',
};

const planColors: Record<string, string> = {
  Free: 'border-gray-300 dark:border-slate-600',
  Basic: 'border-blue-400 dark:border-blue-600',
  Pro: 'border-purple-400 dark:border-purple-600',
  Enterprise: 'border-amber-400 dark:border-amber-600',
};

export default function SubscriptionPlansPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/subscription-plans', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch plans');
      const data = await res.json();
      setPlans(data.data || []);
    } catch {
      showToast('error', 'Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: number, active: boolean) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/subscription-plans/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !active }),
      });
      if (!res.ok) throw new Error('Failed to update plan');
      showToast('success', 'Plan updated successfully');
      fetchPlans();
    } catch {
      showToast('error', 'Failed to update plan');
    }
  };

  const SkeletonCard = () => (
    <div className="animate-pulse bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
      <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-4" />
      <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-6" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
      ))}
    </div>
  );

  return (
    <MainLayout>
      <Head>
        <title>Subscription Plans - SLMS</title>
      </Head>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscription Plans</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage pricing plans and features</p>
          </div>
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Create Plan
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : plans.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              <p className="text-gray-500 dark:text-gray-400 font-medium">No plans configured</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Create your first subscription plan to get started</p>
            </div>
          ) : (
            plans.map((plan) => (
              <div key={plan.id} className={`bg-white dark:bg-slate-800 rounded-xl border-2 ${planColors[plan.name] || 'border-gray-200 dark:border-slate-700'} p-6 flex flex-col transition-shadow hover:shadow-lg`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{planIcons[plan.name] || '📦'}</span>
                  <button
                    onClick={() => handleToggle(plan.id, plan.is_active)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${plan.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`}
                    aria-label={`Toggle ${plan.name}`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${plan.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                <div className="mt-2 mb-4">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">${plan.price}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">/{plan.billing_cycle || 'mo'}</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  {plan.tenant_count} tenants · Max {plan.max_users} users
                </div>
                <ul className="space-y-2 flex-1 mb-4">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button className="w-full py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                  Edit Plan
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}
