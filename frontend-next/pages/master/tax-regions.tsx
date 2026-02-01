import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/master/tax-zones',
      permanent: false,
    },
  };
};

export default function TaxRegionsRedirectPage() {
  return null;
}
