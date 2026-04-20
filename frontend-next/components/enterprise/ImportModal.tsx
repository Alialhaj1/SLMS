/**
 * 📥 EXCEL IMPORT MODAL
 * =======================
 * Full-featured import modal with:
 * - Drag & drop file upload
 * - Template download
 * - File preview (first 5 rows)
 * - Import progress & results
 * - Error reporting per row
 * - Arabic/English support
 */
import React, { useState, useCallback, useRef } from 'react';
import { companyStore } from '../../lib/companyStore';
import {
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  DocumentArrowUpIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  TableCellsIcon,
  InformationCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import Modal from '../ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../hooks/useToast';

interface ImportResult {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; message: string; data?: Record<string, any> }>;
  autoCreated?: {
    units?: string[];
    mainGroups?: string[];
    subGroups?: string[];
    vendors?: string[];
    priceLists?: string[];
  };
}

type ImportMode = 'skip' | 'upsert' | 'update_only';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** API endpoint base, e.g. '/api/master/item-groups' */
  apiEndpoint: string;
  /** Resource slug for bulk import, e.g. 'item-groups' */
  resourceName: string;
  /** Display title */
  title: string;
  /** Callback after successful import */
  onImportComplete?: () => void;
  /** Whether user has create permission (controls insert modes) */
  canCreate?: boolean;
  /** Whether user has edit permission (controls upsert/update modes) */
  canEdit?: boolean;
  /** Custom import endpoint base (overrides default /api/master/bulk/:resource/import) */
  importEndpoint?: string;
}

export default function ImportModal({
  isOpen,
  onClose,
  apiEndpoint,
  resourceName,
  title,
  onImportComplete,
  canCreate = true,
  canEdit = true,
  importEndpoint,
}: ImportModalProps) {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, any>[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [importMode, setImportMode] = useState<ImportMode>('skip');

  const isRTL = locale === 'ar';

  const resetState = () => {
    setFile(null);
    setPreview([]);
    setPreviewHeaders([]);
    setResult(null);
    setStep('upload');
    setImportMode('skip');
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // ─── FILE HANDLING ──────────────────────────────────────────────────────

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    
    try {
      const XLSX = await import('xlsx');
      const data = await selectedFile.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) return;

      const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (rows.length > 0) {
        setPreviewHeaders(Object.keys(rows[0]));
        setPreview(rows.slice(0, 5));
        setStep('preview');
      } else {
        showToast('error', t('import.emptyFile') || 'The file contains no data');
      }
    } catch {
      showToast('error', t('import.parseError') || 'Failed to parse file');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv'))) {
      processFile(f);
    } else {
      showToast('error', t('import.invalidFile') || 'Please upload an Excel or CSV file');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── TEMPLATE DOWNLOAD ─────────────────────────────────────────────────

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const token = localStorage.getItem('accessToken');
      const companyId = companyStore.getActiveCompanyId();
      const res = await fetch(
        importEndpoint
          ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${importEndpoint}/template`
          : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/master/bulk/${resourceName}/import/template`,
        { headers: { Authorization: `Bearer ${token}`, ...(companyId ? { 'X-Company-Id': String(companyId) } : {}) } }
      );
      if (!res.ok) throw new Error('Failed to download template');
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${resourceName}-import-template.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('success', t('import.templateDownloaded') || 'Template downloaded');
    } catch {
      showToast('error', t('import.templateError') || 'Failed to download template');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // ─── IMPORT ─────────────────────────────────────────────────────────────

  const handleImport = async () => {
    if (!file) return;
    setUploading(true);

    try {
      const token = localStorage.getItem('accessToken');
      const companyId = companyStore.getActiveCompanyId();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', importMode);

      const res = await fetch(
        importEndpoint
          ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${importEndpoint}`
          : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/master/bulk/${resourceName}/import`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, ...(companyId ? { 'X-Company-Id': String(companyId) } : {}) },
          body: formData,
        }
      );

      const json = await res.json();
      if (json.success && json.data) {
        setResult(json.data);
        setStep('result');
        if (json.data.inserted > 0 || json.data.updated > 0) {
          const parts = [];
          if (json.data.inserted > 0) parts.push(`${json.data.inserted} ${t('import.inserted') || 'inserted'}`);
          if (json.data.updated > 0) parts.push(`${json.data.updated} ${t('import.updatedCount') || 'updated'}`);
          showToast('success', parts.join(', '));
          onImportComplete?.();
        } else {
          showToast('warning', t('import.noRecords') || 'No records were imported');
        }
      } else {
        const errMsg = typeof json.error === 'string' ? json.error : json.error?.message || json.message || 'Import failed';
        showToast('error', errMsg);
      }
    } catch {
      showToast('error', t('import.uploadError') || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  // ─── RENDER ─────────────────────────────────────────────────────────────

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`${t('import.importTitle') || 'Import'} ${title}`}
      size="lg"
    >
      <div className="space-y-5" dir={isRTL ? 'rtl' : 'ltr'}>

        {/* ═══ STEP INDICATOR ═══ */}
        <div className="flex items-center justify-center gap-3 mb-2">
          {['upload', 'preview', 'result'].map((s, i) => (
            <React.Fragment key={s}>
              {i > 0 && <div className={`h-0.5 w-8 ${step === s || ['preview','result'].indexOf(step) >= i ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'}`} />}
              <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-all ${
                step === s 
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 ring-1 ring-primary-300 dark:ring-primary-700' 
                  : ['preview','result'].indexOf(step) > i
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                    : 'text-gray-400 dark:text-gray-500'
              }`}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-current/10">
                  {['preview','result'].indexOf(step) > i ? '✓' : i + 1}
                </span>
                {s === 'upload' ? (t('import.stepUpload') || 'Upload') : s === 'preview' ? (t('import.stepPreview') || 'Preview') : (t('import.stepResult') || 'Result')}
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* ═══ STEP 1: UPLOAD ═══ */}
        {step === 'upload' && (
          <div className="space-y-4">
            {/* Template download */}
            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <InformationCircleIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <div className="flex-1 text-sm text-blue-700 dark:text-blue-300">
                {t('import.templateHint') || 'Download the template to see the correct format for your data'}
              </div>
              <button
                onClick={handleDownloadTemplate}
                disabled={downloadingTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg
                  bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50
                  transition-colors whitespace-nowrap"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                {downloadingTemplate ? (t('common.downloading') || 'Downloading...') : (t('import.downloadTemplate') || 'Download Template')}
              </button>
            </div>

            {/* Drag & drop zone */}
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
                ${dragActive 
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 scale-[1.01]' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <DocumentArrowUpIcon className={`w-12 h-12 mx-auto mb-3 transition-colors ${dragActive ? 'text-primary-500' : 'text-gray-400'}`} />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('import.dragDrop') || 'Drag & drop your file here, or click to browse'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('import.fileTypes') || 'Supported formats: Excel (.xlsx, .xls), CSV (.csv) — Max 5MB'}
              </p>
            </div>
          </div>
        )}

        {/* ═══ STEP 2: PREVIEW ═══ */}
        {step === 'preview' && file && (
          <div className="space-y-4">
            {/* File info */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <TableCellsIcon className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB · {preview.length > 0 ? `${preview.length}+ ${t('import.rows') || 'rows'}` : ''}</p>
                </div>
              </div>
              <button
                onClick={resetState}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Import mode selector */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 block">
                {t('import.importMode') || 'Import Mode'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'skip' as ImportMode, label: t('import.modeSkip') || 'Insert Only', desc: t('import.modeSkipDesc') || 'Skip existing records', icon: ArrowUpTrayIcon, needsCreate: true, needsEdit: false },
                  { value: 'upsert' as ImportMode, label: t('import.modeUpsert') || 'Insert & Update', desc: t('import.modeUpsertDesc') || 'Insert new, update existing', icon: ArrowPathIcon, needsCreate: true, needsEdit: true },
                  { value: 'update_only' as ImportMode, label: t('import.modeUpdateOnly') || 'Update Only', desc: t('import.modeUpdateOnlyDesc') || 'Only update existing records', icon: ArrowPathIcon, needsCreate: false, needsEdit: true },
                ]).filter(opt => {
                  if (opt.needsCreate && !canCreate) return false;
                  if (opt.needsEdit && !canEdit) return false;
                  return true;
                }).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setImportMode(opt.value)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-all text-center ${
                      importMode === opt.value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-300 dark:ring-primary-700'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <opt.icon className={`w-5 h-5 ${importMode === opt.value ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`} />
                    <span className={`text-xs font-semibold ${importMode === opt.value ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}`}>{opt.label}</span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview table */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {t('import.previewTitle') || 'Preview (first 5 rows)'}
                </span>
              </div>
              <div className="overflow-x-auto max-h-48">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">#</th>
                      {previewHeaders.map(h => (
                        <th key={h} className="px-2 py-1.5 text-left font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="px-2 py-1 text-gray-400 border-b border-gray-100 dark:border-gray-800">{i + 1}</td>
                        {previewHeaders.map(h => (
                          <td key={h} className="px-2 py-1 text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800 whitespace-nowrap max-w-[200px] truncate">
                            {String(row[h] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={resetState}
                className="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {t('import.changeFile') || 'Change File'}
              </button>
              <button
                onClick={handleImport}
                disabled={uploading}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg
                  bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50
                  transition-all shadow-sm hover:shadow-md"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {t('import.importing') || 'Importing...'}
                  </>
                ) : (
                  <>
                    <ArrowUpTrayIcon className="w-4 h-4" />
                    {t('import.startImport') || 'Start Import'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 3: RESULT ═══ */}
        {step === 'result' && result && (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className={`grid gap-3 ${result.updated > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{result.total}</div>
                <div className="text-xs text-blue-600 dark:text-blue-400">{t('import.totalRows') || 'Total Rows'}</div>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{result.inserted}</div>
                <div className="text-xs text-green-600 dark:text-green-400">{t('import.inserted') || 'Inserted'}</div>
              </div>
              {result.updated > 0 && (
                <div className="text-center p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{result.updated}</div>
                  <div className="text-xs text-indigo-600 dark:text-indigo-400">{t('import.updatedCount') || 'Updated'}</div>
                </div>
              )}
              <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{result.skipped}</div>
                <div className="text-xs text-amber-600 dark:text-amber-400">{t('import.skipped') || 'Skipped'}</div>
              </div>
            </div>

            {/* Success/Warning message */}
            {(result.inserted > 0 || result.updated > 0) ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-sm text-green-700 dark:text-green-300">
                  {result.inserted > 0 && `${result.inserted} ${t('import.inserted') || 'inserted'}`}
                  {result.inserted > 0 && result.updated > 0 && ', '}
                  {result.updated > 0 && `${result.updated} ${t('import.updatedCount') || 'updated'}`}
                  {' '}{t('import.successMessage') || 'successfully!'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <span className="text-sm text-amber-700 dark:text-amber-300">
                  {t('import.noRecordsMessage') || 'No records were imported. Check the errors below.'}
                </span>
              </div>
            )}

            {/* Auto-created records summary (for items import) */}
            {result.autoCreated && (
              (result.autoCreated.units?.length > 0 || result.autoCreated.mainGroups?.length > 0 || 
               result.autoCreated.subGroups?.length > 0 || result.autoCreated.vendors?.length > 0 || 
               result.autoCreated.priceLists?.length > 0) && (
                <div className="border border-purple-200 dark:border-purple-800 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800">
                    <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                      سجلات تم إنشاؤها تلقائياً
                    </span>
                  </div>
                  <div className="p-3 space-y-1.5">
                    {result.autoCreated.units?.length > 0 && (
                      <div className="text-xs text-gray-700 dark:text-gray-300">
                        <span className="font-medium text-purple-600 dark:text-purple-400">الوحدات:</span>{' '}
                        {result.autoCreated.units.join('، ')}
                      </div>
                    )}
                    {result.autoCreated.mainGroups?.length > 0 && (
                      <div className="text-xs text-gray-700 dark:text-gray-300">
                        <span className="font-medium text-purple-600 dark:text-purple-400">المجموعات:</span>{' '}
                        {result.autoCreated.mainGroups.join('، ')}
                      </div>
                    )}
                    {result.autoCreated.vendors?.length > 0 && (
                      <div className="text-xs text-gray-700 dark:text-gray-300">
                        <span className="font-medium text-purple-600 dark:text-purple-400">الموردين:</span>{' '}
                        {result.autoCreated.vendors.join('، ')}
                      </div>
                    )}
                    {result.autoCreated.priceLists?.length > 0 && (
                      <div className="text-xs text-gray-700 dark:text-gray-300">
                        <span className="font-medium text-purple-600 dark:text-purple-400">قوائم الأسعار:</span>{' '}
                        {result.autoCreated.priceLists.join('، ')}
                      </div>
                    )}
                  </div>
                </div>
              )
            )}

            {/* Error details */}
            {result.errors.length > 0 && (
              <div className="border border-red-200 dark:border-red-800 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
                  <span className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                    <ExclamationCircleIcon className="w-4 h-4" />
                    {result.errors.length} {t('import.errorsFound') || 'errors found'}
                  </span>
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 px-3 py-2 text-xs border-b border-red-100 dark:border-red-900/30 last:border-0">
                      <span className="font-mono text-red-500 flex-shrink-0">Row {err.row}</span>
                      <span className="text-red-700 dark:text-red-300">{err.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={resetState}
                className="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {t('import.importAnother') || 'Import Another File'}
              </button>
              <button
                onClick={handleClose}
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-sm"
              >
                {t('common.done') || 'Done'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
