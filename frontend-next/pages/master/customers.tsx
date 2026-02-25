/**
 * 👥 CUSTOMERS PAGE (Enterprise Edition)
 * ========================================
 *
 * Master data page for managing customers and receivable accounts.
 * Uses EnterpriseMasterPage with customersConfig for SAP/Oracle-level governance.
 *
 * Sub-tables: addresses, contacts, balances
 * Detail sections: Identity, Classification, Location, Terms, Financial/Credit,
 *                  Banking, Contact, Registration, Sub-table summaries, Metadata
 */

import React, { useEffect, useState, useCallback } from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { customersConfig, type Customer } from '@/config/pages/master/customers.config';
import { companyStore } from '@/lib/companyStore';

type RefOption = { value: any; label: string };

function CustomersPage() {
  const [companiesRef, setCompaniesRef] = useState<RefOption[]>([]);
  const [countriesRef, setCountriesRef] = useState<RefOption[]>([]);
  const [citiesRef, setCitiesRef] = useState<RefOption[]>([]);
  const [currenciesRef, setCurrenciesRef] = useState<RefOption[]>([]);
  const [languagesRef, setLanguagesRef] = useState<RefOption[]>([]);
  const [customerTypesRef, setCustomerTypesRef] = useState<RefOption[]>([]);
  const [customerCategoriesRef, setCustomerCategoriesRef] = useState<RefOption[]>([]);
  const [customerStatusesRef, setCustomerStatusesRef] = useState<RefOption[]>([]);
  const [deliveryTermsRef, setDeliveryTermsRef] = useState<RefOption[]>([]);

  const loadReferenceData = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '').replace(/\/api$/, '');
      const companyId = companyStore.getActiveCompanyId();
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token || ''}`,
        'Content-Type': 'application/json',
        ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
      };

      const endpoints = [
        { url: `${apiUrl}/api/master/companies?limit=500`,                  setter: setCompaniesRef,          fmt: (c: any) => ({ value: c.id, label: `${c.name} (${c.code})` }) },
        { url: `${apiUrl}/api/master/countries?limit=500&is_active=true`,   setter: setCountriesRef,          fmt: (c: any) => ({ value: c.id, label: `${c.flag || ''} ${c.name} (${c.code})`.trim() }) },
        { url: `${apiUrl}/api/master/cities?limit=1000&is_active=true`,     setter: setCitiesRef,             fmt: (c: any) => ({ value: c.id, label: `${c.name}${c.code ? ' (' + c.code + ')' : ''}` }) },
        { url: `${apiUrl}/api/master/currencies?limit=500&is_active=true`,  setter: setCurrenciesRef,         fmt: (c: any) => ({ value: c.id, label: `${c.code} — ${c.name}` }) },
        { url: `${apiUrl}/api/master/languages?limit=500&is_active=true`,   setter: setLanguagesRef,          fmt: (c: any) => ({ value: c.id, label: `${c.name}${c.native_name ? ' / ' + c.native_name : ''}` }) },
        { url: `${apiUrl}/api/master/customer-types?limit=500`,             setter: setCustomerTypesRef,      fmt: (c: any) => ({ value: c.id, label: c.name }) },
        { url: `${apiUrl}/api/master/customer-categories?limit=500`,        setter: setCustomerCategoriesRef, fmt: (c: any) => ({ value: c.id, label: c.name }) },
        { url: `${apiUrl}/api/master/customer-statuses?limit=500`,          setter: setCustomerStatusesRef,   fmt: (c: any) => ({ value: c.id, label: c.name }) },
        { url: `${apiUrl}/api/master/delivery-terms?limit=500`,             setter: setDeliveryTermsRef,      fmt: (c: any) => ({ value: c.id, label: `${c.incoterm_code || c.code || ''} — ${c.name}`.replace(/^ — /, '') }) },
      ];

      const responses = await Promise.all(endpoints.map(e => fetch(e.url, { headers })));

      for (let i = 0; i < responses.length; i++) {
        if (responses[i].ok) {
          const json = await responses[i].json();
          const items = json.data || json || [];
          endpoints[i].setter(items.map(endpoints[i].fmt));
        }
      }
    } catch (err) {
      console.error('Failed to load customer reference data:', err);
    }
  }, []);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  // ──── CR EXPIRY ALERT ─────────────────────────────────────────────────────

  const crExpiryLabel = (date?: string) => {
    if (!date) return '—';
    const d = new Date(date);
    const now = new Date();
    const daysLeft = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const formatted = d.toLocaleDateString();
    if (daysLeft < 0) return `❌ Expired (${formatted})`;
    if (daysLeft <= 60) return `⚠️ ${formatted} (${daysLeft}d left)`;
    return `✅ ${formatted}`;
  };

  // ──── CREDIT BAR HELPER ───────────────────────────────────────────────────

  const creditBarText = (limit?: number, used?: number, symbol?: string) => {
    if (!limit || limit <= 0) return '—';
    const pct = Math.min(100, Math.round(((used || 0) / limit) * 100));
    const status = pct >= 90 ? '🔴' : pct >= 70 ? '🟡' : '🟢';
    return `${status} ${symbol || ''}${Number(used || 0).toLocaleString()} / ${symbol || ''}${Number(limit).toLocaleString()} (${pct}%)`;
  };

  return (
    <EnterpriseMasterPage<Customer>
      config={customersConfig}
      referenceData={{
        company_id: companiesRef,
        country_id: countriesRef,
        city_id: citiesRef,
        currency_id: currenciesRef,
        language_id: languagesRef,
        customer_type_id: customerTypesRef,
        customer_category_id: customerCategoriesRef,
        status_id: customerStatusesRef,
        delivery_term_id: deliveryTermsRef,
      }}
      buildDetailSections={(record) => [
        {
          title: 'Customer Identity',
          fields: [
            { label: 'Code', value: record.code },
            { label: 'Name (English)', value: record.name_en || record.name },
            { label: 'Name (Arabic)', value: record.name_ar || '—' },
            { label: 'Short Name', value: record.short_name || '—' },
            ...(record.logo_url ? [{ label: 'Logo', value: record.logo_url }] : []),
          ],
        },
        {
          title: 'Classification',
          fields: [
            { label: 'Customer Type', value: record.customer_type_name || record.customer_type || '—', type: 'badge' as const },
            { label: 'Category', value: record.customer_category_name || '—' },
            { label: 'Operational Status', value: record.customer_status_name || record.status || '—', type: 'badge' as const },
          ],
        },
        {
          title: 'Location',
          fields: [
            { label: 'Country', value: record.country_flag ? `${record.country_flag} ${record.country_name}` : (record.country_name || '—') },
            { label: 'City', value: record.city_name || '—' },
            { label: 'Address', value: record.address || '—' },
            { label: 'Postal Code', value: record.postal_code || '—' },
          ],
        },
        {
          title: 'Correspondence & Currency',
          fields: [
            { label: 'Language', value: record.language_name ? `${record.language_name}${record.language_native_name ? ' / ' + record.language_native_name : ''}` : '—' },
            { label: 'Currency', value: record.currency_code ? `${record.currency_code} — ${record.currency_name}` : '—' },
          ],
        },
        {
          title: 'Delivery Terms',
          fields: [
            { label: 'Delivery Term', value: record.delivery_term_name ? `${record.delivery_term_incoterm ? record.delivery_term_incoterm + ' — ' : ''}${record.delivery_term_name}` : '—' },
          ],
        },
        {
          title: 'Financial & Credit',
          fields: [
            { label: 'Payment Days', value: record.payment_days != null ? `${record.payment_days} days` : '—' },
            { label: 'Credit Limit', value: record.credit_limit != null ? `${record.currency_symbol || ''}${Number(record.credit_limit).toLocaleString()}` : '—' },
            { label: 'Credit Used', value: creditBarText(record.credit_limit as number, record.credit_used, record.currency_symbol) },
            { label: 'Discount', value: record.discount_pct ? `${record.discount_pct}%` : '—' },
            { label: 'Credit Sales', value: record.allow_credit_sales !== false ? '✅ Allowed' : '❌ Cash Only' },
            { label: 'Credit Policy', value: record.credit_policy || '—', type: 'badge' as const },
            { label: 'Tax Treatment', value: record.tax_treatment || '—' },
          ],
        },
        {
          title: 'Registration & Tax',
          fields: [
            { label: 'Tax/VAT Number', value: record.tax_number || '—' },
            { label: 'Commercial Register', value: record.cr_number || record.commercial_register || '—' },
            { label: 'CR Expiry', value: crExpiryLabel(record.cr_expiry_date) },
            { label: 'National ID', value: record.national_id || '—' },
          ],
        },
        {
          title: 'Primary Bank Account',
          fields: [
            { label: 'IBAN', value: record.iban || record.bank_iban || '—' },
            { label: 'SWIFT Code', value: record.swift_code || '—' },
          ],
        },
        {
          title: 'Contact',
          fields: [
            { label: 'Primary Contact', value: record.primary_contact_name || '—' },
            { label: 'Phone', value: record.phone || '—' },
            { label: 'Mobile', value: record.mobile || '—' },
            { label: 'Email', value: record.email || '—' },
            { label: 'Website', value: record.website || '—' },
          ],
        },
        ...(record.addresses && record.addresses.length > 0 ? [{
          title: `📍 Addresses (${record.addresses.length})`,
          fields: record.addresses.map((addr: any, i: number) => ({
            label: addr.label || `Address ${i + 1}`,
            value: [addr.address_line_1, addr.address_line_2, addr.city_name, addr.country_name, addr.postal_code].filter(Boolean).join(', ') + (addr.is_default ? ' ⭐' : ''),
          })),
        }] : []),
        ...(record.contacts && record.contacts.length > 0 ? [{
          title: `👤 Contacts (${record.contacts.length})`,
          fields: record.contacts.map((ct: any, i: number) => ({
            label: ct.name || `Contact ${i + 1}`,
            value: [ct.position, ct.phone, ct.email].filter(Boolean).join(' | ') + (ct.is_primary ? ' ⭐' : ''),
          })),
        }] : []),
        {
          title: 'Metadata',
          fields: [
            { label: 'Active', value: record.is_active ? '✅ Yes' : '❌ No', type: 'badge' as const },
            { label: 'Notes', value: record.notes || '—' },
            { label: 'Created By', value: record.created_by_name || '—' },
            { label: 'Created', value: record.created_at, type: 'date' as const },
            { label: 'Updated By', value: record.updated_by_name || '—' },
            { label: 'Updated', value: record.updated_at, type: 'date' as const },
          ],
        },
      ]}
      buildRelations={(record) => [
        {
          type: 'addresses',
          label: 'Addresses',
          count: record.addresses?.length || 0,
        },
        {
          type: 'contacts',
          label: 'Contacts',
          count: record.contacts?.length || 0,
        },
      ]}
    />
  );
}

export default withPermission(MenuPermissions.MasterData.Customers.View, CustomersPage);
