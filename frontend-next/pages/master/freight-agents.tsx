/**
 * 🚛 FREIGHT AGENTS PAGE (Enterprise Edition)
 * =============================================
 *
 * Freight agents linked to shipping companies (many-to-many).
 * An agent MUST be linked to at least one shipping company.
 *
 * DB: shipping_agents + freight_agent_companies (junction)
 * Dependencies: shipping_companies
 */

import React, { useState, useEffect, useCallback } from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import {
  freightAgentsConfig,
  type FreightAgent,
} from '@/config/pages/master/freightAgents.config';

// ─── Shipping Company picker types ─────────────────────────────────────
interface ShippingCompanyOption {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  company_type?: string;
}

function FreightAgentsPage() {
  const [shippingCompanyOptions, setShippingCompanyOptions] = useState<ShippingCompanyOption[]>([]);
  const [companySearch, setCompanySearch] = useState('');

  // Fetch shipping companies for the multi-select picker
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    fetch('http://localhost:4000/api/master/shipping-companies?limit=500', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(res => {
        if (res.data) setShippingCompanyOptions(res.data);
      })
      .catch(() => {});
  }, []);

  // ──── DETAIL SECTIONS ─────────────────────────────────────────────────
  const buildDetailSections = (row: FreightAgent) => {
    const typeLabels: Record<string, string> = {
      freight_forwarder: 'Freight Forwarder',
      shipping_line: 'Shipping Line Agent',
      nvocc: 'NVOCC',
      customs_broker: 'Customs Broker',
      air_cargo: 'Air Cargo Agent',
      land_transport: 'Land Transport',
    };

    return [
      {
        title: 'Agent Identity',
        fields: [
          { label: 'Code', value: row.code },
          { label: 'Name', value: row.name },
          { label: 'Name (AR)', value: row.name_ar },
          { label: 'Type', value: typeLabels[row.agent_type] || row.agent_type },
          { label: 'License', value: row.license_number },
        ],
      },
      {
        title: 'Linked Shipping Companies',
        fields: (row.shipping_companies || []).map(c => ({
          label: c.is_primary ? `★ ${c.code}` : c.code,
          value: `${c.name}${c.company_type ? ` (${c.company_type})` : ''}`,
        })),
      },
      {
        title: 'Contact Information',
        fields: [
          { label: 'Contact Person', value: row.contact_person },
          { label: 'Phone', value: row.phone },
          { label: 'Email', value: row.email },
          { label: 'Address', value: row.address },
        ],
      },
      {
        title: 'Financial',
        fields: [
          { label: 'Credit Limit', value: row.credit_limit != null ? `${Number(row.credit_limit).toLocaleString()}` : null },
        ],
      },
      {
        title: 'Status',
        fields: [
          { label: 'Active', value: row.is_active ? '✔ Active' : '✖ Inactive' },
        ],
      },
      {
        title: 'Metadata',
        fields: [
          { label: 'Created', value: row.created_at ? new Date(row.created_at).toLocaleString() : null },
          { label: 'Created By', value: row.created_by_name },
          { label: 'Updated', value: row.updated_at ? new Date(row.updated_at).toLocaleString() : null },
          { label: 'Updated By', value: row.updated_by_name },
        ],
      },
    ];
  };

  // ──── TRANSFORM BEFORE SUBMIT ─────────────────────────────────────────
  const transformBeforeSubmit = useCallback((data: Record<string, any>, isEditing: boolean) => {
    const ids = data.shipping_company_ids;
    if (Array.isArray(ids)) {
      data.shipping_company_ids = ids.map((id: number) => ({
        company_id: id,
        is_primary: data._primary_company_id === id,
      }));
    }
    delete data._primary_company_id;
    return data;
  }, []);

  // ──── CUSTOM FORM SECTION: Shipping Companies Multi-Select ────────────
  const renderFormSectionOverride = useCallback((
    sectionKey: string,
    formData: Record<string, any>,
    setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>,
    options: any
  ): React.ReactNode | undefined => {
    if (sectionKey !== 'shipping_companies') return undefined;

    // Get selected company IDs from formData
    let selectedIds: number[] = formData.shipping_company_ids || [];

    // If editing and shipping_companies array exists but shipping_company_ids doesn't
    if (selectedIds.length === 0 && formData.shipping_companies && Array.isArray(formData.shipping_companies)) {
      selectedIds = formData.shipping_companies.map((c: any) => c.id);
      if (selectedIds.length > 0) {
        setTimeout(() => {
          setFormData((prev: Record<string, any>) => ({
            ...prev,
            shipping_company_ids: selectedIds,
            _primary_company_id: formData.shipping_companies?.find((c: any) => c.is_primary)?.id || null,
          }));
        }, 0);
      }
    }

    const primaryId = formData._primary_company_id || null;

    // Filter options by search
    const filtered = shippingCompanyOptions.filter(c => {
      if (!companySearch) return true;
      const s = companySearch.toLowerCase();
      return c.code.toLowerCase().includes(s) ||
             c.name.toLowerCase().includes(s) ||
             (c.name_ar || '').includes(companySearch);
    });

    const toggleCompany = (id: number) => {
      setFormData((prev: Record<string, any>) => {
        const current: number[] = prev.shipping_company_ids || [];
        const updated = current.includes(id)
          ? current.filter((x: number) => x !== id)
          : [...current, id];
        return {
          ...prev,
          shipping_company_ids: updated,
          _primary_company_id: prev._primary_company_id === id && !updated.includes(id)
            ? null
            : prev._primary_company_id,
        };
      });
    };

    const setPrimary = (id: number) => {
      setFormData((prev: Record<string, any>) => ({
        ...prev,
        _primary_company_id: prev._primary_company_id === id ? null : id,
      }));
    };

    const hasError = options.formErrors?.shipping_company_ids;

    return (
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Search shipping companies..."
          value={companySearch}
          onChange={e => setCompanySearch(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />

        {selectedIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedIds.map(id => {
              const c = shippingCompanyOptions.find(o => o.id === id);
              if (!c) return null;
              const isPrimary = primaryId === id;
              return (
                <span
                  key={id}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                    ${isPrimary
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                >
                  {c.code} — {c.name}
                  <button
                    type="button"
                    onClick={() => setPrimary(id)}
                    className={`ml-1 text-xs ${isPrimary ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'}`}
                    title={isPrimary ? 'Primary agent' : 'Set as primary'}
                  >
                    ★
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleCompany(id)}
                    className="ml-0.5 text-gray-400 hover:text-red-500"
                    title="Remove"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {hasError && (
          <p className="text-sm text-red-600 dark:text-red-400">{hasError}</p>
        )}

        <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-sm text-gray-400 text-center">No shipping companies found</div>
          ) : (
            filtered.map(c => {
              const isSelected = selectedIds.includes(c.id);
              return (
                <label
                  key={c.id}
                  className={`flex items-center px-3 py-2 cursor-pointer transition-colors
                    ${isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleCompany(c.id)}
                    className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                  />
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      <span className="font-mono text-xs text-gray-500 dark:text-gray-400 mr-2">{c.code}</span>
                      {c.name}
                    </div>
                    {c.name_ar && (
                      <div className="text-xs text-gray-400" dir="rtl">{c.name_ar}</div>
                    )}
                  </div>
                  {c.company_type && (
                    <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                      {c.company_type}
                    </span>
                  )}
                </label>
              );
            })
          )}
        </div>
        <p className="text-xs text-gray-400">
          {selectedIds.length} selected · Click ★ to set primary company
        </p>
      </div>
    );
  }, [shippingCompanyOptions, companySearch]);

  return (
    <EnterpriseMasterPage<FreightAgent>
      config={freightAgentsConfig}
      buildDetailSections={buildDetailSections}
      transformBeforeSubmit={transformBeforeSubmit}
      renderFormSectionOverride={renderFormSectionOverride}
    />
  );
}

export default withPermission(
  MenuPermissions.Logistics.FreightAgents.View,
  FreightAgentsPage
);
