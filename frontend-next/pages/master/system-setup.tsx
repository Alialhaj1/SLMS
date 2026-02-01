import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useTranslation } from '@/hooks/useTranslation';

interface SystemSetup {
  id: number;
  company_id: number;
  key: string;
  value: string;
  value_type: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  created_at: string;
}

export default function SystemSetupPage() {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [settings, setSettings] = useState<SystemSetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:4000/api/master/system-setup', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data.data || []);
        const initialData: Record<string, string> = {};
        data.data?.forEach((s: SystemSetup) => {
          initialData[s.id.toString()] = s.value;
        });
        setFormData(initialData);
      }
    } catch (error) {
      showToast(t('messages.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (settingId: number) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:4000/api/master/system-setup/${settingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ value: formData[settingId.toString()] }),
      });

      if (response.ok) {
        const result = await response.json();
        setSettings(settings.map((s) => (s.id === settingId ? result.data : s)));
        showToast(t('master.systemSetup.messages.updated'), 'success');
        setEditingId(null);
      } else {
        showToast(t('messages.error'), 'error');
      }
    } catch (error) {
      showToast(t('messages.error'), 'error');
    }
  };

  if (!hasPermission('system_setup:view')) {
    return <MainLayout><div className="p-6 text-red-600">{t('messages.accessDenied')}</div></MainLayout>;
  }

  return (
    <MainLayout>
      <Head><title>{t('master.systemSetup.title')} - SLMS</title></Head>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">{t('master.systemSetup.title')}</h1>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-6 text-center">{t('common.loading')}</div>
          ) : settings.length === 0 ? (
            <div className="p-6 text-center text-gray-500">{t('common.noData')}</div>
          ) : (
            <div className="space-y-4 p-6">
              {settings.map((setting) => (
                <div key={setting.id} className="border rounded-lg p-4 dark:border-slate-600">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{setting.key}</h3>
                      {setting.description && <p className="text-sm text-gray-600 dark:text-gray-400">{setting.description}</p>}
                      <p className="text-xs text-gray-500 mt-1">{t('master.systemSetup.type')}: {setting.value_type}</p>
                    </div>
                    {editingId === setting.id && hasPermission('system_setup:edit') ? (
                      <div className="flex gap-2 ml-4">
                        <Input
                          value={formData[setting.id.toString()] || ''}
                          onChange={(e) => setFormData({ ...formData, [setting.id.toString()]: e.target.value })}
                          className="flex-1"
                        />
                        <Button size="sm" onClick={() => handleSave(setting.id)} className="bg-blue-600 text-white">
                          {t('common.save')}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                          {t('common.cancel')}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2 ml-4">
                        <div className="text-right">
                          <p className="font-mono text-sm break-all">{formData[setting.id.toString()] || setting.value}</p>
                        </div>
                        {hasPermission('system_setup:edit') && (
                          <Button size="sm" variant="secondary" onClick={() => setEditingId(setting.id)}>
                            {t('common.edit')}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
