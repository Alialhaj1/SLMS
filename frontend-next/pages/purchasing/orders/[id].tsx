import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import MainLayout from '../../../components/layout/MainLayout';
import { withPermission } from '../../../utils/withPermission';
import ProfessionalPurchaseOrderForm from '../../../components/purchasing/purchaseOrder';

function EditPurchaseOrderPage() {
  const router = useRouter();
  const idParam = router.query.id;
  const modeParam = router.query.mode;
  const printParam = router.query.print;
  const orderId = typeof idParam === 'string' ? Number(idParam) : NaN;
  const mode = modeParam === 'view' ? 'view' : 'edit';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (mode !== 'view') return;
    if (printParam !== '1') return;

    const t = window.setTimeout(() => {
      try {
        window.print();
      } catch {
        // ignore
      }
    }, 800);

    return () => window.clearTimeout(t);
  }, [mode, printParam]);

  return (
    <MainLayout>
      <Head>
        <title>Purchase Order - SLMS</title>
      </Head>

      {Number.isFinite(orderId) ? (
        <ProfessionalPurchaseOrderForm mode={mode} orderId={orderId} />
      ) : (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 text-slate-600 dark:text-slate-300">
          Invalid purchase order id
        </div>
      )}
    </MainLayout>
  );
}

export default withPermission('purchase_orders:view', EditPurchaseOrderPage);
