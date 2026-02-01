/**
 * 🚧 Coming Soon Page Component
 * صفحة "قريباً" للصفحات التي لم يتم تطويرها بعد
 */

import Head from 'next/head';
import MainLayout from '../layout/MainLayout';
import { useTranslation } from '../../hooks/useTranslation';
import { ClockIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';

interface ComingSoonPageProps {
  title: string;
  titleAr?: string;
  description?: string;
  icon?: React.ReactNode;
}

export default function ComingSoonPage({ 
  title, 
  titleAr, 
  description,
  icon 
}: ComingSoonPageProps) {
  const { t, locale } = useTranslation();

  const rawTitle = locale === 'ar' && titleAr ? titleAr : title;
  const displayTitle = rawTitle.includes('.') ? t(rawTitle) : rawTitle;
  
  return (
    <MainLayout>
      <Head>
        <title>{displayTitle} - SLMS</title>
      </Head>
      
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        {/* Icon */}
        <div className="mb-6">
          {icon || (
            <div className="relative">
              <WrenchScrewdriverIcon className="w-24 h-24 text-blue-500 animate-pulse" />
              <ClockIcon className="w-10 h-10 text-yellow-500 absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-1" />
            </div>
          )}
        </div>
        
        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          {displayTitle}
        </h1>
        
        {/* Coming Soon Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-full mb-6">
          <ClockIcon className="w-5 h-5" />
          <span className="font-medium">
            {locale === 'ar' ? 'قريباً' : 'Coming Soon'}
          </span>
        </div>
        
        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 max-w-md mb-8">
          {description || (locale === 'ar' 
            ? 'هذه الصفحة قيد التطوير وستكون متاحة قريباً. نعمل على إضافة ميزات جديدة لتحسين تجربتك.'
            : 'This page is under development and will be available soon. We are working on adding new features to improve your experience.'
          )}
        </p>
        
        {/* Progress Indicator */}
        <div className="w-full max-w-xs">
          <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
            <span>{locale === 'ar' ? 'التقدم' : 'Progress'}</span>
            <span>25%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
              style={{ width: '25%' }}
            />
          </div>
        </div>
        
        {/* Features Coming */}
        <div className="mt-8 text-left">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {locale === 'ar' ? 'الميزات القادمة:' : 'Upcoming Features:'}
          </h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              {locale === 'ar' ? 'إضافة وتعديل وحذف البيانات' : 'Add, Edit, and Delete Data'}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              {locale === 'ar' ? 'البحث والفلترة المتقدمة' : 'Advanced Search and Filtering'}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              {locale === 'ar' ? 'تصدير التقارير' : 'Export Reports'}
            </li>
          </ul>
        </div>
      </div>
    </MainLayout>
  );
}
