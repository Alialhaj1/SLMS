import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import PolicyCrudTable from '../../components/settings/PolicyCrudTable';
import { withPermission } from '../../utils/withPermission';

function DualApprovalPage() {
  return (
    <MainLayout>
      <Head>
        <title>Dual Approval - SLMS</title>
      </Head>

      <PolicyCrudTable
        titleKey="settingsAdmin.pages.dualApproval.title"
        subtitleKey="settingsAdmin.pages.dualApproval.subtitle"
        viewPermission={'system_policies:view'}
        managePermissions={{
          create: 'system_policies:create',
          edit: 'system_policies:edit',
          delete: 'system_policies:delete',
        }}
        filters={{ category: 'approval' }}
      />
    </MainLayout>
  );
}

export default withPermission('system_policies:view' as any, DualApprovalPage);
