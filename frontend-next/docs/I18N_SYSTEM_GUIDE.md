# 🌐 SLMS Internationalization (i18n) System

## Overview

The SLMS system now includes a comprehensive internationalization (i18n) system that supports Arabic and English with full RTL/LTR support, advanced translation features, validation messages, and formatting utilities.

## 🏗️ Architecture

### File Structure
```
frontend-next/
├── locales/
│   ├── ar/
│   │   ├── common.json         # Common UI elements
│   │   ├── shipments.json      # Shipment-specific terms
│   │   ├── accounting.json     # Accounting/finance terms
│   │   ├── errors.json         # Error messages & validation
│   │   └── tooltips.json       # Help text & tooltips
│   └── en/
│       ├── common.json
│       ├── shipments.json
│       ├── accounting.json
│       ├── errors.json
│       └── tooltips.json
├── contexts/
│   └── LocaleContext.tsx       # Enhanced locale context
├── hooks/
│   └── useTranslations.ts      # Specialized translation hooks
└── lib/
    └── i18n.ts                 # Core i18n utilities
```

## 🚀 Quick Start

### Basic Usage

```tsx
import { useCommonTranslations } from '../../hooks/useTranslations';
import { useLocale } from '../../contexts/LocaleContext';

function MyComponent() {
  const { actions, labels, messages } = useCommonTranslations();
  const { locale, isRTL, loading } = useLocale();
  
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <h1>{labels.name()}</h1>
      <button>{actions.save()}</button>
      {loading && <p>{messages.info.loading()}</p>}
    </div>
  );
}
```

### Advanced Translation with Placeholders

```tsx
import { useLocale } from '../../contexts/LocaleContext';

function OrderSummary({ customerName, itemCount }) {
  const { t } = useLocale();
  
  return (
    <p>
      {t('orders.summary', { 
        customer: customerName, 
        count: itemCount 
      })}
    </p>
  );
}
```

## 📋 Available Hooks

### 1. `useCommonTranslations()`
For general UI elements, actions, status, and messages.

```tsx
const { actions, labels, messages, status } = useCommonTranslations();

// Actions
actions.save()     // "Save" / "حفظ"
actions.cancel()   // "Cancel" / "إلغاء"
actions.delete()   // "Delete" / "حذف"

// Labels
labels.name()      // "Name" / "الاسم"
labels.email()     // "Email" / "البريد الإلكتروني"
labels.amount()    // "Amount" / "المبلغ"

// Messages
messages.success.saved()    // "Saved successfully" / "تم الحفظ بنجاح"
messages.error.network()    // "Network error" / "خطأ في الشبكة"
messages.info.loading()     // "Loading..." / "جاري التحميل..."

// Status
status.active()    // "Active" / "نشط"
status.pending()   // "Pending" / "في الانتظار"
```

### 2. `useShipmentTranslations()`
For shipment-specific terminology.

```tsx
const { st, getStatusText, getTypeText, getModeText } = useShipmentTranslations();

st('titles.shipmentsManagement')  // "Shipments Management" / "إدارة الشحنات"
st('labels.trackingNumber')       // "Tracking Number" / "رقم التتبع"

getStatusText('inTransit')        // "In Transit" / "في الطريق"
getTypeText('import')             // "Import" / "استيراد"
getModeText('sea')               // "Sea" / "بحري"
```

### 3. `useAccountingTranslations()`
For accounting and financial terms.

```tsx
const { at, getAccountTypeText, getReportText } = useAccountingTranslations();

at('titles.generalLedger')        // "General Ledger" / "دفتر الأستاذ العام"
at('labels.accountCode')          // "Account Code" / "كود الحساب"

getAccountTypeText('assets')      // "Assets" / "الأصول"
getReportText('balanceSheet')     // "Balance Sheet" / "الميزانية العمومية"
```

### 4. `useFormTranslations(formKey?)`
For form-specific translations with optional namespacing.

```tsx
const { ft, fv } = useFormTranslations('userForm');

ft('title')                      // Looks for userForm.title
fv('email', 'invalid')          // Validation message for email field
```

### 5. `useValidation()`
For form validation messages.

```tsx
const validation = useValidation();

validation.required('email')      // "Email is required" / "البريد الإلكتروني مطلوب"
validation.minLength('password', 8) // "Password must be at least 8 characters"
validation.positive('amount')     // "Amount must be positive"
```

### 6. `useFormatter()`
For locale-aware formatting.

```tsx
const formatter = useFormatter();

formatter.number(1234.56)        // "1,234.56" / "١٬٢٣٤٫٥٦" (Arabic)
formatter.currency(1000, 'SAR')  // "$1,000.00" / "١٬٠٠٠٫٠٠ ر.س"
formatter.date(new Date())       // "January 15, 2024" / "١٥ يناير ٢٠٢٤"
formatter.fileSize(1048576)      // "1.0 MB" / "١٫٠ ميجابايت"
formatter.percentage(25.5)       // "25.5%" / "٢٥٫٥٪"
formatter.relativeTime(date)     // "2 days ago" / "منذ يومين"
```

## 📁 JSON Translation Files

### Structure Example (common.json)

```json
{
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete"
  },
  "labels": {
    "name": "Name",
    "email": "Email",
    "amount": "Amount"
  },
  "messages": {
    "success": {
      "saved": "Saved successfully",
      "deleted": "Deleted successfully"
    },
    "error": {
      "general": "An error occurred",
      "network": "Network connection error"
    }
  }
}
```

### Using Nested Keys

```tsx
// Direct access
t('common.actions.save')

// File-specific access  
st('status.inTransit')  // shipments.status.inTransit
at('reports.balanceSheet')  // accounting.reports.balanceSheet
```

## ✅ Form Validation Integration

### Complete Form Example

```tsx
import { useState } from 'react';
import { useCommonTranslations, useFormTranslations } from '../hooks/useTranslations';
import { useValidation } from '../contexts/LocaleContext';

function UserForm() {
  const { actions, labels } = useCommonTranslations();
  const { ft } = useFormTranslations('userForm');
  const validation = useValidation();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name) {
      newErrors.name = validation.required('name');
    }
    
    if (!formData.email) {
      newErrors.email = validation.required('email');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = validation.email();
    }
    
    if (!formData.password) {
      newErrors.password = validation.required('password');
    } else if (formData.password.length < 8) {
      newErrors.password = validation.minLength('password', 8);
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Submit form
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>{labels.name()}</label>
        <input
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
        />
        {errors.name && <span className="error">{errors.name}</span>}
      </div>
      
      <div>
        <label>{labels.email()}</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
        />
        {errors.email && <span className="error">{errors.email}</span>}
      </div>
      
      <button type="submit">{actions.save()}</button>
    </form>
  );
}
```

## 🎨 RTL/LTR Support

The system automatically handles Right-To-Left (RTL) layout for Arabic:

```tsx
import { useLocale } from '../contexts/LocaleContext';

function MyComponent() {
  const { dir, isRTL } = useLocale();
  
  return (
    <div 
      dir={dir}  // 'rtl' for Arabic, 'ltr' for English
      className={`space-x-4 ${isRTL ? 'rtl:space-x-reverse' : ''}`}
    >
      {/* Content automatically flows right-to-left in Arabic */}
    </div>
  );
}
```

## 📱 Responsive & Accessibility

### Tailwind CSS Classes
Use Tailwind's RTL utilities for proper spacing and layout:

```css
/* General spacing */
.space-x-4           /* Left-to-right spacing */
.rtl:space-x-reverse /* Reverses spacing in RTL */

/* Margins and padding */
.ml-4 .rtl:mr-4      /* Margin left (LTR) / right (RTL) */
.pl-3 .rtl:pr-3      /* Padding left (LTR) / right (RTL) */

/* Text alignment */
.text-left .rtl:text-right    /* Left align (LTR) / right align (RTL) */
.text-right .rtl:text-left    /* Right align (LTR) / left align (RTL) */
```

### ARIA Support
The system includes proper ARIA attributes:

```tsx
<input
  aria-label={labels.email()}
  aria-describedby={errors.email ? "email-error" : undefined}
  aria-invalid={!!errors.email}
/>
{errors.email && (
  <span id="email-error" role="alert">
    {errors.email}
  </span>
)}
```

## 🔧 Advanced Features

### Custom Translation Context

```tsx
import { createTranslationFunction } from '../lib/i18n';

// Create custom translation function with loaded data
const customT = createTranslationFunction({
  translations: myCustomTranslations,
  locale: 'ar'
});

const text = customT('custom.key', { name: 'Ahmed' });
```

### Pluralization

```tsx
import { useFormatter } from '../contexts/LocaleContext';

function ItemCount({ count }) {
  const { tp } = useFormatter();
  
  return (
    <span>
      {tp(count, 'item', 'items', 'دو عنصرين')} {/* Arabic dual form */}
    </span>
  );
}
```

### Dynamic Translation Loading

```tsx
import { loadTranslationFile } from '../lib/i18n';

// Load additional translation files on demand
const customTranslations = await loadTranslationFile('ar', 'custom');
```

## 🐛 Troubleshooting

### Common Issues

1. **Translation not found**: Check console for missing key warnings
2. **RTL layout issues**: Use `rtl:` Tailwind prefixes for proper RTL styling
3. **Validation not working**: Ensure field names match translation keys
4. **Loading state**: Check `loading` property from `useLocale()`

### Debug Mode

```tsx
// Enable translation debugging
console.log('Missing translations:', translationContext.missingKeys);
```

### Performance Tips

1. **Use specific hooks**: Prefer `useCommonTranslations()` over generic `t()`
2. **Lazy loading**: Translation files are loaded on demand
3. **Caching**: Translations are automatically cached after first load
4. **Memoization**: Use `useMemo` for complex formatting

## 📚 Best Practices

1. **Consistent Naming**: Use consistent key naming across translation files
2. **Placeholder Usage**: Use `{{variable}}` syntax for dynamic content
3. **Context Separation**: Separate translations by domain (shipments, accounting, etc.)
4. **Validation Keys**: Match validation keys with form field names
5. **RTL Testing**: Always test UI in both LTR and RTL modes
6. **Accessibility**: Include proper ARIA labels and descriptions
7. **Error Handling**: Provide fallbacks for missing translations

## 🔄 Migration from Old System

### Before (Old System)
```tsx
import { useLocale } from '../contexts/LocaleContext';

const { t } = useLocale();
t('shipments.status.pending')  // Manual key construction
```

### After (New System)
```tsx
import { useShipmentTranslations } from '../hooks/useTranslations';

const { getStatusText } = useShipmentTranslations();
getStatusText('pending')  // Automatic key construction with type safety
```

This new system provides:
- ✅ Better organization and maintainability
- ✅ Type-safe translation access
- ✅ Comprehensive validation messages
- ✅ Advanced formatting utilities
- ✅ Performance optimizations
- ✅ Full RTL/LTR support
- ✅ Accessibility compliance