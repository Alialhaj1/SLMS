import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import PageHeader from '../../components/layout/PageHeader';
import { useAuth } from '../../hooks/useAuth';
import { useLocale } from '../../contexts/LocaleContext';
import { useToast } from '../../hooks/useToast';
import apiClient from '../../lib/apiClient';
import { useCurrencies } from '../../hooks/useReferenceData';
import {
  Cog6ToothIcon,
  PaintBrushIcon,
  CreditCardIcon,
  TruckIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface StoreSettings {
  store_name: string;
  store_slug: string;
  store_description: string;
  store_logo_url: string;
  store_banner_url: string;
  currency: string;
  timezone: string;
  primary_color: string;
  secondary_color: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  meta_title: string;
  meta_description: string;
  enable_reviews: boolean;
  enable_wishlist: boolean;
  enable_guest_checkout: boolean;
  enable_tax: boolean;
  tax_rate: number;
  min_order_amount: number;
  free_shipping_threshold: number;
  payment_methods: string[];
  social_links: { platform: string; url: string }[];
  notify_order_confirmation: boolean;
  notify_shipping_update: boolean;
  notify_review_request: boolean;
  notify_low_stock: boolean;
}

const defaultSettings: StoreSettings = {
  store_name: '',
  store_slug: '',
  store_description: '',
  store_logo_url: '',
  store_banner_url: '',
  currency: 'SAR',
  timezone: 'Asia/Riyadh',
  primary_color: '#4F46E5',
  secondary_color: '#7C3AED',
  contact_email: '',
  contact_phone: '',
  address: '',
  meta_title: '',
  meta_description: '',
  enable_reviews: true,
  enable_wishlist: true,
  enable_guest_checkout: false,
  enable_tax: true,
  tax_rate: 15,
  min_order_amount: 0,
  free_shipping_threshold: 200,
  payment_methods: ['credit_card', 'mada'],
  social_links: [],
  notify_order_confirmation: true,
  notify_shipping_update: true,
  notify_review_request: false,
  notify_low_stock: true,
};

const paymentOptions = [
  { value: 'credit_card', label: 'Credit Card', label_ar: 'بطاقة ائتمان' },
  { value: 'mada', label: 'Mada', label_ar: 'مدى' },
  { value: 'apple_pay', label: 'Apple Pay', label_ar: 'أبل باي' },
  { value: 'stc_pay', label: 'STC Pay', label_ar: 'STC Pay' },
  { value: 'bank_transfer', label: 'Bank Transfer', label_ar: 'تحويل بنكي' },
  { value: 'cod', label: 'Cash on Delivery', label_ar: 'الدفع عند الاستلام' },
];

export default function StoreSettingsPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const { currencies } = useCurrencies();
  const isAr = locale === 'ar';

  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [hasChanges, setHasChanges] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.request<any>('/api/ecommerce/settings');
      if (res) setSettings({ ...defaultSettings, ...res });
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleChange = (field: keyof StoreSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await apiClient.request('/api/ecommerce/settings', { method: 'PUT', body: JSON.stringify(settings) });
      showToast('success', isAr ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully');
      setHasChanges(false);
    } catch {
      showToast('error', isAr ? 'فشل حفظ الإعدادات' : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { key: 'general', label: 'General', label_ar: 'عام', icon: Cog6ToothIcon },
    { key: 'appearance', label: 'Appearance', label_ar: 'المظهر', icon: PaintBrushIcon },
    { key: 'payment', label: 'Payment', label_ar: 'الدفع', icon: CreditCardIcon },
    { key: 'shipping', label: 'Shipping', label_ar: 'الشحن', icon: TruckIcon },
    { key: 'seo', label: 'SEO', label_ar: 'تحسين محركات البحث', icon: GlobeAltIcon },
    { key: 'notifications', label: 'Notifications', label_ar: 'الإشعارات', icon: EnvelopeIcon },
    { key: 'security', label: 'Security', label_ar: 'الأمان', icon: ShieldCheckIcon },
  ];

  const InputField = ({ label, labelAr, value, onChange, type = 'text', placeholder = '', description = '', descriptionAr = '' }: any) => (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
        {isAr ? labelAr : label}
      </label>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white hover:border-gray-300"
      />
      {(description || descriptionAr) && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{isAr ? descriptionAr : description}</p>
      )}
    </div>
  );

  const Toggle = ({ label, labelAr, checked, onChange, description = '', descriptionAr = '' }: any) => (
    <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-4 transition-all duration-200 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
      <div>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{isAr ? labelAr : label}</p>
        {(description || descriptionAr) && (
          <p className="mt-0.5 text-xs text-gray-500">{isAr ? descriptionAr : description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
          checked ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
          checked ? (isAr ? '-translate-x-6' : 'translate-x-6') : (isAr ? '-translate-x-1' : 'translate-x-1')
        }`} />
      </button>
    </div>
  );

  const renderGeneralTab = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <InputField label="Store Name" labelAr="اسم المتجر" value={settings.store_name} onChange={(v: string) => handleChange('store_name', v)} />
        <InputField label="Store Slug (URL)" labelAr="رابط المتجر" value={settings.store_slug} onChange={(v: string) => handleChange('store_slug', v)} description="your-store.example.com" descriptionAr="your-store.example.com" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{isAr ? 'وصف المتجر' : 'Store Description'}</label>
        <textarea
          value={settings.store_description}
          onChange={(e) => handleChange('store_description', e.target.value)}
          rows={4}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <InputField label="Contact Email" labelAr="البريد الإلكتروني" value={settings.contact_email} onChange={(v: string) => handleChange('contact_email', v)} type="email" />
        <InputField label="Contact Phone" labelAr="رقم الهاتف" value={settings.contact_phone} onChange={(v: string) => handleChange('contact_phone', v)} />
      </div>
      <InputField label="Address" labelAr="العنوان" value={settings.address} onChange={(v: string) => handleChange('address', v)} />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{isAr ? 'العملة' : 'Currency'}</label>
          <select
            value={settings.currency}
            onChange={(e) => handleChange('currency', e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            {currencies.map(c => <option key={c.code} value={c.code}>{isAr ? (c.name_ar || c.name) : c.name} ({c.code})</option>)}
          </select>
        </div>
        <InputField label="Timezone" labelAr="المنطقة الزمنية" value={settings.timezone} onChange={(v: string) => handleChange('timezone', v)} />
      </div>
    </div>
  );

  const renderAppearanceTab = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{isAr ? 'اللون الرئيسي' : 'Primary Color'}</label>
          <div className="flex items-center gap-3">
            <input type="color" value={settings.primary_color} onChange={(e) => handleChange('primary_color', e.target.value)} className="h-12 w-12 cursor-pointer rounded-lg border-0" />
            <input type="text" value={settings.primary_color} onChange={(e) => handleChange('primary_color', e.target.value)} className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-mono dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{isAr ? 'اللون الثانوي' : 'Secondary Color'}</label>
          <div className="flex items-center gap-3">
            <input type="color" value={settings.secondary_color} onChange={(e) => handleChange('secondary_color', e.target.value)} className="h-12 w-12 cursor-pointer rounded-lg border-0" />
            <input type="text" value={settings.secondary_color} onChange={(e) => handleChange('secondary_color', e.target.value)} className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-mono dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-6 dark:border-gray-700 dark:from-gray-800 dark:to-gray-800/50">
        <h4 className="mb-4 text-sm font-bold text-gray-700 dark:text-gray-300">{isAr ? 'معاينة الألوان' : 'Color Preview'}</h4>
        <div className="flex gap-4">
          <div className="h-24 w-24 rounded-2xl shadow-lg transition-transform duration-300 hover:scale-105" style={{ backgroundColor: settings.primary_color }} />
          <div className="h-24 w-24 rounded-2xl shadow-lg transition-transform duration-300 hover:scale-105" style={{ backgroundColor: settings.secondary_color }} />
          <div className="h-24 flex-1 rounded-2xl shadow-lg transition-transform duration-300 hover:scale-105" style={{ background: `linear-gradient(135deg, ${settings.primary_color}, ${settings.secondary_color})` }} />
        </div>
      </div>
      <InputField label="Logo URL" labelAr="رابط الشعار" value={settings.store_logo_url} onChange={(v: string) => handleChange('store_logo_url', v)} />
      <InputField label="Banner URL" labelAr="رابط البانر" value={settings.store_banner_url} onChange={(v: string) => handleChange('store_banner_url', v)} />
    </div>
  );

  const renderPaymentTab = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">{isAr ? 'طرق الدفع المتاحة' : 'Available Payment Methods'}</label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {paymentOptions.map(po => (
            <button
              key={po.value}
              onClick={() => {
                const methods = settings.payment_methods.includes(po.value)
                  ? settings.payment_methods.filter(m => m !== po.value)
                  : [...settings.payment_methods, po.value];
                handleChange('payment_methods', methods);
              }}
              className={`flex items-center gap-3 rounded-xl border-2 p-4 text-sm font-medium transition-all duration-300 ${
                settings.payment_methods.includes(po.value)
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md shadow-indigo-500/10 dark:bg-indigo-900/20 dark:text-indigo-300'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }`}
            >
              {settings.payment_methods.includes(po.value) ? (
                <CheckCircleIcon className="h-5 w-5 text-indigo-500" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
              )}
              {isAr ? po.label_ar : po.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <InputField label="Minimum Order Amount" labelAr="الحد الأدنى للطلب" value={settings.min_order_amount} onChange={(v: number) => handleChange('min_order_amount', v)} type="number" />
        <Toggle label="Enable Tax" labelAr="تفعيل الضريبة" checked={settings.enable_tax} onChange={(v: boolean) => handleChange('enable_tax', v)} />
      </div>
      {settings.enable_tax && (
        <InputField label="Tax Rate (%)" labelAr="نسبة الضريبة (%)" value={settings.tax_rate} onChange={(v: number) => handleChange('tax_rate', v)} type="number" />
      )}
    </div>
  );

  const renderShippingTab = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <InputField label="Free Shipping Threshold" labelAr="حد الشحن المجاني" value={settings.free_shipping_threshold} onChange={(v: number) => handleChange('free_shipping_threshold', v)} type="number" description="Orders above this amount get free shipping" descriptionAr="الطلبات فوق هذا المبلغ تحصل على شحن مجاني" />
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 dark:border-amber-800 dark:from-amber-900/20 dark:to-orange-900/20">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{isAr ? 'إدارة مناطق الشحن' : 'Manage Shipping Zones'}</p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{isAr ? 'لإدارة مناطق الشحن والأسعار، انتقل إلى صفحة مناطق الشحن' : 'To manage shipping zones and rates, go to the Shipping Zones page'}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSeoTab = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <InputField label="Meta Title" labelAr="عنوان الميتا" value={settings.meta_title} onChange={(v: string) => handleChange('meta_title', v)} description="Displayed in search engine results" descriptionAr="يظهر في نتائج محركات البحث" />
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{isAr ? 'وصف الميتا' : 'Meta Description'}</label>
        <textarea
          value={settings.meta_description}
          onChange={(e) => handleChange('meta_description', e.target.value)}
          rows={3}
          maxLength={160}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
        <p className="mt-1 text-xs text-gray-500">{settings.meta_description.length}/160</p>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <p className="text-xs text-gray-500 mb-1">{isAr ? 'معاينة نتائج البحث' : 'Search Engine Preview'}</p>
        <p className="text-lg font-medium text-blue-700 dark:text-blue-400 truncate">{settings.meta_title || settings.store_name || (isAr ? 'عنوان المتجر' : 'Store Title')}</p>
        <p className="text-sm text-green-700 dark:text-green-400 truncate">example.com/store/{settings.store_slug || 'your-store'}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{settings.meta_description || (isAr ? 'وصف المتجر...' : 'Store description...')}</p>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-4 animate-in fade-in duration-300">
      <Toggle label="Order Confirmation Email" labelAr="بريد تأكيد الطلب" checked={settings.notify_order_confirmation} onChange={(v: boolean) => handleChange('notify_order_confirmation', v)} description="Send email when order is placed" descriptionAr="إرسال بريد عند تقديم الطلب" />
      <Toggle label="Shipping Update Email" labelAr="بريد تحديث الشحن" checked={settings.notify_shipping_update} onChange={(v: boolean) => handleChange('notify_shipping_update', v)} description="Send email when order is shipped" descriptionAr="إرسال بريد عند شحن الطلب" />
      <Toggle label="Review Request Email" labelAr="بريد طلب التقييم" checked={settings.notify_review_request} onChange={(v: boolean) => handleChange('notify_review_request', v)} description="Send email asking for review after delivery" descriptionAr="إرسال بريد يطلب التقييم بعد التسليم" />
      <Toggle label="Low Stock Alert" labelAr="تنبيه انخفاض المخزون" checked={settings.notify_low_stock} onChange={(v: boolean) => handleChange('notify_low_stock', v)} description="Notify admins when stock is low" descriptionAr="إشعار المسؤولين عند انخفاض المخزون" />
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-4 animate-in fade-in duration-300">
      <Toggle label="Enable Guest Checkout" labelAr="تفعيل الدفع كزائر" checked={settings.enable_guest_checkout} onChange={(v: boolean) => handleChange('enable_guest_checkout', v)} description="Allow customers to checkout without account" descriptionAr="السماح للعملاء بالشراء بدون حساب" />
      <Toggle label="Enable Reviews" labelAr="تفعيل التقييمات" checked={settings.enable_reviews} onChange={(v: boolean) => handleChange('enable_reviews', v)} description="Allow customers to leave product reviews" descriptionAr="السماح للعملاء بترك تقييمات المنتجات" />
      <Toggle label="Enable Wishlist" labelAr="تفعيل قائمة الأمنيات" checked={settings.enable_wishlist} onChange={(v: boolean) => handleChange('enable_wishlist', v)} description="Allow customers to save products to wishlist" descriptionAr="السماح للعملاء بحفظ المنتجات في المفضلة" />
    </div>
  );

  const tabContent: Record<string, () => React.ReactElement> = {
    general: renderGeneralTab,
    appearance: renderAppearanceTab,
    payment: renderPaymentTab,
    shipping: renderShippingTab,
    seo: renderSeoTab,
    notifications: renderNotificationsTab,
    security: renderSecurityTab,
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <p className="text-sm text-gray-500 animate-pulse">{isAr ? 'جارٍ التحميل...' : 'Loading settings...'}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head><title>{isAr ? 'إعدادات المتجر' : 'Store Settings'} - SLMS</title></Head>
      <div className="space-y-6 p-1">
        <PageHeader
          title="Store Settings"
          title_ar="إعدادات المتجر"
          description="Configure your online store preferences"
          description_ar="تهيئة إعدادات متجرك الإلكتروني"
          icon={Cog6ToothIcon}
          breadcrumbs={[
            { label: 'E-Commerce', label_ar: 'المتجر الإلكتروني', href: '/ecommerce/settings' },
            { label: 'Settings', label_ar: 'الإعدادات' },
          ]}
          actions={[
            {
              id: 'save',
              label: 'Save Settings',
              label_ar: 'حفظ الإعدادات',
              icon: saving ? ArrowPathIcon : CheckCircleIcon,
              onClick: handleSave,
              variant: 'primary',
              loading: saving,
              disabled: !hasChanges,
            },
          ]}
        />

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Tabs Sidebar */}
          <div className="w-full lg:w-64 shrink-0">
            <nav className="space-y-1 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.key
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/25'
                      : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  {isAr ? tab.label_ar : tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="flex-1 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 min-h-[500px]">
            {hasChanges && (
              <div className="mb-6 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300 animate-in slide-in-from-top duration-300">
                <ExclamationTriangleIcon className="h-5 w-5" />
                {isAr ? 'لديك تغييرات غير محفوظة' : 'You have unsaved changes'}
              </div>
            )}
            {tabContent[activeTab]?.()}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
