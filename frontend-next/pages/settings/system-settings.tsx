import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import PolicyCrudTable from '../../components/settings/PolicyCrudTable';
import { useTranslation } from '../../hooks/useTranslation';
import { withPermission } from '../../utils/withPermission';

function SystemSettingsPage() {
  const { t } = useTranslation();

  return (
    <MainLayout>
      <Head>
        <title>{t('settingsAdmin.pages.systemSettings.title')} - SLMS</title>
      </Head>

      <PolicyCrudTable
        titleKey="settingsAdmin.pages.systemSettings.title"
        subtitleKey="settingsAdmin.pages.systemSettings.subtitle"
        viewPermission={'system_policies:view'}
        managePermissions={{
          create: 'system_policies:create',
          edit: 'system_policies:edit',
          delete: 'system_policies:delete',
        }}
        filters={{ category: 'system_settings' }}
      />
    </MainLayout>
  );
}

export default withPermission('system_policies:view', SystemSettingsPage);

const __LEGACY_SYSTEM_SETTINGS_PAGE = `

  });

  const canManage = hasPermission('system_settings:manage');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/settings', {
        headers: { Authorization: 'Bearer ' + token }
      });
      
      if (res.ok) {
        const data = await res.json();
        setSettings({ ...settings, ...data });
      } else {
        // Use default mock data
        setSettings({
          company_name: 'SLMS Logistics',
          company_name_ar: 'شركة SLMS للخدمات اللوجستية',
          company_logo: '/logo.png',
          company_address: 'الرياض، المملكة العربية السعودية',
          company_phone: '+966 11 xxx xxxx',
          company_email: 'info@slms.com',
          company_website: 'https://slms.com',
          tax_number: '300000000000003',
          commercial_register: '1010xxxxxx',
          default_language: 'ar',
          timezone: 'Asia/Riyadh',
          date_format: 'DD/MM/YYYY',
          time_format: '12h',
          first_day_of_week: 'sunday',
          default_currency: 'SAR',
          currency_symbol: 'ر.س',
          currency_position: 'after',
          decimal_places: 2,
          thousand_separator: ',',
          decimal_separator: '.',
          invoice_prefix: 'INV-',
          shipment_prefix: 'SHP-',
          receipt_prefix: 'RCP-',
          auto_numbering: true,
          number_padding: 6,
          theme_mode: 'system',
          primary_color: '#3b82f6',
          show_notifications: true,
          items_per_page: 20,
        });
      }
    } catch (error) {
      showToast(t('common.fetchError') || 'Failed to fetch settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: keyof SystemSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify(settings)
      });
      
      showToast(t('common.saveSuccess') || 'Settings saved successfully', 'success');
      setHasChanges(false);
    } catch (error) {
      showToast(t('common.saveSuccess') || 'Settings saved successfully', 'success');
      setHasChanges(false);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'company', label: t('settings.company') || 'Company', icon: BuildingOfficeIcon },
    { id: 'regional', label: t('settings.regional') || 'Regional', icon: GlobeAltIcon },
    { id: 'currency', label: t('settings.currency') || 'Currency', icon: CurrencyDollarIcon },
    { id: 'documents', label: t('settings.documents') || 'Documents', icon: DocumentTextIcon },
    { id: 'ui', label: t('settings.ui') || 'Interface', icon: PhotoIcon },
  ];

  const timezones = [
    { value: 'Asia/Riyadh', label: 'Riyadh (UTC+3)' },
    { value: 'Asia/Dubai', label: 'Dubai (UTC+4)' },
    { value: 'Asia/Kuwait', label: 'Kuwait (UTC+3)' },
    { value: 'Africa/Cairo', label: 'Cairo (UTC+2)' },
    { value: 'Europe/London', label: 'London (UTC+0)' },
    { value: 'America/New_York', label: 'New York (UTC-5)' },
  ];

  const currencies = [
    { value: 'SAR', label: 'Saudi Riyal (SAR)', symbol: 'ر.س' },
    { value: 'AED', label: 'UAE Dirham (AED)', symbol: 'د.إ' },
    { value: 'USD', label: 'US Dollar (USD)', symbol: '$' },
    { value: 'EUR', label: 'Euro (EUR)', symbol: '€' },
    { value: 'EGP', label: 'Egyptian Pound (EGP)', symbol: 'ج.م' },
    { value: 'KWD', label: 'Kuwaiti Dinar (KWD)', symbol: 'د.ك' },
  ];

  return (
    <MainLayout>
      <Head>
        <title>{t('settings.title') || 'System Settings'} | SLMS</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Cog6ToothIcon className="w-8 h-8 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {t('settings.title') || 'System Settings'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('settings.subtitle') || 'Manage general system configurations'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Button onClick={handleSave} loading={saving} disabled={!canManage}>
                <CheckIcon className="w-5 h-5 me-2" />
                {t('common.saveChanges') || 'Save Changes'}
              </Button>
            )}
            <Button variant="secondary" onClick={fetchSettings} disabled={loading}>
              <ArrowPathIcon className={clsx('w-5 h-5', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex overflow-x-auto -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={clsx(
                    'flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  )}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            ) : (
              <>
                {/* Company Tab */}
                {activeTab === 'company' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Input
                        label={t('settings.companyName') || 'Company Name (English)'}
                        value={settings.company_name}
                        onChange={(e) => handleChange('company_name', e.target.value)}
                        disabled={!canManage}
                      />
                      <Input
                        label={t('settings.companyNameAr') || 'Company Name (Arabic)'}
                        value={settings.company_name_ar}
                        onChange={(e) => handleChange('company_name_ar', e.target.value)}
                        disabled={!canManage}
                        className="text-right"
                        dir="rtl"
                      />
                      <Input
                        label={t('settings.companyPhone') || 'Phone'}
                        value={settings.company_phone}
                        onChange={(e) => handleChange('company_phone', e.target.value)}
                        disabled={!canManage}
                      />
                      <Input
                        label={t('settings.companyEmail') || 'Email'}
                        type="email"
                        value={settings.company_email}
                        onChange={(e) => handleChange('company_email', e.target.value)}
                        disabled={!canManage}
                      />
                      <Input
                        label={t('settings.companyWebsite') || 'Website'}
                        value={settings.company_website}
                        onChange={(e) => handleChange('company_website', e.target.value)}
                        disabled={!canManage}
                      />
                      <Input
                        label={t('settings.taxNumber') || 'Tax Number (VAT)'}
                        value={settings.tax_number}
                        onChange={(e) => handleChange('tax_number', e.target.value)}
                        disabled={!canManage}
                      />
                      <Input
                        label={t('settings.commercialRegister') || 'Commercial Register'}
                        value={settings.commercial_register}
                        onChange={(e) => handleChange('commercial_register', e.target.value)}
                        disabled={!canManage}
                      />
                      <div className="md:col-span-2">
                        <Input
                          label={t('settings.companyAddress') || 'Address'}
                          value={settings.company_address}
                          onChange={(e) => handleChange('company_address', e.target.value)}
                          disabled={!canManage}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('settings.companyLogo') || 'Company Logo'}
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                          {settings.company_logo ? (
                            <img src={settings.company_logo} alt="Logo" className="w-full h-full object-contain" />
                          ) : (
                            <PhotoIcon className="w-12 h-12 text-gray-400" />
                          )}
                        </div>
                        <Button variant="secondary" disabled={!canManage}>
                          {t('common.upload') || 'Upload'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Regional Tab */}
                {activeTab === 'regional' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('settings.defaultLanguage') || 'Default Language'}
                        </label>
                        <select
                          value={settings.default_language}
                          onChange={(e) => handleChange('default_language', e.target.value)}
                          disabled={!canManage}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="ar">العربية</option>
                          <option value="en">English</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('settings.timezone') || 'Timezone'}
                        </label>
                        <select
                          value={settings.timezone}
                          onChange={(e) => handleChange('timezone', e.target.value)}
                          disabled={!canManage}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          {timezones.map(tz => (
                            <option key={tz.value} value={tz.value}>{tz.label}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('settings.dateFormat') || 'Date Format'}
                        </label>
                        <select
                          value={settings.date_format}
                          onChange={(e) => handleChange('date_format', e.target.value)}
                          disabled={!canManage}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('settings.timeFormat') || 'Time Format'}
                        </label>
                        <select
                          value={settings.time_format}
                          onChange={(e) => handleChange('time_format', e.target.value)}
                          disabled={!canManage}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="12h">12-hour (AM/PM)</option>
                          <option value="24h">24-hour</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('settings.firstDayOfWeek') || 'First Day of Week'}
                        </label>
                        <select
                          value={settings.first_day_of_week}
                          onChange={(e) => handleChange('first_day_of_week', e.target.value)}
                          disabled={!canManage}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="sunday">{t('days.sunday') || 'Sunday'}</option>
                          <option value="monday">{t('days.monday') || 'Monday'}</option>
                          <option value="saturday">{t('days.saturday') || 'Saturday'}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Currency Tab */}
                {activeTab === 'currency' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('settings.defaultCurrency') || 'Default Currency'}
                        </label>
                        <select
                          value={settings.default_currency}
                          onChange={(e) => {
                            const currency = currencies.find(c => c.value === e.target.value);
                            handleChange('default_currency', e.target.value);
                            if (currency) handleChange('currency_symbol', currency.symbol);
                          }}
                          disabled={!canManage}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          {currencies.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                      
                      <Input
                        label={t('settings.currencySymbol') || 'Currency Symbol'}
                        value={settings.currency_symbol}
                        onChange={(e) => handleChange('currency_symbol', e.target.value)}
                        disabled={!canManage}
                      />
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('settings.currencyPosition') || 'Symbol Position'}
                        </label>
                        <select
                          value={settings.currency_position}
                          onChange={(e) => handleChange('currency_position', e.target.value)}
                          disabled={!canManage}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="before">{t('settings.before') || 'Before'} ($100)</option>
                          <option value="after">{t('settings.after') || 'After'} (100$)</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('settings.decimalPlaces') || 'Decimal Places'}
                        </label>
                        <select
                          value={settings.decimal_places}
                          onChange={(e) => handleChange('decimal_places', Number(e.target.value))}
                          disabled={!canManage}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={0}>0</option>
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('settings.thousandSeparator') || 'Thousand Separator'}
                        </label>
                        <select
                          value={settings.thousand_separator}
                          onChange={(e) => handleChange('thousand_separator', e.target.value)}
                          disabled={!canManage}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value=",">, (Comma)</option>
                          <option value=".">. (Period)</option>
                          <option value=" "> (Space)</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('settings.decimalSeparator') || 'Decimal Separator'}
                        </label>
                        <select
                          value={settings.decimal_separator}
                          onChange={(e) => handleChange('decimal_separator', e.target.value)}
                          disabled={!canManage}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value=".">. (Period)</option>
                          <option value=",">, (Comma)</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t('settings.preview') || 'Preview'}: 
                        <span className="font-medium text-gray-900 dark:text-white ms-2">
                          {settings.currency_position === 'before' && settings.currency_symbol}
                          1{settings.thousand_separator}234{settings.thousand_separator}567{settings.decimal_separator}{'0'.repeat(settings.decimal_places)}
                          {settings.currency_position === 'after' && ' ' + settings.currency_symbol}
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Documents Tab */}
                {activeTab === 'documents' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Input
                        label={t('settings.invoicePrefix') || 'Invoice Prefix'}
                        value={settings.invoice_prefix}
                        onChange={(e) => handleChange('invoice_prefix', e.target.value)}
                        disabled={!canManage}
                      />
                      <Input
                        label={t('settings.shipmentPrefix') || 'Shipment Prefix'}
                        value={settings.shipment_prefix}
                        onChange={(e) => handleChange('shipment_prefix', e.target.value)}
                        disabled={!canManage}
                      />
                      <Input
                        label={t('settings.receiptPrefix') || 'Receipt Prefix'}
                        value={settings.receipt_prefix}
                        onChange={(e) => handleChange('receipt_prefix', e.target.value)}
                        disabled={!canManage}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('settings.numberPadding') || 'Number Padding'}
                        </label>
                        <select
                          value={settings.number_padding}
                          onChange={(e) => handleChange('number_padding', Number(e.target.value))}
                          disabled={!canManage}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={4}>4 digits (0001)</option>
                          <option value={5}>5 digits (00001)</option>
                          <option value={6}>6 digits (000001)</option>
                          <option value={8}>8 digits (00000001)</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center gap-3 mt-8">
                        <input
                          type="checkbox"
                          id="auto_numbering"
                          checked={settings.auto_numbering}
                          onChange={(e) => handleChange('auto_numbering', e.target.checked)}
                          disabled={!canManage}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="auto_numbering" className="text-sm text-gray-700 dark:text-gray-300">
                          {t('settings.autoNumbering') || 'Enable Auto Numbering'}
                        </label>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t('settings.preview') || 'Preview'}: 
                        <span className="font-medium text-gray-900 dark:text-white ms-2">
                          {settings.invoice_prefix}{'0'.repeat(settings.number_padding - 1)}1
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                {/* UI Tab */}
                {activeTab === 'ui' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('settings.themeMode') || 'Theme Mode'}
                        </label>
                        <select
                          value={settings.theme_mode}
                          onChange={(e) => handleChange('theme_mode', e.target.value)}
                          disabled={!canManage}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="light">{t('settings.light') || 'Light'}</option>
                          <option value="dark">{t('settings.dark') || 'Dark'}</option>
                          <option value="system">{t('settings.system') || 'System'}</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('settings.primaryColor') || 'Primary Color'}
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={settings.primary_color}
                            onChange={(e) => handleChange('primary_color', e.target.value)}
                            disabled={!canManage}
                            className="w-12 h-10 rounded cursor-pointer"
                          />
                          <Input
                            value={settings.primary_color}
                            onChange={(e) => handleChange('primary_color', e.target.value)}
                            disabled={!canManage}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('settings.itemsPerPage') || 'Items Per Page'}
                        </label>
                        <select
                          value={settings.items_per_page}
                          onChange={(e) => handleChange('items_per_page', Number(e.target.value))}
                          disabled={!canManage}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center gap-3 mt-8">
                        <input
                          type="checkbox"
                          id="show_notifications"
                          checked={settings.show_notifications}
                          onChange={(e) => handleChange('show_notifications', e.target.checked)}
                          disabled={!canManage}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="show_notifications" className="text-sm text-gray-700 dark:text-gray-300">
                          {t('settings.showNotifications') || 'Show Desktop Notifications'}
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

`;
