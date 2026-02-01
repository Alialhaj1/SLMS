-- Fix transfer request number trigger to include deleted records in sequence calculation
-- This prevents duplicate key errors when soft-deleted records exist

CREATE OR REPLACE FUNCTION public.generate_transfer_request_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    next_seq INTEGER;
    new_number VARCHAR(50);
BEGIN
    IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
        -- Include ALL records (including deleted ones) to prevent duplicate key violations
        SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
        INTO next_seq
        FROM transfer_requests
        WHERE company_id = NEW.company_id;
        
        -- Format: TRF-2026-00001
        new_number := 'TRF-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(next_seq::TEXT, 5, '0');
        NEW.request_number := new_number;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Also ensure the unique constraint still works correctly
-- (it applies to all records including soft-deleted)
