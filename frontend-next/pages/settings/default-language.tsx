import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import apiClient from '../../lib/apiClient';
import { withPermission } from '../../utils/withPermission';

interface CompanyLanguage {
  code: string;
  name: string;
  is_enabled: boolean;
  is_default: boolean;
}

function DefaultLanguagePage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const [items, setItems] = useState<CompanyLanguage[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDefault, setPendingDefault] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await apiClient.get<{ success: boolean; data: CompanyLanguage[] }>('/api/settings/languages', { cache: 'no-store' });
      setItems(result.data || []);
    } catch (e: any) {
      showToast(e?.message || t('common.failedToLoad', 'Failed to load'), 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const canUpdate = hasPermission('settings:language:update');

  const setDefault = async (code: string) => {
    setIsSubmitting(true);
    try {
      await apiClient.put('/api/settings/languages/default', { language_code: code });
      showToast(t('settings.defaultLanguage.updated', 'Default language updated'), 'success');

      // Persist locally to avoid flash; then reload to apply across app
      if (typeof window !== 'undefined') {
        localStorage.setItem('locale', code);
        window.location.reload();
      }
    } catch (e: any) {
      showToast(e?.message || t('common.failedToSave', 'Failed to save'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleEnabled = async (code: string, is_enabled: boolean) => {
    setIsSubmitting(true);
    try {
      await apiClient.put(`/api/settings/languages/${code}`, { is_enabled });
      showToast(t('common.success'), 'success');
      fetchData();
    } catch (e: any) {
      showToast(e?.message || t('common.failedToSave', 'Failed to save'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentDefault = items.find((x) => x.is_default)?.code;

  return (
    <MainLayout>
      <Head>
        <title>{t('settings.defaultLanguage.title', 'Default Language')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.defaultLanguage.title', 'Default Language')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">{t('settings.defaultLanguage.subtitle', 'Enable languages and set a company default')}</p>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">{t('settings.defaultLanguage.listTitle', 'Languages')}</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('settings.defaultLanguage.code', 'Code')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('settings.defaultLanguage.name', 'Name')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('settings.defaultLanguage.enabled', 'Enabled')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('settings.defaultLanguage.default', 'Default')}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">{t('common.loading', 'Loading...')}</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">{t('settings.defaultLanguage.empty', 'No languages found')}</td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.code} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-3 font-mono text-sm text-gray-900 dark:text-white">{item.code}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.name}</td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={item.is_enabled}
                        disabled={!canUpdate || item.is_default || isSubmitting}
                        onChange={(e) => toggleEnabled(item.code, e.target.checked)}
                        aria-label={t('settings.defaultLanguage.enabled', 'Enabled')}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {item.is_default ? (
                        <span className="inline-flex px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          {t('common.default', 'Default')}
                        </span>
                      ) : (
                        canUpdate && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={!item.is_enabled || isSubmitting}
                            onClick={() => {
                              setPendingDefault(item.code);
                              setConfirmOpen(true);
                            }}
                          >
                            {t('settings.defaultLanguage.setDefault', 'Set Default')}
                          </Button>
                        )
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {currentDefault && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
            {t('settings.defaultLanguage.current', 'Current default')}: <span className="font-mono">{currentDefault}</span>
          </div>
        )}
      </Card>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => (pendingDefault ? setDefault(pendingDefault) : undefined)}
        title={t('settings.defaultLanguage.confirmTitle', 'Change Default Language')}
        message={t('settings.defaultLanguage.confirmMessage', 'The application will reload to apply the new language.')}
        confirmText={t('common.confirm', 'Confirm')}
        variant="primary"
        loading={isSubmitting}
      />
    </MainLayout>
  );
}

export default withPermission('settings:language:view', DefaultLanguagePage);
