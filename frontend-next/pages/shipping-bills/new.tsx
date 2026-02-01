/**
 * ===============================================
 * Create/Edit Shipping Bill Page
 * ===============================================
 * Enterprise-grade form for shipping document management
 */

import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
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
  project_id?: number;
  project_code?: string;
  project_name?: string;
  vendor_id?: number;
  vendor_name?: string;
  port_of_loading_id?: number;
  port_of_loading_text?: string;
  port_of_discharge_id?: number;
  port_of_discharge_name?: string;
  destination_location_id?: number;
  expected_arrival_date?: string;
  bl_no?: string;
  awb_no?: string;
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

const initialFormData: FormData = {
  bill_number: '',
  bill_type_id: '',
  booking_number: '',
  bill_date: new Date().toISOString().split('T')[0],
  shipment_id: '',
  project_id: '',
  carrier_id: '',
  carrier_name: '',
  vessel_name: '',
  voyage_number: '',
  port_of_loading_id: '',
  port_of_loading_text: '',
  port_of_discharge_id: '',
  port_of_discharge_text: '',
  place_of_delivery: '',
  containers_count: '0',
  container_type: '',
  container_numbers: '',
  cargo_description: '',
  gross_weight: '',
  gross_weight_unit: 'KG',
  net_weight: '',
  volume: '',
  volume_unit: 'CBM',
  packages_count: '',
  package_type: '',
  shipped_on_board_date: '',
  eta_date: '',
  ata_date: '',
  tracking_url: '',
  tracking_number: '',
  status: 'draft',
  is_original: true,
  is_freight_prepaid: true,
  freight_terms: 'Prepaid',
  notes: '',
  internal_notes: '',
};

const containerTypes = ['20GP', '40GP', '40HC', '20RF', '40RF', '20OT', '40OT', 'FLAT', 'TANK', 'LCL'];

const freightTermsOptions = [
  { value: 'Prepaid', label: { en: 'Prepaid', ar: 'مسبق الدفع' } },
  { value: 'Collect', label: { en: 'Collect', ar: 'عند الاستلام' } },
  { value: 'Third Party', label: { en: 'Third Party', ar: 'طرف ثالث' } },
];

function NewShippingBillPage() {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { t, locale } = useTranslation();
  const router = useRouter();
  const isArabic = locale === 'ar';

  // Get query parameters for pre-selection from shipment page
  const { shipment_id, shipment_number } = router.query as { shipment_id?: string; shipment_number?: string };

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [preSelectedShipment, setPreSelectedShipment] = useState<string | null>(null);
  const [selectedShipmentData, setSelectedShipmentData] = useState<Shipment | null>(null);

  // Reference data
  const [billTypes, setBillTypes] = useState<BillType[]>([]);
  const [carriers, setCarriers] = useState<ShippingAgent[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    fetchReferenceData();
  }, []);

  // Handle pre-selected shipment from query parameter
  useEffect(() => {
    if (shipment_id && !preSelectedShipment) {
      setFormData(prev => ({ ...prev, shipment_id }));
      setPreSelectedShipment(shipment_id);
      // Fetch shipment details to auto-populate related fields
      fetchShipmentDetails(shipment_id);
    }
  }, [shipment_id, preSelectedShipment]);

  // Fetch shipment details and auto-populate form fields
  const fetchShipmentDetails = async (shipmentId: string) => {
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`http://localhost:4000/api/logistics-shipments/${shipmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const shipmentData = data.data?.shipment || data.data;
        if (shipmentData) {
          setSelectedShipmentData(shipmentData);
          // Auto-populate related fields from shipment
          setFormData(prev => ({
            ...prev,
            shipment_id: shipmentId,
            project_id: shipmentData.project_id ? String(shipmentData.project_id) : prev.project_id,
            port_of_loading_id: shipmentData.port_of_loading_id ? String(shipmentData.port_of_loading_id) : prev.port_of_loading_id,
            port_of_loading_text: shipmentData.port_of_loading_text || prev.port_of_loading_text,
            port_of_discharge_id: shipmentData.port_of_discharge_id ? String(shipmentData.port_of_discharge_id) : prev.port_of_discharge_id,
            port_of_discharge_text: shipmentData.port_of_discharge_name || prev.port_of_discharge_text,
            eta_date: shipmentData.expected_arrival_date ? shipmentData.expected_arrival_date.split('T')[0] : prev.eta_date,
            // Pre-fill bill number from shipment if available (but don't overwrite user input)
            bill_number: prev.bill_number || shipmentData.bl_no || shipmentData.awb_no || '',
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch shipment details:', error);
    }
  };

  const fetchReferenceData = async () => {
    const token = localStorage.getItem('accessToken');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      // Fetch all in parallel
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

    if (!validateForm()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');

      // Prepare payload
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

      const res = await fetch('http://localhost:4000/api/shipping-bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const result = await res.json();
        showToast(
          isArabic ? 'تم إنشاء البوليصة بنجاح' : 'Shipping bill created successfully',
          'success'
        );
        // If we came from a shipment page, go back there
        if (preSelectedShipment) {
          router.push(`/shipments/${preSelectedShipment}?tab=shipping-bills`);
        } else {
          router.push(`/shipping-bills/${result.data.id}`);
        }
      } else if (res.status === 409) {
        setErrors({ bill_number: isArabic ? 'رقم البوليصة موجود مسبقاً' : 'Bill number already exists' });
      } else {
        const errorData = await res.json().catch(() => ({}));
        showToast(errorData.error || (isArabic ? 'فشل في إنشاء البوليصة' : 'Failed to create shipping bill'), 'error');
      }
    } catch (error) {
      showToast(isArabic ? 'حدث خطأ' : 'An error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <MainLayout>
      <Head>
        <title>{isArabic ? 'إنشاء بوليصة شحن' : 'New Shipping Bill'} - SLMS</title>
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
                {isArabic ? 'إنشاء بوليصة شحن' : 'New Shipping Bill'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {isArabic ? 'أدخل بيانات بوليصة الشحن' : 'Enter shipping bill details'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" loading={loading}>
              {isArabic ? 'حفظ' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Form Sections */}
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
                  placeholder="e.g., MAEU123456789"
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
                  placeholder="e.g., BKG123456"
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
                    {preSelectedShipment && (
                      <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                        ✓ {isArabic ? 'تم تحديدها مسبقاً' : 'Pre-selected'}
                      </span>
                    )}
                    {selectedShipmentData && (
                      <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                        ({isArabic ? 'البيانات محمّلة' : 'Data loaded'})
                      </span>
                    )}
                  </label>
                  {preSelectedShipment && shipment_number ? (
                    <div className="flex items-center gap-2">
                      <div className="input w-full bg-gray-100 dark:bg-gray-700 cursor-not-allowed">
                        {shipment_number}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPreSelectedShipment(null);
                          setSelectedShipmentData(null);
                          updateField('shipment_id', '');
                          // Reset related fields
                          setFormData(prev => ({
                            ...prev,
                            shipment_id: '',
                            project_id: '',
                            port_of_loading_id: '',
                            port_of_loading_text: '',
                            port_of_discharge_id: '',
                            port_of_discharge_text: '',
                            eta_date: '',
                          }));
                        }}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <select
                      value={formData.shipment_id}
                      onChange={(e) => {
                        const shipmentId = e.target.value;
                        updateField('shipment_id', shipmentId);
                        if (shipmentId) {
                          fetchShipmentDetails(shipmentId);
                        } else {
                          setSelectedShipmentData(null);
                        }
                      }}
                      className="input w-full"
                    >
                      <option value="">{isArabic ? 'اختر الشحنة' : 'Select shipment'}</option>
                      {shipments.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.shipment_number}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isArabic ? 'المشروع' : 'Project'}
                    {selectedShipmentData?.project_id && (
                      <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                        ✓ {isArabic ? 'من الشحنة' : 'From shipment'}
                      </span>
                    )}
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

              {/* Shipment Info Box - shows loaded data */}
              {selectedShipmentData && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-600 dark:text-blue-400 font-medium text-sm">
                      ℹ️ {isArabic ? 'تم تحميل البيانات من الشحنة' : 'Data loaded from shipment'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600 dark:text-gray-400">
                    {selectedShipmentData.project_code && (
                      <div>
                        <span className="font-medium">{isArabic ? 'المشروع:' : 'Project:'}</span>{' '}
                        {selectedShipmentData.project_code}
                      </div>
                    )}
                    {selectedShipmentData.vendor_name && (
                      <div>
                        <span className="font-medium">{isArabic ? 'المورد:' : 'Vendor:'}</span>{' '}
                        {selectedShipmentData.vendor_name}
                      </div>
                    )}
                    {selectedShipmentData.port_of_loading_text && (
                      <div>
                        <span className="font-medium">{isArabic ? 'ميناء الشحن:' : 'Loading:'}</span>{' '}
                        {selectedShipmentData.port_of_loading_text}
                      </div>
                    )}
                    {selectedShipmentData.port_of_discharge_name && (
                      <div>
                        <span className="font-medium">{isArabic ? 'ميناء الوصول:' : 'Discharge:'}</span>{' '}
                        {selectedShipmentData.port_of_discharge_name}
                      </div>
                    )}
                    {selectedShipmentData.expected_arrival_date && (
                      <div>
                        <span className="font-medium">{isArabic ? 'الوصول المتوقع:' : 'ETA:'}</span>{' '}
                        {new Date(selectedShipmentData.expected_arrival_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                placeholder={isArabic ? 'في حال عدم وجود الناقل في القائمة' : 'If carrier not in list'}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={isArabic ? 'اسم السفينة' : 'Vessel Name'}
                  value={formData.vessel_name}
                  onChange={(e) => updateField('vessel_name', e.target.value)}
                  placeholder="e.g., MSC OSCAR"
                />
                <Input
                  label={isArabic ? 'رقم الرحلة' : 'Voyage Number'}
                  value={formData.voyage_number}
                  onChange={(e) => updateField('voyage_number', e.target.value)}
                  placeholder="e.g., 123W"
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
                  placeholder="e.g., Shanghai, China"
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
                  placeholder="e.g., Jeddah, Saudi Arabia"
                />
              </div>

              <Input
                label={isArabic ? 'مكان التسليم' : 'Place of Delivery'}
                value={formData.place_of_delivery}
                onChange={(e) => updateField('place_of_delivery', e.target.value)}
                placeholder={isArabic ? 'المدينة / المستودع النهائي' : 'Final delivery location'}
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
                  placeholder="MSKU1234567&#10;MSKU2345678&#10;MSKU3456789"
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
                placeholder="e.g., Pallets, Cartons, Drums"
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
                  placeholder={isArabic ? 'وصف مختصر للبضاعة' : 'Brief cargo description'}
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
            <div className="space-y-4">
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
                placeholder="e.g., MSC123456789"
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
                placeholder={isArabic ? 'ملاحظات ظاهرة للجميع' : 'Visible to all users'}
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
                placeholder={isArabic ? 'ملاحظات داخلية للموظفين فقط' : 'Internal staff notes only'}
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
            {isArabic ? 'حفظ البوليصة' : 'Save Shipping Bill'}
          </Button>
        </div>
      </form>
    </MainLayout>
  );
}

export default withPermission('shipping_bills:create', NewShippingBillPage);
