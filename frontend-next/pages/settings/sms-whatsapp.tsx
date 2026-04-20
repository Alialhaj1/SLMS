import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import PolicyCrudTable from '../../components/settings/PolicyCrudTable';
import { useTranslation } from '../../hooks/useTranslation';
import { withPermission, withPlatformGuard } from '../../utils/withPermission';

function SmsWhatsAppSettingsPage() {
  const { t } = useTranslation();

  return (
    <MainLayout>
      <Head>
        <title>{t('settingsAdmin.pages.smsWhatsapp.title')} - SLMS</title>
      </Head>

      <PolicyCrudTable
        titleKey="settingsAdmin.pages.smsWhatsapp.title"
        subtitleKey="settingsAdmin.pages.smsWhatsapp.subtitle"
        viewPermission={'system_policies:view'}
        managePermissions={{
          create: 'system_policies:create',
          edit: 'system_policies:edit',
          delete: 'system_policies:delete',
        }}
        filters={{ category: 'sms_whatsapp' }}
      />
    </MainLayout>
  );
}

export default withPlatformGuard(withPermission('system_policies:view', SmsWhatsAppSettingsPage));
