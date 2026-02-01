import Head from 'next/head';
import MainLayout from '../../../components/layout/MainLayout';
import { withPermission } from '../../../utils/withPermission';
import { MenuPermissions } from '../../../config/menu.permissions';
import ProfessionalPurchaseOrderForm from '../../../components/purchasing/purchaseOrder';
import { useTranslation } from '../../../hooks/useTranslation';

function NewPurchaseOrderPage() {
  const { locale } = useTranslation();
  const isArabic = locale === 'ar';

  return (
    <MainLayout>
      <Head>
        <title>{isArabic ? 'طلب شراء جديد - SLMS' : 'New Purchase Order - SLMS'}</title>
      </Head>

      <ProfessionalPurchaseOrderForm mode="create" />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Procurement.PurchaseOrders.Create, NewPurchaseOrderPage);
