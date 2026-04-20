# SLMS UI Components Guide

## Overview

This guide covers the comprehensive UI component library for the SLMS (Smart Logistics Management System). All components follow the Arabic specification with RTL support, dark mode compatibility, and enterprise-grade accessibility standards.

## Architecture Principles

### Arabic-First Design
- **RTL Support**: Automatic layout mirroring for Arabic users
- **Typography**: IBM Plex Sans Arabic + Tajawal fonts
- **Color System**: Blue gradient theme (#0D1B2A → #0F4C81 → #1A6BB5)
- **Translation Ready**: All components support `useLocale()` for Arabic/English

### Enterprise Standards
- **WCAG AA Compliance**: 4.5:1 contrast ratios, keyboard navigation, ARIA labels
- **Permission Integration**: Components automatically hide/show based on RBAC permissions
- **Consistent Spacing**: 4px/8px/12px/16px/24px grid system
- **Dark Mode**: Automatic theme switching with `useTheme()`

### Component Philosophy
- **Composition over Configuration**: Small, focused components that work together
- **Type Safety**: Full TypeScript support with detailed interfaces
- **Performance**: Optimized with React.memo, useMemo, and lazy loading
- **Accessibility**: Focus management, screen reader support, keyboard shortcuts

---

## Core UI Components

### 1. Enhanced Fields (`components/ui/Fields.enhanced.tsx`)

Complete form field library with validation and RTL support.

#### TextField Component
```tsx
import { TextField } from '@/components/ui/Fields.enhanced';

function UserForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  return (
    <TextField
      id="email"
      name="email"
      type="email"
      label="البريد الإلكتروني"
      required
      error={errors.email}
      helpText="سيتم استخدام هذا البريد للتواصل"
      rtl={locale === 'ar'}
      onChange={(e) => setEmail(e.target.value)}
    />
  );
}
```

#### NumberField with Validation
```tsx
<NumberField
  id="salary"
  name="salary"
  label="الراتب الشهري"
  currency="SAR"
  min={0}
  max={100000}
  precision={2}
  thousandSeparator
  required
  error={errors.salary}
  validation={{
    min: { value: 1000, message: 'الحد الأدنى 1000 ريال' },
    max: { value: 50000, message: 'الحد الأقصى 50000 ريال' }
  }}
/>
```

#### SelectField with Async Loading
```tsx
<SelectField
  id="company"
  name="company_id"
  label="الشركة"
  required
  loading={companiesLoading}
  error={errors.company_id}
  searchable
  clearable
  options={companies.map(company => ({
    value: company.id,
    label: company.name,
    disabled: !company.is_active
  }))}
  onSearch={handleCompanySearch}
  renderOption={(option) => (
    <div className="flex justify-between">
      <span>{option.label}</span>
      {option.disabled && <span className="text-gray-400">(معطل)</span>}
    </div>
  )}
/>
```

#### DateField with Arabic Locale
```tsx
<DateField
  id="start_date"
  name="start_date"
  label="تاريخ البداية"
  required
  minDate={new Date()}
  maxDate={endDate}
  showTimeSelect
  locale="ar"
  error={errors.start_date}
  helpText="التاريخ والوقت المحددين لبداية العملية"
/>
```

### 2. Enhanced Table (`components/ui/EnhancedTable.tsx`)

Enterprise data table with sorting, filtering, pagination, and bulk actions.

#### Basic Usage
```tsx
import { EnhancedTable } from '@/components/ui/EnhancedTable';

function ShipmentsTable() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { hasPermission } = usePermissions();

  const columns = [
    {
      key: 'reference_number',
      title: 'رقم الإرسالية',
      sortable: true,
      searchable: true,
      render: (value, row) => (
        <Link href={`/shipments/${row.id}`}>
          <span className="text-blue-600 hover:underline">{value}</span>
        </Link>
      )
    },
    {
      key: 'status',
      title: 'الحالة',
      sortable: true,
      filterable: true,
      render: (value) => (
        <StatusBadge status={value} />
      ),
      filterOptions: [
        { label: 'جديد', value: 'new' },
        { label: 'قيد التنفيذ', value: 'in_progress' },
        { label: 'مكتمل', value: 'completed' }
      ]
    },
    {
      key: 'created_at',
      title: 'تاريخ الإنشاء',
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString('ar-SA')
    }
  ];

  const actions = [
    {
      key: 'edit',
      label: 'تعديل',
      icon: <PencilIcon className="w-4 h-4" />,
      onClick: (row) => router.push(`/shipments/${row.id}/edit`),
      permission: 'shipments:edit',
      show: (row) => row.status !== 'completed'
    },
    {
      key: 'delete',
      label: 'حذف',
      icon: <TrashIcon className="w-4 h-4" />,
      onClick: handleDelete,
      permission: 'shipments:delete',
      variant: 'danger',
      confirmTitle: 'حذف الإرسالية',
      confirmMessage: 'هل أنت متأكد من حذف هذه الإرسالية؟'
    }
  ];

  return (
    <EnhancedTable
      data={data}
      columns={columns}
      actions={actions}
      loading={loading}
      searchable
      filterable
      exportable
      selectable
      pagination={{
        pageSize: 20,
        showSizeChanger: true,
        showTotal: (total, range) => 
          `${range[0]}-${range[1]} من ${total} إرسالية`
      }}
      onSearch={handleSearch}
      onFilter={handleFilter}
      onSort={handleSort}
      onExport={handleExport}
      onSelectionChange={handleBulkSelection}
      bulkActions={[
        {
          key: 'bulk_status',
          label: 'تحديث الحالة',
          icon: <ArrowPathIcon className="w-4 h-4" />,
          onClick: handleBulkStatusUpdate,
          permission: 'shipments:edit'
        }
      ]}
    />
  );
}
```

#### Advanced Filtering Example
```tsx
const advancedFilters = [
  {
    key: 'date_range',
    type: 'dateRange',
    label: 'النطاق الزمني',
    placeholder: ['من تاريخ', 'إلى تاريخ']
  },
  {
    key: 'amount_range',
    type: 'numberRange',
    label: 'نطاق المبلغ',
    currency: 'SAR'
  },
  {
    key: 'customer_type',
    type: 'multiSelect',
    label: 'نوع العميل',
    options: customerTypes
  }
];

<EnhancedTable
  // ... other props
  advancedFiltering
  filterPanel={advancedFilters}
  onAdvancedFilter={handleAdvancedFilter}
  savedFilters // Enable saving filter presets
/>
```

### 3. Enhanced Modal System (`components/ui/Modal.enhanced.tsx`)

Complete modal system with accessibility, animations, and confirmation dialogs.

#### Basic Modal
```tsx
import { Modal, useModal } from '@/components/ui/Modal.enhanced';

function UserManagement() {
  const createUserModal = useModal();

  return (
    <>
      <Button onClick={createUserModal.open}>
        إضافة مستخدم جديد
      </Button>

      <Modal
        isOpen={createUserModal.isOpen}
        onClose={createUserModal.close}
        title="إضافة مستخدم جديد"
        size="lg"
      >
        <CreateUserForm onSubmit={handleCreateUser} />
      </Modal>
    </>
  );
}
```

#### Confirmation Dialogs
```tsx
import { ConfirmDialog, DeleteConfirmDialog } from '@/components/ui/Modal.enhanced';

function DataActions() {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteUser(userId);
      showToast('success', 'تم حذف المستخدم بنجاح');
      setDeleteConfirm(false);
    } catch (error) {
      showToast('error', 'فشل في حذف المستخدم');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Button 
        variant="danger" 
        onClick={() => setDeleteConfirm(true)}
      >
        حذف المستخدم
      </Button>

      <DeleteConfirmDialog
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="حذف المستخدم"
        entityName="أحمد محمد"
        additionalWarning="سيتم حذف جميع البيانات المرتبطة بهذا المستخدم."
        loading={deleting}
      />
    </>
  );
}
```

#### Save Changes Dialog
```tsx
import { SaveChangesDialog } from '@/components/ui/Modal.enhanced';

function EditForm() {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const handleNavigateAway = () => {
    if (hasUnsavedChanges) {
      setShowSaveDialog(true);
    } else {
      router.push('/users');
    }
  };

  return (
    <>
      {/* Form content */}
      
      <SaveChangesDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={handleSave}
        onDiscard={() => router.push('/users')}
        changedFields={['name', 'email', 'role']}
      />
    </>
  );
}
```

### 4. Enhanced Tooltip (`components/ui/Tooltip.enhanced.tsx`)

Smart tooltip system with auto-positioning and touch support.

#### Basic Tooltip
```tsx
import { Tooltip } from '@/components/ui/Tooltip.enhanced';

function IconButton() {
  return (
    <Tooltip content="حفظ التغييرات">
      <Button size="sm" variant="primary">
        <SaveIcon className="w-4 h-4" />
      </Button>
    </Tooltip>
  );
}
```

#### Rich Content Tooltip
```tsx
<Tooltip
  content={
    <div className="space-y-2">
      <div className="font-semibold">معلومات الشحنة</div>
      <div className="text-sm">
        <div>الوجهة: الرياض</div>
        <div>الوزن: 25.5 كيلو</div>
        <div>التكلفة: 150 ريال</div>
      </div>
    </div>
  }
  position="bottom"
  maxWidth={250}
  delay={500}
>
  <span className="text-blue-600 cursor-help border-b border-dotted">
    رقم الشحنة: SH-2024-001
  </span>
</Tooltip>
```

#### Interactive Tooltip
```tsx
<Tooltip
  content={
    <div className="space-y-2">
      <div>خيارات سريعة</div>
      <Button size="sm" onClick={() => handleQuickAction('approve')}>
        موافقة
      </Button>
      <Button size="sm" variant="secondary" onClick={() => handleQuickAction('reject')}>
        رفض
      </Button>
    </div>
  }
  interactive
  trigger="click"
  closeOnClickOutside
>
  <Button variant="outline">خيارات</Button>
</Tooltip>
```

### 5. Enhanced Toast System (`components/ui/Toast.enhanced.tsx`)

Notification system with queue management and rich content.

#### Basic Usage
```tsx
import { useToast } from '@/components/ui/Toast.enhanced';

function UserActions() {
  const { showToast, showPromiseToast } = useToast();

  const handleSave = async () => {
    const savePromise = saveUserData();
    
    showPromiseToast(savePromise, {
      loading: 'جاري حفظ البيانات...',
      success: 'تم حفظ البيانات بنجاح',
      error: 'فشل في حفظ البيانات'
    });
  };

  const handleCustomNotification = () => {
    showToast({
      type: 'info',
      title: 'تحديث متاح',
      message: 'يتوفر إصدار جديد من النظام',
      actions: [
        {
          label: 'تحديث الآن',
          onClick: handleUpdate,
          variant: 'primary'
        },
        {
          label: 'تذكيري لاحقاً',
          onClick: handleRemindLater
        }
      ],
      persistent: true, // Won't auto-dismiss
      icon: <UpdateIcon className="w-5 h-5" />
    });
  };
}
```

#### Progress Notifications
```tsx
const { showProgressToast } = useToast();

const handleFileUpload = async (file: File) => {
  const toastId = showProgressToast({
    title: 'رفع الملف',
    message: `جاري رفع ${file.name}...`,
    progress: 0
  });

  // Update progress
  const xhr = new XMLHttpRequest();
  xhr.upload.onprogress = (e) => {
    const progress = (e.loaded / e.total) * 100;
    showProgressToast({
      id: toastId,
      progress,
      message: `${Math.round(progress)}% مكتمل`
    });
  };

  xhr.onload = () => {
    showProgressToast({
      id: toastId,
      type: 'success',
      title: 'تم رفع الملف بنجاح',
      progress: 100
    });
  };
};
```

### 6. Page Header Component (`components/layout/PageHeader.tsx`)

Standardized page headers with breadcrumbs, actions, and permission integration.

#### Basic Page Header
```tsx
import { PageHeader } from '@/components/layout/PageHeader';

function UsersPage() {
  return (
    <>
      <PageHeader
        title="إدارة المستخدمين"
        description="عرض وإدارة جميع مستخدمي النظام"
        breadcrumbs={[
          { label: 'الرئيسية', href: '/dashboard' },
          { label: 'المستخدمين', href: '/users' }
        ]}
        actions={[
          {
            label: 'إضافة مستخدم',
            onClick: () => setCreateModalOpen(true),
            permission: 'users:create',
            variant: 'primary',
            icon: <PlusIcon className="w-4 h-4" />
          },
          {
            label: 'تصدير',
            onClick: handleExport,
            permission: 'users:export',
            variant: 'outline'
          }
        ]}
      />
      
      {/* Page content */}
    </>
  );
}
```

#### CRUD Page Header
```tsx
import { CrudPageHeader } from '@/components/layout/PageHeader';

function EditUserPage() {
  const router = useRouter();
  const { id } = router.query;

  return (
    <>
      <CrudPageHeader
        mode="edit"
        entityName="المستخدم"
        entityTitle="أحمد محمد"
        resource="users"
        basePath="/users"
        breadcrumbs={[
          { label: 'الرئيسية', href: '/dashboard' },
          { label: 'المستخدمين', href: '/users' },
          { label: 'أحمد محمد' }
        ]}
      />
      
      {/* Edit form */}
    </>
  );
}
```

---

## Permission Integration

All components integrate seamlessly with the RBAC system through the enhanced `usePermissions` hook.

### Permission Gate Component
```tsx
import { PermissionGate } from '@/hooks/usePermissions';

function AdminSection() {
  return (
    <PermissionGate permission="users:manage">
      <div>
        <h3>إعدادات المشرف</h3>
        <UserManagementPanel />
      </div>
    </PermissionGate>
  );
}

// Multiple permissions
<PermissionGate 
  permissions={['reports:view', 'analytics:view']} 
  mode="any"
>
  <ReportsSection />
</PermissionGate>
```

### Higher-Order Component
```tsx
import { withPermissions } from '@/hooks/usePermissions';

const AdminPanel = withPermissions(
  AdminPanelComponent,
  ['admin:access', 'users:manage'],
  {
    mode: 'all',
    fallback: AccessDeniedComponent
  }
);
```

### Permission-Based Menu
```tsx
import { createPermissionMenu } from '@/hooks/usePermissions';

function NavigationMenu() {
  const menuItems = createPermissionMenu([
    {
      key: 'dashboard',
      label: 'الرئيسية',
      href: '/dashboard',
      icon: <HomeIcon />
    },
    {
      key: 'shipments',
      label: 'الشحنات',
      permission: 'shipments:view',
      href: '/shipments',
      children: [
        {
          key: 'create-shipment',
          label: 'إنشاء شحنة',
          permission: 'shipments:create',
          href: '/shipments/create'
        }
      ]
    },
    {
      key: 'users',
      label: 'المستخدمين',
      permissions: ['users:view', 'admin:access'],
      mode: 'any',
      href: '/users'
    }
  ]);

  return (
    <nav>
      {menuItems.map(item => (
        <MenuItem key={item.key} {...item} />
      ))}
    </nav>
  );
}
```

---

## Styling Guidelines

### CSS Classes Structure
All components follow a consistent CSS class structure defined in `styles/enhanced-components.css`:

```css
/* Component base classes */
.slms-field-base { /* Base field styling */ }
.slms-table-base { /* Base table styling */ }
.slms-modal-base { /* Base modal styling */ }

/* RTL support */
.slms-rtl .slms-field-label { text-align: right; }
.slms-rtl .slms-table-cell { text-align: right; }

/* Dark mode */
.dark .slms-field-base { /* Dark mode overrides */ }
.dark .slms-modal-base { /* Dark mode overrides */ }
```

### Custom Theme Variables
```css
:root {
  /* Arabic Brand Colors */
  --slms-primary: #1A6BB5;
  --slms-primary-dark: #0F4C81;
  --slms-primary-darker: #0D1B2A;
  
  /* Semantic Colors */
  --slms-success: #22C55E;
  --slms-warning: #F59E0B;
  --slms-danger: #EF4444;
  --slms-info: #3B82F6;
}
```

### Typography Classes
```css
.slms-text-arabic {
  font-family: 'IBM Plex Sans Arabic', 'Tajawal', sans-serif;
  font-feature-settings: 'kern' 1, 'liga' 1;
}

.slms-text-heading {
  font-weight: 600;
  line-height: 1.3;
}

.slms-text-body {
  font-weight: 400;
  line-height: 1.6;
}
```

---

## Best Practices

### 1. Component Composition
```tsx
// Good: Composable components
function UserForm() {
  return (
    <Card>
      <CardHeader>
        <PageHeader title="بيانات المستخدم" />
      </CardHeader>
      <CardBody>
        <div className="space-y-4">
          <TextField label="الاسم" />
          <SelectField label="الدور" />
          <DateField label="تاريخ الانضمام" />
        </div>
      </CardBody>
      <CardFooter>
        <Button variant="primary">حفظ</Button>
        <Button variant="outline">إلغاء</Button>
      </CardFooter>
    </Card>
  );
}
```

### 2. Error Handling
```tsx
// Always handle loading and error states
function DataComponent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <ErrorBoundary
        title="خطأ في تحميل البيانات"
        message={error}
        onRetry={handleRetry}
      />
    );
  }

  return <ActualContent />;
}
```

### 3. Accessibility
```tsx
// Always include proper ARIA labels and keyboard support
<div
  role="button"
  tabIndex={0}
  aria-label="حذف العنصر"
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleDelete();
    }
  }}
>
  <TrashIcon />
</div>
```

### 4. Performance
```tsx
// Use React.memo for expensive components
const ExpensiveTable = React.memo(function ExpensiveTable({ data }) {
  // Component implementation
}, (prevProps, nextProps) => {
  return prevProps.data.length === nextProps.data.length;
});

// Use useMemo for expensive calculations
const filteredData = useMemo(() => {
  return data.filter(item => item.status === 'active');
}, [data]);
```

---

## Integration Examples

### Complete CRUD Page Example
```tsx
import { 
  PageHeader, 
  EnhancedTable, 
  Modal, 
  TextField, 
  Button 
} from '@/components/ui';
import { usePermissions, PermissionGate } from '@/hooks/usePermissions';

function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();

  const columns = [
    {
      key: 'name',
      title: 'الاسم',
      sortable: true,
      searchable: true
    },
    {
      key: 'email',
      title: 'البريد الإلكتروني',
      sortable: true,
      searchable: true
    },
    {
      key: 'role',
      title: 'الدور',
      filterable: true,
      render: (value) => (
        <Badge variant={value === 'admin' ? 'primary' : 'secondary'}>
          {value === 'admin' ? 'مدير' : 'مستخدم'}
        </Badge>
      )
    },
    {
      key: 'created_at',
      title: 'تاريخ الإنشاء',
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString('ar-SA')
    }
  ];

  const actions = [
    {
      key: 'edit',
      label: 'تعديل',
      permission: 'users:edit',
      onClick: (user) => router.push(`/users/${user.id}/edit`)
    },
    {
      key: 'delete',
      label: 'حذف',
      permission: 'users:delete',
      variant: 'danger',
      onClick: handleDelete,
      confirmTitle: 'حذف المستخدم',
      confirmMessage: 'هل أنت متأكد من حذف هذا المستخدم؟'
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="إدارة المستخدمين"
        description="عرض وإدارة جميع مستخدمي النظام"
        actions={[
          {
            label: 'إضافة مستخدم',
            onClick: () => setCreateModal(true),
            permission: 'users:create',
            variant: 'primary'
          }
        ]}
      />

      <EnhancedTable
        data={users}
        columns={columns}
        actions={actions}
        loading={loading}
        searchable
        filterable
        exportable
        onRefresh={loadUsers}
      />

      <PermissionGate permission="users:create">
        <Modal
          isOpen={createModal}
          onClose={() => setCreateModal(false)}
          title="إضافة مستخدم جديد"
          size="lg"
        >
          <CreateUserForm
            onSubmit={handleCreateUser}
            onCancel={() => setCreateModal(false)}
          />
        </Modal>
      </PermissionGate>
    </div>
  );
}
```

This comprehensive guide covers all the major UI components in the SLMS system. Each component is designed to work together seamlessly while maintaining the Arabic specification, accessibility standards, and enterprise-grade functionality.