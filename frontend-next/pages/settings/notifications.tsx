import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import PolicyCrudTable from '../../components/settings/PolicyCrudTable';
import { withPermission } from '../../utils/withPermission';

function NotificationSettingsPage() {
  return (
    <MainLayout>
      <Head>
        <title>Notification Settings - SLMS</title>
      </Head>

      <PolicyCrudTable
        titleKey="settingsAdmin.pages.notifications.title"
        subtitleKey="settingsAdmin.pages.notifications.subtitle"
        viewPermission={'system_policies:view'}
        managePermissions={{
          create: 'system_policies:create',
          edit: 'system_policies:edit',
          delete: 'system_policies:delete',
        }}
        filters={{ category: 'notifications_settings' }}
      />
    </MainLayout>
  );
}

export default withPermission('system_policies:view' as any, NotificationSettingsPage);
