-- Migration: Sync shipment expenses to expense requests
-- When a shipment expense is created/updated, automatically reflect in expense_requests
-- NOTE: expense_requests.shipment_id references logistics_shipments, not shipments

-- 1. First, fix the foreign key to reference logistics_shipments instead of shipments
ALTER TABLE expense_requests DROP CONSTRAINT IF EXISTS expense_requests_shipment_id_fkey;

-- Make shipment_id nullable to allow requests without shipment
ALTER TABLE expense_requests ALTER COLUMN shipment_id DROP NOT NULL;

-- Add new foreign key to logistics_shipments
ALTER TABLE expense_requests 
ADD CONSTRAINT expense_requests_logistics_shipment_id_fkey 
FOREIGN KEY (shipment_id) REFERENCES logistics_shipments(id) ON DELETE SET NULL;

-- 2. Add source tracking columns to expense_requests
ALTER TABLE expense_requests 
ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS source_shipment_expense_id INTEGER,
ADD COLUMN IF NOT EXISTS is_auto_synced BOOLEAN DEFAULT false;

-- Add foreign key constraint for source
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'expense_requests_source_shipment_expense_id_fkey'
  ) THEN
    ALTER TABLE expense_requests 
    ADD CONSTRAINT expense_requests_source_shipment_expense_id_fkey 
    FOREIGN KEY (source_shipment_expense_id) REFERENCES shipment_expenses(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_expense_requests_source_expense 
ON expense_requests(source_shipment_expense_id) WHERE source_shipment_expense_id IS NOT NULL;

-- 3. Create function to sync shipment expense to expense request
CREATE OR REPLACE FUNCTION sync_shipment_expense_to_request()
RETURNS TRIGGER AS $$
DECLARE
  v_request_number VARCHAR(50);
  v_status_id INTEGER;
  v_default_currency_id INTEGER;
  v_expense_type_id INTEGER;
  v_default_vendor_id INTEGER;
  v_next_seq INTEGER;
BEGIN
  -- Get default status (draft = 1)
  v_status_id := 1;
  
  -- Get currency from shipment_expenses or default
  v_default_currency_id := COALESCE(NEW.currency_id, 1);
  
  -- Map shipment_expense_type to request_expense_type (try to find matching)
  SELECT ret.id INTO v_expense_type_id
  FROM request_expense_types ret
  WHERE ret.company_id = NEW.company_id
    AND ret.code = NEW.expense_type_code
    AND ret.deleted_at IS NULL
  LIMIT 1;
  
  -- If no matching expense type, try to get default or first one
  IF v_expense_type_id IS NULL THEN
    SELECT id INTO v_expense_type_id
    FROM request_expense_types
    WHERE company_id = NEW.company_id AND deleted_at IS NULL
    ORDER BY is_system DESC, id
    LIMIT 1;
  END IF;
  
  -- Get default vendor (first vendor for company)
  SELECT id INTO v_default_vendor_id
  FROM vendors
  WHERE company_id = NEW.company_id AND deleted_at IS NULL
  ORDER BY id
  LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    -- Generate request number
    SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM 'EXP-SH-([0-9]+)') AS INTEGER)), 0) + 1
    INTO v_next_seq
    FROM expense_requests
    WHERE company_id = NEW.company_id AND request_number LIKE 'EXP-SH-%';
    
    v_request_number := 'EXP-SH-' || LPAD(v_next_seq::TEXT, 6, '0');
    
    -- Insert new expense request linked to shipment expense
    INSERT INTO expense_requests (
      company_id,
      request_number,
      request_date,
      requested_by,
      project_id,
      shipment_id,
      expense_type_id,
      vendor_id,
      currency_id,
      exchange_rate,
      total_amount,
      total_amount_local,
      status_id,
      notes,
      source_type,
      source_shipment_expense_id,
      is_auto_synced,
      created_by,
      created_at
    ) VALUES (
      NEW.company_id,
      v_request_number,
      COALESCE(NEW.expense_date, CURRENT_DATE),
      COALESCE(NEW.created_by, 1),
      NEW.project_id,
      NEW.shipment_id,
      v_expense_type_id,
      COALESCE(v_default_vendor_id, 1),
      v_default_currency_id,
      COALESCE(NEW.exchange_rate, 1),
      COALESCE(NEW.total_amount, 0),
      COALESCE(NEW.total_in_base_currency, NEW.total_amount, 0),
      v_status_id,
      CONCAT('مصروف شحنة #', NEW.id, ' - ', COALESCE(NEW.expense_type_name, ''), '. ', COALESCE(NEW.notes, '')),
      'shipment_expense',
      NEW.id,
      true,
      NEW.created_by,
      NOW()
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update existing expense request
    UPDATE expense_requests SET
      project_id = NEW.project_id,
      shipment_id = NEW.shipment_id,
      exchange_rate = COALESCE(NEW.exchange_rate, 1),
      total_amount = COALESCE(NEW.total_amount, 0),
      total_amount_local = COALESCE(NEW.total_in_base_currency, NEW.total_amount, 0),
      notes = CONCAT('مصروف شحنة #', NEW.id, ' - ', COALESCE(NEW.expense_type_name, ''), '. ', COALESCE(NEW.notes, '')),
      updated_at = NOW(),
      updated_by = NEW.updated_by
    WHERE source_shipment_expense_id = NEW.id
      AND is_auto_synced = true;
      
  ELSIF TG_OP = 'DELETE' THEN
    -- Soft delete the linked expense request
    UPDATE expense_requests SET
      deleted_at = NOW(),
      notes = CONCAT(COALESCE(notes, ''), ' [تم حذف مصروف الشحنة المصدر]')
    WHERE source_shipment_expense_id = OLD.id
      AND is_auto_synced = true;
    
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger for shipment_expenses
DROP TRIGGER IF EXISTS trg_sync_shipment_expense ON shipment_expenses;

CREATE TRIGGER trg_sync_shipment_expense
AFTER INSERT OR UPDATE OR DELETE ON shipment_expenses
FOR EACH ROW
EXECUTE FUNCTION sync_shipment_expense_to_request();

-- 5. Sync existing shipment expenses (if any)
DO $$
DECLARE
  se_record RECORD;
  v_request_number VARCHAR(50);
  v_expense_type_id INTEGER;
  v_default_vendor_id INTEGER;
  v_counter INTEGER := 0;
BEGIN
  FOR se_record IN 
    SELECT se.* 
    FROM shipment_expenses se
    LEFT JOIN expense_requests er ON er.source_shipment_expense_id = se.id
    WHERE er.id IS NULL AND se.deleted_at IS NULL
  LOOP
    v_counter := v_counter + 1;
    
    -- Get expense type
    SELECT ret.id INTO v_expense_type_id
    FROM request_expense_types ret
    WHERE ret.company_id = se_record.company_id
      AND ret.code = se_record.expense_type_code
      AND ret.deleted_at IS NULL
    LIMIT 1;
    
    IF v_expense_type_id IS NULL THEN
      SELECT id INTO v_expense_type_id
      FROM request_expense_types
      WHERE company_id = se_record.company_id AND deleted_at IS NULL
      ORDER BY is_system DESC, id
      LIMIT 1;
    END IF;
    
    -- Skip if no expense type found
    IF v_expense_type_id IS NULL THEN
      RAISE NOTICE 'Skipping shipment expense % - no matching expense type found', se_record.id;
      CONTINUE;
    END IF;
    
    -- Get default vendor
    SELECT id INTO v_default_vendor_id
    FROM vendors
    WHERE company_id = se_record.company_id AND deleted_at IS NULL
    ORDER BY id
    LIMIT 1;
    
    -- Skip if no vendor found
    IF v_default_vendor_id IS NULL THEN
      RAISE NOTICE 'Skipping shipment expense % - no vendor found', se_record.id;
      CONTINUE;
    END IF;
    
    -- Generate unique request number
    v_request_number := 'EXP-SH-' || LPAD(v_counter::TEXT, 6, '0');
    
    -- Insert
    BEGIN
      INSERT INTO expense_requests (
        company_id,
        request_number,
        request_date,
        requested_by,
        project_id,
        shipment_id,
        expense_type_id,
        vendor_id,
        currency_id,
        exchange_rate,
        total_amount,
        total_amount_local,
        status_id,
        notes,
        source_type,
        source_shipment_expense_id,
        is_auto_synced,
        created_by,
        created_at
      ) VALUES (
        se_record.company_id,
        v_request_number,
        COALESCE(se_record.expense_date, CURRENT_DATE),
        COALESCE(se_record.created_by, 1),
        se_record.project_id,
        se_record.shipment_id,
        v_expense_type_id,
        v_default_vendor_id,
        COALESCE(se_record.currency_id, 1),
        COALESCE(se_record.exchange_rate, 1),
        COALESCE(se_record.total_amount, 0),
        COALESCE(se_record.total_in_base_currency, se_record.total_amount, 0),
        1, -- Draft status
        CONCAT('مصروف شحنة #', se_record.id, ' - ', COALESCE(se_record.expense_type_name, ''), '. ', COALESCE(se_record.notes, '')),
        'shipment_expense',
        se_record.id,
        true,
        se_record.created_by,
        NOW()
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error syncing shipment expense %: %', se_record.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Synced % existing shipment expenses to expense_requests', v_counter;
END $$;

-- 6. Add comments for documentation
COMMENT ON COLUMN expense_requests.source_type IS 'Source of the request: manual, shipment_expense, purchase_invoice';
COMMENT ON COLUMN expense_requests.source_shipment_expense_id IS 'Reference to shipment_expenses.id if auto-synced';
COMMENT ON COLUMN expense_requests.is_auto_synced IS 'True if this request was automatically created from another module';
COMMENT ON TRIGGER trg_sync_shipment_expense ON shipment_expenses IS 'Auto-syncs shipment expenses to expense_requests for unified requests view';
