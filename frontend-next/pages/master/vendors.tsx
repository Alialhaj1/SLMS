/**
 * 🏭 VENDORS / SUPPLIERS PAGE (Enterprise Edition)
 * ==================================================
 *
 * Master data page for managing suppliers, vendors, and service providers.
 * Uses EnterpriseMasterPage with vendorsConfig for SAP/Oracle-level governance.
 *
 * Sub-tables: addresses, bank accounts, documents
 * Detail sections: Identity, Classification, Location, Terms, Financial, Banking,
 *                  Contact, Registration, Performance, Sub-table summaries, Metadata
 */

import React, { useEffect, useState, useCallback } from 'react';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '@/config/menu.permissions';
import EnterpriseMasterPage from '@/components/enterprise/EnterpriseMasterPage';
import { vendorsConfig, type Vendor } from '@/config/pages/master/vendors.config';
import { companyStore } from '@/lib/companyStore';

type RefOption = { value: any; label: string };

function VendorsPage() {
  const [companiesRef, setCompaniesRef] = useState<RefOption[]>([]);
  const [countriesRef, setCountriesRef] = useState<RefOption[]>([]);
  const [citiesRef, setCitiesRef] = useState<RefOption[]>([]);
  const [currenciesRef, setCurrenciesRef] = useState<RefOption[]>([]);
  const [languagesRef, setLanguagesRef] = useState<RefOption[]>([]);
  const [supplierTypesRef, setSupplierTypesRef] = useState<RefOption[]>([]);
  const [supplierCategoriesRef, setSupplierCategoriesRef] = useState<RefOption[]>([]);
  const [supplierStatusesRef, setSupplierStatusesRef] = useState<RefOption[]>([]);
  const [supplyTermsRef, setSupplyTermsRef] = useState<RefOption[]>([]);
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
        { url: `${apiUrl}/api/master/supplier-types?limit=500`,             setter: setSupplierTypesRef,      fmt: (c: any) => ({ value: c.id, label: c.name }) },
        { url: `${apiUrl}/api/master/supplier-categories?limit=500`,        setter: setSupplierCategoriesRef, fmt: (c: any) => ({ value: c.id, label: c.name }) },
        { url: `${apiUrl}/api/master/supplier-statuses?limit=500`,          setter: setSupplierStatusesRef,   fmt: (c: any) => ({ value: c.id, label: c.name }) },
        { url: `${apiUrl}/api/master/supply-terms?limit=500`,               setter: setSupplyTermsRef,        fmt: (c: any) => ({ value: c.id, label: c.name }) },
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
      console.error('Failed to load vendor reference data:', err);
    }
  }, []);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  // ──── RATING DISPLAY HELPER ────────────────────────────────────────────────

  const ratingDisplay = (rating?: number) => {
    if (!rating) return '—';
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty) + ` (${rating})`;
  };

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

  return (
    <EnterpriseMasterPage<Vendor>
      config={vendorsConfig}
      referenceData={{
        company_id: companiesRef,
        country_id: countriesRef,
        city_id: citiesRef,
        currency_id: currenciesRef,
        language_id: languagesRef,
        supplier_type_id: supplierTypesRef,
        supplier_category_id: supplierCategoriesRef,
        status_id: supplierStatusesRef,
        supply_term_id: supplyTermsRef,
        delivery_term_id: deliveryTermsRef,
      }}
      buildDetailSections={(record) => [
        {
          title: 'Supplier Identity',
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
            { label: 'Supplier Type', value: record.supplier_type_name || record.vendor_type || '—', type: 'badge' as const },
            { label: 'Category', value: record.supplier_category_name || '—' },
            { label: 'Operational Status', value: record.supplier_status_name || record.status || '—', type: 'badge' as const },
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
          title: 'Supply & Delivery Terms',
          fields: [
            { label: 'Supply Term', value: record.supply_term_name || '—' },
            { label: 'Delivery Term', value: record.delivery_term_name ? `${record.delivery_term_incoterm ? record.delivery_term_incoterm + ' — ' : ''}${record.delivery_term_name}` : '—' },
          ],
        },
        {
          title: 'Financial Terms',
          fields: [
            { label: 'Payment Days', value: record.payment_days != null ? `${record.payment_days} days` : '—' },
            { label: 'Credit Limit', value: record.credit_limit != null ? `${record.currency_symbol || ''}${Number(record.credit_limit).toLocaleString()}` : '—' },
            { label: 'Withholding Tax', value: record.withholding_tax_pct != null ? `${record.withholding_tax_pct}%` : '—' },
          ],
        },
        {
          title: 'Registration & Tax',
          fields: [
            { label: 'Tax/VAT Number', value: record.tax_number || '—' },
            { label: 'Commercial Register', value: record.cr_number || record.commercial_register || '—' },
            { label: 'CR Expiry', value: crExpiryLabel(record.cr_expiry_date) },
          ],
        },
        {
          title: 'Primary Bank Account',
          fields: [
            { label: 'IBAN', value: record.iban || record.bank_iban || '—' },
            { label: 'SWIFT Code', value: record.swift_code || record.bank_swift || '—' },
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
        {
          title: 'Performance & Rating',
          fields: [
            { label: 'Rating', value: ratingDisplay(record.rating) },
          ],
        },
        ...(record.addresses && record.addresses.length > 0 ? [{
          title: `📍 Addresses (${record.addresses.length})`,
          fields: record.addresses.map((addr: any, i: number) => ({
            label: addr.label || `Address ${i + 1}`,
            value: [addr.address_line_1, addr.address_line_2, addr.city_name, addr.country_name, addr.postal_code].filter(Boolean).join(', ') + (addr.is_default ? ' ⭐' : ''),
          })),
        }] : []),
        ...(record.bank_accounts && record.bank_accounts.length > 0 ? [{
          title: `🏦 Bank Accounts (${record.bank_accounts.length})`,
          fields: record.bank_accounts.map((ba: any, i: number) => ({
            label: ba.bank_name || `Bank ${i + 1}`,
            value: [ba.account_holder, ba.iban, ba.swift_code, ba.currency_code].filter(Boolean).join(' | ') + (ba.is_default ? ' ⭐' : ''),
          })),
        }] : []),
        ...(record.documents && record.documents.length > 0 ? [{
          title: `📄 Documents (${record.documents.length})`,
          fields: record.documents.map((doc: any, i: number) => ({
            label: doc.document_type || `Document ${i + 1}`,
            value: [doc.document_number, doc.issue_date ? `Issued: ${doc.issue_date}` : '', doc.expiry_date ? `Exp: ${doc.expiry_date}` : '', doc.is_verified ? '✅ Verified' : ''].filter(Boolean).join(' | '),
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
          type: 'documents',
          label: 'Documents',
          count: record.documents?.length || 0,
        },
        {
          type: 'addresses',
          label: 'Addresses',
          count: record.addresses?.length || 0,
        },
        {
          type: 'bank_accounts',
          label: 'Bank Accounts',
          count: record.bank_accounts?.length || 0,
        },
      ]}
    />
  );
}

export default withPermission(MenuPermissions.MasterData.Vendors.View, VendorsPage);
