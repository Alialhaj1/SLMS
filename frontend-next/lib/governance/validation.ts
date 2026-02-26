/**
 * 🏛️ ENTERPRISE UI GOVERNANCE - VALIDATION ENGINE
 * =================================================
 * 
 * Validation utilities for the Enterprise UI Governance Framework.
 * Works with FieldMeta, FormSection (PageSection), and ValidationRule types
 * to provide consistent field validation, form validation, default generation,
 * and field visibility logic.
 */

import {
  FieldMeta,
  PageSection,
  FieldDependency,
  ValidationRule,
  PageConfig,
  FieldType,
} from './types';

// ─── SINGLE FIELD VALIDATION ──────────────────────────────────────────────────

/**
 * Validate a single field value against its FieldMeta rules.
 * Returns an error message string, or null if valid.
 */
export function validateField(
  field: FieldMeta,
  value: any,
  record?: Record<string, any>
): string | null {
  const isEmpty = value === undefined || value === null || value === '';

  // Check required (RequiredLevel)
  if (field.required === 'required' && isEmpty) {
    return `${field.label} is required`;
  }

  // If empty and not required, skip remaining validation
  if (isEmpty) return null;

  // Run explicit validation rules
  if (field.validation && field.validation.length > 0) {
    for (const rule of field.validation) {
      const error = runValidationRule(rule, value, field, record);
      if (error) return error;
    }
  }

  // Type-based implicit validation
  const typeError = validateByFieldType(field.type, value, field);
  if (typeError) return typeError;

  return null;
}

/**
 * Execute a single ValidationRule against a value.
 */
function runValidationRule(
  rule: ValidationRule,
  value: any,
  field: FieldMeta,
  record?: Record<string, any>
): string | null {
  const label = field.label;

  switch (rule.type) {
    case 'required':
      if (value === undefined || value === null || value === '') {
        return rule.message || `${label} is required`;
      }
      break;

    case 'minLength': {
      const str = String(value);
      const min = Number(rule.value) || 0;
      if (str.length < min) {
        return rule.message || `${label} must be at least ${min} characters`;
      }
      break;
    }

    case 'maxLength': {
      const str = String(value);
      const max = Number(rule.value) || Infinity;
      if (str.length > max) {
        return rule.message || `${label} must be at most ${max} characters`;
      }
      break;
    }

    case 'min': {
      const num = Number(value);
      const min = Number(rule.value);
      if (isNaN(num) || num < min) {
        return rule.message || `${label} must be at least ${min}`;
      }
      break;
    }

    case 'max': {
      const num = Number(value);
      const max = Number(rule.value);
      if (isNaN(num) || num > max) {
        return rule.message || `${label} must be at most ${max}`;
      }
      break;
    }

    case 'pattern': {
      if (rule.value) {
        const regex = typeof rule.value === 'string' ? new RegExp(rule.value) : rule.value;
        if (!regex.test(String(value))) {
          return rule.message || `${label} format is invalid`;
        }
      }
      break;
    }

    case 'email': {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(value))) {
        return rule.message || `${label} must be a valid email address`;
      }
      break;
    }

    case 'url': {
      try {
        new URL(String(value));
      } catch {
        return rule.message || `${label} must be a valid URL`;
      }
      break;
    }

    case 'phone': {
      const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]*$/;
      if (!phoneRegex.test(String(value))) {
        return rule.message || `${label} must be a valid phone number`;
      }
      break;
    }

    case 'custom': {
      if (typeof rule.validate === 'function') {
        const result = rule.validate(value, record || {});
        if (result) return result;
      }
      break;
    }
  }

  return null;
}

/**
 * Validate value based on field type (implicit rules).
 */
function validateByFieldType(
  type: FieldType,
  value: any,
  field: FieldMeta
): string | null {
  switch (type) {
    case 'email': {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(value))) {
        return `${field.label} must be a valid email address`;
      }
      break;
    }

    case 'url': {
      try {
        new URL(String(value));
      } catch {
        return `${field.label} must be a valid URL`;
      }
      break;
    }

    case 'phone': {
      const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]*$/;
      if (!phoneRegex.test(String(value))) {
        return `${field.label} must be a valid phone number`;
      }
      break;
    }

    case 'number':
    case 'decimal':
    case 'currency':
    case 'percentage': {
      const num = Number(value);
      if (isNaN(num)) {
        return `${field.label} must be a valid number`;
      }
      break;
    }

    case 'date':
    case 'datetime': {
      const d = new Date(value);
      if (isNaN(d.getTime())) {
        return `${field.label} must be a valid date`;
      }
      break;
    }
  }

  return null;
}

// ─── FORM VALIDATION ──────────────────────────────────────────────────────────

/**
 * Validate entire form data against all sections' fields.
 * Returns a map of fieldKey → error message for all validation errors.
 * Empty object means valid.
 */
export function validateForm(
  sections: PageSection[],
  data: Record<string, any>
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const section of sections) {
    for (const field of section.fields) {
      // Check field visibility — skip hidden fields
      const visibility = getFieldVisibility(field, data);
      if (!visibility.visible) continue;

      // If field became required via dependency, validate accordingly
      const effectiveField = visibility.required
        ? { ...field, required: 'required' as const }
        : field;

      const error = validateField(effectiveField, data[field.key], data);
      if (error) {
        errors[field.key] = error;
      }
    }
  }

  return errors;
}

// ─── DEFAULT DATA GENERATION ──────────────────────────────────────────────────

/**
 * Generate default form data from field definitions.
 * Iterates all sections and fields, applying defaultValue where defined.
 */
export function generateDefaultFormData(
  sections: PageSection[]
): Record<string, any> {
  const data: Record<string, any> = {};

  for (const section of sections) {
    for (const field of section.fields) {
      if (field.defaultValue !== undefined) {
        data[field.key] = field.defaultValue;
      } else {
        // Set sensible type-based defaults
        data[field.key] = getDefaultForType(field.type);
      }
    }
  }

  return data;
}

/**
 * Get a sensible default value for a field type.
 */
function getDefaultForType(type: FieldType): any {
  switch (type) {
    case 'checkbox':
    case 'toggle':
      return false;
    case 'number':
    case 'decimal':
    case 'currency':
    case 'percentage':
      return null;
    case 'multi-select':
      return [];
    default:
      return '';
  }
}

// ─── RECORD POPULATION ────────────────────────────────────────────────────────

/**
 * Populate form data from an existing record.
 * Only includes keys that match field definitions in the sections.
 */
export function populateFormFromRecord(
  sections: PageSection[],
  record: Record<string, any>
): Record<string, any> {
  const data: Record<string, any> = {};

  for (const section of sections) {
    for (const field of section.fields) {
      if (record[field.key] !== undefined) {
        data[field.key] = record[field.key];
      } else if (field.defaultValue !== undefined) {
        data[field.key] = field.defaultValue;
      } else {
        data[field.key] = getDefaultForType(field.type);
      }
    }
  }

  return data;
}

// ─── FIELD VISIBILITY / DEPENDENCY RESOLUTION ─────────────────────────────────

/**
 * Check field visibility, enablement, and required state based on dependencies.
 * Evaluates all FieldDependency rules against current form data.
 */
export function getFieldVisibility(
  field: FieldMeta,
  formData: Record<string, any>
): { visible: boolean; enabled: boolean; required: boolean } {
  let visible = true;
  let enabled = true;
  let required = field.required === 'required';

  if (!field.dependencies || field.dependencies.length === 0) {
    return { visible, enabled, required };
  }

  for (const dep of field.dependencies) {
    const depValue = formData[dep.field];
    const conditionMet = evaluateCondition(dep, depValue);

    if (conditionMet) {
      switch (dep.effect) {
        case 'show':
          visible = true;
          break;
        case 'hide':
          visible = false;
          break;
        case 'enable':
          enabled = true;
          break;
        case 'disable':
          enabled = false;
          break;
        case 'require':
          required = true;
          break;
        case 'unrequire':
          required = false;
          break;
      }
    }
  }

  return { visible, enabled, required };
}

/**
 * Evaluate a dependency condition against a value.
 */
function evaluateCondition(dep: FieldDependency, depValue: any): boolean {
  switch (dep.condition) {
    case 'equals':
      return depValue === dep.value;

    case 'notEquals':
      return depValue !== dep.value;

    case 'contains': {
      if (Array.isArray(depValue)) {
        return depValue.includes(dep.value);
      }
      if (typeof depValue === 'string') {
        return depValue.includes(String(dep.value));
      }
      return false;
    }

    case 'notEmpty':
      return depValue !== undefined && depValue !== null && depValue !== '' &&
        !(Array.isArray(depValue) && depValue.length === 0);

    case 'empty':
      return depValue === undefined || depValue === null || depValue === '' ||
        (Array.isArray(depValue) && depValue.length === 0);

    case 'greaterThan':
      return Number(depValue) > Number(dep.value);

    case 'lessThan':
      return Number(depValue) < Number(dep.value);

    default:
      return false;
  }
}

// ─── FIELD VALUE FORMATTING ───────────────────────────────────────────────────

/**
 * Format a field value for display (read-only rendering).
 */
export function formatFieldValue(field: FieldMeta, value: any): string {
  if (value === undefined || value === null || value === '') {
    return '—';
  }

  switch (field.type) {
    case 'currency':
      return formatCurrency(value, field.decimalPrecision ?? 2);

    case 'percentage':
      return `${Number(value).toFixed(field.decimalPrecision ?? 1)}%`;

    case 'decimal':
      return Number(value).toFixed(field.decimalPrecision ?? 2);

    case 'number':
      return Number(value).toLocaleString();

    case 'date':
      return formatDate(value);

    case 'datetime':
      return formatDateTime(value);

    case 'checkbox':
    case 'toggle':
      return value ? 'Yes' : 'No';

    case 'select':
    case 'searchable-select': {
      // Try to find label from options
      if (field.options) {
        const opt = field.options.find((o) => String(o.value) === String(value));
        if (opt) return opt.label;
      }
      if (field.dataSource?.options) {
        const opt = field.dataSource.options.find((o) => String(o.value) === String(value));
        if (opt) return opt.label;
      }
      return String(value);
    }

    case 'multi-select': {
      if (Array.isArray(value)) {
        return value
          .map((v) => {
            const opt = field.options?.find((o) => String(o.value) === String(v));
            return opt ? opt.label : String(v);
          })
          .join(', ');
      }
      return String(value);
    }

    case 'password':
      return '••••••••';

    case 'email':
    case 'url':
    case 'phone':
    case 'text':
    case 'textarea':
    case 'code':
    case 'color':
    case 'reference':
    default:
      return String(value);
  }
}

// ─── FORMATTING HELPERS ───────────────────────────────────────────────────────

function formatCurrency(value: any, decimals: number): string {
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatDate(value: any): string {
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString();
  } catch {
    return String(value);
  }
}

function formatDateTime(value: any): string {
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  } catch {
    return String(value);
  }
}

// ─── UTILITIES ────────────────────────────────────────────────────────────────

/**
 * Extract all field definitions from page sections (flat list).
 */
export function getAllFields(sections: PageSection[]): FieldMeta[] {
  return sections.flatMap((section) => section.fields);
}

/**
 * Find a field by key across all sections.
 */
export function findField(sections: PageSection[], key: string): FieldMeta | undefined {
  for (const section of sections) {
    const field = section.fields.find((f) => f.key === key);
    if (field) return field;
  }
  return undefined;
}

/**
 * Get all required field keys.
 */
export function getRequiredFields(sections: PageSection[]): string[] {
  return getAllFields(sections)
    .filter((f) => f.required === 'required')
    .map((f) => f.key);
}

/**
 * Check if form has unsaved changes by comparing form data with original record.
 */
export function hasUnsavedChanges(
  sections: PageSection[],
  formData: Record<string, any>,
  originalData: Record<string, any>
): boolean {
  for (const section of sections) {
    for (const field of section.fields) {
      const current = formData[field.key];
      const original = originalData[field.key];

      // Normalize both to compare
      const currentStr = current === undefined || current === null ? '' : String(current);
      const originalStr = original === undefined || original === null ? '' : String(original);

      if (currentStr !== originalStr) {
        return true;
      }
    }
  }
  return false;
}
