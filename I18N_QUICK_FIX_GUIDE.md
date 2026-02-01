# 🔧 Quick Fix Guide - Master Data Translation

**Goal:** Make all master data pages 100% Arabic-compatible

---

## 🎯 Quick Reference: What to Replace

### Pattern 1: Page Titles

```tsx
// ❌ Before
<h1 className="text-3xl font-bold">Tax Management</h1>
<p>Manage tax rates and types</p>

// ✅ After  
<h1 className="text-3xl font-bold">{t('master.taxes.title')}</h1>
<p>{t('master.taxes.subtitle')}</p>
```

### Pattern 2: Form Labels

```tsx
// ❌ Before
<Input label="Tax Code" />

// ✅ After
<Input label={t('master.taxes.code')} />
```

### Pattern 3: Placeholders

```tsx
// ❌ Before
placeholder="Search by name or code..."

// ✅ After
placeholder={t('master.taxes.searchPlaceholder')}
```

### Pattern 4: Toast Messages

```tsx
// ❌ Before
showToast('Tax deleted successfully', 'success');
showToast('Failed to save tax', 'error');

// ✅ After
showToast(t('common.deleteSuccess'), 'success');
showToast(t('master.taxes.saveFailed'), 'error');
```

### Pattern 5: Access Denial

```tsx
// ❌ Before
<h2>Access Denied</h2>
<p>You don't have permission to view taxes.</p>

// ✅ After
<h2>{t('errors.403.title')}</h2>
<p>{t('errors.403.description')}</p>
```

### Pattern 6: Dropdown Options

```tsx
// ❌ Before
const labels = {
  vat: 'VAT',
  withholding: 'Withholding Tax',
};

// ✅ After
const getLabel = (type) => t(`master.taxes.types.${type}`);
```

---

## 📋 Files to Update (Priority Order)

### High Priority (User-Facing Pages)

1. ✅ `pages/master/taxes.tsx` - 25 hardcoded strings
2. ✅ `pages/master/currencies.tsx` - 22 hardcoded strings
3. ✅ `pages/master/customers.tsx` - 28 hardcoded strings
4. ✅ `pages/master/vendors.tsx` - 28 hardcoded strings
5. ✅ `pages/master/items.tsx` - 26 hardcoded strings
6. ✅ `pages/master/cost-centers.tsx` - 18 hardcoded strings
7. ✅ `pages/master/warehouses.tsx` - 24 hardcoded strings
8. ✅ `pages/master/units.tsx` - 20 hardcoded strings
9. ✅ `pages/master/countries.tsx` - 20 hardcoded strings
10. ✅ `pages/master/cities.tsx` - 18 hardcoded strings

### Medium Priority (Support Pages)

11. ✅ `pages/warehouses/index.tsx` - 15 hardcoded strings
12. ✅ `pages/suppliers/index.tsx` - 12 hardcoded strings
13. ✅ `pages/roles/index.tsx` - 10 hardcoded strings
14. ✅ `pages/settings/index.tsx` - 8 hardcoded strings

### Low Priority (RTL Fixes Only)

15-49. Various component files - RTL spacing fixes

---

## 🔍 Search & Replace Patterns

Use VS Code's Find & Replace (Ctrl+Shift+H) with regex:

### Replace Page Title Pattern

**Find:**
```regex
<h1 className="text-3xl[^"]*">([^<]+)</h1>
```

**Replace:** (manually - different key per page)
```tsx
<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('master.SECTION.title')}</h1>
```

### Replace Label Pattern

**Find:**
```regex
label="([^"]+)"
```

**Replace:** (manually verify each)
```tsx
label={t('master.SECTION.FIELD')}
```

### Replace Placeholder Pattern

**Find:**
```regex
placeholder="([^"]+)"
```

**Replace:** (manually verify each)
```tsx
placeholder={t('master.SECTION.fieldPlaceholder')}
```

---

## 📦 Translation Keys to Add

Copy this to `frontend-next/locales/en.json` under `"master"`:

```json
{
  "master": {
    "taxes": {
      "title": "Tax Management",
      "subtitle": "Manage tax rates and types",
      "searchPlaceholder": "Search by name or code...",
      "addButton": "Add Tax",
      "code": "Tax Code",
      "name": "Tax Name",
      "nameAr": "Tax Name (Arabic)",
      "rate": "Rate (%)",
      "description": "Description",
      "account": "Account",
      "types": {
        "vat": "VAT",
        "withholding": "Withholding Tax",
        "sales": "Sales Tax",
        "custom": "Custom Tax",
        "zatca": "ZATCA Tax"
      },
      "saveFailed": "Failed to save tax",
      "loadFailed": "Failed to load taxes",
      "deleteFailed": "Failed to delete tax"
    }
  }
}
```

Repeat similar structure for:
- `currencies`
- `customers`
- `vendors`
- `items`
- `costCenters`
- `warehouses`
- `units`
- `countries`
- `cities`

---

## ✅ Testing Checklist

After updating each page:

```bash
# 1. Start dev server
npm run dev

# 2. Open page in browser
# 3. Switch to Arabic using language selector
# 4. Verify:
   - [ ] Page title is Arabic
   - [ ] All form labels are Arabic
   - [ ] Search placeholder is Arabic
   - [ ] Create new record - modal shows Arabic
   - [ ] Save record - toast message is Arabic
   - [ ] Delete record - confirmation dialog is Arabic
   - [ ] Error messages are Arabic
```

---

## 🚀 Deployment Checklist

Before merging to main:

- [ ] All 10 master data pages updated
- [ ] Translation keys added to en.json
- [ ] Translation keys added to ar.json
- [ ] Tested in Arabic mode
- [ ] Tested in English mode (verify nothing broke)
- [ ] Tested create/edit/delete flows
- [ ] Toast messages verified
- [ ] Access denial messages verified
- [ ] No console errors

---

## 📞 Need Help?

**Translation Keys Missing?**
Check `frontend-next/locales/en.json` and `ar.json` for existing keys

**Component Not Translating?**
Ensure `useTranslation` hook is imported:
```tsx
import { useTranslation } from '../../hooks/useTranslation';
const { t } = useTranslation();
```

**RTL Issues?**
Replace `ml-`/`mr-` with `ms-`/`me-`, `pl-`/`pr-` with `ps-`/`pe-`

---

**Last Updated:** December 24, 2024  
**Estimated Time:** 16 hours (2-3 days)
