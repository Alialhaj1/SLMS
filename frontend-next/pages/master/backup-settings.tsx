import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useTranslation } from '@/hooks/useTranslation';

interface BackupSettings {
  id: number;
  company_id: number;
  backup_frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  retention_days: number;
  backup_location: string;
  auto_backup_enabled: boolean;
  encryption_enabled: boolean;
  last_backup_at?: string;
  created_at: string;
}

export default function BackupSettingsPage() {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [settings, setSettings] = useState<BackupSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    backup_frequency: 'daily' as 'hourly' | 'daily' | 'weekly' | 'monthly',
    retention_days: 30,
    backup_location: '/backups',
    auto_backup_enabled: true,
    encryption_enabled: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:4000/api/master/backup-settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data.data);
        if (data.data) {
          setFormData({
            backup_frequency: data.data.backup_frequency,
            retention_days: data.data.retention_days,
            backup_location: data.data.backup_location,
            auto_backup_enabled: data.data.auto_backup_enabled,
            encryption_enabled: data.data.encryption_enabled,
          });
        }
      }
    } catch (error) {
      showToast(t('messages.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const url = settings
        ? `http://localhost:4000/api/master/backup-settings/${settings.id}`
        : 'http://localhost:4000/api/master/backup-settings';

      const response = await fetch(url, {
        method: settings ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        setSettings(result.data);
        setEditing(false);
        showToast(t('master.backupSettings.messages.updated'), 'success');
      } else {
        showToast(t('messages.error'), 'error');
      }
    } catch (error) {
      showToast(t('messages.error'), 'error');
    }
  };

  const handleManualBackup = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:4000/api/master/backup-settings/backup/now', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        await fetchSettings();
        showToast(t('master.backupSettings.messages.backupStarted'), 'success');
      } else {
        showToast(t('messages.error'), 'error');
      }
    } catch (error) {
      showToast(t('messages.error'), 'error');
    }
  };

  if (!hasPermission('backup_settings:view')) {
    return <MainLayout><div className="p-6 text-red-600">{t('messages.accessDenied')}</div></MainLayout>;
  }

  return (
    <MainLayout>
      <Head><title>{t('master.backupSettings.title')} - SLMS</title></Head>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">{t('master.backupSettings.title')}</h1>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          {loading ? (
            <div className="text-center">{t('common.loading')}</div>
          ) : (
            <div className="space-y-6">
              {settings && !editing && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('master.backupSettings.fields.frequency')}</p>
                    <p className="text-lg font-semibold mt-1 capitalize">{settings.backup_frequency}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('master.backupSettings.fields.retention')}</p>
                    <p className="text-lg font-semibold mt-1">{settings.retention_days} {t('master.backupSettings.days')}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('master.backupSettings.fields.location')}</p>
                    <p className="text-lg font-semibold mt-1">{settings.backup_location}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('master.backupSettings.fields.lastBackup')}</p>
                    <p className="text-lg font-semibold mt-1">{settings.last_backup_at ? new Date(settings.last_backup_at).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('master.backupSettings.fields.autoBackup')}</p>
                    <p className="text-lg font-semibold mt-1">{settings.auto_backup_enabled ? '✓ ' + t('common.enabled') : '✗ ' + t('common.disabled')}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('master.backupSettings.fields.encryption')}</p>
                    <p className="text-lg font-semibold mt-1">{settings.encryption_enabled ? '✓ ' + t('common.enabled') : '✗ ' + t('common.disabled')}</p>
                  </div>
                </div>
              )}

              {editing && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('master.backupSettings.fields.frequency')}</label>
                    <select value={formData.backup_frequency} onChange={(e) => setFormData({ ...formData, backup_frequency: e.target.value as 'hourly' | 'daily' | 'weekly' | 'monthly' })} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700">
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <Input label={t('master.backupSettings.fields.retention')} type="number" value={formData.retention_days.toString()} onChange={(e) => setFormData({ ...formData, retention_days: parseInt(e.target.value) })} min="1" />
                  <Input label={t('master.backupSettings.fields.location')} value={formData.backup_location} onChange={(e) => setFormData({ ...formData, backup_location: e.target.value })} />
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.auto_backup_enabled} onChange={(e) => setFormData({ ...formData, auto_backup_enabled: e.target.checked })} />
                      <span className="text-sm font-medium">{t('master.backupSettings.fields.autoBackup')}</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.encryption_enabled} onChange={(e) => setFormData({ ...formData, encryption_enabled: e.target.checked })} />
                      <span className="text-sm font-medium">{t('master.backupSettings.fields.encryption')}</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                {hasPermission('backup_settings:edit') && (
                  <>
                    {!editing ? (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                          {t('common.edit')}
                        </Button>
                        <Button size="sm" className="bg-green-600 text-white" onClick={handleManualBackup}>
                          {t('master.backupSettings.buttons.backup')}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
                          {t('common.cancel')}
                        </Button>
                        <Button size="sm" onClick={handleSave} className="bg-blue-600 text-white">
                          {t('common.save')}
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
