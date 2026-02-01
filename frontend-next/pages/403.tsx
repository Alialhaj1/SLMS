/**
 * 🚫 403 - Access Denied Page
 * =====================================================
 * 
 * صفحة عدم الصلاحية
 * تُعرض عند محاولة الوصول لصفحة بدون permission
 */

import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  ShieldExclamationIcon, 
  HomeIcon, 
  ArrowLeftIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from '../hooks/useTranslation';
import { useLocale } from '../contexts/LocaleContext';
import clsx from 'clsx';

export default function AccessDeniedPage() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const router = useRouter();
  const isRtl = locale === 'ar';

  const handleGoBack = () => {
    if (window.history.length > 2) {
      router.back();
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <>
      <Head>
        <title>{t('errors.403.title')} | SLMS</title>
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4">
        <div className="max-w-md w-full">
          {/* Icon */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
              <ShieldExclamationIcon className="w-12 h-12 text-red-600 dark:text-red-400" />
            </div>
            
            {/* Error Code */}
            <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">
              403
            </h1>
            
            {/* Title */}
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
              {t('errors.403.title')}
            </h2>
            
            {/* Description */}
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              {t('errors.403.description')}
            </p>
          </div>

          {/* Details Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
              {t('errors.403.possibleReasons')}
            </h3>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>{t('errors.403.reason1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>{t('errors.403.reason2')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>{t('errors.403.reason3')}</span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {/* Help/Support Button - Primary Action */}
            <Link
              href={{
                pathname: '/help',
                query: {
                  type: 'access_request',
                  page: router.asPath,
                  permission: router.query.permission || '',
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
            >
              <ShieldExclamationIcon className="w-5 h-5" />
              {t('errors.403.requestAccess') || 'Request Access'}
            </Link>

            <button
              onClick={handleGoBack}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {isRtl ? (
                <ArrowRightIcon className="w-5 h-5" />
              ) : (
                <ArrowLeftIcon className="w-5 h-5" />
              )}
              {t('common.back')}
            </button>

            <Link
              href="/dashboard"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <HomeIcon className="w-5 h-5" />
              {t('nav.dashboard')}
            </Link>
          </div>

          {/* Help Text */}
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
            {t('errors.403.needAccessDescription') || 'If you believe you should have access to this page, click "Request Access" above to send a request to the system administrator.'}
          </p>
        </div>
      </div>
    </>
  );
}
