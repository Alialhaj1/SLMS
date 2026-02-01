/**
 * NUMBER SEQUENCE UTILITY
 * Auto-generate sequential numbers for invoices, vouchers, etc.
 */

import pool from '../db';

interface NumberingFormat {
  prefix?: string;
  suffix?: string;
  padding_length: number;
  format?: string;
  reset_frequency: 'never' | 'yearly' | 'monthly' | 'daily';
}

/**
 * Generate next number in sequence
 * @param companyId - Company ID
 * @param module - Module name (e.g., 'purchase_invoices', 'sales_invoices')
 * @returns Generated number string (e.g., 'INV-2026-000001')
 */
export async function getNextNumber(
  companyId: number,
  module: string
): Promise<string> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get numbering series configuration
    const seriesResult = await client.query(
      `SELECT * FROM numbering_series 
       WHERE company_id = $1 AND module = $2 AND is_active = TRUE AND deleted_at IS NULL
       FOR UPDATE`,
      [companyId, module]
    );

    if (seriesResult.rows.length === 0) {
      throw new Error(`No active numbering series found for module: ${module}`);
    }

    const series = seriesResult.rows[0];
    const {
      prefix,
      suffix,
      current_number,
      padding_length,
      format,
      reset_frequency,
      last_reset_date,
    } = series;

    // Check if reset is needed
    let nextNumber = current_number;
    let needsReset = false;
    const now = new Date();

    if (reset_frequency !== 'never' && last_reset_date) {
      const lastReset = new Date(last_reset_date);

      switch (reset_frequency) {
        case 'yearly':
          needsReset = now.getFullYear() > lastReset.getFullYear();
          break;
        case 'monthly':
          needsReset =
            now.getFullYear() > lastReset.getFullYear() ||
            (now.getFullYear() === lastReset.getFullYear() &&
              now.getMonth() > lastReset.getMonth());
          break;
        case 'daily':
          needsReset =
            now.toISOString().split('T')[0] !== lastReset.toISOString().split('T')[0];
          break;
      }
    }

    if (needsReset) {
      nextNumber = 1;
    }

    // Format number with padding
    const paddedNumber = String(nextNumber).padStart(padding_length, '0');

    // Build formatted output
    let formattedNumber = '';

    if (format) {
      // Replace placeholders in format string
      formattedNumber = format
        .replace('{PREFIX}', prefix || '')
        .replace('{SUFFIX}', suffix || '')
        .replace('{YYYY}', now.getFullYear().toString())
        .replace('{YY}', now.getFullYear().toString().slice(-2))
        .replace('{MM}', String(now.getMonth() + 1).padStart(2, '0'))
        .replace('{DD}', String(now.getDate()).padStart(2, '0'))
        .replace('{NNNNNN}', paddedNumber)
        .replace(/{N+}/g, paddedNumber);
    } else {
      // Simple concatenation
      const parts = [];
      if (prefix) parts.push(prefix);
      parts.push(paddedNumber);
      if (suffix) parts.push(suffix);
      formattedNumber = parts.join('-');
    }

    // Update series with next number
    await client.query(
      `UPDATE numbering_series 
       SET current_number = $1, last_reset_date = $2, updated_at = NOW()
       WHERE id = $3`,
      [nextNumber + 1, needsReset ? now : last_reset_date, series.id]
    );

    await client.query('COMMIT');

    return formattedNumber;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Validate if a number exists in the system
 */
export async function isNumberUsed(
  companyId: number,
  module: string,
  number: string
): Promise<boolean> {
  // This would check against the actual transaction table (invoices, vouchers, etc.)
  // For now, just a placeholder
  return false;
}

/**
 * Preview next number without incrementing
 */
export async function previewNextNumber(
  companyId: number,
  module: string
): Promise<string> {
  const result = await pool.query(
    `SELECT * FROM numbering_series 
     WHERE company_id = $1 AND module = $2 AND is_active = TRUE AND deleted_at IS NULL`,
    [companyId, module]
  );

  if (result.rows.length === 0) {
    throw new Error(`No active numbering series found for module: ${module}`);
  }

  const series = result.rows[0];
  const { prefix, suffix, current_number, padding_length, format } = series;
  const now = new Date();

  const paddedNumber = String(current_number).padStart(padding_length, '0');

  if (format) {
    return format
      .replace('{PREFIX}', prefix || '')
      .replace('{SUFFIX}', suffix || '')
      .replace('{YYYY}', now.getFullYear().toString())
      .replace('{YY}', now.getFullYear().toString().slice(-2))
      .replace('{MM}', String(now.getMonth() + 1).padStart(2, '0'))
      .replace('{DD}', String(now.getDate()).padStart(2, '0'))
      .replace('{NNNNNN}', paddedNumber)
      .replace(/{N+}/g, paddedNumber);
  } else {
    const parts = [];
    if (prefix) parts.push(prefix);
    parts.push(paddedNumber);
    if (suffix) parts.push(suffix);
    return parts.join('-');
  }
}
