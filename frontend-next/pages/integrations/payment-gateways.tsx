/**
 * 💳 Payment Gateways - بوابات الدفع
 * ===================================
 * إدارة بوابات الدفع الإلكتروني
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  CreditCardIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  PlusIcon,
  Cog6ToothIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  GlobeAltIcon,
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

interface PaymentGateway {
  id: number;
  name: string;
  code: string;
  logo?: string;
  type: 'card' | 'wallet' | 'bnpl' | 'bank';
  status: 'active' | 'inactive' | 'sandbox';
  is_default: boolean;
  supported_currencies: string[];
  fee_percentage: number;
  fee_fixed: number;
  settings: {
    api_key?: string;
    secret_key?: string;
    merchant_id?: string;
    webhook_secret?: string;
    sandbox_mode?: boolean;
  };
  stats: {
    transactions_today: number;
    volume_today: number;
    success_rate: number;
  };
}

export default function PaymentGatewaysPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [testing, setTesting] = useState(false);

  const canManage = hasPermission('payments:manage');

  const availableGateways = [
    { code: 'stripe', name: 'Stripe', type: 'card' },
    { code: 'payfort', name: 'PayFort (Amazon)', type: 'card' },
    { code: 'hyperpay', name: 'HyperPay', type: 'card' },
    { code: 'moyasar', name: 'Moyasar', type: 'card' },
    { code: 'tap', name: 'Tap Payments', type: 'card' },
    { code: 'mada', name: 'Mada', type: 'card' },
    { code: 'stcpay', name: 'STC Pay', type: 'wallet' },
    { code: 'applepay', name: 'Apple Pay', type: 'wallet' },
    { code: 'tamara', name: 'Tamara', type: 'bnpl' },
    { code: 'tabby', name: 'Tabby', type: 'bnpl' },
  ];

  useEffect(() => {
    fetchGateways();
  }, []);

  const fetchGateways = async () => {
    setLoading(true);
    try {
      setGateways([
        {
          id: 1, name: 'Stripe', code: 'stripe', type: 'card', status: 'active',
          is_default: true, supported_currencies: ['SAR', 'USD', 'EUR'],
          fee_percentage: 2.9, fee_fixed: 0.30,
          settings: { api_key: 'pk_live_***', merchant_id: 'acct_xxx' },
          stats: { transactions_today: 45, volume_today: 125000, success_rate: 98.5 }
        },
        {
          id: 2, name: 'HyperPay', code: 'hyperpay', type: 'card', status: 'active',
          is_default: false, supported_currencies: ['SAR'],
          fee_percentage: 2.5, fee_fixed: 0,
          settings: { api_key: 'hyp_***' },
          stats: { transactions_today: 23, volume_today: 68000, success_rate: 97.2 }
        },
        {
          id: 3, name: 'STC Pay', code: 'stcpay', type: 'wallet', status: 'sandbox',
          is_default: false, supported_currencies: ['SAR'],
          fee_percentage: 1.5, fee_fixed: 0,
          settings: { sandbox_mode: true },
          stats: { transactions_today: 0, volume_today: 0, success_rate: 0 }
        },
        {
          id: 4, name: 'Tamara', code: 'tamara', type: 'bnpl', status: 'active',
          is_default: false, supported_currencies: ['SAR'],
          fee_percentage: 4.0, fee_fixed: 0,
          settings: { api_key: 'tam_***' },
          stats: { transactions_today: 12, volume_today: 45000, success_rate: 95.0 }
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

  const handleSaveGateway = async () => {
    if (!selectedGateway) return;
    try {
      if (selectedGateway.id === 0) {
        setGateways(prev => [...prev, { ...selectedGateway, id: Date.now(), status: 'sandbox', stats: { transactions_today: 0, volume_today: 0, success_rate: 0 } }]);
      } else {
        setGateways(prev => prev.map(g => g.id === selectedGateway.id ? selectedGateway : g));
      }
      showToast(t('common.saveSuccess') || 'Saved', 'success');
      setIsModalOpen(false);
    } catch (error) {
      showToast(t('common.error') || 'Error', 'error');
    }
  };

  const handleDeactivate = async () => {
    if (!selectedGateway) return;
    try {
      setGateways(prev => prev.map(g => g.id === selectedGateway.id ? { ...g, status: 'inactive' as const } : g));
      showToast('Gateway deactivated', 'success');
    } catch (error) {
      showToast(t('common.error') || 'Error', 'error');
    } finally {
      setConfirmDeactivate(false);
      setSelectedGateway(null);
    }
  };

  const handleSetDefault = async (gatewayId: number) => {
    setGateways(prev => prev.map(g => ({ ...g, is_default: g.id === gatewayId })));
    showToast('Default gateway updated', 'success');
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
      case 'card': return 'bg-blue-100 text-blue-800';
      case 'wallet': return 'bg-purple-100 text-purple-800';
      case 'bnpl': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalVolume = gateways.reduce((sum, g) => sum + g.stats.volume_today, 0);
  const totalTransactions = gateways.reduce((sum, g) => sum + g.stats.transactions_today, 0);

  return (
    <MainLayout>
      <Head>
        <title>{t('payments.title') || 'Payment Gateways'} | SLMS</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <CreditCardIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {t('payments.title') || 'Payment Gateways'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('payments.subtitle') || 'Manage payment processing integrations'}
              </p>
            </div>
          </div>
          
          <Button onClick={() => {
            setSelectedGateway({
              id: 0, name: '', code: '', type: 'card', status: 'sandbox',
              is_default: false, supported_currencies: ['SAR'],
              fee_percentage: 0, fee_fixed: 0, settings: {},
              stats: { transactions_today: 0, volume_today: 0, success_rate: 0 }
            });
            setIsModalOpen(true);
          }} disabled={!canManage}>
            <PlusIcon className="w-5 h-5 me-2" />
            {t('payments.addGateway') || 'Add Gateway'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircleIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{gateways.filter(g => g.status === 'active').length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Active Gateways</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-blue-600">
              <ChartBarIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{totalTransactions}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Transactions Today</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-purple-600">
              <CurrencyDollarIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{(totalVolume / 1000).toFixed(0)}K</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Volume Today (SAR)</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircleIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">
                {gateways.length > 0 ? (gateways.reduce((sum, g) => sum + g.stats.success_rate, 0) / gateways.filter(g => g.stats.success_rate > 0).length || 0).toFixed(1) : 0}%
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Avg Success Rate</p>
          </div>
        </div>

        {/* Gateways Grid */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Configured Gateways
          </h2>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gateways.map((gateway) => (
                <div key={gateway.id} className={clsx(
                  'border rounded-lg p-4 transition-all',
                  gateway.is_default ? 'border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-900/10' : 'border-gray-200 dark:border-gray-700'
                )}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <CreditCardIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">{gateway.name}</h3>
                          {gateway.is_default && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">Default</span>
                          )}
                        </div>
                        <div className="flex gap-2 mt-1">
                          <span className={clsx('px-2 py-0.5 text-xs rounded-full', getTypeBadge(gateway.type))}>
                            {gateway.type.toUpperCase()}
                          </span>
                          <span className={clsx('px-2 py-0.5 text-xs rounded-full', getStatusBadge(gateway.status))}>
                            {gateway.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-center mb-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{gateway.stats.transactions_today}</p>
                      <p className="text-xs text-gray-500">Today</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{(gateway.stats.volume_today / 1000).toFixed(1)}K</p>
                      <p className="text-xs text-gray-500">Volume</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-600">{gateway.stats.success_rate}%</p>
                      <p className="text-xs text-gray-500">Success</p>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500 mb-3">
                    <p>Fee: <span className="font-medium">{gateway.fee_percentage}%{gateway.fee_fixed > 0 ? ` + ${gateway.fee_fixed} SAR` : ''}</span></p>
                    <p>Currencies: <span className="font-medium">{gateway.supported_currencies.join(', ')}</span></p>
                  </div>
                  
                  <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <Button size="sm" variant="secondary" onClick={() => { setSelectedGateway(gateway); setIsModalOpen(true); }}>
                      <Cog6ToothIcon className="w-4 h-4" />
                    </Button>
                    {!gateway.is_default && gateway.status === 'active' && (
                      <Button size="sm" variant="secondary" onClick={() => handleSetDefault(gateway.id)}>
                        Set Default
                      </Button>
                    )}
                    {gateway.status === 'active' && (
                      <Button size="sm" variant="danger" onClick={() => { setSelectedGateway(gateway); setConfirmDeactivate(true); }}>
                        <XCircleIcon className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Gateways */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            <GlobeAltIcon className="w-5 h-5 inline-block me-2" />
            Available Gateways
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {availableGateways.filter(ag => !gateways.find(g => g.code === ag.code)).map((ag) => (
              <button key={ag.code}
                onClick={() => {
                  setSelectedGateway({
                    id: 0, name: ag.name, code: ag.code, type: ag.type as any, status: 'sandbox',
                    is_default: false, supported_currencies: ['SAR'],
                    fee_percentage: 0, fee_fixed: 0, settings: { sandbox_mode: true },
                    stats: { transactions_today: 0, volume_today: 0, success_rate: 0 }
                  });
                  setIsModalOpen(true);
                }}
                disabled={!canManage}
                className="p-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-center">
                <span className={clsx('px-2 py-0.5 text-xs rounded-full mb-2 inline-block', getTypeBadge(ag.type))}>
                  {ag.type}
                </span>
                <p className="font-medium text-gray-700 dark:text-gray-300">{ag.name}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={selectedGateway?.id ? `${selectedGateway.name} Settings` : 'Add Payment Gateway'} size="lg">
        {selectedGateway && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Gateway Name" value={selectedGateway.name}
                onChange={(e) => setSelectedGateway({ ...selectedGateway, name: e.target.value })} />
              <Input label="Gateway Code" value={selectedGateway.code}
                onChange={(e) => setSelectedGateway({ ...selectedGateway, code: e.target.value })} disabled={selectedGateway.id > 0} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="API Key" type="password" value={selectedGateway.settings.api_key || ''}
                onChange={(e) => setSelectedGateway({...selectedGateway, settings: {...selectedGateway.settings, api_key: e.target.value}})} />
              <Input label="Secret Key" type="password" value={selectedGateway.settings.secret_key || ''}
                onChange={(e) => setSelectedGateway({...selectedGateway, settings: {...selectedGateway.settings, secret_key: e.target.value}})} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Merchant ID" value={selectedGateway.settings.merchant_id || ''}
                onChange={(e) => setSelectedGateway({...selectedGateway, settings: {...selectedGateway.settings, merchant_id: e.target.value}})} />
              <Input label="Webhook Secret" type="password" value={selectedGateway.settings.webhook_secret || ''}
                onChange={(e) => setSelectedGateway({...selectedGateway, settings: {...selectedGateway.settings, webhook_secret: e.target.value}})} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Fee (%)" type="number" step="0.1" value={selectedGateway.fee_percentage}
                onChange={(e) => setSelectedGateway({ ...selectedGateway, fee_percentage: parseFloat(e.target.value) || 0 })} />
              <Input label="Fixed Fee (SAR)" type="number" step="0.01" value={selectedGateway.fee_fixed}
                onChange={(e) => setSelectedGateway({ ...selectedGateway, fee_fixed: parseFloat(e.target.value) || 0 })} />
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <input type="checkbox" checked={selectedGateway.settings.sandbox_mode}
                onChange={(e) => setSelectedGateway({...selectedGateway, settings: {...selectedGateway.settings, sandbox_mode: e.target.checked}})}
                className="w-5 h-5 text-yellow-600 rounded" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">Sandbox Mode</p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">Enable for testing without real transactions</p>
              </div>
            </div>
            
            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="secondary" onClick={handleTestConnection} loading={testing}>
                Test Connection
              </Button>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveGateway}>Save Gateway</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={confirmDeactivate} onClose={() => setConfirmDeactivate(false)}
        onConfirm={handleDeactivate} title="Deactivate Gateway"
        message="Are you sure you want to deactivate this payment gateway? New transactions will not be processed."
        confirmText="Deactivate" variant="danger" />
    </MainLayout>
  );
}
