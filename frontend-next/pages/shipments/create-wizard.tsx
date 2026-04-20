import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import PageHeader from '../../components/layout/PageHeader';
import { TextField, SelectField, NumberField, DateField, TextArea } from '../../components/ui/Fields.enhanced';
import Modal from '../../components/ui/Modal.enhanced';
import Button from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { useLocale } from '../../contexts/LocaleContext';
import { useToast } from '../../hooks/useToast';
import {
  TruckIcon,
  DocumentPlusIcon,
  CloudArrowUpIcon,
  XMarkIcon,
  CheckIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

interface ShipmentFormData {
  // Basic Info
  shipment_code: string;
  order_type: 'import' | 'export' | 'transit';
  purchase_order_id?: string;
  customer_id: string;
  vendor_id: string;
  
  // Shipment Details
  shipment_type: 'sea' | 'air' | 'land';
  origin_port_id: string;
  dest_port_id: string;
  shipping_company_id: string;
  container_type_id?: string;
  incoterms: string;
  
  // Dates and Values
  departure_date: string;
  eta: string;
  total_value: number;
  currency_id: string;
  
  // Additional
  insurance_required: boolean;
  insurance_value?: number;
  insurance_provider?: string;
  notes?: string;
  
  // Documents
  documents: File[];
}

interface FormStep {
  id: number;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  fields: string[];
}

const FORM_STEPS: FormStep[] = [
  {
    id: 1,
    title: 'معلومات أساسية',
    titleEn: 'Basic Information',
    description: 'رقم الشحنة ونوع الطلب والأطراف المعنية',
    descriptionEn: 'Shipment code, order type and involved parties',
    fields: ['shipment_code', 'order_type', 'purchase_order_id', 'customer_id', 'vendor_id'],
  },
  {
    id: 2,
    title: 'تفاصيل الشحن',
    titleEn: 'Shipping Details',
    description: 'نوع الشحن والموانئ وشركة الشحن',
    descriptionEn: 'Shipping type, ports and shipping company',
    fields: ['shipment_type', 'origin_port_id', 'dest_port_id', 'shipping_company_id', 'container_type_id', 'incoterms'],
  },
  {
    id: 3,
    title: 'التواريخ والقيم',
    titleEn: 'Dates and Values',
    description: 'تواريخ المغادرة والوصول والقيم المالية',
    descriptionEn: 'Departure and arrival dates, financial values',
    fields: ['departure_date', 'eta', 'total_value', 'currency_id', 'insurance_required'],
  },
  {
    id: 4,
    title: 'المستندات والملاحظات',
    titleEn: 'Documents and Notes',
    description: 'رفع المستندات والملاحظات الإضافية',
    descriptionEn: 'Upload documents and additional notes',
    fields: ['documents', 'notes'],
  },
];

export default function CreateShipmentWizardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const isRTL = locale === 'ar';

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ShipmentFormData>({
    shipment_code: '',
    order_type: 'import',
    customer_id: '',
    vendor_id: '',
    shipment_type: 'sea',
    origin_port_id: '',
    dest_port_id: '',
    shipping_company_id: '',
    incoterms: 'FOB',
    departure_date: '',
    eta: '',
    total_value: 0,
    currency_id: 'SAR',
    insurance_required: false,
    documents: [],
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Options data
  const [customers, setCustomers] = useState<Array<{value: string, label: string}>>([]);
  const [vendors, setVendors] = useState<Array<{value: string, label: string}>>([]);
  const [ports, setPorts] = useState<Array<{value: string, label: string}>>([]);
  const [shippingCompanies, setShippingCompanies] = useState<Array<{value: string, label: string}>>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<Array<{value: string, label: string}>>([]);
  const [containerTypes, setContainerTypes] = useState<Array<{value: string, label: string}>>([]);
  const [currencies, setCurrencies] = useState<Array<{value: string, label: string}>>([]);

  // Generate shipment code on mount
  useEffect(() => {
    const generateShipmentCode = () => {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const random = Math.floor(Math.random() * 999) + 1;
      return `SH-${year}-${month}${String(random).padStart(3, '0')}`;
    };

    setFormData(prev => ({
      ...prev,
      shipment_code: generateShipmentCode(),
    }));
  }, []);

  // Load options data
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        // Load all required options in parallel
        const [customersRes, vendorsRes, portsRes, shippingRes, poRes, containerRes, currencyRes] = await Promise.all([
          fetch('http://localhost:4000/api/customers', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('http://localhost:4000/api/vendors', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('http://localhost:4000/api/ports', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('http://localhost:4000/api/shipping-companies', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('http://localhost:4000/api/purchase-orders', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('http://localhost:4000/api/container-types', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/finance/currencies?is_active=true', { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        // Process responses or use sample data
        if (customersRes.ok) {
          const customersData = await customersRes.json();
          setCustomers(customersData.map((c: any) => ({ value: c.id, label: c.name })));
        } else {
          setSampleCustomers();
        }

        // Similar for other options...
        setSampleData();
      } catch (error) {
        console.error('Error loading options:', error);
        setSampleData();
      }
    };

    loadOptions();
  }, []);

  const setSampleCustomers = () => {
    setCustomers([
      { value: '1', label: isRTL ? 'شركة الأحمد للتجارة' : 'Al-Ahmad Trading Company' },
      { value: '2', label: isRTL ? 'مجموعة النور التجارية' : 'Al-Noor Commercial Group' },
      { value: '3', label: isRTL ? 'مؤسسة الخليج' : 'Gulf Foundation' },
    ]);
  };

  const setSampleData = () => {
    setSampleCustomers();
    
    setVendors([
      { value: '1', label: isRTL ? 'مصنع الإلكترونيات المتقدمة' : 'Advanced Electronics Factory' },
      { value: '2', label: isRTL ? 'شركة التصنيع الذكي' : 'Smart Manufacturing Co.' },
      { value: '3', label: isRTL ? 'المصنع الصيني للمعدات' : 'Chinese Equipment Factory' },
    ]);

    setPorts([
      { value: '1', label: isRTL ? 'ميناء الملك عبدالعزيز - الدمام' : 'King Abdulaziz Port - Dammam' },
      { value: '2', label: isRTL ? 'ميناء جدة الإسلامي' : 'Jeddah Islamic Port' },
      { value: '3', label: isRTL ? 'ميناء شنغهاي' : 'Shanghai Port' },
      { value: '4', label: isRTL ? 'مطار الملك فهد الدولي' : 'King Fahd International Airport' },
    ]);

    setShippingCompanies([
      { value: '1', label: isRTL ? 'شركة الخليج للشحن' : 'Gulf Shipping Company' },
      { value: '2', label: isRTL ? 'الخطوط السعودية للشحن' : 'Saudi Shipping Lines' },
      { value: '3', label: isRTL ? 'شركة الشرق الأوسط للنقل' : 'Middle East Transport Co.' },
    ]);

    setPurchaseOrders([
      { value: '1', label: 'PO-2024-001 - أجهزة كمبيوتر' },
      { value: '2', label: 'PO-2024-002 - قطع غيار' },
      { value: '3', label: 'PO-2024-003 - مواد خام' },
    ]);

    setContainerTypes([
      { value: '20GP', label: '20GP - حاوية عادية 20 قدم' },
      { value: '40GP', label: '40GP - حاوية عادية 40 قدم' },
      { value: '40HC', label: '40HC - حاوية عالية 40 قدم' },
      { value: '20RF', label: '20RF - حاوية مبردة 20 قدم' },
    ]);

    setCurrencies([
      { value: 'SAR', label: isRTL ? 'ريال سعودي (SAR)' : 'Saudi Riyal (SAR)' },
      { value: 'USD', label: isRTL ? 'دولار أمريكي (USD)' : 'US Dollar (USD)' },
      { value: 'EUR', label: isRTL ? 'يورو (EUR)' : 'Euro (EUR)' },
      { value: 'AED', label: isRTL ? 'درهم إماراتي (AED)' : 'UAE Dirham (AED)' },
    ]);
  };

  // Validation function
  const validateStep = (step: number): boolean => {
    const stepFields = FORM_STEPS[step - 1].fields;
    const newErrors: Record<string, string> = {};

    stepFields.forEach(field => {
      const value = formData[field as keyof ShipmentFormData];
      
      // Required field validation
      if (field === 'purchase_order_id' || field === 'container_type_id' || field === 'notes' || field === 'documents') {
        return; // Optional fields
      }

      if (!value || (typeof value === 'string' && !value.trim())) {
        newErrors[field] = isRTL ? 'هذا الحقل مطلوب' : 'This field is required';
      }

      // Specific validations
      if (field === 'total_value' && Number(value) <= 0) {
        newErrors[field] = isRTL ? 'القيمة يجب أن تكون أكبر من صفر' : 'Value must be greater than zero';
      }

      if (field === 'eta' && formData.departure_date && new Date(formData.eta) <= new Date(formData.departure_date)) {
        newErrors[field] = isRTL ? 'تاريخ الوصول يجب أن يكون بعد تاريخ المغادرة' : 'ETA must be after departure date';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form input changes
  const handleInputChange = (field: keyof ShipmentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when field is modified
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Auto-generate ETA based on shipment type and departure date
    if (field === 'departure_date' || field === 'shipment_type') {
      if (formData.departure_date && formData.shipment_type) {
        const departureDate = new Date(field === 'departure_date' ? value : formData.departure_date);
        let daysToAdd = 30; // Default sea shipping

        if (formData.shipment_type === 'air') daysToAdd = 7;
        else if (formData.shipment_type === 'land') daysToAdd = 14;

        const eta = new Date(departureDate.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
        setFormData(prev => ({ ...prev, eta: eta.toISOString().split('T')[0] }));
      }
    }
  };

  // Handle file uploads
  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    
    const newFiles = Array.from(files).slice(0, 10); // Max 10 files
    const validFiles = newFiles.filter(file => {
      const isValidType = file.type.includes('pdf') || file.type.includes('image');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB max
      return isValidType && isValidSize;
    });

    if (validFiles.length !== newFiles.length) {
      showToast('warning', isRTL ? 'بعض الملفات غير صالحة (PDF/صور فقط، حد أقصى 10MB)' : 'Some files are invalid (PDF/Images only, max 10MB)');
    }

    setFormData(prev => ({ 
      ...prev, 
      documents: [...prev.documents, ...validFiles].slice(0, 10) 
    }));
  };

  // Remove uploaded file
  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
  };

  // Navigation functions
  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, FORM_STEPS.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const goToStep = (step: number) => {
    // Validate all previous steps before jumping
    for (let i = 1; i < step; i++) {
      if (!validateStep(i)) {
        showToast('error', isRTL ? `يرجى إكمال الخطوة ${i} أولاً` : `Please complete step ${i} first`);
        return;
      }
    }
    setCurrentStep(step);
  };

  // Submit form
  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setSubmitLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      // Create FormData for file upload
      const submitData = new FormData();
      
      // Add all form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'documents') {
          formData.documents.forEach(file => {
            submitData.append('documents', file);
          });
        } else if (value !== undefined && value !== null && value !== '') {
          submitData.append(key, String(value));
        }
      });

      const response = await fetch('http://localhost:4000/api/shipments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: submitData,
      });

      if (response.ok) {
        const result = await response.json();
        showToast('success', isRTL ? 'تم إنشاء الشحنة بنجاح' : 'Shipment created successfully');
        router.push(`/shipments/${result.id}`);
      } else {
        const error = await response.json();
        showToast('error', error.message || (isRTL ? 'فشل في إنشاء الشحنة' : 'Failed to create shipment'));
      }
    } catch (error) {
      console.error('Error creating shipment:', error);
      showToast('error', isRTL ? 'خطأ في إنشاء الشحنة' : 'Error creating shipment');
    } finally {
      setSubmitLoading(false);
    }
  };

  const renderStepContent = () => {
    const currentStepData = FORM_STEPS[currentStep - 1];
    
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TextField
                id="shipment_code"
                name="shipment_code"
                label={isRTL ? 'رقم الشحنة' : 'Shipment Code'}
                value={formData.shipment_code}
                onChange={(e) => handleInputChange('shipment_code', e.target.value)}
                error={errors.shipment_code}
                required
                helpText={isRTL ? 'رقم تلقائي قابل للتعديل' : 'Auto-generated, editable'}
              />

              <SelectField
                id="order_type"
                name="order_type"
                label={isRTL ? 'نوع الطلب' : 'Order Type'}
                value={formData.order_type}
                onChange={(value) => handleInputChange('order_type', value)}
                error={errors.order_type}
                required
                options={[
                  { value: 'import', label: isRTL ? 'استيراد' : 'Import' },
                  { value: 'export', label: isRTL ? 'تصدير' : 'Export' },
                  { value: 'transit', label: isRTL ? 'عبور' : 'Transit' },
                ]}
              />
            </div>

            <SelectField
              id="purchase_order_id"
              name="purchase_order_id"
              label={isRTL ? 'أمر الشراء (اختياري)' : 'Purchase Order (Optional)'}
              value={formData.purchase_order_id || ''}
              onChange={(value) => handleInputChange('purchase_order_id', value)}
              error={errors.purchase_order_id}
              options={purchaseOrders}
              searchable
              clearable
              placeholder={isRTL ? 'اختر أمر شراء موجود' : 'Select existing purchase order'}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SelectField
                id="customer_id"
                name="customer_id"
                label={isRTL ? 'العميل' : 'Customer'}
                value={formData.customer_id}
                onChange={(value) => handleInputChange('customer_id', value)}
                error={errors.customer_id}
                required
                options={customers}
                searchable
                placeholder={isRTL ? 'اختر العميل' : 'Select customer'}
              />

              <SelectField
                id="vendor_id"
                name="vendor_id"
                label={isRTL ? 'المورد' : 'Vendor'}
                value={formData.vendor_id}
                onChange={(value) => handleInputChange('vendor_id', value)}
                error={errors.vendor_id}
                required
                options={vendors}
                searchable
                placeholder={isRTL ? 'اختر المورد' : 'Select vendor'}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {isRTL ? 'نوع الشحن' : 'Shipment Type'} <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { value: 'sea', icon: '🚢', label: 'بحري', labelEn: 'Sea' },
                  { value: 'air', icon: '✈️', label: 'جوي', labelEn: 'Air' },
                  { value: 'land', icon: '🚛', label: 'بري', labelEn: 'Land' },
                ].map(type => (
                  <div
                    key={type.value}
                    className={`relative rounded-lg border p-4 cursor-pointer transition-colors ${
                      formData.shipment_type === type.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    }`}
                    onClick={() => handleInputChange('shipment_type', type.value)}
                  >
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      <span className="text-2xl">{type.icon}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {isRTL ? type.label : type.labelEn}
                        </div>
                      </div>
                    </div>
                    {formData.shipment_type === type.value && (
                      <div className="absolute top-2 right-2">
                        <CheckIcon className="h-5 w-5 text-blue-500" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {errors.shipment_type && (
                <p className="mt-1 text-sm text-red-600">{errors.shipment_type}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SelectField
                id="origin_port_id"
                name="origin_port_id"
                label={isRTL ? 'الميناء المصدر' : 'Origin Port'}
                value={formData.origin_port_id}
                onChange={(value) => handleInputChange('origin_port_id', value)}
                error={errors.origin_port_id}
                required
                options={ports}
                searchable
                placeholder={isRTL ? 'اختر الميناء المصدر' : 'Select origin port'}
              />

              <SelectField
                id="dest_port_id"
                name="dest_port_id"
                label={isRTL ? 'الميناء الوجهة' : 'Destination Port'}
                value={formData.dest_port_id}
                onChange={(value) => handleInputChange('dest_port_id', value)}
                error={errors.dest_port_id}
                required
                options={ports}
                searchable
                placeholder={isRTL ? 'اختر الميناء الوجهة' : 'Select destination port'}
              />
            </div>

            <SelectField
              id="shipping_company_id"
              name="shipping_company_id"
              label={isRTL ? 'شركة الشحن' : 'Shipping Company'}
              value={formData.shipping_company_id}
              onChange={(value) => handleInputChange('shipping_company_id', value)}
              error={errors.shipping_company_id}
              required
              options={shippingCompanies}
              searchable
              placeholder={isRTL ? 'اختر شركة الشحن' : 'Select shipping company'}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SelectField
                id="container_type_id"
                name="container_type_id"
                label={isRTL ? 'نوع الحاوية (اختياري)' : 'Container Type (Optional)'}
                value={formData.container_type_id || ''}
                onChange={(value) => handleInputChange('container_type_id', value)}
                error={errors.container_type_id}
                options={containerTypes}
                clearable
                placeholder={isRTL ? 'اختر نوع الحاوية' : 'Select container type'}
              />

              <SelectField
                id="incoterms"
                name="incoterms"
                label={isRTL ? 'شروط التسليم' : 'Incoterms'}
                value={formData.incoterms}
                onChange={(value) => handleInputChange('incoterms', value)}
                error={errors.incoterms}
                required
                options={[
                  { value: 'FOB', label: 'FOB - Free On Board' },
                  { value: 'CIF', label: 'CIF - Cost Insurance Freight' },
                  { value: 'EXW', label: 'EXW - Ex Works' },
                  { value: 'FCA', label: 'FCA - Free Carrier' },
                  { value: 'CPT', label: 'CPT - Carriage Paid To' },
                  { value: 'CIP', label: 'CIP - Carriage Insurance Paid' },
                  { value: 'DAP', label: 'DAP - Delivered At Place' },
                  { value: 'DPU', label: 'DPU - Delivered At Place Unloaded' },
                  { value: 'DDP', label: 'DDP - Delivered Duty Paid' },
                ]}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DateField
                id="departure_date"
                name="departure_date"
                label={isRTL ? 'تاريخ المغادرة' : 'Departure Date'}
                value={formData.departure_date}
                onChange={(value) => handleInputChange('departure_date', value)}
                error={errors.departure_date}
                required
                minDate={new Date()}
              />

              <DateField
                id="eta"
                name="eta"
                label={isRTL ? 'الوصول المتوقع' : 'Expected Arrival (ETA)'}
                value={formData.eta}
                onChange={(value) => handleInputChange('eta', value)}
                error={errors.eta}
                required
                minDate={formData.departure_date ? new Date(formData.departure_date) : new Date()}
                helpText={isRTL ? 'يتم التحديث تلقائياً حسب نوع الشحن' : 'Auto-updated based on shipment type'}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <NumberField
                id="total_value"
                name="total_value"
                label={isRTL ? 'قيمة البضاعة' : 'Cargo Value'}
                value={formData.total_value}
                onChange={(value) => handleInputChange('total_value', value)}
                error={errors.total_value}
                required
                min={1}
                precision={2}
                thousandsSeparator
                helpText={isRTL ? 'قيمة البضاعة الإجمالية' : 'Total cargo value'}
              />

              <SelectField
                id="currency_id"
                name="currency_id"
                label={isRTL ? 'العملة' : 'Currency'}
                value={formData.currency_id}
                onChange={(value) => handleInputChange('currency_id', value)}
                error={errors.currency_id}
                required
                options={currencies}
              />
            </div>

            <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {isRTL ? 'التأمين على البضاعة' : 'Cargo Insurance'}
                </label>
                <div className="relative inline-block w-10 align-middle select-none">
                  <input
                    type="checkbox"
                    id="insurance_required"
                    checked={formData.insurance_required}
                    onChange={(e) => handleInputChange('insurance_required', e.target.checked)}
                    className="checked:bg-blue-500 outline-none focus:outline-none right-4 checked:right-0 duration-200 ease-in absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                  />
                  <label
                    htmlFor="insurance_required"
                    className="block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
                  ></label>
                </div>
              </div>

              {formData.insurance_required && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <NumberField
                    id="insurance_value"
                    name="insurance_value"
                    label={isRTL ? 'قيمة التأمين' : 'Insurance Value'}
                    value={formData.insurance_value || 0}
                    onChange={(value) => handleInputChange('insurance_value', value)}
                    min={0}
                    precision={2}
                    thousandsSeparator
                    placeholder={isRTL ? 'أدخل قيمة التأمين' : 'Enter insurance value'}
                  />

                  <TextField
                    id="insurance_provider"
                    name="insurance_provider"
                    label={isRTL ? 'شركة التأمين' : 'Insurance Provider'}
                    value={formData.insurance_provider || ''}
                    onChange={(e) => handleInputChange('insurance_provider', e.target.value)}
                    placeholder={isRTL ? 'اسم شركة التأمين' : 'Insurance company name'}
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {isRTL ? 'المستندات' : 'Documents'}
              </label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-2">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.gif"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                    id="documents"
                  />
                  <label
                    htmlFor="documents"
                    className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <DocumentPlusIcon className="h-4 w-4 mr-2" />
                    {isRTL ? 'اختر الملفات' : 'Choose Files'}
                  </label>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {isRTL 
                    ? 'PDF أو صور، حد أقصى 10 ملفات، كل ملف أقصى حجم 10MB'
                    : 'PDF or images, max 10 files, 10MB each'
                  }
                </p>
              </div>
              
              {formData.documents.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {isRTL ? 'الملفات المرفوعة:' : 'Uploaded Files:'}
                  </h4>
                  <div className="space-y-2">
                    {formData.documents.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                          <DocumentPlusIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <TextArea
              id="notes"
              name="notes"
              label={isRTL ? 'ملاحظات إضافية' : 'Additional Notes'}
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder={isRTL ? 'أي ملاحظات أو تعليمات خاصة بالشحنة' : 'Any special notes or instructions for this shipment'}
              rows={4}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <MainLayout>
      <Head>
        <title>{isRTL ? 'إنشاء شحنة جديدة' : 'Create New Shipment'} - SLMS</title>
      </Head>

      <div className="space-y-6">
        <PageHeader
          title={isRTL ? 'إنشاء شحنة جديدة' : 'Create New Shipment'}
          description={isRTL ? 'ملء معلومات الشحنة الجديدة خطوة بخطوة' : 'Fill in new shipment information step by step'}
          breadcrumbs={[
            { label: isRTL ? 'الرئيسية' : 'Home', href: '/dashboard' },
            { label: isRTL ? 'الشحنات' : 'Shipments', href: '/shipments' },
            { label: isRTL ? 'إنشاء جديد' : 'Create New' },
          ]}
        />

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          {/* Progress Steps */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <nav aria-label="Progress">
              <ol className="flex items-center">
                {FORM_STEPS.map((step, index) => (
                  <li key={step.id} className={`${index !== FORM_STEPS.length - 1 ? 'pr-8 sm:pr-20 rtl:pr-0 rtl:pl-8 rtl:sm:pl-20' : ''} relative`}>
                    <div className="flex items-center">
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-full border-2 cursor-pointer transition-colors ${
                          currentStep === step.id
                            ? 'border-blue-500 bg-blue-500 text-white'
                            : currentStep > step.id
                            ? 'border-green-500 bg-green-500 text-white'
                            : 'border-gray-300 bg-white text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                        onClick={() => goToStep(step.id)}
                      >
                        {currentStep > step.id ? (
                          <CheckIcon className="w-5 h-5" />
                        ) : (
                          <span className="text-sm font-medium">{step.id}</span>
                        )}
                      </div>
                      <div className="ml-4 rtl:ml-0 rtl:mr-4 min-w-0 flex-1">
                        <p className={`text-sm font-medium ${currentStep >= step.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          {isRTL ? step.title : step.titleEn}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {isRTL ? step.description : step.descriptionEn}
                        </p>
                      </div>
                    </div>
                    {index !== FORM_STEPS.length - 1 && (
                      <div className="absolute top-4 left-4 rtl:left-auto rtl:right-4 w-full h-0.5 bg-gray-200 dark:bg-gray-700 -ml-8 rtl:-mr-8 rtl:ml-0" />
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>

          {/* Form Content */}
          <div className="px-6 py-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {isRTL ? FORM_STEPS[currentStep - 1].title : FORM_STEPS[currentStep - 1].titleEn}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {isRTL ? FORM_STEPS[currentStep - 1].description : FORM_STEPS[currentStep - 1].descriptionEn}
              </p>
            </div>

            {renderStepContent()}
          </div>

          {/* Navigation Buttons */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <Button
              variant="secondary"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              {isRTL ? <ArrowRightIcon className="w-4 h-4 inline mr-1" /> : <ArrowLeftIcon className="w-4 h-4 inline mr-1" />}
              {isRTL ? 'السابق' : 'Previous'}
            </Button>

            <span className="text-sm text-gray-500 dark:text-gray-400">
              {isRTL ? `الخطوة ${currentStep} من ${FORM_STEPS.length}` : `Step ${currentStep} of ${FORM_STEPS.length}`}
            </span>

            {currentStep < FORM_STEPS.length ? (
              <Button
                variant="primary"
                onClick={nextStep}
              >
                {isRTL ? 'التالي' : 'Next'}
                {isRTL ? <ArrowLeftIcon className="w-4 h-4 inline ml-1" /> : <ArrowRightIcon className="w-4 h-4 inline ml-1" />}
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleSubmit}
                loading={submitLoading}
              >
                <CheckIcon className="w-4 h-4 inline mr-1" />
                {isRTL ? 'إنشاء الشحنة' : 'Create Shipment'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}