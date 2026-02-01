import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import MainLayout from '../../../components/layout/MainLayout';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { withPermission } from '../../../utils/withPermission';
import { MenuPermissions } from '../../../config/menu.permissions';
import { useToast } from '../../../contexts/ToastContext';
import { useLocale } from '../../../contexts/LocaleContext';
import apiClient from '../../../lib/apiClient';
import CurrencySelector from '../../../components/shared/CurrencySelector';
import ExchangeRateField from '../../../components/ui/ExchangeRateField';
import WarehouseSelector from '../../../components/common/WarehouseSelector';
import { companyStore } from '../../../lib/companyStore';
import { ArrowLeftIcon, PencilSquareIcon, TruckIcon } from '@heroicons/react/24/outline';

interface ShipmentType {
  id: number;
  code: string;
  name_en: string;
  name_ar: string;
  is_active: boolean;
}

interface City {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  name_en?: string;
  country_id?: number;
  is_active: boolean;
}

interface Port {
  id: number;
  code: string;
  name: string;
  name_en: string;
  name_ar: string;
  port_type: 'sea' | 'air' | 'land';
  country_id?: number;
  city_id?: number;
  country_name_en?: string;
  country_name_ar?: string;
}

interface Country {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  name_en?: string;
  is_active?: boolean;
}

interface Project {
  id: number;
  code: string;
  name_en: string;
  name_ar: string;
  project_type: string;
}

interface Vendor {
  id: number;
  code: string;
  display_name: string;
  name_en?: string;
  name_ar?: string;
}

interface ShipmentItem {
  id: number;
  item_id: number;
  sku: string;
  name_en: string;
  name_ar: string;
  quantity: number;
  unit_code: string;
  unit_cost: number;
  po_unit_price?: number;
  total_cost: number;
}

interface FormData {
  shipment_number: string;
  shipment_type_id: string;
  project_id: string;
  currency_id: string;
  exchange_rate: string;
  incoterm: string;
  bl_no: string;
  awb_no: string;
  origin_country_id: string;
  origin_location_id: string;
  destination_country_id: string;
  destination_location_id: string;
  expected_arrival_date: string;
  port_of_loading_id: string;
  port_of_loading_text: string;
  port_of_discharge_id: string;
  payment_method: string;
  lc_number: string;
  total_amount: string;
  warehouse_id: number | null;
  vendor_id: string;
  purchase_order_id: string;
  notes: string;
  status_code: string;
  stage_code: string;
}

export default withPermission(MenuPermissions.Logistics.Shipments.Edit, function EditShipmentPage() {
  const router = useRouter();
  const { id } = router.query;
  const { showToast } = useToast();
  const { locale } = useLocale();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    shipment_number: '',
    shipment_type_id: '',
    project_id: '',
    currency_id: '',
    exchange_rate: '1',
    incoterm: '',
    bl_no: '',
    awb_no: '',
    origin_country_id: '',
    origin_location_id: '',
    destination_country_id: '',
    destination_location_id: '',
    expected_arrival_date: '',
    port_of_loading_id: '',
    port_of_loading_text: '',
    port_of_discharge_id: '',
    payment_method: '',
    lc_number: '',
    total_amount: '',
    warehouse_id: null,
    vendor_id: '',
    purchase_order_id: '',
    notes: '',
    status_code: '',
    stage_code: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string | null>(null);
  const getCompanyId = () => companyStore.getActiveCompanyId();

  // Dropdowns data
  const [shipmentTypes, setShipmentTypes] = useState<ShipmentType[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [originCities, setOriginCities] = useState<City[]>([]);
  const [destinationCities, setDestinationCities] = useState<City[]>([]);
  const [shipmentStatuses, setShipmentStatuses] = useState<{id: number; code: string; name_en: string; name_ar: string}[]>([]);
  const [shipmentStages, setShipmentStages] = useState<{id: number; code: string; name_en: string; name_ar: string}[]>([]);

  // Items from shipment
  const [items, setItems] = useState<ShipmentItem[]>([]);

  // PO Info for display
  const [poInfo, setPOInfo] = useState<{
    order_number?: string;
    vendor_name?: string;
    vendor_contract_number?: string;
    project_code?: string;
    project_name?: string;
    total_amount?: number;
    currency_code?: string;
  } | null>(null);

  useEffect(() => {
    if (id) {
      loadReferenceData();
    }
  }, [id]);

  const loadShipment = async () => {
    try {
      const res = await apiClient.get<{ success: boolean; data: { shipment: any; items: ShipmentItem[] } }>(
        `/api/logistics-shipments/${id}`
      );
      const s = res.data.shipment;
      const shipmentItems = res.data.items || [];
      setItems(shipmentItems);
      
      // Set form data
      setFormData({
        shipment_number: s.shipment_number || '',
        shipment_type_id: String(s.shipment_type_id || ''),
        project_id: String(s.project_id || ''),
        currency_id: String(s.currency_id || ''),
        exchange_rate: String(s.exchange_rate || '1'),
        incoterm: s.incoterm || '',
        bl_no: s.bl_no || '',
        awb_no: s.awb_no || '',
        origin_country_id: String(s.origin_country_id || ''),
        origin_location_id: String(s.origin_location_id || ''),
        destination_country_id: String(s.destination_country_id || ''),
        destination_location_id: String(s.destination_location_id || ''),
        expected_arrival_date: s.expected_arrival_date ? s.expected_arrival_date.split('T')[0] : '',
        port_of_loading_id: String(s.port_of_loading_id || ''),
        port_of_loading_text: s.port_of_loading_text || '',
        port_of_discharge_id: String(s.port_of_discharge_id || ''),
        payment_method: s.payment_method || '',
        lc_number: s.lc_number || '',
        total_amount: String(s.total_amount || ''),
        warehouse_id: s.warehouse_id || null,
        vendor_id: String(s.vendor_id || ''),
        purchase_order_id: String(s.purchase_order_id || ''),
        notes: s.notes || '',
        status_code: s.status_code || '',
        stage_code: s.stage_code || '',
      });
      
      // Set currency code for ExchangeRateField
      if (s.currency_code) {
        setSelectedCurrencyCode(s.currency_code);
      }

      // Set PO info if exists
      if (s.po_number || s.purchase_order_id) {
        setPOInfo({
          order_number: s.po_number,
          vendor_name: s.vendor_name || s.vendor_display_name,
          vendor_contract_number: s.vendor_contract_number,
          project_code: s.project_code,
          project_name: s.project_name,
          total_amount: s.po_total_amount || s.total_amount,
          currency_code: s.po_currency_code || s.currency_code,
        });
      }

      // Load cities for the selected countries
      if (s.origin_country_id) {
        loadCitiesForCountry(s.origin_country_id, 'origin');
      }
      if (s.destination_country_id) {
        loadCitiesForCountry(s.destination_country_id, 'destination');
      }

    } catch (e: any) {
      showToast(e?.message || 'Failed to load shipment', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadReferenceData = async () => {
    try {
      const [typesRes, projectsRes, portsRes, vendorsRes, countriesRes, statusesRes, stagesRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: any[] }>('/api/logistics-shipment-types?limit=100'),
        apiClient.get<{ success: boolean; data: any[] }>('/api/projects?limit=500'),
        apiClient.get<{ success: boolean; data: any[] }>('/api/ports?limit=500'),
        apiClient.get<{ success: boolean; data: any[] }>('/api/vendors?limit=500'),
        apiClient.get<{ success: boolean; data: any[] }>('/api/master/countries?limit=300'),
        apiClient.get<{ success: boolean; data: any[] }>('/api/shipment-lifecycle-statuses?limit=100').catch(() => ({ data: [] })),
        apiClient.get<{ success: boolean; data: any[] }>('/api/shipment-stages?limit=100').catch(() => ({ data: [] })),
      ]);
      setShipmentTypes(typesRes.data || []);
      setProjects(projectsRes.data || []);
      setPorts(portsRes.data || []);
      setVendors(vendorsRes.data || []);
      setCountries(countriesRes.data || []);
      setShipmentStatuses(statusesRes.data || []);
      setShipmentStages(stagesRes.data || []);
      
      // Load shipment after reference data is loaded
      await loadShipment();
    } catch (e: any) {
      showToast(e?.message || 'Failed to load reference data', 'error');
      setLoading(false);
    }
  };

  const loadCitiesForCountry = async (countryId: number | string, type: 'origin' | 'destination') => {
    try {
      const res = await apiClient.get<{ success: boolean; data: City[] }>(
        `/api/master/cities?country_id=${countryId}&limit=500`
      );
      if (type === 'origin') {
        setOriginCities(res.data || []);
      } else {
        setDestinationCities(res.data || []);
      }
    } catch (e) {
      // Silent fail
    }
  };

  const handleOriginCountryChange = (countryId: string) => {
    setFormData(prev => ({ ...prev, origin_country_id: countryId, origin_location_id: '' }));
    if (countryId) {
      loadCitiesForCountry(countryId, 'origin');
    } else {
      setOriginCities([]);
    }
  };

  const handleDestinationCountryChange = (countryId: string) => {
    setFormData(prev => ({ ...prev, destination_country_id: countryId, destination_location_id: '' }));
    if (countryId) {
      loadCitiesForCountry(countryId, 'destination');
    } else {
      setDestinationCities([]);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.shipment_type_id) errors.shipment_type_id = 'Required';
    if (!formData.project_id) errors.project_id = 'Required';
    if (!formData.incoterm.trim()) errors.incoterm = 'Required';
    if (!formData.bl_no.trim() && !formData.awb_no.trim()) {
      errors.bl_no = 'Either BL or AWB required';
      errors.awb_no = 'Either BL or AWB required';
    }
    if (!formData.origin_location_id) errors.origin_location_id = 'Required';
    if (!formData.destination_location_id) errors.destination_location_id = 'Required';
    if (!formData.port_of_discharge_id) errors.port_of_discharge_id = 'Required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = {
        shipment_type_id: Number(formData.shipment_type_id),
        project_id: Number(formData.project_id),
        currency_id: formData.currency_id ? Number(formData.currency_id) : null,
        exchange_rate: parseFloat(formData.exchange_rate) || 1,
        incoterm: formData.incoterm.trim().toUpperCase(),
        bl_no: formData.bl_no.trim() || null,
        awb_no: formData.awb_no.trim() || null,
        origin_location_id: Number(formData.origin_location_id),
        destination_location_id: Number(formData.destination_location_id),
        expected_arrival_date: formData.expected_arrival_date || null,
        port_of_loading_id: formData.port_of_loading_id ? Number(formData.port_of_loading_id) : null,
        port_of_loading_text: formData.port_of_loading_text.trim() || null,
        port_of_discharge_id: Number(formData.port_of_discharge_id),
        payment_method: formData.payment_method.trim() || null,
        lc_number: formData.lc_number.trim() || null,
        total_amount: formData.total_amount ? Number(formData.total_amount) : null,
        warehouse_id: formData.warehouse_id ? Number(formData.warehouse_id) : null,
        vendor_id: formData.vendor_id ? Number(formData.vendor_id) : null,
        purchase_order_id: formData.purchase_order_id ? Number(formData.purchase_order_id) : null,
        notes: formData.notes.trim() || null,
        status_code: formData.status_code || null,
        stage_code: formData.stage_code || null,
      };

      await apiClient.put(`/api/logistics-shipments/${id}`, payload);
      showToast(locale === 'ar' ? 'تم تحديث الشحنة بنجاح' : 'Shipment updated successfully', 'success');
      router.push(`/shipments/${id}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to update shipment', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'تعديل الشحنة' : 'Edit Shipment'} - SLMS</title>
      </Head>

      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push(`/shipments/${id}`)}
          className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          {locale === 'ar' ? 'العودة للشحنة' : 'Back to Shipment'}
        </button>

        <div className="flex items-center gap-3">
          <PencilSquareIcon className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {locale === 'ar' ? 'تعديل الشحنة' : 'Edit Shipment'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {formData.shipment_number && (
                <span className="font-mono text-blue-600 dark:text-blue-400">{formData.shipment_number}</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
        </div>
      ) : (
        <div className="max-w-5xl">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
            <form onSubmit={handleSubmit} className="space-y-8">

              {/* PO Info Display (if linked to PO) */}
              {poInfo && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                    <TruckIcon className="w-5 h-5" />
                    {locale === 'ar' ? 'مرتبطة بأمر شراء' : 'Linked to Purchase Order'}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    {poInfo.order_number && (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                        <span className="font-medium text-gray-600 dark:text-gray-400 block text-xs mb-1">
                          {locale === 'ar' ? 'رقم أمر الشراء (النظام)' : 'PO Number (System)'}
                        </span>
                        <span className="font-bold text-blue-700 dark:text-blue-300 text-lg">{poInfo.order_number}</span>
                      </div>
                    )}
                    {poInfo.vendor_contract_number && (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                        <span className="font-medium text-gray-600 dark:text-gray-400 block text-xs mb-1">
                          {locale === 'ar' ? 'رقم أمر المورد' : 'Vendor PO#'}
                        </span>
                        <span className="font-bold text-purple-700 dark:text-purple-300 text-lg">{poInfo.vendor_contract_number}</span>
                      </div>
                    )}
                    {poInfo.vendor_name && (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                        <span className="font-medium text-gray-600 dark:text-gray-400 block text-xs mb-1">
                          {locale === 'ar' ? 'المورد' : 'Vendor'}
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">{poInfo.vendor_name}</span>
                      </div>
                    )}
                    {poInfo.total_amount && (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                        <span className="font-medium text-gray-600 dark:text-gray-400 block text-xs mb-1">
                          {locale === 'ar' ? 'إجمالي أمر الشراء' : 'PO Total'}
                        </span>
                        <span className="font-bold text-green-700 dark:text-green-300 text-lg">
                          {poInfo.total_amount.toLocaleString()} {poInfo.currency_code}
                        </span>
                      </div>
                    )}
                    {poInfo.project_code && (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm col-span-2 md:col-span-4">
                        <span className="font-medium text-gray-600 dark:text-gray-400 block text-xs mb-1">
                          {locale === 'ar' ? 'المشروع' : 'Project'}
                        </span>
                        <span className="font-semibold text-green-700 dark:text-green-300">
                          {poInfo.project_code} - {poInfo.project_name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status & Stage - First Section for Quick Updates */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {locale === 'ar' ? 'حالة الشحنة ومراحلها' : 'Status & Stage'}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {locale === 'ar' ? 'حالة الشحنة' : 'Shipment Status'}
                    </label>
                    <select
                      value={formData.status_code}
                      onChange={(e) => setFormData({ ...formData, status_code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{locale === 'ar' ? 'اختر الحالة' : 'Select Status'}</option>
                      {shipmentStatuses.map((status) => (
                        <option key={status.id} value={status.code}>
                          {status.code} - {locale === 'ar' ? status.name_ar : status.name_en}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {locale === 'ar' ? 'مرحلة الشحنة' : 'Shipment Stage'}
                    </label>
                    <select
                      value={formData.stage_code}
                      onChange={(e) => setFormData({ ...formData, stage_code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{locale === 'ar' ? 'اختر المرحلة' : 'Select Stage'}</option>
                      {shipmentStages.map((stage) => (
                        <option key={stage.id} value={stage.code}>
                          {stage.code} - {locale === 'ar' ? stage.name_ar : stage.name_en}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Basic Information */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {locale === 'ar' ? 'معلومات أساسية' : 'Basic Information'}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label={locale === 'ar' ? 'رقم الشحنة' : 'Shipment Number'}
                    value={formData.shipment_number}
                    disabled
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {locale === 'ar' ? 'نوع الشحنة *' : 'Shipment Type *'}
                    </label>
                    <select
                      value={formData.shipment_type_id}
                      onChange={(e) => setFormData({ ...formData, shipment_type_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{locale === 'ar' ? 'اختر نوع' : 'Select type'}</option>
                      {shipmentTypes.filter(x => x.is_active).map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.code} - {locale === 'ar' ? st.name_ar : st.name_en}
                        </option>
                      ))}
                    </select>
                    {formErrors.shipment_type_id && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.shipment_type_id}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {locale === 'ar' ? 'المشروع *' : 'Project *'}
                    </label>
                    <select
                      value={formData.project_id}
                      onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{locale === 'ar' ? 'اختر مشروع' : 'Select Project'}</option>
                      {projects.map((proj) => (
                        <option key={proj.id} value={proj.id}>
                          {proj.code} - {locale === 'ar' ? proj.name_ar : proj.name_en}
                        </option>
                      ))}
                    </select>
                    {formErrors.project_id && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.project_id}</p>
                    )}
                  </div>

                  <Input
                    label="Incoterm *"
                    value={formData.incoterm}
                    onChange={(e) => setFormData({ ...formData, incoterm: e.target.value })}
                    error={formErrors.incoterm}
                    placeholder="e.g., FOB, CIF, EXW"
                  />
                </div>
              </div>

              {/* Ports & Locations */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {locale === 'ar' ? 'الموانئ والمواقع' : 'Ports & Locations'}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Origin Country */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {locale === 'ar' ? 'دولة المصدر *' : 'Origin Country *'}
                    </label>
                    <select
                      value={formData.origin_country_id}
                      onChange={(e) => handleOriginCountryChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{locale === 'ar' ? 'اختر الدولة' : 'Select Country'}</option>
                      {countries.filter(c => c.is_active !== false).map((country) => (
                        <option key={country.id} value={country.id}>
                          {country.code} - {locale === 'ar' ? (country.name_ar || country.name) : (country.name_en || country.name)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Origin City */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {locale === 'ar' ? 'مدينة المصدر *' : 'Origin City *'}
                    </label>
                    <select
                      value={formData.origin_location_id}
                      onChange={(e) => setFormData({ ...formData, origin_location_id: e.target.value })}
                      disabled={!formData.origin_country_id}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="">{locale === 'ar' ? 'اختر المدينة' : 'Select City'}</option>
                      {originCities.filter(c => c.is_active).map((city) => (
                        <option key={city.id} value={city.id}>
                          {city.code} - {locale === 'ar' ? (city.name_ar || city.name) : (city.name_en || city.name)}
                        </option>
                      ))}
                    </select>
                    {formErrors.origin_location_id && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.origin_location_id}</p>
                    )}
                  </div>

                  {/* Destination Country */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {locale === 'ar' ? 'دولة الوصول *' : 'Destination Country *'}
                    </label>
                    <select
                      value={formData.destination_country_id}
                      onChange={(e) => handleDestinationCountryChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{locale === 'ar' ? 'اختر الدولة' : 'Select Country'}</option>
                      {countries.filter(c => c.is_active !== false).map((country) => (
                        <option key={country.id} value={country.id}>
                          {country.code} - {locale === 'ar' ? (country.name_ar || country.name) : (country.name_en || country.name)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Destination City */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {locale === 'ar' ? 'مدينة الوصول *' : 'Destination City *'}
                    </label>
                    <select
                      value={formData.destination_location_id}
                      onChange={(e) => setFormData({ ...formData, destination_location_id: e.target.value })}
                      disabled={!formData.destination_country_id}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="">{locale === 'ar' ? 'اختر المدينة' : 'Select City'}</option>
                      {destinationCities.filter(c => c.is_active).map((city) => (
                        <option key={city.id} value={city.id}>
                          {city.code} - {locale === 'ar' ? (city.name_ar || city.name) : (city.name_en || city.name)}
                        </option>
                      ))}
                    </select>
                    {formErrors.destination_location_id && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.destination_location_id}</p>
                    )}
                  </div>

                  {/* Port of Loading */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {locale === 'ar' ? 'ميناء الشحن (اختياري)' : 'Port of Loading (Optional)'}
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <select
                        value={formData.port_of_loading_id}
                        onChange={(e) => setFormData({ ...formData, port_of_loading_id: e.target.value, port_of_loading_text: '' })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">{locale === 'ar' ? 'اختر من القائمة' : 'Select from list'}</option>
                        {ports.map((port) => (
                          <option key={port.id} value={port.id}>
                            {port.port_type === 'sea' ? '🚢' : port.port_type === 'air' ? '✈️' : '🚚'} {locale === 'ar' ? port.name_ar : port.name_en}
                          </option>
                        ))}
                      </select>
                      <Input
                        placeholder={locale === 'ar' ? 'أو اكتب اسم الميناء' : 'Or type port name'}
                        value={formData.port_of_loading_text}
                        onChange={(e) => setFormData({ ...formData, port_of_loading_text: e.target.value, port_of_loading_id: '' })}
                      />
                    </div>
                  </div>

                  {/* Port of Discharge */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {locale === 'ar' ? 'ميناء الوصول *' : 'Port of Discharge *'}
                    </label>
                    <select
                      value={formData.port_of_discharge_id}
                      onChange={(e) => setFormData({ ...formData, port_of_discharge_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{locale === 'ar' ? 'اختر ميناء الوصول' : 'Select Port of Discharge'}</option>
                      {ports.map((port) => (
                        <option key={port.id} value={port.id}>
                          {port.port_type === 'sea' ? '🚢' : port.port_type === 'air' ? '✈️' : '🚚'} {locale === 'ar' ? port.name_ar : port.name_en}
                        </option>
                      ))}
                    </select>
                    {formErrors.port_of_discharge_id && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.port_of_discharge_id}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {locale === 'ar' ? 'المستندات' : 'Documents'}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label={locale === 'ar' ? 'رقم بوليصة الشحن' : 'BL Number'}
                    value={formData.bl_no}
                    onChange={(e) => setFormData({ ...formData, bl_no: e.target.value })}
                    error={formErrors.bl_no}
                    placeholder="Bill of Lading"
                  />

                  <Input
                    label={locale === 'ar' ? 'رقم بوليصة الشحن الجوي' : 'AWB Number'}
                    value={formData.awb_no}
                    onChange={(e) => setFormData({ ...formData, awb_no: e.target.value })}
                    error={formErrors.awb_no}
                    placeholder="Air Waybill"
                  />

                  <Input
                    label={locale === 'ar' ? 'تاريخ الوصول المتوقع' : 'Expected Arrival'}
                    type="date"
                    value={formData.expected_arrival_date}
                    onChange={(e) => setFormData({ ...formData, expected_arrival_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Payment Information */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {locale === 'ar' ? 'معلومات الدفع' : 'Payment Information'}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Currency */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {locale === 'ar' ? 'العملة' : 'Currency'}
                    </label>
                    <CurrencySelector
                      value={formData.currency_id ? Number(formData.currency_id) : ''}
                      onChange={(id) => setFormData({ ...formData, currency_id: id ? String(id) : '' })}
                      onCurrencyCodeChange={setSelectedCurrencyCode}
                      companyId={getCompanyId() ?? undefined}
                    />
                  </div>

                  {/* Exchange Rate */}
                  <ExchangeRateField
                    currencyCode={selectedCurrencyCode}
                    value={formData.exchange_rate}
                    onChange={(value) => setFormData({ ...formData, exchange_rate: value })}
                    hideWhenBaseCurrency={true}
                    label={locale === 'ar' ? 'سعر الصرف' : 'Exchange Rate'}
                  />

                  <Input
                    label={locale === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    placeholder="e.g., LC, TT, Cash"
                  />

                  {(formData.payment_method.toLowerCase().includes('lc') || formData.payment_method.toLowerCase().includes('اعتماد')) && (
                    <Input
                      label={locale === 'ar' ? 'رقم الاعتماد المستندي *' : 'LC Number *'}
                      value={formData.lc_number}
                      onChange={(e) => setFormData({ ...formData, lc_number: e.target.value })}
                      placeholder="LC-2024-001"
                    />
                  )}

                  <Input
                    label={locale === 'ar' ? 'المبلغ الإجمالي' : 'Total Amount'}
                    type="number"
                    value={formData.total_amount}
                    onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                  />

                  {/* Vendor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {locale === 'ar' ? 'المورد' : 'Vendor'}
                    </label>
                    <select
                      value={formData.vendor_id}
                      onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                      disabled={!!formData.purchase_order_id}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="">{locale === 'ar' ? 'اختر مورد' : 'Select Vendor'}</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.code} - {v.display_name || v.name_en}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Shipment Items (Read Only) */}
              {items.length > 0 && (
                <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {locale === 'ar' ? 'أصناف الشحنة' : 'Shipment Items'} ({items.length})
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-3 py-2 text-left">#</th>
                          <th className="px-3 py-2 text-left">SKU</th>
                          <th className="px-3 py-2 text-left">{locale === 'ar' ? 'الصنف' : 'Item'}</th>
                          <th className="px-3 py-2 text-right">{locale === 'ar' ? 'الكمية' : 'Qty'}</th>
                          <th className="px-3 py-2 text-left">{locale === 'ar' ? 'الوحدة' : 'Unit'}</th>
                          <th className="px-3 py-2 text-right">{locale === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</th>
                          <th className="px-3 py-2 text-right">{locale === 'ar' ? 'الإجمالي' : 'Total'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {items.map((item, idx) => {
                          const unitPrice = Number(item.po_unit_price ?? item.unit_cost ?? 0) || 0;
                          const quantity = Number(item.quantity) || 0;
                          const totalPrice = quantity * unitPrice;
                          return (
                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                              <td className="px-3 py-2 font-mono text-xs">{item.sku}</td>
                              <td className="px-3 py-2">
                                <div>{item.name_en}</div>
                                <div className="text-xs text-gray-500">{item.name_ar}</div>
                              </td>
                              <td className="px-3 py-2 text-right font-medium">{quantity.toLocaleString()}</td>
                              <td className="px-3 py-2">{item.unit_code}</td>
                              <td className="px-3 py-2 text-right">{unitPrice.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right font-semibold text-blue-600 dark:text-blue-400">
                                {totalPrice.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-gray-100 dark:bg-gray-700 font-semibold">
                          <td colSpan={5} className="px-3 py-2 text-right">
                            {locale === 'ar' ? 'المجموع الكلي' : 'Grand Total'}:
                          </td>
                          <td colSpan={2} className="px-3 py-2 text-right text-lg text-blue-600 dark:text-blue-400">
                            {items.reduce((sum, item) => {
                              const unitPrice = Number(item.po_unit_price ?? item.unit_cost ?? 0) || 0;
                              const quantity = Number(item.quantity) || 0;
                              return sum + (quantity * unitPrice);
                            }, 0).toFixed(2)} {poInfo?.currency_code || selectedCurrencyCode || 'SAR'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {locale === 'ar' ? 'لتعديل الأصناف، يرجى الذهاب إلى تبويب "الأصناف" في صفحة تفاصيل الشحنة' : 'To edit items, please go to the "Items" tab on the shipment details page'}
                  </p>
                </div>
              )}

              {/* Additional Info */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {locale === 'ar' ? 'معلومات إضافية' : 'Additional Information'}
                </h2>

                <div className="space-y-4">
                  <WarehouseSelector
                    value={formData.warehouse_id}
                    onChange={(val) => setFormData({ ...formData, warehouse_id: val })}
                    label={locale === 'ar' ? 'المستودع' : 'Warehouse'}
                  />

                  <Input
                    label={locale === 'ar' ? 'ملاحظات' : 'Notes'}
                    multiline
                    rows={4}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder={locale === 'ar' ? 'أي ملاحظات إضافية...' : 'Any additional notes...'}
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button type="submit" variant="primary" loading={saving} disabled={saving}>
                  {locale === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push(`/shipments/${id}`)}
                  disabled={saving}
                >
                  {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
});
