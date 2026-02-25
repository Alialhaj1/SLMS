/**
 * 📋 CLEARANCE OFFICES PAGE (Enterprise Edition)
 * ================================================
 *
 * Private customs clearance brokers linked to countries,
 * ports/airports (many-to-many), and supplier accounts.
 *
 * DB: clearance_offices + clearance_office_ports (junction)
 * Dependencies: countries, cities, ports, suppliers
 */

import React, { useState, useEffect, useCallback } from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import {
  clearanceOfficesConfig,
  type ClearanceOffice,
} from '@/config/pages/master/clearanceOffices.config';

// ─── Port option types ──────────────────────────────────────────────────
interface PortOption {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  port_type: string;
  country_id?: number;
}

function ClearanceOfficesPage() {
  const [portOptions, setPortOptions] = useState<PortOption[]>([]);
  const [portSearch, setPortSearch] = useState('');
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);

  // Fetch ports (filtered by selected country when available)
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const url = selectedCountryId
      ? `http://localhost:4000/api/master/ports-airports?limit=500&country_id=${selectedCountryId}`
      : `http://localhost:4000/api/master/ports-airports?limit=500`;

    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(res => {
        if (res.data) setPortOptions(res.data);
      })
      .catch(() => {});
  }, [selectedCountryId]);

  // ──── DETAIL SECTIONS ─────────────────────────────────────────────────
  const buildDetailSections = (row: ClearanceOffice) => {
    const specLabels: Record<string, string> = {
      all: 'General (All)',
      sea: 'Sea Freight',
      air: 'Air Freight',
      land: 'Land Transport',
    };

    return [
      {
        title: 'Office Identity',
        fields: [
          { label: 'Code', value: row.code },
          { label: 'Name', value: row.name },
          { label: 'Name (AR)', value: row.name_ar },
          { label: 'License Number', value: row.license_number },
          { label: 'Tax Number', value: row.tax_number },
          { label: 'Specialization', value: specLabels[row.specialization] || row.specialization },
        ],
      },
      {
        title: 'Location',
        fields: [
          { label: 'Country', value: row.country_name || row.country_name_ar },
          { label: 'City', value: row.city_name || row.city_name_ar },
        ],
      },
      {
        title: 'Linked Ports & Airports',
        fields: (row.ports || []).map(p => ({
          label: p.is_primary ? `★ ${p.code}` : p.code,
          value: `${p.name} (${p.port_type})`,
        })),
      },
      {
        title: 'Contact Information',
        fields: [
          { label: 'Contact Person', value: row.contact_person },
          { label: 'Phone', value: row.phone },
          { label: 'Email', value: row.email },
          { label: 'Website', value: row.website },
          { label: 'Address', value: row.address },
        ],
      },
      {
        title: 'Financial & Supplier',
        fields: [
          { label: 'Supplier Account', value: row.supplier_id ? `#${row.supplier_id}` : null },
          { label: 'Commission Rate', value: row.commission_rate != null ? `${row.commission_rate}%` : null },
          { label: 'License Expiry', value: row.customs_license_expiry },
        ],
      },
      {
        title: 'Status & Rating',
        fields: [
          { label: 'Active', value: row.is_active ? '✔ Active' : '✖ Inactive' },
          { label: 'Rating', value: row.rating ? '★'.repeat(row.rating) : null },
          { label: 'Notes', value: row.notes },
        ],
      },
      {
        title: 'Metadata',
        fields: [
          { label: 'Created', value: row.created_at ? new Date(row.created_at).toLocaleString() : null },
          { label: 'Created By', value: row.created_by_name },
          { label: 'Updated', value: row.updated_at ? new Date(row.updated_at).toLocaleString() : null },
        ],
      },
    ];
  };

  // ──── TRANSFORM BEFORE SUBMIT ─────────────────────────────────────────
  const transformBeforeSubmit = useCallback((data: Record<string, any>, _isEditing: boolean) => {
    const ids = data.port_ids;
    if (Array.isArray(ids)) {
      data.port_ids = ids.map((id: number) => ({
        port_id: id,
        is_primary: data._primary_port_id === id,
      }));
    }
    delete data._primary_port_id;
    return data;
  }, []);

  // ──── CUSTOM FORM SECTION: Ports Multi-Select ─────────────────────────
  const renderFormSectionOverride = useCallback((
    sectionKey: string,
    formData: Record<string, any>,
    setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>,
    options: any
  ): React.ReactNode | undefined => {
    if (sectionKey !== 'ports') return undefined;

    // Track country changes for filtering
    const cid = formData.country_id ? parseInt(formData.country_id) : null;
    if (cid !== selectedCountryId) {
      setTimeout(() => setSelectedCountryId(cid), 0);
    }

    // Get selected port IDs from formData
    let selectedIds: number[] = formData.port_ids || [];

    // If editing and ports array exists but port_ids doesn't
    if (selectedIds.length === 0 && formData.ports && Array.isArray(formData.ports)) {
      selectedIds = formData.ports.map((p: any) => p.id);
      if (selectedIds.length > 0) {
        setTimeout(() => {
          setFormData((prev: Record<string, any>) => ({
            ...prev,
            port_ids: selectedIds,
            _primary_port_id: formData.ports?.find((p: any) => p.is_primary)?.id || null,
          }));
        }, 0);
      }
    }

    const primaryId = formData._primary_port_id || null;

    // Filter options by search and port type icons
    const portTypeIcons: Record<string, string> = {
      sea: '🚢', air: '✈️', land: '🚛', rail: '🚂', multi: '🔄',
    };

    const filtered = portOptions.filter(p => {
      if (!portSearch) return true;
      const s = portSearch.toLowerCase();
      return p.code.toLowerCase().includes(s) ||
             p.name.toLowerCase().includes(s) ||
             (p.name_ar || '').includes(portSearch);
    });

    const togglePort = (id: number) => {
      setFormData((prev: Record<string, any>) => {
        const current: number[] = prev.port_ids || [];
        const updated = current.includes(id)
          ? current.filter((x: number) => x !== id)
          : [...current, id];
        return {
          ...prev,
          port_ids: updated,
          _primary_port_id: prev._primary_port_id === id && !updated.includes(id)
            ? null
            : prev._primary_port_id,
        };
      });
    };

    const setPrimary = (id: number) => {
      setFormData((prev: Record<string, any>) => ({
        ...prev,
        _primary_port_id: prev._primary_port_id === id ? null : id,
      }));
    };

    const hasError = options.formErrors?.port_ids;

    return (
      <div className="space-y-3">
        {!formData.country_id && (
          <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
            ⚠ Select a country first to filter ports by that country
          </div>
        )}

        <input
          type="text"
          placeholder="Search ports & airports..."
          value={portSearch}
          onChange={e => setPortSearch(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />

        {/* Selected ports chips */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedIds.map(id => {
              const p = portOptions.find(o => o.id === id);
              if (!p) return null;
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
                  {portTypeIcons[p.port_type] || '📍'} {p.code} — {p.name}
                  <button
                    type="button"
                    onClick={() => setPrimary(id)}
                    className={`ml-1 text-xs ${isPrimary ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'}`}
                    title={isPrimary ? 'Primary port' : 'Set as primary'}
                  >
                    ★
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePort(id)}
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

        {/* Port list with checkboxes */}
        <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-sm text-gray-400 text-center">
              {formData.country_id ? 'No ports found for this country' : 'No ports available'}
            </div>
          ) : (
            filtered.map(p => {
              const isSelected = selectedIds.includes(p.id);
              return (
                <label
                  key={p.id}
                  className={`flex items-center px-3 py-2 cursor-pointer transition-colors
                    ${isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => togglePort(p.id)}
                    className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                  />
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      <span className="mr-1">{portTypeIcons[p.port_type] || '📍'}</span>
                      <span className="font-mono text-xs text-gray-500 dark:text-gray-400 mr-2">{p.code}</span>
                      {p.name}
                    </div>
                    {p.name_ar && (
                      <div className="text-xs text-gray-400" dir="rtl">{p.name_ar}</div>
                    )}
                  </div>
                  <span className="ml-2 text-xs text-gray-400 dark:text-gray-500 capitalize">
                    {p.port_type}
                  </span>
                </label>
              );
            })
          )}
        </div>
        <p className="text-xs text-gray-400">
          {selectedIds.length} selected · Click ★ to set primary port
        </p>
      </div>
    );
  }, [portOptions, portSearch, selectedCountryId]);

  return (
    <EnterpriseMasterPage<ClearanceOffice>
      config={clearanceOfficesConfig}
      buildDetailSections={buildDetailSections}
      transformBeforeSubmit={transformBeforeSubmit}
      renderFormSectionOverride={renderFormSectionOverride}
    />
  );
}

export default withPermission(
  MenuPermissions.MasterData.ClearanceOffices.View,
  ClearanceOfficesPage
);
