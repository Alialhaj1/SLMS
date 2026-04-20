/**
 * ============================================================================
 * PrintButton Component
 * ============================================================================
 * Reusable print button with optional template selection.
 * Can be used on any document page to trigger printing with the
 * company header/footer print system.
 * ============================================================================
 */

import { useState, useEffect, useCallback } from 'react';
import { PrinterIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import apiClient from '../../lib/apiClient';

interface PrintTemplate {
  id: number;
  name_en: string;
  name_ar: string;
  template_type: string;
  is_default: boolean;
}

interface PrintButtonProps {
  /** The entity type for print routing (e.g., 'expense-request', 'shipment-expense', 'shipment') */
  entityType: string;
  /** The entity ID */
  entityId: number | string;
  /** Template type filter (maps to printed_templates.template_type) */
  templateType?: string;
  /** Button label override */
  label?: string;
  /** Arabic label override */
  labelAr?: string;
  /** Current locale */
  locale?: string;
  /** Button size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Custom onClick handler (overrides default behavior) */
  onPrint?: (templateId?: number) => void;
  /** Direct print URL (overrides default routing) */
  printUrl?: string;
}

export default function PrintButton({
  entityType,
  entityId,
  templateType,
  label,
  labelAr,
  locale = 'en',
  size = 'md',
  className = '',
  onPrint,
  printUrl,
}: PrintButtonProps) {
  const isRTL = locale === 'ar';
  const [templates, setTemplates] = useState<PrintTemplate[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const displayLabel = label || (isRTL ? 'طباعة' : 'Print');

  useEffect(() => {
    if (!templateType) return;
    const fetchTemplates = async () => {
      try {
        const res = await apiClient.get(`/api/printed-templates?template_type=${templateType}&is_active=true`);
        if (res.data?.length > 1) {
          setTemplates(res.data);
        }
      } catch {
        // Silently fail - templates are optional
      }
    };
    fetchTemplates();
  }, [templateType]);

  const handlePrint = useCallback((templateId?: number) => {
    if (onPrint) {
      onPrint(templateId);
      return;
    }
    const url = printUrl || `/print/${entityType}/${entityId}${templateId ? `?template=${templateId}` : ''}`;
    window.open(url, '_blank', 'width=900,height=1100');
    setShowDropdown(false);
  }, [entityType, entityId, onPrint, printUrl]);

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  };

  const iconSize = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4', lg: 'w-5 h-5' };

  if (templates.length > 1) {
    return (
      <div className="relative inline-block">
        <div className="inline-flex rounded-md shadow-sm">
          <button
            onClick={() => handlePrint()}
            className={`inline-flex items-center rounded-l-md border border-blue-600 bg-blue-600 text-white hover:bg-blue-700 transition-colors ${sizeClasses[size]} ${className}`}
          >
            <PrinterIcon className={iconSize[size]} />
            <span>{displayLabel}</span>
          </button>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className={`inline-flex items-center rounded-r-md border border-l-0 border-blue-600 bg-blue-600 text-white hover:bg-blue-700 px-1.5`}
          >
            <ChevronDownIcon className="w-3.5 h-3.5" />
          </button>
        </div>
        {showDropdown && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
            <div className="absolute z-20 mt-1 w-56 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5" style={{ [isRTL ? 'right' : 'left']: 0 }}>
              <div className="py-1">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handlePrint(t.id)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                  >
                    <span>{isRTL ? t.name_ar : t.name_en}</span>
                    {t.is_default && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        {isRTL ? 'افتراضي' : 'Default'}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => handlePrint()}
      className={`inline-flex items-center rounded-md border border-blue-600 bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm ${sizeClasses[size]} ${className}`}
    >
      <PrinterIcon className={iconSize[size]} />
      <span>{displayLabel}</span>
    </button>
  );
}
