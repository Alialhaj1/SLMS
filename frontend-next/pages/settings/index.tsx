import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useToast } from '../../contexts/ToastContext';
import { usePermissions } from '../../hooks/usePermissions';
import {
  Cog6ToothIcon,
  BellIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

interface SystemSettings {
  company_name: string;
  company_email: string;
  company_phone: string;
  company_address: string;
  timezone: string;
  currency: string;
  email_notifications: boolean;
  sms_notifications: boolean;
  require_two_factor: boolean;
  session_timeout: number;
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();

  const [settings, setSettings] = useState<SystemSettings>({
    company_name: '',
    company_email: '',
    company_phone: '',
    company_address: '',
    timezone: 'UTC',
    currency: 'USD',
    email_notifications: true,
    sms_notifications: false,
    require_two_factor: false,
    session_timeout: 30,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!hasPermission('system_settings:view' as any)) {
      router.push('/dashboard');
      return;
    }

    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setSettings({ ...settings, ...data });
      }
    } catch (error) {
      showToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!settings.company_name.trim()) {
      newErrors.company_name = 'Company name is required';
    }

    if (settings.company_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.company_email)) {
      newErrors.company_email = 'Invalid email format';
    }

    if (settings.session_timeout < 5 || settings.session_timeout > 1440) {
      newErrors.session_timeout = 'Session timeout must be between 5 and 1440 minutes';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSaving(true);
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        showToast('Settings saved successfully', 'success');
      } else {
        const error = await res.json();
        showToast(error.message || 'Failed to save settings', 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!hasPermission('system_settings:view' as any)) {
    return null;
  }

  if (loading) {
    return (
      <MainLayout>
        <Head>
          <title>System Settings - SLMS</title>
        </Head>
        <div className="space-y-6">
          <Card>
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>System Settings - SLMS</title>
      </Head>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">System Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure global system preferences
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Information */}
          <Card>
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                  <GlobeAltIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <h2 className="text-xl font-semibold">Company Information</h2>
              </div>

              <Input
                label="Company Name"
                required
                value={settings.company_name}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                error={errors.company_name}
                placeholder="ACME Logistics"
              />

              <Input
                label="Company Email"
                type="email"
                value={settings.company_email}
                onChange={(e) => setSettings({ ...settings, company_email: e.target.value })}
                error={errors.company_email}
                placeholder="info@company.com"
              />

              <Input
                label="Company Phone"
                value={settings.company_phone}
                onChange={(e) => setSettings({ ...settings, company_phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Company Address
                </label>
                <textarea
                  value={settings.company_address}
                  onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
                  className="input min-h-[100px]"
                  placeholder="123 Business St, City, Country"
                />
              </div>
            </div>
          </Card>

          {/* Regional Settings */}
          <Card>
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <Cog6ToothIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-xl font-semibold">Regional Settings</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Timezone
                  </label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                    className="input"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Europe/Paris">Paris (CET)</option>
                    <option value="Asia/Dubai">Dubai (GST)</option>
                    <option value="Asia/Tokyo">Tokyo (JST)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Currency
                  </label>
                  <select
                    value={settings.currency}
                    onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                    className="input"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="AED">AED (د.إ)</option>
                    <option value="SAR">SAR (ر.س)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>
              </div>
            </div>
          </Card>

          {/* Notification Settings */}
          <Card>
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <BellIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-xl font-semibold">Notifications</h2>
              </div>

              <div className="space-y-3">
                <div
                  className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() =>
                    setSettings({ ...settings, email_notifications: !settings.email_notifications })
                  }
                >
                  <div>
                    <div className="font-medium">Email Notifications</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Receive notifications via email
                    </div>
                  </div>
                  <div
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.email_notifications ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform m-0.5 ${
                        settings.email_notifications ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>

                <div
                  className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() =>
                    setSettings({ ...settings, sms_notifications: !settings.sms_notifications })
                  }
                >
                  <div>
                    <div className="font-medium">SMS Notifications</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Receive notifications via SMS
                    </div>
                  </div>
                  <div
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.sms_notifications ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform m-0.5 ${
                        settings.sms_notifications ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Security Settings */}
          <Card>
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <ShieldCheckIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-xl font-semibold">Security</h2>
              </div>

              <div
                className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                onClick={() =>
                  setSettings({ ...settings, require_two_factor: !settings.require_two_factor })
                }
              >
                <div>
                  <div className="font-medium">Two-Factor Authentication</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Require 2FA for all users
                  </div>
                </div>
                <div
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.require_two_factor ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform m-0.5 ${
                      settings.require_two_factor ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>

              <Input
                label="Session Timeout (minutes)"
                type="number"
                min={5}
                max={1440}
                value={settings.session_timeout.toString()}
                onChange={(e) =>
                  setSettings({ ...settings, session_timeout: parseInt(e.target.value) || 30 })
                }
                error={errors.session_timeout}
                helperText="Between 5 and 1440 minutes"
              />
            </div>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button type="submit" variant="primary" size="lg" loading={saving}>
              <CheckIcon className="w-5 h-5" />
              Save Settings
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
