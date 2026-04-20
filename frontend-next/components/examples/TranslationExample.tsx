/**
 * Example Component: Enhanced Translation Usage
 * Demonstrates how to use the new i18n system effectively
 */

import React, { useState } from 'react';
import { useCommonTranslations, useShipmentTranslations, useFormTranslations } from '../../hooks/useTranslations';
import { useValidation, useFormatter } from '../../contexts/LocaleContext';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useToast } from '../../hooks/useToast';

interface ExampleFormData {
  shipmentNumber: string;
  supplierName: string;
  amount: number;
  deliveryDate: string;
  status: string;
}

const TranslationExampleComponent: React.FC = () => {
  // Translation hooks
  const { actions, labels, messages } = useCommonTranslations();
  const { st, getStatusText, getTypeText } = useShipmentTranslations();
  const { ft, fv } = useFormTranslations('shipmentForm');
  
  // Validation and formatting
  const validation = useValidation();
  const formatter = useFormatter();
  
  // Toast for notifications
  const { showToast } = useToast();
  
  // Form state
  const [formData, setFormData] = useState<ExampleFormData>({
    shipmentNumber: '',
    supplierName: '',
    amount: 0,
    deliveryDate: '',
    status: 'pending'
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Validation function using new i18n system
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.shipmentNumber.trim()) {
      newErrors.shipmentNumber = validation.required('shipmentNumber');
    }
    
    if (!formData.supplierName.trim()) {
      newErrors.supplierName = validation.required('supplierName');
    }
    
    if (!formData.deliveryDate) {
      newErrors.deliveryDate = validation.required('deliveryDate');
    }
    
    // Amount validation
    if (formData.amount <= 0) {
      newErrors.amount = validation.positive('amount');
    }
    
    // Date validation
    if (formData.deliveryDate) {
      const deliveryDate = new Date(formData.deliveryDate);
      const today = new Date();
      if (deliveryDate < today) {
        newErrors.deliveryDate = fv('deliveryDate', 'past');
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showToast('error', messages.error.validation());
      return;
    }
    
    setLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      showToast('success', messages.success.saved());
      
      // Reset form
      setFormData({
        shipmentNumber: '',
        supplierName: '',
        amount: 0,
        deliveryDate: '',
        status: 'pending'
      });
      setErrors({});
      
    } catch (error) {
      showToast('error', messages.error.saveFailed());
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: keyof ExampleFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const shipmentStatuses = ['pending', 'inTransit', 'arrived', 'delivered'];

  return (
    <Card>
      <div className="p-6">
        {/* Card Header with translations */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {st('titles.createShipment')}
          </h2>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {formatter.relativeTime(new Date())}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Shipment Number */}
          <Input
            label={st('labels.shipmentNumber')}
            value={formData.shipmentNumber}
            onChange={(e) => handleInputChange('shipmentNumber', e.target.value)}
            error={errors.shipmentNumber}
            required
            placeholder={st('labels.shipmentNumber')}
            className="w-full"
          />

          {/* Supplier Name */}
          <Input
            label={st('labels.supplier')}
            value={formData.supplierName}
            onChange={(e) => handleInputChange('supplierName', e.target.value)}
            error={errors.supplierName}
            required
            placeholder={st('labels.supplier')}
            className="w-full"
          />

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {labels.amount()} *
            </label>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {labels.currency()}
              </span>
            </div>
            {errors.amount && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {errors.amount}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formatter.currency(formData.amount, 'SAR')}
            </p>
          </div>

          {/* Delivery Date */}
          <Input
            label={st('labels.expectedDeliveryDate')}
            type="date"
            value={formData.deliveryDate}
            onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
            error={errors.deliveryDate}
            required
            className="w-full"
          />

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {labels.status()}
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              {shipmentStatuses.map(status => (
                <option key={status} value={status}>
                  {getStatusText(status)}
                </option>
              ))}
            </select>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              {labels.total()}
            </h3>
            <div className="text-sm space-y-1 text-gray-600 dark:text-gray-300">
              <div className="flex justify-between">
                <span>{st('labels.shipmentNumber')}:</span>
                <span>{formData.shipmentNumber || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span>{st('labels.supplier')}:</span>
                <span>{formData.supplierName || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span>{labels.amount()}:</span>
                <span>{formatter.currency(formData.amount, 'SAR')}</span>
              </div>
              <div className="flex justify-between">
                <span>{labels.status()}:</span>
                <span>{getStatusText(formData.status)}</span>
              </div>
              {formData.deliveryDate && (
                <div className="flex justify-between">
                  <span>{st('labels.expectedDeliveryDate')}:</span>
                  <span>{formatter.date(formData.deliveryDate)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 rtl:space-x-reverse">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setFormData({
                  shipmentNumber: '',
                  supplierName: '',
                  amount: 0,
                  deliveryDate: '',
                  status: 'pending'
                });
                setErrors({});
              }}
            >
              {actions.cancel()}
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
            >
              {loading ? messages.info.processing() : actions.save()}
            </Button>
          </div>
        </form>

        {/* Usage Examples */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="font-medium text-gray-900 dark:text-white mb-4">
            {`Translation Examples`}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700 dark:text-gray-300">
                Common Translations:
              </h4>
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                <li>• {actions.save()}</li>
                <li>• {actions.cancel()}</li>
                <li>• {labels.name()}</li>
                <li>• {labels.amount()}</li>
                <li>• {messages.success.saved()}</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700 dark:text-gray-300">
                Shipment Translations:
              </h4>
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                <li>• {st('titles.shipmentsManagement')}</li>
                <li>• {getStatusText('pending')}</li>
                <li>• {getTypeText('import')}</li>
                <li>• {st('labels.trackingNumber')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TranslationExampleComponent;