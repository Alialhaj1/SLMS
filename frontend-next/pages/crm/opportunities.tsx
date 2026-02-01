import { useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import {
  SparklesIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  CurrencyDollarIcon,
  UserIcon,
  CalendarIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface Opportunity {
  id: number;
  name: string;
  nameAr: string;
  customer: string;
  customerAr: string;
  value: number;
  probability: number;
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  source: string;
  sourceAr: string;
  expectedClose: string;
  assignedTo: string;
  assignedToAr: string;
  createdAt: string;
}

const mockOpportunities: Opportunity[] = [
  { id: 1, name: 'Logistics Contract Q1', nameAr: 'عقد الخدمات اللوجستية - الربع الأول', customer: 'Al-Faisal Trading', customerAr: 'شركة الفيصل للتجارة', value: 500000, probability: 80, stage: 'negotiation', source: 'Referral', sourceAr: 'إحالة', expectedClose: '2024-02-28', assignedTo: 'Ahmed Ali', assignedToAr: 'أحمد علي', createdAt: '2024-01-10' },
  { id: 2, name: 'Warehouse Services', nameAr: 'خدمات التخزين', customer: 'Saudi Logistics Co.', customerAr: 'الشركة السعودية للخدمات اللوجستية', value: 320000, probability: 60, stage: 'proposal', source: 'Website', sourceAr: 'الموقع', expectedClose: '2024-03-15', assignedTo: 'Sara Mohammed', assignedToAr: 'سارة محمد', createdAt: '2024-01-15' },
  { id: 3, name: 'Customs Clearance Deal', nameAr: 'صفقة التخليص الجمركي', customer: 'Global Import Export', customerAr: 'الاستيراد والتصدير العالمية', value: 150000, probability: 40, stage: 'qualified', source: 'Trade Show', sourceAr: 'معرض تجاري', expectedClose: '2024-04-01', assignedTo: 'Khalid Hassan', assignedToAr: 'خالد حسن', createdAt: '2024-01-18' },
  { id: 4, name: 'Annual Shipping Contract', nameAr: 'عقد الشحن السنوي', customer: 'Premium Shipping LLC', customerAr: 'الشحن المتميز ذ.م.م', value: 850000, probability: 90, stage: 'won', source: 'Existing Customer', sourceAr: 'عميل حالي', expectedClose: '2024-01-20', assignedTo: 'Ahmed Ali', assignedToAr: 'أحمد علي', createdAt: '2024-01-05' },
  { id: 5, name: 'Transport Services', nameAr: 'خدمات النقل', customer: 'Eastern Transport', customerAr: 'النقل الشرقي', value: 180000, probability: 20, stage: 'lead', source: 'Cold Call', sourceAr: 'اتصال بارد', expectedClose: '2024-05-01', assignedTo: 'Sara Mohammed', assignedToAr: 'سارة محمد', createdAt: '2024-01-22' },
  { id: 6, name: 'Distribution Partnership', nameAr: 'شراكة التوزيع', customer: 'Fast Distribution', customerAr: 'التوزيع السريع', value: 420000, probability: 0, stage: 'lost', source: 'Referral', sourceAr: 'إحالة', expectedClose: '2024-01-25', assignedTo: 'Khalid Hassan', assignedToAr: 'خالد حسن', createdAt: '2024-01-08' },
];

export default function OpportunitiesPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const [opportunities] = useState<Opportunity[]>(mockOpportunities);
  const [selectedStage, setSelectedStage] = useState('all');
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredOpportunities = opportunities.filter(opp => selectedStage === 'all' || opp.stage === selectedStage);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency: 'SAR' }).format(amount);
  };

  const getStageBadge = (stage: string) => {
    const styles: Record<string, string> = {
      lead: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      qualified: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      proposal: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      negotiation: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      won: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      lost: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    const labels: Record<string, { en: string; ar: string }> = {
      lead: { en: 'Lead', ar: 'عميل محتمل' },
      qualified: { en: 'Qualified', ar: 'مؤهل' },
      proposal: { en: 'Proposal', ar: 'عرض سعر' },
      negotiation: { en: 'Negotiation', ar: 'تفاوض' },
      won: { en: 'Won', ar: 'فوز' },
      lost: { en: 'Lost', ar: 'خسارة' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[stage])}>
        {locale === 'ar' ? labels[stage]?.ar : labels[stage]?.en}
      </span>
    );
  };

  const totalValue = opportunities.filter(o => !['lost'].includes(o.stage)).reduce((sum, o) => sum + o.value, 0);
  const weightedValue = opportunities.filter(o => !['won', 'lost'].includes(o.stage)).reduce((sum, o) => sum + (o.value * o.probability / 100), 0);
  const wonValue = opportunities.filter(o => o.stage === 'won').reduce((sum, o) => sum + o.value, 0);
  const activeOpps = opportunities.filter(o => !['won', 'lost'].includes(o.stage)).length;

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'الفرص البيعية - SLMS' : 'Sales Opportunities - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <SparklesIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'الفرص البيعية' : 'Sales Opportunities'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'إدارة الفرص ومسار المبيعات' : 'Manage opportunities and sales pipeline'}
              </p>
            </div>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-4 w-4 mr-1" />
            {locale === 'ar' ? 'فرصة جديدة' : 'New Opportunity'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600"><CurrencyDollarIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي الفرص' : 'Total Pipeline'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600"><ChartBarIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'القيمة المرجحة' : 'Weighted Value'}</p>
                <p className="text-xl font-semibold text-purple-600">{formatCurrency(weightedValue)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600"><CheckCircleIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الفرص المكسوبة' : 'Won'}</p>
                <p className="text-xl font-semibold text-green-600">{formatCurrency(wonValue)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600"><SparklesIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الفرص النشطة' : 'Active'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{activeOpps}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <select value={selectedStage} onChange={(e) => setSelectedStage(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="all">{locale === 'ar' ? 'كل المراحل' : 'All Stages'}</option>
              <option value="lead">{locale === 'ar' ? 'عميل محتمل' : 'Lead'}</option>
              <option value="qualified">{locale === 'ar' ? 'مؤهل' : 'Qualified'}</option>
              <option value="proposal">{locale === 'ar' ? 'عرض سعر' : 'Proposal'}</option>
              <option value="negotiation">{locale === 'ar' ? 'تفاوض' : 'Negotiation'}</option>
              <option value="won">{locale === 'ar' ? 'فوز' : 'Won'}</option>
              <option value="lost">{locale === 'ar' ? 'خسارة' : 'Lost'}</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الفرصة' : 'Opportunity'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'العميل' : 'Customer'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'القيمة' : 'Value'}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الاحتمالية' : 'Probability'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المرحلة' : 'Stage'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الإغلاق المتوقع' : 'Expected Close'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredOpportunities.map((opp) => (
                  <tr key={opp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? opp.nameAr : opp.name}</span>
                      <p className="text-xs text-gray-500">{locale === 'ar' ? opp.sourceAr : opp.source}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? opp.customerAr : opp.customer}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(opp.value)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div className={clsx('h-full rounded-full', opp.probability >= 70 ? 'bg-green-500' : opp.probability >= 40 ? 'bg-yellow-500' : 'bg-red-500')} style={{ width: `${opp.probability}%` }}></div>
                        </div>
                        <span className="text-sm text-gray-500">{opp.probability}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{getStageBadge(opp.stage)}</td>
                    <td className="px-4 py-3 text-gray-500">{opp.expectedClose}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="secondary" onClick={() => setSelectedOpportunity(opp)}><EyeIcon className="h-4 w-4" /></Button>
                        <Button size="sm" variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تعديل...' : 'Edit...', 'info')}><PencilIcon className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal isOpen={!!selectedOpportunity} onClose={() => setSelectedOpportunity(null)} title={locale === 'ar' ? 'تفاصيل الفرصة' : 'Opportunity Details'} size="lg">
        {selectedOpportunity && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-white text-lg">{locale === 'ar' ? selectedOpportunity.nameAr : selectedOpportunity.name}</h3>
              {getStageBadge(selectedOpportunity.stage)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'العميل' : 'Customer'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selectedOpportunity.customerAr : selectedOpportunity.customer}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'القيمة' : 'Value'}</p>
                <p className="font-medium text-green-600">{formatCurrency(selectedOpportunity.value)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الاحتمالية' : 'Probability'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedOpportunity.probability}%</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الإغلاق المتوقع' : 'Expected Close'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedOpportunity.expectedClose}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المصدر' : 'Source'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selectedOpportunity.sourceAr : selectedOpportunity.source}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المسؤول' : 'Assigned To'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selectedOpportunity.assignedToAr : selectedOpportunity.assignedTo}</p>
              </div>
            </div>
            <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
              <Button onClick={() => showToast(locale === 'ar' ? 'تم الفوز' : 'Won', 'success')}><CheckCircleIcon className="h-4 w-4 mr-1" />{locale === 'ar' ? 'فوز' : 'Won'}</Button>
              <Button variant="danger" onClick={() => showToast(locale === 'ar' ? 'تم الإغلاق' : 'Lost', 'error')}><XCircleIcon className="h-4 w-4 mr-1" />{locale === 'ar' ? 'خسارة' : 'Lost'}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title={locale === 'ar' ? 'فرصة جديدة' : 'New Opportunity'}>
        <div className="space-y-4">
          <p className="text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'نموذج إنشاء فرصة بيعية جديدة' : 'Create new sales opportunity form'}</p>
          <div className="flex gap-2 pt-4">
            <Button onClick={() => { setShowCreateModal(false); showToast(locale === 'ar' ? 'تم الحفظ' : 'Saved', 'success'); }}>{locale === 'ar' ? 'حفظ' : 'Save'}</Button>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
