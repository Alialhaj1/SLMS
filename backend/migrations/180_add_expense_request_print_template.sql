-- =====================================================
-- Migration: 180_add_expense_request_print_template.sql
-- Description: Add default expense request print template
-- Date: 2026-01-20
-- =====================================================

-- Insert default expense request print template for each company
INSERT INTO printed_templates (
  company_id,
  name_en,
  name_ar,
  template_type,
  module,
  language,
  paper_size,
  orientation,
  header_html,
  body_html,
  footer_html,
  css,
  margin_top,
  margin_bottom,
  margin_left,
  margin_right,
  is_default,
  is_active,
  preview_url,
  version,
  created_at
)
SELECT 
  c.id,
  'Expense Request - Payment/Transfer',
  'طلب مصروف - سداد/تحويل',
  'expense_request',
  'requests',
  'both',
  'A4',
  'portrait',
  -- Header HTML
  '<div class="header">
    <table style="width:100%;border-bottom:2px solid #000;">
      <tr>
        <td style="width:35%;text-align:right;padding:10px;" dir="rtl">
          <div style="font-size:15px;font-weight:bold;">{{company_name_ar}}</div>
          <div style="font-size:11px;color:#555;margin-top:3px;">سجل تجاري: {{company_registration_number}}</div>
          <div style="font-size:11px;color:#555;">الرقم الضريبي: {{company_tax_number}}</div>
        </td>
        <td style="width:30%;text-align:center;padding:10px;">
          <div style="width:80px;height:80px;margin:0 auto;border:1px solid #ccc;border-radius:5px;overflow:hidden;background:#fafafa;">
            <img src="{{company_logo}}" style="max-width:100%;max-height:100%;" onerror="this.style.display=''none''">
          </div>
        </td>
        <td style="width:35%;text-align:left;padding:10px;" dir="ltr">
          <div style="font-size:15px;font-weight:bold;">{{company_name_en}}</div>
          <div style="font-size:11px;color:#555;margin-top:3px;">C.R. No: {{company_registration_number}}</div>
          <div style="font-size:11px;color:#555;">VAT No: {{company_tax_number}}</div>
        </td>
      </tr>
    </table>
    <div style="background:#1e3a5f;color:white;padding:10px;text-align:center;">
      <div style="font-size:15px;font-weight:bold;">طلب سداد / تحويل – {{expense_type_name_ar}}</div>
      <div style="font-size:13px;margin-top:2px;">Payment / Transfer Request – {{expense_type_name}}</div>
    </div>
  </div>',
  -- Body HTML
  '<div class="body">
    <table style="border-bottom:1px solid #999;">
      <tr>
        <td style="width:50%;padding:8px 10px;border-right:1px solid #999;background:#f9f9f9;">
          <strong>رقم الطلب / Request No:</strong> <span style="color:#1565c0;font-weight:bold;">{{request_number}}</span>
        </td>
        <td style="width:50%;padding:8px 10px;background:#f9f9f9;">
          <strong>التاريخ / Date:</strong> {{request_date}}
        </td>
      </tr>
    </table>
    <table>
      <tr class="row">
        <td class="label">رقم المشروع / Project</td>
        <td class="value">{{project_name}} ({{project_code}})</td>
      </tr>
      <tr class="row">
        <td class="label">رقم الشحنة / Shipment</td>
        <td class="value">{{shipment_number}}</td>
      </tr>
      {{#if vendor_po_number}}
      <tr class="row">
        <td class="label">رقم أمر شراء المورد / Vendor PO</td>
        <td class="value">{{vendor_po_number}}</td>
      </tr>
      {{/if}}
      {{#if invoice_number}}
      <tr class="row">
        <td class="label">رقم الفاتورة وتاريخها / Invoice</td>
        <td class="value">{{invoice_number}} ({{invoice_date}})</td>
      </tr>
      {{/if}}
      {{#if receipt_number}}
      <tr class="row">
        <td class="label">رقم السداد / الإيصال / Receipt No</td>
        <td class="value" style="color:#2e7d32;">{{receipt_number}}</td>
      </tr>
      {{/if}}
      {{#if entity_name}}
      <tr class="row">
        <td class="label">الجهة / Entity</td>
        <td class="value">{{entity_name}}</td>
      </tr>
      {{/if}}
      {{#if description}}
      <tr class="row">
        <td class="label">البيان / Description</td>
        <td class="value">{{description}}</td>
      </tr>
      {{/if}}
      {{#if bl_number}}
      <tr class="row">
        <td class="label">رقم البوليصة / BL No</td>
        <td class="value">{{bl_number}}</td>
      </tr>
      {{/if}}
      {{#if supplier_name}}
      <tr class="row">
        <td class="label">مورد الشحنة / Supplier</td>
        <td class="value">{{supplier_name}}</td>
      </tr>
      {{/if}}
      <tr class="row">
        <td class="label">نوع المصروف / Expense Type</td>
        <td class="value">{{expense_type_name_ar}}</td>
      </tr>
      {{#if shipment_items}}
      <tr>
        <td colspan="2" style="padding:0;">
          <div style="background:#e3f2fd;padding:5px 10px;border-bottom:1px solid #ccc;">
            <strong style="color:#1565c0;">أصناف الشحنة / Shipment Items</strong>
          </div>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#e3f2fd;">
                <th style="padding:5px;border:1px solid #ccc;font-size:11px;">#</th>
                <th style="padding:5px;border:1px solid #ccc;font-size:11px;">الكود</th>
                <th style="padding:5px;border:1px solid #ccc;font-size:11px;">الصنف / Item</th>
                <th style="padding:5px;border:1px solid #ccc;font-size:11px;">الكمية</th>
                <th style="padding:5px;border:1px solid #ccc;font-size:11px;">الوحدة</th>
                <th style="padding:5px;border:1px solid #ccc;font-size:11px;">السعر</th>
                <th style="padding:5px;border:1px solid #ccc;font-size:11px;">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {{#each shipment_items}}
              <tr>
                <td style="padding:4px;border:1px solid #ccc;text-align:center;font-size:11px;">{{@index}}</td>
                <td style="padding:4px;border:1px solid #ccc;text-align:center;font-size:11px;">{{item_code}}</td>
                <td style="padding:4px;border:1px solid #ccc;font-size:11px;">{{item_name}}</td>
                <td style="padding:4px;border:1px solid #ccc;text-align:center;font-size:11px;">{{quantity}}</td>
                <td style="padding:4px;border:1px solid #ccc;text-align:center;font-size:11px;">{{uom_code}}</td>
                <td style="padding:4px;border:1px solid #ccc;text-align:center;font-size:11px;">{{unit_cost}}</td>
                <td style="padding:4px;border:1px solid #ccc;text-align:center;font-size:11px;">{{total}}</td>
              </tr>
              {{/each}}
            </tbody>
          </table>
        </td>
      </tr>
      {{/if}}
      <tr class="row">
        <td class="label">العملة / Currency</td>
        <td class="value">{{currency_code}} ({{currency_symbol}})</td>
      </tr>
      <tr class="row amount-row">
        <td class="label amount-label">إجمالي المبلغ / Total</td>
        <td class="value amount-value">{{total_amount}} {{currency_code}}</td>
      </tr>
      <tr class="row">
        <td class="label">المبلغ كتابةً (عربي)</td>
        <td class="value" dir="rtl">{{amount_in_words_ar}}</td>
      </tr>
      <tr class="row">
        <td class="label">Amount in Words (EN)</td>
        <td class="value" dir="ltr">{{amount_in_words_en}}</td>
      </tr>
      {{#if notes}}
      <tr class="row">
        <td class="label">ملاحظات / Notes</td>
        <td class="value">{{notes}}</td>
      </tr>
      {{/if}}
    </table>
    <table style="border-top:2px solid #000;margin-top:10px;">
      <tr>
        <td class="sig-cell" style="border-right:1px solid #999;">
          <div style="font-weight:bold;font-size:12px;">مقدم الطلب</div>
          <div style="font-size:10px;color:#666;margin-bottom:15px;">Requested By</div>
          <div style="font-size:12px;">{{requested_by_name}}</div>
          <div style="border-top:1px solid #999;margin-top:30px;padding-top:5px;font-size:10px;color:#666;">التوقيع / Signature</div>
        </td>
        <td class="sig-cell" style="border-right:1px solid #999;">
          <div style="font-weight:bold;font-size:12px;">مراجعة المدير</div>
          <div style="font-size:10px;color:#666;margin-bottom:15px;">Manager Review</div>
          <div style="font-size:12px;">{{approved_by_name}}</div>
          <div style="border-top:1px solid #999;margin-top:30px;padding-top:5px;font-size:10px;color:#666;">التوقيع / Signature</div>
        </td>
        <td class="sig-cell">
          <div style="font-weight:bold;font-size:12px;">الاعتماد</div>
          <div style="font-size:10px;color:#666;margin-bottom:15px;">Approval</div>
          <div style="font-size:12px;">-</div>
          <div style="border-top:1px solid #999;margin-top:30px;padding-top:5px;font-size:10px;color:#666;">التوقيع / Signature</div>
        </td>
      </tr>
    </table>
  </div>',
  -- Footer HTML
  '<div class="footer" style="border-top:2px solid #000;background:#f5f5f5;">
    <div style="padding:8px 10px;text-align:center;border-bottom:1px solid #ddd;">
      <div style="font-size:10px;color:#444;">{{company_address}}</div>
      <div style="font-size:10px;color:#1565c0;margin-top:3px;">{{company_email}} | {{company_website}} | Tel: {{company_phone}}</div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 15px;font-size:10px;color:#666;">
      <div>طُبع بواسطة: {{printed_by}}</div>
      <div>صفحة {{page_number}} من {{total_pages}}</div>
      <div>تاريخ الطباعة: {{print_date}}</div>
    </div>
  </div>',
  -- CSS
  '* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, Tahoma, sans-serif; font-size: 13px; background: white; }
@page { size: A4 portrait; margin: 10mm; }
@media print {
  body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}
table { border-collapse: collapse; width: 100%; }
.row td { padding: 8px 10px; border-bottom: 1px solid #ccc; }
.label { background: #f0f0f0; font-weight: bold; width: 35%; border-right: 1px solid #ccc; text-align: right; }
.value { text-align: center; }
.amount-row { background: #fffde7; }
.amount-label { background: #fff59d; font-weight: bold; font-size: 14px; }
.amount-value { font-size: 18px; font-weight: bold; color: #2e7d32; }
.sig-cell { padding: 15px; text-align: center; vertical-align: top; width: 33.33%; }',
  -- Margins
  10, -- margin_top
  10, -- margin_bottom
  10, -- margin_left
  10, -- margin_right
  TRUE, -- is_default
  TRUE, -- is_active
  '/requests/expense/[id]/print', -- preview_url
  1, -- version
  NOW()
FROM companies c
WHERE c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM printed_templates pt 
    WHERE pt.company_id = c.id 
      AND pt.template_type = 'expense_request' 
      AND pt.is_default = TRUE
      AND pt.deleted_at IS NULL
  );

-- Add comment
COMMENT ON COLUMN printed_templates.template_type IS 'Template types: invoice, shipment, receipt, quotation, delivery_note, purchase_order, expense_request, payment_request, report, label';
