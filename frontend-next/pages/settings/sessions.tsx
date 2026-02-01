import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import PolicyCrudTable from '../../components/settings/PolicyCrudTable';
import { withPermission } from '../../utils/withPermission';

function SessionsPage() {
  return (
    <MainLayout>
      <Head>
        <title>Session Settings - SLMS</title>
      </Head>

      <PolicyCrudTable
        titleKey="settingsAdmin.pages.sessions.title"
        subtitleKey="settingsAdmin.pages.sessions.subtitle"
        viewPermission={'system_policies:view'}
        managePermissions={{
          create: 'system_policies:create',
          edit: 'system_policies:edit',
          delete: 'system_policies:delete',
        }}
        filters={{
          keys: ['session_timeout_minutes', 'refresh_token_expiry_days'].join(','),
          category: 'security',
        }}
      />
    </MainLayout>
  );
}

export default withPermission('system_policies:view' as any, SessionsPage);
