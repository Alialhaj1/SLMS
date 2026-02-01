/**
 * 🔐 PERMISSIONS DEMO PAGE - صفحة عرض مكونات الصلاحيات
 * =====================================================
 * 
 * صفحة لاختبار وعرض جميع مكونات الصلاحيات المتاحة
 */

import React, { useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import {
  PermissionGate,
  ProtectedButton,
  ProtectedField,
  ProtectedLink,
  ProtectedCard,
  ProtectedAction,
  ProtectedDataTable,
  PageGuard,
} from '../../components/permissions';
import Input from '../../components/ui/Input';
import {
  TruckIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  PlusIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

// بيانات تجريبية
const sampleData = [
  { id: 1, name: 'شحنة 001', status: 'active', cost: 5000, profit: 1200 },
  { id: 2, name: 'شحنة 002', status: 'pending', cost: 3500, profit: 800 },
  { id: 3, name: 'شحنة 003', status: 'completed', cost: 7200, profit: 1500 },
];

export default function PermissionsDemoPage() {
  const { t } = useTranslation();
  const { can, isSuperAdmin, userPermissions } = usePermissions();
  const [inputValue, setInputValue] = useState('قيمة تجريبية');

  return (
    <PageGuard permission="dashboard:view" useLayout={false}>
      <MainLayout>
        <Head>
          <title>Permission Components Demo - SLMS</title>
        </Head>

        <div className="max-w-6xl mx-auto">
          {/* العنوان */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              🔐 مكونات الصلاحيات
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              عرض تفاعلي لجميع مكونات الصلاحيات المتاحة في النظام
            </p>
          </div>

          {/* معلومات المستخدم الحالي */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-8">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
              معلومات الصلاحيات الحالية
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Super Admin: <span className="font-mono">{isSuperAdmin ? 'نعم ✓' : 'لا ✗'}</span>
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              عدد الصلاحيات: <span className="font-mono">{userPermissions.length}</span>
            </p>
          </div>

          {/* القسم 1: PermissionGate */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 border-b pb-2">
              1️⃣ PermissionGate - بوابة الصلاحيات
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
                <h4 className="font-medium mb-2">إخفاء المحتوى:</h4>
                <PermissionGate permission="shipments:create">
                  <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded">
                    ✓ لديك صلاحية إنشاء الشحنات
                  </div>
                </PermissionGate>
                <PermissionGate 
                  permission="non_existent_permission"
                  fallback={<div className="bg-red-100 dark:bg-red-900/20 p-3 rounded mt-2">
                    ✗ لا تملك هذه الصلاحية
                  </div>}
                >
                  <div>هذا لن يظهر</div>
                </PermissionGate>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <pre className="text-xs overflow-auto">{`<PermissionGate permission="shipments:create">
  <CreateButton />
</PermissionGate>

<PermissionGate 
  permission="admin:view"
  fallback={<AccessDenied />}
>
  <AdminPanel />
</PermissionGate>`}</pre>
              </div>
            </div>
          </section>

          {/* القسم 2: ProtectedButton */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 border-b pb-2">
              2️⃣ ProtectedButton - أزرار محمية
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border space-y-3">
                <ProtectedButton 
                  permission="shipments:create"
                  icon={<PlusIcon className="w-4 h-4" />}
                  onClick={() => alert('إنشاء شحنة')}
                >
                  إنشاء شحنة
                </ProtectedButton>

                <ProtectedButton 
                  permission="shipments:delete"
                  variant="danger"
                  requireConfirm
                  confirmMessage="هل أنت متأكد من الحذف؟"
                  icon={<TrashIcon className="w-4 h-4" />}
                  onClick={() => alert('تم الحذف')}
                >
                  حذف (يتطلب تأكيد)
                </ProtectedButton>

                <ProtectedButton 
                  permission="finance:approve"
                  variant="success"
                  icon={<CheckCircleIcon className="w-4 h-4" />}
                  onClick={() => alert('تمت الموافقة')}
                >
                  موافقة
                </ProtectedButton>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <pre className="text-xs overflow-auto">{`<ProtectedButton 
  permission="shipments:create"
  icon={<PlusIcon />}
  onClick={handleCreate}
>
  إنشاء شحنة
</ProtectedButton>

<ProtectedButton 
  permission="shipments:delete"
  variant="danger"
  requireConfirm
  confirmMessage="هل أنت متأكد؟"
>
  حذف
</ProtectedButton>`}</pre>
              </div>
            </div>
          </section>

          {/* القسم 3: ProtectedField */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 border-b pb-2">
              3️⃣ ProtectedField - حقول محمية
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border space-y-3">
                <ProtectedField permission="items:edit" readOnlyOnNoPermission>
                  <Input
                    label="حقل قابل للتعديل"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                </ProtectedField>

                <ProtectedField 
                  permission="finance:view_cost"
                  fallbackValue="****"
                >
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
                    التكلفة: 5,000 ريال
                  </div>
                </ProtectedField>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <pre className="text-xs overflow-auto">{`<ProtectedField 
  permission="items:edit"
  readOnlyOnNoPermission
>
  <Input value={value} onChange={...} />
</ProtectedField>

<ProtectedField 
  permission="finance:view_cost"
  fallbackValue="****"
>
  <span>{costValue}</span>
</ProtectedField>`}</pre>
              </div>
            </div>
          </section>

          {/* القسم 4: ProtectedCard */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 border-b pb-2">
              4️⃣ ProtectedCard - بطاقات محمية
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <ProtectedCard
                permission="shipments:view"
                title="إجمالي الشحنات"
                value={156}
                icon={<TruckIcon className="w-6 h-6" />}
                color="blue"
                href="/shipments"
                linkPermission="shipments:view"
              />
              <ProtectedCard
                permission="finance:view"
                title="الإيرادات"
                value="125,000 ريال"
                icon={<CurrencyDollarIcon className="w-6 h-6" />}
                color="green"
                trend="up"
                trendValue="+12%"
              />
              <ProtectedCard
                permission="non_existent"
                title="بطاقة مخفية"
                value="0"
                color="gray"
                showPlaceholder
                hideOnNoPermission={false}
                placeholderText="لا تملك صلاحية العرض"
              />
            </div>
          </section>

          {/* القسم 5: ProtectedDataTable */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 border-b pb-2">
              5️⃣ ProtectedDataTable - جدول محمي
            </h2>
            <ProtectedDataTable
              data={sampleData}
              keyExtractor={(row) => row.id}
              searchable
              searchPlaceholder="ابحث في الشحنات..."
              columns={[
                { key: 'name', label: 'اسم الشحنة', sortable: true },
                { key: 'status', label: 'الحالة' },
                { 
                  key: 'cost', 
                  label: 'التكلفة',
                  permission: 'finance:view_cost',
                  showMasked: true,
                  maskedValue: '••••',
                  render: (row) => `${row.cost.toLocaleString()} ريال`
                },
                { 
                  key: 'profit', 
                  label: 'الربح',
                  permission: 'finance:view_profit',
                  showMasked: true,
                  render: (row) => `${row.profit.toLocaleString()} ريال`
                },
              ]}
              actions={[
                {
                  key: 'view',
                  label: 'عرض',
                  permission: 'shipments:view',
                  icon: <EyeIcon className="w-4 h-4" />,
                  onClick: (row) => alert(`عرض: ${row.name}`),
                },
                {
                  key: 'edit',
                  label: 'تعديل',
                  permission: 'shipments:edit',
                  icon: <PencilIcon className="w-4 h-4" />,
                  onClick: (row) => alert(`تعديل: ${row.name}`),
                },
                {
                  key: 'delete',
                  label: 'حذف',
                  permission: 'shipments:delete',
                  icon: <TrashIcon className="w-4 h-4" />,
                  variant: 'danger',
                  requireConfirm: true,
                  confirmMessage: 'هل أنت متأكد من حذف هذه الشحنة؟',
                  onClick: (row) => alert(`حذف: ${row.name}`),
                },
              ]}
            />
          </section>

          {/* القسم 6: ProtectedLink */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 border-b pb-2">
              6️⃣ ProtectedLink - روابط محمية
            </h2>
            <div className="flex flex-wrap gap-4">
              <ProtectedLink
                href="/shipments"
                permission="shipments:view"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                صفحة الشحنات
              </ProtectedLink>
              <ProtectedLink
                href="/admin/users"
                permission="users:manage"
                className="text-blue-600 hover:text-blue-800 underline"
                showAsTextOnNoPermission
              >
                إدارة المستخدمين (نص عادي إذا لم تملك الصلاحية)
              </ProtectedLink>
            </div>
          </section>

          {/* القسم 7: ProtectedAction */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 border-b pb-2">
              7️⃣ ProtectedAction - إجراءات محمية
            </h2>
            <div className="flex gap-2">
              <ProtectedAction
                permission="shipments:view"
                icon={<EyeIcon className="w-5 h-5" />}
                tooltip="عرض"
                onClick={() => alert('عرض')}
              />
              <ProtectedAction
                permission="shipments:edit"
                icon={<PencilIcon className="w-5 h-5" />}
                tooltip="تعديل"
                variant="primary"
                onClick={() => alert('تعديل')}
              />
              <ProtectedAction
                permission="shipments:delete"
                icon={<TrashIcon className="w-5 h-5" />}
                tooltip="حذف"
                variant="danger"
                requireConfirm
                confirmMessage="هل أنت متأكد؟"
                onClick={() => alert('حذف')}
              />
            </div>
          </section>

        </div>
      </MainLayout>
    </PageGuard>
  );
}
