import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import PolicyCrudTable from '../../components/settings/PolicyCrudTable';
import { withPermission } from '../../utils/withPermission';

function FreezeSettingsPage() {
  return (
    <MainLayout>
      <Head>
        <title>Freeze Settings - SLMS</title>
      </Head>

      <PolicyCrudTable
        titleKey="settingsAdmin.pages.freeze.title"
        subtitleKey="settingsAdmin.pages.freeze.subtitle"
        viewPermission={'system_policies:view'}
        managePermissions={{
          create: 'system_policies:create',
          edit: 'system_policies:edit',
          delete: 'system_policies:delete',
        }}
        filters={{ category: 'freeze' }}
      />
    </MainLayout>
  );
}

export default withPermission('system_policies:view' as any, FreezeSettingsPage);
