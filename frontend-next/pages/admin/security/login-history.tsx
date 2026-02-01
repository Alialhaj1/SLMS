import type { GetServerSideProps } from 'next';

export default function AdminSecurityLoginHistoryRedirect() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(ctx.query)) {
    if (typeof value === 'string') {
      params.set(key, value);
    } else if (Array.isArray(value) && value.length > 0) {
      params.set(key, value[0]);
    }
  }

  const qs = params.toString();

  return {
    redirect: {
      destination: `/admin/login-history${qs ? `?${qs}` : ''}`,
      permanent: false,
    },
  };
};
