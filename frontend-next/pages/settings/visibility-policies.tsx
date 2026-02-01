import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import PolicyCrudTable from '../../components/settings/PolicyCrudTable';
import { withPermission } from '../../utils/withPermission';

function VisibilityPoliciesPage() {
  return (
    <MainLayout>
      <Head>
        <title>Visibility Policies - SLMS</title>
      </Head>

      <PolicyCrudTable
        titleKey="settingsAdmin.pages.visibility.title"
        subtitleKey="settingsAdmin.pages.visibility.subtitle"
        viewPermission={'system_policies:view'}
        managePermissions={{
          create: 'system_policies:create',
          edit: 'system_policies:edit',
          delete: 'system_policies:delete',
        }}
        filters={{ category: 'visibility' }}
      />
    </MainLayout>
  );
}

export default withPermission('system_policies:view' as any, VisibilityPoliciesPage);
