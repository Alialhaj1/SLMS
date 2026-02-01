-- Seed company-scoped effective data for:
-- - Numbering Series (سلاسل الترقيم)
-- - Printed Templates (القوالب المطبوعة)
-- - Digital Signatures (التوقيعات الرقمية)
--
-- This migration is intentionally idempotent and will not duplicate active rows.

BEGIN;

-- =====================================================
-- 1) Numbering Series
-- =====================================================
INSERT INTO numbering_series (
  company_id,
  module,
  prefix,
  suffix,
  current_number,
  padding_length,
  format,
  sample_output,
  reset_frequency,
  is_active,
  notes_en,
  notes_ar
)
SELECT
  c.id,
  s.module,
  s.prefix,
  NULL,
  1,
  6,
  '{PREFIX}{YYYY}{MM}{NNNNNN}',
  s.sample,
  'yearly',
  TRUE,
  s.notes_en,
  s.notes_ar
FROM companies c
CROSS JOIN (
  VALUES
    ('shipments', 'SHP-', 'SHP-2026-01-000001', 'Auto numbering for shipments', 'ترقيم تلقائي للشحنات'),
    ('invoices',  'INV-', 'INV-2026-01-000001', 'Auto numbering for invoices',  'ترقيم تلقائي للفواتير'),
    ('vouchers',  'VCH-', 'VCH-2026-01-000001', 'Auto numbering for vouchers',  'ترقيم تلقائي للسندات')
) AS s(module, prefix, sample, notes_en, notes_ar)
WHERE c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM numbering_series ns
    WHERE ns.company_id = c.id
      AND ns.module = s.module
      AND ns.deleted_at IS NULL
  );

-- =====================================================
-- 2) Printed Templates
-- =====================================================
INSERT INTO printed_templates (
  company_id,
  name_en,
  name_ar,
  template_type,
  module,
  language,
  header_html,
  body_html,
  footer_html,
  css,
  paper_size,
  orientation,
  margin_top,
  margin_bottom,
  margin_left,
  margin_right,
  is_default,
  is_active
)
SELECT
  c.id,
  t.name_en,
  t.name_ar,
  t.template_type,
  t.module,
  'both',
  t.header_html,
  t.body_html,
  t.footer_html,
  t.css,
  'A4',
  'portrait',
  10,
  10,
  10,
  10,
  CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM printed_templates pt
      WHERE pt.company_id = c.id
        AND pt.template_type = t.template_type
        AND pt.is_default = TRUE
        AND pt.deleted_at IS NULL
    ) THEN TRUE
    ELSE FALSE
  END,
  TRUE
FROM companies c
CROSS JOIN (
  VALUES
    (
      'Invoice - Standard',
      'فاتورة - قياسي',
      'invoice',
      'sales',
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;">
  <div>
    <div style="font-size:18px;font-weight:700;">{{company_name}}</div>
    <div style="font-size:12px;">{{company_address}}</div>
  </div>
  <div style="text-align:right;">
    <div style="font-size:18px;font-weight:700;">INVOICE</div>
    <div style="font-size:12px;">{{document_number}}</div>
  </div>
</div><hr/>',
      '<div>
  <div style="margin:8px 0;display:flex;justify-content:space-between;">
    <div><strong>Customer:</strong> {{customer_name}}</div>
    <div><strong>Date:</strong> {{document_date}}</div>
  </div>
  <table style="width:100%;border-collapse:collapse;" border="1" cellspacing="0" cellpadding="6">
    <thead>
      <tr>
        <th style="text-align:left;">Item</th>
        <th style="text-align:right;">Qty</th>
        <th style="text-align:right;">Price</th>
        <th style="text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>
      {{line_items}}
    </tbody>
  </table>
  <div style="margin-top:10px;text-align:right;">
    <div><strong>Subtotal:</strong> {{subtotal}}</div>
    <div><strong>Tax:</strong> {{tax_total}}</div>
    <div style="font-size:16px;"><strong>Grand Total:</strong> {{grand_total}}</div>
  </div>
</div>',
      '<hr/><div style="display:flex;justify-content:space-between;font-size:12px;">
  <div>Printed at: {{printed_at}}</div>
  <div>Page {{page_number}} / {{page_count}}</div>
</div>',
      'body{font-family:Inter,Arial,sans-serif;font-size:12px;color:#111;}'
    ),
    (
      'Shipment - Standard',
      'شحنة - قياسي',
      'shipment',
      'logistics',
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;">
  <div>
    <div style="font-size:18px;font-weight:700;">{{company_name}}</div>
    <div style="font-size:12px;">{{company_address}}</div>
  </div>
  <div style="text-align:right;">
    <div style="font-size:18px;font-weight:700;">SHIPMENT</div>
    <div style="font-size:12px;">{{shipment_number}}</div>
  </div>
</div><hr/>',
      '<div>
  <div style="margin:8px 0;display:flex;justify-content:space-between;">
    <div><strong>Origin:</strong> {{origin}}</div>
    <div><strong>Destination:</strong> {{destination}}</div>
  </div>
  <div style="margin:8px 0;display:flex;justify-content:space-between;">
    <div><strong>Carrier:</strong> {{carrier}}</div>
    <div><strong>ETD/ETA:</strong> {{etd}} / {{eta}}</div>
  </div>
  <table style="width:100%;border-collapse:collapse;" border="1" cellspacing="0" cellpadding="6">
    <thead>
      <tr>
        <th style="text-align:left;">Description</th>
        <th style="text-align:right;">Packages</th>
        <th style="text-align:right;">Weight</th>
      </tr>
    </thead>
    <tbody>
      {{cargo_lines}}
    </tbody>
  </table>
</div>',
      '<hr/><div style="font-size:12px;">Notes: {{notes}}</div>',
      'body{font-family:Inter,Arial,sans-serif;font-size:12px;color:#111;}'
    )
) AS t(name_en, name_ar, template_type, module, header_html, body_html, footer_html, css)
WHERE c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM printed_templates pt
    WHERE pt.company_id = c.id
      AND pt.template_type = t.template_type
      AND pt.name_en = t.name_en
      AND pt.deleted_at IS NULL
  );

-- =====================================================
-- 3) Digital Signatures
-- =====================================================
INSERT INTO digital_signatures (
  company_id,
  user_id,
  signature_name_en,
  signature_name_ar,
  signature_title_en,
  signature_title_ar,
  signature_type,
  signature_authority,
  requires_2fa,
  is_default,
  is_active
)
SELECT
  c.id,
  NULL,
  'Default Approval Signature',
  'التوقيع الافتراضي للموافقة',
  'Authorized Signer',
  'المخوّل بالتوقيع',
  'manual',
  'System',
  FALSE,
  TRUE,
  TRUE
FROM companies c
WHERE c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM digital_signatures ds
    WHERE ds.company_id = c.id
      AND ds.deleted_at IS NULL
      AND ds.is_default = TRUE
  );

COMMIT;
