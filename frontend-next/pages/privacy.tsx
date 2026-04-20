import Head from 'next/head';
import Link from 'next/link';
import { useLocale } from '../contexts/LocaleContext';
import { ArrowLeftIcon, ArrowRightIcon, LockClosedIcon } from '@heroicons/react/24/outline';

export default function PrivacyPage() {
  const { locale } = useLocale();
  const isRTL = locale === 'ar';

  return (
    <>
      <Head>
        <title>{isRTL ? 'سياسة الخصوصية - SLMS' : 'Privacy Policy - SLMS'}</title>
      </Head>
      <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-slate-950 text-white">
        <div className="bg-gradient-to-b from-blue-950 to-slate-950 border-b border-white/5">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <LockClosedIcon className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h1 className="text-3xl sm:text-4xl font-black mb-3">{isRTL ? 'سياسة الخصوصية' : 'Privacy Policy'}</h1>
            <p className="text-white/40 text-sm">{isRTL ? 'آخر تحديث: يناير 2025' : 'Last updated: January 2025'}</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="prose prose-invert prose-sm max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-bold text-white mb-3">{isRTL ? '1. جمع البيانات' : '1. Data Collection'}</h2>
              <p className="text-white/50 leading-relaxed">
                {isRTL
                  ? 'نقوم بجمع المعلومات الضرورية لتشغيل النظام بما في ذلك: بيانات الشركة، معلومات المستخدمين، بيانات الشحنات والمعاملات المالية. لا نجمع أي بيانات شخصية غير ضرورية.'
                  : 'We collect information necessary for system operation including: company data, user information, shipment data, and financial transactions. We do not collect any unnecessary personal data.'}
              </p>
            </section>
            <section>
              <h2 className="text-xl font-bold text-white mb-3">{isRTL ? '2. استخدام البيانات' : '2. Data Usage'}</h2>
              <p className="text-white/50 leading-relaxed">
                {isRTL
                  ? 'تُستخدم بياناتك حصريًا لتقديم الخدمات المطلوبة، تحسين أداء النظام، وتوفير الدعم الفني. لا نبيع أو نشارك بياناتك مع أطراف ثالثة لأغراض تسويقية.'
                  : 'Your data is used exclusively to provide requested services, improve system performance, and provide technical support. We do not sell or share your data with third parties for marketing purposes.'}
              </p>
            </section>
            <section>
              <h2 className="text-xl font-bold text-white mb-3">{isRTL ? '3. أمان البيانات' : '3. Data Security'}</h2>
              <p className="text-white/50 leading-relaxed">
                {isRTL
                  ? 'نستخدم أحدث تقنيات التشفير وأفضل الممارسات الأمنية لحماية بياناتك. يشمل ذلك تشفير SSL/TLS، تشفير البيانات في الراحة، مصادقة متعددة العوامل، وسجلات تدقيق شاملة.'
                  : 'We use the latest encryption technologies and security best practices to protect your data. This includes SSL/TLS encryption, data-at-rest encryption, multi-factor authentication, and comprehensive audit logs.'}
              </p>
            </section>
            <section>
              <h2 className="text-xl font-bold text-white mb-3">{isRTL ? '4. الاحتفاظ بالبيانات' : '4. Data Retention'}</h2>
              <p className="text-white/50 leading-relaxed">
                {isRTL
                  ? 'نحتفظ ببياناتك طوال فترة اشتراكك النشط وللمدة المطلوبة قانونيًا بعد ذلك. يمكنك طلب حذف بياناتك وفقًا للأنظمة المعمول بها.'
                  : 'We retain your data throughout your active subscription period and for the legally required period thereafter. You may request deletion of your data in accordance with applicable regulations.'}
              </p>
            </section>
            <section>
              <h2 className="text-xl font-bold text-white mb-3">{isRTL ? '5. حقوقك' : '5. Your Rights'}</h2>
              <p className="text-white/50 leading-relaxed">
                {isRTL
                  ? 'لديك الحق في الوصول إلى بياناتك، تصحيحها، طلب حذفها، أو الحصول على نسخة منها. لممارسة هذه الحقوق، يُرجى التواصل مع فريق الدعم.'
                  : 'You have the right to access your data, correct it, request its deletion, or obtain a copy of it. To exercise these rights, please contact our support team.'}
              </p>
            </section>
            <section>
              <h2 className="text-xl font-bold text-white mb-3">{isRTL ? '6. الاتصال' : '6. Contact'}</h2>
              <p className="text-white/50 leading-relaxed">
                {isRTL
                  ? 'لأي استفسارات حول سياسة الخصوصية، تواصل معنا عبر ali@alhajco.com أو +966 533845104.'
                  : 'For any inquiries about this privacy policy, contact us at ali@alhajco.com or +966 533845104.'}
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-white/5">
            <Link href="/auth/login" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
              {isRTL ? <ArrowRightIcon className="w-4 h-4" /> : <ArrowLeftIcon className="w-4 h-4" />}
              {isRTL ? 'العودة إلى الرئيسية' : 'Back to Home'}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
