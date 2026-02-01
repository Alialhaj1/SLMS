import { useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import {
  CalendarDaysIcon,
  PlusIcon,
  EyeIcon,
  TruckIcon,
  ClockIcon,
  MapPinIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface ShippingSchedule {
  id: number;
  scheduleId: string;
  carrier: string;
  carrierAr: string;
  vessel: string;
  voyage: string;
  origin: string;
  destination: string;
  departureDate: string;
  arrivalDate: string;
  status: 'scheduled' | 'departed' | 'in-transit' | 'arrived' | 'delayed' | 'cancelled';
  transitDays: number;
  bookings: number;
}

const mockSchedules: ShippingSchedule[] = [
  { id: 1, scheduleId: 'SCH-2024-001', carrier: 'Maersk Line', carrierAr: 'ميرسك لاين', vessel: 'Maersk Sealand', voyage: 'V001E', origin: 'Shanghai', destination: 'Jeddah', departureDate: '2024-02-01', arrivalDate: '2024-02-18', status: 'scheduled', transitDays: 17, bookings: 12 },
  { id: 2, scheduleId: 'SCH-2024-002', carrier: 'MSC', carrierAr: 'MSC للشحن', vessel: 'MSC Oscar', voyage: 'V125W', origin: 'Rotterdam', destination: 'Dammam', departureDate: '2024-01-28', arrivalDate: '2024-02-15', status: 'in-transit', transitDays: 18, bookings: 8 },
  { id: 3, scheduleId: 'SCH-2024-003', carrier: 'Hapag-Lloyd', carrierAr: 'هاباج لويد', vessel: 'Hapag Express', voyage: 'H045E', origin: 'Hamburg', destination: 'Riyadh', departureDate: '2024-01-25', arrivalDate: '2024-02-12', status: 'delayed', transitDays: 20, bookings: 5 },
  { id: 4, scheduleId: 'SCH-2024-004', carrier: 'CMA CGM', carrierAr: 'CMA CGM', vessel: 'CMA CGM Marco Polo', voyage: 'C789N', origin: 'Singapore', destination: 'Jeddah', departureDate: '2024-01-20', arrivalDate: '2024-02-05', status: 'arrived', transitDays: 16, bookings: 15 },
  { id: 5, scheduleId: 'SCH-2024-005', carrier: 'Evergreen', carrierAr: 'إيفرجرين', vessel: 'Ever Given', voyage: 'E202W', origin: 'Busan', destination: 'Dammam', departureDate: '2024-02-05', arrivalDate: '2024-02-22', status: 'scheduled', transitDays: 17, bookings: 3 },
];

export default function ShippingSchedulesPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const [schedules] = useState<ShippingSchedule[]>(mockSchedules);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedSchedule, setSelectedSchedule] = useState<ShippingSchedule | null>(null);

  const filteredSchedules = schedules.filter(s => selectedStatus === 'all' || s.status === selectedStatus);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      departed: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      'in-transit': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      arrived: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      delayed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    const labels: Record<string, { en: string; ar: string }> = {
      scheduled: { en: 'Scheduled', ar: 'مجدول' },
      departed: { en: 'Departed', ar: 'غادر' },
      'in-transit': { en: 'In Transit', ar: 'في الطريق' },
      arrived: { en: 'Arrived', ar: 'وصل' },
      delayed: { en: 'Delayed', ar: 'متأخر' },
      cancelled: { en: 'Cancelled', ar: 'ملغي' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status]?.ar : labels[status]?.en}
      </span>
    );
  };

  const totalSchedules = schedules.length;
  const inTransit = schedules.filter(s => s.status === 'in-transit').length;
  const delayed = schedules.filter(s => s.status === 'delayed').length;
  const totalBookings = schedules.reduce((sum, s) => sum + s.bookings, 0);

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'جداول الشحن - SLMS' : 'Shipping Schedules - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <CalendarDaysIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'جداول الشحن' : 'Shipping Schedules'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'جداول الرحلات البحرية والحجوزات' : 'Vessel schedules and bookings'}
              </p>
            </div>
          </div>
          <Button onClick={() => showToast(locale === 'ar' ? 'إضافة جدول...' : 'Add schedule...', 'info')}>
            <PlusIcon className="h-4 w-4 mr-1" />
            {locale === 'ar' ? 'جدول جديد' : 'New Schedule'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600"><CalendarDaysIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إجمالي الجداول' : 'Total Schedules'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{totalSchedules}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600"><TruckIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'في الطريق' : 'In Transit'}</p>
                <p className="text-xl font-semibold text-purple-600">{inTransit}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600"><ExclamationTriangleIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'متأخر' : 'Delayed'}</p>
                <p className="text-xl font-semibold text-yellow-600">{delayed}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600"><CheckCircleIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الحجوزات' : 'Bookings'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{totalBookings}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
              <option value="scheduled">{locale === 'ar' ? 'مجدول' : 'Scheduled'}</option>
              <option value="in-transit">{locale === 'ar' ? 'في الطريق' : 'In Transit'}</option>
              <option value="arrived">{locale === 'ar' ? 'وصل' : 'Arrived'}</option>
              <option value="delayed">{locale === 'ar' ? 'متأخر' : 'Delayed'}</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الرحلة' : 'Voyage'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الناقل / السفينة' : 'Carrier / Vessel'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المسار' : 'Route'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المغادرة' : 'Departure'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الوصول' : 'Arrival'}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الأيام' : 'Days'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredSchedules.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 dark:text-white">{schedule.voyage}</span>
                      <p className="text-xs text-gray-500">{schedule.scheduleId}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-900 dark:text-white">{locale === 'ar' ? schedule.carrierAr : schedule.carrier}</span>
                      <p className="text-xs text-gray-500">{schedule.vessel}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm">
                        <MapPinIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900 dark:text-white">{schedule.origin}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-gray-900 dark:text-white">{schedule.destination}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{schedule.departureDate}</td>
                    <td className="px-4 py-3 text-gray-500">{schedule.arrivalDate}</td>
                    <td className="px-4 py-3 text-center text-gray-900 dark:text-white">{schedule.transitDays}</td>
                    <td className="px-4 py-3">{getStatusBadge(schedule.status)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="secondary" onClick={() => setSelectedSchedule(schedule)}><EyeIcon className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal isOpen={!!selectedSchedule} onClose={() => setSelectedSchedule(null)} title={locale === 'ar' ? 'تفاصيل الجدول' : 'Schedule Details'} size="lg">
        {selectedSchedule && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-white text-lg">{selectedSchedule.voyage}</h3>
              {getStatusBadge(selectedSchedule.status)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الناقل' : 'Carrier'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selectedSchedule.carrierAr : selectedSchedule.carrier}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'السفينة' : 'Vessel'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedSchedule.vessel}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المغادرة' : 'Departure'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedSchedule.origin} - {selectedSchedule.departureDate}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الوصول' : 'Arrival'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedSchedule.destination} - {selectedSchedule.arrivalDate}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'مدة الترانزيت' : 'Transit Time'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedSchedule.transitDays} {locale === 'ar' ? 'يوم' : 'days'}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الحجوزات' : 'Bookings'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedSchedule.bookings}</p>
              </div>
            </div>
            <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
              <Button onClick={() => showToast(locale === 'ar' ? 'تم الحجز' : 'Booked', 'success')}>{locale === 'ar' ? 'حجز' : 'Book Now'}</Button>
              <Button variant="secondary" onClick={() => setSelectedSchedule(null)}>{locale === 'ar' ? 'إغلاق' : 'Close'}</Button>
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
