import Head from 'next/head';
import MainLayout from '../../../components/layout/MainLayout';
import { withPermission } from '../../../utils/withPermission';
import ProfessionalPurchaseOrderForm from '../../../components/purchasing/purchaseOrder';

function NewPurchaseOrderPage() {
  return (
    <MainLayout>
      <Head>
        <title>Create Purchase Order - SLMS</title>
      </Head>

      <ProfessionalPurchaseOrderForm mode="create" />
    </MainLayout>
  );
}

export default withPermission('purchase_orders:create', NewPurchaseOrderPage);
