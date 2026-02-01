import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import PolicyCrudTable from '../../components/settings/PolicyCrudTable';
import { useTranslation } from '../../hooks/useTranslation';
import { withPermission } from '../../utils/withPermission';

function SmtpSettingsPage() {
  const { t } = useTranslation();

  return (
    <MainLayout>
      <Head>
        <title>{t('settingsAdmin.pages.smtp.title')} - SLMS</title>
      </Head>

      <PolicyCrudTable
        titleKey="settingsAdmin.pages.smtp.title"
        subtitleKey="settingsAdmin.pages.smtp.subtitle"
        viewPermission={'system_policies:view'}
        managePermissions={{
          create: 'system_policies:create',
          edit: 'system_policies:edit',
          delete: 'system_policies:delete',
        }}
        filters={{ category: 'smtp' }}
      />
    </MainLayout>
  );
}

export default withPermission('system_policies:view', SmtpSettingsPage);
