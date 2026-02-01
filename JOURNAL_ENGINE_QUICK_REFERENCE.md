# 📘 JOURNAL ENGINE - QUICK REFERENCE GUIDE

## 🚀 Getting Started

### Create a Journal Entry
1. Navigate to `/accounting/journals/new`
2. Fill form:
   - Entry Date (required)
   - Reference Number (optional)
   - Description (optional)
3. Add line items:
   - Select Account (must be active)
   - Enter Debit OR Credit amount
   - Add description (optional)
4. **Watch balance**: Green ✓ when balanced
5. Click **Save** (enabled only when balanced)

### Submit for Approval
1. Open draft journal from list
2. Click **Submit for Approval**
3. Status changes: Draft → Submitted
4. Form becomes read-only

### Post to Ledger
1. Open submitted journal
2. Click **Post Journal**
3. Confirm dialog: "This will record the journal..."
4. Status changes: Submitted → Posted
5. General ledger entries created

### Reverse Posted Journal
1. Open posted journal
2. Click **Reverse Entry**
3. Confirm dialog: "Create a reversal entry?"
4. New journal created with opposite amounts
5. Original remains posted (audit trail preserved)

---

## 📁 FILE LOCATIONS

| Component | Path | Lines | Type |
|-----------|------|-------|------|
| Form | `components/accounting/JournalEntryForm.tsx` | 484 | Component |
| Create Page | `pages/accounting/journals/new.tsx` | 200 | Page |
| List Page | `pages/accounting/journals/index.tsx` | 347 | Page |
| Detail Page | `pages/accounting/journals/[id].tsx` | 654 | Page |
| EN Translations | `locales/en.json` | 643 | i18n |
| AR Translations | `locales/ar.json` | 673 | i18n |
| Backend Routes | `backend/src/routes/journals.ts` | ~800 | API |
| DB Schema | `backend/migrations/023_create_journal_engine.sql` | - | SQL |

---

## 🔌 API QUICK REFERENCE

### Create Journal
```bash
POST /api/journals
Content-Type: application/json

{
  "entry_date": "2024-01-15",
  "reference": "INV-001",
  "description": "Monthly closing",
  "lines": [
    {
      "account_id": 1,
      "debit_amount": 1000,
      "credit_amount": 0,
      "description": "Asset increase"
    },
    {
      "account_id": 2,
      "debit_amount": 0,
      "credit_amount": 1000,
      "description": "Liability increase"
    }
  ]
}

Response: { id, entry_date, ..., status: "draft", ... }
```

### List Journals
```bash
GET /api/journals?page=1&limit=25&status=draft&date_from=2024-01-01&date_to=2024-12-31

Response: { data: [...], total: 150, page: 1, limit: 25 }
```

### Get Journal
```bash
GET /api/journals/:id

Response: { id, entry_date, reference, description, status, lines: [...], ... }
```

### Update Journal
```bash
PUT /api/journals/:id
(Same request format as POST - draft only)

Response: Updated journal
```

### Delete Journal
```bash
DELETE /api/journals/:id
(Draft only)

Response: { success: true }
```

### Submit for Approval
```bash
POST /api/journals/:id/submit

Response: { ...journal, status: "submitted" }
```

### Post Journal
```bash
POST /api/journals/:id/post

Response: { ...journal, status: "posted", posted_by, posted_at }
```

### Reverse Journal
```bash
POST /api/journals/:id/reverse

Response: { id: new_reversal_journal_id, ... }
```

---

## 🔐 PERMISSIONS REQUIRED

| Action | Permission | Required By |
|--------|------------|------------|
| View | `accounting:journals:view` | List, Detail |
| Create | `accounting:journals:create` | Create page |
| Edit | `accounting:journals:update` | Detail page |
| Delete | `accounting:journals:delete` | Detail page |
| Submit | `accounting:journals:submit` | Workflow |
| Post | `accounting:journals:post` | Workflow |
| Reverse | `accounting:journals:reverse` | Workflow |

---

## 📝 TRANSLATION KEYS

### Used in Form
```json
{
  "accounting.journals": {
    "entryDetails": "Entry Details",
    "entryDate": "Entry Date",
    "reference": "Reference Number",
    "lineItems": "Line Items",
    "debit": "Debit",
    "credit": "Credit",
    "totalDebit": "Total Debit",
    "totalCredit": "Total Credit",
    "balanced": "✓ Balanced",
    "notBalanced": "✗ Not Balanced",
    "addLine": "Add Line Item",
    "removeLine": "Remove"
  }
}
```

### Used in Pages
```json
{
  "accounting.journals": {
    "title": "Journal Entries",
    "newEntry": "New Journal Entry",
    "editEntry": "Edit Journal Entry",
    "draft": "Draft",
    "submitted": "Submitted",
    "posted": "Posted",
    "submit": "Submit for Approval",
    "post": "Post Journal",
    "reverse": "Reverse Entry",
    "submittedSuccess": "Journal submitted for approval",
    "postedSuccess": "Journal posted successfully",
    "reversalCreated": "Reversal entry created successfully"
  }
}
```

---

## ✅ VALIDATION RULES

| Rule | Error Message | When |
|------|---------------|------|
| Entry date required | `accounting.journals.dateRequired` | Blank date |
| At least 1 line | `accounting.journals.linesRequired` | No lines |
| Account required | `accounting.journals.accountsRequired` | Missing account |
| Debit = Credit | `accounting.journals.balanceRequired` | Unbalanced |
| Active account | Filtered in dropdown | Inactive account |

---

## 🎨 UI STATE MANAGEMENT

### Form States
- **Draft**: Can edit, can submit, can delete
- **Submitted**: Read-only, can post, can revert (if allowed)
- **Posted**: Read-only, can reverse, can print

### Button Visibility
```tsx
{entry.status === 'draft' && can(...) && <EditButton />}
{entry.status === 'draft' && can(...) && <SubmitButton />}
{entry.status === 'submitted' && can(...) && <PostButton />}
{entry.status === 'posted' && can(...) && <ReverseButton />}
{entry.status === 'draft' && can(...) && <DeleteButton />}
```

### Form Read-Only
```tsx
isReadOnly={entry.status !== 'draft' || !isEditing}
```

---

## 🧪 TESTING QUICK COMMANDS

### Create Test Journal (via API)
```bash
curl -X POST http://localhost:3000/api/journals \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entry_date": "2024-01-15",
    "reference": "TEST-001",
    "lines": [
      {"account_id": 1, "debit_amount": 100, "credit_amount": 0},
      {"account_id": 2, "debit_amount": 0, "credit_amount": 100}
    ]
  }'
```

### Get Journal
```bash
curl -X GET http://localhost:3000/api/journals/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Submit Journal
```bash
curl -X POST http://localhost:3000/api/journals/1/submit \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Post Journal
```bash
curl -X POST http://localhost:3000/api/journals/1/post \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔍 DEBUGGING TIPS

### Form Won't Save
1. Check balance: Debit = Credit?
2. Check accounts: All active?
3. Check permissions: User has `accounting:journals:create`?
4. Check console: Any validation errors?

### Submit Button Disabled
1. Check status: Must be draft
2. Check permissions: User has `accounting:journals:submit`?
3. Check form: Any unsaved changes?

### Post Button Disabled
1. Check status: Must be submitted
2. Check permissions: User has `accounting:journals:post`?
3. Check data: Debit = Credit?
4. Check accounts: All still active?

### API Returns 403
1. Check permissions: Is user in correct role?
2. Check route guard: Is withPermission() HOC applied?
3. Check middleware: Is requirePermission() on backend?

---

## 🆘 COMMON ISSUES & SOLUTIONS

### Issue: Save button stays disabled
**Solution**: Check balance - Debit must equal Credit

### Issue: Account dropdown empty
**Solution**: Make sure at least one account exists and is active

### Issue: Cannot submit submitted journal
**Solution**: Status must be 'draft' to submit, or 'submitted' to post

### Issue: Reverse not working
**Solution**: Journal must be 'posted' status, user must have permission

### Issue: Translation keys missing
**Solution**: Add keys to `locales/en.json` and `locales/ar.json`

### Issue: Permission denied on create
**Solution**: User role must have `accounting:journals:create` permission

---

## 📊 WORKFLOW DIAGRAM

```
┌──────────────┐
│   CREATE     │ (Draft)
│   Journal    │
└──────┬───────┘
       │
       ├─→ EDIT (if draft)
       │
       ├─→ DELETE (if draft)
       │
       └─→ SUBMIT
           │
           ├──────────────┐
           │              │
           └──→ POSTED    └──→ POST
                  │            │
                  │            └──→ POSTED
                  │                 │
                  └─────┬───────────┘
                        │
                        └──→ REVERSE
                             │
                             └──→ New journal (opposite amounts)
```

---

## 🚦 STATUS FLOW

```
Draft (yellow) 
  ↓ Submit
Submitted (blue)
  ↓ Post
Posted (green)
  ↓ Reverse
Reversal Journal (New Draft)
```

---

## 💡 BEST PRACTICES

1. **Always balance**: Debit = Credit before saving
2. **Use references**: Add journal reference for tracking
3. **Describe lines**: Add descriptions to line items
4. **Review before post**: Check journal before posting
5. **Print for archive**: Print journal after posting
6. **Use reversals**: Don't delete posted entries, reverse them
7. **Check permissions**: Users need appropriate role
8. **Monitor audit log**: All changes are logged

---

## 📞 SUPPORT RESOURCES

- **Main Documentation**: `/slms/PHASE_3.2_JOURNAL_ENGINE_SUMMARY.md`
- **Progress Report**: `/slms/PHASE_3.2_PROGRESS_REPORT.md`
- **Backend Routes**: `/backend/src/routes/journals.ts`
- **Component Source**: `/frontend-next/components/accounting/JournalEntryForm.tsx`

---

**Last Updated**: Phase 3.2 Implementation Complete  
**Status**: Ready for Production
