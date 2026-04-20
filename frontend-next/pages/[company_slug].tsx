/**
 * ============================================================================
 * COMPANY SLUG ROUTE - Direct Tenant Access
 * ============================================================================
 * As per specification: https://slms.sa/[company_slug]
 * Allows direct tenant access via company slug/code
 * 
 * Examples:
 * - https://slms.sa/alhajco → Pre-fills ALHAJCO company
 * - https://slms.sa/masa → Pre-fills MASA company  
 * - https://slms.sa/xyz → Validates and pre-fills XYZ company
 * 
 * Flow:
 * 1. Extract company_slug from URL
 * 2. Validate company exists and is active
 * 3. Pre-fill company in tenant login form
 * 4. Redirect to credentials step immediately
 * 5. Apply company branding (colors, logo) if available
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useToast } from '../contexts/ToastContext';
import { useLocale } from '../contexts/LocaleContext';
import TenantLoginForm from '../components/TenantLoginForm';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

// Types
interface CompanyInfo {
  id: number;
  tenant_code: string;
  name: string;
  name_ar: string;
  slug: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  status: 'active' | 'trial' | 'suspended' | 'locked' | 'terminated';
}

interface CompanySlugPageProps {}

// ============================================================================
// Company Slug Component
// ============================================================================

export default function CompanySlugPage({}: CompanySlugPageProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { locale } = useLocale();
  const isRTL = locale === 'ar';
  
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { company_slug } = router.query;

  // Known app route prefixes — these are NOT tenant slugs
  const appRoutes = [
    'accounting', 'procurement', 'requests', 'approvals', 'admin',
    'settings', 'reports', 'shipments', 'inventory', 'hr', 'dashboard',
    'login', 'register', 'api', '_next', 'static', 'favicon.ico',
  ];

  // Validate and load company information
  useEffect(() => {
    if (!company_slug || typeof company_slug !== 'string') return;

    // Skip known app routes — not tenant slugs
    if (appRoutes.includes(company_slug.toLowerCase())) {
      setLoading(false);
      setError('COMPANY_NOT_FOUND');
      return;
    }
    
    loadCompanyInfo(company_slug);
  }, [company_slug]);

  const loadCompanyInfo = async (slug: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/tenants/by-slug/${encodeURIComponent(slug.toLowerCase())}`);
      
      if (!res.ok) {
        if (res.status === 404) {
          setError('COMPANY_NOT_FOUND');
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data = await res.json();
      const company = data.data;
      
      // Validate company status
      if (company.status === 'terminated') {
        setError('COMPANY_TERMINATED');
        return;
      }
      
      if (company.status === 'locked') {
        setError('COMPANY_LOCKED');
        return;
      }
      
      if (company.status === 'suspended') {
        setError('COMPANY_SUSPENDED');
        return;
      }
      
      setCompanyInfo(company);
      
    } catch (error: any) {
      console.error('Error loading company info:', error);
      setError('COMPANY_LOAD_ERROR');
    } finally {
      setLoading(false);
    }
  };

  // Apply company branding
  useEffect(() => {
    if (companyInfo?.primary_color) {
      document.documentElement.style.setProperty('--company-primary', companyInfo.primary_color);
    }
    if (companyInfo?.secondary_color) {
      document.documentElement.style.setProperty('--company-secondary', companyInfo.secondary_color);
    }
    
    // Cleanup on unmount
    return () => {
      document.documentElement.style.removeProperty('--company-primary');
      document.documentElement.style.removeProperty('--company-secondary');
    };
  }, [companyInfo]);

  // Loading state
  if (loading) {
    return (
      <>
        <Head>
          <title>Loading Company - SLMS</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              {isRTL ? 'جاري التحقق من الشركة...' : 'Verifying company...'}
            </p>
          </div>
        </div>
      </>
    );
  }

  // Error states
  if (error) {
    return (
      <>
        <Head>
          <title>Company Access Error - SLMS</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20">
          <div className="max-w-md mx-auto text-center p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {error === 'COMPANY_NOT_FOUND' && (isRTL ? 'شركة غير موجودة' : 'Company Not Found')}
              {error === 'COMPANY_TERMINATED' && (isRTL ? 'حساب الشركة منتهي' : 'Company Account Terminated')}
              {error === 'COMPANY_LOCKED' && (isRTL ? 'حساب الشركة مقفل' : 'Company Account Locked')}
              {error === 'COMPANY_SUSPENDED' && (isRTL ? 'حساب الشركة معلق' : 'Company Account Suspended')}
              {error === 'COMPANY_LOAD_ERROR' && (isRTL ? 'خطأ في تحميل بيانات الشركة' : 'Error Loading Company')}
            </h1>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error === 'COMPANY_NOT_FOUND' && (isRTL 
                ? `لم يتم العثور على شركة برمز "${company_slug}". يرجى التحقق من الرابط أو الرمز.`
                : `No company found with code "${company_slug}". Please check the link or code.`
              )}
              {error === 'COMPANY_TERMINATED' && (isRTL
                ? 'حساب هذه الشركة قد تم إنهاؤه ولا يمكن الوصول إليه.'
                : 'This companys account has been terminated and cannot be accessed.'
              )}
              {error === 'COMPANY_LOCKED' && (isRTL
                ? 'حساب هذه الشركة مقفل مؤقتاً. يرجى التواصل مع الدعم الفني.'
                : 'This companys account is temporarily locked. Please contact support.'
              )}
              {error === 'COMPANY_SUSPENDED' && (isRTL
                ? 'حساب هذه الشركة معلق. يرجى التواصل مع إدارة الحساب.'
                : 'This companys account is suspended. Please contact account management.'
              )}
              {error === 'COMPANY_LOAD_ERROR' && (isRTL
                ? 'حدث خطأ في تحميل بيانات الشركة. يرجى المحاولة مرة أخرى.'
                : 'An error occurred loading company information. Please try again.'
              )}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => router.push('/auth/login')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                {isRTL ? 'دخول عام' : 'General Login'}
              </button>
              
              <button
                onClick={() => router.back()}
                className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium transition-colors"
              >
                {isRTL ? 'رجوع' : 'Go Back'}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Success - render tenant login with pre-filled company
  if (companyInfo) {
    return (
      <>
        <Head>
          <title>
            {isRTL 
              ? `دخول ${companyInfo.name_ar || companyInfo.name} - SLMS`
              : `${companyInfo.name} Login - SLMS`
            }
          </title>
          <meta name="description" content={`Login to ${companyInfo.name} - SLMS`} />
          <link rel="canonical" href={`/${companyInfo.slug}`} />
        </Head>
        
        <TenantLoginForm 
          prefilledCompany={companyInfo}
          companyBranding={{
            logo_url: companyInfo.logo_url,
            primary_color: companyInfo.primary_color,
            secondary_color: companyInfo.secondary_color,
          }}
        />
      </>
    );
  }

  // Fallback
  return null;
}

// Add icon import
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';