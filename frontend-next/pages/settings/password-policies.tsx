import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import PolicyCrudTable from '../../components/settings/PolicyCrudTable';
import { withAllPermissions } from '../../utils/withPermission';

function PasswordPoliciesPage() {
  return (
    <MainLayout>
      <Head>
        <title>Password Policies - SLMS</title>
      </Head>

      <PolicyCrudTable
        titleKey="settingsAdmin.pages.passwordPolicies.title"
        subtitleKey="settingsAdmin.pages.passwordPolicies.subtitle"
        viewPermission={'system_policies:view'}
        managePermissions={{
          create: 'system_policies:create',
          edit: 'system_policies:edit',
          delete: 'system_policies:delete',
        }}
        filters={{
          keys: [
            'password_min_length',
            'password_require_uppercase',
            'password_require_lowercase',
            'password_require_number',
            'password_require_special_char',
            'max_login_attempts',
            'lockout_duration_minutes',
          ].join(','),
          category: 'security',
        }}
      />
    </MainLayout>
  );
}

export default withAllPermissions(
  ['system_policies:view' as any, 'system_policies:edit' as any],
  PasswordPoliciesPage
);
