/**
 * Enhanced Translation Hooks
 * Provides easy-to-use hooks for different translation scenarios
 */

import { useLocale } from '../contexts/LocaleContext';

/**
 * Hook for page-specific translations
 * Automatically prefixes keys with the page/section name
 */
export function usePageTranslations(pageKey: string) {
  const { t, tt } = useLocale();
  
  const pt = (key: string, values?: Record<string, string | number>) => {
    return t(`${pageKey}.${key}`, values);
  };
  
  const ptt = (key: string) => {
    return tt(`${pageKey}.${key}`);
  };
  
  return { pt, ptt, t, tt };
}

/**
 * Hook for form translations and validation
 */
export function useFormTranslations(formKey?: string) {
  const { t, tv, tt } = useLocale();
  
  const ft = (key: string, values?: Record<string, string | number>) => {
    const fullKey = formKey ? `${formKey}.${key}` : key;
    return t(fullKey, values);
  };
  
  const ftt = (key: string) => {
    const fullKey = formKey ? `${formKey}.${key}` : key;
    return tt(fullKey);
  };
  
  const fv = (field: string, rule: string, values?: Record<string, string | number>) => {
    return tv(field, rule, values);
  };
  
  return { ft, ftt, fv, t, tv, tt };
}

/**
 * Hook for shipment-related translations
 */
export function useShipmentTranslations() {
  const { t, tt } = useLocale();
  
  const st = (key: string, values?: Record<string, string | number>) => {
    return t(`shipments.${key}`, values);
  };
  
  const stt = (key: string) => {
    return tt(`shipments.${key}`);
  };
  
  // Specific shipment translation helpers
  const getStatusText = (status: string) => st(`status.${status}`);
  const getTypeText = (type: string) => st(`types.${type}`);
  const getModeText = (mode: string) => st(`modes.${mode}`);
  const getContainerText = (container: string) => st(`containers.${container}`);
  const getIncotermText = (incoterm: string) => st(`incoterms.${incoterm}`);
  const getPriorityText = (priority: string) => st(`priorities.${priority}`);
  const getServiceText = (service: string) => st(`serviceTypes.${service}`);
  
  return {
    st,
    stt,
    getStatusText,
    getTypeText,
    getModeText,
    getContainerText,
    getIncotermText,
    getPriorityText,
    getServiceText
  };
}

/**
 * Hook for accounting-related translations
 */
export function useAccountingTranslations() {
  const { t, tt } = useLocale();
  
  const at = (key: string, values?: Record<string, string | number>) => {
    return t(`accounting.${key}`, values);
  };
  
  const att = (key: string) => {
    return tt(`accounting.${key}`);
  };
  
  // Specific accounting translation helpers
  const getAccountTypeText = (type: string) => at(`accountTypes.${type}`);
  const getTransactionText = (transaction: string) => at(`transactions.${transaction}`);
  const getReportText = (report: string) => at(`reports.${report}`);
  const getStatusText = (status: string) => at(`status.${status}`);
  const getPeriodText = (period: string) => at(`periods.${period}`);
  
  return {
    at,
    att,
    getAccountTypeText,
    getTransactionText,
    getReportText,
    getStatusText,
    getPeriodText
  };
}

/**
 * Hook for common UI translations
 */
export function useCommonTranslations() {
  const { t, tt } = useLocale();
  
  const ct = (key: string, values?: Record<string, string | number>) => {
    return t(`common.${key}`, values);
  };
  
  const ctt = (key: string) => {
    return tt(`common.${key}`);
  };
  
  // Common action translations
  const actions = {
    save: () => ct('actions.save'),
    cancel: () => ct('actions.cancel'),
    delete: () => ct('actions.delete'),
    edit: () => ct('actions.edit'),
    add: () => ct('actions.add'),
    create: () => ct('actions.create'),
    update: () => ct('actions.update'),
    search: () => ct('actions.search'),
    filter: () => ct('actions.filter'),
    refresh: () => ct('actions.refresh'),
    export: () => ct('actions.export'),
    import: () => ct('actions.import'),
    print: () => ct('actions.print'),
    close: () => ct('actions.close'),
    back: () => ct('actions.back'),
    next: () => ct('actions.next'),
    previous: () => ct('actions.previous'),
    confirm: () => ct('actions.confirm'),
    submit: () => ct('actions.submit')
  };
  
  // Common status translations
  const status = {
    active: () => ct('status.active'),
    inactive: () => ct('status.inactive'),
    pending: () => ct('status.pending'),
    approved: () => ct('status.approved'),
    rejected: () => ct('status.rejected'),
    completed: () => ct('status.completed'),
    cancelled: () => ct('status.cancelled'),
    draft: () => ct('status.draft'),
    published: () => ct('status.published'),
    loading: () => ct('status.loading'),
    saving: () => ct('status.saving'),
    processing: () => ct('status.processing')
  };
  
  // Common labels
  const labels = {
    name: () => ct('labels.name'),
    nameAr: () => ct('labels.nameAr'),
    nameEn: () => ct('labels.nameEn'),
    description: () => ct('labels.description'),
    code: () => ct('labels.code'),
    type: () => ct('labels.type'),
    category: () => ct('labels.category'),
    status: () => ct('labels.status'),
    date: () => ct('labels.date'),
    amount: () => ct('labels.amount'),
    quantity: () => ct('labels.quantity'),
    price: () => ct('labels.price'),
    total: () => ct('labels.total'),
    email: () => ct('labels.email'),
    phone: () => ct('labels.phone'),
    address: () => ct('labels.address'),
    notes: () => ct('labels.notes'),
    currency: () => ct('labels.currency'),
    reference: () => ct('labels.reference')
  };
  
  // Common messages
  const messages = {
    success: {
      saved: () => ct('messages.success.saved'),
      updated: () => ct('messages.success.updated'),
      deleted: () => ct('messages.success.deleted'),
      created: () => ct('messages.success.created')
    },
    error: {
      general: () => ct('messages.error.general'),
      network: () => ct('messages.error.network'),
      server: () => ct('messages.error.server'),
      validation: () => ct('messages.error.validation'),
      saveFailed: () => ct('messages.error.saveFailed'),
      deleteFailed: () => ct('messages.error.deleteFailed')
    },
    info: {
      noData: () => ct('messages.info.noData'),
      loading: () => ct('messages.info.loading'),
      processing: () => ct('messages.info.processing')
    },
    confirmation: {
      delete: () => ct('messages.confirmation.delete'),
      cancel: () => ct('messages.confirmation.cancel'),
      discard: () => ct('messages.confirmation.discard')
    }
  };
  
  return {
    ct,
    ctt,
    actions,
    status,
    labels,
    messages
  };
}

/**
 * Hook for error translations
 */
export function useErrorTranslations() {
  const { t } = useLocale();
  
  const et = (key: string, values?: Record<string, string | number>) => {
    return t(`errors.${key}`, values);
  };
  
  // Helper for HTTP error codes
  const getHttpError = (code: number) => {
    return et(`codes.${code}`) || et('server.general');
  };
  
  // Helper for validation errors
  const getValidationError = (field: string, rule: string, values?: Record<string, string | number>) => {
    const fieldKey = `validation.${field}.${rule}`;
    const genericKey = `validation.${rule}`;
    
    let message = et(fieldKey, values);
    if (message === fieldKey) {
      message = et(genericKey, values);
    }
    
    return message;
  };
  
  return {
    et,
    getHttpError,
    getValidationError
  };
}