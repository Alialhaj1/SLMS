-- Migration 069: Add helper function to format sequence numbers
-- Date: 2026-01-01
--
-- Purpose:
-- Provide a single source of truth for building the formatted document number
-- from numbering_series settings + a stored sequence_no.
--
-- This supports the requirement that changing prefix/suffix/padding in numbering_series
-- affects all related records (as long as the UI/API formats using this function).

CREATE OR REPLACE FUNCTION slms_format_sequence(
  p_numbering_series_id INT,
  p_sequence_no INT
)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(ns.prefix, '')
    || LPAD(COALESCE(p_sequence_no, 0)::TEXT, COALESCE(ns.padding_length, 0), '0')
    || COALESCE(ns.suffix, '')
  FROM numbering_series ns
  WHERE ns.id = p_numbering_series_id
    AND ns.deleted_at IS NULL;
$$;
