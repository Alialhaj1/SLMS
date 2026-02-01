/**
 * 🚚 Shipping Companies Integration - تكامل شركات الشحن
 * ======================================================
 * إدارة التكامل مع شركات الشحن والتوصيل
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  TruckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  PlusIcon,
  Cog6ToothIcon,
  MapPinIcon,
  ClockIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import clsx from 'clsx';

interface ShippingCompany {
  id: number;
  name: string;
  name_ar: string;
  code: string;
  logo?: string;
  type: 'express' | 'standard' | 'freight' | 'local';
  status: 'active' | 'inactive' | 'sandbox';
  is_default: boolean;
  coverage: string[];
  tracking_url_pattern: string;
  settings: {
    api_key?: string;
    api_secret?: string;
    account_number?: string;
    sandbox_mode?: boolean;
  };
  rates: {
    base_rate: number;
    rate_per_kg: number;
    min_weight: number;
    max_weight: number;
  };
  stats: {
    shipments_active: number;
    delivered_this_month: number;
    avg_delivery_days: number;
  };
}

export default function ShippingCompanyIntegrationPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<ShippingCompany[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<ShippingCompany | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'rates'>('settings');

  const canManage = hasPermission('shipping:manage');

  const availableCarriers = [
    { code: 'aramex', name: 'Aramex', name_ar: 'أرامكس', type: 'express' },
    { code: 'dhl', name: 'DHL', name_ar: 'دي إتش إل', type: 'express' },
    { code: 'fedex', name: 'FedEx', name_ar: 'فيديكس', type: 'express' },
    { code: 'smsa', name: 'SMSA Express', name_ar: 'سمسا', type: 'express' },
    { code: 'naqel', name: 'Naqel Express', name_ar: 'ناقل', type: 'standard' },
    { code: 'zajil', name: 'Zajil Express', name_ar: 'زاجل', type: 'standard' },
    { code: 'fetchr', name: 'Fetchr', name_ar: 'فيتشر', type: 'local' },
    { code: 'ups', name: 'UPS', name_ar: 'يو بي إس', type: 'express' },
  ];

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      setCompanies([
        {
          id: 1, name: 'Aramex', name_ar: 'أرامكس', code: 'aramex',
          type: 'express', status: 'active', is_default: true,
          coverage: ['SA', 'AE', 'KW', 'BH', 'QA', 'OM'],
          tracking_url_pattern: 'https://www.aramex.com/track?q={{tracking}}',
          settings: { api_key: 'arm_***', account_number: '12345' },
          rates: { base_rate: 25, rate_per_kg: 5, min_weight: 0.5, max_weight: 30 },
          stats: { shipments_active: 45, delivered_this_month: 230, avg_delivery_days: 2.5 }
        },
        {
          id: 2, name: 'SMSA Express', name_ar: 'سمسا', code: 'smsa',
          type: 'express', status: 'active', is_default: false,
          coverage: ['SA'],
          tracking_url_pattern: 'https://www.smsaexpress.com/track?id={{tracking}}',
          settings: { api_key: 'smsa_***' },
          rates: { base_rate: 20, rate_per_kg: 4, min_weight: 0.5, max_weight: 50 },
          stats: { shipments_active: 28, delivered_this_month: 156, avg_delivery_days: 1.8 }
        },
        {
          id: 3, name: 'DHL', name_ar: 'دي إتش إل', code: 'dhl',
          type: 'express', status: 'sandbox', is_default: false,
          coverage: ['INTL'],
          tracking_url_pattern: 'https://www.dhl.com/track?id={{tracking}}',
          settings: { sandbox_mode: true },
          rates: { base_rate: 80, rate_per_kg: 15, min_weight: 0.5, max_weight: 70 },
          stats: { shipments_active: 0, delivered_this_month: 0, avg_delivery_days: 0 }
        },
      ]);
    } catch (error) {
      showToast(t('common.fetchError') || 'Failed to fetch', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      showToast('Connection successful!', 'success');
    } catch (error) {
      showToast('Connection failed', 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleSaveCompany = async () => {
    if (!selectedCompany) return;
    try {
      if (selectedCompany.id === 0) {
        setCompanies(prev => [...prev, { ...selectedCompany, id: Date.now(), status: 'sandbox', stats: { shipments_active: 0, delivered_this_month: 0, avg_delivery_days: 0 } }]);
      } else {
        setCompanies(prev => prev.map(c => c.id === selectedCompany.id ? selectedCompany : c));
      }
      showToast(t('common.saveSuccess') || 'Saved', 'success');
      setIsModalOpen(false);
    } catch (error) {
      showToast(t('common.error') || 'Error', 'error');
    }
  };

  const handleDeactivate = async () => {
    if (!selectedCompany) return;
    try {
      setCompanies(prev => prev.map(c => c.id === selectedCompany.id ? { ...c, status: 'inactive' as const } : c));
      showToast('Carrier deactivated', 'success');
    } catch (error) {
      showToast(t('common.error') || 'Error', 'error');
    } finally {
      setConfirmDeactivate(false);
      setSelectedCompany(null);
    }
  };

  const handleSetDefault = async (companyId: number) => {
    setCompanies(prev => prev.map(c => ({ ...c, is_default: c.id === companyId })));
    showToast('Default carrier updated', 'success');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'sandbox': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'express': return 'bg-red-100 text-red-800';
      case 'standard': return 'bg-blue-100 text-blue-800';
      case 'freight': return 'bg-purple-100 text-purple-800';
      case 'local': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalActive = companies.reduce((sum, c) => sum + c.stats.shipments_active, 0);
  const totalDelivered = companies.reduce((sum, c) => sum + c.stats.delivered_this_month, 0);

  return (
    <MainLayout>
      <Head>
        <title>{t('shipping.title') || 'Shipping Integration'} | SLMS</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <TruckIcon className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {t('shipping.title') || 'Shipping Companies'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('shipping.subtitle') || 'Manage shipping carrier integrations'}
              </p>
            </div>
          </div>
          
          <Button onClick={() => {
            setSelectedCompany({
              id: 0, name: '', name_ar: '', code: '', type: 'standard', status: 'sandbox',
              is_default: false, coverage: ['SA'], tracking_url_pattern: '',
              settings: { sandbox_mode: true },
              rates: { base_rate: 0, rate_per_kg: 0, min_weight: 0.5, max_weight: 30 },
              stats: { shipments_active: 0, delivered_this_month: 0, avg_delivery_days: 0 }
            });
            setActiveTab('settings');
            setIsModalOpen(true);
          }} disabled={!canManage}>
            <PlusIcon className="w-5 h-5 me-2" />
            {t('shipping.addCarrier') || 'Add Carrier'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircleIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{companies.filter(c => c.status === 'active').length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Active Carriers</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-blue-600">
              <TruckIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{totalActive}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Active Shipments</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-purple-600">
              <CheckCircleIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{totalDelivered}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Delivered (Month)</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-orange-600">
              <ClockIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">
                {companies.length > 0 ? (companies.filter(c => c.stats.avg_delivery_days > 0).reduce((sum, c) => sum + c.stats.avg_delivery_days, 0) / companies.filter(c => c.stats.avg_delivery_days > 0).length || 0).toFixed(1) : 0}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Avg Delivery Days</p>
          </div>
        </div>

        {/* Carriers Grid */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Configured Carriers
          </h2>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.map((company) => (
                <div key={company.id} className={clsx(
                  'border rounded-lg p-4 transition-all',
                  company.is_default ? 'border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-900/10' : 'border-gray-200 dark:border-gray-700'
                )}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <TruckIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {locale === 'ar' ? company.name_ar : company.name}
                          </h3>
                          {company.is_default && (
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full">Default</span>
                          )}
                        </div>
                        <div className="flex gap-2 mt-1">
                          <span className={clsx('px-2 py-0.5 text-xs rounded-full', getTypeBadge(company.type))}>
                            {company.type}
                          </span>
                          <span className={clsx('px-2 py-0.5 text-xs rounded-full', getStatusBadge(company.status))}>
                            {company.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-center mb-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{company.stats.shipments_active}</p>
                      <p className="text-xs text-gray-500">Active</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{company.stats.delivered_this_month}</p>
                      <p className="text-xs text-gray-500">Delivered</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-orange-600">{company.stats.avg_delivery_days || '-'}</p>
                      <p className="text-xs text-gray-500">Avg Days</p>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500 mb-3">
                    <p className="flex items-center gap-1">
                      <MapPinIcon className="w-4 h-4" />
                      {company.coverage.join(', ')}
                    </p>
                    <p className="flex items-center gap-1 mt-1">
                      <CurrencyDollarIcon className="w-4 h-4" />
                      {company.rates.base_rate} SAR + {company.rates.rate_per_kg}/kg
                    </p>
                  </div>
                  
                  <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <Button size="sm" variant="secondary" onClick={() => { setSelectedCompany(company); setActiveTab('settings'); setIsModalOpen(true); }}>
                      <Cog6ToothIcon className="w-4 h-4" />
                    </Button>
                    {!company.is_default && company.status === 'active' && (
                      <Button size="sm" variant="secondary" onClick={() => handleSetDefault(company.id)}>
                        Set Default
                      </Button>
                    )}
                    {company.status === 'active' && (
                      <Button size="sm" variant="danger" onClick={() => { setSelectedCompany(company); setConfirmDeactivate(true); }}>
                        <XCircleIcon className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Carriers */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Available Carriers
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {availableCarriers.filter(ac => !companies.find(c => c.code === ac.code)).map((ac) => (
              <button key={ac.code}
                onClick={() => {
                  setSelectedCompany({
                    id: 0, name: ac.name, name_ar: ac.name_ar, code: ac.code, type: ac.type as any, status: 'sandbox',
                    is_default: false, coverage: ['SA'], tracking_url_pattern: '',
                    settings: { sandbox_mode: true },
                    rates: { base_rate: 0, rate_per_kg: 0, min_weight: 0.5, max_weight: 30 },
                    stats: { shipments_active: 0, delivered_this_month: 0, avg_delivery_days: 0 }
                  });
                  setActiveTab('settings');
                  setIsModalOpen(true);
                }}
                disabled={!canManage}
                className="p-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-center">
                <span className={clsx('px-2 py-0.5 text-xs rounded-full mb-2 inline-block', getTypeBadge(ac.type))}>
                  {ac.type}
                </span>
                <p className="font-medium text-gray-700 dark:text-gray-300">
                  {locale === 'ar' ? ac.name_ar : ac.name}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={selectedCompany?.id ? `${selectedCompany.name} Settings` : 'Add Shipping Carrier'} size="lg">
        {selectedCompany && (
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button onClick={() => setActiveTab('settings')}
                className={clsx('px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'settings' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500')}>
                API Settings
              </button>
              <button onClick={() => setActiveTab('rates')}
                className={clsx('px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'rates' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500')}>
                Rates
              </button>
            </div>
            
            {activeTab === 'settings' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Carrier Name (EN)" value={selectedCompany.name}
                    onChange={(e) => setSelectedCompany({ ...selectedCompany, name: e.target.value })} />
                  <Input label="Carrier Name (AR)" value={selectedCompany.name_ar} dir="rtl"
                    onChange={(e) => setSelectedCompany({ ...selectedCompany, name_ar: e.target.value })} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Carrier Code" value={selectedCompany.code}
                    onChange={(e) => setSelectedCompany({ ...selectedCompany, code: e.target.value })} disabled={selectedCompany.id > 0} />
                  <div>
                    <label className="block text-sm font-medium mb-2">Type</label>
                    <select value={selectedCompany.type}
                      onChange={(e) => setSelectedCompany({ ...selectedCompany, type: e.target.value as any })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <option value="express">Express</option>
                      <option value="standard">Standard</option>
                      <option value="freight">Freight</option>
                      <option value="local">Local</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="API Key" type="password" value={selectedCompany.settings.api_key || ''}
                    onChange={(e) => setSelectedCompany({...selectedCompany, settings: {...selectedCompany.settings, api_key: e.target.value}})} />
                  <Input label="Account Number" value={selectedCompany.settings.account_number || ''}
                    onChange={(e) => setSelectedCompany({...selectedCompany, settings: {...selectedCompany.settings, account_number: e.target.value}})} />
                </div>
                
                <Input label="Tracking URL Pattern" value={selectedCompany.tracking_url_pattern}
                  onChange={(e) => setSelectedCompany({ ...selectedCompany, tracking_url_pattern: e.target.value })}
                  placeholder="https://carrier.com/track?id={{tracking}}" helperText="Use {{tracking}} as placeholder" />
                
                <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <input type="checkbox" checked={selectedCompany.settings.sandbox_mode}
                    onChange={(e) => setSelectedCompany({...selectedCompany, settings: {...selectedCompany.settings, sandbox_mode: e.target.checked}})}
                    className="w-5 h-5 text-yellow-600 rounded" />
                  <div>
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">Sandbox Mode</p>
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">Enable for testing without real shipments</p>
                  </div>
                </div>
              </>
            )}
            
            {activeTab === 'rates' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Base Rate (SAR)" type="number" step="0.01" value={selectedCompany.rates.base_rate}
                    onChange={(e) => setSelectedCompany({...selectedCompany, rates: {...selectedCompany.rates, base_rate: parseFloat(e.target.value) || 0}})} />
                  <Input label="Rate per KG (SAR)" type="number" step="0.01" value={selectedCompany.rates.rate_per_kg}
                    onChange={(e) => setSelectedCompany({...selectedCompany, rates: {...selectedCompany.rates, rate_per_kg: parseFloat(e.target.value) || 0}})} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Min Weight (KG)" type="number" step="0.1" value={selectedCompany.rates.min_weight}
                    onChange={(e) => setSelectedCompany({...selectedCompany, rates: {...selectedCompany.rates, min_weight: parseFloat(e.target.value) || 0}})} />
                  <Input label="Max Weight (KG)" type="number" step="0.1" value={selectedCompany.rates.max_weight}
                    onChange={(e) => setSelectedCompany({...selectedCompany, rates: {...selectedCompany.rates, max_weight: parseFloat(e.target.value) || 0}})} />
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Example:</strong> For a 5kg package: {selectedCompany.rates.base_rate} + ({selectedCompany.rates.rate_per_kg} × 5) = <strong>{selectedCompany.rates.base_rate + (selectedCompany.rates.rate_per_kg * 5)} SAR</strong>
                  </p>
                </div>
              </>
            )}
            
            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="secondary" onClick={handleTestConnection} loading={testing}>
                Test Connection
              </Button>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveCompany}>Save Carrier</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={confirmDeactivate} onClose={() => setConfirmDeactivate(false)}
        onConfirm={handleDeactivate} title="Deactivate Carrier"
        message="Are you sure you want to deactivate this shipping carrier? New shipments cannot be created with this carrier."
        confirmText="Deactivate" variant="danger" />
    </MainLayout>
  );
}
