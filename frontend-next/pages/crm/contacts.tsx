import { useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import {
  UserGroupIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PhoneIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  StarIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import clsx from 'clsx';

interface Contact {
  id: number;
  name: string;
  nameAr: string;
  email: string;
  phone: string;
  company: string;
  companyAr: string;
  position: string;
  positionAr: string;
  type: 'customer' | 'supplier' | 'partner' | 'agent';
  status: 'active' | 'inactive';
  isFavorite: boolean;
  lastContact: string;
}

const mockContacts: Contact[] = [
  { id: 1, name: 'Ahmed Al-Rashid', nameAr: 'أحمد الراشد', email: 'ahmed@abc-logistics.com', phone: '+966 50 123 4567', company: 'ABC Logistics', companyAr: 'ABC للخدمات اللوجستية', position: 'Sales Manager', positionAr: 'مدير المبيعات', type: 'customer', status: 'active', isFavorite: true, lastContact: '2024-01-25' },
  { id: 2, name: 'Sarah Mohammed', nameAr: 'سارة محمد', email: 'sarah@xyz-equipment.com', phone: '+966 55 234 5678', company: 'XYZ Equipment', companyAr: 'XYZ للمعدات', position: 'Procurement Head', positionAr: 'رئيس المشتريات', type: 'supplier', status: 'active', isFavorite: false, lastContact: '2024-01-20' },
  { id: 3, name: 'Khalid Hassan', nameAr: 'خالد حسن', email: 'khalid@global-supplies.com', phone: '+966 54 345 6789', company: 'Global Supplies', companyAr: 'المستلزمات العالمية', position: 'Account Executive', positionAr: 'مسؤول الحسابات', type: 'customer', status: 'active', isFavorite: true, lastContact: '2024-01-22' },
  { id: 4, name: 'Fatima Ali', nameAr: 'فاطمة علي', email: 'fatima@shipping-co.com', phone: '+966 56 456 7890', company: 'Premium Shipping', companyAr: 'الشحن المتميز', position: 'Operations Director', positionAr: 'مدير العمليات', type: 'partner', status: 'active', isFavorite: false, lastContact: '2024-01-18' },
  { id: 5, name: 'Omar Youssef', nameAr: 'عمر يوسف', email: 'omar@customs-agent.com', phone: '+966 53 567 8901', company: 'Fast Customs', companyAr: 'التخليص السريع', position: 'Customs Specialist', positionAr: 'أخصائي جمارك', type: 'agent', status: 'inactive', isFavorite: false, lastContact: '2024-01-10' },
];

export default function ContactsPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>(mockContacts);
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredContacts = contacts.filter(contact => {
    const matchesType = selectedType === 'all' || contact.type === selectedType;
    const matchesSearch = contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.nameAr.includes(searchQuery) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.company.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const toggleFavorite = (id: number) => {
    setContacts(contacts.map(c => c.id === id ? { ...c, isFavorite: !c.isFavorite } : c));
    showToast(locale === 'ar' ? 'تم تحديث المفضلة' : 'Favorites updated', 'success');
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      customer: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      supplier: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      partner: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      agent: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    };
    const labels: Record<string, { en: string; ar: string }> = {
      customer: { en: 'Customer', ar: 'عميل' },
      supplier: { en: 'Supplier', ar: 'مورد' },
      partner: { en: 'Partner', ar: 'شريك' },
      agent: { en: 'Agent', ar: 'وكيل' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[type])}>
        {locale === 'ar' ? labels[type]?.ar : labels[type]?.en}
      </span>
    );
  };

  const totalContacts = contacts.length;
  const activeContacts = contacts.filter(c => c.status === 'active').length;
  const favoriteContacts = contacts.filter(c => c.isFavorite).length;

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'جهات الاتصال - SLMS' : 'Contacts - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <UserGroupIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'جهات الاتصال' : 'Contacts'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'إدارة جهات الاتصال والعملاء' : 'Manage contacts and customers'}
              </p>
            </div>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-4 w-4 mr-1" />
            {locale === 'ar' ? 'جهة اتصال جديدة' : 'New Contact'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600"><UserGroupIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي جهات الاتصال' : 'Total Contacts'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{totalContacts}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600"><BuildingOfficeIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'نشط' : 'Active'}</p>
                <p className="text-xl font-semibold text-green-600">{activeContacts}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600"><StarIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'المفضلة' : 'Favorites'}</p>
                <p className="text-xl font-semibold text-yellow-600">{favoriteContacts}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600"><BuildingOfficeIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الشركات' : 'Companies'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{new Set(contacts.map(c => c.company)).size}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={locale === 'ar' ? 'بحث...' : 'Search...'}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="all">{locale === 'ar' ? 'كل الأنواع' : 'All Types'}</option>
              <option value="customer">{locale === 'ar' ? 'عميل' : 'Customer'}</option>
              <option value="supplier">{locale === 'ar' ? 'مورد' : 'Supplier'}</option>
              <option value="partner">{locale === 'ar' ? 'شريك' : 'Partner'}</option>
              <option value="agent">{locale === 'ar' ? 'وكيل' : 'Agent'}</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-10"></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الاسم' : 'Name'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الشركة' : 'Company'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الاتصال' : 'Contact'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <button onClick={() => toggleFavorite(contact.id)} className="text-gray-400 hover:text-yellow-500">
                        {contact.isFavorite ? <StarIconSolid className="h-5 w-5 text-yellow-500" /> : <StarIcon className="h-5 w-5" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? contact.nameAr : contact.name}</span>
                      <p className="text-xs text-gray-500">{locale === 'ar' ? contact.positionAr : contact.position}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? contact.companyAr : contact.company}</td>
                    <td className="px-4 py-3">{getTypeBadge(contact.type)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-gray-500 flex items-center gap-1"><EnvelopeIcon className="h-4 w-4" />{contact.email}</span>
                        <span className="text-sm text-gray-500 flex items-center gap-1"><PhoneIcon className="h-4 w-4" />{contact.phone}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="secondary" onClick={() => setSelectedContact(contact)}><EyeIcon className="h-4 w-4" /></Button>
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
      <Modal isOpen={!!selectedContact} onClose={() => setSelectedContact(null)} title={locale === 'ar' ? 'تفاصيل جهة الاتصال' : 'Contact Details'} size="lg">
        {selectedContact && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-white text-lg">{locale === 'ar' ? selectedContact.nameAr : selectedContact.name}</h3>
              {getTypeBadge(selectedContact.type)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الشركة' : 'Company'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selectedContact.companyAr : selectedContact.company}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المنصب' : 'Position'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selectedContact.positionAr : selectedContact.position}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'البريد الإلكتروني' : 'Email'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedContact.email}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الهاتف' : 'Phone'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedContact.phone}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'آخر تواصل' : 'Last Contact'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedContact.lastContact}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الحالة' : 'Status'}</p>
                <p className={clsx('font-medium', selectedContact.status === 'active' ? 'text-green-600' : 'text-gray-500')}>{selectedContact.status === 'active' ? (locale === 'ar' ? 'نشط' : 'Active') : (locale === 'ar' ? 'غير نشط' : 'Inactive')}</p>
              </div>
            </div>
            <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
              <Button onClick={() => showToast(locale === 'ar' ? 'جاري الاتصال...' : 'Calling...', 'info')}><PhoneIcon className="h-4 w-4 mr-1" />{locale === 'ar' ? 'اتصال' : 'Call'}</Button>
              <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'جاري إرسال البريد...' : 'Sending email...', 'info')}><EnvelopeIcon className="h-4 w-4 mr-1" />{locale === 'ar' ? 'بريد' : 'Email'}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title={locale === 'ar' ? 'جهة اتصال جديدة' : 'New Contact'}>
        <div className="space-y-4">
          <p className="text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'نموذج إنشاء جهة اتصال جديدة' : 'Create new contact form'}</p>
          <div className="flex gap-2 pt-4">
            <Button onClick={() => { setShowCreateModal(false); showToast(locale === 'ar' ? 'تم الحفظ' : 'Saved', 'success'); }}>{locale === 'ar' ? 'حفظ' : 'Save'}</Button>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
