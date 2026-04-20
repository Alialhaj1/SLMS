import React from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { useLocale } from '../../contexts/LocaleContext';
import Link from 'next/link';
import {
  BanknotesIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  TruckIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  UsersIcon,
  BuildingStorefrontIcon,
  CubeTransparentIcon,
  TagIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ServerIcon,
  UserIcon
} from '@heroicons/react/24/outline';

// Master Data Categories
const PLATFORM_DATA = [
  {
    key: 'currencies',
    name: 'Currencies',
    name_ar: 'العملات',
    description: 'Currency codes and exchange rates',
    description_ar: 'رموز العملات وأسعار الصرف',
    icon: CurrencyDollarIcon,
    path: '/master/currencies',
    permission: 'currencies:view',
    examples: 'SAR, USD, EUR, GBP',
    examples_ar: 'ريال، دولار، يورو، جنيه إسترليني'
  },
  {
    key: 'countries',
    name: 'Countries',
    name_ar: 'الدول',
    description: 'Countries and regions',
    description_ar: 'الدول والمناطق',
    icon: GlobeAltIcon,
    path: '/master/countries',
    permission: 'countries:view',
    examples: 'Saudi Arabia, UAE, Kuwait',
    examples_ar: 'المملكة، الإمارات، الكويت'
  },
  {
    key: 'ports',
    name: 'Ports',
    name_ar: 'الموانئ',
    description: 'Shipping ports worldwide',
    description_ar: 'موانئ الشحن حول العالم',
    icon: TruckIcon,
    path: '/master/ports',
    permission: 'ports:view',
    examples: 'Jeddah Port, Dubai Port, Shanghai Port',
    examples_ar: 'ميناء جدة، ميناء دبي، ميناء شنغهاي'
  },
  {
    key: 'shipping_companies',
    name: 'Shipping Companies',
    name_ar: 'شركات الشحن',
    description: 'Global shipping and logistics companies',
    description_ar: 'شركات الشحن واللوجستيك العالمية',
    icon: TruckIcon,
    path: '/master/shipping-companies',
    permission: 'shipping_companies:view',
    examples: 'Maersk, MSC, CMA CGM',
    examples_ar: 'مايرسك، إم إس سي، سي إم إيه سي جي إم'
  },
  {
    key: 'hs_codes',
    name: 'HS Codes',
    name_ar: 'أكواد النظام المنسق',
    description: 'Harmonized System commodity codes',
    description_ar: 'أكواد النظام المنسق الدولي للبضائع',
    icon: TagIcon,
    path: '/master/hs-codes',
    permission: 'hs_codes:view',
    examples: '8517.12.00, 6203.42.11',
    examples_ar: 'أكواد تصنيف البضائع دولياً'
  },
  {
    key: 'incoterms',
    name: 'Incoterms',
    name_ar: 'شروط التسليم الدولية',
    description: 'International Commercial Terms',
    description_ar: 'الشروط التجارية الدولية',
    icon: BuildingOfficeIcon,
    path: '/master/incoterms',
    permission: 'incoterms:view',
    examples: 'FOB, CIF, EXW, DDP',
    examples_ar: 'فوب، سيف، إكس ووركس، دي دي بي'
  }
];

const TENANT_DATA = [
  {
    key: 'chart_of_accounts',
    name: 'Chart of Accounts',
    name_ar: 'شجرة الحسابات',
    description: 'Company financial accounts structure',
    description_ar: 'هيكل الحسابات المالية للشركة',
    icon: BanknotesIcon,
    path: '/master/chart-of-accounts',
    permission: 'accounts:view',
    examples: 'Assets, Liabilities, Equity, Revenue',
    examples_ar: 'الأصول، الخصوم، حقوق الملكية، الإيرادات'
  },
  {
    key: 'vendors',
    name: 'Vendors',
    name_ar: 'الموردون',
    description: 'Company suppliers and vendors',
    description_ar: 'موردو ومزودو الشركة',
    icon: UserGroupIcon,
    path: '/master/vendors',
    permission: 'vendors:view',
    examples: 'Suppliers, Service Providers',
    examples_ar: 'الموردون، مقدمو الخدمات'
  },
  {
    key: 'customers',
    name: 'Customers',
    name_ar: 'العملاء',
    description: 'Company clients and customers',
    description_ar: 'عملاء وزبائن الشركة',
    icon: UsersIcon,
    path: '/master/customers',
    permission: 'customers:view',
    examples: 'Corporate Clients, Individual Customers',
    examples_ar: 'العملاء المؤسسيين، العملاء الأفراد'
  },
  {
    key: 'warehouses',
    name: 'Warehouses',
    name_ar: 'المستودعات',
    description: 'Company storage facilities',
    description_ar: 'مرافق التخزين للشركة',
    icon: BuildingStorefrontIcon,
    path: '/master/warehouses',
    permission: 'warehouses:view',
    examples: 'Main Warehouse, Regional Depots',
    examples_ar: 'المستودع الرئيسي، المستودعات الإقليمية'
  },
  {
    key: 'items',
    name: 'Items & Products',
    name_ar: 'الأصناف والمنتجات',
    description: 'Product catalog and inventory items',
    description_ar: 'كتالوج المنتجات وأصناف المخزون',
    icon: CubeTransparentIcon,
    path: '/master/items',
    permission: 'items:view',
    examples: 'Products, Raw Materials, Services',
    examples_ar: 'المنتجات، المواد الخام، الخدمات'
  },
  {
    key: 'cost_centers',
    name: 'Cost Centers',
    name_ar: 'مراكز التكلفة',
    description: 'Organizational cost allocation centers',
    description_ar: 'مراكز توزيع التكاليف التنظيمية',
    icon: ChartBarIcon,
    path: '/master/cost-centers',
    permission: 'cost_centers:view',
    examples: 'Departments, Projects, Divisions',
    examples_ar: 'الأقسام، المشاريع، الوحدات'
  }
];

export default function MasterDataIndex() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { locale } = useLocale();
  const isArabic = locale === 'ar';

  const canViewPlatformData = hasPermission('platform_admin') || user?.roles?.includes('super_admin');

  return (
    <MainLayout>
      <Head>
        <title>{isArabic ? 'البيانات الأساسية - نظام اللوجستيك الذكي' : 'Master Data - SLMS'}</title>
      </Head>
      
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {isArabic ? 'البيانات الأساسية' : 'Master Data Management'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {isArabic 
              ? 'إدارة القواميس والبيانات الثابتة التي تُغذي النظام' 
              : 'Manage dictionaries and reference data that power the system'
            }
          </p>
        </div>

        {/* Data Levels Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="p-6">
              <div className="flex items-center mb-4">
                <ServerIcon className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {isArabic ? 'بيانات المنصة' : 'Platform-Level Data'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isArabic ? 'مشتركة بين جميع العملاء' : 'Shared across all tenants'}
                  </p>
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                {isArabic 
                  ? 'بيانات ثابتة يديرها فريق المنصة فقط، مثل العملات والدول والموانئ وشركات الشحن.'
                  : 'Static data managed by platform team only, such as currencies, countries, ports, and shipping companies.'
                }
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {isArabic 
                      ? 'يُدار من قبل مشرفي المنصة فقط - غير متاح للعملاء العاديين'
                      : 'Managed by platform administrators only - not available for regular tenants'
                    }
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center mb-4">
                <UserIcon className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {isArabic ? 'بيانات العميل' : 'Tenant-Level Data'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isArabic ? 'خاصة بكل شركة' : 'Specific to each company'}
                  </p>
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                {isArabic 
                  ? 'بيانات يديرها مدير الشركة وفريقه، مثل دليل الحسابات والموردين والعملاء والمستودعات.'
                  : 'Data managed by company administrators, such as chart of accounts, vendors, customers, and warehouses.'
                }
              </p>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-green-800 dark:text-green-200">
                    {isArabic 
                      ? 'يُدار من قبل مديري الشركات - كل شركة تدير بياناتها الخاصة'
                      : 'Managed by company administrators - each company manages its own data'
                    }
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Platform Data Section */}
        {canViewPlatformData && (
          <div>
            <div className="flex items-center mb-4">
              <ServerIcon className="w-6 h-6 text-blue-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {isArabic ? 'بيانات المنصة' : 'Platform Data'}
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {PLATFORM_DATA.map((item) => {
                const Icon = item.icon;
                const canView = hasPermission(item.permission);
                
                return (
                  <Card key={item.key} className={!canView ? 'opacity-50' : ''}>
                    <div className="p-6">
                      <div className="flex items-center mb-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                          <Icon className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {isArabic && item.name_ar ? item.name_ar : item.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {isArabic && item.description_ar ? item.description_ar : item.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          {isArabic ? 'أمثلة:' : 'Examples:'}
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {isArabic && item.examples_ar ? item.examples_ar : item.examples}
                        </p>
                      </div>

                      {canView ? (
                        <Link 
                          href={item.path}
                          className="inline-flex items-center justify-center w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          {isArabic ? 'إدارة' : 'Manage'}
                        </Link>
                      ) : (
                        <div className="text-center">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {isArabic ? 'غير مصرح بالوصول' : 'Access Denied'}
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Tenant Data Section */}
        <div>
          <div className="flex items-center mb-4">
            <UserIcon className="w-6 h-6 text-green-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {isArabic ? 'بيانات الشركة' : 'Company Data'}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TENANT_DATA.map((item) => {
              const Icon = item.icon;
              const canView = hasPermission(item.permission);
              
              return (
                <Card key={item.key} className={!canView ? 'opacity-50' : ''}>
                  <div className="p-6">
                    <div className="flex items-center mb-4">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg mr-3">
                        <Icon className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {isArabic && item.name_ar ? item.name_ar : item.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {isArabic && item.description_ar ? item.description_ar : item.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {isArabic ? 'أمثلة:' : 'Examples:'}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {isArabic && item.examples_ar ? item.examples_ar : item.examples}
                      </p>
                    </div>

                    {canView ? (
                      <Link 
                        href={item.path}
                        className="inline-flex items-center justify-center w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        {isArabic ? 'إدارة' : 'Manage'}
                      </Link>
                    ) : (
                      <div className="text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {isArabic ? 'غير مصرح بالوصول' : 'Access Denied'}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Access Information */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {isArabic ? 'معلومات الوصول' : 'Access Information'}
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {isArabic ? 'الصلاحيات المطلوبة' : 'Required Permissions'}
                </h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• {isArabic ? 'بيانات المنصة: صلاحية مشرف المنصة' : 'Platform Data: Platform administrator role'}</li>
                  <li>• {isArabic ? 'بيانات الشركة: صلاحيات إدارية للشركة' : 'Company Data: Company administrative permissions'}</li>
                  <li>• {isArabic ? 'كل قسم له صلاحية منفصلة (مثل: accounts:view)' : 'Each section has separate permissions (e.g., accounts:view)'}</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {isArabic ? 'مبادئ إدارة البيانات' : 'Data Management Principles'}
                </h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• {isArabic ? 'البيانات المشتركة تُدار مركزياً' : 'Shared data is managed centrally'}</li>
                  <li>• {isArabic ? 'كل شركة تدير بياناتها المستقلة' : 'Each company manages its independent data'}</li>
                  <li>• {isArabic ? 'التحكم في الصلاحيات على مستوى التفاصيل' : 'Granular permission control'}</li>
                  <li>• {isArabic ? 'دعم متعدد اللغات (عربي/إنجليزي)' : 'Multi-language support (Arabic/English)'}</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}