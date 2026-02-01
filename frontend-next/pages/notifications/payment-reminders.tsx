/**
 * 💰 Payment Reminders - تذكيرات الدفع
 * =====================================
 * إدارة تذكيرات الدفع والمستحقات
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  BellAlertIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PaperAirplaneIcon,
  CalendarDaysIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import clsx from 'clsx';

interface PaymentReminder {
  id: number;
  name: string;
  name_ar: string;
  trigger_type: 'before_due' | 'on_due' | 'after_due';
  days_offset: number;
  channels: ('email' | 'sms' | 'whatsapp')[];
  template_id?: number;
  is_active: boolean;
  last_triggered?: string;
  stats: {
    sent_today: number;
    sent_month: number;
  };
}

interface PendingPayment {
  id: number;
  invoice_number: string;
  customer_name: string;
  customer_name_ar: string;
  amount: number;
  due_date: string;
  days_overdue: number;
  status: 'upcoming' | 'due_today' | 'overdue';
  last_reminder?: string;
}

export default function PaymentRemindersPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'rules' | 'pending'>('rules');
  const [reminders, setReminders] = useState<PaymentReminder[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [selectedReminder, setSelectedReminder] = useState<PaymentReminder | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sending, setSending] = useState(false);

  const canManage = hasPermission('reminders:manage');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      setReminders([
        {
          id: 1, name: '7 Days Before Due', name_ar: 'قبل 7 أيام من الاستحقاق',
          trigger_type: 'before_due', days_offset: 7, channels: ['email'],
          is_active: true, last_triggered: '2024-01-15T09:00:00',
          stats: { sent_today: 5, sent_month: 120 }
        },
        {
          id: 2, name: '3 Days Before Due', name_ar: 'قبل 3 أيام من الاستحقاق',
          trigger_type: 'before_due', days_offset: 3, channels: ['email', 'sms'],
          is_active: true, last_triggered: '2024-01-15T09:00:00',
          stats: { sent_today: 8, sent_month: 180 }
        },
        {
          id: 3, name: 'On Due Date', name_ar: 'في يوم الاستحقاق',
          trigger_type: 'on_due', days_offset: 0, channels: ['email', 'sms', 'whatsapp'],
          is_active: true, last_triggered: '2024-01-15T09:00:00',
          stats: { sent_today: 12, sent_month: 250 }
        },
        {
          id: 4, name: '7 Days Overdue', name_ar: 'متأخر 7 أيام',
          trigger_type: 'after_due', days_offset: 7, channels: ['email', 'sms'],
          is_active: true, last_triggered: '2024-01-14T09:00:00',
          stats: { sent_today: 3, sent_month: 45 }
        },
      ]);

      setPendingPayments([
        {
          id: 1, invoice_number: 'INV-2024-001', customer_name: 'ABC Trading Co.',
          customer_name_ar: 'شركة أ ب ج للتجارة', amount: 15000, due_date: '2024-01-20',
          days_overdue: -5, status: 'upcoming', last_reminder: '2024-01-13'
        },
        {
          id: 2, invoice_number: 'INV-2024-002', customer_name: 'XYZ Logistics',
          customer_name_ar: 'إكس واي زد للخدمات', amount: 8500, due_date: '2024-01-15',
          days_overdue: 0, status: 'due_today'
        },
        {
          id: 3, invoice_number: 'INV-2023-150', customer_name: 'Global Imports',
          customer_name_ar: 'الاستيراد العالمي', amount: 25000, due_date: '2024-01-08',
          days_overdue: 7, status: 'overdue', last_reminder: '2024-01-14'
        },
        {
          id: 4, invoice_number: 'INV-2023-148', customer_name: 'Saudi Supplies',
          customer_name_ar: 'التوريدات السعودية', amount: 12300, due_date: '2024-01-01',
          days_overdue: 14, status: 'overdue', last_reminder: '2024-01-12'
        },
      ]);
    } catch (error) {
      showToast(t('common.fetchError') || 'Failed to fetch', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReminder = async () => {
    if (!selectedReminder) return;
    try {
      if (selectedReminder.id === 0) {
        setReminders(prev => [...prev, { ...selectedReminder, id: Date.now(), stats: { sent_today: 0, sent_month: 0 } }]);
      } else {
        setReminders(prev => prev.map(r => r.id === selectedReminder.id ? selectedReminder : r));
      }
      showToast(t('common.saveSuccess') || 'Saved', 'success');
      setIsModalOpen(false);
    } catch (error) {
      showToast(t('common.error') || 'Error', 'error');
    }
  };

  const handleDeleteReminder = async () => {
    if (!selectedReminder) return;
    try {
      setReminders(prev => prev.filter(r => r.id !== selectedReminder.id));
      showToast(t('common.deleteSuccess') || 'Deleted', 'success');
    } catch (error) {
      showToast(t('common.error') || 'Error', 'error');
    } finally {
      setConfirmDelete(false);
      setSelectedReminder(null);
    }
  };

  const handleSendReminder = async (paymentId: number) => {
    setSending(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setPendingPayments(prev => prev.map(p => 
        p.id === paymentId ? { ...p, last_reminder: new Date().toISOString() } : p
      ));
      showToast('Reminder sent successfully', 'success');
    } catch (error) {
      showToast('Failed to send reminder', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleToggleActive = (reminderId: number) => {
    setReminders(prev => prev.map(r => 
      r.id === reminderId ? { ...r, is_active: !r.is_active } : r
    ));
    showToast('Status updated', 'success');
  };

  const getTriggerLabel = (type: string, days: number) => {
    if (type === 'on_due') return locale === 'ar' ? 'في يوم الاستحقاق' : 'On due date';
    if (type === 'before_due') return locale === 'ar' ? `قبل ${days} أيام` : `${days} days before`;
    return locale === 'ar' ? `بعد ${days} أيام` : `${days} days after`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'due_today': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalOverdue = pendingPayments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0);
  const totalUpcoming = pendingPayments.filter(p => p.status !== 'overdue').reduce((sum, p) => sum + p.amount, 0);

  return (
    <MainLayout>
      <Head>
        <title>{t('reminders.title') || 'Payment Reminders'} | SLMS</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <BellAlertIcon className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {t('reminders.title') || 'Payment Reminders'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('reminders.subtitle') || 'Manage payment reminder rules and pending payments'}
              </p>
            </div>
          </div>
          
          {activeTab === 'rules' && (
            <Button onClick={() => {
              setSelectedReminder({
                id: 0, name: '', name_ar: '', trigger_type: 'before_due', days_offset: 7,
                channels: ['email'], is_active: true, stats: { sent_today: 0, sent_month: 0 }
              });
              setIsModalOpen(true);
            }} disabled={!canManage}>
              <PlusIcon className="w-5 h-5 me-2" />
              {t('reminders.addRule') || 'Add Rule'}
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-red-600">
              <XCircleIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{pendingPayments.filter(p => p.status === 'overdue').length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Overdue Invoices</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-red-600">
              <CurrencyDollarIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{(totalOverdue / 1000).toFixed(0)}K</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Overdue Amount (SAR)</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-blue-600">
              <ClockIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{pendingPayments.filter(p => p.status !== 'overdue').length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Upcoming Due</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-green-600">
              <PaperAirplaneIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{reminders.reduce((sum, r) => sum + r.stats.sent_today, 0)}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Sent Today</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              <button onClick={() => setActiveTab('rules')}
                className={clsx('px-6 py-4 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'rules' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500')}>
                <Cog6ToothIcon className="w-5 h-5 inline-block me-2" />
                Reminder Rules
              </button>
              <button onClick={() => setActiveTab('pending')}
                className={clsx('px-6 py-4 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'pending' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500')}>
                <CurrencyDollarIcon className="w-5 h-5 inline-block me-2" />
                Pending Payments
                <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">
                  {pendingPayments.filter(p => p.status === 'overdue').length}
                </span>
              </button>
            </nav>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            ) : (
              <>
                {activeTab === 'rules' && (
                  <div className="space-y-4">
                    {reminders.map((reminder) => (
                      <div key={reminder.id} className={clsx(
                        'border rounded-lg p-4 transition-all',
                        reminder.is_active ? 'border-gray-200 dark:border-gray-700' : 'border-gray-100 dark:border-gray-800 opacity-60'
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={clsx(
                              'w-12 h-12 rounded-lg flex items-center justify-center',
                              reminder.trigger_type === 'before_due' ? 'bg-blue-100 dark:bg-blue-900/30' :
                              reminder.trigger_type === 'on_due' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                              'bg-red-100 dark:bg-red-900/30'
                            )}>
                              <ClockIcon className={clsx('w-6 h-6',
                                reminder.trigger_type === 'before_due' ? 'text-blue-600' :
                                reminder.trigger_type === 'on_due' ? 'text-yellow-600' : 'text-red-600'
                              )} />
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900 dark:text-white">
                                {locale === 'ar' ? reminder.name_ar : reminder.name}
                              </h3>
                              <p className="text-sm text-gray-500">
                                {getTriggerLabel(reminder.trigger_type, reminder.days_offset)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="flex gap-1">
                              {reminder.channels.map((ch) => (
                                <span key={ch} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-xs rounded">
                                  {ch}
                                </span>
                              ))}
                            </div>
                            
                            <div className="text-center">
                              <p className="text-lg font-bold text-gray-900 dark:text-white">{reminder.stats.sent_month}</p>
                              <p className="text-xs text-gray-500">This Month</p>
                            </div>
                            
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" checked={reminder.is_active}
                                onChange={() => handleToggleActive(reminder.id)}
                                disabled={!canManage} className="sr-only peer" />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                            </label>
                            
                            <div className="flex gap-1">
                              <button onClick={() => { setSelectedReminder(reminder); setIsModalOpen(true); }}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                <PencilIcon className="w-4 h-4 text-blue-600" />
                              </button>
                              <button onClick={() => { setSelectedReminder(reminder); setConfirmDelete(true); }}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                <TrashIcon className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'pending' && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Invoice</th>
                          <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Customer</th>
                          <th className="px-4 py-3 text-end text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Due Date</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Last Reminder</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {pendingPayments.map((payment) => (
                          <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-3">
                              <span className="font-mono text-sm text-blue-600">{payment.invoice_number}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <UserIcon className="w-4 h-4 text-gray-400" />
                                <span className="text-sm">
                                  {locale === 'ar' ? payment.customer_name_ar : payment.customer_name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-end font-medium">
                              {payment.amount.toLocaleString()} SAR
                            </td>
                            <td className="px-4 py-3 text-center text-sm">
                              {payment.due_date}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', getStatusBadge(payment.status))}>
                                {payment.status === 'overdue' ? `${payment.days_overdue} days overdue` :
                                 payment.status === 'due_today' ? 'Due Today' : `Due in ${Math.abs(payment.days_overdue)} days`}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-gray-500">
                              {payment.last_reminder ? new Date(payment.last_reminder).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Button size="sm" variant="secondary" onClick={() => handleSendReminder(payment.id)}
                                loading={sending} disabled={!canManage}>
                                <PaperAirplaneIcon className="w-4 h-4 me-1" />
                                Send
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={selectedReminder?.id ? 'Edit Reminder Rule' : 'New Reminder Rule'} size="md">
        {selectedReminder && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Name (EN)" value={selectedReminder.name}
                onChange={(e) => setSelectedReminder({ ...selectedReminder, name: e.target.value })} />
              <Input label="Name (AR)" value={selectedReminder.name_ar} dir="rtl"
                onChange={(e) => setSelectedReminder({ ...selectedReminder, name_ar: e.target.value })} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Trigger Type</label>
                <select value={selectedReminder.trigger_type}
                  onChange={(e) => setSelectedReminder({ ...selectedReminder, trigger_type: e.target.value as any })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <option value="before_due">Before Due Date</option>
                  <option value="on_due">On Due Date</option>
                  <option value="after_due">After Due Date</option>
                </select>
              </div>
              {selectedReminder.trigger_type !== 'on_due' && (
                <Input label="Days" type="number" min="1" value={selectedReminder.days_offset}
                  onChange={(e) => setSelectedReminder({ ...selectedReminder, days_offset: parseInt(e.target.value) || 1 })} />
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Channels</label>
              <div className="flex gap-3">
                {['email', 'sms', 'whatsapp'].map((ch) => (
                  <label key={ch} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={selectedReminder.channels.includes(ch as any)}
                      onChange={(e) => {
                        const channels = e.target.checked 
                          ? [...selectedReminder.channels, ch as any]
                          : selectedReminder.channels.filter(c => c !== ch);
                        setSelectedReminder({ ...selectedReminder, channels });
                      }}
                      className="w-4 h-4 text-yellow-600 rounded" />
                    <span className="capitalize">{ch}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={selectedReminder.is_active}
                onChange={(e) => setSelectedReminder({ ...selectedReminder, is_active: e.target.checked })}
                className="w-5 h-5 text-yellow-600 rounded" />
              <label>Active</label>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveReminder}>Save</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={confirmDelete} onClose={() => setConfirmDelete(false)}
        onConfirm={handleDeleteReminder} title="Delete Reminder Rule"
        message="Are you sure you want to delete this reminder rule?" confirmText="Delete" variant="danger" />
    </MainLayout>
  );
}

const Cog6ToothIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.759 6.759 0 0 1 0 .255c-.008.378.137.75.43.99l1.004.828c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);
