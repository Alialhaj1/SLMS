/**
 * i18n Demo Component - For Testing Language Switching
 * Demonstrates all translation features
 */

import { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation.enhanced';
import { useLocale } from '../contexts/LocaleContext';

export default function I18nDemo() {
  const { t, formatDate, formatTime, formatDateTime, formatRelativeTime, formatNumber, formatCurrency, formatPercent } = useTranslation();
  const { locale, setLocale, dir, isRTL } = useLocale();
  const [count, setCount] = useState(5);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            🌐 i18n Testing Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Current Locale: <strong>{locale.toUpperCase()}</strong> | Direction: <strong>{dir.toUpperCase()}</strong> | RTL: <strong>{isRTL ? 'Yes' : 'No'}</strong>
          </p>
          
          {/* Language Switcher */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setLocale('en')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                locale === 'en'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              🇬🇧 English
            </button>
            <button
              onClick={() => setLocale('ar')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                locale === 'ar'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              🇸🇦 العربية
            </button>
          </div>
        </div>

        {/* Common Translations */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {t('common.appName')} - Common Strings
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400">Save</div>
              <div className="font-medium">{t('common.save')}</div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400">Cancel</div>
              <div className="font-medium">{t('common.cancel')}</div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400">Delete</div>
              <div className="font-medium">{t('common.delete')}</div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400">Search</div>
              <div className="font-medium">{t('common.search')}</div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400">Loading</div>
              <div className="font-medium">{t('common.loading')}</div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400">Success</div>
              <div className="font-medium">{t('common.success')}</div>
            </div>
          </div>
        </div>

        {/* Auth Strings */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Authentication Strings
          </h2>
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {t('auth.login.title')}
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                {t('auth.login.subtitle')}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400">Email Label</div>
                <div className="font-medium">{t('auth.login.email')}</div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400">Password Label</div>
                <div className="font-medium">{t('auth.login.password')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Date & Time Formatting */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Date & Time Formatting
          </h2>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400">Current Date</div>
              <div className="font-medium">{formatDate(new Date())}</div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400">Current Time</div>
              <div className="font-medium">{formatTime(new Date())}</div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400">Date & Time</div>
              <div className="font-medium">{formatDateTime(new Date())}</div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400">5 minutes ago</div>
              <div className="font-medium">
                {formatRelativeTime(new Date(Date.now() - 5 * 60 * 1000))}
              </div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400">2 hours ago</div>
              <div className="font-medium">
                {formatRelativeTime(new Date(Date.now() - 2 * 60 * 60 * 1000))}
              </div>
            </div>
          </div>
        </div>

        {/* Number Formatting */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Number Formatting
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400">Large Number</div>
              <div className="font-medium number-ltr">{formatNumber(1234567)}</div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400">Currency</div>
              <div className="font-medium number-ltr">{formatCurrency(99.99, 'USD')}</div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400">Percentage</div>
              <div className="font-medium number-ltr">{formatPercent(75.5, 1)}</div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400">Decimal</div>
              <div className="font-medium number-ltr">
                {formatNumber(123.456, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Strings */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {t('profile.title')} - Profile Strings
          </h2>
          <div className="space-y-2">
            <div className="flex gap-4">
              <span className="font-medium">{t('profile.tabs.overview')}</span>
              <span className="font-medium">{t('profile.tabs.security')}</span>
              <span className="font-medium">{t('profile.tabs.activity')}</span>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400">Full Name</div>
              <div className="font-medium">{t('profile.overview.fullName')}</div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400">Permissions Count (with count={count})</div>
              <div className="font-medium">
                {t('profile.overview.permissionsCount', { count })}
                <button
                  onClick={() => setCount(count + 1)}
                  className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {t('notifications.title')}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400">Mark as Read</div>
              <div className="font-medium">{t('notifications.markAsRead')}</div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400">Mark All Read</div>
              <div className="font-medium">{t('notifications.markAllRead')}</div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400">Category: System</div>
              <div className="font-medium">{t('notifications.categories.system')}</div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400">Category: Security</div>
              <div className="font-medium">{t('notifications.categories.security')}</div>
            </div>
          </div>
        </div>

        {/* RTL Test */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            RTL/LTR Layout Test
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white">
                1
              </span>
              <div className="flex-1">
                <div className="font-medium">This text should align to the start</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Start alignment test</div>
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                {t('common.save')}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-start">
                <div className="text-xs text-gray-500 dark:text-gray-400">Start</div>
                <div className="font-medium">Text at start</div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">Center</div>
                <div className="font-medium">Centered text</div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-end">
                <div className="text-xs text-gray-500 dark:text-gray-400">End</div>
                <div className="font-medium">Text at end</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
