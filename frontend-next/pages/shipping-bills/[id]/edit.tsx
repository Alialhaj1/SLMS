/**
 * ===============================================
 * Edit Shipping Bill Page
 * ===============================================
 * Enterprise-grade edit form for shipping documents
 */

import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../../components/layout/MainLayout';
import { withPermission } from '../../../utils/withPermission';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Card from '../../../components/ui/Card';
import { usePermissions } from '../../../hooks/usePermissions';
import { useTranslation } from '../../../hooks/useTranslation';
import { useToast } from '../../../contexts/ToastContext';
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  TruckIcon,
  MapPinIcon,
  CubeIcon,
  CalendarIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';

interface BillType {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  category: string;
}

interface ShippingAgent {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
}

interface Port {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
}

interface Shipment {
  id: number;
  shipment_number: string;
}

interface Project {
  id: number;
  code: string;
  name: string;
}

interface FormData {
  bill_number: string;
  bill_type_id: string;
  booking_number: string;
  bill_date: string;
  shipment_id: string;
  project_id: string;
  carrier_id: string;
  carrier_name: string;
  vessel_name: string;
  voyage_number: string;
  port_of_loading_id: string;
  port_of_loading_text: string;
  port_of_discharge_id: string;
  port_of_discharge_text: string;
  place_of_delivery: string;
  containers_count: string;
  container_type: string;
  container_numbers: string;
  cargo_description: string;
  gross_weight: string;
  gross_weight_unit: string;
  net_weight: string;
  volume: string;
  volume_unit: string;
  packages_count: string;
  package_type: string;
  shipped_on_board_date: string;
  eta_date: string;
  ata_date: string;
  tracking_url: string;
  tracking_number: string;
  status: string;
  is_original: boolean;
  is_freight_prepaid: boolean;
  freight_terms: string;
  notes: string;
  internal_notes: string;
}

const containerTypes = ['20GP', '40GP', '40HC', '20RF', '40RF', '20OT', '40OT', 'FLAT', 'TANK', 'LCL'];

const freightTermsOptions = [
  { value: 'Prepaid', label: { en: 'Prepaid', ar: 'مسبق الدفع' } },
  { value: 'Collect', label: { en: 'Collect', ar: 'عند الاستلام' } },
  { value: 'Third Party', label: { en: 'Third Party', ar: 'طرف ثالث' } },
];

function EditShippingBillPage() {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { t, locale } = useTranslation();
  const router = useRouter();
  const { id } = router.query;
  const isArabic = locale === 'ar';

  const [formData, setFormData] = useState<FormData | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Reference data
  const [billTypes, setBillTypes] = useState<BillType[]>([]);
  const [carriers, setCarriers] = useState<ShippingAgent[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (id) {
      fetchBill();
      fetchReferenceData();
    }
  }, [id]);

  const fetchBill = async () => {
    setFetching(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/shipping-bills/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const result = await res.json();
        const bill = result.data;

        // Map to form data
        setFormData({
          bill_number: bill.bill_number || '',
          bill_type_id: bill.bill_type_id?.toString() || '',
          booking_number: bill.booking_number || '',
          bill_date: bill.bill_date ? bill.bill_date.split('T')[0] : '',
          shipment_id: bill.shipment_id?.toString() || '',
          project_id: bill.project_id?.toString() || '',
          carrier_id: bill.carrier_id?.toString() || '',
          carrier_name: bill.carrier_name || '',
          vessel_name: bill.vessel_name || '',
          voyage_number: bill.voyage_number || '',
          port_of_loading_id: bill.port_of_loading_id?.toString() || '',
          port_of_loading_text: bill.port_of_loading_text || '',
          port_of_discharge_id: bill.port_of_discharge_id?.toString() || '',
          port_of_discharge_text: bill.port_of_discharge_text || '',
          place_of_delivery: bill.place_of_delivery || '',
          containers_count: bill.containers_count?.toString() || '0',
          container_type: bill.container_type || '',
          container_numbers: Array.isArray(bill.container_numbers) ? bill.container_numbers.join('\n') : '',
          cargo_description: bill.cargo_description || '',
          gross_weight: bill.gross_weight?.toString() || '',
          gross_weight_unit: bill.gross_weight_unit || 'KG',
          net_weight: bill.net_weight?.toString() || '',
          volume: bill.volume?.toString() || '',
          volume_unit: bill.volume_unit || 'CBM',
          packages_count: bill.packages_count?.toString() || '',
          package_type: bill.package_type || '',
          shipped_on_board_date: bill.shipped_on_board_date ? bill.shipped_on_board_date.split('T')[0] : '',
          eta_date: bill.eta_date ? bill.eta_date.split('T')[0] : '',
          ata_date: bill.ata_date ? bill.ata_date.split('T')[0] : '',
          tracking_url: bill.tracking_url || '',
          tracking_number: bill.tracking_number || '',
          status: bill.status || 'draft',
          is_original: bill.is_original ?? true,
          is_freight_prepaid: bill.is_freight_prepaid ?? true,
          freight_terms: bill.freight_terms || 'Prepaid',
          notes: bill.notes || '',
          internal_notes: bill.internal_notes || '',
        });
      } else if (res.status === 404) {
        showToast(isArabic ? 'البوليصة غير موجودة' : 'Shipping bill not found', 'error');
        router.push('/shipping-bills');
      } else {
        showToast(isArabic ? 'فشل تحميل البيانات' : 'Failed to load data', 'error');
      }
    } catch (error) {
      showToast(isArabic ? 'حدث خطأ' : 'An error occurred', 'error');
    } finally {
      setFetching(false);
    }
  };

  const fetchReferenceData = async () => {
    const token = localStorage.getItem('accessToken');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [billTypesRes, carriersRes, portsRes, shipmentsRes, projectsRes] = await Promise.all([
        fetch('http://localhost:4000/api/bill-types', { headers }),
        fetch('http://localhost:4000/api/shipping-agents', { headers }),
        fetch('http://localhost:4000/api/ports', { headers }),
        fetch('http://localhost:4000/api/logistics-shipments?limit=100', { headers }),
        fetch('http://localhost:4000/api/projects?limit=100', { headers }),
      ]);

      if (billTypesRes.ok) {
        const data = await billTypesRes.json();
        setBillTypes(data.data || []);
      }

      if (carriersRes.ok) {
        const data = await carriersRes.json();
        setCarriers(data.data || []);
      }

      if (portsRes.ok) {
        const data = await portsRes.json();
        setPorts(data.data || []);
      }

      if (shipmentsRes.ok) {
        const data = await shipmentsRes.json();
        setShipments(data.data || []);
      }

      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setProjects(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch reference data:', error);
    }
  };

  const validateForm = (): boolean => {
    if (!formData) return false;
    const newErrors: Record<string, string> = {};

    if (!formData.bill_number.trim()) {
      newErrors.bill_number = isArabic ? 'رقم البوليصة مطلوب' : 'Bill number is required';
    }

    if (!formData.bill_type_id) {
      newErrors.bill_type_id = isArabic ? 'نوع البوليصة مطلوب' : 'Bill type is required';
    }

    if (formData.tracking_url && !/^https?:\/\/.+/.test(formData.tracking_url)) {
      newErrors.tracking_url = isArabic ? 'رابط غير صالح' : 'Invalid URL format';
    }

    if (formData.gross_weight && parseFloat(formData.gross_weight) < 0) {
      newErrors.gross_weight = isArabic ? 'يجب أن يكون الوزن موجباً' : 'Weight must be positive';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    if (!validateForm()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');

      const payload = {
        bill_number: formData.bill_number,
        bill_type_id: parseInt(formData.bill_type_id),
        booking_number: formData.booking_number || null,
        bill_date: formData.bill_date || null,
        shipment_id: formData.shipment_id ? parseInt(formData.shipment_id) : null,
        project_id: formData.project_id ? parseInt(formData.project_id) : null,
        carrier_id: formData.carrier_id ? parseInt(formData.carrier_id) : null,
        carrier_name: formData.carrier_name || null,
        vessel_name: formData.vessel_name || null,
        voyage_number: formData.voyage_number || null,
        port_of_loading_id: formData.port_of_loading_id ? parseInt(formData.port_of_loading_id) : null,
        port_of_loading_text: formData.port_of_loading_text || null,
        port_of_discharge_id: formData.port_of_discharge_id ? parseInt(formData.port_of_discharge_id) : null,
        port_of_discharge_text: formData.port_of_discharge_text || null,
        place_of_delivery: formData.place_of_delivery || null,
        containers_count: parseInt(formData.containers_count) || 0,
        container_type: formData.container_type || null,
        container_numbers: formData.container_numbers
          ? formData.container_numbers.split('\n').map((n) => n.trim()).filter(Boolean)
          : null,
        cargo_description: formData.cargo_description || null,
        gross_weight: formData.gross_weight ? parseFloat(formData.gross_weight) : null,
        gross_weight_unit: formData.gross_weight_unit || 'KG',
        net_weight: formData.net_weight ? parseFloat(formData.net_weight) : null,
        volume: formData.volume ? parseFloat(formData.volume) : null,
        volume_unit: formData.volume_unit || 'CBM',
        packages_count: formData.packages_count ? parseInt(formData.packages_count) : null,
        package_type: formData.package_type || null,
        shipped_on_board_date: formData.shipped_on_board_date || null,
        eta_date: formData.eta_date || null,
        ata_date: formData.ata_date || null,
        tracking_url: formData.tracking_url || null,
        tracking_number: formData.tracking_number || null,
        status: formData.status,
        is_original: formData.is_original,
        is_freight_prepaid: formData.is_freight_prepaid,
        freight_terms: formData.freight_terms || null,
        notes: formData.notes || null,
        internal_notes: formData.internal_notes || null,
      };

      const res = await fetch(`http://localhost:4000/api/shipping-bills/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(
          isArabic ? 'تم تحديث البوليصة بنجاح' : 'Shipping bill updated successfully',
          'success'
        );
        router.push(`/shipping-bills/${id}`);
      } else if (res.status === 409) {
        setErrors({ bill_number: isArabic ? 'رقم البوليصة موجود مسبقاً' : 'Bill number already exists' });
      } else {
        const errorData = await res.json().catch(() => ({}));
        showToast(errorData.error || (isArabic ? 'فشل تحديث البوليصة' : 'Failed to update'), 'error');
      }
    } catch (error) {
      showToast(isArabic ? 'حدث خطأ' : 'An error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof FormData, value: any) => {
    if (!formData) return;
    setFormData((prev) => (prev ? { ...prev, [field]: value } : null));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (fetching) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </MainLayout>
    );
  }

  if (!formData) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <DocumentTextIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {isArabic ? 'البوليصة غير موجودة' : 'Shipping Bill Not Found'}
          </h2>
          <Button className="mt-4" onClick={() => router.push('/shipping-bills')}>
            {isArabic ? 'العودة للقائمة' : 'Back to List'}
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{isArabic ? 'تعديل بوليصة شحن' : 'Edit Shipping Bill'} - SLMS</title>
      </Head>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {isArabic ? 'تعديل بوليصة شحن' : 'Edit Shipping Bill'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {formData.bill_number}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" loading={loading}>
              {isArabic ? 'حفظ التعديلات' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Form Sections - Same as new.tsx */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <DocumentTextIcon className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {isArabic ? 'البيانات الأساسية' : 'Basic Information'}
              </h2>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={isArabic ? 'رقم البوليصة' : 'Bill Number'}
                  required
                  value={formData.bill_number}
                  onChange={(e) => updateField('bill_number', e.target.value)}
                  error={errors.bill_number}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isArabic ? 'نوع البوليصة' : 'Bill Type'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.bill_type_id}
                    onChange={(e) => updateField('bill_type_id', e.target.value)}
                    className={`input w-full ${errors.bill_type_id ? 'border-red-500' : ''}`}
                  >
                    <option value="">{isArabic ? 'اختر النوع' : 'Select type'}</option>
                    {billTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.code} - {isArabic && type.name_ar ? type.name_ar : type.name}
                      </option>
                    ))}
                  </select>
                  {errors.bill_type_id && (
                    <p className="text-red-500 text-xs mt-1">{errors.bill_type_id}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={isArabic ? 'رقم الحجز' : 'Booking Number'}
                  value={formData.booking_number}
                  onChange={(e) => updateField('booking_number', e.target.value)}
                />
                <Input
                  label={isArabic ? 'تاريخ البوليصة' : 'Bill Date'}
                  type="date"
                  value={formData.bill_date}
                  onChange={(e) => updateField('bill_date', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isArabic ? 'الشحنة المرتبطة' : 'Linked Shipment'}
                  </label>
                  <select
                    value={formData.shipment_id}
                    onChange={(e) => updateField('shipment_id', e.target.value)}
                    className="input w-full"
                  >
                    <option value="">{isArabic ? 'اختر الشحنة' : 'Select shipment'}</option>
                    {shipments.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.shipment_number}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isArabic ? 'المشروع' : 'Project'}
                  </label>
                  <select
                    value={formData.project_id}
                    onChange={(e) => updateField('project_id', e.target.value)}
                    className="input w-full"
                  >
                    <option value="">{isArabic ? 'اختر المشروع' : 'Select project'}</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_original"
                    checked={formData.is_original}
                    onChange={(e) => updateField('is_original', e.target.checked)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="is_original" className="text-sm text-gray-700 dark:text-gray-300">
                    {isArabic ? 'بوليصة أصلية' : 'Original B/L'}
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isArabic ? 'الحالة' : 'Status'}
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => updateField('status', e.target.value)}
                    className="input w-full"
                  >
                    <option value="draft">{isArabic ? 'مسودة' : 'Draft'}</option>
                    <option value="issued">{isArabic ? 'صادرة' : 'Issued'}</option>
                    <option value="shipped">{isArabic ? 'تم الشحن' : 'Shipped'}</option>
                    <option value="in_transit">{isArabic ? 'قيد النقل' : 'In Transit'}</option>
                    <option value="arrived">{isArabic ? 'وصلت' : 'Arrived'}</option>
                    <option value="delivered">{isArabic ? 'تم التسليم' : 'Delivered'}</option>
                    <option value="completed">{isArabic ? 'مكتملة' : 'Completed'}</option>
                    <option value="cancelled">{isArabic ? 'ملغاة' : 'Cancelled'}</option>
                  </select>
                </div>
              </div>
            </div>
          </Card>

          {/* Carrier / Vessel */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <TruckIcon className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {isArabic ? 'الناقل والسفينة' : 'Carrier & Vessel'}
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isArabic ? 'شركة الشحن' : 'Carrier/Shipping Agent'}
                </label>
                <select
                  value={formData.carrier_id}
                  onChange={(e) => updateField('carrier_id', e.target.value)}
                  className="input w-full"
                >
                  <option value="">{isArabic ? 'اختر الناقل' : 'Select carrier'}</option>
                  {carriers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {isArabic && c.name_ar ? c.name_ar : c.name}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label={isArabic ? 'اسم الناقل (يدوي)' : 'Carrier Name (Manual)'}
                value={formData.carrier_name}
                onChange={(e) => updateField('carrier_name', e.target.value)}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={isArabic ? 'اسم السفينة' : 'Vessel Name'}
                  value={formData.vessel_name}
                  onChange={(e) => updateField('vessel_name', e.target.value)}
                />
                <Input
                  label={isArabic ? 'رقم الرحلة' : 'Voyage Number'}
                  value={formData.voyage_number}
                  onChange={(e) => updateField('voyage_number', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_freight_prepaid"
                    checked={formData.is_freight_prepaid}
                    onChange={(e) => updateField('is_freight_prepaid', e.target.checked)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="is_freight_prepaid" className="text-sm text-gray-700 dark:text-gray-300">
                    {isArabic ? 'الشحن مسبق الدفع' : 'Freight Prepaid'}
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isArabic ? 'شروط الشحن' : 'Freight Terms'}
                  </label>
                  <select
                    value={formData.freight_terms}
                    onChange={(e) => updateField('freight_terms', e.target.value)}
                    className="input w-full"
                  >
                    {freightTermsOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {isArabic ? opt.label.ar : opt.label.en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </Card>

          {/* Ports */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <MapPinIcon className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {isArabic ? 'الموانئ' : 'Ports & Locations'}
              </h2>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isArabic ? 'ميناء التحميل' : 'Port of Loading'}
                  </label>
                  <select
                    value={formData.port_of_loading_id}
                    onChange={(e) => updateField('port_of_loading_id', e.target.value)}
                    className="input w-full"
                  >
                    <option value="">{isArabic ? 'اختر الميناء' : 'Select port'}</option>
                    {ports.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {isArabic && p.name_ar ? p.name_ar : p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label={isArabic ? 'أو أدخل يدوياً' : 'Or enter manually'}
                  value={formData.port_of_loading_text}
                  onChange={(e) => updateField('port_of_loading_text', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isArabic ? 'ميناء التفريغ' : 'Port of Discharge'}
                  </label>
                  <select
                    value={formData.port_of_discharge_id}
                    onChange={(e) => updateField('port_of_discharge_id', e.target.value)}
                    className="input w-full"
                  >
                    <option value="">{isArabic ? 'اختر الميناء' : 'Select port'}</option>
                    {ports.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {isArabic && p.name_ar ? p.name_ar : p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label={isArabic ? 'أو أدخل يدوياً' : 'Or enter manually'}
                  value={formData.port_of_discharge_text}
                  onChange={(e) => updateField('port_of_discharge_text', e.target.value)}
                />
              </div>

              <Input
                label={isArabic ? 'مكان التسليم' : 'Place of Delivery'}
                value={formData.place_of_delivery}
                onChange={(e) => updateField('place_of_delivery', e.target.value)}
              />
            </div>
          </Card>

          {/* Container / Cargo */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <CubeIcon className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {isArabic ? 'الحاويات والبضائع' : 'Containers & Cargo'}
              </h2>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={isArabic ? 'عدد الحاويات' : 'Containers Count'}
                  type="number"
                  min="0"
                  value={formData.containers_count}
                  onChange={(e) => updateField('containers_count', e.target.value)}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isArabic ? 'نوع الحاوية' : 'Container Type'}
                  </label>
                  <select
                    value={formData.container_type}
                    onChange={(e) => updateField('container_type', e.target.value)}
                    className="input w-full"
                  >
                    <option value="">{isArabic ? 'اختر النوع' : 'Select type'}</option>
                    {containerTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isArabic ? 'أرقام الحاويات (سطر لكل رقم)' : 'Container Numbers (one per line)'}
                </label>
                <textarea
                  value={formData.container_numbers}
                  onChange={(e) => updateField('container_numbers', e.target.value)}
                  rows={3}
                  className="input w-full"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Input
                  label={isArabic ? 'الوزن الإجمالي' : 'Gross Weight'}
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.gross_weight}
                  onChange={(e) => updateField('gross_weight', e.target.value)}
                  error={errors.gross_weight}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isArabic ? 'الوحدة' : 'Unit'}
                  </label>
                  <select
                    value={formData.gross_weight_unit}
                    onChange={(e) => updateField('gross_weight_unit', e.target.value)}
                    className="input w-full"
                  >
                    <option value="KG">KG</option>
                    <option value="TON">TON</option>
                    <option value="LB">LB</option>
                  </select>
                </div>
                <Input
                  label={isArabic ? 'الوزن الصافي' : 'Net Weight'}
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.net_weight}
                  onChange={(e) => updateField('net_weight', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Input
                  label={isArabic ? 'الحجم' : 'Volume'}
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.volume}
                  onChange={(e) => updateField('volume', e.target.value)}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isArabic ? 'الوحدة' : 'Unit'}
                  </label>
                  <select
                    value={formData.volume_unit}
                    onChange={(e) => updateField('volume_unit', e.target.value)}
                    className="input w-full"
                  >
                    <option value="CBM">CBM</option>
                    <option value="CFT">CFT</option>
                  </select>
                </div>
                <Input
                  label={isArabic ? 'عدد الطرود' : 'Packages Count'}
                  type="number"
                  min="0"
                  value={formData.packages_count}
                  onChange={(e) => updateField('packages_count', e.target.value)}
                />
              </div>

              <Input
                label={isArabic ? 'نوع التغليف' : 'Package Type'}
                value={formData.package_type}
                onChange={(e) => updateField('package_type', e.target.value)}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isArabic ? 'وصف البضاعة' : 'Cargo Description'}
                </label>
                <textarea
                  value={formData.cargo_description}
                  onChange={(e) => updateField('cargo_description', e.target.value)}
                  rows={3}
                  className="input w-full"
                />
              </div>
            </div>
          </Card>

          {/* Dates */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <CalendarIcon className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {isArabic ? 'التواريخ' : 'Dates'}
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input
                label={isArabic ? 'تاريخ الشحن' : 'Shipped on Board'}
                type="date"
                value={formData.shipped_on_board_date}
                onChange={(e) => updateField('shipped_on_board_date', e.target.value)}
              />
              <Input
                label={isArabic ? 'الوصول المتوقع (ETA)' : 'ETA'}
                type="date"
                value={formData.eta_date}
                onChange={(e) => updateField('eta_date', e.target.value)}
              />
              <Input
                label={isArabic ? 'الوصول الفعلي (ATA)' : 'ATA'}
                type="date"
                value={formData.ata_date}
                onChange={(e) => updateField('ata_date', e.target.value)}
              />
            </div>
          </Card>

          {/* Tracking */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <LinkIcon className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {isArabic ? 'التتبع' : 'Tracking'}
              </h2>
            </div>
            <div className="space-y-4">
              <Input
                label={isArabic ? 'رابط التتبع' : 'Tracking URL'}
                value={formData.tracking_url}
                onChange={(e) => updateField('tracking_url', e.target.value)}
                error={errors.tracking_url}
                placeholder="https://..."
              />
              <Input
                label={isArabic ? 'رقم التتبع' : 'Tracking Number'}
                value={formData.tracking_number}
                onChange={(e) => updateField('tracking_number', e.target.value)}
              />
            </div>
          </Card>
        </div>

        {/* Notes */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {isArabic ? 'الملاحظات' : 'Notes'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isArabic ? 'ملاحظات عامة' : 'Notes'}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                rows={4}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isArabic ? 'ملاحظات داخلية' : 'Internal Notes'}
              </label>
              <textarea
                value={formData.internal_notes}
                onChange={(e) => updateField('internal_notes', e.target.value)}
                rows={4}
                className="input w-full"
              />
            </div>
          </div>
        </Card>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            {isArabic ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button type="submit" loading={loading}>
            {isArabic ? 'حفظ التعديلات' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </MainLayout>
  );
}

export default withPermission('shipping_bills:update', EditShippingBillPage);
