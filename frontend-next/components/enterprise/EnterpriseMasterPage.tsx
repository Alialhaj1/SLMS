/**
 * 🏛️ ENTERPRISE MASTER PAGE
 * ===========================
 * 
 * The ultimate reusable page component for master data management.
 * Follows SAP/Oracle/Dynamics-level governance standards.
 * 
 * This single component provides:
 * ✅ Page header with breadcrumbs + description + quick actions
 * ✅ Action toolbar (permission-aware, state-aware)
 * ✅ Smart filter panel (search + advanced + save/load)
 * ✅ Enterprise data grid with sorting, pagination, column visibility
 * ✅ Detail side panel (on record click)
 * ✅ Create/Edit modal with dynamic form
 * ✅ Delete confirmation
 * ✅ Export to Excel/CSV
 * ✅ Audit trail integration
 * ✅ Skeleton loading states
 * ✅ Empty state with CTAs
 * ✅ Full i18n support (AR/EN)
 * ✅ Dark mode
 * ✅ Responsive design
 * ✅ RBAC on every element
 * 
 * Usage:
 * ```tsx
 * <EnterpriseMasterPage config={countriesConfig} />
 * ```
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import MainLayout from '../layout/MainLayout';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';
import SearchableSelect from '../ui/SearchableSelect';
import { StatusBadge } from '../ui/StatusBadge';
import { EmptyState } from '../ui/EmptyState';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import ActionToolbar from './ActionToolbar';
import FilterPanel from './FilterPanel';
import DetailSidePanel from './DetailSidePanel';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { useMasterData } from '../../hooks/useMasterData';
// Enterprise Core Engine hooks
import { useAuditTrail } from '../../hooks/useAuditTrail';
import { useFieldPermissions } from '../../hooks/useFieldPermissions';
import { useReferenceIntegrity } from '../../hooks/useReferenceIntegrity';
import {
  validateForm as validateFormFn,
  generateDefaultFormData,
  populateFormFromRecord,
  getFieldVisibility,
} from '../../lib/governance/validation';
import type {
  PageConfig,
  FieldMeta,
  ColumnMeta,
  ActionMeta,
  AuditEntry,
  StatusType,
  ExportFormat,
} from '../../lib/governance/types';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HomeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  Squares2X2Icon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';

interface EnterpriseMasterPageProps<T extends Record<string, any> = any> {
  /** Page configuration object */
  config: PageConfig<T>;
  /** Custom actions handler */
  onCustomAction?: (actionKey: string, record?: T) => void;
  /** Reference data for select fields */
  referenceData?: Record<string, Array<{ value: any; label: string }>>;
  /** Custom detail panel sections builder */
  buildDetailSections?: (record: T) => Array<{ title: string; fields: Array<{ label: string; value: any; type?: string }> }>;
  /** Custom related records builder */
  buildRelations?: (record: T) => Array<{ type: string; label: string; count: number; href?: string }>;
  /** Pre-submit transformer */
  transformBeforeSubmit?: (data: Record<string, any>, isEditing: boolean) => Record<string, any>;
  /** Post-fetch transformer */
  transformAfterFetch?: (data: T[]) => T[];
  /** Custom column renderer override */
  renderCustomColumn?: (key: string, value: any, row: T) => React.ReactNode | undefined;
  /** Additional filter fields beyond config */
  extraFilterFields?: FieldMeta[];
  /** Custom form footer */
  formFooter?: (isEditing: boolean, formData: Record<string, any>) => React.ReactNode;
  /** Called when a form field changes, allows the parent to alter formData (e.g., auto-inheritance) */
  onFieldChange?: (key: string, value: any, formData: Record<string, any>, setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>) => void;
  /** Override rendering of specific form sections by key.
   *  Return ReactNode to replace the section, or undefined to use default rendering. */
  renderFormSectionOverride?: (
    sectionKey: string,
    formData: Record<string, any>,
    setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>,
    options: {
      editingRecord: T | null;
      apiSelectData: Record<string, Array<{ value: any; label: string; labelAr?: string; code?: string }>>;
      locale: string;
      t: (key: string, fallback?: string) => string;
      formErrors: Record<string, string>;
      submitting: boolean;
    }
  ) => React.ReactNode | undefined;
  /** Called after a successful create or update. Receives the saved record data and whether it was an edit. */
  onAfterSave?: (savedData: any, isEditing: boolean) => void | Promise<void>;
  /** Called when the form modal opens for create (record=null) or edit (record=T). */
  onFormOpen?: (record: T | null) => void;
}

export default function EnterpriseMasterPage<T extends Record<string, any> = any>({
  config,
  onCustomAction,
  referenceData = {},
  buildDetailSections,
  buildRelations,
  transformBeforeSubmit,
  transformAfterFetch,
  renderCustomColumn,
  extraFilterFields = [],
  formFooter,
  onFieldChange: onFieldChangeProp,
  renderFormSectionOverride,
  onAfterSave,
  onFormOpen,
}: EnterpriseMasterPageProps<T>) {
  const { hasPermission } = usePermissions();
  const { t, locale } = useTranslation();
  const { showToast } = useToast();

  // ─── STATE ────────────────────────────────────────────────────────────────
  const [sortField, setSortField] = useState(config.defaultSortField || '');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(config.defaultSortOrder || 'asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(config.defaultPageSize || 10);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [activeOnly, setActiveOnly] = useState(true);

  // View mode: table or cards
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Stats bar
  const [stats, setStats] = useState<Record<string, any> | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Search debounce ref
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<T | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Delete state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<T | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Detail panel state
  const [selectedRecord, setSelectedRecord] = useState<T | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);

  // Column visibility — load from localStorage
  const colStorageKey = `colvis_${config.permissionPrefix}`;
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(colStorageKey);
        if (saved) return new Set(JSON.parse(saved));
      } catch { /* ignore */ }
    }
    return new Set(config.columns.filter((c) => c.defaultVisible !== false).map((c) => c.key));
  });
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  // Selected records for bulk operations
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // ─── CRUD HOOK ────────────────────────────────────────────────────────────
  const {
    data: rawData,
    loading,
    pagination,
    fetchList,
    create,
    update,
    remove,
  } = useMasterData<T>({ endpoint: config.apiEndpoint, autoFetch: false, pageSize });

  // ─── ENGINE HOOKS ─────────────────────────────────────────────────────────
  // Audit Trail - fetches when a record is selected for detail view
  const { timeline: auditTimeline, changes: auditChanges, loading: auditLoading, refresh: refreshAudit } = useAuditTrail(
    detailPanelOpen ? config.resourceName || config.apiEndpoint.replace('/api/', '').replace(/\//g, '-') : null,
    detailPanelOpen && selectedRecord ? (selectedRecord as any).id : null,
    { autoFetch: true }
  );

  // Field Permissions - for form rendering
  const {
    isVisible: isFieldVisible,
    isEditable: isFieldEditable,
    isRequired: isFieldRequired,
    filterVisibleFields,
  } = useFieldPermissions(config.resourceName || config.apiEndpoint.replace('/api/', '').replace(/\//g, '-'));

  // Reference Integrity - for delete impact analysis
  const {
    impact: deleteImpact,
    loading: impactLoading,
    checkImpact,
    blockingMessage,
    blockingMessageAr,
    canDelete: canDeleteByRef,
  } = useReferenceIntegrity(config.resourceName || config.apiEndpoint.replace('/api/', '').replace(/\//g, '-'));

  // ─── DERIVED DATA ─────────────────────────────────────────────────────────
  const allFormFields = useMemo(() => {
    return config.formSections.flatMap((s) => s.fields);
  }, [config.formSections]);

  // ─── API SELECT DATA (fetch options from API dataSource) ──────────────────
  const [apiSelectData, setApiSelectData] = useState<Record<string, Array<{ value: any; label: string; labelAr?: string }>>>({});

  // Collect all unique API endpoints from form + filter fields
  const apiDataSources = useMemo(() => {
    const sources: Array<{ key: string; endpoint: string; valueField: string; labelField: string; labelArField?: string; dataPath?: string }> = [];
    const seen = new Set<string>();
    const collectFromFields = (fields: FieldMeta[]) => {
      for (const field of fields) {
        if (!field) continue;
        if (field.dataSource?.type === 'api' && field.dataSource.endpoint && !seen.has(field.key)) {
          seen.add(field.key);
          sources.push({
            key: field.key,
            endpoint: field.dataSource.endpoint,
            valueField: field.dataSource.valueField || 'id',
            labelField: field.dataSource.labelField || 'name_en',
            labelArField: field.dataSource.labelArField,
            dataPath: field.dataSource.dataPath,
          });
        }
      }
    };
    collectFromFields(allFormFields);
    if (config.filterFields) collectFromFields(config.filterFields);
    if (extraFilterFields) collectFromFields(extraFilterFields);
    return sources;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.formSections, config.filterFields, extraFilterFields]);

  useEffect(() => {
    if (apiDataSources.length === 0) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    const fetchApiSelects = async () => {
      const results: Record<string, Array<{ value: any; label: string; labelAr?: string }>> = {};
      // Group sources by endpoint to avoid duplicate fetches (e.g. shared /filters endpoint)
      const byEndpoint = new Map<string, typeof apiDataSources>();
      for (const src of apiDataSources) {
        const group = byEndpoint.get(src.endpoint) || [];
        group.push(src);
        byEndpoint.set(src.endpoint, group);
      }
      // Fetch each unique endpoint once
      await Promise.all(
        Array.from(byEndpoint.entries()).map(async ([endpoint, sources]) => {
          try {
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${endpoint}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) return;
            const json = await res.json();
            // Distribute to each field that uses this endpoint
            for (const src of sources) {
              const items = src.dataPath ? (json[src.dataPath] || json.data?.[src.dataPath]) : (json.data || json.items || json) || [];
              if (Array.isArray(items)) {
                results[src.key] = items.map((item: any) => ({
                  value: item[src.valueField],
                  label: item[src.labelField] || item.name || item.code || String(item[src.valueField]),
                  labelAr: src.labelArField ? item[src.labelArField] : undefined,
                }));
              }
            }
          } catch { /* silently ignore */ }
        })
      );
      setApiSelectData(results);
    };
    fetchApiSelects();
  }, [apiDataSources]);

  const data = useMemo(() => {
    let result = rawData || [];
    if (transformAfterFetch) result = transformAfterFetch(result);
    
    // Client-side filtering
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((row) => {
        return config.columns.some((col) => {
          const val = (row as Record<string, any>)[col.key];
          return val && String(val).toLowerCase().includes(term);
        });
      });
    }

    // Active only filter
    if (activeOnly && result.length > 0) {
      result = result.filter((row) => {
        const r = row as Record<string, any>;
        if ('is_active' in r) return r.is_active;
        if ('status' in r) return r.status === 'active';
        return true;
      });
    }

    // Client-side sorting
    if (sortField) {
      result = [...result].sort((a, b) => {
        const aVal = (a as Record<string, any>)[sortField];
        const bVal = (b as Record<string, any>)[sortField];
        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [rawData, searchTerm, activeOnly, sortField, sortOrder, transformAfterFetch, config.columns]);

  // ─── EFFECTS ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (hasPermission(`${config.permissionPrefix}:view`)) {
      fetchList({ page: 1, pageSize, search: debouncedSearch, sortBy: sortField, sortOrder, filters: filterValues });
    }
  }, [pageSize]);

  // Search debounce — 300ms
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchTerm]);

  // Fetch stats on mount and when filters change
  useEffect(() => {
    if (config.statsConfig && hasPermission(`${config.permissionPrefix}:view`)) {
      const fetchStats = async () => {
        setStatsLoading(true);
        try {
          const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${config.apiEndpoint}/stats`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const json = await res.json();
            setStats(json.data || json);
          }
        } catch { /* silently fail */ }
        setStatsLoading(false);
      };
      fetchStats();
    }
  }, [config.statsConfig, config.apiEndpoint, config.permissionPrefix, debouncedSearch, filterValues, activeOnly]);

  // Persist column visibility to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(colStorageKey, JSON.stringify([...visibleColumns]));
      } catch { /* ignore */ }
    }
  }, [visibleColumns, colStorageKey]);

  const handleRefresh = useCallback(() => {
    fetchList({ page: currentPage, pageSize, search: debouncedSearch, sortBy: sortField, sortOrder, filters: filterValues });
  }, [fetchList, currentPage, pageSize, debouncedSearch, sortField, sortOrder, filterValues]);

  // ─── SORT ─────────────────────────────────────────────────────────────────
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // ─── PAGINATION ───────────────────────────────────────────────────────────
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchList({ page, pageSize, search: debouncedSearch, sortBy: sortField, sortOrder, filters: filterValues });
  };

  // ─── FORM HANDLING ────────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setEditingRecord(null);
    setFormData(generateDefaultFormData(allFormFields));
    setFormErrors({});
    setModalOpen(true);
    onFormOpen?.(null);
  };

  const handleOpenEdit = (record: T) => {
    setEditingRecord(record);
    setFormData(populateFormFromRecord(allFormFields, record));
    setFormErrors({});
    setModalOpen(true);
    onFormOpen?.(record);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingRecord(null);
    setFormData({});
    setFormErrors({});
  };

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    // Clear field error on change
    if (formErrors[key]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
    // Call parent's onFieldChange callback for custom logic (e.g., auto-inheritance)
    if (onFieldChangeProp) {
      // Use a microtask so the formData state is set first
      setTimeout(() => {
        setFormData((currentData) => {
          const updated = { ...currentData, [key]: value };
          onFieldChangeProp(key, value, updated, setFormData);
          return updated;
        });
      }, 0);
    }
  };

  const handleSubmit = async () => {
    // Validate
    const result = validateFormFn(allFormFields, formData, !!editingRecord);
    if (!result.valid) {
      setFormErrors(result.errors);
      showToast('error', t('common.fixErrors') || 'Please fix the errors before submitting');
      return;
    }

    setSubmitting(true);
    try {
      let payload = { ...formData };

      // ── Sanitize payload: convert types based on field definitions ──
      const fieldTypeMap = new Map<string, string>();
      allFormFields.forEach((f: FieldMeta) => fieldTypeMap.set(f.key, f.type));
      for (const key of Object.keys(payload)) {
        const val = payload[key];
        const fType = fieldTypeMap.get(key);
        // Convert empty strings to null for all field types
        if (val === '' || val === undefined) {
          payload[key] = null;
          continue;
        }
        // Convert numeric types: number, decimal, currency, percentage
        if (fType === 'number' || fType === 'decimal' || fType === 'currency' || fType === 'percentage') {
          const n = Number(val);
          payload[key] = isNaN(n) ? null : n;
        }
        // Select fields with numeric values (month selects, FK IDs)
        if (fType === 'select' || fType === 'searchable-select') {
          if (typeof val === 'string' && /^\d+$/.test(val)) {
            // Check if the options use numeric values
            const field = allFormFields.find((f: FieldMeta) => f.key === key);
            const opts = field?.options || field?.dataSource?.options || [];
            if (opts.length > 0 && typeof opts[0]?.value === 'number') {
              payload[key] = Number(val);
            }
          }
        }
        // Reference fields (FK dropdowns) — convert numeric string IDs to numbers
        if (fType === 'reference') {
          if (typeof val === 'string' && /^\d+$/.test(val)) {
            payload[key] = Number(val);
          } else if (typeof val === 'number') {
            payload[key] = val;
          }
        }
      }

      if (transformBeforeSubmit) {
        payload = transformBeforeSubmit(payload, !!editingRecord);
      }

      let savedData: any;
      if (editingRecord) {
        const id = (editingRecord as any).id;
        savedData = await update(id, payload as Partial<T>);
      } else {
        savedData = await create(payload as any);
      }
      if (savedData && onAfterSave) {
        try { await onAfterSave(savedData, !!editingRecord); } catch { /* ignore secondary save errors */ }
      }
      handleCloseModal();
    } catch (err) {
      // Error handled by useMasterData hook
    } finally {
      setSubmitting(false);
    }
  };

  // ─── DELETE ───────────────────────────────────────────────────────────────
  const handleDeleteClick = async (record: T) => {
    setRecordToDelete(record);
    // Run impact analysis before showing confirm dialog
    try {
      await checkImpact((record as any).id);
    } catch { /* proceed even if impact check fails */ }
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;
    setDeleting(true);
    try {
      await remove((recordToDelete as any).id);
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setRecordToDelete(null);
    }
  };

  // ─── DETAIL PANEL ─────────────────────────────────────────────────────────
  const handleRowClick = (record: T) => {
    if (config.detailPanelEnabled) {
      setSelectedRecord(record);
      setDetailPanelOpen(true);
    }
  };

  // ─── EXPORT ───────────────────────────────────────────────────────────────
  const handleExport = async (format: ExportFormat = 'xlsx') => {
    try {
      const exportData = data.map((row) => {
        const obj: Record<string, any> = {};
        config.columns.forEach((col) => {
          if (visibleColumns.has(col.key)) {
            obj[(col.labelKey ? t(col.labelKey) : '') || col.label] = (row as Record<string, any>)[col.key];
          }
        });
        return obj;
      });

      if (format === 'csv') {
        // Proper CSV escaping: wrap in quotes & double inner quotes
        const escapeCSV = (val: string): string => {
          if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        };
        const headers = Object.keys(exportData[0] || {}).map((h) => escapeCSV(h)).join(',');
        const rows = exportData.map((row) => Object.values(row).map((v) => escapeCSV(String(v ?? ''))).join(','));
        const csv = [headers, ...rows].join('\n');
        // Prepend UTF-8 BOM for proper Arabic support in Excel
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${config.exportFilename || 'export'}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('success', t('common.exportSuccess') || 'Data exported successfully');
      } else if (format === 'json') {
        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${config.exportFilename || 'export'}_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('success', t('common.exportSuccess') || 'Data exported successfully');
      } else {
        // XLSX - dynamic import
        try {
          const XLSX = (await import('xlsx')).default;
          const ws = XLSX.utils.json_to_sheet(exportData);
          // RTL direction for Arabic locale
          if (locale === 'ar') {
            (ws as any)['!dir'] = 'rtl';
          }
          // Auto-column-width calculation
          const exportKeys = Object.keys(exportData[0] || {});
          if (exportKeys.length > 0) {
            ws['!cols'] = exportKeys.map((key) => {
              const maxLen = Math.max(
                key.length,
                ...exportData.map((row) => String(row[key] ?? '').length)
              );
              return { wch: Math.min(maxLen + 2, 50) };
            });
          }
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, (config.titleKey ? t(config.titleKey) : '') || config.title);
          XLSX.writeFile(wb, `${config.exportFilename || 'export'}_${new Date().toISOString().split('T')[0]}.xlsx`);
          showToast('success', t('common.exportSuccess') || 'Data exported successfully');
        } catch {
          // Fallback to CSV if XLSX not available
          handleExport('csv');
        }
      }
    } catch (error) {
      showToast('error', t('common.exportError') || 'Failed to export data');
    }
  };

  // ─── ACTION HANDLER ───────────────────────────────────────────────────────
  const handleAction = (actionKey: string) => {
    switch (actionKey) {
      case 'create':
        handleOpenCreate();
        break;
      case 'refresh':
        handleRefresh();
        break;
      case 'export-xlsx':
        handleExport('xlsx');
        break;
      case 'export-csv':
        handleExport('csv');
        break;
      case 'export-json':
        handleExport('json');
        break;
      default:
        if (onCustomAction) onCustomAction(actionKey);
        break;
    }
  };

  // ─── ROW ACTIONS ──────────────────────────────────────────────────────────
  const rowActions = (config.actions || []).filter((a) => a.position.includes('row'));

  const handleRowAction = (actionKey: string, record: T) => {
    switch (actionKey) {
      case 'edit':
        handleOpenEdit(record);
        break;
      case 'delete':
        handleDeleteClick(record);
        break;
      case 'view':
        handleRowClick(record);
        break;
      case 'clone':
        const cloneData = populateFormFromRecord(allFormFields, record);
        delete cloneData.code; // Force new code
        setEditingRecord(null);
        setFormData(cloneData);
        setFormErrors({});
        setModalOpen(true);
        break;
      default:
        if (onCustomAction) onCustomAction(actionKey, record);
        break;
    }
  };

  // ─── CHECKBOX HANDLING ────────────────────────────────────────────────────
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(data.map((r) => (r as any).id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: number, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedIds(next);
  };

  // ─── PERMISSION CHECK ────────────────────────────────────────────────────
  const canView = hasPermission(`${config.permissionPrefix}:view`);
  const canCreate = hasPermission(`${config.permissionPrefix}:create`);
  const canEdit = hasPermission(`${config.permissionPrefix}:edit`);
  const canDelete = hasPermission(`${config.permissionPrefix}:delete`);

  if (!canView) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <ExclamationTriangleIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {t('common.accessDenied') || 'Access Denied'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {t('common.noPermission') || 'You don\'t have permission to access this page.'}
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // ─── VISIBLE COLUMNS ─────────────────────────────────────────────────────
  const displayColumns = config.columns.filter((col) => {
    if (!visibleColumns.has(col.key)) return false;
    if (col.permission && !hasPermission(col.permission)) return false;
    return true;
  });

  // ─── STAT COLOR MAP ───────────────────────────────────────────────────────
  const STAT_COLORS: Record<string, string> = {
    blue:   'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    green:  'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    red:    'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    cyan:   'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    gray:   'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  };

  // ─── SEARCH HIGHLIGHT HELPER ──────────────────────────────────────────────
  const highlightText = useCallback((text: string) => {
    if (!debouncedSearch || !text) return text;
    const escaped = debouncedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    if (parts.length <= 1) return text;
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === debouncedSearch.toLowerCase()
            ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-700/50 rounded px-0.5">{part}</mark>
            : part
        )}
      </span>
    );
  }, [debouncedSearch]);

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <Head>
        <title>{(config.titleKey ? t(config.titleKey) : '') || config.title} - SLMS</title>
      </Head>

      <div className="space-y-4 pb-8">
        {/* ═══ BREADCRUMBS ═══ */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Link href="/dashboard" className="hover:text-primary-600 dark:hover:text-primary-400">
            <HomeIcon className="w-4 h-4" />
          </Link>
          {config.breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              <ChevronRightIcon className="w-3 h-3" />
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-primary-600 dark:hover:text-primary-400">
                  {(crumb.labelKey ? t(crumb.labelKey) : '') || crumb.label}
                </Link>
              ) : (
                <span className="text-gray-900 dark:text-gray-100 font-medium">{(crumb.labelKey ? t(crumb.labelKey) : '') || crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>

        {/* ═══ PAGE HEADER ═══ */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {config.icon && (
              <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400">
                {config.icon}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {(config.titleKey ? t(config.titleKey) : '') || config.title}
              </h1>
              {(config.subtitleKey || config.subtitle) && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {(config.subtitleKey ? t(config.subtitleKey) : '') || config.subtitle}
                </p>
              )}
            </div>
          </div>
          {/* Record count badge */}
          <div className="flex items-center gap-3">
            {/* View mode toggle */}
            {config.cardsConfig && (
              <div className="flex items-center bg-gray-100 dark:bg-slate-700 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary-600 dark:text-primary-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                  title="Table View"
                >
                  <TableCellsIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'cards' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary-600 dark:text-primary-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                  title="Cards View"
                >
                  <Squares2X2Icon className="w-4 h-4" />
                </button>
              </div>
            )}
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {pagination.totalItems > 0
                ? `${pagination.totalItems} ${t('common.records') || 'records'}`
                : ''}
            </span>
          </div>
        </div>

        {/* ═══ STATS BAR ═══ */}
        {config.statsConfig && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {config.statsConfig.cards.map((card) => (
              <div
                key={card.key}
                className={`rounded-xl border px-4 py-3 transition-all ${STAT_COLORS[card.color] || STAT_COLORS.gray}`}
              >
                <div className="text-xs font-medium uppercase tracking-wider opacity-70 mb-1">
                  {t(card.labelKey || '') || card.label}
                </div>
                {statsLoading ? (
                  <div className="h-7 w-16 bg-current opacity-10 rounded animate-pulse" />
                ) : (
                  <div className="text-2xl font-bold">
                    {stats?.[card.valueKey] != null ? Number(stats[card.valueKey]).toLocaleString() : '—'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ═══ ACTION TOOLBAR ═══ */}
        <ActionToolbar
          actions={config.actions || []}
          onAction={handleAction}
          selectedCount={selectedIds.size}
          loading={loading}
          permissionPrefix={config.permissionPrefix}
          showFilterToggle={!!config.filterFields?.length || extraFilterFields.length > 0}
          filtersActive={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          showColumnToggle={config.columns.some((c) => c.hideable !== false)}
          onToggleColumns={() => setShowColumnPicker(!showColumnPicker)}
        />

        {/* ═══ COLUMN PICKER ═══ */}
        {showColumnPicker && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('common.columnVisibility') || 'Column Visibility'}
            </h3>
            <div className="flex flex-wrap gap-3">
              {config.columns.map((col) => (
                <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleColumns.has(col.key)}
                    onChange={(e) => {
                      const next = new Set(visibleColumns);
                      if (e.target.checked) next.add(col.key);
                      else next.delete(col.key);
                      setVisibleColumns(next);
                    }}
                    className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">{(col.labelKey ? t(col.labelKey) : '') || col.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ═══ FILTER PANEL ═══ */}
        <FilterPanel
          fields={[...(config.filterFields || []), ...extraFilterFields]}
          values={filterValues}
          onChange={(v) => {
            setFilterValues(v);
            setCurrentPage(1);
          }}
          searchValue={searchTerm}
          onSearchChange={(v) => {
            setSearchTerm(v);
            setCurrentPage(1);
          }}
          searchPlaceholder={`${t('common.searchIn') || 'Search in'} ${(config.titleKey ? t(config.titleKey) : '') || config.title}...`}
          isExpanded={showFilters}
          showActiveToggle
          activeOnly={activeOnly}
          onActiveOnlyChange={setActiveOnly}
          referenceData={{...referenceData, ...apiSelectData}}
        />

        {/* ═══ DATA TABLE ═══ */}
        {viewMode === 'table' ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {loading && data.length === 0 ? (
            /* Skeleton Loading */
            <div className="p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-4 animate-pulse">
                    <div className="w-4 h-4 bg-gray-200 dark:bg-slate-700 rounded" />
                    {displayColumns.map((col, ci) => (
                      <div key={ci} className="flex-1 h-4 bg-gray-200 dark:bg-slate-700 rounded" />
                    ))}
                    <div className="w-20 h-4 bg-gray-200 dark:bg-slate-700 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ) : data.length === 0 ? (
            /* Empty State */
            <div className="text-center py-16 px-6">
              {config.icon && (
                <div className="mx-auto w-16 h-16 text-gray-300 dark:text-gray-600 mb-4">
                  {config.icon}
                </div>
              )}
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {searchTerm || Object.keys(filterValues).some((k) => filterValues[k])
                  ? (t('common.noResults') || 'No results found')
                  : (t('common.noData') || 'No data yet')}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">
                {searchTerm
                  ? (t('common.tryDifferentSearch') || 'Try adjusting your search or filters')
                  : (t('common.getStarted') || `Get started by creating your first ${((config.titleKey ? t(config.titleKey) : '') || config.title).toLowerCase()}`)}
              </p>
              {!searchTerm && canCreate && (
                <Button className="mt-4" onClick={handleOpenCreate}>
                  <PlusIcon className="w-4 h-4 mr-2" />
                  {t('common.createFirst') || `Create ${(config.titleKey ? t(config.titleKey) : '') || config.title}`}
                </Button>
              )}
            </div>
          ) : (
            /* Data Table */
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-slate-900/50">
                    <tr>
                      {/* Checkbox column */}
                      {config.bulkOperationsEnabled && (
                        <th className="w-12 px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.size === data.length && data.length > 0}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                          />
                        </th>
                      )}
                      {displayColumns.map((col) => (
                        <th
                          key={col.key}
                          onClick={() => col.sortable && handleSort(col.key)}
                          className={`
                            px-6 py-3 text-xs font-semibold uppercase tracking-wider
                            ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
                            text-gray-500 dark:text-gray-400
                            ${col.sortable ? 'cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none' : ''}
                          `}
                          style={{ width: col.width, minWidth: col.minWidth }}
                        >
                          <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : ''}`}>
                            <span>{(col.labelKey ? t(col.labelKey) : '') || col.label}</span>
                            {col.sortable && sortField === col.key && (
                              sortOrder === 'asc'
                                ? <ChevronUpIcon className="w-3.5 h-3.5" />
                                : <ChevronDownIcon className="w-3.5 h-3.5" />
                            )}
                          </div>
                        </th>
                      ))}
                      {/* Actions column */}
                      {rowActions.length > 0 && (canEdit || canDelete) && (
                        <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 w-28">
                          {t('common.actions') || 'Actions'}
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {data.filter(Boolean).map((row, rowIdx) => {
                      const rid = (row as any).id;
                      const isSelected = selectedIds.has(rid);

                      return (
                        <tr
                          key={rid || rowIdx}
                          onClick={() => handleRowClick(row)}
                          className={`
                            transition-colors animate-fadeInRow
                            ${config.detailPanelEnabled ? 'cursor-pointer' : ''}
                            ${isSelected
                              ? 'bg-primary-50 dark:bg-primary-900/20'
                              : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
                            }
                            ${selectedRecord && (selectedRecord as any).id === rid
                              ? 'ring-2 ring-primary-500 ring-inset'
                              : ''
                            }
                          `}
                          style={{ animationDelay: `${rowIdx * 30}ms` }}
                        >
                          {config.bulkOperationsEnabled && (
                            <td className="w-12 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => handleSelectRow(rid, e.target.checked)}
                                className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                              />
                            </td>
                          )}
                          {displayColumns.map((col) => {
                            const value = (row as Record<string, any>)[col.key];
                            const customRender = renderCustomColumn
                              ? renderCustomColumn(col.key, value, row)
                              : undefined;

                            return (
                              <td
                                key={col.key}
                                className={`
                                  px-6 py-4 whitespace-nowrap text-sm
                                  ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
                                `}
                              >
                                {customRender !== undefined ? customRender : (col.render && row) ? (
                                  col.render(value, row, rowIdx)
                                ) : col.format === 'status' || col.format === 'boolean' ? (
                                  <StatusBadge
                                    variant={value === true || value === 'active' ? 'success' : 'inactive'}
                                    label={value === true || value === 'active'
                                      ? (t('common.active') || 'Active')
                                      : (t('common.inactive') || 'Inactive')}
                                    size="sm"
                                  />
                                ) : col.format === 'date' ? (
                                  <span className="text-gray-900 dark:text-gray-100">
                                    {value ? new Date(value).toLocaleDateString() : '—'}
                                  </span>
                                ) : col.format === 'datetime' ? (
                                  <span className="text-gray-900 dark:text-gray-100">
                                    {value ? new Date(value).toLocaleString() : '—'}
                                  </span>
                                ) : col.format === 'currency' ? (
                                  <span className="text-gray-900 dark:text-gray-100 font-mono">
                                    {value != null ? Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                                  </span>
                                ) : col.format === 'number' ? (
                                  <span className="text-gray-900 dark:text-gray-100 font-mono">
                                    {value != null ? Number(value).toLocaleString() : '—'}
                                  </span>
                                ) : col.format === 'percentage' ? (
                                  <span className="text-gray-900 dark:text-gray-100">
                                    {value != null ? `${Number(value).toFixed(1)}%` : '—'}
                                  </span>
                                ) : (
                                  <span className="text-gray-900 dark:text-gray-100">
                                    {typeof value === 'string' ? highlightText(value) : (value ?? '—')}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          {/* Row actions */}
                          {rowActions.length > 0 && (canEdit || canDelete) && (
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                {config.detailPanelEnabled && (
                                  <button
                                    onClick={() => handleRowClick(row)}
                                    className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                    title={t('common.view') || 'View'}
                                  >
                                    <EyeIcon className="w-4 h-4" />
                                  </button>
                                )}
                                {canEdit && rowActions.some((a) => a.key === 'edit') && (
                                  <button
                                    onClick={() => handleRowAction('edit', row)}
                                    className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                    title={t('common.edit') || 'Edit'}
                                  >
                                    <PencilIcon className="w-4 h-4" />
                                  </button>
                                )}
                                {canDelete && rowActions.some((a) => a.key === 'delete') && (
                                  <button
                                    onClick={() => handleRowAction('delete', row)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                    title={t('common.delete') || 'Delete'}
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900/30">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {t('common.showing') || 'Showing'}{' '}
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {Math.min((currentPage - 1) * pageSize + 1, pagination.totalItems || data.length)}
                    </span>
                    {' '}{t('common.to') || 'to'}{' '}
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {Math.min(currentPage * pageSize, pagination.totalItems || data.length)}
                    </span>
                    {' '}{t('common.of') || 'of'}{' '}
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {pagination.totalItems || data.length}
                    </span>
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="text-sm border border-gray-300 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300"
                  >
                    {(config.pageSizeOptions || [10, 25, 50, 100]).map((size) => (
                      <option key={size} value={size}>{size} / page</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                  </button>
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(pagination.totalPages || 1, 5) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`
                          w-8 h-8 rounded-lg text-sm font-medium transition-colors
                          ${currentPage === page
                            ? 'bg-primary-600 text-white'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                          }
                        `}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= (pagination.totalPages || 1)}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        ) : (
          /* ═══ CARDS VIEW ═══ */
          <div>
            {loading && data.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 animate-pulse">
                    <div className="h-5 w-2/3 bg-gray-200 dark:bg-slate-700 rounded mb-3" />
                    <div className="h-4 w-1/2 bg-gray-200 dark:bg-slate-700 rounded mb-4" />
                    <div className="h-3 w-full bg-gray-200 dark:bg-slate-700 rounded mb-2" />
                    <div className="h-3 w-3/4 bg-gray-200 dark:bg-slate-700 rounded" />
                  </div>
                ))}
              </div>
            ) : data.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 text-center py-16 px-6">
                {config.icon && <div className="mx-auto w-16 h-16 text-gray-300 dark:text-gray-600 mb-4">{config.icon}</div>}
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('common.noData') || 'No data yet'}</h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {data.map((row, rowIdx) => {
                  const rid = (row as any).id;
                  const isSelected = selectedIds.has(rid);
                  const cc = config.cardsConfig;
                  const titleVal = cc?.titleField ? (row as any)[cc.titleField] : (row as any).name;
                  const subtitleVal = cc?.subtitleField ? (row as any)[cc.subtitleField] : (row as any).name_ar;
                  const statusVal = cc?.statusField ? (row as any)[cc.statusField] : (row as any).status;
                  const flagVal = (row as any).flag_emoji;

                  return (
                    <div
                      key={rid || rowIdx}
                      onClick={() => handleRowClick(row)}
                      className={`
                        group relative bg-white dark:bg-slate-800 rounded-xl border shadow-sm
                        transition-all duration-200 animate-fadeInRow
                        ${config.detailPanelEnabled ? 'cursor-pointer' : ''}
                        ${isSelected
                          ? 'border-primary-500 ring-2 ring-primary-500/20'
                          : 'border-gray-200 dark:border-slate-700 hover:shadow-md hover:-translate-y-0.5'
                        }
                      `}
                      style={{ animationDelay: `${rowIdx * 40}ms` }}
                    >
                      {/* Colored top bar on hover */}
                      <div className="h-1 rounded-t-xl bg-transparent group-hover:bg-primary-500 transition-colors" />
                      <div className="p-4">
                        {/* Checkbox */}
                        {config.bulkOperationsEnabled && (
                          <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleSelectRow(rid, e.target.checked)}
                              className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                            />
                          </div>
                        )}

                        {/* Icon / Flag + Title */}
                        <div className="flex items-center gap-3 mb-3">
                          {flagVal && <span className="text-2xl">{flagVal}</span>}
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {titleVal || '—'}
                            </div>
                            {subtitleVal && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate" dir="rtl">
                                {subtitleVal}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Body fields */}
                        {cc?.bodyFields && (
                          <div className="space-y-1 mb-3">
                            {cc.bodyFields.map((fieldKey) => {
                              const col = config.columns.find((c) => c.key === fieldKey);
                              const val = (row as any)[fieldKey];
                              return val ? (
                                <div key={fieldKey} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-500 dark:text-gray-400">{col?.label || fieldKey}</span>
                                  <span className="text-gray-900 dark:text-gray-100 font-medium">{val}</span>
                                </div>
                              ) : null;
                            })}
                          </div>
                        )}

                        {/* Status badge */}
                        {statusVal && (
                          <div className="flex items-center justify-between">
                            <StatusBadge
                              variant={statusVal === 'active' ? 'success' : statusVal === 'restricted' ? 'error' : 'inactive'}
                              label={statusVal}
                              size="sm"
                            />
                          </div>
                        )}

                        {/* Hover actions */}
                        <div className="absolute bottom-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          {canEdit && (
                            <button
                              onClick={() => handleRowAction('edit', row)}
                              className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                            >
                              <PencilIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleRowAction('delete', row)}
                              className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ CREATE/EDIT MODAL ═══ */}
      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={editingRecord
          ? `${t('common.edit') || 'Edit'} ${(config.titleKey ? t(config.titleKey) : '') || config.title}`
          : `${t('common.create') || 'Create'} ${(config.titleKey ? t(config.titleKey) : '') || config.title}`
        }
        size="lg"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
          {config.formSections.map((section, sIdx) => {
            // Check section permission
            if (section.permission && !hasPermission(section.permission)) return null;

            // Allow parent to override entire section rendering
            if (renderFormSectionOverride) {
              const overrideContent = renderFormSectionOverride(section.key, formData, setFormData, {
                editingRecord,
                apiSelectData,
                locale,
                t,
                formErrors,
                submitting,
              });
              if (overrideContent !== undefined) {
                return <div key={sIdx}>{overrideContent}</div>;
              }
            }

            return (
              <div key={sIdx}>
                {(section.labelKey || section.label) && (
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4 pb-2 border-b border-gray-200 dark:border-slate-700 flex items-center gap-2">
                    {section.icon}
                    {(section.labelKey ? t(section.labelKey) : '') || section.label}
                  </h3>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {section.fields.map((field) => {
                    const { visible, required, disabled } = getFieldVisibility(field, formData);
                    if (!visible) return null;

                    // Engine-level field permission check (from backend field_permissions table)
                    if (!isFieldVisible(field.key)) return null;

                    // Check field permission (RBAC-level)
                    if (field.editPermission && !hasPermission(field.editPermission)) {
                      if (field.viewPermission && hasPermission(field.viewPermission)) {
                        return renderReadOnlyField(field, formData[field.key]);
                      }
                      return null;
                    }

                    // Engine-level readonly check
                    const engineReadonly = !isFieldEditable(field.key);
                    if (engineReadonly) {
                      return renderReadOnlyField(field, formData[field.key]);
                    }

                    const colSpan = field.colSpan === 'full' ? 'md:col-span-2' : '';
                    const isDisabled = disabled || (field.immutableAfterCreate && !!editingRecord) || submitting;

                    return (
                      <div key={field.key} className={colSpan}>
                        {renderFormField(field, formData[field.key], required, isDisabled, formErrors[field.key])}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {formFooter && formFooter(!!editingRecord, formData)}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="secondary" onClick={handleCloseModal} disabled={submitting}>
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            {editingRecord ? (t('common.update') || 'Update') : (t('common.create') || 'Create')}
          </Button>
        </div>
      </Modal>

      {/* ═══ DELETE CONFIRMATION ═══ */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setRecordToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={`${t('common.delete') || 'Delete'} ${(config.titleKey ? t(config.titleKey) : '') || config.title}`}
        message={
          deleteImpact && !deleteImpact.can_delete
            ? ((locale === 'ar' && blockingMessageAr ? blockingMessageAr : blockingMessage) || `Cannot delete: record is referenced by other data`)
            : deleteImpact && deleteImpact.total_references > 0
            ? `${t('common.deleteConfirm') || 'Are you sure?'}\n\n⚠️ ${deleteImpact.total_references} reference(s) found: ${deleteImpact.references.map(r => `${r.label_en} (${r.count})`).join(', ')}`
            : `${t('common.deleteConfirm') || 'Are you sure you want to delete this record? This action cannot be undone.'}`
        }
        confirmText={deleteImpact && !deleteImpact.can_delete ? (t('common.close') || 'Close') : (t('common.delete') || 'Delete')}
        variant="danger"
        loading={deleting || impactLoading}
      />

      {/* ═══ DETAIL SIDE PANEL ═══ */}
      {config.detailPanelEnabled && selectedRecord && (
        <DetailSidePanel
          isOpen={detailPanelOpen}
          onClose={() => {
            setDetailPanelOpen(false);
            setSelectedRecord(null);
          }}
          title={(selectedRecord as any).name || (selectedRecord as any).code || `#${(selectedRecord as any).id}`}
          subtitle={(selectedRecord as any).name_ar || (selectedRecord as any).description}
          status={(selectedRecord as any).is_active === false ? 'inactive' : (selectedRecord as any).status || 'active'}
          sections={
            buildDetailSections
              ? buildDetailSections(selectedRecord)
              : buildDefaultDetailSections(selectedRecord, config, t)
          }
          relations={buildRelations ? buildRelations(selectedRecord) : []}
          auditEntries={auditTimeline.map(entry => ({
            id: entry.id,
            action: entry.action as any,
            timestamp: entry.timestamp,
            userId: entry.user_id || 0,
            userName: entry.user_name || entry.user_email || 'System',
            description: entry.entry_type === 'field_change'
              ? `Changed ${entry.field_name}: ${entry.old_value} → ${entry.new_value}`
              : entry.entry_type === 'workflow'
              ? `${entry.action}: ${entry.old_value} → ${entry.new_value}${entry.comment ? ` (${entry.comment})` : ''}`
              : `${entry.action} by ${entry.user_name || entry.user_email || 'system'}`,
            changes: entry.before_data && entry.after_data
              ? Object.keys(entry.after_data)
                  .filter(k => JSON.stringify(entry.before_data?.[k]) !== JSON.stringify(entry.after_data?.[k]))
                  .reduce((acc, k) => {
                    acc[k] = { before: entry.before_data?.[k], after: entry.after_data?.[k] };
                    return acc;
                  }, {} as Record<string, { before: any; after: any }>)
              : undefined,
          }))}
          loading={auditLoading}
          onEdit={canEdit ? () => {
            setDetailPanelOpen(false);
            handleOpenEdit(selectedRecord);
          } : undefined}
          onDelete={canDelete ? () => {
            setDetailPanelOpen(false);
            handleDeleteClick(selectedRecord);
          } : undefined}
          permissionPrefix={config.permissionPrefix}
        />
      )}
    </MainLayout>
  );

  // ─── FORM FIELD RENDERER ─────────────────────────────────────────────────
  function renderFormField(
    field: FieldMeta,
    value: any,
    required: boolean,
    disabled: boolean,
    error?: string
  ): React.ReactNode {
    const resolvedLabel = (field.labelKey ? t(field.labelKey) : '') || field.label;
    const resolvedPlaceholder = (field.placeholderKey ? t(field.placeholderKey) : '') || field.placeholder;
    const resolvedHelperText = (field.helperTextKey ? t(field.helperTextKey) : '') || field.helperText;
    const commonProps = {
      label: resolvedLabel,
      required,
      disabled,
      error,
      helperText: resolvedHelperText,
    };

    switch (field.type) {
      case 'searchable-select': {
        const options = field.options || field.dataSource?.options || apiSelectData[field.key] || referenceData[field.key] || [];
        return (
          <SearchableSelect
            options={options.map((opt: any) => ({
              value: opt.value,
              label: opt.label,
              labelAr: opt.labelAr,
              code: opt.code,
            }))}
            value={value || ''}
            onChange={(v) => {
              const numericOpts = typeof options[0]?.value === 'number';
              handleFieldChange(field.key, v ? (numericOpts ? Number(v) : v) : '');
            }}
            placeholder={resolvedPlaceholder || `${t('common.select', 'Select')} ${resolvedLabel}...`}
            searchPlaceholder={t('common.search', 'Search...')}
            label={resolvedLabel}
            required={required}
            disabled={disabled}
            error={error}
            locale={locale}
          />
        );
      }

      case 'select': {
        const options = field.options || field.dataSource?.options || apiSelectData[field.key] || referenceData[field.key] || [];
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {resolvedLabel} {required && <span className="text-red-500">*</span>}
            </label>
            <select
              value={value || ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value ? (typeof options[0]?.value === 'number' ? Number(e.target.value) : e.target.value) : '')}
              disabled={disabled}
              className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                error ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <option value="">{resolvedPlaceholder || `Select ${resolvedLabel}...`}</option>
              {options.map((opt: any) => (
                <option key={opt.value} value={opt.value}>
                  {(locale === 'ar' && opt.labelAr) ? opt.labelAr : opt.label}
                </option>
              ))}
            </select>
            {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
            {resolvedHelperText && !error && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{resolvedHelperText}</p>
            )}
          </div>
        );
      }

      case 'reference': {
        const refOptions = apiSelectData[field.key] || referenceData[field.key] || [];
        const selectedLabel = refOptions.find((o: any) => String(o.value) === String(value));
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {resolvedLabel} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <select
                value={value || ''}
                onChange={(e) => {
                  const v = e.target.value;
                  handleFieldChange(field.key, v ? (/^\d+$/.test(v) ? Number(v) : v) : null);
                }}
                disabled={disabled}
                className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none ${
                  error ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <option value="">{resolvedPlaceholder || `${t('common.select') || 'Select'} ${resolvedLabel}...`}</option>
                {refOptions.map((opt: any) => (
                  <option key={opt.value} value={opt.value}>
                    {(locale === 'ar' && opt.labelAr) ? opt.labelAr : opt.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {refOptions.length === 0 && !disabled && (
              <p className="mt-1 text-xs text-amber-500 dark:text-amber-400">{t('common.loading') || 'Loading options...'}</p>
            )}
            {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
            {resolvedHelperText && !error && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{resolvedHelperText}</p>
            )}
          </div>
        );
      }

      case 'checkbox':
      case 'toggle':
        return (
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id={`form-${field.key}`}
              checked={!!value}
              onChange={(e) => handleFieldChange(field.key, e.target.checked)}
              disabled={disabled}
              className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor={`form-${field.key}`} className="text-sm text-gray-700 dark:text-gray-300">
              {resolvedLabel}
            </label>
            {resolvedHelperText && (
              <span className="text-xs text-gray-500 dark:text-gray-400">({resolvedHelperText})</span>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {resolvedLabel} {required && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={value || ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              disabled={disabled}
              rows={3}
              placeholder={resolvedPlaceholder}
              className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                error ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
            {resolvedHelperText && !error && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{resolvedHelperText}</p>
            )}
          </div>
        );

      default:
        return (
          <Input
            {...commonProps}
            type={field.type === 'decimal' || field.type === 'currency' || field.type === 'percentage' ? 'number' : field.type === 'code' ? 'text' : (field.type as any)}
            value={value || ''}
            onChange={(e) => {
              let val = e.target.value;
              if (field.autoUppercase || field.type === 'code') {
                val = val.toUpperCase();
              }
              handleFieldChange(field.key, val);
            }}
            placeholder={resolvedPlaceholder}
            step={field.decimalPrecision ? `0.${'0'.repeat(field.decimalPrecision - 1)}1` : undefined}
          />
        );
    }
  }

  function renderReadOnlyField(field: FieldMeta, value: any): React.ReactNode {
    return (
      <div key={field.key}>
        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
          {(field.labelKey ? t(field.labelKey) : '') || field.label}
        </label>
        <div className="text-sm text-gray-900 dark:text-gray-100 py-2">
          {value ?? '—'}
        </div>
      </div>
    );
  }
}

// ─── DEFAULT DETAIL BUILDER ─────────────────────────────────────────────────

function buildDefaultDetailSections<T extends Record<string, any>>(
  record: T,
  config: PageConfig<T>,
  t: (key: string) => string
): Array<{ title: string; fields: Array<{ label: string; value: any; type?: string }> }> {
  const sections: Array<{ title: string; fields: Array<{ label: string; value: any; type?: string }> }> = [];

  // Main section from columns
  const mainFields = config.columns
    .filter((col) => col.key !== 'id')
    .map((col) => ({
      label: (col.labelKey ? t(col.labelKey) : '') || col.label,
      value: record[col.key],
      type: col.format === 'boolean' || col.format === 'status' ? 'status' : col.format === 'date' || col.format === 'datetime' ? 'date' : 'text',
    }));

  sections.push({ title: 'Details', fields: mainFields });

  // Metadata section
  if (record.created_at || record.updated_at) {
    sections.push({
      title: 'Metadata',
      fields: [
        ...(record.created_at ? [{ label: 'Created', value: record.created_at, type: 'date' as const }] : []),
        ...(record.updated_at ? [{ label: 'Updated', value: record.updated_at, type: 'date' as const }] : []),
      ],
    });
  }

  return sections;
}
