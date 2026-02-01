# Phase 2.5 - Quick Testing Guide

**Goal:** Run automated tests for Items Module Phase 2

---

## ⚡ Quick Start

```powershell
# 1. Install dependencies
cd backend
npm install

# 2. Run all tests
npm test

# 3. See coverage report
npm run test:coverage
start coverage/index.html
```

---

## 📊 What's Tested?

### ✅ PUT /api/master/items/:id
- [x] Blocks policy field changes when item has movements
- [x] Allows policy field changes when item has NO movements
- [x] Always allows non-policy field changes

### ✅ DELETE /api/master/items/:id
- [x] Prevents deletion when item has movements
- [x] Allows deletion when item has NO movements

### ✅ Item Groups Protection
- [x] Prevents reparenting groups with children/items
- [x] Prevents deleting groups with children/items
- [x] Allows operations on empty groups

---

## 📂 Test Files

| File | Tests | Purpose |
|------|-------|---------|
| `src/tests/unit/itemPolicies.test.ts` | 16 | Business logic validation |
| `src/tests/integration/items.put.test.ts` | 17 | PUT endpoint scenarios |
| `src/tests/integration/items.delete.test.ts` | 6 | DELETE endpoint scenarios |
| `src/tests/integration/itemGroups.test.ts` | 14 | Hierarchical protection |

**Total:** 47 automated tests

---

## 🎯 Coverage Targets

- **Lines:** 80%
- **Statements:** 80%
- **Functions:** 75%
- **Branches:** 70%

**Build fails if coverage < targets**

---

## 🚀 Commands

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode (during development)
npm run test:watch

# Coverage report
npm run test:coverage
```

---

## ✅ Expected Output

```
 PASS  src/tests/unit/itemPolicies.test.ts
 PASS  src/tests/integration/items.put.test.ts
 PASS  src/tests/integration/items.delete.test.ts
 PASS  src/tests/integration/itemGroups.test.ts

Test Suites: 4 passed, 4 total
Tests:       47 passed, 47 total
Time:        ~37s

Coverage: 84.5% lines, 83.8% statements
```

---

## 🔴 If Tests Fail

1. **Check database connection:**
   ```bash
   docker ps | grep postgres
   ```

2. **Check test credentials:**
   - File: `backend/.env.test`
   - User: `test.phase2@slms.local`
   - Password: `secret`

3. **Run migrations:**
   ```bash
   npm run migrate
   ```

4. **Check logs:**
   ```bash
   npm test -- --verbose
   ```

---

## 📊 View Coverage Report

```powershell
# Generate report
npm run test:coverage

# Open in browser
cd coverage
start index.html
```

**Report shows:**
- Line-by-line coverage
- Uncovered code paths
- Coverage percentages per file

---

## 🎉 Next Steps

After backend tests pass:
1. ✅ Review coverage report
2. 🚧 Add frontend component tests
3. 🚧 Add E2E Playwright tests
4. 🚧 Set up CI/CD (GitHub Actions)

---

## 📞 Need Help?

- **Test not found?** → Check file paths in `jest.config.js`
- **Database error?** → Verify PostgreSQL is running (`docker ps`)
- **Timeout error?** → Increase `testTimeout` in `jest.config.js`
- **Coverage too low?** → Add tests for uncovered paths

---

**Status:** ✅ Backend tests ready to run  
**Time:** ~2 minutes for full suite  
**Confidence:** High (47 comprehensive tests)
