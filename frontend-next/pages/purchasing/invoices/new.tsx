import React from 'react';
import Head from 'next/head';
import { PurchaseInvoicePage } from '../../../components/purchasing/invoice/PurchaseInvoicePage';

export default function NewInvoicePage() {
  return (
    <>
      <Head>
        <title>Create Purchase Invoice - SLMS</title>
      </Head>
      <PurchaseInvoicePage mode="create" />
    </>
  );
}
