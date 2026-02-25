/**
 * 🚚 DELIVERY TERMS / INCOTERMS PAGE (Enterprise Edition)
 * =========================================================
 *
 * Master data page for managing international trade terms
 * (Incoterms 2020) and local delivery conditions.
 * Shows shipping/insurance/customs coverage, seller/buyer
 * responsibilities, and risk transfer points.
 *
 * Uses EnterpriseMasterPage with deliveryTermConfig.
 */

import React from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { deliveryTermConfig, type DeliveryTerm } from '@/config/pages/master/deliveryTerms.config';

function DeliveryTermsPage() {
  return (
    <EnterpriseMasterPage<DeliveryTerm>
      config={deliveryTermConfig}
      buildDetailSections={(record) => [
        {
          title: 'Basic Information / البيانات الأساسية',
          fields: [
            { label: 'Code', value: record.code || '—' },
            { label: 'Name (English)', value: record.name_en || '—' },
            { label: 'Name (Arabic)', value: record.name_ar || '—' },
            { label: 'Description (EN)', value: record.description_en || '—' },
            { label: 'Description (AR)', value: record.description_ar || '—' },
            { label: 'Icon', value: record.icon || '—' },
            { label: 'Category', value: record.category === 'sea_only' ? '🚢 Sea Only' : record.category === 'any_mode' ? '🌐 Any Mode' : '🏠 Local' },
            { label: 'Incoterm', value: record.is_incoterm ? `✅ ICC ${record.incoterm_version || '2020'}` : 'Custom' },
          ],
        },
        {
          title: 'Cost Coverage / التغطية',
          fields: [
            { label: '🚢 Shipping', value: record.includes_shipping ? '✅ Included' : '❌ Not included' },
            { label: '🛡️ Insurance', value: record.includes_insurance ? '✅ Included' : '❌ Not included' },
            { label: '📋 Customs', value: record.includes_customs ? '✅ Included' : '❌ Not included' },
          ],
        },
        {
          title: 'Seller Responsibility / مسؤولية البائع',
          fields: [
            { label: 'Responsibility (AR)', value: record.seller_responsibility_ar || '—' },
            { label: 'Responsibility (EN)', value: record.seller_responsibility_en || '—' },
          ],
        },
        {
          title: 'Buyer Responsibility / مسؤولية المشتري',
          fields: [
            { label: 'Responsibility (AR)', value: record.buyer_responsibility_ar || '—' },
            { label: 'Responsibility (EN)', value: record.buyer_responsibility_en || '—' },
          ],
        },
        {
          title: 'Risk Transfer / انتقال المخاطر',
          fields: [
            { label: 'Transfer Point (AR)', value: record.risk_transfer_point_ar || '—' },
            { label: 'Transfer Point (EN)', value: record.risk_transfer_point_en || '—' },
          ],
        },
        {
          title: 'Settings / الإعدادات',
          fields: [
            { label: 'System', value: record.is_system ? '🔒 System' : 'Custom' },
            { label: 'Status', value: record.status || 'active', type: 'badge' as const },
            { label: 'Sort Order', value: record.sort_order?.toString() || '—' },
          ],
        },
        {
          title: 'Audit Trail / سجل التدقيق',
          fields: [
            { label: 'Created', value: record.created_at, type: 'date' as const },
            { label: 'Updated', value: record.updated_at, type: 'date' as const },
          ],
        },
      ]}
    />
  );
}

export default withPermission(MenuPermissions.MasterData.DeliveryTerms.View, DeliveryTermsPage);
