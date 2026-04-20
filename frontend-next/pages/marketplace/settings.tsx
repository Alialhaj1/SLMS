import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import PageHeader from '../../components/layout/PageHeader';
import { useAuth } from '../../hooks/useAuth';
import { useLocale } from '../../contexts/LocaleContext';
import { useToast } from '../../hooks/useToast';
import apiClient from '../../lib/apiClient';
import {
  Cog6ToothIcon,
  CheckIcon,
  CurrencyDollarIcon,
  ClockIcon,
  BuildingStorefrontIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

interface PlatformConfig {
  platform_name: string;
  platform_name_ar: string;
  default_commission_rate: number;
  settlement_hold_days: number;
  settlement_min_amount: number;
  auto_approve_vendors: boolean;
  auto_approve_listings: boolean;
  vendor_registration_enabled: boolean;
}

const defaultConfig: PlatformConfig = {
  platform_name: '',
  platform_name_ar: '',
  default_commission_rate: 10,
  settlement_hold_days: 7,
  settlement_min_amount: 100,
  auto_approve_vendors: false,
  auto_approve_listings: false,
  vendor_registration_enabled: true,
};

export default function MarketplaceSettingsPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [config, setConfig] = useState<PlatformConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.request<any>('/api/marketplace/admin/config');
      if (res) setConfig({ ...defaultConfig, ...res });
    } catch {
      // Keep defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await apiClient.request('/api/marketplace/admin/config', {
        method: 'PUT',
        body: JSON.stringify({
          platformName: config.platform_name,
          platformNameAr: config.platform_name_ar,
          defaultCommissionRate: config.default_commission_rate,
          settlementHoldDays: config.settlement_hold_days,
          settlementMinAmount: config.settlement_min_amount,
          autoApproveVendors: config.auto_approve_vendors,
          autoApproveListings: config.auto_approve_listings,
          vendorRegistrationEnabled: config.vendor_registration_enabled,
        }),
      });
      showToast(isAr ? 'تم حفظ الإعدادات' : 'Settings saved', 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    {
      title: isAr ? 'معلومات المنصة' : 'Platform Info',
      icon: BuildingStorefrontIcon,
      fields: [
        { key: 'platform_name', label: isAr ? 'اسم المنصة (EN)' : 'Platform Name (EN)', type: 'text' as const },
        { key: 'platform_name_ar', label: isAr ? 'اسم المنصة (AR)' : 'Platform Name (AR)', type: 'text' as const },
      ],
    },
    {
      title: isAr ? 'العمولة والتسوية' : 'Commission & Settlement',
      icon: CurrencyDollarIcon,
      fields: [
        { key: 'default_commission_rate', label: isAr ? 'نسبة العمولة الافتراضية (%)' : 'Default Commission Rate (%)', type: 'number' as const },
        { key: 'settlement_hold_days', label: isAr ? 'أيام تعليق التسوية' : 'Settlement Hold Days', type: 'number' as const },
        { key: 'settlement_min_amount', label: isAr ? 'الحد الأدنى للسحب' : 'Minimum Payout Amount', type: 'number' as const },
      ],
    },
    {
      title: isAr ? 'الموافقات التلقائية' : 'Auto-Approvals',
      icon: ShieldCheckIcon,
      fields: [
        { key: 'auto_approve_vendors', label: isAr ? 'الموافقة التلقائية على البائعين' : 'Auto-approve Vendors', type: 'toggle' as const },
        { key: 'auto_approve_listings', label: isAr ? 'الموافقة التلقائية على المنتجات' : 'Auto-approve Listings', type: 'toggle' as const },
        { key: 'vendor_registration_enabled', label: isAr ? 'تفعيل تسجيل البائعين' : 'Vendor Registration Enabled', type: 'toggle' as const },
      ],
    },
  ];

  return (
    <MainLayout>
      <Head><title>{isAr ? 'إعدادات السوق' : 'Marketplace Settings'}</title></Head>
      <PageHeader
        title="Marketplace Settings"
        title_ar="إعدادات السوق"
        description="Configure marketplace platform settings, commission rates, and policies."
        description_ar="تكوين إعدادات منصة السوق، نسب العمولة، والسياسات."
        icon={Cog6ToothIcon}
        breadcrumbs={[
          { label: 'Marketplace', label_ar: 'السوق', href: '/marketplace/dashboard' },
          { label: 'Settings', label_ar: 'الإعدادات' },
        ]}
        actions={[
          {
            id: 'save-settings',
            label: isAr ? 'حفظ' : 'Save Changes',
            icon: CheckIcon,
            onClick: handleSave,
            loading: saving,
          },
        ]}
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <div className="space-y-8">
          {sections.map((section, sIdx) => (
            <div key={sIdx} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
                  <section.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{section.title}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {section.fields.map((field) => (
                  <div key={field.key}>
                    {field.type === 'toggle' ? (
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{field.label}</label>
                        <button
                          onClick={() => setConfig(prev => ({ ...prev, [field.key]: !(prev as any)[field.key] }))}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                            (config as any)[field.key] ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
                          }`}>
                          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                            (config as any)[field.key] ? (isAr ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'
                          }`} />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{field.label}</label>
                        <input
                          type={field.type}
                          value={(config as any)[field.key]}
                          onChange={e => setConfig(prev => ({
                            ...prev,
                            [field.key]: field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value,
                          }))}
                          className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm p-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </MainLayout>
  );
}
