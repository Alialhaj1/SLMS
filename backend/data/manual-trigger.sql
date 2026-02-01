-- Manual trigger execution for invoices 54 and 55
DO $$
DECLARE
  v_invoice_total NUMERIC(18,4);
  v_paid_total NUMERIC(18,4);
BEGIN
  -- Invoice 55
  SELECT total_amount INTO v_invoice_total FROM purchase_invoices WHERE id=55;
  SELECT COALESCE(SUM(vpa.invoice_currency_amount), 0) INTO v_paid_total
  FROM vendor_payment_allocations vpa
  INNER JOIN vendor_payments vp ON vpa.payment_id=vp.id
  WHERE vpa.invoice_id=55 AND vp.is_posted=true AND vp.deleted_at IS NULL AND vpa.deleted_at IS NULL;
  
  UPDATE purchase_invoices SET paid_amount=v_paid_total, balance=v_invoice_total-v_paid_total,
    status=CASE WHEN v_paid_total>=v_invoice_total THEN 'paid' WHEN v_paid_total>0 THEN 'partial_paid' ELSE status END
  WHERE id=55;
  
  RAISE NOTICE 'Invoice 55: paid=%, balance=%', v_paid_total, v_invoice_total-v_paid_total;
  
  -- Invoice 54
  SELECT total_amount INTO v_invoice_total FROM purchase_invoices WHERE id=54;
  SELECT COALESCE(SUM(vpa.invoice_currency_amount), 0) INTO v_paid_total
  FROM vendor_payment_allocations vpa
  INNER JOIN vendor_payments vp ON vpa.payment_id=vp.id
  WHERE vpa.invoice_id=54 AND vp.is_posted=true AND vp.deleted_at IS NULL AND vpa.deleted_at IS NULL;
  
  UPDATE purchase_invoices SET paid_amount=v_paid_total, balance=v_invoice_total-v_paid_total,
    status=CASE WHEN v_paid_total>=v_invoice_total THEN 'paid' WHEN v_paid_total>0 THEN 'partial_paid' ELSE status END
  WHERE id=54;
  
  RAISE NOTICE 'Invoice 54: paid=%, balance=%', v_paid_total, v_invoice_total-v_paid_total;
END $$;
