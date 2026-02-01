export { default } from './notifications';

const __LEGACY_NOTIFICATION_SETTINGS_PAGE = `
/**
 * 🔔 Notification Settings - إعدادات الإشعارات
 * =====================================================
 * إعدادات قنوات ووسائل الإشعار المختلفة
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  BellIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  GlobeAltIcon,
  ArrowPathIcon,
  CheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import clsx from 'clsx';

interface NotificationCategory {
  id: string;
  name: string;
  name_ar: string;
  events: {
    id: string;
    name: string;
    name_ar: string;
    channels: {
      email: boolean;
      sms: boolean;
      push: boolean;
      in_app: boolean;
    };
  }[];
}

export default function NotificationSettingsPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<NotificationCategory[]>([]);
  const [activeTab, setActiveTab] = useState<'preferences' | 'channels' | 'schedule'>('preferences');
  
  const [channelSettings, setChannelSettings] = useState({
    email: {
      enabled: true,
      from_email: 'noreply@slms.com',
      from_name: 'SLMS System',
    },
    sms: {
      enabled: false,
      provider: 'twilio',
      api_key: '',
    },
    push: {
      enabled: true,
      vapid_key: '',
    },
    in_app: {
      enabled: true,
      max_notifications: 50,
      auto_dismiss: 5,
    },
  });
  
  const [scheduleSettings, setScheduleSettings] = useState({
    quiet_hours_enabled: false,
    quiet_start: '22:00',
    quiet_end: '08:00',
    digest_enabled: false,
    digest_time: '09:00',
    digest_frequency: 'daily',
    weekend_notifications: true,
  });

  const canManage = hasPermission('notifications:manage');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      // Mock data
      setCategories([
        {
          id: 'shipments',
          name: 'Shipments',
          name_ar: 'الشحنات',
          events: [
            { id: 'shipment_created', name: 'New shipment created', name_ar: 'إنشاء شحنة جديدة', channels: { email: true, sms: false, push: true, in_app: true } },
            { id: 'shipment_updated', name: 'Shipment updated', name_ar: 'تحديث الشحنة', channels: { email: false, sms: false, push: false, in_app: true } },
            { id: 'shipment_delivered', name: 'Shipment delivered', name_ar: 'تسليم الشحنة', channels: { email: true, sms: true, push: true, in_app: true } },
            { id: 'shipment_delayed', name: 'Shipment delayed', name_ar: 'تأخر الشحنة', channels: { email: true, sms: true, push: true, in_app: true } },
          ],
        },
        {
          id: 'finance',
          name: 'Finance',
          name_ar: 'المالية',
          events: [
            { id: 'invoice_created', name: 'Invoice created', name_ar: 'إنشاء فاتورة', channels: { email: true, sms: false, push: false, in_app: true } },
            { id: 'payment_received', name: 'Payment received', name_ar: 'استلام دفعة', channels: { email: true, sms: false, push: true, in_app: true } },
            { id: 'invoice_overdue', name: 'Invoice overdue', name_ar: 'فاتورة متأخرة', channels: { email: true, sms: true, push: true, in_app: true } },
          ],
        },
        {
          id: 'users',
          name: 'Users & Access',
          name_ar: 'المستخدمين والوصول',
          events: [
            { id: 'new_user', name: 'New user registered', name_ar: 'تسجيل مستخدم جديد', channels: { email: true, sms: false, push: false, in_app: true } },
            { id: 'login_failed', name: 'Failed login attempt', name_ar: 'محاولة دخول فاشلة', channels: { email: true, sms: false, push: true, in_app: true } },
            { id: 'password_changed', name: 'Password changed', name_ar: 'تغيير كلمة المرور', channels: { email: true, sms: true, push: false, in_app: true } },
          ],
        },
        {
          id: 'system',
          name: 'System',
          name_ar: 'النظام',
          events: [
            { id: 'backup_complete', name: 'Backup completed', name_ar: 'اكتمال النسخ الاحتياطي', channels: { email: true, sms: false, push: false, in_app: true } },
            { id: 'system_error', name: 'System error', name_ar: 'خطأ في النظام', channels: { email: true, sms: true, push: true, in_app: true } },
            { id: 'maintenance', name: 'Scheduled maintenance', name_ar: 'صيانة مجدولة', channels: { email: true, sms: false, push: true, in_app: true } },
          ],
        },
      ]);
    } catch (error) {
      showToast(t('common.fetchError') || 'Failed to fetch settings', 'error');
    } finally {
      setLoading(false);
    }
  };
export { default } from './notifications';
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={clsx(
                  'px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  activeTab === 'schedule'
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                )}
              >
                {t('notifications.schedule') || 'Delivery Schedule'}
              </button>
            </nav>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            ) : (
              <>
                {/* Preferences Tab */}
                {activeTab === 'preferences' && (
                  <div className="space-y-6">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px]">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-start py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                              {t('notifications.event') || 'Event'}
                            </th>
                            {channels.map((channel) => (
                              <th key={channel.id} className="py-3 px-4 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <channel.icon className="w-5 h-5 text-gray-500" />
                                  <span className="text-xs text-gray-500">{channel.name}</span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {categories.map((category) => (
                            <>
                              {/* Category Header */}
                              <tr key={category.id} className="bg-gray-50 dark:bg-gray-700/50">
                                <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                                  {locale === 'ar' ? category.name_ar : category.name}
                                </td>
                                {channels.map((channel) => (
                                  <td key={channel.id} className="py-3 px-4 text-center">
                                    <button
                                      onClick={() => {
                                        const allEnabled = category.events.every(e => e.channels[channel.id]);
                                        toggleAllInCategory(category.id, channel.id, !allEnabled);
                                      }}
                                      disabled={!canManage}
                                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                                    >
                                      {category.events.every(e => e.channels[channel.id]) 
                                        ? t('common.deselectAll') || 'Deselect all' 
                                        : t('common.selectAll') || 'Select all'}
                                    </button>
                                  </td>
                                ))}
                              </tr>
                              
                              {/* Events */}
                              {category.events.map((event) => (
                                <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                  <td className="py-3 px-4 ps-8 text-sm text-gray-700 dark:text-gray-300">
                                    {locale === 'ar' ? event.name_ar : event.name}
                                  </td>
                                  {channels.map((channel) => (
                                    <td key={channel.id} className="py-3 px-4 text-center">
                                      <button
                                        onClick={() => toggleEventChannel(category.id, event.id, channel.id)}
                                        disabled={!canManage}
                                        className={clsx(
                                          'w-6 h-6 rounded-md border-2 transition-colors mx-auto flex items-center justify-center',
                                          event.channels[channel.id]
                                            ? 'bg-indigo-500 border-indigo-500 text-white'
                                            : 'border-gray-300 dark:border-gray-600 hover:border-indigo-300'
                                        )}
                                      >
                                        {event.channels[channel.id] && <CheckIcon className="w-4 h-4" />}
                                      </button>
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Channels Tab */}
                {activeTab === 'channels' && (
                  <div className="space-y-6">
                    {/* Email Settings */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <EnvelopeIcon className="w-6 h-6 text-blue-500" />
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {t('notifications.emailSettings') || 'Email Settings'}
                          </h3>
                        </div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={channelSettings.email.enabled}
                            onChange={(e) => setChannelSettings(prev => ({
                              ...prev,
                              email: { ...prev.email, enabled: e.target.checked }
                            }))}
                            disabled={!canManage}
                            className="w-5 h-5 text-indigo-600 rounded"
                          />
                          <span className="text-sm">{t('common.enabled') || 'Enabled'}</span>
                        </label>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label={t('notifications.fromEmail') || 'From Email'}
                          value={channelSettings.email.from_email}
                          onChange={(e) => setChannelSettings(prev => ({
                            ...prev,
                            email: { ...prev.email, from_email: e.target.value }
                          }))}
                          disabled={!canManage}
                        />
                        <Input
                          label={t('notifications.fromName') || 'From Name'}
                          value={channelSettings.email.from_name}
                          onChange={(e) => setChannelSettings(prev => ({
                            ...prev,
                            email: { ...prev.email, from_name: e.target.value }
                          }))}
                          disabled={!canManage}
                        />
                      </div>
                    </div>

                    {/* SMS Settings */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <DevicePhoneMobileIcon className="w-6 h-6 text-green-500" />
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {t('notifications.smsSettings') || 'SMS Settings'}
                          </h3>
                        </div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={channelSettings.sms.enabled}
                            onChange={(e) => setChannelSettings(prev => ({
                              ...prev,
                              sms: { ...prev.sms, enabled: e.target.checked }
                            }))}
                            disabled={!canManage}
                            className="w-5 h-5 text-indigo-600 rounded"
                          />
                          <span className="text-sm">{t('common.enabled') || 'Enabled'}</span>
                        </label>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('notifications.provider') || 'Provider'}
                          </label>
                          <select
                            value={channelSettings.sms.provider}
                            onChange={(e) => setChannelSettings(prev => ({
                              ...prev,
                              sms: { ...prev.sms, provider: e.target.value }
                            }))}
                            disabled={!canManage}
                            className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                          >
                            <option value="twilio">Twilio</option>
                            <option value="nexmo">Nexmo</option>
                            <option value="messagebird">MessageBird</option>
                            <option value="unifonic">Unifonic</option>
                          </select>
                        </div>
                        <Input
                          label={t('notifications.apiKey') || 'API Key'}
                          type="password"
                          value={channelSettings.sms.api_key}
                          onChange={(e) => setChannelSettings(prev => ({
                            ...prev,
                            sms: { ...prev.sms, api_key: e.target.value }
                          }))}
                          placeholder="••••••••"
                          disabled={!canManage}
                        />
                      </div>
                    </div>

                    {/* Push Settings */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <GlobeAltIcon className="w-6 h-6 text-purple-500" />
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {t('notifications.pushSettings') || 'Push Notifications'}
                          </h3>
                        </div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={channelSettings.push.enabled}
                            onChange={(e) => setChannelSettings(prev => ({
                              ...prev,
                              push: { ...prev.push, enabled: e.target.checked }
                            }))}
                            disabled={!canManage}
                            className="w-5 h-5 text-indigo-600 rounded"
                          />
                          <span className="text-sm">{t('common.enabled') || 'Enabled'}</span>
                        </label>
                      </div>
                      
                      <Input
                        label={t('notifications.vapidKey') || 'VAPID Public Key'}
                        value={channelSettings.push.vapid_key}
                        onChange={(e) => setChannelSettings(prev => ({
                          ...prev,
                          push: { ...prev.push, vapid_key: e.target.value }
                        }))}
                        placeholder="BNmPzN..."
                        disabled={!canManage}
                      />
                    </div>

                    {/* In-App Settings */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <ComputerDesktopIcon className="w-6 h-6 text-orange-500" />
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {t('notifications.inAppSettings') || 'In-App Notifications'}
                          </h3>
                        </div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={channelSettings.in_app.enabled}
                            onChange={(e) => setChannelSettings(prev => ({
                              ...prev,
                              in_app: { ...prev.in_app, enabled: e.target.checked }
                            }))}
                            disabled={!canManage}
                            className="w-5 h-5 text-indigo-600 rounded"
                          />
                          <span className="text-sm">{t('common.enabled') || 'Enabled'}</span>
                        </label>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          type="number"
                          label={t('notifications.maxNotifications') || 'Max Notifications to Keep'}
                          value={channelSettings.in_app.max_notifications}
                          onChange={(e) => setChannelSettings(prev => ({
                            ...prev,
                            in_app: { ...prev.in_app, max_notifications: Number(e.target.value) }
                          }))}
                          min={10}
                          max={200}
                          disabled={!canManage}
                        />
                        <Input
                          type="number"
                          label={t('notifications.autoDismiss') || 'Auto Dismiss (seconds)'}
                          value={channelSettings.in_app.auto_dismiss}
                          onChange={(e) => setChannelSettings(prev => ({
                            ...prev,
                            in_app: { ...prev.in_app, auto_dismiss: Number(e.target.value) }
                          }))}
                          min={0}
                          max={30}
                          disabled={!canManage}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Schedule Tab */}
                {activeTab === 'schedule' && (
                  <div className="space-y-6">
                    {/* Quiet Hours */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {t('notifications.quietHours') || 'Quiet Hours'}
                        </h3>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={scheduleSettings.quiet_hours_enabled}
                            onChange={(e) => setScheduleSettings(prev => ({
                              ...prev,
                              quiet_hours_enabled: e.target.checked
                            }))}
                            disabled={!canManage}
                            className="w-5 h-5 text-indigo-600 rounded"
                          />
                          <span className="text-sm">{t('common.enabled') || 'Enabled'}</span>
                        </label>
                      </div>
                      
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        {t('notifications.quietHoursDesc') || 'During quiet hours, only critical notifications will be sent.'}
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          type="time"
                          label={t('notifications.quietStart') || 'Start Time'}
                          value={scheduleSettings.quiet_start}
                          onChange={(e) => setScheduleSettings(prev => ({
                            ...prev,
                            quiet_start: e.target.value
                          }))}
                          disabled={!canManage || !scheduleSettings.quiet_hours_enabled}
                        />
                        <Input
                          type="time"
                          label={t('notifications.quietEnd') || 'End Time'}
                          value={scheduleSettings.quiet_end}
                          onChange={(e) => setScheduleSettings(prev => ({
                            ...prev,
                            quiet_end: e.target.value
                          }))}
                          disabled={!canManage || !scheduleSettings.quiet_hours_enabled}
                        />
                      </div>
                    </div>

                    {/* Digest */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {t('notifications.digest') || 'Email Digest'}
                        </h3>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={scheduleSettings.digest_enabled}
                            onChange={(e) => setScheduleSettings(prev => ({
                              ...prev,
                              digest_enabled: e.target.checked
                            }))}
                            disabled={!canManage}
                            className="w-5 h-5 text-indigo-600 rounded"
                          />
                          <span className="text-sm">{t('common.enabled') || 'Enabled'}</span>
                        </label>
                      </div>
                      
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        {t('notifications.digestDesc') || 'Combine multiple notifications into a single digest email.'}
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          type="time"
                          label={t('notifications.digestTime') || 'Send At'}
                          value={scheduleSettings.digest_time}
                          onChange={(e) => setScheduleSettings(prev => ({
                            ...prev,
                            digest_time: e.target.value
                          }))}
                          disabled={!canManage || !scheduleSettings.digest_enabled}
                        />
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('notifications.frequency') || 'Frequency'}
                          </label>
                          <select
                            value={scheduleSettings.digest_frequency}
                            onChange={(e) => setScheduleSettings(prev => ({
                              ...prev,
                              digest_frequency: e.target.value
                            }))}
                            disabled={!canManage || !scheduleSettings.digest_enabled}
                            className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                          >
                            <option value="daily">{t('notifications.daily') || 'Daily'}</option>
                            <option value="weekly">{t('notifications.weekly') || 'Weekly'}</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Weekend */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={scheduleSettings.weekend_notifications}
                          onChange={(e) => setScheduleSettings(prev => ({
                            ...prev,
                            weekend_notifications: e.target.checked
                          }))}
                          disabled={!canManage}
                          className="w-5 h-5 text-indigo-600 rounded"
                        />
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {t('notifications.weekendNotifications') || 'Weekend Notifications'}
                          </span>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('notifications.weekendDesc') || 'Allow non-critical notifications during weekends'}
                          </p>
                        </div>
                      </label>
                    </div>

                    {/* Warning */}
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-yellow-800 dark:text-yellow-300">
                            {t('notifications.scheduleNote') || 'Note'}
                          </h4>
                          <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                            {t('notifications.scheduleNoteDesc') || 'Critical and security-related notifications will always be sent immediately regardless of schedule settings.'}
                          </p>
                        </div>
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
