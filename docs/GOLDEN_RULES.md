# 📜 القواعد الذهبية للتطوير | Golden Development Rules
## SLMS ERP System

---

## 🔒 القاعدة 1: لا يوجد عنصر بدون Permission
### Rule 1: No Element Without Permission

**كل عنصر UI أو API يجب أن يكون له صلاحية:**
- ✅ زر (Button)
- ✅ عمود جدول (Table Column)
- ✅ كارت (Card)
- ✅ قسم (Section)
- ✅ حقل (Field)
- ✅ API Endpoint
- ✅ Backend Action

### خطوات إنشاء شاشة جديدة:

```
1️⃣ أولاً: permissions.registry.ts
   ↓
2️⃣ ثانياً: API Routes (backend)
   ↓
3️⃣ ثالثاً: UI Components (frontend)
```

### مثال:

```typescript
// ❌ ممنوع
<Button onClick={handlePost}>Post</Button>

// ✅ صحيح
<PermissionButton permission="accounting.journal.post">
  {t('actions.post')}
</PermissionButton>
```

```typescript
// ❌ ممنوع
router.post('/journals/:id/post', async (req, res) => { ... });

// ✅ صحيح
router.post('/journals/:id/post', 
  requirePermission('accounting.journal.post'),
  async (req, res) => { ... }
);
```

---

## 🌍 القاعدة 2: لا يوجد نص بدون i18n
### Rule 2: No Text Without i18n

**كل نص في النظام يجب أن يكون مترجماً:**
- ✅ Labels
- ✅ Buttons
- ✅ Toast messages
- ✅ Modal content
- ✅ Error messages
- ✅ Table headers
- ✅ Placeholders

### مثال:

```tsx
// ❌ ممنوع
<h1>Journal Entry</h1>
<Button>Save</Button>
toast.success('Saved successfully');

// ✅ صحيح
<h1>{t('accounting.journal.title')}</h1>
<Button>{t('actions.save')}</Button>
toast.success(t('success.saved'));
```

### Backend Error Messages:

```typescript
// ❌ ممنوع
throw new Error('Balance must be zero');

// ✅ صحيح
throw new AppError('error.balanceNotZero', 400);
```

---

## 🧠 القاعدة 3: Backend هو الحقيقة
### Rule 3: Backend is Single Source of Truth

**Frontend لا يقرر الصلاحيات أبداً!**

```typescript
// ❌ ممنوع - Frontend يقرر
if (user.role === 'admin') {
  showPostButton();
}

// ✅ صحيح - Frontend يسأل فقط
if (can('accounting.journal.post')) {
  showPostButton();
}

// ✅ والأهم - Backend يتحقق دائماً
router.post('/journals/:id/post',
  requirePermission('accounting.journal.post'), // ← الحماية الحقيقية
  async (req, res) => { ... }
);
```

**حتى لو Frontend أخفى الزر، Backend يجب أن يتحقق!**

---

## ✅ Checklist للمراجعة قبل Commit

### لكل زر جديد:
- [ ] له permission في `permissions.registry.ts`
- [ ] يستخدم `<PermissionButton>` أو `can()`
- [ ] النص يستخدم `t('...')`
- [ ] API يستخدم `requirePermission()`

### لكل عمود جدول جديد:
- [ ] له permission إذا يحتوي بيانات حساسة
- [ ] Header يستخدم `t('...')`

### لكل شاشة جديدة:
- [ ] جميع الصلاحيات مضافة في registry أولاً
- [ ] `npm run permissions:validate` يمر بنجاح
- [ ] جميع النصوص في `i18n.registry.ts`

### لكل API جديد:
- [ ] يستخدم `requirePermission()` middleware
- [ ] Error messages تستخدم i18n keys

---

## 🛠 أوامر التحقق

```bash
# التحقق من الصلاحيات
npm run permissions:validate

# توليد الصلاحيات في قاعدة البيانات
npm run permissions:generate

# تشغيل المايجريشن
npm run migrate
```

---

## 📁 هيكل الملفات المهمة

```
backend/
├── src/
│   ├── config/
│   │   ├── permissions.registry.ts  ← 🔐 كل الصلاحيات
│   │   └── i18n.registry.ts         ← 🌍 كل الترجمات
│   ├── middleware/
│   │   ├── rbac.ts                  ← 🛡 التحقق من الصلاحيات
│   │   └── companyContext.ts        ← 🏢 عزل الشركات
│   └── scripts/
│       ├── generate-permissions.ts  ← توليد DB
│       └── validate-permissions.ts  ← التحقق

frontend-next/
├── hooks/
│   └── usePermissions.ts            ← 🔑 can(), canAny()
├── components/
│   └── permission/
│       └── PermissionComponents.tsx ← 🔘 Smart Components
└── contexts/
    └── LanguageContext.tsx          ← 🌍 t() function
```

---

## 🚨 Violation Examples

### ❌ Violation 1: Hardcoded Permission Check
```typescript
// WRONG
if (user.roles.includes('admin')) {
  return <PostButton />;
}
```

### ❌ Violation 2: Missing Backend Check
```typescript
// WRONG - No middleware
router.delete('/invoices/:id', async (req, res) => {
  await deleteInvoice(req.params.id);
});
```

### ❌ Violation 3: Hardcoded Text
```typescript
// WRONG
<th>Amount</th>
<Button>Delete</Button>
toast.error('An error occurred');
```

### ❌ Violation 4: Permission Not in Registry
```typescript
// WRONG - Using permission that doesn't exist
can('some.random.permission')  // ← Not in registry!
```

---

## 🏆 Best Practices

1. **Permission Naming**: Use dot notation
   ```
   [module].[screen].[section].[element].[action]
   ```

2. **i18n Key Naming**: Match permission structure
   ```
   accounting.journal.title → 'قيود اليومية'
   accounting.journal.post  → 'ترحيل'
   ```

3. **Group Related Permissions**:
   ```typescript
   journal: {
     view: true,
     create: true,
     edit: true,
     delete: true,
     post: true,
     reverse: true,
     lines: {
       amount: { view: true, edit: true }
     }
   }
   ```

4. **Mark Dangerous Actions**:
   ```typescript
   const DANGEROUS_ACTIONS = ['delete', 'post', 'reverse', 'approve'];
   ```

---

**تذكر: هذه القواعد تحمي النظام وتسهل الصيانة المستقبلية!**

**Remember: These rules protect the system and make future maintenance easier!**
