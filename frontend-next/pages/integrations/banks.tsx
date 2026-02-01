/**
 * 🏦 Bank Integration - تكامل البنوك
 * ===================================
 * إدارة التكامل مع الأنظمة البنكية المختلفة
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  BuildingLibraryIcon,
  LinkIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  DocumentArrowDownIcon,
  CurrencyDollarIcon,
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

interface BankConnection {
  id: number;
  bank_name: string;
  bank_name_ar: string;
  bank_code: string;
  logo?: string;
  api_type: 'open_banking' | 'sftp' | 'api' | 'manual';
  status: 'connected' | 'disconnected' | 'error';
  last_sync?: string;
  accounts_linked: number;
  settings: {
    api_key?: string;
    api_secret?: string;
    sftp_host?: string;
    sftp_user?: string;
    sftp_port?: number;
  };
}

interface Transaction {
  id: number;
  date: string;
  reference: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  status: 'matched' | 'unmatched' | 'pending';
}

export default function BankIntegrationPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [banks, setBanks] = useState<BankConnection[]>([]);
  const [selectedBank, setSelectedBank] = useState<BankConnection | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const canManage = hasPermission('banks:manage');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      setBanks([
        {
          id: 1, bank_name: 'Al Rajhi Bank', bank_name_ar: 'مصرف الراجحي',
          bank_code: 'RJHI', api_type: 'open_banking', status: 'connected',
          last_sync: '2024-01-15T10:30:00', accounts_linked: 3,
          settings: { api_key: 'pk_****' }
        },
        {
          id: 2, bank_name: 'Saudi National Bank', bank_name_ar: 'البنك الأهلي',
          bank_code: 'SNB', api_type: 'sftp', status: 'connected',
          last_sync: '2024-01-15T08:00:00', accounts_linked: 2,
          settings: { sftp_host: 'sftp.snb.com', sftp_port: 22 }
        },
        {
          id: 3, bank_name: 'Riyad Bank', bank_name_ar: 'بنك الرياض',
          bank_code: 'RIBL', api_type: 'api', status: 'disconnected',
          accounts_linked: 0, settings: {}
        },
      ]);

      setRecentTransactions([
        { id: 1, date: '2024-01-15', reference: 'TRN001', description: 'Customer Payment', amount: 15000, type: 'credit', status: 'matched' },
        { id: 2, date: '2024-01-15', reference: 'TRN002', description: 'Supplier Payment', amount: 8500, type: 'debit', status: 'matched' },
        { id: 3, date: '2024-01-14', reference: 'TRN003', description: 'Unknown Deposit', amount: 2500, type: 'credit', status: 'unmatched' },
      ]);
    } catch (error) {
      showToast(t('common.fetchError') || 'Failed to fetch data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (bankId: number) => {
    setSyncing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setBanks(prev => prev.map(b => 
        b.id === bankId ? { ...b, last_sync: new Date().toISOString() } : b
      ));
      showToast(t('banks.syncSuccess') || 'Bank synced successfully', 'success');
    } catch (error) {
      showToast(t('banks.syncFailed') || 'Sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveConnection = async () => {
    if (!selectedBank) return;
    try {
      if (selectedBank.id === 0) {
        setBanks(prev => [...prev, { ...selectedBank, id: Date.now(), status: 'disconnected' }]);
      } else {
        setBanks(prev => prev.map(b => b.id === selectedBank.id ? selectedBank : b));
      }
      showToast(t('common.saveSuccess') || 'Saved', 'success');
      setIsModalOpen(false);
    } catch (error) {
      showToast(t('common.error') || 'Error', 'error');
    }
  };

  const handleDisconnect = async () => {
    if (!selectedBank) return;
    try {
      setBanks(prev => prev.map(b => 
        b.id === selectedBank.id ? { ...b, status: 'disconnected', accounts_linked: 0 } : b
      ));
      showToast(t('banks.disconnected') || 'Bank disconnected', 'success');
    } catch (error) {
      showToast(t('common.error') || 'Error', 'error');
    } finally {
      setConfirmDisconnect(false);
      setSelectedBank(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('banks.title') || 'Bank Integration'} | SLMS</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <BuildingLibraryIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {t('banks.title') || 'Bank Integration'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('banks.subtitle') || 'Connect and sync with banking systems'}
              </p>
            </div>
          </div>
          
          <Button onClick={() => {
            setSelectedBank({
              id: 0, bank_name: '', bank_name_ar: '', bank_code: '',
              api_type: 'api', status: 'disconnected', accounts_linked: 0, settings: {}
            });
            setIsModalOpen(true);
          }} disabled={!canManage}>
            <PlusIcon className="w-5 h-5 me-2" />
            {t('banks.addBank') || 'Add Bank'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircleIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{banks.filter(b => b.status === 'connected').length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Connected Banks</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-blue-600">
              <CurrencyDollarIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{banks.reduce((sum, b) => sum + b.accounts_linked, 0)}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Linked Accounts</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-purple-600">
              <CheckCircleIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{recentTransactions.filter(t => t.status === 'matched').length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Matched Today</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-yellow-600">
              <XCircleIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{recentTransactions.filter(t => t.status === 'unmatched').length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Unmatched</p>
          </div>
        </div>

        {/* Banks Grid */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Connected Banks
          </h2>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {banks.map((bank) => (
                <div key={bank.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <BuildingLibraryIcon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {locale === 'ar' ? bank.bank_name_ar : bank.bank_name}
                        </h3>
                        <p className="text-xs text-gray-500">{bank.bank_code}</p>
                      </div>
                    </div>
                    <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', getStatusBadge(bank.status))}>
                      {bank.status}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-500 mb-3 space-y-1">
                    <p>Type: <span className="font-medium">{bank.api_type.toUpperCase()}</span></p>
                    <p>Accounts: <span className="font-medium">{bank.accounts_linked}</span></p>
                    {bank.last_sync && <p>Last Sync: <span className="font-medium">{new Date(bank.last_sync).toLocaleString()}</span></p>}
                  </div>
                  
                  <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                    {bank.status === 'connected' ? (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => handleSync(bank.id)} loading={syncing}>
                          <ArrowPathIcon className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => { setSelectedBank(bank); setIsModalOpen(true); }}>
                          <Cog6ToothIcon className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => { setSelectedBank(bank); setConfirmDisconnect(true); }}>
                          <XCircleIcon className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" onClick={() => { setSelectedBank(bank); setIsModalOpen(true); }}>
                        <LinkIcon className="w-4 h-4 me-1" />Connect
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h2>
            <Button size="sm" variant="secondary">
              <DocumentArrowDownIcon className="w-4 h-4 me-2" />Export
            </Button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Reference</th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-end text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentTransactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm">{txn.date}</td>
                    <td className="px-4 py-3 text-sm font-mono">{txn.reference}</td>
                    <td className="px-4 py-3 text-sm">{txn.description}</td>
                    <td className={clsx('px-4 py-3 text-sm text-end font-medium',
                      txn.type === 'credit' ? 'text-green-600' : 'text-red-600')}>
                      {txn.type === 'credit' ? '+' : '-'}{txn.amount.toLocaleString()} SAR
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('px-2 py-1 rounded-full text-xs font-medium',
                        txn.status === 'matched' ? 'bg-green-100 text-green-800' :
                        txn.status === 'unmatched' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800')}>
                        {txn.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={selectedBank?.id ? 'Bank Settings' : 'Add Bank Connection'} size="lg">
        {selectedBank && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Bank Name (EN)" value={selectedBank.bank_name}
                onChange={(e) => setSelectedBank({ ...selectedBank, bank_name: e.target.value })} />
              <Input label="Bank Name (AR)" value={selectedBank.bank_name_ar} dir="rtl"
                onChange={(e) => setSelectedBank({ ...selectedBank, bank_name_ar: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Bank Code" value={selectedBank.bank_code}
                onChange={(e) => setSelectedBank({ ...selectedBank, bank_code: e.target.value })} />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">API Type</label>
                <select value={selectedBank.api_type}
                  onChange={(e) => setSelectedBank({ ...selectedBank, api_type: e.target.value as any })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <option value="open_banking">Open Banking</option>
                  <option value="api">REST API</option>
                  <option value="sftp">SFTP</option>
                  <option value="manual">Manual Import</option>
                </select>
              </div>
            </div>
            
            {selectedBank.api_type === 'sftp' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="SFTP Host" value={selectedBank.settings.sftp_host || ''}
                  onChange={(e) => setSelectedBank({...selectedBank, settings: {...selectedBank.settings, sftp_host: e.target.value}})} />
                <Input label="SFTP User" value={selectedBank.settings.sftp_user || ''}
                  onChange={(e) => setSelectedBank({...selectedBank, settings: {...selectedBank.settings, sftp_user: e.target.value}})} />
                <Input label="Port" type="number" value={selectedBank.settings.sftp_port || 22}
                  onChange={(e) => setSelectedBank({...selectedBank, settings: {...selectedBank.settings, sftp_port: parseInt(e.target.value)}})} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="API Key" type="password" value={selectedBank.settings.api_key || ''}
                  onChange={(e) => setSelectedBank({...selectedBank, settings: {...selectedBank.settings, api_key: e.target.value}})} />
                <Input label="API Secret" type="password" value={selectedBank.settings.api_secret || ''}
                  onChange={(e) => setSelectedBank({...selectedBank, settings: {...selectedBank.settings, api_secret: e.target.value}})} />
              </div>
            )}
            
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveConnection}>Save & Connect</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={confirmDisconnect} onClose={() => setConfirmDisconnect(false)}
        onConfirm={handleDisconnect} title="Disconnect Bank"
        message="Are you sure you want to disconnect this bank? Automatic sync will stop."
        confirmText="Disconnect" variant="danger" />
    </MainLayout>
  );
}
