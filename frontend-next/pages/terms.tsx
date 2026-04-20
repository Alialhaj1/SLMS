import Head from 'next/head';
import Link from 'next/link';
import { useLocale } from '../contexts/LocaleContext';
import { ArrowLeftIcon, ArrowRightIcon, ScaleIcon } from '@heroicons/react/24/outline';

export default function TermsPage() {
  const { locale } = useLocale();
  const isRTL = locale === 'ar';

  return (
    <>
      <Head>
        <title>{isRTL ? 'الشروط والأحكام - SLMS' : 'Terms & Conditions - SLMS'}</title>
      </Head>
      <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-slate-950 text-white">
        {/* Header */}
        <div className="bg-gradient-to-b from-blue-950 to-slate-950 border-b border-white/5">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <ScaleIcon className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h1 className="text-3xl sm:text-4xl font-black mb-3">{isRTL ? 'الشروط والأحكام' : 'Terms & Conditions'}</h1>
            <p className="text-white/40 text-sm">{isRTL ? 'آخر تحديث: يناير 2025' : 'Last updated: January 2025'}</p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="prose prose-invert prose-sm max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-bold text-white mb-3">{isRTL ? '1. القبول' : '1. Acceptance'}</h2>
              <p className="text-white/50 leading-relaxed">
                {isRTL
                  ? 'باستخدامك لنظام إدارة اللوجستيات الذكي (SLMS)، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي جزء من هذه الشروط، يُرجى عدم استخدام النظام.'
                  : 'By using the Smart Logistics Management System (SLMS), you agree to be bound by these Terms & Conditions. If you do not agree with any part of these terms, please do not use the system.'}
              </p>
            </section>
            <section>
              <h2 className="text-xl font-bold text-white mb-3">{isRTL ? '2. الخدمات' : '2. Services'}</h2>
              <p className="text-white/50 leading-relaxed">
                {isRTL
                  ? 'يوفر النظام خدمات إدارة اللوجستيات وسلسلة التوريد بما في ذلك إدارة الشحنات، المحاسبة، المشتريات، إدارة المشاريع، التقارير، والتجارة الإلكترونية. تخضع هذه الخدمات للتحديث والتعديل من وقت لآخر.'
                  : 'The system provides logistics and supply chain management services including shipment management, accounting, procurement, project management, reporting, and e-commerce. These services are subject to updates and modifications from time to time.'}
              </p>
            </section>
            <section>
              <h2 className="text-xl font-bold text-white mb-3">{isRTL ? '3. حسابات المستخدمين' : '3. User Accounts'}</h2>
              <p className="text-white/50 leading-relaxed">
                {isRTL
                  ? 'أنت مسؤول عن الحفاظ على سرية بيانات حسابك وكلمة المرور. يجب إخطارنا فورًا في حالة أي استخدام غير مصرح به لحسابك. كل شركة مسؤولة عن إدارة مستخدميها وصلاحياتهم داخل النظام.'
                  : 'You are responsible for maintaining the confidentiality of your account credentials and password. You must notify us immediately of any unauthorized use of your account. Each company is responsible for managing its users and their permissions within the system.'}
              </p>
            </section>
            <section>
              <h2 className="text-xl font-bold text-white mb-3">{isRTL ? '4. الملكية الفكرية' : '4. Intellectual Property'}</h2>
              <p className="text-white/50 leading-relaxed">
                {isRTL
                  ? 'جميع حقوق الملكية الفكرية المتعلقة بنظام SLMS بما في ذلك البرمجيات والتصاميم والعلامات التجارية محفوظة. لا يُسمح بنسخ أو توزيع أو تعديل أي جزء من النظام دون إذن مسبق.'
                  : 'All intellectual property rights related to the SLMS system including software, designs, and trademarks are reserved. No part of the system may be copied, distributed, or modified without prior authorization.'}
              </p>
            </section>
            <section>
              <h2 className="text-xl font-bold text-white mb-3">{isRTL ? '5. حدود المسؤولية' : '5. Limitation of Liability'}</h2>
              <p className="text-white/50 leading-relaxed">
                {isRTL
                  ? 'نسعى لتوفير خدمة موثوقة ومستمرة، لكننا لا نضمن عدم انقطاع الخدمة. لا نتحمل المسؤولية عن أي أضرار غير مباشرة ناتجة عن استخدام النظام أو عدم القدرة على استخدامه.'
                  : 'We strive to provide a reliable and continuous service, but we do not guarantee uninterrupted service. We shall not be liable for any indirect damages arising from the use of or inability to use the system.'}
              </p>
            </section>
            <section>
              <h2 className="text-xl font-bold text-white mb-3">{isRTL ? '6. الاتصال' : '6. Contact'}</h2>
              <p className="text-white/50 leading-relaxed">
                {isRTL
                  ? 'لأي استفسارات حول هذه الشروط، يُرجى التواصل معنا عبر البريد الإلكتروني ali@alhajco.com أو الهاتف +966 533845104.'
                  : 'For any inquiries about these terms, please contact us via email at ali@alhajco.com or phone +966 533845104.'}
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
