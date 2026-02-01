import React from 'react';
import { Modal } from './Modal';
import Button from './Button';
import Input from './Input';

interface Field {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'date';
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  validation?: (value: any) => string | null;
  disabled?: boolean;
}

interface ModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fields: Field[];
  initialValues?: Record<string, any>;
  onSubmit: (values: Record<string, any>) => Promise<void>;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
}

export const ModalForm: React.FC<ModalFormProps> = ({
  isOpen,
  onClose,
  title,
  fields,
  initialValues = {},
  onSubmit,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  loading = false,
}) => {
  const [values, setValues] = React.useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setValues(initialValues);
      setErrors({});
    }
  }, [isOpen, initialValues]);

  const handleChange = (name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    fields.forEach((field) => {
      const value = values[field.name];

      // Required validation
      if (field.required && !value) {
        newErrors[field.name] = `${field.label} is required`;
        return;
      }

      // Custom validation
      if (field.validation && value) {
        const error = field.validation(value);
        if (error) {
          newErrors[field.name] = error;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setSubmitting(true);
    try {
      await onSubmit(values);
      onClose();
    } catch (error: any) {
      // Handle server-side errors
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map((field) => {
          if (field.type === 'textarea') {
            return (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <textarea
                  value={values[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  disabled={field.disabled || loading || submitting}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-primary-500 focus:border-transparent
                           disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {errors[field.name] && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors[field.name]}
                  </p>
                )}
              </div>
            );
          }

          if (field.type === 'select') {
            return (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <select
                  value={values[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  disabled={field.disabled || loading || submitting}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-primary-500 focus:border-transparent
                           disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select {field.label}</option>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors[field.name] && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors[field.name]}
                  </p>
                )}
              </div>
            );
          }

          return (
            <div key={field.name}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <Input
                type={field.type || 'text'}
                value={values[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                disabled={field.disabled || loading || submitting}
              />
              {errors[field.name] && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors[field.name]}
                </p>
              )}
            </div>
          );
        })}

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            {cancelLabel}
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            disabled={loading}
          >
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
