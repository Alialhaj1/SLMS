import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import PolicyCrudTable from '../../components/settings/PolicyCrudTable';
import { withPermission } from '../../utils/withPermission';

function ZatcaSettingsPage() {
  return (
    <MainLayout>
      <Head>
        <title>ZATCA Integration - SLMS</title>
      </Head>

      <PolicyCrudTable
        titleKey="settingsAdmin.pages.zatca.title"
        subtitleKey="settingsAdmin.pages.zatca.subtitle"
        viewPermission={'system_policies:view'}
        managePermissions={{
          create: 'system_policies:create',
          edit: 'system_policies:edit',
          delete: 'system_policies:delete',
        }}
        filters={{ category: 'zatca' }}
      />
    </MainLayout>
  );
}

export default withPermission('system_policies:view' as any, ZatcaSettingsPage);
