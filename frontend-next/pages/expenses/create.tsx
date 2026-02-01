import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '../../config/menu.permissions';
import {
  ArrowLeftIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from '../../hooks/useTranslation.enhanced';
import { useToast } from '../../contexts/ToastContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';

const CreateExpense: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [shipments, setShipments] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    shipment_id: '',
    description: '',
    amount: '',
    currency: 'USD',
    category: 'shipping',
    expense_date: new Date().toISOString().split('T')[0],
    receipt_number: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/shipments`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data) ? data : (data.data || []);
        setShipments(list);
      }
    } catch (error) {
      console.error('Failed to fetch shipments:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.description.trim()) {
      newErrors.description = t('validation.required', 'Description is required');
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = t('validation.positiveNumber', 'Amount must be greater than 0');
    }

    if (!formData.expense_date) {
      newErrors.expense_date = t('validation.required', 'Expense date is required');
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      const response = await fetch(`${apiUrl}/api/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          shipment_id: formData.shipment_id ? parseInt(formData.shipment_id) : null,
        }),
      });

      if (response.ok) {
        showToast(t('expenses.created', 'Expense created successfully'), 'success');
        router.push('/expenses');
      } else {
        throw new Error('Failed to create expense');
      }
    } catch (error) {
      showToast(t('common.error', 'Failed to create expense'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'shipping', label: 'Shipping & Freight' },
    { value: 'customs', label: 'Customs & Duties' },
    { value: 'handling', label: 'Handling & Storage' },
    { value: 'documentation', label: 'Documentation' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'other', label: 'Other' },
  ];

  const currencies = ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'EGP'];

  return (
    <MainLayout>
      <Head>
        <title>Create Expense - SLMS</title>
      </Head>

      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          {t('common.back', 'Back')}
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('expenses.create', 'Create New Expense')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t('expenses.createSubtitle', 'Record a new expense for tracking')}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <DocumentTextIcon className="w-5 h-5 text-blue-500" />
                  {t('expenses.basicInfo', 'Basic Information')}
                </h2>

                <div className="space-y-4">
                  <Input
                    label={t('expenses.description', 'Description')}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    error={errors.description}
                    placeholder="Enter expense description"
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('expenses.category', 'Category')}
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {categories.map((cat) => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('expenses.shipment', 'Related Shipment')} ({t('common.optional', 'Optional')})
                      </label>
                      <select
                        value={formData.shipment_id}
                        onChange={(e) => setFormData({ ...formData, shipment_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">{t('common.selectShipment', 'Select Shipment')}</option>
                        {shipments.map((s) => (
                          <option key={s.id} value={s.id}>{s.reference || s.id}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('expenses.notes', 'Notes')} ({t('common.optional', 'Optional')})
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Amount Details */}
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <CurrencyDollarIcon className="w-5 h-5 text-green-500" />
                  {t('expenses.amountDetails', 'Amount Details')}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label={t('expenses.amount', 'Amount')}
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    error={errors.amount}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('expenses.currency', 'Currency')}
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {currencies.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </Card>

            {/* Date & Reference */}
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-purple-500" />
                  {t('expenses.dateReference', 'Date & Reference')}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label={t('expenses.expenseDate', 'Expense Date')}
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    error={errors.expense_date}
                    required
                  />

                  <Input
                    label={t('expenses.receiptNumber', 'Receipt Number')}
                    value={formData.receipt_number}
                    onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t('common.summary', 'Summary')}
                </h3>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{t('expenses.category', 'Category')}:</span>
                    <span className="text-gray-900 dark:text-white capitalize">{formData.category.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{t('expenses.date', 'Date')}:</span>
                    <span className="text-gray-900 dark:text-white">{formData.expense_date || '-'}</span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900 dark:text-white">{t('expenses.total', 'Total')}:</span>
                      <span className="text-xl font-bold text-green-600 dark:text-green-400">
                        {formData.currency} {formData.amount || '0.00'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    loading={loading}
                  >
                    {t('expenses.createExpense', 'Create Expense')}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={() => router.push('/expenses')}
                  >
                    {t('common.cancel', 'Cancel')}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </form>
    </MainLayout>
  );
};

export default withPermission(MenuPermissions.Expenses.Create, CreateExpense);
