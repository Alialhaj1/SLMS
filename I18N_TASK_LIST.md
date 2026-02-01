# ✅ i18n Translation - Prioritized Task List

**Goal:** Achieve 100% Arabic coverage before production  
**Estimated Time:** 16 hours (2-3 days)  
**Priority:** HIGH - Production Blocker

---

## 🎯 Task Breakdown

### PHASE 1: Translation Keys (Priority: CRITICAL)
**Time:** 4 hours  
**Owner:** Developer + Translator  

#### Task 1.1: Update English Keys
**File:** `frontend-next/locales/en.json`  
**Action:** Add `master.*` section with ~150 keys

- [ ] Add `master.taxes.*` (15 keys)
- [ ] Add `master.currencies.*` (12 keys)
- [ ] Add `master.customers.*` (16 keys)
- [ ] Add `master.vendors.*` (16 keys)
- [ ] Add `master.items.*` (15 keys)
- [ ] Add `master.costCenters.*` (8 keys)
- [ ] Add `master.warehouses.*` (16 keys)
- [ ] Add `master.units.*` (10 keys)
- [ ] Add `master.countries.*` (10 keys)
- [ ] Add `master.cities.*` (10 keys)

**Reference:** See `I18N_TRANSLATION_FIXES_REQUIRED.md` for complete key list

#### Task 1.2: Update Arabic Keys
**File:** `frontend-next/locales/ar.json`  
**Action:** Add matching Arabic translations for all above keys

- [ ] Translate `master.taxes.*` to Arabic
- [ ] Translate `master.currencies.*` to Arabic
- [ ] Translate `master.customers.*` to Arabic
- [ ] Translate `master.vendors.*` to Arabic
- [ ] Translate `master.items.*` to Arabic
- [ ] Translate `master.costCenters.*` to Arabic
- [ ] Translate `master.warehouses.*` to Arabic
- [ ] Translate `master.units.*` to Arabic
- [ ] Translate `master.countries.*` to Arabic
- [ ] Translate `master.cities.*` to Arabic

**Deliverable:** Both en.json and ar.json updated with matching keys

---

### PHASE 2: Master Data Pages (Priority: HIGH)
**Time:** 8 hours  
**Owner:** Frontend Developer

#### Task 2.1: Taxes Page
**File:** `pages/master/taxes.tsx`  
**Hardcoded Strings:** 25

- [ ] Replace page title: `<h1>` (line 274)
- [ ] Replace subtitle: `<p>` (line 276)
- [ ] Replace search placeholder (line 293)
- [ ] Replace "Add Tax" button (line 281)
- [ ] Replace form labels (10 labels)
- [ ] Replace tax type labels (5 options)
- [ ] Replace toast messages (5 messages)
- [ ] Replace access denial text (line 257-259)
- [ ] Test in Arabic mode

#### Task 2.2: Currencies Page
**File:** `pages/master/currencies.tsx`  
**Hardcoded Strings:** 22

- [ ] Replace page title (line 229)
- [ ] Replace subtitle (line 231)
- [ ] Replace search placeholder (line 248)
- [ ] Replace "Add Currency" button (line 236)
- [ ] Replace form labels (8 labels)
- [ ] Replace helper text (line 439)
- [ ] Replace toast messages (4 messages)
- [ ] Replace access denial text (line 212-214)
- [ ] Test in Arabic mode

#### Task 2.3: Customers Page
**File:** `pages/master/customers.tsx`  
**Hardcoded Strings:** 28

- [ ] Replace page title (line 256)
- [ ] Replace subtitle (line 258)
- [ ] Replace search placeholder (line 275)
- [ ] Replace "Add Customer" button (line 263)
- [ ] Replace form labels (12 labels)
- [ ] Replace toast messages (5 messages)
- [ ] Replace access denial text (line 239-241)
- [ ] Test in Arabic mode

#### Task 2.4: Vendors Page
**File:** `pages/master/vendors.tsx`  
**Hardcoded Strings:** 28

- [ ] Replace page title (line 256)
- [ ] Replace subtitle (line 258)
- [ ] Replace search placeholder (line 275)
- [ ] Replace "Add Vendor" button (line 263)
- [ ] Replace form labels (12 labels)
- [ ] Replace toast messages (5 messages)
- [ ] Replace access denial text (line 239-241)
- [ ] Test in Arabic mode

#### Task 2.5: Items Page
**File:** `pages/master/items.tsx`  
**Hardcoded Strings:** 26

- [ ] Replace page title (line 249)
- [ ] Replace subtitle (line 251)
- [ ] Replace search placeholder (line 268)
- [ ] Replace "Add Item" button (line 256)
- [ ] Replace form labels (11 labels)
- [ ] Replace toast messages (4 messages)
- [ ] Replace access denial text (line 232-234)
- [ ] Test in Arabic mode

#### Task 2.6: Cost Centers Page
**File:** `pages/master/cost-centers.tsx`  
**Hardcoded Strings:** 18

- [ ] Replace page title (line 221)
- [ ] Replace subtitle (line 223)
- [ ] Replace search placeholder (line 240)
- [ ] Replace "Add Cost Center" button (line 228)
- [ ] Replace form labels (6 labels)
- [ ] Replace toast messages (4 messages)
- [ ] Replace access denial text (line 204-206)
- [ ] Test in Arabic mode

#### Task 2.7: Warehouses Page
**File:** `pages/master/warehouses.tsx`  
**Hardcoded Strings:** 24

- [ ] Replace page title (line 269)
- [ ] Replace subtitle (line 271)
- [ ] Replace search placeholder (line 288)
- [ ] Replace "Add Warehouse" button (line 276)
- [ ] Replace form labels (10 labels)
- [ ] Replace placeholders (3 placeholders)
- [ ] Replace toast messages (4 messages)
- [ ] Replace access denial text (line 252-254)
- [ ] Test in Arabic mode

#### Task 2.8: Units Page
**File:** `pages/master/units.tsx`  
**Hardcoded Strings:** 20

- [ ] Replace page title (line 267)
- [ ] Replace subtitle (line 269)
- [ ] Replace search placeholder (line 286)
- [ ] Replace "Add Unit" button (line 274)
- [ ] Replace form labels (7 labels)
- [ ] Replace "(Base)" badge (line 359)
- [ ] Replace toast messages (4 messages)
- [ ] Replace access denial text (line 250-252)
- [ ] Test in Arabic mode

#### Task 2.9: Countries Page
**File:** `pages/master/countries.tsx`  
**Hardcoded Strings:** 20

- [ ] Replace page title (line 226)
- [ ] Replace subtitle (line 228)
- [ ] Replace search placeholder (line 245)
- [ ] Replace "Add Country" button (line 233)
- [ ] Replace form labels (8 labels)
- [ ] Replace toast messages (4 messages)
- [ ] Replace access denial text (line 209-211)
- [ ] Test in Arabic mode

#### Task 2.10: Cities Page
**File:** `pages/master/cities.tsx`  
**Hardcoded Strings:** 18

- [ ] Replace page title (line 249)
- [ ] Replace subtitle (line 251)
- [ ] Replace search placeholder (line 268)
- [ ] Replace "Add City" button (line 256)
- [ ] Replace form labels (6 labels)
- [ ] Replace toast messages (4 messages)
- [ ] Replace access denial text (line 232-234)
- [ ] Test in Arabic mode

**Deliverable:** All 10 master data pages fully translated

---

### PHASE 3: RTL Fixes (Priority: MEDIUM)
**Time:** 2 hours  
**Owner:** Frontend Developer

#### Task 3.1: Replace Directional Spacing
**Pattern:** Replace `ml-`/`mr-` with `ms-`/`me-`, `pl-`/`pr-` with `ps-`/`pe-`

- [ ] Fix icon spacing in master data pages (10 files × 3-4 instances)
- [ ] Fix `components/ui/Input.tsx` (line 27)
- [ ] Fix `components/ui/ModalForm.tsx` (3 instances)
- [ ] Fix `components/layout/Header.tsx` (line 75)
- [ ] Test layout in Arabic mode

**Deliverable:** RTL-safe spacing across all pages

---

### PHASE 4: Testing & QA (Priority: HIGH)
**Time:** 2 hours  
**Owner:** QA + Developer

#### Task 4.1: Page-by-Page Testing

**For each master data page:**
1. Switch to Arabic language
2. Verify page title shows Arabic
3. Verify all form labels show Arabic
4. Verify search placeholder shows Arabic
5. Click "Add" button → verify modal shows Arabic
6. Fill form and save → verify toast message is Arabic
7. Try to delete → verify confirmation dialog is Arabic
8. Test validation errors → verify error messages are Arabic

**Pages to Test:**
- [ ] Taxes
- [ ] Currencies
- [ ] Customers
- [ ] Vendors
- [ ] Items
- [ ] Cost Centers
- [ ] Warehouses
- [ ] Units
- [ ] Countries
- [ ] Cities

#### Task 4.2: Flow Testing

- [ ] Create a new customer in Arabic mode
- [ ] Edit an existing customer in Arabic mode
- [ ] Delete a customer in Arabic mode
- [ ] Search for customers in Arabic mode
- [ ] Switch language mid-session (EN → AR → EN)
- [ ] Verify no English text appears in Arabic mode
- [ ] Test on different screen sizes (mobile, tablet, desktop)

#### Task 4.3: Regression Testing

- [ ] Test all pages in English mode (verify nothing broke)
- [ ] Test dashboard in both languages
- [ ] Test accounting module in both languages
- [ ] Verify no console errors
- [ ] Check browser console for missing translation warnings

**Deliverable:** All tests passing, screenshots of Arabic pages

---

## 📋 Acceptance Criteria

### Definition of Done

✅ **Translation Keys:**
- [ ] All 150 keys added to en.json
- [ ] All 150 keys translated in ar.json
- [ ] Keys follow naming convention: `master.{section}.{field}`

✅ **Component Updates:**
- [ ] Zero hardcoded English strings in master data pages
- [ ] All text uses `t()` function
- [ ] Toast messages use translation keys
- [ ] Access denial uses error keys

✅ **RTL Support:**
- [ ] No `ml-`/`mr-`/`pl-`/`pr-` in master data pages
- [ ] Icons properly positioned in RTL
- [ ] Forms laid out correctly in RTL

✅ **Testing:**
- [ ] All 10 master data pages tested in Arabic
- [ ] Create/Edit/Delete flows work in Arabic
- [ ] No English text visible in Arabic mode
- [ ] English mode still works (no regression)

---

## 🚀 Daily Progress Tracking

### Day 1 (8 hours)
**Morning (4h):**
- [ ] Add all translation keys to en.json
- [ ] Add all Arabic translations to ar.json

**Afternoon (4h):**
- [ ] Update Taxes page
- [ ] Update Currencies page
- [ ] Update Customers page
- [ ] Test updated pages

### Day 2 (8 hours)
**Morning (4h):**
- [ ] Update Vendors page
- [ ] Update Items page
- [ ] Update Cost Centers page
- [ ] Test updated pages

**Afternoon (4h):**
- [ ] Update Warehouses page
- [ ] Update Units page
- [ ] Update Countries page
- [ ] Update Cities page
- [ ] Test all updated pages

### Day 3 (4 hours)
**Morning (2h):**
- [ ] Fix RTL spacing issues
- [ ] Test RTL layout

**Afternoon (2h):**
- [ ] Full QA testing
- [ ] Fix any issues found
- [ ] Final verification

---

## 🎯 Success Metrics

**Before Fix:**
- Translation Coverage: 87%
- Master Data Arabic: 30%
- Hardcoded Strings: ~350

**After Fix (Target):**
- Translation Coverage: 100% ✅
- Master Data Arabic: 100% ✅
- Hardcoded Strings: 0 ✅

---

## 📞 Help & Resources

**Translation Questions:**
- Refer to existing accounting translations in ar.json
- Check Arabic UI conventions for form labels
- Use formal Arabic (فصحى), not colloquial

**Technical Questions:**
- See `I18N_QUICK_FIX_GUIDE.md` for code patterns
- Check `useTranslation` hook implementation
- Review working examples in accounting pages

**Testing Issues:**
- Clear browser cache if translations don't update
- Check browser console for missing key warnings
- Verify language selector is working

---

## ✅ Final Checklist

**Before committing:**
- [ ] All translation keys added
- [ ] All pages updated
- [ ] All tests passing
- [ ] No console errors
- [ ] RTL layout verified
- [ ] English mode still works
- [ ] Code reviewed
- [ ] Documentation updated

**Before deploying:**
- [ ] Staging environment tested
- [ ] Screenshots taken for documentation
- [ ] Stakeholders notified
- [ ] Rollback plan ready

---

**Task List Created:** December 24, 2024  
**Estimated Completion:** December 27, 2024 (3 working days)  
**Priority:** CRITICAL - Production Blocker
